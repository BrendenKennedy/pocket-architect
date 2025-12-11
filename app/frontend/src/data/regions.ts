// ============================================================================
// POCKET ARCHITECT - REGION DATA
// ============================================================================
// Centralized region definitions for AWS, GCP, and Azure
// ============================================================================

import type { Region, Platform } from '../types/models';

// AWS Regions
export const awsRegions: Region[] = [
  { value: 'global', label: '🌍 Global (All Regions)' },
  { value: 'us-east-1', label: 'US East (N. Virginia) - us-east-1' },
  { value: 'us-east-2', label: 'US East (Ohio) - us-east-2' },
  { value: 'us-west-1', label: 'US West (N. California) - us-west-1' },
  { value: 'us-west-2', label: 'US West (Oregon) - us-west-2' },
  { value: 'af-south-1', label: 'Africa (Cape Town) - af-south-1' },
  { value: 'ap-east-1', label: 'Asia Pacific (Hong Kong) - ap-east-1' },
  { value: 'ap-south-1', label: 'Asia Pacific (Mumbai) - ap-south-1' },
  { value: 'ap-south-2', label: 'Asia Pacific (Hyderabad) - ap-south-2' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo) - ap-northeast-1' },
  { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul) - ap-northeast-2' },
  { value: 'ap-northeast-3', label: 'Asia Pacific (Osaka) - ap-northeast-3' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore) - ap-southeast-1' },
  { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney) - ap-southeast-2' },
  { value: 'ap-southeast-3', label: 'Asia Pacific (Jakarta) - ap-southeast-3' },
  { value: 'ap-southeast-4', label: 'Asia Pacific (Melbourne) - ap-southeast-4' },
  { value: 'ca-central-1', label: 'Canada (Central) - ca-central-1' },
  { value: 'ca-west-1', label: 'Canada (Calgary) - ca-west-1' },
  { value: 'eu-central-1', label: 'Europe (Frankfurt) - eu-central-1' },
  { value: 'eu-central-2', label: 'Europe (Zurich) - eu-central-2' },
  { value: 'eu-west-1', label: 'Europe (Ireland) - eu-west-1' },
  { value: 'eu-west-2', label: 'Europe (London) - eu-west-2' },
  { value: 'eu-west-3', label: 'Europe (Paris) - eu-west-3' },
  { value: 'eu-north-1', label: 'Europe (Stockholm) - eu-north-1' },
  { value: 'eu-south-1', label: 'Europe (Milan) - eu-south-1' },
  { value: 'eu-south-2', label: 'Europe (Spain) - eu-south-2' },
  { value: 'il-central-1', label: 'Israel (Tel Aviv) - il-central-1' },
  { value: 'me-south-1', label: 'Middle East (Bahrain) - me-south-1' },
  { value: 'me-central-1', label: 'Middle East (UAE) - me-central-1' },
  { value: 'sa-east-1', label: 'South America (São Paulo) - sa-east-1' },
];

// GCP Regions
export const gcpRegions: Region[] = [
  { value: 'global', label: '🌍 Global (All Regions)' },
  { value: 'us-central1', label: 'US Central (Iowa) - us-central1' },
  { value: 'us-east1', label: 'US East (South Carolina) - us-east1' },
  { value: 'us-east4', label: 'US East (N. Virginia) - us-east4' },
  { value: 'us-east5', label: 'US East (Columbus) - us-east5' },
  { value: 'us-south1', label: 'US South (Dallas) - us-south1' },
  { value: 'us-west1', label: 'US West (Oregon) - us-west1' },
  { value: 'us-west2', label: 'US West (Los Angeles) - us-west2' },
  { value: 'us-west3', label: 'US West (Salt Lake City) - us-west3' },
  { value: 'us-west4', label: 'US West (Las Vegas) - us-west4' },
  { value: 'northamerica-northeast1', label: 'Canada (Montreal) - northamerica-northeast1' },
  { value: 'northamerica-northeast2', label: 'Canada (Toronto) - northamerica-northeast2' },
  { value: 'southamerica-east1', label: 'South America (São Paulo) - southamerica-east1' },
  { value: 'southamerica-west1', label: 'South America (Santiago) - southamerica-west1' },
  { value: 'europe-central2', label: 'Europe (Warsaw) - europe-central2' },
  { value: 'europe-north1', label: 'Europe (Finland) - europe-north1' },
  { value: 'europe-southwest1', label: 'Europe (Madrid) - europe-southwest1' },
  { value: 'europe-west1', label: 'Europe (Belgium) - europe-west1' },
  { value: 'europe-west2', label: 'Europe (London) - europe-west2' },
  { value: 'europe-west3', label: 'Europe (Frankfurt) - europe-west3' },
  { value: 'europe-west4', label: 'Europe (Netherlands) - europe-west4' },
  { value: 'europe-west6', label: 'Europe (Zurich) - europe-west6' },
  { value: 'europe-west8', label: 'Europe (Milan) - europe-west8' },
  { value: 'europe-west9', label: 'Europe (Paris) - europe-west9' },
  { value: 'asia-east1', label: 'Asia Pacific (Taiwan) - asia-east1' },
  { value: 'asia-east2', label: 'Asia Pacific (Hong Kong) - asia-east2' },
  { value: 'asia-northeast1', label: 'Asia Pacific (Tokyo) - asia-northeast1' },
  { value: 'asia-northeast2', label: 'Asia Pacific (Osaka) - asia-northeast2' },
  { value: 'asia-northeast3', label: 'Asia Pacific (Seoul) - asia-northeast3' },
  { value: 'asia-south1', label: 'Asia Pacific (Mumbai) - asia-south1' },
  { value: 'asia-south2', label: 'Asia Pacific (Delhi) - asia-south2' },
  { value: 'asia-southeast1', label: 'Asia Pacific (Singapore) - asia-southeast1' },
  { value: 'asia-southeast2', label: 'Asia Pacific (Jakarta) - asia-southeast2' },
  { value: 'australia-southeast1', label: 'Australia (Sydney) - australia-southeast1' },
  { value: 'australia-southeast2', label: 'Australia (Melbourne) - australia-southeast2' },
  { value: 'me-central1', label: 'Middle East (Doha) - me-central1' },
  { value: 'me-west1', label: 'Middle East (Tel Aviv) - me-west1' },
];

