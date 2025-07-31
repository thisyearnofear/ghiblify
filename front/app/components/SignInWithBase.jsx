'use client';

import { createBaseAccountSDK } from "@base-org/account";
import { SignInWithBaseButton } from '@base-org/account-ui/react';
import { useState } from 'react';

// Base Account SDK configuration (required despite docs suggesting defaults work)
const BASE_ACCOUNT_CONFIG = {
  appName: "Ghiblify",
  appLogoUrl: "https://ghiblify-it.vercel.app/ghibli-it.png",
  appDescription: "Transform your photos into Studio Ghibli style art",
  appUrl: "https://ghiblify-it.vercel.app"
};

export default function SignInWithBase({ onSuccess, onError }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    
    try {
      // Initialize the SDK with required configuration
      const provider = createBaseAccountSDK(BASE_ACCOUNT_CONFIG).getProvider();
      
      // 1. Generate nonce locally (as recommended in docs)
      const nonce = window.crypto.randomUUID().replace(/-/g, '');
      console.log(`[DEBUG] Generated nonce: "${nonce}"`);
      
      // 2. Connect and authenticate using Base Account SDK's wallet_connect method
      let address, message, signature;
      
      try {
        // Try the new wallet_connect method first (Base Account SDK)
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
        
        address = accounts[0].address;
        const siweData = accounts[0].capabilities.signInWithEthereum;
        message = siweData.message;
        signature = siweData.signature;
        
        console.log(`[DEBUG] Base Account SIWE - Address: ${address}`);
        console.log(`[DEBUG] Base Account SIWE - Message:`, message);
        
      } catch (walletConnectError) {
        console.log('[DEBUG] wallet_connect failed, falling back to eth_requestAccounts + personal_sign:', walletConnectError.message);
        
        // Fallback for wallets that don't support wallet_connect yet
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        address = accounts[0];
        
        if (!address) {
          throw new Error('No address returned from wallet');
        }
        
        // Create SIWE message manually following EIP-4361 standard
        const domain = window.location.host;
        const uri = window.location.origin;
        const version = '1';
        const chainId = 8453; // Base Mainnet
        const issuedAt = new Date().toISOString();
        
        // Standard SIWE message format
        message = `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nSign in with Ethereum to the app.\n\nURI: ${uri}\nVersion: ${version}\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${issuedAt}`;
        
        console.log(`[DEBUG] Created manual SIWE message:`, message);
        
        // Request signature - personal_sign can accept raw message string
        signature = await provider.request({
          method: 'personal_sign',
          params: [message, address]
        });
      }
      
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