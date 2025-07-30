'use client';

import { createBaseAccountSDK } from "@base-org/account";
import { SignInWithBaseButton } from '@base-org/account-ui/react';
import { useState } from 'react';

export default function SignInWithBase({ onSuccess, onError }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    
    try {
      const provider = createBaseAccountSDK({
        appName: 'Ghiblify',
        appLogoUrl: '/ghibli-it.png',
        appDescription: 'Transform your photos into Studio Ghibli style art'
      }).getProvider();
      
      // 1. Get fresh nonce from backend
      const nonceResponse = await fetch('/api/auth/nonce');
      const nonce = await nonceResponse.text();
      
      // 2. Connect and authenticate with Base Account
      const { accounts } = await provider.request({
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
      
      const { address } = accounts[0];
      const { message, signature } = accounts[0].capabilities.signInWithEthereum;
      
      // 3. Verify signature with backend
      const verifyResponse = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, message, signature })
      });
      
      if (!verifyResponse.ok) {
        throw new Error('Authentication failed');
      }
      
      const result = await verifyResponse.json();
      onSuccess?.(result);
      
    } catch (error) {
      console.error('Sign in with Base error:', error);
      
      // Fallback to traditional wallet connection if wallet_connect is not supported
      if (error.message?.includes('method_not_supported')) {
        try {
          const provider = createBaseAccountSDK({
            appName: 'Ghiblify',
            appLogoUrl: '/ghibli-it.png',
            appDescription: 'Transform your photos into Studio Ghibli style art'
          }).getProvider();
          
          // Fallback: use eth_requestAccounts and personal_sign
          const accounts = await provider.request({ method: 'eth_requestAccounts' });
          const address = accounts[0];
          
          // Get nonce for signing
          const nonceResponse = await fetch('/api/auth/nonce');
          const nonce = await nonceResponse.text();
          
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
            body: JSON.stringify({ address, message, signature })
          });
          
          if (!verifyResponse.ok) {
            throw new Error('Authentication failed');
          }
          
          const result = await verifyResponse.json();
          onSuccess?.(result);
          
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

  return (
    <SignInWithBaseButton
      colorScheme="light"
      onClick={handleSignIn}
      disabled={isLoading}
    />
  );
}