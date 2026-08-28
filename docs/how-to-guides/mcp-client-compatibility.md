# 🔌 How-To: MCP Client Compatibility

**Goal**: Configure the MCP ADR Analysis Server to work seamlessly with any MCP-compatible AI assistant or IDE.

**When to use this guide**: When you want to set up the MCP ADR Analysis Server with your preferred AI assistant (Claude Desktop, Cline, Cursor, Gemini, etc.) or IDE.

---

## 🎯 Quick Compatibility Matrix

| AI Assistant/IDE   | MCP Support       | Config File                  | Command                       | Status           |
| ------------------ | ----------------- | ---------------------------- | ----------------------------- | ---------------- |
| **Claude Desktop** | ✅ Native         | `claude_desktop_config.json` | `mcp-adr-analysis-server`     | **Recommended**  |
| **Cline**          | ✅ Extension      | `cline_mcp_settings.json`    | `npx mcp-adr-analysis-server` | **Full Support** |
| **Cursor**         | ✅ Native         | `.cursor/mcp.json`           | `npx mcp-adr-analysis-server` | **Full Support** |
| **Gemini**         | ✅ Native         | `gemini_mcp_config.json`     | `mcp-adr-analysis-server`     | **Full Support** |
| **Continue.dev**   | ✅ Extension      | `.continue/config.json`      | `npx mcp-adr-analysis-server` | **Full Support** |
| **Aider**          | ✅ Native         | `.aider_config.yaml`         | `mcp-adr-analysis-server`     | **Full Support** |
| **Windsurf**       | ✅ Native         | `mcp_config.json`            | `mcp-adr-analysis-server`     | **Full Support** |
| **VS Code**        | ✅ Via Extensions | Various                      | `npx mcp-adr-analysis-server` | **Full Support** |

---

## 🚀 Universal Setup Steps

### **Step 1: Install the Server**

```bash
# Option 1: Global installation (recommended)
npm install -g mcp-adr-analysis-server

# Option 2: Local installation (for development)
npm install mcp-adr-analysis-server
```

### **Step 2: Verify Installation**

```bash
# Test global installation
mcp-adr-analysis-server --version

# Test with npx
npx mcp-adr-analysis-server --version

# Test server functionality
mcp-adr-analysis-server --test
```

### **Step 3: Configure Environment Variables**

```bash
# Set required environment variables
export PROJECT_PATH="/absolute/path/to/your/project"
export OPENROUTER_API_KEY="your_openrouter_api_key_here"
export EXECUTION_MODE="full"

```

### **Step 4: Choose Your Client Configuration**

Select the configuration that matches your preferred AI assistant or IDE:

---

## 🖥️ Claude Desktop (Recommended)

**Best for**: General use, best AI integration, most stable

### Configuration Location

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Basic Configuration

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/absolute/path/to/your/project",
        "OPENROUTER_API_KEY": "your_openrouter_api_key_here",
        "EXECUTION_MODE": "full"
      }
    }
  }
}
```

### Advantages

- ✅ Native MCP support
- ✅ Best AI integration
- ✅ Stable and reliable
- ✅ Easy configuration

---

## 🔧 Cline (VS Code Extension)

**Best for**: VS Code development, team collaboration

### Configuration Location

**File**: `cline_mcp_settings.json` (in workspace or global settings)

### Basic Configuration

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "npx",
      "args": ["mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": "${workspaceFolder}",
        "OPENROUTER_API_KEY": "${env:OPENROUTER_API_KEY}",
        "EXECUTION_MODE": "full"
      }
    }
  }
}
```

### Advantages

- ✅ VS Code integration
- ✅ Workspace-aware
- ✅ Team-friendly
- ✅ Environment variable support

---

## 🎯 Cursor

**Best for**: AI-powered coding, modern development workflow

### Configuration Location

**File**: `.cursor/mcp.json` (in project root)

### Basic Configuration

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "npx",
      "args": ["mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": ".",
        "OPENROUTER_API_KEY": "your_openrouter_api_key_here",
        "EXECUTION_MODE": "full"
      }
    }
  }
}
```

### Advantages

- ✅ AI-native IDE
- ✅ Built-in MCP support
- ✅ Modern interface
- ✅ Fast performance

---

## 🤖 Gemini (Google AI)

**Best for**: Google AI ecosystem, multimodal capabilities

### Configuration Location

**File**: `gemini_mcp_config.json` (in project root or user config directory)

### Basic Configuration

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/absolute/path/to/project",
        "OPENROUTER_API_KEY": "your_openrouter_api_key_here",
        "EXECUTION_MODE": "full",
        "AI_MODEL": "google/gemini-pro-1.5"
      }
    }
  }
}
```

### Advantages

- ✅ Google AI integration
- ✅ Multimodal capabilities
- ✅ Large context windows
- ✅ Advanced reasoning

---

## 🔄 Continue.dev (VS Code Extension)

**Best for**: VS Code users, open-source alternative

### Configuration Location

**File**: `config.json` (in `.continue` directory)

### Basic Configuration

