# Key Setup Guide

This guide explains how to set up signing keys for Pocket Architect. The "boss" (key holder) generates and manages the keys, then distributes them securely to team members.

## Overview
- **Updater Signing**: Required for auto-updates. Uses private/public key pair.
- **Code Signing**: Optional for app distribution (certificates from CAs).
- **Security**: Private keys are encrypted with a passphrase. Only the boss handles key generation and GitHub secrets.

## For the Boss (Key Generation and GitHub Setup)
1. Generate keys:
   ```
   npx @tauri-apps/cli signer generate --password "yourpassphrase" --write-keys signing-keys/
   ```
2. Encrypt the private key:
   ```
   openssl enc -aes-256-cbc -salt -in signing-keys/privateKey.pem -out signing-keys/privateKey.enc -k "yourpassphrase"
   rm signing-keys/privateKey.pem
   ```
3. Set up GitHub secrets (boss only):
   - Go to the GitHub repository → Settings → Secrets and variables → Actions.
   - Add `TAURI_PRIVATE_KEY`: Base64-encoded contents of `signing-keys/privateKey.enc`.
     ```
     base64 -i signing-keys/privateKey.enc
     ```
     On Windows: `certutil -encode signing-keys/privateKey.enc tmp.b64 && type tmp.b64`
     Copy the output as the secret value.
   - Add `TAURI_KEY_PASSWORD`: The passphrase used to encrypt the private key (e.g., "yourpassphrase").
4. Distribute:
   - Send `signing-keys/privateKey.enc` and the passphrase to team members via secure channel (e.g., encrypted email).
   - Keep `signing-keys/publicKey.pem` for app config.

## For Team Members (Local Setup)
1. Receive the encrypted private key and passphrase from the boss.
2. Place `privateKey.enc` in `signing-keys/privateKey.enc`.
3. Place `publicKey.pem` in `signing-keys/publicKey.pem`.
4. Add the public key to `src-tauri/tauri.conf.json`:
   - Replace `YOUR_UPDATER_PUBLIC_KEY_HERE` with the contents of `publicKey.pem`.
5. For local builds, set env vars:
   ```
   export TAURI_PRIVATE_KEY=signing-keys/privateKey.pem
   export TAURI_KEY_PASSWORD=yourpassphrase
   ```
   On Windows (PowerShell):
   ```
   $env:TAURI_PRIVATE_KEY="signing-keys/privateKey.pem"
   $env:TAURI_KEY_PASSWORD="yourpassphrase"
   ```
   (Decrypt first: `openssl enc -d -aes-256-cbc -in signing-keys/privateKey.enc -out signing-keys/privateKey.pem -k yourpassphrase`)

## Important Notes
- Never commit private keys or passphrases to the repo.
- Rotate keys periodically for security.
- For code signing certificates, follow `docs/cicd/CODE_SIGNING.md` (separate from updater keys).
- Only the boss should add/modify GitHub secrets.
- If keys need rotation, generate new ones, update secrets, and redistribute to team members.