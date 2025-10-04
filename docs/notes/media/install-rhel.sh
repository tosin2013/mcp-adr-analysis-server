#!/bin/bash

# MCP ADR Analysis Server - RHEL Installation Script
# Handles RHEL 9/10 specific issues with npm global installations and PATH

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🎯 MCP ADR Analysis Server - RHEL Installation"
echo "============================================="

# Check if we're on RHEL
if [ ! -f /etc/redhat-release ]; then
    echo "❌ This script is designed for RHEL systems"
    echo "For other systems, use: npm install -g mcp-adr-analysis-server"
    exit 1
fi

RHEL_VERSION=$(cat /etc/redhat-release)
echo "📋 Detected: $RHEL_VERSION"

# Check Node.js version
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js is not installed"
    echo "Install Node.js first:"
    echo "  sudo dnf module install nodejs:20/common"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js: $NODE_VERSION"

# Check npm version
if ! command -v npm >/dev/null 2>&1; then
    echo "❌ npm is not installed"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo "✅ npm: $NPM_VERSION"

# RHEL-specific npm configuration
echo ""
echo "🔧 Configuring npm for RHEL..."

# Set npm prefix to user directory to avoid permission issues
NPM_PREFIX="$HOME/.npm-global"
mkdir -p "$NPM_PREFIX"

echo "Setting npm prefix to: $NPM_PREFIX"
npm config set prefix "$NPM_PREFIX"

# Add npm global bin to PATH if not already there
NPM_BIN_PATH="$NPM_PREFIX/bin"
if [[ ":$PATH:" != *":$NPM_BIN_PATH:"* ]]; then
    echo "Adding npm global bin to PATH"
    
    # Add to current session
    export PATH="$NPM_BIN_PATH:$PATH"
    
    # Add to bashrc for future sessions
    if ! grep -q "export PATH.*npm-global/bin" ~/.bashrc 2>/dev/null; then
        echo "" >> ~/.bashrc
        echo "# Add npm global bin to PATH (added by MCP ADR Analysis Server installer)" >> ~/.bashrc
        echo "export PATH=\"$NPM_BIN_PATH:\$PATH\"" >> ~/.bashrc
        echo "✅ Added npm global bin to ~/.bashrc"
    else
        echo "✅ npm global bin already in ~/.bashrc"
    fi
else
    echo "✅ npm global bin already in PATH"
fi

echo ""
echo "📦 Installing MCP ADR Analysis Server..."

# Try global installation first
if npm install -g mcp-adr-analysis-server; then
    echo "✅ Global installation successful"
    
    # Verify binary exists and is executable
    BINARY_PATH="$NPM_BIN_PATH/mcp-adr-analysis-server"
    if [ -f "$BINARY_PATH" ] && [ -x "$BINARY_PATH" ]; then
        echo "✅ Binary installed and executable at: $BINARY_PATH"
    else
        echo "⚠️  Binary not found or not executable, checking alternatives..."
        
        # Look for the binary in node_modules
        GLOBAL_NODE_MODULES="$(npm root -g)"
        ALT_BINARY="$GLOBAL_NODE_MODULES/mcp-adr-analysis-server/dist/src/index.js"
        
        if [ -f "$ALT_BINARY" ]; then
            echo "Found binary at: $ALT_BINARY"
            # Create symlink
            ln -sf "$ALT_BINARY" "$BINARY_PATH"
            chmod +x "$BINARY_PATH"
            echo "✅ Created symlink and made executable"
        fi
    fi
else
    echo "❌ Global installation failed, trying alternative approach..."
    
    # Alternative: Install locally and create wrapper script
    echo "Installing locally..."
    cd "$PROJECT_DIR"
    npm install
    npm run build
    
    # Create wrapper script
    WRAPPER_SCRIPT="$NPM_BIN_PATH/mcp-adr-analysis-server"
    mkdir -p "$(dirname "$WRAPPER_SCRIPT")"
    
    cat > "$WRAPPER_SCRIPT" << 'EOF'
