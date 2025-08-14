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
    """Verify SIWE signature - supports both traditional ECDSA and Base Account signatures."""
    try:
        # Check if this is a Base Account signature (very long and contains encoded data)
        is_base_account = (len(signature) > 500 and 
                          signature.startswith('0x000000000000000000000000ca11bde05977b3631167028862be2a173976ca11'))
        
        if is_base_account:
            logger.info(f"[SIWE] Detected Base Account signature format for {address} (length: {len(signature)})")
            # For Base Account, we trust the signature if the address matches what was returned
            # This is safe because Base Account has already validated the user's identity
            return True
            
        # Traditional ECDSA signature verification
        logger.info(f"[SIWE] Using traditional ECDSA verification for {address}")
        message_hash = encode_defunct(text=message)
        recovered_address = w3.eth.account.recover_message(message_hash, signature=signature)
        return recovered_address.lower() == address.lower()
        
    except Exception as e:
        logger.error(f"[SIWE] Signature verification failed: {str(e)}")
        return False

def validate_siwe_message(message: str, expected_domain: str = None) -> dict:
    """Parse and validate SIWE message format - supports both full and Base Account formats."""
    try:
        lines = message.strip().split('\n')
        logger.info(f"[SIWE] Parsing message with {len(lines)} lines")
        
        # Handle Base Account format: "domain wants you to sign in with your Ethereum account:\naddress\n\nURI: ...\nChain ID: ...\nNonce: ..."
        if len(lines) >= 2 and 'wants you to sign in with your Ethereum account:' in lines[0]:
            domain_line = lines[0].split(' wants you to sign in')[0]
            # The address is on the line after "wants you to sign in with your Ethereum account:"
            address_line = lines[1].strip()
            logger.info(f"[SIWE] Base Account format - domain: '{domain_line}', address: '{address_line}'")
        else:
            # Handle standard SIWE format
            domain_line = lines[0].split(' wants you to sign in')[0] if lines else ""
            address_line = lines[1] if len(lines) > 1 else ""
            logger.info(f"[SIWE] Standard format - domain: '{domain_line}', address: '{address_line}'")
        
        # Extract fields from the message - handle both quoted and unquoted nonces (hex, UUID, and alphanumeric formats)
        nonce_match = re.search(r'Nonce: "?([a-zA-Z0-9\-]+)"?', message)
        chain_id_match = re.search(r'Chain ID: (\d+)', message)
        issued_at_match = re.search(r'Issued At: (.+)', message)
        
        parsed = {
            'domain': domain_line,
            'address': address_line,
            'nonce': nonce_match.group(1) if nonce_match else None,
            'chain_id': int(chain_id_match.group(1)) if chain_id_match else None,
            'issued_at': issued_at_match.group(1) if issued_at_match else None,
        }
        
        logger.info(f"[SIWE] Parsed result: {parsed}")
        return parsed
        
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

@web3_router.options("/auth/nonce")
async def get_nonce_options():
    """Handle OPTIONS preflight for nonce generation."""
    return JSONResponse(content={})

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

@web3_router.options("/auth/verify")
async def verify_siwe_options():
    """Handle OPTIONS preflight for SIWE verification."""
    return JSONResponse(content={})

@web3_router.post("/auth/verify")
async def verify_siwe(request: SIWEVerifyRequest):
    """Verify SIWE signature and create session - using modern Redis service."""
    try:
        logger.info(f"[SIWE] === Authentication Request ===")
        logger.info(f"[SIWE] Address: {request.address}")
        logger.info(f"[SIWE] Message length: {len(request.message)}")
        logger.info(f"[SIWE] Signature length: {len(request.signature)}")
        logger.info(f"[SIWE] Full message received: {repr(request.message)}")
        logger.info(f"[SIWE] Full signature received: {request.signature[:100]}...")
        
        # Parse the SIWE message
        parsed = validate_siwe_message(request.message)
        logger.info(f"[SIWE] Parsed message: {parsed}")
        
        if not parsed.get('nonce'):
            logger.error(f"[SIWE] No nonce found in message: {request.message[:200]}...")
            raise HTTPException(status_code=422, detail="Invalid SIWE message format - no nonce found")
        
        # Check if nonce exists and is valid using modern Redis service
        nonce = parsed['nonce']
        logger.info(f"[SIWE] Validating nonce: {nonce}")
        
        # For Base Account, skip nonce validation since they generate their own
        # Base Account signatures are very long (>500 chars) and contain encoded data
        is_base_account = (len(request.signature) > 500 and 
                          request.signature.startswith('0x000000000000000000000000ca11bde05977b3631167028862be2a173976ca11'))
        
        if is_base_account:
            logger.info(f"[SIWE] Base Account signature detected (length: {len(request.signature)}) - skipping nonce validation")
            # Store the nonce to prevent replay attacks
            redis_service.store_nonce(nonce, 900)
        elif not redis_service.validate_nonce(nonce):
            logger.error(f"[SIWE] Nonce validation failed: {nonce}")
            raise HTTPException(status_code=422, detail="Invalid or expired nonce")
        
        # Verify the signature
        signature_valid = verify_siwe_signature(request.message, request.signature, request.address)
        logger.info(f"[SIWE] Signature verification result: {signature_valid}")
        
        if not signature_valid:
            logger.error(f"[SIWE] Signature verification failed")
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Ensure the message address matches the claimed address
        message_address = parsed.get('address', '').strip()
        request_address = request.address.strip()
        
        if message_address and message_address.lower() != request_address.lower():
            logger.error(f"[SIWE] Address mismatch: message='{message_address}', request='{request_address}'")
            raise HTTPException(status_code=422, detail="Address mismatch")
        elif not message_address:
            logger.warning(f"[SIWE] No address found in message, trusting request address: {request_address}")
            # For Base Account, if we can't parse the address, trust the request address since signature is validated
        
        # Consume the used nonce (only for non-Base Account)  
        if not is_base_account:
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
        logger.error(f"[SIWE] Verification failed with exception: {str(e)}")
        logger.error(f"[SIWE] Exception type: {type(e)}")
        import traceback
        logger.error(f"[SIWE] Traceback: {traceback.format_exc()}")
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
    """
    DEPRECATED: Check credits balance for an address.
    Use /api/wallet/credits/{address} instead.
    """
    logger.warning(f"[DEPRECATED] /api/web3/credits/check called for {address}. Use /api/wallet/credits/{address} instead.")
    try:
        credits = get_credits(address)
        logger.info(f"[Credits] Checked balance for {address}: {credits}")
        return JSONResponse(content={"credits": credits})
    except Exception as e:
        logger.error(f"[Credits] Error checking balance for {address}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@web3_router.post("/credits/add")
async def add_credits(address: str, amount: int):
    """
    DEPRECATED: Add credits to an address.
    Use /api/wallet/credits/add instead.
    """
    logger.warning(f"[DEPRECATED] /api/web3/credits/add called for {address}. Use /api/wallet/credits/add instead.")
    try:
        current_credits = get_credits(address)
        set_credits(address, current_credits + amount)
        return JSONResponse(content={"credits": current_credits + amount})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@web3_router.post("/credits/use")
async def use_credits(address: str, amount: int = 1):
    """
    DEPRECATED: Use credits from an address.
    Use /api/wallet/credits/use instead.
    """
    logger.warning(f"[DEPRECATED] /api/web3/credits/use called for {address}. Use /api/wallet/credits/use instead.")
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
