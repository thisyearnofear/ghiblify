import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    // Use the existing backend Redis-backed nonce endpoint
    const response = await fetch(`${backendUrl}/api/web3/auth/nonce`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Shorter timeout for better UX
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }
    
    const nonce = await response.text();
    return new NextResponse(nonce, {
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (error) {
    console.error('Backend nonce generation error:', error);
    
    // Fallback: generate client-side nonce (as recommended in Base docs)
    const fallbackNonce = crypto.randomUUID().replace(/-/g, '');
    
    console.log('Using client-side fallback nonce due to backend unavailability');
    return new NextResponse(fallbackNonce, {
      headers: {
        'Content-Type': 'text/plain',
        'X-Fallback': 'true' // Indicate this is a fallback nonce
      }
    });
  }
}