/**
 * Divvi Transaction Wrapper
 * Lightweight utility for adding Divvi tracking to existing transactions
 * Zero-config integration that works with existing payment handlers
 */

// Divvi configuration
const DIVVI_CONFIG = {
  consumerAddress: process.env.NEXT_PUBLIC_DIVVI_CONSUMER_ADDRESS || '0x55A5705453Ee82c742274154136Fce8149597058',
  enabled: process.env.NEXT_PUBLIC_DIVVI_ENABLED !== 'false',
  supportedChains: [42220, 8453], // Celo and Base
};

/**
 * Check if Divvi is available and enabled
 */
function isDivviAvailable() {
  try {
    return DIVVI_CONFIG.enabled && 
           typeof window !== 'undefined' && 
           window.getReferralTag && 
           window.submitReferral;
  } catch {
    return false;
  }
}

/**
 * Submit referral tracking after transaction confirmation
 * Non-blocking operation that won't affect user experience
 */
async function submitDivviReferral(txHash, chainId) {
  if (!isDivviAvailable() || !DIVVI_CONFIG.supportedChains.includes(chainId)) {
    return;
  }

  try {
    // Dynamically import Divvi SDK to avoid build issues
    const { submitReferral } = await import('@divvi/referral-sdk');
    
    await submitReferral({
      txHash,
      chainId,
    });

    console.log(`[Divvi] ✅ Referral submitted for tx ${txHash} on chain ${chainId}`);
  } catch (error) {
    // Silent failure - don't disrupt user experience
    console.warn('[Divvi] ⚠️ Referral submission failed (non-critical):', error.message);
  }
}

/**
 * Wrap existing transaction handlers with Divvi tracking
 * Usage: const enhancedHandler = withDivviTracking(originalHandler, chainId);
 */
export function withDivviTracking(originalHandler, chainId = 8453) {
  return async (...args) => {
    try {
      // Execute original transaction handler
      const result = await originalHandler(...args);
      
      // Extract transaction hash from result
      let txHash = null;
      if (typeof result === 'string') {
        txHash = result; // Direct hash return
      } else if (result && result.hash) {
        txHash = result.hash; // Object with hash property
      } else if (result && result.transactionHash) {
        txHash = result.transactionHash; // Alternative property name
      }
      
      // Submit Divvi referral in background (non-blocking)
      if (txHash) {
        submitDivviReferral(txHash, chainId).catch(() => {
          // Silent failure
        });
      }
      
      return result;
    } catch (error) {
      // Don't interfere with original error handling
      throw error;
    }
  };
}

/**
 * Enhanced success handler that includes Divvi tracking
 * Usage: const enhancedSuccess = withDivviSuccess(originalSuccess, chainId);
 */
export function withDivviSuccess(originalSuccess, chainId = 8453) {
  return (txHashOrResult) => {
    // Extract transaction hash
    const txHash = typeof txHashOrResult === 'string' 
      ? txHashOrResult 
      : txHashOrResult?.hash || txHashOrResult?.transactionHash;
    
    // Submit Divvi referral in background
    if (txHash) {
      submitDivviReferral(txHash, chainId).catch(() => {
        // Silent failure
      });
    }
    
    // Call original success handler
    if (originalSuccess) {
      return originalSuccess(txHashOrResult);
    }
  };
}

/**
 * Get Divvi integration status for debugging
 */
export function getDivviStatus() {
  return {
    enabled: DIVVI_CONFIG.enabled,
    available: isDivviAvailable(),
    consumerAddress: DIVVI_CONFIG.consumerAddress,
    supportedChains: DIVVI_CONFIG.supportedChains,
  };
}

/**
 * Manual referral submission for custom integrations
 */
export { submitDivviReferral };

// Log integration status on load (development only)
if (process.env.NODE_ENV === 'development') {
  console.log('[Divvi] Integration status:', getDivviStatus());
}