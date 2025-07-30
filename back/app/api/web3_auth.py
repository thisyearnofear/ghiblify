"""Web3 authentication handler."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import secrets
import re
import time
from redis import Redis
from eth_account.messages import encode_defunct
from web3 import Web3
from web3.auto import w3
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SIWEVerifyRequest(BaseModel):
    address: str
    message: str
    signature: str

web3_router = APIRouter()
# Configure Redis client with Upstash support
redis_host = os.getenv('REDIS_HOST', 'active-mosquito-46497.upstash.io')
redis_port = int(os.getenv('REDIS_PORT', 6379))
redis_password = os.getenv('REDIS_PASSWORD')  # Should be set to: AbWhAAIjcDE2ZmM4N2JkNjg0OTU0ZDhkOGI3YmM5YWRkMDE2ZTlkZHAxMA
redis_ssl = os.getenv('REDIS_SSL', 'true').lower() == 'true'  # Default to true for Upstash
redis_username = os.getenv('REDIS_USERNAME', 'default')

logger.info(f"[Redis] Connecting to {redis_host}:{redis_port} (SSL: {redis_ssl}, Username: {redis_username})")

redis_client = Redis(
    host=redis_host,
    port=redis_port,
    username=redis_username,
    password=redis_password,
    db=0,
    decode_responses=True,
    ssl=redis_ssl,
    ssl_cert_reqs=None  # For Upstash compatibility
)

# Test Redis connection
REDIS_AVAILABLE = False
try:
    redis_client.ping()
    REDIS_AVAILABLE = True
    logger.info("[Redis] Connection successful")
    logger.info(f"[Redis] Server info: {redis_client.info('server')}")
except Exception as e:
    logger.error(f"[Redis] Connection failed: {str(e)}")
    logger.warning("[Redis] Continuing without Redis - credits will not persist")
    REDIS_AVAILABLE = False

def verify_siwe_signature(message: str, signature: str, address: str) -> bool:
    """Verify SIWE signature using eth-account."""
    try:
        # Create the message hash
        message_hash = encode_defunct(text=message)
        
        # Recover the address from signature
        recovered_address = w3.eth.account.recover_message(message_hash, signature=signature)
        
        # Compare addresses (case insensitive)
        return recovered_address.lower() == address.lower()
    except Exception as e:
        logger.error(f"[SIWE] Signature verification failed: {str(e)}")
        return False

def validate_siwe_message(message: str, expected_domain: str = None) -> dict:
    """Parse and validate SIWE message format."""
    try:
        lines = message.strip().split('\n')
        
        # Extract domain (first line)
        domain_line = lines[0].split(' wants you to sign in')[0] if lines else ""
        
        # Extract address (second line)
        address_line = lines[1] if len(lines) > 1 else ""
        
        # Extract fields from the message
        nonce_match = re.search(r'Nonce: (\w+)', message)
        chain_id_match = re.search(r'Chain ID: (\d+)', message)
        issued_at_match = re.search(r'Issued At: (.+)', message)
        
        return {
            'domain': domain_line,
            'address': address_line,
            'nonce': nonce_match.group(1) if nonce_match else None,
            'chain_id': int(chain_id_match.group(1)) if chain_id_match else None,
            'issued_at': issued_at_match.group(1) if issued_at_match else None,
        }
    except Exception as e:
        logger.error(f"[SIWE] Message parsing failed: {str(e)}")
        return {}

# In-memory fallback storage when Redis is unavailable
_memory_credits = {}
_memory_nonces = {}

def get_credits(address: str) -> int:
    """Get credits for an address from Redis or memory fallback."""
    if not REDIS_AVAILABLE:
        value = _memory_credits.get(address.lower(), 0)
        logger.info(f"[Memory GET] Address: {address.lower()}, Value: {value}")
        return value
        
    try:
        key = f'credits:{address.lower()}'
        credits = redis_client.get(key)
        value = int(credits) if credits else 0
        logger.info(f"[Redis GET] Key: {key}, Value: {value}")
        return value
    except Exception as e:
        logger.error(f"[Redis ERROR] Getting credits for {address}: {str(e)}")
        # Fallback to memory
        value = _memory_credits.get(address.lower(), 0)
        logger.info(f"[Memory FALLBACK GET] Address: {address.lower()}, Value: {value}")
        return value

def set_credits(address: str, amount: int):
    """Set credits for an address in Redis or memory fallback."""
    if not REDIS_AVAILABLE:
        _memory_credits[address.lower()] = amount
        logger.info(f"[Memory SET] Address: {address.lower()}, Value: {amount}")
        return
        
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
        # Fallback to memory
        _memory_credits[address.lower()] = amount
        logger.info(f"[Memory FALLBACK SET] Address: {address.lower()}, Value: {amount}")
        logger.warning("Credits set in memory only - will not persist across restarts")

@web3_router.get("/auth/nonce")
async def get_nonce():
    """Generate a secure nonce for SIWE authentication."""
    try:
        # Generate a cryptographically secure random nonce
        nonce = secrets.token_hex(16)
        
        if REDIS_AVAILABLE:
            # Store nonce in Redis with 15 minute expiration
            redis_client.setex(f"nonce:{nonce}", 900, "valid")
            logger.info(f"[Redis] Stored nonce: {nonce}")
        else:
            # Store nonce in memory with timestamp for expiration
            _memory_nonces[nonce] = time.time() + 900  # 15 minutes from now
            logger.info(f"[Memory] Stored nonce: {nonce}")
        
        logger.info(f"[SIWE] Generated nonce: {nonce}")
        return nonce
    except Exception as e:
        logger.error(f"[SIWE] Nonce generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate nonce")

@web3_router.post("/auth/verify")
async def verify_siwe(request: SIWEVerifyRequest):
    """Verify SIWE signature and create session."""
    try:
        # Parse the SIWE message
        parsed = validate_siwe_message(request.message)
        
        if not parsed.get('nonce'):
            raise HTTPException(status_code=400, detail="Invalid SIWE message format")
        
        # Check if nonce exists and is valid
        nonce = parsed['nonce']
        nonce_valid = False
        
        if REDIS_AVAILABLE:
            nonce_key = f"nonce:{nonce}"
            nonce_valid = redis_client.exists(nonce_key)
        else:
            # Check memory nonces and clean up expired ones
            current_time = time.time()
            # Clean up expired nonces
            expired_nonces = [n for n, exp_time in _memory_nonces.items() if current_time > exp_time]
            for expired_nonce in expired_nonces:
                del _memory_nonces[expired_nonce]
            # Check if nonce is valid
            nonce_valid = nonce in _memory_nonces and current_time <= _memory_nonces[nonce]
            
        if not nonce_valid:
            raise HTTPException(status_code=400, detail="Invalid or expired nonce")
        
        # Verify the signature
        if not verify_siwe_signature(request.message, request.signature, request.address):
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Ensure the message address matches the claimed address
        if parsed['address'].lower() != request.address.lower():
            raise HTTPException(status_code=400, detail="Address mismatch")
        
        # Delete the used nonce
        if REDIS_AVAILABLE:
            redis_client.delete(nonce_key)
        else:
            _memory_nonces.pop(nonce, None)
        
        # Initialize credits if new user
        current_credits = get_credits(request.address)
        if current_credits == 0:  # This handles both new users and existing users with 0 credits
            set_credits(request.address, 0)  # Ensure the user exists in storage
        
        logger.info(f"[SIWE] Authentication successful for {request.address}")
        
        return JSONResponse(content={
            "ok": True,
            "address": request.address.lower(),
            "credits": get_credits(request.address)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[SIWE] Verification failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Authentication failed")

@web3_router.post("/login")
async def web3_login(address: str):
    """Login with Web3 address."""
    try:
        # Initialize credits if new user
        current_credits = get_credits(address)
        if current_credits == 0:  # This handles both new users and existing users with 0 credits
            set_credits(address, 0)  # Ensure the user exists in storage
            
        return JSONResponse(content={
            "address": address.lower(),
            "credits": get_credits(address)
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@web3_router.get("/redis/test")
async def test_redis():
    """Test Redis connection"""
    if not REDIS_AVAILABLE:
        return JSONResponse(content={
            "status": "unavailable",
            "message": "Redis is not available - using in-memory fallback",
            "redis_available": False
        })
        
    try:
        test_key = "test:connection"
        test_value = "working"
        logger.info(f"[Redis TEST] Setting {test_key}={test_value}")
        redis_client.set(test_key, test_value)
        result = redis_client.get(test_key)
        logger.info(f"[Redis TEST] Got value: {result}")
        return JSONResponse(content={
            "status": "ok", 
            "value": result,
            "redis_available": True
        })
    except Exception as e:
        logger.error(f"[Redis TEST] Error: {str(e)}")
        return JSONResponse(content={
            "status": "error",
            "message": str(e),
            "redis_available": False
        })

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

@web3_router.get("/status")
async def get_system_status():
    """Get system status including Redis availability."""
    try:
        status = {
            "redis_available": REDIS_AVAILABLE,
            "storage_mode": "redis" if REDIS_AVAILABLE else "memory",
            "timestamp": int(time.time())
        }
        
        if not REDIS_AVAILABLE:
            status["warning"] = "Using in-memory storage - data will not persist across restarts"
            status["active_users"] = len(_memory_credits)
            status["active_nonces"] = len(_memory_nonces)
        
        return JSONResponse(content=status)
    except Exception as e:
        logger.error(f"[Status] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
