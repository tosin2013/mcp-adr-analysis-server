# 🔌 MCP Client Configuration Reference

**Complete guide to configuring MCP ADR Analysis Server with different MCP clients.**

---

## 📋 Quick Setup Matrix

| Client             | Config File                  | Command                       | Best For                         |
| ------------------ | ---------------------------- | ----------------------------- | -------------------------------- |
| **Claude Desktop** | `claude_desktop_config.json` | `mcp-adr-analysis-server`     | General use, best AI integration |
| **Cline**          | `cline_mcp_settings.json`    | `npx mcp-adr-analysis-server` | VS Code development              |
| **Cursor**         | `.cursor/mcp.json`           | `npx mcp-adr-analysis-server` | AI-powered coding                |
| **Gemini**         | `gemini_mcp_config.json`     | `mcp-adr-analysis-server`     | Google AI integration            |
| **Windsurf**       | `mcp_config.json`            | `mcp-adr-analysis-server`     | Professional development         |
| **Continue.dev**   | `config.json`                | `npx mcp-adr-analysis-server` | VS Code AI extension             |
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
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/absolute/path/to/your/project",
        "OPENROUTER_API_KEY": "your_openrouter_api_key_here",
        "EXECUTION_MODE": "full",
        "FIRECRAWL_ENABLED": "true",
        "FIRECRAWL_API_KEY": "your_firecrawl_api_key_here"
      }
    }
  }
}
```

### Advanced Configuration

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/Users/username/my-project",
        "OPENROUTER_API_KEY": "sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxx",
        "EXECUTION_MODE": "full",
        "AI_MODEL": "anthropic/claude-3-sonnet",
        "ADR_DIRECTORY": "./adrs",
        "LOG_LEVEL": "ERROR",
        "AI_TEMPERATURE": "0.1",
        "AI_MAX_TOKENS": "4000",
        "AI_CACHE_ENABLED": "true",
        "ENABLE_CONTENT_MASKING": "true",
        "MASKING_LEVEL": "moderate"
      }
    }
  }
}
```

### Multi-Project Setup

```json
{
  "mcpServers": {
    "adr-frontend": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/Users/username/frontend-project",
        "OPENROUTER_API_KEY": "your_key_here",
        "EXECUTION_MODE": "full",
        "ADR_DIRECTORY": "./adrs",
        "LOG_LEVEL": "ERROR"
      }
    },
    "adr-backend": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/Users/username/backend-project",
        "OPENROUTER_API_KEY": "your_key_here",
        "EXECUTION_MODE": "full",
        "ADR_DIRECTORY": "architecture/decisions",
        "LOG_LEVEL": "ERROR"
      }
    }
  }
}
```

### Troubleshooting Claude Desktop

**Common Issues**:

1. **"Server not found"**

   ```bash
   # Verify installation
   which mcp-adr-analysis-server
   mcp-adr-analysis-server --version
   ```

2. **"Permission denied"**

   ```json
   {
     "env": {
       "PROJECT_PATH": "/absolute/path/not/relative"
     }
   }
   ```

3. **"Tools return prompts"**
   ```json
   {
     "env": {
       "EXECUTION_MODE": "full",
       "OPENROUTER_API_KEY": "required_for_ai"
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
      "args": ["mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": "${workspaceFolder}",
        "OPENROUTER_API_KEY": "your_openrouter_api_key_here",
        "EXECUTION_MODE": "full",
        "ADR_DIRECTORY": "./adrs",
        "LOG_LEVEL": "ERROR",
        "FIRECRAWL_ENABLED": "true",
        "FIRECRAWL_API_KEY": "your_firecrawl_api_key"
      }
    }
  }
}
```

### Development Configuration

```json
{
  "mcpServers": {
    "mcp-adr-analysis-server": {
      "command": "npx",
      "args": ["mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": "${workspaceFolder}",
        "OPENROUTER_API_KEY": "your_key_here",
        "EXECUTION_MODE": "full",
        "AI_MODEL": "anthropic/claude-3-haiku",
        "ADR_DIRECTORY": "./adrs",
        "LOG_LEVEL": "DEBUG",
        "AI_CACHE_ENABLED": "true",
        "TIMING_ENABLED": "true",
        "FIRECRAWL_ENABLED": "true",
        "FIRECRAWL_API_KEY": "your_firecrawl_key"
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
      "args": ["mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": "${workspaceFolder}",
        "OPENROUTER_API_KEY": "${env:OPENROUTER_API_KEY}",
        "EXECUTION_MODE": "full",
        "ADR_DIRECTORY": "architecture/adrs",
        "LOG_LEVEL": "INFO",
        "FIRECRAWL_ENABLED": "true",
        "FIRECRAWL_API_KEY": "${env:FIRECRAWL_API_KEY}"
      }
    }
  }
}
```

