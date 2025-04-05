# Ghiblify

A full-stack application that converts photos into Studio Ghibli style artwork using Stable Diffusion. The frontend is built using Nextjs and ChakraUI. The backend uses ComfyUI's API for Stable Diffusion model inference, with Web3 wallet integration for authentication and Redis for credit management. This project utilizes an Image to Image pipeline with text prompt guidance.

## Production Deployment

### Current Production URLs

- Frontend: [ghiblify-it.vercel.app](https://ghiblify-it.vercel.app)
- Backend: [ghiblify.onrender.com](https://ghiblify.onrender.com)

### Deployment Architecture

#### Frontend (Vercel)

- Next.js application deployed on Vercel
- Automatic deployments from main branch
- Environment variables set in Vercel dashboard:
  ```env
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_***
  NEXT_PUBLIC_API_URL=https://ghiblify.onrender.com
  ```

#### Backend (Render)

- FastAPI application deployed on Render
- Automatic deployments from main branch
- Environment variables set in Render dashboard:
  ```env
  COMFY_UI_API_KEY=your_comfyui_key
  IMGBB_API_KEY=your_imgbb_key
  STRIPE_SECRET_KEY=sk_live_***
  STRIPE_WEBHOOK_SECRET=whsec_***
  REDIS_HOST=joint-mongoose-18966.upstash.io
  REDIS_PASSWORD=your_redis_password
  REDIS_PORT=6379
  REDIS_SSL=true
  FRONTEND_URL=https://ghiblify-it.vercel.app
  SUCCESS_URL=https://ghiblify-it.vercel.app/success
  CANCEL_URL=https://ghiblify-it.vercel.app/cancel
  CELO_RPC_URL=https://celo-mainnet.g.alchemy.com/v2/[KEY]
  CELO_CONTRACT_ADDRESS=0xC1a6b48d1898815bbD82C980f44f6f5688C2A9e4
  ```

#### Redis (Upstash)

- Managed Redis instance on Upstash
- SSL enabled for secure connections
- Data persistence enabled
- Key expiration policies:
  - Session tokens: 24 hours
  - Processing status: 1 hour
  - Credit records: No expiration

#### Stripe Integration

- **Live mode configuration**
- Webhook endpoint: `https://ghiblify.onrender.com/api/stripe/webhook`
- Required webhook events:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `payment_intent.succeeded`
  - `payment_intent.processing`
  - `payment_intent.payment_failed`
- Idempotency handling for duplicate events
- Customer ID management for recurring purchases
- Product: Ghiblify Credits (prod_S4ZE9n2K7Rvcpr)
- Price tiers:
  - Starter: $0.50 for 1 credit (price_1RAQ5yLt1uz9HoCm2md6mBsQ)
  - Pro: $4.99 for 12 credits (price_1RAQ5zLt1uz9HoCm1F5lZyF2)
  - Unlimited: $9.99 for 30 credits (price_1RAQ5zLt1uz9HoCmXTElLMjT)

#### CELO Integration

- Integration with CELO L2 for stablecoin payments
- Network: **Celo Mainnet (Chain ID: 42220)**
- Smart contract deployment for payment processing
- Parallel payment system alongside existing Stripe integration

**Deployed Contracts**:

```javascript
{
  "GhiblifyPayments": "0xC1a6b48d1898815bbD82C980f44f6f5688C2A9e4",
  "cUSD": "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  "network": "mainnet",
}
```

**Event Listener Configuration**:

```javascript
{
  "events": {
    "CreditsPurchased": {
      "signature": "CreditsPurchased(address,string,uint256,uint256,uint256)",
      "params": ["buyer", "packageTier", "amount", "credits", "timestamp"]
    }
  },
  "confirmations": 2,
  "startBlock": "0x2886b67"
}
```

**Architecture Components**:

1. **Smart Contract Layer**:

   ```solidity
   // Minimal payment contract
   // Accepts cUSD payments
   // Emits events for backend processing
   // No complex business logic
   ```

2. **Event Processing**:

   - Listen for payment events via Alchemy RPC
   - Validate transaction finality
   - Process credits via existing Redis system

3. **Data Flow**:
   ```
   User → Select CELO Payment → Smart Contract → Event Listener → Redis Credits
   ```

**Security Measures**:

1. **Double-Spend Prevention**:

   - Redis transaction tracking:
     ```
     Key: processed_tx:{chain_id}:{tx_hash}
     Value: {credit_amount}:{timestamp}
     ```
   - Atomic Redis operations for credit updates
   - Transaction finality confirmation

2. **Transaction Validation**:

   - Verify contract recipient
   - Validate payment amounts
   - Check stablecoin contract authenticity
   - Monitor block confirmations

3. **Error Handling**:
   - Transaction failure recovery
   - Chain reorganization handling
   - Manual intervention procedures
   - Comprehensive logging

**Implementation Phases**:

1. **Phase 1: Foundation** (Current)

   - Smart contract development
   - Event listener setup
   - Basic Redis integration

2. **Phase 2: Integration**

   - Frontend CELO payment option
   - Backend processing logic
   - Credit system integration

3. **Phase 3: Production Hardening**
   - Error recovery systems
   - Monitoring and alerts
   - Performance optimization

**Technical Details**:

1. **Network Configuration**:

   ```javascript
   {
     name: "Celo Alfajores Testnet",
     rpc: "https://alfajores-forno.celo-testnet.org",
     chainId: 44787,
     symbol: "CELO",
     explorer: "https://explorer.celo.org/alfajores"
   }
   ```

2. **Required Dependencies**:

   ```json
   {
     "@celo/contractkit": "^8.1.1",
     "@viem": "^2.0.0"
   }
   ```

3. **Monitoring Points**:
   - Transaction confirmations
   - Credit addition success
   - Redis operation status
   - Chain reorganizations

**Production Requirements**:

1. **Environment Variables**:

   ```env
   CELO_RPC_URL=https://celo-alfajores.g.alchemy.com/v2/[KEY]
   CELO_CONTRACT_ADDRESS=[PAYMENT_CONTRACT]
   CELO_CHAIN_ID=44787
   CELO_CONFIRMATION_BLOCKS=2
   ```

2. **Redis Schema Updates**:

   ```
   credits:{wallet} → Current credit balance
   processed_tx:{chain_id}:{tx_hash} → Processed transaction
   failed_tx:{chain_id}:{tx_hash} → Failed transactions
   ```

3. **Monitoring Requirements**:
   - Transaction processing status
   - Credit balance reconciliation
   - Chain health metrics
   - Error rate tracking

## Architecture

### Frontend

- Built with Next.js and React
- Uses Chakra UI for styling and components
- Features:
  - Web3 wallet integration (MetaMask, WalletConnect)
  - Stripe Checkout integration
  - Real-time processing status updates
  - Image upload and preview
  - Purchase history tracking
  - Credit balance management
  - Responsive design

### Backend

- FastAPI Python backend
- Key components:
  - ComfyUI API integration for Stable Diffusion
  - Web3 authentication
  - Redis credit management
  - Stripe payment processing
  - ImgBB image hosting
  - Webhook handling for async operations

### Data Flow

1. **Authentication Flow**:

   ```
   User → Connect Wallet → Backend validates → Redis stores session
   ```

2. **Purchase Flow**:

   ```
   User → Stripe Checkout → Webhook → Redis credits update → Frontend refresh
   ```

3. **Image Processing Flow**:
   ```
   Upload → ImgBB → ComfyUI → Webhook → Redis status → Frontend polls
   ```

## Local Development

### Prerequisites

- Node.js (v18 or higher)
- Python 3.11+
- Redis server
- ComfyUI API key
- ImgBB API key
- Stripe API keys
- Ngrok (for local webhook testing)
- Replicate API key
- Ghiblify API key (for external API)

### Local Development Setup

#### 1. Redis Setup

```bash
# Install Redis (MacOS)
brew install redis

# Start Redis server
brew services start redis

# Verify Redis is running
redis-cli ping  # Should return PONG
```

For other operating systems, follow the [official Redis installation guide](https://redis.io/docs/getting-started/installation/).

#### 2. Ngrok Setup

Ngrok is required for local webhook testing with ComfyUI:

```bash
# Install Ngrok (MacOS)
brew install ngrok

# Start Ngrok tunnel (after backend is running)
ngrok http 8000

# Copy the generated HTTPS URL and set it as WEBHOOK_BASE_URL in backend .env
```

#### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd front

# Install dependencies
npm install

# Copy example env file
cp .env.example .env

# Edit .env with your values:
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

#### 4. Backend Setup

```bash
# Navigate to backend directory
cd back

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy example env file
cp .env.example .env

# Edit .env with required values:
# REPLICATE_API_TOKEN=your_replicate_key
# GHIBLIFY_API_KEY=your_ghiblify_key
COMFY_UI_API_KEY=your_comfyui_key
IMGBB_API_KEY=your_imgbb_key
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
REDIS_HOST=localhost
REDIS_PORT=6379
WEBHOOK_BASE_URL=your_ngrok_url

# Start development server
python main.py
```

The backend will be available at `http://localhost:8000`

#### 5. Testing Local Setup

1. **Test Redis Connection**:

```bash
# In Python shell
python
>>> import redis
>>> r = redis.Redis(host='localhost', port=6379)
>>> r.ping()  # Should return True
```

2. **Test Webhook Setup**:

```bash
# Get your ngrok URL
ngrok http 8000

# Update WEBHOOK_BASE_URL in .env
# Test webhook endpoint
curl -X POST "your_ngrok_url/api/comfyui/webhook" \
-H "Content-Type: application/json" \
-d '{"success":true,"data":{"id":"test","state":"COMPLETED"}}'
```

3. **Test Image Processing**:

- Connect wallet on frontend
- Purchase credits
- Upload an image
- Check logs for webhook and status updates

### Environment Variables

#### Backend Environment Variables

Create a `.env` file in the backend directory with:

```env
# API Keys
REPLICATE_API_TOKEN=your_replicate_key
GHIBLIFY_API_KEY=your_ghiblify_key
COMFY_UI_API_KEY=your_comfyui_key        # Required for image processing
IMGBB_API_KEY=your_imgbb_key              # Required for image hosting
REPLICATE_API_TOKEN=your_replicate_key    # Optional, for Replicate API
GHIBLIFY_API_KEY=your_ghiblify_key        # Optional, for external API

# Payment Configuration
STRIPE_SECRET_KEY=your_stripe_secret              # Required for payments
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret  # Required for payment webhooks

# Redis Configuration
REDIS_HOST=localhost  # Required for credit management
REDIS_PORT=6379       # Default Redis port

# Webhook Configuration
WEBHOOK_BASE_URL=your_ngrok_url  # Required for local ComfyUI webhooks

# Frontend URLs (for production)
FRONTEND_URL=https://your-frontend-url
SUCCESS_URL=https://your-frontend-url/success
CANCEL_URL=https://your-frontend-url/cancel
```

#### Frontend Environment Variables

Create a `.env` file in the frontend directory with:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000  # For local development
# NEXT_PUBLIC_API_URL=https://your-api-url  # For production
```

#### Getting API Keys

1. **ComfyUI API Key**: Sign up at [ComfyUI Online](https://comfyonline.app)
2. **ImgBB API Key**: Register at [ImgBB API](https://api.imgbb.com)
3. **Stripe Keys**: Get from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
   - Use test keys for development
   - Use live keys for production

## Web Interface

A deployed version of the web interface is available at [ghiblify-it.vercel.app](https://ghiblify-it.vercel.app).

### Features

- Web3 wallet integration for authentication
- Credit system for image transformations
- Stripe integration for credit purchases
- Upload photos and transform them into Studio Ghibli style artwork
- Preview before and after results
- Real-time progress tracking
- View example transformations
- Responsive design with Chakra UI

## External API

Ghiblify also provides an API for external applications to integrate the Ghibli-style transformation:

### API Endpoints

#### Transform Image

```http
POST https://ghiblify.onrender.com/ghiblify
Content-Type: application/json
X-API-Key: your-api-key

{
  "imageUrl": "https://example.com/your-image.jpg"
}
```

#### Check Status

```http
GET https://ghiblify.onrender.com/ghiblify/{prediction_id}
X-API-Key: your-api-key
```

### Example Usage

```javascript
const ghiblifyImage = async (imageUrl, apiKey) => {
  try {
    // Start the transformation
    const response = await fetch("https://ghiblify.onrender.com/ghiblify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ imageUrl }),
    });

    if (response.status === 401) {
      throw new Error("Invalid API key");
    }

    const { id } = await response.json();

    // Poll for completion
    const checkStatus = async () => {
      const statusResponse = await fetch(
        `https://ghiblify.onrender.com/ghiblify/${id}`,
        {
          headers: {
            "X-API-Key": apiKey,
          },
        }
      );

      const result = await statusResponse.json();

      if (result.status === "succeeded") {
        return result.output;
      } else if (result.status === "failed") {
        throw new Error("Transformation failed");
      } else {
        // Still processing, check again in 1 second
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return checkStatus();
      }
    };

    return await checkStatus();
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
```

### API Requirements

- Valid API key in the `X-API-Key` header
- Publicly accessible image URL
- Image should be in a common format (JPEG, PNG, etc.)

## Examples

<h4>Before → After</h4>
<table>
  <tr>
    <td>
      <img src="images/0bridge.png" alt="Original Golden Gate Bridge" width="300" height="200">
    </td>
    <td>
      <img src="images/bridge.png" alt="Ghibli style Golden Gate Bridge" width="300" height="200">
    </td>
  </tr>
  <tr>
    <td>
      <img src="images/0jerry.png" alt="Original photo" width="300" height="200">
    </td> 
    <td>
      <img src="images/jerry.png" alt="Ghibli style photo" width="300" height="200">
    </td>
  </tr>
</table>

## Built By

- [Vishal Shenoy](https://vishalshenoy.com)
- [Papa](https://warpcast.com/papa)

## Production Configuration

### Stripe Setup

1. **Webhook Configuration**:

   ```bash
   # List current webhooks
   stripe webhook_endpoints list

   # Update webhook URL
   stripe webhook_endpoints update we_xxx --url "https://ghiblify.onrender.com/api/stripe/webhook"
   ```

2. **Testing Webhooks**:

   ```bash
   # Send test event
   stripe trigger checkout.session.completed
   ```

3. **Monitoring**:
   - Watch webhook delivery in Stripe Dashboard
   - Check backend logs for webhook processing
   - Verify credit updates in Redis

### Redis Management

1. **Monitoring Credits**:

   ```bash
   # Connect to Redis CLI
   redis-cli -h joint-mongoose-18966.upstash.io -p 6379 -a your_password --tls

   # Check user credits
   GET credits:0x123...  # Replace with wallet address
   ```

2. **Troubleshooting**:

   ```bash
   # List all keys for a wallet
   KEYS *0x123*

   # Check webhook processing status
   GET credited:session:cs_test_xxx
   ```

### Deployment Checks

1. **Backend Health**:

   ```bash
   # Check API status
   curl https://ghiblify.onrender.com/health

   # Test Redis connection
   curl https://ghiblify.onrender.com/api/web3/redis/test
   ```

2. **Webhook Verification**:
   ```bash
   # Test webhook endpoint
   curl -X POST https://ghiblify.onrender.com/api/stripe/webhook \
   -H "Content-Type: application/json" \
   -d '{"test": true}'
   ```

## Troubleshooting

### Common Issues

1. **Credits Not Updating**:

   - Check Stripe webhook logs
   - Verify webhook signature
   - Check Redis connection
   - Confirm customer ID mapping

2. **Image Processing Fails**:

   - Check ComfyUI API status
   - Verify ImgBB upload
   - Check webhook delivery
   - Monitor Redis status updates

3. **Payment Issues**:
   - Verify Stripe configuration
   - Check webhook events
   - Confirm customer creation
   - Monitor credit addition logs

### Monitoring

1. **Stripe Dashboard**:

   - Monitor webhook deliveries
   - Track failed payments
   - Check customer creation

2. **Redis Monitoring**:

   - Watch credit updates
   - Track session tokens
   - Monitor key expiration

3. **Backend Logs**:
   - Check webhook processing
   - Monitor credit updates
   - Track image processing

### CELO Integration Implementation

The CELO integration is now fully functional with the following components:

1. **Smart Contract**:

   - Address: `0x060c876F8C86D77A4A5E6A7AAF6f20bf5B3ce578`
   - Network: Celo Alfajores Testnet (Chain ID: 44787)
   - Features:
     - Accepts cUSD payments
     - Emits `CreditsPurchased` events with transaction details
     - Validates package prices and credit amounts

2. **Frontend Integration**:

   - Uses viem for contract interaction
   - Handles wallet connection and transaction signing
   - Manages cUSD approvals and purchases
   - Real-time transaction status updates
   - Credit balance display

3. **Backend Processing**:

   - Event listener for `CreditsPurchased` events
   - Redis-based credit management
   - Transaction deduplication
   - Purchase history tracking
   - Error handling and recovery

4. **Package Tiers**:

   ```javascript
   {
     "starter": { price: 0.35 cUSD, credits: 1 },
     "pro": { price: 3.5 cUSD, credits: 12 },
     "unlimited": { price: 7 cUSD, credits: 30 }
   }
   ```

5. **Event Processing**:

   - Background task runs every 30 seconds to process pending events
   - Handles up to 1000 blocks per processing cycle
   - Implements deduplication to prevent double-crediting
   - Maintains transaction history in Redis

6. **Security Measures**:

   - Transaction finality confirmation (2 blocks)
   - Redis atomic operations for credit updates
   - Event signature validation
   - Double-spend prevention via Redis tracking

7. **Testing**:

   - Contract interaction via curl commands
   - Event processing verification
   - Credit balance reconciliation
   - Transaction history tracking

8. **Monitoring**:
   - Transaction status tracking
   - Event processing logs
   - Credit update verification
   - Error rate monitoring

The implementation ensures secure and reliable credit purchases through the CELO network, with proper event handling and credit management.
