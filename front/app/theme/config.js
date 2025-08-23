/**
 * Theme configuration that can be used server-side
 * 
 * This module exports only the configuration values needed for server-side rendering,
 * particularly for ColorModeScript initialization
 */

export const themeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false, // Disable to prevent hydration mismatches
  disableTransitionOnChange: false,
};

export default themeConfig;
