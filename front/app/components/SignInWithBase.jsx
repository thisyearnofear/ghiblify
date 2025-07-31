'use client';

import { createBaseAccountSDK } from "@base-org/account";
import { SignInWithBaseButton } from '@base-org/account-ui/react';
import { useState } from 'react';

export default function SignInWithBase({ onSuccess, onError }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    
    try {
      // Initialize the SDK (no config needed for defaults as per docs)
      const provider = createBaseAccountSDK().getProvider();
      
      // 1. Generate nonce locally (as recommended in docs)
      const nonce = window.crypto.randomUUID().replace(/-/g, '');
      console.log(`[DEBUG] Generated nonce: "${nonce}"`);
      
      // 2. Connect and authenticate using Base Account SDK's wallet_connect method
      const { accounts } = await provider.request({
        method: 'wallet_connect',
        params: [{
          version: '1',
          capabilities: {
            signInWithEthereum: { 
              nonce, 
              chainId: '0x2105' // Base Mainnet - 8453 in hex
            }
          }
        }]
      });
      
      const { address } = accounts[0];
      const { message, signature } = accounts[0].capabilities.signInWithEthereum;
      
      console.log(`[DEBUG] Base Account SIWE - Address: ${address}`);
      console.log(`[DEBUG] Base Account SIWE - Message:`, message);
      
      // 3. Verify signature with backend
      const verifyResponse = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, message, signature })
      });
      
      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Authentication failed: ${verifyResponse.status}`);
      }
      
      const verificationResult = await verifyResponse.json();

      // Fetch credits separately from backend (optional)
      let credits = 0;
      try {
        const backendUrl = process.env.NODE_ENV === 'production' ? 'https://ghiblify.onrender.com' : 'http://localhost:8000';
        const creditsResponse = await fetch(`${backendUrl}/api/web3/credits/get?address=${address}`, {
          signal: AbortSignal.timeout(5000)
        });
        if (creditsResponse.ok) {
          const creditsData = await creditsResponse.json();
          credits = creditsData.credits || 0;
        }
      } catch (creditsError) {
        console.log('Could not fetch credits from backend, using default:', creditsError.message);
      }

      // Store authentication data
      localStorage.setItem('ghiblify_auth', JSON.stringify({
        address,
        timestamp: Date.now(),
        credits,
        authenticated: true
      }));

      onSuccess?.({ ...verificationResult, credits });
      
    } catch (error) {
      console.error('Sign in with Base error:', error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <SignInWithBaseButton
      colorScheme="light"
      onClick={handleSignIn}
      disabled={isLoading}
    />
  );
}