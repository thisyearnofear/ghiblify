/**
 * Centralized Ghibli Theme Hook
 * 
 * DRY principle: Single source of truth for all theme-aware colors and styles
 * Used consistently across all components to prevent duplication
 * PERFORMANT: Memoized calculations, optimized re-renders
 * CLEAN: Well-typed interfaces, semantic naming
 */

import { useColorModeValue, BoxProps, ButtonProps } from '@chakra-ui/react';
import { useMemo } from 'react';

// TypeScript interfaces for better DX and type safety
export interface GhibliThemeColors {
  bg: {
    primary: string;
    secondary: string;
    card: string;
    overlay: string;
    elevated: string;
  };
  text: {
    primary: string;
    secondary: string;
    accent: string;
    inverted: string;
    muted: string;
  };
  border: {
    primary: string;
    accent: string;
    subtle: string;
    focus: string;
  };
  interactive: {
    hover: string;
    pressed: string;
    focus: string;
    disabled: string;
  };
  shadow: {
    card: string;
    elevated: string;
    magical: string;
    glow: string;
  };
}

export interface GhibliThemePatterns {
  card: BoxProps;
  elevatedCard: BoxProps;
  glassButton: ButtonProps;
  solidButton: ButtonProps;
  magicalButton: ButtonProps;
}

export interface UseGhibliThemeReturn {
  colors: GhibliThemeColors;
  patterns: GhibliThemePatterns;
  utils: {
    getHoverStyle: (variant?: 'subtle' | 'accent') => BoxProps;
    getFocusStyle: () => BoxProps;
    getElevationStyle: (level?: 1 | 2 | 3) => BoxProps;
  };
}

