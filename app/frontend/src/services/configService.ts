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
  getTheme: () => getConfigValue<string>('appearance.theme'),
  getFontFamily: () => getConfigValue<string>('appearance.fontFamily'),
  getTextSize: () => getConfigValue<number>('appearance.textSize'),
  getNeonIntensity: () => getConfigValue<number>('appearance.neonIntensity'),
  getSelectedPlatform: () => getConfigValue<string>('platform.selected'),
  getDefaultRegion: (platform: string) =>
    getConfigValue<string>(`platform.defaultRegion.${platform}`),
  getLastActivePage: () => getConfigValue<string>('ui.lastActivePage'),
  getAutoRefreshInterval: () => getConfigValue<number>('dashboard.autoRefreshInterval'),
  getQuotaSelections: () =>
    getConfigValue<Record<string, string[]>>('dashboard.quotaSelections'),
};

/**
 * Convenience setters for common config values
 */
export const configSetters = {
  setTheme: async (theme: string) => await setConfigValue('appearance.theme', theme),
  setFontFamily: async (font: string) => await setConfigValue('appearance.fontFamily', font),
  setTextSize: async (size: number) => await setConfigValue('appearance.textSize', size),
  setNeonIntensity: async (intensity: number) => await setConfigValue('appearance.neonIntensity', intensity),
  setSelectedPlatform: async (platform: string) => await setConfigValue('platform.selected', platform),
  setDefaultRegion: async (platform: string, region: string) =>
    await setConfigValue(`platform.defaultRegion.${platform}`, region),
  setLastActivePage: async (page: string) => await setConfigValue('ui.lastActivePage', page),
  setAutoRefreshInterval: async (interval: number) =>
    await setConfigValue('dashboard.autoRefreshInterval', interval),
  setQuotaSelections: async (selections: Record<string, string[]>) =>
    await setConfigValue('dashboard.quotaSelections', selections),
};
