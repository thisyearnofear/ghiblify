#!/usr/bin/env node

/**
 * Automation Status Checker
 * Shows current status of the price automation service
 */

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const CONFIG = {
  contractAddress: '0x41f2fA6E60A34c26BD2C467d21EcB0a2f9087B03',
  tokenAddress: '0xc2B2EA7f6218CC37debBAFE71361C088329AE090',
  rpcUrl: 'https://mainnet.base.org',
};

const CONTRACT_ABI = [
  {
    inputs: [{ name: "packageTier", type: "string" }],
    name: "getTokenPackagePrice",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

async function main() {
  console.log('📊 $GHIBLIFY Price Automation Status\n');
  
  try {
    // Check if automation is running
    const pidFile = path.join(__dirname, '../data/automation.pid');
    let isRunning = false;
    let pid = null;
    
    if (fs.existsSync(pidFile)) {
      pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim());
      try {
        process.kill(pid, 0); // Check if process exists
        isRunning = true;
      } catch (error) {
        if (error.code === 'ESRCH') {
          isRunning = false;
        }
      }
    }

    console.log('🤖 Service Status:');
    console.log(`   Running: ${isRunning ? '✅ Yes' : '❌ No'}`);
    if (pid) {
      console.log(`   PID: ${pid}`);
    }
    console.log('');

    // Check last price data
    const priceFile = path.join(__dirname, '../data/last-contract-price.json');
    if (fs.existsSync(priceFile)) {
      const priceData = JSON.parse(fs.readFileSync(priceFile, 'utf8'));
      console.log('💰 Last Price Update:');
      console.log(`   Price: $${priceData.price.toFixed(8)}`);
      console.log(`   Time: ${new Date(priceData.timestamp).toLocaleString()}`);
      console.log(`   Updated by: ${priceData.updatedBy}`);
      console.log('');
    }

    // Check current market price
    console.log('📈 Current Market Data:');
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${CONFIG.tokenAddress}`);
      const data = await response.json();
      const pair = data.pairs?.[0];
      
      if (pair) {
        console.log(`   Price: $${parseFloat(pair.priceUsd).toFixed(8)}`);
        console.log(`   24h Change: ${pair.priceChange24h ? pair.priceChange24h + '%' : 'N/A'}`);
        console.log(`   Volume 24h: $${pair.volume24h ? Number(pair.volume24h).toLocaleString() : 'N/A'}`);
        console.log(`   Market Cap: $${pair.marketCap ? Number(pair.marketCap).toLocaleString() : 'N/A'}`);
      } else {
        console.log('   ❌ No market data available');
      }
    } catch (error) {
      console.log(`   ❌ Failed to fetch market data: ${error.message}`);
    }
    console.log('');

    // Check contract prices
    console.log('🔗 Contract Prices:');
    try {
      const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
      const contract = new ethers.Contract(CONFIG.contractAddress, CONTRACT_ABI, provider);
      
      const tiers = ['starter', 'pro', 'don'];
      for (const tier of tiers) {
        try {
          const price = await contract.getTokenPackagePrice(tier);
          const tokens = Number(price) / 10**18;
          console.log(`   ${tier}: ${tokens.toLocaleString()} $GHIBLIFY`);
        } catch (error) {
          console.log(`   ${tier}: ❌ Error reading price`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Failed to read contract: ${error.message}`);
    }
    console.log('');

    // Show configuration
    console.log('⚙️  Configuration:');
    console.log(`   Check interval: 30 minutes`);
    console.log(`   Price threshold: 25%`);
    console.log(`   Max daily updates: 6`);
    console.log(`   Contract: ${CONFIG.contractAddress}`);
    console.log(`   Token: ${CONFIG.tokenAddress}`);

  } catch (error) {
    console.error('❌ Status check failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Status check failed:', error);
    process.exit(1);
  });
}

module.exports = { main };