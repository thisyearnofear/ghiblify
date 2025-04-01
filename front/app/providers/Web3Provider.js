"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { mainnet, polygon, base } from "wagmi/chains";
import { http } from "viem";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";

// Define Celo Alfajores testnet
const celoAlfajores = {
  id: 44787,
  name: "Celo Alfajores",
  network: "alfajores",
  nativeCurrency: {
    decimals: 18,
    name: "Celo",
    symbol: "CELO",
  },
  rpcUrls: {
    default: { http: ["https://alfajores-forno.celo-testnet.org"] },
    public: { http: ["https://alfajores-forno.celo-testnet.org"] },
  },
  blockExplorers: {
    default: { name: "CeloScan", url: "https://alfajores.celoscan.io" },
  },
  testnet: true,
};

// Create base config using RainbowKit's helper
const config = getDefaultConfig({
  appName: "Ghiblify",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  chains: [celoAlfajores, mainnet, polygon, base],
  transports: {
    [celoAlfajores.id]: http(),
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
