# Ghiblify ✨

Transform your photos into enchanting Studio Ghibli style artwork using AI. Features multiple payment options, batch processing, and a beautiful dark/light mode interface.

**Latest Updates:**
- 🌙 **Dark Mode Support** - Elegant theme with glass morphism styling
- 💎 **$GHIBLIFY Token Payments** - 50% discount with native token
- 🎯 **Divvi Integration** - Earn referral rewards on Celo and Base transactions
- 🔧 **Enhanced UX** - Centralized theme system and improved responsiveness
- 🖥️ **Desktop Fixes** - Token payment visibility resolved

## Divvi Integration

Earn referral rewards on Celo and Base transactions. Users sign the same transaction - referral tracking is appended to calldata.

**Setup**: Enhance existing wagmi hooks in `Pricing.js`:
```javascript
import { createDivviEnhancedWriteContract } from "../lib/utils/divvi-enhancer";
const approveAsync = createDivviEnhancedWriteContract(originalApproveAsync, publicClient);
```

**Environment**: Already configured in `.env.local`

## Production Deployment

### Live URLs

- **Frontend**: [ghiblify-it.vercel.app](https://ghiblify-it.vercel.app)
- **Backend**: [api.thisyearnofear.com](https://api.thisyearnofear.com)

## Architecture

### Frontend

- **Framework**: Next.js with React and Chakra UI
- **Features**: Web3 wallet integration, multiple payment options, real-time processing status, batch processing, responsive design

### Backend

- **Framework**: FastAPI Python backend
- **Components**: ComfyUI/Replicate API integration, Web3 authentication, Redis credit management, multiple payment processors, webhook handling

### Payment Systems

#### Stripe Integration

- Live mode with webhook endpoint: `https://api.thisyearnofear.com/api/stripe/webhook`
- Price tiers: Starter ($0.50/1 credit), Pro ($4.99/12 credits), Unlimited ($9.99/30 credits)

#### CELO Integration

- **Network**: Celo Mainnet (Chain ID: 42220)
- **Contract**: `0xC1a6b48d1898815bbD82C980f44f6f5688C2A9e4`
- **Features**: cUSD payments with 30% discount, event-based credit processing

#### $GHIBLIFY Token Integration

- **Network**: Base Mainnet (Chain ID: 8453)
- **Token Contract**: `0xc2B2EA7f6218CC37debBAFE71361C088329AE090`
- **Payment Contract**: `0x41f2fA6E60A34c26BD2C467d21EcB0a2f9087B03`
- **Features**: 50% discount on all tiers, native token utility, automated credit processing
- **Supported Wallets**: Base Account, MetaMask, WalletConnect-compatible wallets

**Pricing with $GHIBLIFY:**
- Starter: ~$0.25 worth of $GHIBLIFY (vs $0.50 USD)
- Pro: ~$2.50 worth of $GHIBLIFY (vs $4.99 USD)  
- Unlimited: ~$5.00 worth of $GHIBLIFY (vs $9.99 USD)

#### Base Pay Integration

- **Network**: Base Mainnet/Testnet
- **Features**: One-tap USDC payments, fast settlements (<2 seconds), low gas fees

**Configuration**:

```env
# Frontend
NEXT_PUBLIC_BASE_PAY_RECIPIENT_ADDRESS=0xYourWalletAddress
NEXT_PUBLIC_BASE_PAY_TESTNET=true

# Backend
BASE_PAY_RECIPIENT_ADDRESS=0xYourWalletAddress
BASE_PAY_TESTNET=true
```

### Data Flow

1. **Authentication**: User → Connect Wallet → Backend validates → Redis stores session
2. **Purchase**: User → Payment Method → Webhook → Redis credits update → Frontend refresh
3. **Processing**: Upload → ImgBB → ComfyUI/Replicate → Webhook → Redis status → Frontend polls

## Local Development

### Prerequisites

- Node.js (v18+), Python 3.11+, Redis server
- API Keys: ComfyUI, ImgBB, Stripe, Replicate (optional)
- Ngrok (for webhook testing)

### Quick Setup

#### 1. Redis Setup

```bash
# macOS
brew install redis && brew services start redis

# Verify
redis-cli ping  # Should return PONG
```

#### 2. Backend Setup

```bash
cd back
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file (see Environment Variables section)
python main.py  # Runs on http://localhost:8000
```

#### 3. Frontend Setup

```bash
cd front
npm install

# Create .env file (see Environment Variables section)
npm run dev  # Runs on http://localhost:3000
```

#### 4. Webhook Setup (Optional)

```bash
# Install and run ngrok
brew install ngrok
ngrok http 8000

# Update WEBHOOK_BASE_URL in backend .env with ngrok URL
```

### Launching the Application Locally

#### Prerequisites Verification

Before launching, ensure Redis is running:

```bash
# Install Redis (if not already installed)
brew install redis

# Start Redis service
brew services start redis

# Verify Redis is running
redis-cli ping  # Should return "PONG"
```

#### 1. Launch the Backend (FastAPI)

Open a terminal and run:

```bash
# Navigate to the backend directory
cd back

# Activate the virtual environment (it already exists)
source venv/bin/activate

# Install dependencies (if not already done)
pip install -r requirements.txt

# Launch the backend server
python main.py
```

The backend will start on http://localhost:8000

#### 2. Launch the Frontend (Next.js)

Open a new terminal window/tab and run:

```bash
# Navigate to the frontend directory
cd front

# Install dependencies (if not already done)
npm install

# Launch the frontend development server
npm run dev
```

The frontend will start on http://localhost:3000

#### 3. Access the Application

- **Frontend**: Open your browser and go to http://localhost:3000
- **Backend API**: The backend API will be available at http://localhost:8000
- **API Documentation**: You can view the FastAPI docs at http://localhost:8000/docs

#### Key Points

- **Backend first**: Always start the backend before the frontend since the frontend needs to connect to the backend API
- **Two terminals**: You'll need two separate terminal windows/tabs - one for backend, one for frontend
- **Environment files**: Make sure you have the .env files set up in both directories with the correct local URLs
- **Redis dependency**: The backend requires Redis to be running for session management and credit tracking

#### Troubleshooting

- If the backend fails to start, check that Redis is running with `redis-cli ping`
- If the frontend can't connect to the backend, make sure the backend is running on port 8000
- Check the .env files in both directories to ensure the API URLs are correctly configured

The setup looks like it's already been configured since the virtual environment exists in the backend and the .next build directory exists in the frontend.

### Environment Variables

For local development, you need to ensure that both frontend and backend are configured to communicate with each other locally.

#### Backend (`.env`)

Make sure your `back/.env` file has the following configuration for local development:

```env
# API Keys (Required for full functionality)
# You can get these from the respective service providers
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

#### Frontend (`.env.local`)

For the frontend, make sure your `front/.env.local` file has the following configuration for local development:

```env
# Frontend Environment Variables for Local Development
# API Configuration - Point to your local backend
NEXT_PUBLIC_API_URL=http://localhost:8000

# WalletConnect Project ID (for RainbowKit)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Celo RPC URL
NEXT_PUBLIC_CELO_RPC_URL=https://forno.celo.org

# Development overrides (uncomment for local development)
# NEXT_PUBLIC_API_URL=http://localhost:8000
```

If you don't have a `.env.local` file, create one with the content above. The `NEXT_PUBLIC_API_URL` should be set to `http://localhost:8000` to connect to your local backend.

#### Switching Between Local and Production

To switch between local development and production:

1. **For Local Development**:

   - Ensure `NEXT_PUBLIC_API_URL=http://localhost:8000` in `front/.env.local`
   - Ensure Redis is configured for localhost in `back/.env`

2. **For Production**:
   - Comment out or remove `NEXT_PUBLIC_API_URL=http://localhost:8000` in `front/.env.local`
   - The frontend will then use the default production URL (`https://api.thisyearnofear.com`)

### Getting API Keys

1. **ComfyUI**: [ComfyUI Online](https://comfyonline.app)
2. **ImgBB**: [ImgBB API](https://api.imgbb.com)
3. **Stripe**: [Stripe Dashboard](https://dashboard.stripe.com/apikeys) (use test keys for development)

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: Chakra UI with custom Ghibli theme
- **Web3**: RainbowKit + Wagmi + Viem
- **State**: React hooks + context
- **Styling**: Dark/light mode with glass morphism
- **TypeScript**: Full type safety

### Backend  
- **Framework**: FastAPI (Python)
- **Database**: Redis (sessions + credit management)
- **AI**: ComfyUI + Replicate integration
- **Storage**: ImgBB for image hosting
- **Payments**: Stripe + Web3 (Base, Celo)

### Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Hetzner VPS
- **Redis**: Upstash (managed)
- **CI/CD**: GitHub Actions

## Features

### Web Interface

- **🎨 Theming**: Beautiful dark/light mode with Ghibli aesthetics
- **🔐 Authentication**: Web3 wallet integration (MetaMask, WalletConnect, Base Account)
- **⚡ Processing Options**: "Slow Ghibli" (high quality) vs "Faster Ghibli" (medium quality)
- **📚 Batch Processing**: Up to 6 images with storyboard generation
- **🎛️ Customization**: Ghibli intensity slider (50-100%)
- **📱 Responsive**: Mobile-first design with touch optimizations
- **💰 Multiple Payments**: Stripe, $GHIBLIFY tokens (50% off), CELO, Base Pay
- **📤 Social Features**: Share results, download storyboards

### External API

Transform images programmatically:

```javascript
const response = await fetch("https://api.thisyearnofear.com/ghiblify", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "your-api-key",
  },
  body: JSON.stringify({ imageUrl: "https://example.com/image.jpg" }),
});

const { id } = await response.json();

// Poll for completion
const result = await fetch(`https://api.thisyearnofear.com/ghiblify/${id}`, {
  headers: { "X-API-Key": "your-api-key" },
});
```

## Examples

| Before                                 | After                               |
| -------------------------------------- | ----------------------------------- |
| ![Original](images/0jerry.png)         | ![Ghibli Style](images/jerry.png)   |
| ![Original Bridge](images/0bridge.png) | ![Ghibli Bridge](images/bridge.png) |

## Roadmap

### Current User Flow Rating: 7.5/10

#### Immediate Improvements (High Impact, Low Effort)

- **Enhanced Upload UX**: Drag & drop interface replacing basic file input
- **Processing Queue**: Show estimated wait time and queue position
- **Faster Feedback**: Reduce fact rotation from 30s to 10-15s intervals
- **One-Click Retry**: Add retry button for failed generations

#### Medium-Term Features

- **Real-time Updates**: Replace polling with WebSocket status updates
- **Progressive Loading**: Show intermediate processing steps/previews
- **Smart Credit Prompts**: Contextual credit purchase suggestions
- **Mobile Optimization**: Enhanced mobile file handling and preview

#### Advanced Features

- **Generation History**: Save and revisit previous transformations
- **Style Variations**: Multiple Ghibli sub-styles (Totoro, Spirited Away themes)
- **Batch Queue Management**: Pause/resume batch processing
- **Social Features**: Community galleries and showcases

#### Technical Optimizations

- **Webhook Reliability**: Implement retry mechanisms and fallback polling
- **Image Pipeline**: Optimize multiple format conversions
- **Performance**: Reduce ComfyUI processing times through workflow optimization

## Testing

### Backend API

```bash
# Health check
curl http://localhost:8000/api/health

# Base Pay pricing
curl http://localhost:8000/api/base-pay/pricing

# Test payment processing
curl -X POST http://localhost:8000/api/base-pay/process-payment \
  -H "Content-Type: application/json" \
  -d '{"id":"test_123","status":"completed","amount":"0.50","tier":"starter"}'
```

### Redis Connection

```bash
# Python test
python -c "import redis; r=redis.Redis(host='localhost', port=6379); print(r.ping())"
```

## Troubleshooting

### Common Issues

1. **Credits Not Updating**: Check webhook logs, verify Redis connection
2. **Image Processing Fails**: Verify ComfyUI/ImgBB API keys, check webhook delivery
3. **Payment Issues**: Confirm Stripe configuration, check webhook events

### Monitoring

- **Stripe Dashboard**: Monitor webhook deliveries and failed payments
- **Redis**: Track credit updates and session tokens
- **Backend Logs**: Check webhook processing and credit updates

## Production Configuration

### Environment Variables

```env
# Frontend (Production)
NEXT_PUBLIC_API_URL=https://api.thisyearnofear.com
NEXT_PUBLIC_BASE_PAY_TESTNET=false

# Backend (Production)
PRODUCTION_API_URL=https://api.thisyearnofear.com
FRONTEND_URL=https://ghiblify-it.vercel.app
SUCCESS_URL=https://ghiblify-it.vercel.app/success
CANCEL_URL=https://ghiblify-it.vercel.app/cancel
BASE_PAY_TESTNET=false
```

### Deployment

- **Frontend**: Vercel (automatic deployments from main branch)
- **Backend**: Hetzner VPS (automatic deployments via GitHub Actions)
- **Redis**: Upstash (managed Redis with SSL)

### Environment Variables

The application uses environment variables for configuration. Key variables include:

#### Backend Environment Variables

- `PRODUCTION_API_URL`: Production API URL (default: `https://api.thisyearnofear.com`)
- `WEBHOOK_BASE_URL`: Base URL for webhooks
- `FRONTEND_URL`: Frontend URL for CORS and redirects
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`: Redis configuration
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`: Stripe configuration
- `COMFY_UI_API_KEY`, `IMGBB_API_KEY`: External service API keys

#### Frontend Environment Variables

- `NEXT_PUBLIC_API_URL`: API endpoint URL (default: `https://api.thisyearnofear.com`)
- `NEXT_PUBLIC_BASE_PAY_TESTNET`: Base Pay testnet flag

## Built By

- [Vishal Shenoy](https://vishalshenoy.com)
- [Papa](https://warpcast.com/papa)