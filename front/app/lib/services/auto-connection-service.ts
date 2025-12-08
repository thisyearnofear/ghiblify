/**
 * Enhanced Auto Connection Service
 * - Centralizes network switching for RainbowKit/wagmi with retry logic
 * - Includes stabilization delays and network readiness checks
 * - Maintains backward compatibility
 */
'use client';

import { switchChain, getChainId } from '@wagmi/core';
import { config } from '../../config/wagmi-config';

// Supported chains mapping by name
const CHAIN_BY_KEY: Record<string, number> = {
  base: 8453,
  celo: 42220,
  mainnet: 1,
  polygon: 137,
};

// Network switching options
export interface NetworkSwitchOptions {
  maxRetries?: number;
  stabilizationDelay?: number;
  retryDelay?: number;
  onProgress?: (step: string) => void;
  onError?: (error: Error, attempt: number) => void;
}

// Default options
const DEFAULT_OPTIONS: Required<NetworkSwitchOptions> = {
  maxRetries: 3,
  stabilizationDelay: 2000,
  retryDelay: 1000,
  onProgress: () => {},
  onError: () => {},
};

/**
 * Enhanced chain switching with retry logic and stabilization
 */
async function switchToChainIdWithRetry(
   targetChainId: number,
   options: NetworkSwitchOptions = {}
 ): Promise<boolean> {
   const opts = { ...DEFAULT_OPTIONS, ...options };
   const { maxRetries, stabilizationDelay, retryDelay, onProgress, onError } = opts;

   for (let attempt = 1; attempt <= maxRetries; attempt++) {
     try {
       onProgress(`Switching to network ${targetChainId} (attempt ${attempt}/${maxRetries})`);

       // Attempt to switch chain
       await switchChain(config, { chainId: targetChainId });

      // Wait for stabilization
      onProgress('Network switched, stabilizing connection...');
      await delay(stabilizationDelay);

      // Verify we're on the correct network
      if (await verifyNetworkReady(targetChainId)) {
        onProgress('Network ready for transactions');
        return true;
      } else {
        throw new Error('Network verification failed');
      }

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      onError(err, attempt);

      // If this was the last attempt, don't retry
      if (attempt === maxRetries) {
        console.error(`[auto-connection] Failed to switch to chain ${targetChainId} after ${maxRetries} attempts:`, err);
        return false;
      }

      // Wait before retrying
      onProgress(`Retrying in ${retryDelay}ms...`);
      await delay(retryDelay);
    }
  }

  return false;
}

/**
 * Verify that the network is ready for transactions
 */
async function verifyNetworkReady(targetChainId: number): Promise<boolean> {
   try {
     // Check if wagmi reports the correct chain
     const currentChainId = getChainId(config);
     return currentChainId === targetChainId;
   } catch (error) {
     console.warn('[auto-connection] Network verification failed:', error);
     return false;
   }
 }

/**
 * Simple delay utility
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Legacy simple switch function for backward compatibility
 */
async function switchToChainId(targetChainId: number): Promise<boolean> {
   try {
     await switchChain(config, { chainId: targetChainId });
     return true;
   } catch (err) {
     console.warn('[auto-connection] switchChain failed:', err);
     return false;
   }
 }

export const autoConnectionService = {
  /**
   * Enhanced network switching with retry logic and stabilization
   * @param address User address (for future use)
   * @param networkKey Network key ('base' | 'celo' | 'mainnet' | 'polygon')
   * @param options Configuration options
   */
  async switchNetworkWithRetry(
    address: string | undefined,
    networkKey: string,
    options: NetworkSwitchOptions = {}
  ): Promise<boolean> {
    const chainId = CHAIN_BY_KEY[networkKey];
    if (!chainId) {
      console.warn(`[auto-connection] Unknown network key: ${networkKey}`);
      return false;
    }

    return switchToChainIdWithRetry(chainId, options);
  },

  /**
   * Simple network switch (backward compatibility)
   * @param address kept for backward compatibility (unused)
   * @param networkKey 'base' | 'celo' | 'mainnet' | 'polygon'
   */
  async switchNetwork(address: string | undefined, networkKey: string): Promise<boolean> {
    const id = CHAIN_BY_KEY[networkKey];
    if (!id) return false;
    return switchToChainId(id);
  },

  /**
   * Get supported networks
   */
  getSupportedNetworks(): Record<string, number> {
    return { ...CHAIN_BY_KEY };
  },

  /**
   * Check if a network is supported
   */
  isNetworkSupported(networkKey: string): boolean {
    return networkKey in CHAIN_BY_KEY;
  },
};

export default autoConnectionService;