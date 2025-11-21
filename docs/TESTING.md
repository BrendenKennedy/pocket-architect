# Testing Guide

This guide explains how to run the test suite for mlcloud.

> **Note**: For detailed setup instructions and script documentation, see [TESTING_SETUP.md](TESTING_SETUP.md). This guide focuses on running tests during development.

## Quick Start

### One-Command Setup and Test

```bash
# Setup and run all tests
pytest
```

### Using Make

```bash
# Setup
make install-dev

# Run all tests
make test

# Quick test during development
pytest -x  # Stop on first failure

# Tests with coverage
pytest --cov=mlcloud --cov-report=html
```

## Test Structure

### Test Files

The test suite is organized in `tests/`:
- `unit/` - Fast, isolated unit tests
- `integration/` - Integration tests requiring external services
- `fixtures/` - Shared test fixtures

### Running Tests

#### Run All Tests
```bash
pytest
```

#### Run Specific Test File
```bash
pytest tests/test_cli.py
```

#### Run Specific Test
```bash
pytest tests/test_cli.py::test_version_command
```

#### Run with Verbose Output
```bash
pytest -v
```

#### Run with Coverage
```bash
pytest --cov=mlcloud --cov-report=html
```

#### Run Specific Test Category
```bash
# Integration tests only
pytest -m integration

# Unit tests only (default)
pytest -m "not integration"
```

## Test Output

### Coverage Reports

Coverage reports are generated in:
- `htmlcov/index.html` - Interactive HTML coverage report
- Terminal output - Summary with missing lines

## Continuous Integration

Tests run automatically on:
- Push to main branch
- Pull requests
- See `.github/workflows/` for CI configuration

## Troubleshooting

### Tests Fail with Import Errors

```bash
# Ensure you're in the project root
cd /path/to/project

# Reinstall dependencies
pip install -e ".[dev]"
```

### Coverage Not Generating

```bash
# Ensure pytest-cov is installed
pip install pytest-cov

# Run with explicit coverage
pytest --cov=mlcloud --cov-report=html
```

### Tests Hang or Timeout

Some tests use mocks and should be fast. If tests hang:
1. Check for infinite loops in test code
2. Verify mocks are properly configured
3. Run tests individually to isolate the issue

## Best Practices

1. **Run tests before committing**
   ```bash
   pytest -x
   ```

2. **Check coverage regularly**
   ```bash
   pytest --cov=mlcloud --cov-report=html
   ```

3. **Write tests for new code**
   - Follow existing test patterns
   - Use fixtures from `conftest.py`
   - Mock external dependencies

## Test Coverage Goals

- **Target**: >85% code coverage
- **Current**: All public APIs covered
- **Focus**: Error paths and edge cases

## Additional Resources

- `tests/README.md` - Detailed test documentation
- `pytest.ini` - Pytest configuration
- `docs/TESTING_SETUP.md` - Detailed testing setup guide