```json
{
  "mcpServers": [
    {
      "name": "adr-analysis",
      "command": "npx",
      "args": ["mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": "${workspaceFolder}",
        "OPENROUTER_API_KEY": "${env:OPENROUTER_API_KEY}",
        "EXECUTION_MODE": "full"
      }
    }
  ]
}
```

### Advantages

- ✅ Open-source
- ✅ VS Code integration
- ✅ Extensible
- ✅ Community-driven

---

## 🛠️ Aider (Command Line)

**Best for**: Command-line users, automation, CI/CD

### Configuration Location

**File**: `.aider_config.yaml` (in project root or home directory)

### Basic Configuration

```yaml
mcp_servers:
  - name: adr-analysis
    command: mcp-adr-analysis-server
    env:
      PROJECT_PATH: '/absolute/path/to/project'
      OPENROUTER_API_KEY: 'your_openrouter_api_key_here'
      EXECUTION_MODE: 'full'
```

### Advantages

- ✅ Command-line interface
- ✅ Automation-friendly
- ✅ CI/CD integration
- ✅ Lightweight

---

## 🌊 Windsurf

**Best for**: Professional development, enterprise features

### Configuration Location

**File**: `~/.codeium/windsurf/mcp_config.json`

### Basic Configuration

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/absolute/path/to/project",
        "OPENROUTER_API_KEY": "your_openrouter_api_key_here",
        "EXECUTION_MODE": "full"
      }
    }
  }
}
```

### Advantages

- ✅ Professional features
- ✅ Enterprise support
- ✅ Advanced AI capabilities
- ✅ Performance optimized

---

## 🧪 Testing Your Configuration

### **Step 1: Test Server Installation**

```bash
# Verify the server is installed and working
mcp-adr-analysis-server --version
mcp-adr-analysis-server --test
```

### **Step 2: Test Client Connection**

```bash
# Test with your specific client
# For Claude Desktop: Restart Claude Desktop
# For VS Code: Reload window
# For Cursor: Restart Cursor
```

### **Step 3: Verify Tools Availability**

In your AI assistant, try:

```
"List the available MCP tools for ADR analysis"
```

Expected response should include tools like:

- `analyze_project_ecosystem`
- `generate_adrs_from_prd`
- `analyze_content_security`
- And 34+ other tools

---

## 🚨 Common Issues & Solutions

### **"Server not found" or "Unknown tool"**

```bash
# Solution 1: Verify installation
which mcp-adr-analysis-server
npm list -g mcp-adr-analysis-server

# Solution 2: Check PATH
echo $PATH | grep -E "(node|npm)"

# Solution 3: Restart your AI client
```

### **"Permission denied" errors**

```json
{
  "env": {
    "PROJECT_PATH": "/absolute/path/not/relative"
  }
}
```

### **"Tools return prompts instead of results"**

```json
{
  "env": {
    "EXECUTION_MODE": "full",
    "OPENROUTER_API_KEY": "required_for_ai_features"
  }
}
```

### **"Command not found: npx"**

```bash
# Install Node.js and npm
# Then verify installation
node --version
npm --version
```

### **Environment variables not working**

```bash
# Check if variables are set
echo $PROJECT_PATH
echo $OPENROUTER_API_KEY

# Set them in your shell profile
export PROJECT_PATH="/absolute/path/to/project"
export OPENROUTER_API_KEY="your_key_here"
```

---

## 🔧 Advanced Configuration

### **Multi-Project Setup**

```json
{
  "mcpServers": {
    "adr-frontend": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/Users/username/frontend-project",
        "OPENROUTER_API_KEY": "your_key_here",
        "EXECUTION_MODE": "full",
        "ADR_DIRECTORY": "./adrs"
      }
    },
    "adr-backend": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/Users/username/backend-project",
        "OPENROUTER_API_KEY": "your_key_here",
        "EXECUTION_MODE": "full",
        "ADR_DIRECTORY": "architecture/decisions"
      }
    }
  }
}
```

### **Performance Optimization**

```json
{
  "env": {
    "AI_CACHE_ENABLED": "true",
    "AI_CACHE_TTL": "3600",
    "MAX_FILES_PER_ANALYSIS": "500",
    "LOG_LEVEL": "WARN"
  }
}
```

### **Security Configuration**

```json
{
  "env": {
    "ENABLE_CONTENT_MASKING": "true",
    "MASKING_LEVEL": "strict"
  }
}
```

---

## 📚 Further Reading

- **[Complete MCP Client Configuration](../reference/mcp-client-config.md)** - Detailed configuration reference
- **[Environment Configuration](../reference/environment-config.md)** - Environment variables guide
- **[Installation Guide](./installation-guide.md)** - Complete installation instructions
- **[Troubleshooting Guide](./troubleshooting.md)** - Common issues and solutions

---

**Need help with a specific client?** → **[Join the Discussion](https://github.com/tosin2013/mcp-adr-analysis-server/issues)**

**Having compatibility issues?** → **[Check Troubleshooting](./troubleshooting.md#mcp-client-compatibility)**
