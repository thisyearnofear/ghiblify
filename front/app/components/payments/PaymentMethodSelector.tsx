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
  useColorModeValue,
  Tooltip,
} from "@chakra-ui/react";
import { 
  FiCreditCard, 
  FiDollarSign, 
  FiZap,
  FiInfo
} from "react-icons/fi";
import { useState } from "react";
import { useUnifiedWallet } from "../../lib/hooks/useUnifiedWallet";
import { useFarcaster } from "../FarcasterFrameProvider";
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
  isProcessing = false
}: PaymentMethodSelectorProps) {
  const { user, provider, isConnected } = useUnifiedWallet();
  const { isInFrame } = useFarcaster();
  
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const bgColor = useColorModeValue("white", "gray.800");
  const hoverBg = useColorModeValue("gray.50", "gray.700");

  // Determine available payment methods based on context
  const getAvailablePaymentMethods = () => {
    const methods = [];

    // $GHIBLIFY Token (only show on Base network in Farcaster)
    if (ghiblifyTokenPayments.isAvailable() && 
        provider === 'base' && 
        (!isInFrame || provider === 'base')) {
      methods.push({
        id: 'ghiblifyToken',
        name: 'Pay with $GHIBLIFY',
        icon: FiZap,
        colorScheme: 'green',
        discount: 50,
        badge: '50% OFF',
        description: 'Support the project & save big',
        priority: 1,
        component: GhiblifyTokenButton,
      });
    }

    // Base Pay (when authenticated)
    if (baseAccountPayments.isAvailable() && provider === 'base') {
      methods.push({
        id: 'basePay',
        name: 'Base Pay',
        icon: FiDollarSign,
        colorScheme: 'blue',
        discount: 30,
        badge: '30% OFF',
        description: 'One-tap USDC payments',
        priority: 2,
      });
    }

    // Celo (when on Celo/RainbowKit)
    if (provider === 'rainbowkit' || provider === 'farcaster') {
      methods.push({
        id: 'celo',
        name: 'Pay with Stablecoin',
        icon: FiDollarSign,
        colorScheme: 'yellow',
        discount: 30,
        badge: '30% OFF',
        description: 'cUSD payments on Celo',
        priority: 3,
      });
    }

    // Stripe (always available as fallback)
    methods.push({
      id: 'stripe',
      name: 'Pay with Card',
      icon: FiCreditCard,
      colorScheme: 'purple',
      discount: 0,
      badge: null,
      description: 'Credit/debit card',
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
      <Box
        p={4}
        borderRadius="xl"
        border="1px solid"
        borderColor={borderColor}
        bg={bgColor}
        textAlign="center"
      >
        <Text color="gray.500" fontSize="sm">
          Connect your wallet to see payment options
        </Text>
      </Box>
    );
  }

  return (
    <VStack spacing={3} align="stretch">
      <HStack justify="space-between" align="center">
        <Text fontSize="md" fontWeight="semibold">
          Choose Payment Method
        </Text>
        {isInFrame && (
          <Tooltip label="Optimized for Farcaster mini app">
            <Icon as={FiInfo as any} color="blue.400" boxSize={4} />
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
                borderColor={isSelected ? "green.400" : "transparent"}
                bg={isSelected ? "green.50" : "transparent"}
                _dark={{
                  bg: isSelected ? "green.900" : "transparent",
                }}
                transition="all 0.2s ease"
              >
                <method.component
                  tier={tier}
                  onPayment={() => onMethodSelect(method.id)}
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
              p={4}
              onClick={() => onMethodSelect(method.id)}
              isLoading={isProcessing && isSelected}
              loadingText="Processing..."
              _hover={{
                bg: isSelected ? undefined : hoverBg,
                transform: "translateY(-1px)",
                boxShadow: "md",
              }}
              transition="all 0.2s ease"
            >
              <HStack w="full" justify="space-between">
                <HStack spacing={3}>
                  <Icon as={method.icon as any} boxSize={5} />
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="semibold" fontSize="sm">
                      {method.name}
                    </Text>
                    <Text fontSize="xs" opacity={0.8}>
                      {method.description}
                    </Text>
                  </VStack>
                </HStack>

                <VStack align="end" spacing={1}>
                  <HStack spacing={2}>
                    <Text fontWeight="bold" fontSize="md">
                      {pricing.formattedDiscounted}
                    </Text>
                    {method.badge && (
                      <Badge 
                        colorScheme="red" 
                        variant="solid"
                        fontSize="2xs"
                      >
                        {method.badge}
                      </Badge>
                    )}
                  </HStack>
                  
                  {pricing.formattedSavings && (
                    <Text fontSize="xs" color="green.500" fontWeight="medium">
                      {pricing.formattedSavings}
                    </Text>
                  )}
                  
                  {pricing.savings > 0 && (
                    <Text 
                      fontSize="xs" 
                      textDecoration="line-through"
                      opacity={0.6}
                    >
                      {pricing.formattedOriginal}
                    </Text>
                  )}
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
          <Box p={3} bg="blue.50" _dark={{ bg: "blue.900" }} borderRadius="md">
            <Text fontSize="xs" color="blue.600" _dark={{ color: "blue.300" }}>
              💡 <strong>Tip:</strong> $GHIBLIFY tokens offer the biggest savings and help grow the project!
            </Text>
          </Box>
        </>
      )}
    </VStack>
  );
}