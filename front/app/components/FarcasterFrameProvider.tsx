"use client";

import React, { useEffect } from "react";
import FrameSDK from "@farcaster/frame-sdk";
import farcasterFrame from "@farcaster/frame-wagmi-connector";
import { connect } from "@wagmi/core";
import { config } from "./WagmiConfig";

export function FarcasterFrameProvider({ children }: { children: any }) {
  useEffect(() => {
    const init = async () => {
      const context = await FrameSDK.context;

      // Autoconnect if running in a frame
      if (context?.client.clientFid) {
        connect(config, { connector: farcasterFrame() });
      }

      // Hide splash screen after UI renders
      setTimeout(() => {
        FrameSDK.actions.ready();
      }, 500);
    };

    init();
  }, []);

  return <>{children}</>;
}
