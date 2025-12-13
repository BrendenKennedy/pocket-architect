#!/bin/bash

echo "========================================="
echo "Starting Pocket Architect Development Mode"
echo "========================================="
echo ""
echo "This will:"
echo "1. Start the React frontend dev server (http://localhost:3000)"
echo "2. Launch the GUI which will load from the dev server"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Function to cleanup processes
cleanup() {
    echo ""
    echo "Shutting down development servers..."

    # Kill all development processes more aggressively
    echo "Stopping all development processes..."

    # Kill vite processes
    pkill -f "vite" 2>/dev/null || true

    # Kill npm dev processes
    pkill -f "npm.*dev" 2>/dev/null || true

    # Kill pocket architect GUI processes
    pkill -f "pocket_architect.*gui" 2>/dev/null || true

    # Wait for graceful shutdown
    sleep 1

    # Force kill any remaining processes
    pkill -9 -f "vite" 2>/dev/null || true
    pkill -9 -f "npm.*dev" 2>/dev/null || true
    pkill -9 -f "pocket_architect.*gui" 2>/dev/null || true

    echo "Development servers stopped."
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start frontend dev server
echo "Starting frontend dev server..."
npm run dev:frontend &
FRONTEND_PID=$!

# Wait for frontend to start
echo "Waiting for frontend to start..."
sleep 3

# Check if frontend is running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "Error: Frontend dev server failed to start"
    cleanup
    exit 1
fi

# Run GUI in development mode (in background so we can handle signals)
echo "Starting GUI..."
python -m pocket_architect gui &
GUI_PID=$!

# Wait for either GUI to exit or signal to be received
wait $GUI_PID

# This point is reached when GUI exits or signal is received
cleanup
