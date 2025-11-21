#!/bin/bash
# Comprehensive test runner for CVAT Infrastructure Management CLI

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test results file
TEST_RESULTS="test_output/test_results_$(date +%Y%m%d_%H%M%S).txt"
SUMMARY_FILE="test_output/test_summary_$(date +%Y%m%d_%H%M%S).txt"

# Create output directory
mkdir -p test_output

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  CVAT Infrastructure Management CLI - Test Suite Runner    ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if pytest is available
if ! command -v pytest &> /dev/null; then
    echo -e "${RED}❌ pytest not found. Please run: ./scripts/setup_tests.sh${NC}"
    exit 1
fi

# Get test count
TOTAL_TESTS=$(pytest --collect-only -q 2>/dev/null | grep -c "test session starts" || echo "0")
TEST_FILES=$(find tests -name "test_*.py" | wc -l | tr -d ' ')

echo -e "${BLUE}📊 Test Suite Information${NC}"
echo "   Test files: $TEST_FILES"
echo "   Test runner: pytest"
echo "   Output directory: test_output/"
echo ""

# Function to run tests with category
run_test_category() {
    local category=$1
    local description=$2
    local marker=$3
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🧪 Running: $description${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [ -n "$marker" ]; then
        pytest -v -m "$marker" --tb=short 2>&1 | tee -a "$TEST_RESULTS"
    else
        pytest -v "$category" --tb=short 2>&1 | tee -a "$TEST_RESULTS"
    fi
    
    local exit_code=${PIPESTATUS[0]}
    return $exit_code
}

# Start test execution
echo -e "${GREEN}🚀 Starting comprehensive test suite...${NC}"
echo ""

# Initialize results file
echo "CVAT Infrastructure Management CLI - Test Results" > "$TEST_RESULTS"
echo "Generated: $(date)" >> "$TEST_RESULTS"
echo "========================================" >> "$TEST_RESULTS"
echo "" >> "$TEST_RESULTS"

# Track results
TOTAL_PASSED=0
TOTAL_FAILED=0
FAILED_TESTS=()

# Run tests by category
echo -e "${BLUE}📋 Test Execution Plan:${NC}"
echo "   1. Core Module Tests (AWS, Config, Terraform, Utils)"
echo "   2. Command Tests (Setup, Up, Down, Checkpoint)"
echo "   3. CLI and Package Tests"
echo "   4. Integration Tests"
echo "   5. Edge Case Tests"
echo "   6. Comprehensive Coverage Tests"
echo ""

# 1. Core Module Tests
echo ""
run_test_category "tests/test_aws.py tests/test_config.py tests/test_terraform.py tests/test_utils.py" "Core Module Tests" ""
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Core Module Tests: PASSED${NC}"
    ((TOTAL_PASSED++))
else
    echo -e "${RED}❌ Core Module Tests: FAILED${NC}"
    ((TOTAL_FAILED++))
    FAILED_TESTS+=("Core Module Tests")
fi

# 2. Comprehensive Core Tests
echo ""
run_test_category "tests/test_aws_comprehensive.py tests/test_utils_comprehensive.py tests/test_ensure_symlink_edge_cases.py" "Comprehensive Core Tests" ""
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Comprehensive Core Tests: PASSED${NC}"
    ((TOTAL_PASSED++))
else
    echo -e "${RED}❌ Comprehensive Core Tests: FAILED${NC}"
    ((TOTAL_FAILED++))
    FAILED_TESTS+=("Comprehensive Core Tests")
fi

# 3. Command Tests
echo ""
run_test_category "tests/test_setup.py tests/test_setup_comprehensive.py tests/test_up.py tests/test_down.py tests/test_checkpoint.py" "Command Tests" ""
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Command Tests: PASSED${NC}"
    ((TOTAL_PASSED++))
else
    echo -e "${RED}❌ Command Tests: FAILED${NC}"
    ((TOTAL_FAILED++))
    FAILED_TESTS+=("Command Tests")
fi

# 4. CLI and Package Tests
echo ""
run_test_category "tests/test_cli.py tests/test_cli_comprehensive.py tests/test_package_init.py" "CLI and Package Tests" ""
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ CLI and Package Tests: PASSED${NC}"
    ((TOTAL_PASSED++))
else
    echo -e "${RED}❌ CLI and Package Tests: FAILED${NC}"
    ((TOTAL_FAILED++))
    FAILED_TESTS+=("CLI and Package Tests")
fi

# 5. Integration Tests
echo ""
run_test_category "tests/test_integration.py" "Integration Tests" ""
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Integration Tests: PASSED${NC}"
    ((TOTAL_PASSED++))
else
    echo -e "${RED}❌ Integration Tests: FAILED${NC}"
    ((TOTAL_FAILED++))
    FAILED_TESTS+=("Integration Tests")
fi

# 6. Edge Case Tests
echo ""
run_test_category "tests/test_edge_cases.py" "Edge Case Tests" ""
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Edge Case Tests: PASSED${NC}"
    ((TOTAL_PASSED++))
else
    echo -e "${RED}❌ Edge Case Tests: FAILED${NC}"
    ((TOTAL_FAILED++))
    FAILED_TESTS+=("Edge Case Tests")
fi

# Run all tests together for final verification
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 Final Verification: Running All Tests${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

FINAL_RESULT=$(pytest -v --tb=short --co -q 2>&1 | tail -1)
pytest -v --tb=short 2>&1 | tee -a "$TEST_RESULTS"
FINAL_EXIT_CODE=${PIPESTATUS[0]}

# Generate summary
echo "" >> "$TEST_RESULTS"
echo "========================================" >> "$TEST_RESULTS"
echo "Test Summary" >> "$TEST_RESULTS"
echo "========================================" >> "$TEST_RESULTS"
echo "Total Categories Passed: $TOTAL_PASSED" >> "$TEST_RESULTS"
echo "Total Categories Failed: $TOTAL_FAILED" >> "$TEST_RESULTS"
if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
    echo "Failed Categories:" >> "$TEST_RESULTS"
    for test in "${FAILED_TESTS[@]}"; do
        echo "  - $test" >> "$TEST_RESULTS"
    done
fi

# Generate summary file
{
    echo "CVAT Infrastructure Management CLI - Test Summary"
    echo "Generated: $(date)"
    echo ""
    echo "Test Execution Summary"
    echo "======================"
    echo "Total Test Files: $TEST_FILES"
    echo "Categories Passed: $TOTAL_PASSED"
    echo "Categories Failed: $TOTAL_FAILED"
    echo ""
    if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
        echo "Failed Test Categories:"
        for test in "${FAILED_TESTS[@]}"; do
            echo "  ❌ $test"
        done
        echo ""
    fi
    echo "Detailed results: $TEST_RESULTS"
} > "$SUMMARY_FILE"

# Final summary
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    Test Execution Summary                 ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Results:${NC}"
echo "   Test Files: $TEST_FILES"
echo "   Categories Passed: ${GREEN}$TOTAL_PASSED${NC}"
echo "   Categories Failed: ${RED}$TOTAL_FAILED${NC}"
echo ""

if [ $FINAL_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo -e "${GREEN}📄 Detailed results: $TEST_RESULTS${NC}"
    echo -e "${GREEN}📄 Summary: $SUMMARY_FILE${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
        echo -e "${YELLOW}Failed categories:${NC}"
        for test in "${FAILED_TESTS[@]}"; do
            echo -e "   ${RED}❌ $test${NC}"
        done
    fi
    echo ""
    echo -e "${RED}📄 Detailed results: $TEST_RESULTS${NC}"
    echo -e "${RED}📄 Summary: $SUMMARY_FILE${NC}"
    exit 1
fi

