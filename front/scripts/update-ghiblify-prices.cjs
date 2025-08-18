#!/usr/bin/env node

/**
 * Manual Price Update Script
 * Updates contract prices based on current $GHIBLIFY token price
 */

const { ethers } = require('ethers');
const { GhiblifyPriceAutomation } = require('../backend/ghiblify-price-automation.cjs');

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

async function main() {
  console.log('🚀 Starting manual $GHIBLIFY price update...\n');

  try {
    // Initialize automation service
    const automation = new GhiblifyPriceAutomation();
    
    // Get current status
    const status = automation.getStatus();
    console.log('📊 Current Status:');
    console.log(`   Last update: ${status.lastUpdateTime ? new Date(status.lastUpdateTime).toLocaleString() : 'Never'}`);
    console.log(`   Daily updates: ${status.dailyUpdateCount}/${status.config.maxDailyUpdates}`);
    console.log('');

    // Fetch current token price
    console.log('💰 Fetching current $GHIBLIFY price...');
    const currentPrice = await automation.fetchTokenPrice();
    
    if (!currentPrice) {
      console.error('❌ Failed to fetch token price');
      process.exit(1);
    }

    console.log(`   Current price: $${currentPrice.toFixed(8)}`);
    console.log('');

    // Get last contract price
    const lastContractPrice = await automation.getLastContractPrice();
    
    if (lastContractPrice) {
      const priceChange = Math.abs(currentPrice - lastContractPrice) / lastContractPrice;
      console.log(`📈 Price Analysis:`);
      console.log(`   Last contract price: $${lastContractPrice.toFixed(8)}`);
      console.log(`   Price change: ${(priceChange * 100).toFixed(2)}%`);
      console.log(`   Threshold: ${status.config.priceChangeThreshold * 100}%`);
      console.log('');
    }

    // Execute update
    console.log('🔄 Executing price update...');
    await automation.executeUpdate(currentPrice, 'Manual update via script');
    
    console.log('\n✅ Price update completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Price update failed:', error.message);
    process.exit(1);
  }
}

// Handle command line execution
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { main };