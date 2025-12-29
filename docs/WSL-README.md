# Pocket Architect - WSL Testing Setup

## Option 1: Manual WSL Setup

1. Open WSL terminal:
   ```bash
   wsl -d Ubuntu-24.04
   ```

2. Install dependencies:
   ```bash
   sudo apt update
   sudo apt install -y build-essential cmake pkg-config libssl-dev curl
   ```

3. Install Rust:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env
   ```

4. Build and test:
   ```bash
   cd /mnt/c/Users/Brend/Projects/pocket-architect/src-tauri
   cargo build --features aws-sdk
   ```

## Option 2: Docker Setup (Recommended)

1. Install Docker Desktop for Windows
2. Run the build script:
   ```bash
   scripts/build-docker.bat
   ```

## Option 3: Cross-Compilation

The project is configured for cross-platform development:
- **Windows**: Development, UI testing, mock operations
- **Linux/Mac**: Full AWS integration testing

Build scripts automatically handle platform differences.