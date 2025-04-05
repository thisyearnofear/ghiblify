"""Stripe configuration and constants."""

# NOTE: These are LIVE mode price IDs
STRIPE_PRICE_IDS = {
    "starter": "price_1RAQ5yLt1uz9HoCm2md6mBsQ",  # $0.50 - 1 credit
    "pro": "price_1RAQ5zLt1uz9HoCm1F5lZyF2",      # $4.99 - 12 credits
    "unlimited": "price_1RAQ5zLt1uz9HoCmXTElLMjT"  # $9.99 - 30 credits
}

# Map price IDs to their credit values
PRICE_CREDITS = {
    "price_1RAQ5yLt1uz9HoCm2md6mBsQ": 1,   # starter
    "price_1RAQ5zLt1uz9HoCm1F5lZyF2": 12,  # pro
    "price_1RAQ5zLt1uz9HoCmXTElLMjT": 30   # unlimited
}
