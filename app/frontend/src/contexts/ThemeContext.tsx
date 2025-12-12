/**
 * Theme Context
 *
 * Provides global theme state management for the application.
 * Manages theme selection, persistence, and application to CSS variables.
 *
 * User-configurable themes from Settings page.
 * Follows the same pattern as NeonContext for consistency.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeConfig, getAllThemes, getThemeByName } from '../config/themes';
import * as themeService from '../services/themeService';

interface ThemeContextType {
  currentTheme: ThemeConfig;
  setTheme: (themeName: string) => void;
  availableThemes: ThemeConfig[];
  refreshThemes: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [availableThemes, setAvailableThemes] = useState<ThemeConfig[]>(getAllThemes());

  // Initialize with saved theme or default
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(() => {
    const savedThemeName = themeService.getActiveThemeName();
    const theme = getThemeByName(savedThemeName);

    if (!theme) {
      // Fallback to default if saved theme doesn't exist
      const defaultTheme = getThemeByName('pocket-dark')!;
      themeService.setActiveThemeName('pocket-dark');
      return defaultTheme;
    }

    return theme;
  });

  // Apply theme on mount and when it changes
  useEffect(() => {
    themeService.applyTheme(currentTheme);
  }, [currentTheme]);

  const setTheme = (themeName: string) => {
    const theme = getThemeByName(themeName);
    if (theme) {
      setCurrentTheme(theme);
      themeService.setActiveThemeName(themeName);
    }
  };

  const refreshThemes = () => {
    setAvailableThemes(getAllThemes());
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, availableThemes, refreshThemes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
