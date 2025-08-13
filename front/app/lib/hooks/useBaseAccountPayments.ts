// React hook for Base Account payments
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { baseAccountPayments } from '../services/base-account-payments';
import { 
  PaymentStatus,
  BaseAccountError 
} from '../types/base-account';
import { 
  PaymentHandlerOptions, 
  PaymentCompletionResult 
} from '../services/base-account-payments';

interface UseBaseAccountPaymentsReturn {
  status: PaymentStatus;
  isProcessing: boolean;
  error: string | null;
  lastResult: PaymentCompletionResult | null;
  processPayment: (tierName: string, options?: PaymentProcessOptions) => Promise<PaymentCompletionResult | null>;
  cancelPayment: () => void;
  clearError: () => void;
  isAvailable: boolean;
}

interface PaymentProcessOptions {
  onComplete?: (result: PaymentCompletionResult) => void;
  onStatusUpdate?: (status: PaymentStatus) => void;
}

export function useBaseAccountPayments(): UseBaseAccountPaymentsReturn {
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<PaymentCompletionResult | null>(null);
  const currentPaymentIdRef = useRef<string | null>(null);

  const processPayment = useCallback(async (
    tierName: string,
    options: PaymentProcessOptions = {}
  ): Promise<PaymentCompletionResult | null> => {
    try {
      setError(null);
      setLastResult(null);
      
      const paymentOptions: PaymentHandlerOptions = {
        onStatusChange: (newStatus: PaymentStatus) => {
          setStatus(newStatus);
          options.onStatusUpdate?.(newStatus);
        },
        onComplete: (result: PaymentCompletionResult) => {
          setLastResult(result);
          currentPaymentIdRef.current = null;
          options.onComplete?.(result);
        },
        onError: (err: BaseAccountError) => {
          setError(err.message);
          currentPaymentIdRef.current = null;
        },
      };

      const result = await baseAccountPayments.processPayment(tierName, paymentOptions);
      return result;

    } catch (err) {
      const errorMessage = err instanceof BaseAccountError 
        ? err.message 
        : 'Payment processing failed';
      setError(errorMessage);
      setStatus('failed');
      console.error('Payment error:', err);
      return null;
    }
  }, []);

  const cancelPayment = useCallback(() => {
    if (currentPaymentIdRef.current) {
      baseAccountPayments.cancelPayment(currentPaymentIdRef.current);
      currentPaymentIdRef.current = null;
    }
    setStatus('idle');
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      baseAccountPayments.cancelAllPayments();
    };
  }, []);

  const isProcessing = status === 'initiating' || 
                      status === 'pending' || 
                      status === 'processing' || 
                      status === 'polling';

  const isAvailable = baseAccountPayments.isAvailable();

  return {
    status,
    isProcessing,
    error,
    lastResult,
    processPayment,
    cancelPayment,
    clearError,
    isAvailable,
  };
}