export const useGhibliTheme = (): UseGhibliThemeReturn => {
  // CORRECT: Call all hooks at the top level
  // Background colors
  const bgPrimary = useColorModeValue('white', 'ghibliGray.900');
  const bgSecondary = useColorModeValue('gray.50', 'ghibliGray.800');
  const bgCard = useColorModeValue('white', 'ghibliGray.800');
  const bgOverlay = useColorModeValue('blackAlpha.600', 'blackAlpha.800');
  const bgElevated = useColorModeValue('gray.25', 'ghibliGray.750');
  
  // Text colors
  const textPrimary = useColorModeValue('ghibliGray.900', 'ghibliGray.50');
  const textSecondary = useColorModeValue('gray.500', 'ghibliGray.300');
  const textAccent = useColorModeValue('brand.600', 'brand.300');
  const textInverted = useColorModeValue('white', 'ghibliGray.900');
  const textMuted = useColorModeValue('gray.400', 'ghibliGray.400');
  
  // Border colors
  const borderPrimary = useColorModeValue('gray.200', 'ghibliGray.600');
  const borderAccent = useColorModeValue('brand.300', 'brand.400');
  const borderSubtle = useColorModeValue('gray.100', 'ghibliGray.700');
  const borderFocus = useColorModeValue('brand.500', 'brand.400');
  
  // Interactive states
  const interactiveHover = useColorModeValue('gray.50', 'ghibliGray.700');
  const interactivePressed = useColorModeValue('gray.100', 'ghibliGray.600');
  const interactiveFocus = useColorModeValue('brand.500', 'brand.300');
  const interactiveDisabled = useColorModeValue('gray.300', 'ghibliGray.500');
  
  // Shadows
  const shadowCard = useColorModeValue('base', 'xl');
  const shadowElevated = useColorModeValue('lg', '2xl');
  const shadowMagical = useColorModeValue('0 8px 32px rgba(79, 209, 197, 0.3)', '0 8px 32px rgba(79, 209, 197, 0.5)');
  const shadowGlow = useColorModeValue('0 0 20px rgba(79, 209, 197, 0.4)', '0 0 20px rgba(79, 209, 197, 0.6)');
  
  // Glass button styles
  const glassBg = useColorModeValue('whiteAlpha.200', 'whiteAlpha.100');
  const glassBorderColor = useColorModeValue('whiteAlpha.300', 'whiteAlpha.200');
  const glassHoverBg = useColorModeValue('whiteAlpha.300', 'whiteAlpha.200');
  const glassHoverBorder = useColorModeValue('whiteAlpha.400', 'whiteAlpha.300');
  
  // Magical button gradient
  const magicalGradient = useColorModeValue(
    'linear(to-r, brand.400, ghibliBlue.400)',
    'linear(to-r, brand.500, ghibliBlue.500)'
  );

  // PERFORMANT: Memoize the final theme object
  const colors: GhibliThemeColors = useMemo(() => ({
    bg: {
      primary: bgPrimary,
      secondary: bgSecondary,
      card: bgCard,
      overlay: bgOverlay,
      elevated: bgElevated,
    },
    text: {
      primary: textPrimary,
      secondary: textSecondary,
      accent: textAccent,
      inverted: textInverted,
      muted: textMuted,
    },
    border: {
      primary: borderPrimary,
      accent: borderAccent,
      subtle: borderSubtle,
      focus: borderFocus,
    },
    interactive: {
      hover: interactiveHover,
      pressed: interactivePressed,
      focus: interactiveFocus,
      disabled: interactiveDisabled,
    },
    shadow: {
      card: shadowCard,
      elevated: shadowElevated,
      magical: shadowMagical,
      glow: shadowGlow,
    }
  }), [bgPrimary, bgSecondary, bgCard, bgOverlay, bgElevated, textPrimary, textSecondary, textAccent, textInverted, textMuted, borderPrimary, borderAccent, borderSubtle, borderFocus, interactiveHover, interactivePressed, interactiveFocus, interactiveDisabled, shadowCard, shadowElevated, shadowMagical, shadowGlow]);

  // PERFORMANT: Memoize pattern calculations
  const patterns: GhibliThemePatterns = useMemo(() => ({
    card: {
      bg: colors.bg.card,
      border: '1px solid',
      borderColor: colors.border.primary,
      borderRadius: 'lg',
      boxShadow: colors.shadow.card,
      transition: 'all 0.2s ease',
      _hover: {
        transform: 'translateY(-2px)',
        boxShadow: colors.shadow.elevated,
      }
    },
    
    elevatedCard: {
      bg: colors.bg.elevated,
      border: '1px solid',
      borderColor: colors.border.subtle,
      borderRadius: 'xl',
      boxShadow: colors.shadow.elevated,
      transition: 'all 0.3s ease',
      _hover: {
        transform: 'translateY(-4px)',
        boxShadow: colors.shadow.magical,
      }
    },
    
    glassButton: {
      bg: glassBg,
      backdropFilter: 'blur(10px)',
      border: '1px solid',
      borderColor: glassBorderColor,
      color: 'whiteAlpha.900',
      borderRadius: 'full',
      transition: 'all 0.2s ease',
      _hover: {
        bg: glassHoverBg,
        borderColor: glassHoverBorder,
        transform: 'translateY(-1px)',
      }
    },
    
    solidButton: {
      bg: colors.bg.card,
      border: '1px solid',
      borderColor: colors.border.primary,
      borderRadius: 'md',
      transition: 'all 0.2s ease',
      _hover: {
        bg: colors.interactive.hover,
        borderColor: colors.border.accent,
        transform: 'translateY(-1px)',
      },
      _focus: {
        boxShadow: `0 0 0 3px ${colors.interactive.focus}33`,
      }
    },
    
    magicalButton: {
      bgGradient: magicalGradient,
      color: 'white',
      borderRadius: 'full',
      boxShadow: colors.shadow.magical,
      transition: 'all 0.3s ease',
      _hover: {
        transform: 'translateY(-2px)',
        boxShadow: colors.shadow.glow,
      },
      _active: {
        transform: 'translateY(-1px)',
      }
    },
  }), [colors, glassBg, glassBorderColor, glassHoverBg, glassHoverBorder, magicalGradient]);

  // CLEAN: Utility functions for common operations
  const utils = useMemo(() => ({
    getHoverStyle: (variant: 'subtle' | 'accent' = 'subtle') => ({
      _hover: {
        bg: variant === 'subtle' ? colors.interactive.hover : colors.border.accent + '20',
        borderColor: variant === 'subtle' ? colors.border.subtle : colors.border.accent,
        transform: 'translateY(-1px)',
      }
    }),
    
    getFocusStyle: () => ({
      _focus: {
        boxShadow: `0 0 0 3px ${colors.interactive.focus}33`,
        borderColor: colors.border.focus,
      }
    }),
    
    getElevationStyle: (level: 1 | 2 | 3 = 1) => {
      const shadows = {
        1: colors.shadow.card,
        2: colors.shadow.elevated,
        3: colors.shadow.magical,
      };
      const transforms = {
        1: 'translateY(-1px)',
        2: 'translateY(-2px)',
        3: 'translateY(-4px)',
      };
      
      return {
        boxShadow: shadows[level],
        transition: 'all 0.2s ease',
        _hover: {
          transform: transforms[level],
          boxShadow: shadows[Math.min(level + 1, 3) as 1 | 2 | 3],
        }
      };
    },
  }), [colors]);

  return {
    colors,
    patterns,
    utils,
  };
};
