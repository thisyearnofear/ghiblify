"use client";

import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  Link,
  Badge,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL) {
  console.error(
    "[Account] NEXT_PUBLIC_API_URL environment variable is not set"
  );
}

// Helper function to format date
const formatDate = (timestamp) => {
  if (typeof timestamp === "string") {
    // ISO string (CELO format)
    return new Date(timestamp).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  // Unix timestamp (Stripe format)
  return new Date(timestamp * 1000).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function Account() {
  const [stripePurchases, setStripePurchases] = useState([]);
  const [celoPurchases, setCeloPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const toast = useToast();
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (!isConnected || !address) {
      router.push("/");
      toast({
        title: "Please connect your wallet",
        description: "You need to connect your wallet to view your account",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    fetchAllPurchaseHistory();
  }, [isConnected, address, router]);

  const fetchAllPurchaseHistory = async () => {
    setLoading(true);
    try {
      // Fetch Stripe history
      const stripeResponse = await fetch(
        `${API_URL}/api/stripe/purchase-history`,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Web3-Address": address,
          },
        }
      );

      // Fetch CELO history
      console.log("[CELO] Fetching purchase history...");
      const celoResponse = await fetch(
        `${API_URL}/api/celo/purchase-history?address=${address}`,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (!stripeResponse.ok) {
        console.error(
          "[Stripe] Failed to fetch history:",
          await stripeResponse.text()
        );
      } else {
        const stripeData = await stripeResponse.json();
        console.log("[Stripe] Fetched history:", stripeData);
        setStripePurchases(
          stripeData.purchases.map((p) => ({
            ...p,
            method: "stripe",
            amount: p.amount / 100, // Convert cents to dollars
          }))
        );
      }

      if (!celoResponse.ok) {
        console.error(
          "[CELO] Failed to fetch history:",
          await celoResponse.text()
        );
      } else {
        const celoData = await celoResponse.json();
        console.log("[CELO] Fetched history:", celoData);
        setCeloPurchases(
          celoData.purchases.map((p) => ({
            ...p,
            method: "celo",
            amount: p.price, // CELO prices are already in dollars
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      toast({
        title: "Error",
        description: "Failed to load purchase history. Please try again later.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/stripe/create-portal-session`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Web3-Address": address,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open customer portal",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Combine and sort all purchases
  const allPurchases = [...stripePurchases, ...celoPurchases].sort((a, b) => {
    const dateA =
      typeof a.created === "number"
        ? a.created * 1000
        : new Date(a.timestamp).getTime();
    const dateB =
      typeof b.created === "number"
        ? b.created * 1000
        : new Date(b.timestamp).getTime();
    return dateB - dateA;
  });

  return (
    <Container maxW="container.md" py={10}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="lg" mb={2}>
            Account Management
          </Heading>
          <Text color="gray.600">
            Manage your credits and view purchase history
          </Text>
        </Box>

        <Box>
          <Button colorScheme="blue" onClick={openCustomerPortal} mb={8}>
            Manage Payment Methods
          </Button>
        </Box>

        <Box>
          <Heading size="md" mb={4}>
            Purchase History
          </Heading>
          {loading ? (
            <Text>Loading...</Text>
          ) : allPurchases.length === 0 ? (
            <Text>No purchase history available</Text>
          ) : (
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Package</Th>
                  <Th>Credits</Th>
                  <Th>Amount</Th>
                  <Th>Method</Th>
                </Tr>
              </Thead>
              <Tbody>
                {allPurchases.map((purchase) => (
                  <Tr key={purchase.id}>
                    <Td>
                      {formatDate(purchase.created || purchase.timestamp)}
                    </Td>
                    <Td>{purchase.package}</Td>
                    <Td>{purchase.credits}</Td>
                    <Td>${purchase.amount.toFixed(2)}</Td>
                    <Td>
                      <Badge
                        colorScheme={
                          purchase.method === "stripe" ? "blue" : "teal"
                        }
                      >
                        {purchase.method === "stripe" ? "Credit Card" : "CELO"}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>

        <Box>
          <Link href="/account/cancel" color="gray.500">
            Cancellation & Refund Policy
          </Link>
        </Box>
      </VStack>
    </Container>
  );
}
