/**
 * React hook for Memory API integration
 * 
 * Provides cross-platform identity mapping and social graph analysis capabilities
 * for Farcaster, wallet addresses, and other identity platforms.
 */

'use client';

import { useState, useCallback } from 'react';
import { api } from '../config/api';

interface IdentityRequest {
  identifier: string;
  identifier_type: 'address' | 'farcaster';
}

interface UnifiedProfileRequest {
  address: string;
  farcaster_username?: string;
}

interface UseMemoryApiReturn {
  // Identity mapping
  getIdentityGraph: (identifier: string, type: 'address' | 'farcaster') => Promise<any>;
  getSocialGraph: (identifier: string, type: 'address' | 'farcaster') => Promise<any>;
  getWalletAddressForFarcasterUser: (username: string) => Promise<string | null>;
  createUnifiedProfile: (address: string, farcasterUsername?: string) => Promise<any>;
  
  // State
  isLoading: boolean;
  error: string | null;
}

export function useMemoryApi(): UseMemoryApiReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getIdentityGraph = useCallback(async (identifier: string, type: 'address' | 'farcaster'): Promise<any> => {
    setIsLoading(true);
    setError(null);

    try {
      const request: IdentityRequest = { identifier, identifier_type: type };
      const response = await api.post('/api/memory/identity-graph', request);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch identity graph';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSocialGraph = useCallback(async (identifier: string, type: 'address' | 'farcaster'): Promise<any> => {
    setIsLoading(true);
    setError(null);

    try {
      const request: IdentityRequest = { identifier, identifier_type: type };
      const response = await api.post('/api/memory/social-graph', request);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch social graph';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getWalletAddressForFarcasterUser = useCallback(async (username: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get(`/api/memory/wallet-address/${encodeURIComponent(username)}`);
      return response.wallet_address;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to map Farcaster user to wallet address';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createUnifiedProfile = useCallback(async (address: string, farcasterUsername?: string): Promise<any> => {
    setIsLoading(true);
    setError(null);

    try {
      const request: UnifiedProfileRequest = { address, farcaster_username: farcasterUsername };
      const response = await api.post('/api/memory/unified-profile', request);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create unified profile';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    getIdentityGraph,
    getSocialGraph,
    getWalletAddressForFarcasterUser,
    createUnifiedProfile,
    isLoading,
    error,
  };
}