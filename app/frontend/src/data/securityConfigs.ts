// Shared security configuration data structure
// This is the single source of truth for security configurations
// Used by both Security.tsx and Blueprints.tsx

export interface SecurityConfig {
  id: number;
  name: string;
  description: string;
  type: 'built-in' | 'user';
  keyPair: string;
  certType: 'acm' | 'none' | 'custom';
  firewallRules: string[];
  iamRole: string | null;
  // Extended fields for blueprint usage
  network?: {
    useDefaultVpc: boolean;
    customCidr?: string;
    isolation: 'public' | 'private' | 'hybrid';
  };
  loadBalancer?: boolean;
  publicIp?: boolean;
  inboundPorts?: Array<{ port: number | string; protocol: string; description: string }>;
  outboundRules?: string;
  storageAccess?: {
    s3: boolean;
    description: string;
  };
  tags?: string[];
}

// Security configurations - populated from API
export const securityConfigurations: SecurityConfig[] = [];

// Helper function to get a security config by ID
export function getSecurityConfigById(id: number): SecurityConfig | undefined {
  return securityConfigurations.find(config => config.id === id);
}

// Helper function to get all security config names for dropdown
export function getSecurityConfigOptions(): Array<{ value: number; label: string }> {
  return securityConfigurations.map(config => ({
    value: config.id,
    label: config.name,
  }));
}
