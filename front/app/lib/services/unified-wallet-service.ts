/**
 * Unified Wallet Service
 * 
 * Provides a single interface for all wallet connections:
 * - RainbowKit (MetaMask, WalletConnect, etc.)
 * - Base Account
 * - Farcaster Frame
 * 
 * Handles address normalization, credit management, and persistent state.
 */

import { api } from '../config/api';

export type WalletProvider = 'rainbowkit' | 'base' | 'farcaster';

export interface UnifiedWalletUser {
  address: string;
  provider: WalletProvider;
  credits: number;
  authenticated: boolean;
  timestamp: number;
}

export interface WalletConnection {
  isConnected: boolean;
  user: UnifiedWalletUser | null;
  isLoading: boolean;
  error: string | null;
}

class UnifiedWalletService {
  private currentConnection: WalletConnection = {
    isConnected: false,
    user: null,
    isLoading: false,
    error: null,
  };

  private listeners: Array<(connection: WalletConnection) => void> = [];
  private storageKey = 'ghiblify_wallet_state';

  constructor() {
    this.loadPersistedState();
  }

  // ===== PUBLIC API =====

  /**
   * Get current wallet connection state
   */
  getConnection(): WalletConnection {
    return { ...this.currentConnection };
  }

  /**
   * Subscribe to connection state changes
   */
  onConnectionChange(callback: (connection: WalletConnection) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Connect with RainbowKit wallet
   */
  async connectRainbowKit(address: string): Promise<UnifiedWalletUser> {
    return this.connectWallet(address, 'rainbowkit');
  }

  /**
   * Connect with Base Account
   */
  async connectBase(address: string): Promise<UnifiedWalletUser> {
    return this.connectWallet(address, 'base');
  }

  /**
   * Connect with Farcaster Frame
   */
  async connectFarcaster(address: string): Promise<UnifiedWalletUser> {
    return this.connectWallet(address, 'farcaster');
  }

  /**
   * Disconnect current wallet
   */
  disconnect(): void {
    this.updateConnection({
      isConnected: false,
      user: null,
      isLoading: false,
      error: null,
    });
    this.clearPersistedState();
  }

  /**
   * Refresh credits for current user
   */
  async refreshCredits(): Promise<number> {
    if (!this.currentConnection.user) {
      throw new Error('No wallet connected');
    }

    try {
      const credits = await this.fetchCredits(this.currentConnection.user.address);
      
      const updatedUser = {
        ...this.currentConnection.user,
        credits,
        timestamp: Date.now(),
      };

      this.updateConnection({
        ...this.currentConnection,
        user: updatedUser,
      });

      return credits;
    } catch (error) {
      throw new Error(`Failed to refresh credits: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Use credits (for Ghiblify operations)
   */
  async useCredits(amount: number = 1): Promise<number> {
    if (!this.currentConnection.user) {
      throw new Error('No wallet connected');
    }

    try {
      const response = await api.post(`/api/wallet/credits/use`, `address=${this.currentConnection.user.address}&amount=${amount}`);
      const newCredits = response.credits;

      // Update local state
      const updatedUser = {
        ...this.currentConnection.user,
        credits: newCredits,
        timestamp: Date.now(),
      };

      this.updateConnection({
        ...this.currentConnection,
        user: updatedUser,
      });

      return newCredits;
    } catch (error) {
      throw new Error(`Failed to use credits: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refund credits (for failed operations)
   */
  async refundCredits(amount: number): Promise<number> {
    if (!this.currentConnection?.user?.address) {
      throw new Error('No wallet connected');
    }

    try {
      const response = await api.post('/api/wallet/credits/add', {
        address: this.currentConnection.user.address,
        amount: amount,
      });

      const newCredits = response.credits;

      // Update local state
      const updatedUser = {
        ...this.currentConnection.user,
        credits: newCredits,
        timestamp: Date.now(),
      };

      this.updateConnection({
        ...this.currentConnection,
        user: updatedUser,
      });

      console.log(`[UnifiedWallet] Refunded ${amount} credits. New balance: ${newCredits}`);
      return newCredits;
    } catch (error) {
      throw new Error(`Failed to refund credits: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add credits (for purchases)
   */
  async addCredits(amount: number): Promise<number> {
    if (!this.currentConnection.user) {
      throw new Error('No wallet connected');
    }

    try {
      const response = await api.post(`/api/wallet/credits/add`, `address=${this.currentConnection.user.address}&amount=${amount}`);
      const newCredits = response.credits;

      // Update local state
      const updatedUser = {
        ...this.currentConnection.user,
        credits: newCredits,
        timestamp: Date.now(),
      };

      this.updateConnection({
        ...this.currentConnection,
        user: updatedUser,
      });

      return newCredits;
    } catch (error) {
      throw new Error(`Failed to add credits: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===== PRIVATE METHODS =====

  private async connectWallet(address: string, provider: WalletProvider): Promise<UnifiedWalletUser> {
    this.updateConnection({
      ...this.currentConnection,
      isLoading: true,
      error: null,
    });

    try {
      // Normalize address
      const normalizedAddress = address.toLowerCase();

      // Initialize user in backend if needed
      await this.initializeUser(normalizedAddress);

      // Fetch current credits
      const credits = await this.fetchCredits(normalizedAddress);

      const user: UnifiedWalletUser = {
        address: normalizedAddress,
        provider,
        credits,
        authenticated: true,
        timestamp: Date.now(),
      };

      this.updateConnection({
        isConnected: true,
        user,
        isLoading: false,
        error: null,
      });

      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      
      this.updateConnection({
        isConnected: false,
        user: null,
        isLoading: false,
        error: errorMessage,
      });

      throw new Error(errorMessage);
    }
  }

  private async initializeUser(address: string): Promise<void> {
    try {
      await api.post(`/api/wallet/connect`, `address=${address}&provider=unified`);
    } catch (error) {
      console.warn('Failed to initialize user, continuing...', error);
    }
  }

  private async fetchCredits(address: string): Promise<number> {
    try {
      const response = await api.get(`/api/wallet/credits/${address}`);
      return response.credits || 0;
    } catch (error) {
      console.warn('Failed to fetch credits from backend, using 0 as fallback');
      return 0;
    }
  }

  private updateConnection(newConnection: WalletConnection): void {
    this.currentConnection = newConnection;
    this.persistState();
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getConnection());
      } catch (error) {
        console.error('Error in wallet connection listener:', error);
      }
    });
  }

  private persistState(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.currentConnection));
    } catch (error) {
      console.warn('Failed to persist wallet state:', error);
    }
  }

  private loadPersistedState(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only restore if timestamp is recent (within 24 hours)
        if (parsed.user && Date.now() - parsed.user.timestamp < 24 * 60 * 60 * 1000) {
          this.currentConnection = parsed;
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted wallet state:', error);
    }
  }

  private clearPersistedState(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('Failed to clear persisted wallet state:', error);
    }
  }
}

// Export singleton instance
export const unifiedWalletService = new UnifiedWalletService();
