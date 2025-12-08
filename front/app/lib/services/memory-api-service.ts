/**
 * Memory API Service
 * 
 * Integrates with the Memory Protocol through our backend endpoints
 * to provide cross-platform identity mapping and social graph analysis capabilities.
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

class MemoryApiService {
  // Cache for storing recently fetched data
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if Memory API is configured and available
   */
  isAvailable(): boolean {
    // Disable Memory API integration until MEMORY_API_KEY is configured
    // The backend endpoint returns 503 if not configured
    return false;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  /**
   * Get cached data if available and valid
   */
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }
    // Remove expired cache entry
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cached data
   */
  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clear cache for a specific key
   */
  clearCache(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Get identity graph for a Farcaster username
   * @param username Farcaster username (e.g., 'vitalik.eth')
   */
  async getIdentityGraphByFarcasterUsername(username: string): Promise<MemoryIdentityGraph | null> {
    const cacheKey = `identity-graph-farcaster-${username}`;
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await api.post('/api/memory/identity-graph', {
        identifier: username,
        identifier_type: 'farcaster'
      });
      
      const result = response.identity_graph;
      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Failed to fetch identity graph:', error);
      return null;
    }
  }

  /**
   * Get identity graph for a wallet address
   * @param address Ethereum wallet address
   */
  async getIdentityGraphByAddress(address: string): Promise<MemoryIdentityGraph | null> {
    const cacheKey = `identity-graph-address-${address}`;
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await api.post('/api/memory/identity-graph', {
        identifier: address,
        identifier_type: 'address'
      });
      
      const result = response.identity_graph;
      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Failed to fetch identity graph:', error);
      return null;
    }
  }

  /**
   * Map Farcaster username to wallet address using Memory API
   * @param username Farcaster username
   */
  async getWalletAddressForFarcasterUser(username: string): Promise<string | null> {
    const cacheKey = `wallet-address-${username}`;
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await api.get(`/api/memory/wallet-address/${encodeURIComponent(username)}`);
      const result = response.wallet_address;
      this.setCachedData(cacheKey, result);
      return result;
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
    const isAddress = identifier.startsWith('0x') && identifier.length === 42;
    const type = isAddress ? 'address' : 'farcaster';
    const cacheKey = `social-graph-${type}-${identifier}`;
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await api.post('/api/memory/social-graph', {
        identifier: identifier,
        identifier_type: type
      });
      
      const result = response.social_graph;
      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Failed to fetch social graph:', error);
      return null;
    }
  }

  /**
   * Create a unified user profile combining wallet and social data
   * @param address Wallet address
   * @param farcasterUsername Farcaster username (optional)
   */
  async createUnifiedProfile(address: string, farcasterUsername?: string, forceRefresh: boolean = false): Promise<any> {
    const cacheKey = `unified-profile-${address}-${farcasterUsername || 'no-farcaster'}`;
    
    // If force refresh is requested, clear the cache for this key
    if (forceRefresh) {
      this.clearCache(cacheKey);
    } else {
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    try {
      const response = await api.post('/api/memory/unified-profile', {
        address: address,
        farcaster_username: farcasterUsername
      });
      
      const result = response;
      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Failed to create unified profile:', error);
      return null;
    }
  }
}

// Export singleton instance
export const memoryApiService = new MemoryApiService();