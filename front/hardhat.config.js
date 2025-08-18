import "@nomicfoundation/hardhat-ethers";
import { config as dotenvConfig } from 'dotenv';
import fs from 'fs';

// Load environment variables
if (fs.existsSync('.env.local')) {
  dotenvConfig({ path: '.env.local' });
}
if (fs.existsSync('.env')) {
  dotenvConfig({ path: '.env' });
}

export default {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    base: {
      type: 'http',
      url: 'https://mainnet.base.org',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`] : [],
      chainId: 8453,
    },
    baseSepolia: {
      type: 'http',
      url: 'https://sepolia.base.org', 
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`] : [],
      chainId: 84532,
    },
  },
  etherscan: {
    apiKey: {
      base: process.env.BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      }
    ]
  },
};