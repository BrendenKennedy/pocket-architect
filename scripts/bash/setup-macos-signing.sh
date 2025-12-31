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
