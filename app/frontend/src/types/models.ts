// ============================================================================
// POCKET ARCHITECT - CORE DATA MODELS
// ============================================================================
// Centralized type definitions for all entities in the application.
// These types serve as the contract between frontend and backend.
// ============================================================================

// ----------------------------------------------------------------------------
// COMMON TYPES
// ----------------------------------------------------------------------------

export type Platform = 'aws' | 'gcp' | 'azure';
export type Status = 'healthy' | 'degraded' | 'stopped' | 'error';
export type WorkloadType = 'general' | 'compute' | 'memory' | 'storage' | 'gpu';
export type IsolationType = 'public' | 'private' | 'hybrid';

export interface Region {
  value: string;
  label: string;
}

export interface Tag {
  key: string;
  value: string;
}

// ----------------------------------------------------------------------------
// PROJECT
// ----------------------------------------------------------------------------

export interface Project {
  id: number;
  name: string;
  description: string;
  status: Status;
  instanceCount: number;
  color: string;
  instances: number[]; // Array of instance IDs
  created: string;
  monthlyCost: number;
  vpc: string;
  platform: Platform;
  region: string;
  lastModified: string;
  tags: string[];
  costMonthToDate: number;
  costLifetime: number;
  costLimit: number;
  uptimeDays: number;
}

export interface CreateProjectRequest {
  name: string;
  description: string;
  platform: Platform;
  region: string;
  vpc?: string;
  color?: string;
  tags?: string[];
  costLimit?: number;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  tags?: string[];
  costLimit?: number;
}

// ----------------------------------------------------------------------------
// INSTANCE
// ----------------------------------------------------------------------------

export interface Instance {
  id: number;
  name: string;
  projectId: number;
  projectName: string;
  projectColor: string;
  status: Status;
  instanceType: string;
  platform: Platform;
  region: string;
  publicIp: string | null;
  privateIp: string;
  created: string;
  uptime: string;
  monthlyCost: number;
  storage: number;
  securityConfig: string;
  sshKey: string;
  tags: string[];
}

export interface CreateInstanceRequest {
  name: string;
  projectId: number;
  instanceType: string;
  platform: Platform;
  region: string;
  storage: number;
  securityConfigId: number;
  sshKey: string;
  publicIp?: boolean;
  tags?: string[];
}

export interface UpdateInstanceRequest {
  name?: string;
  instanceType?: string;
  storage?: number;
  tags?: string[];
}

// ----------------------------------------------------------------------------
// BLUEPRINT
// ----------------------------------------------------------------------------

export interface Blueprint {
  id: number;
  name: string;
  description: string;
  useCase: string;
  category: 'web' | 'compute' | 'database' | 'storage' | 'development';
  platform: Platform;
  region: string;
  instanceType: string;
  storage: number;
  workloadType: WorkloadType;
  created: string;
  lastModified: string;
  usageCount: number;
  tags: string[];
  securityConfigId?: number;
}

export interface CreateBlueprintRequest {
  name: string;
  description: string;
  useCase: string;
  category: string;
  platform: Platform;
  region: string;
  instanceType: string;
  storage: number;
  workloadType: WorkloadType;
  securityConfigId?: number;
  tags?: string[];
}

export interface UpdateBlueprintRequest {
  name?: string;
  description?: string;
  useCase?: string;
  instanceType?: string;
  storage?: number;
  tags?: string[];
}

// ----------------------------------------------------------------------------
// SECURITY CONFIGURATION
// ----------------------------------------------------------------------------

export interface InboundPort {
  port: number | string;
  protocol: string;
  description: string;
}

export interface NetworkConfig {
  useDefaultVpc: boolean;
  customCidr?: string;
  isolation: IsolationType;
}

export interface StorageAccess {
  s3: boolean;
  description: string;
}

export interface SecurityConfig {
  id: number;
  name: string;
  description: string;
  type: 'built-in' | 'user';
  keyPair: string;
  certType: 'acm' | 'none' | 'custom';
  firewallRules: string[];
  iamRole: string | null;
  network?: NetworkConfig;
  loadBalancer?: boolean;
  publicIp?: boolean;
  inboundPorts?: InboundPort[];
  outboundRules?: string;
  storageAccess?: StorageAccess;
  tags?: string[];
}

export interface CreateSecurityConfigRequest {
  name: string;
  description: string;
  keyPair: string;
  certType: 'acm' | 'none' | 'custom';
  firewallRules: string[];
  iamRole?: string;
  network?: NetworkConfig;
  loadBalancer?: boolean;
  publicIp?: boolean;
  inboundPorts?: InboundPort[];
  outboundRules?: string;
  storageAccess?: StorageAccess;
  tags?: string[];
}

// ----------------------------------------------------------------------------
// IMAGE (AMI/Custom Images)
// ----------------------------------------------------------------------------

export interface Image {
  id: number;
  name: string;
  description: string;
  imageId: string;
  platform: Platform;
  region: string;
  os: string;
  architecture: 'x86_64' | 'arm64';
  size: number;
  created: string;
  lastModified: string;
  status: 'available' | 'pending' | 'failed';
  tags: string[];
  public: boolean;
  sourceInstanceId?: number;
}

export interface CreateImageRequest {
  name: string;
  description: string;
  platform: Platform;
  region: string;
  sourceInstanceId?: number;
  tags?: string[];
}

// ----------------------------------------------------------------------------
// ACCOUNT
// ----------------------------------------------------------------------------

export interface Account {
  id: number;
  name: string;
  platform: Platform;
  accountId: string;
  status: 'connected' | 'disconnected' | 'error';
  region: string;
  accessKey?: string;
  isDefault: boolean;
  created: string;
  lastSynced: string;
  resourceCount: {
    projects: number;
    instances: number;
    images: number;
  };
}

export interface CreateAccountRequest {
  name: string;
  platform: Platform;
  accountId: string;
  region: string;
  accessKey: string;
  secretKey: string;
  isDefault?: boolean;
}

// ----------------------------------------------------------------------------
// COST MANAGEMENT
// ----------------------------------------------------------------------------

export interface CostData {
  date: string;
  compute: number;
  storage: number;
  network: number;
  other: number;
}

export interface BudgetAlert {
  id: number;
  name: string;
  threshold: number;
  currentSpend: number;
  period: 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
}

export interface CostByService {
  service: string;
  cost: number;
  percentage: number;
}

export interface CostSummary {
  currentMonth: number;
  lastMonth: number;
  projectedMonth: number;
  byService: CostByService[];
  dailyData: CostData[];
}

// ----------------------------------------------------------------------------
// LEARNING
// ----------------------------------------------------------------------------

export interface LearningModule {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  progress: number;
  status: 'not-started' | 'in-progress' | 'completed';
  icon: any; // Lucide icon component
  topics: string[];
}

// ----------------------------------------------------------------------------
// API RESPONSE WRAPPERS
// ----------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}

export interface ListOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}
