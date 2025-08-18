/**
 * $GHIBLIFY Token Payment Service
 * Follows the same pattern as base-account-payments.ts for consistency
 */

import { api } from '../config/api';
import { ghiblifyPriceOracle, PricingCalculation } from './ghiblify-price-oracle';
import { unifiedWalletService } from './unified-wallet-service';

export interface TokenPaymentRequest {
  tierName: string;
  calculation: PricingCalculation;
}

export interface TokenPaymentResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  tokenAmount: string;
  transactionHash?: string;
}

export type TokenPaymentStatus = 'idle' | 'calculating' | 'approving' | 'purchasing' | 'confirming' | 'completed' | 'failed';

export interface TokenPaymentHandlerOptions {
  onStatusChange?: (status: TokenPaymentStatus) => void;
  onComplete?: (result: TokenPaymentCompletionResult) => void;
  onError?: (error: TokenPaymentError) => void;
}

export interface TokenPaymentCompletionResult {
  transactionHash: string;
  creditsAdded: number;
  newBalance: number;
  tier: string;
  tokenAmount: string;
  tokenAmountFormatted: string;
}

export class TokenPaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenPaymentError';
  }
}

// Contract configuration for Base mainnet
const GHIBLIFY_TOKEN_CONFIG = {
  // Contract address (deployed)
  contractAddress: process.env.NEXT_PUBLIC_GHIBLIFY_TOKEN_PAYMENTS_ADDRESS || '0x41f2fA6E60A34c26BD2C467d21EcB0a2f9087B03',
  // $GHIBLIFY token address
  tokenAddress: '0xc2B2EA7f6218CC37debBAFE71361C088329AE090',
  // Base mainnet chain ID
  chainId: 8453,
};

// Minimal ERC20 ABI for token operations
const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
];

// Payment contract ABI (matches the Solidity contract)
const GHIBLIFY_PAYMENTS_ABI = [
  {
    inputs: [{ name: "packageTier", type: "string" }],
    name: "purchaseCreditsWithGhiblify",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "packageTier", type: "string" }],
    name: "getTokenPackagePrice",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "buyer", type: "address" },
      { indexed: false, name: "packageTier", type: "string" },
      { indexed: false, name: "tokenAmount", type: "uint256" },
      { indexed: false, name: "credits", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
    name: "CreditsPurchased",
    type: "event",
  },
];

class GhiblifyTokenPaymentService {
  private activePayments: Map<string, AbortController> = new Map();

  /**
   * Validate payment prerequisites
   */
  private validatePaymentPrerequisites(): void {
    const connection = unifiedWalletService.getConnection();
    
    if (!connection.isConnected || !connection.user) {
      throw new TokenPaymentError('Wallet not connected');
    }

    if (!GHIBLIFY_TOKEN_CONFIG.contractAddress) {
      throw new TokenPaymentError('$GHIBLIFY payment contract not configured');
    }

    // Must be on Base network for $GHIBLIFY payments
    if (connection.user.provider !== 'base' && connection.user.provider !== 'rainbowkit') {
      throw new TokenPaymentError('$GHIBLIFY payments require Base network connection');
    }
  }

  /**
   * Calculate token requirements for a tier
   */
  async calculatePayment(tierName: string): Promise<PricingCalculation> {
    // Get base USD price for tier
    const tierPrices = {
      starter: 0.35,
      pro: 3.50,
      unlimited: 7.00, // Map 'unlimited' to 'don' in contract calls
    };

    const usdAmount = tierPrices[tierName as keyof typeof tierPrices];
    if (!usdAmount) {
      throw new TokenPaymentError(`Invalid tier: ${tierName}`);
    }

    return await ghiblifyPriceOracle.calculateTokenAmount(usdAmount, tierName);
  }

