#!/bin/bash
# Test script with AWS credentials
cd /mnt/c/Users/Brend/Projects/pocket-architect/src-tauri
source ~/.cargo/env

echo "Testing Pocket Architect with AWS SDK..."
echo "Make sure to set your AWS credentials:"
echo "export AWS_ACCESS_KEY_ID=your_key"
echo "export AWS_SECRET_ACCESS_KEY=your_secret"
echo "export AWS_REGION=us-east-1"
echo ""

# Check if AWS credentials are set
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "⚠️  AWS credentials not set!"
    echo "Run these commands first:"
    echo "export AWS_ACCESS_KEY_ID=your_access_key"
    echo "export AWS_SECRET_ACCESS_KEY=your_secret_key"
    echo "export AWS_REGION=us-east-1"
    echo ""
    echo "Then run: cargo run --features aws-sdk"
else
    echo "AWS credentials found. Starting app..."
    cargo run --features aws-sdk
fi