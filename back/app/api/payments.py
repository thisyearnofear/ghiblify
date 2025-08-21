from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv
import httpx
import logging
import hmac
import hashlib
import json
from typing import Optional
from ..services.redis_service import redis_service

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize router
payments_router = APIRouter()

# Constants
COINBASE_API_KEY = os.getenv('COINBASE_COMMERCE_API_KEY')
COINBASE_WEBHOOK_SECRET = os.getenv('COINBASE_WEBHOOK_SECRET')
COINBASE_API_URL = "https://api.commerce.coinbase.com"

# Pricing tiers (in USD)
PRICING_TIERS = {
    "single": {
        "amount": "0.50",
        "credits": 1,
        "description": "1 Ghibli transformation"
    },
    "basic": {
        "amount": "4.99",
        "credits": 12,
        "description": "12 Ghibli transformations"
    },
    "pro": {
        "amount": "9.99",
        "credits": 30,
        "description": "30 Ghibli transformations"
    }
}

async def create_coinbase_charge(tier: str, wallet_address: str = None) -> dict:
    """Create a new charge on Coinbase Commerce"""
    if tier not in PRICING_TIERS:
        raise ValueError(f"Invalid tier: {tier}")

    tier_info = PRICING_TIERS[tier]

    headers = {
        "X-CC-Api-Key": COINBASE_API_KEY,
        "Content-Type": "application/json"
    }

    # Build metadata with wallet address if provided
    metadata = {
        "tier": tier,
        "credits": tier_info["credits"]
    }

    if wallet_address:
        metadata["wallet_address"] = wallet_address.lower()

    payload = {
        "name": f"Ghiblify {tier.capitalize()} Package",
        "description": tier_info["description"],
        "pricing_type": "fixed_price",
        "local_price": {
            "amount": tier_info["amount"],
            "currency": "USD"
        },
        "metadata": metadata
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{COINBASE_API_URL}/charges",
            headers=headers,
            json=payload
        )
        
        if response.status_code != 200:
            logger.error(f"Coinbase charge creation failed: {response.text}")
            raise HTTPException(status_code=500, detail="Failed to create charge")
            
        return response.json()

def verify_coinbase_webhook_signature(request_body: bytes, signature: str) -> bool:
    """Verify the webhook signature from Coinbase"""
    if not COINBASE_WEBHOOK_SECRET:
        raise ValueError("Coinbase webhook secret not configured")
        
    try:
        expected_sig = hmac.new(
            COINBASE_WEBHOOK_SECRET.encode('utf-8'),
            request_body,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature, expected_sig)
    except Exception as e:
        logger.error(f"Signature verification failed: {str(e)}")
        return False

@payments_router.post("/create-charge/{tier}")
async def create_charge(tier: str, request: Request):
    """Create a new charge for the specified tier"""
    try:
        # Get wallet address from request header (similar to other endpoints)
        wallet_address = request.headers.get("X-Wallet-Address")

        charge = await create_coinbase_charge(tier, wallet_address)
        return JSONResponse(content={
            "hosted_url": charge["data"]["hosted_url"],
            "charge_id": charge["data"]["id"]
        })
    except Exception as e:
        logger.error(f"Error creating charge: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@payments_router.post("/webhook/coinbase")
async def coinbase_webhook(request: Request):
    """Handle Coinbase Commerce webhooks"""
    try:
        # Get the signature from headers
        signature = request.headers.get('X-CC-Webhook-Signature')
        if not signature:
            raise HTTPException(status_code=400, detail="No signature provided")
            
        # Get the raw request body
        body = await request.body()
        
        # Verify the signature
        if not verify_coinbase_webhook_signature(body, signature):
            raise HTTPException(status_code=401, detail="Invalid signature")
            
        # Parse the webhook data
        event = json.loads(body)
        event_type = event['type']
        event_data = event['data']
        
        if event_type == 'charge:confirmed':
            # Payment confirmed - grant credits
            metadata = event_data['metadata']
            tier = metadata.get('tier')
            credits = metadata.get('credits')
            wallet_address = metadata.get('wallet_address')
            charge_id = event_data.get('id')

            if not wallet_address:
                logger.error(f"No wallet address found in metadata for charge {charge_id}")
                return JSONResponse(content={"status": "error", "message": "No wallet address provided"})

            if not credits:
                logger.error(f"No credits found in metadata for charge {charge_id}")
                return JSONResponse(content={"status": "error", "message": "No credits specified"})

            try:
                # Check if this payment has already been processed
                processed_key = f"coinbase_processed:{charge_id}"
                if redis_service.exists(processed_key):
                    logger.info(f"Payment {charge_id} already processed, skipping")
                    return JSONResponse(content={"status": "already_processed"})

                # Add credits to user account using the modern Redis service
                credits_to_add = int(credits)
                new_credits = redis_service.add_credits(wallet_address.lower(), credits_to_add)

                # Mark payment as processed to prevent double-crediting
                redis_service.set(processed_key, "processed", ex=86400)  # 24 hour expiry

                # Store payment history
                payment_data = {
                    "charge_id": charge_id,
                    "tier": tier,
                    "payment_method": "coinbase",
                    "credits": credits_to_add,
                    "amount": event_data.get('pricing', {}).get('local', {}).get('amount'),
                    "currency": event_data.get('pricing', {}).get('local', {}).get('currency'),
                    "status": "completed"
                }

                redis_service.add_payment_history(wallet_address.lower(), payment_data, "coinbase")

                logger.info(f"Coinbase payment confirmed: Added {credits_to_add} credits to {wallet_address}. New balance: {new_credits}")

            except Exception as e:
                logger.error(f"Error processing Coinbase payment {charge_id}: {str(e)}")
                return JSONResponse(content={"status": "error", "message": "Failed to process payment"})
            
        return JSONResponse(content={"status": "success"})
        
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@payments_router.get("/pricing")
async def get_pricing():
    """Get available pricing tiers"""
    return JSONResponse(content=PRICING_TIERS) 