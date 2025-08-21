# Farcaster Mini App Wallet Strategy

## Overview

In the Farcaster mini app context, we implement a restrictive wallet connection strategy to prevent the connection issues and errors that occur when users attempt to switch between RainbowKit and Base Account connections.

## Key Issues Addressed

1. **Server errors (500)** when Base Account tries to connect with `provider=unified`
2. **Connector state confusion** causing "Connector not connected" errors during token payments
3. **Automatic switching** between wallet providers causing instability
4. **Sandboxed environment restrictions** in Farcaster frames

## Implementation Strategy

### 1. Restrict Wallet Disconnection

- **In Farcaster frames**: Wallet disconnect functionality is disabled
- **In web app**: Normal disconnect functionality remains available
- **Rationale**: Prevents users from manually triggering problematic connection switches

### 2. Prioritize RainbowKit Connection

- **Primary**: RainbowKit (most stable in Farcaster environment)
- **Fallback**: Base Account (only if RainbowKit unavailable)
- **Rationale**: RainbowKit auto-connects reliably and works well with the existing infrastructure

### 3. Prevent Automatic Switching

- **In Farcaster frames**: Once connected, avoid switching providers
- **In web app**: Allow normal switching behavior
- **Rationale**: Switching between providers in frames causes connector state confusion

### 4. Stable Connection Flow

```
Farcaster Frame Detected
    ↓
RainbowKit Available?
    ↓ Yes
Connect RainbowKit → Stay Connected
    ↓ No
Base Account Available?
    ↓ Yes
Connect Base Account → Stay Connected
    ↓ No
Show Connect Button
```

## Code Changes

### CompactWalletButton.tsx
- Disabled disconnect functionality in Farcaster frames
- Removed network switcher in frames
- Changed cursor to indicate non-interactive state

### useUnifiedWallet.ts
- Prioritized RainbowKit over Base Account in frames
- Prevented automatic switching once connected
- Added frame-specific connection logic

### farcaster-wallet-service.ts
- Changed default preferred ecosystem to 'celo' (RainbowKit)
- Added `shouldAllowDisconnection()` method
- Maintained `preventSwitching: true` configuration

## Benefits

1. **Stability**: Eliminates connection switching issues
2. **Reliability**: RainbowKit auto-connects consistently
3. **User Experience**: Prevents confusing error states
4. **Compatibility**: Works with existing $GHIBLIFY token payments

## Recommendations

1. **Keep RainbowKit as primary**: It auto-connects reliably in Farcaster
2. **Monitor Base Account issues**: The 500 errors suggest backend problems
3. **Consider Base Account fixes**: If Base Pay is important, fix the server-side issues
4. **Test thoroughly**: Verify token payments work consistently with RainbowKit

## Future Considerations

- If Base Account server issues are resolved, could re-enable as primary
- Could add user preference for wallet type (stored persistently)
- Could implement better error handling for failed connections
