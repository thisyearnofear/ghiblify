"""Stripe configuration and constants."""

STRIPE_PRICE_IDS = {
    "single": "price_1R7tQmLt1uz9HoCmGXvdrHdh",  # $0.50 - 1 credit
    "basic": "price_1R7tQxLt1uz9HoCmyNgbIock",   # $4.99 - 12 credits
    "pro": "price_1R7tRALt1uz9HoCmUmf5OoKO"      # $9.99 - 30 credits
}

# Map price IDs to their credit values
PRICE_CREDITS = {
    "price_1R7tQmLt1uz9HoCmGXvdrHdh": 1,   # single
    "price_1R7tQxLt1uz9HoCmyNgbIock": 12,  # basic
    "price_1R7tRALt1uz9HoCmUmf5OoKO": 30   # pro
}
