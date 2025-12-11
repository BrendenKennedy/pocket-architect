/**
 * Qt Web Channel bridge initialization.
 * Connects React frontend to Python backend via Qt's JavaScript bridge.
 */

import type { BackendBridge } from './types';

let bridge: BackendBridge | null = null;
let initializationPromise: Promise<BackendBridge> | null = null;

/**
 * Initialize the Qt Web Channel bridge.
 * Must be called before using any backend methods.
 */
export async function initBridge(): Promise<BackendBridge> {
  // Return existing bridge if already initialized
  if (bridge) {
    return Promise.resolve(bridge);
  }

  // Return existing initialization promise if in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = new Promise((resolve, reject) => {
    // Check if running in Qt WebEngine
    if (!window.qt?.webChannelTransport) {
      console.warn('Qt Web Channel not available, using mock backend for development');
      bridge = createMockBackend();
      resolve(bridge!);
      return;
    }

    // Load qwebchannel.js if not already loaded
    if (!window.QWebChannel) {
      const script = document.createElement('script');
      script.src = 'qrc:///qtwebchannel/qwebchannel.js';
      script.onload = () => {
        initializeChannel(resolve, reject);
      };
      script.onerror = () => {
        reject(new Error('Failed to load qwebchannel.js'));
      };
      document.head.appendChild(script);
    } else {
      initializeChannel(resolve, reject);
    }

    // Timeout after 5 seconds
    setTimeout(() => {
      if (!bridge) {
        console.error('Bridge initialization timeout');
        bridge = createMockBackend();
        resolve(bridge!);
      }
    }, 5000);
  });

  return initializationPromise;
}

function initializeChannel(resolve: (bridge: BackendBridge) => void, reject: (error: Error) => void) {
  try {
    new window.QWebChannel(window.qt!.webChannelTransport, (channel: any) => {
      bridge = channel.objects.backend as BackendBridge;
      console.log('Qt Web Channel bridge initialized successfully');

      // Connect to signals
      bridge!.data_updated.connect((entity_type: string, json_data: string) => {
        console.log(`Data updated: ${entity_type}`, json_data);
      });

      bridge!.error_occurred.connect((operation: string, error_message: string) => {
        console.error(`Error in ${operation}: ${error_message}`);
      });

      resolve(bridge!);
    });
  } catch (error) {
    reject(error as Error);
  }
}

/**
 * Get the initialized bridge.
 * @throws Error if bridge not initialized
 */
export function getBridge(): BackendBridge {
  if (!bridge) {
    throw new Error('Bridge not initialized. Call initBridge() first.');
  }
  return bridge;
}

/**
 * Check if running in Qt environment.
 */
export function isQtEnvironment(): boolean {
  return !!window.qt?.webChannelTransport;
}

/**
 * Create mock backend for development (when not in Qt).
 */
function createMockBackend(): BackendBridge {
  console.log('Creating mock backend for development');

  const mockData = {
    projects: [],
    instances: [],
    blueprints: [],
    accounts: [],
  };

  return {
    // Mock signals
    data_updated: {
      connect: (callback: any) => {
        console.log('Mock: data_updated.connect called');
      },
    },
    error_occurred: {
      connect: (callback: any) => {
        console.log('Mock: error_occurred.connect called');
      },
    },

    // Project operations
    list_projects: async () => JSON.stringify(mockData.projects),
    get_project: async (id: number) => JSON.stringify({}),
    create_project: async (data: string) => JSON.stringify({ success: true, message: 'Mock: Project created' }),
    update_project: async (id: number, data: string) => JSON.stringify({ success: true, message: 'Mock: Project updated' }),
    delete_project: async (id: number) => JSON.stringify({ success: true, message: 'Mock: Project deleted' }),

    // Instance operations
    list_instances: async () => JSON.stringify(mockData.instances),
    get_instance: async (id: number) => JSON.stringify({}),
    create_instance: async (data: string) => JSON.stringify({ success: true, message: 'Mock: Instance created' }),
    start_instance: async (id: number) => JSON.stringify({ success: true, message: 'Mock: Instance started' }),
    stop_instance: async (id: number) => JSON.stringify({ success: true, message: 'Mock: Instance stopped' }),
    restart_instance: async (id: number) => JSON.stringify({ success: true, message: 'Mock: Instance restarted' }),

    // Blueprint operations
    list_blueprints: async () => JSON.stringify(mockData.blueprints),
    create_blueprint: async (data: string) => JSON.stringify({ success: true, message: 'Mock: Blueprint created' }),

    // Account operations
    list_accounts: async () => JSON.stringify(mockData.accounts),
    create_account: async (data: string) => JSON.stringify({ success: true, message: 'Mock: Account created' }),
    test_account_connection: async (id: number) => JSON.stringify({ success: true, message: 'Mock: Connection successful' }),

    // Cost management
    get_cost_summary: async () => JSON.stringify({
      currentMonth: 0,
      lastMonth: 0,
      projectedMonth: 0,
      byService: [],
      dailyData: [],
    }),

    // Utility
    ping: async () => JSON.stringify({ status: 'ok', message: 'Mock bridge working!' }),
  } as BackendBridge;
}
