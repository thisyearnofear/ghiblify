'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useEffect } from 'react';

export default function Web3Button() {
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (isConnected && address) {
      // Send the address to your backend to get/create a session
      fetch('http://localhost:8000/api/auth/web3/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      })
        .then(res => res.json())
        .then(data => {
          // Store the session token
          localStorage.setItem('ghiblify_token', data.token);
        })
        .catch(console.error);
    }
  }, [isConnected, address]);

  return <ConnectButton />;
}
