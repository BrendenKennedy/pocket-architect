# Code Signing & Auto-Updater Setup

## Overview

This guide covers setting up code signing and auto-updates for Pocket Architect using Tauri's built-in features.

## Code Signing

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

3. **Update tauri.conf.json:**
   ```json
   {
     "bundle": {
       "windows": {
         "certificateThumbprint": "YOUR_CERTIFICATE_THUMBPRINT",
         "digestAlgorithm": "sha256",
         "timestampUrl": "http://timestamp.digicert.com"
       }
     }
   }
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

3. **Update tauri.conf.json:**
   ```json
   {
     "bundle": {
       "macOS": {
         "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
         "providerShortName": "YOUR_PROVIDER_SHORT_NAME"
       }
     }
   }
   ```

## Auto-Updater Setup

### 1. Generate Updater Keys

```bash
# Install Tauri CLI if not already installed
npm install -g @tauri-apps/cli

# Generate private/public key pair
npx tauri signer generate --private-key-path privateKey.pem --public-key-path publicKey.pem

# The public key will be used in tauri.conf.json
# Keep the private key secure - you'll need it for signing releases
```

### 2. Configure Updater in tauri.conf.json

```json
{
  "updater": {
    "active": true,
    "endpoints": [
      "https://github.com/YOUR_USERNAME/pocket-architect/releases/latest/download/latest.json"
    ],
    "dialog": true,
    "pubkey": "YOUR_PUBLIC_KEY_HERE"
  }
}
```

### 3. Update CI/CD for Signed Releases

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

### 4. Frontend Integration

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

## GitHub Secrets Required

Add these secrets to your GitHub repository:

### Required for All Platforms
- `TAURI_PRIVATE_KEY` - Private key for updater signing
- `TAURI_KEY_PASSWORD` - Password for the private key

### Windows Signing
- `WINDOWS_CERTIFICATE` - Base64 encoded .pfx or .p12 certificate
- `WINDOWS_CERTIFICATE_PASSWORD` - Certificate password

### macOS Signing
- `MACOS_CERTIFICATE` - Base64 encoded .p12 certificate
- `MACOS_CERTIFICATE_PASSWORD` - Certificate password
- `KEYCHAIN_PASSWORD` - Temporary keychain password
- `MACOS_CERTIFICATE_NAME` - Certificate name in keychain

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
3. **Rotate certificates** regularly
4. **Test signing** in staging environment first
5. **Monitor certificate expiration** dates

## Next Steps

1. Set up your code signing certificates
2. Generate updater key pair
3. Configure GitHub secrets
4. Test the signing process
5. Enable auto-updates in your app

This setup provides enterprise-grade code signing and seamless auto-updates for your Tauri application.