"use client";

import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config, celoMainnet, baseMainnet } from "../config/wagmi-config";
import "@rainbow-me/rainbowkit/styles.css";

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

// Export the config and chain definitions for use in other parts of the app
export { config, celoMainnet, baseMainnet };
