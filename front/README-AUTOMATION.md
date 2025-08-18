# $GHIBLIFY Price Automation System

Automated price update system for the $GHIBLIFY token payment integration.

## Overview

The system automatically monitors $GHIBLIFY token prices and updates contract prices when significant changes occur, ensuring accurate pricing for credit purchases while minimizing unnecessary gas costs.

## Components

### 1. Backend Automation Service
- **File**: `backend/ghiblify-price-automation.cjs`
- **Purpose**: Core automation logic with smart thresholds and rate limiting
- **Features**:
  - 25% price change threshold for updates
  - Maximum 6 updates per day
  - 1-hour minimum between updates
  - Automatic daily counter reset
  - 5% safety buffer for price calculations

### 2. Event Listener Service
- **File**: `backend/ghiblify-event-listener.cjs`
- **Purpose**: Monitors contract events and triggers price checks
- **Features**:
  - Listens for CreditsPurchased and PricesUpdated events
  - Triggers price checks after large purchases (>10k tokens)
  - 5-minute check intervals
  - 100-block lookback for reliability

### 3. Management Scripts
- **Manual Update**: `npm run price:update`
- **Start Daemon**: `npm run price:start`
- **Stop Daemon**: `npm run price:stop`
- **Check Status**: `npm run price:status`
- **Start Events**: `npm run events:start`

## Configuration

### Contract Details
- **Contract**: `0x41f2fA6E60A34c26BD2C467d21EcB0a2f9087B03`
- **Token**: `0xc2B2EA7f6218CC37debBAFE71361C088329AE090` ($GHIBLIFY)
- **Network**: Base Mainnet (8453)

### Price Tiers (with 50% discount)
- **Starter**: $0.175 → ~335k $GHIBLIFY
- **Pro**: $1.75 → ~3.3M $GHIBLIFY  
- **Don**: $3.50 → ~6.7M $GHIBLIFY

### Rate Limits
- **Price threshold**: 25% change triggers update
- **Minimum interval**: 1 hour between updates
- **Daily limit**: 6 updates maximum
- **Check frequency**: 30 minutes

## Usage

### Start Automation
```bash
npm run price:start
```
Starts the background daemon that monitors prices and updates the contract automatically.

### Manual Price Update
```bash
npm run price:update
```
Forces an immediate price update based on current market conditions.

### Check Status
```bash
npm run price:status
```
Shows current automation status, last update time, market data, and contract prices.

### Stop Automation
```bash
npm run price:stop
```
Stops the background automation daemon.

## Monitoring

The system provides comprehensive logging:
- Price checks every 30 minutes
- Update decisions with reasoning
- Transaction hashes and gas usage
- Error handling and fallbacks
- Daily update tracking

### Status Dashboard
Use `npm run price:status` to see:
- ✅/❌ Service running status
- 💰 Last price update details
- 📈 Current market data
- 🔗 Current contract prices
- ⚙️ Configuration summary

## Security & Safety

- **5% Safety Buffer**: Prices include buffer to handle minor fluctuations
- **Volatility Protection**: Won't update if price changes >30% in a day
- **Rate Limiting**: Prevents excessive gas costs
- **Circuit Breakers**: Automatic fallbacks for API failures
- **Non-Reentrant**: Contract uses OpenZeppelin ReentrancyGuard

## Data Storage

The system uses simple file storage in the `data/` directory:
- `last-contract-price.json`: Tracks last update for change calculations
- `automation.pid`: Process ID for daemon management

## Environment Variables

Required in `.env` or `.env.local`:
- `PRIVATE_KEY`: Wallet private key for contract updates
- Wallet must have sufficient ETH for gas on Base mainnet

## API Dependencies

- **Primary**: DexScreener API for price data
- **Fallback**: CoinGecko API (configurable)
- **Timeout**: 10 seconds per API call
- **Caching**: 5 minutes for efficiency

## Error Handling

The system is designed to fail gracefully:
- API failures use cached prices
- Network errors retry automatically  
- Invalid price data is rejected
- Rate limit violations are logged and skipped
- All errors are logged with context

## Integration with Frontend

Frontend components automatically receive updated prices:
- `GhiblifyTokenButton.tsx`: Shows real-time token amounts needed
- `PaymentMethodSelector.tsx`: Displays current pricing
- Updates every 2 minutes on frontend for efficiency
- Backend handles the heavy lifting of contract updates