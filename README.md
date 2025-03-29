# Ghiblify

A full-stack application that converts photos into Studio Ghibli style artwork using Stable Diffusion. The frontend is built using Nextjs and ChakraUI. The backend uses ComfyUI's API for Stable Diffusion model inference, with Web3 wallet integration for authentication and Redis for credit management. This project utilizes an Image to Image pipeline with text prompt guidance.

## Architecture

### Frontend

- Built with Next.js and React
- Uses Chakra UI for styling and components
- Deployed on Vercel
- Communicates with backend via REST API

### Backend

- FastAPI Python backend
- Uses Replicate's API for Stable Diffusion model inference
- Uses ComfyUI's API for Stable Diffusion model inference
- Web3 wallet integration for authentication
- Redis for credit management
- Stripe integration for credit purchases
- ImgBB for image hosting
- Deployed on Render
- Provides both web interface endpoints and external API

### API Flow

1. User connects Web3 wallet and purchases credits via Stripe
2. Credits are stored in Redis, associated with wallet address
3. Frontend uploads image → Backend uploads to ImgBB → ComfyUI processes
4. ComfyUI sends webhook with results → Backend stores in Redis
5. Frontend polls for completion and displays result

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
