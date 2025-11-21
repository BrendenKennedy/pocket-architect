# Test Suite

This directory contains tests for the **mlcloud CLI** (the new Typer-based CLI).

## Test Structure

```
tests/
├── unit/              # Unit tests (fast, isolated)
├── integration/       # Integration tests (slower, require services)
├── fixtures/          # Shared test fixtures
├── test_cli.py        # CLI command tests
└── test_local_provider.py  # Local provider tests
```

## Running Tests

```bash
# Run all tests
pytest

# Run only unit tests
pytest tests/unit/

# Run only integration tests
pytest tests/integration/

# Run with coverage
pytest --cov=mlcloud

# Run specific test file
pytest tests/test_cli.py
```

## Legacy Tests

Tests for the old Click-based CLI are now in `legacy-infrastructure/tests/`. Those tests are kept for reference but are not part of the main test suite.

## Test Coverage

The test suite covers:
- CLI commands and help text
- Provider implementations (Local, AWS, CoreWeave, RunPod)
- Core functionality (sessions, state, cost tracking)
- Model registry and inference
- Security and credential management
