'use client';

// Corrected implementation using proper Base Account SDK
import React from 'react';
import { Button } from '@chakra-ui/react';
import { Box, Alert, AlertIcon, AlertDescription } from '@chakra-ui/react';
import { useBaseAccountAuth } from '../lib/hooks/useBaseAccountAuth';

export default function SignInWithBase({ onSuccess, onError }) {
  const { 
    user, 
    isAuthenticated,
    isLoading, 
    error, 
    authenticate, 
    signOut,
    clearError 
  } = useBaseAccountAuth();

  console.log('[SignIn Component] Render state:', { user, isAuthenticated, isLoading });

  const handleSignIn = async () => {
    try {
      clearError();
      const authenticatedUser = await authenticate();
      
      // Call success callback after authentication
      if (authenticatedUser && onSuccess) {
        onSuccess(authenticatedUser);
      }
    } catch (err) {
      // Error is already handled by the hook, but call callback if provided
      if (onError) {
        onError(err instanceof Error ? err : new Error('Authentication failed'));
      }
    }
  };

  // Show authenticated state if user is logged in
  if (isAuthenticated && user) {
    return (
      <Box>
        <Alert status="success" mb={4} borderRadius="md">
          <AlertIcon />
          <AlertDescription>
            Connected as {user.address.slice(0, 6)}...{user.address.slice(-4)} | Credits: {user.credits}
          </AlertDescription>
        </Alert>
        <Button
          onClick={signOut}
          colorScheme="red"
          variant="outline"
          size="lg"
          width="full"
        >
          Sign Out
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Use a custom button since SignInWithBaseButton might not be available */}
      <Button
        onClick={handleSignIn}
        isLoading={isLoading}
        loadingText="Signing in..."
        colorScheme="blue"
        size="lg"
        width="full"
        leftIcon={
          <Box
            as="span"
            w="20px"
            h="20px"
            borderRadius="full"
            bg="blue.500"
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="white"
            fontSize="xs"
            fontWeight="bold"
          >
            B
          </Box>
        }
      >
        Sign in with Base 🔵
      </Button>
    </Box>
  );
}
