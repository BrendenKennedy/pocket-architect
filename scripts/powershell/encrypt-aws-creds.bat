@echo off
REM AWS Credentials Encryption Script for Windows
REM Encrypts your AWS credentials for secure storage

echo 🔐 AWS Credentials Encryption for Pocket Architect
echo ===================================================

REM Check if credentials file exists
if not exist "config\aws-credentials.env" (
    echo ❌ config\aws-credentials.env not found!
    echo Create it with your AWS credentials first:
    echo.
    echo AWS_ACCESS_KEY_ID=your_access_key
    echo AWS_SECRET_ACCESS_KEY=your_secret_key
    echo AWS_DEFAULT_REGION=us-east-1
    echo.
    exit /b 1
)

REM Encrypt using PowerShell for secure input
powershell -Command "
$pass1 = Read-Host 'Enter a strong passphrase to encrypt your credentials' -AsSecureString
$pass2 = Read-Host 'Confirm passphrase' -AsSecureString
$plain1 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass1))
$plain2 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass2))
if ($plain1 -ne $plain2) {
    Write-Host '❌ Passphrases don''t match!'
    exit 1
}
try {
    openssl enc -aes-256-cbc -salt -in config/aws-credentials.env -out config/aws-credentials.env.enc -k $plain1
    if ($LASTEXITCODE -eq 0) {
        Remove-Item config/aws-credentials.env
        Write-Host '✅ Credentials encrypted successfully!'
        Write-Host '📁 Encrypted file: config/aws-credentials.env.enc'
        Write-Host ''
        Write-Host 'To use in your app, decrypt with:'
        Write-Host '.\scripts\decrypt-aws-creds.bat'
    } else {
        Write-Host '❌ Encryption failed!'
        exit 1
    }
} catch {
    Write-Host '❌ Encryption failed!'
    exit 1
}
"