/**
 * Centralized theme exports for easy importing
 * Import everything you need from this single file
 */

// Core theme
export { COLORS, RGBA_COLORS, BREAKPOINTS, BUTTON_SIZES, SPACING, MINIAPP, RESPONSIVE_PATTERNS } from './constants';

// Animations
export { ANIMATIONS, ANIMATION_PRESETS, createSparkleAnimation, createFloatAnimation, createPulseAnimation } from './animations';

// Styles
export { GLASSMORPHISM, GRADIENTS, INTERACTIONS, PATTERNS, TEXT_STYLES, LAYOUTS } from './styles';

// Re-export for backwards compatibility
export * from './constants';
export * from './animations';  
export * from './styles';