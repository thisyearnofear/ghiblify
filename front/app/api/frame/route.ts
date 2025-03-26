import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // Here you can handle the frame interaction
    // For now, we'll just return a new frame state
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ghiblify</title>
          <meta property="fc:frame" content="version: 1; image: /ghibli-time.png; button.1.label: Upload Photo; button.1.action: post; button.1.target: https://ghiblify-it.vercel.app/api/frame/upload" />
          <meta property="fc:frame:image" content="/ghibli-time.png" />
          <meta property="fc:frame:button:1" content="Upload Photo" />
          <meta property="fc:frame:button:1:action" content="post" />
          <meta property="fc:frame:button:1:target" content="https://ghiblify-it.vercel.app/api/frame/upload" />
          <meta property="fc:frame:post_url" content="https://ghiblify-it.vercel.app/api/frame" />
          <meta property="og:image" content="/ghibli-time.png" />
          <meta property="og:title" content="Ghiblify" />
          <meta property="og:description" content="Transform your photos into Studio Ghibli style art" />
        </head>
      </html>
      `,
      {
        headers: {
          "Content-Type": "text/html",
        },
      }
    );
  } catch (error) {
    console.error("Frame error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return new NextResponse(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Ghiblify</title>
        <meta property="fc:frame" content="version: 1; image: /ghibli-time.png; button.1.label: Transform Photo; button.1.action: post; button.1.target: https://ghiblify-it.vercel.app/api/frame" />
        <meta property="fc:frame:image" content="/ghibli-time.png" />
        <meta property="fc:frame:button:1" content="Transform Photo" />
        <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1:target" content="https://ghiblify-it.vercel.app/api/frame" />
        <meta property="fc:frame:post_url" content="https://ghiblify-it.vercel.app/api/frame" />
        <meta property="og:image" content="/ghibli-time.png" />
        <meta property="og:title" content="Ghiblify" />
        <meta property="og:description" content="Transform your photos into Studio Ghibli style art" />
      </head>
    </html>
    `,
    {
      headers: {
        "Content-Type": "text/html",
      },
    }
  );
}
