// ============================================================================
// POCKET ARCHITECT - API SERVICE LAYER
// ============================================================================
// Centralized API client for backend communication.
// Connects to the FastAPI backend CLI server.
// 
// Environment Configuration:
// - VITE_API_BASE_URL: Backend API URL (default: http://localhost:8000/api)
// - VITE_API_TIMEOUT: Request timeout in ms (default: 30000)
// - VITE_API_DEBUG: Enable request/response logging (default: false)
// 
// Usage:
//   import api from '@/services/api';
//   const response = await api.projects.list();
// ============================================================================

import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  Instance,
  CreateInstanceRequest,
  UpdateInstanceRequest,
  Blueprint,
  CreateBlueprintRequest,
  UpdateBlueprintRequest,
  SecurityConfig,
  CreateSecurityConfigRequest,
  Image,
  CreateImageRequest,
  Account,
  CreateAccountRequest,
  CostSummary,
  BudgetAlert,
  LearningModule,
  ApiResponse,
  PaginatedResponse,
  ListOptions,
} from '../types/models';

// ============================================================================
// BASE API CLIENT
// ============================================================================

class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private debug: boolean;

  constructor(
    baseUrl: string = 'http://localhost:8000/api',
    timeout: number = 30000,
    debug: boolean = false
  ) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.debug = debug;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Request failed',
        };
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

const client = new ApiClient(
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
  import.meta.env.VITE_API_DEBUG === 'true'
);

// ============================================================================
// PROJECT API
// ============================================================================

export const projectApi = {
  /**
   * Get all projects with optional filtering
   */
  list: async (options?: ListOptions): Promise<PaginatedResponse<Project>> => {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.pageSize) params.append('pageSize', options.pageSize.toString());
    if (options?.search) params.append('search', options.search);
    if (options?.sortBy) params.append('sortBy', options.sortBy);
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder);

    const result = await client.get<PaginatedResponse<Project>>(
      `/projects?${params.toString()}`
    );
    
    // For now, return mock pagination structure
    return result.data || {
      success: true,
      data: [],
      pagination: {
        page: 1,
        pageSize: 50,
        totalPages: 1,
        totalItems: 0,
      },
    };
  },

  /**
   * Get a single project by ID
   */
  get: async (id: number): Promise<ApiResponse<Project>> => {
    return client.get<Project>(`/projects/${id}`);
  },

  /**
   * Create a new project
   */
  create: async (data: CreateProjectRequest): Promise<ApiResponse<Project>> => {
    return client.post<Project>('/projects', data);
  },

  /**
   * Update an existing project
   */
  update: async (
    id: number,
    data: UpdateProjectRequest
  ): Promise<ApiResponse<Project>> => {
    return client.put<Project>(`/projects/${id}`, data);
  },

  /**
   * Delete a project
   */
  delete: async (id: number): Promise<ApiResponse<void>> => {
    return client.delete<void>(`/projects/${id}`);
  },

  /**
   * Get instances belonging to a project
   */
  getInstances: async (id: number): Promise<ApiResponse<Instance[]>> => {
    return client.get<Instance[]>(`/projects/${id}/instances`);
  },
};

// ============================================================================
// INSTANCE API
// ============================================================================

export const instanceApi = {
  list: async (options?: ListOptions): Promise<PaginatedResponse<Instance>> => {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.pageSize) params.append('pageSize', options.pageSize.toString());
    if (options?.search) params.append('search', options.search);

    const result = await client.get<PaginatedResponse<Instance>>(
      `/instances?${params.toString()}`
    );
    
    return result.data || {
      success: true,
      data: [],
      pagination: {
        page: 1,
        pageSize: 50,
        totalPages: 1,
        totalItems: 0,
      },
    };
  },

  get: async (id: number): Promise<ApiResponse<Instance>> => {
    return client.get<Instance>(`/instances/${id}`);
  },

  create: async (data: CreateInstanceRequest): Promise<ApiResponse<Instance>> => {
    return client.post<Instance>('/instances', data);
  },

  update: async (
    id: number,
    data: UpdateInstanceRequest
  ): Promise<ApiResponse<Instance>> => {
    return client.put<Instance>(`/instances/${id}`, data);
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    return client.delete<void>(`/instances/${id}`);
  },

  start: async (id: number): Promise<ApiResponse<Instance>> => {
    return client.post<Instance>(`/instances/${id}/start`, {});
  },

  stop: async (id: number): Promise<ApiResponse<Instance>> => {
    return client.post<Instance>(`/instances/${id}/stop`, {});
  },

  restart: async (id: number): Promise<ApiResponse<Instance>> => {
    return client.post<Instance>(`/instances/${id}/restart`, {});
  },

  getSshConfig: async (id: number): Promise<ApiResponse<{ command: string; config: string }>> => {
    return client.get<{ command: string; config: string }>(`/instances/${id}/ssh`);
  },
};

