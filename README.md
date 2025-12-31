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

## Quick Start

### For New Team Members
If you're new to the team, start here:
- 📖 **[Welcome to the Team](docs/welcome/WELCOME_TO_TEAM.md)** - Complete onboarding guide
- 🚀 Run `wsl ./scripts/welcome.sh` to set up your environment

### Prerequisites

- Node.js 18+
- Rust 1.77+
- (Optional) AWS credentials for live data

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pocket-architect.git
cd pocket-architect
```

2. Install frontend dependencies:
```bash
cd src
npm install
```

3. Build and run the application:
```bash
cd ../src-tauri
cargo tauri dev
```

### Development

- **Frontend**: `cd src && npm run dev`
- **Backend**: `cd src-tauri && cargo run`
- **Full App**: `cd src-tauri && cargo tauri dev`

## AWS Setup (Optional)

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

## 🎉 Complete Setup - Ready for Production!

Pocket Architect is now fully configured with:

### ✅ **Core Features**
- AWS account management and resource discovery
- Cross-platform desktop application (Windows/macOS/Linux)
- Modern React UI with auto-update capabilities
- SQLite database with encrypted credential storage

### ✅ **CI/CD Pipeline**
- GitHub Actions with cross-platform builds
- Smart caching and parallel execution
- Automated testing and linting
- Release management with signed binaries

### ✅ **Security & Updates**
- Code signing support for all platforms
- Built-in auto-updater with secure verification
- Enterprise-grade security practices
- Comprehensive documentation

### 🚀 **Quick Start Commands**

```bash
# One-command setup (recommended)
./setup.sh

# Or manual setup
npm install
cd src && npm install
./scripts/setup-signing.sh
npm run tauri:dev
```

### 🔑 **Next Steps**

1. **Run Setup**: Execute `./setup.sh` to configure everything
2. **Configure GitHub**: Add secrets following `keys/github-secrets-template.md`
3. **Test Locally**: Run `npm run tauri:dev` to start development
4. **Push to GitHub**: Trigger the CI/CD pipeline
5. **Optional**: Set up code signing certificates for production releases

### 📚 **Documentation**

- **[CI/CD Pipeline](docs/cicd/CI-CD.md)** - Build and deployment details
- **[Code Signing](docs/cicd/CODE_SIGNING.md)** - Security setup guide
- **Setup Scripts**: Automated configuration and validation

---

**Built with ❤️ using Tauri, React, and Rust - Production Ready! 🚀**