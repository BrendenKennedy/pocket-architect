/**
 * API adapter that uses Qt bridge instead of REST API.
 * Replaces the existing services/api.ts implementation.
 */

import { getBridge } from './index';
import type {
  Project,
  Instance,
  Blueprint,
  SecurityConfig,
  Image,
  Account,
  CostSummary,
  CreateProjectRequest,
  CreateInstanceRequest,
  CreateBlueprintRequest,
  CreateAccountRequest,
  ApiResponse,
} from '../types/models';

class BridgeAPI {
  // ========================================================================
  // PROJECTS
  // ========================================================================

  async listProjects(): Promise<Project[]> {
    const bridge = getBridge();
    const result = await bridge.list_projects();
    return JSON.parse(result);
  }

  async getProject(id: number): Promise<Project> {
    const bridge = getBridge();
    const result = await bridge.get_project(id);
    return JSON.parse(result);
  }

  async createProject(data: CreateProjectRequest): Promise<ApiResponse<Project>> {
    const bridge = getBridge();
    const result = await bridge.create_project(JSON.stringify(data));
    return JSON.parse(result);
  }

  async updateProject(id: number, data: Partial<Project>): Promise<ApiResponse<Project>> {
    const bridge = getBridge();
    const result = await bridge.update_project(id, JSON.stringify(data));
    return JSON.parse(result);
  }

  async deleteProject(id: number): Promise<ApiResponse<void>> {
    const bridge = getBridge();
    const result = await bridge.delete_project(id);
    return JSON.parse(result);
  }

  // ========================================================================
  // INSTANCES
  // ========================================================================

  async listInstances(): Promise<Instance[]> {
    const bridge = getBridge();
    const result = await bridge.list_instances();
    return JSON.parse(result);
  }

  async getInstance(id: number): Promise<Instance> {
    const bridge = getBridge();
    const result = await bridge.get_instance(id);
    return JSON.parse(result);
  }

  async createInstance(data: CreateInstanceRequest): Promise<ApiResponse<Instance>> {
    const bridge = getBridge();
    const result = await bridge.create_instance(JSON.stringify(data));
    return JSON.parse(result);
  }

  async startInstance(id: number): Promise<ApiResponse<void>> {
    const bridge = getBridge();
    const result = await bridge.start_instance(id);
    return JSON.parse(result);
  }

  async stopInstance(id: number): Promise<ApiResponse<void>> {
    const bridge = getBridge();
    const result = await bridge.stop_instance(id);
    return JSON.parse(result);
  }

  async restartInstance(id: number): Promise<ApiResponse<void>> {
    const bridge = getBridge();
    const result = await bridge.restart_instance(id);
    return JSON.parse(result);
  }

  // ========================================================================
  // BLUEPRINTS
  // ========================================================================

  async listBlueprints(): Promise<Blueprint[]> {
    const bridge = getBridge();
    const result = await bridge.list_blueprints();
    return JSON.parse(result);
  }

  async createBlueprint(data: CreateBlueprintRequest): Promise<ApiResponse<Blueprint>> {
    const bridge = getBridge();
    const result = await bridge.create_blueprint(JSON.stringify(data));
    return JSON.parse(result);
  }

  // ========================================================================
  // ACCOUNTS
  // ========================================================================

  async listAccounts(): Promise<Account[]> {
    const bridge = getBridge();
    const result = await bridge.list_accounts();
    return JSON.parse(result);
  }

  async createAccount(data: CreateAccountRequest): Promise<ApiResponse<Account>> {
    const bridge = getBridge();
    const result = await bridge.create_account(JSON.stringify(data));
    return JSON.parse(result);
  }

  async testAccountConnection(id: number): Promise<ApiResponse<void>> {
    const bridge = getBridge();
    const result = await bridge.test_account_connection(id);
    return JSON.parse(result);
  }

  // ========================================================================
  // COST MANAGEMENT
  // ========================================================================

  async getCostSummary(): Promise<CostSummary> {
    const bridge = getBridge();
    const result = await bridge.get_cost_summary();
    return JSON.parse(result);
  }

  // ========================================================================
  // QUOTAS
  // ========================================================================

  async getQuotas(): Promise<{ categories: any[] }> {
    const bridge = getBridge();
    const result = await bridge.get_quotas();
    return JSON.parse(result);
  }

  // ========================================================================
  // UTILITY
  // ========================================================================

  async ping(): Promise<{ status: string; message: string }> {
    const bridge = getBridge();
    const result = await bridge.ping();
    return JSON.parse(result);
  }

  // ========================================================================
  // CONFIG FILE OPERATIONS
  // ========================================================================

  async loadConfig(): Promise<string> {
    const bridge = getBridge();
    const result = await bridge.load_config();
    return result;
  }

  async saveConfig(configJson: string): Promise<{ success: boolean; error?: string }> {
    const bridge = getBridge();
    const result = await bridge.save_config(configJson);
    return JSON.parse(result);
  }
}

// Export singleton instance
export const bridgeApi = new BridgeAPI();
