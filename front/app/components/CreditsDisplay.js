"use client";

import { Box, Text, Button, HStack, useToast, Tooltip } from "@chakra-ui/react";
import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ghiblify.onrender.com";
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
      credentials: "include",  // Include cookies for cross-origin requests
      mode: "cors",          // Explicitly set CORS mode
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Origin": typeof window !== "undefined" ? window.location.origin : "https://ghiblify-it.vercel.app",
      },
    }
  );

  if (!response.ok) {
    // Handle specific backend unavailability cases
    if (response.status === 503 || response.status === 504) {
      throw new Error('Backend service is starting up. Please wait a moment and try again.');
    }
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
  
  // Check for Base authentication
  const [baseAuth, setBaseAuth] = useState(null);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedAuth = localStorage.getItem("ghiblify_auth");
      if (storedAuth) {
        try {
          const authData = JSON.parse(storedAuth);
          if (authData.authenticated) {
            setBaseAuth(authData);
          }
        } catch (error) {
          console.error("Error parsing stored auth:", error);
          setBaseAuth(null);
        }
      }
    }
  }, []);
  
  // Determine if user is connected (either via Wagmi or Base auth)
  const userConnected = isConnected || (baseAuth && baseAuth.authenticated);
  const userAddress = address || (baseAuth && baseAuth.address);

  const checkCredits = useCallback(async () => {
    if (!userConnected || !userAddress) {
      setCredits(0);
      return;
    }

    setIsLoading(true);
    try {
      const newCredits = await fetchCredits(userAddress);
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
  }, [userAddress, userConnected, onCreditsUpdate, toast]);

  // Handle hydration and initial load
  useEffect(() => {
    setIsMounted(true);
    if (userAddress && userConnected) {
      checkCredits();
    }
  }, [userAddress, userConnected, checkCredits]);

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
