@echo off
REM ============================================================================
REM Pocket Architect - Complete Setup Script for Windows
REM ============================================================================
REM Sets up the entire development environment and production pipeline
REM ============================================================================

echo ===============================================================================
echo Pocket Architect - Complete Setup Script for Windows
echo ===============================================================================
echo Sets up the entire development environment and production pipeline
echo ===============================================================================

echo [START] Pocket Architect Setup
echo ================================

REM Colors - not available in batch, skip

REM Check prerequisites
echo Checking prerequisites...
echo.

REM Check Node.js
echo [PKG] Node.js:
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERROR] Node.js not found. Please install Node.js 20+ from https://nodejs.org/
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo   [OK] %NODE_VERSION%

REM Check npm
echo [PKG] npm:
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERROR] npm not found. Please install npm
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo   [OK] v%NPM_VERSION%

REM Check Rust
echo [RUST] Rust:
where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERROR] Rust not found. Please install Rust from https://rustup.rs/
    exit /b 1
)
for /f "tokens=*" %%i in ('cargo --version') do set CARGO_VERSION=%%i
echo   [OK] %CARGO_VERSION%

REM Check Git
echo [GIT] Git:
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERROR] Git not found. Please install Git from https://git-scm.com/
    exit /b 1
)
for /f "tokens=*" %%i in ('git --version') do set GIT_VERSION=%%i
echo   [OK] %GIT_VERSION%

REM Check OpenSSL
echo [SSL] OpenSSL:
REM First try direct openssl command
openssl version >nul 2>nul
if %errorlevel% equ 0 (
    echo   [OK] OpenSSL available
    goto :openssl_done
)

REM If not found, try Git for Windows OpenSSL
if exist "C:\Program Files\Git\usr\bin\openssl.exe" (
    set "PATH=C:\Program Files\Git\usr\bin;%PATH%"
    echo   [OK] OpenSSL found in Git for Windows
    goto :openssl_done
)

REM If still not found, show warning
echo   [WARNING] OpenSSL not found. Required for key encryption/decryption.
echo   [INFO] Install via: choco install openssl (run as Administrator)
echo   [INFO] Or download from: https://slproweb.com/products/Win32OpenSSL.html
echo   [INFO] Git for Windows includes OpenSSL - ensure it's in PATH
echo   [INFO] Continuing setup, but key operations may fail...

:openssl_done

echo.
echo [SUCCESS] Prerequisites OK
echo.

REM Setup directories
echo Setting up project structure...
if not exist crypto\signing-keys mkdir crypto\signing-keys

REM Install root dependencies
echo Installing root dependencies...
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install root dependencies
    exit /b 1
)
echo [SUCCESS] Root dependencies installed

REM Check Tauri CLI
echo Checking Tauri CLI...
npx tauri --version >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Tauri CLI not available. Installing...
    npm install -g @tauri-apps/cli
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install Tauri CLI globally
        exit /b 1
    )
)
for /f "tokens=*" %%i in ('npx tauri --version') do set TAURI_VERSION=%%i
echo [OK] Tauri CLI: %TAURI_VERSION%

REM Install frontend dependencies
echo Installing frontend dependencies...
cd src
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies
    cd ..
    exit /b 1
)
cd ..
echo [SUCCESS] Frontend dependencies installed

REM Print dependency versions
echo.
echo ===============================================================================
echo                        INSTALLED DEPENDENCIES
echo ===============================================================================
echo.

REM Root dependencies
echo -----------------------------------------------------------------------------
echo                           ROOT DEPENDENCIES
echo -----------------------------------------------------------------------------
for /f "tokens=2 delims=: " %%i in ('npm list --depth=0 2^>nul ^| findstr "@tauri-apps/cli"') do echo   📦 @tauri-apps/cli: %%i
echo.

