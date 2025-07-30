import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    // During build time, don't try to fetch from backend
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL_URL) {
      // Generate a temporary nonce for build time
      const tempNonce = Math.random().toString(36).substring(2, 15);
      return new NextResponse(tempNonce, {
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    const response = await fetch(`${backendUrl}/api/auth/nonce`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout for build process
      signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined
    });
    
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }
    
    const nonce = await response.text();
    return new NextResponse(nonce, {
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (error) {
    console.error('Nonce generation error:', error);
    
    // Fallback: generate client-side nonce
    const fallbackNonce = Math.random().toString(36).substring(2, 15) + 
                         Date.now().toString(36);
    
    return new NextResponse(fallbackNonce, {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}