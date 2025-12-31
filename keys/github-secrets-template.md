# GitHub Secrets Template

Add these secrets to your GitHub repository settings:

## Required Secrets

### Updater Signing (Required)
- `TAURI_PRIVATE_KEY`: Contents of `signing-keys/privateKey.pem`
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
