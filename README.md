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

## About

**Pocket Architect** is your personal AWS infrastructure command center - a modern desktop application that brings clarity and control to your cloud resources.

### What Makes Pocket Architect Special

Imagine having all your AWS infrastructure at your fingertips, beautifully organized and instantly accessible. Pocket Architect gives you:

- **📊 Complete Resource Visibility**: See all your EC2 instances, S3 buckets, Lambda functions, RDS databases, and IAM resources in one unified view
- **🔍 Smart Discovery**: Automatically finds and syncs your AWS resources across multiple accounts
- **💰 Cost Awareness**: Track spending and identify optimization opportunities
- **🏠 Local Control**: Works offline with cached data, giving you full control even without internet
- **🔒 Enterprise Security**: End-to-end encryption, secure auto-updates, and enterprise-grade code signing

### Why Choose Pocket Architect?

**For Individual Developers:**
- Manage personal AWS projects without complex dashboards
- Learn AWS resource management in a user-friendly environment
- Keep track of costs and resources across side projects

**For Small Teams:**
- Shared visibility into team AWS resources
- Consistent resource naming and tagging practices
- Easy onboarding for new team members

**For Organizations:**
- Centralized view of multi-account AWS infrastructure
- Audit trails and resource governance
- Secure credential management and access controls

### How It Works

Pocket Architect bridges the gap between your local development environment and the cloud:

- **Frontend**: A polished React interface that feels like a native desktop app
- **Backend**: Rust-powered engine that securely communicates with AWS APIs
- **Database**: Local SQLite storage for offline access and caching
- **Security**: Military-grade encryption for your credentials and automatic updates

Whether you're a solo developer managing personal projects or part of a team handling enterprise infrastructure, Pocket Architect adapts to your workflow while keeping your AWS resources secure and accessible.

## Getting Started

Ready to get Pocket Architect running? Here's your quick start guide:

### Quick Setup (3 Steps)

1. **📦 Install Dependencies** - Node.js, Rust, and Git
2. **🔑 Get Access Credentials** - Signing keys and AWS credentials
3. **🚀 Run the Application** - Build and launch

### Prerequisites

- **Git** for cloning the repository
- **Node.js 20+** for the React frontend
- **Rust** for the Tauri backend
- **OpenSSL** for encryption operations

### Platform-Specific Setup

Choose your platform below for detailed installation instructions:

#### Windows
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

#### macOS
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

#### Linux
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

### Step 2: Get Access Credentials

**You need two types of credentials:**

#### A. Signing Keys (Required for the app to run)

**Security Role Split**: In this open source project, the "boss" role is whoever manages the private keys for a branch (typically the branch maintainer or lead developer). Team members receive encrypted keys for local development.

**What you get as a team member**: Encrypted private key file + passphrase from the boss

**Why:** Enables secure auto-updates and app integrity

**For security best practices**: Have a designated "boss" act as gatekeeper - they generate keys, manage GitHub secrets, and distribute encrypted keys to team members. This ensures private keys never touch team member machines in plain text.

##### For the Boss (Key Generation and GitHub Setup)
1. Generate keys:
   ```
   npx @tauri-apps/cli signer generate --password "yourpassphrase" --write-keys crypto/signing-keys/
   ```
2. Encrypt the private key:
   ```
   openssl enc -aes-256-cbc -salt -in crypto/signing-keys/privateKey.pem -out crypto/signing-keys/privateKey.enc -k "yourpassphrase"
   rm crypto/signing-keys/privateKey.pem
   ```
3. Set up GitHub secrets (boss only):
   - Go to the GitHub repository → Settings → Secrets and variables → Actions.
   - Add `TAURI_PRIVATE_KEY`: Base64-encoded contents of `signing-keys/privateKey.enc`.
     ```
     base64 -i crypto/signing-keys/privateKey.enc
     ```
     On Windows: `certutil -encode crypto/signing-keys/privateKey.enc tmp.b64 && type tmp.b64`
     Copy the output as the secret value.
   - Add `TAURI_KEY_PASSWORD`: The passphrase used to encrypt the private key (e.g., "yourpassphrase").
   
   **Optional Code Signing Secrets:**
   - `WINDOWS_CERTIFICATE`: Base64 encoded .pfx certificate file
   - `WINDOWS_CERTIFICATE_PASSWORD`: Certificate password
   - `MACOS_CERTIFICATE`: Base64 encoded .p12 certificate file  
   - `MACOS_CERTIFICATE_PASSWORD`: Certificate password
   - `KEYCHAIN_PASSWORD`: Random password for temporary keychain
   - `MACOS_CERTIFICATE_NAME`: Name of certificate in keychain

   **Base64 Encoding for Certificates:**
   ```bash
   # Windows
   certutil -encode your-cert.pfx base64-cert.txt
   
   # macOS/Linux
   base64 -i your-cert.p12 -o base64-cert.txt
   ```
   Then copy the contents of base64-cert.txt as the secret value.
