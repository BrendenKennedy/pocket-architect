# Complete Code Signing & Auto-Updater Setup Guide

This comprehensive guide covers all aspects of setting up code signing and auto-updates for Pocket Architect using Tauri's built-in features. The "boss" (key holder) generates and manages the keys, then distributes them securely to team members.

## Overview

This guide covers:
- **Updater Signing**: Required for auto-updates using private/public key pairs
- **Code Signing**: Optional for app distribution using certificates from CAs
- **Security**: Private keys are encrypted with passphrases
- **CI/CD Integration**: Automated signing in GitHub Actions
- **Frontend Integration**: Auto-update checks in your React app

## For the Boss (Key Generation and GitHub Setup)

### 1. Generate Updater Keys

```bash
npx @tauri-apps/cli signer generate --password "yourpassphrase" --write-keys crypto/signing-keys/
```

### 2. Encrypt the Private Key

```bash
openssl enc -aes-256-cbc -salt -in crypto/signing-keys/privateKey.pem -out crypto/signing-keys/privateKey.enc -k "yourpassphrase"
rm crypto/signing-keys/privateKey.pem
```

### 3. Set Up GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions.

#### Required Secrets (Updater)
- `TAURI_PRIVATE_KEY`: Base64-encoded contents of `crypto/signing-keys/privateKey.enc`
  ```bash
  # macOS/Linux
  base64 -i crypto/signing-keys/privateKey.enc

  # Windows
  certutil -encode crypto/signing-keys/privateKey.enc tmp.b64 && type tmp.b64
  ```
- `TAURI_KEY_PASSWORD`: The passphrase used to encrypt the private key

#### Optional Secrets (Code Signing)

**Windows:**
- `WINDOWS_CERTIFICATE`: Base64 encoded .pfx or .p12 certificate file
- `WINDOWS_CERTIFICATE_PASSWORD`: Certificate password

**macOS:**
- `MACOS_CERTIFICATE`: Base64 encoded .p12 certificate file
- `MACOS_CERTIFICATE_PASSWORD`: Certificate password
- `KEYCHAIN_PASSWORD`: Random password for temporary keychain
- `MACOS_CERTIFICATE_NAME`: Name of certificate in keychain

#### Base64 Encoding for Certificates
```bash
# Windows
certutil -encode your-cert.pfx base64-cert.txt

# macOS/Linux
base64 -i your-cert.p12 -o base64-cert.txt
```

### 4. Configure Tauri Settings

#### Update tauri.conf.json
```json
{
  "updater": {
    "active": true,
    "endpoints": [
      "https://github.com/YOUR_USERNAME/pocket-architect/releases/latest/download/latest.json"
    ],
    "dialog": true,
    "pubkey": "YOUR_PUBLIC_KEY_HERE"
  },
  "bundle": {
    "windows": {
      "certificateThumbprint": "YOUR_CERTIFICATE_THUMBPRINT",
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com"
    },
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
      "providerShortName": "YOUR_PROVIDER_SHORT_NAME"
    }
  }
}
```

Replace `YOUR_PUBLIC_KEY_HERE` with the contents of `crypto/signing-keys/publicKey.pem`.

### 5. Distribute to Team Members
- Send `crypto/signing-keys/privateKey.enc` and the passphrase via secure channel
- The public key is already configured in the project

## For Team Members (Local Setup)

### 1. Receive Encrypted Keys
Place the `privateKey.enc` file in `crypto/signing-keys/privateKey.enc`

### 2. Set Environment Variables for Local Builds
```bash
# Decrypt first
openssl enc -d -aes-256-cbc -in crypto/signing-keys/privateKey.enc -out crypto/signing-keys/privateKey.pem -k yourpassphrase

# Set env vars
export TAURI_PRIVATE_KEY=crypto/signing-keys/privateKey.pem
export TAURI_KEY_PASSWORD=yourpassphrase
```

On Windows (PowerShell):
```powershell
$env:TAURI_PRIVATE_KEY="crypto/signing-keys/privateKey.pem"
$env:TAURI_KEY_PASSWORD="yourpassphrase"
```

## Code Signing Setup

### Windows Code Signing

1. **Obtain a Code Signing Certificate:**
   - Purchase from a trusted CA (DigiCert, GlobalSign, etc.)
   - Or use a free certificate for testing (not recommended for production)

2. **Configure Certificate in CI/CD:**
   ```yaml
   # Add to .github/workflows/ci.yml and release.yml
   - name: Import Code Signing Certificate
     if: runner.os == 'Windows'
     run: |
       echo "${{ secrets.WINDOWS_CERTIFICATE }}" | base64 -d > certificate.p12
     shell: bash

   - name: Build Tauri app
     uses: tauri-apps/tauri-action@v0
     env:
       GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
       TAURI_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
       TAURI_KEY_PASSWORD: ${{ secrets.TAURI_KEY_PASSWORD }}
       # Windows signing
       WINDOWS_CERTIFICATE: ${{ secrets.WINDOWS_CERTIFICATE }}
       WINDOWS_CERTIFICATE_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
     with:
       projectPath: src-tauri
   ```

