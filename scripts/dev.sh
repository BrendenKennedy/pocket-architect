#!/bin/bash
set -e

echo "========================================="
echo "Starting Pocket Architect Development Mode"
echo "========================================="
echo ""
echo "This will:"
echo "1. Start the React frontend dev server (http://localhost:3000)"
echo "2. Launch the GUI which will load from the dev server"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start frontend dev server in background
echo "Starting frontend dev server..."
npm run dev:frontend &
FRONTEND_PID=$!

# Wait for frontend to start
echo "Waiting for frontend to start..."
sleep 3

# Run GUI in development mode (connects to localhost:3000)
echo "Starting GUI..."
python -m pocket_architect gui

# Cleanup on exit
trap "kill $FRONTEND_PID 2>/dev/null" EXIT
