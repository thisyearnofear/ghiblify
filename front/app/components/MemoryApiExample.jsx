/**
 * Simple Memory API Example Component
 * 
 * Demonstrates cross-platform identity mapping for the Memory API Builder Rewards initiative.
 */

import { useState, useEffect } from 'react';
import { useMemoryApi } from '../lib/hooks/useMemoryApi';

export default function MemoryApiExample({ address, farcasterUsername }) {
  const { 
    getIdentityGraph, 
    getSocialGraph, 
    createUnifiedProfile,
    isLoading, 
    error 
  } = useMemoryApi();
  
  const [identityData, setIdentityData] = useState(null);

  // Check if Memory API is available
  const isMemoryApiAvailable = typeof process !== 'undefined' && 
    process.env.NEXT_PUBLIC_MEMORY_API_KEY;

  // Fetch identity data when component mounts or when address/username changes
  useEffect(() => {
    if (isMemoryApiAvailable && (address || farcasterUsername)) {
      fetchIdentityData();
    }
  }, [address, farcasterUsername, isMemoryApiAvailable]);

  const fetchIdentityData = async () => {
    try {
      // Determine identifier type
      const isAddress = address && address.startsWith('0x') && address.length === 42;
      const identifier = isAddress ? address : farcasterUsername;
      const type = isAddress ? 'address' : 'farcaster';
      
      if (!identifier) return;
      
      // Fetch unified profile
      let profile;
      if (isAddress) {
        profile = await createUnifiedProfile(address, farcasterUsername);
      } else {
        // For Farcaster username, first get wallet address
        const walletAddress = await getWalletAddressForFarcasterUser(farcasterUsername);
        if (walletAddress) {
          profile = await createUnifiedProfile(walletAddress, farcasterUsername);
        }
      }
      
      setIdentityData(profile);
    } catch (err) {
      console.error('Memory API error:', err);
    }
  };

  if (!isMemoryApiAvailable) {
    return (
      <div style={{ padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '0.5rem' }}>
        <h3>Memory API Integration</h3>
        <p>Memory API key not configured. Set NEXT_PUBLIC_MEMORY_API_KEY to enable cross-platform identity mapping.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', marginTop: '1rem' }}>
      <h3>Memory API Integration</h3>
      
      {isLoading && <p>Loading identity data...</p>}
      
      {error && (
        <div style={{ color: 'red', padding: '0.5rem' }}>
          Error: {error}
        </div>
      )}
      
      {identityData && (
        <div>
          <h4>Unified Identity Profile</h4>
          <div style={{ marginTop: '0.5rem' }}>
            <p><strong>Wallet Address:</strong> {identityData.wallet?.address || 'N/A'}</p>
            {identityData.farcaster?.username && (
              <p><strong>Farcaster Username:</strong> @{identityData.farcaster.username}</p>
            )}
            {identityData.wallet?.identities && Object.keys(identityData.wallet.identities).length > 0 && (
              <p><strong>Connected Platforms:</strong> {Object.keys(identityData.wallet.identities).join(', ')}</p>
            )}
            {identityData.social && Object.keys(identityData.social).length > 0 && (
              <p><strong>Social Data:</strong> Available</p>
            )}
          </div>
        </div>
      )}
      
      <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#718096' }}>
        <p>This integration enables cross-platform identity mapping for the Memory API Builder Rewards initiative.</p>
      </div>
    </div>
  );
}