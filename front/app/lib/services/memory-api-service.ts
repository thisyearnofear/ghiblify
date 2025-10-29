/**
 * Memory API Service
 * 
 * Integrates with the Memory Protocol to provide cross-platform identity mapping
 * and social graph analysis capabilities.
 * 
 * This service extends the existing wallet functionality to:
 * - Map Farcaster identities to wallet addresses
 * - Retrieve cross-platform identity graphs
 * - Enable social graph analysis features
 */

import { api } from '../config/api';

// Types for Memory API responses
export interface MemoryIdentity {
  id: string;
  username: string | null;
  url: string | null;
  avatar: string | null;
  platform: string;
  social: any | null;
  sources: any[];
}

export interface MemoryIdentityGraph {
  [platform: string]: MemoryIdentity;
}

// Memory API configuration
const MEMORY_API_BASE_URL = 'https://api.memoryproto.co/v1';
const MEMORY_API_KEY = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MEMORY_API_KEY || '';

class MemoryApiService {
  private apiKey: string;

  constructor() {
    this.apiKey = MEMORY_API_KEY;
  }

  /**
   * Check if Memory API is configured and available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get identity graph for a Farcaster username
   * @param username Farcaster username (e.g., 'vitalik.eth')
   */
  async getIdentityGraphByFarcasterUsername(username: string): Promise<MemoryIdentityGraph | null> {
    if (!this.isAvailable()) {
      console.warn('Memory API not configured - skipping identity graph retrieval');
      return null;
    }

    try {
      const response = await fetch(
        `${MEMORY_API_BASE_URL}/identity-graph/farcaster/${encodeURIComponent(username)}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Memory API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch identity graph from Memory API:', error);
      return null;
    }
  }

  /**
   * Get identity graph for a wallet address
   * @param address Ethereum wallet address
   */
  async getIdentityGraphByAddress(address: string): Promise<MemoryIdentityGraph | null> {
    if (!this.isAvailable()) {
      console.warn('Memory API not configured - skipping identity graph retrieval');
      return null;
    }

    try {
      const response = await fetch(
        `${MEMORY_API_BASE_URL}/identity-graph/address/${encodeURIComponent(address)}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Memory API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch identity graph from Memory API:', error);
      return null;
    }
  }

  /**
   * Map Farcaster username to wallet address using Memory API
   * @param username Farcaster username
   */
  async getWalletAddressForFarcasterUser(username: string): Promise<string | null> {
    try {
      const identityGraph = await this.getIdentityGraphByFarcasterUsername(username);
      
      if (!identityGraph) return null;

      // Look for Ethereum address in the identity graph
      for (const [platform, identity] of Object.entries(identityGraph)) {
        if (platform === 'ethereum' && identity.id) {
          return identity.id;
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to map Farcaster user to wallet address:', error);
      return null;
    }
  }

  /**
   * Get social graph data for a user
   * @param identifier User identifier (wallet address or Farcaster username)
   */
  async getSocialGraph(identifier: string): Promise<any> {
    if (!this.isAvailable()) {
      console.warn('Memory API not configured - skipping social graph retrieval');
      return null;
    }

    try {
      // Determine if identifier is a wallet address or Farcaster username
      const isAddress = identifier.startsWith('0x') && identifier.length === 42;
      
      const endpoint = isAddress 
        ? `${MEMORY_API_BASE_URL}/social-graph/address/${encodeURIComponent(identifier)}`
        : `${MEMORY_API_BASE_URL}/social-graph/farcaster/${encodeURIComponent(identifier)}`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Memory API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch social graph from Memory API:', error);
      return null;
    }
  }

  /**
   * Create a unified user profile combining wallet and social data
   * @param address Wallet address
   * @param farcasterUsername Farcaster username (optional)
   */
  async createUnifiedProfile(address: string, farcasterUsername?: string): Promise<any> {
    try {
      // Get wallet-based identity graph
      const walletIdentityGraph = await this.getIdentityGraphByAddress(address);
      
      // Get Farcaster-based identity graph if username provided
      const farcasterIdentityGraph = farcasterUsername 
        ? await this.getIdentityGraphByFarcasterUsername(farcasterUsername)
        : null;

      // Get social graph data
      const socialGraph = await this.getSocialGraph(address);

      return {
        wallet: {
          address,
          identities: walletIdentityGraph || {},
        },
        farcaster: {
          username: farcasterUsername,
          identities: farcasterIdentityGraph || {},
        },
        social: socialGraph || {},
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Failed to create unified profile:', error);
      return null;
    }
  }
}

// Export singleton instance
export const memoryApiService = new MemoryApiService();