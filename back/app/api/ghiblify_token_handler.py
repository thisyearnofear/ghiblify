from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
import os
import logging
import json
from typing import Optional
from dotenv import load_dotenv
from web3 import Web3
from ..services.redis_service import redis_service
from .admin_credit_manager import admin_credit_manager
from ..config.pricing import get_tier_pricing, validate_payment_amount, BASE_PRICING

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize router
ghiblify_token_router = APIRouter()

# Base mainnet configuration
BASE_RPC_URL = os.getenv('BASE_RPC_URL', 'https://mainnet.base.org')
logger.info(f"[GHIBLIFY Token] Using RPC URL: {BASE_RPC_URL}")
w3 = Web3(Web3.HTTPProvider(BASE_RPC_URL))

# Contract configuration (matching frontend)
GHIBLIFY_TOKEN_PAYMENTS_ADDRESS = os.getenv('GHIBLIFY_TOKEN_PAYMENTS_ADDRESS', '0x41f2fA6E60A34c26BD2C467d21EcB0a2f9087B03')
GHIBLIFY_TOKEN_ADDRESS = '0xc2B2EA7f6218CC37debBAFE71361C088329AE090'

# Contract ABI (matching frontend)
GHIBLIFY_PAYMENTS_ABI = [
    {
        "inputs": [{"name": "packageTier", "type": "string"}],
        "name": "purchaseCreditsWithGhiblify",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"name": "packageTier", "type": "string"}],
        "name": "getTokenPackagePrice",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "buyer", "type": "address"},
            {"indexed": False, "name": "packageTier", "type": "string"},
            {"indexed": False, "name": "tokenAmount", "type": "uint256"},
            {"indexed": False, "name": "credits", "type": "uint256"},
            {"indexed": False, "name": "timestamp", "type": "uint256"},
        ],
        "name": "CreditsPurchased",
        "type": "event",
    },
]

# Tier mapping (matching frontend)
TOKEN_TIER_MAPPING = {
    "starter": "starter",
    "pro": "pro", 
    "unlimited": "don",  # Map 'unlimited' to 'don' for contract interaction
}

# Credit packages (matching existing pricing structure)
GHIBLIFY_TOKEN_PACKAGES = {
    "starter": {"credits": 1},
    "pro": {"credits": 12},
    "unlimited": {"credits": 30},
}

# Valid tiers
VALID_TIERS = set(BASE_PRICING.keys())

