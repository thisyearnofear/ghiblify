#!/usr/bin/env python
"""
Script to test Redis connection with detailed error reporting.
"""
import os
import redis
import traceback
from dotenv import load_dotenv

# Load environment variables from back/.env explicitly
ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path=ENV_PATH)

def test_redis_connection():
    """Test the Redis connection with detailed error reporting."""
    print("\n=== Testing Redis Connection ===")
    
    # Get Redis credentials from environment
    redis_host = os.getenv('REDIS_HOST')
    redis_port = os.getenv('REDIS_PORT')
    redis_password = os.getenv('REDIS_PASSWORD')
    
    print(f"Redis Host: {redis_host}")
    print(f"Redis Port: {redis_port}")
    print(f"Redis Password: {'*' * (len(redis_password) if redis_password else 0)}")
    
    if not all([redis_host, redis_port, redis_password]):
        print("❌ Error: Redis environment variables (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD) are not all set")
        return False
    
    print(f"\n📡 Connecting to Redis at {redis_host}:{redis_port}...")
    
    try:
        # Connect to Redis with a short timeout
        r = redis.Redis(
            host=redis_host,
            port=int(redis_port),
            password=redis_password,
            decode_responses=True,
            socket_timeout=5,  # 5 second timeout
            socket_connect_timeout=5  # 5 second connect timeout
        )
        
        # Test connection with a ping
        if r.ping():
            print("✅ Successfully connected to Redis")
            
            # Try a simple set/get operation
            try:
                r.set('test_key', 'test_value')
                value = r.get('test_key')
                print(f"✅ Set/Get operation successful: {value}")
                r.delete('test_key')
            except Exception as e:
                print(f"❌ Set/Get operation failed: {str(e)}")
                traceback.print_exc()
        else:
            print("❌ Redis ping failed")
            return False
        
        return True
    
    except redis.RedisError as e:
        print(f"❌ Redis connection error: {str(e)}")
        traceback.print_exc()
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_redis_connection()
