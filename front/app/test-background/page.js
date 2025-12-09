"use client";

import { Box, Heading, Text, Button, VStack, Container } from "@chakra-ui/react";
import { useState } from "react";

export default function TestBackgroundPage() {
  const [isEnabled, setIsEnabled] = useState(true);

  return (
    <Container maxW="container.md" py={10}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading size="2xl" mb={4}>
            Ghibli Background Test
          </Heading>
          <Text fontSize="lg" color="gray.600">
            Testing the new Studio Ghibli-inspired animated background
          </Text>
        </Box>

        <Box p={6} bg="whiteAlpha.800" borderRadius="lg" boxShadow="lg">
          <VStack spacing={4}>
            <Text>
              This page tests the new animated background that enhances the Studio Ghibli experience
              without sacrificing performance.
            </Text>
            
            <Button 
              onClick={() => setIsEnabled(!isEnabled)}
              colorScheme="brand"
              variant="magical"
            >
              {isEnabled ? "Disable" : "Enable"} Background
            </Button>
            
            <Text fontSize="sm" color="gray.500">
              The background automatically respects user preferences for reduced motion
              and will pause when the tab is not visible to conserve resources.
            </Text>
          </VStack>
        </Box>

        <Box p={6} bg="whiteAlpha.800" borderRadius="lg" boxShadow="lg">
          <Heading size="md" mb={4}>
            Features
          </Heading>
          <VStack align="start" spacing={2}>
            <Text>• Lightweight particle system with Ghibli color palette</Text>
            <Text>• Automatic performance adaptation for mobile devices</Text>
            <Text>• Respects user preferences for reduced motion</Text>
            <Text>• Pauses animation when tab is not visible</Text>
            <Text>• Semi-transparent UI elements for visual harmony</Text>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
}