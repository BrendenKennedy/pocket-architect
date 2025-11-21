# Root Directory Organization

The root directory is kept minimal and organized. Here's what belongs where:

## Root Directory (Minimal)

Only essential files for the Python package:

- **`README.md`** - Main project documentation (required)
- **`LICENSE`** - MIT License (required for package)
- **`pyproject.toml`** - Package configuration (required)
- **`Makefile`** - Development tasks (standard practice)
- **`.gitignore`** - Git ignore rules
- **`.pre-commit-config.yaml`** - Pre-commit hooks
- **`.yamllint.yml`** - YAML linting config

## Documentation (`docs/`)

All documentation files:

- **`docs/README.md`** - Documentation index
- **`docs/ARCHITECTURE.md`** - System architecture
- **`docs/LEGACY.md`** - Legacy code documentation
- **`docs/project/CHANGELOG.md`** - Version history
- **`docs/project/CONTRIBUTING.md`** - Contribution guidelines
- **`docs/project/IMPLEMENTATION_STATUS.md`** - Implementation status
- **`docs/project/STRUCTURE.md`** - Project structure

## Python Code (`mlcloud/`)

All Python code for the CLI:

- **`mlcloud/`** - Main package
  - No markdown files
  - No shell scripts (except embedded Terraform user_data.sh which are part of infrastructure)
  - Only Python code

## Tests (`tests/`)

All test code:

- **`tests/unit/`** - Unit tests
- **`tests/integration/`** - Integration tests
- **`tests/fixtures/`** - Test fixtures

## Legacy Code (`legacy-infrastructure/`)

All deprecated/non-CLI code:

- **`legacy-infrastructure/scripts/`** - Deprecated scripts
- **`legacy-infrastructure/terraform/`** - Legacy Terraform
- **`legacy-infrastructure/terraform_modules/`** - Legacy modules

## Examples (`examples/`)

Example configurations:

- **`examples/blueprint-*.yaml`** - Example blueprints
- **`examples/blueprint-*.tfvars`** - Example Terraform variables

## Rules

1. **No markdown files in root** (except README.md)
2. **No shell scripts in root** (all in legacy-infrastructure/)
3. **No markdown files in mlcloud/** (only Python code)
4. **All documentation in docs/**
5. **All project docs in docs/project/**

