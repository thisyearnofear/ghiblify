'use client';

import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { WagmiConfig as WagmiConfigProvider } from 'wagmi';
import { mainnet, polygon } from 'viem/chains';
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const config = getDefaultConfig({
  appName: 'Ghiblify',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [mainnet, polygon],
  ssr: true
});

const queryClient = new QueryClient();

export function WagmiConfig({ children }) {
  return (
    <WagmiConfigProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider chains={[mainnet, polygon]}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfigProvider>
  );
}
