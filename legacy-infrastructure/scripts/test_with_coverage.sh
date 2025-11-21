#!/bin/bash
# Test runner with coverage report generation

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     CVAT CLI - Test Suite with Coverage Analysis          ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Create output directory
mkdir -p test_output
mkdir -p htmlcov

# Run tests with coverage
echo -e "${BLUE}🧪 Running tests with coverage analysis...${NC}"
echo ""

pytest \
    --cov=scripts \
    --cov-report=term-missing \
    --cov-report=html \
    --cov-report=json:test_output/coverage.json \
    -v \
    --tb=short

COVERAGE_EXIT_CODE=$?

# Generate coverage summary
if [ -f "test_output/coverage.json" ]; then
    echo ""
    echo -e "${BLUE}📊 Coverage Summary:${NC}"
    python3 << 'EOF'
import json
import sys

try:
    with open('test_output/coverage.json', 'r') as f:
        data = json.load(f)
    
    totals = data.get('totals', {})
    covered_lines = totals.get('covered_lines', 0)
    num_statements = totals.get('num_statements', 0)
    
    if num_statements > 0:
        coverage_percent = (covered_lines / num_statements) * 100
        print(f"   Coverage: {coverage_percent:.1f}% ({covered_lines}/{num_statements} lines)")
        
        if coverage_percent >= 80:
            print("   ✅ Coverage target met (≥80%)")
        else:
            print("   ⚠️  Coverage below target (≥80%)")
    else:
        print("   ⚠️  Could not calculate coverage")
except Exception as e:
    print(f"   ⚠️  Error reading coverage: {e}")
    sys.exit(1)
EOF
fi

echo ""
echo -e "${GREEN}📄 Coverage reports generated:${NC}"
echo "   - Terminal: Above"
echo "   - HTML: htmlcov/index.html"
echo "   - JSON: test_output/coverage.json"
echo ""

if [ $COVERAGE_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed with coverage analysis!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

