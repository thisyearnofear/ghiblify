'use client';

import { Box, Container } from '@chakra-ui/react';
import { useFarcaster } from './FarcasterFrameProvider';

export default function MiniAppContainer({ children }) {
  const { isInFrame } = useFarcaster();

  // Enhanced Mini App sizing with better mobile optimization
  const containerStyles = isInFrame ? {
    // Mini App mode - optimized for Farcaster mobile
    maxW: "424px",
    minH: "695px",
    w: "full",
    mx: "auto",
    p: { base: 3, sm: 4 }, // Slightly more padding on mobile for touch targets
    // Remove default margins and ensure proper mobile sizing
    my: 0,
    borderRadius: { base: 0, sm: "xl" },
    bg: "white",
    overflowX: "hidden",
    overflowY: "auto", // Allow vertical scrolling in mini app
    // Enhanced mobile viewport handling
    maxH: { base: "100vh", sm: "695px" },
    // Better mobile touch handling
    WebkitOverflowScrolling: "touch",
    // Prevent zoom on input focus (mobile Safari)
    fontSize: { base: "16px", sm: "14px" },
    // Safe area handling for mobile devices
    paddingBottom: { base: "env(safe-area-inset-bottom)", sm: 4 }
  } : {
    // Regular web mode
    maxW: "container.lg",
    p: { base: 4, md: 6 },
    my: { base: 4, md: 8 }
  };

  const wrapperStyles = isInFrame ? {
    // Mini App wrapper - ensure full height usage
    minH: "100vh",
    w: "100vw",
    bg: "gray.100",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    p: 0,
    overflow: "auto"
  } : {
    // Regular web wrapper
    minH: "auto"
  };

  if (isInFrame) {
    return (
      <Box {...wrapperStyles}>
        <Container {...containerStyles}>
          <Box 
            h="full" 
            display="flex" 
            flexDirection="column"
            gap={{ base: 3, sm: 4 }}
          >
            {children}
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Container {...containerStyles}>
      {children}
    </Container>
  );
}