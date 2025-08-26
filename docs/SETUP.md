# Ghiblify Setup Guide

Complete local development setup instructions for Ghiblify.

## Prerequisites

- Node.js (v18+)
- Python 3.11+
- Redis server
- API Keys: ComfyUI, ImgBB, Stripe, Replicate (optional)

## Quick Setup

### 1. Redis Setup

```bash
# macOS
brew install redis && brew services start redis

# Verify
redis-cli ping  # Should return PONG
```

### 2. Backend Setup

```bash
cd back
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file (see Environment Variables section)
python main.py  # Runs on http://localhost:8000
```

### 3. Frontend Setup

```bash
cd front
npm install

# Create .env.local file (see Environment Variables section)
npm run dev  # Runs on http://localhost:3000
```

### 4. Webhook Setup (Optional)

```bash
# Install and run ngrok
brew install ngrok
ngrok http 8000

# Update WEBHOOK_BASE_URL in backend .env with ngrok URL
```

## Environment Variables

### Backend (.env)

```env
# API Keys (Required for full functionality)
REPLICATE_API_TOKEN=your_replicate_key
GHIBLIFY_API_KEY=your_ghiblify_key
COMFY_UI_API_KEY=your_comfyui_key
IMGBB_API_KEY=your_imgbb_key

# Payment Configuration (Required for payments)
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Redis Configuration (Required for credit management)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=
REDIS_SSL=false

# Webhook Configuration (Required for local ComfyUI webhooks)
WEBHOOK_BASE_URL=http://localhost:8000

# Frontend URLs (for local development)
FRONTEND_URL=http://localhost:3000
SUCCESS_URL=http://localhost:3000/success
CANCEL_URL=http://localhost:3000/cancel

# CELO Configuration (Optional - for Web3 payments)
CELO_RPC_URL=https://celo-mainnet.g.alchemy.com/v2/your_alchemy_key
CELO_CONTRACT_ADDRESS=0xC1a6b48d1898815bbD82C980f44f6f5688C2A9e4
CELO_CHAIN_ID=42220
CELO_CONFIRMATION_BLOCKS=2

# Base Pay Configuration (Optional - for Base Pay payments)
BASE_PAY_RECIPIENT_ADDRESS=0xYourRecipientAddress
BASE_PAY_TESTNET=true
```

### Frontend (.env.local)

```env
# Frontend Environment Variables for Local Development
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_CELO_RPC_URL=https://forno.celo.org
```

## Getting API Keys

1. **ComfyUI**: [ComfyUI Online](https://comfyonline.app)
2. **ImgBB**: [ImgBB API](https://api.imgbb.com)
3. **Stripe**: [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
4. **WalletConnect**: [WalletConnect Cloud](https://cloud.walletconnect.com)

## Launching the Application

1. **Start Backend**: `cd back && python main.py`
2. **Start Frontend**: `cd front && npm run dev`
3. **Access**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Troubleshooting

- **Backend fails to start**: Check Redis is running with `redis-cli ping`
- **Frontend can't connect**: Ensure backend is running on port 8000
- **Environment issues**: Verify .env files are correctly configured
