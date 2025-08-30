from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
import os
import logging
import json
from typing import Optional
from dotenv import load_dotenv
from ..services.redis_service import redis_service
from .admin_credit_manager import admin_credit_manager
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

async def verify_base_transaction(transaction_hash: str, expected_recipient: str) -> bool:
    """Verify a Base transaction on the blockchain"""
    try:
        import requests
        base_rpc_url = "https://mainnet.base.org"

        # Get transaction receipt
        payload = {
            "jsonrpc": "2.0",
            "method": "eth_getTransactionReceipt",
            "params": [transaction_hash],
            "id": 1
        }

        response = requests.post(base_rpc_url, json=payload, timeout=10)
        receipt_data = response.json()

        if "error" in receipt_data:
            logger.warning(f"[Base Pay] Transaction verification failed: {receipt_data['error']}")
            return False
        elif receipt_data.get("result"):
            receipt = receipt_data["result"]
            if receipt["status"] != "0x1":
                logger.error(f"[Base Pay] Transaction {transaction_hash} failed on blockchain")
                return False

            # Verify recipient
            if receipt["to"].lower() != expected_recipient.lower():
                logger.error(f"[Base Pay] Transaction recipient mismatch: {receipt['to']} != {expected_recipient}")
                return False

            logger.info(f"[Base Pay] Transaction {transaction_hash} verified on blockchain")
            return True
        else:
            logger.warning(f"[Base Pay] Could not verify transaction {transaction_hash} on blockchain")
            return False

    except Exception as e:
        logger.warning(f"[Base Pay] Blockchain verification failed: {str(e)}")
        return False

async def process_base_payment_data(payment_data: dict):
    """Shared logic for processing Base payment data - extracted for reuse"""
    # Extract payment details from Base Pay callback
    payment_id = payment_data.get("id")
    status = payment_data.get("status")
    amount = payment_data.get("amount")
    recipient = payment_data.get("to")
    payer_address = payment_data.get("from")
    tier = payment_data.get("tier")  # This should be passed in metadata
    timestamp = payment_data.get("timestamp")
    transaction_hash = payment_data.get("transactionHash")

    if not all([payment_id, status, amount, recipient, payer_address, tier]):
        raise HTTPException(status_code=400, detail="Missing required payment data")

    # Validate tier
    if tier not in VALID_TIERS:
        raise HTTPException(status_code=400, detail=f"Invalid tier: {tier}")

    logger.info(f"[Base Pay] Processing payment {payment_id} for {payer_address}")

    if status == "completed":
        # Add blockchain verification if transaction hash is provided
        if transaction_hash:
            is_verified = await verify_base_transaction(transaction_hash, recipient)
            if not is_verified:
                # Log but continue processing - don't fail payment due to verification issues
                logger.warning(f"[Base Pay] Transaction verification failed for {transaction_hash}, continuing with SDK status")

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

        # Add credits using AdminCreditManager
        result = admin_credit_manager.admin_add_credits(
            payer_address.lower(),
            credits_to_add,
            "Base Pay Payment"
        )

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
            "timestamp": timestamp,
            "status": "completed"
        }

        # Add to payment history
        redis_service.add_payment_history(payer_address.lower(), transaction_data, "base_pay")

        logger.info(f"[Base Pay] Added {credits_to_add} credits to {payer_address}. New balance: {result['new_balance']}")

        return JSONResponse(content={
            "status": "success",
            "credits_added": credits_to_add,
            "new_balance": result["new_balance"]
        })

    elif status == "failed":
        logger.warning(f"[Base Pay] Payment {payment_id} failed")
        return JSONResponse(content={"status": "failed"})

    else:
        logger.info(f"[Base Pay] Payment {payment_id} status: {status}")
        return JSONResponse(content={"status": status})

@base_pay_router.post("/process-payment")
async def process_base_pay_payment(request: Request):
    """Process a Base Pay payment completion"""
    try:
        body = await request.json()
        return await process_base_payment_data(body)
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
                credits = admin_credit_manager.admin_get_credits(address.lower())["credits"]

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

@base_pay_router.post("/callback")
async def base_pay_callback(request: Request):
    """Base Pay webhook callback endpoint for payment notifications"""
    try:
        body = await request.json()
        payment_id = body.get("id")
        status = body.get("status")

        logger.info(f"[Base Pay] Callback received for payment {payment_id} with status {status}")
        logger.info(f"[Base Pay] Full callback payload: {body}")

        # For now, just acknowledge the callback
        # The actual payment processing happens when the frontend polls for completion
        # via the existing /check-payment and /process-payment endpoints

        if payment_id:
            # Store callback data for debugging
            callback_key = f"base_pay_callback:{payment_id}"
            redis_service.set(callback_key, json.dumps(body), ex=3600)  # 1 hour expiry

        return JSONResponse(content={
            "status": "received",
            "message": "Callback processed successfully"
        })

    except Exception as e:
        logger.error(f"[Base Pay] Error processing callback: {str(e)}")
        # Don't raise HTTP exception for webhooks - return 200 to avoid retries
        return JSONResponse(content={
            "status": "error",
            "message": str(e)
        }, status_code=200)

@base_pay_router.post("/process-pending-payments")
async def process_pending_base_payments():
    """Process any pending Base Pay payments that may have been missed"""
    try:
        logger.info("[Base Pay] Processing pending payments...")

        # Get all callback data from Redis (keys that start with base_pay_callback:)
        callback_keys = redis_service.keys("base_pay_callback:*")
        processed_count = 0
        error_count = 0

        for callback_key in callback_keys:
            try:
                # Extract payment ID from key
                payment_id = callback_key.replace("base_pay_callback:", "")

                # Check if already processed
                processed_key = f"base_pay_processed:{payment_id}"
                if redis_service.exists(processed_key):
                    continue

                # Get callback data
                callback_data_str = redis_service.get(callback_key)
                if not callback_data_str:
                    continue

                callback_data = json.loads(callback_data_str)
                status = callback_data.get("status")

                if status == "completed":
                    # Process the payment using existing logic
                    # Create a mock request body for the process-payment endpoint
                    payment_body = {
                        "id": payment_id,
                        "status": status,
                        "amount": callback_data.get("amount"),
                        "to": callback_data.get("to"),
                        "from": callback_data.get("from"),
                        "tier": callback_data.get("tier"),
                        "timestamp": callback_data.get("timestamp"),
                        "transactionHash": callback_data.get("transactionHash")
                    }

                    try:
                        # Call the shared payment processing logic directly
                        result = await process_base_payment_data(payment_body)
                        if result.status_code == 200:
                            processed_count += 1
                            # Clean up the callback data
                            redis_service.delete(callback_key)
                        else:
                            error_count += 1
                    except Exception as e:
                        logger.error(f"[Base Pay] Error processing pending payment {payment_id}: {str(e)}")
                        error_count += 1

            except Exception as e:
                logger.error(f"[Base Pay] Error processing callback {callback_key}: {str(e)}")
                error_count += 1
                continue

        logger.info(f"[Base Pay] Processed {processed_count} pending payments, {error_count} errors")

        return JSONResponse(content={
            "status": "success",
            "processed_payments": processed_count,
            "errors": error_count
        })

    except Exception as e:
        logger.error(f"[Base Pay] Error processing pending payments: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "reason": str(e)}
        )
