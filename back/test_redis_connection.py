#!/usr/bin/env python3
"""
Redis Connection Diagnostic Tool
Helps identify and troubleshoot Redis connection issues
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_redis_connection():
    """Test Redis connection with detailed diagnostics"""
    print("=" * 80)
    print("Redis Connection Diagnostic Tool")
    print("=" * 80)
    
    # Check environment variables
    print("\n[1] Environment Variables Check:")
    print("-" * 80)
    
    upstash_url = os.getenv('UPSTASH_REDIS_URL')
    redis_url = os.getenv('REDIS_URL')
    redis_host = os.getenv('REDIS_HOST', 'localhost')
    redis_port = os.getenv('REDIS_PORT', '6379')
    redis_user = os.getenv('REDIS_USERNAME')
    redis_pass = os.getenv('REDIS_PASSWORD')
    redis_ssl = os.getenv('REDIS_SSL', 'false').lower() == 'true'
    
    print(f"  UPSTASH_REDIS_URL: {'SET' if upstash_url else 'NOT SET'}")
    if upstash_url:
        # Mask password in URL
        masked_url = upstash_url.replace(upstash_url.split(':')[-1].split('@')[0], '****')
        print(f"    -> {masked_url}")
    
    print(f"  REDIS_URL: {'SET' if redis_url else 'NOT SET'}")
    print(f"  REDIS_HOST: {redis_host}")
    print(f"  REDIS_PORT: {redis_port}")
    print(f"  REDIS_USERNAME: {'SET' if redis_user else 'NOT SET'}")
    print(f"  REDIS_PASSWORD: {'SET' if redis_pass else 'NOT SET'}")
    print(f"  REDIS_SSL: {redis_ssl}")
    
    # Import Redis service
    print("\n[2] Importing Redis Service:")
    print("-" * 80)
    try:
        from app.services.redis_service import RedisConfig, ModernRedisService
        print("  ✓ Successfully imported Redis service")
    except Exception as e:
        print(f"  ✗ Failed to import: {e}")
        return False
    
    # Check configuration
    print("\n[3] Redis Configuration:")
    print("-" * 80)
    config = RedisConfig()
    print(f"  Host: {config.host}")
    print(f"  Port: {config.port}")
    print(f"  Username: {config.username if config.username else 'NONE'}")
    print(f"  Password: {'SET' if config.password else 'NOT SET'}")
    print(f"  SSL: {config.ssl}")
    print(f"  Is Local: {config.is_local}")
    print(f"  Requires Auth: {config.requires_auth}")
    print(f"  DB: {config.db}")
    print(f"  Socket Timeout: {config.socket_timeout}s")
    
    # Test connection
    print("\n[4] Connection Test:")
    print("-" * 80)
    
    service = ModernRedisService(config)
    
    if service.available:
        print("  ✅ Redis connection SUCCESSFUL")
        
        # Get additional info
        try:
            status = service.get_status()
            print(f"\n[5] Redis Status:")
            print("-" * 80)
            for key, value in status.items():
                print(f"  {key}: {value}")
        except Exception as e:
            print(f"  Warning: Could not get status: {e}")
        
        return True
    else:
        print("  ❌ Redis connection FAILED")
        print("\n[5] Troubleshooting Steps:")
        print("-" * 80)
        
        if config.is_local:
            print("  • For local Redis:")
            print("    1. Check if Redis is running: `redis-cli ping`")
            print("    2. Verify Redis is listening on localhost:6379")
            print("    3. No username/password should be set")
        else:
            print("  • For Upstash Redis:")
            print("    1. Verify UPSTASH_REDIS_URL is correctly set")
            print("    2. Check username and password are in the URL")
            print("    3. Ensure REDIS_SSL is set to 'true'")
            print("    4. Test URL directly: redis-cli -u <UPSTASH_REDIS_URL>")
        
        print("\n  • General checks:")
        print("    1. Verify network connectivity to Redis host")
        print("    2. Check Redis server is running")
        print("    3. Review firewall/security group rules")
        print("    4. Ensure credentials are correct")
        print("    5. Check application logs for detailed error messages")
        
        return False

if __name__ == "__main__":
    success = test_redis_connection()
    sys.exit(0 if success else 1)
