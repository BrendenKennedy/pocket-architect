/**
 * TypeScript interface for Qt Web Channel Backend Bridge.
 * Defines all Python methods exposed via Qt Web Channel.
 */

export interface BackendBridge {
  // Signals from Python to JavaScript
  data_updated: {
    connect: (callback: (entity_type: string, json_data: string) => void) => void;
  };
  error_occurred: {
    connect: (callback: (operation: string, error_message: string) => void) => void;
  };

  // Project operations
  list_projects: () => Promise<string>;
  get_project: (project_id: number) => Promise<string>;
  create_project: (project_data: string) => Promise<string>;
  update_project: (project_id: number, update_data: string) => Promise<string>;
  delete_project: (project_id: number) => Promise<string>;

  // Instance operations
  list_instances: () => Promise<string>;
  get_instance: (instance_id: number) => Promise<string>;
  create_instance: (instance_data: string) => Promise<string>;
  start_instance: (instance_id: number) => Promise<string>;
  stop_instance: (instance_id: number) => Promise<string>;
  restart_instance: (instance_id: number) => Promise<string>;

  // Blueprint operations
  list_blueprints: () => Promise<string>;
  create_blueprint: (blueprint_data: string) => Promise<string>;

  // Account operations
  list_accounts: () => Promise<string>;
  create_account: (account_data: string) => Promise<string>;
  test_account_connection: (account_id: number) => Promise<string>;

  // Cost management operations
  get_cost_summary: () => Promise<string>;

  // Security operations
  list_key_pairs: () => Promise<string>;
  create_key_pair: (key_pair_data: string) => Promise<string>;
  delete_key_pair: (key_name: string) => Promise<string>;

  list_security_groups: () => Promise<string>;
  create_security_group: (security_group_data: string) => Promise<string>;
  delete_security_group: (group_id: string) => Promise<string>;

  list_iam_roles: () => Promise<string>;
  create_iam_role: (iam_role_data: string) => Promise<string>;
  delete_iam_role: (role_name: string) => Promise<string>;

  list_certificates: () => Promise<string>;
  create_certificate: (certificate_data: string) => Promise<string>;
  delete_certificate: (certificate_arn: string) => Promise<string>;

  // Quota operations
  get_quotas: () => Promise<string>;

  // Utility operations
  ping: () => Promise<string>;

  // Config file operations
  load_config: () => Promise<string>;
  save_config: (config_json: string) => Promise<string>;
}

declare global {
  interface Window {
    qt?: {
      webChannelTransport?: any;
    };
    backend?: BackendBridge;
    QWebChannel?: any;
  }
}
