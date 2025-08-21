"""
Unified Wallet API

Single API interface for all wallet operations:
- Address normalization
- Credit management
- User initialization
- Cross-platform compatibility

Replaces fragmented web3_auth.py and credits.py endpoints.
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import logging
import time
from .credit_manager import credit_manager
from .admin_credit_manager import admin_credit_manager
from .web3_auth import get_credits, set_credits
from ..services.redis_service import redis_service

# Configure logging
logger = logging.getLogger(__name__)

# Initialize router (prefix will be added by main app)
unified_wallet_router = APIRouter(prefix="/wallet", tags=["wallet"])

# ===== MODELS =====

class WalletUser(BaseModel):
    address: str
    credits: int
    provider: Optional[str] = None
    timestamp: Optional[int] = None

class CreditOperation(BaseModel):
    address: str
    amount: int
    operation: str  # 'add', 'use', 'check'

# ===== UTILITIES =====

def normalize_address(address: str) -> str:
    """Normalize wallet address to lowercase"""
    if not address:
        raise HTTPException(status_code=400, detail="Address is required")
    return address.lower().strip()

def validate_address(address: str) -> str:
    """Validate and normalize wallet address"""
    normalized = normalize_address(address)
    
    # Basic Ethereum address validation
    if not normalized.startswith('0x') or len(normalized) != 42:
        raise HTTPException(status_code=400, detail="Invalid Ethereum address format")
    
    return normalized

# ===== WALLET ENDPOINTS =====

@unified_wallet_router.post("/connect")
async def connect_wallet(
    address: str,
    provider: Optional[str] = None
) -> JSONResponse:
    """
    Connect a wallet and initialize user if needed.
    Works for RainbowKit, Base Account, Farcaster, etc.
    """
    try:
        logger.info(f"[Wallet] Connection attempt: address={address}, provider={provider}")

        # Validate and normalize address
        validated_address = validate_address(address)
        logger.info(f"[Wallet] Address validated: {validated_address}")

        # Initialize user if new - with better error handling
        try:
            current_credits = get_credits(validated_address)
            logger.info(f"[Wallet] Current credits for {validated_address}: {current_credits}")

            if current_credits == 0:
                # New user - ensure they exist in storage
                set_credits(validated_address, 0)
                logger.info(f"[Wallet] New user initialized: {validated_address}")
        except Exception as credit_error:
            logger.error(f"[Wallet] Credit initialization error for {validated_address}: {str(credit_error)}")
            # Continue with connection even if credits fail
            current_credits = 0

        # Get final credits using admin manager for consistency
        try:
            final_credits = admin_credit_manager.admin_get_credits(validated_address)["credits"]
        except Exception as admin_error:
            logger.error(f"[Wallet] Admin credit fetch error: {str(admin_error)}")
            final_credits = current_credits

        # Log successful connection
        logger.info(f"[Wallet] Successfully connected: {validated_address} via {provider or 'unknown'} with {final_credits} credits")

        return JSONResponse(content={
            "address": validated_address,
            "credits": final_credits,
            "provider": provider,
            "status": "connected"
        })

    except HTTPException as http_error:
        logger.error(f"[Wallet] HTTP error during connection: {str(http_error)}")
        raise
    except Exception as e:
        logger.error(f"[Wallet] Unexpected connection error: {str(e)}")
        import traceback
        logger.error(f"[Wallet] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Connection failed: {str(e)}")

@unified_wallet_router.get("/status/{address}")
async def get_wallet_status(address: str) -> JSONResponse:
    """Get current wallet status and credits"""
    try:
        validated_address = validate_address(address)
        credits = get_credits(validated_address)
        
        return JSONResponse(content={
            "address": validated_address,
            "credits": credits,
            "status": "active" if credits >= 0 else "inactive"
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Wallet] Status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

# ===== CREDIT ENDPOINTS =====

@unified_wallet_router.get("/credits/{address}")
async def get_credits_balance(address: str) -> JSONResponse:
    """Get credit balance for an address"""
    try:
        logger.info(f"[Credits] Balance check request for: {address}")

        validated_address = validate_address(address)
        logger.info(f"[Credits] Address validated: {validated_address}")

        # Try to get credits with fallback handling
        try:
            credits = get_credits(validated_address)
            logger.info(f"[Credits] Retrieved credits for {validated_address}: {credits}")
        except Exception as credit_error:
            logger.error(f"[Credits] Error getting credits for {validated_address}: {str(credit_error)}")
            # Fallback to 0 credits for new users
            credits = 0
            # Try to initialize the user
            try:
                set_credits(validated_address, 0)
                logger.info(f"[Credits] Initialized new user {validated_address} with 0 credits")
            except Exception as init_error:
                logger.error(f"[Credits] Failed to initialize user {validated_address}: {str(init_error)}")

        return JSONResponse(content={
            "address": validated_address,
            "credits": credits
        })

    except HTTPException as http_error:
        logger.error(f"[Credits] HTTP error during balance check: {str(http_error)}")
        raise
    except Exception as e:
        logger.error(f"[Credits] Unexpected balance check error: {str(e)}")
        import traceback
        logger.error(f"[Credits] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Balance check failed: {str(e)}")

@unified_wallet_router.post("/credits/add")
async def add_credits(
    address: str,
    amount: int
) -> JSONResponse:
    """Add credits to an address"""
    try:
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")
            
        validated_address = validate_address(address)
        result = admin_credit_manager.admin_add_credits(validated_address, amount, "API Add Credits")
        
        logger.info(f"[Credits] Added {amount} credits to {validated_address}: {result['old_balance']} -> {result['new_balance']}")
        
        return JSONResponse(content={
            "address": validated_address,
            "credits": new_credits,
            "added": amount
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Credits] Add error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add credits: {str(e)}")

@unified_wallet_router.post("/credits/use")
async def use_credits(
    address: str,
    amount: int = 1
) -> JSONResponse:
    """Use credits from an address"""
    try:
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")
            
        validated_address = validate_address(address)
        # Use the core credit manager for spending (not admin manager)
        try:
            new_balance = credit_manager.validate_and_spend_credit(validated_address, "API Use Credits")
            logger.info(f"[Credits] Used {amount} credits from {validated_address}. New balance: {new_balance}")
        except Exception as e:
            if "need credits" in str(e) or "Insufficient" in str(e):
                current_credits = admin_credit_manager.admin_get_credits(validated_address)["credits"]
                raise HTTPException(
                    status_code=402, 
                    detail=f"Insufficient credits. Required: {amount}, Available: {current_credits}"
                )
            raise e
        
        return JSONResponse(content={
            "address": validated_address,
            "credits": new_credits,
            "used": amount
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Credits] Use error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to use credits: {str(e)}")

# ===== ADMIN ENDPOINTS =====

@unified_wallet_router.post("/admin/credits/set")
async def admin_set_credits(
    address: str,
    amount: int,
    admin_key: Optional[str] = None
) -> JSONResponse:
    """Admin endpoint to set exact credit amount"""
    try:
        # Simple admin key check (in production, use proper authentication)
        if admin_key != "admin_key_here":  # Replace with proper admin auth
            raise HTTPException(status_code=403, detail="Admin access required")
            
        validated_address = validate_address(address)
        result = admin_credit_manager.admin_set_credits(validated_address, amount, "Admin Set Credits")

        logger.info(f"[Admin] Set credits for {validated_address}: {result['old_balance']} -> {result['new_balance']}")

        return JSONResponse(content={
            "address": validated_address,
            "credits": amount,
            "previous": result['old_balance']
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Admin] Set credits error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to set credits: {str(e)}")

# ===== HEALTH CHECK =====

@unified_wallet_router.get("/health")
async def wallet_health_check() -> JSONResponse:
    """Health check for wallet service"""
    try:
        # Test Redis connection
        test_address = "0x0000000000000000000000000000000000000000"
        test_credits = admin_credit_manager.admin_get_credits(test_address)["credits"]
        
        return JSONResponse(content={
            "status": "healthy",
            "service": "unified-wallet",
            "redis": "connected",
            "timestamp": int(time.time())
        })
        
    except Exception as e:
        logger.error(f"[Health] Wallet service unhealthy: {str(e)}")
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

# ===== BACKWARDS COMPATIBILITY =====

# Keep old endpoints for gradual migration
@unified_wallet_router.get("/web3/credits/check")
async def legacy_check_credits(address: str) -> JSONResponse:
    """Legacy endpoint for backwards compatibility"""
    return await get_credits_balance(address)

@unified_wallet_router.post("/web3/credits/use")
async def legacy_use_credits(address: str, amount: int = 1) -> JSONResponse:
    """Legacy endpoint for backwards compatibility"""
    return await use_credits(address, amount)

@unified_wallet_router.post("/web3/credits/add")
async def legacy_add_credits(address: str, amount: int) -> JSONResponse:
    """Legacy endpoint for backwards compatibility"""
    return await add_credits(address, amount)
