# Pocket Architect

> Your personal AWS infrastructure command center - a modern desktop app that brings clarity and control to your cloud resources.

## What is Pocket Architect?

Pocket Architect is a **native desktop application** that gives you complete visibility and control over your AWS infrastructure. Built with Tauri and React, it provides a clean, fast interface for managing your cloud resources across multiple AWS accounts.

## Key Capabilities

- 🔍 **Auto-Discovery**: Automatically finds and syncs all your AWS resources
- 💰 **Cost Tracking**: Monitor spending and identify optimization opportunities  
- 🏠 **Offline Access**: Local SQLite database keeps your data available without internet
- 🔒 **Enterprise Security**: End-to-end encryption and secure auto-updates
- 🚀 **Cross-Platform**: Native apps for Windows, macOS, and Linux
- 📊 **Unified View**: EC2, S3, Lambda, RDS, and IAM resources in one interface

## Who Should Use This?

**👩‍💻 Individual Developers**  
Manage personal AWS projects without complex dashboards - perfect for learning AWS or tracking side project resources and costs.

**👥 Small Teams**  
Share visibility into team resources with consistent practices and easy onboarding for new members.

**🏢 Organizations**  
Centralized multi-account infrastructure management with governance, audit trails, and secure credential management.

## Quick Start

**📥 Ready to use Pocket Architect?**  
→ [Download the latest release](https://github.com/BrendenKennedy/pocket-architect/releases) - No installation required!

**🛠️ Want to contribute or build from source?**  
→ See [Development Setup](#development-setup) below

---

## For End Users

### Download & Run

1. **Download** the pre-built binary from [Releases](https://github.com/BrendenKennedy/pocket-architect/releases)
2. **Verify** integrity (recommended):
   ```bash
   shasum -a 256 pocket-architect-v1.0.0-x86_64.AppImage
   # Compare with published checksum
   ```
3. **Run** the app - works on Windows, macOS, and Linux

### Setting Up AWS Access

**In the app:**
- Launch Pocket Architect
- Go to Settings → AWS Accounts
- Add your AWS credentials through the UI
- Start discovering your resources!

**Your data stays local** - credentials are securely stored and resources are cached for offline access.

---

## Development Setup

### Prerequisites & Installation

**Requirements:**
- Git, Node.js 20+, Rust, OpenSSL

**Platform Setup:**

**Windows:**
```powershell
# Install prerequisites
# Download Node.js from https://nodejs.org/
# Install Rust from https://rustup.rs/
# Install OpenSSL via Chocolatey: choco install openssl

# Clone and setup
git clone https://github.com/BrendenKennedy/pocket-architect.git
cd pocket-architect
.\scripts\powershell\setup.bat
```

**macOS:**
```bash
# Install prerequisites
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install node
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Clone and setup
git clone https://github.com/BrendenKennedy/pocket-architect.git
cd pocket-architect
./scripts/bash/setup.sh
```

**Linux:**
```bash
# Install prerequisites (Ubuntu/Debian example)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
sudo apt install openssl

# Clone and setup
git clone https://github.com/BrendenKennedy/pocket-architect.git
cd pocket-architect
./scripts/bash/setup.sh
```

### Development Workflow

```bash
# Install dependencies
npm install

# Start development server
npm run tauri dev

# Build for production
npm run tauri build

# Run tests
npm test
```

### AWS Credentials for Testing

**For development, set up credentials via .env file:**

```bash
# Create .env in project root (add to .gitignore!)
echo "AWS_ACCESS_KEY_ID=your_access_key" > .env
echo "AWS_SECRET_ACCESS_KEY=your_secret_key" >> .env
echo "AWS_DEFAULT_REGION=us-east-1" >> .env
```

**Alternative options:** AWS CLI profiles, direct env vars, or IAM roles

### Signing Keys (Releases Only)

Building releases? See [`crypto/signing-keys/README.md`](crypto/signing-keys/README.md) for signing setup.

---

## Architecture & Technical Details

**Frontend**: React with modern hooks and responsive design  
**Backend**: Rust with Tauri for native desktop integration  
**Database**: SQLite for local data persistence  
**AWS Integration**: AWS SDK for comprehensive cloud resource management

## Contributing

We welcome contributions! Please see our [Development Setup](#development-setup) section above and:

1. Fork the repository
2. Create a feature branch  
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Security Best Practices

- Never commit real AWS credentials to version control
- Use IAM users with minimal required permissions
- Rotate credentials regularly (every 90 days)
- Monitor credential usage in AWS CloudTrail

## License

[Add license information here]

## Support

- 📖 [Documentation](docs/)
- 🐛 [Report Issues](https://github.com/BrendenKennedy/pocket-architect/issues)
- 💬 [Discussions](https://github.com/BrendenKennedy/pocket-architect/discussions)

# Backend tests
cargo test

# Full validation
node scripts/node/validate-setup.js
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
- `src-tauri/README.md` - Code signing for releases

### Common Issues
- **App won't start:** Check if signing keys are set up
- **No AWS data:** Ensure credentials are decrypted and sourced
- **Build fails:** Run the validation command for your platform:
  - Windows: `node scripts\node\validate-setup.js`
  - macOS/Linux: `node scripts\node\validate-setup.js`

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
- OpenSSL (for key encryption/decryption)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pocket-architect.git
cd pocket-architect
```

2. Run the automated setup (see Onboarding section above for platform-specific instructions):
```bash
# Windows
.\scripts\powershell\setup.bat

# macOS/Linux
./scripts/bash/setup.sh
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
│   ├── bash/             # Bash scripts
│   ├── powershell/       # PowerShell/batch scripts
│   └── node/             # Node.js scripts
├── crypto/                # Security and cryptographic materials
│   ├── signing-keys/     # Key management + setup guide
│   ├── certificates/     # Code signing certificates
│   └── keys/             # GitHub secrets templates
├── .github/               # CI/CD workflows + pipeline docs
│   └── workflows/
```

## Testing

Run the test suite:

```bash
# Backend tests
cd src-tauri && cargo test

# Frontend tests
cd src && npm test
```

## CI/CD Pipeline

### Overview

Pocket Architect uses an optimized CI/CD pipeline that leverages Tauri's built-in capabilities for efficient cross-platform builds and deployments.

### Pipeline Features

#### 🚀 **Fast Feedback Loop**
- **Parallel Testing**: Frontend and backend tests run simultaneously
- **Early Failure Detection**: Tests run before builds to catch issues quickly
- **Cross-Platform Validation**: Tests run on Linux for speed, builds on all platforms

#### 🔧 **Tauri-Optimized Builds**
- **Native Tauri Action**: Uses `tauri-apps/tauri-action@v0` for official support
- **Smart Caching**: Separate caches for Rust and Node.js dependencies
- **Bundle Optimization**: Configured for all target platforms (Windows, macOS, Linux)
- **Artifact Management**: Automatic upload of build artifacts

#### 📦 **Release Automation**
- **Semantic Versioning**: Tag-based releases (e.g., `v1.2.3`)
- **Multi-Platform Bundles**: Creates installers for all supported platforms
- **GitHub Releases**: Automatic release creation with assets
- **Update Support**: Ready for Tauri's built-in updater

### Workflow Structure

#### CI Pipeline (`ci.yml`)
```
├── test-tauri (ubuntu-latest)
│   ├── Setup dependencies
│   ├── Run frontend tests + coverage
│   ├── Run Rust tests + linting
│   └── Validate formatting
│
├── build-tauri (ubuntu/win/mac matrix)
│   ├── Cross-platform builds
│   ├── Bundle creation
│   └── Artifact upload
│
└── release (ubuntu-latest, on release only)
    ├── Download all artifacts
    ├── Create release archives
    └── Upload to GitHub Releases
```

#### Release Pipeline (`release.yml`)
```
└── publish-tauri (ubuntu-latest, on tag push)
    ├── Full test suite
    ├── Multi-platform builds
    ├── Code signing (if configured)
    ├── Create GitHub release
    └── Upload installers
```

### Required Secrets

For automated releases, configure these GitHub secrets:
- `TAURI_PRIVATE_KEY`: Base64-encoded updater private key
- `TAURI_KEY_PASSWORD`: Password for the private key
- `WINDOWS_CERTIFICATE`: Base64-encoded Windows code signing certificate (optional)
- `MACOS_CERTIFICATE`: Base64-encoded macOS code signing certificate (optional)

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
