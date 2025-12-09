/**
 * Wagmi Configuration
 * Separated to avoid circular dependencies between Web3Provider and FarcasterMiniAppProvider
 */

import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
  coinbaseWallet,
  rabbyWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig } from "wagmi";
import { mainnet, polygon } from "wagmi/chains";
import { http } from "viem";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";

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

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "fcbcb493dbc2081c040b760a9ee8956b";

// Configure wallet connectors
const connectors = connectorsForWallets(
  [
    {
      groupName: "Popular",
      wallets: [
        metaMaskWallet,
        rainbowWallet,
        coinbaseWallet,
        rabbyWallet,
        walletConnectWallet,
      ],
    },
  ],
  {
    appName: "Ghiblify",
    projectId,
  }
);

// Create the config
export const config = createConfig({
  connectors,
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

export { celoMainnet, baseMainnet };