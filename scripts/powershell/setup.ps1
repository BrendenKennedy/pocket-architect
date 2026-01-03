
Write-Host "Pocket Architect PowerShell setup script has been removed. Use bash setup.sh on WSL or macOS."
exit 1

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "Pocket Architect - Interactive Setup Script for Windows (PowerShell)" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "Sets up the entire development environment and production pipeline" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "[START] Pocket Architect Interactive Setup" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Yellow


# Change to project root directory (two levels up from scripts\powershell)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
Set-Location $projectRoot

Write-Host "[INFO] Changed working directory to: $projectRoot" -ForegroundColor Gray
Write-Host ""


# Function to check if a command exists (moved up for early use)
function Test-Command {
    param([string]$Command)
    try {
        if (Get-Command $Command -ErrorAction SilentlyContinue) {
            return $true
        }
        return $false
    }
    catch {
        return $false
    }
}

# Ensure Node.js 22 is installed using Chocolatey if not present or wrong version
function Ensure-Chocolatey {
    if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
        Write-Host "[INFO] Chocolatey not found. Installing Chocolatey..." -ForegroundColor Yellow
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
            Write-Host "[ERROR] Failed to install Chocolatey. Please install manually from https://chocolatey.org/install" -ForegroundColor Red
            exit 1
        }
        Write-Host "[SUCCESS] Chocolatey installed." -ForegroundColor Green
    }
}


function Ensure-NodeJs22 {
    $requiredVersion = '22.21.1'
    $nodeOk = $false
    if (Test-Command "node") {
        $nodeVersion = node --version
        if ($nodeVersion -match "^v(\d+)") {
            $versionNumber = [int]$Matches[1]
            if ($versionNumber -ge 20) {
                $nodeOk = $true
                Write-Host "[OK] Node.js $nodeVersion detected (meets requirement v20+)" -ForegroundColor Green
            } else {
                Write-Host "[WARNING] Node.js $nodeVersion detected, but v20+ is required. Installing correct version..." -ForegroundColor Yellow
            }
        } else {
            Write-Host "[ERROR] Could not parse Node.js version: $nodeVersion" -ForegroundColor Red
        }
    } else {
        Write-Host "[INFO] Node.js not found. Installing Node.js v20+..." -ForegroundColor Yellow
    }
    if (-not $nodeOk) {
        Ensure-Chocolatey
        Write-Host "[INFO] Installing Node.js v$requiredVersion via Chocolatey..." -ForegroundColor Yellow
        choco install nodejs --version="$requiredVersion" -y
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        if (Test-Command "node") {
            $nodeVersion = node --version
            if ($nodeVersion -match "^v(\d+)") {
                $versionNumber = [int]$Matches[1]
                if ($versionNumber -ge 20) {
                    Write-Host "[SUCCESS] Node.js $nodeVersion installed." -ForegroundColor Green
                } else {
                    Write-Host "[ERROR] Node.js $nodeVersion installed, but v20+ is required. Please check your PATH and try again." -ForegroundColor Red
                    Write-Host "[HINT] If you just installed Node.js, please close and reopen your terminal, then re-run this script." -ForegroundColor Yellow
                    exit 1
                }
            } else {
                Write-Host "[ERROR] Could not parse Node.js version: $nodeVersion" -ForegroundColor Red
                exit 1
            }
        } else {
            Write-Host "[ERROR] Node.js installation failed. Please install manually." -ForegroundColor Red
            exit 1
        }
    }
}

# Ensure Node.js 22 is present before continuing
Ensure-NodeJs22

# Function for interactive yes/no prompts
function Read-Choice {
    param(
        [string]$Prompt,
        [string]$Default = "Y"
    )
    
    $choice = Read-Host "$Prompt (Y/n)"
    if ($choice -eq "") { $choice = $Default }
    
    return $choice.ToUpper() -eq "Y"
}

# Function for multiple choice prompts
function Read-MultipleChoice {
    param(
        [string]$Prompt,
        [string[]]$Options,
        [int]$Default = 0
    )
    
    Write-Host "$Prompt" -ForegroundColor Yellow
    for ($i = 0; $i -lt $Options.Length; $i++) {
        $marker = if ($i -eq $Default) { ">" } else { " " }
        Write-Host "  $marker $($i + 1). $($Options[$i])" -ForegroundColor White
    }
    
    do {
        $choice = Read-Host "Enter choice (1-$($Options.Length))"
        if ($choice -eq "") { $choice = $Default + 1 }
        
        $choiceNum = [int]$choice
        if ($choiceNum -ge 1 -and $choiceNum -le $Options.Length) {
            return $choiceNum - 1
        }
        
        Write-Host "Invalid choice. Please enter 1-$($Options.Length)." -ForegroundColor Red
    } while ($true)
}

