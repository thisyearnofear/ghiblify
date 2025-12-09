"use client";

import { 
  Box, 
  Flex, 
  Button, 
  HStack, 
  Text, 
  FormControl,
  FormLabel,
  Switch,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import "@rainbow-me/rainbowkit/styles.css";
import { useWallet } from "../lib/hooks/useWallet";
import CompactWalletButton from "./ui/CompactWalletButton";
import { DarkModeToggle } from "./ui/SimpleDarkModeToggle";
import { useGhibliTheme } from "../providers/GhibliThemeProvider";
import {
  GRADIENTS,
  PATTERNS,
  INTERACTIONS,
  ANIMATION_PRESETS,
} from "../theme";
import SparkleEffect from "./ui/SparkleEffect";

export default function Navigation() {
  const router = useRouter();
  const { isConnected } = useWallet();
  const [mounted, setMounted] = useState(false);
  const { isBackgroundEnabled, toggleBackground } = useGhibliTheme();

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

        <HStack spacing={3}>
          <FormControl display="flex" alignItems="center" w="auto">
            <FormLabel htmlFor="bg-toggle" mb="0" mr={2} color="whiteAlpha.800" fontSize="xs">
              Animation
            </FormLabel>
            <Switch id="bg-toggle" size="sm" isChecked={isBackgroundEnabled} onChange={toggleBackground} />
          </FormControl>
          <DarkModeToggle variant="glass" size="sm" />
          <CompactWalletButton />
        </HStack>
      </Flex>
    </Box>
  );
}
