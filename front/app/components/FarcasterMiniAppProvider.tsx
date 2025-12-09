"use client";

import React, { useEffect, useState, createContext, useContext } from "react";
// Lazy import to prevent initialization issues
let walletService: any;
import {
  FARCASTER_CONFIG,
  isFarcasterEnvironment,
  createNotificationId,
} from "../config/farcaster";
import { sdk } from "@farcaster/miniapp-sdk";

interface FarcasterContextType {
  isInMiniApp: boolean;
  context: any;
  user: any;
  isLoading: boolean;
  isReady: boolean;
  sendNotification?: (type?: string) => Promise<void>;
  // Enhanced with Memory API integration
  unifiedProfile?: any;
  refreshUnifiedProfile?: () => Promise<void>;
  socialScore?: number;
}

const FarcasterContext = createContext<FarcasterContextType>({
  isInMiniApp: false,
  context: null,
  user: null,
  isLoading: true,
  isReady: false,
  sendNotification: async () => {},
});

export const useFarcaster = () => useContext(FarcasterContext);

export function FarcasterMiniAppProvider({ children }: { children: any }) {
   const [isInMiniApp, setIsInMiniApp] = useState(false);
   const [context, setContext] = useState<any>(null);
   const [user, setUser] = useState<any>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [isReady, setIsReady] = useState(false);
   const [unifiedProfile, setUnifiedProfile] = useState<any>(null);
   const [socialScore, setSocialScore] = useState<number | null>(null);
   const [isMounted, setIsMounted] = useState(false);

   // Mount effect to prevent hydration mismatch
   useEffect(() => {
     setIsMounted(true);
   }, []);

   useEffect(() => {
     if (!isMounted) return;

     const init = async () => {
       try {
         const miniAppContext = await sdk.context;
         setContext(miniAppContext);

         // Check if we're running in a Mini App environment
         const inMiniApp = !!(
           miniAppContext?.client?.clientFid || isFarcasterEnvironment()
         );

         setIsInMiniApp(inMiniApp);

         if (miniAppContext?.user) {
           setUser(miniAppContext.user);
         }

         setIsLoading(false);

         // Notify frame we're ready - using config timeout
         const readyDelay = inMiniApp ? FARCASTER_CONFIG.sdk.readyTimeout : 100;
         setTimeout(() => {
           // Enhanced mobile debugging with SSR guards
           if (FARCASTER_CONFIG.sdk.enableMobileConsole && inMiniApp && typeof window !== "undefined") {
             console.log("[Farcaster] Mini App ready in mobile environment");
             console.log("[Farcaster] Context:", miniAppContext);
             
             if (typeof navigator !== "undefined") {
               console.log("[Farcaster] User agent:", navigator.userAgent);
             }
             
             console.log("[Farcaster] Viewport:", {
               width: window.innerWidth,
               height: window.innerHeight,
               devicePixelRatio: window.devicePixelRatio,
             });
           }

           sdk.actions.ready();
           setIsReady(true);
         }, readyDelay);
       } catch (error) {
         console.error("Failed to initialize Farcaster Frame SDK:", error);
         setIsLoading(false);
         // Not in Mini App environment, continue normally
       }
     };

     init();
   }, [isMounted]);

  // Send notifications when transformations complete
  const sendNotification = async (type: string = "transformComplete") => {
    if (!isInMiniApp) return;

    try {
      const notificationConfig = FARCASTER_CONFIG.notifications[type];
      if (!notificationConfig) return;

      // Check if notify method is available (may not be in all SDK versions)
      if ("notify" in sdk.actions) {
        await (sdk.actions as any).notify({
          notificationId: createNotificationId(),
          title: notificationConfig.title,
          body: notificationConfig.body,
          targetUrl: FARCASTER_CONFIG.manifest.homeUrl,
        });
      } else {
        console.log("Notification would be sent:", {
          type,
          title: notificationConfig.title,
          body: notificationConfig.body,
        });
      }
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  };

  // Refresh unified profile with latest Memory API data
  const refreshUnifiedProfile = async () => {
    if (!user?.address) return;

    try {
      // Lazy load wallet service to prevent initialization issues
      if (!walletService) {
        const { walletService: ws } = await import("../lib/services/unified-wallet-service");
        walletService = ws;
      }
      
      // Force refresh the unified profile to get latest data
      const farcasterUsername = user.username || undefined;
      const profile = await walletService.connect(
        user.address,
        "rainbowkit",
        farcasterUsername
      );
      setUnifiedProfile(profile.identity);

      // Calculate social score if social data is available
      if (profile.socialGraph) {
        const score = calculateSocialScore(profile.socialGraph);
        setSocialScore(score);
      }
    } catch (error) {
      console.error("Failed to refresh unified profile:", error);
    }
  };

  // Simple social influence scoring algorithm
  const calculateSocialScore = (socialData: any): number => {
    let score = 0;

    // Farcaster followers
    if (socialData.farcaster?.social?.followers) {
      score += Math.log10(socialData.farcaster.social.followers) * 10;
    }

    // Twitter followers (if available)
    if (socialData.twitter?.social?.followers) {
      score += Math.log10(socialData.twitter.social.followers) * 5;
    }

    // GitHub followers (if available)
    if (socialData.github?.social?.followers) {
      score += Math.log10(socialData.github.social.followers) * 3;
    }

    return Math.round(score);
  };

  const contextValue: FarcasterContextType = {
    isInMiniApp,
    context,
    user,
    isLoading,
    isReady,
    sendNotification,
    unifiedProfile,
    refreshUnifiedProfile,
    socialScore: socialScore || undefined,
  };

  return (
    <FarcasterContext.Provider value={contextValue}>
      {children}
    </FarcasterContext.Provider>
  );
}