### Cline Best Practices

1. **Use workspace variables**: `${workspaceFolder}` for PROJECT_PATH
2. **Environment variables**: `${env:VAR_NAME}` for secrets
3. **npx command**: Ensures latest version without global install
4. **DEBUG logging**: Helpful during development

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
      "args": ["mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": ".",
        "OPENROUTER_API_KEY": "your_openrouter_api_key_here",
        "EXECUTION_MODE": "full",
        "ADR_DIRECTORY": "./adrs",
        "LOG_LEVEL": "ERROR",
        "FIRECRAWL_ENABLED": "true",
        "FIRECRAWL_API_KEY": "your_firecrawl_api_key_here"
      }
    }
  }
}
```

### AI-Optimized Configuration

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "npx",
      "args": ["mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": ".",
        "OPENROUTER_API_KEY": "your_key_here",
        "EXECUTION_MODE": "full",
        "AI_MODEL": "anthropic/claude-3-sonnet",
        "ADR_DIRECTORY": "./adrs",
        "LOG_LEVEL": "ERROR",
        "AI_TEMPERATURE": "0.05",
        "AI_MAX_TOKENS": "3000",
        "ENABLE_CONTENT_MASKING": "true"
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
      "args": ["mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": ".",
        "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}",
        "EXECUTION_MODE": "full",
        "AI_MODEL": "anthropic/claude-3-sonnet",
        "ADR_DIRECTORY": "./architecture/decisions",
        "LOG_LEVEL": "WARN",
        "AI_CACHE_ENABLED": "true",
        "MASKING_LEVEL": "strict"
      }
    }
  }
}
```

### Cursor Tips

1. **Relative paths**: Use `"."` for PROJECT_PATH in Cursor
2. **Environment variables**: Reference with `${VAR_NAME}`
3. **Version in .gitignore**: Add `.cursor/` to `.gitignore` if it contains secrets
4. **Team sharing**: Use environment variables for API keys

---

## 🤖 Gemini (Google AI)

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
        "AI_MODEL": "google/gemini-pro",
        "ADR_DIRECTORY": "./adrs",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

### Google AI Optimized Configuration

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/Users/username/project",
        "OPENROUTER_API_KEY": "your_key_here",
        "EXECUTION_MODE": "full",
        "AI_MODEL": "google/gemini-pro-1.5",
        "ADR_DIRECTORY": "./architecture/decisions",
        "LOG_LEVEL": "INFO",
        "AI_TEMPERATURE": "0.2",
        "AI_MAX_TOKENS": "8192",
        "FIRECRAWL_ENABLED": "true",
        "FIRECRAWL_API_KEY": "your_firecrawl_key"
      }
    }
  }
}
```

### Gemini Best Practices

1. **Model Selection**: Use `google/gemini-pro-1.5` for best performance
2. **Temperature**: Lower values (0.1-0.3) for consistent architectural analysis
3. **Token Limits**: Gemini supports larger contexts, use higher limits
4. **Multimodal**: Gemini can process images and documents in ADRs

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
      "args": ["mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": "${workspaceFolder}",
        "OPENROUTER_API_KEY": "${env:OPENROUTER_API_KEY}",
        "EXECUTION_MODE": "full",
        "ADR_DIRECTORY": "./adrs",
        "LOG_LEVEL": "INFO"
      }
    }
  ]
}
```

