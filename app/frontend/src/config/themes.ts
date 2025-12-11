/**
 * Pocket Architect Theme Configuration System
 * 
 * Centralized theme management with built-in and custom theme support.
 * Themes are stored in localStorage and can be created via wizard or raw JSON config.
 */

export interface ThemeConfig {
  name: string;
  label: string;
  isCustom?: boolean;
  colors: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    destructive: string;
    destructiveForeground: string;
    border: string;
    input: string;
    ring: string;
  };
}

// Built-in themes
export const builtInThemes: ThemeConfig[] = [
  {
    name: 'pocket-dark',
    label: 'Pocket Dark (Default)',
    colors: {
      background: '#0A0A0A',
      foreground: '#E5E7EB',
      card: 'rgba(17, 24, 39, 0.5)',
      cardForeground: '#F3F4F6',
      popover: '#2A1F3D',
      popoverForeground: '#E5E7EB',
      primary: '#A78BFA',
      primaryForeground: '#0F0F0F',
      secondary: 'rgba(31, 41, 55, 0.5)',
      secondaryForeground: '#E5E7EB',
      muted: '#2D2440',
      mutedForeground: '#C4B5FD',
      destructive: '#DC2626',
      destructiveForeground: '#FAFAFA',
      border: '#4A3D64',
      input: '#4A3D64',
      ring: '#A78BFA',
    },
  },
  {
    name: 'vscode-dark',
    label: 'VSCode Dark',
    colors: {
      background: '#1E1E1E',
      foreground: '#D4D4D4',
      card: '#252526',
      cardForeground: '#CCCCCC',
      popover: '#252526',
      popoverForeground: '#CCCCCC',
      primary: '#007ACC',
      primaryForeground: '#FFFFFF',
      secondary: '#3E3E42',
      secondaryForeground: '#CCCCCC',
      muted: '#2D2D30',
      mutedForeground: '#858585',
      destructive: '#F48771',
      destructiveForeground: '#FFFFFF',
      border: '#3E3E42',
      input: '#3E3E42',
      ring: '#007ACC',
    },
  },
  {
    name: 'dracula',
    label: 'Dracula',
    colors: {
      background: '#282A36',
      foreground: '#F8F8F2',
      card: '#44475A',
      cardForeground: '#F8F8F2',
      popover: '#44475A',
      popoverForeground: '#F8F8F2',
      primary: '#BD93F9',
      primaryForeground: '#282A36',
      secondary: '#6272A4',
      secondaryForeground: '#F8F8F2',
      muted: '#44475A',
      mutedForeground: '#6272A4',
      destructive: '#FF5555',
      destructiveForeground: '#F8F8F2',
      border: '#6272A4',
      input: '#6272A4',
      ring: '#BD93F9',
    },
  },
  {
    name: 'catppuccin',
    label: 'Catppuccin Mocha',
    colors: {
      background: '#1E1E2E',
      foreground: '#CDD6F4',
      card: '#313244',
      cardForeground: '#CDD6F4',
      popover: '#313244',
      popoverForeground: '#CDD6F4',
      primary: '#CBA6F7',
      primaryForeground: '#1E1E2E',
      secondary: '#45475A',
      secondaryForeground: '#CDD6F4',
      muted: '#313244',
      mutedForeground: '#6C7086',
      destructive: '#F38BA8',
      destructiveForeground: '#1E1E2E',
      border: '#45475A',
      input: '#45475A',
      ring: '#CBA6F7',
    },
  },
  {
    name: 'gruvbox',
    label: 'Gruvbox Dark',
    colors: {
      background: '#282828',
      foreground: '#EBDBB2',
      card: '#3C3836',
      cardForeground: '#EBDBB2',
      popover: '#3C3836',
      popoverForeground: '#EBDBB2',
      primary: '#FE8019',
      primaryForeground: '#282828',
      secondary: '#504945',
      secondaryForeground: '#EBDBB2',
      muted: '#3C3836',
      mutedForeground: '#928374',
      destructive: '#FB4934',
      destructiveForeground: '#EBDBB2',
      border: '#504945',
      input: '#504945',
      ring: '#FE8019',
    },
  },
  {
    name: 'sand',
    label: 'Sand Professional',
    colors: {
      background: '#2B2520',
      foreground: '#E8DCC8',
      card: '#3D3530',
      cardForeground: '#E8DCC8',
      popover: '#3D3530',
      popoverForeground: '#E8DCC8',
      primary: '#D4A574',
      primaryForeground: '#2B2520',
      secondary: '#4A3F38',
      secondaryForeground: '#E8DCC8',
      muted: '#3D3530',
      mutedForeground: '#A89984',
      destructive: '#E85D3F',
      destructiveForeground: '#E8DCC8',
      border: '#4A3F38',
      input: '#4A3F38',
      ring: '#D4A574',
    },
  },
  {
    name: 'light-pro',
    label: 'Light Professional',
    colors: {
      background: '#F5F5F5',
      foreground: '#1F1F1F',
      card: '#FFFFFF',
      cardForeground: '#1F1F1F',
      popover: '#FFFFFF',
      popoverForeground: '#1F1F1F',
      primary: '#6D28D9',
      primaryForeground: '#FFFFFF',
      secondary: '#E5E5E5',
      secondaryForeground: '#1F1F1F',
      muted: '#E5E5E5',
      mutedForeground: '#737373',
      destructive: '#DC2626',
      destructiveForeground: '#FFFFFF',
      border: '#D4D4D4',
      input: '#D4D4D4',
      ring: '#6D28D9',
    },
  },
];

// Custom themes stored in localStorage
const CUSTOM_THEMES_KEY = 'pocket-architect-custom-themes';

export function getCustomThemes(): ThemeConfig[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(CUSTOM_THEMES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading custom themes:', error);
  }
  
  return [];
}

export function saveCustomTheme(theme: ThemeConfig): void {
  const customThemes = getCustomThemes();
  const existingIndex = customThemes.findIndex(t => t.name === theme.name);
  
  if (existingIndex >= 0) {
    customThemes[existingIndex] = { ...theme, isCustom: true };
  } else {
    customThemes.push({ ...theme, isCustom: true });
  }
  
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(customThemes));
}

export function deleteCustomTheme(themeName: string): void {
  const customThemes = getCustomThemes();
  const filtered = customThemes.filter(t => t.name !== themeName);
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(filtered));
}

export function getAllThemes(): ThemeConfig[] {
  return [...builtInThemes, ...getCustomThemes()];
}

export function getThemeByName(name: string): ThemeConfig | undefined {
  return getAllThemes().find(t => t.name === name);
}

// Theme config boilerplate for raw text editor
export const THEME_CONFIG_BOILERPLATE = `{
  "name": "my-custom-theme",
  "label": "My Custom Theme",
  "colors": {
    "background": "#0A0A0A",
    "foreground": "#E5E7EB",
    "card": "rgba(17, 24, 39, 0.5)",
    "cardForeground": "#F3F4F6",
    "popover": "#2A1F3D",
    "popoverForeground": "#E5E7EB",
    "primary": "#A78BFA",
    "primaryForeground": "#0F0F0F",
    "secondary": "rgba(31, 41, 55, 0.5)",
    "secondaryForeground": "#E5E7EB",
    "muted": "#2D2440",
    "mutedForeground": "#C4B5FD",
    "destructive": "#DC2626",
    "destructiveForeground": "#FAFAFA",
    "border": "#4A3D64",
    "input": "#4A3D64",
    "ring": "#A78BFA"
  }
}`;