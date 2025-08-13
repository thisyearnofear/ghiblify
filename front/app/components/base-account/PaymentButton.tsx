// Clean, optimized Base Pay payment component
'use client';

import React from 'react';
import { 
  Button, 
  Text, 
  VStack, 
  Alert, 
  AlertIcon, 
  AlertDescription,
  Progress,
  Badge,
  HStack,
  useToast
} from '@chakra-ui/react';
import { useBaseAccountAuth } from '../../lib/hooks/useBaseAccountAuth';
import { useBaseAccountPayments } from '../../lib/hooks/useBaseAccountPayments';
import { PaymentCompletionResult } from '../../lib/services/base-account-payments';

interface PaymentButtonProps {
  tier: {
    name: string;
    credits: number;
    price: number;
    originalPrice?: number;
  };
  onComplete?: (result: PaymentCompletionResult) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  variant?: 'solid' | 'outline' | 'ghost';
  colorScheme?: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusMessages = {
  idle: 'Pay with Base',
  initiating: 'Initializing payment...',
  pending: 'Waiting for payment...',
  processing: 'Processing payment...',
  polling: 'Confirming payment...',
  completed: 'Payment completed!',
  failed: 'Payment failed',
};

export default function PaymentButton({
  tier,
  onComplete,
  onError,
  disabled = false,
  variant = 'solid',
  colorScheme = 'blue',
  size = 'md'
}: PaymentButtonProps) {
  const { isAuthenticated } = useBaseAccountAuth();
  const { 
    status, 
    isProcessing, 
    error, 
    processPayment, 
    clearError,
    isAvailable 
  } = useBaseAccountPayments();
  
  const toast = useToast();

  const handlePayment = async () => {
    if (!isAuthenticated) {
      const errorMsg = 'Please sign in with Base Account to make payments';
      onError?.(errorMsg);
      toast({
        title: 'Authentication Required',
        description: errorMsg,
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      clearError();
      
      const result = await processPayment(tier.name, {
        onComplete: (result) => {
          toast({
            title: 'Payment Successful!',
            description: `${result.creditsAdded} credits added to your account`,
            status: 'success',
            duration: 5000,
            isClosable: true,
          });
          onComplete?.(result);
        }
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Payment failed';
      onError?.(errorMsg);
      toast({
        title: 'Payment Failed',
        description: errorMsg,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Show authentication required state
  if (!isAuthenticated) {
    return (
      <Button
        variant="outline"
        colorScheme="gray"
        size={size}
        disabled={true}
        w="full"
      >
        Sign in with Base Required
      </Button>
    );
  }

  // Show unavailable state
  if (!isAvailable) {
    return (
      <Button
        variant="outline"
        colorScheme="gray"
        size={size}
        disabled={true}
        w="full"
      >
        Base Pay Unavailable
      </Button>
    );
  }

  return (
    <VStack spacing={3} w="full">
      {error && (
        <Alert status="error" borderRadius="md" size="sm">
          <AlertIcon boxSize="16px" />
          <AlertDescription fontSize="sm">{error}</AlertDescription>
        </Alert>
      )}

      <Button
        variant={variant}
        colorScheme={colorScheme}
        size={size}
        onClick={handlePayment}
        disabled={disabled || isProcessing}
        isLoading={isProcessing}
        w="full"
        minH={size === 'lg' ? '56px' : size === 'md' ? '44px' : '36px'}
      >
        <VStack spacing={1}>
          <HStack spacing={2}>
            <Text>{statusMessages[status]}</Text>
            {tier.originalPrice && tier.originalPrice > tier.price && (
              <Badge colorScheme="green" fontSize="xs">
                {Math.round(((tier.originalPrice - tier.price) / tier.originalPrice) * 100)}% OFF
              </Badge>
            )}
          </HStack>
          
          {!isProcessing && (
            <HStack spacing={2} fontSize="xs">
              <Text>${tier.price.toFixed(2)}</Text>
              {tier.originalPrice && tier.originalPrice > tier.price && (
                <Text as="s" color="gray.500">
                  ${tier.originalPrice.toFixed(2)}
                </Text>
              )}
              <Text>• {tier.credits} credits</Text>
            </HStack>
          )}
        </VStack>
      </Button>

      {isProcessing && (
        <VStack spacing={2} w="full">
          <Progress size="sm" isIndeterminate colorScheme={colorScheme} w="full" />
          <Text fontSize="xs" color="gray.600" textAlign="center">
            {status === 'pending' && 'Complete payment in your wallet'}
            {status === 'processing' && 'Transaction being processed...'}
            {status === 'polling' && 'Confirming transaction on blockchain...'}
          </Text>
        </VStack>
      )}
    </VStack>
  );
}