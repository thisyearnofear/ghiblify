"use client";

import { Box, Container, Heading, Text, Button } from "@chakra-ui/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Success() {
  const router = useRouter();

  useEffect(() => {
    // The session_id handling is already done in the Pricing component
    // This is just a visual confirmation page
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
