@echo off
REM ============================================================================
REM Updater Keys Setup (Windows)
REM ============================================================================
REM Sets up public/private key pair for secure auto-updates
REM This is REQUIRED for the auto-updater system to work
REM
REM What it does:
REM - Generates or validates updater signing keys
REM - Updates tauri.conf.json with public key
REM - Prepares keys for CI/CD pipeline
REM
REM When to use:
REM - Always, for secure app updates
REM - During initial project setup
REM - When regenerating updater keys
REM
REM Key locations:
REM - Public key: crypto/signing-keys/publicKey.pem (safe to commit)
REM - Private key: crypto/signing-keys/privateKey.enc (encrypted, for GitHub secrets)
REM
REM Security: Only the "boss" should generate keys and set up GitHub secrets
REM ============================================================================

echo 🔐 Pocket Architect - Updater Keys Setup (Windows)
echo ====================================================

REM Check if we're in the right directory
if not exist "src-tauri\tauri.conf.json" (
    echo ❌ Not in project root. Please run from the project root directory.
    exit /b 1
)

echo Setting up code signing and auto-updater...

REM Check if keys already exist
if exist "crypto\signing-keys\privateKey.enc" if exist "crypto\signing-keys\publicKey.pem" (
    echo ⚠️  Signing keys already exist. Skipping generation.
    echo    If you need new keys, delete crypto\signing-keys\ and run this script again.
) else (
    echo ❌ Signing keys not found. Please follow crypto\signing-keys\README.md to set up keys.
    echo    Skipping signing setup for now.
)

REM Update tauri.conf.json with public key
echo Updating tauri.conf.json with public key...
if exist "crypto\signing-keys\publicKey.pem" (
    REM Use PowerShell to replace
    powershell -Command "
    $content = Get-Content 'crypto\signing-keys\publicKey.pem' -Raw
    $content = $content -replace '\n', '' -replace '\r', ''
    (Get-Content 'src-tauri\tauri.conf.json') -replace 'YOUR_UPDATER_PUBLIC_KEY_HERE', $content | Set-Content 'src-tauri\tauri.conf.json'
    "
    echo ✅ tauri.conf.json updated
) else (
    echo ❌ Public key file not found
)

REM Create .gitignore entry for private key
echo Updating .gitignore...
findstr /c:"crypto/signing-keys/privateKey.pem" .gitignore >nul 2>nul
if %errorlevel% neq 0 (
    echo # Updater private key - NEVER COMMIT >> .gitignore
    echo crypto/signing-keys/privateKey.pem >> .gitignore
    echo ✅ .gitignore updated
) else (
    echo ℹ️  .gitignore already configured
)

REM Create certificate setup scripts
echo Creating certificate setup scripts...

REM Windows certificate setup (already exists, but ensure)
if not exist scripts\setup-windows-signing.bat (
    echo @echo off > scripts\setup-windows-signing.bat
    echo echo Setting up Windows code signing certificate... >> scripts\setup-windows-signing.bat
    echo. >> scripts\setup-windows-signing.bat
    echo REM Check if certificate exists >> scripts\setup-windows-signing.bat
    echo if not exist "crypto\certificates\windows-cert.pfx" ( >> scripts\setup-windows-signing.bat
    echo     echo Error: Certificate not found at crypto\certificates\windows-cert.pfx >> scripts\setup-windows-signing.bat
    echo     echo Please place your .pfx certificate file in the crypto\certificates directory >> scripts\setup-windows-signing.bat
    echo     pause >> scripts\setup-windows-signing.bat
    echo     exit /b 1 >> scripts\setup-windows-signing.bat
    echo ) >> scripts\setup-windows-signing.bat
    echo. >> scripts\setup-windows-signing.bat
    echo echo Certificate found. Ready for CI/CD use. >> scripts\setup-windows-signing.bat
    echo echo. >> scripts\setup-windows-signing.bat
    echo echo Next steps: >> scripts\setup-windows-signing.bat
    echo echo 1. Base64 encode your certificate: certutil -encode crypto\certificates\windows-cert.pfx crypto\certificates\windows-cert-base64.txt >> scripts\setup-windows-signing.bat
    echo echo 2. Add the contents of windows-cert-base64.txt as WINDOWS_CERTIFICATE secret in GitHub >> scripts\setup-windows-signing.bat
    echo echo 3. Add your certificate password as WINDOWS_CERTIFICATE_PASSWORD secret >> scripts\setup-windows-signing.bat
    echo pause >> scripts\setup-windows-signing.bat
)

REM macOS certificate setup (create .bat version for Windows users who might need it)
if not exist scripts\setup-macos-code-signing.bat (
    echo @echo off > scripts\setup-macos-code-signing.bat
    echo echo Setting up macOS code signing certificate... >> scripts\setup-macos-code-signing.bat
    echo. >> scripts\setup-macos-code-signing.bat
    echo REM Check if certificate exists >> scripts\setup-macos-code-signing.bat
    echo if not exist "certificates\macos-cert.p12" ( >> scripts\setup-macos-code-signing.bat
    echo     echo Error: Certificate not found at certificates\macos-cert.p12 >> scripts\setup-macos-code-signing.bat
    echo     echo Please place your .p12 certificate file in the certificates directory >> scripts\setup-macos-code-signing.bat
    echo     pause >> scripts\setup-macos-code-signing.bat
    echo     exit /b 1 >> scripts\setup-macos-code-signing.bat
    echo ) >> scripts\setup-macos-code-signing.bat
    echo. >> scripts\setup-macos-code-signing.bat
    echo echo Certificate found. Ready for CI/CD use. >> scripts\setup-macos-code-signing.bat
    echo echo. >> scripts\setup-macos-code-signing.bat
    echo echo Next steps: >> scripts\setup-macos-code-signing.bat
    echo echo 1. Base64 encode your certificate: certutil -encode certificates\macos-cert.p12 certificates\macos-cert-base64.txt >> scripts\setup-macos-code-signing.bat
    echo echo 2. Add the contents of macos-cert-base64.txt as MACOS_CERTIFICATE secret in GitHub >> scripts\setup-macos-code-signing.bat
    echo echo 3. Add your certificate password as MACOS_CERTIFICATE_PASSWORD secret >> scripts\setup-macos-code-signing.bat
    echo echo 4. Add a random password as KEYCHAIN_PASSWORD secret >> scripts\setup-macos-code-signing.bat
    echo echo 5. Update tauri.conf.json with your signing identity and team ID >> scripts\setup-macos-code-signing.bat
    echo pause >> scripts\setup-macos-code-signing.bat
)

REM Create certificates directory
if not exist certificates mkdir certificates

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. 🔑 Review and secure your keys in the 'crypto\signing-keys' directory
echo 2. 📝 Follow crypto\signing-keys\README.md to set up GitHub secrets (boss only)
echo 3. 🏗️  Push to GitHub to test the CI/CD pipeline
echo 4. 📋 Optionally set up code signing certificates
echo.
echo ⚠️  Remember:
echo    - Never commit crypto/signing-keys/privateKey.pem
echo    - Keep certificates secure
echo    - Test signing in a staging environment first
echo.
echo Useful commands:
echo   # Test local build
echo   npm run tauri:build
echo.
echo   # Check configuration
echo   npx tauri info