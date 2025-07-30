"use client";

import { Box, Flex, Link, Button, HStack } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import "@rainbow-me/rainbowkit/styles.css";
import Web3Button from "./Web3Button";

const CreditsDisplay = dynamic(() => import("./CreditsDisplay"), {
  ssr: false,
});

export default function Navigation() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR and before mounting, render a placeholder layout
  if (!mounted) {
    return (
      <Box
        py={2}
        px={4}
        sm={{ py: 4, px: 8 }}
        borderBottom="1px"
        borderColor="gray.200"
      >
        <Flex
          justify="space-between"
          align="center"
          maxW="container.lg"
          mx="auto"
        >
          <HStack spacing={4} />
          <Web3Button />
        </Flex>
      </Box>
    );
  }

  return (
    <Box
      py={2}
      px={4}
      sm={{ py: 4, px: 8 }}
      borderBottom="1px"
      borderColor="gray.200"
    >
      <Flex
        justify="space-between"
        align="center"
        maxW="container.lg"
        mx="auto"
      >
        <HStack spacing={4}>
          {isConnected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/account")}
              color="gray.600"
              _hover={{ color: "#4682A9" }}
              display={{ base: "none", sm: "flex" }}
            >
              My Account
            </Button>
          )}
        </HStack>

        <Web3Button />
      </Flex>
    </Box>
  );
}
