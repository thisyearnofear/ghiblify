'use client';

import { Box, Text, Button, HStack, useToast, Tooltip } from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useAccount } from 'wagmi';

const API_URL = "https://ghiblify.onrender.com";

export default function CreditsDisplay({ onCreditsUpdate, forceRefresh }) {
  const [credits, setCredits] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const toast = useToast();
  const { address, isConnected } = useAccount();

  // Handle hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const checkCredits = async () => {
    if (!isConnected || !address) {
      setCredits(0);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/web3/credits/check?address=${address}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCredits(data.credits || 0);
        if (onCreditsUpdate) onCreditsUpdate(data.credits || 0);
      } else {
        // If token is invalid or expired, clear it
        if (response.status === 401) {
          localStorage.removeItem("ghiblify_token");
          setCredits(0);
          if (onCreditsUpdate) onCreditsUpdate(0);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error checking credits:", error);
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
