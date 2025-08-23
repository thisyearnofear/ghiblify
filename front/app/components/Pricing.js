import {
  Box,
  Button,
  Flex,
  Text,
  Stack,
  useToast,
  Badge,
  VStack,
  HStack,
  Icon,
} from "@chakra-ui/react";
import { useGhibliTheme } from "../hooks/useGhibliTheme";
import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWatchContractEvent,
  usePublicClient,
} from "wagmi";
import { FiCheck, FiCreditCard, FiDollarSign } from "react-icons/fi";
import { BasePayButton } from "@base-org/account-ui/react";
import {
  GHIBLIFY_PAYMENTS_ADDRESS,
  GHIBLIFY_PAYMENTS_ABI,
  CUSD_TOKEN_ADDRESS,
  CUSD_TOKEN_ABI,
  PACKAGES,
} from "../contracts/ghiblifyPayments";
import { parseEther, formatUnits } from "ethers";
import { createPaymentHandler } from "../utils/paymentUtils";
import { useUnifiedWallet } from "../lib/hooks/useUnifiedWallet";
import { useFarcaster } from "./FarcasterFrameProvider";
import { parsePaymentError, getToastConfig } from "../utils/errorHandling";
import PaymentMethodSelector from "./payments/PaymentMethodSelector";
import { ghiblifyTokenPayments } from "../lib/services/ghiblify-token-payments";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.thisyearnofear.com";
const STRIPE_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_STRIPE_WEBHOOK_URL ||
  "https://api.thisyearnofear.com/api/stripe/webhook";

// Base Pay Configuration
const BASE_PAY_RECIPIENT = process.env.NEXT_PUBLIC_BASE_PAY_RECIPIENT_ADDRESS;
const BASE_PAY_TESTNET = process.env.NEXT_PUBLIC_BASE_PAY_TESTNET === "true";

if (!API_URL) {
  console.error(
    "[Pricing] NEXT_PUBLIC_API_URL environment variable is not set"
  );
}

if (!STRIPE_WEBHOOK_URL) {
  console.error(
    "[Pricing] NEXT_PUBLIC_STRIPE_WEBHOOK_URL environment variable is not set"
  );
}

if (!BASE_PAY_RECIPIENT) {
  console.error(
    "[Pricing] NEXT_PUBLIC_BASE_PAY_RECIPIENT_ADDRESS environment variable is not set"
  );
}

