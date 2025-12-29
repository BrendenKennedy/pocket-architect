#!/bin/bash
# Pocket Architect - WSL Development Script
echo "Pocket Architect WSL Development Environment"
echo "============================================"

# Navigate to project
cd /mnt/c/Users/Brend/Projects/pocket-architect/src-tauri

# Source Rust environment
source ~/.cargo/env

# Verify Rust is working
echo "Rust version:"
rustc --version
echo ""

# Build with AWS SDK
echo "Building with AWS SDK features..."
cargo build --features aws-sdk

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "To test with real AWS data:"
    echo "  export AWS_ACCESS_KEY_ID=your_key"
    echo "  export AWS_SECRET_ACCESS_KEY=your_secret"
    echo "  export AWS_REGION=us-east-1"
    echo "  cargo run --features aws-sdk"
    echo ""
    echo "To run the app:"
    echo "  cargo run --features aws-sdk"
else
    echo ""
    echo "❌ Build failed!"
    echo "Check the errors above and fix any issues."
fi