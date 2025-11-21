#!/bin/bash
# Quick test runner for rapid development feedback

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}⚡ Quick Test Run${NC}"
echo ""

# Run tests with minimal output
pytest -x -v --tb=line -q

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All quick tests passed!${NC}"
    echo ""
    echo "For full test suite, run: ./scripts/run_all_tests.sh"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠️  Some tests failed. Run full suite for details.${NC}"
    exit 1
fi