// ============================================================================
// BLUEPRINT API
// ============================================================================

export const blueprintApi = {
  list: async (options?: ListOptions): Promise<PaginatedResponse<Blueprint>> => {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.pageSize) params.append('pageSize', options.pageSize.toString());
    if (options?.search) params.append('search', options.search);

    const result = await client.get<PaginatedResponse<Blueprint>>(
      `/blueprints?${params.toString()}`
    );
    
    return result.data || {
      success: true,
      data: [],
      pagination: {
        page: 1,
        pageSize: 50,
        totalPages: 1,
        totalItems: 0,
      },
    };
  },

  get: async (id: number): Promise<ApiResponse<Blueprint>> => {
    return client.get<Blueprint>(`/blueprints/${id}`);
  },

  create: async (data: CreateBlueprintRequest): Promise<ApiResponse<Blueprint>> => {
    return client.post<Blueprint>('/blueprints', data);
  },

  update: async (
    id: number,
    data: UpdateBlueprintRequest
  ): Promise<ApiResponse<Blueprint>> => {
    return client.put<Blueprint>(`/blueprints/${id}`, data);
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    return client.delete<void>(`/blueprints/${id}`);
  },

  /**
   * Deploy a blueprint as a new instance
   */
  deploy: async (
    id: number,
    projectId: number
  ): Promise<ApiResponse<Instance>> => {
    return client.post<Instance>(`/blueprints/${id}/deploy`, { projectId });
  },
};

// ============================================================================
// SECURITY CONFIGURATION API
// ============================================================================

export const securityApi = {
  list: async (options?: ListOptions): Promise<PaginatedResponse<SecurityConfig>> => {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.pageSize) params.append('pageSize', options.pageSize.toString());
    if (options?.search) params.append('search', options.search);

    const result = await client.get<PaginatedResponse<SecurityConfig>>(
      `/security-configs?${params.toString()}`
    );
    
    return result.data || {
      success: true,
      data: [],
      pagination: {
        page: 1,
        pageSize: 50,
        totalPages: 1,
        totalItems: 0,
      },
    };
  },

  get: async (id: number): Promise<ApiResponse<SecurityConfig>> => {
    return client.get<SecurityConfig>(`/security-configs/${id}`);
  },

  create: async (data: CreateSecurityConfigRequest): Promise<ApiResponse<SecurityConfig>> => {
    return client.post<SecurityConfig>('/security-configs', data);
  },

  update: async (
    id: number,
    data: Partial<CreateSecurityConfigRequest>
  ): Promise<ApiResponse<SecurityConfig>> => {
    return client.put<SecurityConfig>(`/security-configs/${id}`, data);
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    return client.delete<void>(`/security-configs/${id}`);
  },
};

// ============================================================================
// IMAGE API
// ============================================================================

export const imageApi = {
  list: async (options?: ListOptions): Promise<PaginatedResponse<Image>> => {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.pageSize) params.append('pageSize', options.pageSize.toString());
    if (options?.search) params.append('search', options.search);

    const result = await client.get<PaginatedResponse<Image>>(
      `/images?${params.toString()}`
    );
    
    return result.data || {
      success: true,
      data: [],
      pagination: {
        page: 1,
        pageSize: 50,
        totalPages: 1,
        totalItems: 0,
      },
    };
  },

  get: async (id: number): Promise<ApiResponse<Image>> => {
    return client.get<Image>(`/images/${id}`);
  },

  create: async (data: CreateImageRequest): Promise<ApiResponse<Image>> => {
    return client.post<Image>('/images', data);
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    return client.delete<void>(`/images/${id}`);
  },

  /**
   * Create an image from an existing instance
   */
  createFromInstance: async (
    instanceId: number,
    name: string,
    description: string
  ): Promise<ApiResponse<Image>> => {
    return client.post<Image>('/images/from-instance', {
      instanceId,
      name,
      description,
    });
  },
};

