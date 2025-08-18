/**
 * Simple deployment script using ethers directly
 */

import { ethers } from 'ethers';
import fs from 'fs';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables
if (fs.existsSync('.env.local')) {
  dotenvConfig({ path: '.env.local' });
}

async function deploy() {
  try {
    console.log('🚀 Deploying GhiblifyTokenPayments to Base Mainnet...\n');

    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    let privateKey = process.env.PRIVATE_KEY;
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log('👤 Deployer:', wallet.address);
    
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 Balance:', ethers.formatEther(balance), 'ETH');

    // Load compiled contract
    const artifactPath = './artifacts/contracts/GhiblifyTokenPayments.sol/GhiblifyTokenPayments.json';
    if (!fs.existsSync(artifactPath)) {
      throw new Error('Contract not compiled. Run: npx hardhat compile');
    }
    
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const contractFactory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

    // $GHIBLIFY token address
    const ghiblifyTokenAddress = "0xc2B2EA7f6218CC37debBAFE71361C088329AE090";
    
    console.log('📋 Token Address:', ghiblifyTokenAddress);

    // Deploy
    console.log('\n🔄 Deploying...');
    const contract = await contractFactory.deploy(ghiblifyTokenAddress);
    
    console.log('⏳ Waiting for confirmation...');
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log('\n✅ Deployment successful!');
    console.log('📍 Contract Address:', contractAddress);
    
    // Test basic functionality
    const starterPrice = await contract.getTokenPackagePrice("starter");
    console.log('🧪 Starter price:', ethers.formatEther(starterPrice), '$GHIBLIFY');
    
    console.log('\n📝 Add to .env.local:');
    console.log(`NEXT_PUBLIC_GHIBLIFY_TOKEN_PAYMENTS_ADDRESS=${contractAddress}`);
    
    console.log('\n🔗 View on BaseScan:');
    console.log(`https://basescan.org/address/${contractAddress}`);
    
    return contractAddress;
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    throw error;
  }
}

deploy()
  .then(() => {
    console.log('\n🎉 Deployment complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });