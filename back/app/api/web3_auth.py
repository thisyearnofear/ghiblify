"""Web3 authentication handler."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import os
from redis import Redis
from eth_account.messages import encode_defunct
from web3 import Web3
from web3.auto import w3

web3_router = APIRouter()
redis_client = Redis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    password=os.getenv('REDIS_PASSWORD'),
    db=0,
    decode_responses=True,
    ssl=True if os.getenv('REDIS_SSL', 'false').lower() == 'true' else False
)

def get_credits(address: str) -> int:
    """Get credits for an address from Redis."""
    credits = redis_client.get(f'credits:{address.lower()}')
    return int(credits) if credits else 0

def set_credits(address: str, amount: int):
    """Set credits for an address in Redis."""
    redis_client.set(f'credits:{address.lower()}', str(amount))

@web3_router.post("/login")
async def web3_login(address: str):
    """Login with Web3 address."""
    try:
        # Initialize credits if new user
        if not redis_client.exists(f'credits:{address.lower()}'):
            set_credits(address, 0)
            
        return JSONResponse(content={
            "address": address.lower(),
            "credits": get_credits(address)
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@web3_router.get("/credits/check")
async def check_credits(address: str):
    """Check credits balance for an address."""
    try:
        credits = get_credits(address)
        return JSONResponse(content={"credits": credits})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@web3_router.post("/credits/add")
async def add_credits(address: str, amount: int):
    """Add credits to an address."""
    try:
        current_credits = get_credits(address)
        set_credits(address, current_credits + amount)
        return JSONResponse(content={"credits": current_credits + amount})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@web3_router.post("/credits/use")
async def use_credits(address: str, amount: int = 1):
    """Use credits from an address."""
    try:
        current_credits = get_credits(address)
        if current_credits < amount:
            raise HTTPException(status_code=400, detail="Insufficient credits")
            
        set_credits(address, current_credits - amount)
        return JSONResponse(content={"credits": current_credits - amount})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
