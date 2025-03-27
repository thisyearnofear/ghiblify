import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // Handle frame interactions
    if (data.untrustedData?.buttonIndex === 1) {
      // Return a new frame state for the upload button
      return NextResponse.json({
        frames: {
          "fc:frame": "vNext",
          "fc:frame:image": "https://ghiblify-it.vercel.app/ghibli-time.png",
          "fc:frame:button:1": "Upload Photo",
          "fc:frame:button:1:action": "post",
          "fc:frame:button:1:target":
            "https://ghiblify-it.vercel.app/api/frame/upload",
          "fc:frame:post_url": "https://ghiblify-it.vercel.app/api/frame",
          "og:image": "https://ghiblify-it.vercel.app/ghibli-time.png",
          "og:title": "Ghiblify",
          "og:description":
            "Transform your photos into Studio Ghibli style art",
        },
      });
    }

    // Default response
    return NextResponse.json({
      frames: {
        "fc:frame": "vNext",
        "fc:frame:image": "https://ghiblify-it.vercel.app/ghibli-time.png",
        "fc:frame:button:1": "Transform Photo",
        "fc:frame:button:1:action": "post",
        "fc:frame:button:1:target": "https://ghiblify-it.vercel.app/api/frame",
        "fc:frame:post_url": "https://ghiblify-it.vercel.app/api/frame",
        "og:image": "https://ghiblify-it.vercel.app/ghibli-time.png",
        "og:title": "Ghiblify",
        "og:description": "Transform your photos into Studio Ghibli style art",
      },
    });
  } catch (error) {
    console.error("Frame error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return initial frame state
  return NextResponse.json({
    frames: {
      "fc:frame": "vNext",
      "fc:frame:image": "https://ghiblify-it.vercel.app/ghibli-time.png",
      "fc:frame:button:1": "Transform Photo",
      "fc:frame:button:1:action": "post",
      "fc:frame:button:1:target": "https://ghiblify-it.vercel.app/api/frame",
      "fc:frame:post_url": "https://ghiblify-it.vercel.app/api/frame",
      "og:image": "https://ghiblify-it.vercel.app/ghibli-time.png",
      "og:title": "Ghiblify",
      "og:description": "Transform your photos into Studio Ghibli style art",
    },
  });
}
