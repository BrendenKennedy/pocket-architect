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
  CreateKeyPairRequest,
  CreateSecurityGroupRequest,
  CreateIAMRoleRequest,
  CreateCertificateRequest,
  KeyPair,
  FirewallRule,
  IAMRole,
  Certificate,
  ApiResponse,
  PermissionCheckResult,
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

  async validateAwsCredentials(accessKey: string, secretKey: string, region: string): Promise<{ success: boolean; accountId?: string; error?: string }> {
    const bridge = getBridge();
    const result = await bridge.validate_aws_credentials(accessKey, secretKey, region);
    return JSON.parse(result);
  }

  async checkAccountPermissions(accountId: number): Promise<PermissionCheckResult> {
    const bridge = getBridge();
    const result = await bridge.check_account_permissions(accountId);
    return JSON.parse(result);
  }

  async listAwsProfiles(): Promise<string[]> {
    const bridge = getBridge();
    const result = await bridge.list_aws_profiles();
    return JSON.parse(result);
  }

  async validateAwsProfile(profileName: string, region: string): Promise<{ success: boolean; accountId?: string; profile?: string; region?: string; error?: string }> {
    const bridge = getBridge();
    const result = await bridge.validate_aws_profile(profileName, region);
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
  // SECURITY
  // ========================================================================

  async listKeyPairs(): Promise<KeyPair[]> {
    const bridge = getBridge();
    const result = await bridge.list_key_pairs();
    return JSON.parse(result);
  }

  async createKeyPair(data: CreateKeyPairRequest): Promise<ApiResponse<KeyPair>> {
    const bridge = getBridge();
    const result = await bridge.create_key_pair(JSON.stringify(data));
    return JSON.parse(result);
  }

  async deleteKeyPair(keyName: string): Promise<ApiResponse<void>> {
    const bridge = getBridge();
    const result = await bridge.delete_key_pair(keyName);
    return JSON.parse(result);
  }

  async listSecurityGroups(): Promise<FirewallRule[]> {
    const bridge = getBridge();
    const result = await bridge.list_security_groups();
    return JSON.parse(result);
  }

  async createSecurityGroup(data: CreateSecurityGroupRequest): Promise<ApiResponse<FirewallRule>> {
    const bridge = getBridge();
    const result = await bridge.create_security_group(JSON.stringify(data));
    return JSON.parse(result);
  }

  async deleteSecurityGroup(groupId: string): Promise<ApiResponse<void>> {
    const bridge = getBridge();
    const result = await bridge.delete_security_group(groupId);
    return JSON.parse(result);
  }

  async listIAMRoles(): Promise<IAMRole[]> {
    const bridge = getBridge();
    const result = await bridge.list_iam_roles();
    return JSON.parse(result);
  }

  async createIAMRole(data: CreateIAMRoleRequest): Promise<ApiResponse<IAMRole>> {
    const bridge = getBridge();
    const result = await bridge.create_iam_role(JSON.stringify(data));
    return JSON.parse(result);
  }

  async deleteIAMRole(roleName: string): Promise<ApiResponse<void>> {
    const bridge = getBridge();
    const result = await bridge.delete_iam_role(roleName);
    return JSON.parse(result);
  }

  async listCertificates(): Promise<Certificate[]> {
    const bridge = getBridge();
    const result = await bridge.list_certificates();
    return JSON.parse(result);
  }

  async createCertificate(data: CreateCertificateRequest): Promise<ApiResponse<Certificate>> {
    const bridge = getBridge();
    const result = await bridge.create_certificate(JSON.stringify(data));
    return JSON.parse(result);
  }

  async deleteCertificate(certificateArn: string): Promise<ApiResponse<void>> {
    const bridge = getBridge();
    const result = await bridge.delete_certificate(certificateArn);
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
