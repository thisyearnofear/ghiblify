/**
 * Farcaster Mini App configuration constants
 */

export const FARCASTER_CONFIG = {
  // Mini App manifest configuration
  manifest: {
    version: "1",
    name: "Ghiblify",
    homeUrl: "https://ghiblify-it.vercel.app",
    iconUrl: "https://ghiblify-it.vercel.app/ghibli-it.png",
    imageUrl: "https://ghiblify-it.vercel.app/ghibli-time.png",
    buttonTitle: "Transform Photo",
    splashImageUrl: "https://ghiblify-it.vercel.app/ghibli-it.png",
    splashBackgroundColor: "#4FD1C5",
    webhookUrl: "https://ghiblify-it.vercel.app/api/farcaster/webhook",
  },

  // Meta tags for feed embedding (correct format)
  embedConfig: {
    version: "1",
    imageUrl: "https://ghiblify-it.vercel.app/ghibli-time-og.png",
    button: {
      title: "Transform Photo",
      action: {
        type: "launch_frame",
        name: "Ghiblify",
        url: "https://ghiblify-it.vercel.app",
        splashImageUrl: "https://ghiblify-it.vercel.app/ghibli-it-splash.png",
        splashBackgroundColor: "#4FD1C5",
      },
    },
  },

  // SDK configuration
  sdk: {
    readyTimeout: 300, // ms - shorter for better mobile UX
    maxRetries: 3,
    notificationRateLimit: {
      perMinute: 2,
      perDay: 100,
    },
  },

  // Notification templates
  notifications: {
    transformComplete: {
      title: "✨ Your Ghibli transformation is ready!",
      body: "Tap to see your magical artwork",
      ttl: 3600000, // 1 hour
    },
    transformStarted: {
      title: "🎨 Creating your Ghibli masterpiece...",
      body: "We'll notify you when it's ready",
      ttl: 1800000, // 30 minutes
    },
    error: {
      title: "❌ Transformation failed",
      body: "Please try again with a different image",
      ttl: 900000, // 15 minutes
    },
  },

  // Environment detection
  userAgentPatterns: {
    farcaster: /Farcaster/i,
    mobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i,
  },

  // Analytics events
  events: {
    APP_LAUNCHED: "miniapp_launched",
    IMAGE_UPLOADED: "image_uploaded",
    TRANSFORM_STARTED: "transform_started",
    TRANSFORM_COMPLETED: "transform_completed",
    SHARED: "image_shared",
    ERROR: "error_occurred",
  },
};

// Helper functions
export function isFarcasterEnvironment() {
  if (typeof window === "undefined" || typeof navigator === "undefined")
    return false;

  try {
    return !!(
      window?.parent !== window ||
      FARCASTER_CONFIG.userAgentPatterns.farcaster.test(navigator.userAgent) ||
      window?.location?.ancestorOrigins?.length > 0
    );
  } catch (error) {
    // Fallback for SSR or restricted environments
    return false;
  }
}

export function getNotificationConfig(type) {
  return (
    FARCASTER_CONFIG.notifications[type] || FARCASTER_CONFIG.notifications.error
  );
}

export function createNotificationId(prefix = "ghiblify") {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 11)}`;
}
