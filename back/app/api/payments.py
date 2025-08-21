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

async def create_coinbase_charge(tier: str) -> dict:
    """Create a new charge on Coinbase Commerce"""
    if tier not in PRICING_TIERS:
        raise ValueError(f"Invalid tier: {tier}")
    
    tier_info = PRICING_TIERS[tier]
    
    headers = {
        "X-CC-Api-Key": COINBASE_API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "name": f"Ghiblify {tier.capitalize()} Package",
        "description": tier_info["description"],
        "pricing_type": "fixed_price",
        "local_price": {
            "amount": tier_info["amount"],
            "currency": "USD"
        },
        "metadata": {
            "tier": tier,
            "credits": tier_info["credits"]
        }
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
async def create_charge(tier: str):
    """Create a new charge for the specified tier"""
    try:
        charge = await create_coinbase_charge(tier)
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
            
            # TODO: Implement user credits database update
            logger.info(f"Payment confirmed for tier {tier} - granting {credits} credits")
            
        return JSONResponse(content={"status": "success"})
        
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@payments_router.get("/pricing")
async def get_pricing():
    """Get available pricing tiers"""
    return JSONResponse(content=PRICING_TIERS) 