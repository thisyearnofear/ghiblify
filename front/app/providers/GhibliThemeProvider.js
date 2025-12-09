"use client";

import { createContext, useContext, useState, useMemo } from 'react';

const GhibliThemeContext = createContext({
  isBackgroundEnabled: true,
  toggleBackground: () => {},
});

export function GhibliThemeProvider({ children }) {
  const [isBackgroundEnabled, setIsBackgroundEnabled] = useState(true);

  const toggleBackground = () => {
    setIsBackgroundEnabled(prev => !prev);
  };

  const value = useMemo(() => ({
    isBackgroundEnabled,
    toggleBackground,
  }), [isBackgroundEnabled]);

  return (
    <GhibliThemeContext.Provider value={value}>
      {children}
    </GhibliThemeContext.Provider>
  );
}

export const useGhibliTheme = () => {
  const context = useContext(GhibliThemeContext);
  if (context === undefined) {
    throw new Error('useGhibliTheme must be used within a GhibliThemeProvider');
  }
  return context;
};
