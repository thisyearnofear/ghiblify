"use client";

import React, { useEffect, useState } from "react";
import FrameSDK from "@farcaster/frame-sdk";
import farcasterFrame from "@farcaster/frame-wagmi-connector";
import { connect } from "@wagmi/core";
import { useAccount } from "wagmi";
import { config } from "./WagmiConfig";
import { Button, Box, Text } from "@chakra-ui/react";

export function FarcasterFrameProvider({ children }: { children: any }) {
  const [isFrame, setIsFrame] = useState(false);
  const { address } = useAccount();

  useEffect(() => {
    const init = async () => {
      try {
        const context = await FrameSDK.context;
        console.log("Frame context:", context);
        setIsFrame(!!context?.client.clientFid);

        // Autoconnect if running in a frame
        if (context?.client.clientFid) {
          await connect(config, { connector: farcasterFrame() });
        }

        // Hide splash screen after UI renders
        setTimeout(() => {
          FrameSDK.actions.ready();
        }, 500);
      } catch (error) {
        console.error("Frame initialization error:", error);
      }
    };

    init();
  }, []);

  const handleConnect = async () => {
    try {
      await connect(config, { connector: farcasterFrame() });
    } catch (error) {
      console.error("Connection error:", error);
    }
  };

  return (
    <>
      {isFrame && (
        <Box p={4} bg="gray.100">
          <Text mb={2}>Frame Debug Info:</Text>
          <Text>Connected: {address ? "Yes" : "No"}</Text>
          <Text>Address: {address || "Not connected"}</Text>
          <Button
            mt={2}
            colorScheme="blue"
            onClick={handleConnect}
            isDisabled={!!address}
          >
            {address ? "Connected" : "Connect Wallet"}
          </Button>
        </Box>
      )}
      {children}
    </>
  );
}
