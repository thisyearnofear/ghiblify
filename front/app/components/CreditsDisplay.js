'use client';

import { Box, Text, Button, HStack, useToast, Tooltip } from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useAccount } from 'wagmi';

const API_URL = "https://ghiblify.onrender.com";

export default function CreditsDisplay({ onCreditsUpdate, forceRefresh }) {
  const [credits, setCredits] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const toast = useToast();
  const { address, isConnected } = useAccount();

  // Handle hydration
  useEffect(() => {
    setMounted(true);
    // Initial credits check
    if (isConnected && address) {
      checkCredits();
    }
  }, [isConnected, address]);

  // Handle credit updates
  useEffect(() => {
    if (mounted && forceRefresh) {
      checkCredits();
    }
  }, [forceRefresh, mounted]);

  const checkCredits = async (retryCount = 0) => {
    if (!isConnected || !address) {
      setCredits(0);
      return;
    }

    setIsLoading(true);
    try {
      console.log(`[Credits] Checking for ${address}...`);
      const response = await fetch(`${API_URL}/api/web3/credits/check?address=${address}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const newCredits = data.credits || 0;
        console.log(`Credits received: ${newCredits}`);
        setCredits(newCredits);
        if (onCreditsUpdate) onCreditsUpdate(newCredits);
      } else {
        console.error(`Error response: ${response.status}`);
        // If unauthorized, clear token and retry
        if (response.status === 401) {
          localStorage.removeItem("ghiblify_token");
          setCredits(0);
          if (onCreditsUpdate) onCreditsUpdate(0);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error checking credits:", error);
      
      // Retry up to 3 times with exponential backoff
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`Retrying in ${delay}ms...`);
        setTimeout(() => checkCredits(retryCount + 1), delay);
        return;
      }
      
      toast({
        title: "Error checking credits",
        description: "Please refresh the page or try again later",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check credits when component mounts or when address changes
  useEffect(() => {
    if (isConnected && address) {
      checkCredits();
    }
  }, [isConnected, address, forceRefresh]);

  const handleBuyClick = () => {
    // Scroll to pricing section
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Box>
      <HStack spacing={4} align="center">
        <Tooltip label="Credits remaining for Ghibli transformations">
          <Text fontSize="sm" color="gray.600">
            Credits: {isLoading ? "..." : credits}
          </Text>
        </Tooltip>
        {credits === 0 && (
          <Button
            size="sm"
            colorScheme="blue"
            variant="outline"
            onClick={handleBuyClick}
          >
            Buy Credits
          </Button>
        )}
      </HStack>
    </Box>
  );
}
