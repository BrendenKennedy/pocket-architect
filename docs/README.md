# Documentation

This directory contains documentation for the pocket-architect project.

> **New to the docs?** Start with [DOCUMENTATION_GUIDE.md](DOCUMENTATION_GUIDE.md) to understand what each file is for.

## Core Documentation

### System Understanding

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture, design principles, and component interactions
  - *Focus: How the system works, data flow, extension points*
- **[STRUCTURE.md](STRUCTURE.md)** - Detailed file and directory organization
  - *Focus: Where files are located, directory layout*

### Development

- **[TESTING.md](TESTING.md)** - Quick guide for running tests during development
  - *Focus: How to run tests, pytest commands, quick reference*
- **[TESTING_SETUP.md](TESTING_SETUP.md)** - Comprehensive testing setup and automation scripts
  - *Focus: Initial setup, test scripts, CI/CD integration, detailed workflows*
- **[SECURITY.md](SECURITY.md)** - Security documentation, checklist, and quick start

### Reference

- **[DOCUMENTATION_GUIDE.md](DOCUMENTATION_GUIDE.md)** - Guide to all documentation files
- **[LEGACY.md](LEGACY.md)** - Documentation about legacy code

## Why Some Topics Have Multiple Files?

Some topics have two files with complementary purposes:

- **ARCHITECTURE.md vs STRUCTURE.md**: Architecture explains *how* the system works; Structure shows *where* files are located
- **TESTING.md vs TESTING_SETUP.md**: Testing is a quick reference; Testing Setup is comprehensive setup documentation

See [DOCUMENTATION_GUIDE.md](DOCUMENTATION_GUIDE.md) for detailed explanations.

## AI Agent Context

The `agent/` subdirectory contains files used during development:
- Planning documents, status tracking, implementation notes
- **Not for end users** - kept for historical reference only

## Contributing Documentation

When adding new features, please update the relevant documentation files. See [DOCUMENTATION_GUIDE.md](DOCUMENTATION_GUIDE.md) for guidance on where to add new documentation.
