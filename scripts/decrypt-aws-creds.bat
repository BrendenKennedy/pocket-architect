@echo off
REM AWS Credentials Decryption Script for Windows
REM Decrypts your AWS credentials for use

echo 🔓 AWS Credentials Decryption for Pocket Architect
echo ==================================================

REM Check if encrypted file exists
if not exist "config\aws-credentials.env.enc" (
    echo ❌ config\aws-credentials.env.enc not found!
    echo Run scripts\encrypt-aws-creds.bat first to encrypt your credentials.
    exit /b 1
)

REM Decrypt using PowerShell for secure input
powershell -Command "
$pass = Read-Host 'Enter your encryption passphrase' -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass))
try {
    openssl enc -d -aes-256-cbc -in config/aws-credentials.env.enc -out config/aws-credentials.env -k $plain 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host '✅ Credentials decrypted successfully!'
        Write-Host '📁 Decrypted file: config\aws-credentials.env'
        Write-Host ''
        Write-Host 'To load credentials:'
        Write-Host 'type config\aws-credentials.env'
        Write-Host ''
        Write-Host '⚠️  Remember to delete config\aws-credentials.env after use!'
    } else {
        Write-Host '❌ Decryption failed! Wrong passphrase?'
        exit 1
    }
} catch {
    Write-Host '❌ Decryption failed!'
    exit 1
}
"