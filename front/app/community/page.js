"use client";

import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from "@chakra-ui/react";
import { useAccount } from "wagmi";
import dynamic from "next/dynamic";

// MODULAR: Dynamic imports for community features (opt-in discovery)
const Leaderboard = dynamic(() => import("../components/Leaderboard"), {
  loading: () => (
    <Box p={4} textAlign="center">
      <Text>Loading community leaderboard...</Text>
    </Box>
  ),
});

const PersonalityProfile = dynamic(
  () => import("../components/PersonalityProfile"),
  {
    loading: () => (
      <Box p={4} textAlign="center">
        <Text>Loading personality insights...</Text>
      </Box>
    ),
  }
);

// PERFORMANT: Dedicated community page for optional social discovery
export default function CommunityPage() {
  const { address } = useAccount();

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Heading size="xl" mb={4}>
            🎨 Ghiblify Creative Community
          </Heading>
          <Text color="gray.600" fontSize="lg">
            Discover fellow artists, share your creations, and explore the community
          </Text>
        </Box>

        <Tabs variant="enclosed" colorScheme="teal">
          <TabList>
            <Tab>Community Leaderboard</Tab>
            <Tab>Your Digital Personality</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <Box>
                <Heading size="lg" mb={4}>
                  Top Creators
                </Heading>
                <Text color="gray.600" mb={6}>
                  See the most active artists in the Ghiblify ecosystem
                </Text>
                <Leaderboard />
              </Box>
            </TabPanel>

            <TabPanel>
              <Box>
                <Heading size="lg" mb={4}>
                  Your Creative Profile
                </Heading>
                <Text color="gray.600" mb={6}>
                  Insights into your on-chain personality and creative interests
                </Text>
                {address ? (
                  <PersonalityProfile address={address} />
                ) : (
                  <Text textAlign="center" color="gray.500" p={8}>
                    Connect your wallet to see personality insights
                  </Text>
                )}
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>

        <Box textAlign="center" mt={8} p={6} bg="gray.50" borderRadius="md">
          <Text fontSize="sm" color="gray.600">
            💡 <strong>Pro tip:</strong> The more you create with Ghiblify, the richer your 
            community profile becomes. Keep transforming photos to unlock deeper insights!
          </Text>
        </Box>
      </VStack>
    </Container>
  );
}