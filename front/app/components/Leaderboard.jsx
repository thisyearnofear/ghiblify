/**
 * Leaderboard Component
 * 
 * Displays top social influencers based on cross-platform social scores
 * powered by Memory API social graph analysis.
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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Tooltip,
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { useMemoryApi } from '../lib/hooks/useMemoryApi';

export default function Leaderboard() {
  const { 
    getSocialGraph, 
    isLoading, 
    error 
  } = useMemoryApi();
  
  const [leaderboard, setLeaderboard] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [timeRange, setTimeRange] = useState('all'); // all, week, month

  // State for last updated timestamp
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch leaderboard data when component mounts
  useEffect(() => {
    fetchLeaderboardData();
  }, [timeRange]);

  const fetchLeaderboardData = async () => {
    try {
      const response = await getLeaderboard(timeRange);
      if (response && response.leaderboard) {
        setLeaderboard(response.leaderboard);
        setLastUpdated(new Date(response.timestamp * 1000));
      }
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
    }
  };

  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle>Leaderboard Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Box>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <HStack justify="space-between">
          <Box>
            <Heading size="md">Social Influence Leaderboard</Heading>
            <Text fontSize="sm" color="gray.600">
              Top creators ranked by cross-platform social influence
            </Text>
          </Box>
          <Badge colorScheme="purple" fontSize="sm">
            Powered by Memory API
          </Badge>
        </HStack>
      </CardHeader>
      
      <CardBody>
        <Tabs variant="soft-rounded" colorScheme="purple" onChange={(index) => setTimeRange(['all', 'week', 'month'][index])}>
          <TabList mb={4}>
            <Tab>All Time</Tab>
            <Tab>This Week</Tab>
            <Tab>This Month</Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel>
              {isLoading ? (
                <VStack spacing={4}>
                  {[...Array(5)].map((_, index) => (
                    <Skeleton key={index} height="60px" width="100%" />
                  ))}
                </VStack>
              ) : (
                <TableContainer>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Rank</Th>
                        <Th>User</Th>
                        <Th>Score</Th>
                        <Th>Followers</Th>
                        <Th>Platforms</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {leaderboard.map((user) => (
                        <Tr key={`${user.username}-${user.platform}`}>
                          <Td>
                            <Badge 
                              colorScheme={user.rank === 1 ? 'yellow' : user.rank === 2 ? 'gray' : user.rank === 3 ? 'orange' : 'gray'}
                              fontSize="md"
                            >
                              #{user.rank}
                            </Badge>
                          </Td>
                          <Td>
                            <HStack spacing={3}>
                              <Avatar size="sm" name={user.username} src={user.avatar} />
                              <Box>
                                <Text fontWeight="bold">{user.username}</Text>
                                <Text fontSize="sm" color="gray.500">{user.platform}</Text>
                              </Box>
                            </HStack>
                          </Td>
                          <Td>
                            <Tooltip label="Social influence score based on cross-platform activity">
                              <Badge colorScheme="green">{user.score}</Badge>
                            </Tooltip>
                          </Td>
                          <Td>
                            <Text>{user.followers?.toLocaleString() || 'N/A'}</Text>
                          </Td>
                          <Td>
                            <HStack spacing={2}>
                              {Object.keys(user.identities || {}).map((platform) => (
                                <Tooltip key={platform} label={`${platform}: ${user.identities[platform].username}`}>
                                  <Badge colorScheme="blue" fontSize="xs">
                                    {platform}
                                  </Badge>
                                </Tooltip>
                              ))}
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>
            
            {/* Additional tab panels would be implemented similarly */}
            <TabPanel>
              <Text textAlign="center" py={8} color="gray.500">
                Leaderboard data for this week would appear here
              </Text>
            </TabPanel>
            <TabPanel>
              <Text textAlign="center" py={8} color="gray.500">
                Leaderboard data for this month would appear here
              </Text>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </CardBody>
      
      <CardFooter>
        <VStack align="stretch" spacing={3} width="100%">
          <Button 
            size="sm" 
            onClick={fetchLeaderboardData} 
            isLoading={isLoading}
            loadingText="Refreshing"
          >
            Refresh Leaderboard
          </Button>
          <Text fontSize="xs" color="gray.500" textAlign="center">
            {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Rankings update hourly based on cross-platform social activity'}
          </Text>
        </VStack>
      </CardFooter>
    </Card>
  );
}