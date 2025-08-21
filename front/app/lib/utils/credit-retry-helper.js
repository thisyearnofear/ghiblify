/**
 * Credit Retry Helper
 * 
 * Handles timing issues in Farcaster mini app context where there can be
 * delays between payment completion and credit availability.
 */

/**
 * Retry credit spending with exponential backoff
 * This is particularly useful in Farcaster context where there can be
 * propagation delays after token payments
 */
export async function retrySpendCredits(spendCreditsFunction, refreshCreditsFunction, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000, // 1 second
    maxDelay = 5000, // 5 seconds
    backoffMultiplier = 2,
    amount = 1
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // If this is a retry attempt, refresh credits first
      if (attempt > 0) {
        console.log(`[Credit Retry] Attempt ${attempt + 1}/${maxRetries + 1} - Refreshing credits first`);
        await refreshCreditsFunction();
        
        // Add a small delay to allow state to propagate
        const delay = Math.min(initialDelay * Math.pow(backoffMultiplier, attempt - 1), maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Attempt to spend credits
      const result = await spendCreditsFunction(amount);
      
      if (attempt > 0) {
        console.log(`[Credit Retry] Success on attempt ${attempt + 1}`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Check if this is a credit-related error that might benefit from retry
      const isRetryableError = 
        error.message.includes("need credits") ||
        error.message.includes("Insufficient credits") ||
        error.message.includes("credits") ||
        error.status === 402;
      
      if (!isRetryableError || attempt === maxRetries) {
        // If it's not a retryable error or we've exhausted retries, throw
        throw error;
      }
      
      console.log(`[Credit Retry] Attempt ${attempt + 1} failed: ${error.message}. Retrying...`);
    }
  }
  
  // This should never be reached, but just in case
  throw lastError;
}

/**
 * Enhanced image processing with credit retry logic
 * Specifically designed for Farcaster mini app context
 */
export async function processImageWithRetry(
  processImageFunction,
  spendCreditsFunction,
  refreshCreditsFunction,
  refundCreditsFunction,
  options = {}
) {
  const { retryOptions = {}, ...processOptions } = options;
  
  try {
    // First, try to spend credits with retry logic
    await retrySpendCredits(spendCreditsFunction, refreshCreditsFunction, retryOptions);
    
    // If credit spending succeeded, proceed with image processing
    return await processImageFunction(processOptions);
    
  } catch (error) {
    // If we get here, either credit spending failed after all retries
    // or image processing failed after successful credit spending
    
    if (error.message.includes("need credits") || error.message.includes("Insufficient credits")) {
      // Credit spending failed - no need to refund
      throw error;
    } else {
      // Image processing failed after successful credit spending - refund
      try {
        await refundCreditsFunction(retryOptions.amount || 1);
        console.log('[Credit Retry] Refunded credits due to processing failure');
      } catch (refundError) {
        console.warn('[Credit Retry] Failed to refund credits:', refundError);
      }
      throw error;
    }
  }
}

/**
 * Check if we're in a Farcaster context where retry logic should be more aggressive
 */
export function shouldUseAggressiveRetry() {
  if (typeof window === 'undefined') return false;
  
  // Check for Farcaster frame indicators
  const isFarcasterFrame = 
    window.parent !== window || // In an iframe
    window.location !== window.parent.location || // Different location than parent
    document.referrer.includes('warpcast') ||
    document.referrer.includes('farcaster') ||
    window.navigator.userAgent.includes('farcaster');
    
  return isFarcasterFrame;
}

/**
 * Get retry options optimized for current context
 */
export function getContextOptimizedRetryOptions() {
  const isInFarcaster = shouldUseAggressiveRetry();
  
  if (isInFarcaster) {
    return {
      maxRetries: 4, // More retries in Farcaster
      initialDelay: 1500, // Longer initial delay
      maxDelay: 8000, // Longer max delay
      backoffMultiplier: 1.8 // Gentler backoff
    };
  } else {
    return {
      maxRetries: 2, // Fewer retries on desktop
      initialDelay: 500, // Shorter delay
      maxDelay: 3000, // Shorter max delay
      backoffMultiplier: 2
    };
  }
}