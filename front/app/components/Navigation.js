"use client";

import { Box, Flex, Link, Button, HStack } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import dynamic from 'next/dynamic';
import '@rainbow-me/rainbowkit/styles.css';

const CreditsDisplay = dynamic(() => import('./CreditsDisplay'), {
  ssr: false
});

export default function Navigation() {
  const router = useRouter();
  const { isConnected } = useAccount();

  return (
    <Box py={4} px={8} borderBottom="1px" borderColor="gray.200">
      <Flex justify="space-between" align="center" maxW="container.lg" mx="auto">
        <Link href="/" _hover={{ textDecoration: "none" }}>
          <Box fontSize="xl" fontWeight="bold" color="#4682A9">
            ghiblify &#128444;
          </Box>
        </Link>
        
        <HStack spacing={4}>
          {isConnected && <CreditsDisplay />}
          {isConnected && (
            <Button
              variant="ghost"
              onClick={() => router.push("/account")}
              color="gray.600"
              _hover={{ color: "#4682A9" }}
            >
              My Account
            </Button>
          )}
          <ConnectButton />
        </HStack>
      </Flex>
    </Box>
  );
}
