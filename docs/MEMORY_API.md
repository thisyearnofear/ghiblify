# Memory API Integration

This document explains how Ghiblify integrates with the Memory API to provide cross-platform identity mapping and social graph analysis capabilities for the Builder Rewards initiative.

## Overview

The Memory API provides an identity layer for Base-native consumer apps, connecting wallets, Farcaster, Twitter/X, and more into a unified, user-owned social graph. Our integration enables:

1. Cross-platform identity mapping
2. Social graph analysis capabilities
3. Unified user profiles across platforms
4. Enhanced mini-app experiences within the Base ecosystem

## Implementation Details

### 1. Memory API Service

We've created a dedicated service (`front/app/lib/services/memory-api-service.ts`) that handles all interactions with the Memory API:

- Identity graph retrieval by wallet address or Farcaster username
- Social graph analysis capabilities
- Unified profile creation combining multiple identity sources

### 2. Enhanced Wallet Service

The existing `front/app/lib/services/unified-wallet-service.ts` has been extended to:

- Automatically enrich user profiles with Memory API data
- Store identity and social graph information
- Provide a single source of truth for cross-platform user data

### 3. Farcaster Integration

The `front/app/components/FarcasterFrameProvider.tsx` now:

- Automatically maps Farcaster identities to wallet addresses
- Creates unified profiles during authentication
- Provides access to social graph data within mini-app contexts

## Builder Rewards Use Cases

### 1. Follow-Graph Leaderboards

Using the social graph data from Memory API, we can implement leaderboards that rank users by:

- Network size and quality
- Engagement metrics
- Cross-platform influence

### 2. Wallet Personality Profiles

By analyzing on-chain behavior and social activity, we can create profiles that classify users as:

- NFT collectors
- Active traders
- Community builders
- Content creators

### 3. Archetypes & Sentiment Analysis

The unified identity data enables classification of users based on:

- Public activity patterns
- Content sentiment
- Platform usage preferences

### 4. Suggested Follows & Discovery

Cross-platform recommendations powered by social graph overlap can help users:

- Discover relevant content creators
- Find communities of interest
- Connect with like-minded individuals

### 5. Unified Profiles

Display comprehensive identity information in a single view:

- Wallet addresses across platforms
- Farcaster profile and activity
- Twitter/X engagement metrics
- On-chain behavior analysis

## Integration Points

### Environment Configuration

To enable Memory API integration, set the following environment variable:

```
NEXT_PUBLIC_MEMORY_API_KEY=your_memory_api_key_here
```

### API Endpoints Used

1. `GET /identity-graph/farcaster/{username}` - Retrieve identity graph by Farcaster username
2. `GET /identity-graph/address/{address}` - Retrieve identity graph by wallet address
3. `GET /social-graph/{identifier}` - Retrieve social graph data

### Data Enrichment

When users connect their wallets or authenticate via Farcaster:

1. The system automatically fetches their cross-platform identity data
2. A unified profile is created combining all available identity sources
3. Social graph information is retrieved and stored for analysis
4. This enriched data is used to enhance the user experience

## Example Use Cases

### 1. Social Trading Features

Combining Twitter + Farcaster social signals with wallet activity to create enhanced trading experiences:

```javascript
// Example: Get user's social influence score
const socialScore = await memoryApiService.getSocialGraph(walletAddress);
const tradingRecommendations = generateRecommendations(socialScore);
```

### 2. Personalized Mini-App Experiences

Using unified profiles to customize Farcaster mini-app content:

```javascript
// Example: Customize content based on user interests
const profile = await memoryApiService.createUnifiedProfile(
  walletAddress,
  farcasterUsername
);
const personalizedContent = customizeForUser(profile);
```

### 3. Community Building Tools

Leveraging social graph data to help users find and connect with communities:

```javascript
// Example: Find communities based on shared interests
const socialGraph = await memoryApiService.getSocialGraph(identifier);
const suggestedCommunities = findRelevantCommunities(socialGraph);
```

## Future Enhancements

### 1. Advanced Analytics Dashboard

Create a comprehensive dashboard showing:

- Cross-platform activity metrics
- Social influence trends
- Community engagement levels
- Content performance analytics

### 2. AI-Powered Recommendations

Use machine learning to provide:

- Personalized content suggestions
- Community recommendations
- Trading insights based on social signals

### 3. Token-Gated Experiences

Implement exclusive features based on:

- Social graph position
- Cross-platform engagement
- Community contributions

## Getting Started

1. Obtain a Memory API key from [memoryproto.co](https://memoryproto.co)
2. Set the `NEXT_PUBLIC_MEMORY_API_KEY` environment variable
3. The integration will automatically enhance user profiles with cross-platform identity data
4. Use the provided hooks and services to access enriched user data

## Conclusion

The Memory API integration positions Ghiblify as a strong candidate for the Builder Rewards initiative by providing:

- Robust cross-platform identity mapping
- Rich social graph analysis capabilities
- Enhanced user experiences through unified profiles
- Foundation for innovative mini-app features within the Base ecosystem

This integration demonstrates our commitment to building user-centric, socially-aware applications that leverage the full potential of decentralized identity and social graphs.
