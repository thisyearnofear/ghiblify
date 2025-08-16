/**
 * Auto-Connection Hook for Farcaster Mini Apps
 * 
 * Provides auto-connection functionality with smart fallbacks
 */

import { useEffect, useState } from 'react';
import { useUnifiedWallet } from './useUnifiedWallet';
import { useFarcaster } from '../../components/FarcasterFrameProvider';
import { autoConnectionService } from '../services/auto-connection-service';

export function useAutoConnection() {
  const { isConnected, address } = useUnifiedWallet();
  const { isInFrame, isReady } = useFarcaster();
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    // Only auto-connect in Farcaster frames, when ready, not already connected,
    // and haven't already attempted
    if (!isInFrame || !isReady || isConnected || hasAttempted || isAutoConnecting) {
      return;
    }

    const attemptConnection = async () => {
      setIsAutoConnecting(true);
      setHasAttempted(true);

      try {
        // In Farcaster context, we might get address from frame data
        // For now, we'll let the manual connection handle this
        console.log('[AutoConnection] Frame ready, waiting for user to connect');
      } catch (error) {
        console.log('[AutoConnection] Auto-connection failed:', error);
      } finally {
        setIsAutoConnecting(false);
      }
    };

    // Small delay to ensure everything is properly initialized
    const timer = setTimeout(attemptConnection, 300);
    return () => clearTimeout(timer);
  }, [isInFrame, isReady, isConnected, hasAttempted, isAutoConnecting]);

  return {
    isAutoConnecting,
    hasAttempted,
  };
}