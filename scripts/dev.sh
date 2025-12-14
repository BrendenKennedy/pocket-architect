#!/bin/bash
# Development script that builds frontend and launches GUI
# Ensures you're always working with the newest compiled code

echo "========================================="
echo "Starting Pocket Architect Development Mode"
echo "========================================="
echo ""
echo "This will:"
echo "1. Build the React frontend for production"
echo "2. Launch the GUI which will load from the built files"
echo ""
echo "Press Ctrl+C to stop the GUI"
echo ""

# Function to cleanup processes
cleanup() {
    echo ""
    echo "Shutting down GUI..."

    # Kill pocket architect GUI processes
    pkill -f "pocket_architect.*gui" 2>/dev/null || true

    # Wait for graceful shutdown
    sleep 1

    # Force kill any remaining processes
    pkill -9 -f "pocket_architect.*gui" 2>/dev/null || true

    echo "GUI stopped."
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Build frontend for production
echo "Building frontend for production..."
if ! npm run build:frontend; then
    echo "Error: Frontend build failed"
    exit 1
fi

echo "Frontend built successfully!"

# Run GUI in development mode (in background so we can handle signals)
echo "Starting GUI..."
PYTHONPATH=app/backend python -m pocket_architect gui &
GUI_PID=$!

# Wait for either GUI to exit or signal to be received
wait $GUI_PID

# This point is reached when GUI exits or signal is received
cleanup
