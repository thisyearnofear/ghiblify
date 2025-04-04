import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    frame: {
      version: "1",
      name: "Ghiblify",
      homeUrl: "https://ghiblify-it.vercel.app",
      iconUrl: "https://ghiblify-it.vercel.app/ghibli-it.png",
      imageUrl: "https://ghiblify-it.vercel.app/ghibli-time.png",
      buttonTitle: "Transform Photo",
      splashImageUrl: "https://ghiblify-it.vercel.app/ghibli-it.png",
      splashBackgroundColor: "#ffffff",
    },
  });
}
