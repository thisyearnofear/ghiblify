import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Handle different types of events
    switch (body.type) {
      case "frame":
        // Handle frame interactions
        console.log("Frame interaction:", body);
        break;
      case "notification":
        // Handle notifications
        console.log("Notification:", body);
        break;
      default:
        console.log("Unknown event type:", body.type);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
