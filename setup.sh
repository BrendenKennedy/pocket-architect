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

echo -e "${GREEN}✅ Prerequisites OK${NC}"
echo

# Setup directories
echo -e "${BLUE}Setting up project structure...${NC}"
mkdir -p keys certificates scripts docs

# Install root dependencies
echo -e "${BLUE}Installing root dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Root dependencies installed${NC}"

# Install frontend dependencies
echo -e "${BLUE}Installing frontend dependencies...${NC}"
cd src
npm install
echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
cd ..

# Setup code signing and updater
echo -e "${BLUE}Setting up code signing and updater...${NC}"
chmod +x scripts/setup-signing.sh
./scripts/setup-signing.sh

# Make scripts executable
echo -e "${BLUE}Making scripts executable...${NC}"
chmod +x scripts/build-tauri.sh
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
echo "1. 🔑 Review the generated keys in the 'keys' directory"
echo "2. 📝 Follow keys/github-secrets-template.md to set up GitHub secrets"
echo "3. 🏗️  Test the build locally: npm run tauri:dev"
echo "4. 🚀 Push to GitHub to trigger the CI/CD pipeline"
echo "5. 📦 Optionally set up code signing certificates"
echo
echo -e "${YELLOW}Useful commands:${NC}"
echo "  # Development"
echo "  npm run dev              # Start frontend dev server"
echo "  npm run tauri:dev        # Start Tauri dev mode"
echo "  "
echo "  # Building"
echo "  npm run build            # Build frontend"
echo "  npm run tauri:build      # Build Tauri app"
echo "  ./scripts/build-tauri.sh # Optimized build script"
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
echo "  📋 docs/CI-CD.md         # CI/CD pipeline docs"
echo "  🔐 docs/CODE_SIGNING.md  # Code signing setup"
echo
echo -e "${GREEN}Happy coding! 🎉${NC}"