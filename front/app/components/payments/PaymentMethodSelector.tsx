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
  useToast,
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
import { autoConnectionService } from "../../lib/services/auto-connection-service";
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
  const toast = useToast();

  // DRY: Use centralized theme instead of scattered useColorModeValue calls
  const { colors, patterns, utils } = useGhibliTheme();

  // Responsive layout values - optimized for Farcaster mini app
  const buttonSpacing = useBreakpointValue({ base: isInFrame ? 2 : 3, md: 4 });
  const badgePadding = useBreakpointValue({ base: 1, md: 2 });
  const priceLayout = useBreakpointValue({
    base: "vertical", // Stack vertically on mobile
    md: "horizontal", // Side by side on desktop
  });
  const buttonHeight = isInFrame ? "60px" : "72px";
  const buttonPadding = isInFrame ? 3 : 4;

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

    // Celo (when on Celo/RainbowKit) - Always show, auto-switch network like $GHIBLIFY
    if (provider === "rainbowkit" || provider === "farcaster") {
      methods.push({
        id: "celo",
        name: "Pay with cUSD",
        icon: FiDollarSign,
        colorScheme: "yellow",
        discount: 30,
        badge: "30% OFF",
        description: "Celo USD stablecoin",
        priority: 3,
        requiresNetworkSwitch: chainId !== 42220, // Auto-switch if not on Celo mainnet
      });
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
    <VStack spacing={isInFrame ? 2 : 3} align="stretch">
      <HStack justify="space-between" align="center">
        <Text
          fontSize={isInFrame ? "sm" : "md"}
          fontWeight="semibold"
          color={colors.text.primary}
        >
          Choose Payment Method
        </Text>
        {isInFrame && (
          <Tooltip label="Optimized for Farcaster mini app">
            <Icon as={FiInfo as any} color={colors.text.accent} boxSize={3} />
          </Tooltip>
        )}
      </HStack>

      <VStack spacing={isInFrame ? 1.5 : 2} align="stretch">
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
              size={isInFrame ? "md" : "lg"}
              h="auto"
              minH={buttonHeight}
              p={buttonPadding}
              onClick={async () => {
                // Handle CELO network switching automatically like $GHIBLIFY
                if (method.id === "celo" && method.requiresNetworkSwitch) {
                  console.log("Switching to CELO network for cUSD payment");
                  
                  // Show loading state while switching networks
                  const switchingToast = toast({
                    title: "Switching Network",
                    description: "Please approve the network switch to Celo in your wallet",
                    status: "info",
                    duration: null, // Keep open until we close it
                    isClosable: false,
                  });

                  try {
                    const success = await autoConnectionService.switchNetwork(
                      user.address,
                      "celo" // Switch to CELO network
                    );
                    
                    // Close the switching toast
                    if (switchingToast) {
                      toast.close(switchingToast);
                    }
                    
                    if (!success) {
                      console.error(
                        "Failed to switch to CELO network for cUSD payment"
                      );
                      toast({
                        title: "Network Switch Failed",
                        description: "Unable to switch to Celo network. Please switch manually in your wallet and try again.",
                        status: "error",
                        duration: 8000,
                        isClosable: true,
                      });
                      return; // Don't proceed with payment
                    }
                    
                    toast({
                      title: "Network Switched",
                      description: "Successfully switched to Celo network",
                      status: "success",
                      duration: 3000,
                      isClosable: true,
                    });
                  } catch (error) {
                    // Close the switching toast
                    if (switchingToast) {
                      toast.close(switchingToast);
                    }
                    
                    console.error("Error during network switch:", error);
                    toast({
                      title: "Network Switch Error",
                      description: "An error occurred while switching networks. Please try again.",
                      status: "error",
                      duration: 8000,
                      isClosable: true,
                    });
                    return; // Don't proceed with payment
                  }
                }
                onMethodSelect(method.id);
              }}
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
                <HStack spacing={isInFrame ? 2 : 3} flex="1" minW="0">
                  <Icon
                    as={method.icon as any}
                    boxSize={isInFrame ? 4 : 5}
                    flexShrink={0}
                  />
                  <VStack align="start" spacing={0} minW="0" flex="1">
                    <Text
                      fontWeight="semibold"
                      fontSize={isInFrame ? "xs" : "sm"}
                      color={colors.text.primary}
                      noOfLines={1}
                    >
                      {method.name}
                    </Text>
                    {!isInFrame && (
                      <Text
                        fontSize="xs"
                        color={colors.text.secondary}
                        noOfLines={1}
                      >
                        {method.description}
                      </Text>
                    )}
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