### macOS Code Signing

1. **Create Apple Developer Account:**
   - Sign up for Apple Developer Program ($99/year)
   - Create signing certificates in Xcode or Keychain Access

2. **Configure in CI/CD:**
   ```yaml
   - name: Import Apple Certificates
     if: runner.os == 'macOS'
     run: |
       # Import developer certificate
       echo "${{ secrets.MACOS_CERTIFICATE }}" | base64 -d > certificate.p12
       security create-keychain -p "${{ secrets.KEYCHAIN_PASSWORD }}" build.keychain
       security import certificate.p12 -k build.keychain -P "${{ secrets.MACOS_CERTIFICATE_PASSWORD }}" -T /usr/bin/codesign
       security set-keychain-settings -t 3600 build.keychain
       security unlock-keychain -p "${{ secrets.KEYCHAIN_PASSWORD }}" build.keychain
       security set-key-partition-list -S apple-tool:,apple: -k "${{ secrets.KEYCHAIN_PASSWORD }}" build.keychain
       security list-keychains -d user -s build.keychain $(security list-keychains -d user | sed s/\"//g)
     shell: bash
   ```

## CI/CD Configuration

### Update Release Workflow

```yaml
# In release.yml, add signing
- name: Build and release
  uses: tauri-apps/tauri-action@v0
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    TAURI_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
    TAURI_KEY_PASSWORD: ${{ secrets.TAURI_KEY_PASSWORD }}
  with:
    projectPath: src-tauri
    # This will create signed releases with updater metadata
```

## Frontend Integration

Add updater checks to your React app:

```jsx
import { checkUpdate, installUpdate } from '@tauri-apps/api/updater';
import { relaunch } from '@tauri-apps/api/process';

// Check for updates
const checkForUpdates = async () => {
  try {
    const { shouldUpdate, manifest } = await checkUpdate();

    if (shouldUpdate) {
      // Display update dialog to user
      const userConfirmed = confirm(
        `Update available ${manifest?.version}. Would you like to install it?`
      );

      if (userConfirmed) {
        await installUpdate();
        await relaunch();
      }
    }
  } catch (error) {
    console.error('Update check failed:', error);
  }
};

// Call this periodically or on app start
useEffect(() => {
  checkForUpdates();
  // Check every 30 minutes
  const interval = setInterval(checkForUpdates, 30 * 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

## Testing Code Signing

### Local Testing
```bash
# Test signing without CI/CD
npm run tauri build -- --config '{"bundle":{"windows":{"certificateThumbprint":"YOUR_THUMBPRINT"}}}'
```

### Verify Signatures
```bash
# Windows
signtool verify /pa /v "path\to\your\installer.msi"

# macOS
codesign -dv --verbose=4 "path/to/your/app.app"
spctl -a -t exec -vv "path/to/your/app.app"
```

## Release Process

1. **Development:** Push to `develop` branch - runs tests only
2. **Staging:** Merge to `main` branch - runs full CI/CD
3. **Production:** Create release tag `v1.2.3` - creates signed release

## Troubleshooting

### Common Issues

**Windows Signing:**
- Certificate expired or not trusted
- Wrong certificate thumbprint
- Timestamp server unreachable

**macOS Signing:**
- Certificate not in keychain
- Incorrect team ID
- App not notarized

**Updater Issues:**
- Wrong public key in config
- Release not signed with correct private key
- GitHub release URL incorrect

### Debug Commands

```bash
# Check Tauri configuration
npx tauri info

# Validate updater configuration
npx tauri signer verify --public-key publicKey.pem

# Test build locally
npm run tauri build
```

## Security Best Practices

1. **Never commit private keys** to version control
2. **Use GitHub secrets** for all sensitive data
3. **Rotate certificates and keys** regularly
4. **Test signing** in staging environment first
5. **Monitor certificate expiration** dates
6. **Only the boss handles** key generation and GitHub secrets

## Quick Setup Checklist

1. ✅ Generate updater keys (boss only)
2. ✅ Encrypt private key
3. ✅ Set up GitHub secrets
4. ✅ Configure tauri.conf.json with public key
5. ✅ Set up code signing certificates (optional)
6. ✅ Update CI/CD workflows
7. ✅ Add frontend update checks
8. ✅ Test signing process
9. ✅ Enable auto-updates in app

This setup provides enterprise-grade code signing and seamless auto-updates for your Tauri application.