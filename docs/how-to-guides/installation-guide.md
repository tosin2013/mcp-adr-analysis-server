# 📦 MCP ADR Analysis Server Installation Guide

**Complete installation guide for all environments and use cases**

> **Version**: 2.1.0 | **Node.js**: ≥20.0.0 | **NPM**: ≥9.0.0

---

## 📖 Table of Contents

1. [Quick Installation](#quick-installation)
2. [System Requirements](#system-requirements)
3. [Installation Methods](#installation-methods)
4. [MCP Client Configuration](#mcp-client-configuration)
5. [Environment Setup](#environment-setup)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)
8. [Uninstallation](#uninstallation)

---

## ⚡ Quick Installation

### For Most Users (NPM Global Install)

```bash
# Install globally from NPM
npm install -g mcp-adr-analysis-server@2.1.0

# Verify installation
mcp-adr-analysis-server --version
# Expected: MCP ADR Analysis Server v2.1.0

# Quick health check
mcp-adr-analysis-server --test
# Expected: ✅ Health check passed
```

### For AI Assistants (MCP Client Setup)

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/path/to/your/project",
        "OPENROUTER_API_KEY": "your_api_key_here",
        "EXECUTION_MODE": "full"
      }
    }
  }
}
```

---

## 🖥️ System Requirements

### Minimum Requirements

- **Operating System**: macOS, Linux, Windows (WSL2 recommended)
- **Node.js**: ≥20.0.0 (LTS recommended)
- **NPM**: ≥9.0.0
- **Memory**: 2GB RAM minimum, 4GB+ recommended
- **Storage**: 500MB free space (1GB+ for development)
- **Network**: Internet access for AI API calls

### Recommended Requirements

- **Node.js**: Latest LTS (20.x)
- **Memory**: 8GB+ RAM for large projects
- **Storage**: 2GB+ free space
- **CPU**: Multi-core processor for parallel analysis

### Platform-Specific Notes

#### macOS

```bash
# Install Node.js via Homebrew (recommended)
brew install node@20

# Verify installation
node --version  # Should be ≥20.0.0
npm --version   # Should be ≥9.0.0
```

#### Linux (Ubuntu/Debian)

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### RHEL/CentOS/Fedora

```bash
# Use the special RHEL installer
curl -sSL https://raw.githubusercontent.com/tosin2013/mcp-adr-analysis-server/main/scripts/install-rhel.sh | bash
```

#### Windows

```powershell
# Install Node.js from official website or use Chocolatey
choco install nodejs --version=20.0.0

# Or use Windows Package Manager
winget install OpenJS.NodeJS
```

---

## 🔧 Installation Methods

### Method 1: NPM Global Installation (Recommended)

**Best for**: Most users, AI assistants, production use

```bash
# Install latest stable version
npm install -g mcp-adr-analysis-server

# Install specific version
npm install -g mcp-adr-analysis-server@2.1.0

# Verify installation
which mcp-adr-analysis-server
mcp-adr-analysis-server --version
```

**Pros**:

- Simple installation
- Available system-wide
- Automatic PATH configuration
- Easy updates

**Cons**:

- Requires global npm permissions
- Single version per system

### Method 2: Local Project Installation

**Best for**: Project-specific usage, development teams

```bash
# Navigate to your project
cd /path/to/your/project

# Install locally
npm install mcp-adr-analysis-server@2.1.0

# Run via npx
npx mcp-adr-analysis-server --version

# Or add to package.json scripts
echo '{"scripts": {"adr": "mcp-adr-analysis-server"}}' >> package.json
npm run adr -- --version
```

### Method 3: Development Installation (From Source)

**Best for**: Contributors, advanced users, custom modifications

```bash
# Clone repository
git clone https://github.com/tosin2013/mcp-adr-analysis-server.git
cd mcp-adr-analysis-server

# Install dependencies
npm install

# Build from source
npm run build

# Run tests to verify
npm test

# Link globally (optional)
npm link

# Verify development installation
mcp-adr-analysis-server --version
```

### Method 4: Docker Installation

**Best for**: Containerized environments, CI/CD pipelines

```bash
# Pull Docker image (when available)
docker pull tosin2013/mcp-adr-analysis-server:2.1.0

# Run in container
docker run -it --rm \
  -v $(pwd):/workspace \
  -e OPENROUTER_API_KEY=your_key \
  tosin2013/mcp-adr-analysis-server:2.1.0 \
  analyze_project_ecosystem --projectPath=/workspace
```

---

## 🤖 MCP Client Configuration

### Claude Desktop

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)
// %APPDATA%\Claude\claude_desktop_config.json (Windows)
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/Users/username/projects/my-project",
        "OPENROUTER_API_KEY": "sk-or-v1-...",
        "EXECUTION_MODE": "full",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Cline (VS Code Extension)

```json
// .vscode/settings.json
{
  "cline.mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "${workspaceFolder}",
        "OPENROUTER_API_KEY": "${env:OPENROUTER_API_KEY}",
        "EXECUTION_MODE": "full"
      }
    }
  }
}
```

### Cursor

```json
// Cursor Settings > MCP Servers
{
  "mcp.servers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "args": [],
      "env": {
        "PROJECT_PATH": "/path/to/project",
        "OPENROUTER_API_KEY": "your_key",
        "EXECUTION_MODE": "full"
      }
    }
  }
}
```

### Windsurf

```json
// Windsurf MCP Configuration
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "${workspaceRoot}",
        "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}",
        "EXECUTION_MODE": "full",
        "ENHANCED_MODE": "true"
      }
    }
  }
}
```

---

## 🌍 Environment Setup

### Required Environment Variables

```bash
# Core Configuration
export OPENROUTER_API_KEY="sk-or-v1-your-api-key-here"
export PROJECT_PATH="/path/to/your/project"
export EXECUTION_MODE="full"

