# 🔧 Environment Configuration Reference

**Complete guide to configuring the MCP ADR Analysis Server environment variables and settings.**

---

## 📋 Quick Reference

| Variable                 | Required | Default    | Description                                                           |
| ------------------------ | -------- | ---------- | --------------------------------------------------------------------- |
| `PROJECT_PATH`           | ❌       | `.`        | Path to project directory (defaults to current directory)             |
| `EXECUTION_MODE`         | ❌       | `ce-mcp`   | `ce-mcp` (default), `full` (legacy, needs API key), or `prompt-only` |
| `ADR_DIRECTORY`          | ❌       | `docs/adrs`| Directory for ADR files relative to project path                      |
| `LOG_LEVEL`              | ❌       | `INFO`     | Logging verbosity                                                     |
| `OPENROUTER_API_KEY`     | ❌       | -          | OpenRouter API key (only needed for legacy `full` execution mode)     |
| `ADR_AGGREGATOR_API_KEY` | ❌       | -          | API key for ADR Aggregator platform                                   |

**Legend**: ❌ Optional — CE-MCP mode (the default) requires **no API key**. Your host LLM executes analysis via orchestration directives.

---

## 🎯 Essential Configuration

### PROJECT_PATH (Required)

**Purpose**: Tells the server which project to analyze

```bash
# ✅ Correct - absolute path
PROJECT_PATH="/Users/username/my-project"

# ❌ Wrong - relative path
PROJECT_PATH="."
PROJECT_PATH="../my-project"
```

**Common Issues**:

- Relative paths cause file access errors
- Non-existent paths cause startup failures
- Paths with spaces need proper escaping

**Validation**:

```bash
# Test your path
ls -la "$PROJECT_PATH"
# Should show your project files
```

### EXECUTION_MODE

**Purpose**: Controls how tools return results

```bash
# ✅ CE-MCP mode (default, recommended — no API key needed)
EXECUTION_MODE="ce-mcp"

# Legacy: server-side AI execution (requires OPENROUTER_API_KEY)
EXECUTION_MODE="full"

# Legacy: returns prompts you can paste into any AI chat
EXECUTION_MODE="prompt-only"
```

**Mode Comparison**:

| Mode          | Returns                                        | Requires API Key? |
| ------------- | ---------------------------------------------- | ----------------- |
| `ce-mcp`      | Orchestration directives for your host LLM     | No                |
| `full`        | Server-side AI analysis results                | Yes               |
| `prompt-only` | Prompts you can paste into any AI chat         | No                |

**CE-MCP mode** is recommended for all users. Your host LLM (Claude, GPT, etc.) executes the analysis using orchestration directives returned by the tools — zero additional API cost and better results because the LLM already has your conversation context.

### OPENROUTER_API_KEY (Legacy — Full Mode Only)

**Purpose**: Only needed if you set `EXECUTION_MODE=full` for server-side AI execution

```bash
# Get your key from: https://openrouter.ai/keys
OPENROUTER_API_KEY="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Not needed in CE-MCP mode** (the default). In CE-MCP mode, your host LLM provides all AI capabilities.

---

## 🤖 AI Configuration (Legacy Full Mode Only)

> **Note**: The settings below only apply when `EXECUTION_MODE=full`. In CE-MCP mode (default), your host LLM handles all AI execution and these settings are ignored.

### AI_MODEL

**Purpose**: Choose which AI model to use for server-side analysis (full mode only)

```bash
AI_MODEL="anthropic/claude-3-sonnet"    # Default
AI_MODEL="anthropic/claude-3-haiku"     # Faster/cheaper
AI_MODEL="openai/gpt-4o"                # Alternative
```

---

## 📁 Project Configuration

### ADR_DIRECTORY

**Purpose**: Where to store Architectural Decision Records

```bash
# Default location
ADR_DIRECTORY="./adrs"

# Custom locations
ADR_DIRECTORY="architecture/decisions"
ADR_DIRECTORY="./architecture/adrs"
```

**Directory Structure Created**:

```
./adrs/
├── README.md           # ADR index
├── 001-first-decision.md
├── 002-second-decision.md
└── template.md         # ADR template
```

### File Patterns

```bash
# Include/exclude patterns for analysis
INCLUDE_PATTERNS="*.ts,*.js,*.py,*.md"
EXCLUDE_PATTERNS="node_modules,dist,coverage"

# Maximum file size to analyze (bytes)
MAX_FILE_SIZE="1048576"  # 1MB
```

---

## 🔍 Logging and Debugging

### LOG_LEVEL

**Purpose**: Control logging verbosity

```bash
LOG_LEVEL="ERROR"   # Only errors
LOG_LEVEL="WARN"    # Warnings and errors
LOG_LEVEL="INFO"    # General information (default)
LOG_LEVEL="DEBUG"   # Detailed debugging info
```

**When to Use Each Level**:

- **ERROR**: Production deployments
- **WARN**: Normal usage
- **INFO**: Development and troubleshooting
- **DEBUG**: Investigating issues

### Advanced Debugging

```bash
# Enable verbose output
VERBOSE="true"

# Enable performance timing
TIMING_ENABLED="true"

# Enable memory usage tracking
MEMORY_TRACKING="true"
```

---

## 🔒 Security Configuration

### Content Masking

```bash
# Enable automatic content masking
ENABLE_CONTENT_MASKING="true"

