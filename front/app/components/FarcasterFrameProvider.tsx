"use client";

import React, { useEffect } from "react";
import FrameSDK from "@farcaster/frame-sdk";
import farcasterFrame from "@farcaster/frame-wagmi-connector";
import { connect } from "@wagmi/core";
import { config } from "./WagmiConfig";

export function FarcasterFrameProvider({ children }: { children: any }) {
  useEffect(() => {
    const init = async () => {
      try {
        const context = await FrameSDK.context;
        console.log("Frame context:", context);

        // Autoconnect if running in a frame
        if (context?.client.clientFid) {
          await connect(config, { connector: farcasterFrame() });
        }

        // Call ready() to hide splash screen
        await FrameSDK.actions.ready();
      } catch (error) {
        console.error("Frame initialization error:", error);
      }
    };

    init();
  }, []);

  return <>{children}</>;
}
