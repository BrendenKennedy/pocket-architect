# Pocket Architect

> Your personal AWS infrastructure command center - a modern desktop app that brings clarity and control to your cloud resources.

## What is Pocket Architect?

Pocket Architect is a **native desktop application** that gives you complete visibility and control over your AWS infrastructure. Built with Tauri and React, it provides a clean, fast, and secure interface for managing your cloud resources across multiple AWS accounts.

## Quick Start

**📥 Ready to use Pocket Architect?**  
→ [How to download for use](#for-end-users) - No installation required!

**🛠️ Want to contribute or build from source?**  
→ See [Development Setup](#development-setup) below

---

## Overview

### Architecture & Technical Details

**Frontend**: React with modern hooks and responsive design  
**Backend**: Rust with Tauri for native desktop integration  
**Database**: SQLite for local data persistence  
**AWS Integration**: AWS SDK for comprehensive cloud resource management

### Key Capabilities

- 🔍 **Auto-Discovery**: Automatically finds and syncs all your AWS resources
- 💰 **Cost Tracking**: Monitor spending and identify optimization opportunities  
- 🏠 **Offline Access**: Local SQLite database keeps your data available without internet
- 🔒 **Enterprise Security**: End-to-end encryption and secure auto-updates
- 🚀 **Cross-Platform**: Native apps for Windows, macOS, and Linux
- 📊 **Unified View**: EC2, S3, Lambda, RDS, and IAM resources in one interface

### Who Should Use This?

**👩‍💻 Individual Developers**  
Manage personal AWS projects without complex dashboards - perfect for learning AWS or tracking side project resources and costs.

**👥 Small Teams**  
Share visibility into team resources with consistent practices and easy onboarding for new members.

**🏢 Organizations**  
Centralized multi-account infrastructure management with governance, audit trails, and secure credential management.

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

