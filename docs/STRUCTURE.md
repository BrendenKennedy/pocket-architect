# Project Structure

This document describes the file and directory organization of the mlcloud project.

> **Note**: For system architecture and design principles, see [ARCHITECTURE.md](ARCHITECTURE.md). This document focuses on where files are located and how the project is organized.

## Directory Structure

```
mlcloud/
├── .github/                    # GitHub configuration
│   └── workflows/             # CI/CD workflows
├── docs/                       # Documentation
│   ├── agent/                 # AI agent context files
│   │   ├── PLAN.md
│   │   ├── STATUS.md
│   │   ├── PROGRESS.md
│   │   ├── IMPLEMENTATION_STATUS.md
│   │   ├── NEXT_STEPS.md
│   │   ├── TEST_COVERAGE_REPORT.md
│   │   └── SECURITY_IMPLEMENTATION_SUMMARY.md
│   ├── ARCHITECTURE.md        # System architecture
│   ├── STRUCTURE.md           # Project structure (this file)
│   ├── TESTING.md             # Testing guide
│   ├── TESTING_SETUP.md       # Testing setup
│   ├── SECURITY.md             # Security documentation
│   ├── SECURITY_PLAN.md        # Security hardening plan
│   ├── LEGACY.md              # Legacy code documentation
│   └── README.md              # Documentation index
├── examples/                   # Example configurations
│   └── blueprint-*.yaml       # Example blueprints
├── mlcloud/                    # Main CLI package (src-layout)
│   ├── __init__.py            # Package initialization
│   ├── __main__.py            # python -m mlcloud entry point
│   ├── cli.py                 # CLI application (Typer)
│   ├── backends/              # Backend integrations
│   │   └── terraform.py       # Terraform wrapper
│   ├── commands/               # CLI command implementations
│   │   ├── auto_annotate.py
│   │   ├── blueprint.py
│   │   ├── cvat.py
│   │   ├── destroy.py
│   │   ├── list.py
│   │   ├── shell.py
│   │   ├── status.py
│   │   └── train.py
│   ├── config/                 # Configuration management
│   │   ├── profiles.py
│   │   └── settings.py
│   ├── core/                   # Core business logic
│   │   ├── blueprint.py        # Blueprint system
│   │   ├── cost.py             # Cost tracking
│   │   ├── session.py          # Session management
│   │   ├── state.py            # State persistence
│   │   └── types.py            # Type definitions
│   ├── models/                 # ML model management
│   │   ├── adapters/           # Model-specific adapters
│   │   │   ├── detectron2.py
│   │   │   ├── grounding_dino.py
│   │   │   ├── sam2.py
│   │   │   └── yolo.py
│   │   ├── downloader.py       # Model downloader
│   │   ├── inference.py         # Inference engine
│   │   └── registry.py         # Model registry
│   ├── providers/              # Cloud provider implementations
│   │   ├── base.py             # Base provider interface
│   │   ├── aws/                 # AWS provider
│   │   │   ├── client.py
│   │   │   ├── blueprints.py
│   │   │   └── terraform/       # Embedded Terraform modules
│   │   │       ├── cvat/
│   │   │       ├── training_node/
│   │   │       └── auto_annotate/
│   │   ├── coreweave/           # CoreWeave provider
│   │   ├── local/               # Local (Docker) provider
│   │   │   └── templates/       # Docker Compose templates
│   │   └── runpod/              # RunPod provider
│   ├── security/                # Security and credentials
│   │   ├── aws_roles.py
│   │   ├── coreweave_rbac.py
│   │   ├── runpod_scopes.py
│   │   └── sandbox.py
│   └── utils/                   # Utility functions
│       ├── cost_estimator.py
│       ├── docker.py
│       ├── errors.py             # Error handling
│       ├── ip_detection.py
│       ├── keyring.py
│       ├── rclone.py
│       ├── rich_ui.py
│       ├── sso.py
│       └── validation.py
├── tests/                       # Test suite
│   ├── conftest.py              # Pytest configuration
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   └── fixtures/                # Test fixtures
├── legacy-infrastructure/       # ⚠️ DEPRECATED - Legacy code (not part of CLI)
│   ├── scripts/                 # Old Click-based CLI (deprecated)
│   ├── terraform/               # Legacy Terraform configs
│   ├── configs/                 # Old configuration files
│   ├── test_data/               # Old test data
│   ├── ARCHITECTURE.md          # Legacy architecture docs
│   ├── run_tests.sh             # Legacy test runner
│   └── README.md                # Legacy code explanation
├── .pre-commit-config.yaml      # Pre-commit hooks
├── .yamllint.yml                # YAML linting config
├── CHANGELOG.md                 # Changelog
├── CONTRIBUTING.md              # Contribution guidelines
├── LICENSE                      # MIT License
├── Makefile                     # Common tasks
├── pyproject.toml               # Project configuration
├── pytest.ini                   # Pytest configuration
└── README.md                    # Main documentation
```

## Key Directories

### Core CLI Code (Root Level)

- **`mlcloud/`** - Main Python package containing all CLI code
- **`tests/`** - Test suite for the CLI
- **`examples/`** - Example blueprints and configurations
- **`docs/`** - Documentation

### Configuration Files

- **`pyproject.toml`** - Project metadata, dependencies, build configuration
- **`.pre-commit-config.yaml`** - Pre-commit hooks configuration
- **`.yamllint.yml`** - YAML linting rules
- **`.gitignore`** - Git ignore patterns
- **`Makefile`** - Common development tasks

### Legacy Code (Separated)

- **`legacy-infrastructure/`** - All non-CLI code has been moved here
  - Deprecated scripts
  - Legacy Terraform configurations
  - Old infrastructure code

⚠️ **Note:** The `legacy-infrastructure/` directory is excluded from the package build and is kept for reference only.

## Package Organization

The `mlcloud/` package follows Python packaging best practices:

1. **Flat structure** - No unnecessary nesting
2. **Clear separation** - Commands, core, providers, models are separate
3. **Consistent naming** - All modules use snake_case
4. **Proper `__init__.py`** - All packages have proper initialization

## Test Organization

Tests are organized by type:

- `tests/unit/` - Fast, isolated unit tests
- `tests/integration/` - Slower integration tests
- `tests/fixtures/` - Shared test fixtures
- `tests/conftest.py` - Pytest configuration and shared fixtures

## Industry Standards Compliance

This structure follows:

- [PEP 8](https://pep8.org/) - Python style guide
- [PEP 517](https://peps.python.org/pep-0517/) - Build system specification
- [PEP 518](https://peps.python.org/pep-0518/) - Build dependencies
- [PEP 621](https://peps.python.org/pep-0621/) - Project metadata
- [Semantic Versioning](https://semver.org/) - Version numbering
- [Keep a Changelog](https://keepachangelog.com/) - Changelog format

## Development Workflow

```bash
# Install development dependencies
make install-dev

# Run all checks
make check

# Run tests
make test

# Format code
make format

# Build package
make build
```
