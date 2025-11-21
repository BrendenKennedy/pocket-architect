# Documentation Guide

This guide explains the purpose of each documentation file and when to read it.

## Core Documentation Files

### For Understanding the System

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Start here to understand:
  - How the system is designed
  - Component interactions and data flow
  - Design principles and extension points
  - **When to read**: Understanding how pocket-architect works internally

- **[STRUCTURE.md](STRUCTURE.md)** - Read this to understand:
  - File and directory organization
  - Where to find specific code
  - Package layout and organization
  - **When to read**: Navigating the codebase, finding files

### For Development

- **[TESTING.md](TESTING.md)** - Quick reference for:
  - Running tests during development
  - Pytest commands and options
  - Test organization
  - **When to read**: Daily development, running tests

- **[TESTING_SETUP.md](TESTING_SETUP.md)** - Comprehensive guide for:
  - Initial test environment setup
  - Test automation scripts
  - CI/CD integration
  - Detailed troubleshooting
  - **When to read**: First-time setup, CI/CD configuration

- **[SECURITY.md](SECURITY.md)** - Security information:
  - Security features and best practices
  - Security checklist
  - Quick start for secure deployments
  - **When to read**: Security reviews, secure deployment setup

### For Users

- **[../README.md](../README.md)** - Main project README
  - Installation and quick start
  - Basic usage examples
  - Feature overview

- **[../EXAMPLES.md](../EXAMPLES.md)** - Detailed usage examples
  - Comprehensive workflow examples
  - All command options explained

- **[../USAGE_EXAMPLES.md](../USAGE_EXAMPLES.md)** - Quick reference
  - Common commands
  - Quick copy-paste examples

- **[../QUICK_DEMO.md](../QUICK_DEMO.md)** - Quick start guide
  - Fastest path to get started
  - Key features overview

## Documentation Organization

### Why Two Files for Similar Topics?

Some topics have two files with different purposes:

1. **ARCHITECTURE.md vs STRUCTURE.md**
   - **ARCHITECTURE.md**: System design, how components interact
   - **STRUCTURE.md**: File locations, directory layout
   - **Analogy**: Architecture = "how a house works", Structure = "where rooms are"

2. **TESTING.md vs TESTING_SETUP.md**
   - **TESTING.md**: Quick reference for daily use
   - **TESTING_SETUP.md**: Comprehensive setup and automation
   - **Analogy**: Testing = "how to use a tool", Testing Setup = "how to install and configure the tool"

### AI Agent Context Files

The `agent/` subdirectory contains files used during development:
- Planning documents
- Status tracking
- Implementation notes

These are **not** for end users and may be outdated. They're kept for historical reference.

## Quick Navigation

**I want to...**

- **Understand how pocket-architect works** → [ARCHITECTURE.md](ARCHITECTURE.md)
- **Find a specific file** → [STRUCTURE.md](STRUCTURE.md)
- **Run tests quickly** → [TESTING.md](TESTING.md)
- **Set up testing from scratch** → [TESTING_SETUP.md](TESTING_SETUP.md)
- **Deploy securely** → [SECURITY.md](SECURITY.md)
- **Get started using pocket-architect** → [../README.md](../README.md)
- **See usage examples** → [../EXAMPLES.md](../EXAMPLES.md)

## Contributing

When adding documentation:
1. Check if a file already exists for the topic
2. If similar content exists, clarify the distinction
3. Update this guide if adding new documentation files
4. Cross-reference related documents