### VS Code Integration Configuration

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
        "EXECUTION_MODE": "full",
        "AI_MODEL": "anthropic/claude-3-sonnet",
        "ADR_DIRECTORY": "./docs/adrs",
        "LOG_LEVEL": "DEBUG",
        "FIRECRAWL_ENABLED": "true",
        "FIRECRAWL_API_KEY": "${env:FIRECRAWL_API_KEY}"
      }
    }
  ]
}
```

### Continue.dev Best Practices

1. **Workspace Integration**: Use `${workspaceFolder}` for seamless VS Code integration
2. **Environment Variables**: Leverage VS Code's environment variable support
3. **Debug Mode**: Enable DEBUG logging for development troubleshooting
4. **Multi-Project**: Configure different servers for different workspace folders

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
      OPENROUTER_API_KEY: 'your_openrouter_api_key_here'
      EXECUTION_MODE: 'full'
      ADR_DIRECTORY: './adrs'
      LOG_LEVEL: 'INFO'
```

### Advanced Aider Configuration

```yaml
mcp_servers:
  - name: adr-analysis
    command: mcp-adr-analysis-server
    env:
      PROJECT_PATH: '/Users/username/project'
      OPENROUTER_API_KEY: 'your_key_here'
      EXECUTION_MODE: 'full'
      AI_MODEL: 'anthropic/claude-3-sonnet'
      ADR_DIRECTORY: './architecture/decisions'
      LOG_LEVEL: 'DEBUG'
      AI_TEMPERATURE: '0.1'
      AI_MAX_TOKENS: '4000'
      FIRECRAWL_ENABLED: 'true'
      FIRECRAWL_API_KEY: 'your_firecrawl_key'
      ENABLE_CONTENT_MASKING: 'true'
      MASKING_LEVEL: 'strict'
```

### Aider Best Practices

1. **YAML Format**: Use proper YAML indentation and syntax
2. **Absolute Paths**: Always use absolute paths for PROJECT_PATH
3. **Security**: Enable content masking for sensitive projects
4. **Performance**: Use DEBUG logging only when needed

---

## 🌊 Windsurf

### Configuration Location

**File**: `~/.codeium/windsurf/mcp_config.json`

### Basic Configuration

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "args": [],
      "env": {
        "PROJECT_PATH": "/absolute/path/to/your/project",
        "OPENROUTER_API_KEY": "your_openrouter_api_key_here",
        "EXECUTION_MODE": "full",
        "ADR_DIRECTORY": "./adrs",
        "LOG_LEVEL": "ERROR",
        "FIRECRAWL_ENABLED": "true",
        "FIRECRAWL_API_KEY": "your_firecrawl_api_key_here"
      }
    }
  }
}
```

### Professional Configuration

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "args": [],
      "env": {
        "PROJECT_PATH": "/Users/developer/current-project",
        "OPENROUTER_API_KEY": "your_key_here",
        "EXECUTION_MODE": "full",
        "AI_MODEL": "anthropic/claude-3-sonnet",
        "ADR_DIRECTORY": "./adrs",
        "LOG_LEVEL": "ERROR",
        "AI_CACHE_ENABLED": "true",
        "AI_CACHE_TTL": "3600",
        "ENABLE_CONTENT_MASKING": "true",
        "MASKING_LEVEL": "strict"
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
      "command": "mcp-adr-analysis-server",
      "args": [],
      "env": {
        "PROJECT_PATH": "/enterprise/project/path",
        "OPENROUTER_API_KEY": "enterprise_key_here",
        "EXECUTION_MODE": "full",
        "AI_MODEL": "anthropic/claude-3-sonnet",
        "ADR_DIRECTORY": "architecture/decisions",
        "LOG_LEVEL": "WARN",
        "AI_TEMPERATURE": "0.1",
        "AI_MAX_TOKENS": "4000",
        "ENABLE_CONTENT_MASKING": "true",
        "MASKING_LEVEL": "strict",
        "CUSTOM_SECRET_PATTERNS": "ENTERPRISE_.*,INTERNAL_.*"
      }
    }
  }
}
```

---

## 🔧 Alternative Clients

### Continue (VS Code Extension)

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "${workspaceFolder}",
        "OPENROUTER_API_KEY": "your_key_here",
        "EXECUTION_MODE": "full"
      }
    }
  }
}
```

### Custom MCP Client

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const client = new Client({
  name: 'adr-analysis-client',
  version: '1.0.0',
});

await client.connect({
  command: 'mcp-adr-analysis-server',
  env: {
    PROJECT_PATH: '/path/to/project',
    OPENROUTER_API_KEY: 'your_key_here',
    EXECUTION_MODE: 'full',
  },
});
```

