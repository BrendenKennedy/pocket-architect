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

  // Utility operations
  ping: () => Promise<string>;
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