@ghiblify_token_router.post("/process-payment")
async def process_ghiblify_token_payment(request: Request):
    """Process a GHIBLIFY token payment completion"""
    try:
        body = await request.json()
        
        # Extract payment details from frontend
        transaction_hash = body.get("transactionHash")
        user_address = body.get("userAddress")
        tier = body.get("tier")
        token_amount = body.get("tokenAmount")
        usd_amount = body.get("usdAmount")
        discount = body.get("discount")
        block_number = body.get("blockNumber")
        timestamp = body.get("timestamp")
        
        if not all([transaction_hash, user_address, tier, token_amount]):
            raise HTTPException(status_code=400, detail="Missing required payment data")
        
        # Validate tier
        if tier not in VALID_TIERS:
            raise HTTPException(status_code=400, detail=f"Invalid tier: {tier}")
        
        logger.info(f"[GHIBLIFY Token] Processing payment {transaction_hash} for {user_address}")
        
        # Check if payment was already processed
        processed_key = f"ghiblify_token_processed:{transaction_hash}"
        if redis_service.exists(processed_key):
            logger.info(f"[GHIBLIFY Token] Payment {transaction_hash} already processed")
            return JSONResponse(content={"status": "already_processed"})
        
        # Verify transaction on blockchain
        try:
            receipt = w3.eth.get_transaction_receipt(transaction_hash)
            if not receipt or receipt['status'] == 0:
                raise HTTPException(status_code=400, detail="Transaction failed or not found")
            
            # Verify the transaction is to the correct contract
            if receipt['to'].lower() != GHIBLIFY_TOKEN_PAYMENTS_ADDRESS.lower():
                raise HTTPException(status_code=400, detail="Transaction not to GHIBLIFY payments contract")
            
        except Exception as e:
            logger.error(f"[GHIBLIFY Token] Error verifying transaction: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to verify transaction: {str(e)}")
        
        # Process the payment
        try:
            # Get contract instance
            contract = w3.eth.contract(
                address=Web3.to_checksum_address(GHIBLIFY_TOKEN_PAYMENTS_ADDRESS), 
                abi=GHIBLIFY_PAYMENTS_ABI
            )
            
            # Get events from receipt
            purchase_events = contract.events.CreditsPurchased().process_receipt(receipt)
            
            if not purchase_events:
                logger.warning(f"[GHIBLIFY Token] No purchase events found in tx {transaction_hash}")
                raise HTTPException(status_code=400, detail="No purchase events found in transaction")
            
            event = purchase_events[0]
            event_buyer = Web3.to_checksum_address(event['args']['buyer'])
            event_tier = event['args']['packageTier']
            event_token_amount = event['args']['tokenAmount']
            event_credits = event['args']['credits']
            
            # Verify the buyer matches
            if event_buyer.lower() != user_address.lower():
                raise HTTPException(status_code=400, detail="Transaction buyer does not match provided address")
            
            # Map tier for validation
            mapped_tier = TOKEN_TIER_MAPPING.get(event_tier, event_tier)
            if mapped_tier != tier:
                raise HTTPException(status_code=400, detail=f"Transaction tier {event_tier} does not match provided tier {tier}")
            
            # Add credits to user account
            credits_to_add = int(event_credits)

            # Add credits using AdminCreditManager
            result = admin_credit_manager.admin_add_credits(
                user_address.lower(),
                credits_to_add,
                "GHIBLIFY Token Payment"
            )

            # Mark payment as processed
            redis_service.set(processed_key, "processed", ex=86400)  # 24 hour expiry

            # Store transaction history
            transaction_data = {
                "transaction_hash": transaction_hash,
                "tier": tier,
                "payment_method": "ghiblify_token",
                "token_amount": str(token_amount),
                "usd_amount": usd_amount,
                "discount": discount,
                "credits": credits_to_add,
                "block_number": block_number,
                "timestamp": timestamp,
                "status": "completed"
            }

            # Add to payment history
            redis_service.add_payment_history(user_address.lower(), transaction_data, "ghiblify_token")

            logger.info(f"[GHIBLIFY Token] Added {credits_to_add} credits to {user_address}. New balance: {result['new_balance']}")

            return JSONResponse(content={
                "status": "success",
                "credits_added": credits_to_add,
                "new_balance": result["new_balance"],
                "transaction_hash": transaction_hash
            })
            
        except Exception as e:
            logger.error(f"[GHIBLIFY Token] Error processing payment: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to process payment: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GHIBLIFY Token] Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@ghiblify_token_router.get("/check-payment/{transaction_hash}")
async def check_ghiblify_token_payment(transaction_hash: str, address: Optional[str] = None):
    """Check the status of a GHIBLIFY token payment"""
    try:
        # Check if payment was processed
        processed_key = f"ghiblify_token_processed:{transaction_hash}"
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
            # Check transaction status on blockchain
            try:
                receipt = w3.eth.get_transaction_receipt(transaction_hash)
                if not receipt:
                    return JSONResponse(content={"status": "pending"})
                elif receipt['status'] == 0:
                    return JSONResponse(content={"status": "failed"})
                else:
                    return JSONResponse(content={"status": "confirmed_not_processed"})
            except:
                return JSONResponse(content={"status": "pending"})
            
    except Exception as e:
        logger.error(f"[GHIBLIFY Token] Error checking payment status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@ghiblify_token_router.get("/pricing")
async def get_ghiblify_token_pricing():
    """Get GHIBLIFY token pricing tiers"""
    return JSONResponse(content=GHIBLIFY_TOKEN_PACKAGES)

@ghiblify_token_router.get("/history/{address}")
async def get_ghiblify_token_history(address: str):
    """Get GHIBLIFY token transaction history for an address"""
    try:
        # Get payment history from Redis service
        transactions = redis_service.get_payment_history(address.lower(), "ghiblify_token")
        
        return JSONResponse(content={
            "transactions": transactions
        })
        
    except Exception as e:
        logger.error(f"[GHIBLIFY Token] Error getting payment history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Export the router
__all__ = ['ghiblify_token_router']
