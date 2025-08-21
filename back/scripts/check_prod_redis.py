
import os
import sys
from dotenv import load_dotenv

# Add the parent directory to the Python path to allow imports from the `app` module
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.redis_service import ModernRedisService

def check_production_redis():
    """
    Checks the Redis connection using the same logic as the application.
    """
    print("--- Checking Production Redis Connection ---")
    
    # Load .env file from the root of the project
    dotenv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path)
        print("Loaded .env file")

    # Instantiate the service
    redis_service = ModernRedisService()

    # Check if the service is available
    if redis_service.available:
        print("✅ Redis connection is available.")
        
        # Perform a test operation
        try:
            print("Performing test operation...")
            test_key = "prod_redis_test"
            test_value = "success"
            
            # Use the service's client to perform the operation
            redis_service.client.set(test_key, test_value, ex=10)
            retrieved_value = redis_service.client.get(test_key)
            
            if retrieved_value == test_value:
                print("✅ Test operation successful.")
            else:
                print(f"❌ Test operation failed. Expected '{test_value}', got '{retrieved_value}'.")
            
            redis_service.client.delete(test_key)
        except Exception as e:
            print(f"❌ An error occurred during the test operation: {e}")
    else:
        print("❌ Redis connection is not available. The application is likely using the memory fallback.")

if __name__ == "__main__":
    check_production_redis()
