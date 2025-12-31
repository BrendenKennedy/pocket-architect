# AWS Credentials Encryption Script
# Encrypts your AWS credentials for secure storage
# Run this in WSL: wsl ./scripts/encrypt-aws-creds.sh

#!/bin/bash

set -e

echo "🔐 AWS Credentials Encryption for Pocket Architect"
echo "=================================================="

# Check if credentials file exists
if [ ! -f "config/aws-credentials.env" ]; then
    echo "❌ config/aws-credentials.env not found!"
    echo "Create it with your AWS credentials first:"
    echo ""
    echo "AWS_ACCESS_KEY_ID=your_access_key"
    echo "AWS_SECRET_ACCESS_KEY=your_secret_key"
    echo "AWS_DEFAULT_REGION=us-east-1"
    echo ""
    exit 1
fi

# Prompt for passphrase
echo "Enter a strong passphrase to encrypt your credentials:"
read -s PASSPHRASE
echo "Confirm passphrase:"
read -s PASSPHRASE_CONFIRM

if [ "$PASSPHRASE" != "$PASSPHRASE_CONFIRM" ]; then
    echo "❌ Passphrases don't match!"
    exit 1
fi

# Encrypt the credentials
echo "🔒 Encrypting credentials..."
openssl enc -aes-256-cbc -salt -in config/aws-credentials.env -out config/aws-credentials.env.enc -k "$PASSPHRASE"

# Remove plain text file
rm config/aws-credentials.env

echo "✅ Credentials encrypted successfully!"
echo "📁 Encrypted file: config/aws-credentials.env.enc"
echo ""
echo "To use in your app, decrypt with:"
echo "openssl enc -d -aes-256-cbc -in config/aws-credentials.env.enc -out config/aws-credentials.env -k 'your_passphrase'"
echo "Then source: source config/aws-credentials.env"