/**
 * Compatibility hook: useUnifiedWallet
 * Maps to the new consolidated useWallet hook while preserving legacy API.
 */
'use client';

import { useWallet } from './useWallet';

export function useUnifiedWallet() {
  const {
    isConnected,
    isLoading,
    error,
    user,
    address,
    provider,
    credits,
    connect,
    disconnect,
    refreshCredits,
    useCredits,
  } = useWallet();

  // Legacy alias used in older components
  const spendCredits = useCredits;

  return {
    isConnected,
    isLoading,
    error,
    user,
    address,
    provider,
    credits,
    connect,
    disconnect,
    refreshCredits,
    useCredits,
    spendCredits,
  };
}

export default useUnifiedWallet;