#!/bin/bash
# ============================================================================
# Optimized Tauri Build Script
# ============================================================================
# Uses Tauri's built-in CLI features for optimal cross-platform builds
# ============================================================================

set -e

echo "🚀 Pocket Architect - Optimized Tauri Build"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BUILD_TYPE="${1:-release}"
FEATURES="${2:-aws-sdk}"
TARGET="${3:-}"

echo "Build Type: $BUILD_TYPE"
echo "Features: $FEATURES"
if [ -n "$TARGET" ]; then
    echo "Target: $TARGET"
fi
echo

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Cargo not found. Please install Rust from https://rustup.rs/${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found. Please install Node.js${NC}"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "src-tauri/tauri.conf.json" ]; then
    echo -e "${RED}❌ Not in project root. Please run from the project root directory.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites OK${NC}"
echo

# Install frontend dependencies
echo -e "${BLUE}Installing frontend dependencies...${NC}"
cd src
npm ci
echo -e "${GREEN}✅ Frontend dependencies installed${NC}"

# Build frontend
echo -e "${BLUE}Building frontend...${NC}"
npm run build
echo -e "${GREEN}✅ Frontend built${NC}"
cd ..
echo

# Build Tauri app with optimizations
echo -e "${BLUE}Building Tauri application...${NC}"
cd src-tauri

BUILD_CMD="cargo tauri build"

# Add build type
if [ "$BUILD_TYPE" = "release" ]; then
    BUILD_CMD="$BUILD_CMD --release"
fi

# Add features
if [ -n "$FEATURES" ]; then
    BUILD_CMD="$BUILD_CMD --features $FEATURES"
fi

# Add target if specified
if [ -n "$TARGET" ]; then
    BUILD_CMD="$BUILD_CMD --target $TARGET"
fi

echo "Running: $BUILD_CMD"
START_TIME=$(date +%s)

if eval "$BUILD_CMD"; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    echo -e "${GREEN}✅ Build successful!${NC}"
    echo -e "${GREEN}Build completed in ${DURATION} seconds${NC}"

    # Show build artifacts
    echo
    echo -e "${BLUE}Build artifacts:${NC}"

    if [ "$BUILD_TYPE" = "release" ]; then
        BUNDLE_DIR="target/release/bundle"
    else
        BUNDLE_DIR="target/debug/bundle"
    fi

    if [ -d "$BUNDLE_DIR" ]; then
        echo "Bundles created in: $BUNDLE_DIR"
        ls -la "$BUNDLE_DIR" 2>/dev/null || echo "No bundles found"
    else
        echo "No bundle directory found"
    fi

    # Show binary size if available
    if [ -f "target/$BUILD_TYPE/app" ]; then
        BINARY_SIZE=$(du -h "target/$BUILD_TYPE/app" | cut -f1)
        echo "Binary size: $BINARY_SIZE"
    elif [ -f "target/$BUILD_TYPE/app.exe" ]; then
        BINARY_SIZE=$(du -h "target/$BUILD_TYPE/app.exe" | cut -f1)
        echo "Binary size: $BINARY_SIZE"
    fi

else
    echo -e "${RED}❌ Build failed!${NC}"
    echo -e "${YELLOW}Check the error messages above for details${NC}"
    exit 1
fi

cd ..
echo
echo -e "${GREEN}🎉 Pocket Architect build completed successfully!${NC}"