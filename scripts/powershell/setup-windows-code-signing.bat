@echo off
REM ============================================================================
REM Windows Code Signing Certificate Setup
REM ============================================================================
REM Sets up Windows code signing certificates for official app distribution
REM This is OPTIONAL - only needed for distributing through Microsoft Store
REM or as a signed .msi/.exe installer
REM
REM What it does:
REM - Checks for Windows .pfx certificate file
REM - Provides instructions for GitHub secrets setup
REM - Prepares certificate for CI/CD pipeline
REM
REM When to use:
REM - When you want to distribute signed Windows apps
REM - For Microsoft Store submissions
REM - For trusted software distribution
REM
REM Prerequisites:
REM - Code signing certificate from trusted CA (like DigiCert, GlobalSign)
REM - .pfx certificate file with private key
REM ============================================================================

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