# Check for admin rights for installations
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Function to check if a command exists
function Test-Command {
    param([string]$Command)
    try {
        if (Get-Command $Command -ErrorAction SilentlyContinue) {
            return $true
        }
        return $false
    }
    catch {
        return $false
    }
}

# Function to download and install if needed
function Install-IfMissing {
    param(
        [string]$CommandName,
        [string]$DisplayName,
        [string]$DownloadUrl,
        [string]$InstallerArgs,
        [string]$ErrorMessage
    )
    
    if (Test-Command $CommandName) {
        try {
            $version = & $CommandName --version 2>$null | Select-Object -First 1
            if ($version) {
                Write-Host "  [OK] $DisplayName`: $version" -ForegroundColor Green
            } else {
                Write-Host "  [OK] $DisplayName`: present (version check failed)" -ForegroundColor Green
            }
        } catch {
            Write-Host "  [OK] $DisplayName`: present (version check failed)" -ForegroundColor Green
        }
        return $true
    }
    else {
        Write-Host "  [INFO] $DisplayName not found. Attempting to download and install..." -ForegroundColor Yellow
        
        if (-not (Test-Administrator)) {
            Write-Host "  [ERROR] Administrator rights required to install $DisplayName. Please run as Administrator." -ForegroundColor Red
            return $false
        }
        
        $installerName = Split-Path $DownloadUrl -Leaf
        
        try {
            Write-Host "  [INFO] Downloading $DisplayName..." -ForegroundColor Yellow
            Invoke-WebRequest -Uri $DownloadUrl -OutFile $installerName -ErrorAction Stop
            
            Write-Host "  [INFO] Installing $DisplayName..." -ForegroundColor Yellow
            $process = Start-Process -FilePath $installerName -ArgumentList $InstallerArgs -Wait -PassThru -ErrorAction Stop
            
            if ($process.ExitCode -eq 0) {
                Write-Host "  [SUCCESS] $DisplayName installed successfully!" -ForegroundColor Green
                Write-Host "  [INFO] Please restart your terminal and re-run this script to continue setup." -ForegroundColor Yellow
                return $true
            }
            else {
                Write-Host "  [ERROR] $DisplayName installation failed with exit code $($process.ExitCode)" -ForegroundColor Red
                Write-Host "  [INFO] $ErrorMessage" -ForegroundColor Yellow
                return $false
            }
        }
        catch {
            Write-Host "  [ERROR] Failed to download or install $DisplayName`: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "  [INFO] $ErrorMessage" -ForegroundColor Yellow
            return $false
        }
        finally {
            if (Test-Path $installerName) {
                Remove-Item $installerName -Force
            }
        }
    }
}

# Setup mode selection
Write-Host ""
Write-Host "Choose setup mode:" -ForegroundColor Cyan
$setupModes = @(
    "Full Setup (recommended) - Check prerequisites, install dependencies, setup signing",
    "Minimal Setup - Just check prerequisites and install basic dependencies", 
    "Custom Setup - Choose what to install/configure interactively",
    "Validation Only - Just run configuration validation"
)
$selectedMode = Read-MultipleChoice "Select setup mode:" $setupModes 0

$doPrerequisites = $true
$doDependencies = $true  
$doSigning = $true
$doValidation = $true

switch ($selectedMode) {
    0 { # Full Setup
        Write-Host "[INFO] Running full setup (all components)" -ForegroundColor Green
    }
    1 { # Minimal Setup
        Write-Host "[INFO] Running minimal setup (prerequisites + basic dependencies only)" -ForegroundColor Green
        $doSigning = $false
        $doValidation = $false
    }
    2 { # Custom Setup
        Write-Host "[INFO] Running custom setup (interactive choices)" -ForegroundColor Green
        $doPrerequisites = Read-Choice "Check system prerequisites?"
        $doDependencies = Read-Choice "Install npm dependencies?"
        $doSigning = Read-Choice "Set up code signing and updater keys?"
        $doValidation = Read-Choice "Run configuration validation?"
    }
    3 { # Validation Only
        Write-Host "[INFO] Running validation only" -ForegroundColor Green
        $doPrerequisites = $false
        $doDependencies = $false
        $doSigning = $false
    }
}

