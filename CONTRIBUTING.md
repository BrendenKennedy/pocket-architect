# Contributing to mlcloud

Thank you for your interest in contributing to mlcloud!

## Development Setup

1. Clone the repository
2. Install in development mode:
   ```bash
   pip install -e ".[dev]"
   ```
3. Run tests:
   ```bash
   pytest
   ```

## Code Style

- Use `black` for formatting (line length: 100)
- Use `ruff` for linting
- Use `mypy` for type checking (optional, not strict)

## Security Requirements

- All Terraform code must pass `checkov --compact` and `tfsec`
- Never store credentials in code or files (use keyring)
- All provider credentials must be validated for least-privilege
- HTTPS must be enforced for all CVAT deployments

## Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Test with multiple providers when possible

## Pull Request Process

1. Create a feature branch
2. Make your changes
3. Ensure all tests pass
4. Run security checks on Terraform code
5. Update documentation
6. Submit PR with clear description

## Architecture Guidelines

- Follow the existing provider abstraction pattern
- Use Pydantic models for data validation
- Store all state in `~/.mlcloud/`
- Use Rich for all user-facing output
- Implement proper error handling with custom exceptions

