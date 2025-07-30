import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, message, signature } = body;
    
    if (!address || !message || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    // Use the existing backend Redis-backed verification endpoint
    const response = await fetch(`${backendUrl}/api/web3/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address, message, signature }),
      // Add timeout to handle Render backend sleep
      signal: AbortSignal.timeout(15000) // 15 second timeout for sleeping backend
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`Backend verification failed: ${response.status} ${errorText}`);
      
      // Return more specific error information
      if (response.status === 504) {
        return NextResponse.json(
          { error: 'Backend service temporarily unavailable. Please try again in a moment.' },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: `Authentication failed: ${errorText}` },
        { status: response.status }
      );
    }
    
    const result = await response.json();
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Verification error:', error);
    
    // Handle timeout specifically
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return NextResponse.json(
        { error: 'Backend service is starting up. Please wait a moment and try again.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      {
        error: 'Authentication service temporarily unavailable',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}