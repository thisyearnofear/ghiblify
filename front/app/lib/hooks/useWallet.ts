/**
 * Wallet Hook - Single Source of Truth
 * 
 * Handles all wallet connections: RainbowKit and Base Account
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useBaseAccountAuth } from './useBaseAccountAuth';
import {
  walletService,
  WalletState,
  WalletUser,
  WalletProvider
} from '../services/unified-wallet-service';
import {
  shouldAttemptAutoConnect,
  getConnectionPriority,
  getConnectionDetails,
  WalletConnectionState
} from '../utils/auth-utils';

interface UseWalletReturn {
  // State
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  user: WalletUser | null;
  address: string | null;
  provider: WalletProvider | null;
  credits: number;
  
  // Actions
  connect: (address: string, provider: WalletProvider) => Promise<WalletUser>;
  disconnect: () => void;
  refreshCredits: () => Promise<number>;
  useCredits: (amount?: number) => Promise<number>;
}

export function useWallet(): UseWalletReturn {
  const [state, setState] = useState<WalletState>(walletService.getState());
  
  // External wallet hooks
  const { address: rainbowKitAddress, isConnected: isRainbowKitConnected } = useAccount();
  const { user: baseUser, isAuthenticated: isBaseAuthenticated } = useBaseAccountAuth();

  // Subscribe to wallet service changes
  useEffect(() => {
    const unsubscribe = walletService.subscribe(setState);
    return unsubscribe;
  }, []);

  // Auto-connect logic using shared utilities
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const autoConnect = async () => {
      const connectionState: WalletConnectionState = {
        isConnected: state.isConnected,
        isLoading: state.isLoading,
        rainbowKitAddress,
        isRainbowKitConnected,
        baseUser,
        isBaseAuthenticated,
      };

      // Check if we should attempt auto-connection
      if (!shouldAttemptAutoConnect(connectionState)) return;

      try {
        // Determine which connection should take priority
        const priority = getConnectionPriority(connectionState);
        if (!priority) return;

        // Get connection details for the prioritized method
        const connectionDetails = getConnectionDetails(priority, connectionState);
        if (!connectionDetails) return;

        // Attempt connection
        await walletService.connect(connectionDetails.address, connectionDetails.provider);
      } catch (error) {
        console.warn('Auto-connect failed:', error);
        // Set error state to display to user
        setState(prev => ({ ...prev, error: 'Failed to connect wallet. Please try again.' }));
      }
    };

    timeoutId = setTimeout(autoConnect, 100);
    return () => clearTimeout(timeoutId);
  }, [isRainbowKitConnected, rainbowKitAddress, isBaseAuthenticated, baseUser, state.isConnected, state.isLoading]);

  const connect = useCallback(async (address: string, provider: WalletProvider) => {
    return walletService.connect(address, provider);
  }, []);

  const disconnect = useCallback(() => {
    walletService.disconnect();
  }, []);

  const refreshCredits = useCallback(async () => {
    return walletService.refreshCredits();
  }, []);

  const useCredits = useCallback(async (amount: number = 1) => {
    return walletService.useCredits(amount);
  }, []);

  return {
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    error: state.error,
    user: state.user,
    address: state.user?.address || null,
    provider: state.user?.provider || null,
    credits: state.user?.credits || 0,
    connect,
    disconnect,
    refreshCredits,
    useCredits,
  };
}