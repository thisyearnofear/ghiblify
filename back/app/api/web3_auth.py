"""Web3 authentication handler."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import os
from redis import Redis
from eth_account.messages import encode_defunct
from web3 import Web3
from web3.auto import w3
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

web3_router = APIRouter()
# Configure Redis client
redis_host = os.getenv('REDIS_HOST', 'localhost')
redis_port = int(os.getenv('REDIS_PORT', 6379))
redis_password = os.getenv('REDIS_PASSWORD')
redis_ssl = os.getenv('REDIS_SSL', 'false').lower() == 'true'

logger.info(f"[Redis] Connecting to {redis_host}:{redis_port} (SSL: {redis_ssl})")

redis_client = Redis(
    host=redis_host,
    port=redis_port,
    password=redis_password,
    db=0,
    decode_responses=True,
    ssl=redis_ssl
)

# Test Redis connection
try:
    redis_client.ping()
    logger.info("[Redis] Connection successful")
    logger.info(f"[Redis] Server info: {redis_client.info('server')}")
except Exception as e:
    logger.error(f"[Redis] Connection failed: {str(e)}")
    raise

import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_credits(address: str) -> int:
    """Get credits for an address from Redis."""
    try:
        key = f'credits:{address.lower()}'
        credits = redis_client.get(key)
        value = int(credits) if credits else 0
        logger.info(f"[Redis GET] Key: {key}, Value: {value}")
        return value
    except Exception as e:
        logger.error(f"[Redis ERROR] Getting credits for {address}: {str(e)}")
        return 0

def set_credits(address: str, amount: int):
    """Set credits for an address in Redis."""
    try:
        key = f'credits:{address.lower()}'
        redis_client.set(key, str(amount))
        logger.info(f"[Redis SET] Key: {key}, Value: {amount}")
        
        # Log all keys for this address
        pattern = f'*{address.lower()}*'
        keys = redis_client.keys(pattern)
        logger.info(f"[Redis DEBUG] All keys for {address}: {keys}")
        
        # Verify the set operation
        stored_value = redis_client.get(key)
        logger.info(f"[Redis VERIFY] Key: {key}, Stored Value: {stored_value}")
    except Exception as e:
        logger.error(f"[Redis ERROR] Setting credits for {address}: {str(e)}")
        raise

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

@web3_router.get("/redis/test")
async def test_redis():
    """Test Redis connection"""
    try:
        test_key = "test:connection"
        test_value = "working"
        logger.info(f"[Redis TEST] Setting {test_key}={test_value}")
        redis_client.set(test_key, test_value)
        result = redis_client.get(test_key)
        logger.info(f"[Redis TEST] Got value: {result}")
        return JSONResponse(content={"status": "ok", "value": result})
    except Exception as e:
        logger.error(f"[Redis TEST] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@web3_router.get("/credits/check")
async def check_credits(address: str):
    """Check credits balance for an address."""
    try:
        credits = get_credits(address)
        logger.info(f"[Credits] Checked balance for {address}: {credits}")
        return JSONResponse(content={"credits": credits})
    except Exception as e:
        logger.error(f"[Credits] Error checking balance for {address}: {str(e)}")
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
