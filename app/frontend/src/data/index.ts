// ============================================================================
// POCKET ARCHITECT - DATA EXPORTS
// ============================================================================
// Central export point for all shared data
// ============================================================================

export {
  // Security Configurations
  securityConfigurations,
  getSecurityConfigById,
  getSecurityConfigOptions,
  type SecurityConfig,
} from './securityConfigs';

export {
  // Region Data
  awsRegions,
  gcpRegions,
  azureRegions,
  getRegionsForPlatform,
  getDefaultRegion,
} from './regions';
