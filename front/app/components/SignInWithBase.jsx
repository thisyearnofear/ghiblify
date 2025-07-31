'use client';

import { createBaseAccountSDK } from "@base-org/account";
import { SignInWithBaseButton } from '@base-org/account-ui/react';
import { useState } from 'react';

// Base Account SDK configuration
const BASE_ACCOUNT_CONFIG = {
  appName: "Ghiblify",
  appLogoUrl: "https://ghiblify-it.vercel.app/ghibli-it.png",
  appDescription: "Transform your photos into Studio Ghibli style art",
  appUrl: "https://ghiblify-it.vercel.app",
  // Optional: Add chain configuration
  chainId: 8453, // Base Mainnet
  // Optional: Add RPC URL for Base
  rpcUrl: "https://mainnet.base.org"
};

export default function SignInWithBase({ onSuccess, onError }) {
  const [isLoading, setIsLoading] = useState(false);

  // Helper function for exponential backoff retry
  const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries - 1) throw error;
        
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    
    try {
      // Initialize the SDK with required configuration
      const baseAccountSDK = createBaseAccountSDK(BASE_ACCOUNT_CONFIG);
      
      const provider = baseAccountSDK.getProvider();
      
      // 1. Get nonce from Next.js API route (more reliable)
      const nonce = await retryWithBackoff(async () => {
        const nonceResponse = await fetch(`/api/auth/nonce`, {
          signal: AbortSignal.timeout(10000) // Shorter timeout since it's local
        });
        
        if (!nonceResponse.ok) {
          throw new Error(`Nonce request failed: ${nonceResponse.status} ${nonceResponse.statusText}`);
        }
        
        const retrievedNonce = await nonceResponse.text();
        // Clean up any extra quotes
        const cleanNonce = retrievedNonce.replace(/^["']+|["']+$/g, '');
        console.log(`[DEBUG] Retrieved nonce: "${cleanNonce}"`);
        return cleanNonce;
      }, 3, 2000); // 3 retries with 2s base delay
      
      console.log(`[DEBUG] Using nonce: "${nonce}"`);
      
      // 2. Connect and get accounts first
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      
      if (!address) {
        throw new Error('No address returned from wallet');
      }
      
      // 3. Create SIWE message manually for better compatibility
      const domain = window.location.host;
      const uri = window.location.origin;
      const version = '1';
      const chainId = 8453; // Base Mainnet
      const issuedAt = new Date().toISOString();
      
      const message = `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nSign in with Ethereum to the app.\n\nURI: ${uri}\nVersion: ${version}\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${issuedAt}`;
      
      console.log(`[DEBUG] Created SIWE message:`, message);
      
      // 4. Request signature
      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, address]
      });
      
      // 5. Verify signature with Next.js API route (more reliable)
      console.log('[DEBUG] Sending verification request:', {
        address,
        messageLength: message.length,
        signatureLength: signature.length,
        messagePreview: message.substring(0, 200) + '...'
      });

      const verifyResponse = await fetch(`/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, message, signature }),
        signal: AbortSignal.timeout(15000) // Shorter timeout since it's local
      });
      
      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json().catch(() => ({ error: 'Unknown error' }));
        
        // Handle specific backend unavailability
        if (verifyResponse.status === 503 || verifyResponse.status === 504) {
          throw new Error('Backend service is starting up. Please wait a moment and try again.');
        }
        
        throw new Error(errorData.error || `Authentication failed: ${verifyResponse.status}`);
      }
      
      const authResult = await verifyResponse.json();

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

      onSuccess?.({ ...authResult, credits });
      
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