// Modular Base Account authentication service - Simplified with shared utilities
import { createBaseAccountSDK } from "@base-org/account";
import { api } from '../config/api';
import {
  generateNonce,
  createSIWEMessage,
  fetchBackendNonce,
  verifySignatureWithBackend,
  isBrowserEnvironment,
  isBaseAccountSignature,
  handleAuthError,
  AuthResult,
  AuthConfig,
} from '../utils/auth-utils';
import {
  BaseAccountConfig,
  BaseAccountUser,
  AuthenticationResult,
  BaseAccountError,
  AuthenticationStatus,
  BASE_ACCOUNT_CHAINS,
} from '../types/base-account';

// Configuration
const BASE_ACCOUNT_CONFIG: BaseAccountConfig = {
  appName: "Ghiblify",
  appLogoUrl: "https://ghiblify-it.vercel.app/ghibli-it.png",
  appDescription: "Transform your photos into Studio Ghibli style art",
  appUrl: "https://ghiblify-it.vercel.app",
  chainId: BASE_ACCOUNT_CHAINS.MAINNET,
  testnet: process.env.NODE_ENV === 'development',
};

// Auth config for shared utilities
const AUTH_CONFIG: AuthConfig = {
  appUrl: BASE_ACCOUNT_CONFIG.appUrl,
  appDescription: BASE_ACCOUNT_CONFIG.appDescription,
  chainId: BASE_ACCOUNT_CONFIG.chainId,
};

class BaseAccountAuthService {
  private config: BaseAccountConfig;
  private currentUser: BaseAccountUser | null = null;
  private authStatus: AuthenticationStatus = 'idle';
  private statusCallbacks: Set<(status: AuthenticationStatus) => void> = new Set();
  private provider: any = null;

  constructor(config: BaseAccountConfig = BASE_ACCOUNT_CONFIG) {
    this.config = config;
    this.initializeFromStorage();
  }

  // Status management
  private setStatus(status: AuthenticationStatus): void {
    this.authStatus = status;
    this.statusCallbacks.forEach(callback => callback(status));
  }

  onStatusChange(callback: (status: AuthenticationStatus) => void): () => void {
    this.statusCallbacks.add(callback);
    // Return unsubscribe function
    return () => this.statusCallbacks.delete(callback);
  }

  getStatus(): AuthenticationStatus {
    return this.authStatus;
  }

  // Simplified Base Account authentication using shared utilities
  private async authenticateWithBaseAccount(): Promise<AuthenticationResult> {
    try {
      if (!isBrowserEnvironment()) {
        throw new BaseAccountError('Base Account authentication requires browser environment');
      }

      // Initialize provider
      const provider = await this.initializeProvider();

      // Try modern wallet_connect method first, fallback to legacy method
      try {
        return await this.attemptWalletConnect(provider);
      } catch (error) {
        console.warn('[Base Account] wallet_connect failed, trying fallback:', error);
        return await this.attemptLegacyAuth(provider);
      }

    } catch (error) {
      throw handleAuthError(error, 'Base Account authentication');
    }
  }

  // Initialize Base Account provider
  private async initializeProvider(): Promise<any> {
    try {
      const sdk = createBaseAccountSDK({
        appName: this.config.appName,
      });
      const provider = sdk.getProvider();

      if (!provider) {
        throw new BaseAccountError('Failed to get Base Account provider');
      }

      this.provider = provider;
      return provider;
    } catch (error) {
      throw new BaseAccountError('Failed to initialize Base Account SDK');
    }
  }

  // Attempt modern wallet_connect authentication
  private async attemptWalletConnect(provider: any): Promise<AuthenticationResult> {
    const nonce = generateNonce();
    console.log('[Base Account] Attempting wallet_connect with nonce:', nonce);

    const result = await provider.request({
      method: 'wallet_connect',
      params: [{
        version: '1',
        capabilities: {
          signInWithEthereum: {
            nonce,
            chainId: `0x${this.config.chainId.toString(16)}`
          }
        }
      }]
    });

    // Parse wallet_connect result
    if (result?.accounts?.[0]?.capabilities?.signInWithEthereum) {
      const account = result.accounts[0];
      const siweData = account.capabilities.signInWithEthereum;

      return {
        address: account.address,
        message: siweData.message,
        signature: siweData.signature,
        timestamp: Date.now(),
        authenticated: false,
      };
    }

    throw new Error('Invalid wallet_connect response format');
  }

  // Attempt legacy eth_requestAccounts + personal_sign authentication
  private async attemptLegacyAuth(provider: any): Promise<AuthenticationResult> {
    console.log('[Base Account] Using legacy authentication method');

    // Get account access
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    const address = accounts[0];

    if (!address) {
      throw new BaseAccountError('No address returned from Base Account');
    }

    // Create and sign SIWE message
    const nonce = await fetchBackendNonce();
    const message = createSIWEMessage(address, nonce, AUTH_CONFIG);
    const signature = await provider.request({
      method: 'personal_sign',
      params: [message, address]
    });

    if (!signature) {
      throw new BaseAccountError('No signature returned from Base Account');
    }

    return {
      address,
      message,
      signature,
      timestamp: Date.now(),
      authenticated: false,
    };
  }


  // Verify signature with backend using shared utility
  private async verifySignature(authResult: AuthenticationResult): Promise<AuthenticationResult> {
    console.log('[Base Account] Verifying signature with backend...', {
      address: authResult.address,
      messageLength: authResult.message.length,
      signatureLength: authResult.signature.length,
    });

    const isAuthenticated = await verifySignatureWithBackend(
      authResult.address,
      authResult.message,
      authResult.signature
    );

    console.log('[Base Account] Authentication status:', isAuthenticated);

    return {
      ...authResult,
      authenticated: isAuthenticated,
    };
  }