# Masking sensitivity level
MASKING_LEVEL="strict"     # Most secure
MASKING_LEVEL="moderate"   # Balanced (default)
MASKING_LEVEL="lenient"    # Minimal masking
```

### Custom Security Patterns

```bash
# Additional patterns to detect as sensitive
CUSTOM_SECRET_PATTERNS="company-api-key-.*,internal-token-.*"

# Whitelist patterns (never mask these)
WHITELIST_PATTERNS="example-.*,demo-.*,test-.*"
```

---

## ⚡ Performance Configuration

### Caching

```bash
# Cache directory location
CACHE_DIRECTORY=".mcp-adr-cache"

# Cache size limits
MAX_CACHE_SIZE="100MB"
MAX_CACHE_AGE="7d"  # 7 days

# Cache cleanup frequency
CACHE_CLEANUP_INTERVAL="24h"
```

### Analysis Limits

```bash
# Maximum recursion depth for project analysis
MAX_RECURSION_DEPTH="10"

# Maximum files to analyze in one operation
MAX_FILES_PER_ANALYSIS="1000"

# Timeout for individual file analysis (ms)
FILE_ANALYSIS_TIMEOUT="30000"
```

### ADR Aggregator Configuration (Optional)

```bash
# Enable ADR Aggregator integration for cross-team visibility
# Get your API key at https://adraggregator.com
ADR_AGGREGATOR_API_KEY="agg_your_key_here"
```

**ADR Aggregator Configuration Options**:

- **`ADR_AGGREGATOR_API_KEY`**: API key from [adraggregator.com](https://adraggregator.com) (auto-enables integration)

**Available Tiers**:

| Tier | Features                                             |
| ---- | ---------------------------------------------------- |
| Free | Sync ADRs, get context, staleness reports, templates |
| Pro+ | + Mermaid diagrams, compliance validation            |
| Team | + Cross-repository knowledge graph                   |

---

## 🌍 Environment-Specific Configurations

### Development Environment

```bash
# .env.development — CE-MCP mode (default), no API key needed
PROJECT_PATH="/Users/developer/current-project"
LOG_LEVEL="DEBUG"
```

### Production Environment

```bash
# .env.production
PROJECT_PATH="/app/project"
LOG_LEVEL="ERROR"
```

### CI/CD Environment

```bash
# .env.ci
PROJECT_PATH="${GITHUB_WORKSPACE}"
LOG_LEVEL="INFO"
```

### Legacy Full Mode (server-side AI)

```bash
# Only needed if you explicitly want server-side AI execution
PROJECT_PATH="/Users/developer/current-project"
OPENROUTER_API_KEY="your-key"
EXECUTION_MODE="full"
```

---

## 📱 MCP Client Configuration

### Claude Desktop

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

That's it — CE-MCP mode is the default, so no API key or `EXECUTION_MODE` is needed.

### Cline (VS Code)

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

### Cursor

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

## 🔧 Configuration Validation

### Test Your Configuration

```bash
# 1. Test server startup
mcp-adr-analysis-server --test

# 2. Validate environment
echo "Project: $PROJECT_PATH"
echo "ADR Dir: $ADR_DIRECTORY"
echo "Mode: $EXECUTION_MODE"

# 3. Test API key (safely)
echo $OPENROUTER_API_KEY | head -c 10
```

### Common Configuration Errors

| Error                        | Cause                              | Solution                                                |
| ---------------------------- | ---------------------------------- | ------------------------------------------------------- |
| "Project path not found"     | Invalid `PROJECT_PATH`             | Use a valid absolute or relative path                   |
| "Permission denied"          | Wrong directory permissions        | Check file permissions                                  |
| "Module not found"           | Server not installed properly      | Reinstall with `npm install -g mcp-adr-analysis-server` |

### Diagnostic Tool

```json
{
  "tool": "analyze_project_ecosystem",
  "parameters": {}
}
```

---

## 🚀 Optimization Tips

### For Large Projects

```bash
# Reduce analysis scope
MAX_FILES_PER_ANALYSIS="500"
MAX_RECURSION_DEPTH="5"

# Enable aggressive caching
AI_CACHE_ENABLED="true"
AI_CACHE_TTL="86400"
```

### For Team Environments

```bash
# Shared cache location
CACHE_DIRECTORY="/shared/mcp-cache"

# Standardized ADR location
ADR_DIRECTORY="./architecture/decisions"
```

### For Security-Sensitive Projects

```bash
# Strict content masking
ENABLE_CONTENT_MASKING="true"
MASKING_LEVEL="strict"

# Custom security patterns
CUSTOM_SECRET_PATTERNS="company-.*,internal-.*,private-.*"

# Disable caching of sensitive content
AI_CACHE_ENABLED="false"
```

---

## 📚 Related Documentation

- **[MCP Client Configuration](mcp-client-config.md)** - Detailed client setup
- **[Troubleshooting](../how-to-guides/troubleshooting.md)** - Common issues and solutions
- **[Security Guide](../how-to-guides/security-analysis.md)** - Security configuration
- **[API Reference](api-reference.md)** - Complete tool documentation

---

**Need help with configuration?** → **[Troubleshooting Guide](../how-to-guides/troubleshooting.md)** or **[File an Issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues)**
