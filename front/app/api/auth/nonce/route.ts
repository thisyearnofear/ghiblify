import { NextResponse } from 'next/server';

export async function GET() {
  // Generate a secure client-side nonce - no backend dependency
  const nonce = crypto.randomUUID().replace(/-/g, '');

  console.log('Generated client-side nonce for SIWE authentication');
  return new NextResponse(nonce, {
    headers: { 'Content-Type': 'text/plain' }
  });
}