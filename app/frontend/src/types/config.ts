/**
 * App Configuration Types
 *
 * Defines the structure for all persisted user preferences and settings.
 * These settings are saved to localStorage and restored on app launch.
 */

import type { Platform } from './models';
import type { Page } from '../App';

/**
 * Main application configuration interface
 */
export interface AppConfig {
  // Version for migrations
  version: string;

  // Appearance Settings
  appearance: {
    theme: string;
    fontFamily: string;
    textSize: number;
    neonIntensity: number;
  };

  // Platform & Region Settings
  platform: {
    selected: Platform;
    defaultRegion: Record<Platform, string>;
  };

  // UI State
  ui: {
    lastActivePage: Page;
    sidebarCollapsed: boolean;
  };

  // Dashboard Settings
  dashboard: {
    quotaSelections: Record<string, string[]>;
    autoRefreshInterval: number; // seconds, 0 = disabled
  };

  // AWS Configuration
  aws: {
    defaultRegion: string;
  };

  // Timestamps
  lastModified: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: AppConfig = {
  version: '1.0.0',

  appearance: {
    theme: 'pocket-dark',
    fontFamily: 'system',
    textSize: 100,
    neonIntensity: 1.0,
  },

  platform: {
    selected: 'aws',
    defaultRegion: {
      aws: 'us-east-1',
      gcp: 'us-central1',
      azure: 'eastus',
    },
  },

  ui: {
    lastActivePage: 'dashboard',
    sidebarCollapsed: false,
  },

  dashboard: {
    quotaSelections: {},
    autoRefreshInterval: 30,
  },

  aws: {
    defaultRegion: 'us-east-1',
  },

  lastModified: new Date().toISOString(),
};

/**
 * Partial config for updates
 */
export type PartialAppConfig = DeepPartial<AppConfig>;

// Utility type for deep partial
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
