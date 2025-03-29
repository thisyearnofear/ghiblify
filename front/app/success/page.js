"use client";

import { Box, Container, Heading, Text, Button } from "@chakra-ui/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from 'wagmi';

export default function Success() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  useEffect(() => {
    const fetchSessionToken = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');

      if (sessionId && isConnected && address) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/stripe/session/${sessionId}?address=${address}`);
          if (!response.ok) throw new Error('Failed to process payment');

          // Clear URL params
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error('Error processing payment:', error);
        }
      }
    };

    fetchSessionToken();

    const timer = setTimeout(() => {
      router.push("/"); // Redirect to home after 5 seconds
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <Container centerContent py={20}>
      <Box textAlign="center" py={10} px={6}>
        <Heading
          display="inline-block"
          as="h2"
          size="2xl"
          bgGradient="linear(to-r, teal.400, teal.600)"
          backgroundClip="text"
        >
          Thank You!
        </Heading>
        <Text fontSize="18px" mt={3} mb={2}>
          Your purchase was successful.
        </Text>
        <Text color={"gray.500"} mb={6}>
          Your credits have been added to your account.
        </Text>

        <Button
          colorScheme="teal"
          bgGradient="linear(to-r, teal.400, teal.500, teal.600)"
          color="white"
          variant="solid"
          onClick={() => router.push("/")}
        >
          Go Back Home
        </Button>
      </Box>
    </Container>
  );
}