  /**
   * Check user's $GHIBLIFY token balance
   */
  async checkTokenBalance(userAddress: string): Promise<{
    balance: bigint;
    balanceFormatted: string;
    hasEnough: boolean;
    calculation: PricingCalculation;
  }> {
    const calculation = await this.calculatePayment('starter'); // Get current price calculation
    
    try {
      // This would need to be called with a wagmi/viem client
      // For now, we'll return a placeholder structure
      const balance = BigInt(0); // Placeholder - implement with actual contract call
      
      return {
        balance,
        balanceFormatted: this.formatTokenAmount(balance),
        hasEnough: balance >= calculation.tokenAmount,
        calculation,
      };
    } catch (error) {
      throw new TokenPaymentError(`Failed to check token balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process token payment with full flow
   */
  async processPayment(
    tierName: string,
    options: TokenPaymentHandlerOptions = {}
  ): Promise<TokenPaymentCompletionResult> {
    const { onStatusChange, onComplete, onError } = options;

    try {
      // Validate prerequisites
      this.validatePaymentPrerequisites();
      
      onStatusChange?.('calculating');
      
      // Calculate required tokens
      const calculation = await this.calculatePayment(tierName);
      
      // Check if price is stable enough for payment
      if (!ghiblifyPriceOracle.isPriceStable()) {
        throw new TokenPaymentError('Token price too volatile for payment. Please try again later.');
      }

      const connection = unifiedWalletService.getConnection();
      const userAddress = connection.user!.address;

      onStatusChange?.('approving');
      
      // Check and handle token approval
      await this.ensureTokenApproval(userAddress, calculation.tokenAmount);

      onStatusChange?.('purchasing');
      
      // Execute purchase transaction
      const result = await this.executePurchase(tierName, calculation);

      onStatusChange?.('confirming');
      
      // Wait for transaction confirmation and process with backend
      const completionResult = await this.confirmAndProcessPayment(result, calculation, tierName);

      onStatusChange?.('completed');
      onComplete?.(completionResult);

      return completionResult;

    } catch (error) {
      const tokenError = error instanceof TokenPaymentError 
        ? error 
        : new TokenPaymentError(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      onStatusChange?.('failed');
      onError?.(tokenError);
      throw tokenError;
    }
  }

  /**
   * Ensure sufficient token approval for payment
   */
  private async ensureTokenApproval(userAddress: string, tokenAmount: bigint): Promise<void> {
    // This would use wagmi/viem to check allowance and approve if needed
    // Placeholder implementation - needs actual contract integration
    console.log(`[GHIBLIFY Token] Ensuring approval for ${tokenAmount} tokens`);
    
    // The actual implementation would:
    // 1. Check current allowance
    // 2. If insufficient, request approval
    // 3. Wait for approval transaction
  }

  /**
   * Execute the purchase transaction
   */
  private async executePurchase(tierName: string, calculation: PricingCalculation): Promise<TokenPaymentResult> {
    // Map frontend tier names to contract tier names (like existing Celo contract)
    const contractTier = tierName === 'unlimited' ? 'don' : tierName;
    
    // This would use wagmi to call the contract
    // Placeholder implementation
    const transactionHash = `0x${Date.now().toString(16)}`; // Placeholder
    
    return {
      id: transactionHash,
      status: 'pending',
      tokenAmount: calculation.tokenAmount.toString(),
      transactionHash,
    };
  }

  /**
   * Confirm transaction and process with backend
   */
  private async confirmAndProcessPayment(
    paymentResult: TokenPaymentResult,
    calculation: PricingCalculation,
    tierName: string
  ): Promise<TokenPaymentCompletionResult> {
    try {
      const connection = unifiedWalletService.getConnection();
      const userAddress = connection.user!.address;

      // Process payment with backend (similar to Celo flow)
      const response = await api.post('/api/ghiblify-token/process-payment', {
        transactionHash: paymentResult.transactionHash,
        userAddress,
        tier: tierName,
        tokenAmount: calculation.tokenAmount.toString(),
        usdAmount: calculation.usdAmount,
        discount: calculation.discount,
        timestamp: new Date().toISOString(),
      });

      // Refresh user credits in unified wallet
      await unifiedWalletService.refreshCredits();

      return {
        transactionHash: paymentResult.transactionHash!,
        creditsAdded: response.credits_added,
        newBalance: response.new_balance,
        tier: tierName,
        tokenAmount: calculation.tokenAmount.toString(),
        tokenAmountFormatted: calculation.tokenAmountFormatted,
      };
    } catch (error) {
      throw new TokenPaymentError(`Payment processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format token amount for display
   */
  private formatTokenAmount(amount: bigint): string {
    const tokens = Number(amount) / 10**18;
    
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    } else {
      return tokens.toLocaleString();
    }
  }

  /**
   * Check if token payments are available
   */
  isAvailable(): boolean {
    const connection = unifiedWalletService.getConnection();
    return !!(
      GHIBLIFY_TOKEN_CONFIG.contractAddress &&
      connection.isConnected &&
      (connection.user?.provider === 'base' || connection.user?.provider === 'rainbowkit')
    );
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...GHIBLIFY_TOKEN_CONFIG };
  }

  /**
   * Cancel active payment
   */
  cancelPayment(paymentId: string): void {
    const controller = this.activePayments.get(paymentId);
    if (controller) {
      controller.abort();
      this.activePayments.delete(paymentId);
    }
  }

  /**
   * Cancel all active payments
   */
  cancelAllPayments(): void {
    this.activePayments.forEach((controller) => controller.abort());
    this.activePayments.clear();
  }
}

// Singleton instance
export const ghiblifyTokenPayments = new GhiblifyTokenPaymentService();

// Contract configuration export
export const GHIBLIFY_TOKEN_CONTRACT = {
  address: GHIBLIFY_TOKEN_CONFIG.contractAddress,
  tokenAddress: GHIBLIFY_TOKEN_CONFIG.tokenAddress,
  abi: GHIBLIFY_PAYMENTS_ABI,
  tokenAbi: ERC20_ABI,
  chainId: GHIBLIFY_TOKEN_CONFIG.chainId,
};

// Convenience exports
export { GhiblifyTokenPaymentService };