'use client';

import { Box, Flex, Image, Text, Spinner, VStack } from '@chakra-ui/react';
import { useFarcaster } from './FarcasterFrameProvider';

export default function SplashScreen({ isLoading = true }) {
  const { isInFrame } = useFarcaster();

  if (!isLoading || !isInFrame) return null;

  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      right="0"
      bottom="0"
      bg="#4FD1C5"
      zIndex="9999"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <VStack spacing={6}>
        <Image
          src="/ghibli-it.png"
          alt="Ghiblify"
          w="120px"
          h="120px"
          borderRadius="24px"
          boxShadow="0 8px 32px rgba(0,0,0,0.2)"
        />
        
        <VStack spacing={3}>
          <Text
            fontSize="2xl"
            fontWeight="bold"
            color="white"
            textAlign="center"
          >
            Ghiblify
          </Text>
          <Text
            fontSize="md"
            color="rgba(255,255,255,0.9)"
            textAlign="center"
            px={4}
          >
            Transform your photos into Studio Ghibli style art
          </Text>
        </VStack>
        
        <Spinner
          size="lg"
          color="white"
          thickness="3px"
        />
      </VStack>
    </Box>
  );
}