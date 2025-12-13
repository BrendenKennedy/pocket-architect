/**
 * Configuration Service
 *
 * Manages application configuration persistence to config file via backend.
 * Provides type-safe getters/setters for all app settings.
 *
 * Features:
 * - Automatic config file sync via backend API
 * - Deep merge for partial updates
 * - Export/Import config as JSON
 * - Migration support for future versions
 */

import { AppConfig, DEFAULT_CONFIG, PartialAppConfig } from '../types/config';
import { bridgeApi } from '../bridge/api';

const CONFIG_VERSION = '1.0.0';

/**
 * Loads the full config from backend file storage
 * Returns default config if none exists or if corrupted
 */
export async function loadConfig(): Promise<AppConfig> {
  if (typeof window === 'undefined') {
    return DEFAULT_CONFIG;
  }

  try {
    const stored = await bridgeApi.loadConfig();
    if (!stored || stored === '{}') {
      return DEFAULT_CONFIG;
    }

    const parsed = JSON.parse(stored) as AppConfig;

    // Validate version and migrate if needed
    if (parsed.version !== CONFIG_VERSION) {
      return migrateConfig(parsed);
    }

    // Merge with defaults to ensure all fields exist
    return deepMerge(DEFAULT_CONFIG, parsed);
  } catch (error) {
    console.error('Failed to load config, using defaults:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Saves the full config to backend file storage
 */
export async function saveConfig(config: AppConfig): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const toSave = {
      ...config,
      version: CONFIG_VERSION,
      lastModified: new Date().toISOString(),
    };
    await bridgeApi.saveConfig(JSON.stringify(toSave, null, 2));
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

/**
 * Updates config with partial values
 * Deep merges the changes with existing config
 */
export async function updateConfig(partial: PartialAppConfig): Promise<AppConfig> {
  const current = await loadConfig();
  const updated = deepMerge(current, partial);
  await saveConfig(updated);
  return updated;
}

/**
 * Gets a specific config value by path
 */
export async function getConfigValue<T>(path: string): Promise<T> {
  const config = await loadConfig();
  const keys = path.split('.');
  let value: any = config;

  for (const key of keys) {
    value = value?.[key];
  }

  return value as T;
}

/**
 * Sets a specific config value by path
 */
export async function setConfigValue(path: string, value: any): Promise<void> {
  const config = await loadConfig();
  const keys = path.split('.');
  let target: any = config;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!target[key] || typeof target[key] !== 'object') {
      target[key] = {};
    }
    target = target[key];
  }

  target[keys[keys.length - 1]] = value;
  await saveConfig(config);
}

/**
 * Resets config to defaults
 */
export async function resetConfig(): Promise<AppConfig> {
  const fresh = { ...DEFAULT_CONFIG };
  await saveConfig(fresh);
  return fresh;
}

/**
 * Exports config as JSON string
 */
export async function exportConfig(): Promise<string> {
  const config = await loadConfig();
  return JSON.stringify(config, null, 2);
}

/**
 * Imports config from JSON string
 */
export async function importConfig(jsonString: string): Promise<AppConfig> {
  try {
    const parsed = JSON.parse(jsonString) as AppConfig;
    const validated = deepMerge(DEFAULT_CONFIG, parsed);
    await saveConfig(validated);
    return validated;
  } catch (error) {
    console.error('Failed to import config:', error);
    throw new Error('Invalid config JSON');
  }
}

/**
 * Migrates old config versions to current version
 */
function migrateConfig(oldConfig: any): AppConfig {
  // For now, just merge with defaults
  // In future versions, add specific migration logic
  console.log('Migrating config from', oldConfig.version, 'to', CONFIG_VERSION);
  return deepMerge(DEFAULT_CONFIG, oldConfig);
}

/**
 * Deep merge two objects
 */
function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(targetValue, sourceValue as any);
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as any;
      }
    }
  }

  return result;
}

/**
 * Convenience getters for common config values
 */
