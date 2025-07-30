"""
Shared pricing configuration for all payment methods
Maintains DRY principles and single source of truth
"""

# Base pricing tiers (before discounts)
BASE_PRICING = {
    "starter": {
        "base_price": 0.50,
        "credits": 1,
        "description": "1 Ghibli transformation"
    },
    "pro": {
        "base_price": 4.99,
        "credits": 12,
        "description": "12 Ghibli transformations"
    },
    "unlimited": {
        "base_price": 9.99,
        "credits": 30,
        "description": "30 Ghibli transformations"
    }
}

# Discount rates by payment method
PAYMENT_METHOD_DISCOUNTS = {
    "stripe": 0.0,      # No discount
    "celo": 0.30,       # 30% discount
    "base_pay": 0.30,   # 30% discount
}

def calculate_discounted_price(base_price: float, discount: float) -> float:
    """Calculate discounted price with proper rounding"""
    return round(base_price * (1 - discount), 2)

def get_tier_pricing(tier: str, payment_method: str = "stripe") -> dict:
    """
    Get pricing information for a tier and payment method
    
    Args:
        tier: Pricing tier name (starter, pro, unlimited)
        payment_method: Payment method (stripe, celo, base_pay)
    
    Returns:
        Dict with pricing information or None if invalid
    """
    if tier not in BASE_PRICING:
        return None
    
    if payment_method not in PAYMENT_METHOD_DISCOUNTS:
        return None
    
    base_price = BASE_PRICING[tier]["base_price"]
    discount = PAYMENT_METHOD_DISCOUNTS[payment_method]
    discounted_price = calculate_discounted_price(base_price, discount)
    
    return {
        "tier": tier,
        "payment_method": payment_method,
        "base_price": base_price,
        "discounted_price": discounted_price,
        "discount_rate": discount,
        "discount_percentage": f"{int(discount * 100)}%" if discount > 0 else "0%",
        "savings": base_price - discounted_price,
        "credits": BASE_PRICING[tier]["credits"],
        "description": BASE_PRICING[tier]["description"]
    }

def validate_payment_amount(tier: str, payment_method: str, amount: float) -> bool:
    """
    Validate if payment amount matches expected price for tier/method
    
    Args:
        tier: Pricing tier name
        payment_method: Payment method
        amount: Payment amount to validate
    
    Returns:
        True if amount is valid, False otherwise
    """
    pricing = get_tier_pricing(tier, payment_method)
    if not pricing:
        return False
    
    # Allow both discounted price and base price for flexibility
    valid_amounts = [pricing["discounted_price"], pricing["base_price"]]
    
    # Handle floating point comparison with small tolerance
    tolerance = 0.01
    return any(abs(amount - valid_amount) < tolerance for valid_amount in valid_amounts)

def get_all_payment_methods_pricing(tier: str) -> dict:
    """Get pricing for all payment methods for a given tier"""
    if tier not in BASE_PRICING:
        return {}
    
    return {
        method: get_tier_pricing(tier, method) 
        for method in PAYMENT_METHOD_DISCOUNTS.keys()
    }

# Legacy compatibility - generate pricing structures for existing handlers
def get_stripe_pricing():
    """Generate Stripe pricing structure for backward compatibility"""
    return {
        tier: {
            "price_id": f"price_{tier}",  # Would be actual Stripe price IDs
            "amount": pricing["base_price"],
            "credits": pricing["credits"],
            "description": pricing["description"]
        }
        for tier, pricing in BASE_PRICING.items()
    }

def get_base_pay_pricing():
    """Generate Base Pay pricing structure with discounts"""
    return {
        tier: {
            "amount": str(get_tier_pricing(tier, "base_pay")["discounted_price"]),
            "original_amount": str(pricing["base_price"]),
            "credits": pricing["credits"],
            "description": pricing["description"],
            "discount": "30%"
        }
        for tier, pricing in BASE_PRICING.items()
    }

def get_celo_pricing():
    """Generate CELO pricing structure with discounts"""
    return {
        tier: {
            "amount": get_tier_pricing(tier, "celo")["discounted_price"],
            "original_amount": pricing["base_price"],
            "credits": pricing["credits"],
            "description": pricing["description"],
            "discount": "30%"
        }
        for tier, pricing in BASE_PRICING.items()
    }