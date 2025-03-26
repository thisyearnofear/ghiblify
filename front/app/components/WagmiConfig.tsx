"use client";

import { createConfig } from "@wagmi/core";
import { WagmiProvider } from "wagmi";
import { mainnet } from "@wagmi/core/chains";
import { http, createClient } from "viem";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export const config = createConfig({
  chains: [mainnet],
  connectors: [farcasterFrame()],
  client({ chain }) {
    return createClient({
      chain,
      transport: http(chain.rpcUrls.default.http[0]),
    });
  },
});

const queryClient = new QueryClient();

export function WagmiConfig({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
