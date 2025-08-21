/**
 * Price Oracle Service for $GHIBLIFY Token
 * Handles real-time pricing with volatility protection
 */

export interface TokenPriceData {
  priceUSD: number;
  timestamp: number;
  source: string;
  marketCap: number;
  change24h: number;
}

export interface PricingCalculation {
  usdAmount: number;
  tokenAmount: bigint;
  tokenAmountFormatted: string;
  pricePerToken: number;
  discount: number;
  savings: number;
}

class GhiblifyPriceOracle {
  private readonly TOKEN_ADDRESS = '0xc2B2EA7f6218CC37debBAFE71361C088329AE090';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly FALLBACK_PRICE = 0.001; // $0.001 USD
  private readonly MAX_PRICE_CHANGE = 0.5; // 50% max change per update
  private readonly SAFETY_BUFFER = 1.05; // 5% buffer for price movement during transaction
  
  private cachedPrice: TokenPriceData | null = null;
  private priceHistory: TokenPriceData[] = [];
  private updatePromise: Promise<TokenPriceData> | null = null;

  /**
   * Get current token price with caching and fallback
   */
  async getTokenPrice(): Promise<TokenPriceData> {
    // Return cached price if still valid
    if (this.cachedPrice && this.isCacheValid()) {
      return this.cachedPrice;
    }

    // Prevent concurrent updates
    if (this.updatePromise) {
      return this.updatePromise;
    }

    this.updatePromise = this.fetchAndValidatePrice();
    
    try {
      const price = await this.updatePromise;
      this.cachedPrice = price;
      this.addToPriceHistory(price);
      return price;
    } finally {
      this.updatePromise = null;
    }
  }

  /**
   * Calculate token amount needed for USD purchase
   */
  async calculateTokenAmount(usdAmount: number, tierName: string): Promise<PricingCalculation> {
    const priceData = await this.getTokenPrice();
    const discount = this.getDiscountForTier(tierName);
    const discountedUSD = usdAmount * (1 - discount);
    
    // Apply safety buffer for price movement during transaction
    const tokensNeeded = Math.ceil((discountedUSD / priceData.priceUSD) * this.SAFETY_BUFFER);
    const tokenAmount = BigInt(tokensNeeded * 10**18); // Convert to wei
    
    return {
      usdAmount: discountedUSD,
      tokenAmount,
      tokenAmountFormatted: this.formatTokenAmount(tokenAmount),
      pricePerToken: priceData.priceUSD,
      discount,
      savings: usdAmount - discountedUSD,
    };
  }

  /**
   * Get discount rate for tier (50% for all tiers to incentivize usage)
   */
  private getDiscountForTier(tierName: string): number {
    return 0.5; // 50% discount across all tiers
  }

