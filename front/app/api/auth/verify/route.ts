import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

// Simple in-memory nonce store (swap for Redis or DB in production)
const usedNonces = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    const { address, message, signature } = await request.json();

    if (!address || !message || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 1. Check nonce hasn't been reused (extract from message)
    const nonceMatch = message.match(/Nonce: ([a-f0-9]{32})/);
    if (!nonceMatch) {
      return NextResponse.json(
        { error: 'Invalid message format - no nonce found' },
        { status: 400 }
      );
    }
    
    const nonce = nonceMatch[1];
    if (usedNonces.has(nonce)) {
      return NextResponse.json(
        { error: 'Invalid or reused nonce' },
        { status: 400 }
      );
    }

    // 2. Verify signature using viem (handles ERC-6492 automatically)
    const client = createPublicClient({ 
      chain: base, 
      transport: http() 
    });

    const isValid = await client.verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // 3. Mark nonce as used
    usedNonces.add(nonce);

    console.log(`✅ Authentication successful for ${address}`);

    // 4. Create session / JWT here (simplified for now)
    return NextResponse.json({ 
      ok: true,
      address: address.toLowerCase(),
      authenticated: true
    });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}