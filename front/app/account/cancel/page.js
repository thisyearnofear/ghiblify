"use client";

import {
  Box,
  Container,
  Heading,
  Text,
  UnorderedList,
  ListItem,
  Button,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";

export default function CancellationPolicy() {
  const router = useRouter();

  return (
    <Container maxW="container.md" py={10}>
      <Button onClick={() => router.back()} mb={6} variant="ghost">
        ← Back
      </Button>

      <Heading as="h1" mb={6}>
        Cancellation & Refund Policy
      </Heading>

      <Box mb={8}>
        <Heading as="h2" size="md" mb={4}>
          Credit Packages
        </Heading>
        <Text mb={4}>
          Our credit packages are one-time purchases that provide you with a specific
          number of credits to use for image transformations. Please note:
        </Text>
        <UnorderedList spacing={2} mb={6}>
          <ListItem>
            Credits are valid for 30 days from the date of purchase
          </ListItem>
          <ListItem>
            Unused credits expire after 30 days and are non-refundable
          </ListItem>
          <ListItem>
            Credits cannot be transferred between accounts
          </ListItem>
        </UnorderedList>
      </Box>

      <Box mb={8}>
        <Heading as="h2" size="md" mb={4}>
          Refund Eligibility
        </Heading>
        <Text mb={4}>
          We may provide refunds in the following circumstances:
        </Text>
        <UnorderedList spacing={2} mb={6}>
          <ListItem>
            Technical issues prevented you from using the service within 24 hours of purchase
          </ListItem>
          <ListItem>
            Duplicate charges or billing errors
          </ListItem>
          <ListItem>
            Credits were not properly added to your account after purchase
          </ListItem>
        </UnorderedList>
      </Box>

      <Box>
        <Heading as="h2" size="md" mb={4}>
          Contact Support
        </Heading>
        <Text mb={4}>
          If you believe you are eligible for a refund or have any questions about
          your purchase, please contact our support team at support@ghiblify.com
        </Text>
      </Box>
    </Container>
  );
}
