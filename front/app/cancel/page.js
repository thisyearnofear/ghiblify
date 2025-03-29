'use client';

import { Container, Heading, Text, Button, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';

export default function CancelPage() {
  const router = useRouter();

  return (
    <Container maxW="container.md" py={10}>
      <VStack spacing={6} align="center">
        <Heading>Payment Cancelled</Heading>
        <Text>Your payment was cancelled and you have not been charged.</Text>
        <Button
          colorScheme="blue"
          onClick={() => router.push('/')}
        >
          Return to Home
        </Button>
      </VStack>
    </Container>
  );
}
