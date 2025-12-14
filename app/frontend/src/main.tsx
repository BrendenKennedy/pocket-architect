import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initBridge } from "./bridge";

// Initialize Qt Web Channel bridge before rendering
async function main() {
  console.log('main.tsx: Starting application...');

  // Check if we're in development mode (Vite dev server)
  const isDev = import.meta.env.DEV;

  if (!isDev) {
    try {
      console.log('main.tsx: Initializing bridge...');
      await initBridge();
      console.log('main.tsx: Bridge initialized successfully');
    } catch (error) {
      console.error('main.tsx: Failed to initialize bridge:', error);
      // Show loud, detailed error UI instead of continuing
      document.getElementById("root")!.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif; background: #ffebee;">
          <div style="text-align: center; padding: 40px; border: 4px solid #f44336; border-radius: 12px; max-width: 600px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
            <h1 style="color: #d32f2f; font-size: 2.5em; margin-bottom: 20px;">🚨 CRITICAL ERROR 🚨</h1>
            <h2 style="color: #d32f2f; margin-bottom: 15px;">Qt WebChannel Connection Failed</h2>
            <p style="font-size: 1.2em; color: #333; margin-bottom: 20px;">
              This application requires a Qt WebEngine environment to function properly.
            </p>
            <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: left;">
              <strong>Error Details:</strong><br>
              ${error.message}<br><br>
              <strong>Troubleshooting Steps:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Ensure you're running this through the PyQt GUI application</li>
                <li>Check that PySide6-WebEngine is properly installed</li>
                <li>Verify the application was built with frontend files included</li>
                <li>Check console logs for additional Qt WebEngine errors</li>
              </ul>
            </div>
            <p style="color: #666; font-size: 0.9em;">
              If this error persists, please check the application logs and ensure proper Qt installation.
            </p>
          </div>
        </div>
      `;
      return;
    }
  } else {
    console.log('main.tsx: Development mode detected, skipping bridge initialization');
  }

  console.log('main.tsx: Rendering React app...');
  // Render React app
  createRoot(document.getElementById("root")!).render(<App />);
  console.log('main.tsx: React app rendered');
}

main();