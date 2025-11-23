/**
 * WebChannel bridge for Python-JavaScript communication.
 */

declare global {
  interface Window {
    qt?: {
      webChannelTransport?: any;
    };
  }
}

// Declare QWebChannel as global (loaded from qrc:///qtwebchannel/qwebchannel.js)
declare const QWebChannel: any;

export interface Bridge {
  // Synchronous methods (return Promises in JavaScript)
  // Qt WebChannel serializes Python dicts/lists to JavaScript objects/arrays
  list_projects(): Promise<any[]>;
  get_project_status(project_name: string): Promise<any>;
  list_snapshots(): Promise<any[]>;
  delete_snapshot(name_or_id: string): Promise<any>;
  list_blueprints(): Promise<any[]>;
  delete_blueprint(name: string): Promise<any>;
  update_blueprint(name: string, blueprint_data: any): Promise<any>;
  get_cost_info(project_name: string): Promise<any>;
  set_cost_limit(project_name: string, limit: number, action: string, warning_threshold: number): Promise<any>;
  get_global_cost_limit(): Promise<any>;
  set_global_cost_limit(limit: number): Promise<any>;
  check_aws_credentials(): Promise<any>;
  list_setup_scripts(): Promise<any>;
  load_setup_script(name: string): Promise<any>;
  
  // Async operations
  deploy_project(
    operation_id: string,
    blueprint_name: string,
    project_name: string,
    snapshot: string,
    cost_limit: number,
    cost_action: string,
    override: boolean
  ): Promise<any>;
  teardown_project(operation_id: string, project_name: string, force: boolean): Promise<any>;
  start_stop_project(operation_id: string, project_name: string, action: string): Promise<any>;
  create_snapshot(operation_id: string, project_name: string, name: string, note: string): Promise<any>;
  
  // Signals
  operation_progress: {
    connect(callback: (operation_id: string, message: string) => void): void;
  };
  operation_finished: {
    connect(callback: (operation_id: string, success: boolean, message: string) => void): void;
  };
}

class BridgeClient {
  private bridge: Bridge | null = null;
  private operationCallbacks: Map<string, {
    onProgress?: (message: string) => void;
    onFinished?: (success: boolean, message: string) => void;
  }> = new Map();
  private initialized = false;

