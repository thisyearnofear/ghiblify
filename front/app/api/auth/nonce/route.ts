import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/auth/nonce`);
    
    if (!response.ok) {
      throw new Error('Failed to get nonce from backend');
    }
    
    const nonce = await response.text();
    return new NextResponse(nonce, {
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (error) {
    console.error('Nonce generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate nonce' },
      { status: 500 }
    );
  }
}