"use client";

import { Box, Text, Button, HStack, useToast, Tooltip } from "@chakra-ui/react";
import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL) {
  console.error(
    "[Credits] NEXT_PUBLIC_API_URL environment variable is not set"
  );
}

// Separate API function for better organization
const fetchCredits = async (address) => {
  const response = await fetch(
    `${API_URL}/api/web3/credits/check?address=${address}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.credits || 0;
};

export default function CreditsDisplay({ onCreditsUpdate, forceRefresh }) {
  const [credits, setCredits] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [shouldShowBuyButton, setShouldShowBuyButton] = useState(false);
  const toast = useToast();
  const { address, isConnected } = useAccount();

  const checkCredits = useCallback(async () => {
    if (!isConnected || !address) {
      setCredits(0);
      return;
    }

    setIsLoading(true);
    try {
      const newCredits = await fetchCredits(address);
      setCredits(newCredits);
      setShouldShowBuyButton(newCredits === 0);
      if (onCreditsUpdate) onCreditsUpdate(newCredits);
    } catch (error) {
      console.error("Error checking credits:", error);
      if (error.message.includes("401")) {
        localStorage.removeItem("ghiblify_token");
        setCredits(0);
        setShouldShowBuyButton(true);
        if (onCreditsUpdate) onCreditsUpdate(0);
      }
      toast({
        title: "Error checking credits",
        description: "Please try again later",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, onCreditsUpdate, toast]);

  // Handle hydration and initial load
  useEffect(() => {
    setIsMounted(true);
    if (address && isConnected) {
      checkCredits();
    }
  }, [address, isConnected, checkCredits]);

  // Handle force refresh
  useEffect(() => {
    if (isMounted && forceRefresh) {
      checkCredits();
    }
  }, [isMounted, forceRefresh, checkCredits]);

  // Don't render anything during SSR or before hydration
  if (typeof window === "undefined" || !isMounted) {
    return (
      <Box>
        <HStack spacing={4} align="center">
          <Text fontSize="sm" color="gray.600">
            Credits: ...
          </Text>
        </HStack>
      </Box>
    );
  }

  return (
    <Box>
      <HStack spacing={4} align="center">
        <Tooltip label="Credits remaining for Ghibli transformations">
          <Text fontSize="sm" color="gray.600">
            Credits: {isLoading ? "..." : credits}
          </Text>
        </Tooltip>
        {shouldShowBuyButton && (
          <Button
            size="sm"
            colorScheme="blue"
            variant="outline"
            onClick={() =>
              document
                .getElementById("pricing")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Buy Credits
          </Button>
        )}
      </HStack>
    </Box>
  );
}
