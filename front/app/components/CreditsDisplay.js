"use client";

import { Box, Text, Button, HStack, useToast, Tooltip } from "@chakra-ui/react";
import { useState, useEffect, useCallback } from "react";
import { useUnifiedWallet } from "../lib/hooks/useUnifiedWallet";
import { useGhibliTheme } from "../hooks/useGhibliTheme";

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

  // Use theme system for dark mode support
  const { colors } = useGhibliTheme();

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
        borderColor={colors.border.primary}
        bg={colors.bg.secondary}
        textAlign="center"
      >
        <Text fontSize="sm" color={colors.text.secondary}>
          Connect your wallet to view credits
        </Text>
      </Box>
    );
  }

  // Connected state
  return (
    <Box
      p={3}
      borderWidth={1}
      borderRadius="lg"
      borderColor={credits > 0 ? colors.border.accent : colors.border.primary}
      bg={credits > 0 ? colors.interactive.hover : colors.bg.secondary}
      maxW="400px"
      mx="auto"
    >
      <HStack justify="space-between" align="center">
        <HStack spacing={3}>
          <Text fontSize="md" fontWeight="bold" color={colors.text.primary}>
            {isLoading ? "..." : credits} credits
          </Text>
          {credits === 0 && (
            <Button 
              size="xs" 
              colorScheme="blue" 
              onClick={scrollToPricing}
              borderRadius="full"
              px={3}
            >
              + Add
            </Button>
          )}
        </HStack>

        {credits > 0 && (
          <Tooltip label="Refresh credits balance">
            <Button
              size="xs"
              variant="ghost"
              onClick={handleRefresh}
              isLoading={isLoading}
              color={colors.text.secondary}
              p={1}
              minW="auto"
            >
              🔄
            </Button>
          </Tooltip>
        )}
      </HStack>

      {credits > 0 ? (
        <Text fontSize="xs" color={colors.text.accent} mt={1}>
          Ready to create ✨
        </Text>
      ) : (
        <Text fontSize="xs" color={colors.text.secondary} mt={1}>
          Add credits to start creating magical art
        </Text>
      )}
    </Box>
  );
}