4. Configure the public key in `src-tauri/tauri.conf.json`:
   - Replace `YOUR_UPDATER_PUBLIC_KEY_HERE` with the contents of `crypto/signing-keys/publicKey.pem`.
5. Distribute:
   - Send `crypto/signing-keys/privateKey.enc` and the passphrase to team members via secure channel (e.g., encrypted email).
   - The public key is already configured in the project.

##### For Team Members (Local Setup)
1. Receive the encrypted private key and passphrase from the boss.
2. Place `privateKey.enc` in `crypto/signing-keys/privateKey.enc`.
3. The public key is already configured in the project - no additional setup needed.
4. For local builds, set env vars:
   ```
   export TAURI_PRIVATE_KEY=crypto/signing-keys/privateKey.pem
   export TAURI_KEY_PASSWORD=yourpassphrase
   ```
   On Windows (PowerShell):
   ```
   $env:TAURI_PRIVATE_KEY="crypto/signing-keys/privateKey.pem"
   $env:TAURI_KEY_PASSWORD="yourpassphrase"
   ```
   (Decrypt first: `openssl enc -d -aes-256-cbc -in crypto/signing-keys/privateKey.enc -out crypto/signing-keys/privateKey.pem -k yourpassphrase`)

**Important Notes:**
- Never commit private keys or passphrases to the repo.
- Rotate keys periodically for security.
- For code signing certificates, follow `src-tauri/README.md` (separate from updater keys).
- Only the boss should add/modify GitHub secrets.
- If keys need rotation, generate new ones, update secrets, and redistribute to team members.

#### B. AWS Credentials (Required, for live data)

**Security Role Split**: Similar to signing keys - the boss manages encrypted AWS credentials and shares decryption access with team members as needed.

**What you get as a team member**: Encrypted AWS credentials file + passphrase from the boss

**Why:** Allows testing with real AWS data instead of mock data

**For security best practices**: The boss should be the gatekeeper for AWS credentials, ensuring they're encrypted and only decrypted temporarily when needed.

##### Setting Up Test Credentials

**⚠️ SECURITY WARNING**: NEVER commit real AWS credentials to version control! Use IAM users with minimal required permissions only!

###### Method 1: Direct Environment Variables (Recommended)

Set these environment variables in your shell or `.env` file:

```bash
# AWS Test Credentials
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_DEFAULT_REGION=us-east-1
```

For production use, set real AWS credentials as environment variables.

###### Method 2: AWS CLI Configuration

If you have AWS CLI installed:

```bash
aws configure --profile pocket-architect-test
# Enter test credentials when prompted

# Then set the profile
export AWS_PROFILE=pocket-architect-test
```

###### Method 3: Test Credentials File (For CI/CD)

Create a `.env` file in your project root (add to .gitignore):

```env
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_DEFAULT_REGION=us-east-1
```

##### Test IAM User Setup (AWS Console)

Create an IAM user with these minimal permissions for testing:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeInstances",
                "ec2:DescribeRegions",
                "s3:ListAllMyBuckets",
                "s3:GetBucketLocation",
                "iam:ListUsers",
                "iam:ListRoles",
                "iam:GetUser"
            ],
            "Resource": "*"
        }
    ]
}
```

##### Running Tests with Credentials

```bash
# Load test credentials from .env file
source .env

# Run tests
cargo test --test live_data_test

# Or run with specific credentials
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE \
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
cargo test --test live_data_test
```

##### Mock vs Live Data Detection

The application automatically detects which mode to use:
- **Mock Mode**: No credentials → Returns sample data for development
- **Live Mode**: Credentials detected → Returns data from real AWS APIs

##### Security Best Practices

1. **Encrypt sensitive credentials** using the provided scripts
2. **Never commit real credentials** to version control
3. **Use IAM users** with minimal required permissions
4. **Rotate credentials** regularly (every 90 days)
5. **Use different credentials** for different environments
6. **Monitor usage** of credentials in AWS CloudTrail
7. **Delete decrypted files** immediately after use
8. **Use strong passphrases** for encryption (12+ characters, mixed case, symbols)

##### Test Credentials Status

The application includes the following test credentials for development:
- **Access Key**: `AKIAIOSFODNN7EXAMPLE` (AWS documentation example)
- **Secret Key**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` (AWS documentation example)
- **Region**: `us-east-2`

These are safe to use in code as they are the official AWS documentation examples and do not provide access to any real AWS resources.

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
- `src-tauri/` - Rust backend (AWS integration, database, Tauri config) + code signing docs
- `scripts/` - Build and utility scripts (organized by bash/, powershell/, node/)
- `crypto/` - Security and cryptographic materials
  - `crypto/signing-keys/` - Key management + setup guide (includes GitHub secrets)
- `.github/` - CI/CD workflows + pipeline documentation

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