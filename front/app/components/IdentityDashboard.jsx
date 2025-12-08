/**
 * Identity Dashboard Component
 * 
 * Comprehensive dashboard showing cross-platform identity information
 * for the Memory API Builder Rewards initiative.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Heading,
  Text,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Badge,
  Progress,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  HStack,
  Avatar,
  Link,
  Icon,
  Button,
  Skeleton,
  SkeletonText,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { useMemoryApi } from '../lib/hooks/useMemoryApi';

export default function IdentityDashboard({ address, farcasterUsername }) {
  const { 
    getIdentityGraph, 
    getSocialGraph, 
    getWalletAddressForFarcasterUser,
    createUnifiedProfile,
    isLoading, 
    error 
  } = useMemoryApi();
  
  // State for force refresh
  const [forceRefresh, setForceRefresh] = useState(false);
  
  const [profile, setProfile] = useState(null);
  const [socialScore, setSocialScore] = useState(null);

  // Fetch identity data when component mounts or when address/username changes
  useEffect(() => {
    if (address || farcasterUsername) {
      fetchIdentityData(forceRefresh);
    }
  }, [address, farcasterUsername, forceRefresh, fetchIdentityData]);

  const fetchIdentityData = useCallback(async (force = false) => {
    try {
      // Fetch unified profile
      let profileData;
      if (address) {
        profileData = await createUnifiedProfile(address, farcasterUsername, force);
      } else if (farcasterUsername) {
        // For Farcaster username, first get wallet address
        const walletAddress = await getWalletAddressForFarcasterUser(farcasterUsername);
        if (walletAddress) {
          profileData = await createUnifiedProfile(walletAddress, farcasterUsername, force);
        }
      }
      
      if (profileData) {
        setProfile(profileData);
        
        // Calculate social influence score if social data is available
        if (profileData.social) {
          const score = calculateSocialScore(profileData.social);
          setSocialScore(score);
        }
      }
      
      // Reset force refresh state
      if (force) {
        setForceRefresh(false);
      }
    } catch (err) {
      console.error('Identity dashboard error:', err);
    }
  }, [address, farcasterUsername, createUnifiedProfile, getWalletAddressForFarcasterUser]);

  const calculateSocialScore = (socialData) => {
    // Simple social influence scoring algorithm
    let score = 0;
    
    // Farcaster followers
    if (socialData.farcaster?.social?.followers) {
      score += Math.log10(socialData.farcaster.social.followers) * 10;
    }
    
    // Twitter followers (if available)
    if (socialData.twitter?.social?.followers) {
      score += Math.log10(socialData.twitter.social.followers) * 5;
    }
    
    // GitHub followers (if available)
    if (socialData.github?.social?.followers) {
      score += Math.log10(socialData.github.social.followers) * 3;
    }
    
    return Math.round(score);
  };

  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle>Identity Dashboard Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Box>
      </Alert>
    );
  }

  if (isLoading && !profile) {
    return (
      <Card>
        <CardHeader>
          <Skeleton height="20px" width="150px" />
        </CardHeader>
        <CardBody>
          <SkeletonText mt="4" noOfLines={4} spacing="4" />
        </CardBody>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle>Identity Information</AlertTitle>
          <AlertDescription>
            Connect your wallet to see your cross-platform identity information.
          </AlertDescription>
        </Box>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Heading size="md">Your Unified Identity Profile</Heading>
        <Text fontSize="sm" color="gray.600">
          Cross-platform identity mapping powered by Memory API
        </Text>
      </CardHeader>
      
      <CardBody>
        <VStack spacing={6} align="stretch">
          {/* Social Influence Score */}
          {socialScore !== null && (
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="bold">Social Influence Score</Text>
                <Badge colorScheme="green" fontSize="lg">{socialScore}</Badge>
              </HStack>
              <Progress value={Math.min(socialScore, 100)} colorScheme="green" size="sm" borderRadius="full" />
              <Text fontSize="sm" color="gray.500" mt={1}>
                Based on your cross-platform activity and followers
              </Text>
            </Box>
          )}

          {/* Connected Identities */}
          <Box>
            <Text fontWeight="bold" mb={3}>Connected Identities</Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {profile.wallet?.identities && Object.entries(profile.wallet.identities).map(([platform, identity]) => (
                <Card key={platform} variant="outline">
                  <CardBody>
                    <HStack spacing={3}>
                      <Avatar size="sm" name={platform} src={identity.avatar || undefined} />
                      <VStack align="stretch" spacing={0} flex="1">
                        <Text fontWeight="medium" fontSize="sm">{platform}</Text>
                        {identity.username && (
                          <Text fontSize="xs" color="gray.500">@{identity.username}</Text>
                        )}
                        {identity.id && (
                          <Text fontSize="xs" color="gray.500" isTruncated>
                            {identity.id}
                          </Text>
                        )}
                      </VStack>
                      {identity.url && (
                        <Link href={identity.url} isExternal>
                          <Icon as={ExternalLinkIcon} />
                        </Link>
                      )}
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </Box>

          {/* Social Metrics */}
          {profile.social && Object.keys(profile.social).length > 0 && (
            <Box>
              <Text fontWeight="bold" mb={3}>Social Metrics</Text>
              <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={4}>
                {profile.social.farcaster?.social?.followers && (
                  <Stat>
                    <StatLabel>Farcaster</StatLabel>
                    <StatNumber>{profile.social.farcaster.social.followers.toLocaleString()}</StatNumber>
                    <StatHelpText>Followers</StatHelpText>
                  </Stat>
                )}
                {profile.social.twitter?.social?.followers && (
                  <Stat>
                    <StatLabel>Twitter</StatLabel>
                    <StatNumber>{profile.social.twitter.social.followers.toLocaleString()}</StatNumber>
                    <StatHelpText>Followers</StatHelpText>
                  </Stat>
                )}
                {profile.social.github?.social?.followers && (
                  <Stat>
                    <StatLabel>GitHub</StatLabel>
                    <StatNumber>{profile.social.github.social.followers.toLocaleString()}</StatNumber>
                    <StatHelpText>Followers</StatHelpText>
                  </Stat>
                )}
                {profile.social.lens?.social?.followers && (
                  <Stat>
                    <StatLabel>Lens</StatLabel>
                    <StatNumber>{profile.social.lens.social.followers.toLocaleString()}</StatNumber>
                    <StatHelpText>Followers</StatHelpText>
                  </Stat>
                )}
              </SimpleGrid>
            </Box>
          )}

          {/* Platform Diversity */}
          <Box>
            <HStack justify="space-between" mb={2}>
              <Text fontWeight="bold">Platform Diversity</Text>
              <Badge colorScheme="blue">
                {profile.wallet?.identities ? Object.keys(profile.wallet.identities).length : 0} platforms
              </Badge>
            </HStack>
            <Text fontSize="sm" color="gray.600">
              You&apos;re connected to {profile.wallet?.identities ? Object.keys(profile.wallet.identities).length : 0} different platforms, 
              making your identity more discoverable and valuable.
            </Text>
          </Box>
        </VStack>
      </CardBody>
      
      <CardFooter>
        <VStack align="stretch" spacing={3} width="100%">
          <Button 
            size="sm" 
            onClick={() => {
              setForceRefresh(true);
              fetchIdentityData(true);
            }} 
            isLoading={isLoading}
            loadingText="Refreshing"
          >
            Refresh Identity Data
          </Button>
          <Text fontSize="xs" color="gray.500" textAlign="center">
            Identity data updates automatically when you connect new platforms
          </Text>
        </VStack>
      </CardFooter>
    </Card>
  );
}