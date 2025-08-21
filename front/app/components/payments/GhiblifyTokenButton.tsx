"use client";

import {
  Button,
  HStack,
  VStack,
  Text,
  Badge,
  Spinner,
  Tooltip,
  Box,
  Icon,
  useColorModeValue,
} from "@chakra-ui/react";
import { FiZap, FiTrendingUp, FiTrendingDown, FiMinus } from "react-icons/fi";
import { IconType } from "react-icons";
import { useState, useEffect } from "react";
import { ghiblifyPriceOracle } from "../../lib/services/ghiblify-price-oracle";
import { ghiblifyTokenPayments } from "../../lib/services/ghiblify-token-payments";
import { useUnifiedWallet } from "../../lib/hooks/useUnifiedWallet";
import { autoConnectionService } from "../../lib/services/auto-connection-service";

interface GhiblifyTokenButtonProps {
  tier: {
    name: string;
    displayName: string;
    basePrice: number;
  };
  onPayment: () => void;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function GhiblifyTokenButton({
  tier,
  onPayment,
  isLoading = false,
  size = "md",
}: GhiblifyTokenButtonProps) {
  const [tokenAmount, setTokenAmount] = useState<string>("");
  const [priceDisplay, setPriceDisplay] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const [networkSwitch, setNetworkSwitch] = useState<any>(null);

  const { user, provider } = useUnifiedWallet();

  // Theme colors
  const bgGradient = useColorModeValue(
    "linear(to-r, green.400, green.600)",
    "linear(to-r, green.300, green.500)"
  );
  const badgeBg = useColorModeValue("green.100", "green.800");
  const textColor = useColorModeValue("white", "white");

  // Calculate token amount and check availability
  useEffect(() => {
    let mounted = true;

    const calculateTokens = async () => {
      try {
        setIsCalculating(true);

        // Check if service is available
        const available = ghiblifyTokenPayments.isAvailable();
        setIsAvailable(available);

        if (!available) return;

        // Calculate required tokens
        const calculation = await ghiblifyTokenPayments.calculatePayment(
          tier.name
        );
        const priceDisplay = await ghiblifyPriceOracle.getPriceDisplay();

        if (mounted) {
          setTokenAmount(calculation.tokenAmountFormatted);
          setPriceDisplay(priceDisplay);
        }
      } catch (error) {
        console.error("Failed to calculate token amount:", error);
        if (mounted) {
          setIsAvailable(false);
        }
      } finally {
        if (mounted) {
          setIsCalculating(false);
        }
      }
    };

    calculateTokens();

    // Update every 2 minutes for efficient pricing
    const interval = setInterval(calculateTokens, 120000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [tier.name, user, provider]);

  // Always show the button, but with different states
  if (!isAvailable) {
    // Show disabled state with helpful messaging
    return (
      <Tooltip
        label={
          <VStack spacing={1} align="start">
            <Text fontSize="sm" fontWeight="bold">
              $GHIBLIFY Token (50% OFF)
            </Text>
            <Text fontSize="xs">
              💡 Connect your wallet to access this amazing deal!
            </Text>
            <Text fontSize="xs" color="green.200">
              Save 50% + support the project
            </Text>
          </VStack>
        }
        placement="top"
        hasArrow
      >
        <Button
          size={size}
          variant="outline"
          colorScheme="green"
          isDisabled
          opacity={0.7}
          _hover={{ opacity: 0.8 }}
        >
          <VStack spacing={0}>
            <HStack spacing={2}>
              <Icon as={FiZap as any} />
              <Text fontWeight="bold">$GHIBLIFY</Text>
            </HStack>
            <Badge
              colorScheme="green"
              variant="solid"
              fontSize="2xs"
              px={1}
              py={0}
              minW="fit-content"
              whiteSpace="nowrap"
            >
              50% OFF
            </Badge>
          </VStack>
        </Button>
      </Tooltip>
    );
  }

  // Show calculating state
  if (isCalculating) {
    return (
      <Button size={size} variant="outline" isDisabled colorScheme="green">
        <HStack>
          <Spinner size="xs" />
          <Text>Calculating...</Text>
        </HStack>
      </Button>
    );
  }

  const getTrendIcon = (): IconType => {
    if (!priceDisplay) return FiMinus;
    switch (priceDisplay.trend) {
      case "up":
        return FiTrendingUp;
      case "down":
        return FiTrendingDown;
      default:
        return FiMinus;
    }
  };

  const getTrendColor = () => {
    if (!priceDisplay) return "gray";
    switch (priceDisplay.trend) {
      case "up":
        return "green";
      case "down":
        return "red";
      default:
        return "gray";
    }
  };

  return (
    <Tooltip
      label={
        <VStack spacing={1} align="start">
          <Text fontSize="sm" fontWeight="bold">
            Pay with $GHIBLIFY Token
          </Text>
          <Text fontSize="xs">
            Current price: {priceDisplay?.price || "Loading..."}
          </Text>
          <Text fontSize="xs">
            Market cap: {priceDisplay?.marketCap || "N/A"}
          </Text>
          <Text fontSize="xs" color="green.200">
            50% discount + support the project!
          </Text>
        </VStack>
      }
      placement="top"
      hasArrow
    >
      <Button
        size={size}
        bgGradient={bgGradient}
        color={textColor}
        _hover={{
          bgGradient: "linear(to-r, green.500, green.700)",
          transform: "translateY(-1px)",
          boxShadow: "lg",
        }}
        _active={{
          transform: "translateY(0px)",
        }}
        transition="all 0.2s ease"
        onClick={async () => {
          console.log(
            "$GHIBLIFY button clicked, checking network requirements"
          );

          // Check if we need to switch to Base network for $GHIBLIFY payments
          const networkCheck = ghiblifyTokenPayments.requiresNetworkSwitch();
          if (networkCheck.required) {
            console.log("Switching to Base network for $GHIBLIFY payment");
            // Auto-switch to Base network
            const success = await autoConnectionService.switchNetwork(
              user.address,
              "base"
            );
            if (!success) {
              console.error(
                "Failed to switch to Base network for $GHIBLIFY payment"
              );
              // Show user-friendly error message
              alert(
                "Please switch to Base network to pay with $GHIBLIFY tokens"
              );
              return;
            }
          }

          onPayment();
        }}
        isLoading={isLoading}
        loadingText="Processing..."
        position="relative"
        overflow="hidden"
      >
        <VStack spacing={0}>
          <HStack spacing={2}>
            <Icon as={FiZap as any} />
            <Text fontWeight="bold">{tokenAmount} $GHIBLIFY</Text>
            {priceDisplay && (
              <Icon
                as={getTrendIcon() as any}
                color={getTrendColor()}
                boxSize={3}
              />
            )}
          </HStack>

          <HStack spacing={2}>
            <Badge
              colorScheme="green"
              variant="solid"
              bg={badgeBg}
              color="green.800"
              fontSize="2xs"
              px={1}
              py={0}
              minW="fit-content"
              whiteSpace="nowrap"
            >
              50% OFF
            </Badge>
            {priceDisplay && (
              <Text fontSize="2xs" opacity={0.9}>
                {priceDisplay.change}
              </Text>
            )}
          </HStack>
        </VStack>

        {/* Subtle animated background for delight */}
        <Box
          position="absolute"
          top="0"
          left="-100%"
          w="100%"
          h="100%"
          bgGradient="linear(to-r, transparent, whiteAlpha.200, transparent)"
          transform="skewX(-20deg)"
          animation="shimmer 3s infinite"
          sx={{
            "@keyframes shimmer": {
              "0%": { left: "-100%" },
              "100%": { left: "100%" },
            },
          }}
        />
      </Button>
    </Tooltip>
  );
}
