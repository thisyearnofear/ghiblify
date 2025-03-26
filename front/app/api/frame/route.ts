import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { image, promptStrength } = data;

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Call your backend API to transform the image
    const response = await fetch(`${process.env.BACKEND_URL}/api/transform`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image,
        promptStrength: promptStrength || 5.5,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to transform image");
    }

    // Return the transformed image URL
    return NextResponse.json({ imageUrl: result.imageUrl });
  } catch (error) {
    console.error("Frame error:", error);
    return NextResponse.json(
      { error: "Failed to transform image" },
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
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="https://ghiblify-it.vercel.app/ghibli-time.png" />
        <meta property="fc:frame:button:1" content="Transform Photo" />
        <meta property="fc:frame:button:1:action" content="post" />
        <meta property="fc:frame:button:1:target" content="https://ghiblify-it.vercel.app/api/frame" />
        <meta property="fc:frame:post_url" content="https://ghiblify-it.vercel.app/api/frame" />
        <meta property="og:image" content="https://ghiblify-it.vercel.app/ghibli-time.png" />
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
