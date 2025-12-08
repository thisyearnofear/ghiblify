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
import { useWallet } from "../../lib/hooks/useWallet";
import { useFarcaster } from "../FarcasterMiniAppProvider";
import { useBaseAccountAuth } from "../../lib/hooks/useBaseAccountAuth";
import Web3Avatar from "../Web3Avatar";
import SignInWithBase from "../SignInWithBase";
import NetworkSwitcher from "./NetworkSwitcher";
import WalletSelector from "./WalletSelector";
import MagicalButton from "./MagicalButton";
import MagicalModal from "./MagicalModal";
import { COLORS, PATTERNS, INTERACTIONS, ANIMATION_PRESETS } from "../../theme";

export default function CompactWalletButton() {
  const { address, isConnected } = useAccount();
  const { isInMiniApp } = useFarcaster();
  const { signOut: baseSignOut, isAuthenticated: isBaseAuthenticated } =
    useBaseAccountAuth();
  const {
    isConnected: walletConnected,
    address: walletAddress,
    credits,
    disconnect,
    user,
  } = useWallet();

  const {
    isOpen: isBaseAuthOpen,
    onOpen: openBaseAuth,
    onClose: closeBaseAuth,
  } = useDisclosure();
  const [mounted, setMounted] = useState(false);

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

  const handleDisconnect = () => {
    baseSignOut();
    disconnect();
  };

  const displayAddress = walletAddress || address;
  const displayCredits = credits;

  const getNetworkIcon = () => {
    if (user?.provider === "base" || isBaseAuthenticated) return "🔵";
    if (user?.provider === "rainbowkit") return "🌿";
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

        // Connected state
        const hasConnection = account || walletConnected;

        if (hasConnection && displayAddress) {
          return (
            <HStack spacing={2}>
              {/* Main wallet button */}
              <MagicalButton
                onClick={() => {
                  if (account) {
                    openAccountModal();
                  } else if (!isInMiniApp) {
                    const shouldDisconnect =
                      window.confirm("Disconnect wallet?");
                    if (shouldDisconnect) {
                      handleDisconnect();
                    }
                  }
                }}
                variant="glass"
                size="sm"
                px={3}
                leftIcon={<Web3Avatar address={displayAddress} size={18} />}
                rightIcon={null}
                cursor={isInMiniApp && !account ? "default" : "pointer"}
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

              {/* Network switcher - enabled in frames for better network handling */}
              <NetworkSwitcher />
            </HStack>
          );
        }

        // Not connected state - use environment-aware wallet selector
        return (
          <Box position="relative">
            {isInMiniApp ? (
              // In Farcaster frames, show Base Account auth directly
              <MagicalButton
                onClick={openBaseAuth}
                variant="primary"
                size="sm"
                isAnimated={true}
                leftIcon={
                  <Box
                    w="3px"
                    h="3px"
                    bg="whiteAlpha.800"
                    borderRadius="full"
                    animation={ANIMATION_PRESETS.pulseDefault}
                  />
                }
                rightIcon={null}
              >
                Connect ✨
              </MagicalButton>
            ) : (
              // In web app, show wallet selection
              <WalletSelector size="sm" />
            )}

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
                {!isInMiniApp && (
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