/**
 * Event Listener Service
 * Monitors contract events and triggers price updates when needed
 */

const { ethers } = require('ethers');
const { GhiblifyPriceAutomation } = require('./ghiblify-price-automation.cjs');

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../../front/.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../../front/.env.local') });

// Configuration
const CONFIG = {
  contractAddress: '0x41f2fA6E60A34c26BD2C467d21EcB0a2f9087B03',
  rpcUrl: 'https://mainnet.base.org',
  chainId: 8453,
  
  // Event monitoring settings
  eventCheckInterval: 300000, // 5 minutes
  blockLookback: 100, // Look back 100 blocks (~8 minutes on Base)
};

// Contract ABI for events
const CONTRACT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "buyer", type: "address" },
      { indexed: false, name: "packageTier", type: "string" },
      { indexed: false, name: "tokenAmount", type: "uint256" },
      { indexed: false, name: "creditsAwarded", type: "uint256" }
    ],
    name: "CreditsPurchased",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "tiers", type: "string[]" },
      { indexed: false, name: "newPrices", type: "uint256[]" }
    ],
    name: "PricesUpdated", 
    type: "event",
  }
];

class GhiblifyEventListener {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    this.contract = new ethers.Contract(CONFIG.contractAddress, CONTRACT_ABI, this.provider);
    this.automation = new GhiblifyPriceAutomation();
    this.isListening = false;
    this.lastCheckedBlock = null;
  }

  /**
   * Start listening for contract events
   */
  async start() {
    if (this.isListening) {
      console.log('⚠️  Event listener already running');
      return;
    }

    console.log('👂 Starting $GHIBLIFY event listener...');
    console.log(`   Contract: ${CONFIG.contractAddress}`);
    console.log(`   Check interval: ${CONFIG.eventCheckInterval / 60000} minutes`);

    this.isListening = true;
    this.lastCheckedBlock = await this.provider.getBlockNumber();
    
    console.log(`🔍 Starting from block: ${this.lastCheckedBlock}`);

    // Set up periodic event checking
    this.intervalId = setInterval(() => {
      this.checkForEvents();
    }, CONFIG.eventCheckInterval);

    // Initial check
    setTimeout(() => this.checkForEvents(), 10000);
  }

  /**
   * Stop the event listener
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isListening = false;
    console.log('🛑 Event listener stopped');
  }

  /**
   * Check for new contract events
   */
  async checkForEvents() {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(
        this.lastCheckedBlock + 1,
        currentBlock - CONFIG.blockLookback
      );

      if (fromBlock > currentBlock) {
        return; // No new blocks to check
      }

      console.log(`[${new Date().toISOString()}] 🔍 Checking events from block ${fromBlock} to ${currentBlock}`);

      // Get CreditsPurchased events
      const purchaseFilter = this.contract.filters.CreditsPurchased();
      const purchaseEvents = await this.contract.queryFilter(
        purchaseFilter,
        fromBlock,
        currentBlock
      );

      // Get PricesUpdated events  
      const priceFilter = this.contract.filters.PricesUpdated();
      const priceEvents = await this.contract.queryFilter(
        priceFilter,
        fromBlock,
        currentBlock
      );

      if (purchaseEvents.length > 0) {
        console.log(`💰 Found ${purchaseEvents.length} purchase event(s)`);
        await this.handlePurchaseEvents(purchaseEvents);
      }

      if (priceEvents.length > 0) {
        console.log(`📈 Found ${priceEvents.length} price update event(s)`);
        await this.handlePriceEvents(priceEvents);
      }

      if (purchaseEvents.length === 0 && priceEvents.length === 0) {
        console.log('✅ No new events found');
      }

      this.lastCheckedBlock = currentBlock;

    } catch (error) {
      console.error('❌ Event check failed:', error.message);
    }
  }

  /**
   * Handle CreditsPurchased events
   */
  async handlePurchaseEvents(events) {
    for (const event of events) {
      try {
        const { buyer, packageTier, tokenAmount, creditsAwarded } = event.args;
        const tokens = Number(tokenAmount) / 10**18;
        
        console.log(`🎉 Purchase detected:`);
        console.log(`   Buyer: ${buyer}`);
        console.log(`   Package: ${packageTier}`);
        console.log(`   Amount: ${tokens.toLocaleString()} $GHIBLIFY`);
        console.log(`   Credits: ${creditsAwarded.toString()}`);
        console.log(`   Block: ${event.blockNumber}`);
        console.log(`   Tx: ${event.transactionHash}`);

        // Trigger a price check after significant purchases
        if (tokens > 10000) { // Threshold for "significant" purchase
          console.log('💡 Large purchase detected, triggering price check...');
          setTimeout(() => {
            this.automation.checkAndUpdate();
          }, 30000); // Wait 30 seconds for market to potentially react
        }

      } catch (error) {
        console.error('❌ Error processing purchase event:', error.message);
      }
    }
  }

  /**
   * Handle PricesUpdated events
   */
  async handlePriceEvents(events) {
    for (const event of events) {
      try {
        const { tiers, newPrices } = event.args;
        
        console.log(`📊 Price update detected:`);
        console.log(`   Block: ${event.blockNumber}`);
        console.log(`   Tx: ${event.transactionHash}`);
        console.log(`   Updated tiers:`);
        
        for (let i = 0; i < tiers.length; i++) {
          const tier = tiers[i];
          const price = newPrices[i];
          const tokens = Number(price) / 10**18;
          console.log(`     ${tier}: ${tokens.toLocaleString()} $GHIBLIFY`);
        }

      } catch (error) {
        console.error('❌ Error processing price event:', error.message);
      }
    }
  }

  /**
   * Get listener status
   */
  getStatus() {
    return {
      isListening: this.isListening,
      lastCheckedBlock: this.lastCheckedBlock,
      config: CONFIG,
      contractAddress: CONFIG.contractAddress,
    };
  }
}

// Export for use in other services
module.exports = { GhiblifyEventListener, CONFIG };

// If running directly, start the listener
if (require.main === module) {
  const listener = new GhiblifyEventListener();
  
  // Start both event listener and price automation
  listener.start();
  
  // Also start price automation if not already running
  const automation = new GhiblifyEventListener().automation;
  automation.start();
  
  console.log('🚀 Both event listener and price automation started');
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down event listener...');
    listener.stop();
    automation.stop();
    process.exit(0);
  });
}