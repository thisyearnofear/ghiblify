"use client";

import React, { useEffect } from "react";
import FrameSDK from "@farcaster/frame-sdk";
import farcasterFrame from "@farcaster/frame-wagmi-connector";

export function FarcasterFrameProvider({ children }: { children: any }) {
  useEffect(() => {
    const init = async () => {
      const context = await FrameSDK.context;

      // Hide splash screen after UI renders
      setTimeout(() => {
        FrameSDK.actions.ready();
      }, 500);
    };
    init();
  }, []);

  return <>{children}</>;
}
