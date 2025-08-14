"use client";

import { Box, Text, Button, HStack, useToast, Tooltip } from "@chakra-ui/react";
import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";

/**
 * Simplified Credits Display Component
 * Temporarily using old approach to fix build issues
 */
export default function CreditsDisplay({ onCreditsUpdate, forceRefresh }) {
  const [isMounted, setIsMounted] = useState(false);
  const [credits, setCredits] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const { address, isConnected } = useAccount();

  // Simple credit fetching (fallback approach)
  const fetchCredits = useCallback(async () => {
    if (!address) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `https://api.thisyearnofear.com/api/wallet/credits/${address}`
      );
      if (response.ok) {
        const data = await response.json();
        setCredits(data.credits || 0);
        if (onCreditsUpdate) onCreditsUpdate(data.credits || 0);
      }
    } catch (error) {
      console.warn("Failed to fetch credits:", error);
    } finally {
      setIsLoading(false);
    }
  }, [address, onCreditsUpdate]);

  // Handle component mounting and initial fetch
  useEffect(() => {
    setIsMounted(true);
    if (isConnected && address) {
      fetchCredits();
    }
  }, [isConnected, address, fetchCredits]);

  // Handle force refresh
  useEffect(() => {
    if (forceRefresh && isConnected) {
      fetchCredits();
    }
  }, [forceRefresh, isConnected, fetchCredits]);

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

    await fetchCredits();
    toast({
      title: "Credits Refreshed",
      description: `Current balance: ${credits} credits`,
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  }, [isConnected, fetchCredits, credits, toast]);

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
            <Tooltip label="Connected via RainbowKit">
              <Text fontSize="xs" color="gray.500" textTransform="uppercase">
                RainbowKit
              </Text>
            </Tooltip>
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
