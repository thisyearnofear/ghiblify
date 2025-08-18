// Shared pricing configuration and utilities
export const PRICING_CONFIG = {
  tiers: {
    starter: {
      name: "starter",
      displayName: "Starter",
      basePrice: 0.5,
      credits: 1,
      description: "Try it out",
      features: [
        "1 Ghibli transformation",
        "Valid for 30 days",
        "Both styles available",
      ],
    },
    pro: {
      name: "pro",
      displayName: "Pro",
      basePrice: 4.99,
      credits: 12,
      description: "Most popular",
      features: [
        "12 Ghibli transformations",
        "Valid for 30 days",
        "Both styles available",
        "Save $1 vs single price",
      ],
    },
    unlimited: {
      name: "unlimited",
      displayName: "Unlimited",
      basePrice: 9.99,
      credits: 30,
      description: "Best value",
      features: [
        "30 Ghibli transformations",
        "Valid for 30 days",
        "Both styles available",
        "Save $5 vs single price",
      ],
    },
  },

  discounts: {
    celo: 0.3, // 30% discount
    basePay: 0.3, // 30% discount
  },

  paymentMethods: {
    stripe: {
      name: "Pay with Card",
      icon: "FiCreditCard",
      colorScheme: "purple",
      discount: 0,
    },
    celo: {
      name: "Pay with Stablecoin",
      icon: "FiDollarSign",
      colorScheme: "yellow",
      discount: 0.3,
      badge: "30% OFF",
    },
    basePay: {
      name: "Base Pay",
      colorScheme: "light",
      discount: 0.3,
      badge: "30% OFF",
      requiresAuth: true,
      authBadge: "Base Account Required",
    },
    ghiblifyToken: {
      name: "Pay with $GHIBLIFY",
      icon: "FiZap",
      colorScheme: "green",
      discount: 0.5,
      badge: "50% OFF",
      requiresBaseNetwork: true,
      description: "Support the project & save big",
      priority: 1, // Show first when available
    },
  },
};

// Utility functions
export const calculateDiscountedPrice = (basePrice, discount) => {
  return (basePrice * (1 - discount)).toFixed(2);
};

export const formatPrice = (price) => {
  return `$${price.toFixed(2)}`;
};

export const getTierPrice = (tierName, paymentMethod = "stripe") => {
  const tier = PRICING_CONFIG.tiers[tierName];
  const method = PRICING_CONFIG.paymentMethods[paymentMethod];

  if (!tier || !method) return null;

  const discount = method.discount || 0;
  const discountedPrice = calculateDiscountedPrice(tier.basePrice, discount);

  return {
    original: tier.basePrice,
    discounted: parseFloat(discountedPrice),
    formatted: formatPrice(parseFloat(discountedPrice)),
    discount: discount,
    savings: tier.basePrice - parseFloat(discountedPrice),
  };
};

export const getPaymentMethodConfig = (method, isAuthenticated = true) => {
  const config = PRICING_CONFIG.paymentMethods[method];
  if (!config) return null;

  return {
    ...config,
    badge:
      config.requiresAuth && !isAuthenticated ? config.authBadge : config.badge,
    badgeColor: config.requiresAuth && !isAuthenticated ? "blue" : "red",
  };
};
