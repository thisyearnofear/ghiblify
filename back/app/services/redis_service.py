"""
Modern Redis Service - Refactored from web3_auth.py
Implements DRY, CLEAN, ORGANISED, PERFORMANT, MODULAR principles
"""
import os
import time
import json
from typing import Optional, Dict, Any, List, Union
from dataclasses import dataclass
from enum import Enum
from redis import Redis, ConnectionPool
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)

class KeyNamespace(Enum):
    """Consistent key namespacing - extracted from existing patterns"""
    CREDITS = "credits"
    NONCES = "nonces" 
    STRIPE_CUSTOMERS = "stripe_customer"
    BASE_PAY_PROCESSED = "base_pay_processed"
    BASE_PAY_HISTORY = "base_pay_history"
    CELO_HISTORY = "celo_history"
    PROCESSED_TX = "processed_tx"
    SESSIONS = "credited:session"
    SYSTEM = "system"

@dataclass
class RedisConfig:
    """Modern Redis configuration with connection pooling"""
    host: str = os.getenv('REDIS_HOST', 'active-mosquito-46497.upstash.io')
    port: int = int(os.getenv('REDIS_PORT', 6379))
    username: str = os.getenv('REDIS_USERNAME', 'default')
    password: Optional[str] = os.getenv('REDIS_PASSWORD')
    db: int = 0
    ssl: bool = os.getenv('REDIS_SSL', 'true').lower() == 'true'
    max_connections: int = 20
    socket_timeout: float = 5.0
    socket_connect_timeout: float = 5.0
    retry_on_timeout: bool = True
    decode_responses: bool = True
    
    def __post_init__(self):
        # Clean up host URL if it has protocol prefix
        if self.host.startswith('https://'):
            self.host = self.host.replace('https://', '')
        elif self.host.startswith('http://'):
            self.host = self.host.replace('http://', '')
        
        # Remove trailing slash if present
        self.host = self.host.rstrip('/')

