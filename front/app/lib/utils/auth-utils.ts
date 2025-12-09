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

// ===== CONSTANTS =====

export const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours
export const REFRESH_THRESHOLD = 2 * 60 * 60 * 1000; // 2 hours before expiry

// ===== SESSION MANAGEMENT =====

/**
 * Validate session age
 */
export function validateSession(timestamp: number): { valid: boolean; needsRefresh: boolean } {
  const age = Date.now() - timestamp;
  return {
    valid: age < SESSION_TTL,
    needsRefresh: age > (SESSION_TTL - REFRESH_THRESHOLD)
  };
}

/**
 * Sign credit balance to prevent tampering
 */
export async function signCredits(address: string, credits: number): Promise<string> {
  if (typeof window === 'undefined') return '';
  
  const data = `${address.toLowerCase()}:${credits}:${Date.now()}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify signed credit balance
 */
export async function verifySignedCredits(
  address: string,
  credits: number,
  signature: string,
  timestamp: number
): Promise<boolean> {
  // Allow 5 minute window for timestamp drift
  if (Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) return false;
  
  const data = `${address.toLowerCase()}:${credits}:${timestamp}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return signature === expectedSignature;
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
 * Verify signature with backend with retry logic
 */
export async function verifySignatureWithBackend(
  address: string,
  message: string,
  signature: string,
  apiClient: ApiInterface = api
): Promise<boolean> {
  return retryWithBackoff(async () => {
    const result = await apiClient.post('/api/web3/auth/verify', {
      address,
      message,
      signature,
    });

    return result.ok || result.authenticated;
  }, 3);
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Don't retry on user rejection or invalid input
      if (lastError.message.includes('rejected') || 
          lastError.message.includes('denied') ||
          lastError.message.includes('invalid')) {
        throw lastError;
      }
      
      // Last attempt, throw error
      if (attempt === maxRetries - 1) {
        throw lastError;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Retry failed');
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