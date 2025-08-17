import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    frame: {
      version: "1",
      name: "Ghiblify",
      homeUrl: "https://ghiblify-it.vercel.app",
      iconUrl: "https://ghiblify-it.vercel.app/ghibli-it-icon.png",
      imageUrl: "https://ghiblify-it.vercel.app/ghibli-time-og.png",
      buttonTitle: "Ghiblify",
      splashImageUrl: "https://ghiblify-it.vercel.app/ghibli-it-splash.png",
      splashBackgroundColor: "#4FD1C5",
      description: "Transform your photos into Studio Ghibli style art using AI",
      author: "ghiblify.app",
      category: "art",
      screenshots: [
        "https://ghiblify-it.vercel.app/examples/grow.png",
        "https://ghiblify-it.vercel.app/examples/grow2.png",
        "https://ghiblify-it.vercel.app/examples/bridge0.png",
        "https://ghiblify-it.vercel.app/examples/bridge.png"
      ],
      keywords: ["art", "ai", "ghibli", "photo", "transform", "anime"],
      webhookUrl: "https://ghiblify-it.vercel.app/api/farcaster/webhook"
    },
    accountAssociation: {
      header: "eyJmaWQiOjUyNTQsInR5cGUiOiJhdXRoIiwia2V5IjoiMHhkODY1Q2Q3Y2NjOTFGODM2OTJhQjMzMDk4MWMzRTNlOWQ3QTA1MjZBIn0",
      payload: "eyJkb21haW4iOiJnaGlibGlmeS1pdC52ZXJjZWwuYXBwIn0",
      signature: "J7gCdUFjCMXrYRofpNYFwFmWurcdHfLkK9pUzvQmhZFmEg773bTtsvoBt5gOudCRCQ7X6uoN9FumwlQ2WXBnFBw="
    }
  });
}
