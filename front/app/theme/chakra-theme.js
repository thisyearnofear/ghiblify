/**
 * Ghiblify Chakra UI Theme
 * 
 * Comprehensive theme configuration with elegant dark mode support
 * maintaining the delightful Ghibli aesthetic in both light and dark modes
 */

'use client';

import { extendTheme } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';
import { COLORS, RGBA_COLORS } from './constants';

// Color palette that works beautifully in both modes
const colors = {
  // Brand colors (enhanced for dark mode compatibility)
  brand: {
    50: '#E6FFFA',
    100: '#B2F5EA', 
    200: '#81E6D9',
    300: '#4FD1C5', // Primary Ghibli green
    400: '#38B2AC',
    500: '#319795',
    600: '#2C7A7B', 
    700: '#285E61',
    800: '#234E52',
    900: '#1D4044',
  },
  
  // Ghibli blue palette
  ghibliBlue: {
    50: '#EBF8FF',
    100: '#BEE3F8',
    200: '#90CDF4', 
    300: '#63B3ED',
    400: '#4682A9', // Primary Ghibli blue
    500: '#3182CE',
    600: '#2B77AC',
    700: '#2C5282',
    800: '#2A4365',
    900: '#1A365D',
  },

  // Enhanced grays for better dark mode contrast
  ghibliGray: {
    50: '#F7FAFC',
    100: '#EDF2F7',
    200: '#E2E8F0',
    300: '#CBD5E0',
    400: '#A0AEC0',
    500: '#718096',
    600: '#4A5568',
    700: '#2D3748',
    800: '#1A202C',
    900: '#171923',
  },

  // Magic accent colors for delightful interactions
  magic: {
    light: 'rgba(255, 255, 255, 0.8)',
    shimmer: 'rgba(255, 255, 255, 0.3)',
    glow: 'rgba(79, 209, 197, 0.6)',
    shadow: 'rgba(0, 0, 0, 0.1)',
    darkGlow: 'rgba(79, 209, 197, 0.4)',
    darkShimmer: 'rgba(255, 255, 255, 0.1)',
  }
};

// Semantic color tokens that automatically switch between modes
const semanticTokens = {
  colors: {
    // Background colors
    'bg.primary': {
      default: 'white',
      _dark: 'ghibliGray.900',
    },
    'bg.secondary': {
      default: 'gray.50',
      _dark: 'ghibliGray.800',
    },
    'bg.card': {
      default: 'white',
      _dark: 'ghibliGray.800',
    },
    'bg.overlay': {
      default: 'blackAlpha.600',
      _dark: 'blackAlpha.800',
    },

    // Border colors
    'border.primary': {
      default: 'gray.200',
      _dark: 'ghibliGray.600',
    },
    'border.accent': {
      default: 'brand.300',
      _dark: 'brand.400',
    },

    // Text colors
    'text.primary': {
      default: 'ghibliGray.900',
      _dark: 'ghibliGray.50',
    },
    'text.secondary': {
      default: 'ghibliGray.600',
      _dark: 'ghibliGray.300',
    },
    'text.accent': {
      default: 'brand.600',
      _dark: 'brand.300',
    },
    'text.inverted': {
      default: 'white',
      _dark: 'ghibliGray.900',
    },

    // Interactive colors
    'interactive.hover': {
      default: 'gray.50',
      _dark: 'ghibliGray.700',
    },
    'interactive.pressed': {
      default: 'gray.100',
      _dark: 'ghibliGray.600',
    },
  },
};

