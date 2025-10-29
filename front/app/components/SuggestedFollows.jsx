/**
 * Suggested Follows Component
 * 
 * Provides personalized follow suggestions based on social graph analysis
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
  SimpleGrid,
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
  Avatar,
  Link,
  Icon,
  Tooltip,
} from '@chakra-ui/react';
import { ExternalLinkIcon, SmallAddIcon } from '@chakra-ui/icons';
import { useMemoryApi } from '../lib/hooks/useMemoryApi';

export default function SuggestedFollows({ address, farcasterUsername }) {
  const { 
    getSuggestedFollows, 
    isLoading, 
    error 
  } = useMemoryApi();
  
  const [suggestions, setSuggestions] = useState([]);
  const [following, setFollowing] = useState(new Set());

  // Mock data for demonstration
  const mockSuggestions = [
    {
      id: '1',
      username: 'kevinrose',
      platform: 'farcaster',
      score: 87,
      mutuals: 12,
      followers: 45000,
      avatar: 'https://pbs.twimg.com/profile_images/1712044611633324032/kQ675Yyz_400x400.jpg',
      identities: {
        farcaster: { username: 'kevinrose', followers: 45000 },
        twitter: { username: 'kevinrose', followers: 350000 }
      },
      reason: 'Similar interests in tech and crypto'
    },
    {
      id: '2',
      username: 'balajis',
      platform: 'farcaster',
      score: 82,
      mutuals: 8,
      followers: 38000,
      avatar: 'https://pbs.twimg.com/profile_images/1704008965161562112/-YuYcPz-_400x400.jpg',
      identities: {
        farcaster: { username: 'balajis', followers: 38000 },
        twitter: { username: 'balajis', followers: 520000 }
      },
      reason: 'Shared connections in the crypto space'
    },
    {
      id: '3',
      username: 'cdixon',
      platform: 'farcaster',
      score: 79,
      mutuals: 15,
      followers: 32000,
      avatar: 'https://pbs.twimg.com/profile_images/1697886349618569216/0tXK2N5h_400x400.jpg',
      identities: {
        farcaster: { username: 'cdixon', followers: 32000 },
        twitter: { username: 'cdixon', followers: 280000 }
      },
      reason: 'Interest in AI and startups'
    }
  ];

  // Fetch suggestions when component mounts or when user data changes
  useEffect(() => {
    if (address || farcasterUsername) {
      fetchSuggestions();
    }
  }, [address, farcasterUsername]);

  const fetchSuggestions = async () => {
    try {
      const identifier = address || farcasterUsername;
      const type = address ? 'address' : 'farcaster';
      const response = await getSuggestedFollows(identifier, type);
      if (response && response.suggestions) {
        setSuggestions(response.suggestions);
      }
    } catch (err) {
      console.error('Suggestions fetch error:', err);
      // Fallback to mock data if API fails
      setSuggestions(mockSuggestions);
    }
  };

  const handleFollow = (userId) => {
    setFollowing(prev => new Set([...prev, userId]));
  };

  const handleDismiss = (userId) => {
    setSuggestions(prev => prev.filter(suggestion => suggestion.id !== userId));
  };

  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle>Follow Suggestions Error</AlertTitle>
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
            <Heading size="md">Suggested Follows</Heading>
            <Text fontSize="sm" color="gray.600">
              Personalized recommendations based on your interests
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
            {[...Array(3)].map((_, index) => (
              <Skeleton key={index} height="80px" width="100%" />
            ))}
          </VStack>
        ) : suggestions.length === 0 ? (
          <Text textAlign="center" py={4} color="gray.500">
            No suggestions available at this time
          </Text>
        ) : (
          <VStack spacing={4} align="stretch">
            {suggestions.map((user) => (
              <Card key={user.id} variant="outline">
                <CardBody>
                  <HStack justify="space-between">
                    <HStack spacing={3}>
                      <Avatar size="md" name={user.username} src={user.avatar} />
                      <Box>
                        <HStack spacing={2}>
                          <Text fontWeight="bold">{user.username}</Text>
                          <Tooltip label="Social influence score">
                            <Badge colorScheme="green" fontSize="xs">{user.score}</Badge>
                          </Tooltip>
                        </HStack>
                        <Text fontSize="sm" color="gray.500">
                          {user.followers?.toLocaleString()} followers
                        </Text>
                        <Text fontSize="xs" color="gray.600" mt={1}>
                          {user.reason}
                        </Text>
                      </Box>
                    </HStack>
                    
                    <HStack spacing={2}>
                      {!following.has(user.id) ? (
                        <>
                          <Button 
                            size="sm" 
                            leftIcon={<SmallAddIcon />} 
                            colorScheme="blue"
                            onClick={() => handleFollow(user.id)}
                          >
                            Follow
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleDismiss(user.id)}
                          >
                            Dismiss
                          </Button>
                        </>
                      ) : (
                        <Badge colorScheme="green" fontSize="sm">
                          Following
                        </Badge>
                      )}
                    </HStack>
                  </HStack>
                  
                  <HStack spacing={2} mt={3} wrap="wrap">
                    {Object.keys(user.identities || {}).map((platform) => (
                      <Tooltip key={platform} label={`${platform}: ${user.identities[platform].username}`}>
                        <Badge colorScheme="blue" fontSize="xs">
                          {platform}
                        </Badge>
                      </Tooltip>
                    ))}
                    <Tooltip label={`${user.mutuals} mutual followers`}>
                      <Badge colorScheme="purple" fontSize="xs">
                        {user.mutuals} mutuals
                      </Badge>
                    </Tooltip>
                  </HStack>
                </CardBody>
              </Card>
            ))}
          </VStack>
        )}
      </CardBody>
      
      <CardFooter>
        <VStack align="stretch" spacing={3} width="100%">
          <Button 
            size="sm" 
            onClick={fetchSuggestions} 
            isLoading={isLoading}
            loadingText="Refreshing"
          >
            Refresh Suggestions
          </Button>
          <Text fontSize="xs" color="gray.500" textAlign="center">
            Suggestions update based on your social connections and activity
          </Text>
        </VStack>
      </CardFooter>
    </Card>
  );
}