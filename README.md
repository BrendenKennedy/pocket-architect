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

---


**Built with ❤️ using Tauri, React, and Rust - Production Ready! 🚀**