  // Fetch user credits
  private async fetchCredits(address: string): Promise<number> {
    try {
      const response = await api.get(`/api/wallet/credits/${address}`);
      return response.credits || 0;
    } catch (error) {
      console.warn('Could not fetch credits from backend, using localStorage fallback:', error);
      // Skip localStorage access in SSR environment
      if (typeof window === 'undefined') {
        return 0;
      }
      const storedCredits = localStorage.getItem(`credits_${address.toLowerCase()}`);
      return storedCredits ? parseInt(storedCredits, 10) : 0;
    }
  }

  // Store authentication state
  private storeAuthState(user: BaseAccountUser): void {
    // Skip if we're in SSR environment (no localStorage)
    if (typeof window !== 'undefined') {
      localStorage.setItem('ghiblify_auth', JSON.stringify(user));
    }
    this.currentUser = user;
  }

  // Load authentication state from storage
  private initializeFromStorage(): void {
    // Skip if we're in SSR environment (no localStorage)
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem('ghiblify_auth');
      if (stored) {
        const user: BaseAccountUser = JSON.parse(stored);
        
        // Check if authentication is still valid (e.g., not expired)
        const isValid = user.authenticated && 
                        user.timestamp && 
                        (Date.now() - user.timestamp < 24 * 60 * 60 * 1000); // 24 hours
        
        if (isValid) {
          this.currentUser = user;
          this.setStatus('authenticated');
        } else {
          this.clearAuthState();
        }
      }
    } catch (error) {
      console.warn('Failed to load auth state from storage:', error);
      this.clearAuthState();
    }
  }

  // Clear authentication state
  private clearAuthState(): void {
    // Skip if we're in SSR environment (no localStorage)
    if (typeof window === 'undefined') {
      this.currentUser = null;
      this.setStatus('idle');
      return;
    }

    try {
      localStorage.removeItem('ghiblify_auth');
    } catch (error) {
      console.warn('[Base Account] Failed to remove auth from localStorage:', error);
    }
    
    this.currentUser = null;
    this.setStatus('idle');
    
    // Additional cleanup for Web3 provider state
    try {
      // Safely check for ethereum provider without conflicts
      if (typeof window !== 'undefined' && typeof (window as any).ethereum !== 'undefined') {
        // Disconnect any existing provider listeners/subscriptions
        const ethereumProvider = (window as any).ethereum;
        
        // Try to emit a disconnect event if the provider supports it
        if (typeof ethereumProvider.emit === 'function') {
          ethereumProvider.emit('disconnect');
          console.log('[Base Account] Emitted disconnect event to Web3 provider');
        }
        
        // Remove any cached provider instance from Base Account SDK
        if (typeof ethereumProvider._clearBaseAccountState === 'function') {
          ethereumProvider._clearBaseAccountState();
          console.log('[Base Account] Cleared Base Account state from provider');
        }
      }
    } catch (error) {
      console.warn('[Base Account] Cleanup warning:', error);
    }
  }

  // Public API - Corrected Implementation
  async authenticate(): Promise<BaseAccountUser> {
    if (this.authStatus === 'connecting' || this.authStatus === 'signing' || this.authStatus === 'verifying') {
      throw new BaseAccountError('Authentication already in progress');
    }

    try {
      this.setStatus('connecting');
      
      this.setStatus('signing');
      
      // Use the official Base Account authentication flow
      const authResult = await this.authenticateWithBaseAccount();

      this.setStatus('verifying');
      
      // Verify signature with backend
      const verifiedResult = await this.verifySignature(authResult);
      console.log('[Base Account] Verified result received:', verifiedResult);
      
      if (!verifiedResult.authenticated) {
        console.error('[Base Account] Verification failed - authenticated:', verifiedResult.authenticated);
        throw new BaseAccountError('Authentication verification failed');
      }

      console.log('[Base Account] Verification successful, fetching credits...');
      // Fetch credits
      const credits = await this.fetchCredits(verifiedResult.address);
      console.log('[Base Account] Credits fetched:', credits);

      // Create user object
      const user: BaseAccountUser = {
        address: verifiedResult.address,
        credits,
        authenticated: true,
        timestamp: Date.now(),
      };

      console.log('[Base Account] Created user object:', user);

      // Store state
      this.storeAuthState(user);
      this.setStatus('authenticated');
      
      console.log('[Base Account] Authentication complete - status set to authenticated');

      return user;

    } catch (error) {
      this.setStatus('error');
      if (error instanceof BaseAccountError) {
        throw error;
      }
      throw new BaseAccountError(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async refreshCredits(): Promise<number> {
    if (!this.currentUser) {
      throw new BaseAccountError('User not authenticated');
    }

    try {
      const credits = await this.fetchCredits(this.currentUser.address);
      this.currentUser.credits = credits;
      this.storeAuthState(this.currentUser);
      return credits;
    } catch (error) {
      throw new BaseAccountError(`Failed to refresh credits: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  signOut(): void {
    console.log('[Base Account] Starting sign out process...');
    
    try {
      // Try to disconnect from Base Account SDK if possible
      // Note: The SDK might not expose a disconnect method, but we can try
      if (typeof window !== 'undefined') {
        // Clear any cached provider state
        console.log('[Base Account] Clearing cached provider state');
      }
    } catch (error) {
      console.warn('[Base Account] Error during SDK disconnect:', error);
    }
    
    this.clearAuthState();
    console.log('[Base Account] Sign out complete');
  }

  getCurrentUser(): BaseAccountUser | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser?.authenticated || false;
  }
}

// Singleton instance
export const baseAccountAuth = new BaseAccountAuthService();

// Convenience exports
export { BaseAccountAuthService };
export type { BaseAccountUser, AuthenticationResult, AuthenticationStatus };