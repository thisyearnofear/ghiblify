from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
import os
import logging
import json
from typing import Optional
import redis
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize router
base_pay_router = APIRouter()

# Redis connection
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "")
REDIS_SSL = os.getenv("REDIS_SSL", "false").lower() == "true"

try:
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD if REDIS_PASSWORD else None,
        ssl=REDIS_SSL,
        decode_responses=True
    )
    redis_client.ping()
    logger.info("[Base Pay] Redis connection successful")
except Exception as e:
    logger.error(f"[Base Pay] Redis connection failed: {e}")
    redis_client = None

# Base Pay pricing tiers (in USD)
BASE_PAY_PRICING = {
    "starter": {
        "amount": "0.50",
        "credits": 1,
        "description": "1 Ghibli transformation"
    },
    "pro": {
        "amount": "4.99", 
        "credits": 12,
        "description": "12 Ghibli transformations"
    },
    "unlimited": {
        "amount": "9.99",
        "credits": 30,
        "description": "30 Ghibli transformations"
    }
}

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
        
        logger.info(f"[Base Pay] Processing payment {payment_id} for {payer_address}")
        
        if status == "completed":
            # Verify the payment amount matches the tier
            if tier not in BASE_PAY_PRICING:
                raise HTTPException(status_code=400, detail="Invalid tier")
            
            expected_amount = BASE_PAY_PRICING[tier]["amount"]
            if amount != expected_amount:
                raise HTTPException(status_code=400, detail="Payment amount mismatch")
            
            # Check if payment was already processed
            processed_key = f"base_pay_processed:{payment_id}"
            if redis_client and redis_client.exists(processed_key):
                logger.info(f"[Base Pay] Payment {payment_id} already processed")
                return JSONResponse(content={"status": "already_processed"})
            
            # Add credits to user account
            credits_to_add = BASE_PAY_PRICING[tier]["credits"]
            credits_key = f"credits:{payer_address.lower()}"
            
            if redis_client:
                # Get current credits
                current_credits = redis_client.get(credits_key)
                current_credits = int(current_credits) if current_credits else 0
                
                # Add new credits
                new_credits = current_credits + credits_to_add
                redis_client.set(credits_key, new_credits)
                
                # Mark payment as processed
                redis_client.setex(processed_key, 86400, "processed")  # 24 hour expiry
                
                # Store transaction history
                history_key = f"base_pay_history:{payer_address.lower()}"
                transaction_data = {
                    "payment_id": payment_id,
                    "tier": tier,
                    "amount": amount,
                    "credits": credits_to_add,
                    "timestamp": body.get("timestamp"),
                    "status": "completed"
                }
                redis_client.lpush(history_key, json.dumps(transaction_data))
                
                logger.info(f"[Base Pay] Added {credits_to_add} credits to {payer_address}. New balance: {new_credits}")
                
                return JSONResponse(content={
                    "status": "success",
                    "credits_added": credits_to_add,
                    "new_balance": new_credits
                })
            else:
                raise HTTPException(status_code=500, detail="Redis connection not available")
        
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
        if not redis_client:
            raise HTTPException(status_code=500, detail="Redis connection not available")
        
        # Check if payment was processed
        processed_key = f"base_pay_processed:{payment_id}"
        is_processed = redis_client.exists(processed_key)
        
        if is_processed:
            # Get user's current credits if address provided
            credits = None
            if address:
                credits_key = f"credits:{address.lower()}"
                credits = redis_client.get(credits_key)
                credits = int(credits) if credits else 0
            
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
        if not redis_client:
            raise HTTPException(status_code=500, detail="Redis connection not available")
        
        history_key = f"base_pay_history:{address.lower()}"
        transactions = redis_client.lrange(history_key, 0, -1)
        
        # Parse JSON transactions
        parsed_transactions = []
        for tx in transactions:
            try:
                parsed_transactions.append(json.loads(tx))
            except json.JSONDecodeError:
                continue
        
        return JSONResponse(content={
            "transactions": parsed_transactions
        })
        
    except Exception as e:
        logger.error(f"[Base Pay] Error getting payment history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))