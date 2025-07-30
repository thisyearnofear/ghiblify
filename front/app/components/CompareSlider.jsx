"use client";

import { Box, Image, useBreakpointValue, Text, VStack } from "@chakra-ui/react";
import dynamic from "next/dynamic";
import { useState } from "react";

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
  const [isInteracting, setIsInteracting] = useState(false);
  
  // Responsive sizing for mobile optimization
  const mobileHeight = useBreakpointValue({ base: "300px", md: height });
  const sliderWidth = useBreakpointValue({ base: 4, md: 3 });
  const borderRadius = useBreakpointValue({ base: "8px", md: "12px" });
  const maxWidth = useBreakpointValue({ base: "100%", md: "600px" });

  const handleSlideStart = () => {
    setIsInteracting(true);
  };

  const handleSlideEnd = () => {
    setTimeout(() => setIsInteracting(false), 100);
  };

  return (
    <VStack spacing={3} w={width} maxW={maxWidth} mx="auto" my={4}>
      {/* Mobile Instructions */}
      <Text 
        fontSize={{ base: "sm", md: "md" }} 
        color="gray.600" 
        textAlign="center"
        display={{ base: "block", md: "none" }}
        opacity={isInteracting ? 0.5 : 1}
        transition="opacity 0.2s"
      >
        👆 Drag to compare • Tap and hold for better control
      </Text>
      
      <Box 
        w="full" 
        position="relative"
        onTouchStart={handleSlideStart}
        onTouchEnd={handleSlideEnd}
        onMouseDown={handleSlideStart}
        onMouseUp={handleSlideEnd}
      >
        <ReactCompareImage
          leftImage={originalUrl}
          rightImage={resultUrl}
          leftImageLabel="Original"
          rightImageLabel="✨ Ghibli Style"
          sliderLineColor="#3182CE"
          sliderLineWidth={sliderWidth}
          aspectRatio={1}
          handle={
            <Box
              w={{ base: "44px", md: "40px" }}
              h={{ base: "44px", md: "40px" }}
              borderRadius="full"
              bg="white"
              border="3px solid #3182CE"
              boxShadow="0 2px 8px rgba(0,0,0,0.2)"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize={{ base: "18px", md: "16px" }}
              cursor="grab"
              _active={{ cursor: "grabbing" }}
              // Enhanced touch target for mobile
              minW="44px"
              minH="44px"
            >
              ↔️
            </Box>
          }
          style={{
            borderRadius,
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            height: mobileHeight,
            width: "100%",
            // Ensure touch events work properly on mobile
            touchAction: "none",
          }}
          // Enhanced mobile props
          sliderPositionPercentage={0.5}
        />
        
        {/* Subtle overlay for better mobile feedback */}
        {isInteracting && (
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            pointerEvents="none"
            borderRadius={borderRadius}
            bg="rgba(49, 130, 206, 0.05)"
            transition="all 0.2s"
          />
        )}
      </Box>
      
      {/* Mobile Tip */}
      <Text 
        fontSize="xs" 
        color="gray.500" 
        textAlign="center"
        display={{ base: "block", md: "none" }}
      >
        💡 Best viewed in portrait mode
      </Text>
    </VStack>
  );
}