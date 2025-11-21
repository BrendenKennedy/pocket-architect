# Legacy Infrastructure Code

This directory contains legacy code from the previous CVAT infrastructure management tool. This code is **not part of the mlcloud CLI** and is kept for reference only.

## Contents

### `scripts/`
The old Click-based CLI implementation. This has been superseded by the new Typer-based CLI in `mlcloud/`.

**Note**: This code is deprecated and should not be used for new development.

### `terraform/`
Old Terraform configurations for AWS CVAT infrastructure. These have been superseded by the embedded Terraform modules in `mlcloud/providers/aws/terraform/`.

### `configs/`
Old configuration files (terraform.tfvars) from the previous tool.

### `test_data/`
Old test data files used by the legacy test suite.

### `ARCHITECTURE.md`
Architecture documentation for the old CVAT infrastructure tool.

## Migration Notes

If you're migrating from the old tool to mlcloud:

1. The new CLI is in `mlcloud/` at the root level
2. Terraform modules are now embedded in `mlcloud/providers/aws/terraform/`
3. Configuration is now managed through blueprints (see `examples/` directory)
4. The new CLI uses Typer instead of Click
5. The new CLI supports multiple providers (AWS, CoreWeave, RunPod, Local)

## See Also

- `../README.md` - Main project documentation
- `../docs/ARCHITECTURE.md` - Architecture of the new mlcloud CLI
- `../docs/LEGACY.md` - More information about legacy code