---

## 🚀 Performance Optimization

### Fast Configuration (Development)

```json
{
  "env": {
    "AI_MODEL": "anthropic/claude-3-haiku",
    "AI_MAX_TOKENS": "2000",
    "AI_TEMPERATURE": "0.05",
    "AI_CACHE_ENABLED": "true",
    "LOG_LEVEL": "ERROR"
  }
}
```

### Quality Configuration (Production)

```json
{
  "env": {
    "AI_MODEL": "anthropic/claude-3-sonnet",
    "AI_MAX_TOKENS": "4000",
    "AI_TEMPERATURE": "0.1",
    "AI_CACHE_ENABLED": "true",
    "AI_CACHE_TTL": "86400",
    "LOG_LEVEL": "WARN"
  }
}
```

### Large Project Configuration

```json
{
  "env": {
    "MAX_FILES_PER_ANALYSIS": "500",
    "MAX_RECURSION_DEPTH": "5",
    "AI_TIMEOUT": "120000",
    "CACHE_DIRECTORY": "/tmp/mcp-cache",
    "MAX_CACHE_SIZE": "500MB"
  }
}
```

---

## 🔥 Firecrawl Configuration

**Firecrawl integration provides enhanced web research capabilities for comprehensive architectural analysis.**

### **Firecrawl Environment Variables**

| Variable             | Required | Default                  | Description                  |
| -------------------- | -------- | ------------------------ | ---------------------------- |
| `FIRECRAWL_ENABLED`  | No       | `false`                  | Enable Firecrawl integration |
| `FIRECRAWL_API_KEY`  | No\*     | -                        | API key for cloud service    |
| `FIRECRAWL_BASE_URL` | No       | `https://localhost:3000` | Self-hosted instance URL     |

\*Required if using cloud service

### **Configuration Examples**

#### **Cloud Service (Recommended)**

```json
{
  "env": {
    "FIRECRAWL_ENABLED": "true",
    "FIRECRAWL_API_KEY": "fc-your-api-key-here"
  }
}
```

#### **Self-Hosted**

```json
{
  "env": {
    "FIRECRAWL_ENABLED": "true",
    "FIRECRAWL_BASE_URL": "https://localhost:3000"
  }
}
```

#### **Disabled (Default)**

```json
{
  "env": {
    "FIRECRAWL_ENABLED": "false"
  }
}
```

### **Client-Specific Firecrawl Configuration**

#### **Claude Desktop**

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/absolute/path/to/project",
        "OPENROUTER_API_KEY": "your_key_here",
        "EXECUTION_MODE": "full",
        "FIRECRAWL_ENABLED": "true",
        "FIRECRAWL_API_KEY": "fc-your-api-key-here"
      }
    }
  }
}
```

#### **Cline (VS Code)**

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "npx",
      "args": ["mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": "${workspaceFolder}",
        "OPENROUTER_API_KEY": "${env:OPENROUTER_API_KEY}",
        "EXECUTION_MODE": "full",
        "FIRECRAWL_ENABLED": "true",
        "FIRECRAWL_API_KEY": "${env:FIRECRAWL_API_KEY}"
      }
    }
  }
}
```

#### **Cursor**

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "npx",
      "args": ["mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": ".",
        "OPENROUTER_API_KEY": "your_key_here",
        "EXECUTION_MODE": "full",
        "FIRECRAWL_ENABLED": "true",
        "FIRECRAWL_API_KEY": "fc-your-api-key-here"
      }
    }
  }
}
```

#### **Gemini**

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/absolute/path/to/project",
        "OPENROUTER_API_KEY": "your_key_here",
        "EXECUTION_MODE": "full",
        "AI_MODEL": "google/gemini-pro-1.5",
        "FIRECRAWL_ENABLED": "true",
        "FIRECRAWL_API_KEY": "fc-your-api-key-here"
      }
    }
  }
}
```

