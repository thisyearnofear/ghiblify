/**
 * Enhanced Color Mode Hook for Farcaster Frames
 * 
 * Provides better color mode handling in constrained environments like Farcaster Mini Apps
 * where localStorage access might be limited or system preferences might not be available
 */

'use client';

import { useEffect, useState } from 'react';
import { useColorMode as useChakraColorMode } from '@chakra-ui/react';
import { useFarcaster } from '../components/FarcasterMiniAppProvider';

export interface FarcasterColorModeReturn {
  colorMode: 'light' | 'dark';
  toggleColorMode: () => void;
  setColorMode: (mode: 'light' | 'dark') => void;
  systemColorMode: 'light' | 'dark' | 'unknown';
  isFrameEnvironment: boolean;
  isColorModeReady: boolean;
}

export const useFarcasterColorMode = (): FarcasterColorModeReturn => {
  const chakraColorMode = useChakraColorMode();
  const { isInMiniApp } = useFarcaster();
  const [systemColorMode, setSystemColorMode] = useState<'light' | 'dark' | 'unknown'>('unknown');
  const [isColorModeReady, setIsColorModeReady] = useState(false);
  const [frameColorMode, setFrameColorMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    let mounted = true;
    
    const initializeColorMode = async () => {
      try {
        // Detect system preference if available
        if (typeof window !== 'undefined' && window.matchMedia) {
          const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
          const systemPrefersDark = darkModeQuery.matches;
          
          if (mounted) {
            setSystemColorMode(systemPrefersDark ? 'dark' : 'light');
            
            // In frame environment, use system preference as fallback
            if (isInMiniApp) {
              setFrameColorMode(systemPrefersDark ? 'dark' : 'light');
            }
          }
          
          // Listen for system preference changes
          const handleSystemChange = (e: MediaQueryListEvent) => {
            if (mounted) {
              setSystemColorMode(e.matches ? 'dark' : 'light');
              // In frames, automatically follow system preference if localStorage isn't working
              if (isInMiniApp) {
                setFrameColorMode(e.matches ? 'dark' : 'light');
              }
            }
          };
          
          darkModeQuery.addEventListener('change', handleSystemChange);
          return () => {
            darkModeQuery.removeEventListener('change', handleSystemChange);
          };
        }
      } catch (error) {
        console.log('Color mode initialization limited in mini app environment:', error);
        // Fallback to light mode in constrained environments
        if (mounted) {
          setSystemColorMode('unknown');
          setFrameColorMode('light');
        }
      } finally {
        if (mounted) {
          setIsColorModeReady(true);
        }
      }
    };

    // Small delay to avoid hydration issues
    const timer = setTimeout(initializeColorMode, 100);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [isInMiniApp]);

  // Enhanced toggle function with frame-specific handling
  const enhancedToggleColorMode = () => {
    if (isInMiniApp) {
      // In frames, manage color mode locally if Chakra's persistence fails
      const newMode = frameColorMode === 'light' ? 'dark' : 'light';
      setFrameColorMode(newMode);
      
      // Also try to update Chakra's color mode
      try {
        chakraColorMode.toggleColorMode();
      } catch (error) {
        console.log('Chakra color mode toggle failed in mini app:', error);
      }
    } else {
      chakraColorMode.toggleColorMode();
    }
  };

  // Enhanced set color mode function
  const enhancedSetColorMode = (mode: 'light' | 'dark') => {
    if (isInMiniApp) {
      setFrameColorMode(mode);
      
      try {
        chakraColorMode.setColorMode(mode);
      } catch (error) {
        console.log('Chakra set color mode failed in mini app:', error);
      }
    } else {
      chakraColorMode.setColorMode(mode);
    }
  };

  // Determine the current color mode
  const currentColorMode = isInMiniApp ? frameColorMode : chakraColorMode.colorMode;

  return {
    colorMode: currentColorMode,
    toggleColorMode: enhancedToggleColorMode,
    setColorMode: enhancedSetColorMode,
    systemColorMode,
    isFrameEnvironment: isInMiniApp,
    isColorModeReady,
  };
};