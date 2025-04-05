# Stripe Scripts for Ghiblify

This directory contains utility scripts for managing Stripe products, prices, and testing connections for the Ghiblify application.

## Available Scripts

### 1. `create_stripe_live_prices_simple.py`

Creates Stripe products and prices in LIVE mode for Ghiblify. This script uses your `STRIPE_SECRET_KEY` from the `.env` file.

**Usage:**
```bash
python create_stripe_live_prices_simple.py
```

**Features:**
- Creates a "Ghiblify Credits" product
- Creates three price tiers:
  - Starter: $0.50 for 1 credit
  - Pro: $4.99 for 12 credits
  - Unlimited: $9.99 for 30 credits
- Generates code for updating `stripe_config.py`
- Works with both TEST and LIVE mode API keys

### 2. `list_stripe_products.py`

Lists all Stripe products and their associated prices in your account.

**Usage:**
```bash
python list_stripe_products.py
```

**Features:**
- Shows product details (name, ID)
- Lists prices for each product
- Displays mode (TEST or LIVE)

### 3. `test_stripe_redis.py`

Tests the Stripe API connection, verifies price IDs, and checks Redis connection.

**Usage:**
```bash
python test_stripe_redis.py
```

**Features:**
- Verifies Stripe API key validity
- Checks if price IDs in `stripe_config.py` are valid
- Tests Redis connection
- Displays Stripe customer keys stored in Redis

## Current Configuration

The Ghiblify application is currently using LIVE mode Stripe products and prices:

- Product: Ghiblify Credits (prod_S4ZE9n2K7Rvcpr)
- Price IDs:
  - Starter tier: price_1RAQ5yLt1uz9HoCm2md6mBsQ ($0.50 for 1 credit)
  - Pro tier: price_1RAQ5zLt1uz9HoCm1F5lZyF2 ($4.99 for 12 credits)
  - Unlimited tier: price_1RAQ5zLt1uz9HoCmXTElLMjT ($9.99 for 30 credits)

These values are configured in `/back/app/api/stripe_config.py`.
