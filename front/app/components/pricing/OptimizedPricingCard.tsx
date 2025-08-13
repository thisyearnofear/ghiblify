// Optimized pricing card component using modular Base Account services
'use client';

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Divider,
  List,
  ListItem,
  ListIcon,
  useColorModeValue,
} from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';
import PaymentButton from '../base-account/PaymentButton';
import { useBaseAccountAuth } from '../../lib/hooks/useBaseAccountAuth';
import { PaymentCompletionResult } from '../../lib/services/base-account-payments';

interface PricingTier {
  name: string;
  credits: number;
  price: number;
  originalPrice?: number;
  features: string[];
  popular?: boolean;
  basePayEnabled?: boolean;
  stripeEnabled?: boolean;
}

interface OptimizedPricingCardProps {
  tier: PricingTier;
  onPurchaseComplete?: (result?: PaymentCompletionResult) => void;
  preferredMethod?: 'basePay' | 'stripe';
}

export default function OptimizedPricingCard({
  tier,
  onPurchaseComplete,
  preferredMethod = 'basePay'
}: OptimizedPricingCardProps) {
  const { isAuthenticated } = useBaseAccountAuth();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const popularBorderColor = useColorModeValue('blue.500', 'blue.300');

  const handlePaymentComplete = (result: PaymentCompletionResult) => {
    onPurchaseComplete?.(result);
  };

  const handleStripePayment = () => {
    // Fallback to original Stripe implementation
    // You can implement this using a separate service later
    console.log('Stripe payment for tier:', tier.name);
    onPurchaseComplete?.();
  };

  const savings = tier.originalPrice ? tier.originalPrice - tier.price : 0;
  const discountPercent = tier.originalPrice 
    ? Math.round((savings / tier.originalPrice) * 100) 
    : 0;

  return (
    <Box
      bg={bgColor}
      borderWidth="2px"
      borderColor={tier.popular ? popularBorderColor : borderColor}
      borderRadius="xl"
      p={6}
      position="relative"
      shadow={tier.popular ? 'lg' : 'md'}
      transform={tier.popular ? 'scale(1.05)' : 'none'}
      zIndex={tier.popular ? 1 : 0}
      w="full"
      maxW="320px"
    >
      {tier.popular && (
        <Badge
          position="absolute"
          top="-10px"
          left="50%"
          transform="translateX(-50%)"
          colorScheme="blue"
          px={3}
          py={1}
          borderRadius="full"
          fontSize="sm"
        >
          Most Popular
        </Badge>
      )}

      <VStack spacing={6} align="stretch">
        {/* Header */}
        <VStack spacing={2}>
          <Text fontSize="2xl" fontWeight="bold">
            {tier.name}
          </Text>
          <Text fontSize="lg" color="gray.600">
            {tier.credits} Credits
          </Text>
        </VStack>

        {/* Pricing */}
        <VStack spacing={1}>
          <HStack justify="center" align="baseline">
            <Text fontSize="4xl" fontWeight="bold">
              ${tier.price.toFixed(2)}
            </Text>
            {tier.originalPrice && tier.originalPrice > tier.price && (
              <VStack spacing={0} align="start">
                <Text as="s" color="gray.500" fontSize="lg">
                  ${tier.originalPrice.toFixed(2)}
                </Text>
                <Badge colorScheme="green" fontSize="xs">
                  Save ${savings.toFixed(2)} ({discountPercent}% OFF)
                </Badge>
              </VStack>
            )}
          </HStack>
          <Text fontSize="sm" color="gray.600">
            ${(tier.price / tier.credits).toFixed(3)} per credit
          </Text>
        </VStack>

        <Divider />

        {/* Features */}
        <List spacing={2}>
          {tier.features.map((feature, index) => (
            <ListItem key={index}>
              <ListIcon as={CheckIcon} color="green.500" />
              <Text as="span" fontSize="sm">
                {feature}
              </Text>
            </ListItem>
          ))}
        </List>

        <Divider />

        {/* Payment Buttons */}
        <VStack spacing={3}>
          {/* Base Pay Button (Preferred) */}
          {tier.basePayEnabled && (
            <PaymentButton
              tier={tier}
              onComplete={handlePaymentComplete}
              size="lg"
              variant="solid"
              colorScheme="blue"
            />
          )}

          {/* Stripe Fallback */}
          {tier.stripeEnabled && (preferredMethod !== 'basePay' || !isAuthenticated) && (
            <Button
              variant={tier.basePayEnabled ? 'outline' : 'solid'}
              colorScheme={tier.basePayEnabled ? 'gray' : 'blue'}
              size="lg"
              onClick={handleStripePayment}
              w="full"
            >
              Pay with Card
            </Button>
          )}

          {!tier.basePayEnabled && !tier.stripeEnabled && (
            <Button
              variant="outline"
              colorScheme="gray"
              size="lg"
              disabled
              w="full"
            >
              Coming Soon
            </Button>
          )}
        </VStack>

        {/* Authentication Hint */}
        {tier.basePayEnabled && !isAuthenticated && (
          <Text fontSize="xs" color="gray.500" textAlign="center">
            Sign in with Base Account for the best experience
          </Text>
        )}
      </VStack>
    </Box>
  );
}