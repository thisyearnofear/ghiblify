/**
 * Unified Wallet Hook
 * 
 * Single hook for all wallet interactions across the platform.
 * Handles RainbowKit, Base Account, and Farcaster connections uniformly.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useBaseAccountAuth } from './useBaseAccountAuth';
import { useFarcaster } from '../../components/FarcasterFrameProvider';
import { 
  unifiedWalletService, 
  WalletConnection, 
  UnifiedWalletUser,
  WalletProvider 
} from '../services/unified-wallet-service';

export interface UseUnifiedWalletReturn {
  // Connection state
  isConnected: boolean;
  user: UnifiedWalletUser | null;
  isLoading: boolean;
  error: string | null;
  
  // Wallet info
  address: string | null;
  provider: WalletProvider | null;
  credits: number;
  
  // Actions
  connectRainbowKit: () => Promise<void>;
  connectBase: () => Promise<void>;
  disconnect: () => void;
  
  // Credits
  refreshCredits: () => Promise<void>;
  spendCredits: (amount?: number) => Promise<number>;
  addCredits: (amount: number) => Promise<number>;
  refundCredits: (amount: number) => Promise<number>;
  
  // Utilities
  clearError: () => void;
}

export function useUnifiedWallet(): UseUnifiedWalletReturn {
  const [connection, setConnection] = useState<WalletConnection>(
    unifiedWalletService.getConnection()
  );

  // External wallet hooks
  const { address: rainbowKitAddress, isConnected: isRainbowKitConnected } = useAccount();
  const { user: baseUser, isAuthenticated: isBaseAuthenticated, authenticate: baseAuthenticate } = useBaseAccountAuth();
  const { isInFrame } = useFarcaster();

  // Subscribe to unified wallet service changes
  useEffect(() => {
    const unsubscribe = unifiedWalletService.onConnectionChange(setConnection);
    return unsubscribe;
  }, []);

  // Auto-connect when external wallets connect with proper cleanup
  useEffect(() => {
    let isConnecting = false;
    let timeoutId: NodeJS.Timeout;

    const autoConnect = async () => {
      // Prevent concurrent connection attempts
      if (isConnecting || connection.isLoading) return;

      try {
        // In Farcaster frame, prioritize Base Account for Base Pay compatibility
        if (isInFrame) {
          // Priority 1: Base Account (for Base Pay functionality)
          if (isBaseAuthenticated && baseUser?.address) {
            if (!connection.isConnected || 
                (connection.user?.provider !== 'base' && connection.user?.address !== baseUser.address.toLowerCase())) {
              isConnecting = true;
              await unifiedWalletService.connectBase(baseUser.address);
              isConnecting = false;
            }
            return;
          }

          // Priority 2: RainbowKit connection (for Celo support)
          if (isRainbowKitConnected && rainbowKitAddress) {
            if (!connection.isConnected) {
              isConnecting = true;
              await unifiedWalletService.connectRainbowKit(rainbowKitAddress);
              isConnecting = false;
            }
            return;
          }

          // Fallback: Farcaster frame connection
          if (rainbowKitAddress && !connection.isConnected) {
            await unifiedWalletService.connectFarcaster(rainbowKitAddress);
          }
          return;
        }

        // Regular web app logic - more aggressive switching allowed
        // Priority 1: RainbowKit connection (highest priority)
        if (isRainbowKitConnected && rainbowKitAddress) {
          // If already connected to this exact RainbowKit address, do nothing
          if (connection.isConnected &&
              connection.user?.provider === 'rainbowkit' &&
              connection.user?.address === rainbowKitAddress.toLowerCase()) {
            return;
          }

          isConnecting = true;

          // If currently connected to a different provider or address, disconnect first
          if (connection.isConnected) {
            console.log('[Unified Wallet] Switching to RainbowKit, disconnecting current wallet');
            unifiedWalletService.disconnect();
            // Small delay to allow state to settle
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          await unifiedWalletService.connectRainbowKit(rainbowKitAddress);
          isConnecting = false;
          return;
        }

        // If RainbowKit disconnected but we're still connected to it, disconnect
        if (!isRainbowKitConnected && connection.isConnected && connection.user?.provider === 'rainbowkit') {
          console.log('[Unified Wallet] RainbowKit disconnected, cleaning up');
          unifiedWalletService.disconnect();
          return;
        }

        // Priority 2: Base Account connection (only if RainbowKit not connected)
        if (!isRainbowKitConnected && isBaseAuthenticated && baseUser?.address) {
          // If already connected to this exact Base address, do nothing
          if (connection.isConnected &&
              connection.user?.provider === 'base' &&
              connection.user?.address === baseUser.address.toLowerCase()) {
            return;
          }

          isConnecting = true;

          // If currently connected to a different provider or address, disconnect first
          if (connection.isConnected) {
            console.log('[Unified Wallet] Switching to Base Account, disconnecting current wallet');
            unifiedWalletService.disconnect();
            // Small delay to allow state to settle
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          await unifiedWalletService.connectBase(baseUser.address);
          isConnecting = false;
          return;
        }

        // If Base disconnected but we're still connected to it, disconnect
        if (!isBaseAuthenticated && connection.isConnected && connection.user?.provider === 'base') {
          console.log('[Unified Wallet] Base Account disconnected, cleaning up');
          unifiedWalletService.disconnect();
          return;
        }
      } catch (error) {
        console.warn('Auto-connect failed:', error);
        isConnecting = false;
      }
    };

    // Use longer delay in Farcaster frame to prevent rapid switching
    const delay = isInFrame ? 200 : 50;
    timeoutId = setTimeout(autoConnect, delay);

    return () => {
      clearTimeout(timeoutId);
      isConnecting = false;
    };
  }, [
    isRainbowKitConnected,
    rainbowKitAddress,
    isBaseAuthenticated,
    baseUser,
    isInFrame,
    connection.isConnected,
    connection.user,
    connection.isLoading
  ]);

  // Actions
  const connectRainbowKit = useCallback(async () => {
    if (!rainbowKitAddress) {
      throw new Error('RainbowKit wallet not connected');
    }
    await unifiedWalletService.connectRainbowKit(rainbowKitAddress);
  }, [rainbowKitAddress]);

  const connectBase = useCallback(async () => {
    try {
      // If not already authenticated with Base, authenticate first
      if (!isBaseAuthenticated) {
        await baseAuthenticate();
      }
      
      // Get the authenticated user
      const currentBaseUser = baseUser || unifiedWalletService.getConnection().user;
      if (!currentBaseUser?.address) {
        throw new Error('Base Account authentication failed');
      }
      
      await unifiedWalletService.connectBase(currentBaseUser.address);
    } catch (error) {
      throw new Error(`Base connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [isBaseAuthenticated, baseAuthenticate, baseUser]);

  const disconnect = useCallback(() => {
    unifiedWalletService.disconnect();
  }, []);

  const refreshCredits = useCallback(async () => {
    await unifiedWalletService.refreshCredits();
  }, []);

  const spendCredits = useCallback(async (amount: number = 1) => {
    return await unifiedWalletService.useCredits(amount);
  }, []);

  const addCredits = useCallback(async (amount: number) => {
    return await unifiedWalletService.addCredits(amount);
  }, []);

  const refundCredits = useCallback(async (amount: number) => {
    return await unifiedWalletService.refundCredits(amount);
  }, []);

  const clearError = useCallback(() => {
    // This would need to be implemented in the service
    console.log('Clear error called');
  }, []);

  // Debug utilities (only in development)
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      (window as any).debugWallet = {
        getState: () => unifiedWalletService.getConnection(),
        forceReset: () => unifiedWalletService.forceReset(),
        disconnect: () => unifiedWalletService.disconnect(),
        clearStorage: () => {
          localStorage.removeItem('ghiblify_wallet_state');
          localStorage.removeItem('ghiblify_auth');
          console.log('Cleared all wallet storage');
        }
      };
    }
  }, []);

  // Derived state
  const isConnected = connection.isConnected;
  const user = connection.user;
  const isLoading = connection.isLoading;
  const error = connection.error;
  const address = user?.address || null;
  const provider = user?.provider || null;
  const credits = user?.credits || 0;

  return {
    // Connection state
    isConnected,
    user,
    isLoading,
    error,
    
    // Wallet info
    address,
    provider,
    credits,
    
    // Actions
    connectRainbowKit,
    connectBase,
    disconnect,
    
    // Credits
    refreshCredits,
    spendCredits,
    addCredits,
    refundCredits,
    
    // Utilities
    clearError,
  };
}
