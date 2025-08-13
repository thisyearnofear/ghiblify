// React hook for Base Account authentication
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { baseAccountAuth } from '../services/base-account-auth';
import { 
  BaseAccountUser, 
  AuthenticationStatus,
  BaseAccountError 
} from '../types/base-account';

interface UseBaseAccountAuthReturn {
  user: BaseAccountUser | null;
  status: AuthenticationStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  authenticate: () => Promise<void>;
  signOut: () => void;
  refreshCredits: () => Promise<void>;
  clearError: () => void;
}

export function useBaseAccountAuth(): UseBaseAccountAuthReturn {
  const [user, setUser] = useState<BaseAccountUser | null>(null);
  const [status, setStatus] = useState<AuthenticationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize on mount
  useEffect(() => {
    // Get initial state
    setUser(baseAccountAuth.getCurrentUser());
    setStatus(baseAccountAuth.getStatus());

    // Subscribe to status changes
    const unsubscribe = baseAccountAuth.onStatusChange((newStatus) => {
      setStatus(newStatus);
      if (newStatus === 'authenticated') {
        setUser(baseAccountAuth.getCurrentUser());
        setError(null);
      } else if (newStatus === 'idle') {
        setUser(null);
        setError(null);
      }
    });

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const authenticate = useCallback(async () => {
    try {
      setError(null);
      const authenticatedUser = await baseAccountAuth.authenticate();
      setUser(authenticatedUser);
    } catch (err) {
      const errorMessage = err instanceof BaseAccountError 
        ? err.message 
        : 'Authentication failed';
      setError(errorMessage);
      console.error('Authentication error:', err);
    }
  }, []);

  const signOut = useCallback(() => {
    setError(null);
    baseAccountAuth.signOut();
    setUser(null);
  }, []);

  const refreshCredits = useCallback(async () => {
    try {
      setError(null);
      await baseAccountAuth.refreshCredits();
      setUser(baseAccountAuth.getCurrentUser());
    } catch (err) {
      const errorMessage = err instanceof BaseAccountError 
        ? err.message 
        : 'Failed to refresh credits';
      setError(errorMessage);
      console.error('Credits refresh error:', err);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const isLoading = status === 'connecting' || status === 'signing' || status === 'verifying';
  const isAuthenticated = status === 'authenticated' && !!user;

  return {
    user,
    status,
    isAuthenticated,
    isLoading,
    error,
    authenticate,
    signOut,
    refreshCredits,
    clearError,
  };
}