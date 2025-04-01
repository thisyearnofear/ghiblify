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
import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWatchContractEvent,
  usePublicClient,
} from "wagmi";
import { FiCheck, FiCreditCard, FiDollarSign } from "react-icons/fi";
import { celoAlfajores } from "viem/chains";
import {
  GHIBLIFY_PAYMENTS_ADDRESS,
  GHIBLIFY_PAYMENTS_ABI,
  CUSD_TOKEN_ADDRESS,
  CUSD_TOKEN_ABI,
  PACKAGES,
} from "../contracts/ghiblifyPayments";
import { parseEther, formatUnits } from "ethers";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const STRIPE_WEBHOOK_URL = process.env.NEXT_PUBLIC_STRIPE_WEBHOOK_URL;

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

export default function Pricing({ onPurchaseComplete }) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [isCeloProcessing, setIsCeloProcessing] = useState(false);
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { writeContractAsync: approveAsync } = useWriteContract();
  const { writeContractAsync: purchaseAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // Watch for contract events
  useWatchContractEvent({
    address: GHIBLIFY_PAYMENTS_ADDRESS,
    abi: GHIBLIFY_PAYMENTS_ABI,
    eventName: "CreditsPurchased",
    onLogs(logs) {
      const log = logs[0];
      if (log && log.args && log.args.buyer === address) {
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
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          credentials: "include",
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

  const handleSuccess = (txHash) => {
    setIsCeloProcessing(false);
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
    try {
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

      // Check if we're on the correct chain
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      if (chainId !== "0xaef3") {
        // Alfajores testnet chain ID
        toast({
          title: "Wrong Network",
          description:
            "Please switch to Celo Alfajores Testnet to make a purchase",
          status: "warning",
          duration: 10000,
          isClosable: true,
          action: (
            <Button
              size="sm"
              onClick={() =>
                window.ethereum.request({
                  method: "wallet_switchEthereumChain",
                  params: [{ chainId: "0xaef3" }],
                })
              }
            >
              Switch Network
            </Button>
          ),
        });
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
        args: [address],
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
        args: [address, GHIBLIFY_PAYMENTS_ADDRESS],
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

      if (receipt.status !== "success") {
        throw new Error("Purchase failed");
      }

      // Handle success
      handleSuccess(hash);
    } catch (error) {
      console.error("[CELO] Error during purchase:", error);
      toast({
        title: "Purchase Failed",
        description:
          error.message || "There was an error processing your purchase.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsCeloProcessing(false);
    }
  };

  const handleStripePurchase = async (tier) => {
    if (!isConnected || !address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet before making a purchase.",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    setSelectedTier(tier.name.toLowerCase());

    try {
      // Create Stripe checkout session
      console.log(
        `[Stripe] Creating checkout session for ${tier.name.toLowerCase()}...`
      );
      const response = await fetch(
        `${API_URL}/api/stripe/create-checkout-session/${tier.name.toLowerCase()}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            wallet_address: address,
          }),
        }
      );

      console.log(`[Stripe] Response status: ${response.status}`);
      const responseText = await response.text();
      console.log(`[Stripe] Response body: ${responseText}`);

      if (!response.ok) {
        throw new Error(`Failed to create checkout session: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      console.log(`[Stripe] Redirecting to: ${data.url}`);

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error("Purchase error:", error);
      toast({
        title: "Error",
        description: "Failed to process purchase. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
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
            `${API_URL}/api/stripe/session/${sessionId}?address=${address}`
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
  }, []);

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

  return (
    <Box py={12}>
      <VStack spacing={8}>
        <Text fontSize="2xl" fontWeight="bold" textAlign="center">
          Choose Your Package
        </Text>
        <Text color="gray.500" textAlign="center">
          Transform your photos into Studio Ghibli style artwork
        </Text>

        <Flex direction={{ base: "column", md: "row" }} gap={8} px={4}>
          {tiers.map((tier) => (
            <Box
              key={tier.name}
              bg="white"
              border="1px"
              borderColor="gray.200"
              rounded="lg"
              shadow="base"
              p={6}
              width={{ base: "full", md: "320px" }}
              position="relative"
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

              <VStack spacing={4} align="stretch">
                <Text fontSize="2xl" fontWeight="bold">
                  {tier.name === "starter"
                    ? "Starter"
                    : tier.name === "pro"
                    ? "Pro"
                    : "Unlimited"}
                </Text>
                <HStack>
                  <Text fontSize="4xl" fontWeight="bold">
                    {tier.price}
                  </Text>
                  <Text color="gray.500">USD</Text>
                </HStack>
                <Text color="gray.500">{tier.description}</Text>

                <VStack align="stretch" spacing={3} mt={4}>
                  {tier.features.map((feature) => (
                    <HStack key={feature}>
                      <Icon as={FiCheck} color="green.500" />
                      <Text>{feature}</Text>
                    </HStack>
                  ))}
                </VStack>

                <VStack spacing={3} mt={4}>
                  <Button
                    w="full"
                    colorScheme="purple"
                    variant="solid"
                    onClick={() => handleStripePurchase(tier)}
                    isLoading={isLoading && selectedTier === tier.name}
                    leftIcon={<Icon as={FiCreditCard} />}
                  >
                    Pay with Card
                  </Button>
                  <Button
                    w="full"
                    colorScheme="yellow"
                    variant="solid"
                    onClick={() => handleCeloPurchase(tier)}
                    isLoading={isCeloProcessing && selectedTier === tier.name}
                    leftIcon={<Icon as={FiDollarSign} />}
                  >
                    Pay {tier.celoPrice} cUSD
                  </Button>
                </VStack>
              </VStack>
            </Box>
          ))}
        </Flex>
      </VStack>
    </Box>
  );
}
