// Modular Base Account authentication service - Fixed for SDK v1.1.1
import { createBaseAccountSDK } from "@base-org/account";
import { api } from '../config/api';
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

class BaseAccountAuthService {
  private config: BaseAccountConfig;
  private currentUser: BaseAccountUser | null = null;
  private authStatus: AuthenticationStatus = 'idle';
  private statusCallbacks: Set<(status: AuthenticationStatus) => void> = new Set();

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

  // Updated Base Account authentication - debug and fallback approach
  private async authenticateWithBaseAccount(): Promise<AuthenticationResult> {
    try {
      // Create the SDK instance with minimal configuration
      const sdk = createBaseAccountSDK({
        appName: this.config.appName,
      });

      // Get the provider for signing
      const provider = sdk.getProvider();
      
      console.log('[Base Account] Starting authentication...');
      
      try {
        // Try the modern wallet_connect method first
        const nonce = crypto.randomUUID().replace(/-/g, '');
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

        console.log('[Base Account] wallet_connect result:', JSON.stringify(result, null, 2));

        if (result?.accounts?.[0]?.capabilities?.signInWithEthereum) {
          const siweData = result.accounts[0].capabilities.signInWithEthereum;
          console.log('[Base Account] SIWE data found:', siweData);
          return {
            address: siweData.address,
            message: siweData.message,
            signature: siweData.signature,
            timestamp: Date.now(),
            authenticated: false,
          };
        } else {
          throw new BaseAccountError('No SIWE data returned from Base Account wallet_connect');
        }
      } catch (walletConnectError) {
        console.error('[Base Account] wallet_connect failed:', walletConnectError);
        throw new BaseAccountError('Base Account wallet_connect method failed');
      }

    } catch (error) {
      console.error('[Base Account] Authentication error:', error);
      if (error instanceof Error) {
        if (error.message.includes('User rejected') || error.message.includes('denied')) {
          throw new BaseAccountError('User rejected the authentication request');
        }
        if (error.message.includes('Unsupported chain')) {
          throw new BaseAccountError(`Chain ${this.config.chainId} is not supported`);
        }
      }
      throw new BaseAccountError(`Base Account authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Verify signature with backend
  private async verifySignature(authResult: AuthenticationResult): Promise<AuthenticationResult> {
    try {
      console.log('[Base Account] Verifying signature with backend...', {
        address: authResult.address,
        messageLength: authResult.message.length,
        signatureLength: authResult.signature.length,
      });

      const verificationResult = await api.post('/api/web3/auth/verify', {
        address: authResult.address,
        message: authResult.message,
        signature: authResult.signature,
      });

      console.log('[Base Account] Verification result:', verificationResult);

      return {
        ...authResult,
        authenticated: verificationResult.ok || verificationResult.authenticated,
      };
    } catch (error) {
      console.error('[Base Account] Verification error details:', error);
      
      // Better error message extraction
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      }
      
      throw new BaseAccountError(`Signature verification failed: ${errorMessage}`);
    }
  }

  // Fetch user credits
  private async fetchCredits(address: string): Promise<number> {
    try {
      const response = await api.get(`/api/web3/credits/check?address=${address}`);
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

    localStorage.removeItem('ghiblify_auth');
    this.currentUser = null;
    this.setStatus('idle');
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
      
      if (!verifiedResult.authenticated) {
        throw new BaseAccountError('Authentication verification failed');
      }

      // Fetch credits
      const credits = await this.fetchCredits(verifiedResult.address);

      // Create user object
      const user: BaseAccountUser = {
        address: verifiedResult.address,
        credits,
        authenticated: true,
        timestamp: Date.now(),
      };

      // Store state
      this.storeAuthState(user);
      this.setStatus('authenticated');

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
    this.clearAuthState();
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