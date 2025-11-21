# Legacy Tests

This directory contains tests for the legacy CVAT infrastructure management CLI that is now in `legacy-infrastructure/scripts/`.

## Running Legacy Tests

To run these tests, you need to install the legacy dependencies:

```bash
pip install -r ../scripts/requirements.txt
```

Then run the tests:

```bash
# From project root
pytest legacy-infrastructure/tests/

# Or from this directory
cd legacy-infrastructure/tests
pytest
```

## Test Files

These tests cover the old Click-based CLI and are kept for reference:
- `test_aws.py` - AWS client tests
- `test_config.py` - Configuration management tests
- `test_terraform.py` - Terraform wrapper tests
- `test_utils.py` - Utility function tests
- `test_setup.py` - Setup command tests
- `test_up.py` - Up command tests
- `test_down.py` - Down command tests
- `test_checkpoint.py` - Checkpoint command tests
- And other comprehensive/edge case tests

## Note

These tests are for the **legacy code** and are not part of the new mlcloud CLI test suite. The new CLI tests are in `tests/` at the project root.

