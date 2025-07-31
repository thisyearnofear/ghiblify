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

    try {
      // Try backend verification first (for credits/nonce validation)
      const response = await fetch(`${backendUrl}/api/web3/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address, message, signature }),
        signal: AbortSignal.timeout(10000) // Shorter timeout
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

    } catch (backendError) {
      console.error('Backend verification failed, attempting client-side verification:', backendError);

      // Fallback: Client-side signature verification using ethers
      try {
        const { ethers } = await import('ethers');

        // Verify the signature client-side
        const recoveredAddress = ethers.verifyMessage(message, signature);
        const isValid = recoveredAddress.toLowerCase() === address.toLowerCase();

        if (!isValid) {
          return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 401 }
          );
        }

        // Return success with fallback indication
        return NextResponse.json({
          ok: true,
          address: address.toLowerCase(),
          credits: 0, // Default credits when backend unavailable
          fallback: true // Indicate this was verified client-side
        });

      } catch (fallbackError) {
        console.error('Client-side verification also failed:', fallbackError);

        return NextResponse.json(
          { error: 'Authentication service temporarily unavailable' },
          { status: 503 }
        );
      }
    }

  } catch (error) {
    console.error('Verification error:', error);

    return NextResponse.json(
      {
        error: 'Authentication service temporarily unavailable',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}