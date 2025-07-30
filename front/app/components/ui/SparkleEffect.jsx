'use client';

import { Box } from "@chakra-ui/react";
import { PATTERNS, createSparkleAnimation } from "../../theme";

/**
 * Reusable sparkle effect component
 */
export default function SparkleEffect({ 
  sparkles = [
    { top: "20%", left: "10%", size: "4px", delay: "0s", color: "whiteAlpha.800" },
    { top: "60%", right: "15%", size: "3px", delay: "0.5s", color: "whiteAlpha.600" },
    { top: "30%", right: "30%", size: "2px", delay: "1s", color: "whiteAlpha.700" }
  ],
  duration = "2s"
}) {
  return (
    <>
      {sparkles.map((sparkle, index) => (
        <Box
          key={index}
          {...PATTERNS.sparkleDot(sparkle.size, sparkle.color || "whiteAlpha.800")}
          top={sparkle.top}
          left={sparkle.left}
          right={sparkle.right}
          animation={createSparkleAnimation(duration, sparkle.delay)}
        />
      ))}
    </>
  );
}