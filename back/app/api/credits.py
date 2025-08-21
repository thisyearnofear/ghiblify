from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv
import logging
from typing import Optional
from fastapi import status
from .credit_manager import credit_manager

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize router
credits_router = APIRouter()





async def get_wallet_address(request: Request) -> str:
    """Get wallet address from request header"""
    address = request.headers.get("X-Wallet-Address")
    if not address:
        raise HTTPException(status_code=401, detail="No wallet address provided")
    return address.lower()

@credits_router.post("/add/{credits}")
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