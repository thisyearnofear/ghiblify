# Technical Documentation

This document provides technical details about the Ghiblify architecture, including the Memory API integration and NFT features.

## Project Overview

Ghiblify transforms photos into Studio Ghibli-style AI art with multiple payment options and Web3 integration.

### Core Features

- 🎨 AI-powered Ghibli-style image transformation
- 💳 Multiple payments: Stripe, $GHIBLIFY tokens (50% off), Celo cUSD, Base Pay
- 📦 Batch processing: up to 6 images at once
- 🌙 Dark/light mode with glass morphism UI
- 🔐 Web3 auth: MetaMask, WalletConnect, Base Account
- 🎯 Divvi referral rewards on blockchain
- 🌐 Memory API integration for cross-platform identity

### Directory Structure

- `back/`: FastAPI backend, AI models (ComfyUI/Replicate), payment handlers
- `front/`: Next.js frontend with React, Chakra UI, Web3 hooks
- `contracts/`: Solidity smart contract (`GhiblifyTokenPayments.sol`)
- `scripts/`: Deployment and utility scripts
- `data/`: Static data files (e.g., pricing)

## Development Setup

### Prerequisites

- Node.js (v18+)
- Python 3.11+
- Redis server
- API Keys: ComfyUI, ImgBB, Stripe, Replicate (optional)

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

# Create .env.local file (see Environment Variables section)
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

#### Backend (.env)

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

