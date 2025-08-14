"use client";

import { Box, Flex, Button, HStack, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import "@rainbow-me/rainbowkit/styles.css";
import { useUnifiedWallet } from "../lib/hooks/useUnifiedWallet";
import Web3Button from "./Web3Button";
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
      <Box {...LAYOUTS.headerContainer} bgGradient={GRADIENTS.ghibliPrimary}>
        <Flex {...LAYOUTS.centeredFlex}>
          <HStack spacing={4} />
          <Web3Button />
        </Flex>
      </Box>
    );
  }

  return (
    <Box
      {...LAYOUTS.headerContainer}
      bgGradient={GRADIENTS.ghibliPrimary}
      _before={{
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgGradient: GRADIENTS.shimmerOverlay,
        animation: ANIMATION_PRESETS.sparkleSlow,
      }}
    >
      {/* Magical sparkles */}
      <SparkleEffect />

      <Flex {...LAYOUTS.centeredFlex}>
        <HStack spacing={6}>
          {/* Logo/Brand */}
          <Text
            fontSize={{ base: "xl", md: "2xl" }}
            fontWeight="bold"
            color="white"
            textShadow="0 2px 4px rgba(0,0,0,0.3)"
            animation={ANIMATION_PRESETS.floatGentle}
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
              size="sm"
              onClick={() => router.push("/account")}
              color="whiteAlpha.900"
              display={{ base: "none", sm: "flex" }}
              px={6}
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
