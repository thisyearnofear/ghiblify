import { PRICING_CONFIG, getTierPrice } from "../config/pricing";

// Payment method handlers factory
export const createPaymentHandler = (method, config) => {
  return async (tier, options = {}) => {
    const { address, toast, setLoading, setSelectedTier, onComplete, apiUrl } =
      options;

    if (!address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to make a purchase",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    setSelectedTier(tier.name.toLowerCase());

    try {
      switch (method) {
        case "stripe":
          return await handleStripePayment(tier, options);
        case "celo":
          return await handleCeloPayment(tier, options);
        case "basePay":
          return await handleBasePayPayment(tier, options);
        case "ghiblifyToken":
          return await handleGhiblifyTokenPayment(tier, options);
        default:
          throw new Error(`Unknown payment method: ${method}`);
      }
    } catch (error) {
      console.error(`[${method.toUpperCase()}] Payment error:`, error);
      toast({
        title: "Payment Failed",
        description:
          error.message || "There was an error processing your payment.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
};

// Stripe payment handler
const handleStripePayment = async (tier, options) => {
  const { address, apiUrl } = options;

  const response = await fetch(`${apiUrl}/api/stripe/create-checkout-session`, {
    method: "POST",
    credentials: "include",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin:
        typeof window !== "undefined"
          ? window.location.origin
          : "https://ghiblify-it.vercel.app",
    },
    body: JSON.stringify({
      tierId: tier.name,
      address,
      returnUrl: window.location.href,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create checkout session: ${errorText}`);
  }

  const data = await response.json();
  window.location.href = data.url;
};

// Base Pay payment handler - Updated to use modular service
const handleBasePayPayment = async (tier, options) => {
  const { toast, onComplete } = options;

  try {
    // Use the modular payment service
    const { baseAccountPayments } = await import('../lib/services/base-account-payments');
    
    const result = await baseAccountPayments.processPayment(tier.name, {
      onComplete: (result) => {
        toast({
          title: "Payment Successful!",
          description: `${result.creditsAdded} credits have been added to your account.`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        onComplete?.();
      },
      onError: (error) => {
        throw error;
      }
    });

    return result;
  } catch (error) {
    if (error.message?.includes('authenticated')) {
      toast({
        title: "Base Account Required",
        description: "Please sign in with Base Account to use Base Pay",
        status: "warning",
        duration: 8000,
        isClosable: true,
      });
      return;
    }
    throw error;
  }
};

// Base Pay status polling - Deprecated, now handled by modular service
// This function is kept for backward compatibility but should not be used
const pollBasePayStatus = async (paymentId, tier, pricing, options) => {
  console.warn('pollBasePayStatus is deprecated. Use baseAccountPayments service instead.');
  throw new Error('This function has been deprecated. Please use the modular baseAccountPayments service.');
};

// $GHIBLIFY Token payment handler
const handleGhiblifyTokenPayment = async (tier, options) => {
  const { toast, onComplete } = options;

  try {
    // Use the modular token payment service
    const { ghiblifyTokenPayments } = await import('../lib/services/ghiblify-token-payments');
    
    const result = await ghiblifyTokenPayments.processPayment(tier.name, {
      onStatusChange: (status) => {
        // Provide user feedback during different stages
        const statusMessages = {
          calculating: 'Calculating token amount...',
          approving: 'Approve $GHIBLIFY spending...',
          purchasing: 'Processing payment...',
          confirming: 'Confirming transaction...',
        };
        
        if (statusMessages[status]) {
          toast({
            title: statusMessages[status],
            status: "info",
            duration: 2000,
            isClosable: true,
          });
        }
      },
      onComplete: (result) => {
        toast({
          title: "🎉 Payment Successful!",
          description: `Paid ${result.tokenAmountFormatted} $GHIBLIFY tokens. ${result.creditsAdded} credits added!`,
          status: "success",
          duration: 6000,
          isClosable: true,
        });
        onComplete?.();
      },
      onError: (error) => {
        throw error;
      }
    });

    return result;
  } catch (error) {
    if (error.message?.includes('Base network')) {
      toast({
        title: "Base Network Required",
        description: "Please switch to Base network to pay with $GHIBLIFY tokens",
        status: "warning",
        duration: 8000,
        isClosable: true,
      });
      return;
    }
    if (error.message?.includes('volatile')) {
      toast({
        title: "Price Too Volatile",
        description: "Token price is moving too quickly. Please try again in a few minutes.",
        status: "warning",
        duration: 8000,
        isClosable: true,
      });
      return;
    }
    throw error;
  }
};

// CELO payment handler
const handleCeloPayment = async (tier, options) => {
  const { address, toast, apiUrl, onComplete } = options;

  // This would need to be passed from the component
  // For now, we'll throw an error indicating it needs to be implemented
  throw new Error("CELO payment handler needs to be implemented with wallet connection");
};

// Validation utilities
export const validatePaymentMethod = (method, isAuthenticated = true) => {
  const config = PRICING_CONFIG.paymentMethods[method];

  if (!config) {
    return { valid: false, error: "Invalid payment method" };
  }

  if (config.requiresAuth && !isAuthenticated) {
    return {
      valid: false,
      error: `${config.name} requires authentication`,
      authRequired: true,
    };
  }

  return { valid: true };
};

// Price formatting utilities
export const formatPriceDisplay = (tier, method = "stripe") => {
  const pricing = getTierPrice(tier, method);
  if (!pricing) return null;

  return {
    display: pricing.formatted,
    original: `$${pricing.original.toFixed(2)}`,
    savings: pricing.savings > 0 ? `Save $${pricing.savings.toFixed(2)}` : null,
    discount: pricing.discount > 0 ? `${pricing.discount * 100}% OFF` : null,
  };
};

// Add $GHIBLIFY token payment method validation
export const validateGhiblifyTokenPayment = (user, provider) => {
  if (!user || !user.address) {
    return { valid: false, error: "Wallet not connected" };
  }
  
  if (provider !== 'base' && provider !== 'rainbowkit') {
    return { 
      valid: false, 
      error: "Base network connection required for $GHIBLIFY payments",
      requiresNetworkSwitch: true,
      targetNetwork: 'base'
    };
  }
  
  return { valid: true };
};
