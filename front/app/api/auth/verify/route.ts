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

    // Pure client-side signature verification using ethers
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

      // Basic SIWE message validation
      const lines = message.split('\n');
      const addressLine = lines.find(line => line.startsWith('0x'));
      const domainLine = lines[0];

      // Verify the address in the message matches the claimed address
      if (addressLine && addressLine.toLowerCase() !== address.toLowerCase()) {
        return NextResponse.json(
          { error: 'Address mismatch in message' },
          { status: 400 }
        );
      }

      // Verify the domain matches
      if (!domainLine.includes(request.nextUrl.hostname)) {
        return NextResponse.json(
          { error: 'Domain mismatch in message' },
          { status: 400 }
        );
      }

      console.log(`✅ Authentication successful for ${address} (client-side verification)`);

      // Return success - no backend dependency
      return NextResponse.json({
        ok: true,
        address: address.toLowerCase(),
        credits: 0, // Will be fetched separately when needed
        authenticated: true
      });

    } catch (verificationError) {
      console.error('Client-side verification failed:', verificationError);

      return NextResponse.json(
        { error: 'Signature verification failed' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Verification error:', error);

    return NextResponse.json(
      {
        error: 'Authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}