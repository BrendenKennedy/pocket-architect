/**
 * Qt Web Channel bridge initialization.
 * Connects React frontend to Python backend via Qt's JavaScript bridge.
 * REQUIRES Qt WebEngine environment - no fallback to mock data.
 */

import type { BackendBridge } from './types';

let bridge: BackendBridge | null = null;
let initializationPromise: Promise<BackendBridge> | null = null;

/**
 * Initialize the Qt Web Channel bridge.
 * Must be called before using any backend methods.
 * Falls back to mock bridge in development mode.
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
    // Check if we're in development mode
    const isDev = import.meta.env.DEV;

    if (!isDev) {
      // Production mode - require Qt WebEngine
      if (!window.qt?.webChannelTransport) {
        const errorMsg = 'CRITICAL ERROR: Qt Web Channel not available! This application requires a Qt WebEngine environment to function. Ensure you are running this through the PyQt GUI application, not a regular web browser.';
        console.error(errorMsg);
        reject(new Error(errorMsg));
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
          const errorMsg = 'CRITICAL ERROR: Failed to load qwebchannel.js from Qt resources. This indicates a problem with the Qt WebEngine setup.';
          console.error(errorMsg);
          reject(new Error(errorMsg));
        };
        document.head.appendChild(script);
      } else {
        initializeChannel(resolve, reject);
      }

      // Timeout after 10 seconds (increased for reliable connection)
      setTimeout(() => {
        if (!bridge) {
          const errorMsg = 'CRITICAL ERROR: Bridge initialization timeout after 10 seconds. Qt WebChannel connection failed. Check that PySide6-WebEngine is properly installed and the backend bridge is registered.';
          console.error(errorMsg);
          reject(new Error(errorMsg));
        }
      }, 10000);
    } else {
      // Development mode - use mock bridge
      console.log('Using mock bridge for development');
      bridge = createMockBridge();
      resolve(bridge);
    }
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
    const errorMsg = `CRITICAL ERROR: Failed to initialize Qt Web Channel: ${error}. This indicates a problem with the Qt WebEngine setup or backend bridge registration.`;
    console.error(errorMsg);
    reject(new Error(errorMsg));
  }
}

function createMockBridge(): BackendBridge {
  const mockResponse = (data: any) => Promise.resolve(JSON.stringify({ success: true, data }));

  return {
    // Mock signals
    data_updated: {
      connect: (callback: (entity_type: string, json_data: string) => void) => {
        console.log('Mock: data_updated signal connected');
      }
    },
    error_occurred: {
      connect: (callback: (operation: string, error_message: string) => void) => {
        console.log('Mock: error_occurred signal connected');
      }
    },

    // Mock all methods to return success with mock data
    list_projects: () => mockResponse([]),
    get_project: () => mockResponse({}),
    create_project: () => mockResponse({}),
    update_project: () => mockResponse({}),
    delete_project: () => Promise.resolve(JSON.stringify({ success: true })),

    list_instances: () => mockResponse([]),
    get_instance: () => mockResponse({}),
    create_instance: () => mockResponse({}),
    start_instance: () => mockResponse({}),
    stop_instance: () => mockResponse({}),
    restart_instance: () => mockResponse({}),
    terminate_instance: () => Promise.resolve(JSON.stringify({ success: true })),

    list_blueprints: () => mockResponse([]),
    create_blueprint: () => mockResponse({}),

    list_accounts: () => mockResponse([]),
    create_account: () => mockResponse({}),
    test_account_connection: () => mockResponse({ success: true }),
    get_account: () => mockResponse({}),
    delete_account: () => Promise.resolve(JSON.stringify({ success: true })),

    list_aws_profiles: () => mockResponse([]),
    get_aws_profile_credentials: () => mockResponse({}),
    validate_aws_profile: () => mockResponse({ success: true }),

    get_cost_summary: () => mockResponse({}),

    list_key_pairs: () => mockResponse([]),
    create_key_pair: () => mockResponse({}),
    delete_key_pair: () => Promise.resolve(JSON.stringify({ success: true })),

    list_security_groups: () => mockResponse([]),
    create_security_group: () => mockResponse({}),
    delete_security_group: () => Promise.resolve(JSON.stringify({ success: true })),

    list_iam_roles: () => mockResponse([]),
    create_iam_role: () => mockResponse({}),
    delete_iam_role: () => Promise.resolve(JSON.stringify({ success: true })),

    list_certificates: () => mockResponse([]),
    create_certificate: () => mockResponse({}),
    delete_certificate: () => Promise.resolve(JSON.stringify({ success: true })),

    get_quotas: () => mockResponse([]),

    ping: () => Promise.resolve(JSON.stringify({ success: true, message: "pong" })),

    load_config: () => mockResponse({}),
    save_config: () => Promise.resolve(JSON.stringify({ success: true })),

    // Dashboard methods
    start_dashboard_service: () => Promise.resolve(JSON.stringify({ success: true })),
    stop_dashboard_service: () => Promise.resolve(JSON.stringify({ success: true })),
    get_dashboard_data: () => mockResponse({}),
    refresh_dashboard_data: () => Promise.resolve(JSON.stringify({ success: true })),
    get_dashboard_status: () => mockResponse({}),

    // SSH methods
    start_ssh_session: () => mockResponse({}),
    end_ssh_session: () => Promise.resolve(JSON.stringify({ success: true })),
    get_ssh_sessions: () => mockResponse([]),
  };
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


