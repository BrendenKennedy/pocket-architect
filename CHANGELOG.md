# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Blueprint system for infrastructure configuration (wizard, file, CLI flags)
- Comprehensive error handling with user-friendly messages and solution guidance
- Support for YAML, JSON, and Terraform .tfvars blueprint formats
- Interactive wizard for guided configuration
- Blueprint validation and management commands

### Changed
- Reorganized project structure to follow Python packaging best practices
- Improved error messages with actionable solutions

### Fixed
- Removed placeholder directories with invalid names
- Fixed circular import issues
- Improved validation error handling

## [1.0.0] - TBD

### Added
- Initial release
- Core CLI commands (auto-annotate, cvat, train, shell, destroy)
- Provider support (AWS, CoreWeave, RunPod, Local)
- Model registry and inference engine
- Security hardening (least-privilege credentials, HTTPS, keyring)
- Cost estimation and tracking
- Session management

[Unreleased]: https://github.com/your-org/mlcloud/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/your-org/mlcloud/releases/tag/v1.0.0

