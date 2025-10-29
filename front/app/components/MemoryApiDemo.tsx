/**
 * Memory API Demo Component
 *
 * Demonstrates cross-platform identity mapping and social graph analysis
 * capabilities for the Memory API Builder Rewards initiative.
 */

"use client";

import { useState, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Heading,
  Divider,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  Link,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { useWallet } from "../lib/hooks/useWallet";
import { useFarcaster } from "./FarcasterFrameProvider";
import { useMemoryApi } from "../lib/hooks/useMemoryApi";

export default function MemoryApiDemo() {
  const { address, isConnected } = useWallet();
  const { user: farcasterUser, isInFrame } = useFarcaster();
  const {
    getIdentityGraph,
    getSocialGraph,
    createUnifiedProfile,
    isLoading,
    error,
    isMemoryApiAvailable,
  } = useMemoryApi();

  const [identifier, setIdentifier] = useState("");
  const [identityGraph, setIdentityGraph] = useState<any>(null);
  const [socialGraph, setSocialGraph] = useState<any>(null);
  const [unifiedProfile, setUnifiedProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Set default identifier based on connected wallet or Farcaster user
  useEffect(() => {
    if (address) {
      setIdentifier(address);
    } else if (farcasterUser?.username) {
      setIdentifier(farcasterUser.username);
    }
  }, [address, farcasterUser]);

  const handleFetchIdentityGraph = async () => {
    if (!identifier) return;

    const graph = await getIdentityGraph(identifier);
    setIdentityGraph(graph);
  };

  const handleFetchSocialGraph = async () => {
    if (!identifier) return;

    const graph = await getSocialGraph(identifier);
    setSocialGraph(graph);
  };

  const handleCreateUnifiedProfile = async () => {
    if (!identifier) return;

    // Determine if identifier is address or username
    const isAddress = identifier.startsWith("0x") && identifier.length === 42;
    const farcasterUsername = !isAddress ? identifier : undefined;
    const walletAddress = isAddress ? identifier : address || undefined;

    if (walletAddress) {
      const profile = await createUnifiedProfile(
        walletAddress,
        farcasterUsername
      );
      setUnifiedProfile(profile);
    }
  };

  const handleTabChange = (index: number) => {
    setActiveTab(index);

    // Auto-fetch data when switching tabs
    switch (index) {
      case 0:
        if (!identityGraph && identifier) handleFetchIdentityGraph();
        break;
      case 1:
        if (!socialGraph && identifier) handleFetchSocialGraph();
        break;
      case 2:
        if (!unifiedProfile && identifier) handleCreateUnifiedProfile();
        break;
    }
  };

  if (!isMemoryApiAvailable) {
    return (
      <Alert status="warning">
        <AlertIcon />
        <Box>
          <AlertTitle>Memory API Not Configured</AlertTitle>
          <AlertDescription>
            This demo requires Memory API configuration. Set
            NEXT_PUBLIC_MEMORY_API_KEY in your environment variables.
          </AlertDescription>
        </Box>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Heading size="md">Memory API Integration Demo</Heading>
        <Text fontSize="sm" color="gray.600">
          Cross-platform identity mapping and social graph analysis
        </Text>
      </CardHeader>

      <CardBody>
        <VStack spacing={4} align="stretch">
          <HStack>
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter wallet address or Farcaster username"
              isDisabled={isLoading}
            />
            <Button
              onClick={() => {
                switch (activeTab) {
                  case 0:
                    handleFetchIdentityGraph();
                    break;
                  case 1:
                    handleFetchSocialGraph();
                    break;
                  case 2:
                    handleCreateUnifiedProfile();
                    break;
                }
              }}
              isLoading={isLoading}
              isDisabled={!identifier}
            >
              Fetch
            </Button>
          </HStack>

          {error && (
            <Alert status="error">
              <AlertIcon />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs onChange={handleTabChange} isFitted>
            <TabList>
              <Tab>Identity Graph</Tab>
              <Tab>Social Graph</Tab>
              <Tab>Unified Profile</Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                {identityGraph ? (
                  <VStack align="stretch" spacing={3}>
                    <Text fontWeight="bold">Connected Identities:</Text>
                    {Object.entries(identityGraph).map(
                      ([platform, identity]: [string, any]) => (
                        <Box
                          key={platform}
                          p={3}
                          borderWidth="1px"
                          borderRadius="md"
                        >
                          <HStack justify="space-between">
                            <Text fontWeight="medium">{platform}</Text>
                            <Badge colorScheme="green">{identity.id}</Badge>
                          </HStack>
                          {identity.username && (
                            <Text fontSize="sm" color="gray.600">
                              Username: {identity.username}
                            </Text>
                          )}
                        </Box>
                      )
                    )}
                  </VStack>
                ) : (
                  <Text color="gray.500">
                    {isLoading
                      ? "Loading identity graph..."
                      : "No identity graph data available"}
                  </Text>
                )}
              </TabPanel>

              <TabPanel>
                {socialGraph ? (
                  <VStack align="stretch" spacing={3}>
                    <Text fontWeight="bold">Social Connections:</Text>
                    <Text fontSize="sm">
                      Social graph data would be displayed here, including:
                    </Text>
                    <Box pl={4}>
                      <Text fontSize="sm">• Follow relationships</Text>
                      <Text fontSize="sm">• Engagement metrics</Text>
                      <Text fontSize="sm">• Community memberships</Text>
                      <Text fontSize="sm">• Influence scores</Text>
                    </Box>
                  </VStack>
                ) : (
                  <Text color="gray.500">
                    {isLoading
                      ? "Loading social graph..."
                      : "No social graph data available"}
                  </Text>
                )}
              </TabPanel>

              <TabPanel>
                {unifiedProfile ? (
                  <VStack align="stretch" spacing={4}>
                    <Box>
                      <Text fontWeight="bold" mb={2}>
                        Wallet Information
                      </Text>
                      <HStack>
                        <Badge colorScheme="blue">Address</Badge>
                        <Text fontSize="sm" isTruncated>
                          {unifiedProfile.wallet.address}
                        </Text>
                      </HStack>
                    </Box>

                    {unifiedProfile.farcaster.username && (
                      <Box>
                        <Text fontWeight="bold" mb={2}>
                          Farcaster Identity
                        </Text>
                        <HStack>
                          <Badge colorScheme="purple">Username</Badge>
                          <Text fontSize="sm">
                            @{unifiedProfile.farcaster.username}
                          </Text>
                        </HStack>
                      </Box>
                    )}

                    <Box>
                      <Text fontWeight="bold" mb={2}>
                        Connected Platforms
                      </Text>
                      {Object.keys(unifiedProfile.wallet.identities).length >
                      0 ? (
                        <HStack wrap="wrap" gap={2}>
                          {Object.keys(unifiedProfile.wallet.identities).map(
                            (platform) => (
                              <Badge key={platform} colorScheme="green">
                                {platform}
                              </Badge>
                            )
                          )}
                        </HStack>
                      ) : (
                        <Text fontSize="sm" color="gray.500">
                          No additional platforms connected
                        </Text>
                      )}
                    </Box>
                  </VStack>
                ) : (
                  <Text color="gray.500">
                    {isLoading
                      ? "Creating unified profile..."
                      : "No unified profile data available"}
                  </Text>
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </CardBody>

      <Divider />

      <CardFooter>
        <VStack align="stretch" spacing={3}>
          <Text fontSize="sm" color="gray.600">
            This demo showcases the Memory API integration capabilities for the
            Builder Rewards initiative.
          </Text>
          <HStack>
            <Link href="https://memoryproto.co" isExternal color="blue.500">
              Learn more about Memory API <ExternalLinkIcon mx="2px" />
            </Link>
          </HStack>
        </VStack>
      </CardFooter>
    </Card>
  );
}
