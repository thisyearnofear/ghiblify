/**
 * Admin Service for $GHIBLIFY Token Payment Management
 * Handles price updates and contract administration
 */

import { ghiblifyPriceOracle } from './ghiblify-price-oracle';
import { api } from '../config/api';

export interface PriceUpdateRequest {
  tier: string;
  newPrice: string; // In token amount (wei)
  reason: string;
}

export interface ContractStats {
  totalVolume: string;
  totalTransactions: number;
  contractBalance: string;
  lastUpdated: number;
}

export interface AdminDashboardData {
  stats: ContractStats;
  currentPrices: Record<string, string>;
  priceHistory: any[];
  recentTransactions: any[];
}

class GhiblifyAdminService {
  private readonly ADMIN_API_BASE = '/api/admin/ghiblify-token';

  /**
   * Get admin dashboard data
   */
  async getDashboardData(): Promise<AdminDashboardData> {
    try {
      const [stats, prices, history] = await Promise.all([
        this.getContractStats(),
        this.getCurrentPrices(),
        this.getPriceHistory(),
      ]);

      return {
        stats,
        currentPrices: prices,
        priceHistory: history,
        recentTransactions: [], // Implement if needed
      };
    } catch (error) {
      throw new Error(`Failed to load dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current contract statistics
   */
  async getContractStats(): Promise<ContractStats> {
    try {
      const response = await api.get(`${this.ADMIN_API_BASE}/stats`);
      return {
        totalVolume: response.totalVolume,
        totalTransactions: response.totalTransactions,
        contractBalance: response.contractBalance,
        lastUpdated: Date.now(),
      };
    } catch (error) {
      throw new Error(`Failed to fetch contract stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current token prices for all tiers
   */
  async getCurrentPrices(): Promise<Record<string, string>> {
    try {
      const response = await api.get(`${this.ADMIN_API_BASE}/prices`);
      return response.prices;
    } catch (error) {
      throw new Error(`Failed to fetch current prices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update token price for a specific tier
   */
  async updateTierPrice(request: PriceUpdateRequest): Promise<void> {
    try {
      await api.post(`${this.ADMIN_API_BASE}/update-price`, {
        tier: request.tier,
        newPrice: request.newPrice,
        reason: request.reason,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to update price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Batch update all tier prices based on current token price
   */
  async autoUpdatePrices(reason: string = 'Automated price adjustment'): Promise<void> {
    try {
      // Get current token price
      const tokenPrice = await ghiblifyPriceOracle.getTokenPrice();
      
      // Calculate new token amounts for each tier
      const tierUSDPrices = {
        starter: 0.35,
        pro: 3.50,
        unlimited: 7.00,
      };

      const updates = Object.entries(tierUSDPrices).map(([tier, usdPrice]) => {
        // Apply 50% discount
        const discountedUSD = usdPrice * 0.5;
        // Calculate tokens needed with 5% safety buffer
        const tokensNeeded = Math.ceil((discountedUSD / tokenPrice.priceUSD) * 1.05);
        const tokenAmount = (BigInt(tokensNeeded) * BigInt(10**18)).toString();
        
        return {
          tier: tier === 'unlimited' ? 'don' : tier, // Map to contract naming
          newPrice: tokenAmount,
          reason,
        };
      });

      // Batch update via API
      await api.post(`${this.ADMIN_API_BASE}/batch-update-prices`, {
        updates,
        tokenPrice: tokenPrice.priceUSD,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      throw new Error(`Failed to auto-update prices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get price history for analytics
   */
  async getPriceHistory(days: number = 7): Promise<any[]> {
    try {
      const response = await api.get(`${this.ADMIN_API_BASE}/price-history?days=${days}`);
      return response.history || [];
    } catch (error) {
      console.warn('Failed to fetch price history:', error);
      return [];
    }
  }

  /**
   * Withdraw accumulated tokens from contract
   */
  async withdrawTokens(amount: string = "0"): Promise<void> {
    try {
      await api.post(`${this.ADMIN_API_BASE}/withdraw`, {
        amount, // "0" means withdraw all
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to withdraw tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pause/unpause the contract
   */
  async setPausedState(paused: boolean, reason: string): Promise<void> {
    try {
      await api.post(`${this.ADMIN_API_BASE}/set-paused`, {
        paused,
        reason,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to ${paused ? 'pause' : 'unpause'} contract: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get recommended price adjustments based on current market conditions
   */
  async getRecommendedPrices(): Promise<{
    recommendations: Array<{
      tier: string;
      currentPrice: string;
      recommendedPrice: string;
      reason: string;
      urgency: 'low' | 'medium' | 'high';
    }>;
    marketConditions: {
      volatility: number;
      trend: string;
      recommendation: string;
    };
  }> {
    try {
      const response = await api.get(`${this.ADMIN_API_BASE}/price-recommendations`);
      return response;
    } catch (error) {
      console.warn('Failed to get price recommendations:', error);
      return {
        recommendations: [],
        marketConditions: {
          volatility: 0,
          trend: 'unknown',
          recommendation: 'Monitor market conditions',
        },
      };
    }
  }

  /**
   * Check if current user has admin privileges
   */
  async isAdmin(): Promise<boolean> {
    try {
      const response = await api.get(`${this.ADMIN_API_BASE}/check-admin`);
      return response.isAdmin || false;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
export const ghiblifyAdminService = new GhiblifyAdminService();

// Convenience exports
export { GhiblifyAdminService };