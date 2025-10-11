#!/usr/bin/env python
"""
Test Redis v5+ connection with Upstash SSL configuration
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from redis import Redis

# Load environment variables
ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path=ENV_PATH)

def test_redis_v5_direct():
    """Test Redis v5+ direct connection method"""
    print("\n=== Testing Redis v5+ Direct Connection ===")
    
    host = os.getenv('REDIS_HOST')
    port = int(os.getenv('REDIS_PORT', 6379))
    username = os.getenv('REDIS_USERNAME', 'default')
    password = os.getenv('REDIS_PASSWORD')
    ssl_enabled = os.getenv('REDIS_SSL', 'true').lower() == 'true'
    
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"Username: {username}")
    print(f"SSL: {ssl_enabled}")
    print(f"Password: {'*' * len(password) if password else 'None'}")
    
    try:
        # Method 1: Direct Redis client (v5+ compatible)
        redis_kwargs = {
            'host': host,
            'port': port,
            'username': username,
            'password': password,
            'db': 0,
            'socket_timeout': 5,
            'socket_connect_timeout': 5,
            'decode_responses': True,
            'health_check_interval': 30
        }
        
        if ssl_enabled:
            redis_kwargs.update({
                'ssl': True,
                'ssl_cert_reqs': None,
                'ssl_check_hostname': False,
                'ssl_ca_certs': None
            })
        
        print(f"\n🔄 Connecting with direct method...")
        client = Redis(**redis_kwargs)
        
        # Test connection
        result = client.ping()
        if result:
            print("✅ Direct connection successful!")
            
            # Test operations
            test_key = "test:connection:v5"
            client.set(test_key, "working", ex=60)
            value = client.get(test_key)
            print(f"✅ Set/Get test successful: {value}")
            
            # Get server info
            info = client.info('server')
            print(f"✅ Redis version: {info.get('redis_version', 'unknown')}")
            
            client.delete(test_key)
            return True
        else:
            print("❌ Direct connection ping failed")
            
    except Exception as e:
        print(f"❌ Direct connection failed: {str(e)}")
    
    return False

def test_redis_url_method():
    """Test Redis URL-based connection method"""
    print("\n=== Testing Redis URL Connection ===")
    
    host = os.getenv('REDIS_HOST')
    port = int(os.getenv('REDIS_PORT', 6379))
    username = os.getenv('REDIS_USERNAME', 'default')
    password = os.getenv('REDIS_PASSWORD')
    ssl_enabled = os.getenv('REDIS_SSL', 'true').lower() == 'true'
    
    try:
        # Method 2: URL-based connection (alternative for SSL issues)
        if ssl_enabled:
            redis_url = f"rediss://{username}:{password}@{host}:{port}/0"
        else:
            redis_url = f"redis://{username}:{password}@{host}:{port}/0"
        
        print(f"🔄 Connecting with URL method...")
        print(f"URL: {redis_url.replace(password, '*' * len(password))}")
        
        client = Redis.from_url(
            redis_url,
            socket_timeout=5,
            socket_connect_timeout=5,
            decode_responses=True,
            ssl_cert_reqs=None,
            ssl_check_hostname=False
        )
        
        # Test connection
        result = client.ping()
        if result:
            print("✅ URL connection successful!")
            
            # Test operations
            test_key = "test:url:connection"
            client.set(test_key, "url_working", ex=60)
            value = client.get(test_key)
            print(f"✅ Set/Get test successful: {value}")
            
            client.delete(test_key)
            return True
        else:
            print("❌ URL connection ping failed")
            
    except Exception as e:
        print(f"❌ URL connection failed: {str(e)}")
    
    return False

def test_modern_redis_service():
    """Test our ModernRedisService"""
    print("\n=== Testing ModernRedisService ===")
    
    try:
        from app.services.redis_service import ModernRedisService
        
        service = ModernRedisService()
        print(f"Service available: {service.available}")
        
        if service.available:
            print("✅ ModernRedisService connected successfully!")
            status = service.get_status()
            print(f"Status: {status}")
            return True
        else:
            print("❌ ModernRedisService using memory fallback")
            
    except Exception as e:
        print(f"❌ ModernRedisService test failed: {str(e)}")
    
    return False

if __name__ == "__main__":
    print("Redis v5+ Connection Testing")
    print("=" * 50)
    
    # Test all methods
    direct_success = test_redis_v5_direct()
    url_success = test_redis_url_method()
    service_success = test_modern_redis_service()
    
    print("\n" + "=" * 50)
    print("SUMMARY:")
    print(f"Direct Method: {'✅ SUCCESS' if direct_success else '❌ FAILED'}")
    print(f"URL Method:    {'✅ SUCCESS' if url_success else '❌ FAILED'}")
    print(f"Service Test:  {'✅ SUCCESS' if service_success else '❌ FAILED'}")
    
    if any([direct_success, url_success]):
        print("\n🎉 At least one connection method works!")
    else:
        print("\n💥 All connection methods failed - check credentials and network")