#!/bin/bash
# ============================================================================
# Pocket Architect - Welcome Script for New Developers
# ============================================================================
# Automates setup and validation after cloning the repo
# ============================================================================

set -e

echo "🎉 Welcome to Pocket Architect!"
echo "================================"
echo
echo "This script will set up your development environment."
echo "Ensure you have WSL (Windows) and Git installed."
echo

# Install Rust if needed
echo "🦀 Checking Rust..."
if ! command -v cargo &> /dev/null; then
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source ~/.cargo/env
    echo "Rust installed."
else
    echo "Rust is already installed."
fi

# Install NVM and Node.js 20 if needed
echo "📦 Checking Node.js..."
if ! command -v node &> /dev/null || [[ "$(node --version | sed 's/v//')" < "20" ]]; then
    echo "Installing NVM and Node.js 20..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 20
    nvm use --delete-prefix 20
    nvm use 20
    nvm alias default 20
    echo "Node.js 20 installed and set as default."
else
    echo "Node.js 20+ is already installed."
fi

# Run setup
echo "🚀 Running initial setup..."
./setup.sh || echo "Setup completed with warnings (signing may have failed)."

# Validate
echo "🔍 Validating setup..."
node scripts/validate-setup.js

echo
echo "✅ Setup complete! You're ready to develop."
echo "Run 'npm run tauri:dev' to start the app."
echo
echo "📋 Next steps:"
echo "  - Read docs/welcome/WELCOME_TO_TEAM.md for complete onboarding"
echo "  - Set up signing keys: See docs/setup/KEY_SETUP.md"
echo "  - Happy coding! 🎉"