Write-Host ""

if ($doPrerequisites) {
    Write-Host "Checking prerequisites..." -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "Skipping prerequisite checks..." -ForegroundColor Yellow
    Write-Host ""
}

if ($doPrerequisites) {
    # Check for Visual Studio Build Tools (cl.exe)
    Write-Host "[C++] Visual Studio Build Tools:" -ForegroundColor Cyan
    $vsInstalled = Install-IfMissing -CommandName "cl" -DisplayName "Visual Studio Build Tools" -DownloadUrl "https://aka.ms/vs/17/release/vs_BuildTools.exe" -InstallerArgs "--quiet --wait --norestart --nocache --add Microsoft.VisualStudio.Workload.VCTools --add Microsoft.VisualStudio.Component.Windows10SDK.19041 --add Microsoft.VisualStudio.Component.VC.CMake.Project --includeRecommended" -ErrorMessage "Please install manually: https://visualstudio.microsoft.com/visual-cpp-build-tools/"

    # Check for CMake
    Write-Host "[CMAKE] CMake:" -ForegroundColor Cyan
    $cmakeInstalled = Install-IfMissing -CommandName "cmake" -DisplayName "CMake" -DownloadUrl "https://github.com/Kitware/CMake/releases/download/v3.29.2/cmake-3.29.2-windows-x86_64.msi" -InstallerArgs "/quiet /norestart ALLUSERS=1 ADD_CMAKE_TO_PATH=System" -ErrorMessage "Please install manually: https://cmake.org/download/"


    # Check Node.js
    Write-Host "[PKG] Node.js:" -ForegroundColor Cyan
    if (Test-Command "node") {
        $nodeVersion = node --version
        Write-Host "  [OK] $nodeVersion" -ForegroundColor Green
        
        # Check version requirement (20+)
        $versionNumber = [int]($nodeVersion -replace "v(\d+).*", '$1')
        if ($versionNumber -lt 20) {
            Write-Host "  [ERROR] Node.js version too old. Requires v20+" -ForegroundColor Red
            Write-Host "  Current: $nodeVersion" -ForegroundColor Red
            exit 1
        }
        Write-Host "  [OK] Node.js: $nodeVersion (meets requirement >=20)" -ForegroundColor Green
    }
    else {
        Write-Host "  [ERROR] Node.js not found. Please install Node.js 20+ from https://nodejs.org/" -ForegroundColor Red
        exit 1
    }

    # Check npm
    Write-Host "[PKG] npm:" -ForegroundColor Cyan
    if (Test-Command "npm") {
        $npmVersion = npm --version
        Write-Host "  [OK] v$npmVersion" -ForegroundColor Green
    }
    else {
        Write-Host "  [ERROR] npm not found. Please install npm" -ForegroundColor Red
        exit 1
    }

    # Check npx
    Write-Host "[PKG] npx:" -ForegroundColor Cyan
    if (Test-Command "npx") {
        $npxVersion = npx --version
        Write-Host "  [OK] v$npxVersion" -ForegroundColor Green
    }
    else {
        Write-Host "  [ERROR] npx not found. Please ensure you have npm 5.2+ or install npx manually." -ForegroundColor Red
        exit 1
    }

    # Check Rust
    Write-Host "[RUST] Rust:" -ForegroundColor Cyan
    if (Test-Command "cargo") {
        $cargoVersion = cargo --version
        Write-Host "  [OK] $cargoVersion" -ForegroundColor Green
        
        # Check version requirement (1.70+)
        if ($cargoVersion -match "cargo 1\.(\d+)") {
            $minorVersion = [int]$Matches[1]
            if ($minorVersion -lt 70) {
                Write-Host "  [ERROR] Rust version too old. Requires 1.70+" -ForegroundColor Red
                Write-Host "  Current: $cargoVersion" -ForegroundColor Red
                exit 1
            }
            Write-Host "  [OK] Rust: $cargoVersion (meets requirement >=1.70)" -ForegroundColor Green
        }
    }
    else {
        Write-Host "  [ERROR] Rust not found. Please install Rust from https://rustup.rs/" -ForegroundColor Red
        exit 1
    }

    # Check Git
    Write-Host "[GIT] Git:" -ForegroundColor Cyan
    if (Test-Command "git") {
        $gitVersion = git --version
        Write-Host "  [OK] $gitVersion" -ForegroundColor Green
    }
    else {
        Write-Host "  [ERROR] Git not found. Please install Git from https://git-scm.com/" -ForegroundColor Red
        exit 1
    }

    # Check OpenSSL
    Write-Host "[SSL] OpenSSL:" -ForegroundColor Cyan
    if (Test-Command "openssl") {
        Write-Host "  [OK] OpenSSL available" -ForegroundColor Green
    }
    elseif (Test-Path "C:\Program Files\Git\usr\bin\openssl.exe") {
        $env:PATH = "C:\Program Files\Git\usr\bin;$env:PATH"
        Write-Host "  [OK] OpenSSL found in Git for Windows" -ForegroundColor Green
    }
    else {
        Write-Host "  [WARNING] OpenSSL not found. Required for key encryption/decryption." -ForegroundColor Yellow
        Write-Host "  [INFO] Install via: choco install openssl (run as Administrator)" -ForegroundColor Yellow
        Write-Host "  [INFO] Or download from: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
        Write-Host "  [INFO] Git for Windows includes OpenSSL - ensure it's in PATH" -ForegroundColor Yellow
        Write-Host "  [INFO] Continuing setup, but key operations may fail..." -ForegroundColor Yellow
    }

    # Test try-catch blocks
    Write-Host "[TEST] Try-catch blocks:" -ForegroundColor Cyan
    try {
        Push-Location "src-tauri"
        $tauriRustInfo = cargo tree --depth 0 | Select-String "tauri"
        if ($tauriRustInfo) {
            Write-Host "  [OK] Rust dependencies present" -ForegroundColor Green
        } else {
            Write-Host "  [INFO] Rust dependencies not found" -ForegroundColor Yellow
        }
        Pop-Location
    }
    catch {
        Pop-Location
        Write-Host "  [ERROR] Failed to check Rust dependencies" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "[SUCCESS] Prerequisites OK" -ForegroundColor Green
    Write-Host ""
}

# Setup directories
Write-Host "Setting up project structure..." -ForegroundColor Yellow
if (-not (Test-Path "crypto\signing-keys")) {
    New-Item -ItemType Directory -Path "crypto\signing-keys" -Force | Out-Null
}

# Install root dependencies
if ($doDependencies) {
    Write-Host "Installing root dependencies..." -ForegroundColor Yellow
    try {
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERROR] Failed to install root dependencies" -ForegroundColor Red
            exit 1
        }
        Write-Host "[SUCCESS] Root dependencies installed" -ForegroundColor Green
    }
    catch {
        Write-Host "[ERROR] Failed to install root dependencies: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }

    # Check Tauri CLI
    Write-Host "Checking Tauri CLI..." -ForegroundColor Yellow
    if (Test-Command "tauri") {
        $tauriVersion = tauri --version
        Write-Host "[OK] Tauri CLI (global): $tauriVersion" -ForegroundColor Green
    }
    else {
        Write-Host "[INFO] Global Tauri CLI not found, checking local (npx)..." -ForegroundColor Yellow
        try {
            $tauriVersion = npx tauri --version
            Write-Host "[OK] Tauri CLI (npx): $tauriVersion" -ForegroundColor Green
        }
        catch {
            Write-Host "[ERROR] Tauri CLI not available globally or locally. Attempting to install globally..." -ForegroundColor Red
            try {
                npm install -g @tauri-apps/cli
                if ($LASTEXITCODE -ne 0) {
                    throw "npm install failed"
                }
                $tauriVersion = tauri --version
                Write-Host "[OK] Tauri CLI (global): $tauriVersion" -ForegroundColor Green
            }
            catch {
                Write-Host "[ERROR] Failed to install Tauri CLI globally. Please run 'npm install -g @tauri-apps/cli' manually as Administrator." -ForegroundColor Red
                Write-Host "[HINT] You may need to add your global npm bin directory to your PATH. Run 'npm bin -g' to check." -ForegroundColor Yellow
                exit 1
            }
        }
    }

    # Install frontend dependencies
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    try {
        Push-Location "src"
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed"
        }
        Pop-Location
        Write-Host "[SUCCESS] Frontend dependencies installed" -ForegroundColor Green
    }
    catch {
        Pop-Location
        Write-Host "[ERROR] Failed to install frontend dependencies: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "===============================================================================" -ForegroundColor Cyan
    Write-Host "                      [SUCCESS] ALL DEPENDENCIES INSTALLED" -ForegroundColor Cyan
    Write-Host "===============================================================================" -ForegroundColor Cyan
    Write-Host ""
}

