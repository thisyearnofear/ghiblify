// Shared responsive breakpoints for consistent UI
export const BREAKPOINTS = {
  base: 0,
  sm: 480,
  md: 768,
  lg: 992,
  xl: 1280,
  '2xl': 1536
};

// Touch-optimized button sizes for mobile
export const BUTTON_SIZES = {
  mobile: {
    minHeight: '56px',
    fontSize: 'lg',
    px: 6
  },
  desktop: {
    minHeight: '40px', 
    fontSize: 'md',
    px: 4
  }
};

// Consistent spacing for mobile layouts
export const SPACING = {
  mobile: {
    container: 2,
    section: 4,
    element: 3
  },
  desktop: {
    container: 6,
    section: 8,
    element: 4
  }
};

// Mini App specific dimensions
export const MINIAPP = {
  dimensions: {
    web: { width: '424px', height: '695px' },
    mobile: { maxWidth: '100vw', minHeight: '100vh' }
  },
  container: {
    maxWidth: '424px',
    padding: { base: 2, sm: 4 },
    borderRadius: { base: 0, sm: 'xl' }
  }
};

// Brand colors for consistency
export const COLORS = {
  primary: '#4682A9',
  secondary: '#4FD1C5', 
  accent: '#3182CE',
  ghibli: {
    green: '#4FD1C5',
    blue: '#4682A9',
    accent: '#3182CE'
  }
};

// Performance optimization - memoized common color values
export const RGBA_COLORS = {
  ghibliGreenAlpha: 'rgba(79, 209, 197, 0.7)',
  ghibliGreenShadow: 'rgba(79, 209, 197, 0.4)',
  ghibliBlueShadow: 'rgba(70, 130, 169, 0.2)',
  redShadow: 'rgba(239, 68, 68, 0.4)',
  whiteShadow: 'rgba(255,255,255,0.2)',
  blackShadow: 'rgba(0,0,0,0.2)'
};

// Common responsive patterns
export const RESPONSIVE_PATTERNS = {
  mobileFirst: {
    size: { base: 'lg', md: 'md' },
    minH: { base: '56px', md: '40px' },
    fontSize: { base: 'lg', md: 'md' },
    w: { base: 'full', md: 'auto' }
  },
  flexDirection: { base: 'column', md: 'row' },
  imageSize: { base: '300px', md: '400px' },
  maxWidth: { base: '100%', md: '600px' }
};