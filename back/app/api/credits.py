from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv
import logging
from typing import Optional
from fastapi import status
import warnings
from .credit_manager import credit_manager

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize router
credits_router = APIRouter()

# Decorator for deprecation warnings
def deprecated_endpoint(func):
    """Decorator to add deprecation warnings to legacy endpoints"""
    async def wrapper(*args, **kwargs):
        warnings.warn(
            f"The endpoint /{func.__name__} is deprecated. "
            f"Please use the unified wallet endpoints at /api/wallet/ instead. "
            f"These legacy endpoints will be removed in 6 months.",
            DeprecationWarning,
            stacklevel=2
        )
        logger.warning(f"[DEPRECATED] Legacy endpoint /{func.__name__} called. Please migrate to /api/wallet/")
        return await func(*args, **kwargs)
    return wrapper





async def get_wallet_address(request: Request) -> str:
    """Get wallet address from request header"""
    address = request.headers.get("X-Wallet-Address")
    if not address:
        raise HTTPException(status_code=401, detail="No wallet address provided")
    return address.lower()

@credits_router.post("/add/{credits}")
@deprecated_endpoint
async def add_credits(credits: int, request: Request) -> JSONResponse:
    """Add credits to a wallet address"""
    address = await get_wallet_address(request)
    # Use direct Redis operations for admin credit management
    from .web3_auth import get_credits, set_credits
    current_credits = get_credits(address)
    new_credits = current_credits + credits
    set_credits(address, new_credits)
    
    return JSONResponse(content={
        "address": address,
        "credits": new_credits
    })

@credits_router.get("/check")
@deprecated_endpoint
async def check_credits(request: Request) -> JSONResponse:
    """Check remaining credits"""
    address = await get_wallet_address(request)
    from .web3_auth import get_credits
    credits = get_credits(address)
    
    return JSONResponse(content={
        "address": address,
        "credits": credits
    })

@credits_router.post("/use")
@deprecated_endpoint
async def use_credit(request: Request) -> JSONResponse:
    """Use one credit and return updated count"""
    address = await get_wallet_address(request)
    from .web3_auth import get_credits, set_credits
    current_credits = get_credits(address)
    
    if current_credits <= 0:
        raise HTTPException(status_code=402, detail="No credits available")
    
    # Decrement credits
    new_credits = current_credits - 1
    set_credits(address, new_credits)
    
    return JSONResponse(content={
        "address": address,
        "credits": new_credits
    })
