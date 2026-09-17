# 🔌 How-To: MCP Client Compatibility

**Goal**: Configure the MCP ADR Analysis Server to work seamlessly with any MCP-compatible AI assistant or IDE.

**When to use this guide**: When you want to set up the MCP ADR Analysis Server with your preferred AI assistant (Claude Desktop, Cline, Cursor, Gemini, etc.) or IDE.

> **No API key required.** CE-MCP mode (the default) uses your host LLM for all analysis — just set `PROJECT_PATH` and you're done.

---

## 🎯 Quick Compatibility Matrix

| AI Assistant/IDE   | MCP Support       | Config File                  | Command                           | Status           |
| ------------------ | ----------------- | ---------------------------- | --------------------------------- | ---------------- |
| **Claude Desktop** | ✅ Native         | `claude_desktop_config.json` | `npx -y mcp-adr-analysis-server` | **Recommended**  |
| **Cline**          | ✅ Extension      | `cline_mcp_settings.json`    | `npx -y mcp-adr-analysis-server` | **Full Support** |
| **Cursor**         | ✅ Native         | `.cursor/mcp.json`           | `npx -y mcp-adr-analysis-server` | **Full Support** |
| **Gemini**         | ✅ Native         | `gemini_mcp_config.json`     | `npx -y mcp-adr-analysis-server` | **Full Support** |
| **Continue.dev**   | ✅ Extension      | `.continue/config.json`      | `npx -y mcp-adr-analysis-server` | **Full Support** |
| **Aider**          | ✅ Native         | `.aider_config.yaml`         | `mcp-adr-analysis-server`        | **Full Support** |
| **Windsurf**       | ✅ Native         | `mcp_config.json`            | `npx -y mcp-adr-analysis-server` | **Full Support** |
| **VS Code**        | ✅ Via Extensions | Various                      | `npx -y mcp-adr-analysis-server` | **Full Support** |

---

## 🚀 Universal Setup Steps

### **Step 1: Install (or use npx)**

```bash
# Option 1: Zero-install via npx (recommended)
npx -y mcp-adr-analysis-server --version

# Option 2: Global installation
npm install -g mcp-adr-analysis-server
```

### **Step 2: Choose Your Client Configuration**

Select the configuration that matches your preferred AI assistant or IDE below. All configurations use **CE-MCP mode** (the default) — no API key or `EXECUTION_MODE` setting needed.

---

## 🖥️ Claude Desktop (Recommended)

**Best for**: General use, best AI integration, most stable

### Configuration Location

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Configuration

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "npx",
      "args": ["-y", "mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": "/absolute/path/to/your/project"
      }
    }
  }
}
```

---

## 🔧 Cline (VS Code Extension)

**Best for**: VS Code development, team collaboration

### Configuration Location

**File**: `cline_mcp_settings.json` (in workspace or global settings)

### Configuration

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "npx",
      "args": ["-y", "mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": "${workspaceFolder}"
      }
    }
  }
}
```

---

## 🎯 Cursor

**Best for**: AI-powered coding, modern development workflow

### Configuration Location

**File**: `.cursor/mcp.json` (in project root)

### Configuration

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "npx",
      "args": ["-y", "mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": "."
      }
    }
  }
}
```

---

## 🤖 Gemini (Google AI)

**Best for**: Google AI ecosystem, multimodal capabilities

### Configuration Location

**File**: `gemini_mcp_config.json` (in project root or user config directory)

### Configuration

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "npx",
      "args": ["-y", "mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": "/absolute/path/to/project"
      }
    }
  }
}
```

---

## 🔄 Continue.dev (VS Code Extension)

**Best for**: VS Code users, open-source alternative

### Configuration Location

**File**: `config.json` (in `.continue` directory)

### Configuration

```json
{
  "mcpServers": [
    {
      "name": "adr-analysis",
      "command": "npx",
      "args": ["-y", "mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": "${workspaceFolder}"
      }
    }
  ]
}
```

---

## 🛠️ Aider (Command Line)

**Best for**: Command-line users, automation, CI/CD

### Configuration Location

**File**: `.aider_config.yaml` (in project root or home directory)

### Configuration

```yaml
mcp_servers:
  - name: adr-analysis
    command: mcp-adr-analysis-server
    env:
      PROJECT_PATH: '/absolute/path/to/project'
```

---

## 🌊 Windsurf

**Best for**: Professional development, enterprise features

### Configuration Location

**File**: `~/.codeium/windsurf/mcp_config.json`

### Configuration

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "npx",
      "args": ["-y", "mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": "/absolute/path/to/project"
      }
    }
  }
}
```

---

## 🧪 Testing Your Configuration

### **Step 1: Test Server Installation**

```bash
npx -y mcp-adr-analysis-server --version
```

### **Step 2: Restart Your Client**

After saving config:
- **Claude Desktop**: Restart the app
- **VS Code** (Cline/Continue): Reload window (`Ctrl+Shift+P` → "Reload Window")
- **Cursor**: Restart Cursor

### **Step 3: Verify Tools Availability**

In your AI assistant, ask:

```
List the available MCP tools for ADR analysis
```

You should see 63 tools including `analyze_project_ecosystem`, `suggest_adrs`, `analyze_content_security`, and more.

---

## 🚨 Common Issues & Solutions

### **"Server not found" or "Unknown tool"**

```bash
# Verify Node.js is installed (≥20.0.0)
node --version
npx --version
```

### **"Permission denied" errors**

Use an absolute path for `PROJECT_PATH`:
```json
{
  "env": {
    "PROJECT_PATH": "/absolute/path/not/relative"
  }
}
```

### **"Command not found: npx"**

Install Node.js ≥20.0.0, which includes npx.

---

## 🔧 Advanced Configuration

### **Multi-Project Setup**

```json
{
  "mcpServers": {
    "adr-frontend": {
      "command": "npx",
      "args": ["-y", "mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": "/Users/username/frontend-project",
        "ADR_DIRECTORY": "./adrs"
      }
    },
    "adr-backend": {
      "command": "npx",
      "args": ["-y", "mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": "/Users/username/backend-project",
        "ADR_DIRECTORY": "architecture/decisions"
      }
    }
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

### **Legacy Full Mode (Server-Side AI)**

If you need server-side AI execution instead of CE-MCP:

```json
{
  "env": {
    "PROJECT_PATH": "/path/to/project",
    "EXECUTION_MODE": "full",
    "OPENROUTER_API_KEY": "your_key_here"
  }
}
```

> CE-MCP mode (the default) is recommended — it produces better results because your host LLM already has your conversation context.

---

## 📚 Further Reading

- **[Complete MCP Client Configuration](../reference/mcp-client-config.md)** - Detailed configuration reference
- **[Environment Configuration](../reference/environment-config.md)** - Environment variables guide
- **[Installation Guide](./installation-guide.md)** - Complete installation instructions
- **[Troubleshooting Guide](./troubleshooting.md)** - Common issues and solutions

---

**Need help with a specific client?** → **[Join the Discussion](https://github.com/tosin2013/mcp-adr-analysis-server/issues)**

**Having compatibility issues?** → **[Check Troubleshooting](./troubleshooting.md#mcp-client-compatibility)**
