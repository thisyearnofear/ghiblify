"use client";

import {
  VStack,
  HStack,
  Button,
  Text,
  Badge,
  Icon,
  Box,
  Divider,
  Tooltip,
  useBreakpointValue,
} from "@chakra-ui/react";
import { useGhibliTheme } from "../../hooks/useGhibliTheme";
import {
  FiCreditCard,
  FiDollarSign,
  FiZap,
  FiInfo,
  FiAlertTriangle,
} from "react-icons/fi";
import { useState } from "react";
import { useUnifiedWallet } from "../../lib/hooks/useUnifiedWallet";
import { useFarcaster } from "../FarcasterFrameProvider";
import { useChainId } from "wagmi";
import { ghiblifyTokenPayments } from "../../lib/services/ghiblify-token-payments";
import { baseAccountPayments } from "../../lib/services/base-account-payments";
import GhiblifyTokenButton from "./GhiblifyTokenButton";

interface PaymentMethodSelectorProps {
  tier: {
    name: string;
    displayName: string;
    basePrice: number;
    credits: number;
  };
  onMethodSelect: (method: string) => void;
  selectedMethod?: string;
  isProcessing?: boolean;
}

export default function PaymentMethodSelector({
  tier,
  onMethodSelect,
  selectedMethod,
  isProcessing = false,
}: PaymentMethodSelectorProps) {
  const { user, provider, isConnected } = useUnifiedWallet();
  const { isInFrame } = useFarcaster();
  const chainId = useChainId();

  // DRY: Use centralized theme instead of scattered useColorModeValue calls
  const { colors, patterns, utils } = useGhibliTheme();

  // Responsive layout values
  const buttonSpacing = useBreakpointValue({ base: 3, md: 4 });
  const badgePadding = useBreakpointValue({ base: 1, md: 2 });
  const priceLayout = useBreakpointValue({
    base: "vertical", // Stack vertically on mobile
    md: "horizontal", // Side by side on desktop
  });

  // Determine available payment methods based on context
  const getAvailablePaymentMethods = () => {
    const methods = [];

    // $GHIBLIFY Token (show when available, regardless of provider)
    // The token service itself handles network compatibility
    if (ghiblifyTokenPayments.isAvailable()) {
      methods.push({
        id: "ghiblifyToken",
        name: "Pay with $GHIBLIFY",
        icon: FiZap,
        colorScheme: "green",
        discount: 50,
        badge: "50% OFF",
        description: "Support the project & save big",
        priority: 1,
        component: GhiblifyTokenButton,
      });
    }

    // Base Pay (when authenticated)
    if (baseAccountPayments.isAvailable() && provider === "base") {
      methods.push({
        id: "basePay",
        name: "Base Pay",
        icon: FiDollarSign,
        colorScheme: "blue",
        discount: 30,
        badge: "30% OFF",
        description: "One-tap USDC payments",
        priority: 2,
      });
    }

    // Celo (when on Celo/RainbowKit)
    if (provider === "rainbowkit" || provider === "farcaster") {
      // Add network validation
      const isCeloMainnet = chainId === 42220; // Celo mainnet chain ID

      if (!isCeloMainnet && chainId) {
        methods.push({
          id: "celo",
          name: "Network Error",
          icon: FiAlertTriangle,
          colorScheme: "red",
          discount: 0,
          badge: "Wrong Network",
          description: "Switch to Celo Mainnet to pay with cUSD",
          priority: 3,
        });
      } else {
        methods.push({
          id: "celo",
          name: "Pay with cUSD",
          icon: FiDollarSign,
          colorScheme: "yellow",
          discount: 30,
          badge: "30% OFF",
          description: "Celo USD stablecoin",
          priority: 3,
        });
      }
    }

    // Stripe (always available as fallback)
    methods.push({
      id: "stripe",
      name: "Pay with Card",
      icon: FiCreditCard,
      colorScheme: "purple",
      discount: 0,
      badge: null,
      description: "Credit/debit card",
      priority: 4,
    });

    return methods.sort((a, b) => a.priority - b.priority);
  };

  const calculatePrice = (basePrice: number, discount: number) => {
    const discounted = basePrice * (1 - discount / 100);
    const savings = basePrice - discounted;

    return {
      original: basePrice,
      discounted,
      savings,
      formattedOriginal: `$${basePrice.toFixed(2)}`,
      formattedDiscounted: `$${discounted.toFixed(2)}`,
      formattedSavings: savings > 0 ? `Save $${savings.toFixed(2)}` : null,
    };
  };

  const availableMethods = getAvailablePaymentMethods();

  if (!isConnected) {
    return (
      <Box {...patterns.card} p={4} borderRadius="xl" textAlign="center">
        <Text color={colors.text.secondary} fontSize="sm">
          Connect your wallet to see payment options
        </Text>
      </Box>
    );
  }

  return (
    <VStack spacing={3} align="stretch">
      <HStack justify="space-between" align="center">
        <Text fontSize="md" fontWeight="semibold" color={colors.text.primary}>
          Choose Payment Method
        </Text>
        {isInFrame && (
          <Tooltip label="Optimized for Farcaster mini app">
            <Icon as={FiInfo as any} color={colors.text.accent} boxSize={4} />
          </Tooltip>
        )}
      </HStack>

      <VStack spacing={2} align="stretch">
        {availableMethods.map((method) => {
          const pricing = calculatePrice(tier.basePrice, method.discount);
          const isSelected = selectedMethod === method.id;

          // Special handling for $GHIBLIFY token button
          if (method.component) {
            return (
              <Box
                key={method.id}
                p={3}
                borderRadius="lg"
                border="2px solid"
                borderColor={isSelected ? colors.border.accent : "transparent"}
                bg={isSelected ? colors.interactive.hover : "transparent"}
                transition="all 0.2s ease"
                {...utils.getElevationStyle(isSelected ? 2 : 1)}
              >
                <method.component
                  tier={tier}
                  onPayment={() => {
                    console.log(
                      "PaymentMethodSelector: $GHIBLIFY method selected"
                    );
                    onMethodSelect(method.id);
                  }}
                  isLoading={isProcessing && isSelected}
                  size="lg"
                />
              </Box>
            );
          }

          return (
            <Button
              key={method.id}
              variant={isSelected ? "solid" : "outline"}
              colorScheme={method.colorScheme}
              size="lg"
              h="auto"
              minH="72px"
              p={4}
              onClick={() => onMethodSelect(method.id)}
              isLoading={isProcessing && isSelected}
              loadingText="Processing..."
              _hover={{
                bg: isSelected ? undefined : colors.interactive.hover,
                transform: "translateY(-1px)",
                boxShadow: colors.shadow.elevated,
              }}
              transition="all 0.2s ease"
              overflow="hidden"
            >
              <HStack
                w="full"
                justify="space-between"
                align="center"
                spacing={buttonSpacing}
              >
                <HStack spacing={3} flex="1" minW="0">
                  <Icon as={method.icon as any} boxSize={5} flexShrink={0} />
                  <VStack align="start" spacing={0} minW="0" flex="1">
                    <Text
                      fontWeight="semibold"
                      fontSize="sm"
                      color={colors.text.primary}
                      noOfLines={1}
                    >
                      {method.name}
                    </Text>
                    <Text
                      fontSize="xs"
                      color={colors.text.secondary}
                      noOfLines={1}
                    >
                      {method.description}
                    </Text>
                  </VStack>
                </HStack>

                <VStack
                  align="end"
                  spacing={1}
                  flexShrink={0}
                  minW="fit-content"
                  maxW={{ base: "120px", md: "160px" }}
                >
                  <VStack spacing={1} align="end">
                    {method.badge && (
                      <Badge
                        colorScheme="red"
                        variant="solid"
                        fontSize="2xs"
                        px={badgePadding}
                        py={1}
                        borderRadius="md"
                        whiteSpace="nowrap"
                        alignSelf="end"
                      >
                        {method.badge}
                      </Badge>
                    )}
                    <VStack spacing={0} align="end">
                      <Text
                        fontWeight="bold"
                        fontSize="md"
                        color={colors.text.primary}
                        whiteSpace="nowrap"
                      >
                        {pricing.formattedDiscounted}
                      </Text>
                      {pricing.savings > 0 && (
                        <Text
                          fontSize="xs"
                          textDecoration="line-through"
                          color={colors.text.muted}
                          whiteSpace="nowrap"
                          lineHeight="1"
                        >
                          {pricing.formattedOriginal}
                        </Text>
                      )}
                    </VStack>
                  </VStack>
                </VStack>
              </HStack>
            </Button>
          );
        })}
      </VStack>

      {/* Helpful context for Farcaster users */}
      {isInFrame && (
        <>
          <Divider />
          <Box p={3} bg={colors.bg.secondary} borderRadius="md">
            <Text fontSize="xs" color={colors.text.accent}>
              💡 <strong>Tip:</strong> $GHIBLIFY tokens offer the biggest
              savings and help grow the project!
            </Text>
          </Box>
        </>
      )}
    </VStack>
  );
}
