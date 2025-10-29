/**
 * Personality Profile Component
 * 
 * Visualizes user personality traits and interests based on social graph analysis
 * powered by Memory API cross-platform identity mapping.
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Badge,
  Button,
  Skeleton,
  SkeletonText,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  VStack,
  HStack,
  Wrap,
  WrapItem,
  Progress,
  Tooltip,
  Icon,
} from '@chakra-ui/react';
import { InfoIcon } from '@chakra-ui/icons';
import { useMemoryApi } from '../lib/hooks/useMemoryApi';

export default function PersonalityProfile({ address, farcasterUsername }) {
  const { 
    getPersonalityProfile, 
    isLoading, 
    error 
  } = useMemoryApi();
  
  const [personalityData, setPersonalityData] = useState(null);

  // Mock data for demonstration
  const mockPersonalityData = {
    traits: [
      { name: 'Tech Enthusiast', score: 92, color: 'blue' },
      { name: 'Crypto Native', score: 88, color: 'purple' },
      { name: 'Creative', score: 76, color: 'pink' },
      { name: 'Community Builder', score: 85, color: 'green' },
      { name: 'Early Adopter', score: 90, color: 'orange' },
      { name: 'Knowledge Sharer', score: 82, color: 'teal' }
    ],
    interests: [
      { name: 'Web3', relevance: 95 },
      { name: 'AI', relevance: 88 },
      { name: 'Startups', relevance: 82 },
      { name: 'Digital Art', relevance: 75 },
      { name: 'DeFi', relevance: 90 },
      { name: 'NFTs', relevance: 78 },
      { name: 'DAOs', relevance: 85 },
      { name: 'Gaming', relevance: 70 }
    ],
    engagement: {
      daily: 78,
      weekly: 85,
      monthly: 92
    },
    influence: {
      reach: 87,
      resonance: 82,
      authority: 79
    }
  };

  // Fetch personality data when component mounts or when user data changes
  useEffect(() => {
    if (address || farcasterUsername) {
      fetchPersonalityData();
    }
  }, [address, farcasterUsername]);

  const fetchPersonalityData = async () => {
    try {
      const identifier = address || farcasterUsername;
      const type = address ? 'address' : 'farcaster';
      const response = await getPersonalityProfile(identifier, type);
      if (response && response.personality) {
        setPersonalityData(response.personality);
      }
    } catch (err) {
      console.error('Personality data fetch error:', err);
      // Fallback to mock data if API fails
      setPersonalityData(mockPersonalityData);
    }
  };

  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle>Personality Profile Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Box>
      </Alert>
    );
  }

  if (!address && !farcasterUsername) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <HStack justify="space-between">
          <Box>
            <Heading size="md">Personality Profile</Heading>
            <Text fontSize="sm" color="gray.600">
              Insights into your digital personality and interests
            </Text>
          </Box>
          <Badge colorScheme="purple" fontSize="sm">
            Powered by Memory API
          </Badge>
        </HStack>
      </CardHeader>
      
      <CardBody>
        {isLoading ? (
          <VStack spacing={4}>
            <SkeletonText mt="4" noOfLines={4} spacing="4" />
            <Skeleton height="20px" width="100%" />
            <Skeleton height="20px" width="80%" />
            <Skeleton height="20px" width="90%" />
          </VStack>
        ) : !personalityData ? (
          <Text textAlign="center" py={4} color="gray.500">
            No personality data available at this time
          </Text>
        ) : (
          <VStack spacing={6} align="stretch">
            {/* Personality Traits */}
            <Box>
              <HStack spacing={2} mb={3}>
                <Heading size="sm">Personality Traits</Heading>
                <Tooltip label="Derived from your cross-platform social activity and content">
                  <InfoIcon color="gray.500" />
                </Tooltip>
              </HStack>
              <Wrap spacing={3}>
                {personalityData.traits.map((trait, index) => (
                  <WrapItem key={index}>
                    <Badge 
                      colorScheme={trait.color} 
                      fontSize="md" 
                      px={3} 
                      py={1}
                      borderRadius="full"
                    >
                      {trait.name} ({trait.score}%)
                    </Badge>
                  </WrapItem>
                ))}
              </Wrap>
            </Box>

            {/* Interests */}
            <Box>
              <HStack spacing={2} mb={3}>
                <Heading size="sm">Interests & Topics</Heading>
                <Tooltip label="Based on content you engage with and create">
                  <InfoIcon color="gray.500" />
                </Tooltip>
              </HStack>
              <VStack spacing={3} align="stretch">
                {personalityData.interests.map((interest, index) => (
                  <Box key={index}>
                    <HStack justify="space-between" mb={1}>
                      <Text fontSize="sm" fontWeight="medium">{interest.name}</Text>
                      <Text fontSize="sm" color="gray.600">{interest.relevance}%</Text>
                    </HStack>
                    <Progress 
                      value={interest.relevance} 
                      size="sm" 
                      colorScheme={
                        interest.relevance > 80 ? 'green' : 
                        interest.relevance > 60 ? 'blue' : 'gray'
                      } 
                      borderRadius="full" 
                    />
                  </Box>
                ))}
              </VStack>
            </Box>

            {/* Engagement Patterns */}
            <Box>
              <HStack spacing={2} mb={3}>
                <Heading size="sm">Engagement Patterns</Heading>
                <Tooltip label="How frequently you engage across platforms">
                  <InfoIcon color="gray.500" />
                </Tooltip>
              </HStack>
              <VStack spacing={3} align="stretch">
                <Box>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="sm">Daily Engagement</Text>
                    <Text fontSize="sm" color="gray.600">{personalityData.engagement.daily}%</Text>
                  </HStack>
                  <Progress 
                    value={personalityData.engagement.daily} 
                    size="sm" 
                    colorScheme="blue" 
                    borderRadius="full" 
                  />
                </Box>
                <Box>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="sm">Weekly Engagement</Text>
                    <Text fontSize="sm" color="gray.600">{personalityData.engagement.weekly}%</Text>
                  </HStack>
                  <Progress 
                    value={personalityData.engagement.weekly} 
                    size="sm" 
                    colorScheme="purple" 
                    borderRadius="full" 
                  />
                </Box>
                <Box>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="sm">Monthly Engagement</Text>
                    <Text fontSize="sm" color="gray.600">{personalityData.engagement.monthly}%</Text>
                  </HStack>
                  <Progress 
                    value={personalityData.engagement.monthly} 
                    size="sm" 
                    colorScheme="green" 
                    borderRadius="full" 
                  />
                </Box>
              </VStack>
            </Box>

            {/* Influence Metrics */}
            <Box>
              <HStack spacing={2} mb={3}>
                <Heading size="sm">Influence Metrics</Heading>
                <Tooltip label="Your impact and reach across the ecosystem">
                  <InfoIcon color="gray.500" />
                </Tooltip>
              </HStack>
              <VStack spacing={3} align="stretch">
                <Box>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="sm">Reach</Text>
                    <Text fontSize="sm" color="gray.600">{personalityData.influence.reach}%</Text>
                  </HStack>
                  <Progress 
                    value={personalityData.influence.reach} 
                    size="sm" 
                    colorScheme="orange" 
                    borderRadius="full" 
                  />
                </Box>
                <Box>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="sm">Resonance</Text>
                    <Text fontSize="sm" color="gray.600">{personalityData.influence.resonance}%</Text>
                  </HStack>
                  <Progress 
                    value={personalityData.influence.resonance} 
                    size="sm" 
                    colorScheme="pink" 
                    borderRadius="full" 
                  />
                </Box>
                <Box>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="sm">Authority</Text>
                    <Text fontSize="sm" color="gray.600">{personalityData.influence.authority}%</Text>
                  </HStack>
                  <Progress 
                    value={personalityData.influence.authority} 
                    size="sm" 
                    colorScheme="teal" 
                    borderRadius="full" 
                  />
                </Box>
              </VStack>
            </Box>
          </VStack>
        )}
      </CardBody>
      
      <CardFooter>
        <VStack align="stretch" spacing={3} width="100%">
          <Button 
            size="sm" 
            onClick={fetchPersonalityData} 
            isLoading={isLoading}
            loadingText="Refreshing"
          >
            Refresh Profile
          </Button>
          <Text fontSize="xs" color="gray.500" textAlign="center">
            Profile updates based on your ongoing social activity
          </Text>
        </VStack>
      </CardFooter>
    </Card>
  );
}