// ============================================================================
// ACCOUNT API
// ============================================================================

export const accountApi = {
  list: async (): Promise<ApiResponse<Account[]>> => {
    return client.get<Account[]>('/accounts');
  },

  get: async (id: number): Promise<ApiResponse<Account>> => {
    return client.get<Account>(`/accounts/${id}`);
  },

  create: async (data: CreateAccountRequest): Promise<ApiResponse<Account>> => {
    return client.post<Account>('/accounts', data);
  },

  update: async (
    id: number,
    data: Partial<CreateAccountRequest>
  ): Promise<ApiResponse<Account>> => {
    return client.put<Account>(`/accounts/${id}`, data);
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    return client.delete<void>(`/accounts/${id}`);
  },

  /**
   * Test account connection
   */
  testConnection: async (id: number): Promise<ApiResponse<{ status: string }>> => {
    return client.post<{ status: string }>(`/accounts/${id}/test`, {});
  },

  /**
   * Sync account resources
   */
  sync: async (id: number): Promise<ApiResponse<{ synced: number }>> => {
    return client.post<{ synced: number }>(`/accounts/${id}/sync`, {});
  },
};

// ============================================================================
// COST MANAGEMENT API
// ============================================================================

export const costApi = {
  /**
   * Get cost summary for a time period
   */
  getSummary: async (
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<CostSummary>> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return client.get<CostSummary>(`/costs/summary?${params.toString()}`);
  },

  /**
   * Get budget alerts
   */
  getBudgetAlerts: async (): Promise<ApiResponse<BudgetAlert[]>> => {
    return client.get<BudgetAlert[]>('/costs/budget-alerts');
  },

  /**
   * Create a budget alert
   */
  createBudgetAlert: async (data: {
    name: string;
    threshold: number;
    period: 'daily' | 'weekly' | 'monthly';
  }): Promise<ApiResponse<BudgetAlert>> => {
    return client.post<BudgetAlert>('/costs/budget-alerts', data);
  },

  /**
   * Update a budget alert
   */
  updateBudgetAlert: async (
    id: number,
    data: Partial<BudgetAlert>
  ): Promise<ApiResponse<BudgetAlert>> => {
    return client.put<BudgetAlert>(`/costs/budget-alerts/${id}`, data);
  },

  /**
   * Delete a budget alert
   */
  deleteBudgetAlert: async (id: number): Promise<ApiResponse<void>> => {
    return client.delete<void>(`/costs/budget-alerts/${id}`);
  },
};

// ============================================================================
// LEARNING API
// ============================================================================

export const learningApi = {
  /**
   * Get all learning modules
   */
  list: async (): Promise<ApiResponse<LearningModule[]>> => {
    return client.get<LearningModule[]>('/learning/modules');
  },

  /**
   * Get a single learning module
   */
  get: async (id: number): Promise<ApiResponse<LearningModule>> => {
    return client.get<LearningModule>(`/learning/modules/${id}`);
  },

  /**
   * Update module progress
   */
  updateProgress: async (
    id: number,
    progress: number
  ): Promise<ApiResponse<LearningModule>> => {
    return client.put<LearningModule>(`/learning/modules/${id}/progress`, {
      progress,
    });
  },

  /**
   * Mark module as completed
   */
  complete: async (id: number): Promise<ApiResponse<LearningModule>> => {
    return client.post<LearningModule>(`/learning/modules/${id}/complete`, {});
  },
};

// ============================================================================
// EXPORT ALL APIs
// ============================================================================

export const api = {
  projects: projectApi,
  instances: instanceApi,
  blueprints: blueprintApi,
  security: securityApi,
  images: imageApi,
  accounts: accountApi,
  costs: costApi,
  learning: learningApi,
};

export default api;