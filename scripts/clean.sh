#!/bin/bash

echo "========================================="
echo "Cleaning Pocket Architect Build Artifacts"
echo "========================================="

# Clean Python build artifacts
echo "Cleaning Python build artifacts..."
rm -rf build/
rm -rf dist/
rm -rf *.egg-info
rm -rf app/backend/**/__pycache__
rm -rf app/backend/**/*.pyc
rm -rf app/backend/**/*.pyo

# Clean frontend build artifacts
echo "Cleaning frontend build artifacts..."
rm -rf app/frontend/build/
rm -rf app/frontend/node_modules/.vite

# Clean backend resources (built frontend)
echo "Cleaning backend resources..."
rm -rf app/backend/pocket_architect/resources/frontend/

echo ""
echo "========================================="
echo "Clean complete!"
echo "========================================="
