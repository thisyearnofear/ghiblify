#!/usr/bin/env python
"""
Script to create Stripe products and prices in LIVE mode for Ghiblify.
This script uses your STRIPE_SECRET_KEY from the environment.
"""
import os
import stripe
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def main():
    """Main function to create Stripe products and prices."""
    print("=== Creating Stripe Products and Prices in LIVE Mode ===")
    print("This script will create the necessary products and prices for Ghiblify in your Stripe live mode.")
    print("")
    
    # Get Stripe API key from environment
    stripe_key = os.getenv("STRIPE_SECRET_KEY")
    if not stripe_key:
        print("❌ Error: STRIPE_SECRET_KEY not found in environment variables.")
        print("Please make sure your .env file contains the STRIPE_SECRET_KEY variable.")
        sys.exit(1)
    
    # Initialize Stripe with the API key
    stripe.api_key = stripe_key
    
    # Check if we're in live mode
    if not stripe_key.startswith("sk_live_"):
        print("⚠️ Warning: You are using a TEST mode API key, not a LIVE mode key.")
        confirm = input("Do you want to continue creating TEST mode products? (y/n): ")
        if confirm.lower() != 'y':
            print("Operation cancelled.")
            sys.exit(0)
        print("Continuing with TEST mode...")
    else:
        # Confirm live mode
        print("⚠️ WARNING: This will create LIVE products and prices that can be used for real payments.")
        confirm = input("Are you sure you want to continue? (y/n): ")
        if confirm.lower() != 'y':
            print("Operation cancelled.")
            sys.exit(0)
    
    # Create Ghiblify Credits product
    print("\nCreating 'Ghiblify Credits' product...")
    try:
        product = stripe.Product.create(
            name="Ghiblify Credits",
            description="Credits for generating Ghibli-style images",
            active=True
        )
        print(f"✅ Created product: {product.id}")
    except Exception as e:
        print(f"❌ Error creating product: {e}")
        sys.exit(1)
    
    # Create prices for the product
    try:
        print("\nCreating price for Starter tier (1 credit - $0.50)...")
        starter_price = stripe.Price.create(
            product=product.id,
            unit_amount=50,
            currency="usd",
            nickname="Ghiblify Starter - 1 credit"
        )
        
        print("\nCreating price for Pro tier (12 credits - $4.99)...")
        pro_price = stripe.Price.create(
            product=product.id,
            unit_amount=499,
            currency="usd",
            nickname="Ghiblify Pro - 12 credits"
        )
        
        print("\nCreating price for Unlimited tier (30 credits - $9.99)...")
        unlimited_price = stripe.Price.create(
            product=product.id,
            unit_amount=999,
            currency="usd",
            nickname="Ghiblify Unlimited - 30 credits"
        )
    except Exception as e:
        print(f"❌ Error creating prices: {e}")
        sys.exit(1)
    
    # Print summary
    print("\n=== Summary of Created Items ===")
    print(f"Product ID: {product.id} (Ghiblify Credits)")
    print(f"Mode: {'LIVE' if stripe_key.startswith('sk_live_') else 'TEST'}")
    print("Price IDs:")
    print(f"- Starter (1 credit - $0.50): {starter_price.id}")
    print(f"- Pro (12 credits - $4.99): {pro_price.id}")
    print(f"- Unlimited (30 credits - $9.99): {unlimited_price.id}")
    
    # Generate Python code for updating stripe_config.py
    print("\n=== Python Code for Updating stripe_config.py ===")
    print("Copy and paste this into your stripe_config.py file:")
    print("")
    print('"""Stripe configuration and constants."""')
    print("")
    print(f"# NOTE: These are {'LIVE' if stripe_key.startswith('sk_live_') else 'TEST'} mode price IDs")
    print("STRIPE_PRICE_IDS = {")
    print(f"    \"starter\": \"{starter_price.id}\",  # $0.50 - 1 credit")
    print(f"    \"pro\": \"{pro_price.id}\",      # $4.99 - 12 credits")
    print(f"    \"unlimited\": \"{unlimited_price.id}\"  # $9.99 - 30 credits")
    print("}")
    print("")
    print("# Map price IDs to their credit values")
    print("PRICE_CREDITS = {")
    print(f"    \"{starter_price.id}\": 1,   # starter")
    print(f"    \"{pro_price.id}\": 12,  # pro")
    print(f"    \"{unlimited_price.id}\": 30   # unlimited")
    print("}")

if __name__ == "__main__":
    main()
