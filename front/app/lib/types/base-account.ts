// Base Account TypeScript interfaces and types
export interface BaseAccountConfig {
  appName: string;
  appLogoUrl: string;
  appDescription: string;
  appUrl: string;
  chainId: number;
  testnet?: boolean;
}

export interface AuthenticationResult {
  address: string;
  message: string;
  signature: string;
  timestamp: number;
  authenticated: boolean;
  credits?: number;
}

export interface BaseAccountUser {
  address: string;
  credits: number;
  authenticated: boolean;
  timestamp: number;
}

export interface PaymentRequest {
  amount: string;
  to: string;
  testnet: boolean;
  payerInfo?: {
    requests: Array<{ type: string; optional?: boolean }>;
  };
}

export interface PaymentResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount?: string;
  hash?: string;
  error?: string;
}

// New types for sendCalls API
export interface CallData {
  to: string;
  value?: string;
  data?: string;
}

export interface SendCallsRequest {
  calls: CallData[];
  chainId: number;
  capabilities?: Record<string, any>;
}

export interface CallsResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  receipts?: any[];
}

export interface SIWEMessage {
  domain: string;
  address: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  statement?: string;
}

// Authentication result from Base Account SDK
export interface BaseAccountAuthResult {
  address: string;
  message: string;
  signature: string;
}

export class BaseAccountError extends Error {
  code?: string | number;
  details?: unknown;

  constructor(message: string, code?: string | number, details?: unknown) {
    super(message);
    this.name = 'BaseAccountError';
    this.code = code;
    this.details = details;
  }
}

// Configuration constants
export const BASE_ACCOUNT_CHAINS = {
  MAINNET: 8453,
  TESTNET: 84532,
} as const;

export const SIWE_VERSION = '1' as const;

// Utility types
export type ChainId = typeof BASE_ACCOUNT_CHAINS[keyof typeof BASE_ACCOUNT_CHAINS];
export type AuthenticationStatus = 'idle' | 'connecting' | 'signing' | 'verifying' | 'authenticated' | 'error';
export type PaymentStatus = 'idle' | 'initiating' | 'pending' | 'processing' | 'polling' | 'completed' | 'failed';