'use client';

import { useState, useEffect } from 'react';
import { useBreakpointValue } from '@chakra-ui/react';

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  
  // Chakra UI breakpoint detection
  const isMobileBreakpoint = useBreakpointValue({ base: true, md: false });
  
  useEffect(() => {
    const checkMobile = () => {
      // Screen size detection
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const isSmallScreen = screenWidth <= 768;
      
      // Touch capability detection
      const hasTouchScreen = 'ontouchstart' in window || 
                           navigator.maxTouchPoints > 0 || 
                           navigator.msMaxTouchPoints > 0;
      
      // User agent detection (as fallback)
      const userAgent = navigator.userAgent.toLowerCase();
      const isUserAgentMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      
      // Orientation detection
      const isPortrait = screenHeight > screenWidth;
      
      setIsMobile(isSmallScreen || isUserAgentMobile);
      setIsTouch(hasTouchScreen);
    };
    
    checkMobile();
    
    // Listen for window resize and orientation changes
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);
  
  return {
    isMobile: isMobile || isMobileBreakpoint,
    isTouch,
    isMobileBreakpoint,
    // Convenience getters
    isDesktop: !isMobile && !isMobileBreakpoint,
    isLandscape: typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false,
    isPortrait: typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : true,
    screenSize: typeof window !== 'undefined' ? {
      width: window.innerWidth,
      height: window.innerHeight
    } : null
  };
}

// Shared responsive constants
export const MOBILE_BREAKPOINTS = {
  sm: '30em', // 480px
  md: '48em', // 768px
  lg: '62em', // 992px
  xl: '80em', // 1280px
};

export const TOUCH_TARGET_SIZE = {
  minimum: '44px',
  comfortable: '56px',
  large: '64px'
};

export const MINIAPP_DIMENSIONS = {
  web: {
    width: '424px',
    height: '695px'
  },
  mobile: {
    maxWidth: '100vw',
    minHeight: '100vh'
  }
};