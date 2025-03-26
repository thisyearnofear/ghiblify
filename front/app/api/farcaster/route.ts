import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    frame: {
      version: "1",
      name: "Ghiblify",
      homeUrl: "https://ghiblify-it.vercel.app",
      iconUrl: "/ghibli-it.png",
      imageUrl: "/ghibli-time.png",
      buttonTitle: "Transform Photo",
      splashImageUrl: "/ghibli-it.png",
      splashBackgroundColor: "#ffffff",
    },
  });
}