class ModernRedisService:
    """
    Modern Redis service with connection pooling and consistent patterns
    Refactored from existing web3_auth.py implementation
    """
    
    def __init__(self, config: Optional[RedisConfig] = None):
        self.config = config or RedisConfig()
        self.pool: Optional[ConnectionPool] = None
        self.client: Optional[Redis] = None
        self.available = False
        
        # Memory fallback (preserving existing behavior)
        self._memory_credits: Dict[str, int] = {}
        self._memory_nonces: Dict[str, float] = {}
        self._memory_general: Dict[str, Any] = {}
        
        self._initialize_connection()
    
    def _initialize_connection(self):
        """Initialize Redis connection with modern Redis v5+ SSL support"""
        try:
            # For Redis v5.0+, use direct Redis client initialization instead of ConnectionPool
            # This handles SSL configuration more reliably for Upstash
            
            redis_kwargs = {
                'host': self.config.host,
                'port': self.config.port,
                'username': self.config.username,
                'password': self.config.password,
                'db': self.config.db,
                'socket_timeout': self.config.socket_timeout,
                'socket_connect_timeout': self.config.socket_connect_timeout,
                'retry_on_timeout': self.config.retry_on_timeout,
                'decode_responses': self.config.decode_responses,
                'health_check_interval': 30  # Keep connection alive
            }
            
            # Add SSL parameters for Upstash (Redis v5+ compatible)
            if self.config.ssl:
                redis_kwargs.update({
                    'ssl': True,
                    'ssl_cert_reqs': None,      # Don't verify certificates (Upstash compatible)
                    'ssl_check_hostname': False, # Don't verify hostname (Upstash compatible)
                    'ssl_ca_certs': None        # Use system CA bundle
                })
            
            # Initialize Redis client directly (not through ConnectionPool for SSL compatibility)
            self.client = Redis(**redis_kwargs)
            
            # Test connection
            ping_result = self.client.ping()
            if ping_result:
                self.available = True
                logger.info(f"[Redis] ✅ Successfully connected to {self.config.host}:{self.config.port}")
                
                # Log server info for debugging
                try:
                    server_info = self.client.info('server')
                    redis_version = server_info.get('redis_version', 'unknown')
                    logger.info(f"[Redis] Server version: {redis_version}")
                    logger.info(f"[Redis] SSL enabled: {self.config.ssl}")
                except Exception as info_error:
                    logger.warning(f"[Redis] Could not get server info: {info_error}")
            else:
                raise Exception("Redis ping failed")
            
        except Exception as e:
            logger.error(f"[Redis] Primary connection failed: {str(e)}")
            
            # Try alternative connection method for Upstash
            if self.config.ssl and "ssl" in str(e).lower():
                logger.info("[Redis] Attempting alternative SSL connection method...")
                try:
                    # Alternative: Use URL-based connection for Upstash
                    redis_url = f"rediss://{self.config.username}:{self.config.password}@{self.config.host}:{self.config.port}/{self.config.db}"
                    self.client = Redis.from_url(
                        redis_url,
                        socket_timeout=self.config.socket_timeout,
                        socket_connect_timeout=self.config.socket_connect_timeout,
                        retry_on_timeout=self.config.retry_on_timeout,
                        decode_responses=self.config.decode_responses,
                        ssl_cert_reqs=None,
                        ssl_check_hostname=False
                    )
                    
                    # Test alternative connection
                    if self.client.ping():
                        self.available = True
                        logger.info("[Redis] ✅ Alternative SSL connection successful!")
                        return
                    
                except Exception as alt_error:
                    logger.error(f"[Redis] Alternative connection also failed: {alt_error}")
            
            # Fallback to memory storage
            logger.warning("[Redis] Using memory fallback - data will not persist across restarts")
            logger.warning("[Redis] Memory fallback may cause issues in multi-instance deployments")
            self.available = False
            
            # Log server instance info for debugging
            import os
            instance_id = os.getenv('RENDER_INSTANCE_ID', 'unknown')
            logger.info(f"[Redis] Server instance: {instance_id}")
            logger.info(f"[Redis] Config - Host: {self.config.host}, Port: {self.config.port}, SSL: {self.config.ssl}")
    
    def _build_key(self, namespace: KeyNamespace, identifier: str, suffix: str = None) -> str:
        """Build consistent Redis keys"""
        key = f"{namespace.value}:{identifier.lower()}"
        if suffix:
            key += f":{suffix}"
        return key
    
    # CREDITS OPERATIONS (Refactored from web3_auth.py)
    def get_credits(self, address: str) -> int:
        """Get credits for an address - modernized version"""
        if not self.available:
            value = self._memory_credits.get(address.lower(), 0)
            logger.info(f"[Memory GET] Address: {address.lower()}, Credits: {value}")
            return value
        
        try:
            key = self._build_key(KeyNamespace.CREDITS, address)
            # Use Redis HGET for better data structure
            credits = self.client.hget(f"user:{address.lower()}", "credits")
            value = int(credits) if credits else 0
            logger.info(f"[Redis GET] Key: {key}, Credits: {value}")
            return value
        except Exception as e:
            logger.error(f"[Redis ERROR] Getting credits for {address}: {str(e)}")
            # Fallback to memory
            value = self._memory_credits.get(address.lower(), 0)
            logger.info(f"[Memory FALLBACK GET] Address: {address.lower()}, Credits: {value}")
            return value
    
    def set_credits(self, address: str, amount: int) -> bool:
        """Set credits for an address - modernized with atomic operations"""
        if not self.available:
            self._memory_credits[address.lower()] = amount
            logger.info(f"[Memory SET] Address: {address.lower()}, Credits: {amount}")
            return True
        
        try:
            # Use Redis HSET for better data structure and atomic operations
            user_key = f"user:{address.lower()}"
            
            with self.client.pipeline() as pipe:
                pipe.hset(user_key, "credits", amount)
                pipe.hset(user_key, "updated_at", int(time.time()))
                pipe.execute()
            
            logger.info(f"[Redis SET] User: {address.lower()}, Credits: {amount}")
            return True
            
        except Exception as e:
            logger.error(f"[Redis ERROR] Setting credits for {address}: {str(e)}")
            # Fallback to memory
            self._memory_credits[address.lower()] = amount
            logger.info(f"[Memory FALLBACK SET] Address: {address.lower()}, Credits: {amount}")
            return False
    
    def add_credits(self, address: str, amount: int) -> int:
        """Atomically add credits to an address"""
        if not self.available:
            current = self._memory_credits.get(address.lower(), 0)
            new_amount = current + amount
            self._memory_credits[address.lower()] = new_amount
            return new_amount
        
        try:
            user_key = f"user:{address.lower()}"
            # Use Redis HINCRBY for atomic increment
            new_credits = self.client.hincrby(user_key, "credits", amount)
            self.client.hset(user_key, "updated_at", int(time.time()))
            logger.info(f"[Redis INCR] User: {address.lower()}, Added: {amount}, New Total: {new_credits}")
            return int(new_credits)
            
        except Exception as e:
            logger.error(f"[Redis ERROR] Adding credits for {address}: {str(e)}")
            # Fallback to memory
            current = self._memory_credits.get(address.lower(), 0)
            new_amount = current + amount
            self._memory_credits[address.lower()] = new_amount
            return new_amount
    
    # NONCE OPERATIONS (Refactored from web3_auth.py)
    def store_nonce(self, nonce: str, expiry_seconds: int = 900) -> bool:
        """Store nonce with expiration"""
        if not self.available:
            self._memory_nonces[nonce] = time.time() + expiry_seconds
            logger.info(f"[Memory] Stored nonce: {nonce}")
            return True
        
        try:
            key = self._build_key(KeyNamespace.NONCES, nonce)
            self.client.setex(key, expiry_seconds, "valid")
            logger.info(f"[Redis] Stored nonce: {nonce} (expires in {expiry_seconds}s)")
            return True
        except Exception as e:
            logger.error(f"[Redis ERROR] Storing nonce {nonce}: {str(e)}")
            self._memory_nonces[nonce] = time.time() + expiry_seconds
            return False
    
    def validate_nonce(self, nonce: str) -> bool:
        """Validate and consume nonce"""
        if not self.available:
            current_time = time.time()
            # Clean expired nonces
            expired = [n for n, exp_time in self._memory_nonces.items() if current_time > exp_time]
            for expired_nonce in expired:
                del self._memory_nonces[expired_nonce]
            
            return nonce in self._memory_nonces and current_time <= self._memory_nonces[nonce]
        
        try:
            key = self._build_key(KeyNamespace.NONCES, nonce)
            return bool(self.client.exists(key))
        except Exception as e:
            logger.error(f"[Redis ERROR] Validating nonce {nonce}: {str(e)}")
            return False
    
    def consume_nonce(self, nonce: str) -> bool:
        """Consume (delete) a nonce after use"""
        if not self.available:
            return self._memory_nonces.pop(nonce, None) is not None
        
        try:
            key = self._build_key(KeyNamespace.NONCES, nonce)
            return bool(self.client.delete(key))
        except Exception as e:
            logger.error(f"[Redis ERROR] Consuming nonce {nonce}: {str(e)}")
            return self._memory_nonces.pop(nonce, None) is not None
    
    # GENERAL KEY-VALUE OPERATIONS (Refactored helper functions)
    def get(self, key: str) -> Optional[str]:
        """Get a value from Redis or memory fallback"""
        if not self.available:
            return self._memory_general.get(key)
        
        try:
            return self.client.get(key)
        except Exception as e:
            logger.error(f"[Redis ERROR] Getting key {key}: {str(e)}")
            return self._memory_general.get(key)
    
    def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        """Set a value in Redis or memory fallback"""
        if not self.available:
            self._memory_general[key] = value
            return True
        
        try:
            self.client.set(key, value, ex=ex)
            return True
        except Exception as e:
            logger.error(f"[Redis ERROR] Setting key {key}: {str(e)}")
            self._memory_general[key] = value
            return False
    
    def exists(self, key: str) -> bool:
        """Check if key exists"""
        if not self.available:
            return key in self._memory_general
        
        try:
            return bool(self.client.exists(key))
        except Exception as e:
            logger.error(f"[Redis ERROR] Checking key {key}: {str(e)}")
            return key in self._memory_general
    
    def delete(self, key: str) -> bool:
        """Delete a key"""
        if not self.available:
            return self._memory_general.pop(key, None) is not None
        
        try:
            return bool(self.client.delete(key))
        except Exception as e:
            logger.error(f"[Redis ERROR] Deleting key {key}: {str(e)}")
            return self._memory_general.pop(key, None) is not None

    def lrange(self, key: str, start: int, end: int) -> List[str]:
        """Get a range of elements from a list"""
        if not self.available:
            list_data = self._memory_general.get(key, [])
            if end == -1:
                return list_data[start:]
            return list_data[start:end+1]

        try:
            return self.client.lrange(key, start, end) or []
        except Exception as e:
            logger.error(f"[Redis ERROR] Getting list range {key}: {str(e)}")
            list_data = self._memory_general.get(key, [])
            if end == -1:
                return list_data[start:]
            return list_data[start:end+1]

    def lpush(self, key: str, *values) -> int:
        """Push values to the left of a list"""
        if not self.available:
            if key not in self._memory_general:
                self._memory_general[key] = []
            for value in reversed(values):
                self._memory_general[key].insert(0, value)
            return len(self._memory_general[key])

        try:
            return self.client.lpush(key, *values)
        except Exception as e:
            logger.error(f"[Redis ERROR] Pushing to list {key}: {str(e)}")
            if key not in self._memory_general:
                self._memory_general[key] = []
            for value in reversed(values):
                self._memory_general[key].insert(0, value)
            return len(self._memory_general[key])

    def ltrim(self, key: str, start: int, end: int) -> bool:
        """Trim a list to the specified range"""
        if not self.available:
            if key in self._memory_general:
                self._memory_general[key] = self._memory_general[key][start:end+1]
            return True

        try:
            self.client.ltrim(key, start, end)
            return True
        except Exception as e:
            logger.error(f"[Redis ERROR] Trimming list {key}: {str(e)}")
            if key in self._memory_general:
                self._memory_general[key] = self._memory_general[key][start:end+1]
            return False

    @contextmanager
    def pipeline(self):
        """Get a Redis pipeline with fallback"""
        if not self.available:
            # Simple memory pipeline mock
            yield MemoryPipeline(self._memory_general)
        else:
            try:
                with self.client.pipeline() as pipe:
                    yield pipe
            except Exception as e:
                logger.error(f"[Redis ERROR] Creating pipeline: {str(e)}")
                yield MemoryPipeline(self._memory_general)
    
    # PAYMENT HISTORY OPERATIONS
    def add_payment_history(self, address: str, payment_data: Dict[str, Any], 
                          payment_type: str = "general") -> bool:
        """Add payment to user history"""
        try:
            history_key = self._build_key(KeyNamespace.BASE_PAY_HISTORY if payment_type == "base_pay" 
                                        else KeyNamespace.CELO_HISTORY, address)
            
            payment_record = {
                **payment_data,
                "timestamp": int(time.time()),
                "type": payment_type
            }
            
            if self.available:
                self.client.lpush(history_key, json.dumps(payment_record))
                # Keep only last 100 transactions
                self.client.ltrim(history_key, 0, 99)
                return True
            else:
                # Memory fallback
                if history_key not in self._memory_general:
                    self._memory_general[history_key] = []
                self._memory_general[history_key].insert(0, payment_record)
                # Keep only last 100
                self._memory_general[history_key] = self._memory_general[history_key][:100]
                return True
                
        except Exception as e:
            logger.error(f"[Redis ERROR] Adding payment history for {address}: {str(e)}")
            return False
    
    def get_payment_history(self, address: str, payment_type: str = "general", 
                          limit: int = 50) -> List[Dict[str, Any]]:
        """Get payment history for user"""
        try:
            history_key = self._build_key(KeyNamespace.BASE_PAY_HISTORY if payment_type == "base_pay" 
                                        else KeyNamespace.CELO_HISTORY, address)
            
            if self.available:
                history = self.client.lrange(history_key, 0, limit - 1)
                return [json.loads(item) for item in history]
            else:
                # Memory fallback
                history = self._memory_general.get(history_key, [])
                return history[:limit]
                
        except Exception as e:
            logger.error(f"[Redis ERROR] Getting payment history for {address}: {str(e)}")
            return []
    
    # SYSTEM STATUS
    def get_status(self) -> Dict[str, Any]:
        """Get Redis service status"""
        status = {
            "available": self.available,
            "storage_mode": "redis" if self.available else "memory",
            "timestamp": int(time.time())
        }
        
        if not self.available:
            status.update({
                "warning": "Using in-memory storage - data will not persist across restarts",
                "active_users": len(self._memory_credits),
                "active_nonces": len(self._memory_nonces),
                "general_keys": len(self._memory_general)
            })
        else:
            try:
                info = self.client.info()
                status.update({
                    "redis_version": info.get("redis_version"),
                    "connected_clients": info.get("connected_clients"),
                    "used_memory_human": info.get("used_memory_human"),
                    "total_connections_received": info.get("total_connections_received")
                })
            except Exception as e:
                logger.error(f"[Redis ERROR] Getting status: {str(e)}")
        
        return status

