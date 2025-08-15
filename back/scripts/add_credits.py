#!/usr/bin/env python3
"""
Script to add credits to a wallet address.
Usage: python add_credits.py <wallet_address> <amount>
"""

import sys
import os
import asyncio
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))

from app.services.redis_service import redis_service
from app.api.web3_auth import get_credits, set_credits

def add_credits_to_wallet(wallet_address: str, amount: int):
    """Add credits to a wallet address"""
    try:
        # Normalize the address to lowercase
        normalized_address = wallet_address.lower().strip()
        
        # Get current credits
        current_credits = get_credits(normalized_address)
        print(f"Current credits for {normalized_address}: {current_credits}")
        
        # Add the specified amount
        new_credits = current_credits + amount
        set_credits(normalized_address, new_credits)
        
        # Verify the update
        updated_credits = get_credits(normalized_address)
        print(f"Updated credits for {normalized_address}: {updated_credits}")
        
        if updated_credits == new_credits:
            print(f"✅ Successfully added {amount} credits to {normalized_address}")
            print(f"   Total credits: {updated_credits}")
            return True
        else:
            print(f"❌ Error: Credits not updated correctly")
            return False
            
    except Exception as e:
        print(f"❌ Error adding credits: {str(e)}")
        return False

def main():
    if len(sys.argv) != 3:
        print("Usage: python add_credits.py <wallet_address> <amount>")
        print("Example: python add_credits.py 0xec4F3Ac60AE169fE27bed005F3C945A112De2c5A 20")
        sys.exit(1)
    
    wallet_address = sys.argv[1]
    try:
        amount = int(sys.argv[2])
    except ValueError:
        print("❌ Error: Amount must be a valid integer")
        sys.exit(1)
    
    if amount <= 0:
        print("❌ Error: Amount must be positive")
        sys.exit(1)
    
    print(f"Adding {amount} credits to wallet: {wallet_address}")
    
    success = add_credits_to_wallet(wallet_address, amount)
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
