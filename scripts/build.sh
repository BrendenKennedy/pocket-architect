#!/bin/bash
set -e

echo "========================================="
echo "Building Pocket Architect"
echo "========================================="

# Build frontend
echo ""
echo "Building React frontend..."
npm run build:frontend

# Build Python package
echo ""
echo "Building Python package..."
python -m build

echo ""
echo "========================================="
echo "Build complete!"
echo "========================================="
echo ""
echo "To install: pip install dist/pocket_architect-0.1.0-py3-none-any.whl"
echo "To run CLI: pocket-architect --help"
echo "To run GUI: pocket-architect-gui"
