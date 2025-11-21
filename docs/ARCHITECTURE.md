# System Architecture

## Overview

mlcloud is a Python CLI application that provides a unified interface for deploying and managing GPU computer-vision workstations across multiple cloud providers.

> **Note**: For detailed file and directory structure, see [STRUCTURE.md](STRUCTURE.md). This document focuses on system design and component interactions.

## Design Principles

1. **Provider Abstraction**: All providers implement a common `BaseProvider` interface
2. **Security First**: Least-privilege credentials, keyring storage, HTTPS enforcement
3. **User Experience**: Clear error messages, interactive wizards, comprehensive validation
4. **Extensibility**: Easy to add new providers, models, or commands

## Key Components

### CLI Layer (`mlcloud/cli.py`, `mlcloud/commands/`)
- Typer-based command-line interface
- Command registration and routing
- Global error handling

### Core Layer (`mlcloud/core/`)
- Session management
- Cost tracking
- Blueprint system
- Type definitions

### Provider Layer (`mlcloud/providers/`)
- Abstract base class for all providers
- Provider-specific implementations (AWS, Local, CoreWeave, RunPod)
- Terraform modules embedded in AWS provider

### Model Layer (`mlcloud/models/`)
- Model registry
- Model downloader
- Inference engine
- Model-specific adapters

### Security Layer (`mlcloud/security/`)
- Credential sandboxing
- Least-privilege role creation
- Provider-specific security policies

## Data Flow

1. User invokes CLI command
2. CLI parses arguments and loads configuration
3. Command handler creates/loads session
4. Provider client is instantiated
5. Provider executes operation (provision, sync, destroy, etc.)
6. Results are displayed and session is updated

## Extension Points

- **New Provider**: Implement `BaseProvider` interface
- **New Model**: Add to model registry and create adapter
- **New Command**: Add command module and register in CLI

