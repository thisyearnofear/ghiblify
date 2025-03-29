'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useEffect } from 'react';
import Web3Avatar from './Web3Avatar';

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
          localStorage.setItem('ghiblify_token', data.token);
        })
        .catch(console.error);
    }
  }, [isConnected, address]);

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        if (!ready) return null;

        if (!account) {
          return (
            <button 
              onClick={openConnectModal} 
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              Connect Wallet
            </button>
          );
        }

        if (chain?.unsupported) {
          return (
            <button 
              onClick={openChainModal} 
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Wrong network
            </button>
          );
        }

        return (
          <div className="flex items-center gap-4">
            <button
              onClick={openChainModal}
              type="button"
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              {chain.name}
            </button>

            <button 
              onClick={openAccountModal} 
              type="button"
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <Web3Avatar address={account.address} size={24} />
              <span>{account.displayName}</span>
              {account.displayBalance && (
                <span className="text-gray-500">
                  {account.displayBalance}
                </span>
              )}
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
