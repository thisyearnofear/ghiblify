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
import { useAccount } from 'wagmi';
import { FiCheck } from "react-icons/fi";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Pricing({ onPurchaseComplete }) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const toast = useToast();
  const { address, isConnected } = useAccount();

  const tiers = [
    {
      name: "Single",
      price: "$0.50",
      credits: 1,
      description: "Try it out",
      features: [
        "1 Ghibli transformation",
        "Valid for 30 days",
        "Both styles available",
      ],
    },
    {
      name: "Basic",
      price: "$4.99",
      credits: 12,
      description: "Most popular",
      features: [
        "12 Ghibli transformations",
        "Valid for 30 days",
        "Both styles available",
        "Save $1 vs single price",
      ],
    },
    {
      name: "Pro",
      price: "$9.99",
      credits: 30,
      description: "Best value",
      features: [
        "30 Ghibli transformations",
        "Valid for 30 days",
        "Both styles available",
        "Save $5 vs single price",
      ],
    },
  ];

  const handlePurchase = async (tier) => {
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
      console.log(`[Stripe] Creating checkout session for ${tier.name.toLowerCase()}...`);
      const response = await fetch(
        `${API_URL}/api/stripe/create-checkout-session/${tier.name.toLowerCase()}`,
        {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            wallet_address: address
          })
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
          console.log(`[Stripe] Checking session ${sessionId} for ${address}...`);
          const response = await fetch(
            `${API_URL}/api/stripe/session/${sessionId}?address=${address}`
          );
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to check session: ${errorText}`);
          }

          const data = await response.json();
          console.log(`[Stripe] Session status:`, data);

          if (data.status === 'success') {
            // Notify parent component with new credit balance
            if (onPurchaseComplete) {
              onPurchaseComplete(data.credits);
            }

            toast({
              title: "Purchase Successful!",
              description: `${data.credits} credits have been added to your account.`,
              status: "success",
              duration: 5000,
              isClosable: true
            });

            // Clear URL params
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            console.log(`[Stripe] Payment not completed yet: ${data.status}`);
          }
        } catch (error) {
          console.error("[Stripe] Session check error:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to verify purchase. Please contact support.",
            status: "error",
            duration: 5000,
            isClosable: true
          });
        }
      };

      // Run the session check
      checkSessionStatus();
    }
  }, []);

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
                  {tier.name}
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

                <Button
                  mt={8}
                  w="full"
                  colorScheme="blue"
                  onClick={() => handlePurchase(tier)}
                  isLoading={
                    isLoading && selectedTier === tier.name.toLowerCase()
                  }
                >
                  Get Started
                </Button>
              </VStack>
            </Box>
          ))}
        </Flex>
      </VStack>
    </Box>
  );
}
