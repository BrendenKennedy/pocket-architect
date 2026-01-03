#!/bin/bash
# ============================================================================
# Pocket Architect - Complete Setup Script
# ============================================================================
# Sets up the entire development environment and production pipeline
# ============================================================================

set -e

echo "🚀 Pocket Architect - Complete Setup"
echo "====================================="
echo

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

# OS detection and dependency install
OS_TYPE="$(uname -s)"
if [[ "$OS_TYPE" == "Linux" ]]; then
    if command -v apt &> /dev/null; then
        echo -e "${BLUE}Detected Linux (apt available). Installing dependencies...${NC}"
        sudo apt update
        sudo apt install -y build-essential openssl curl git
    else
        echo -e "${YELLOW}Linux detected, but apt not found. Please install dependencies manually: build-essential openssl curl git${NC}"
    fi
elif [[ "$OS_TYPE" == "Darwin" ]]; then
    if command -v brew &> /dev/null; then
        echo -e "${BLUE}Detected macOS (brew available). Installing dependencies...${NC}"
        brew update
        brew install openssl curl git
    else
        echo -e "${YELLOW}macOS detected, but Homebrew not found. Please install dependencies manually: openssl curl git${NC}"
        echo -e "${YELLOW}Install Homebrew from https://brew.sh if needed.${NC}"
    fi
else
    echo -e "${RED}Unsupported OS: $OS_TYPE. This script supports Linux and macOS only.${NC}"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 20+ from https://nodejs.org/${NC}"
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
REQUIRED_VERSION="20.0.0"
if ! [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
    echo -e "${RED}❌ Node.js version $NODE_VERSION is too old. Please upgrade to Node.js 20+${NC}"
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found. Please install npm${NC}"
    exit 1
fi


# Check Rust
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Rust not found. Please install Rust from https://rustup.rs/${NC}"
    exit 1
fi

# Check npx
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx not found. Please ensure you have npm 5.2+ or install npx manually.${NC}"
    exit 1
fi

# Check OpenSSL
if ! command -v openssl &> /dev/null; then
    echo -e "${YELLOW}⚠️  OpenSSL not found. Required for key encryption/decryption.${NC}"
    echo -e "${YELLOW}   Install via: apt install openssl (Ubuntu/Debian) or brew install openssl (macOS)${NC}"
    echo -e "${YELLOW}   Continuing setup, but key operations may fail...${NC}"
else
    echo -e "${GREEN}✅ OpenSSL found: $(openssl version | head -n1)${NC}"
fi

echo -e "${GREEN}✅ Prerequisites OK${NC}"
echo


# Setup directories
echo -e "${BLUE}Setting up project structure...${NC}"
mkdir -p crypto/signing-keys certificates

# Install root dependencies
echo -e "${BLUE}Installing root dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Root dependencies installed${NC}"

# Check Tauri CLI (global first)
echo -e "${BLUE}Checking for Tauri CLI...${NC}"
if command -v tauri &> /dev/null; then
    TAURI_VERSION=$(tauri --version)
    echo -e "${GREEN}✅ Tauri CLI (global): $TAURI_VERSION${NC}"
else
    # Check local (npx)
    if npx tauri --version &> /dev/null; then
        TAURI_VERSION=$(npx tauri --version)
        echo -e "${GREEN}✅ Tauri CLI (npx): $TAURI_VERSION${NC}"
    else
        echo -e "${YELLOW}Tauri CLI not found. Installing as a devDependency...${NC}"
        npm install --save-dev @tauri-apps/cli
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Failed to install @tauri-apps/cli. Please run 'npm install --save-dev @tauri-apps/cli' manually.${NC}"
            exit 1
        fi
        if npx tauri --version &> /dev/null; then
            TAURI_VERSION=$(npx tauri --version)
            echo -e "${GREEN}✅ Tauri CLI (npx): $TAURI_VERSION${NC}"
        else
            echo -e "${RED}❌ Tauri CLI still not available after install. Please check your npm setup and PATH.${NC}"
            exit 1
        fi
    fi
fi

# Install frontend dependencies
echo -e "${BLUE}Installing frontend dependencies...${NC}"
cd src
npm install
echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
cd ..

# Setup code signing and updater
echo -e "${BLUE}Setting up code signing and updater...${NC}"
chmod +x scripts/setup-updater-keys.sh
./scripts/setup-updater-keys.sh

# Make scripts executable
echo -e "${BLUE}Making scripts executable...${NC}"
chmod +x scripts/setup-macos-signing.sh
chmod +x scripts/validate-setup.js

echo -e "${GREEN}✅ Scripts configured${NC}"

# Validate setup
echo -e "${BLUE}Validating setup...${NC}"
node scripts/validate-setup.js

echo
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo
echo -e "${BLUE}Next steps:${NC}"
echo "1. 🔑 Review the generated keys in the 'crypto/signing-keys' directory"
echo "2. 📝 Follow docs/setup/KEY_SETUP.md to set up GitHub secrets (boss only)"
echo "3. 📖 Read docs/welcome/WELCOME_TO_TEAM.md for complete team onboarding"
echo "4. 🏗️  Test the build locally: npm run tauri:dev"
echo "5. 🚀 Push to GitHub to trigger the CI/CD pipeline"
echo "6. 📦 Optionally set up code signing certificates"
echo
echo -e "${YELLOW}Useful commands:${NC}"
echo "  # Development"
echo "  npm run dev              # Start frontend dev server"
echo "  npm run tauri:dev        # Start Tauri dev mode"
echo "  "
echo "  # Building"
echo "  npm run build            # Build frontend"
echo "  npm run tauri:build      # Build Tauri app"
echo "  "
echo "  # Testing"
echo "  npm test                 # Frontend tests"
echo "  npm run test:backend     # Backend tests"
echo "  "
echo "  # Validation"
echo "  node scripts/validate-setup.js  # Validate configuration"
echo
echo -e "${BLUE}Documentation:${NC}"
echo "  📖 README.md              # Project overview"
echo "  📋 docs/cicd/CI-CD.md         # CI/CD pipeline docs"
echo "  🔐 docs/cicd/CODE_SIGNING.md  # Code signing setup"
echo
echo -e "${GREEN}Happy coding! 🎉${NC}"