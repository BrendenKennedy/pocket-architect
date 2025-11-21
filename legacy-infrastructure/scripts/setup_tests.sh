#!/bin/bash
# Setup script for CVAT Infrastructure Management CLI test environment

set -e

echo "🔧 Setting up test environment for CVAT Infrastructure Management CLI"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Python version
echo -e "${BLUE}📋 Checking Python version...${NC}"
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "   Python version: $PYTHON_VERSION"

# Check if pytest is installed
if ! command -v pytest &> /dev/null; then
    echo -e "${YELLOW}⚠️  pytest not found. Installing test dependencies...${NC}"
    pip install -r tests/requirements.txt
else
    echo -e "${GREEN}✅ pytest is installed${NC}"
    pytest --version
fi

# Install main dependencies if needed
if [ ! -f ".dependencies_installed" ]; then
    echo -e "${BLUE}📦 Installing main dependencies...${NC}"
    pip install -r scripts/requirements.txt
    touch .dependencies_installed
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

# Verify test files exist
echo -e "${BLUE}🔍 Verifying test files...${NC}"
TEST_COUNT=$(find tests -name "test_*.py" | wc -l | tr -d ' ')
echo "   Found $TEST_COUNT test files"

if [ "$TEST_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ No test files found!${NC}"
    exit 1
fi

# Create test data directory if needed
echo -e "${BLUE}📁 Setting up test data directories...${NC}"
mkdir -p test_data
mkdir -p test_output
echo -e "${GREEN}✅ Test directories created${NC}"

# Verify pytest configuration
if [ -f "pytest.ini" ]; then
    echo -e "${GREEN}✅ pytest.ini found${NC}"
else
    echo -e "${YELLOW}⚠️  pytest.ini not found${NC}"
fi

echo ""
echo -e "${GREEN}✅ Test environment setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  Run tests: ./scripts/run_all_tests.sh"
echo "  Or manually: pytest"

