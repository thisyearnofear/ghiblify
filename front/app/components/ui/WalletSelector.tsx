"use client";

import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
} from "@chakra-ui/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect } from "react";
import { useFarcaster } from "../FarcasterMiniAppProvider";
import { useWallet } from "../../lib/hooks/useWallet";
import { useBaseAccountAuth } from "../../lib/hooks/useBaseAccountAuth";
import SignInWithBase from "../SignInWithBase";
import MagicalButton from "./MagicalButton";
import MagicalModal from "./MagicalModal";
import { COLORS } from "../../theme";

interface WalletSelectorProps {
  size?: "sm" | "md" | "lg";
  variant?: "compact" | "full";
}

export default function WalletSelector({
  size = "md",
  variant = "compact",
}: WalletSelectorProps) {
  const { isInMiniApp } = useFarcaster();
  const { isConnected, user, provider } = useWallet();
  const { isAuthenticated: isBaseAuth } = useBaseAccountAuth();

  const {
    isOpen: isWalletSelectOpen,
    onOpen: openWalletSelect,
    onClose: closeWalletSelect,
  } = useDisclosure();

  const {
    isOpen: isBaseAuthOpen,
    onOpen: openBaseAuth,
    onClose: closeBaseAuth,
  } = useDisclosure();

  // Log wallet connection issues for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Window ethereum:', window.ethereum);
      console.log('Available wallets:', window.ethereum?.isMetaMask ? 'MetaMask detected' : 'No MetaMask');
    }
  }, []);

  const handleBaseAuthSuccess = () => {
    closeBaseAuth();
    closeWalletSelect();
  };

  const handleBaseAuthError = (error: any) => {
    console.error("Base authentication failed:", error);
  };

  // In Farcaster frames, wallet is auto-connected, no selection needed
  if (isInMiniApp) {
    return null;
  }

  // If already connected, show current wallet info
  if (isConnected && user) {
    return (
      <Box>
        <Text fontSize="xs" color="gray.500" mb={1}>
          Connected via{" "}
          {provider === "base" ? "Base Account" : "External Wallet"}
        </Text>
        <Text fontSize="sm" fontWeight="medium">
          {user.address.slice(0, 6)}...{user.address.slice(-4)}
        </Text>
      </Box>
    );
  }

  return (
    <>
      {/* Trigger Button */}
      <MagicalButton
        onClick={openWalletSelect}
        size={size}
        variant="glass"
        leftIcon={null}
        rightIcon={null}
      >
        Connect Wallet
      </MagicalButton>

      {/* Wallet Selection Modal */}
      <MagicalModal
        isOpen={isWalletSelectOpen}
        onClose={closeWalletSelect}
        title="Choose Wallet"
        size="sm"
      >
        <VStack spacing={4}>
          <Text fontSize="sm" color="gray.600" textAlign="center">
            Select how you&apos;d like to connect
          </Text>

          {/* Base Account Option */}
          <Button
            onClick={openBaseAuth}
            size="lg"
            width="full"
            colorScheme="blue"
            leftIcon={
              <Box
                w="24px"
                h="24px"
                borderRadius="full"
                bg="blue.500"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="white"
                fontSize="sm"
                fontWeight="bold"
              >
                B
              </Box>
            }
          >
            Base Account
          </Button>

          {/* RainbowKit Option */}
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <Button
                onClick={() => {
                  closeWalletSelect();
                  openConnectModal();
                }}
                size="lg"
                width="full"
                variant="outline"
                colorScheme="purple"
                leftIcon={<Text fontSize="lg">🌈</Text>}
              >
                External Wallet
              </Button>
            )}
          </ConnectButton.Custom>

          <Text fontSize="xs" color="gray.500" textAlign="center">
            Base Account: Embedded wallet for easy onboarding
            <br />
            External Wallet: MetaMask, WalletConnect, etc.
          </Text>
        </VStack>
      </MagicalModal>

      {/* Base Auth Modal */}
      <MagicalModal
        isOpen={isBaseAuthOpen}
        onClose={closeBaseAuth}
        title="Connect with Base Account 🔵"
        borderColor={COLORS.ghibli.blue}
        size="sm"
      >
        <VStack spacing={4}>
          <Text fontSize="sm" color="gray.600" textAlign="center">
            Create or connect your Base Account
          </Text>
          <SignInWithBase
            onSuccess={handleBaseAuthSuccess}
            onError={handleBaseAuthError}
          />
          <Button
            onClick={() => {
              closeBaseAuth();
              openWalletSelect();
            }}
            variant="ghost"
            size="sm"
            w="full"
          >
            ← Back to wallet options
          </Button>
        </VStack>
      </MagicalModal>
    </>
  );
}