// $GHIBLIFY Token Payment Contract Configuration for Base Mainnet

// Contract address on Base Mainnet
export const GHIBLIFY_TOKEN_PAYMENTS_ADDRESS = 
  process.env.NEXT_PUBLIC_GHIBLIFY_TOKEN_PAYMENTS_ADDRESS || "0x41f2fA6E60A34c26BD2C467d21EcB0a2f9087B03";

// $GHIBLIFY Token address on Base Mainnet
export const GHIBLIFY_TOKEN_ADDRESS = "0xc2B2EA7f6218CC37debBAFE71361C088329AE090";

// Tier mapping (consistent with existing contracts)
export const TOKEN_TIER_MAPPING = {
  starter: "starter",
  pro: "pro", 
  unlimited: "don", // Map 'unlimited' to 'don' for contract interaction
};

// $GHIBLIFY Token ABI (standard ERC20)
export const GHIBLIFY_TOKEN_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
];

// Payment Contract ABI
export const GHIBLIFY_TOKEN_PAYMENTS_ABI = [
  {
    inputs: [{ name: "packageTier", type: "string" }],
    name: "purchaseCreditsWithGhiblify",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "packageTier", type: "string" }],
    name: "getTokenPackagePrice",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getContractStats",
    outputs: [
      { name: "totalVol", type: "uint256" },
      { name: "totalTxs", type: "uint256" },
      { name: "contractBalance", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "buyer", type: "address" },
      { indexed: false, name: "packageTier", type: "string" },
      { indexed: false, name: "tokenAmount", type: "uint256" },
      { indexed: false, name: "credits", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
    name: "CreditsPurchased",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "packageTier", type: "string" },
      { indexed: false, name: "oldPrice", type: "uint256" },
      { indexed: false, name: "newPrice", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
    name: "PriceUpdated",
    type: "event",
  },
];

// Token package configuration (no hardcoded prices - all fetched from contract)
export const TOKEN_PACKAGES = {
  starter: {
    credits: 1,
    contractTier: "starter",
  },
  pro: {
    credits: 12,
    contractTier: "pro",
  },
  unlimited: {
    credits: 30,
    contractTier: "don",
  },
};

// Base Mainnet configuration
export const BASE_MAINNET_CONFIG = {
  chainId: 8453,
  name: "Base Mainnet",
  rpcUrl: "https://mainnet.base.org",
  blockExplorer: "https://basescan.org",
};