"use client";

import { Box, Flex, Button, HStack, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import "@rainbow-me/rainbowkit/styles.css";
import { useUnifiedWallet } from "../lib/hooks/useUnifiedWallet";
import CompactWalletButton from "./ui/CompactWalletButton";
import {
  COLORS,
  GRADIENTS,
  LAYOUTS,
  PATTERNS,
  INTERACTIONS,
  ANIMATION_PRESETS,
} from "../theme";
import SparkleEffect from "./ui/SparkleEffect";

const CreditsDisplay = dynamic(() => import("./CreditsDisplay"), {
  ssr: false,
});

export default function Navigation() {
  const router = useRouter();
  const { isConnected } = useUnifiedWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR and before mounting, render a placeholder layout
  if (!mounted) {
    return (
      <Box 
        position="sticky" 
        top={0} 
        zIndex={1000}
        py={3}
        px={4}
        bgGradient={GRADIENTS.ghibliPrimary}
        backdropFilter="blur(10px)"
        borderBottom="1px solid"
        borderColor="whiteAlpha.200"
      >
        <Flex justify="space-between" align="center" maxW="1200px" mx="auto">
          <HStack spacing={4} />
          <CompactWalletButton />
        </Flex>
      </Box>
    );
  }

  return (
    <Box
      position="sticky"
      top={0}
      zIndex={1000}
      py={3}
      px={4}
      bgGradient={GRADIENTS.ghibliPrimary}
      backdropFilter="blur(10px)"
      borderBottom="1px solid"
      borderColor="whiteAlpha.200"
      _before={{
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgGradient: GRADIENTS.shimmerOverlay,
        animation: ANIMATION_PRESETS.sparkleSlow,
        opacity: 0.6,
      }}
    >
      {/* Subtle sparkles */}
      <Box opacity={0.7}>
        <SparkleEffect />
      </Box>

      <Flex justify="space-between" align="center" maxW="1200px" mx="auto" position="relative">
        {/* Logo/Brand - more compact */}
        <HStack spacing={4}>
          <Text
            fontSize={{ base: "lg", md: "xl" }}
            fontWeight="bold"
            color="white"
            textShadow="0 2px 4px rgba(0,0,0,0.3)"
            cursor="pointer"
            onClick={() => router.push("/")}
            _hover={INTERACTIONS.scaleHover}
            transition="all 0.3s ease"
          >
            ✨ Ghiblify
          </Text>

          {isConnected && (
            <Button
              {...PATTERNS.glassButton}
              variant="ghost"
              size="xs"
              onClick={() => router.push("/account")}
              color="whiteAlpha.900"
              display={{ base: "none", md: "flex" }}
              px={3}
              fontSize="xs"
            >
              Account
            </Button>
          )}
        </HStack>

        <CompactWalletButton />
      </Flex>
    </Box>
  );
}
