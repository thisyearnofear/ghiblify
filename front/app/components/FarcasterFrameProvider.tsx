"use client";

import React, { useEffect, useState, createContext, useContext } from "react";
import FrameSDK from "@farcaster/frame-sdk";
import farcasterFrame from "@farcaster/frame-wagmi-connector";
import { connect } from "@wagmi/core";
import { config } from "./WagmiConfig";
import { FARCASTER_CONFIG, isFarcasterEnvironment, createNotificationId } from "../config/farcaster";

interface FarcasterContextType {
  isInFrame: boolean;
  context: any;
  user: any;
  isLoading: boolean;
  isReady: boolean;
  sendNotification?: (type?: string) => Promise<void>;
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

  useEffect(() => {
    const init = async () => {
      try {
        const frameContext = await FrameSDK.context;
        setContext(frameContext);
        
        // Check if we're running in a Mini App environment using config
        const inFrame = !!(frameContext?.client?.clientFid || isFarcasterEnvironment());
        
        setIsInFrame(inFrame);
        
        if (frameContext?.user) {
          setUser(frameContext.user);
        }

        // Autoconnect if running in a frame
        if (frameContext?.client?.clientFid) {
          try {
            await connect(config, { connector: farcasterFrame() });
          } catch (error) {
            console.error('Failed to connect Farcaster wallet:', error);
          }
        }

        setIsLoading(false);
        
        // Notify frame we're ready - using config timeout
        const readyDelay = inFrame ? FARCASTER_CONFIG.sdk.readyTimeout : 100;
        setTimeout(() => {
          FrameSDK.actions.ready();
          setIsReady(true);
        }, readyDelay);

      } catch (error) {
        console.error('Failed to initialize Farcaster Frame SDK:', error);
        setIsLoading(false);
        // Not in frame environment, continue normally
      }
    };

    init();
  }, []);

  // Send notifications when transformations complete
  const sendNotification = async (type: string = 'transformComplete') => {
    if (!isInFrame) return;
    
    try {
      const notificationConfig = FARCASTER_CONFIG.notifications[type];
      if (!notificationConfig) return;
      
      // Check if notify method is available (may not be in all SDK versions)
      if ('notify' in FrameSDK.actions) {
        await (FrameSDK.actions as any).notify({
          notificationId: createNotificationId(),
          title: notificationConfig.title,
          body: notificationConfig.body,
          targetUrl: FARCASTER_CONFIG.manifest.homeUrl
        });
      } else {
        console.log('Notification would be sent:', {
          type,
          title: notificationConfig.title,
          body: notificationConfig.body
        });
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  const contextValue: FarcasterContextType = {
    isInFrame,
    context,
    user,
    isLoading,
    isReady,
    sendNotification,
  };

  return (
    <FarcasterContext.Provider value={contextValue}>
      {children}
    </FarcasterContext.Provider>
  );
}
