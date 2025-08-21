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
        # Validate and normalize address
        validated_address = validate_address(address)
        
        # Initialize user if new
        current_credits = get_credits(validated_address)
        if current_credits == 0:
            # New user - could give welcome credits here
            set_credits(validated_address, 0)
            logger.info(f"[Wallet] New user initialized: {validated_address}")
        
        # Log connection
        logger.info(f"[Wallet] Connected: {validated_address} via {provider or 'unknown'}")
        
        return JSONResponse(content={
            "address": validated_address,
            "credits": admin_credit_manager.admin_get_credits(validated_address)["credits"],
            "provider": provider,
            "status": "connected"
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Wallet] Connection error: {str(e)}")
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
        validated_address = validate_address(address)
        credits = get_credits(validated_address)
        
        logger.info(f"[Credits] Balance check for {validated_address}: {credits}")
        
        return JSONResponse(content={
            "address": validated_address,
            "credits": credits
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Credits] Balance check error: {str(e)}")
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
            "previous": old_credits
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
