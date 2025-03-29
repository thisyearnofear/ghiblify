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
import { FiCheck } from "react-icons/fi";

const API_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "https://ghiblify.onrender.com";

export default function Pricing({ onPurchaseComplete }) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const toast = useToast();

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
    setIsLoading(true);
    setSelectedTier(tier.name.toLowerCase());

    try {
      // Create Stripe checkout session
      const response = await fetch(
        `${API_URL}/api/stripe/create-checkout-session/${tier.name.toLowerCase()}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const data = await response.json();

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

    if (sessionId) {
      // Fetch session token
      const getSessionToken = async () => {
        try {
          const response = await fetch(
            `${API_URL}/api/stripe/session/${sessionId}`
          );
          if (!response.ok) throw new Error("Failed to get session token");

          const data = await response.json();

          // Store token in localStorage
          localStorage.setItem("ghiblify_token", data.token);

          // Notify parent component
          if (onPurchaseComplete) {
            onPurchaseComplete(data.token);
          }

          toast({
            title: "Purchase Successful!",
            description: "Your credits have been added to your account.",
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
        } catch (error) {
          console.error("Error fetching session token:", error);
          toast({
            title: "Error",
            description: "Failed to verify purchase. Please contact support.",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
        }
      };

      getSessionToken();
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