#### **Continue.dev**

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
        "EXECUTION_MODE": "full",
        "FIRECRAWL_ENABLED": "true",
        "FIRECRAWL_API_KEY": "${env:FIRECRAWL_API_KEY}"
      }
    }
  ]
}
```

#### **Aider (YAML)**

```yaml
mcp_servers:
  - name: adr-analysis
    command: mcp-adr-analysis-server
    env:
      PROJECT_PATH: '/absolute/path/to/project'
      OPENROUTER_API_KEY: 'your_key_here'
      EXECUTION_MODE: 'full'
      FIRECRAWL_ENABLED: 'true'
      FIRECRAWL_API_KEY: 'fc-your-api-key-here'
```

#### **Windsurf**

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "args": [],
      "env": {
        "PROJECT_PATH": "/absolute/path/to/project",
        "OPENROUTER_API_KEY": "your_key_here",
        "EXECUTION_MODE": "full",
        "FIRECRAWL_ENABLED": "true",
        "FIRECRAWL_API_KEY": "fc-your-api-key-here"
      }
    }
  }
}
```

### **Firecrawl Benefits**

- **Real-time Research** - Access current best practices and architectural patterns
- **Enhanced ADRs** - Generate more comprehensive decision records with external context
- **Intelligent Scraping** - Extract relevant content from technical documentation and blogs
- **Fallback Support** - Graceful degradation when web search is unavailable

### **Getting Your Firecrawl API Key**

1. **Visit**: https://firecrawl.dev
2. **Sign up** for an account
3. **Get your API key** (starts with "fc-")
4. **Add to configuration** as shown above

---

## 🚨 Client-Specific Troubleshooting

### Claude Desktop Issues

#### **"Server not found" or "Unknown tool"**

```bash
# 1. Verify global installation
which mcp-adr-analysis-server
npm list -g mcp-adr-analysis-server

# 2. Check PATH in Claude Desktop
# Ensure Node.js and npm are in your system PATH
echo $PATH | grep -E "(node|npm)"

# 3. Restart Claude Desktop after installation
```

#### **"Permission denied" errors**

```json
{
  "env": {
    "PROJECT_PATH": "/absolute/path/not/relative"
  }
}
```

#### **"Tools return prompts instead of results"**

```json
{
  "env": {
    "EXECUTION_MODE": "full",
    "OPENROUTER_API_KEY": "required_for_ai_features"
  }
}
```

### Cline (VS Code) Issues

#### **"Command not found: npx"**

```bash
# Install Node.js and npm
# Then verify installation
node --version
npm --version
```

#### **"Workspace folder not found"**

```json
{
  "env": {
    "PROJECT_PATH": "${workspaceFolder}"
  }
}
```

#### **"Environment variables not resolved"**

```json
{
  "env": {
    "OPENROUTER_API_KEY": "${env:OPENROUTER_API_KEY}"
  }
}
```

### Cursor Issues

#### **"Relative paths not working"**

```json
{
  "env": {
    "PROJECT_PATH": "/absolute/path/to/project"
  }
}
```

#### **"npx command fails"**

```json
{
  "command": "mcp-adr-analysis-server",
  "args": []
}
```

### Gemini Issues

#### **"Model not supported"**

```json
{
  "env": {
    "AI_MODEL": "google/gemini-pro-1.5"
  }
}
```

#### **"Token limit exceeded"**

```json
{
  "env": {
    "AI_MAX_TOKENS": "8192"
  }
}
```

### Continue.dev Issues

#### **"Array format expected"**

```json
{
  "mcpServers": [
    {
      "name": "adr-analysis",
      "command": "npx",
      "args": ["mcp-adr-analysis-server"]
    }
  ]
}
```

#### **"Workspace folder not accessible"**

```json
{
  "env": {
    "PROJECT_PATH": "${workspaceFolder}"
  }
}
```

### Aider Issues

#### **"YAML syntax error"**

```yaml
# Check indentation (use spaces, not tabs)
mcp_servers:
  - name: adr-analysis
    command: mcp-adr-analysis-server
    env:
      PROJECT_PATH: '/absolute/path'
```

#### **"Command not found"**

```bash
# Ensure mcp-adr-analysis-server is in PATH
which mcp-adr-analysis-server
```

### Windsurf Issues

#### **"Configuration not loaded"**

```bash
# Check file location
ls -la ~/.codeium/windsurf/mcp_config.json

# Ensure proper JSON syntax
cat ~/.codeium/windsurf/mcp_config.json | jq .
```

#### **"Environment variables not working"**

