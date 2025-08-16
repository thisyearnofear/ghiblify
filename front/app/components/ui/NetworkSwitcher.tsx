"use client";

import { Box, Button, HStack, Text, Tooltip } from "@chakra-ui/react";
import { useState } from "react";
import { useUnifiedWallet } from "../../lib/hooks/useUnifiedWallet";
import { autoConnectionService, NetworkPreference } from "../../lib/services/auto-connection-service";
import { COLORS, INTERACTIONS } from "../../theme";

interface NetworkSwitcherProps {
  size?: "sm" | "md";
  showLabel?: boolean;
}

export default function NetworkSwitcher({ size = "sm", showLabel = false }: NetworkSwitcherProps) {
  const { user, address } = useUnifiedWallet();
  const [isLoading, setIsLoading] = useState(false);

  if (!user || !address) {
    return null;
  }

  const currentNetwork = user.provider === 'base' ? 'base' : 'celo';
  const otherNetwork: NetworkPreference = currentNetwork === 'base' ? 'celo' : 'base';

  const handleNetworkSwitch = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const success = await autoConnectionService.switchNetwork(address, otherNetwork);
      if (!success) {
        console.error('Network switch failed');
      }
    } catch (error) {
      console.error('Error switching networks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentNetworkIcon = () => {
    switch (currentNetwork) {
      case 'base':
        return '🔵';
      case 'celo':
        return '🌿';
      default:
        return '🔗';
    }
  };

  const getNetworkDisplayName = (network: NetworkPreference) => {
    return autoConnectionService.getNetworkDisplayName(
      network === 'base' ? 'base' : 'rainbowkit'
    );
  };

  return (
    <HStack spacing={2}>
      {showLabel && (
        <Text fontSize="xs" color="whiteAlpha.800">
          Network:
        </Text>
      )}
      
      <Tooltip 
        label={`Switch to ${getNetworkDisplayName(otherNetwork)}`}
        placement="bottom"
      >
        <Button
          size={size}
          variant="ghost"
          onClick={handleNetworkSwitch}
          isLoading={isLoading}
          px={3}
          py={1}
          minH="auto"
          h="auto"
          color="whiteAlpha.900"
          _hover={{
            ...INTERACTIONS.scaleHover,
            bg: "whiteAlpha.200",
          }}
          transition="all 0.2s ease"
        >
          <HStack spacing={1}>
            <Text fontSize="sm">{getCurrentNetworkIcon()}</Text>
            <Text fontSize="xs" fontWeight="medium">
              {getNetworkDisplayName(currentNetwork)}
            </Text>
          </HStack>
        </Button>
      </Tooltip>
    </HStack>
  );
}