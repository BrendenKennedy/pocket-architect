# Welcome to Pocket Architect! 🎉

## Introduction

Welcome to the Pocket Architect team! This document will get you up and running with our AWS resource management desktop application. Pocket Architect is a modern desktop app built with Tauri (Rust backend + React frontend) that helps manage and monitor AWS infrastructure.

### What Pocket Architect Does

**Core Features:**
- **AWS Account Management**: Securely connect multiple AWS accounts
- **Resource Discovery**: Automatically find and sync EC2 instances, S3 buckets, Lambda functions, RDS databases, and IAM resources
- **Infrastructure Monitoring**: Real-time health checks and cost tracking
- **Cross-Platform**: Native desktop app for Windows, macOS, and Linux

**How It Works:**
- **Frontend**: React app with modern UI for viewing and managing resources
- **Backend**: Rust application that securely communicates with AWS APIs
- **Database**: Local SQLite database for caching and offline access
- **Security**: End-to-end encryption for credentials and secure auto-updates

## Getting Started (Step-by-Step)

### Step 1: Environment Setup

**Prerequisites:** Git installed, and one of: Windows (with or without WSL), macOS, or Linux.

#### Windows
1. **Install prerequisites:**
   - Download and install Node.js 20+ from https://nodejs.org/
   - Install Rust from https://rustup.rs/
   - (Optional) Enable WSL for better development experience

2. **Clone the repository:**
   ```powershell
   git clone https://github.com/yourusername/pocket-architect.git
   cd pocket-architect
   ```

3. **Run the automated setup:**
   ```powershell
   .\setup.bat
   ```
   Or if using WSL:
   ```bash
   wsl ./setup.sh
   ```

#### macOS
1. **Install prerequisites:**
   - Install Homebrew: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
   - Install Node.js: `brew install node`
   - Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

2. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/pocket-architect.git
   cd pocket-architect
   ```

3. **Run the automated setup:**
   ```bash
   ./setup.sh
   ```

#### Linux
1. **Install prerequisites:**
   - Install Node.js 20+ (using your package manager, e.g., for Ubuntu: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs`)
   - Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

2. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/pocket-architect.git
   cd pocket-architect
   ```

3. **Run the automated setup:**
   ```bash
   ./setup.sh
   ```

4. **Verify setup:**
   The script will validate your environment and show ✅ if everything is ready.

### Step 2: Get Access Credentials

**You need two types of credentials:**

#### A. Signing Keys (Required for the app to run)
- **Who provides:** The "boss" (key holder) - contact them separately
- **What you get:** Encrypted private key file + passphrase
- **Setup:**
  1. Receive `signing-keys/privateKey.enc` and passphrase from boss
  2. Place the file in `signing-keys/privateKey.enc`
  3. Get the public key and add it to `src-tauri/tauri.conf.json`
- **Why:** Enables secure auto-updates and app integrity

#### B. AWS Credentials (Optional, for live data)
- **Who provides:** The boss - contact them separately
- **What you get:** Encrypted AWS credentials file + passphrase
- **Setup:**
  ```bash
  # When you need AWS access:
  ./scripts/decrypt-aws-creds.sh
  source config/aws-credentials.env
  # Run your app/tests
  rm config/aws-credentials.env  # Clean up immediately
  ```
  On Windows (PowerShell):
  ```powershell
  .\scripts\decrypt-aws-creds.bat
  . .\config\aws-credentials.env
  # Run your app/tests
  Remove-Item .\config\aws-credentials.env  # Clean up immediately
  ```
- **Why:** Allows testing with real AWS data instead of mock data

### Step 3: Run the Application

**Development Mode:**
```bash
npm run tauri:dev
```
On Windows (if not using WSL):
```powershell
npm run tauri:dev
```

This starts the full desktop app with hot reloading.

**Alternative Commands:**
- `npm run dev` - Frontend only (web browser)
- `cargo run --features aws-sdk` - Backend only

**First Run Experience:**
- If no AWS credentials: Shows mock/sample data for development
- If AWS credentials loaded: Connects to real AWS APIs
- App automatically detects which mode to use

### Step 4: Development Workflow

**Daily Development:**
1. Pull latest changes: `git pull`
2. Make your changes in VS Code
3. Test locally: `npm run tauri:dev`
4. Run tests: `npm test`
5. Commit and push

**Code Structure:**
- `src/` - React frontend (components, pages, styles)
- `src-tauri/` - Rust backend (AWS integration, database, Tauri config)
- `scripts/` - Build and utility scripts
- `docs/` - Detailed documentation

**Key Files to Know:**
- `src-tauri/tauri.conf.json` - App configuration
- `src-tauri/Cargo.toml` - Rust dependencies
- `src/package.json` - Frontend dependencies
- `.github/workflows/ci.yml` - CI/CD pipeline

### Step 5: Testing & Quality

**Run Tests:**
```bash
# Frontend tests
npm test

# Backend tests
cargo test

# Full validation
node scripts/validate-setup.js
```
On Windows:
```powershell
# Same commands work in PowerShell
npm test
cargo test
node scripts\validate-setup.js
```

**Code Quality:**
- ESLint for JavaScript/React
- Clippy for Rust
- Pre-commit hooks ensure quality

### Step 6: Deployment & Releases

**How Releases Work:**
1. Push to `main` branch → CI runs tests
2. Create GitHub release → Triggers build for all platforms
3. App automatically updates via built-in updater

**Your Role in Deployment:**
- Ensure your code passes CI
- Test thoroughly before merging
- The "boss" handles signing keys and GitHub secrets

## Security & Best Practices

### 🔐 Security First
- **Never commit credentials** to git
- **Use encrypted credentials** only
- **Clean up decrypted files** immediately
- **Report security issues** immediately

### 📋 Development Guidelines
- **Use your OS's terminal** for all development commands (PowerShell on Windows, Terminal on macOS/Linux)
- **Test with mock data** by default
- **Use real AWS data** only when necessary
- **Keep dependencies updated**
- **Follow the established patterns**

## Getting Help

### Documentation
- `docs/setup/KEY_SETUP.md` - Detailed key setup guide
- `docs/security/AWS_TEST_CREDENTIALS.md` - AWS credential management
- `docs/cicd/CODE_SIGNING.md` - Code signing for releases
- `docs/cicd/CI-CD.md` - CI/CD pipeline details

### Common Issues
- **App won't start:** Check if signing keys are set up
- **No AWS data:** Ensure credentials are decrypted and sourced
- **Build fails:** Run `wsl ./scripts/welcome.sh` to validate setup

### Who to Contact
- **Technical issues:** Check existing issues or create new ones
- **Access/credentials:** Contact the "boss" (key holder)
- **Architecture questions:** Review the docs or ask in discussions

## What's Next?

**Week 1:**
- Get familiar with the codebase
- Set up your development environment
- Make a small contribution (bug fix, documentation improvement)

**Week 2:**
- Understand the AWS integration patterns
- Learn the React component structure
- Start working on assigned features

**Ongoing:**
- Keep your environment updated
- Participate in code reviews
- Help improve documentation and processes

---

**Welcome aboard!** We're excited to have you contribute to Pocket Architect. This guide should get you productive quickly while maintaining our high security and quality standards. If anything is unclear, don't hesitate to ask! 🚀