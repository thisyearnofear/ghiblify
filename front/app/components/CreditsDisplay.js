"use client";

import { Box, Text, Button, HStack, useToast, Tooltip } from "@chakra-ui/react";
import { useState, useEffect, useCallback } from "react";
import { useUnifiedWallet } from "../lib/hooks/useUnifiedWallet";

/**
 * Unified Credits Display Component
 * Uses the unified wallet system for consistent display
 */
export default function CreditsDisplay({ onCreditsUpdate, forceRefresh }) {
  const [isMounted, setIsMounted] = useState(false);
  const toast = useToast();

  // Use unified wallet system
  const { isConnected, credits, isLoading, refreshCredits, address, provider } =
    useUnifiedWallet();

  // Handle credits updates
  useEffect(() => {
    if (onCreditsUpdate && typeof onCreditsUpdate === "function") {
      onCreditsUpdate(credits);
    }
  }, [credits, onCreditsUpdate]);

  // Handle component mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle force refresh
  useEffect(() => {
    if (forceRefresh && isConnected) {
      refreshCredits();
    }
  }, [forceRefresh, isConnected, refreshCredits]);

  const handleRefresh = useCallback(async () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to check credits.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    await refreshCredits();
    toast({
      title: "Credits Refreshed",
      description: `Current balance: ${credits} credits`,
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  }, [isConnected, refreshCredits, credits, toast]);

  const scrollToPricing = () => {
    const pricingElement = document.getElementById("pricing");
    if (pricingElement) {
      pricingElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Don't render until mounted (prevents hydration issues)
  if (!isMounted) {
    return null;
  }

  // Not connected state
  if (!isConnected) {
    return (
      <Box
        p={4}
        borderWidth={1}
        borderRadius="md"
        borderColor="gray.200"
        bg="gray.50"
        textAlign="center"
      >
        <Text fontSize="sm" color="gray.600">
          Connect your wallet to view credits
        </Text>
      </Box>
    );
  }

  // Connected state
  return (
    <Box
      p={4}
      borderWidth={1}
      borderRadius="md"
      borderColor={credits > 0 ? "green.200" : "orange.200"}
      bg={credits > 0 ? "green.50" : "orange.50"}
    >
      <HStack justify="space-between" align="center">
        <Box>
          <HStack spacing={2}>
            <Text fontSize="lg" fontWeight="bold" color="gray.800">
              Credits: {isLoading ? "..." : credits}
            </Text>
            {provider && (
              <Tooltip label={`Connected via ${provider}`}>
                <Text fontSize="xs" color="gray.500" textTransform="uppercase">
                  {provider}
                </Text>
              </Tooltip>
            )}
          </HStack>
          {address && (
            <Text fontSize="xs" color="gray.500" fontFamily="mono">
              {address.slice(0, 6)}...{address.slice(-4)}
            </Text>
          )}
        </Box>

        <HStack spacing={2}>
          <Tooltip label="Refresh credits balance">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              isLoading={isLoading}
              loadingText="Refreshing"
            >
              🔄
            </Button>
          </Tooltip>

          {credits === 0 && (
            <Button size="sm" colorScheme="orange" onClick={scrollToPricing}>
              Buy Credits
            </Button>
          )}
        </HStack>
      </HStack>

      {credits > 0 && (
        <Text fontSize="xs" color="green.600" mt={2}>
          ✅ Ready to Ghiblify! You have {credits} credit
          {credits !== 1 ? "s" : ""} available.
        </Text>
      )}

      {credits === 0 && (
        <Text fontSize="xs" color="orange.600" mt={2}>
          ⚠️ No credits available. Purchase credits below to start creating!
        </Text>
      )}
    </Box>
  );
}