REM Frontend dependencies
echo -----------------------------------------------------------------------------
echo                         FRONTEND DEPENDENCIES
echo -----------------------------------------------------------------------------
for /f "tokens=2 delims=: " %%i in ('cd src ^& npm list --depth=0 2^>nul ^| findstr "@tauri-apps/api"') do echo   📦 @tauri-apps/api: %%i
for /f "tokens=2 delims=: " %%i in ('cd src ^& npm list --depth=0 2^>nul ^| findstr "react" ^| findstr /v "react-dom"') do echo   ⚛️  react: %%i
for /f "tokens=2 delims=: " %%i in ('cd src ^& npm list --depth=0 2^>nul ^| findstr "vite"') do echo   ⚡ vite: %%i
echo.

REM Rust dependencies
echo -----------------------------------------------------------------------------
echo                           RUST DEPENDENCIES
echo -----------------------------------------------------------------------------
cargo tree --depth 0 2>nul | findstr "tauri" >nul
if %errorlevel% equ 0 (
    echo   📦 tauri: present
) else (
    echo   📦 tauri: not found
)
echo.

echo ===============================================================================
echo                      ✓ ALL DEPENDENCIES INSTALLED
echo ===============================================================================
echo.

REM Version validation
echo ===============================================================================
echo                         VERSION VALIDATION
echo ===============================================================================
echo.

REM Node.js version check (require 20+)
echo %NODE_VERSION% | findstr /r "v2[0-9]" >nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js version too old. Requires v20+
    echo   Current: %NODE_VERSION%
    exit /b 1
)
echo [OK] Node.js: %NODE_VERSION% (meets requirement >=20)

REM Rust version check (require 1.70+)
echo %CARGO_VERSION% | findstr /r "cargo 1\.[7-9]" >nul
if %errorlevel% neq 0 (
    echo %CARGO_VERSION% | findstr /r "cargo 1\.[0-6]" >nul
    if %errorlevel% equ 0 (
        echo [ERROR] Rust version too old. Requires 1.70+
        echo   Current: %CARGO_VERSION%
        exit /b 1
    )
)
echo [OK] Rust: %CARGO_VERSION% (meets requirement >=1.70)

echo.
echo ===============================================================================
echo                      ✓ ALL VERSIONS VALIDATED
echo ===============================================================================
echo.

REM Setup code signing and updater
echo Setting up code signing and updater...
if exist scripts\setup-updater-keys.bat (
    call scripts\setup-updater-keys.bat
) else (
    echo ⚠️ setup-updater-keys.bat not found, skipping signing setup
)

REM Validate setup
echo Validating setup...

REM Check for required files
if not exist scripts\node\validate-setup.js (
    echo ❌ Validation script not found
    exit /b 1
)

if not exist package.json (
    echo ❌ Root package.json not found
    exit /b 1
)

if not exist src\package.json (
    echo ❌ Frontend package.json not found
    exit /b 1
)

if not exist src-tauri\tauri.conf.json (
    echo ❌ Tauri config not found
    exit /b 1
)

echo ✅ Required files present

REM Run validation
node scripts\node\validate-setup.js
if %errorlevel% neq 0 (
    echo ❌ Setup validation failed
    exit /b 1
)

echo.
echo ===============================================================================
echo                           🎉 SETUP COMPLETE!
echo ===============================================================================
echo.
echo Next steps:
echo 1. 🔑 Review the generated keys in the 'crypto\signing-keys' directory
echo 2. 📝 Follow docs/setup/KEY_SETUP.md to set up GitHub secrets (boss only)
echo 3. 📖 Read docs/welcome/WELCOME_TO_TEAM.md for complete team onboarding
echo 4. 🏗️  Test the build locally: npm run tauri:dev
echo 5. 🚀 Push to GitHub to trigger the CI/CD pipeline
echo 6. 📦 Optionally set up code signing certificates
echo.
echo Useful commands:
echo   # Development
echo   npm run dev              # Start frontend dev server
echo   npm run tauri:dev        # Start Tauri dev mode
echo   .
echo   # Building
echo   npm run build            # Build frontend
echo   npm run tauri:build      # Build Tauri app
echo   .\scripts\build-tauri.bat # Optimized build script
echo   .
echo   # Testing
echo   npm test                 # Frontend tests
echo   npm run test:backend     # Backend tests
echo   .
echo   # Validation
echo   node scripts\validate-setup.js  # Validate configuration
echo.
echo Happy coding! 🎉