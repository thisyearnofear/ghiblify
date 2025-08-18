// Debug script to check wallet connection state
// Run this in browser console on your ghiblify app

console.log("=== GHIBLIFY WALLET DEBUG ===");

// Check if unified wallet service is available
if (typeof window !== 'undefined' && window.debugWallet) {
  console.log("1. Debug wallet state:", window.debugWallet.getState());
}

// Check unified wallet service directly (if available in console)
if (typeof unifiedWalletService !== 'undefined') {
  const connection = unifiedWalletService.getConnection();
  console.log("2. Unified wallet connection:", connection);
  console.log("   - Is connected:", connection.isConnected);
  console.log("   - Provider:", connection.user?.provider);
  console.log("   - Address:", connection.user?.address);
}

// Check ghiblify token payments availability
if (typeof ghiblifyTokenPayments !== 'undefined') {
  console.log("3. $GHIBLIFY payments available:", ghiblifyTokenPayments.isAvailable());
  console.log("   - Config:", ghiblifyTokenPayments.getConfig());
}

// Check localStorage for auth states
console.log("4. LocalStorage states:");
console.log("   - ghiblify_wallet_state:", JSON.parse(localStorage.getItem('ghiblify_wallet_state') || 'null'));
console.log("   - ghiblify_auth:", JSON.parse(localStorage.getItem('ghiblify_auth') || 'null'));

// Check environment variables
console.log("5. Environment:");
console.log("   - Contract address env:", process.env.NEXT_PUBLIC_GHIBLIFY_TOKEN_PAYMENTS_ADDRESS);

// Check if we're in farcaster frame
console.log("6. Context:");
console.log("   - User agent:", navigator.userAgent);
console.log("   - Is likely Farcaster:", navigator.userAgent.includes('farcasterframe'));

console.log("=== END DEBUG ===");
