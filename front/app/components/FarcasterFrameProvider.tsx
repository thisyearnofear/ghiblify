"use client";

import React, { useEffect, useState, createContext, useContext } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { connect } from "@wagmi/core";
import { config } from "../providers/Web3Provider";
import {
  FARCASTER_CONFIG,
  isFarcasterEnvironment,
  createNotificationId,
} from "../config/farcaster";
import { walletService } from "../lib/services/unified-wallet-service";

interface FarcasterContextType {
  isInFrame: boolean;
  context: any;
  user: any;
  isLoading: boolean;
  isReady: boolean;
  sendNotification?: (type?: string) => Promise<void>;
  // Enhanced with Memory API integration
  unifiedProfile?: any;
  refreshUnifiedProfile?: () => Promise<void>;
}

const FarcasterContext = createContext<FarcasterContextType>({
  isInFrame: false,
  context: null,
  user: null,
  isLoading: true,
  isReady: false,
  sendNotification: async () => {},
});

export const useFarcaster = () => useContext(FarcasterContext);

export function FarcasterFrameProvider({ children }: { children: any }) {
  const [isInFrame, setIsInFrame] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [unifiedProfile, setUnifiedProfile] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const frameContext = await sdk.context;
        setContext(frameContext);

        // Check if we're running in a Mini App environment using config
        const inFrame = !!(
          frameContext?.client?.clientFid || isFarcasterEnvironment()
        );

        setIsInFrame(inFrame);

        if (frameContext?.user) {
          setUser(frameContext.user);
        }

        // Autoconnect if running in a frame using the injected connector
        if (frameContext?.client?.clientFid) {
          try {
            // Use the injected connector which will detect the Farcaster provider
            const injectedConnector = config.connectors.find(
              (connector) => connector.id === "injected"
            );

            if (injectedConnector) {
              await connect(config, { connector: injectedConnector });
            } else {
              console.warn("Injected connector not found in config");
            }

            // Enhance wallet connection with Farcaster identity data
            if (frameContext.user?.address) {
              const farcasterUsername = frameContext.user.username || undefined;
              await walletService.connect(
                frameContext.user.address,
                "rainbowkit",
                farcasterUsername
              );
            }
          } catch (error) {
            console.error("Failed to connect Farcaster wallet:", error);
          }
        }

        setIsLoading(false);

        // Notify frame we're ready - using config timeout
        const readyDelay = inFrame ? FARCASTER_CONFIG.sdk.readyTimeout : 100;
        setTimeout(() => {
          // Enhanced mobile debugging
          if (FARCASTER_CONFIG.sdk.enableMobileConsole && inFrame) {
            console.log("[Farcaster] Frame ready in mobile environment");
            console.log("[Farcaster] Context:", frameContext);
            console.log("[Farcaster] User agent:", navigator.userAgent);
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
        // Not in frame environment, continue normally
      }
    };

    init();
  }, [isInFrame, context?.user?.address]);

  // Send notifications when transformations complete
  const sendNotification = async (type: string = "transformComplete") => {
    if (!isInFrame) return;

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
      const farcasterUsername = user.username || undefined;
      const profile = await walletService.connect(
        user.address,
        "rainbowkit",
        farcasterUsername
      );
      setUnifiedProfile(profile.identity);
    } catch (error) {
      console.error("Failed to refresh unified profile:", error);
    }
  };

  const contextValue: FarcasterContextType = {
    isInFrame,
    context,
    user,
    isLoading,
    isReady,
    sendNotification,
    unifiedProfile,
    refreshUnifiedProfile,
  };

  return (
    <FarcasterContext.Provider value={contextValue}>
      {children}
    </FarcasterContext.Provider>
  );
}
