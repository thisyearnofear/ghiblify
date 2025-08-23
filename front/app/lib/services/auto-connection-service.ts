/**
 * Auto-Connection Service for Farcaster Mini Apps
 * 
 * Implements intelligent connection flow:
 * 1. Auto-connect to Base (most common in Farcaster ecosystem)
 * 2. Fallback to Celo if Base fails
 * 3. Provide seamless network switching post-connection
 */

import { unifiedWalletService, WalletProvider } from './unified-wallet-service';

export type NetworkPreference = 'base' | 'celo' | 'auto';

export interface AutoConnectionConfig {
  preferredNetwork: NetworkPreference;
  enableFallback: boolean;
  skipAutoConnect: boolean;
}

class AutoConnectionService {
  private config: AutoConnectionConfig = {
    preferredNetwork: 'auto',
    enableFallback: true,
    skipAutoConnect: false,
  };

  private readonly NETWORK_PRIORITY: NetworkPreference[] = ['base', 'celo'];
  private currentAttempt: string | null = null;

  /**
   * Update auto-connection configuration
   */
  updateConfig(config: Partial<AutoConnectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AutoConnectionConfig {
    return { ...this.config };
  }

  /**
   * Attempt smart auto-connection
   * Returns the provider that was successfully connected, or null if failed
   */
  async attemptAutoConnection(address: string): Promise<WalletProvider | null> {
    if (this.config.skipAutoConnect) {
      return null;
    }

    // Prevent concurrent connection attempts
    if (this.currentAttempt === address) {
      console.log('[AutoConnection] Connection already in progress for:', address);
      return null;
    }

    this.currentAttempt = address;

    try {
      // If user has specific preference, try that first
      if (this.config.preferredNetwork !== 'auto') {
        const result = await this.tryConnectNetwork(address, this.config.preferredNetwork);
        if (result) {
          return result;
        }
        
        // If fallback is disabled, return failure
        if (!this.config.enableFallback) {
          return null;
        }
      }

      // Auto mode: try networks in priority order
      for (const network of this.NETWORK_PRIORITY) {
        if (network === this.config.preferredNetwork) {
          continue; // Already tried above
        }

        const result = await this.tryConnectNetwork(address, network);
        if (result) {
          return result;
        }
      }

      return null;
    } finally {
      this.currentAttempt = null;
    }
  }

  /**
   * Switch to a different network for an already connected user
   */
  async switchNetwork(address: string, network: NetworkPreference): Promise<boolean> {
    if (network === 'auto') {
      return false; // Can't switch to auto
    }

    try {
      // First, try to switch the actual Ethereum network
      const networkSwitched = await this.switchEthereumNetwork(network);
      if (!networkSwitched) {
        console.error(`[AutoConnection] Failed to switch Ethereum network to ${network}`);
        return false;
      }

      // Small delay to allow network switch to settle
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update preference for future connections
      this.config.preferredNetwork = network;
      this.persistPreference();
      
      return true;
    } catch (error) {
      console.error(`[AutoConnection] Failed to switch to ${network}:`, error);
      return false;
    }
  }

  /**
   * Switch the actual Ethereum network in the user's wallet
   */
  private async switchEthereumNetwork(network: NetworkPreference): Promise<boolean> {
    if (typeof window === 'undefined' || !window.ethereum) {
      console.warn('[AutoConnection] window.ethereum not available for network switching');
      return false;
    }

    try {
      let chainId: string;
      let chainConfig: any;

      if (network === 'celo') {
        chainId = '0xa4ec'; // Celo Mainnet (42220)
        chainConfig = {
          chainId: '0xa4ec',
          chainName: 'Celo Mainnet',
          nativeCurrency: {
            name: 'CELO',
            symbol: 'CELO',
            decimals: 18,
          },
          rpcUrls: ['https://forno.celo.org'],
          blockExplorerUrls: ['https://celoscan.io/'],
        };
      } else if (network === 'base') {
        chainId = '0x2105'; // Base Mainnet (8453)
        chainConfig = {
          chainId: '0x2105',
          chainName: 'Base',
          nativeCurrency: {
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18,
          },
          rpcUrls: ['https://mainnet.base.org'],
          blockExplorerUrls: ['https://basescan.org/'],
        };
      } else {
        return false;
      }

      // Try to switch to the network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId }],
        });
        console.log(`[AutoConnection] Successfully switched to ${network} network`);
        return true;
      } catch (switchError: any) {
        // If the network doesn't exist, try to add it
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [chainConfig],
            });
            console.log(`[AutoConnection] Successfully added and switched to ${network} network`);
            return true;
          } catch (addError) {
            console.error(`[AutoConnection] Failed to add ${network} network:`, addError);
            return false;
          }
        } else {
          console.error(`[AutoConnection] Failed to switch to ${network} network:`, switchError);
          return false;
        }
      }
    } catch (error) {
      console.error(`[AutoConnection] Error switching Ethereum network to ${network}:`, error);
      return false;
    }
  }

  /**
   * Check if we can use Base Pay (requires Base Account in Farcaster)
   */
  canUseBasePay(): boolean {
    const connection = unifiedWalletService.getConnection();
    return connection.isConnected && connection.user?.provider === 'base';
  }

  /**
   * Check if we can use Celo payments
   */
  canUseCeloPayments(): boolean {
    const connection = unifiedWalletService.getConnection();
    return connection.isConnected &&
           (connection.user?.provider === 'rainbowkit' || connection.user?.provider === 'farcaster');
  }

  /**
   * Validate that we're on the correct network for the provider
   */
  async validateNetwork(provider: WalletProvider): Promise<boolean> {
    if (typeof window === 'undefined') return true;
    
    try {
      if (provider === 'rainbowkit') {
        // For RainbowKit (Celo), check if we're on Celo mainnet
        const chainId = await this.getCurrentChainId();
        return chainId === 42220; // Celo mainnet
      } else if (provider === 'base') {
        // For Base, check if we're on Base mainnet
        const chainId = await this.getCurrentChainId();
        return chainId === 8453; // Base mainnet
      }
      return true; // Farcaster or other providers
    } catch (error) {
      console.warn('[AutoConnection] Network validation failed:', error);
      return false;
    }
  }

  /**
   * Get current chain ID from window.ethereum if available
   */
  private async getCurrentChainId(): Promise<number | null> {
    if (typeof window === 'undefined' || !window.ethereum) return null;
    
    try {
      // Try to get chain ID directly
      if (window.ethereum.chainId) {
        return parseInt(window.ethereum.chainId, 16);
      }
      
      // Fallback to request
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      return parseInt(chainIdHex, 16);
    } catch (error) {
      console.warn('[AutoConnection] Failed to get chain ID:', error);
      return null;
    }
  }

  /**
   * Get user-friendly network display name
   */
  getNetworkDisplayName(provider: WalletProvider): string {
    switch (provider) {
      case 'base':
        return 'Base';
      case 'rainbowkit':
        return 'Celo';
      case 'farcaster':
        return 'Farcaster';
      default:
        return 'Wallet';
    }
  }

  /**
   * Check if network switching is available
   */
  canSwitchNetworks(): boolean {
    const connection = unifiedWalletService.getConnection();
    return connection.isConnected && !!connection.user;
  }

  // ===== PRIVATE METHODS =====

  private async tryConnectNetwork(address: string, network: NetworkPreference): Promise<WalletProvider | null> {
    try {
      let provider: WalletProvider;
      
      switch (network) {
        case 'base':
          provider = 'base';
          break;
        case 'celo':
          provider = 'rainbowkit'; // Celo uses RainbowKit connection
          break;
        default:
          return null;
      }

      console.log(`[AutoConnection] Trying ${network} connection for:`, address);
      
      if (provider === 'base') {
        await unifiedWalletService.connectBase(address);
      } else if (provider === 'rainbowkit') {
        await unifiedWalletService.connectRainbowKit(address);
      } else {
        await unifiedWalletService.connectFarcaster(address);
      }
      
      console.log(`[AutoConnection] Successfully connected to ${network}`);
      return provider;
    } catch (error) {
      console.log(`[AutoConnection] Failed to connect to ${network}:`, error.message);
      return null;
    }
  }

  private persistPreference(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('ghiblify_network_preference', this.config.preferredNetwork);
    } catch (error) {
      console.warn('Failed to persist network preference:', error);
    }
  }

  private loadPersistedPreference(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('ghiblify_network_preference');
      if (stored && ['base', 'celo', 'auto'].includes(stored)) {
        this.config.preferredNetwork = stored as NetworkPreference;
      }
    } catch (error) {
      console.warn('Failed to load network preference:', error);
    }
  }

  constructor() {
    this.loadPersistedPreference();
  }
}

// Export singleton instance
export const autoConnectionService = new AutoConnectionService();