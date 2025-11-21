# Automated Testing Setup - Complete Guide

## Overview

This project includes a comprehensive automated testing setup that runs all 200+ tests with sample data and generates detailed reports.

## Quick Start

### Option 1: One-Command Setup and Test
```bash
./scripts/setup_tests.sh && ./scripts/run_all_tests.sh
```

### Option 2: Using Make Commands
```bash
make setup      # Setup test environment
make test-all   # Run all tests with reports
```

### Option 3: Python Test Runner
```bash
./scripts/setup_tests.sh
python3 scripts/run_tests.py
```

## Test Scripts

### 1. `scripts/setup_tests.sh`
**Purpose**: Initial setup of test environment

**What it does**:
- Checks Python version
- Installs pytest and test dependencies
- Installs main project dependencies
- Verifies test files exist
- Creates test data directories

**Usage**:
```bash
./scripts/setup_tests.sh
```

### 2. `scripts/run_all_tests.sh`
**Purpose**: Comprehensive test runner with detailed reporting

**What it does**:
- Runs all test categories sequentially
- Generates detailed test logs
- Creates summary reports
- Provides pass/fail statistics
- Saves results to `test_output/`

**Usage**:
```bash
./scripts/run_all_tests.sh
```

**Output**:
- `test_output/test_results_YYYYMMDD_HHMMSS.txt` - Full test log
- `test_output/test_summary_YYYYMMDD_HHMMSS.txt` - Summary report

### 3. `scripts/test_with_coverage.sh`
**Purpose**: Run tests with code coverage analysis

**What it does**:
- Runs all tests
- Generates coverage reports (terminal, HTML, JSON)
- Shows coverage percentage
- Creates interactive HTML report

**Usage**:
```bash
./scripts/test_with_coverage.sh
```

**Output**:
- Terminal: Coverage summary with missing lines
- `htmlcov/index.html` - Interactive coverage report
- `test_output/coverage.json` - Machine-readable coverage data

### 4. `scripts/quick_test.sh`
**Purpose**: Fast test run for rapid development feedback

**What it does**:
- Runs tests with minimal output
- Stops on first failure (`-x` flag)
- Quick feedback during development

**Usage**:
```bash
./scripts/quick_test.sh
```

### 5. `scripts/run_tests.py`
**Purpose**: Python-based test runner with structured output

**What it does**:
- Runs test categories
- Generates formatted reports
- Provides colored terminal output
- Creates summary files

**Usage**:
```bash
python3 scripts/run_tests.py
```

## Makefile Commands

The `Makefile` provides convenient shortcuts:

```bash
make help          # Show all available commands
make setup         # Setup test environment
make install       # Install all dependencies
make test          # Run all tests (pytest)
make test-quick    # Quick test run
make test-coverage # Tests with coverage
make test-all      # Comprehensive test suite
make test-python   # Python test runner
make clean         # Clean test artifacts
```

### Specific Test Categories
```bash
make test-aws         # AWS tests only
make test-config      # Config tests only
make test-terraform   # Terraform tests only
make test-utils       # Utils tests only
make test-commands    # Command tests only
make test-cli         # CLI tests only
make test-integration # Integration tests only
make test-edges       # Edge case tests only
```

## Test Structure

### Test Categories

1. **Core Module Tests** (7 files)
   - AWS client operations
   - Configuration management
   - Terraform wrappers
   - Utility functions

2. **Command Tests** (5 files)
   - Setup, Up, Down, Checkpoint commands

3. **CLI and Package Tests** (3 files)
   - CLI entry point
   - Package initialization

4. **Advanced Tests** (2 files)
   - Integration workflows
   - Edge cases and errors

### Test Data

- `test_data/sample_tfvars.txt` - Sample configuration for testing
- Test fixtures in `tests/conftest.py` - Shared test data and mocks

## Output Files

### Test Results
- Location: `test_output/`
- Files:
  - `test_results_YYYYMMDD_HHMMSS.txt` - Complete test execution log
  - `test_summary_YYYYMMDD_HHMMSS.txt` - Test summary with pass/fail counts

### Coverage Reports
- Location: `htmlcov/`
- Files:
  - `index.html` - Interactive HTML coverage report
  - `test_output/coverage.json` - Coverage data in JSON format

## Sample Test Execution

```bash
$ ./scripts/run_all_tests.sh

╔════════════════════════════════════════════════════════════╗
║  CVAT Infrastructure Management CLI - Test Suite Runner    ║
╚════════════════════════════════════════════════════════════╝

📊 Test Suite Information
   Test files: 17
   Test runner: pytest
   Output directory: test_output/

🚀 Starting comprehensive test suite...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 Running: Core Module Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
...
✅ Core Module Tests: PASSED

╔════════════════════════════════════════════════════════════╗
║                    Test Execution Summary                 ║
╚════════════════════════════════════════════════════════════╝

📊 Results:
   Test Files: 17
   Categories Passed: 6
   Categories Failed: 0

✅ All tests passed!
📄 Detailed results: test_output/test_results_20251121_093000.txt
📄 Summary: test_output/test_summary_20251121_093000.txt
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      - name: Setup tests
        run: ./scripts/setup_tests.sh
      - name: Run tests
        run: ./scripts/run_all_tests.sh
      - name: Generate coverage
        run: ./scripts/test_with_coverage.sh
      - name: Upload coverage
        uses: codecov/codecov-action@v2
        with:
          files: test_output/coverage.json
```

## Troubleshooting

### Scripts Not Executable
```bash
chmod +x scripts/*.sh scripts/*.py
```

### Dependencies Missing
```bash
pip install -r tests/requirements.txt
pip install -r scripts/requirements.txt
```

### Tests Fail with Import Errors
```bash
# Ensure you're in project root
cd /path/to/project

# Reinstall dependencies
make install
```

### Coverage Not Generating
```bash
# Ensure pytest-cov is installed
pip install pytest-cov

# Run with explicit coverage
make test-coverage
```

## Best Practices

1. **Before Committing**
   ```bash
   make test-quick
   ```

2. **Before Merging**
   ```bash
   make test-all
   ```

3. **Regular Coverage Checks**
   ```bash
   make test-coverage
   ```

4. **Clean Up Regularly**
   ```bash
   make clean
   ```

## Test Coverage Goals

- **Target**: >85% code coverage
- **Current**: All public APIs covered
- **Focus**: Error paths and edge cases

## Additional Resources

- `TESTING.md` - Detailed testing documentation
- `QUICK_START_TESTING.md` - Quick reference
- `tests/README.md` - Test suite documentation
- `tests/TEST_COVERAGE.md` - Coverage details
- `tests/TEST_SUMMARY.md` - Complete test summary

