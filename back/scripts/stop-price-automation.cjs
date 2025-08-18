#!/usr/bin/env node

/**
 * Price Automation Daemon Stopper
 * Stops the automated price update service
 */

const fs = require('fs');
const path = require('path');

function stopAutomation() {
  console.log('🛑 Stopping $GHIBLIFY price automation...');
  
  const pidFile = path.join(__dirname, '../data/automation.pid');
  
  try {
    if (!fs.existsSync(pidFile)) {
      console.log('📝 No PID file found - automation may not be running');
      return;
    }

    const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim());
    
    if (!pid || isNaN(pid)) {
      console.error('❌ Invalid PID in file');
      return;
    }

    console.log(`📋 Found automation PID: ${pid}`);

    // Try to kill the process
    try {
      process.kill(pid, 'SIGTERM');
      console.log('✅ Sent SIGTERM to automation process');
      
      // Wait a moment, then check if it's still running
      setTimeout(() => {
        try {
          process.kill(pid, 0); // Check if process exists
          console.log('⚠️  Process still running, sending SIGKILL...');
          process.kill(pid, 'SIGKILL');
        } catch (error) {
          if (error.code === 'ESRCH') {
            console.log('✅ Automation process stopped successfully');
          } else {
            console.error('❌ Error checking process:', error.message);
          }
        }
      }, 2000);
      
    } catch (error) {
      if (error.code === 'ESRCH') {
        console.log('💭 Process was not running');
      } else {
        console.error('❌ Error stopping process:', error.message);
      }
    }

    // Clean up PID file
    fs.unlinkSync(pidFile);
    console.log('🗑️  Cleaned up PID file');
    
  } catch (error) {
    console.error('❌ Error stopping automation:', error.message);
  }
}

if (require.main === module) {
  stopAutomation();
}

module.exports = { stopAutomation };