#!/bin/bash
# MCP ADR Analysis Server wrapper script for RHEL

# Try to use global installation first
if command -v node >/dev/null 2>&1; then
    # Check if we can find the package
    GLOBAL_MODULES="$(npm root -g 2>/dev/null)"
    if [ -f "$GLOBAL_MODULES/mcp-adr-analysis-server/dist/src/index.js" ]; then
        exec node "$GLOBAL_MODULES/mcp-adr-analysis-server/dist/src/index.js" "$@"
    fi
    
    # Try npx as fallback
    if command -v npx >/dev/null 2>&1; then
        exec npx mcp-adr-analysis-server "$@"
    fi
    
    # Try local installation
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_BINARY="$SCRIPT_DIR/../mcp-adr-analysis-server/dist/src/index.js"
    if [ -f "$PROJECT_BINARY" ]; then
        exec node "$PROJECT_BINARY" "$@"
    fi
fi

echo "❌ MCP ADR Analysis Server not found"
echo "Try running: npm install -g mcp-adr-analysis-server"
exit 1
EOF
    
    chmod +x "$WRAPPER_SCRIPT"
    echo "✅ Created wrapper script at: $WRAPPER_SCRIPT"
fi

echo ""
echo "🧪 Testing installation..."

# Test the binary
if command -v mcp-adr-analysis-server >/dev/null 2>&1; then
    echo "✅ Binary found in PATH"
    
    # Test version
    if mcp-adr-analysis-server --version >/dev/null 2>&1; then
        VERSION=$(mcp-adr-analysis-server --version)
        echo "✅ $VERSION"
    else
        echo "⚠️  Binary found but version check failed"
    fi
    
    # Test health check
    if mcp-adr-analysis-server --test >/dev/null 2>&1; then
        echo "✅ Health check passed"
    else
        echo "⚠️  Health check failed"
    fi
else
    echo "❌ Binary not found in PATH"
    echo "You may need to restart your terminal or run: source ~/.bashrc"
fi

echo ""
echo "🎉 Installation completed!"
echo ""
echo "📋 MCP Configuration for RHEL:"
echo "Add this to your Claude Desktop config:"
echo ""
echo "{"
echo "  \"mcpServers\": {"
echo "    \"adr-analysis\": {"
echo "      \"command\": \"mcp-adr-analysis-server\","
echo "      \"env\": {"
echo "        \"PROJECT_PATH\": \"/path/to/your/project\","
echo "        \"OPENROUTER_API_KEY\": \"your_openrouter_api_key_here\","
echo "        \"EXECUTION_MODE\": \"full\","
echo "        \"AI_MODEL\": \"anthropic/claude-3-sonnet\","
echo "        \"ADR_DIRECTORY\": \"docs/adrs\","
echo "        \"LOG_LEVEL\": \"ERROR\""
echo "      }"
echo "    }"
echo "  }"
echo "}"
echo ""
echo "🚨 RHEL Alternative (if command still not found):"
echo "{"
echo "  \"mcpServers\": {"
echo "    \"adr-analysis\": {"
echo "      \"command\": \"npx\","
echo "      \"args\": [\"mcp-adr-analysis-server\"],"
echo "      \"env\": {"
echo "        \"PROJECT_PATH\": \"/path/to/your/project\","
echo "        \"OPENROUTER_API_KEY\": \"your_openrouter_api_key_here\","
echo "        \"EXECUTION_MODE\": \"full\","
echo "        \"AI_MODEL\": \"anthropic/claude-3-sonnet\","
echo "        \"ADR_DIRECTORY\": \"docs/adrs\","
echo "        \"LOG_LEVEL\": \"ERROR\""
echo "      }"
echo "    }"
echo "  }"
echo "}"
echo ""
echo "💡 Troubleshooting:"
echo "- If command not found: source ~/.bashrc or restart terminal"
echo "- If still issues: use the npx configuration above"
echo "- For debugging: run with LOG_LEVEL=DEBUG"