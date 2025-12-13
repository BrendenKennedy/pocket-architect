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
import { loadConfig, configSetters } from '../services';

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
    // Try to load from config first, fallback to localStorage, then default
    let themeName = 'pocket-dark';

    try {
      // This will be async in the useEffect, but for initial state we need sync
      // We'll handle the async loading in useEffect
      const savedThemeName = themeService.getActiveThemeName();
      if (savedThemeName) {
        themeName = savedThemeName;
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
    }

    const theme = getThemeByName(themeName);
    return theme || getThemeByName('pocket-dark')!;
  });

  // Load theme from config on mount
  useEffect(() => {
    const loadThemeFromConfig = async () => {
      try {
        const config = await loadConfig();
        const themeName = config.appearance.theme || 'pocket-dark';
        const theme = getThemeByName(themeName);
        if (theme && theme.name !== currentTheme.name) {
          setCurrentTheme(theme);
        }
      } catch (error) {
        console.warn('Failed to load theme from config:', error);
      }
    };

    loadThemeFromConfig();
  }, []);

  // Apply theme on mount and when it changes
  useEffect(() => {
    themeService.applyTheme(currentTheme);
  }, [currentTheme]);

  const setTheme = async (themeName: string) => {
    const theme = getThemeByName(themeName);
    if (theme) {
      setCurrentTheme(theme);
      themeService.setActiveThemeName(themeName);

      // Save to config
      try {
        await configSetters.setTheme(themeName);
      } catch (error) {
        console.warn('Failed to save theme to config:', error);
      }
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
