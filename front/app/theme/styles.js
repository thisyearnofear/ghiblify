import { COLORS } from "./constants";

/**
 * Centralized style patterns for Ghiblify
 * Reusable style objects for consistent theming
 */

// Glassmorphism Effects
export const GLASSMORPHISM = {
  // Light glassmorphism for buttons on gradient backgrounds
  light: {
    bg: "whiteAlpha.200",
    backdropFilter: "blur(10px)",
    border: "1px solid",
    borderColor: "whiteAlpha.300",
  },
  
  // Medium glassmorphism for cards
  medium: {
    bg: "whiteAlpha.300",
    backdropFilter: "blur(15px)",
    border: "1px solid",
    borderColor: "whiteAlpha.400",
  },
  
  // Strong glassmorphism for modals
  strong: {
    bg: "whiteAlpha.400",
    backdropFilter: "blur(20px)",
    border: "2px solid",
    borderColor: "whiteAlpha.500",
  }
};

// Gradient Patterns
export const GRADIENTS = {
  // Primary Ghibli gradient
  ghibliPrimary: `linear(to-r, ${COLORS.ghibli.green}, ${COLORS.ghibli.blue})`,
  
  // Reversed for hover states
  ghibliReverse: `linear(to-r, ${COLORS.ghibli.blue}, ${COLORS.primary})`,
  
  // Subtle shimmer overlay
  shimmerOverlay: "linear(45deg, transparent 0%, whiteAlpha.100 50%, transparent 100%)",
  
  // RainbowKit style
  rainbow: "linear(to-r, purple.500, pink.500)"
};

// Interactive States
export const INTERACTIONS = {
  // Magical button hover
  buttonHover: {
    transform: "translateY(-1px)",
    boxShadow: "0 8px 25px rgba(79, 209, 197, 0.4)",
  },
  
  // Button active (click)
  buttonActive: {
    transform: "translateY(0px)",
  },
  
  // Gentle hover lift
  gentleHover: {
    transform: "translateY(-2px)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  },
  
  // Scale hover for icons/logos
  scaleHover: {
    transform: "scale(1.05)",
    textShadow: "0 4px 8px rgba(0,0,0,0.4)",
  },
  
  // Glass button hover
  glassHover: {
    bg: "whiteAlpha.300",
    transform: "translateY(-1px)",
    boxShadow: "0 4px 12px rgba(255,255,255,0.2)",
  }
};

// Common Style Patterns
export const PATTERNS = {
  // Magical sparkle dots
  sparkleDot: (size = "4px", color = "whiteAlpha.800") => ({
    w: size,
    h: size,
    bg: color,
    borderRadius: "full",
    position: "absolute",
  }),
  
  // Rounded magical button
  magicalButton: {
    borderRadius: "full",
    fontWeight: "bold",
    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
    transition: "all 0.3s ease",
  },
  
  // Glass button on gradient
  glassButton: {
    ...GLASSMORPHISM.light,
    borderRadius: "full",
    fontWeight: "medium",
    transition: "all 0.3s ease",
    _hover: INTERACTIONS.glassHover,
    _active: INTERACTIONS.buttonActive,
  },
  
  // Modal with magical styling
  magicalModal: {
    bg: "white",
    borderRadius: "2xl",
    boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
    border: "3px solid",
    overflow: "hidden",
  },
  
  // Magical overlay
  magicalOverlay: {
    bg: "blackAlpha.600",
    backdropFilter: "blur(10px)",
  }
};

// Text Styles
export const TEXT_STYLES = {
  // Magical heading
  magicalHeading: {
    fontWeight: "bold",
    color: "white",
    textShadow: "0 2px 4px rgba(0,0,0,0.3)",
  },
  
  // Branded primary text
  brandedText: {
    color: COLORS.primary,
    fontWeight: "bold",
  }
};

// Layout Helpers
export const LAYOUTS = {
  // Header container
  headerContainer: {
    position: "relative",
    py: { base: 3, sm: 4 },
    px: { base: 4, sm: 8 },
    borderBottom: "3px solid",
    borderColor: "whiteAlpha.300",
    boxShadow: "0 4px 20px rgba(79, 209, 197, 0.3)",
    overflow: "hidden",
  },
  
  // Centered flex container
  centeredFlex: {
    justify: "space-between",
    align: "center",
    maxW: "container.lg",
    mx: "auto",
    position: "relative",
    zIndex: "1",
  }
};