export const configGetters = {
  // Appearance
  getTheme: () => getConfigValue<string>('appearance.theme'),
  getFontFamily: () => getConfigValue<string>('appearance.fontFamily'),
  getTextSize: () => getConfigValue<number>('appearance.textSize'),
  getNeonIntensity: () => getConfigValue<number>('appearance.neonIntensity'),

  // Platform
  getSelectedPlatform: () => getConfigValue<string>('platform.selected'),
  getDefaultRegion: (platform: string) =>
    getConfigValue<string>(`platform.defaultRegion.${platform}`),

  // UI
  getLastActivePage: () => getConfigValue<string>('ui.lastActivePage'),
  getSidebarCollapsed: () => getConfigValue<boolean>('ui.sidebarCollapsed'),

  // Dashboard
  getAutoRefreshInterval: () => getConfigValue<number>('dashboard.autoRefreshInterval'),
  getQuotaSelections: () => getConfigValue<Record<string, string[]>>('dashboard.quotaSelections'),
  getResourceViewMode: () => getConfigValue<'cards' | 'table' | 'list'>('dashboard.resourceViewMode'),
  getItemsPerPage: () => getConfigValue<number>('dashboard.itemsPerPage'),
  getShowProjectStats: () => getConfigValue<boolean>('dashboard.showProjectStats'),

  // Notifications
  getHealthCheckAlerts: () => getConfigValue<boolean>('notifications.healthChecks'),
  getAccountReconnectAlerts: () => getConfigValue<boolean>('notifications.accountReconnect'),
  getCostWarnings: () => getConfigValue<{enabled: boolean, thresholds: number[]}>('notifications.costWarnings'),
  getQuotaWarnings: () => getConfigValue<{enabled: boolean, thresholds: number[]}>('notifications.quotaWarnings'),
  getToastDuration: () => getConfigValue<number>('notifications.toastDuration'),
  getDesktopNotifications: () => getConfigValue<boolean>('notifications.desktopNotifications'),

  // Cloud Providers
  getAwsProfile: () => getConfigValue<string>('cloudProviders.aws.profile'),
  getAwsDefaultRegion: () => getConfigValue<string>('cloudProviders.aws.defaultRegion'),
  getAwsCredentialCacheDuration: () => getConfigValue<number>('cloudProviders.aws.credentialCacheDuration'),
  getGcpProjectId: () => getConfigValue<string>('cloudProviders.gcp.projectId'),
  getGcpDefaultRegion: () => getConfigValue<string>('cloudProviders.gcp.defaultRegion'),
  getAzureSubscriptionId: () => getConfigValue<string>('cloudProviders.azure.subscriptionId'),
  getAzureDefaultRegion: () => getConfigValue<string>('cloudProviders.azure.defaultRegion'),

  // Projects
  getDefaultInstanceType: () => getConfigValue<string>('projects.defaultInstanceType'),
  getDefaultSnapshotRetention: () => getConfigValue<number>('projects.defaultSnapshotRetention'),
  getAutoTagNewResources: () => getConfigValue<boolean>('projects.autoTagNewResources'),
  getConfirmDestructiveActions: () => getConfigValue<boolean>('projects.confirmDestructiveActions'),

  // Performance
  getCacheDuration: () => getConfigValue<number>('performance.cacheDuration'),
  getConcurrentApiCalls: () => getConfigValue<number>('performance.concurrentApiCalls'),
  getEnableRequestBatching: () => getConfigValue<boolean>('performance.enableRequestBatching'),

  // Security
  getAutoLockAfterInactivity: () => getConfigValue<number>('security.autoLockAfterInactivity'),
  getRequireConfirmationForDelete: () => getConfigValue<boolean>('security.requireConfirmationForDelete'),
  getEnableAuditLogging: () => getConfigValue<boolean>('security.enableAuditLogging'),

  // Advanced
  getDebugMode: () => getConfigValue<boolean>('advanced.debugMode'),
  getLoggingLevel: () => getConfigValue<'error' | 'warn' | 'info' | 'debug'>('advanced.loggingLevel'),
  getShowRawApiResponses: () => getConfigValue<boolean>('advanced.showRawApiResponses'),
  getEnableDevTools: () => getConfigValue<boolean>('advanced.enableDevTools'),
};

/**
 * Convenience setters for common config values
 */
