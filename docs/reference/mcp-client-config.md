# 🔌 MCP Client Configuration Reference

**Complete guide to configuring MCP ADR Analysis Server with different MCP clients.**

> **CE-MCP mode** (the default) requires **no API key**. Your host LLM executes analysis via orchestration directives returned by the 63 tools. All configurations below use CE-MCP mode unless noted otherwise.

---

## 📋 Quick Setup Matrix

| Client             | Config File                  | Command                       | Best For                         |
| ------------------ | ---------------------------- | ----------------------------- | -------------------------------- |
| **Claude Desktop** | `claude_desktop_config.json` | `npx -y mcp-adr-analysis-server` | General use, best AI integration |
| **Cline**          | `cline_mcp_settings.json`    | `npx -y mcp-adr-analysis-server` | VS Code development              |
| **Cursor**         | `.cursor/mcp.json`           | `npx -y mcp-adr-analysis-server` | AI-powered coding                |
| **Gemini**         | `gemini_mcp_config.json`     | `npx -y mcp-adr-analysis-server` | Google AI integration            |
| **Windsurf**       | `mcp_config.json`            | `npx -y mcp-adr-analysis-server` | Professional development         |
| **Continue.dev**   | `config.json`                | `npx -y mcp-adr-analysis-server` | VS Code AI extension             |
| **Aider**          | `.aider_config.yaml`         | `mcp-adr-analysis-server`     | Command-line AI coding           |

---

## 🖥️ Claude Desktop (Recommended)

### Configuration Location

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

### Basic Configuration

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

That's it — CE-MCP mode is the default, so no API key or execution mode setting is needed.

### Multi-Project Setup

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

### Troubleshooting Claude Desktop

**Common Issues**:

1. **"Server not found"**

   ```bash
   # Verify Node.js is installed
   node --version
   npx --version
   ```

2. **"Permission denied"**

   ```json
   {
     "env": {
       "PROJECT_PATH": "/absolute/path/not/relative"
     }
   }
   ```

---

## 🔧 Cline (VS Code Extension)

### Configuration Location

**File**: `cline_mcp_settings.json` (in workspace or global settings)

### Basic Configuration

```json
{
  "mcpServers": {
    "mcp-adr-analysis-server": {
      "command": "npx",
      "args": ["-y", "mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": "${workspaceFolder}"
      }
    }
  }
}
```

### Workspace-Specific Configuration

Create `.vscode/cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "project-adr-analysis": {
      "command": "npx",
      "args": ["-y", "mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": "${workspaceFolder}",
        "ADR_DIRECTORY": "architecture/adrs",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

### Cline Best Practices

1. **Use workspace variables**: `${workspaceFolder}` for PROJECT_PATH
2. **npx command**: Ensures latest version without global install
3. **DEBUG logging**: Helpful during development

---

## 🎯 Cursor

### Configuration Location

**File**: `.cursor/mcp.json` (in project root)

### Basic Configuration

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

### Team Configuration

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "npx",
      "args": ["-y", "mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": ".",
        "ADR_DIRECTORY": "./architecture/decisions",
        "LOG_LEVEL": "WARN",
        "ENABLE_CONTENT_MASKING": "true",
        "MASKING_LEVEL": "strict"
      }
    }
  }
}
```

### Cursor Tips

1. **Relative paths**: Use `"."` for PROJECT_PATH in Cursor
2. **Version in .gitignore**: Add `.cursor/` to `.gitignore` if it contains secrets
3. **Team sharing**: Commit `.cursor/mcp.json` for team-wide configuration

---

## 🤖 Gemini (Google AI)

### Configuration Location

**File**: `gemini_mcp_config.json` (in project root or user config directory)

### Basic Configuration

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

### Configuration Location

**File**: `config.json` (in `.continue` directory)

### Basic Configuration

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

### Continue.dev Best Practices

1. **Workspace Integration**: Use `${workspaceFolder}` for seamless VS Code integration
2. **Environment Variables**: Leverage VS Code's environment variable support

---

## 🛠️ Aider (Command Line)