  constructor() {
    // Wait for DOM and Qt to be ready
    if (typeof window !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.initializeBridge());
      } else {
        this.initializeBridge();
      }
    }
  }

  private initializeBridge() {
    if (this.initialized) return;
    
    // Wait for Qt WebChannel to be available
    if (typeof window !== 'undefined' && window.qt?.webChannelTransport) {
      try {
        // QWebChannel should be available from qrc:///qtwebchannel/qwebchannel.js
        if (typeof QWebChannel === 'undefined') {
          // Retry after a short delay
          setTimeout(() => this.initializeBridge(), 100);
          return;
        }

        new QWebChannel(window.qt.webChannelTransport, (channel: any) => {
          this.bridge = channel.objects.bridge as Bridge;
          this.initialized = true;
          
          // Connect to signals
          if (this.bridge) {
            this.bridge.operation_progress.connect((operationId: string, message: string) => {
              const callbacks = this.operationCallbacks.get(operationId);
              if (callbacks?.onProgress) {
                callbacks.onProgress(message);
              }
            });

            this.bridge.operation_finished.connect((operationId: string, success: boolean, message: string) => {
              const callbacks = this.operationCallbacks.get(operationId);
              if (callbacks?.onFinished) {
                callbacks.onFinished(success, message);
              }
              this.operationCallbacks.delete(operationId);
            });
          }
        });
      } catch (e) {
        console.error('Failed to initialize WebChannel:', e);
        // Retry after delay
        setTimeout(() => this.initializeBridge(), 100);
      }
    } else {
      // Fallback: try to initialize after a delay
      setTimeout(() => this.initializeBridge(), 100);
    }
  }

  private parseResponse<T>(response: any): T {
    // Qt WebChannel automatically serializes Python dicts/lists to JavaScript objects/arrays
    // So we can return the response directly
    return response as T;
  }

  private ensureBridge(): Bridge {
    if (!this.bridge) {
      throw new Error('Bridge not initialized. Make sure Qt WebChannel is available.');
    }
    return this.bridge;
  }

  // Synchronous API methods
  async listProjects() {
    const response = await this.ensureBridge().list_projects();
    return this.parseResponse<any[]>(response);
  }

  async getProjectStatus(projectName: string) {
    const response = await this.ensureBridge().get_project_status(projectName);
    return this.parseResponse<any>(response);
  }

  async listSnapshots() {
    const response = await this.ensureBridge().list_snapshots();
    return this.parseResponse<any[]>(response);
  }

  async deleteSnapshot(nameOrId: string) {
    const response = await this.ensureBridge().delete_snapshot(nameOrId);
    return this.parseResponse<any>(response);
  }

  async listBlueprints() {
    const response = await this.ensureBridge().list_blueprints();
    return this.parseResponse<any[]>(response);
  }

  async deleteBlueprint(name: string) {
    const response = await this.ensureBridge().delete_blueprint(name);
    return this.parseResponse<{ success: boolean; message?: string; error?: string }>(response);
  }

  async updateBlueprint(name: string, blueprintData: any) {
    const response = await this.ensureBridge().update_blueprint(name, blueprintData);
    return this.parseResponse<{ success: boolean; message?: string; error?: string }>(response);
  }

  async getCostInfo(projectName: string) {
    const response = await this.ensureBridge().get_cost_info(projectName);
    return this.parseResponse<any>(response);
  }

  async setCostLimit(
    projectName: string,
    limit: number,
    action: string,
    warningThreshold: number
  ) {
    const response = await this.ensureBridge().set_cost_limit(projectName, limit, action, warningThreshold);
    return this.parseResponse<any>(response);
  }

  async getGlobalCostLimit() {
    const response = await this.ensureBridge().get_global_cost_limit();
    return this.parseResponse<any>(response);
  }

  async setGlobalCostLimit(limit: number) {
    const response = await this.ensureBridge().set_global_cost_limit(limit);
    return this.parseResponse<any>(response);
  }

  async checkAwsCredentials() {
    const response = await this.ensureBridge().check_aws_credentials();
    return this.parseResponse<any>(response);
  }

  async listSetupScripts() {
    const response = await this.ensureBridge().list_setup_scripts();
    return this.parseResponse<any>(response);
  }

  async loadSetupScript(name: string) {
    const response = await this.ensureBridge().load_setup_script(name);
    return this.parseResponse<any>(response);
  }

  // Async operation methods
  async deployProject(
    blueprintName: string,
    projectName: string,
    snapshot: string | null,
    costLimit: number | null,
    costAction: string,
    override: boolean,
    onProgress?: (message: string) => void,
    onFinished?: (success: boolean, message: string) => void
  ): Promise<string> {
    const operationId = `deploy_${Date.now()}_${Math.random()}`;
    
    if (onProgress || onFinished) {
      this.operationCallbacks.set(operationId, { onProgress, onFinished });
    }

    const response = await this.ensureBridge().deploy_project(
      operationId,
      blueprintName,
      projectName,
      snapshot || '',
      costLimit || 0,
      costAction,
      override
    );
    
    const result = this.parseResponse<{ operation_id?: string; error?: string }>(response);
    if (result?.error) {
      throw new Error(result.error);
    }
    
    return operationId;
  }

  async teardownProject(
    projectName: string,
    force: boolean,
    onProgress?: (message: string) => void,
    onFinished?: (success: boolean, message: string) => void
  ): Promise<string> {
    console.log('[Bridge] teardownProject called');
    console.log('[Bridge] projectName:', projectName);
    console.log('[Bridge] force:', force);
    console.log('[Bridge] bridge available:', this.bridge !== null);
    
    const operationId = `teardown_${Date.now()}_${Math.random()}`;
    console.log('[Bridge] Generated operationId:', operationId);
    
    if (onProgress || onFinished) {
      console.log('[Bridge] Setting up callbacks for operationId:', operationId);
      this.operationCallbacks.set(operationId, { onProgress, onFinished });
    }

    try {
      console.log('[Bridge] Calling bridge.teardown_project');
      const response = await this.ensureBridge().teardown_project(operationId, projectName, force);
      console.log('[Bridge] Response received:', response);
      
      const result = this.parseResponse<{ operation_id?: string; error?: string }>(response);
      console.log('[Bridge] Parsed result:', result);
      
      if (result?.error) {
        console.error('[Bridge] Error in response:', result.error);
        throw new Error(result.error);
      }
      
      console.log('[Bridge] Returning operationId:', operationId);
      return operationId;
    } catch (error: any) {
      console.error('[Bridge] Exception in teardownProject:', error);
      console.error('[Bridge] Error message:', error.message);
      console.error('[Bridge] Error stack:', error.stack);
      throw error;
    }
  }

  async startStopProject(
    projectName: string,
    action: 'start' | 'stop',
    onProgress?: (message: string) => void,
    onFinished?: (success: boolean, message: string) => void
  ): Promise<string> {
    const operationId = `startstop_${Date.now()}_${Math.random()}`;
    
    if (onProgress || onFinished) {
      this.operationCallbacks.set(operationId, { onProgress, onFinished });
    }

    const response = await this.ensureBridge().start_stop_project(operationId, projectName, action);
    const result = this.parseResponse<{ operation_id?: string; error?: string }>(response);
    if (result?.error) {
      throw new Error(result.error);
    }
    
    return operationId;
  }

  async createSnapshot(
    projectName: string,
    name: string,
    note: string | null,
    onProgress?: (message: string) => void,
    onFinished?: (success: boolean, message: string) => void
  ): Promise<string> {
    const operationId = `snapshot_${Date.now()}_${Math.random()}`;
    
    if (onProgress || onFinished) {
      this.operationCallbacks.set(operationId, { onProgress, onFinished });
    }

    const response = await this.ensureBridge().create_snapshot(
      operationId,
      projectName,
      name,
      note || ''
    );
    const result = this.parseResponse<{ operation_id?: string; error?: string }>(response);
    if (result?.error) {
      throw new Error(result.error);
    }
    
    return operationId;
  }

  isReady(): boolean {
    return this.bridge !== null;
  }
}

// Export singleton instance
export const bridgeClient = new BridgeClient();

