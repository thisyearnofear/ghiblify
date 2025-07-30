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

// Base Pay payment handler
const handleBasePayPayment = async (tier, options) => {
  const { address, toast, apiUrl, onComplete } = options;

  // Check Base Account authentication
  const baseAuth = localStorage.getItem("ghiblify_auth");
  if (!baseAuth) {
    toast({
      title: "Base Account Required",
      description: "Please sign in with Base Account to use Base Pay",
      status: "warning",
      duration: 8000,
      isClosable: true,
    });
    return;
  }

  const { pay, getPaymentStatus } = await import("@base-org/account");
  const pricing = getTierPrice(tier.name, "basePay");

  console.log(`[Base Pay] Initiating payment for ${tier.name}...`);
  console.log(`[Base Pay] Pricing:`, pricing);

  // Trigger Base Pay payment with discount
  const result = await pay({
    amount: pricing.discounted.toString(),
    to: process.env.NEXT_PUBLIC_BASE_PAY_RECIPIENT_ADDRESS,
    testnet: process.env.NEXT_PUBLIC_BASE_PAY_TESTNET === "true",
    payerInfo: {
      requests: [{ type: "email", optional: true }],
    },
  });

  const { id } = result;
  if (!id) {
    throw new Error("Payment initiation failed - no payment ID returned");
  }

  // Poll for payment completion
  return pollBasePayStatus(id, tier, pricing, options);
};

// Base Pay status polling
const pollBasePayStatus = async (paymentId, tier, pricing, options) => {
  const { address, toast, apiUrl, onComplete } = options;
  const { getPaymentStatus } = await import("@base-org/account");

  const poll = async () => {
    try {
      const statusResult = await getPaymentStatus({
        id: paymentId,
        testnet: process.env.NEXT_PUBLIC_BASE_PAY_TESTNET === "true",
      });

      const { status } = statusResult;

      if (status === "completed") {
        // Notify backend
        const response = await fetch(`${apiUrl}/api/base-pay/process-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: paymentId,
            status: "completed",
            amount: pricing.discounted.toString(),
            originalAmount: pricing.original.toString(),
            discount: "30%",
            to: process.env.NEXT_PUBLIC_BASE_PAY_RECIPIENT_ADDRESS,
            from: address,
            tier: tier.name.toLowerCase(),
            timestamp: new Date().toISOString(),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          toast({
            title: "Payment Successful!",
            description: `${data.credits_added} credits have been added to your account.`,
            status: "success",
            duration: 5000,
            isClosable: true,
          });
          onComplete?.();
        } else {
          throw new Error("Failed to process payment on backend");
        }
      } else if (status === "failed") {
        throw new Error("Payment failed");
      } else if (status === "pending" || status === "processing") {
        setTimeout(poll, 2000);
        return;
      } else {
        setTimeout(poll, 2000);
        return;
      }
    } catch (error) {
      if (
        error.message?.includes("RPC error") ||
        error.message?.includes("network")
      ) {
        setTimeout(poll, 3000);
        return;
      }
      throw error;
    }
  };

  return poll();
};

// CELO payment handler (placeholder - implement based on existing logic)
const handleCeloPayment = async (tier, options) => {
  // Implementation would go here - extracted from existing CELO logic
  throw new Error("CELO payment handler not yet implemented in refactor");
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
