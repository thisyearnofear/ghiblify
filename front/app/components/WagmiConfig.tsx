"use client";

import { createConfig } from "@wagmi/core";
import { WagmiProvider } from "wagmi";
import { mainnet, polygon, base } from "@wagmi/core/chains";
import { http, createClient } from "viem";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Define Celo Mainnet (matching Web3Provider.js)
const celoMainnet = {
  id: 42220,
  name: "Celo",
  network: "celo",
  nativeCurrency: {
    decimals: 18,
    name: "Celo",
    symbol: "CELO",
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_CELO_RPC_URL || "https://forno.celo.org"],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_CELO_RPC_URL || "https://forno.celo.org"],
    },
  },
  blockExplorers: {
    default: { name: "CeloScan", url: "https://celoscan.io" },
  },
  testnet: false,
};

export const config = createConfig({
  chains: [celoMainnet, mainnet, polygon, base],
  connectors: [farcasterFrame()],
  client({ chain }) {
    // Use Alchemy RPC for Base/Celo if available, otherwise fallback to default
    let rpcUrl = chain.rpcUrls.default.http[0];

    if (chain.id === base.id && process.env.NEXT_PUBLIC_BASE_RPC_URL) {
      rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL;
    } else if (
      chain.id === celoMainnet.id &&
      process.env.NEXT_PUBLIC_CELO_RPC_URL
    ) {
      rpcUrl = process.env.NEXT_PUBLIC_CELO_RPC_URL;
    }

    return createClient({
      chain,
      transport: http(rpcUrl),
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
