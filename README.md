# Ghiblify ✨

Transform your photos into enchanting Studio Ghibli style artwork using AI. A beautiful web application with multiple payment options, batch processing, and dark/light mode support.

## ✨ Features

- 🎨 **AI-Powered Transformations** - Studio Ghibli style art generation
- 💎 **Multiple Payment Options** - Stripe, $GHIBLIFY tokens (50% off), Celo cUSD, Base Pay
- 📱 **Responsive Design** - Works perfectly on desktop and mobile
- 🌙 **Dark/Light Mode** - Elegant themes with glass morphism styling
- 📚 **Batch Processing** - Transform up to 6 images at once
- 🎯 **Divvi Integration** - Earn referral rewards on blockchain transactions
- 🔐 **Web3 Integration** - MetaMask, WalletConnect, Base Account support
- 🌐 **Memory API Integration** - Cross-platform identity mapping for Builder Rewards

## 🚀 Quick Start

### Live Demo

- **Frontend**: [ghiblify-it.vercel.app](https://ghiblify-it.vercel.app)
- **Backend**: [api.thisyearnofear.com](https://api.thisyearnofear.com)

### Local Development

1. **Prerequisites**: Node.js 18+, Python 3.11+, Redis
2. **Clone & Setup**: See [docs/SETUP.md](docs/SETUP.md) for detailed instructions
3. **Start Services**: Backend on port 8000, Frontend on port 3000

## 🏗️ Tech Stack

- **Frontend**: Next.js 14, React, Chakra UI, TypeScript
- **Backend**: FastAPI (Python), Redis, ComfyUI/Replicate AI
- **Web3**: RainbowKit, Wagmi, Viem, MetaMask, WalletConnect
- **Payments**: Stripe, $GHIBLIFY tokens, Celo cUSD, Base Pay
- **Infrastructure**: Vercel, Hetzner VPS, Upstash Redis
- **Identity**: Memory API for cross-platform identity mapping

## 📚 Documentation

- **Setup Guide**: [docs/SETUP.md](docs/SETUP.md) - Complete local development setup
- **User Guide**: [docs/USER_GUIDE.md](docs/USER_GUIDE.md) - How to use Ghiblify
- **Technical Docs**: [docs/TECHNICAL.md](docs/TECHNICAL.md) - Architecture and implementation details
- **Roadmap**: [docs/ROADMAP_CONSOLIDATED.md](docs/ROADMAP_CONSOLIDATED.md) - Future plans and features
- **Memory API**: [docs/MEMORY_API.md](docs/MEMORY_API.md) - Integration details for Builder Rewards
- **Builder Rewards**: [docs/BUILDER_REWARDS_SUMMARY.md](docs/BUILDER_REWARDS_SUMMARY.md) - Implementation summary for the Builder Rewards initiative

## 📖 API Usage

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

## 🧪 Testing

```bash
# Health check
curl http://localhost:8000/api/health

# Test Redis connection
redis-cli ping
```

## 📦 Deployment

- **Frontend**: Vercel (automatic deployments from main branch)
- **Backend**: Hetzner VPS (GitHub Actions)
- **Redis**: Upstash (managed Redis with SSL)

## 🤝 Built By

- [Vishal Shenoy](https://vishalshenoy.com)
- [Papa](https://warpcast.com/papa)
