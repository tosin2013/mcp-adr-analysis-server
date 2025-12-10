#!/bin/bash
# Check for ripgrep dependency
# Note: We check for actual binary, not shell aliases (which don't work in Node.js subprocesses)

# Check common locations for ripgrep binary
RG_PATH=""
if [ -x "/opt/homebrew/bin/rg" ]; then
    RG_PATH="/opt/homebrew/bin/rg"
elif [ -x "/usr/local/bin/rg" ]; then
    RG_PATH="/usr/local/bin/rg"
elif [ -x "/usr/bin/rg" ]; then
    RG_PATH="/usr/bin/rg"
elif command -v rg &> /dev/null && [ ! "$(type rg 2>/dev/null | grep -c 'alias')" -gt 0 ]; then
    RG_PATH="$(command -v rg)"
fi

if [ -z "$RG_PATH" ]; then
    echo ""
    echo "⚠️  WARNING: ripgrep (rg) is required but not installed!"
    echo ""
    echo "Please install ripgrep before using mcp-adr-analysis-server:"
    echo ""
    echo "  macOS:         brew install ripgrep"
    echo "  Ubuntu/Debian: sudo apt install ripgrep"
    echo "  RHEL/Fedora:   sudo dnf install ripgrep"
    echo "  Arch Linux:    sudo pacman -S ripgrep"
    echo "  Windows:       choco install ripgrep  (or: scoop install ripgrep)"
    echo ""
    echo "For more options, see: https://github.com/BurntSushi/ripgrep#installation"
    echo ""
    exit 0  # Don't fail install, just warn
fi

echo "✅ ripgrep dependency found: $($RG_PATH --version | head -1)"
