'use client';

import { getDefaultWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiConfig } from 'wagmi';
import { mainnet, polygon, base } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { farcasterFrame } from '@farcaster/frame-wagmi-connector';
import { createConfig, configureChains } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';

// Configure chains and providers
const { chains, publicClient } = configureChains(
  [mainnet, polygon, base],
  [publicProvider()]
);

// Get RainbowKit connectors
const { connectors: rainbowConnectors } = getDefaultWallets({
  appName: 'Ghiblify',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  chains
});

// Combine RainbowKit and Farcaster connectors
const connectors = [...rainbowConnectors, farcasterFrame()];

// Create Wagmi config
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient
});

// Create React Query client
const queryClient = new QueryClient();

export function Web3Provider({ children }) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider chains={chains}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}
