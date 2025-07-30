import { keyframes } from "@emotion/react";

/**
 * Centralized animation library for Ghiblify
 * All magical animations and micro-interactions
 */

// Core Animations
export const ANIMATIONS = {
  // Magical sparkle effect
  sparkle: keyframes`
    0%, 100% { opacity: 0; transform: scale(0); }
    50% { opacity: 1; transform: scale(1); }
  `,

  // Gentle floating motion
  float: keyframes`
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-3px); }
  `,

  // Magical pulse for buttons and badges
  pulse: keyframes`
    0% { box-shadow: 0 0 0 0 rgba(79, 209, 197, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(79, 209, 197, 0); }
    100% { box-shadow: 0 0 0 0 rgba(79, 209, 197, 0); }
  `,

  // Shimmer effect for loading states
  shimmer: keyframes`
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  `,

  // Gentle scale on hover
  breathe: keyframes`
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.02); }
  `,
};

// Animation Presets - Ready-to-use animation configurations
export const ANIMATION_PRESETS = {
  // Sparkle variations
  sparkleDefault: `${ANIMATIONS.sparkle} 2s ease-in-out infinite`,
  sparkleDelayed: `${ANIMATIONS.sparkle} 2.5s ease-in-out infinite 0.5s`,
  sparkleSlow: `${ANIMATIONS.sparkle} 3s ease-in-out infinite 1s`,

  // Float variations
  floatGentle: `${ANIMATIONS.float} 3s ease-in-out infinite`,
  floatFast: `${ANIMATIONS.float} 2s ease-in-out infinite`,

  // Pulse variations
  pulseDefault: `${ANIMATIONS.pulse} 2s infinite`,
  pulseClick: `${ANIMATIONS.pulse} 0.6s ease-out`,

  // Shimmer
  shimmerSlow: `${ANIMATIONS.shimmer} 3s ease-in-out infinite`,

  // Breathe
  breatheGentle: `${ANIMATIONS.breathe} 4s ease-in-out infinite`,
};

// Animation Utilities
export const createSparkleAnimation = (duration = "2s", delay = "0s") =>
  `${ANIMATIONS.sparkle} ${duration} ease-in-out infinite ${delay}`;

export const createFloatAnimation = (duration = "3s") =>
  `${ANIMATIONS.float} ${duration} ease-in-out infinite`;

export const createPulseAnimation = (duration = "2s") =>
  `${ANIMATIONS.pulse} ${duration} infinite`;
