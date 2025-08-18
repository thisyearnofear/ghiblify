/**
 * Automated Price Update Service
 * Handles contract price updates based on market conditions
 */

import { ghiblifyPriceOracle } from './ghiblify-price-oracle';
import { ghiblifyAdminService } from './ghiblify-admin-service';

interface AutoUpdateConfig {
  priceChangeThreshold: number; // 0.25 = 25%
  minimumUpdateInterval: number; // milliseconds
  maxDailyUpdates: number;
  volumeThreshold: number; // minimum daily volume in USD
}

class PriceUpdateAutomation {
  private config: AutoUpdateConfig = {
    priceChangeThreshold: 0.25, // 25% change triggers update
    minimumUpdateInterval: 3600000, // 1 hour minimum between updates
    maxDailyUpdates: 6, // max 6 updates per day
    volumeThreshold: 100, // $100 minimum daily volume
  };

  private lastUpdateTime: number = 0;
  private dailyUpdateCount: number = 0;
  private lastResetDate: string = '';

  /**
   * Check if contract prices should be updated
   */
  async shouldUpdatePrices(): Promise<{
    shouldUpdate: boolean;
    reason?: string;
    blockedReason?: string;
  }> {
    try {
      // Reset daily counter if new day
      this.resetDailyCounterIfNeeded();

      // Check rate limiting
      const timeSinceLastUpdate = Date.now() - this.lastUpdateTime;
      if (timeSinceLastUpdate < this.config.minimumUpdateInterval) {
        return {
          shouldUpdate: false,
          blockedReason: `Too soon since last update (${Math.round(timeSinceLastUpdate / 60000)}min ago)`
        };
      }

      // Check daily limit
      if (this.dailyUpdateCount >= this.config.maxDailyUpdates) {
        return {
          shouldUpdate: false,
          blockedReason: `Daily update limit reached (${this.dailyUpdateCount}/${this.config.maxDailyUpdates})`
        };
      }

      // Get current price data
      const currentPrice = await ghiblifyPriceOracle.getTokenPrice();
      
      // Check if price is stable enough
      if (!ghiblifyPriceOracle.isPriceStable()) {
        return {
          shouldUpdate: false,
          blockedReason: 'Price too volatile (>30% daily change)'
        };
      }

      // Calculate price change since theoretical last update
      const lastKnownPrice = await this.getLastKnownPrice();
      if (!lastKnownPrice) {
        return {
          shouldUpdate: true,
          reason: 'Initial price setup needed'
        };
      }

      const priceChange = Math.abs(currentPrice.priceUSD - lastKnownPrice) / lastKnownPrice;
      
      if (priceChange >= this.config.priceChangeThreshold) {
        return {
          shouldUpdate: true,
          reason: `Significant price change: ${(priceChange * 100).toFixed(1)}%`
        };
      }

      return {
        shouldUpdate: false,
        blockedReason: `Price change too small: ${(priceChange * 100).toFixed(1)}% (threshold: ${this.config.priceChangeThreshold * 100}%)`
      };

    } catch (error) {
      console.error('Error checking if prices should update:', error);
      return {
        shouldUpdate: false,
        blockedReason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Execute automatic price update
   */
  async executeUpdate(): Promise<boolean> {
    try {
      const check = await this.shouldUpdatePrices();
      
      if (!check.shouldUpdate) {
        console.log(`[Price Update] Skipped: ${check.blockedReason}`);
        return false;
      }

      console.log(`[Price Update] Executing: ${check.reason}`);

      // Execute the update
      await ghiblifyAdminService.autoUpdatePrices(`Auto-update: ${check.reason}`);

      // Update tracking
      this.lastUpdateTime = Date.now();
      this.dailyUpdateCount++;
      this.persistUpdateHistory();

      console.log(`[Price Update] Success! Updates today: ${this.dailyUpdateCount}/${this.config.maxDailyUpdates}`);
      return true;

    } catch (error) {
      console.error('[Price Update] Failed:', error);
      return false;
    }
  }

  /**
   * Get configuration for monitoring
   */
  getConfig(): AutoUpdateConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AutoUpdateConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Private methods
  private async getLastKnownPrice(): Promise<number | null> {
    try {
      // This would ideally come from your database/cache
      // For now, use a simple localStorage fallback
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('ghiblify_last_contract_price');
        return stored ? parseFloat(stored) : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  private resetDailyCounterIfNeeded(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastResetDate !== today) {
      this.dailyUpdateCount = 0;
      this.lastResetDate = today;
    }
  }

  private persistUpdateHistory(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ghiblify_update_history', JSON.stringify({
          lastUpdateTime: this.lastUpdateTime,
          dailyUpdateCount: this.dailyUpdateCount,
          lastResetDate: this.lastResetDate,
        }));
      } catch (error) {
        console.warn('Failed to persist update history:', error);
      }
    }
  }
}

// Singleton instance
export const priceUpdateAutomation = new PriceUpdateAutomation();