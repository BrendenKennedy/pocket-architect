#!/bin/bash
# ============================================================================
# Code Signing & Updater Setup Script
# ============================================================================
# Helps set up code signing certificates and updater keys for Tauri
# ============================================================================

set -e

echo "🔐 Pocket Architect - Code Signing & Updater Setup"
echo "==================================================\n"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if we're in the right directory
if [ ! -f "src-tauri/tauri.conf.json" ]; then
    echo -e "${RED}❌ Not in project root. Please run from the project root directory.${NC}"
    exit 1
fi

echo -e "${BLUE}Setting up code signing and auto-updater...${NC}\n"

# Create keys directory
mkdir -p keys

# Generate updater keys
echo -e "${BLUE}Generating updater keys...${NC}"
if command -v npx &> /dev/null; then
    npx @tauri-apps/cli signer generate \
        --private-key-path keys/privateKey.pem \
        --public-key-path keys/publicKey.pem

    echo -e "${GREEN}✅ Updater keys generated${NC}"

    # Extract public key for configuration
    PUBLIC_KEY=$(cat keys/publicKey.pem)
    echo -e "${BLUE}Public key:${NC} $PUBLIC_KEY"
    echo "$PUBLIC_KEY" > keys/public_key.txt

    echo -e "${YELLOW}⚠️  IMPORTANT: Keep keys/privateKey.pem secure and never commit it!${NC}"
    echo -e "${YELLOW}   Only commit keys/publicKey.pem and add private key to GitHub secrets.${NC}\n"
else
    echo -e "${RED}❌ npx not found. Please install Node.js and run:${NC}"
    echo "npm install -g @tauri-apps/cli"
    echo "npx @tauri-apps/cli signer generate --private-key-path keys/privateKey.pem --public-key-path keys/publicKey.pem"
    exit 1
fi

# Update tauri.conf.json with public key
echo -e "${BLUE}Updating tauri.conf.json with public key...${NC}"
if [ -f "keys/publicKey.pem" ]; then
    # Use sed to replace the placeholder
    sed -i.bak "s/YOUR_UPDATER_PUBLIC_KEY_HERE/$(cat keys/publicKey.pem | tr -d '\n')/g" src-tauri/tauri.conf.json
    echo -e "${GREEN}✅ tauri.conf.json updated${NC}"
else
    echo -e "${RED}❌ Public key file not found${NC}"
fi

# Create .gitignore entry for private key
echo -e "${BLUE}Updating .gitignore...${NC}"
if ! grep -q "keys/privateKey.pem" .gitignore 2>/dev/null; then
    echo "# Updater private key - NEVER COMMIT" >> .gitignore
    echo "keys/privateKey.pem" >> .gitignore
    echo -e "${GREEN}✅ .gitignore updated${NC}"
else
    echo -e "${BLUE}ℹ️  .gitignore already configured${NC}"
fi

# Create GitHub secrets template
echo -e "${BLUE}Creating GitHub secrets template...${NC}"
cat > keys/github-secrets-template.md << 'EOF'
# GitHub Secrets Template

Add these secrets to your GitHub repository settings:

## Required Secrets

### Updater Signing (Required)
- `TAURI_PRIVATE_KEY`: Contents of `keys/privateKey.pem`
- `TAURI_KEY_PASSWORD`: Password you set when generating keys (leave empty if none)

### Windows Code Signing (Optional)
- `WINDOWS_CERTIFICATE`: Base64 encoded .pfx certificate file
- `WINDOWS_CERTIFICATE_PASSWORD`: Certificate password

### macOS Code Signing (Optional)
- `MACOS_CERTIFICATE`: Base64 encoded .p12 certificate file
- `MACOS_CERTIFICATE_PASSWORD`: Certificate password
- `KEYCHAIN_PASSWORD`: Random password for temporary keychain
- `MACOS_CERTIFICATE_NAME`: Name of certificate in keychain

## How to Add Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret listed above

## Base64 Encoding (for certificates)

```bash
# Windows
certutil -encode your-cert.pfx base64-cert.txt

# macOS/Linux
base64 -i your-cert.p12 -o base64-cert.txt
```

Then copy the contents of base64-cert.txt as the secret value.
EOF

echo -e "${GREEN}✅ GitHub secrets template created: keys/github-secrets-template.md${NC}"

# Create certificate setup scripts
echo -e "${BLUE}Creating certificate setup scripts...${NC}"

# Windows certificate setup
cat > scripts/setup-windows-signing.bat << 'EOF'
@echo off
echo Setting up Windows code signing certificate...

REM Check if certificate exists
if not exist "certificates\windows-cert.pfx" (
    echo Error: Certificate not found at certificates\windows-cert.pfx
    echo Please place your .pfx certificate file in the certificates directory
    pause
    exit /b 1
)

echo Certificate found. Ready for CI/CD use.
echo.
echo Next steps:
echo 1. Base64 encode your certificate: certutil -encode certificates\windows-cert.pfx certificates\windows-cert-base64.txt
echo 2. Add the contents of windows-cert-base64.txt as WINDOWS_CERTIFICATE secret in GitHub
echo 3. Add your certificate password as WINDOWS_CERTIFICATE_PASSWORD secret
pause
EOF

# macOS certificate setup
cat > scripts/setup-macos-signing.sh << 'EOF'
#!/bin/bash
echo "Setting up macOS code signing certificate..."

# Check if certificate exists
if [ ! -f "certificates/macos-cert.p12" ]; then
    echo "Error: Certificate not found at certificates/macos-cert.p12"
    echo "Please place your .p12 certificate file in the certificates directory"
    exit 1
fi

echo "Certificate found. Ready for CI/CD use."
echo
echo "Next steps:"
echo "1. Base64 encode your certificate:"
echo "   base64 -i certificates/macos-cert.p12 -o certificates/macos-cert-base64.txt"
echo "2. Add the contents of macos-cert-base64.txt as MACOS_CERTIFICATE secret in GitHub"
echo "3. Add your certificate password as MACOS_CERTIFICATE_PASSWORD secret"
echo "4. Add a random password as KEYCHAIN_PASSWORD secret"
echo "5. Update tauri.conf.json with your signing identity and team ID"
EOF

chmod +x scripts/setup-macos-signing.sh
echo -e "${GREEN}✅ Certificate setup scripts created${NC}"

# Create certificates directory
mkdir -p certificates

echo
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo
echo -e "${BLUE}Next steps:${NC}"
echo "1. 🔑 Review and secure your keys in the 'keys' directory"
echo "2. 📝 Follow the GitHub secrets template in keys/github-secrets-template.md"
echo "3. 🏗️  Push to GitHub to test the CI/CD pipeline"
echo "4. 📋 Optionally set up code signing certificates"
echo
echo -e "${YELLOW}⚠️  Remember:${NC}"
echo "   - Never commit keys/privateKey.pem"
echo "   - Keep certificates secure"
echo "   - Test signing in a staging environment first"
echo
echo -e "${BLUE}Useful commands:${NC}"
echo "  # Test local build"
echo "  npm run tauri:build"
echo
echo "  # Check configuration"
echo "  npx tauri info"