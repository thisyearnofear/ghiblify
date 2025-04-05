"""Stripe configuration and constants."""

# NOTE: These are now LIVE mode price IDs (not test mode)
STRIPE_PRICE_IDS = {
    "starter": "price_1R7tQmLt1uz9HoCmGXvdrHdh",  # $0.50 - 1 credit
    "pro": "price_1R7tQxLt1uz9HoCmyNgbIock",      # $4.99 - 12 credits
    "unlimited": "price_1R7tRALt1uz9HoCmUmf5OoKO"  # $9.99 - 30 credits
}

# Map price IDs to their credit values
PRICE_CREDITS = {
    "price_1R7tQmLt1uz9HoCmGXvdrHdh": 1,   # starter
    "price_1R7tQxLt1uz9HoCmyNgbIock": 12,  # pro
    "price_1R7tRALt1uz9HoCmUmf5OoKO": 30   # unlimited
}
