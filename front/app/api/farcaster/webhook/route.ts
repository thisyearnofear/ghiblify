import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userAgent = request.headers.get('user-agent');
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] Farcaster webhook received:`, {
      type: body.type,
      userAgent,
      body
    });

    // Handle different types of events
    switch (body.type) {
      case "frame":
        // Handle frame interactions - could be Mini App launches
        console.log("Frame/Mini App interaction:", {
          frameId: body.frameId,
          userId: body.userId,
          action: body.action,
          timestamp
        });
        
        // Track Mini App opens for analytics
        if (body.action === 'open' || body.action === 'launch') {
          // Could send to analytics service
          console.log(`Mini App opened by user ${body.userId}`);
        }
        break;
        
      case "notification":
        // Handle notification events (delivery confirmations, clicks, etc.)
        console.log("Notification event:", {
          notificationId: body.notificationId,
          event: body.event, // delivered, clicked, etc.
          userId: body.userId,
          timestamp
        });
        
        if (body.event === 'clicked') {
          // User clicked a notification - could trigger analytics
          console.log(`User ${body.userId} clicked notification ${body.notificationId}`);
        }
        break;
        
      case "miniapp_event":
        // Handle Mini App specific events
        console.log("Mini App event:", {
          event: body.event,
          userId: body.userId,
          data: body.data,
          timestamp
        });
        break;
        
      default:
        console.log("Unknown webhook event type:", body.type, body);
    }

    // Always return success to prevent retries
    return NextResponse.json({ 
      success: true, 
      timestamp,
      processed: body.type 
    });
    
  } catch (error) {
    console.error("Farcaster webhook error:", error);
    
    // Return success even on error to prevent Farcaster retries
    // Log the error for debugging but don't fail the webhook
    return NextResponse.json(
      { 
        success: true, 
        error: "Logged for debugging",
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  }
}

// Also handle GET for verification if needed
export async function GET() {
  return NextResponse.json({ 
    status: "Ghiblify Mini App webhook active",
    timestamp: new Date().toISOString()
  });
}