# Memory API Configuration (Optional - for identity features)
MEMORY_API_KEY=your_memory_api_key
```

#### Frontend (.env.local)

```env
# Frontend Environment Variables for Local Development
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_CELO_RPC_URL=https://forno.celo.org
NEXT_PUBLIC_MEMORY_API_KEY=your_memory_api_key
```

### Getting API Keys

1. **ComfyUI**: [ComfyUI Online](https://comfyonline.app)
2. **ImgBB**: [ImgBB API](https://api.imgbb.com)
3. **Stripe**: [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
4. **WalletConnect**: [WalletConnect Cloud](https://cloud.walletconnect.com)

### Launching the Application

1. **Start Backend**: `cd back && python main.py`
2. **Start Frontend**: `cd front && npm run dev`
3. **Access**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Troubleshooting

- **Backend fails to start**: Check Redis is running with `redis-cli ping`
- **Frontend can't connect**: Ensure backend is running on port 8000
- **Environment issues**: Verify .env files are correctly configured

## Architecture

### Frontend (Next.js 14, React, TypeScript)

The frontend is built with Next.js 14 and uses React with TypeScript for type safety. Key components include:

1. **Wallet Integration**

   - RainbowKit for external wallet connections
   - Base Account for embedded wallet experience
   - Farcaster mini-app integration

2. **State Management**

   - Custom services with React hooks
   - Unified wallet service for cross-platform identity
   - Memory API service for identity graph retrieval

3. **UI Components**
   - Chakra UI for consistent design system
   - Responsive design for mobile and desktop
   - Glass morphism styling

### Backend (FastAPI, Python)

The backend is built with FastAPI and uses Python 3.11+. Key components include:

1. **API Handlers**

   - `stripe_handler.py` for Stripe payments
   - `replicate_handler.py` and `comfyui_handler.py` for AI processing
   - `celo_handler.py` and `base_pay_handler.py` for blockchain payments
   - `web3_auth.py` for wallet authentication
   - `memory_api.py` for Memory API integration

2. **Services**

   - Redis service for caching and session management
   - Credit management system
   - NFT orchestration service

3. **Database**
   - Redis for caching and session storage
   - File-based storage for static data

## Memory API Integration

### Frontend Components

1. **Memory API Service** (`front/app/lib/services/memory-api-service.ts`)

   - Client-side service for interacting with Memory API endpoints
   - Identity graph retrieval by wallet address or Farcaster username
   - Social graph analysis capabilities
   - Unified profile creation combining multiple identity sources

2. **Enhanced Wallet Service** (`front/app/lib/services/unified-wallet-service.ts`)

   - Extended wallet functionality with Memory API integration
   - Automatic enrichment of user profiles with cross-platform identity data
   - Storage of identity and social graph information
   - Single source of truth for unified user data

3. **React Hook** (`front/app/lib/hooks/useMemoryApi.ts`)

   - Custom React hook for easy Memory API integration
   - Identity graph retrieval
   - Social graph analysis
   - Wallet-to-Farcaster mapping
   - Unified profile creation

4. **Demo Component** (`front/app/components/MemoryApiExample.jsx`)
   - Demonstration of Memory API capabilities
   - Visual representation of unified identity profiles
   - Real-time identity data fetching
   - Error handling and loading states

### Backend Components

1. **API Endpoints** (`back/app/api/memory_api.py`)
   - Server-side endpoints for Memory API integration
   - `GET /api/memory/status` - Check Memory API integration status
   - `POST /api/memory/identity-graph` - Get identity graph for identifiers
   - `POST /api/memory/social-graph` - Get social graph for identifiers
   - `POST /api/memory/unified-profile` - Create unified profiles
   - `GET /api/memory/wallet-address/{farcaster_username}` - Map Farcaster to wallet

### Integration Points

1. **Environment Configuration**

   ```bash
   # Frontend
   NEXT_PUBLIC_MEMORY_API_KEY=your_memory_api_key_here

   # Backend
   MEMORY_API_KEY=your_memory_api_key_here
   ```

2. **Data Flow**
   1. User connects wallet or authenticates via Farcaster
   2. System automatically fetches cross-platform identity data
   3. Unified profile is created combining all available identity sources
   4. Social graph information is retrieved and stored for analysis
   5. Enriched data enhances the user experience

## NFT Integration

### Smart Contracts

1. **Base Chain**

   - Zora Coins Integration
   - Existing payment flows

2. **Celo Chain**
   - `GhiblifyNFT.sol` - Custom NFT contract
   - Extended cUSD flows

### Backend Services

1. **NFT Orchestrator** (`back/app/services/nft_orchestrator.py`)

   - Central service for managing NFT operations across chains
   - Chain routing infrastructure
   - Integration with existing credit system

2. **Metadata Builder** (`back/app/services/metadata_builder.py`)
   - NFT metadata generation
   - Image optimization for different use cases

### Frontend Components

1. **NFT Creation Flow**

   - Chain selection interface
   - Cost calculation and display
   - Social impact options (Celo only)

2. **NFT Gallery**
   - Cross-chain NFT viewing
   - Portfolio analytics
   - Social sharing features

## Web3 Integration

### Wallet Providers

1. **RainbowKit** (External Wallets)

   - MetaMask
   - WalletConnect
   - Other external wallets

2. **Base Account** (Embedded Wallet)

   - Native Base wallet experience
   - Simplified onboarding

3. **Farcaster** (Mini-App)
   - Frame-based integration
   - Social sharing capabilities

### Farcaster Wallet Strategy

In the Farcaster mini app context, we implement a restrictive wallet connection strategy to prevent the connection issues and errors that occur when users attempt to switch between RainbowKit and Base Account connections.

#### Key Issues Addressed

1. **Server errors (500)** when Base Account tries to connect with `provider=unified`
2. **Connector state confusion** causing "Connector not connected" errors during token payments
3. **Automatic switching** between wallet providers causing instability
4. **Sandboxed environment restrictions** in Farcaster frames

#### Implementation Strategy

1. **Restrict Wallet Disconnection**

   - In Farcaster frames: Wallet disconnect functionality is disabled
   - In web app: Normal disconnect functionality remains available
   - Rationale: Prevents users from manually triggering problematic connection switches

2. **Prioritize RainbowKit Connection**

   - Primary: RainbowKit (most stable in Farcaster environment)
   - Fallback: Base Account (only if RainbowKit unavailable)
   - Rationale: RainbowKit auto-connects reliably and works well with the existing infrastructure

3. **Prevent Automatic Switching**
   - In Farcaster frames: Once connected, avoid switching providers
   - In web app: Allow normal switching behavior
   - Rationale: Switching between providers in frames causes connector state confusion

#### Benefits

- **Stability**: Eliminates connection switching issues
- **Reliability**: RainbowKit auto-connects consistently
- **User Experience**: Prevents confusing error states
- **Compatibility**: Works with existing $GHIBLIFY token payments

### Authentication

1. **Web3 Auth** (`back/app/api/web3_auth.py`)

   - SIWE (Sign-In with Ethereum) implementation
   - Nonce generation and validation
   - Signature verification

2. **Unified Wallet API** (`back/app/api/unified_wallet.py`)
   - Single API interface for all wallet operations
   - Address normalization
   - Credit management
   - Cross-platform compatibility

## Payment Systems

### Stripe Integration

1. **Stripe Handler** (`back/app/api/stripe_handler.py`)

   - Payment processing
   - Webhook handling
   - Subscription management

2. **Stripe Config** (`back/app/api/stripe_config.py`)
   - Configuration management
   - Price management

### Token Payments

1. **Ghiblify Token Handler** (`back/app/api/ghiblify_token_handler.py`)
   - $GHIBLIFY token payments
   - 50% discount on transformations
   - Smart contract integration

### Blockchain Payments

1. **Celo Handler** (`back/app/api/celo_handler.py`)

   - cUSD payments
   - Social impact features
   - Mobile optimization

2. **Base Pay Handler** (`back/app/api/base_pay_handler.py`)
   - Base network payments
   - Native token support

## AI Processing

### ComfyUI Integration

1. **ComfyUI Handler** (`back/app/api/comfyui_handler.py`)
   - Image transformation processing
   - Workflow management
   - Result handling

### Replicate Integration

1. **Replicate Handler** (`back/app/api/replicate_handler.py`)
   - Alternative AI processing
   - Fallback system
   - Result handling

## Caching and Performance

### Redis Service

1. **Redis Service** (`back/app/services/redis_service.py`)
   - Modern Redis service with connection pooling
   - Consistent key namespacing
   - Memory fallback for development
   - Credit management
   - Nonce storage and validation

### Performance Optimization

1. **Caching Strategy**

   - API response caching
   - Metadata caching
   - User session caching

2. **Request Optimization**
   - Batch processing
   - Async operations
   - Connection pooling

## Error Handling

### Backend Error Handling

1. **HTTP Exceptions**

   - Proper status codes
   - Detailed error messages
   - Logging and monitoring

2. **Blockchain Error Handling**
   - Retry mechanisms
   - Fallback strategies
   - User-friendly error messages

### Frontend Error Handling

1. **UI Error States**

   - Loading states
   - Error messages
   - Retry options

2. **Service Error Handling**
   - Graceful degradation
   - Fallback to local storage
   - User notifications

## Testing

### Backend Testing

1. **Unit Tests**

   - API endpoint testing
   - Service testing
   - Integration testing

2. **Integration Tests**
   - End-to-end workflow testing
   - Payment flow testing
   - Blockchain integration testing

### Frontend Testing

1. **Component Testing**

   - Unit testing of React components
   - Hook testing
   - Service testing

2. **End-to-End Testing**
   - User flow testing
   - Payment flow testing
   - Wallet integration testing

## Deployment

### Frontend Deployment

1. **Vercel**
   - Automatic deployments from main branch
   - Preview deployments for pull requests
   - Custom domain configuration

### Backend Deployment

1. **Hetzner VPS**
   - GitHub Actions deployment
   - Docker containerization
   - Health monitoring

### Infrastructure

1. **Redis**

   - Upstash managed Redis
   - SSL encryption
   - Backup and recovery

2. **Storage**
   - Cloudflare R2 storage
   - CDN distribution
   - Access control

## Security

### Authentication Security

1. **Wallet Security**

   - Nonce-based authentication
   - Signature verification
   - Session management

2. **API Security**
   - Rate limiting
   - Input validation
   - CORS configuration

### Data Security

1. **Data Protection**

   - Encryption at rest
   - Secure data transmission
   - Access control

2. **Privacy**
   - User data protection
   - Compliance with regulations
   - Transparent data usage

## Monitoring and Logging

### Backend Monitoring

1. **Logging**

   - Structured logging
   - Error tracking
   - Performance monitoring

2. **Health Checks**
   - API health endpoints
   - Database connectivity
   - External service status

### Frontend Monitoring

1. **Error Tracking**

   - Client-side error reporting
   - Performance monitoring
   - User experience tracking

2. **Analytics**
   - User behavior tracking
   - Feature usage analytics
   - Conversion tracking

## Future Enhancements

### Technical Improvements

1. **Performance**

   - Further caching optimizations
   - Database indexing improvements
   - CDN optimization

2. **Scalability**
   - Horizontal scaling
   - Load balancing
   - Microservice architecture

### Feature Enhancements

1. **AI Processing**

   - Additional art styles
   - Batch processing improvements
   - Quality enhancements

2. **Web3 Features**

   - Additional wallet providers
   - Cross-chain NFT support
   - DeFi integration

3. **Identity Features**
   - Advanced social graph analysis
   - AI-powered recommendations
   - Community building tools
