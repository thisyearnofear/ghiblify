"use client";

import React, { useEffect } from "react";
import FrameSDK from "@farcaster/frame-sdk";
import { useConnect } from 'wagmi';
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";

export function FarcasterFrameProvider({ children }: { children: React.ReactNode }) {
  const { connect } = useConnect();

  useEffect(() => {
    const init = async () => {
      const context = await FrameSDK.context;

      // Autoconnect if running in a frame
      if (context?.client.clientFid) {
        connect({ connector: farcasterFrame() });
      }

      // Hide splash screen after UI renders
      setTimeout(() => {
        FrameSDK.actions.ready();
      }, 500);
    };

    init();
  }, [connect]);

  return <>{children}</>;
}
