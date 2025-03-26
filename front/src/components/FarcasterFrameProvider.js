import React, { useEffect } from "react";
import FrameSDK from "@farcaster/frame-sdk";

export const FarcasterFrameProvider = ({ children }) => {
  useEffect(() => {
    const initializeFrame = async () => {
      try {
        // Initialize the Frame SDK
        await FrameSDK.initialize();

        // Set up event listeners
        FrameSDK.on("frameAdded", ({ notificationDetails }) => {
          console.log("Frame added", notificationDetails);
        });

        FrameSDK.on("frameRemoved", () => {
          console.log("Frame removed");
        });

        // Indicate that the frame is ready to be displayed
        await FrameSDK.actions.ready();
      } catch (error) {
        console.error("Error initializing Frame:", error);
      }
    };

    initializeFrame();

    // Cleanup listeners on unmount
    return () => {
      FrameSDK.removeAllListeners();
    };
  }, []);

  return children;
};
