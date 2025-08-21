/**
 * Backend Price Automation Service
 * Handles automatic contract price updates based on market conditions
 */

const { ethers } = require('ethers');
const fetch = require('node-fetch');

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../../front/.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../../front/.env.local') });

// Configuration
const CONFIG = {
  // Contract details
  contractAddress: '0x41f2fA6E60A34c26BD2C467d21EcB0a2f9087B03',
  tokenAddress: '0xc2B2EA7f6218CC37debBAFE71361C088329AE090',
  
  // Update thresholds (optimized for hourly updates)
  priceChangeThreshold: 0.15, // 15% change triggers update (more sensitive)
  minimumUpdateInterval: 3600000, // 1 hour minimum (perfect for hourly max)
  maxDailyUpdates: 24, // Allow up to 24 updates per day (1 per hour max)
  volumeThreshold: 50, // $50 daily volume minimum (lower threshold)
  
  // API settings (optimized for efficiency)
  checkInterval: 3600000, // 1 hour checks (exactly what you wanted)
  priceApiTimeout: 10000, // 10 second timeout
  
  // Base mainnet
  rpcUrl: 'https://mainnet.base.org',
  chainId: 8453,
};

// Contract ABI (minimal for price updates)
const CONTRACT_ABI = [
  {
    inputs: [
      { name: "tiers", type: "string[]" },
      { name: "prices", type: "uint256[]" }
    ],
    name: "batchUpdatePrices",
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
];

class GhiblifyPriceAutomation {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    this.setupWallet();
    this.lastUpdateTime = 0;
    this.dailyUpdateCount = 0;
    this.lastResetDate = '';
    this.isRunning = false;
  }

  setupWallet() {
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY environment variable required');
    }
    
    if (!process.env.MORALIS_API_KEY) {
      throw new Error('MORALIS_API_KEY environment variable required for price fetching');
    }

    let privateKey = process.env.PRIVATE_KEY;
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }

    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(CONFIG.contractAddress, CONTRACT_ABI, this.wallet);
    
    console.log('🔑 Price automation wallet:', this.wallet.address);
  }

  /**
   * Start the automation service
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Price automation already running');
      return;
    }

    console.log('🤖 Starting $GHIBLIFY price automation...');
    console.log(`   Check interval: ${CONFIG.checkInterval / 60000} minutes`);
    console.log(`   Price threshold: ${CONFIG.priceChangeThreshold * 100}%`);
    console.log(`   Max daily updates: ${CONFIG.maxDailyUpdates}`);

    this.isRunning = true;
    
    // Initial check
    setTimeout(() => this.checkAndUpdate(), 5000);
    
    // Set up recurring checks
    this.intervalId = setInterval(() => {
      this.checkAndUpdate();
    }, CONFIG.checkInterval);
  }

  /**
   * Stop the automation service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Price automation stopped');
  }

  /**
   * Main automation logic
   */
  async checkAndUpdate() {
    try {
      console.log(`[${new Date().toISOString()}] 🔍 Checking if price update needed...`);

      // Reset daily counter if new day
      this.resetDailyCounterIfNeeded();

      // Check rate limiting
      const timeSinceLastUpdate = Date.now() - this.lastUpdateTime;
      if (timeSinceLastUpdate < CONFIG.minimumUpdateInterval) {
        console.log(`⏰ Too soon since last update (${Math.round(timeSinceLastUpdate / 60000)}min ago)`);
        return;
      }

      // Check daily limit
      if (this.dailyUpdateCount >= CONFIG.maxDailyUpdates) {
        console.log(`📊 Daily update limit reached (${this.dailyUpdateCount}/${CONFIG.maxDailyUpdates})`);
        return;
      }

      // Get current token price
      const currentPrice = await this.fetchTokenPrice();
      if (!currentPrice) {
        console.log('❌ Failed to fetch current token price');
        return;
      }

      console.log(`💰 Current $GHIBLIFY price: $${currentPrice.toFixed(6)} (${currentPrice > 0.001 ? '📈' : '📉'})`);

      // Get last contract update price
      const lastContractPrice = await this.getLastContractPrice();
      if (!lastContractPrice) {
        console.log('🔄 No previous price found, executing initial update...');
        await this.executeUpdate(currentPrice, 'Initial price setup');
        return;
      }

      // Calculate price change
      const priceChange = Math.abs(currentPrice - lastContractPrice) / lastContractPrice;
      console.log(`📊 Price change: ${(priceChange * 100).toFixed(1)}% (threshold: ${CONFIG.priceChangeThreshold * 100}%)`);

      if (priceChange >= CONFIG.priceChangeThreshold) {
        const direction = currentPrice > lastContractPrice ? '↗️' : '↘️';
        await this.executeUpdate(currentPrice, `${direction} ${(priceChange * 100).toFixed(1)}% price change`);
      } else {
        console.log('✅ Price change within threshold, no update needed');
      }

    } catch (error) {
      console.error('❌ Automation check failed:', error.message);
    }
  }

  /**
   * Execute contract price update
   */
  async executeUpdate(currentPrice, reason) {
    try {
      console.log(`🔄 Executing price update: ${reason}`);

      // Calculate new token prices for each tier (50% discount already applied)
      const tierUSDPrices = {
        starter: 0.25,  // $0.50 regular -> $0.25 with $GHIBLIFY (50% discount)
        pro: 3.00,      // $6.00 regular -> $3.00 with $GHIBLIFY (50% discount)
        don: 7.50,      // $15.00 regular -> $7.50 with $GHIBLIFY (50% discount)
      };

      const updates = Object.entries(tierUSDPrices).map(([tier, usdPrice]) => {
        const safetyMultiplier = 1.05; // 5% buffer
        const tokensNeeded = Math.ceil((usdPrice / currentPrice) * safetyMultiplier);
        const tokenAmount = BigInt(tokensNeeded) * BigInt(10**18);
        return { tier, price: tokenAmount.toString() };
      });

      console.log('📋 New prices:');
      updates.forEach(({ tier, price }) => {
        const tokens = Number(price) / 10**18;
        console.log(`   ${tier}: ${tokens.toLocaleString()} $GHIBLIFY`);
      });

      // Execute batch update transaction
      const tiers = updates.map(u => u.tier);
      const prices = updates.map(u => u.price);

      const tx = await this.contract.batchUpdatePrices(tiers, prices);
      console.log('⏳ Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log(`✅ Prices updated! Gas used: ${receipt.gasUsed.toString()}`);

      // Update tracking
      this.lastUpdateTime = Date.now();
      this.dailyUpdateCount++;
      await this.saveLastContractPrice(currentPrice);

      console.log(`📈 Update ${this.dailyUpdateCount}/${CONFIG.maxDailyUpdates} complete for today`);

    } catch (error) {
      console.error('❌ Price update execution failed:', error.message);
      throw error;
    }
  }

  /**
   * Fetch current token price from API
   */
  async fetchTokenPrice() {
    // Try Moralis first (most reliable for Base network tokens)
    try {
      const response = await fetch(
        `https://deep-index.moralis.io/api/v2.2/erc20/${CONFIG.tokenAddress}/price?chain=base&include=percent_change`,
        { 
          timeout: CONFIG.priceApiTimeout,
          headers: {
            'accept': 'application/json',
            'X-API-Key': process.env.MORALIS_API_KEY
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Moralis API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.usdPrice || data.usdPrice <= 0) {
        throw new Error('Invalid price data from Moralis');
      }

      console.log(`📊 Moralis data: $${data.usdPrice} (${data.tokenSymbol}), 24h: ${data['24hrPercentChange'] || 0}%`);
      return parseFloat(data.usdPrice);
      
    } catch (error) {
      console.warn('Moralis failed, trying DexScreener fallback...', error.message);
      
      // Fallback to DexScreener
      try {
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${CONFIG.tokenAddress}`,
          { timeout: CONFIG.priceApiTimeout }
        );

        if (!response.ok) {
          throw new Error(`DexScreener API error: ${response.status}`);
        }

        const data = await response.json();
        const pair = data.pairs?.[0];

        if (!pair?.priceUsd) {
          throw new Error('No price data available');
        }

        return parseFloat(pair.priceUsd);
      } catch (fallbackError) {
        console.warn('DexScreener fallback also failed:', fallbackError.message);
        return null;
      }
    }
  }

  /**
   * Get last contract price from storage/database
   */
  async getLastContractPrice() {
    try {
      // This should ideally come from your database
      // For now, using a simple file storage
      const fs = require('fs');
      const path = './data/last-contract-price.json';
      
      if (fs.existsSync(path)) {
        const data = JSON.parse(fs.readFileSync(path, 'utf8'));
        return data.price;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Save last contract price
   */
  async saveLastContractPrice(price) {
    try {
      const fs = require('fs');
      const path = './data';
      
      // Ensure directory exists
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
      }
      
      fs.writeFileSync('./data/last-contract-price.json', JSON.stringify({
        price,
        timestamp: Date.now(),
        updatedBy: 'automation'
      }));
    } catch (error) {
      console.warn('Failed to save contract price:', error.message);
    }
  }

  resetDailyCounterIfNeeded() {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastResetDate !== today) {
      this.dailyUpdateCount = 0;
      this.lastResetDate = today;
      console.log(`📅 Daily counter reset for ${today}`);
    }
  }

  /**
   * Get status for monitoring
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastUpdateTime: this.lastUpdateTime,
      dailyUpdateCount: this.dailyUpdateCount,
      nextCheckIn: this.intervalId ? 
        Math.max(0, CONFIG.checkInterval - (Date.now() - this.lastUpdateTime)) : 0,
      config: CONFIG,
    };
  }
}

// Export for use in backend
module.exports = { GhiblifyPriceAutomation, CONFIG };

// If running directly, start the service
if (require.main === module) {
  const automation = new GhiblifyPriceAutomation();
  automation.start();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down price automation...');
    automation.stop();
    process.exit(0);
  });
}