#!/bin/bash
# Quick rebuild script for WSL development
cd /mnt/c/Users/Brend/Projects/pocket-architect/src-tauri
source ~/.cargo/env

echo "Rebuilding Pocket Architect with AWS SDK..."
cargo build --features aws-sdk

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "To test:"
    echo "cargo run --features aws-sdk"
else
    echo "❌ Build failed!"
fi