export const configSetters = {
  // Appearance
  setTheme: async (theme: string) => await setConfigValue('appearance.theme', theme),
  setFontFamily: async (font: string) => await setConfigValue('appearance.fontFamily', font),
  setTextSize: async (size: number) => await setConfigValue('appearance.textSize', size),
  setNeonIntensity: async (intensity: number) => await setConfigValue('appearance.neonIntensity', intensity),

  // Platform
  setSelectedPlatform: async (platform: string) => await setConfigValue('platform.selected', platform),
  setDefaultRegion: async (platform: string, region: string) =>
    await setConfigValue(`platform.defaultRegion.${platform}`, region),

  // UI
  setLastActivePage: async (page: string) => await setConfigValue('ui.lastActivePage', page),
  setSidebarCollapsed: async (collapsed: boolean) => await setConfigValue('ui.sidebarCollapsed', collapsed),

  // Dashboard
  setAutoRefreshInterval: async (interval: number) =>
    await setConfigValue('dashboard.autoRefreshInterval', interval),
  setQuotaSelections: async (selections: Record<string, string[]>) =>
    await setConfigValue('dashboard.quotaSelections', selections),
  setResourceViewMode: async (mode: 'cards' | 'table' | 'list') =>
    await setConfigValue('dashboard.resourceViewMode', mode),
  setItemsPerPage: async (items: number) => await setConfigValue('dashboard.itemsPerPage', items),
  setShowProjectStats: async (show: boolean) => await setConfigValue('dashboard.showProjectStats', show),

  // Notifications
  setHealthCheckAlerts: async (enabled: boolean) =>
    await setConfigValue('notifications.healthChecks', enabled),
  setAccountReconnectAlerts: async (enabled: boolean) =>
    await setConfigValue('notifications.accountReconnect', enabled),
  setCostWarnings: async (enabled: boolean, thresholds?: number[]) =>
    await setConfigValue('notifications.costWarnings', { enabled, thresholds: thresholds || [50, 80, 90, 95, 100] }),
  setQuotaWarnings: async (enabled: boolean, thresholds?: number[]) =>
    await setConfigValue('notifications.quotaWarnings', { enabled, thresholds: thresholds || [50, 80, 90, 95, 100] }),
  setToastDuration: async (duration: number) =>
    await setConfigValue('notifications.toastDuration', duration),
  setDesktopNotifications: async (enabled: boolean) =>
    await setConfigValue('notifications.desktopNotifications', enabled),

  // Cloud Providers
  setAwsProfile: async (profile: string) =>
    await setConfigValue('cloudProviders.aws.profile', profile),
  setAwsDefaultRegion: async (region: string) =>
    await setConfigValue('cloudProviders.aws.defaultRegion', region),
  setAwsCredentialCacheDuration: async (minutes: number) =>
    await setConfigValue('cloudProviders.aws.credentialCacheDuration', minutes),
  setGcpProjectId: async (projectId: string) =>
    await setConfigValue('cloudProviders.gcp.projectId', projectId),
  setGcpDefaultRegion: async (region: string) =>
    await setConfigValue('cloudProviders.gcp.defaultRegion', region),
  setAzureSubscriptionId: async (subscriptionId: string) =>
    await setConfigValue('cloudProviders.azure.subscriptionId', subscriptionId),
  setAzureDefaultRegion: async (region: string) =>
    await setConfigValue('cloudProviders.azure.defaultRegion', region),

  // Projects
  setDefaultInstanceType: async (instanceType: string) =>
    await setConfigValue('projects.defaultInstanceType', instanceType),
  setDefaultSnapshotRetention: async (days: number) =>
    await setConfigValue('projects.defaultSnapshotRetention', days),
  setAutoTagNewResources: async (enabled: boolean) =>
    await setConfigValue('projects.autoTagNewResources', enabled),
  setConfirmDestructiveActions: async (enabled: boolean) =>
    await setConfigValue('projects.confirmDestructiveActions', enabled),

  // Performance
  setCacheDuration: async (minutes: number) =>
    await setConfigValue('performance.cacheDuration', minutes),
  setConcurrentApiCalls: async (limit: number) =>
    await setConfigValue('performance.concurrentApiCalls', limit),
  setEnableRequestBatching: async (enabled: boolean) =>
    await setConfigValue('performance.enableRequestBatching', enabled),

  // Security
  setAutoLockAfterInactivity: async (minutes: number) =>
    await setConfigValue('security.autoLockAfterInactivity', minutes),
  setRequireConfirmationForDelete: async (enabled: boolean) =>
    await setConfigValue('security.requireConfirmationForDelete', enabled),
  setEnableAuditLogging: async (enabled: boolean) =>
    await setConfigValue('security.enableAuditLogging', enabled),

  // Advanced
  setDebugMode: async (enabled: boolean) =>
    await setConfigValue('advanced.debugMode', enabled),
  setLoggingLevel: async (level: 'error' | 'warn' | 'info' | 'debug') =>
    await setConfigValue('advanced.loggingLevel', level),
  setShowRawApiResponses: async (enabled: boolean) =>
    await setConfigValue('advanced.showRawApiResponses', enabled),
  setEnableDevTools: async (enabled: boolean) =>
    await setConfigValue('advanced.enableDevTools', enabled),
};
