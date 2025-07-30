"""Web3 authentication handler - Refactored to use modern Redis service."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import secrets
import re
import time
from eth_account.messages import encode_defunct
from web3 import Web3
from web3.auto import w3
import logging

# Import our modern Redis service
from ..services.redis_service import redis_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SIWEVerifyRequest(BaseModel):
    address: str
    message: str
    signature: str

web3_router = APIRouter()

# Use the modern Redis service instead of direct client
REDIS_AVAILABLE = redis_service.available

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
        
        # Extract fields from the message - handle both quoted and unquoted nonces
        nonce_match = re.search(r'Nonce: "?([a-fA-F0-9]+)"?', message)
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

# Use the modern Redis service methods
def get_credits(address: str) -> int:
    """Get credits for an address - now using modern Redis service."""
    return redis_service.get_credits(address)

def set_credits(address: str, amount: int):
    """Set credits for an address - now using modern Redis service."""
    redis_service.set_credits(address, amount)

@web3_router.get("/auth/nonce")
async def get_nonce():
    """Generate a secure nonce for SIWE authentication - using modern Redis service."""
    try:
        # Generate a cryptographically secure random nonce
        nonce = secrets.token_hex(16)
        
        # Use modern Redis service
        redis_service.store_nonce(nonce, 900)  # 15 minutes
        
        logger.info(f"[SIWE] Generated nonce: {nonce}")
        # Return as plain text to avoid JSON encoding issues
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(content=nonce, media_type="text/plain")
    except Exception as e:
        logger.error(f"[SIWE] Nonce generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate nonce")

@web3_router.post("/auth/verify")
async def verify_siwe(request: SIWEVerifyRequest):
    """Verify SIWE signature and create session - using modern Redis service."""
    try:
        # Parse the SIWE message
        logger.info(f"[SIWE] Full message received: {repr(request.message)}")
        parsed = validate_siwe_message(request.message)
        logger.info(f"[SIWE] Parsed message: {parsed}")
        
        if not parsed.get('nonce'):
            logger.error(f"[SIWE] No nonce found in message: {request.message[:200]}...")
            raise HTTPException(status_code=400, detail="Invalid SIWE message format")
        
        # Check if nonce exists and is valid using modern Redis service
        nonce = parsed['nonce']
        logger.info(f"[SIWE] Validating nonce: {nonce}")
        
        if not redis_service.validate_nonce(nonce):
            logger.error(f"[SIWE] Nonce validation failed: {nonce}")
            raise HTTPException(status_code=400, detail="Invalid or expired nonce")
        
        # Verify the signature
        if not verify_siwe_signature(request.message, request.signature, request.address):
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Ensure the message address matches the claimed address
        if parsed['address'].lower() != request.address.lower():
            raise HTTPException(status_code=400, detail="Address mismatch")
        
        # Consume the used nonce
        redis_service.consume_nonce(nonce)
        
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
    """Test Redis connection - using modern Redis service"""
    try:
        test_key = "test:connection"
        test_value = "working"
        logger.info(f"[Redis TEST] Setting {test_key}={test_value}")
        
        success = redis_service.set(test_key, test_value)
        if success:
            result = redis_service.get(test_key)
            logger.info(f"[Redis TEST] Got value: {result}")
            return JSONResponse(content={
                "status": "ok",
                "value": result,
                "redis_available": redis_service.available
            })
        else:
            return JSONResponse(content={
                "status": "fallback",
                "message": "Using memory fallback",
                "redis_available": False
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
    """Get system status including Redis availability - using modern Redis service."""
    try:
        return JSONResponse(content=redis_service.get_status())
    except Exception as e:
        logger.error(f"[Status] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions for backward compatibility - now using modern Redis service
def redis_get(key: str) -> str:
    """Get a value from Redis or memory fallback."""
    return redis_service.get(key)

def redis_set(key: str, value: str, ex: int = None) -> bool:
    """Set a value in Redis or memory fallback."""
    return redis_service.set(key, value, ex)

def redis_exists(key: str) -> bool:
    """Check if key exists in Redis or memory fallback."""
    return redis_service.exists(key)

def redis_pipeline():
    """Get a Redis pipeline with fallback."""
    return redis_service.pipeline()

# Keep the MemoryPipeline class for any remaining direct usage
class MemoryPipeline:
    """Mock pipeline for memory fallback - kept for compatibility."""
    def __init__(self):
        self.operations = []
    
    def set(self, key: str, value: str, ex: int = None):
        self.operations.append(('set', key, value, ex))
        return self
    
    def execute(self):
        # This is now handled by the modern Redis service
        return [True] * len(self.operations)
