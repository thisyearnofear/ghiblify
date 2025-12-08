/**
 * Wagmi Configuration
 * Separated to avoid circular dependencies between Web3Provider and FarcasterMiniAppProvider
 */

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, polygon } from "wagmi/chains";
import { http } from "viem";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { injected, walletConnect } from "wagmi/connectors";

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
  color: "#FCFF52",
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
  color: "#0052FF",
  testnet: false,
};

// Detect if running in Mini App context
const isInMiniApp = typeof window !== 'undefined' && (
  window.parent !== window ||
  /Farcaster/i.test(navigator?.userAgent || '')
);

// Lazy load frame connector to avoid initialization issues
let farcasterFrameConnector: (() => any) | null = null;
const loadFrameConnector = () => {
  if (farcasterFrameConnector) return farcasterFrameConnector;
  try {
    const { farcasterFrame } = require("@farcaster/frame-wagmi-connector");
    farcasterFrameConnector = farcasterFrame;
    return farcasterFrame;
  } catch (e) {
    console.warn("Frame connector not available");
    return null;
  }
};

// Create base config first
const baseConfig = getDefaultConfig({
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
});

// Add custom connectors to the base config
const customConnectors = [
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
];

// Create the final config with custom connectors
export const config = {
  ...baseConfig,
  connectors: customConnectors,
};

export { celoMainnet, baseMainnet };