# Optional Configuration
export ADR_DIRECTORY="docs/adrs"
export LOG_LEVEL="info"
export CACHE_ENABLED="true"
export ENHANCED_MODE="true"
export KNOWLEDGE_ENHANCEMENT="true"
```

### Environment File Setup

Create `.env` file in your project:

```bash
# .env file for MCP ADR Analysis Server
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
PROJECT_PATH=/absolute/path/to/your/project
EXECUTION_MODE=full
ADR_DIRECTORY=docs/adrs
LOG_LEVEL=info
CACHE_ENABLED=true
ENHANCED_MODE=true
KNOWLEDGE_ENHANCEMENT=true
MASKING_STRATEGY=partial
SECURITY_SCAN_ENABLED=true
```

### API Key Setup

#### Get OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai/keys)
2. Sign up or log in
3. Create a new API key
4. Copy the key (starts with `sk-or-v1-`)

#### Secure API Key Storage

```bash
# Method 1: Environment variable (recommended)
echo 'export OPENROUTER_API_KEY="sk-or-v1-your-key"' >> ~/.bashrc
source ~/.bashrc

# Method 2: .env file (project-specific)
echo 'OPENROUTER_API_KEY=sk-or-v1-your-key' >> .env

# Method 3: System keychain (macOS)
security add-generic-password -a $USER -s openrouter-api -w "sk-or-v1-your-key"
```

---

## ✅ Verification

### Basic Verification

```bash
# 1. Check installation
mcp-adr-analysis-server --version
# Expected: MCP ADR Analysis Server v2.1.0

# 2. Verify configuration
mcp-adr-analysis-server --config
# Expected: Configuration summary

# 3. Run health check
mcp-adr-analysis-server --test
# Expected: ✅ Health check passed - server can start successfully

# 4. Check available tools
mcp-adr-analysis-server --help
# Expected: Usage information and available commands
```

### Advanced Verification

```bash
# Test MCP protocol functionality
echo '{"method":"tools/list"}' | mcp-adr-analysis-server
# Expected: JSON response with available tools

# Test AI integration (requires API key)
mcp-adr-analysis-server --test-ai
# Expected: ✅ AI integration working