  /**
   * Format token amount for display
   */
  private formatTokenAmount(tokenAmount: bigint): string {
    const tokens = Number(tokenAmount) / 10**18;
    
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    } else if (tokens >= 1) {
      return tokens.toFixed(0);
    } else {
      return tokens.toFixed(3);
    }
  }

  /**
   * Check if cached price is still valid
   */
  private isCacheValid(): boolean {
    if (!this.cachedPrice) return false;
    return Date.now() - this.cachedPrice.timestamp < this.CACHE_DURATION;
  }

  /**
   * Fetch price from multiple sources with validation
   */
  private async fetchAndValidatePrice(): Promise<TokenPriceData> {
    const sources = [
      () => this.fetchFromMoralis(),
      () => this.fetchFromDexScreener(),
      () => this.fetchFromCoinGecko(),
    ];

    let lastError: Error | null = null;

    // Try each source in order
    for (const fetchFn of sources) {
      try {
        const price = await fetchFn();
        if (this.validatePrice(price)) {
          return price;
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`Price fetch failed:`, error);
      }
    }

    // All sources failed, use fallback
    console.warn('All price sources failed, using fallback price');
    return this.getFallbackPrice();
  }

  /**
   * Fetch price from Moralis (primary source for Base tokens)
   */
  private async fetchFromMoralis(): Promise<TokenPriceData> {
    const response = await fetch(
      `https://deep-index.moralis.io/api/v2.2/erc20/${this.TOKEN_ADDRESS}/price?chain=base&include=percent_change`,
      { 
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'X-API-Key': process.env.NEXT_PUBLIC_MORALIS_API_KEY!
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Moralis API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.usdPrice || data.usdPrice <= 0) {
      throw new Error('No price data from Moralis');
    }

    return {
      priceUSD: parseFloat(data.usdPrice),
      timestamp: Date.now(),
      source: 'moralis',
      marketCap: parseFloat(data.pairTotalLiquidityUsd || '0'),
      change24h: parseFloat(data['24hrPercentChange'] || '0'),
    };
  }

  /**
   * Fetch price from DexScreener (fallback source)
   */
  private async fetchFromDexScreener(): Promise<TokenPriceData> {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${this.TOKEN_ADDRESS}`,
      { 
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      }
    );

    if (!response.ok) {
      throw new Error(`DexScreener API error: ${response.status}`);
    }

    const data = await response.json();
    const pair = data.pairs?.[0]; // Get the most liquid pair

    if (!pair?.priceUsd) {
      throw new Error('No price data from DexScreener');
    }

    return {
      priceUSD: parseFloat(pair.priceUsd),
      timestamp: Date.now(),
      source: 'dexscreener',
      marketCap: parseFloat(pair.fdv || '0'),
      change24h: parseFloat(pair.priceChange?.h24 || '0'),
    };
  }

  /**
   * Fetch price from CoinGecko (backup source)
   */
  private async fetchFromCoinGecko(): Promise<TokenPriceData> {
    // Note: You'll need to get the CoinGecko ID for your token
    // Real price fetching from CoinGecko API
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/token_price/base?contract_addresses=${this.TOKEN_ADDRESS}&vs_currencies=usd&include_market_cap=true&include_24hr_change=true`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const tokenData = data[this.TOKEN_ADDRESS.toLowerCase()];

    if (!tokenData?.usd) {
      throw new Error('No price data from CoinGecko');
    }

    return {
      priceUSD: tokenData.usd,
      timestamp: Date.now(),
      source: 'coingecko',
      marketCap: tokenData.usd_market_cap || 0,
      change24h: tokenData.usd_24h_change || 0,
    };
  }

  /**
   * Validate price against circuit breaker rules
   */
  private validatePrice(newPrice: TokenPriceData): boolean {
    // Always accept first price
    if (!this.cachedPrice) return true;

    const priceChange = Math.abs(newPrice.priceUSD - this.cachedPrice.priceUSD) / this.cachedPrice.priceUSD;
    
    // Circuit breaker: reject if price changed more than MAX_PRICE_CHANGE
    if (priceChange > this.MAX_PRICE_CHANGE) {
      console.warn(`Price change too large: ${(priceChange * 100).toFixed(1)}%, using cached price`);
      return false;
    }

    // Basic sanity checks
    if (newPrice.priceUSD <= 0 || newPrice.priceUSD > 1) { // Max $1 per token sanity check
      console.warn(`Price outside reasonable range: $${newPrice.priceUSD}`);
      return false;
    }

    return true;
  }

  /**
   * Get fallback price when all sources fail
   */
  private getFallbackPrice(): TokenPriceData {
    return {
      priceUSD: this.FALLBACK_PRICE,
      timestamp: Date.now(),
      source: 'fallback',
      marketCap: 50000, // Known approximate market cap
      change24h: 0,
    };
  }

  /**
   * Add price to history for trend analysis
   */
  private addToPriceHistory(price: TokenPriceData): void {
    this.priceHistory.push(price);
    
    // Keep only last 24 hours of data
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    this.priceHistory = this.priceHistory.filter(p => p.timestamp > cutoff);
  }

  /**
   * Get price trend over last 24 hours
   */
  getPriceTrend(): { direction: 'up' | 'down' | 'stable', change: number } {
    if (this.priceHistory.length < 2) {
      return { direction: 'stable', change: 0 };
    }

    const oldest = this.priceHistory[0];
    const newest = this.priceHistory[this.priceHistory.length - 1];
    const change = (newest.priceUSD - oldest.priceUSD) / oldest.priceUSD;

    if (Math.abs(change) < 0.05) return { direction: 'stable', change };
    return { direction: change > 0 ? 'up' : 'down', change };
  }

  /**
   * Check if token price is suitable for payments (not too volatile)
   */
  isPriceStable(): boolean {
    const trend = this.getPriceTrend();
    return Math.abs(trend.change) < 0.3; // Less than 30% change in 24h
  }

  /**
   * Get display-friendly price info
   */
  async getPriceDisplay(): Promise<{
    price: string;
    change: string;
    trend: 'up' | 'down' | 'stable';
    marketCap: string;
  }> {
    const priceData = await this.getTokenPrice();
    const trend = this.getPriceTrend();

    return {
      price: `$${priceData.priceUSD.toFixed(6)}`,
      change: `${trend.change >= 0 ? '+' : ''}${(trend.change * 100).toFixed(1)}%`,
      trend: trend.direction,
      marketCap: `$${(priceData.marketCap / 1000).toFixed(0)}K`,
    };
  }
}

// Export singleton instance
export const ghiblifyPriceOracle = new GhiblifyPriceOracle();