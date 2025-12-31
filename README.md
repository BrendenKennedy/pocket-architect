# Pocket Architect

A modern desktop application for AWS resource management and infrastructure orchestration, built with Tauri and React.

## Features

- **AWS Account Management**: Securely store and manage multiple AWS accounts
- **Resource Discovery**: Automatically sync and discover EC2 instances, S3 buckets, Lambda functions, RDS databases, and IAM resources
- **Infrastructure Monitoring**: Real-time health checks and cost tracking
- **Cross-Platform**: Native desktop app for Windows, macOS, and Linux
- **Modern UI**: Clean, responsive React interface

## Architecture

- **Frontend**: React with modern hooks and responsive design
- **Backend**: Rust with Tauri for native desktop integration
- **Database**: SQLite for local data persistence
- **AWS Integration**: AWS SDK for comprehensive cloud resource management

## Onboarding

Welcome to the Pocket Architect team! 🎉 This section will get you up and running with our AWS resource management desktop application.

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
- **Security Role Split**: In this open source project, the "boss" role is whoever manages the private keys for a branch (typically the branch maintainer or lead developer). Team members receive encrypted keys for local development.
- **What you get as a team member**: Encrypted private key file + passphrase from the boss
- **Setup for team members**:
  1. Receive `signing-keys/privateKey.enc` and passphrase from the boss
  2. Place the file in `signing-keys/privateKey.enc`
  3. The public key is already configured in `src-tauri/tauri.conf.json`
- **Why:** Enables secure auto-updates and app integrity
- **For security best practices**: Have a designated "boss" act as gatekeeper - they generate keys, manage GitHub secrets, and distribute encrypted keys to team members. This ensures private keys never touch team member machines in plain text.

#### B. AWS Credentials (Required, for live data)
- **Security Role Split**: Similar to signing keys - the boss manages encrypted AWS credentials and shares decryption access with team members as needed.
- **What you get as a team member**: Encrypted AWS credentials file + passphrase from the boss
- **Setup for team members**:
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
- **For security best practices**: The boss should be the gatekeeper for AWS credentials, ensuring they're encrypted and only decrypted temporarily when needed.

### Step 3: Run the Application

**Development Mode:**
```bash/powershell
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
- The boss (key manager) handles signing keys and GitHub secrets for releases

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
- **Build fails:** Run the validation command for your platform:
  - Windows: `node scripts\validate-setup.js`
  - macOS/Linux: `node scripts/validate-setup.js`

### Who to Contact
- **Technical issues:** Check existing issues or create new ones
- **Access/credentials:** Contact the boss (key manager) for your branch
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

## Quick Start

### Prerequisites

- Node.js 20+
- Rust 1.77+
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pocket-architect.git
cd pocket-architect
```

2. Run the automated setup (see Onboarding section above for platform-specific instructions):
```bash
# Windows
.\setup.bat

# macOS/Linux
./setup.sh
```

3. Run the application:
```bash
npm run tauri:dev
```

### Development

- **Frontend**: `npm run dev`
- **Full App**: `npm run tauri:dev`
- **Backend**: `cargo run --features aws-sdk`

For live AWS data integration:

1. Create AWS credentials file or set environment variables
2. Enable the `aws-sdk` feature when building:
```bash
cargo build --features aws-sdk
```

## Project Structure

```
pocket-architect/
├── src/                    # React frontend
│   ├── src/
│   │   ├── App.jsx        # Main application component
│   │   ├── App.css        # Application styles
│   │   └── assets/        # Static assets
│   └── package.json
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── main.rs        # Application entry point
│   │   ├── lib.rs         # Tauri commands and logic
│   │   └── aws/           # AWS service integrations
│   │       ├── client.rs  # AWS client setup
│   │       ├── ec2.rs     # EC2 instance management
│   │       ├── s3.rs      # S3 bucket management
│   │       ├── lambda.rs  # Lambda function management
│   │       ├── rds.rs     # RDS database management
│   │       └── types.rs   # Shared data types
│   ├── Cargo.toml
│   └── tauri.conf.json
├── scripts/               # Build and deployment scripts
├── docs/                  # Documentation
└── config/                # Configuration files
```

## Testing

Run the test suite:

```bash
# Backend tests
cd src-tauri && cargo test

# Frontend tests
cd src && npm test
```

## Building for Production

```bash
cd src-tauri
cargo tauri build
```

This creates platform-specific installers in `src-tauri/target/release/bundle/`.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

---


**Built with ❤️ using Tauri, React, and Rust - Production Ready! 🚀**


