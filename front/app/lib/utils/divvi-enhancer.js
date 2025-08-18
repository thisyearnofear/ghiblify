/**
 * Divvi Transaction Enhancer
 * Minimal utility that leverages existing wagmi infrastructure
 * Adds Divvi tracking to existing writeContractAsync calls
 */

// Divvi configuration
const DIVVI_CONFIG = {
  consumerAddress: process.env.NEXT_PUBLIC_DIVVI_CONSUMER_ADDRESS || '0x55A5705453Ee82c742274154136Fce8149597058',
  enabled: process.env.NEXT_PUBLIC_DIVVI_ENABLED !== 'false',
  supportedChains: [42220, 8453], // Celo and Base
};

/**
 * Enhanced writeContractAsync that includes Divvi tracking
 * Drop-in replacement for existing writeContractAsync calls
 */
export function createDivviEnhancedWriteContract(originalWriteContractAsync, publicClient) {
  return async (contractConfig) => {
    try {
      // Execute original transaction
      const hash = await originalWriteContractAsync(contractConfig);
      
      // Add Divvi tracking in background (non-blocking)
      if (DIVVI_CONFIG.enabled && publicClient) {
        submitDivviReferral(hash, publicClient).catch(error => {
          console.warn('[Divvi] Referral submission failed (non-critical):', error.message);
        });
      }
      
      return hash;
    } catch (error) {
      // Don't interfere with original error handling
      throw error;
    }
  };
}

/**
 * Enhanced success callback that includes Divvi tracking
 * Wraps existing success handlers
 */
export function createDivviEnhancedSuccess(originalSuccess, chainId) {
  return (txHashOrResult) => {
    // Extract transaction hash
    const txHash = typeof txHashOrResult === 'string' 
      ? txHashOrResult 
      : txHashOrResult?.hash || txHashOrResult?.transactionHash;
    
    // Submit Divvi referral in background
    if (txHash && DIVVI_CONFIG.enabled && DIVVI_CONFIG.supportedChains.includes(chainId)) {
      submitDivviReferral(txHash, { chain: { id: chainId } }).catch(error => {
        console.warn('[Divvi] Referral submission failed (non-critical):', error.message);
      });
    }
    
    // Call original success handler
    if (originalSuccess) {
      return originalSuccess(txHashOrResult);
    }
  };
}

/**
 * Submit Divvi referral (internal function)
 */
async function submitDivviReferral(txHash, publicClient) {
  if (!DIVVI_CONFIG.enabled) return;
  
  try {
    const chainId = publicClient.chain?.id || 8453;
    
    if (!DIVVI_CONFIG.supportedChains.includes(chainId)) {
      return;
    }
    
    // Dynamically import Divvi SDK to avoid build issues
    const { submitReferral } = await import('@divvi/referral-sdk');
    
    await submitReferral({
      txHash,
      chainId,
    });
    
    console.log(`[Divvi] ✅ Referral submitted for tx ${txHash} on chain ${chainId}`);
  } catch (error) {
    // Silent failure - don't disrupt user experience
    console.warn('[Divvi] Referral submission failed:', error.message);
  }
}

/**
 * Check if Divvi is enabled for debugging
 */
export function isDivviEnabled() {
  return DIVVI_CONFIG.enabled;
}

/**
 * Get Divvi status for debugging
 */
export function getDivviStatus() {
  return {
    enabled: DIVVI_CONFIG.enabled,
    consumerAddress: DIVVI_CONFIG.consumerAddress,
    supportedChains: DIVVI_CONFIG.supportedChains,
  };
}