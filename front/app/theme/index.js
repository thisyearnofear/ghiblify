/**
 * Centralized theme exports for easy importing
 * Import everything you need from this single file
 * 
 * CLEAN & DRY: Single source of truth for all theme-related exports
 * ORGANIZED: Clear separation between old and new theme systems
 * PERFORMANT: Tree-shakable exports for optimal bundle size
 */

// NEW: Centralized theme system (RECOMMENDED)
// Use this for new components and migrations
export { useGhibliTheme } from '../hooks/useGhibliTheme';
// Note: TypeScript types are available when importing from the TypeScript file directly

// Main Chakra theme configuration
export { default as ghibliTheme } from './chakra-theme';

// LEGACY: Old theme system (DEPRECATED - use useGhibliTheme instead)
// Core theme
export { COLORS, RGBA_COLORS, BREAKPOINTS, BUTTON_SIZES, SPACING, MINIAPP, RESPONSIVE_PATTERNS } from './constants';

// Animations (still used by existing components)
export { ANIMATIONS, ANIMATION_PRESETS, createSparkleAnimation, createFloatAnimation, createPulseAnimation } from './animations';

// Styles (still used by existing components)
export { GLASSMORPHISM, GRADIENTS, INTERACTIONS, PATTERNS, TEXT_STYLES, LAYOUTS } from './styles';

// MIGRATION HELPER: Backwards compatibility exports
// These will be removed in future versions
export * from './constants';
export * from './animations';  
export * from './styles';
