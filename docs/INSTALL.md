# Pocket Architect - Prerequisites Installation Guide

## Required Software

### 1. Rust (Required)
Install Rust from: https://rustup.rs/
- Download rustup-init.exe
- Run with default settings
- This installs: rustc, cargo

### 2. SQLite (Required for database)
Download from: https://www.sqlite.org/download.html
- Download "sqlite-tools-win32-x86-*.zip"
- Extract and add to PATH, OR install via:
```
winget install DaringCactus.SQLite
```

### 3. Node.js & npm (Already installed)
✅ v24.12.0 - Already available

### 4. Tauri CLI (Already installed)
✅ Already installed globally

## Manual Installation Commands

Run these commands in an elevated terminal:

```bash
# Install Rust (accept prompts)
winget install --id Rustlang.Rustup --interactive

# Install SQLite (accept prompts)  
winget install --id DaringCactus.SQLite --interactive

# Or download from https://www.sqlite.org/download.html
```

## Verify Installation

After installation, run:
```bash
rustc --version
cargo --version
sqlite3 --version
node --version
npm --version
```

## Run the Project

Once prerequisites are installed:
```bash
cd C:\Users\Brend\Projects\pocket-architect
cargo tauri dev
```