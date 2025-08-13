// Modular Base Account payment service - Fixed for SDK v1.1.1
import { pay, getPaymentStatus } from "@base-org/account";
import { api } from '../config/api';
import { baseAccountAuth } from './base-account-auth';
import { 
  PaymentRequest, 
  PaymentResult, 
  PaymentStatus,
  BaseAccountError 
} from '../types/base-account';

interface PaymentConfig {
  recipientAddress: string;
  testnet: boolean;
  pollInterval: number;
  maxPollAttempts: number;
}

interface TierPricing {
  name: string;
  original: number;
  discounted: number;
  credits: number;
  savings: number;
  discount: number;
}

interface PaymentHandlerOptions {
  onStatusChange?: (status: PaymentStatus) => void;
  onComplete?: (result: PaymentCompletionResult) => void;
  onError?: (error: BaseAccountError) => void;
}

interface PaymentCompletionResult {
  paymentId: string;
  creditsAdded: number;
  newBalance: number;
  tier: string;
}

class BaseAccountPaymentService {
  private config: PaymentConfig;
  private activePayments: Map<string, AbortController> = new Map();

  constructor() {
    this.config = {
      recipientAddress: process.env.NEXT_PUBLIC_BASE_PAY_RECIPIENT_ADDRESS || '',
      testnet: process.env.NEXT_PUBLIC_BASE_PAY_TESTNET === 'true',
      pollInterval: 2000, // 2 seconds
      maxPollAttempts: 150, // 5 minutes total (150 * 2s)
    };

    if (!this.config.recipientAddress) {
      console.warn('BASE_PAY_RECIPIENT_ADDRESS not configured');
    }
  }

  // Validate payment prerequisites
  private validatePaymentPrerequisites(): void {
    if (!baseAccountAuth.isAuthenticated()) {
      throw new BaseAccountError('User must be authenticated with Base Account to make payments');
    }

    if (!this.config.recipientAddress) {
      throw new BaseAccountError('Payment recipient address not configured');
    }
  }

