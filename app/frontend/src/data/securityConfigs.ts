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
  securityGroups: string[];
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

// Mock security configurations
// In a real app, this would come from an API or database
export const securityConfigurations: SecurityConfig[] = [
  {
    id: 1,
    name: 'Production Config',
    description: 'Security settings for production environment',
    type: 'built-in',
    keyPair: 'prod-keypair',
    certType: 'acm',
    securityGroups: ['web-sg', 'db-sg'],
    iamRole: 'ec2-production-role',
    network: {
      useDefaultVpc: false,
      customCidr: '10.0.0.0/16',
      isolation: 'hybrid',
    },
    loadBalancer: true,
    publicIp: true,
    inboundPorts: [
      { port: 80, protocol: 'TCP', description: 'HTTP' },
      { port: 443, protocol: 'TCP', description: 'HTTPS' },
      { port: 22, protocol: 'TCP', description: 'SSH (admin only)' },
    ],
    outboundRules: 'Allow all outbound traffic',
    storageAccess: {
      s3: true,
      description: 'Read/Write access to application assets bucket',
    },
    tags: ['production', 'web', 'secure'],
  },
  {
    id: 2,
    name: 'Development Config',
    description: 'Security settings for dev environment',
    type: 'user',
    keyPair: 'dev-keypair',
    certType: 'none',
    securityGroups: ['dev-sg'],
    iamRole: null,
    network: {
      useDefaultVpc: true,
      isolation: 'public',
    },
    loadBalancer: false,
    publicIp: true,
    inboundPorts: [
      { port: 22, protocol: 'TCP', description: 'SSH' },
      { port: 8080, protocol: 'TCP', description: 'Dev Server' },
      { port: 3000, protocol: 'TCP', description: 'React Dev' },
    ],
    outboundRules: 'Allow all outbound traffic',
    storageAccess: {
      s3: false,
      description: 'No storage access',
    },
    tags: ['development', 'testing'],
  },
];

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