# Test project analysis
cd /path/to/test/project
mcp-adr-analysis-server analyze_project_ecosystem
# Expected: Project analysis results
```

### MCP Client Verification

#### Claude Desktop

1. Restart Claude Desktop after configuration
2. Look for "MCP" indicator in the interface
3. Try prompting: "What MCP tools are available?"
4. Expected: List including ADR analysis tools

#### VS Code/Cline

1. Reload VS Code window
2. Open Command Palette (Cmd/Ctrl+Shift+P)
3. Look for "Cline: MCP" commands
4. Test with: "Analyze this project's architecture"

---

## 🔧 Troubleshooting

### Common Installation Issues

#### 1. Permission Denied (EACCES)

```bash
# Fix npm permissions
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Or use npm's built-in fix
npm config set prefix ~/.npm-global
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

#### 2. Node.js Version Issues

```bash
# Check current version
node --version

# Install correct version via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

#### 3. Command Not Found

```bash
# Check if globally installed
npm list -g mcp-adr-analysis-server

# Check PATH
echo $PATH

# Reinstall if needed
npm uninstall -g mcp-adr-analysis-server
npm install -g mcp-adr-analysis-server@2.1.0
```

#### 4. API Key Issues

```bash
# Verify API key format
echo $OPENROUTER_API_KEY | grep "sk-or-v1-"

# Test API key
curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  https://openrouter.ai/api/v1/auth/key
```

#### 5. Tree-sitter Parser Issues

```bash
# Tree-sitter parsers may fail to load (non-critical)
# Server will fall back to regex analysis
# Check logs for warnings:
mcp-adr-analysis-server --test 2>&1 | grep -i "tree-sitter"
```

### Platform-Specific Issues

#### macOS

```bash
# Fix Xcode command line tools
xcode-select --install

# Fix Homebrew permissions
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

#### Linux

```bash
# Fix build tools
sudo apt-get install build-essential

# Fix node-gyp issues
npm config set python python3
```

#### Windows

```powershell
# Install Windows Build Tools
npm install -g windows-build-tools

# Fix path issues
refreshenv
```

### Getting Help

If you encounter issues:

1. **Check Logs**: Run with `DEBUG=* mcp-adr-analysis-server`
2. **GitHub Issues**: [Report bugs](https://github.com/tosin2013/mcp-adr-analysis-server/issues)
3. **Documentation**: [Troubleshooting Guide](./troubleshooting.md)
4. **Community**: [Discussions](https://github.com/tosin2013/mcp-adr-analysis-server/discussions)

---

## 🗑️ Uninstallation

### Remove Global Installation

```bash
# Uninstall globally
npm uninstall -g mcp-adr-analysis-server

# Verify removal
which mcp-adr-analysis-server
# Expected: command not found
```

### Remove Local Installation

```bash
# Remove from project
npm uninstall mcp-adr-analysis-server

# Remove from package.json
npm uninstall --save mcp-adr-analysis-server
```

### Clean Up Configuration

```bash
# Remove MCP client configurations
# Claude Desktop
rm ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Remove environment variables
# Edit ~/.bashrc, ~/.zshrc, etc. and remove OPENROUTER_API_KEY lines

# Clear npm cache
npm cache clean --force
```

### Remove Development Installation

```bash
# If installed from source
cd mcp-adr-analysis-server
npm unlink  # If linked globally
rm -rf node_modules
cd ..
rm -rf mcp-adr-analysis-server
```

---

## 🔄 Updates and Maintenance

### Updating to Latest Version

```bash
# Update global installation
npm update -g mcp-adr-analysis-server

# Or reinstall specific version
npm install -g mcp-adr-analysis-server@latest

# Verify update
mcp-adr-analysis-server --version
```

### Checking for Updates

```bash
# Check current version
npm list -g mcp-adr-analysis-server

# Check latest available version
npm view mcp-adr-analysis-server version

# Check outdated packages
npm outdated -g
```

---

## 📚 Next Steps

After successful installation:

1. **📖 Read the [Prompting Guide](./prompting-guide.md)** - Learn effective prompting techniques
2. **🔧 Configure Your Environment** - Set up project-specific settings
3. **🚀 Try the [Quick Start Tutorial](../tutorials/01-first-steps.md)** - Get hands-on experience
4. **📋 Review [API Reference](../reference/api-reference.md)** - Explore available tools
5. **🤝 Join the Community** - Contribute and get support

---

**🎉 Congratulations! Your MCP ADR Analysis Server is ready to use.**

_This installation guide follows methodological pragmatism with systematic verification steps and explicit acknowledgment of platform-specific requirements and limitations._