class MemoryPipeline:
    """Mock pipeline for memory fallback - preserving existing behavior"""
    def __init__(self, memory_store: Dict[str, Any]):
        self.memory_store = memory_store
        self.operations = []
    
    def set(self, key: str, value: str, ex: Optional[int] = None):
        self.operations.append(('set', key, value, ex))
        return self
    
    def hset(self, key: str, field: str, value: Any):
        self.operations.append(('hset', key, field, value))
        return self
    
    def execute(self):
        results = []
        for op in self.operations:
            if op[0] == 'set':
                self.memory_store[op[1]] = op[2]
                results.append(True)
            elif op[0] == 'hset':
                if op[1] not in self.memory_store:
                    self.memory_store[op[1]] = {}
                self.memory_store[op[1]][op[2]] = op[3]
                results.append(True)
        return results

# Global instance - following existing pattern
redis_service = ModernRedisService()

# Backward compatibility functions for existing code
def get_credits(address: str) -> int:
    """Backward compatibility wrapper"""
    return redis_service.get_credits(address)

def set_credits(address: str, amount: int):
    """Backward compatibility wrapper"""
    redis_service.set_credits(address, amount)

def redis_get(key: str) -> Optional[str]:
    """Backward compatibility wrapper"""
    return redis_service.get(key)

def redis_set(key: str, value: str, ex: Optional[int] = None) -> bool:
    """Backward compatibility wrapper"""
    return redis_service.set(key, value, ex)

def redis_exists(key: str) -> bool:
    """Backward compatibility wrapper"""
    return redis_service.exists(key)

def redis_pipeline():
    """Backward compatibility wrapper"""
    return redis_service.pipeline()

# Export the service and compatibility functions
__all__ = [
    'ModernRedisService', 
    'redis_service', 
    'get_credits', 
    'set_credits',
    'redis_get', 
    'redis_set', 
    'redis_exists', 
    'redis_pipeline'
]