'use client';

import { Button } from "@chakra-ui/react";
import { GRADIENTS, PATTERNS, INTERACTIONS, ANIMATION_PRESETS } from "../../theme";

/**
 * Reusable magical button component with Ghibli theming
 */
export default function MagicalButton({ 
  children, 
  variant = "primary", 
  size = "md",
  leftIcon,
  rightIcon,
  isAnimated = false,
  ...props 
}) {
  const variants = {
    primary: {
      bgGradient: GRADIENTS.ghibliPrimary,
      color: "white",
      _hover: {
        bgGradient: GRADIENTS.ghibliReverse,
        ...INTERACTIONS.buttonHover,
      },
      _active: {
        ...INTERACTIONS.buttonActive,
        animation: isAnimated ? ANIMATION_PRESETS.pulseClick : undefined,
      },
    },
    glass: {
      ...PATTERNS.glassButton,
      color: "white",
    },
    danger: {
      bg: "red.500",
      color: "white",
      _hover: {
        bg: "red.600",
        ...INTERACTIONS.buttonHover,
      },
      _active: INTERACTIONS.buttonActive,
    }
  };

  return (
    <Button
      {...PATTERNS.magicalButton}
      {...variants[variant]}
      size={size}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      {...props}
    >
      {children}
    </Button>
  );
}