/**
 * Unified Wallet Service - Single Source of Truth
 *
 * Consolidates all wallet functionality:
 * - RainbowKit (external wallets)
 * - Base Account (embedded wallet)
 * - Credit management and persistence
 * - Memory API integration for cross-platform identity mapping
 * - Session validation and signed credits
 */

import { api } from '../config/api';
import { validateSession, signCredits, verifySignedCredits } from '../utils/auth-utils';

// Lazy load memory API service to prevent circular dependencies
let memoryApiService: any;

export type WalletProvider = 'rainbowkit' | 'base';

export interface WalletUser {
  address: string;
  provider: WalletProvider;
  credits: number;
  timestamp: number;
  creditSignature?: string; // Cryptographic proof of credit balance
  // Extended with Memory API identity data
  identity?: any;
  socialGraph?: any;
}

export interface WalletState {
  isConnected: boolean;
  user: WalletUser | null;
  isLoading: boolean;
  error: string | null;
}

class WalletService {
  private state: WalletState = {
    isConnected: false,
    user: null,
    isLoading: false,
    error: null,
  };

  private listeners: Array<(state: WalletState) => void> = [];
  private storageKey = 'ghiblify_wallet';

  constructor() {
    this.loadState();
  }

  /**
   * Get current wallet state
   */
  getState(): WalletState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: WalletState) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Connect wallet with enhanced identity mapping
   */
  async connect(address: string, provider: WalletProvider, farcasterUsername?: string): Promise<WalletUser> {
    this.setState({ isLoading: true, error: null });

    try {
      const normalizedAddress = address.toLowerCase();

      // Initialize user with Memory API enhanced profile
      const user = await this.initializeUser(normalizedAddress, provider, farcasterUsername);

      this.setState({
        isConnected: true,
        user,
        isLoading: false,
        error: null,
      });

      this.saveState();
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      this.setState({
        isConnected: false,
        user: null,
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Disconnect wallet
   */
  disconnect(): void {
    this.setState({
      isConnected: false,
      user: null,
      isLoading: false,
      error: null,
    });
    this.clearState();
  }

  /**
   * Refresh credits for current user with signed balance
   */
  async refreshCredits(): Promise<number> {
    if (!this.state.user) {
      throw new Error('No wallet connected');
    }

    try {
      const credits = await this.fetchCredits(this.state.user.address);
      const creditSignature = await signCredits(this.state.user.address, credits);

      const updatedUser = {
        ...this.state.user,
        credits,
        creditSignature,
        timestamp: Date.now(),
      };

      this.setState({
        ...this.state,
        user: updatedUser,
      });

      this.saveState();
      return credits;
    } catch (error) {
      throw new Error(`Failed to refresh credits: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Use credits for operations
   */
  async useCredits(amount: number = 1): Promise<number> {
    if (!this.state.user) {
      throw new Error('No wallet connected');
    }

    try {
      const response = await api.post(`/api/wallet/credits/use`, `address=${this.state.user.address}&amount=${amount}`);
      const newCredits = response.credits;

      const updatedUser = {
        ...this.state.user,
        credits: newCredits,
        timestamp: Date.now(),
      };

      this.setState({
        ...this.state,
        user: updatedUser,
      });

      this.saveState();
      return newCredits;
    } catch (error) {
      throw new Error(`Failed to use credits: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===== PRIVATE METHODS =====

  private async initializeUser(address: string, provider: WalletProvider, farcasterUsername?: string): Promise<WalletUser> {
    try {
      await api.post(`/api/wallet/connect`, `address=${address}&provider=${provider}`);
      const credits = await this.fetchCredits(address);

      // Enhance user profile with Memory API data if available
      let identityData = {};
      let socialGraphData = {};
      
      // Memory API integration disabled to prevent crashes
      // TODO: Re-enable when Memory API integration is stable
      const isMemoryApiEnabled = false;
      
      if (isMemoryApiEnabled) {
        // Lazy load memory API service to prevent initialization issues
        if (!memoryApiService) {
          try {
            const { memoryApiService: mas } = await import('./memory-api-service');
            memoryApiService = mas;
          } catch (error) {
            console.warn('Failed to load memory API service:', error);
          }
        }
        
        if (memoryApiService && memoryApiService.isAvailable()) {
          try {
            const unifiedProfile = await memoryApiService.createUnifiedProfile(address, farcasterUsername);
            if (unifiedProfile) {
              identityData = unifiedProfile;
              socialGraphData = unifiedProfile.social;
            }
          } catch (error) {
            console.warn('Failed to fetch identity data from Memory API:', error);
            // Try to get cached data if available
            console.log('Attempting to use cached identity data...');
          }
        }
      }

      return {
        address,
        provider,
        credits,
        timestamp: Date.now(),
        identity: identityData,
        socialGraph: socialGraphData,
      };
    } catch (error) {
      console.warn('Failed to initialize user:', error);
      return {
        address,
        provider,
        credits: 0,
        timestamp: Date.now(),
      };
    }
  }

  private async fetchCredits(address: string): Promise<number> {
    try {
      const response = await api.get(`/api/wallet/credits/${address}`);
      return response.credits || 0;
    } catch (error) {
      console.warn('Failed to fetch credits:', error);
      return 0;
    }
  }

  private setState(newState: Partial<WalletState>): void {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('Error in wallet listener:', error);
      }
    });
  }

  private saveState(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (error) {
      console.warn('Failed to save wallet state:', error);
    }
  }

  private loadState(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Validate session with proper TTL
        if (parsed.user) {
          const { valid, needsRefresh } = validateSession(parsed.user.timestamp);
          
          if (!valid) {
            console.log('[Wallet] Session expired, clearing state');
            this.clearState();
            return;
          }
          
          if (needsRefresh) {
            console.log('[Wallet] Session needs refresh soon');
          }
          
          this.state = parsed;
        }
      }
    } catch (error) {
      console.warn('Failed to load wallet state:', error);
      this.clearState();
    }
  }

  private clearState(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('Failed to clear wallet state:', error);
    }
  }
}

// Export singleton instance
export const walletService = new WalletService();