```json
{
  "env": {
    "PROJECT_PATH": "/absolute/path",
    "OPENROUTER_API_KEY": "your_key_here"
  }
}
```

### General Troubleshooting

#### **Test Server Installation**

```bash
# Test global installation
mcp-adr-analysis-server --version

# Test with npx
npx mcp-adr-analysis-server --version

# Test configuration
mcp-adr-analysis-server --test
```

#### **Validate Configuration**

```bash
# Test JSON syntax
cat config.json | jq .

# Test YAML syntax (for Aider)
yamllint .aider_config.yaml
```

#### **Check Environment Variables**

```bash
# List all environment variables
env | grep -E "(PROJECT_PATH|OPENROUTER|FIRECRAWL)"

# Test specific variables
echo $PROJECT_PATH
echo $OPENROUTER_API_KEY
```

#### **Debug Mode**

```json
{
  "env": {
    "LOG_LEVEL": "DEBUG"
  }
}
```

---

## 🔒 Security Best Practices

### Environment Variables

**Never hardcode API keys in config files**:

```bash
# Set in your shell profile
export OPENROUTER_API_KEY="your_key_here"
```

```json
{
  "env": {
    "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}"
  }
}
```

### Secure Configuration Template

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/absolute/path/to/project",
        "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}",
        "EXECUTION_MODE": "full",
        "ADR_DIRECTORY": "./adrs",
        "LOG_LEVEL": "ERROR",
        "ENABLE_CONTENT_MASKING": "true",
        "MASKING_LEVEL": "strict",
        "AI_CACHE_ENABLED": "false"
      }
    }
  }
}
```

### File Permissions

```bash
# Secure config file permissions
chmod 600 ~/.config/Claude/claude_desktop_config.json
chmod 600 .cursor/mcp.json
```

---

## 🧪 Testing Configuration

### Validate Setup

1. **Test Server Installation**

```bash
mcp-adr-analysis-server --version
mcp-adr-analysis-server --test
```

2. **Test MCP Connection**

```json
{
  "tool": "check_ai_execution_status"
}
```

3. **Test Basic Functionality**

```json
{
  "tool": "analyze_project_ecosystem",
  "parameters": {
    "projectPath": ".",
    "recursiveDepth": "shallow"
  }
}
```

### Diagnostic Commands

```json
// Check environment
{
  "tool": "analyze_environment",
  "parameters": {
    "includeOptimizations": true
  }
}

// Test AI execution
{
  "tool": "suggest_adrs",
  "parameters": {
    "projectPath": ".",
    "maxSuggestions": 1
  }
}
```

---

## 🔧 Troubleshooting

### Common Configuration Issues

| Issue                | Symptom                             | Solution                                                          |
| -------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| Server not found     | "Unknown tool" errors               | Install server globally: `npm install -g mcp-adr-analysis-server` |
| Tools return prompts | Get instructions instead of results | Set `EXECUTION_MODE=full` and add API key                         |
| Permission denied    | File access errors                  | Use absolute paths, check permissions                             |
| Slow performance     | Long response times                 | Use `claude-3-haiku` model, enable caching                        |
| High API costs       | Expensive requests                  | Reduce `AI_MAX_TOKENS`, use cheaper model                         |

### Debug Configuration

```json
{
  "env": {
    "LOG_LEVEL": "DEBUG",
    "VERBOSE": "true",
    "TIMING_ENABLED": "true",
    "MEMORY_TRACKING": "true"
  }
}
```

### Reset Configuration

```bash
# Backup current config
cp claude_desktop_config.json claude_desktop_config.json.backup

# Start with minimal config
cat > claude_desktop_config.json << 'EOF'
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/absolute/path/to/project",
        "EXECUTION_MODE": "prompt-only"
      }
    }
  }
}
EOF
```

---

## 📚 Related Documentation

- **[Environment Configuration](environment-config.md)** - Complete environment variable reference
- **[Troubleshooting](.../how-to-guides/troubleshooting.md)** - Common issues and solutions
- **[API Reference](api-reference.md)** - Complete tool documentation
- **[Security Guide](.../how-to-guides/security-analysis.md)** - Security configuration

---

**Configuration not working?** → **[Troubleshooting Guide](.../how-to-guides/troubleshooting.md)** or **[File an Issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues)**
