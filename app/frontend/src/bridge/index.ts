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
 * @throws Error if Qt WebChannel is not available
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
    // REQUIRE Qt WebEngine environment - no fallback allowed
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


