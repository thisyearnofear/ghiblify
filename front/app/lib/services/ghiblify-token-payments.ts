/**
 * $GHIBLIFY Token Payment Service
 * Follows the same pattern as base-account-payments.ts for consistency
 */

import { api } from '../config/api';
import { ghiblifyPriceOracle, PricingCalculation } from './ghiblify-price-oracle';
import { walletService } from './unified-wallet-service';
import { readContract, waitForTransactionReceipt, getChainId } from '@wagmi/core';
import { parseUnits, formatUnits } from 'viem';
import { config } from '../../config/wagmi-config';

// We'll need to use the wagmi hooks pattern like the existing Celo implementation
// This service will coordinate with the UI layer that has access to wagmi hooks

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
  // Add wagmi functions for real contract interactions
  writeContractAsync?: (config: any) => Promise<string>;
  publicClient?: any;
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
   * Validate payment prerequisites with helpful error messages
   */
  private async validatePaymentPrerequisites(): Promise<void> {
    const state = walletService.getState();

    if (!state.isConnected || !state.user) {
      throw new TokenPaymentError('Please connect your wallet to pay with $GHIBLIFY tokens.');
    }

    if (!GHIBLIFY_TOKEN_CONFIG.contractAddress) {
      throw new TokenPaymentError('$GHIBLIFY payment system is temporarily unavailable.');
    }

    // Check network compatibility with helpful guidance
    const networkCheck = await this.requiresNetworkSwitch();
    if (networkCheck.required) {
      throw new TokenPaymentError(
        `For the best experience, please switch to Base network. ` +
        `Your wallet will handle this automatically when you confirm the transaction.`
      );
    }
  }

  /**
   * Get current token price from contract (set by automation service)
   */
  async getContractPrice(tierName: string): Promise<bigint> {
     const contractTier = tierName === 'unlimited' ? 'don' : tierName;
     
     try {
       const tokenAmount = await readContract(config, {
         address: GHIBLIFY_TOKEN_CONFIG.contractAddress as `0x${string}`,
         abi: GHIBLIFY_PAYMENTS_ABI,
         functionName: 'getTokenPackagePrice',
         args: [contractTier],
         chainId: GHIBLIFY_TOKEN_CONFIG.chainId as any,
       }) as bigint;
       
       return tokenAmount;
     } catch (error) {
      throw new TokenPaymentError(`Failed to get contract price for ${tierName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate token requirements for a tier (now using contract prices)
   */
  async calculatePayment(tierName: string): Promise<PricingCalculation> {
    try {
      // Get token amount from contract (updated by automation service)
      const tokenAmount = await this.getContractPrice(tierName);
      
      // Get current price for display purposes
      const priceData = await ghiblifyPriceOracle.getTokenPrice();
      const usdValue = Number(formatUnits(tokenAmount, 18)) * priceData.priceUSD;
      
      return {
        usdAmount: usdValue,
        tokenAmount,
        tokenAmountFormatted: this.formatTokenAmount(tokenAmount),
        pricePerToken: priceData.priceUSD,
        discount: 0.5, // 50% discount for using $GHIBLIFY
        savings: usdValue, // The amount saved vs regular pricing
      };
    } catch (error) {
      throw new TokenPaymentError(`Failed to calculate payment for ${tierName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check user's $GHIBLIFY token balance
   */
  async checkTokenBalance(userAddress: string, tierName: string = 'starter'): Promise<{
    balance: bigint;
    balanceFormatted: string;
    hasEnough: boolean;
    calculation: PricingCalculation;
  }> {
    const calculation = await this.calculatePayment(tierName);
    
    try {
      // Real contract call to check token balance
      const balance = await readContract(config, {
        address: GHIBLIFY_TOKEN_CONFIG.tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress as `0x${string}`],
        chainId: GHIBLIFY_TOKEN_CONFIG.chainId as any,
      }) as bigint;
      
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
    const { onStatusChange, onComplete, onError, writeContractAsync, publicClient } = options;

    // Validate required wagmi functions
    if (!writeContractAsync || !publicClient) {
      throw new TokenPaymentError('Missing required wagmi functions. Please ensure writeContractAsync and publicClient are provided.');
    }

    try {
      // Validate prerequisites
      await this.validatePaymentPrerequisites();
      
      onStatusChange?.('calculating');
      
      // Calculate required tokens
      const calculation = await this.calculatePayment(tierName);
      
      // Check if price is stable enough for payment
      if (!ghiblifyPriceOracle.isPriceStable()) {
        throw new TokenPaymentError('Token price too volatile for payment. Please try again later.');
      }

      const state = walletService.getState();
      const userAddress = state.user!.address;

      // Validate user has sufficient token balance
      const balanceCheck = await this.checkTokenBalance(userAddress, tierName);
      if (!balanceCheck.hasEnough) {
        throw new TokenPaymentError(
          `Insufficient $GHIBLIFY tokens. You need ${calculation.tokenAmountFormatted} but have ${balanceCheck.balanceFormatted}.`
        );
      }

      onStatusChange?.('approving');
      
      // Check and handle token approval
      await this.ensureTokenApproval(userAddress, calculation.tokenAmount, writeContractAsync, publicClient);

      onStatusChange?.('purchasing');
      
      // Execute purchase transaction
      const result = await this.executePurchase(tierName, calculation, writeContractAsync);

      onStatusChange?.('confirming');
      
      // Wait for transaction confirmation and process with backend
      const completionResult = await this.confirmAndProcessPayment(result, calculation, tierName, publicClient);

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
  private async ensureTokenApproval(
    userAddress: string, 
    tokenAmount: bigint, 
    writeContractAsync: (config: any) => Promise<string>,
    publicClient: any
  ): Promise<void> {
    console.log(`[GHIBLIFY Token] Checking allowance for ${formatUnits(tokenAmount, 18)} tokens`);
    
    try {
      // Check current allowance
      const currentAllowance = await readContract(config, {
        address: GHIBLIFY_TOKEN_CONFIG.tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [userAddress as `0x${string}`, GHIBLIFY_TOKEN_CONFIG.contractAddress as `0x${string}`],
        chainId: GHIBLIFY_TOKEN_CONFIG.chainId as any,
      }) as bigint;

      console.log(`[GHIBLIFY Token] Current allowance: ${formatUnits(currentAllowance, 18)}`);

      // If allowance is sufficient, no need to approve
      if (currentAllowance >= tokenAmount) {
        console.log(`[GHIBLIFY Token] Sufficient allowance already exists`);
        return;
      }

      // Request approval for the required amount using real wagmi
      console.log(`[GHIBLIFY Token] Requesting approval for ${formatUnits(tokenAmount, 18)} tokens`);
      
      const hash = await writeContractAsync({
        address: GHIBLIFY_TOKEN_CONFIG.tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [GHIBLIFY_TOKEN_CONFIG.contractAddress, tokenAmount],
      });

      console.log(`[GHIBLIFY Token] Approval transaction submitted: ${hash}`);

      // Wait for approval transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status !== 'success') {
        throw new TokenPaymentError('Token approval transaction failed');
      }

      console.log(`[GHIBLIFY Token] Approval confirmed in block ${receipt.blockNumber}`);
    } catch (error) {
      if (error instanceof TokenPaymentError) throw error;
      throw new TokenPaymentError(`Failed to approve tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute the purchase transaction
   */
  private async executePurchase(
    tierName: string, 
    calculation: PricingCalculation,
    writeContractAsync: (config: any) => Promise<string>
  ): Promise<TokenPaymentResult> {
    // Map frontend tier names to contract tier names (like existing Celo contract)
    const contractTier = tierName === 'unlimited' ? 'don' : tierName;
    
    console.log(`[GHIBLIFY Token] Executing purchase for tier: ${contractTier}`);
    console.log(`[GHIBLIFY Token] Token amount: ${calculation.tokenAmountFormatted}`);
    
    try {
      // Execute real purchase transaction using wagmi
      const hash = await writeContractAsync({
        address: GHIBLIFY_TOKEN_CONFIG.contractAddress,
        abi: GHIBLIFY_PAYMENTS_ABI,
        functionName: 'purchaseCreditsWithGhiblify',
        args: [contractTier],
      });

      console.log(`[GHIBLIFY Token] Purchase transaction submitted: ${hash}`);
      
      return {
        id: hash,
        status: 'pending',
        tokenAmount: calculation.tokenAmount.toString(),
        transactionHash: hash,
      };
    } catch (error) {
      throw new TokenPaymentError(`Failed to execute purchase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Confirm transaction and process with backend
   */
  private async confirmAndProcessPayment(
    paymentResult: TokenPaymentResult,
    calculation: PricingCalculation,
    tierName: string,
    publicClient: any
  ): Promise<TokenPaymentCompletionResult> {
    try {
      const state = walletService.getState();
      const userAddress = state.user!.address;

      console.log(`[GHIBLIFY Token] Waiting for transaction confirmation: ${paymentResult.transactionHash}`);
      
      // Wait for real blockchain confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: paymentResult.transactionHash,
      });

      if (receipt.status !== 'success') {
        throw new TokenPaymentError('Transaction failed on blockchain');
      }

      console.log(`[GHIBLIFY Token] Transaction confirmed in block ${receipt.blockNumber}`);

      // Process payment with real backend API
      const response = await api.post('/api/ghiblify-token/process-payment', {
        transactionHash: paymentResult.transactionHash,
        userAddress,
        tier: tierName,
        tokenAmount: calculation.tokenAmount.toString(),
        usdAmount: calculation.usdAmount,
        discount: calculation.discount,
        blockNumber: receipt.blockNumber.toString(),
        timestamp: new Date().toISOString(),
      });

      console.log(`[GHIBLIFY Token] Backend processing completed:`, response);

      // Refresh user credits in unified wallet
      await walletService.refreshCredits();

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
   * Now simplified - always available if user has a wallet connected
   */
  isAvailable(): boolean {
    const state = walletService.getState();

    return !!(
      GHIBLIFY_TOKEN_CONFIG.contractAddress &&
      state.isConnected &&
      state.user?.address
    );
  }

  /**
    * Check current network chain ID
    */
   private async getCurrentChainId(): Promise<number | null> {
     try {
       return getChainId(config);
     } catch (error) {
       console.warn('[GHIBLIFY Token] Failed to get current chain ID:', error);
       return null;
     }
   }

  /**
   * Check if user needs to switch networks for optimal experience
   * Enhanced to properly handle Base Account users who may be on different networks
   */
  async requiresNetworkSwitch(): Promise<{ required: boolean; currentProvider?: string; recommendedAction?: string; currentChainId?: number }> {
    const state = walletService.getState();

    if (!state.isConnected || !state.user) {
      return { required: false };
    }

    // For $GHIBLIFY token payments, we require Base network (chain ID 8453)
    // This applies to ALL users regardless of their authentication provider
    const currentChainId = await this.getCurrentChainId();
    const isOnBaseNetwork = currentChainId === GHIBLIFY_TOKEN_CONFIG.chainId;

    if (!isOnBaseNetwork) {
      return {
        required: true,
        currentProvider: state.user.provider,
        currentChainId,
        recommendedAction: `Switch to Base network (chain ${GHIBLIFY_TOKEN_CONFIG.chainId}) for $GHIBLIFY token payments`
      };
    }

    return { required: false, currentChainId };
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
  chainId: GHIBLIFY_TOKEN_CONFIG.chainId as any,
};

// Convenience exports
export { GhiblifyTokenPaymentService };