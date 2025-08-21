"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  HStack,
  Text,
  VStack,
  useDisclosure,
  Tooltip,
} from "@chakra-ui/react";
import { useUnifiedWallet } from "../../lib/hooks/useUnifiedWallet";
import { useFarcaster } from "../FarcasterFrameProvider";
import { useBaseAccountAuth } from "../../lib/hooks/useBaseAccountAuth";
import { useAutoConnection } from "../../lib/hooks/useAutoConnection";
import Web3Avatar from "../Web3Avatar";
import SignInWithBase from "../SignInWithBase";
import NetworkSwitcher from "./NetworkSwitcher";
import MagicalButton from "./MagicalButton";
import MagicalModal from "./MagicalModal";
import { COLORS, PATTERNS, INTERACTIONS, ANIMATION_PRESETS } from "../../theme";

export default function CompactWalletButton() {
  const { address, isConnected } = useAccount();
  const { isInFrame } = useFarcaster();
  const {
    user: baseUser,
    isAuthenticated: isBaseAuthenticated,
    signOut: baseSignOut,
  } = useBaseAccountAuth();

  const {
    isConnected: unifiedConnected,
    address: unifiedAddress,
    credits: unifiedCredits,
    user: unifiedUser,
    disconnect: unifiedDisconnect,
  } = useUnifiedWallet();

  const {
    isOpen: isBaseAuthOpen,
    onOpen: openBaseAuth,
    onClose: closeBaseAuth,
  } = useDisclosure();
  const [mounted, setMounted] = useState(false);
  const { isAutoConnecting } = useAutoConnection();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleBaseAuthSuccess = (result: any) => {
    console.log("Base authentication successful:", result);
    closeBaseAuth();
  };

  const handleBaseAuthError = (error: any) => {
    console.error("Base authentication failed:", error);
    closeBaseAuth();
  };

  const handleManualConnect = () => {
    // In frames, prioritize Base connection
    if (isInFrame) {
      openBaseAuth();
    } else {
      // For web app, could show options or default to RainbowKit
      openBaseAuth();
    }
  };

  const handleDisconnect = () => {
    if (baseUser && isBaseAuthenticated) {
      baseSignOut();
    }
    if (unifiedConnected) {
      unifiedDisconnect();
    }
  };

  const getDisplayCredits = () => {
    return unifiedCredits ?? baseUser?.credits ?? 0;
  };

  const getDisplayAddress = () => {
    return unifiedAddress ?? baseUser?.address ?? address;
  };

  const getNetworkIcon = () => {
    if (unifiedUser?.provider === "base" || isBaseAuthenticated) return "🔵";
    if (unifiedUser?.provider === "rainbowkit") return "🌿";
    return "🔗";
  };

  if (!mounted) {
    return (
      <MagicalButton
        size="sm"
        variant="glass"
        px={4}
        isLoading
        leftIcon={null}
        rightIcon={null}
      >
        Connecting...
      </MagicalButton>
    );
  }

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted: rbMounted,
      }) => {
        const ready = rbMounted && mounted;
        if (!ready) return null;

        // Handle unsupported chain
        if (chain?.unsupported) {
          return (
            <MagicalButton
              onClick={openChainModal}
              variant="danger"
              size="sm"
              px={3}
              leftIcon={<Text fontSize="xs">⚠️</Text>}
              rightIcon={null}
            >
              Switch Network
            </MagicalButton>
          );
        }

        // Connected state - unified display
        const hasConnection =
          account || isBaseAuthenticated || unifiedConnected;
        const displayAddress = getDisplayAddress();
        const displayCredits = getDisplayCredits();

        if (hasConnection && displayAddress) {
          return (
            <HStack spacing={2}>
              {/* Main wallet button */}
              <MagicalButton
                onClick={() => {
                  if (account) {
                    openAccountModal();
                  } else {
                    // In Farcaster frames, restrict disconnection to prevent connection issues
                    if (isInFrame) {
                      // Show wallet info only, no disconnect option
                      return;
                    } else {
                      // Handle Base or unified wallet menu for web app
                      const shouldDisconnect =
                        window.confirm("Disconnect wallet?");
                      if (shouldDisconnect) {
                        handleDisconnect();
                      }
                    }
                  }
                }}
                variant="glass"
                size="sm"
                px={3}
                leftIcon={<Web3Avatar address={displayAddress} size={18} />}
                rightIcon={null}
                cursor={isInFrame && !account ? "default" : "pointer"}
              >
                <VStack spacing={0} align="flex-start">
                  <HStack spacing={1}>
                    <Text fontSize="xs">{getNetworkIcon()}</Text>
                    <Text fontSize="xs" fontWeight="bold">
                      {displayAddress.slice(0, 4)}...{displayAddress.slice(-3)}
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color="whiteAlpha.700">
                    {displayCredits} credits
                  </Text>
                </VStack>
              </MagicalButton>

              {/* Network switcher - disabled in frames to prevent connection issues */}
              {!isInFrame && <NetworkSwitcher />}
            </HStack>
          );
        }

        // Not connected state
        return (
          <Box position="relative">
            <MagicalButton
              onClick={handleManualConnect}
              variant="primary"
              size="sm"
              isAnimated={true}
              isLoading={isAutoConnecting}
              loadingText="Connecting..."
              leftIcon={
                !isAutoConnecting ? (
                  <Box
                    w="3px"
                    h="3px"
                    bg="whiteAlpha.800"
                    borderRadius="full"
                    animation={ANIMATION_PRESETS.pulseDefault}
                  />
                ) : null
              }
              rightIcon={null}
            >
              {isAutoConnecting ? "Auto-connecting..." : "Connect ✨"}
            </MagicalButton>

            {/* Base Auth Modal */}
            <MagicalModal
              isOpen={isBaseAuthOpen}
              onClose={closeBaseAuth}
              title="Connect Wallet 🔵"
              borderColor={COLORS.ghibli.blue}
              size="sm"
            >
              <VStack spacing={4}>
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  Connect to start creating Ghibli art
                </Text>
                <SignInWithBase
                  onSuccess={handleBaseAuthSuccess}
                  onError={handleBaseAuthError}
                />
                {!isInFrame && (
                  <Button
                    onClick={() => {
                      closeBaseAuth();
                      openConnectModal();
                    }}
                    variant="ghost"
                    size="sm"
                    w="full"
                  >
                    Other Wallet Options
                  </Button>
                )}
              </VStack>
            </MagicalModal>
          </Box>
        );
      }}
    </ConnectButton.Custom>
  );
}
