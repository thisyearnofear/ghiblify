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
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from 'wagmi';

const API_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "https://ghiblify.onrender.com";

export default function Account() {
  const [purchases, setPurchases] = useState([]);
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

    fetchPurchaseHistory();
  }, [isConnected, address, router]);

  const fetchPurchaseHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stripe/purchase-history?address=${address}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch purchase history");
      }

      const data = await response.json();
      setPurchases(data.purchases);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load purchase history",
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
      const response = await fetch(`${API_URL}/api/stripe/create-portal-session?address=${address}`, {
        method: "POST",
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });

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

  return (
    <Container maxW="container.md" py={10}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="lg" mb={2}>Account Management</Heading>
          <Text color="gray.600">Manage your credits and view purchase history</Text>
        </Box>

        <Box>
          <Button colorScheme="blue" onClick={openCustomerPortal} mb={8}>
            Manage Payment Methods
          </Button>
        </Box>

        <Box>
          <Heading size="md" mb={4}>Purchase History</Heading>
          {loading ? (
            <Text>Loading...</Text>
          ) : (
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Package</Th>
                  <Th>Credits</Th>
                  <Th>Amount</Th>
                </Tr>
              </Thead>
              <Tbody>
                {purchases.map((purchase) => (
                  <Tr key={purchase.id}>
                    <Td>{new Date(purchase.created).toLocaleDateString()}</Td>
                    <Td>{purchase.package}</Td>
                    <Td>{purchase.credits}</Td>
                    <Td>${(purchase.amount / 100).toFixed(2)}</Td>
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
