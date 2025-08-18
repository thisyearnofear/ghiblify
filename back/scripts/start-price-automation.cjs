#!/usr/bin/env node

/**
 * Price Automation Daemon Starter
 * Starts the automated price update service as a background process
 */

const { spawn } = require('child_process');
const path = require('path');

function startAutomation() {
  console.log('🤖 Starting $GHIBLIFY price automation daemon...');
  
  const scriptPath = path.join(__dirname, '../automation/ghiblify-price-automation.cjs');
  
  // Start the automation service
  const child = spawn('node', [scriptPath], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Log output
  child.stdout.on('data', (data) => {
    console.log(data.toString().trim());
  });

  child.stderr.on('data', (data) => {
    console.error(data.toString().trim());
  });

  child.on('error', (error) => {
    console.error('❌ Failed to start automation:', error.message);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (code === 0) {
      console.log('✅ Automation service exited normally');
    } else {
      console.log(`❌ Automation service exited with code ${code}, signal ${signal}`);
    }
  });

  // Save PID for later management
  if (child.pid) {
    console.log(`📋 Automation service started with PID: ${child.pid}`);
    
    // Save PID to file for later stopping
    const fs = require('fs');
    const pidFile = path.join(__dirname, '../data/automation.pid');
    
    // Ensure data directory exists
    const dataDir = path.dirname(pidFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(pidFile, child.pid.toString());
    console.log(`💾 PID saved to: ${pidFile}`);
  }

  // Keep script running to show output
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping automation service...');
    if (child.pid) {
      process.kill(child.pid, 'SIGTERM');
    }
    process.exit(0);
  });
}

if (require.main === module) {
  startAutomation();
}

module.exports = { startAutomation };