### Configuration Location

**File**: `.aider_config.yaml` (in project root or home directory)

### Basic Configuration

```yaml
mcp_servers:
  - name: adr-analysis
    command: mcp-adr-analysis-server
    env:
      PROJECT_PATH: '/absolute/path/to/project'
```

### Advanced Aider Configuration

```yaml
mcp_servers:
  - name: adr-analysis
    command: mcp-adr-analysis-server
    env:
      PROJECT_PATH: '/Users/username/project'
      ADR_DIRECTORY: './architecture/decisions'
      LOG_LEVEL: 'DEBUG'
      ENABLE_CONTENT_MASKING: 'true'
      MASKING_LEVEL: 'strict'
```

### Aider Best Practices

1. **YAML Format**: Use proper YAML indentation and syntax
2. **Absolute Paths**: Always use absolute paths for PROJECT_PATH
3. **Security**: Enable content masking for sensitive projects

---

## 🌊 Windsurf

### Configuration Location

**File**: `~/.codeium/windsurf/mcp_config.json`

### Basic Configuration

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

### Enterprise Configuration

```json
{
  "mcpServers": {
    "enterprise-adr": {
      "command": "npx",
      "args": ["-y", "mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": "/enterprise/project/path",
        "ADR_DIRECTORY": "architecture/decisions",
        "LOG_LEVEL": "WARN",
        "ENABLE_CONTENT_MASKING": "true",
        "MASKING_LEVEL": "strict"
      }
    }
  }
}
```

---

## 🔧 Custom MCP Client

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const client = new Client({
  name: 'adr-analysis-client',
  version: '1.0.0'
});

await client.connect({
  command: 'npx',
  args: ['-y', 'mcp-adr-analysis-server'],
  env: {
    PROJECT_PATH: '/path/to/project'
  }
});
```

---

## 🔒 Legacy Full Mode Configuration

If you need server-side AI execution instead of CE-MCP, add `EXECUTION_MODE` and `OPENROUTER_API_KEY`:

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "npx",
      "args": ["-y", "mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": "/path/to/project",
        "EXECUTION_MODE": "full",
        "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}"
      }
    }
  }
}
```

> **Note**: CE-MCP mode (the default) is recommended for most users. It produces better results because your host LLM already has your conversation context and requires no additional API key.

---

## 🚨 General Troubleshooting

### Test Server Installation

```bash
# Test with npx (no install needed)
npx -y mcp-adr-analysis-server --version

# Test global installation
mcp-adr-analysis-server --version
```

### Common Issues

| Issue                | Symptom                  | Solution                                                          |
| -------------------- | ------------------------ | ----------------------------------------------------------------- |
| Server not found     | "Unknown tool" errors    | Ensure Node.js ≥20.0.0 is installed: `node --version`            |
| Permission denied    | File access errors       | Use absolute paths, check permissions                             |
| Slow performance     | Long response times      | Enable caching: `AI_CACHE_ENABLED=true`                           |

### Debug Configuration

Add these env vars temporarily to diagnose issues:

```json
{
  "env": {
    "LOG_LEVEL": "DEBUG"
  }
}
```

---

## 🔒 Security Best Practices

### File Permissions

```bash
# Secure config file permissions
chmod 600 ~/.config/Claude/claude_desktop_config.json
chmod 600 .cursor/mcp.json
```

### Content Masking

For sensitive projects, enable content masking:

```json
{
  "env": {
    "ENABLE_CONTENT_MASKING": "true",
    "MASKING_LEVEL": "strict"
  }
}
```

---

## 📚 Related Documentation

- **[Environment Configuration](environment-config.md)** - Complete environment variable reference
- **[Troubleshooting](../how-to-guides/troubleshooting.md)** - Common issues and solutions
- **[API Reference](api-reference.md)** - Complete tool documentation
- **[Security Guide](../how-to-guides/security-analysis.md)** - Security configuration

---

**Configuration not working?** → **[Troubleshooting Guide](../how-to-guides/troubleshooting.md)** or **[File an Issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues)**
