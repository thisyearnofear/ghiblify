import { Box, Text, Button, HStack, useToast, Tooltip } from "@chakra-ui/react";
import { useState, useEffect } from "react";

const API_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "https://ghiblify.onrender.com";

export default function CreditsDisplay({ onCreditsUpdate }) {
  const [credits, setCredits] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  const checkCredits = async () => {
    const token = localStorage.getItem("ghiblify_token");
    if (!token) {
      setCredits(0);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/credits/check`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCredits(data.credits);
      } else {
        // If token is invalid or expired, clear it
        if (response.status === 401) {
          localStorage.removeItem("ghiblify_token");
          setCredits(0);
        }
      }
    } catch (error) {
      console.error("Error checking credits:", error);
      toast({
        title: "Error",
        description: "Failed to check credits balance",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkCredits();
  }, []);

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
