import React, { useEffect } from "react";
import FrameSDK from "@farcaster/frame-sdk";

export function FarcasterFrameProvider({ children }) {
  useEffect(() => {
    const init = async () => {
      // Hide splash screen after UI renders
      setTimeout(() => {
        FrameSDK.actions.ready();
      }, 500);
    };
    init();
  }, []);

  return <>{children}</>;
}
