"use client";

import { Box, Button, HStack, Text, Tooltip } from "@chakra-ui/react";
import { useState } from "react";
import { useWallet } from "../../lib/hooks/useWallet";
import { useSwitchChain, useChainId } from "wagmi";
import { base } from "wagmi/chains";
import { celoMainnet } from "../../providers/Web3Provider";
import { useFarcaster } from "../FarcasterFrameProvider";
import { COLORS, INTERACTIONS } from "../../theme";

interface NetworkSwitcherProps {
  size?: "sm" | "md";
  showLabel?: boolean;
}

export default function NetworkSwitcher({
  size = "sm",
  showLabel = false,
}: NetworkSwitcherProps) {
  const { user, address } = useWallet();
  const { isInFrame } = useFarcaster();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const [networkError, setNetworkError] = useState<string | null>(null);

  if (!user || !address) {
    return null;
  }

  // Determine current and target networks
  const isOnBase = chainId === base.id;
  const isOnCelo = chainId === celoMainnet.id;
  const currentNetwork = isOnBase ? "Base" : isOnCelo ? "Celo" : "Unknown";
  const targetChain = isOnBase ? celoMainnet : base;
  const targetNetwork = isOnBase ? "Celo" : "Base";

  const handleNetworkSwitch = async () => {
    if (isPending) return;

    setNetworkError(null);
    try {
      await switchChain({ chainId: targetChain.id });
    } catch (error) {
      console.error("Error switching networks:", error);
      setNetworkError(
        `Failed to switch to ${targetNetwork}. Please try again.`
      );
    }
  };

  // Only show in Farcaster frames where chain switching makes sense
  if (!isInFrame) {
    return null;
  }

  return (
    <Box>
      {networkError && (
        <Text fontSize="xs" color="red.300" mb={2}>
          {networkError}
        </Text>
      )}

      <Tooltip
        label={`Connected to ${currentNetwork}. Click to switch to ${targetNetwork}`}
        hasArrow
        placement="bottom"
      >
        <Button
          size={size}
          variant="outline"
          colorScheme={isOnBase ? "blue" : "yellow"}
          onClick={handleNetworkSwitch}
          isLoading={isPending}
          loadingText="Switching..."
          leftIcon={<Text fontSize="xs">{isOnBase ? "🔵" : "🟡"}</Text>}
        >
          <Text fontSize="xs">{currentNetwork}</Text>
        </Button>
      </Tooltip>
    </Box>
  );
}
