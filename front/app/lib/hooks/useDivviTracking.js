/**
 * Divvi Tracking Hook
 * Lightweight hook for adding Divvi referral tracking to existing transactions
 * Designed for minimal performance impact and seamless integration
 */

import { useCallback, useMemo } from 'react';
import { useAccount, usePublicClient } from 'wagmi';

// Divvi configuration
const DIVVI_CONFIG = {
  consumerAddress: process.env.NEXT_PUBLIC_DIVVI_CONSUMER_ADDRESS || '0x55A5705453Ee82c742274154136Fce8149597058',
  enabled: process.env.NEXT_PUBLIC_DIVVI_ENABLED !== 'false',
  supportedChains: [42220, 8453], // Celo and Base
};

export function useDivviTracking() {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  // Check if Divvi is available
  const isDivviAvailable = useMemo(() => {
    try {
      // Check if SDK is loaded
      return DIVVI_CONFIG.enabled && 
             typeof window !== 'undefined' && 
             window.getReferralTag && 
             window.submitReferral;
    } catch {
      return false;
    }
  }, []);

  // Get current chain ID
  const chainId = useMemo(() => {
    return publicClient?.chain?.id || 8453; // Default to Base
  }, [publicClient]);

  // Check if current chain is supported
  const isChainSupported = useMemo(() => {
    return DIVVI_CONFIG.supportedChains.includes(chainId);
  }, [chainId]);

  // Generate referral tag
  const generateReferralTag = useCallback(async () => {
    if (!isDivviAvailable || !isChainSupported || !address) {
      return '';
    }

    try {
      // Dynamically import Divvi SDK to avoid build issues
      const { getReferralTag } = await import('@divvi/referral-sdk');
      
      const referralTag = getReferralTag({
        user: address,
        consumer: DIVVI_CONFIG.consumerAddress,
      });

      console.log(`[Divvi] Generated referral tag for ${address} on chain ${chainId}`);
      return referralTag;
    } catch (error) {
      console.warn('[Divvi] Failed to generate referral tag:', error);
      return '';
    }
  }, [isDivviAvailable, isChainSupported, address, chainId]);

  // Submit referral after transaction
  const submitReferral = useCallback(async (txHash) => {
    if (!isDivviAvailable || !isChainSupported || !txHash) {
      return;
    }

    try {
      // Dynamically import Divvi SDK
      const { submitReferral: submitRef } = await import('@divvi/referral-sdk');
      
      await submitRef({
        txHash,
        chainId,
      });

      console.log(`[Divvi] Successfully submitted referral for tx ${txHash} on chain ${chainId}`);
    } catch (error) {
      // Don't throw - referral submission failure shouldn't break user flow
      console.warn('[Divvi] Failed to submit referral:', error);
    }
  }, [isDivviAvailable, isChainSupported, chainId]);

  // Enhanced transaction wrapper
  const withDivviTracking = useCallback(async (executeTransaction) => {
    try {
      // Execute the original transaction
      const result = await executeTransaction();
      
      // Submit referral tracking in background (non-blocking)
      if (result && result.hash) {
        submitReferral(result.hash).catch(error => {
          console.warn('[Divvi] Background referral submission failed:', error);
        });
      }
      
      return result;
    } catch (error) {
      // Don't interfere with original error handling
      throw error;
    }
  }, [submitReferral]);

  return {
    isDivviEnabled: isDivviAvailable && isChainSupported,
    generateReferralTag,
    submitReferral,
    withDivviTracking,
    config: {
      consumerAddress: DIVVI_CONFIG.consumerAddress,
      chainId,
      isChainSupported,
    },
  };
}