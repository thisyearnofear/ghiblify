# Ghiblify

A full-stack application that converts photos into Studio Ghibli style artwork using Stable Diffusion. Built with Next.js frontend, FastAPI backend, and multiple payment options including Stripe, CELO, and Base Pay.

## Production Deployment

### Live URLs

- **Frontend**: [ghiblify-it.vercel.app](https://ghiblify-it.vercel.app)
- **Backend**: [ghiblify.onrender.com](https://ghiblify.onrender.com)

## Architecture

### Frontend

- **Framework**: Next.js with React and Chakra UI
- **Features**: Web3 wallet integration, multiple payment options, real-time processing status, batch processing, responsive design

### Backend

- **Framework**: FastAPI Python backend
- **Components**: ComfyUI/Replicate API integration, Web3 authentication, Redis credit management, multiple payment processors, webhook handling

### Payment Systems

#### Stripe Integration

- Live mode with webhook endpoint: `https://ghiblify.onrender.com/api/stripe/webhook`
- Price tiers: Starter ($0.50/1 credit), Pro ($4.99/12 credits), Unlimited ($9.99/30 credits)

#### CELO Integration

- **Network**: Celo Mainnet (Chain ID: 42220)
- **Contract**: `0xC1a6b48d1898815bbD82C980f44f6f5688C2A9e4`
- **Features**: cUSD payments with 30% discount, event-based credit processing

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

### Environment Variables

#### Backend (`.env`)

```env
# Required API Keys
COMFY_UI_API_KEY=your_comfyui_key
IMGBB_API_KEY=your_imgbb_key
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_SSL=false

# Webhook Configuration
WEBHOOK_BASE_URL=http://localhost:8000

# Optional
REPLICATE_API_TOKEN=your_replicate_key
GHIBLIFY_API_KEY=your_ghiblify_key
BASE_PAY_RECIPIENT_ADDRESS=0xYourWalletAddress
BASE_PAY_TESTNET=true
```

#### Frontend (`.env`)

```env
# Required
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
NEXT_PUBLIC_API_URL=http://localhost:8000

# Optional
NEXT_PUBLIC_BASE_PAY_RECIPIENT_ADDRESS=0xYourWalletAddress
NEXT_PUBLIC_BASE_PAY_TESTNET=true
```

### Getting API Keys

1. **ComfyUI**: [ComfyUI Online](https://comfyonline.app)
2. **ImgBB**: [ImgBB API](https://api.imgbb.com)
3. **Stripe**: [Stripe Dashboard](https://dashboard.stripe.com/apikeys) (use test keys for development)

## Features

### Web Interface

- **Authentication**: Web3 wallet integration (MetaMask, WalletConnect)
- **Processing Options**: "Slow Ghibli" (high quality) vs "Faster Ghibli" (medium quality)
- **Batch Processing**: Up to 6 images with storyboard generation
- **Customization**: Ghibli intensity slider (50-100%)
- **Social Features**: Share results, download storyboards

### External API

Transform images programmatically:

```javascript
const response = await fetch("https://ghiblify.onrender.com/ghiblify", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "your-api-key",
  },
  body: JSON.stringify({ imageUrl: "https://example.com/image.jpg" }),
});

const { id } = await response.json();

// Poll for completion
const result = await fetch(`https://ghiblify.onrender.com/ghiblify/${id}`, {
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
NEXT_PUBLIC_API_URL=https://ghiblify.onrender.com
NEXT_PUBLIC_BASE_PAY_TESTNET=false

# Backend (Production)
FRONTEND_URL=https://ghiblify-it.vercel.app
SUCCESS_URL=https://ghiblify-it.vercel.app/success
CANCEL_URL=https://ghiblify-it.vercel.app/cancel
BASE_PAY_TESTNET=false
```

### Deployment

- **Frontend**: Vercel (automatic deployments from main branch)
- **Backend**: Render (automatic deployments from main branch)
- **Redis**: Upstash (managed Redis with SSL)

## Built By

- [Vishal Shenoy](https://vishalshenoy.com)
- [Papa](https://warpcast.com/papa)
