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
import { useFarcaster } from '../hooks/useFarcaster';
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
  useCredits: (amount?: number) => Promise<number>;
  addCredits: (amount: number) => Promise<number>;
  
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

  // Auto-connect when external wallets connect
  useEffect(() => {
    const autoConnect = async () => {
      // Don't auto-connect if already connected or loading
      if (connection.isConnected || connection.isLoading) return;

      try {
        // Priority 1: RainbowKit connection
        if (isRainbowKitConnected && rainbowKitAddress) {
          await unifiedWalletService.connectRainbowKit(rainbowKitAddress);
          return;
        }

        // Priority 2: Base Account connection
        if (isBaseAuthenticated && baseUser?.address) {
          await unifiedWalletService.connectBase(baseUser.address);
          return;
        }

        // Priority 3: Farcaster Frame (if in frame)
        if (isInFrame && rainbowKitAddress) {
          await unifiedWalletService.connectFarcaster(rainbowKitAddress);
          return;
        }
      } catch (error) {
        console.warn('Auto-connect failed:', error);
      }
    };

    autoConnect();
  }, [
    isRainbowKitConnected, 
    rainbowKitAddress, 
    isBaseAuthenticated, 
    baseUser, 
    isInFrame,
    connection.isConnected,
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

  const useCredits = useCallback(async (amount: number = 1) => {
    return await unifiedWalletService.useCredits(amount);
  }, []);

  const addCredits = useCallback(async (amount: number) => {
    return await unifiedWalletService.addCredits(amount);
  }, []);

  const clearError = useCallback(() => {
    // This would need to be implemented in the service
    console.log('Clear error called');
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
    useCredits,
    addCredits,
    
    // Utilities
    clearError,
  };
}
