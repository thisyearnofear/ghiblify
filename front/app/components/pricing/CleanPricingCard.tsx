/**
 * Clean, Modular Pricing Card Component
 * 
 * CLEAN: Single responsibility, well-typed
 * DRY: Uses centralized theme hook, no color duplication
 * MODULAR: Easily reusable, configurable via props
 * ORGANIZED: Clear prop interfaces, logical structure
 * PERFORMANT: Minimal re-renders, optimized theme usage
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Button,
  List,
  ListItem,
  ListIcon,
} from '@chakra-ui/react';
import { FiCheck, FiCreditCard } from 'react-icons/fi';
import { useGhibliTheme } from '../../hooks/useGhibliTheme';

// Clean, well-defined interfaces
interface PricingTier {
  id: string;
  name: string;
  price: string;
  credits: number;
  description: string;
  features: string[];
  isPopular?: boolean;
  discount?: number;
}

interface PricingCardProps {
  tier: PricingTier;
  onSelect: (tier: PricingTier) => void;
  isLoading?: boolean;
  isSelected?: boolean;
}

// Modular, reusable component with single responsibility
export const PricingCard: React.FC<PricingCardProps> = ({
  tier,
  onSelect,
  isLoading = false,
  isSelected = false,
}) => {
  // DRY: Use centralized theme instead of duplicating colors
  const { colors, patterns } = useGhibliTheme();

  return (
    <Box
      {...patterns.card} // Reusable pattern
      p={6}
      position="relative"
      width={{ base: 'full', md: '320px' }}
      // Conditional styling for selection state
      borderColor={isSelected ? colors.border.accent : colors.border.primary}
      transform={isSelected ? 'translateY(-4px)' : 'none'}
    >
      {/* Popular badge - conditional rendering */}
      {tier.isPopular && (
        <Badge
          colorScheme="blue"
          position="absolute"
          top="-2"
          right="-2"
          borderRadius="full"
          px={3}
          py={1}
        >
          Most Popular
        </Badge>
      )}

      <VStack spacing={4} align="stretch">
        {/* Header Section */}
        <VStack spacing={2} align="start">
          <Text fontSize="2xl" fontWeight="bold" color={colors.text.primary}>
            {tier.name}
          </Text>
          <HStack>
            <Text fontSize="4xl" fontWeight="bold" color={colors.text.primary}>
              {tier.price}
            </Text>
            <Text color={colors.text.secondary}>USD</Text>
          </HStack>
          <Text color={colors.text.secondary} fontSize="sm">
            {tier.description}
          </Text>
        </VStack>

        {/* Features List - Clean, semantic */}
        <List spacing={3}>
          {tier.features.map((feature, index) => (
            <ListItem key={index}>
              <HStack>
                <ListIcon as={FiCheck as any} color="green.500" />
                <Text fontSize="sm" color={colors.text.primary}>
                  {feature}
                </Text>
              </HStack>
            </ListItem>
          ))}
        </List>

        {/* Action Button */}
        <Button
          size="lg"
          colorScheme="purple"
          leftIcon={<Icon as={FiCreditCard as any} />}
          isLoading={isLoading}
          loadingText="Processing..."
          onClick={() => onSelect(tier)}
          mt={4}
        >
          Choose Plan
        </Button>
      </VStack>
    </Box>
  );
};

// Example usage with clean data structure
export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$0.50',
    credits: 1,
    description: 'Try it out',
    features: [
      '1 Ghibli transformation',
      'Valid for 30 days',
      'Both styles available',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$4.99',
    credits: 10,
    description: 'Most popular',
    features: [
      '10 Ghibli transformations',
      'Valid for 30 days',
      'Both styles available',
      'Save $1 vs single price',
    ],
    isPopular: true,
  },
  // ... other tiers
];
