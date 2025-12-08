"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { mainnet, polygon } from "wagmi/chains";
import { http } from "viem";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { injected, walletConnect } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";

// Lazy load frame connector to avoid initialization issues
let farcasterFrame = null;
// Don't load on initial import - only when needed
const loadFrameConnector = () => {
  if (farcasterFrame) return farcasterFrame;
  try {
    const { farcasterFrame: ff } = require("@farcaster/frame-wagmi-connector");
    farcasterFrame = ff;
    return ff;
  } catch (e) {
    console.warn("Frame connector not available");
    return null;
  }
};

// Detect if running in Mini App context
const isInMiniApp = typeof window !== 'undefined' && (
  window.parent !== window ||
  /Farcaster/i.test(navigator?.userAgent || '')
);

// Define Celo Mainnet with proper yellow color
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
  color: "#FCFF52", // Yellow color for Celo
  testnet: false,
};

// Define Base with proper blue color
const baseMainnet = {
  id: 8453,
  name: "Base",
  network: "base",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org",
      ],
    },
    public: {
      http: [
        process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org",
      ],
    },
  },
  blockExplorers: {
    default: { name: "BaseScan", url: "https://basescan.org" },
  },
  color: "#0052FF", // Blue color for Base
  testnet: false,
};

// Create unified config with both RainbowKit and custom connectors
const config = getDefaultConfig({
  appName: "Ghiblify",
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
    "fcbcb493dbc2081c040b760a9ee8956b",
  chains: [celoMainnet, mainnet, polygon, baseMainnet],
  transports: {
    [celoMainnet.id]: http(
      process.env.NEXT_PUBLIC_CELO_RPC_URL || "https://forno.celo.org",
      {
        timeout: 10000,
        retryCount: 3,
        retryDelay: 1000,
      }
    ),
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [baseMainnet.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL, {
      timeout: 10000,
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
  connectors: [
    farcasterMiniApp(),
    ...(() => {
      const ff = loadFrameConnector();
      return ff ? [ff()] : [];
    })(),
    ...(isInMiniApp ? [] : [injected()]),
    walletConnect({
      projectId:
        process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
        "fcbcb493dbc2081c040b760a9ee8956b",
    }),
  ],
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

// Export the config and chain definitions for use in other parts of the app
export { config, celoMainnet, baseMainnet };
