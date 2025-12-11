import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initBridge } from "./bridge";

// Initialize Qt Web Channel bridge before rendering
async function main() {
  try {
    await initBridge();
    console.log('Bridge initialized successfully');
  } catch (error) {
    console.error('Failed to initialize bridge:', error);
    // Continue anyway with mock backend
  }

  // Render React app
  createRoot(document.getElementById("root")!).render(<App />);
}

main();