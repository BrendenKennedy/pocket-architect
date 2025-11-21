#!/bin/bash
# Test runner script for CVAT Infrastructure Management CLI

set -e

echo "🧪 Running CVAT Infrastructure Management CLI Tests"
echo ""

# Check if pytest is installed
if ! command -v pytest &> /dev/null; then
    echo "❌ pytest is not installed. Installing test dependencies..."
    pip install -r tests/requirements.txt
fi

# Run tests with coverage
echo "📊 Running tests with coverage..."
pytest --cov=scripts --cov-report=term-missing --cov-report=html -v

echo ""
echo "✅ Tests complete! Coverage report generated in htmlcov/index.html"

