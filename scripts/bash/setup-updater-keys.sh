#!/bin/bash
# ============================================================================
# Updater Keys Setup (macOS/Linux)
# ============================================================================
# Sets up public/private key pair for secure auto-updates
# This is REQUIRED for the auto-updater system to work
#
# What it does:
# - Generates or validates updater signing keys
# - Updates tauri.conf.json with public key
# - Prepares keys for CI/CD pipeline
#
# When to use:
# - Always, for secure app updates
# - During initial project setup
# - When regenerating updater keys
#
# Key locations:
# - Public key: keys/publicKey.pem (safe to commit)
# - Private key: keys/privateKey.enc (encrypted, for GitHub secrets)
#
# Security: Only the "boss" should generate keys and set up GitHub secrets
# ============================================================================

set -e

echo "🔐 Pocket Architect - Updater Keys Setup (macOS/Linux)"
echo "=======================================================\n"

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

# Check if keys already exist
if [ -f "signing-keys/privateKey.enc" ] && [ -f "signing-keys/publicKey.pem" ]; then
    echo -e "${YELLOW}⚠️  Signing keys already exist. Skipping generation.${NC}"
    echo -e "${YELLOW}   If you need new keys, delete signing-keys/ and run this script again.${NC}\n"
else
    echo -e "${RED}❌ Signing keys not found. Please follow docs/setup/KEY_SETUP.md to set up keys.${NC}"
    echo -e "${YELLOW}   Skipping signing setup for now.${NC}\n"
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
echo "2. 📝 Follow docs/setup/KEY_SETUP.md to set up GitHub secrets (boss only)"
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