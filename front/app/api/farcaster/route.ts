import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    frame: {
      version: "1",
      name: "Ghiblify",
      homeUrl: "https://ghiblify-it.vercel.app",
      iconUrl:
        "https://ff315ddd5317cb560f09b5e51fe8252f.r2.cloudflarestorage.com/wowowify/favicon.ico",
      imageUrl:
        "https://ff315ddd5317cb560f09b5e51fe8252f.r2.cloudflarestorage.com/wowowify/ghibli-time.png",
      buttonTitle: "Transform Photo",
      splashImageUrl:
        "https://ff315ddd5317cb560f09b5e51fe8252f.r2.cloudflarestorage.com/wowowify/favicon.ico",
      splashBackgroundColor: "#ffffff",
    },
  });
}
