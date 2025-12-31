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
