"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import { 
  Box, 
  Button, 
  VStack, 
  HStack, 
  Text, 
  Badge
} from "@chakra-ui/react";
import Web3Avatar from "./Web3Avatar";
import SignInWithBase from "./SignInWithBase.jsx";
import { COLORS, GRADIENTS, PATTERNS, INTERACTIONS, ANIMATION_PRESETS } from "../theme";
import MagicalButton from "./ui/MagicalButton";
import MagicalModal from "./ui/MagicalModal";


export default function Web3Button() {
  const { address, isConnected } = useAccount();
  const [isConnectionOpen, setIsConnectionOpen] = useState(false);
  const [isBaseAuthOpen, setIsBaseAuthOpen] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      // Use consistent API URL configuration
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ghiblify.onrender.com";

      // Send the address to your backend to get/create a session
      fetch(`${API_URL}/api/web3/login`, {
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
        body: JSON.stringify({ address }),
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
    localStorage.setItem("ghiblify_auth", JSON.stringify(result));
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

        if (!account) {
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
                borderColor={COLORS.ghibli.green}
              >
                    <VStack spacing={4}>
                      {/* RainbowKit Option */}
                      <Button
                        onClick={() => {
                          openConnectModal();
                          setIsConnectionOpen(false);
                        }}
                        w="full"
                        h="60px"
                        borderRadius="xl"
                        bg="gray.50"
                        border="2px solid"
                        borderColor="gray.200"
                        _hover={{
                          borderColor: COLORS.ghibli.green,
                          bg: "gray.100",
                          transform: "translateY(-2px)",
                          boxShadow: "0 8px 25px rgba(79, 209, 197, 0.2)"
                        }}
                        transition="all 0.3s ease"
                      >
                        <HStack spacing={4} w="full" justify="flex-start">
                          <Box
                            w="40px"
                            h="40px"
                            borderRadius="full"
                            bgGradient="linear(to-r, purple.500, pink.500)"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Text color="white" fontSize="lg">🌈</Text>
                          </Box>
                          <Text fontWeight="bold" color={COLORS.primary}>
                            RainbowKit Wallet
                          </Text>
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
                        bg="gray.50"
                        border="2px solid"
                        borderColor="gray.200"
                        _hover={{
                          borderColor: COLORS.ghibli.blue,
                          bg: "gray.100",
                          transform: "translateY(-2px)",
                          boxShadow: "0 8px 25px rgba(70, 130, 169, 0.2)"
                        }}
                        transition="all 0.3s ease"
                      >
                        <HStack spacing={4} w="full" justify="flex-start">
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
                          <Text fontWeight="bold" color={COLORS.primary}>
                            Sign in with Base
                          </Text>
                        </HStack>
                      </Button>
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

        const hasBaseAuth =
          typeof window !== "undefined" &&
          localStorage.getItem("ghiblify_auth");

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

            {/* Base Account Status */}
            {hasBaseAuth && (
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
                🔵 Base Pay
              </Badge>
            )}
          </HStack>
        );
      }}
    </ConnectButton.Custom>
  );
}
