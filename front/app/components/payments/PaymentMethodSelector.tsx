"use client";

import { useEffect } from "react";
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
import { useFarcaster } from "../FarcasterMiniAppProvider";
import { useChainId } from "wagmi";
import { ghiblifyTokenPayments } from "../../lib/services/ghiblify-token-payments";
import { baseAccountPayments } from "../../lib/services/base-account-payments";
import GhiblifyTokenButton from "./GhiblifyTokenButton";
import { autoConnectionService } from "../../lib/services/auto-connection-service";

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
  const { isInMiniApp } = useFarcaster();
  const chainId = useChainId();
  const toast = useToast();
  const [celoBalance, setCeloBalance] = useState<string | null>(null);
  const [checkingCeloBalance, setCheckingCeloBalance] = useState(false);

  // DRY: Use centralized theme instead of scattered useColorModeValue calls
  const { colors, patterns, utils } = useGhibliTheme();

  // Responsive layout values - optimized for Farcaster mini app
  const buttonSpacing = useBreakpointValue({ base: isInMiniApp ? 2 : 3, md: 4 });
  const badgePadding = useBreakpointValue({ base: 1, md: 2 });
  const priceLayout = useBreakpointValue({
    base: "vertical", // Stack vertically on mobile
    md: "horizontal", // Side by side on desktop
  });
  const buttonHeight = isInMiniApp ? "60px" : "72px";
  const buttonPadding = isInMiniApp ? 3 : 4;

  // Check Celo balance when provider is RainbowKit and on Celo chain
  useEffect(() => {
    const checkCeloBalance = async () => {
      if (provider !== "rainbowkit" || !user?.address || chainId !== 42220) {
        return;
      }
      
      try {
        setCheckingCeloBalance(true);
        const { publicClient } = await import("../../config/wagmi-config");
        const balance = await publicClient.readContract({
          address: "0x765DE816845861e75A25fCA122bb6898B6F02217" as `0x${string}`,
          abi: [
            {
              name: "balanceOf",
              type: "function",
              inputs: [{ type: "address" }],
              outputs: [{ type: "uint256" }],
              stateMutability: "view",
            },
          ] as const,
          functionName: "balanceOf",
          args: [user.address as `0x${string}`],
        } as any);
        setCeloBalance(balance.toString());
      } catch (error) {
        console.error("Error checking Celo balance:", error);
      } finally {
        setCheckingCeloBalance(false);
      }
    };

    if (isConnected && provider === "rainbowkit") {
      checkCeloBalance();
    }
  }, [isConnected, provider, user?.address, chainId]);

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

    // Celo (when on RainbowKit) - Always show, auto-switch network like $GHIBLIFY
    if (provider === "rainbowkit") {
      const celoBalanceNum = celoBalance ? parseInt(celoBalance) / 1e18 : 0;
      methods.push({
        id: "celo",
        name: "Pay with cUSD",
        icon: FiDollarSign,
        colorScheme: "yellow",
        discount: 30,
        badge: "30% OFF",
        description: `Celo USD stablecoin${checkingCeloBalance ? " (checking balance...)" : celoBalance ? ` - Balance: ${celoBalanceNum.toFixed(2)} cUSD` : ""}`,
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
    <VStack spacing={isInMiniApp ? 2 : 3} align="stretch">
      <HStack justify="space-between" align="center">
        <Text
          fontSize={isInMiniApp ? "sm" : "md"}
          fontWeight="semibold"
          color={colors.text.primary}
        >
          Choose Payment Method
        </Text>
        {isInMiniApp && (
          <Tooltip label="Optimized for Farcaster mini app">
            <Icon as={FiInfo as any} color={colors.text.accent} boxSize={3} />
          </Tooltip>
        )}
      </HStack>

      {/* Celo balance warning if insufficient */}
      {provider === "rainbowkit" && celoBalance && chainId === 42220 && (
        (() => {
          const celoBalanceNum = parseInt(celoBalance) / 1e18;
          const requiredAmount = calculatePrice(tier.basePrice, 30).discounted;
          if (celoBalanceNum < requiredAmount) {
            return (
              <Box
                p={3}
                bg="orange.50"
                borderLeft="4px solid"
                borderColor="orange.500"
                borderRadius="md"
              >
                <HStack spacing={2} align="flex-start">
                  <Icon as={FiAlertTriangle} color="orange.600" flexShrink={0} />
                  <VStack spacing={1} align="start">
                    <Text fontSize="sm" fontWeight="semibold" color="orange.900">
                      Insufficient cUSD Balance
                    </Text>
                    <Text fontSize="xs" color="orange.700">
                      You have {celoBalanceNum.toFixed(2)} cUSD, but {requiredAmount.toFixed(2)} cUSD is required
                    </Text>
                  </VStack>
                </HStack>
              </Box>
            );
          }
          return null;
        })()
      )}

      <VStack spacing={isInMiniApp ? 1.5 : 2} align="stretch">
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
              size={isInMiniApp ? "md" : "lg"}
              h="auto"
              minH={buttonHeight}
              p={buttonPadding}
              onClick={async () => {
                // Validate Celo balance before proceeding with payment
                if (method.id === "celo" && celoBalance) {
                  const celoBalanceNum = parseInt(celoBalance) / 1e18;
                  const requiredAmount = calculatePrice(tier.basePrice, 30).discounted;
                  
                  if (celoBalanceNum < requiredAmount) {
                    toast({
                      title: "Insufficient cUSD Balance",
                      description: `You have ${celoBalanceNum.toFixed(2)} cUSD, but ${requiredAmount.toFixed(2)} cUSD is required.`,
                      status: "warning",
                      duration: 6000,
                      isClosable: true,
                    });
                    return;
                  }
                }

                // Handle CELO network switching automatically like $GHIBLIFY
                if (method.id === "celo" && method.requiresNetworkSwitch) {
                  console.log("Switching to CELO network for cUSD payment");

                  // Show loading state while switching networks
                  const switchingToast = toast({
                    title: "Switching Network",
                    description:
                      "Please approve the network switch to Celo in your wallet",
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
                        description:
                          "Unable to switch to Celo network. Please switch manually in your wallet and try again.",
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
                    const errorMsg = error instanceof Error ? error.message : "Unknown error";
                    toast({
                      title: "Network Switch Error",
                      description: `Failed to switch networks: ${errorMsg}`,
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
                <HStack spacing={isInMiniApp ? 2 : 3} flex="1" minW="0">
                  <Icon
                    as={method.icon as any}
                    boxSize={isInMiniApp ? 4 : 5}
                    flexShrink={0}
                  />
                  <VStack align="start" spacing={0} minW="0" flex="1">
                    <Text
                      fontWeight="semibold"
                      fontSize={isInMiniApp ? "xs" : "sm"}
                      color={colors.text.primary}
                      noOfLines={1}
                    >
                      {method.name}
                    </Text>
                    {!isInMiniApp && (
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
      {isInMiniApp && (
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