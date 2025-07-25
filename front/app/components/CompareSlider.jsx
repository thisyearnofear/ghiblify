"use client";

import { Box, Image } from "@chakra-ui/react";
import dynamic from "next/dynamic";

// Dynamically import react-compare-image to avoid SSR issues
const ReactCompareImage = dynamic(() => import("react-compare-image"), {
  ssr: false,
});

export default function CompareSlider({
  originalUrl,
  resultUrl,
  height = "400px",
  width = "100%",
}) {
  return (
    <Box w={width} maxW="600px" mx="auto" my={4}>
      <ReactCompareImage
        leftImage={originalUrl}
        rightImage={resultUrl}
        leftImageLabel="Original"
        rightImageLabel="Ghibli style"
        sliderLineColor="#4682A9"
        sliderLineWidth={3}
        aspectRatio={1}
        style={{
          borderRadius: "12px",
          boxShadow: "0 2px 24px rgba(0,0,0,0.10)",
          height,
          width: "100%",
        }}
      />
    </Box>
  );
}