# Setup code signing and updater
if ($doSigning) {
    Write-Host "Setting up code signing and updater..." -ForegroundColor Yellow
    if (Test-Path "scripts\powershell\setup-updater-keys.ps1") {
        $runSigningHelper = Read-Choice "Run the signing key helper now? (choose 'No' if you plan to supply keys later)"
        if ($runSigningHelper) {
            & "scripts\powershell\setup-updater-keys.ps1"
        } else {
            Write-Host "[INFO] Skipping signing helper. You can run scripts\\powershell\\setup-updater-keys.ps1 later." -ForegroundColor Yellow
        }
    } else {
        Write-Host "[WARNING] setup-updater-keys.ps1 not found, skipping signing setup" -ForegroundColor Yellow
    }
}

# Validate setup
if ($doValidation) {
    Write-Host "Validating setup..." -ForegroundColor Yellow

    # Check for required files
    $requiredFiles = @(
        "scripts\node\validate-setup.js",
        "package.json",
        "src\package.json",
        "src-tauri\tauri.conf.json"
    )

    foreach ($file in $requiredFiles) {
        if (-not (Test-Path $file)) {
            Write-Host "[ERROR] $file not found" -ForegroundColor Red
            exit 1
        }
    }

    Write-Host "[SUCCESS] Required files present" -ForegroundColor Green

    # Run validation
    try {
        node scripts\node\validate-setup.js
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[WARNING] Setup validation found some issues (non-critical)" -ForegroundColor Yellow
            Write-Host "[INFO] Setup completed successfully, but some configuration may need attention" -ForegroundColor Yellow
        } else {
            Write-Host "[SUCCESS] Setup validation passed" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "[WARNING] Setup validation failed to run: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "[INFO] Setup completed, but validation could not be performed" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "===============================================================================" -ForegroundColor Cyan
    Write-Host "                           [SUCCESS] SETUP COMPLETE!" -ForegroundColor Cyan
    Write-Host "===============================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Review the generated keys in the crypto/signing-keys directory" -ForegroundColor White
    Write-Host "2. Follow docs/setup/KEY_SETUP.md to set up GitHub secrets - boss only" -ForegroundColor White
    Write-Host "3. Read docs/welcome/WELCOME_TO_TEAM.md for complete team onboarding" -ForegroundColor White
    Write-Host "4. Test the build locally: npm run tauri dev" -ForegroundColor White
    Write-Host "5. Push to GitHub to trigger the CI/CD pipeline" -ForegroundColor White
    Write-Host "6. Optionally set up code signing certificates" -ForegroundColor White
    Write-Host ""
    Write-Host "Useful commands:" -ForegroundColor Yellow
    Write-Host "  # Development" -ForegroundColor Gray
    Write-Host "  npm run dev              # Start frontend dev server" -ForegroundColor White
    Write-Host "  npm run tauri dev        # Start Tauri dev mode" -ForegroundColor White
    Write-Host "  ." -ForegroundColor Gray
    Write-Host "  # Building" -ForegroundColor Gray
    Write-Host "  npm run build            # Build frontend" -ForegroundColor White
    Write-Host "  npm run tauri build      # Build Tauri app" -ForegroundColor White
    Write-Host "  ." -ForegroundColor Gray
    Write-Host "  # Testing" -ForegroundColor Gray
    Write-Host "  npm test                 # Frontend tests" -ForegroundColor White
    Write-Host "  npm run test:backend     # Backend tests" -ForegroundColor White
    Write-Host "  ." -ForegroundColor Gray
    Write-Host "  # Validation" -ForegroundColor Gray
    Write-Host "  node scripts\validate-setup.js  # Validate configuration" -ForegroundColor White
    Write-Host ""
    Write-Host "Happy coding!" -ForegroundColor Cyan
}