  // Get tier pricing from backend
  private async getTierPricing(tierName: string): Promise<TierPricing> {
    try {
      const response = await api.get('/api/base-pay/pricing');
      const pricing = response[tierName.toLowerCase()];
      
      if (!pricing) {
        throw new BaseAccountError(`Pricing not found for tier: ${tierName}`);
      }

      // Backend uses different field names: amount, original_amount instead of discounted_price, base_price
      const discountedPrice = parseFloat(pricing.amount);
      const originalPrice = parseFloat(pricing.original_amount);

      return {
        name: tierName,
        original: originalPrice,
        discounted: discountedPrice,
        credits: pricing.credits,
        savings: originalPrice - discountedPrice,
        discount: pricing.discount === '30%' ? 30 : 0,
      };
    } catch (error) {
      throw new BaseAccountError(`Failed to fetch pricing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Fixed payment initiation using correct SDK v1.1.1 API
  private async initiatePayment(pricing: TierPricing): Promise<PaymentResult> {
    try {
      // Validate pricing object
      if (!pricing || typeof pricing.discounted !== 'number' || isNaN(pricing.discounted)) {
        throw new BaseAccountError(`Invalid pricing data: ${JSON.stringify(pricing)}`);
      }

      // Simplified payment request without callback URL for now
      // We'll poll for payment status instead of relying on webhooks
      const paymentRequest = {
        amount: pricing.discounted.toString(),
        to: this.config.recipientAddress,
        testnet: this.config.testnet,
      };

      console.log(`[Base Pay] Initiating payment for ${pricing.name}:`, {
        amount: pricing.discounted,
        original: pricing.original,
        savings: pricing.savings,
      });

      const result = await pay(paymentRequest);

      // Handle different result structures
      if ('error' in result) {
        throw new BaseAccountError(`Payment initiation failed: ${result.error}`);
      }

      // Extract payment ID from result
      const paymentId = (result as any).id || (result as any).paymentId || Date.now().toString();

      return {
        id: paymentId,
        status: 'pending',
        amount: pricing.discounted.toString(),
      };
    } catch (error) {
      throw new BaseAccountError(`Payment initiation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Poll payment status
  private async pollPaymentStatus(
    paymentId: string, 
    tier: TierPricing,
    options: PaymentHandlerOptions = {}
  ): Promise<PaymentCompletionResult> {
    const { onStatusChange } = options;
    const abortController = new AbortController();
    this.activePayments.set(paymentId, abortController);

    let attempts = 0;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          if (abortController.signal.aborted) {
            reject(new BaseAccountError('Payment polling was cancelled'));
            return;
          }

          attempts++;
          if (attempts > this.config.maxPollAttempts) {
            reject(new BaseAccountError('Payment polling timeout - please check payment status manually'));
            return;
          }

          const statusResult = await getPaymentStatus({
            id: paymentId,
            testnet: this.config.testnet,
          });

          const status = statusResult.status as string;
          onStatusChange?.(status as PaymentStatus);

          if (status === 'completed') {
            try {
              const result = await this.processCompletedPayment(paymentId, tier);
              this.activePayments.delete(paymentId);
              resolve(result);
            } catch (error) {
              this.activePayments.delete(paymentId);
              reject(error);
            }
          } else if (status === 'failed') {
            this.activePayments.delete(paymentId);
            reject(new BaseAccountError('Payment failed'));
          } else if (status === 'pending' || status === 'processing') {
            setTimeout(poll, this.config.pollInterval);
          } else {
            // Unknown status, continue polling
            setTimeout(poll, this.config.pollInterval);
          }
        } catch (error) {
          // Handle network errors by retrying
          if (error instanceof Error && (
            error.message.includes('RPC error') ||
            error.message.includes('network') ||
            error.message.includes('fetch')
          )) {
            setTimeout(poll, this.config.pollInterval * 1.5); // Longer delay for network errors
            return;
          }

          this.activePayments.delete(paymentId);
          reject(new BaseAccountError(`Payment status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      // Start polling
      poll();
    });
  }

  // Process completed payment with backend
  private async processCompletedPayment(paymentId: string, tier: TierPricing): Promise<PaymentCompletionResult> {
    try {
      const user = baseAccountAuth.getCurrentUser();
      if (!user) {
        throw new BaseAccountError('User not authenticated');
      }

      const response = await api.post('/api/base-pay/process-payment', {
        id: paymentId,
        status: 'completed',
        amount: tier.discounted.toString(),
        originalAmount: tier.original.toString(),
        discount: `${tier.discount}%`,
        to: this.config.recipientAddress,
        from: user.address,
        tier: tier.name.toLowerCase(),
        timestamp: new Date().toISOString(),
      });

      // Refresh user credits
      await baseAccountAuth.refreshCredits();

      return {
        paymentId,
        creditsAdded: response.credits_added,
        newBalance: response.new_balance,
        tier: tier.name,
      };
    } catch (error) {
      throw new BaseAccountError(`Payment processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Public API
  async processPayment(
    tierName: string, 
    options: PaymentHandlerOptions = {}
  ): Promise<PaymentCompletionResult> {
    const { onStatusChange, onComplete, onError } = options;

    try {
      // Validate prerequisites
      this.validatePaymentPrerequisites();

      // Get pricing
      onStatusChange?.('initiating');
      const pricing = await this.getTierPricing(tierName);

      // Initiate payment
      const paymentResult = await this.initiatePayment(pricing);

      // Poll for completion
      onStatusChange?.('polling');
      const completionResult = await this.pollPaymentStatus(paymentResult.id, pricing, {
        onStatusChange,
      });

      onStatusChange?.('completed');
      onComplete?.(completionResult);

      return completionResult;

    } catch (error) {
      const baseError = error instanceof BaseAccountError 
        ? error 
        : new BaseAccountError(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      onStatusChange?.('failed');
      onError?.(baseError);
      throw baseError;
    }
  }

  // Cancel active payment polling
  cancelPayment(paymentId: string): void {
    const controller = this.activePayments.get(paymentId);
    if (controller) {
      controller.abort();
      this.activePayments.delete(paymentId);
    }
  }

  // Cancel all active payments
  cancelAllPayments(): void {
    this.activePayments.forEach((controller, paymentId) => {
      controller.abort();
    });
    this.activePayments.clear();
  }

  // Get payment history
  async getPaymentHistory(): Promise<any[]> {
    try {
      const user = baseAccountAuth.getCurrentUser();
      if (!user) {
        throw new BaseAccountError('User not authenticated');
      }

      const response = await api.get(`/api/base-pay/history/${user.address}`);
      return response.transactions || [];
    } catch (error) {
      throw new BaseAccountError(`Failed to fetch payment history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Check if payment method is available
  isAvailable(): boolean {
    return !!this.config.recipientAddress && baseAccountAuth.isAuthenticated();
  }

  // Get configuration
  getConfig(): Readonly<PaymentConfig> {
    return { ...this.config };
  }
}

// Singleton instance
export const baseAccountPayments = new BaseAccountPaymentService();

// Convenience exports
export { BaseAccountPaymentService };
export type { PaymentHandlerOptions, PaymentCompletionResult, TierPricing };