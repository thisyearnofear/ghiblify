"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import { Box, Button, VStack, HStack, Text, Badge } from "@chakra-ui/react";
import { useUnifiedWallet } from "../lib/hooks/useUnifiedWallet";
import Web3Avatar from "./Web3Avatar";
import SignInWithBase from "./SignInWithBase.jsx";
import {
  COLORS,
  GRADIENTS,
  PATTERNS,
  INTERACTIONS,
  ANIMATION_PRESETS,
} from "../theme";
import MagicalButton from "./ui/MagicalButton";
import MagicalModal from "./ui/MagicalModal";
import { useBaseAccountAuth } from "../lib/hooks/useBaseAccountAuth";

export default function Web3Button() {
  const { address, isConnected } = useAccount();
  const {
    user: baseUser,
    isAuthenticated: isBaseAuthenticated,
    signOut: baseSignOut,
  } = useBaseAccountAuth();

  // Use unified wallet for consistent display
  const {
    isConnected: unifiedConnected,
    address: unifiedAddress,
    credits: unifiedCredits,
    provider: unifiedProvider,
    disconnect: unifiedDisconnect,
  } = useUnifiedWallet();

  // Determine active authentication method and priority
  const getActiveAuthInfo = () => {
    const hasRainbowKit = isConnected && address;
    const hasBaseAuth = isBaseAuthenticated && baseUser;

    if (hasRainbowKit && hasBaseAuth) {
      return {
        primary: "rainbowkit",
        secondary: "base",
        status: "Both Connected",
        color: COLORS.ghibli.green,
        icon: "🌈",
      };
    } else if (hasRainbowKit) {
      return {
        primary: "rainbowkit",
        secondary: null,
        status: "RainbowKit Active",
        color: COLORS.ghibli.green,
        icon: "🌈",
      };
    } else if (hasBaseAuth) {
      return {
        primary: "base",
        secondary: null,
        status: "Base Account Active",
        color: COLORS.ghibli.blue,
        icon: "🔵",
      };
    }

    return {
      primary: null,
      secondary: null,
      status: "Not Connected",
      color: COLORS.primary,
      icon: "✨",
    };
  };

  const authInfo = getActiveAuthInfo();

  const [isConnectionOpen, setIsConnectionOpen] = useState(false);
  const [isBaseAuthOpen, setIsBaseAuthOpen] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      // Use consistent API URL configuration
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "https://api.thisyearnofear.com";

      // Send the address to your backend to get/create a session
      fetch(`${API_URL}/api/web3/login?address=${address}`, {
        method: "POST",
        credentials: "include",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Origin:
            typeof window !== "undefined"
              ? window.location.origin
              : "https://ghiblify-it.vercel.app",
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            localStorage.setItem("ghiblify_token", data.token);
          }
        })
        .catch((error) => {
          console.error("Web3 login error:", error);
        });
    }
  }, [isConnected, address]);

  const handleBaseAuthSuccess = (result) => {
    console.log("Base authentication successful:", result);
    setIsBaseAuthOpen(false);
    setIsConnectionOpen(false);
  };

  const handleBaseAuthError = (error) => {
    console.error("Base authentication failed:", error);
    setIsBaseAuthOpen(false);
  };

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        if (!ready) return null;

        // Show authenticated state if either RainbowKit account or Base auth is present
        if (!account && !isBaseAuthenticated) {
          return (
            <Box position="relative">
              <MagicalButton
                onClick={() => setIsConnectionOpen(true)}
                variant="primary"
                size={{ base: "md", md: "sm" }}
                isAnimated={true}
                leftIcon={
                  <Box
                    w="4px"
                    h="4px"
                    bg="whiteAlpha.800"
                    borderRadius="full"
                    animation={ANIMATION_PRESETS.pulseDefault}
                  />
                }
              >
                Connect Wallet ✨
              </MagicalButton>

              {/* Connection Options Modal */}
              <MagicalModal
                isOpen={isConnectionOpen}
                onClose={() => setIsConnectionOpen(false)}
                title="Choose Your Magic Portal ✨"
                borderColor={authInfo.color}
              >
                <VStack spacing={4}>
                  {/* Current Status Indicator */}
                  <Box w="full" textAlign="center" mb={2}>
                    <Badge
                      colorScheme={
                        authInfo.primary === "rainbowkit" ? "green" : "blue"
                      }
                      borderRadius="full"
                      px={4}
                      py={2}
                      bg={authInfo.color}
                      color="white"
                      fontWeight="bold"
                      fontSize="sm"
                    >
                      {authInfo.icon} {authInfo.status}
                    </Badge>
                  </Box>

                  {/* RainbowKit Option */}
                  <Button
                    onClick={() => {
                      openConnectModal();
                      setIsConnectionOpen(false);
                    }}
                    w="full"
                    h="60px"
                    borderRadius="xl"
                    bg={
                      authInfo.primary === "rainbowkit"
                        ? `${COLORS.ghibli.green}20`
                        : "gray.50"
                    }
                    border="2px solid"
                    borderColor={
                      authInfo.primary === "rainbowkit"
                        ? COLORS.ghibli.green
                        : "gray.200"
                    }
                    _hover={{
                      borderColor: COLORS.ghibli.green,
                      bg: "gray.100",
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 25px rgba(79, 209, 197, 0.2)",
                    }}
                    transition="all 0.3s ease"
                  >
                    <HStack spacing={4} w="full" justify="space-between">
                      <HStack spacing={4}>
                        <Box
                          w="40px"
                          h="40px"
                          borderRadius="full"
                          bgGradient="linear(to-r, purple.500, pink.500)"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Text color="white" fontSize="lg">
                            🌈
                          </Text>
                        </Box>
                        <VStack spacing={0} align="flex-start">
                          <Text fontWeight="bold" color={COLORS.primary}>
                            RainbowKit Wallet
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            External wallets (MetaMask, etc.)
                          </Text>
                        </VStack>
                      </HStack>
                      {authInfo.primary === "rainbowkit" && (
                        <Badge colorScheme="green" variant="subtle">
                          Active
                        </Badge>
                      )}
                    </HStack>
                  </Button>

                  {/* Base Option */}
                  <Button
                    onClick={() => {
                      setIsBaseAuthOpen(true);
                      setIsConnectionOpen(false);
                    }}
                    w="full"
                    h="60px"
                    borderRadius="xl"
                    bg={
                      authInfo.primary === "base"
                        ? `${COLORS.ghibli.blue}20`
                        : "gray.50"
                    }
                    border="2px solid"
                    borderColor={
                      authInfo.primary === "base"
                        ? COLORS.ghibli.blue
                        : "gray.200"
                    }
                    _hover={{
                      borderColor: COLORS.ghibli.blue,
                      bg: "gray.100",
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 25px rgba(70, 130, 169, 0.2)",
                    }}
                    transition="all 0.3s ease"
                  >
                    <HStack spacing={4} w="full" justify="space-between">
                      <HStack spacing={4}>
                        <Box
                          w="40px"
                          h="40px"
                          borderRadius="full"
                          bg={COLORS.ghibli.blue}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Text color="white" fontWeight="bold" fontSize="lg">
                            🔵
                          </Text>
                        </Box>
                        <VStack spacing={0} align="flex-start">
                          <Text fontWeight="bold" color={COLORS.primary}>
                            Sign in with Base
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            Embedded wallet experience
                          </Text>
                        </VStack>
                      </HStack>
                      {authInfo.primary === "base" && (
                        <Badge colorScheme="blue" variant="subtle">
                          Active
                        </Badge>
                      )}
                    </HStack>
                  </Button>

                  {/* Priority Info */}
                  <Box w="full" textAlign="center" mt={2}>
                    <Text fontSize="xs" color="gray.500">
                      💡 RainbowKit takes priority when both are connected
                    </Text>
                  </Box>
                </VStack>
              </MagicalModal>

              {/* Base Auth Modal */}
              <MagicalModal
                isOpen={isBaseAuthOpen}
                onClose={() => setIsBaseAuthOpen(false)}
                title="Sign in with Base 🔵"
                borderColor={COLORS.ghibli.blue}
              >
                <SignInWithBase
                  onSuccess={handleBaseAuthSuccess}
                  onError={handleBaseAuthError}
                />
              </MagicalModal>
            </Box>
          );
        }

        if (chain?.unsupported) {
          return (
            <MagicalButton
              onClick={openChainModal}
              variant="danger"
              px={6}
              leftIcon={<Text>⚠️</Text>}
            >
              Wrong Network
            </MagicalButton>
          );
        }

        // If we have Base auth but no RainbowKit account, show Base auth state
        if (isBaseAuthenticated && baseUser && !account) {
          return (
            <HStack spacing={3}>
              {/* Base Account Button */}
              <MagicalButton
                onClick={() => {
                  // Handle Base account menu (logout, etc.)
                  const shouldLogout = window.confirm(
                    "Do you want to disconnect your Base account?"
                  );
                  if (shouldLogout) {
                    baseSignOut();
                  }
                }}
                variant="glass"
                px={4}
                leftIcon={<Web3Avatar address={baseUser.address} size={24} />}
              >
                <VStack spacing={0} align="flex-start">
                  <Text fontSize="sm" fontWeight="bold">
                    {baseUser.address.slice(0, 6)}...
                    {baseUser.address.slice(-4)}
                  </Text>
                  <Text fontSize="xs" color="whiteAlpha.800">
                    Credits: {unifiedCredits || baseUser.credits || 0}
                  </Text>
                </VStack>
              </MagicalButton>

              {/* Base Account Status - Enhanced */}
              <VStack spacing={1}>
                <Badge
                  colorScheme="blue"
                  borderRadius="full"
                  px={3}
                  py={1}
                  bg={COLORS.ghibli.blue}
                  color="white"
                  fontWeight="bold"
                  fontSize="xs"
                  animation={ANIMATION_PRESETS.pulseDefault}
                >
                  🔵 Base Active
                </Badge>
                <Text fontSize="xs" color="gray.400" textAlign="center">
                  Primary Auth
                </Text>
              </VStack>
            </HStack>
          );
        }

        // If we have RainbowKit account, show the original logic
        const hasBaseAuth = isBaseAuthenticated && baseUser;

        return (
          <HStack spacing={3}>
            {/* Chain Selector */}
            <MagicalButton
              onClick={openChainModal}
              variant="glass"
              size="sm"
              px={4}
            >
              {chain.name}
            </MagicalButton>

            {/* Account Button */}
            <MagicalButton
              onClick={openAccountModal}
              variant="glass"
              px={4}
              leftIcon={<Web3Avatar address={account.address} size={24} />}
            >
              <VStack spacing={0} align="flex-start">
                <Text fontSize="sm" fontWeight="bold">
                  {account.displayName}
                </Text>
                {account.displayBalance && (
                  <Text fontSize="xs" color="whiteAlpha.800">
                    {account.displayBalance}
                  </Text>
                )}
              </VStack>
            </MagicalButton>

            {/* Authentication Status Indicators */}
            <VStack spacing={1}>
              {/* Primary Auth Status */}
              <Badge
                colorScheme="green"
                borderRadius="full"
                px={3}
                py={1}
                bg={COLORS.ghibli.green}
                color="white"
                fontWeight="bold"
                fontSize="xs"
                animation={ANIMATION_PRESETS.pulseDefault}
              >
                🌈 RainbowKit Active
              </Badge>

              {/* Secondary Auth Status */}
              {hasBaseAuth && (
                <Badge
                  colorScheme="blue"
                  borderRadius="full"
                  px={2}
                  py={0.5}
                  bg={`${COLORS.ghibli.blue}80`}
                  color="white"
                  fontWeight="medium"
                  fontSize="xs"
                >
                  🔵 Base Available
                </Badge>
              )}
            </VStack>
          </HStack>
        );
      }}
    </ConnectButton.Custom>
  );
}