// Global styles that adapt to color mode
const styles = {
  global: (props) => ({
    body: {
      bg: mode('white', 'ghibliGray.900')(props),
      color: mode('ghibliGray.900', 'ghibliGray.50')(props),
      transition: 'background-color 0.2s ease, color 0.2s ease',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    
    // Ensure smooth transitions for all interactive elements
    '*': {
      transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
    },

    // Custom scrollbar styling
    '::-webkit-scrollbar': {
      width: '8px',
    },
    '::-webkit-scrollbar-track': {
      bg: mode('gray.100', 'ghibliGray.800')(props),
    },
    '::-webkit-scrollbar-thumb': {
      bg: mode('gray.300', 'ghibliGray.600')(props),
      borderRadius: '4px',
    },
    '::-webkit-scrollbar-thumb:hover': {
      bg: mode('gray.400', 'ghibliGray.500')(props),
    },
  }),
};

// Component style overrides for better dark mode support
const components = {
  Button: {
    baseStyle: {
      fontWeight: 'medium',
      borderRadius: 'lg',
      transition: 'all 0.2s ease',
    },
    variants: {
      // Enhanced magical button for Ghibli aesthetic
      magical: (props) => ({
        bg: mode('brand.400', 'brand.500')(props),
        color: 'white',
        bgGradient: mode(
          'linear(to-r, brand.400, ghibliBlue.400)',
          'linear(to-r, brand.500, ghibliBlue.500)'
        )(props),
        boxShadow: mode(
          '0 4px 14px rgba(79, 209, 197, 0.3)',
          '0 4px 14px rgba(79, 209, 197, 0.5)'
        )(props),
        _hover: {
          transform: 'translateY(-2px)',
          boxShadow: mode(
            '0 8px 25px rgba(79, 209, 197, 0.4)',
            '0 8px 25px rgba(79, 209, 197, 0.6)'
          )(props),
        },
        _active: {
          transform: 'translateY(-1px)',
        },
      }),
      
      // Glass morphism button
      glass: (props) => ({
        bg: mode('whiteAlpha.200', 'whiteAlpha.100')(props),
        backdropFilter: 'blur(10px)',
        border: '1px solid',
        borderColor: mode('whiteAlpha.300', 'whiteAlpha.200')(props),
        color: mode('ghibliGray.800', 'ghibliGray.100')(props),
        _hover: {
          bg: mode('whiteAlpha.300', 'whiteAlpha.200')(props),
          transform: 'translateY(-1px)',
        },
      }),
    },
  },

  Card: {
    baseStyle: (props) => ({
      bg: mode('white', 'ghibliGray.800')(props),
      borderColor: mode('gray.200', 'ghibliGray.600')(props),
      boxShadow: mode(
        '0 4px 6px rgba(0, 0, 0, 0.05)',
        '0 4px 6px rgba(0, 0, 0, 0.3)'
      )(props),
    }),
  },

  Modal: {
    baseStyle: (props) => ({
      dialog: {
        bg: mode('white', 'ghibliGray.800')(props),
        boxShadow: mode(
          '0 25px 50px rgba(0, 0, 0, 0.15)',
          '0 25px 50px rgba(0, 0, 0, 0.5)'
        )(props),
      },
      overlay: {
        bg: mode('blackAlpha.600', 'blackAlpha.800')(props),
        backdropFilter: 'blur(4px)',
      },
    }),
  },

  Tooltip: {
    baseStyle: (props) => ({
      bg: mode('ghibliGray.800', 'ghibliGray.200')(props),
      color: mode('white', 'ghibliGray.800')(props),
      boxShadow: mode(
        '0 4px 12px rgba(0, 0, 0, 0.15)',
        '0 4px 12px rgba(0, 0, 0, 0.3)'
      )(props),
    }),
  },

  Badge: {
    variants: {
      magical: (props) => ({
        bg: mode('brand.500', 'brand.400')(props),
        color: 'white',
        boxShadow: mode(
          '0 2px 4px rgba(79, 209, 197, 0.3)',
          '0 2px 4px rgba(79, 209, 197, 0.5)'
        )(props),
      }),
    },
  },
};

// Configuration for color mode
const config = {
  initialColorMode: 'light',
  useSystemColorMode: true, // Respect user's system preference
  disableTransitionOnChange: false, // Keep smooth transitions
};

// Font configuration
const fonts = {
  heading: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

// Create and export the theme
const theme = extendTheme({
  config,
  colors,
  semanticTokens,
  styles,
  components,
  fonts,
  
  // Responsive breakpoints
  breakpoints: {
    base: '0em',
    sm: '30em',   // 480px
    md: '48em',   // 768px
    lg: '62em',   // 992px
    xl: '80em',   // 1280px
    '2xl': '96em', // 1536px
  },
  
  // Spacing scale
  space: {
    px: '1px',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    2.5: '0.625rem',
    3: '0.75rem',
    3.5: '0.875rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    9: '2.25rem',
    10: '2.5rem',
    12: '3rem',
    14: '3.5rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    28: '7rem',
    32: '8rem',
    36: '9rem',
    40: '10rem',
    44: '11rem',
    48: '12rem',
    52: '13rem',
    56: '14rem',
    60: '15rem',
    64: '16rem',
    72: '18rem',
    80: '20rem',
    96: '24rem',
  },
  
  // Custom shadows for magical effects
  shadows: {
    magical: '0 8px 32px rgba(79, 209, 197, 0.3)',
    magicalDark: '0 8px 32px rgba(79, 209, 197, 0.5)',
    glass: '0 8px 32px rgba(31, 38, 135, 0.37)',
    glow: '0 0 20px rgba(79, 209, 197, 0.5)',
  },
});

export default theme;
