"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { mainnet, polygon, base } from "wagmi/chains";
import { http } from "viem";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";

// Define Celo Mainnet
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
    default: { http: [process.env.NEXT_PUBLIC_CELO_RPC_URL || "https://forno.celo.org"] },
    public: { http: [process.env.NEXT_PUBLIC_CELO_RPC_URL || "https://forno.celo.org"] },
  },
  blockExplorers: {
    default: { name: "CeloScan", url: "https://celoscan.io" },
  },
  testnet: false,
};

// Create base config using RainbowKit's helper
const config = getDefaultConfig({
  appName: "Ghiblify",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "dummy-project-id-for-build",
  chains: [celoMainnet, mainnet, polygon, base],
  transports: {
    [celoMainnet.id]: http(),
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [base.id]: http(),
  },
  connectors: [farcasterFrame()],
});

// Create React Query client
const queryClient = new QueryClient();

export function Web3Provider({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
