/**
 * Farcaster-specific wallet service
 * Handles wallet connections in Farcaster mini app environment
 */

'use client';

export interface FarcasterWalletConfig {
  preferredEcosystem: 'base' | 'celo';
  autoConnect: boolean;
  preventSwitching: boolean;
}

class FarcasterWalletService {
  private config: FarcasterWalletConfig = {
    preferredEcosystem: 'celo', // Changed to prioritize RainbowKit/Celo for stability
    autoConnect: true,
    preventSwitching: true,
  };

  private storageKey = 'ghiblify_farcaster_wallet_config';

  constructor() {
    this.loadConfig();
  }

  /**
   * Set preferred ecosystem for Farcaster environment
   */
  setPreferredEcosystem(ecosystem: 'base' | 'celo'): void {
    this.config.preferredEcosystem = ecosystem;
    this.saveConfig();
  }

  /**
   * Get preferred ecosystem
   */
  getPreferredEcosystem(): 'base' | 'celo' {
    return this.config.preferredEcosystem;
  }

  /**
   * Check if we should prevent wallet switching in Farcaster
   */
  shouldPreventSwitching(): boolean {
    return this.config.preventSwitching;
  }

  /**
   * Set whether to prevent wallet switching
   */
  setPreventSwitching(prevent: boolean): void {
    this.config.preventSwitching = prevent;
    this.saveConfig();
  }

  /**
   * Get connection strategy for Farcaster environment
   */
  getConnectionStrategy(): 'base' | 'rainbowkit' {
    return this.config.preferredEcosystem === 'base' ? 'base' : 'rainbowkit';
  }

  /**
   * Check if disconnection should be allowed in Farcaster environment
   */
  shouldAllowDisconnection(): boolean {
    // In Farcaster frames, prevent disconnection to avoid connection issues
    return false;
  }

  private loadConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.config = { ...this.config, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load Farcaster wallet config:', error);
    }
  }

  private saveConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save Farcaster wallet config:', error);
    }
  }
}

export const farcasterWalletService = new FarcasterWalletService();