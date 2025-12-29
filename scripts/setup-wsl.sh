#!/bin/bash
echo "Setting up Rust and dependencies in WSL for Pocket Architect..."

# Update package list
sudo apt update

# Install basic dependencies
sudo apt install -y build-essential cmake pkg-config libssl-dev

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source $HOME/.cargo/env

# Add Rust to PATH for future sessions
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify installation
rustc --version
cargo --version

echo "Rust setup complete!"
echo "You can now build and run Pocket Architect with AWS SDK support."