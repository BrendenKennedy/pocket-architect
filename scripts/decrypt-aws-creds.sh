# AWS Credentials Decryption Script
# Decrypts your AWS credentials for use
# Run this in WSL: wsl ./scripts/decrypt-aws-creds.sh

#!/bin/bash

set -e

echo "🔓 AWS Credentials Decryption for Pocket Architect"
echo "=================================================="

# Check if encrypted file exists
if [ ! -f "config/aws-credentials.env.enc" ]; then
    echo "❌ config/aws-credentials.env.enc not found!"
    echo "Run scripts/encrypt-aws-creds.sh first to encrypt your credentials."
    exit 1
fi

# Prompt for passphrase
echo "Enter your encryption passphrase:"
read -s PASSPHRASE

# Decrypt the credentials
echo "🔓 Decrypting credentials..."
if openssl enc -d -aes-256-cbc -in config/aws-credentials.env.enc -out config/aws-credentials.env -k "$PASSPHRASE" 2>/dev/null; then
    echo "✅ Credentials decrypted successfully!"
    echo "📁 Decrypted file: config/aws-credentials.env"
    echo ""
    echo "To load credentials:"
    echo "source config/aws-credentials.env"
    echo ""
    echo "⚠️  Remember to delete config/aws-credentials.env after use!"
else
    echo "❌ Decryption failed! Wrong passphrase?"
    exit 1
fi