// Azure Regions
export const azureRegions: Region[] = [
  { value: 'global', label: '🌍 Global (All Regions)' },
  { value: 'eastus', label: 'East US (Virginia) - eastus' },
  { value: 'eastus2', label: 'East US 2 (Virginia) - eastus2' },
  { value: 'westus', label: 'West US (California) - westus' },
  { value: 'westus2', label: 'West US 2 (Washington) - westus2' },
  { value: 'westus3', label: 'West US 3 (Arizona) - westus3' },
  { value: 'centralus', label: 'Central US (Iowa) - centralus' },
  { value: 'northcentralus', label: 'North Central US (Illinois) - northcentralus' },
  { value: 'southcentralus', label: 'South Central US (Texas) - southcentralus' },
  { value: 'westcentralus', label: 'West Central US (Wyoming) - westcentralus' },
  { value: 'canadacentral', label: 'Canada Central (Toronto) - canadacentral' },
  { value: 'canadaeast', label: 'Canada East (Quebec) - canadaeast' },
  { value: 'brazilsouth', label: 'Brazil South (São Paulo) - brazilsouth' },
  { value: 'northeurope', label: 'North Europe (Ireland) - northeurope' },
  { value: 'westeurope', label: 'West Europe (Netherlands) - westeurope' },
  { value: 'uksouth', label: 'UK South (London) - uksouth' },
  { value: 'ukwest', label: 'UK West (Cardiff) - ukwest' },
  { value: 'francecentral', label: 'France Central (Paris) - francecentral' },
  { value: 'francesouth', label: 'France South (Marseille) - francesouth' },
  { value: 'germanywestcentral', label: 'Germany West Central (Frankfurt) - germanywestcentral' },
  { value: 'germanynorth', label: 'Germany North (Berlin) - germanynorth' },
  { value: 'norwayeast', label: 'Norway East (Oslo) - norwayeast' },
  { value: 'norwaywest', label: 'Norway West (Stavanger) - norwaywest' },
  { value: 'switzerlandnorth', label: 'Switzerland North (Zurich) - switzerlandnorth' },
  { value: 'switzerlandwest', label: 'Switzerland West (Geneva) - switzerlandwest' },
  { value: 'swedencentral', label: 'Sweden Central (Gävle) - swedencentral' },
  { value: 'polandcentral', label: 'Poland Central (Warsaw) - polandcentral' },
  { value: 'spaincentral', label: 'Spain Central (Madrid) - spaincentral' },
  { value: 'italynorth', label: 'Italy North (Milan) - italynorth' },
  { value: 'eastasia', label: 'East Asia (Hong Kong) - eastasia' },
  { value: 'southeastasia', label: 'Southeast Asia (Singapore) - southeastasia' },
  { value: 'japaneast', label: 'Japan East (Tokyo) - japaneast' },
  { value: 'japanwest', label: 'Japan West (Osaka) - japanwest' },
  { value: 'koreacentral', label: 'Korea Central (Seoul) - koreacentral' },
  { value: 'koreasouth', label: 'Korea South (Busan) - koreasouth' },
  { value: 'centralindia', label: 'Central India (Pune) - centralindia' },
  { value: 'southindia', label: 'South India (Chennai) - southindia' },
  { value: 'westindia', label: 'West India (Mumbai) - westindia' },
  { value: 'australiaeast', label: 'Australia East (Sydney) - australiaeast' },
  { value: 'australiasoutheast', label: 'Australia Southeast (Melbourne) - australiasoutheast' },
  { value: 'australiacentral', label: 'Australia Central (Canberra) - australiacentral' },
  { value: 'uaenorth', label: 'UAE North (Dubai) - uaenorth' },
  { value: 'uaecentral', label: 'UAE Central (Abu Dhabi) - uaecentral' },
  { value: 'southafricanorth', label: 'South Africa North (Johannesburg) - southafricanorth' },
  { value: 'southafricawest', label: 'South Africa West (Cape Town) - southafricawest' },
];

/**
 * Get regions for a specific platform
 */
export function getRegionsForPlatform(platform: Platform): Region[] {
  switch (platform) {
    case 'aws':
      return awsRegions;
    case 'gcp':
      return gcpRegions;
    case 'azure':
      return azureRegions;
    default:
      return awsRegions;
  }
}

/**
 * Get the default region for a platform (first non-global region)
 */
export function getDefaultRegion(platform: Platform): string {
  const regions = getRegionsForPlatform(platform);
  return regions[1]?.value || regions[0].value;
}
