#!/usr/bin/env python
"""
Script to list Stripe products and prices for Ghiblify.
"""
import os
import stripe
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Stripe with the API key
stripe_key = os.getenv('STRIPE_SECRET_KEY')
if not stripe_key:
    print("Error: STRIPE_SECRET_KEY environment variable is not set")
    exit(1)

stripe.api_key = stripe_key
print(f"Using API key: {stripe_key[:8]}...")
print(f"API key mode: {'TEST' if stripe_key.startswith('sk_test_') else 'LIVE'}")

# List products
print("\nAvailable products:")
try:
    products = stripe.Product.list(limit=10)
    if not products.data:
        print("No products found. You may need to create products in your Stripe dashboard.")
    for product in products.data:
        print(f"- {product.name} (ID: {product.id})")
        
        # List prices for this product
        prices = stripe.Price.list(product=product.id, limit=5)
        if prices.data:
            for price in prices.data:
                amount = price.unit_amount / 100
                currency = price.currency.upper()
                print(f"  • Price: {amount} {currency} (ID: {price.id})")
        else:
            print("  • No prices found for this product")
except stripe.error.StripeError as e:
    print(f"Error: {str(e)}")
