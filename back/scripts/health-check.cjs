#!/usr/bin/env node

/**
 * System Health Check
 * Verifies all automation components are working correctly
 */

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const CONFIG = {
  contractAddress: '0x41f2fA6E60A34c26BD2C467d21EcB0a2f9087B03',
  tokenAddress: '0xc2B2EA7f6218CC37debBAFE71361C088329AE090',
  rpcUrl: 'https://mainnet.base.org',
};

async function healthCheck() {
  console.log('🏥 $GHIBLIFY Automation Health Check\n');
  
  let allChecksPass = true;
  const results = [];

  // Check 1: Environment Variables
  console.log('1️⃣  Environment Variables:');
  if (process.env.PRIVATE_KEY) {
    console.log('   ✅ PRIVATE_KEY found');
    results.push({ check: 'PRIVATE_KEY', status: 'pass' });
  } else {
    console.log('   ❌ PRIVATE_KEY missing');
    results.push({ check: 'PRIVATE_KEY', status: 'fail' });
    allChecksPass = false;
  }

  // Check 2: Network Connectivity
  console.log('\n2️⃣  Network Connectivity:');
  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    const blockNumber = await provider.getBlockNumber();
    console.log(`   ✅ Base RPC connection (block: ${blockNumber})`);
    results.push({ check: 'Base RPC', status: 'pass', data: blockNumber });
  } catch (error) {
    console.log(`   ❌ Base RPC connection failed: ${error.message}`);
    results.push({ check: 'Base RPC', status: 'fail', error: error.message });
    allChecksPass = false;
  }

  // Check 3: API Connectivity
  console.log('\n3️⃣  API Connectivity:');
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${CONFIG.tokenAddress}`);
    if (response.ok) {
      const data = await response.json();
      const price = data.pairs?.[0]?.priceUsd;
      if (price) {
        console.log(`   ✅ DexScreener API ($${parseFloat(price).toFixed(8)})`);
        results.push({ check: 'DexScreener API', status: 'pass', data: price });
      } else {
        console.log('   ⚠️  DexScreener API responds but no price data');
        results.push({ check: 'DexScreener API', status: 'warning', data: 'no price' });
      }
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ DexScreener API failed: ${error.message}`);
    results.push({ check: 'DexScreener API', status: 'fail', error: error.message });
    allChecksPass = false;
  }

  // Check 4: Contract Access
  console.log('\n4️⃣  Contract Access:');
  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    const contract = new ethers.Contract(CONFIG.contractAddress, [
      {
        inputs: [{ name: "packageTier", type: "string" }],
        name: "getTokenPackagePrice",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      }
    ], provider);

    const starterPrice = await contract.getTokenPackagePrice('starter');
    const tokens = Number(starterPrice) / 10**18;
    console.log(`   ✅ Contract read access (starter: ${tokens.toLocaleString()} tokens)`);
    results.push({ check: 'Contract read', status: 'pass', data: tokens });
  } catch (error) {
    console.log(`   ❌ Contract read failed: ${error.message}`);
    results.push({ check: 'Contract read', status: 'fail', error: error.message });
    allChecksPass = false;
  }

  // Check 5: Wallet Access
  console.log('\n5️⃣  Wallet Access:');
  try {
    if (process.env.PRIVATE_KEY) {
      const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
      let privateKey = process.env.PRIVATE_KEY;
      if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey;
      }
      const wallet = new ethers.Wallet(privateKey, provider);
      const balance = await wallet.provider.getBalance(wallet.address);
      const ethBalance = parseFloat(ethers.formatEther(balance));
      
      if (ethBalance > 0.001) {
        console.log(`   ✅ Wallet balance sufficient (${ethBalance.toFixed(4)} ETH)`);
        results.push({ check: 'Wallet balance', status: 'pass', data: ethBalance });
      } else {
        console.log(`   ⚠️  Low wallet balance (${ethBalance.toFixed(6)} ETH)`);
        results.push({ check: 'Wallet balance', status: 'warning', data: ethBalance });
      }
    } else {
      console.log('   ❌ Cannot check wallet - PRIVATE_KEY missing');
      results.push({ check: 'Wallet balance', status: 'fail', error: 'No private key' });
      allChecksPass = false;
    }
  } catch (error) {
    console.log(`   ❌ Wallet check failed: ${error.message}`);
    results.push({ check: 'Wallet balance', status: 'fail', error: error.message });
    allChecksPass = false;
  }

  // Check 6: File System Access
  console.log('\n6️⃣  File System Access:');
  try {
    const dataDir = path.join(__dirname, '../data');
    
    // Test write access
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const testFile = path.join(dataDir, 'health-check-test.json');
    fs.writeFileSync(testFile, JSON.stringify({ test: true, timestamp: Date.now() }));
    const testData = JSON.parse(fs.readFileSync(testFile, 'utf8'));
    fs.unlinkSync(testFile);
    
    console.log('   ✅ File system read/write access');
    results.push({ check: 'File system', status: 'pass' });
  } catch (error) {
    console.log(`   ❌ File system access failed: ${error.message}`);
    results.push({ check: 'File system', status: 'fail', error: error.message });
    allChecksPass = false;
  }

  // Summary
  console.log(`\n📋 Health Check Summary:`);
  console.log(`   Total checks: ${results.length}`);
  console.log(`   Passed: ${results.filter(r => r.status === 'pass').length}`);
  console.log(`   Warnings: ${results.filter(r => r.status === 'warning').length}`);
  console.log(`   Failed: ${results.filter(r => r.status === 'fail').length}`);
  
  if (allChecksPass) {
    console.log('\n✅ All critical checks passed! System is ready for automation.');
  } else {
    console.log('\n❌ Some checks failed. Please resolve issues before starting automation.');
    process.exit(1);
  }

  // Save health check results
  try {
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(dataDir, 'last-health-check.json'),
      JSON.stringify({
        timestamp: Date.now(),
        allChecksPass,
        results,
      }, null, 2)
    );
  } catch (error) {
    console.warn('⚠️  Could not save health check results:', error.message);
  }
}

if (require.main === module) {
  healthCheck().catch(error => {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  });
}

module.exports = { healthCheck };