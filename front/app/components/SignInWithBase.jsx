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

  const handleSignIn = async () => {
    setIsLoading(true);
    
    try {
      // Initialize the SDK with required configuration
      const baseAccountSDK = createBaseAccountSDK(BASE_ACCOUNT_CONFIG);
      
      const provider = baseAccountSDK.getProvider();
      
      // 1. Get nonce from backend (with fallback to local generation)
      let nonce;
      try {
        const nonceResponse = await fetch('/api/auth/nonce', {
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (nonceResponse.ok) {
          nonce = await nonceResponse.text();
        } else {
          throw new Error('Backend nonce failed');
        }
      } catch (nonceError) {
        console.warn('Backend nonce generation failed, using local fallback:', nonceError);
        // Fallback to local nonce generation as recommended in Base docs
        nonce = window.crypto.randomUUID().replace(/-/g, '');
      }
      
      // 2. Connect and authenticate with Base Account
      const result = await provider.request({
        method: 'wallet_connect',
        params: [{
          version: '1',
          capabilities: {
            signInWithEthereum: {
              nonce,
              chainId: '0x2105' // Base Mainnet - 8453
            }
          }
        }]
      });
      
      // Safely extract data with proper error handling
      if (!result?.accounts?.[0]) {
        throw new Error('No accounts returned from wallet connection');
      }
      
      const account = result.accounts[0];
      const { address } = account;
      
      if (!account.capabilities?.signInWithEthereum) {
        throw new Error('Sign in with Ethereum capability not available');
      }
      
      const { message, signature } = account.capabilities.signInWithEthereum;
      
      if (!address || !message || !signature) {
        throw new Error('Missing required authentication data');
      }
      
      // 3. Verify signature with backend (with extended timeout for Render)
      const verifyResponse = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, message, signature }),
        signal: AbortSignal.timeout(20000) // 20 second timeout for sleeping backend
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
      
      // Store authentication data
      localStorage.setItem('ghiblify_auth', JSON.stringify({
        address,
        timestamp: Date.now(),
        credits: authResult.credits || 0
      }));
      
      onSuccess?.(authResult);
      
    } catch (error) {
      console.error('Sign in with Base error:', error);
      
      // Fallback to traditional wallet connection if wallet_connect is not supported
      if (error?.message?.includes('method_not_supported') || error?.code === -32601) {
        try {
          await handleFallbackAuth();
        } catch (fallbackError) {
          console.error('Fallback authentication failed:', fallbackError);
          onError?.(fallbackError);
        }
      } else {
        onError?.(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFallbackAuth = async () => {
    const baseAccountSDK = createBaseAccountSDK(BASE_ACCOUNT_CONFIG);
    
    const provider = baseAccountSDK.getProvider();
    
    // Fallback: use eth_requestAccounts and personal_sign
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    const address = accounts[0];
    
    if (!address) {
      throw new Error('No address returned from wallet');
    }
    
    // Get nonce (with fallback to local generation)
    let nonce;
    try {
      const nonceResponse = await fetch('/api/auth/nonce', {
        signal: AbortSignal.timeout(10000)
      });
      
      if (nonceResponse.ok) {
        nonce = await nonceResponse.text();
      } else {
        throw new Error('Backend nonce failed');
      }
    } catch (nonceError) {
      console.warn('Backend nonce generation failed, using local fallback:', nonceError);
      nonce = window.crypto.randomUUID().replace(/-/g, '');
    }
    
    // Create SIWE message manually
    const domain = window.location.host;
    const uri = window.location.origin;
    const version = '1';
    const chainId = 8453; // Base Mainnet
    const issuedAt = new Date().toISOString();
    
    const message = `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nSign in with Ethereum to the app.\n\nURI: ${uri}\nVersion: ${version}\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${issuedAt}`;
    
    const signature = await provider.request({
      method: 'personal_sign',
      params: [message, address]
    });
    
    // Verify with backend
    const verifyResponse = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, message, signature }),
      signal: AbortSignal.timeout(20000) // 20 second timeout for sleeping backend
    });
    
    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json().catch(() => ({ error: 'Unknown error' }));
      
      // Handle specific backend unavailability
      if (verifyResponse.status === 503 || verifyResponse.status === 504) {
        throw new Error('Backend service is starting up. Please wait a moment and try again.');
      }
      
      throw new Error(errorData.error || `Fallback authentication failed: ${verifyResponse.status}`);
    }
    
    const result = await verifyResponse.json();
    
    // Store authentication data
    localStorage.setItem('ghiblify_auth', JSON.stringify({
      address,
      timestamp: Date.now(),
      credits: result.credits || 0
    }));
    
    onSuccess?.(result);
  };

  return (
    <SignInWithBaseButton
      colorScheme="light"
      onClick={handleSignIn}
      disabled={isLoading}
    />
  );
}