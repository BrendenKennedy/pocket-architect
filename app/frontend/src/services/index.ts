// ============================================================================
// POCKET ARCHITECT - SERVICE EXPORTS
// ============================================================================
// Central export point for all API services
// ============================================================================

// Export bridge API (replaces old REST API services)
export { bridgeApi } from '../bridge/api';

// Export config service
export * from './configService';
export { applyTheme, getActiveThemeName, setActiveThemeName, resolveColor } from './themeService';
