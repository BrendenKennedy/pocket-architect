/**
 * Theme Service
 *
 * Core utilities for applying themes to CSS variables and managing theme state.
 * Bridges ThemeConfig data structure to CSS custom properties on document.documentElement.
 */

import { ThemeConfig } from '../config/themes';

/**
 * Maps ThemeConfig color properties to CSS variable names
 */
const CSS_VAR_MAPPING: Record<keyof ThemeConfig['colors'], string> = {
  background: '--background',
  foreground: '--foreground',
  card: '--card',
  cardForeground: '--card-foreground',
  popover: '--popover',
  popoverForeground: '--popover-foreground',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  destructive: '--destructive',
  destructiveForeground: '--destructive-foreground',
  border: '--border',
  input: '--input',
  ring: '--ring',
};

/**
 * Applies a theme's colors to CSS variables on the document root
 * Also manages the .dark class based on theme luminance
 */
export function applyTheme(theme: ThemeConfig): void {
  const root = document.documentElement;

  // Apply all theme colors to CSS variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssVar = CSS_VAR_MAPPING[key as keyof ThemeConfig['colors']];
    if (cssVar) {
      root.style.setProperty(cssVar, value);
    }
  });

  // Handle dark mode class based on theme luminance
  if (isLightTheme(theme)) {
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
  }
}

/**
 * Determines if a theme is light or dark based on background color luminance
 * Uses relative luminance formula from WCAG 2.0
 */
export function isLightTheme(theme: ThemeConfig): boolean {
  const bg = theme.colors.background;

  // Handle hex colors
  if (bg.startsWith('#')) {
    const hex = bg.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    // Calculate relative luminance (WCAG 2.0 formula)
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    return luminance > 0.5;
  }

  // For rgba/oklch/other formats, assume dark (most themes are dark)
  // Could be enhanced with more sophisticated color parsing if needed
  return false;
}

/**
 * LocalStorage key for active theme name
 */
const ACTIVE_THEME_KEY = 'pocket-architect-active-theme';

/**
 * Retrieves the active theme name from localStorage
 */
export function getActiveThemeName(): string {
  if (typeof window === 'undefined') return 'pocket-dark';
  return localStorage.getItem(ACTIVE_THEME_KEY) || 'pocket-dark';
}

/**
 * Persists the active theme name to localStorage
 */
export function setActiveThemeName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_THEME_KEY, name);
}

/**
 * Resolves a CSS variable to its actual color value
 * Useful for inline styles that require real color values (SVG, charts, etc.)
 */
export function resolveColor(cssVar: string): string {
  if (typeof window === 'undefined') return cssVar;

  // If it's a CSS variable reference (var(--variable-name))
  if (cssVar.startsWith('var(')) {
    const varName = cssVar.replace('var(', '').replace(')', '').trim();
    return getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
  }

  // If it's already a color value, return as-is
  return cssVar;
}
