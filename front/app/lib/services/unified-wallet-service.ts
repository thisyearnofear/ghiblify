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
  private connectionDebounceTimeout: NodeJS.Timeout | null = null;
  private lastConnectionAttempt: number = 0;

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
    console.log('[Unified Wallet] Debouncing connection attempt for rainbowkit');
    return this.connectWallet(address, 'rainbowkit');
  }

  /**
   * Connect with Base Account
   */
  async connectBase(address: string): Promise<UnifiedWalletUser> {
    console.log('[Unified Wallet] Debouncing connection attempt for base');
    return this.connectWallet(address, 'base');
  }

  /**
   * Connect with Farcaster Frame
   */
  async connectFarcaster(address: string): Promise<UnifiedWalletUser> {
    console.log('[Unified Wallet] Debouncing connection attempt for farcaster');
    return this.connectWallet(address, 'farcaster');
  }

  /**
   * Disconnect current wallet
   */
  disconnect(): void {
    console.log('[Unified Wallet] Disconnecting wallet:', this.currentConnection.user?.provider, this.currentConnection.user?.address);
    this.updateConnection({
      isConnected: false,
      user: null,
      isLoading: false,
      error: null,
    });
    this.clearPersistedState();
  }

  /**
   * Force clear all wallet state (for debugging)
   */
  forceReset(): void {
    console.log('[Unified Wallet] Force resetting all wallet state');
    this.currentConnection = {
      isConnected: false,
      user: null,
      isLoading: false,
      error: null,
    };
    this.clearPersistedState();
    this.notifyListeners();
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
      // Create form data for the request
      const formData = new FormData();
      formData.append('address', this.currentConnection.user.address);
      formData.append('amount', amount.toString());

      const response = await api.postForm('/api/wallet/credits/add', formData);

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
    // Enhanced debouncing for mobile/Farcaster environments
    const now = Date.now();
    const debounceTime = 2000; // Increased to 2 seconds for mobile stability

    if (now - this.lastConnectionAttempt < debounceTime) {
      console.log(`[Unified Wallet] Debouncing connection attempt for ${provider} (${debounceTime - (now - this.lastConnectionAttempt)}ms remaining)`);
      throw new Error('Connection attempt too soon, please wait');
    }
    this.lastConnectionAttempt = now;

    // Validate network compatibility for provider
    if (provider === 'rainbowkit') {
      // For RainbowKit (Celo), ensure we're on the right network
      // This is a simplified check - actual validation happens in UI components
      console.log('[Unified Wallet] Connected with RainbowKit - ensure Celo network');
    }

    console.log(`[Unified Wallet] Connecting ${provider} wallet:`, address);

    // Clear any pending connection timeout
    if (this.connectionDebounceTimeout) {
      clearTimeout(this.connectionDebounceTimeout);
      this.connectionDebounceTimeout = null;
    }

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

      console.log(`[Unified Wallet] Successfully connected ${provider}:`, normalizedAddress, `(${credits} credits)`);

      this.updateConnection({
        isConnected: true,
        user,
        isLoading: false,
        error: null,
      });

      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      console.error(`[Unified Wallet] Failed to connect ${provider}:`, errorMessage);

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
      console.log(`[Unified Wallet] Initializing user: ${address}`);
      await api.post(`/api/wallet/connect`, `address=${address}&provider=unified`);
      console.log(`[Unified Wallet] Successfully initialized user: ${address}`);
    } catch (error) {
      console.error('[Unified Wallet] Failed to initialize user:', error);
      // Continue without throwing - this is not critical for wallet connection
      // The user can still use the app with localStorage fallbacks
    }
  }

  private async fetchCredits(address: string): Promise<number> {
    try {
      console.log(`[Unified Wallet] Fetching credits for ${address}`);
      const response = await api.get(`/api/wallet/credits/${address}`);
      const credits = response.credits || 0;
      console.log(`[Unified Wallet] Successfully fetched ${credits} credits for ${address}`);
      return credits;
    } catch (error) {
      console.error('[Unified Wallet] Failed to fetch credits from backend:', error);

      // Enhanced fallback for mobile environments
      if (typeof window !== 'undefined') {
        try {
          const fallbackCredits = localStorage.getItem(`credits_${address.toLowerCase()}`);
          if (fallbackCredits) {
            const credits = parseInt(fallbackCredits, 10);
            console.log(`[Unified Wallet] Using localStorage fallback: ${credits} credits for ${address}`);
            return credits;
          }
        } catch (storageError) {
          console.warn('[Unified Wallet] localStorage fallback failed:', storageError);
        }
      }

      console.warn('[Unified Wallet] Using 0 credits as final fallback');
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
        // Only restore if timestamp is recent (within 1 hour) and no active connection
        if (parsed.user &&
            Date.now() - parsed.user.timestamp < 60 * 60 * 1000 && // 1 hour instead of 24
            !this.currentConnection.isConnected) {
          console.log('[Unified Wallet] Restoring persisted state:', parsed.user.provider, parsed.user.address);
          this.currentConnection = parsed;
        } else if (parsed.user) {
          console.log('[Unified Wallet] Clearing stale persisted state');
          this.clearPersistedState();
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted wallet state:', error);
      this.clearPersistedState();
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
