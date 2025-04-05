#!/usr/bin/env python
"""
CLI script to test Stripe and Redis configurations for Ghiblify.
This script helps verify that your live Stripe and Redis configurations are working correctly.
"""
import os
import sys
import json
import stripe
import redis
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_stripe_connection():
    """Test the Stripe API connection and verify price IDs."""
    print("\n=== Testing Stripe Connection ===")
    
    # Get Stripe API key from environment
    stripe_key = os.getenv('STRIPE_SECRET_KEY')
    if not stripe_key:
        print("❌ Error: STRIPE_SECRET_KEY environment variable is not set")
        return False
    
    # Check if key is live mode
    if stripe_key.startswith('sk_test_'):
        print("⚠️ Warning: You are using a TEST mode Stripe key. For production, you should use a LIVE mode key.")
    elif stripe_key.startswith('sk_live_'):
        print("✅ Using LIVE mode Stripe key")
    else:
        print("⚠️ Warning: Stripe key format not recognized. Please verify it's correct.")
    
    # Configure Stripe with the API key
    stripe.api_key = stripe_key
    
    # Import price IDs from config
    try:
        sys.path.append(os.path.join(os.path.dirname(__file__), 'app/api'))
        from stripe_config import STRIPE_PRICE_IDS
        print(f"📋 Loaded price IDs from config: {json.dumps(STRIPE_PRICE_IDS, indent=2)}")
    except ImportError:
        print("❌ Error: Could not import stripe_config.py")
        return False
    
    # Test each price ID
    all_valid = True
    for tier, price_id in STRIPE_PRICE_IDS.items():
        try:
            price = stripe.Price.retrieve(price_id)
            print(f"✅ Price ID for {tier} is valid: {price_id}")
            print(f"   - Amount: {price.unit_amount/100} {price.currency.upper()}")
            print(f"   - Product: {price.product}")
        except stripe.error.StripeError as e:
            print(f"❌ Error with price ID for {tier}: {price_id}")
            print(f"   - Error: {str(e)}")
            all_valid = False
    
    return all_valid

def test_redis_connection():
    """Test the Redis connection."""
    print("\n=== Testing Redis Connection ===")
    
    # Get Redis credentials from environment
    redis_host = os.getenv('REDIS_HOST')
    redis_port = os.getenv('REDIS_PORT')
    redis_password = os.getenv('REDIS_PASSWORD')
    
    if not all([redis_host, redis_port, redis_password]):
        print("❌ Error: Redis environment variables (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD) are not all set")
        return False
    
    print(f"📡 Connecting to Redis at {redis_host}:{redis_port}...")
    
    try:
        # Connect to Redis
        r = redis.Redis(
            host=redis_host,
            port=int(redis_port),
            password=redis_password,
            decode_responses=True
        )
        
        # Test connection with a ping
        if r.ping():
            print("✅ Successfully connected to Redis")
        else:
            print("❌ Redis ping failed")
            return False
        
        # Check for existing Stripe customer keys
        stripe_keys = r.keys("stripe_customer:*")
        if stripe_keys:
            print(f"ℹ️ Found {len(stripe_keys)} Stripe customer keys in Redis")
            for key in stripe_keys[:5]:  # Show first 5 keys only
                print(f"   - {key}: {r.get(key)}")
            if len(stripe_keys) > 5:
                print(f"   - ... and {len(stripe_keys) - 5} more")
        else:
            print("ℹ️ No Stripe customer keys found in Redis (this is expected for a fresh database)")
        
        return True
    
    except redis.RedisError as e:
        print(f"❌ Redis connection error: {str(e)}")
        return False

def main():
    """Main function to run all tests."""
    print("🧪 GHIBLIFY CONFIGURATION TEST 🧪")
    print("================================")
    
    # Test Stripe
    stripe_ok = test_stripe_connection()
    
    # Test Redis
    redis_ok = test_redis_connection()
    
    # Summary
    print("\n=== Test Summary ===")
    print(f"Stripe Configuration: {'✅ PASSED' if stripe_ok else '❌ FAILED'}")
    print(f"Redis Connection: {'✅ PASSED' if redis_ok else '❌ FAILED'}")
    
    if stripe_ok and redis_ok:
        print("\n🎉 All tests passed! Your configuration should work for production.")
    else:
        print("\n⚠️ Some tests failed. Please fix the issues before deploying to production.")

if __name__ == "__main__":
    main()
