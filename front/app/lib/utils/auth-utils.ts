/**
 * Shared authentication utilities for wallet connections
 * Extracts common patterns between RainbowKit and Base Account auth
 */

import { api } from '../config/api';

// Type for API interface
export interface ApiInterface {
  get: (url: string) => Promise<any>;
  post: (url: string, data?: any) => Promise<any>;
}

// ===== TYPES =====

export interface AuthResult {
  address: string;
  message: string;
  signature: string;
  timestamp: number;
  authenticated: boolean;
}

export interface AuthConfig {
  appUrl: string;
  appDescription: string;
  chainId: number;
}

// ===== UTILITIES =====

/**
 * Generate a cryptographically secure nonce
 */
export function generateNonce(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

/**
 * Create a standardized SIWE message
 */
export function createSIWEMessage(
  address: string,
  nonce: string,
  config: AuthConfig
): string {
  const issuedAt = new Date().toISOString();

  return `${config.appUrl} wants you to sign in with your Ethereum account.
${address}

${config.appDescription}

URI: ${config.appUrl}
Version: 1
Chain ID: ${config.chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}`;
}

/**
 * Fetch nonce from backend
 */
export async function fetchBackendNonce(apiClient: ApiInterface = api): Promise<string> {
  const response = await apiClient.get('/api/web3/auth/nonce');
  return response;
}

/**
 * Verify signature with backend
 */
export async function verifySignatureWithBackend(
  address: string,
  message: string,
  signature: string,
  apiClient: ApiInterface = api
): Promise<boolean> {
  try {
    const result = await apiClient.post('/api/web3/auth/verify', {
      address,
      message,
      signature,
    });

    return result.ok || result.authenticated;
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Check if we're in a browser environment
 */
export function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if signature is from Base Account (long signature format)
 */
export function isBaseAccountSignature(signature: string): boolean {
  return signature.length > 500 &&
         signature.startsWith('0x000000000000000000000000ca11bde05977b3631167028862be2a173976ca11');
}

/**
 * Validate Ethereum address format
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Normalize address to lowercase
 */
export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

/**
 * Handle common authentication errors
 */
export function handleAuthError(error: unknown, context: string): Error {
  if (error instanceof Error) {
    if (error.message.includes('User rejected') || error.message.includes('denied')) {
      return new Error('User rejected the authentication request');
    }
    if (error.message.includes('Unsupported chain')) {
      return new Error('Unsupported network for authentication');
    }
    return new Error(`${context}: ${error.message}`);
  }
  return new Error(`${context}: Unknown error occurred`);
}

// ===== WALLET CONNECTION UTILITIES =====

export type WalletConnectionPriority = 'rainbowkit' | 'base';

export interface WalletConnectionState {
  isConnected: boolean;
  isLoading: boolean;
  rainbowKitAddress?: string | null;
  isRainbowKitConnected?: boolean;
  baseUser?: any;
  isBaseAuthenticated?: boolean;
}

/**
 * Determine which wallet connection should take priority
 */
export function getConnectionPriority(state: WalletConnectionState): WalletConnectionPriority | null {
  // Priority 1: RainbowKit if connected
  if (state.isRainbowKitConnected && state.rainbowKitAddress) {
    return 'rainbowkit';
  }

  // Priority 2: Base Account if authenticated
  if (state.isBaseAuthenticated && state.baseUser?.address) {
    return 'base';
  }

  return null;
}

/**
 * Check if auto-connection should be attempted
 */
export function shouldAttemptAutoConnect(state: WalletConnectionState): boolean {
  return !state.isConnected && !state.isLoading;
}

/**
 * Get connection details for a given priority
 */
export function getConnectionDetails(
  priority: WalletConnectionPriority,
  state: WalletConnectionState
): { address: string; provider: WalletConnectionPriority } | null {
  switch (priority) {
    case 'rainbowkit':
      if (state.rainbowKitAddress) {
        return { address: state.rainbowKitAddress, provider: 'rainbowkit' };
      }
      break;
    case 'base':
      if (state.baseUser?.address) {
        return { address: state.baseUser.address, provider: 'base' };
      }
      break;
  }
  return null;
}