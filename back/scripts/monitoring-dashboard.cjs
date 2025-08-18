#!/usr/bin/env node

/**
 * Monitoring Dashboard
 * Real-time view of automation system status and metrics
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[0f');
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

async function showDashboard() {
  try {
    clearScreen();
    
    const now = new Date();
    console.log('🚀 $GHIBLIFY Price Automation Dashboard');
    console.log(`⏰ Last updated: ${now.toLocaleTimeString()}\n`);

    // Check if automation is running
    const pidFile = path.join(__dirname, '../data/automation.pid');
    let isRunning = false;
    let pid = null;
    let uptime = null;
    
    if (fs.existsSync(pidFile)) {
      pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim());
      try {
        process.kill(pid, 0);
        isRunning = true;
        
        // Try to get process start time (basic uptime)
        try {
          const stats = fs.statSync(pidFile);
          uptime = Date.now() - stats.mtimeMs;
        } catch {}
      } catch (error) {
        if (error.code === 'ESRCH') {
          isRunning = false;
        }
      }
    }

    // Service Status Section
    console.log('🤖 SERVICE STATUS');
    console.log('═══════════════════════════════════════');
    console.log(`Status: ${isRunning ? '🟢 RUNNING' : '🔴 STOPPED'}`);
    if (pid) console.log(`PID: ${pid}`);
    if (uptime) console.log(`Uptime: ${formatUptime(uptime)}`);
    console.log('');

    // Latest Price Data Section
    const priceFile = path.join(__dirname, '../data/last-contract-price.json');
    if (fs.existsSync(priceFile)) {
      const priceData = JSON.parse(fs.readFileSync(priceFile, 'utf8'));
      const updateAge = Date.now() - priceData.timestamp;
      
      console.log('💰 LATEST PRICE UPDATE');
      console.log('═══════════════════════════════════════');
      console.log(`Price: $${priceData.price.toFixed(8)}`);
      console.log(`Updated: ${formatUptime(updateAge)} ago`);
      console.log(`By: ${priceData.updatedBy}`);
      console.log('');
    }

    // Current Market Data Section  
    console.log('📈 MARKET DATA');
    console.log('═══════════════════════════════════════');
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/0xc2B2EA7f6218CC37debBAFE71361C088329AE090`);
      const data = await response.json();
      const pair = data.pairs?.[0];
      
      if (pair) {
        console.log(`Price: $${parseFloat(pair.priceUsd).toFixed(8)}`);
        console.log(`24h Change: ${pair.priceChange24h ? pair.priceChange24h + '%' : 'N/A'}`);
        console.log(`Volume 24h: $${pair.volume24h ? Number(pair.volume24h).toLocaleString() : 'N/A'}`);
        console.log(`Market Cap: $${pair.marketCap ? Number(pair.marketCap).toLocaleString() : 'N/A'}`);
      } else {
        console.log('❌ No market data available');
      }
    } catch (error) {
      console.log(`❌ API Error: ${error.message}`);
    }
    console.log('');

    // Health Check Results
    const healthFile = path.join(__dirname, '../data/last-health-check.json');
    if (fs.existsSync(healthFile)) {
      const health = JSON.parse(fs.readFileSync(healthFile, 'utf8'));
      const healthAge = Date.now() - health.timestamp;
      
      console.log('🏥 SYSTEM HEALTH');
      console.log('═══════════════════════════════════════');
      console.log(`Status: ${health.allChecksPass ? '🟢 HEALTHY' : '🔴 ISSUES'}`);
      console.log(`Last check: ${formatUptime(healthAge)} ago`);
      console.log(`Passed: ${health.results.filter(r => r.status === 'pass').length}/${health.results.length}`);
      console.log('');
    }

    // Configuration Summary
    console.log('⚙️  CONFIGURATION');
    console.log('═══════════════════════════════════════');
    console.log('Check interval: 30 minutes');
    console.log('Price threshold: 25%');
    console.log('Max daily updates: 6');
    console.log('Update interval: 1 hour minimum');
    console.log('');

    // Instructions
    console.log('📖 COMMANDS');
    console.log('═══════════════════════════════════════');
    console.log('npm run price:start     - Start automation');
    console.log('npm run price:stop      - Stop automation');  
    console.log('npm run price:update    - Manual update');
    console.log('npm run price:status    - Detailed status');
    console.log('npm run health:check    - Run health check');
    console.log('');
    console.log('Press Ctrl+C to exit dashboard');

  } catch (error) {
    console.error('❌ Dashboard error:', error.message);
  }
}

async function startDashboard() {
  console.log('🚀 Starting monitoring dashboard...\n');
  console.log('Press Ctrl+C to exit\n');
  
  // Initial display
  await showDashboard();
  
  // Update every 30 seconds
  const interval = setInterval(showDashboard, 30000);
  
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n👋 Dashboard stopped');
    process.exit(0);
  });
}

if (require.main === module) {
  startDashboard();
}

module.exports = { showDashboard, startDashboard };