export default function Pricing({ onPurchaseComplete }) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [isCeloProcessing, setIsCeloProcessing] = useState(false);
  const [isBasePayProcessing, setIsBasePayProcessing] = useState(false);
  const [isGhiblifyProcessing, setIsGhiblifyProcessing] = useState(false);
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { writeContractAsync: approveAsync } = useWriteContract();
  const { writeContractAsync: purchaseAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // Use unified wallet system for credit management
  const {
    address: unifiedAddress,
    isConnected: unifiedConnected,
    refreshCredits,
  } = useUnifiedWallet();

  // Check for Base authentication
  const [baseAuth, setBaseAuth] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedAuth = localStorage.getItem("ghiblify_auth");
      if (storedAuth) {
        try {
          const authData = JSON.parse(storedAuth);
          if (authData.authenticated) {
            setBaseAuth(authData);
          }
        } catch (error) {
          console.error("Error parsing stored auth:", error);
        }
      }
    }
  }, []);

  // Determine if user is connected (prioritize unified wallet, fallback to legacy)
  const userConnected =
    unifiedConnected || isConnected || (baseAuth && baseAuth.authenticated);
  const userAddress =
    unifiedAddress || address || (baseAuth && baseAuth.address);

  // Watch for contract events
  useWatchContractEvent({
    address: GHIBLIFY_PAYMENTS_ADDRESS,
    abi: GHIBLIFY_PAYMENTS_ABI,
    eventName: "CreditsPurchased",
    onLogs(logs) {
      const log = logs[0];
      if (log && log.args && log.args.buyer === userAddress) {
        handleSuccess(log.transactionHash);
      }
    },
  });

  const checkCeloPaymentStatus = async (txHash) => {
    try {
      const response = await fetch(
        `${API_URL}/api/celo/check-payment/${txHash}`,
        {
          method: "GET",
          credentials: "include",
          mode: "cors",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Origin:
              typeof window !== "undefined"
                ? window.location.origin
                : "https://ghiblify-it.vercel.app",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.log(
            "[CELO] Payment status check endpoint not found, retrying..."
          );
          // Retry after 5 seconds
          setTimeout(() => checkCeloPaymentStatus(txHash), 5000);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === "processed") {
        // Refresh credits in unified wallet system
        try {
          await refreshCredits();
        } catch (error) {
          console.error("Error refreshing credits:", error);
        }

        toast({
          title: "Payment Successful",
          description: "Your credits have been added to your account!",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        onPurchaseComplete?.();
      } else if (data.status === "failed") {
        toast({
          title: "Payment Failed",
          description: "There was an error processing your payment.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } else {
        // Still pending, check again in 5 seconds
        setTimeout(() => checkCeloPaymentStatus(txHash), 5000);
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
      // Retry after 5 seconds on error
      setTimeout(() => checkCeloPaymentStatus(txHash), 5000);
    } finally {
      setIsCeloProcessing(false);
    }
  };

  const handleSuccess = async (txHash) => {
    setIsCeloProcessing(false);

    // Immediately try to refresh credits
    try {
      await refreshCredits();
    } catch (error) {
      console.error("Error refreshing credits immediately:", error);
    }

    // Also check payment status for confirmation
    checkCeloPaymentStatus(txHash);
  };

  const waitForTransaction = async (hash) => {
    try {
      console.log("[CELO] Waiting for transaction hash:", hash);
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: hash.toString(),
      });
      return receipt;
    } catch (error) {
      console.error("[CELO] Error waiting for transaction:", error);
      throw error;
    }
  };

  const handleCeloPurchase = async (tier) => {
    // Prevent duplicate transactions
    if (isCeloProcessing) {
      console.log(
        "[CELO] Purchase already in progress, ignoring duplicate request"
      );
      return;
    }

    // For now, we'll keep the existing Celo implementation since it's more complex
    // and involves direct contract interactions that aren't easily abstracted
    try {
      if (!userAddress) {
        toast({
          title: "Wallet not connected",
          description: "Please connect your wallet to make a purchase",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      setIsCeloProcessing(true);

      // Network switching is now handled in PaymentMethodSelector
      // We'll verify the network but with a more user-friendly approach
      const chainId = await publicClient.getChainId();
      if (chainId !== 42220) {
        // Celo Mainnet chain ID - this should rarely happen now
        console.warn("[CELO] Not on Celo network, chainId:", chainId);
        toast({
          title: "Network Issue",
          description: "Please ensure you're on the Celo network and try again",
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
        setIsCeloProcessing(false);
        return;
      }

      console.log("[CELO] Initiating purchase for package:", tier.name);
      const packageInfo = PACKAGES[tier.name];
      const contractTier = packageInfo.contractTier;
      const priceInWei = packageInfo.priceInWei;
      console.log("[CELO] Price in wei:", priceInWei);

      // Check cUSD balance
      console.log("[CELO] Checking cUSD balance...");
      const cusdContract = {
        address: CUSD_TOKEN_ADDRESS,
        abi: CUSD_TOKEN_ABI,
      };

      const balance = await publicClient.readContract({
        ...cusdContract,
        functionName: "balanceOf",
        args: [userAddress],
      });
      console.log("[CELO] Current cUSD balance:", balance.toString());

      if (balance < priceInWei) {
        throw new Error(
          `Insufficient cUSD balance. You need ${formatUnits(
            priceInWei,
            18
          )} cUSD but have ${formatUnits(balance, 18)} cUSD`
        );
      }

      // Check cUSD allowance
      console.log("[CELO] Checking cUSD allowance...");
      const allowance = await publicClient.readContract({
        ...cusdContract,
        functionName: "allowance",
        args: [userAddress, GHIBLIFY_PAYMENTS_ADDRESS],
      });
      console.log("[CELO] Current allowance:", allowance.toString());

      // If allowance is insufficient, request approval
      if (allowance < priceInWei) {
        console.log("[CELO] Requesting cUSD approval...");
        const hash = await approveAsync({
          ...cusdContract,
          functionName: "approve",
          args: [GHIBLIFY_PAYMENTS_ADDRESS, priceInWei],
        });
        console.log("[CELO] Approval transaction hash:", hash);

        // Wait for approval transaction
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log("[CELO] Approval transaction receipt:", receipt);

        if (receipt.status !== "success") {
          throw new Error("cUSD approval failed");
        }
      }

      // Check package price
      console.log("[CELO] Checking package price...");
      const contract = {
        address: GHIBLIFY_PAYMENTS_ADDRESS,
        abi: GHIBLIFY_PAYMENTS_ABI,
      };

      const packagePrice = await publicClient.readContract({
        ...contract,
        functionName: "getPackagePrice",
        args: [contractTier],
      });
      console.log("[CELO] Package price:", packagePrice.toString());

      if (packagePrice !== priceInWei) {
        throw new Error("Package price mismatch");
      }

      // Execute the purchase transaction
      console.log("[CELO] Executing purchase transaction...");
      const hash = await purchaseAsync({
        ...contract,
        functionName: "purchaseCredits",
        args: [contractTier],
      });
      console.log("[CELO] Purchase transaction hash:", hash);

      // Wait for purchase transaction
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("[CELO] Purchase transaction receipt:", receipt);

      // Check if transaction was successful (status can be 'success', 1, or true)
      if (
        receipt.status !== "success" &&
        receipt.status !== 1 &&
        receipt.status !== true
      ) {
        console.error("[CELO] Transaction failed with status:", receipt.status);
        throw new Error(
          `Purchase transaction failed with status: ${receipt.status}`
        );
      }

      // Check if transaction has events (indicates successful purchase)
      if (!receipt.logs || receipt.logs.length === 0) {
        console.error("[CELO] Transaction succeeded but no events found");
        throw new Error(
          "Purchase transaction succeeded but no purchase events were emitted"
        );
      }

      console.log(
        "[CELO] Purchase transaction successful with",
        receipt.logs.length,
        "events!"
      );

      // Handle success
      handleSuccess(hash);
    } catch (error) {
      console.error("[CELO] Error during purchase:", error);

      // Parse error for user-friendly message
      const parsedError = parsePaymentError(error);
      const toastConfig = getToastConfig(parsedError);

      toast({
        ...toastConfig,
        isClosable: true,
      });
    } finally {
      setIsCeloProcessing(false);
    }
  };

  const handleStripePurchase = async (tier) => {
    const stripeHandler = createPaymentHandler("stripe", {
      // Configuration would go here if needed
    });

    await stripeHandler(tier, {
      address: userAddress,
      toast,
      setLoading: setIsLoading,
      setSelectedTier,
      onComplete: onPurchaseComplete,
      apiUrl: API_URL,
    });
  };

  const handleBasePayPurchase = async (tier) => {
    const basePayHandler = createPaymentHandler("basePay", {
      // Configuration would go here if needed
    });

    await basePayHandler(tier, {
      address: userAddress,
      toast,
      setLoading: setIsBasePayProcessing,
      setSelectedTier,
      onComplete: onPurchaseComplete,
      apiUrl: API_URL,
    });
  };

  // DRY: Modular $GHIBLIFY token payment handler following same pattern as other handlers
  const handleGhiblifyTokenPurchase = async (tier) => {
    if (isGhiblifyProcessing) {
      console.log(
        "[GHIBLIFY] Purchase already in progress, ignoring duplicate request"
      );
      return;
    }

    try {
      if (!userAddress) {
        toast({
          title: "Wallet not connected",
          description:
            "Please connect your wallet to pay with $GHIBLIFY tokens",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      setIsGhiblifyProcessing(true);
      setSelectedTier(tier.name);

      console.log("[GHIBLIFY] Starting token payment for tier:", tier.name);

      // Use the modular token payment service with real wagmi functions
      await ghiblifyTokenPayments.processPayment(tier.name, {
        // Pass real wagmi functions for contract interactions
        writeContractAsync: approveAsync, // Use the same wagmi hook as Celo implementation
        publicClient: publicClient, // Use the same public client as Celo implementation

        onStatusChange: (status) => {
          console.log("[GHIBLIFY] Payment status:", status);

          // Provide clear user feedback for each stage
          const statusMessages = {
            calculating: {
              title: "Calculating token amount...",
              description: "Getting current $GHIBLIFY price",
              status: "info",
              duration: 2000,
            },
            approving: {
              title: "Approve token spending",
              description:
                "Please approve $GHIBLIFY token spending in your wallet",
              status: "info",
              duration: 5000,
            },
            purchasing: {
              title: "Processing payment...",
              description: "Confirm the transaction in your wallet",
              status: "info",
              duration: 5000,
            },
            confirming: {
              title: "Confirming transaction...",
              description: "Waiting for blockchain confirmation",
              status: "info",
              duration: 3000,
            },
          };

          const message = statusMessages[status];
          if (message) {
            toast({
              ...message,
              isClosable: true,
            });
          }
        },
        onComplete: (result) => {
          console.log("[GHIBLIFY] Payment completed:", result);

          toast({
            title: "Payment Successful!",
            description: `${result.creditsAdded} credits added to your account`,
            status: "success",
            duration: 5000,
            isClosable: true,
          });

          // Refresh credits and notify parent (consistent with other handlers)
          refreshCredits();
          onPurchaseComplete?.();
        },
        onError: (error) => {
          console.error("[GHIBLIFY] Payment error:", error);

          // Parse error for user-friendly message
          const parsedError = parsePaymentError(error);
          const toastConfig = getToastConfig(parsedError);

          toast({
            ...toastConfig,
            isClosable: true,
          });
        },
      });
    } catch (error) {
      console.error("[GHIBLIFY] Error during purchase:", error);

      // Parse error for user-friendly message
      const parsedError = parsePaymentError(error);
      const toastConfig = getToastConfig(parsedError);

      toast({
        ...toastConfig,
        isClosable: true,
      });
    } finally {
      setIsGhiblifyProcessing(false);
    }
  };

  // Check URL params for successful payment
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id");

    if (sessionId && address) {
      // Check session status and update credits
      const checkSessionStatus = async () => {
        try {
          console.log(
            `[Stripe] Checking session ${sessionId} for ${address}...`
          );
          const response = await fetch(
            `${API_URL}/api/stripe/session/${sessionId}?address=${address}`,
            {
              method: "GET",
              credentials: "include",
              mode: "cors",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Origin:
                  typeof window !== "undefined"
                    ? window.location.origin
                    : "https://ghiblify-it.vercel.app",
              },
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to check session: ${errorText}`);
          }

          const data = await response.json();
          console.log(`[Stripe] Session status:`, data);

          if (data.status === "success") {
            // Notify parent component with new credit balance
            if (onPurchaseComplete) {
              onPurchaseComplete(data.credits);
            }

            toast({
              title: "Purchase Successful!",
              description: `${data.credits} credits have been added to your account.`,
              status: "success",
              duration: 5000,
              isClosable: true,
            });

            // Clear URL params
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
          } else {
            console.log(`[Stripe] Payment not completed yet: ${data.status}`);
          }
        } catch (error) {
          console.error("[Stripe] Session check error:", error);
          toast({
            title: "Error",
            description:
              error.message ||
              "Failed to verify purchase. Please contact support.",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
        }
      };

      // Run the session check
      checkSessionStatus();
    }
  }, [address, onPurchaseComplete, toast]);

  const tiers = [
    {
      name: "starter",
      price: "$0.50",
      celoPrice: PACKAGES.starter.price,
      credits: PACKAGES.starter.credits,
      description: "Try it out",
      features: [
        `${PACKAGES.starter.credits} Ghibli transformation`,
        "Valid for 30 days",
        "Both styles available",
      ],
    },
    {
      name: "pro",
      price: "$4.99",
      celoPrice: PACKAGES.pro.price,
      credits: PACKAGES.pro.credits,
      description: "Most popular",
      features: [
        `${PACKAGES.pro.credits} Ghibli transformations`,
        "Valid for 30 days",
        "Both styles available",
        "Save $1 vs single price",
      ],
    },
    {
      name: "unlimited",
      price: "$9.99",
      celoPrice: PACKAGES.unlimited.price,
      credits: PACKAGES.unlimited.credits,
      description: "Best value",
      features: [
        `${PACKAGES.unlimited.credits} Ghibli transformations`,
        "Valid for 30 days",
        "Both styles available",
        "Save $5 vs single price",
      ],
    },
  ];

  // DRY: Use centralized theme instead of duplicated color definitions
  const { colors, patterns, utils } = useGhibliTheme();
  const { isInFrame } = useFarcaster();

  // Mobile-optimized spacing for Farcaster mini app
  const containerSpacing = isInFrame ? 4 : 8;
  const cardSpacing = isInFrame ? 4 : 8;
  const containerPadding = isInFrame ? { base: 6, md: 12 } : 12;

  return (
    <Box py={containerPadding}>
      <VStack spacing={containerSpacing}>
        <Text
          fontSize={{ base: "xl", md: "2xl" }}
          fontWeight="bold"
          textAlign="center"
          color={colors.text.primary}
        >
          Choose Your Package
        </Text>
        <Text
          color={colors.text.secondary}
          textAlign="center"
          fontSize={{ base: "sm", md: "md" }}
        >
          Transform your photos into Studio Ghibli style artwork
        </Text>

        <Flex
          direction={{ base: "column", md: "row" }}
          gap={cardSpacing}
          px={isInFrame ? 2 : 4}
        >
          {tiers.map((tier) => (
            <Box
              key={tier.name}
              {...patterns.card}
              p={isInFrame ? 4 : 6}
              width={{ base: "full", md: "320px" }}
              position="relative"
              {...utils.getElevationStyle(2)}
            >
              {tier.description === "Most popular" && (
                <Badge
                  colorScheme="blue"
                  position="absolute"
                  top="-2"
                  right="-2"
                  rounded="full"
                  px={3}
                  py={1}
                >
                  Most Popular
                </Badge>
              )}

              <VStack spacing={isInFrame ? 3 : 4} align="stretch">
                <Text
                  fontSize={{ base: "lg", md: "2xl" }}
                  fontWeight="bold"
                  color={colors.text.primary}
                >
                  {tier.name === "starter"
                    ? "Starter"
                    : tier.name === "pro"
                    ? "Pro"
                    : "Unlimited"}
                </Text>
                <HStack>
                  <Text
                    fontSize={{ base: "2xl", md: "4xl" }}
                    fontWeight="bold"
                    color={colors.text.primary}
                  >
                    {tier.price}
                  </Text>
                  <Text
                    color={colors.text.secondary}
                    fontSize={{ base: "sm", md: "md" }}
                  >
                    USD
                  </Text>
                </HStack>
                <Text
                  color={colors.text.secondary}
                  fontSize={{ base: "sm", md: "md" }}
                >
                  {tier.description}
                </Text>

                <VStack
                  align="stretch"
                  spacing={isInFrame ? 2 : 3}
                  mt={isInFrame ? 2 : 4}
                >
                  {tier.features.map((feature) => (
                    <HStack key={feature} spacing={2}>
                      <Icon
                        as={FiCheck}
                        color="green.500"
                        boxSize={isInFrame ? 3 : 4}
                      />
                      <Text
                        color={colors.text.primary}
                        fontSize={{ base: "xs", md: "sm" }}
                      >
                        {feature}
                      </Text>
                    </HStack>
                  ))}
                </VStack>

                <PaymentMethodSelector
                  tier={{
                    name: tier.name,
                    displayName:
                      tier.name === "starter"
                        ? "Starter"
                        : tier.name === "pro"
                        ? "Pro"
                        : "Unlimited",
                    basePrice: parseFloat(tier.price.replace("$", "")),
                    credits: tier.credits,
                  }}
                  onMethodSelect={(method) => {
                    console.log("Pricing: Payment method selected:", method);
                    setSelectedTier(tier.name);
                    if (method === "stripe") {
                      handleStripePurchase(tier);
                    } else if (method === "celo") {
                      handleCeloPurchase(tier);
                    } else if (method === "basePay") {
                      handleBasePayPurchase(tier);
                    } else if (method === "ghiblifyToken") {
                      handleGhiblifyTokenPurchase(tier);
                    }
                  }}
                  selectedMethod={
                    selectedTier === tier.name ? "selected" : undefined
                  }
                  isProcessing={
                    (isLoading && selectedTier === tier.name) ||
                    (isCeloProcessing && selectedTier === tier.name) ||
                    (isBasePayProcessing && selectedTier === tier.name) ||
                    (isGhiblifyProcessing && selectedTier === tier.name)
                  }
                />
              </VStack>
            </Box>
          ))}
        </Flex>

        {/* Single tip message for all cards - more mobile-friendly */}
        <Box
          bg={colors.bg.secondary}
          p={isInFrame ? 3 : 4}
          borderRadius="lg"
          border="1px solid"
          borderColor={colors.border.subtle}
          maxW="600px"
          mx="auto"
        >
          <HStack spacing={2} justify="center">
            <Icon
              as={FiDollarSign}
              color={colors.text.accent}
              boxSize={isInFrame ? 4 : 5}
            />
            <Text
              fontSize={isInFrame ? "xs" : "sm"}
              color={colors.text.secondary}
              textAlign="center"
            >
              💡 Tip: $GHIBLIFY tokens offer the biggest savings and help grow
              the project!
            </Text>
          </HStack>
        </Box>
      </VStack>
    </Box>
  );
}
