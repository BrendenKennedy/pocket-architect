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
    resourceViewMode: 'cards' | 'table' | 'list';
    itemsPerPage: number;
    showProjectStats: boolean;
  };

  // Notification Settings
  notifications: {
    healthChecks: boolean;
    accountReconnect: boolean;
    costWarnings: {
      enabled: boolean;
      thresholds: number[];
    };
    quotaWarnings: {
      enabled: boolean;
      thresholds: number[];
    };
    toastDuration: number; // seconds
    desktopNotifications: boolean;
  };

  // Cloud Provider Settings
  cloudProviders: {
    aws: {
      defaultRegion: string;
      profile: string;
      credentialCacheDuration: number; // minutes
    };
    gcp: {
      defaultRegion: string;
      projectId: string;
    };
    azure: {
      defaultRegion: string;
      subscriptionId: string;
    };
  };

  // Project Settings
  projects: {
    defaultInstanceType: string;
    defaultSnapshotRetention: number; // days
    autoTagNewResources: boolean;
    confirmDestructiveActions: boolean;
  };

  // Performance Settings
  performance: {
    cacheDuration: number; // minutes
    concurrentApiCalls: number;
    enableRequestBatching: boolean;
  };

  // Security Settings
  security: {
    autoLockAfterInactivity: number; // minutes, 0 = disabled
    requireConfirmationForDelete: boolean;
    enableAuditLogging: boolean;
  };

  // Advanced Settings
  advanced: {
    debugMode: boolean;
    loggingLevel: 'error' | 'warn' | 'info' | 'debug';
    showRawApiResponses: boolean;
    enableDevTools: boolean;
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
    resourceViewMode: 'cards',
    itemsPerPage: 20,
    showProjectStats: true,
  },

  notifications: {
    healthChecks: true,
    accountReconnect: true,
    costWarnings: {
      enabled: true,
      thresholds: [50, 80, 90, 95, 100],
    },
    quotaWarnings: {
      enabled: true,
      thresholds: [50, 80, 90, 95, 100],
    },
    toastDuration: 10,
    desktopNotifications: true,
  },

  cloudProviders: {
    aws: {
      defaultRegion: 'us-east-1',
      profile: 'default',
      credentialCacheDuration: 60,
    },
    gcp: {
      defaultRegion: 'us-central1',
      projectId: '',
    },
    azure: {
      defaultRegion: 'eastus',
      subscriptionId: '',
    },
  },

  projects: {
    defaultInstanceType: 't3.micro',
    defaultSnapshotRetention: 30,
    autoTagNewResources: true,
    confirmDestructiveActions: true,
  },

  performance: {
    cacheDuration: 5,
    concurrentApiCalls: 5,
    enableRequestBatching: true,
  },

  security: {
    autoLockAfterInactivity: 0,
    requireConfirmationForDelete: true,
    enableAuditLogging: false,
  },

  advanced: {
    debugMode: false,
    loggingLevel: 'info',
    showRawApiResponses: false,
    enableDevTools: false,
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
