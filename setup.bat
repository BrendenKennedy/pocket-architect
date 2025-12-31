@echo off
REM ============================================================================
REM Pocket Architect - Complete Setup Script for Windows
REM ============================================================================
REM Sets up the entire development environment and production pipeline
REM ============================================================================

echo 🚀 Pocket Architect - Complete Setup
echo =====================================

REM Colors - not available in batch, skip

REM Check prerequisites
echo Checking prerequisites...

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js 20+ from https://nodejs.org/
    exit /b 1
)

REM Check npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm not found. Please install npm
    exit /b 1
)

REM Check Rust
where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Rust not found. Please install Rust from https://rustup.rs/
    exit /b 1
)

echo ✅ Prerequisites OK
echo.

REM Setup directories
echo Setting up project structure...
if not exist signing-keys mkdir signing-keys
if not exist certificates mkdir certificates

REM Install root dependencies
echo Installing root dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install root dependencies
    exit /b 1
)
echo ✅ Root dependencies installed

REM Install frontend dependencies
echo Installing frontend dependencies...
cd src
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install frontend dependencies
    cd ..
    exit /b 1
)
cd ..
echo ✅ Frontend dependencies installed

REM Setup code signing and updater
echo Setting up code signing and updater...
if exist scripts\setup-signing.bat (
    call scripts\setup-signing.bat
) else (
    echo ⚠️ setup-signing.bat not found, skipping signing setup
)

REM Validate setup
echo Validating setup...
node scripts\validate-setup.js
if %errorlevel% neq 0 (
    echo ❌ Setup validation failed
    exit /b 1
)

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. 🔑 Review the generated keys in the 'signing-keys' directory
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