from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
import os
import logging
import json
from typing import Optional
from dotenv import load_dotenv
from ..services.redis_service import redis_service
from ..config.pricing import get_base_pay_pricing, get_tier_pricing, validate_payment_amount, BASE_PRICING

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize router
base_pay_router = APIRouter()

# Use the modern Redis service instead of direct connection
logger.info(f"[Base Pay] Using modern Redis service - Available: {redis_service.available}")

# Get Base Pay pricing from shared configuration
BASE_PAY_PRICING = get_base_pay_pricing()

# Valid tiers
VALID_TIERS = set(BASE_PRICING.keys())

@base_pay_router.post("/process-payment")
async def process_base_pay_payment(request: Request):
    """Process a Base Pay payment completion"""
    try:
        body = await request.json()
        
        # Extract payment details from Base Pay callback
        payment_id = body.get("id")
        status = body.get("status")
        amount = body.get("amount")
        recipient = body.get("to")
        payer_address = body.get("from")
        tier = body.get("tier")  # This should be passed in metadata
        
        if not all([payment_id, status, amount, recipient, payer_address, tier]):
            raise HTTPException(status_code=400, detail="Missing required payment data")
        
        # Validate tier
        if tier not in VALID_TIERS:
            raise HTTPException(status_code=400, detail=f"Invalid tier: {tier}")
        
        logger.info(f"[Base Pay] Processing payment {payment_id} for {payer_address}")
        
        if status == "completed":
            # Verify the payment amount using shared validation
            if not validate_payment_amount(tier, "base_pay", float(amount)):
                pricing_info = get_tier_pricing(tier, "base_pay")
                expected_amounts = [pricing_info["discounted_price"], pricing_info["base_price"]] if pricing_info else []
                raise HTTPException(
                    status_code=400,
                    detail=f"Payment amount mismatch. Expected {expected_amounts}, got {amount}"
                )
            
            # Check if payment was already processed
            processed_key = f"base_pay_processed:{payment_id}"
            if redis_service.exists(processed_key):
                logger.info(f"[Base Pay] Payment {payment_id} already processed")
                return JSONResponse(content={"status": "already_processed"})
            
            # Add credits to user account
            credits_to_add = BASE_PAY_PRICING[tier]["credits"]
            
            # Use the modern Redis service to add credits
            new_credits = redis_service.add_credits(payer_address.lower(), credits_to_add)
            
            # Mark payment as processed
            redis_service.set(processed_key, "processed", ex=86400)  # 24 hour expiry
            
            # Store transaction history using shared pricing info
            pricing_info = get_tier_pricing(tier, "base_pay")
            transaction_data = {
                "payment_id": payment_id,
                "tier": tier,
                "payment_method": "base_pay",
                "amount": amount,
                "original_amount": pricing_info["base_price"] if pricing_info else amount,
                "discount": pricing_info["discount_percentage"] if pricing_info else "0%",
                "savings": pricing_info["savings"] if pricing_info else 0,
                "credits": credits_to_add,
                "timestamp": body.get("timestamp"),
                "status": "completed"
            }
            
            # Add to payment history
            redis_service.add_payment_history(payer_address.lower(), transaction_data, "base_pay")
            
            logger.info(f"[Base Pay] Added {credits_to_add} credits to {payer_address}. New balance: {new_credits}")
            
            return JSONResponse(content={
                "status": "success",
                "credits_added": credits_to_add,
                "new_balance": new_credits
            })
        
        elif status == "failed":
            logger.warning(f"[Base Pay] Payment {payment_id} failed")
            return JSONResponse(content={"status": "failed"})
        
        else:
            logger.info(f"[Base Pay] Payment {payment_id} status: {status}")
            return JSONResponse(content={"status": status})
            
    except Exception as e:
        logger.error(f"[Base Pay] Error processing payment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@base_pay_router.get("/check-payment/{payment_id}")
async def check_base_pay_payment(payment_id: str, address: Optional[str] = None):
    """Check the status of a Base Pay payment"""
    try:
        # Check if payment was processed
        processed_key = f"base_pay_processed:{payment_id}"
        is_processed = redis_service.exists(processed_key)
        
        if is_processed:
            # Get user's current credits if address provided
            credits = None
            if address:
                credits = redis_service.get_credits(address.lower())
            
            return JSONResponse(content={
                "status": "completed",
                "credits": credits
            })
        else:
            return JSONResponse(content={
                "status": "pending"
            })
            
    except Exception as e:
        logger.error(f"[Base Pay] Error checking payment status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@base_pay_router.get("/pricing")
async def get_base_pay_pricing():
    """Get Base Pay pricing tiers"""
    return JSONResponse(content=BASE_PAY_PRICING)

@base_pay_router.get("/history/{address}")
async def get_base_pay_history(address: str):
    """Get Base Pay transaction history for an address"""
    try:
        # Get payment history from Redis service
        transactions = redis_service.get_payment_history(address.lower(), "base_pay")
        
        return JSONResponse(content={
            "transactions": transactions
        })
        
    except Exception as e:
        logger.error(f"[Base Pay] Error getting payment history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))