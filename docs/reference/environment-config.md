# 🔧 Environment Configuration Reference

**Complete guide to configuring the MCP ADR Analysis Server environment variables and settings.**

---

## 📋 Quick Reference

| Variable             | Required | Default                     | Description                        |
| -------------------- | -------- | --------------------------- | ---------------------------------- |
| `PROJECT_PATH`       | ✅       | -                           | Absolute path to project directory |
| `OPENROUTER_API_KEY` | ⚡       | -                           | API key for AI-powered analysis    |
| `EXECUTION_MODE`     | ⚡       | `prompt-only`               | `full` or `prompt-only`            |
| `AI_MODEL`           | ❌       | `anthropic/claude-3-sonnet` | AI model to use                    |
| `ADR_DIRECTORY`      | ❌       | `docs/adrs`                 | Directory for ADR files            |
| `LOG_LEVEL`          | ❌       | `INFO`                      | Logging verbosity                  |

**Legend**: ✅ Required • ⚡ Required for AI features • ❌ Optional

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

### OPENROUTER_API_KEY (Required for AI)

**Purpose**: Enables AI-powered analysis instead of prompt-only mode

```bash
# Get your key from: https://openrouter.ai/keys
OPENROUTER_API_KEY="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Without this key**:

- Tools return prompts instead of analysis results
- No AI-powered insights or suggestions
- Limited to basic file operations

**Validation**:

```bash
# Test API key (first 10 characters only for security)
echo $OPENROUTER_API_KEY | head -c 10
# Should show: sk-or-v1-x
```

### EXECUTION_MODE (Critical for AI)

**Purpose**: Controls whether tools execute AI analysis or return prompts

```bash
# ✅ AI-powered execution (recommended)
EXECUTION_MODE="full"

# ❌ Legacy prompt-only mode
EXECUTION_MODE="prompt-only"
```

**Mode Comparison**:

| Mode          | `suggest_adrs` Returns                | `analyze_project_ecosystem` Returns |
| ------------- | ------------------------------------- | ----------------------------------- |
| `full`        | Actual ADR suggestions with reasoning | Complete technology analysis        |
| `prompt-only` | Instructions to analyze architecture  | Instructions to examine project     |

---

## 🤖 AI Configuration

### AI_MODEL

**Purpose**: Choose which AI model to use for analysis

```bash
# Recommended models
AI_MODEL="anthropic/claude-3-sonnet"    # Best quality
AI_MODEL="anthropic/claude-3-haiku"     # Fastest/cheapest
AI_MODEL="openai/gpt-4o"                # Alternative quality option
AI_MODEL="openai/gpt-4o-mini"          # Alternative fast option
```

**Model Comparison**:

| Model             | Speed  | Quality   | Cost | Best For              |
| ----------------- | ------ | --------- | ---- | --------------------- |
| `claude-3-sonnet` | Medium | Excellent | High | Complex analysis      |
| `claude-3-haiku`  | Fast   | Good      | Low  | Quick tasks           |
| `gpt-4o`          | Medium | Excellent | High | Alternative to Claude |
| `gpt-4o-mini`     | Fast   | Good      | Low  | Cost-effective        |

### AI Performance Tuning

```bash
# Response consistency (0-1, lower = more consistent)
AI_TEMPERATURE="0.1"

# Maximum response length
AI_MAX_TOKENS="4000"

# Request timeout (milliseconds)
AI_TIMEOUT="60000"

# Enable response caching
AI_CACHE_ENABLED="true"
AI_CACHE_TTL="3600"  # 1 hour
```

---

## 📁 Project Configuration

### ADR_DIRECTORY

**Purpose**: Where to store Architectural Decision Records

```bash
# Default location
ADR_DIRECTORY="docs/adrs"

# Custom locations
ADR_DIRECTORY="architecture/decisions"
ADR_DIRECTORY="docs/architecture/adrs"
```

**Directory Structure Created**:

```
docs/adrs/
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

---

## 🌍 Environment-Specific Configurations

### Development Environment

```bash
# .env.development
PROJECT_PATH="/Users/developer/current-project"
OPENROUTER_API_KEY="your-dev-key"
EXECUTION_MODE="full"
AI_MODEL="anthropic/claude-3-haiku"  # Faster for dev
LOG_LEVEL="DEBUG"
AI_CACHE_ENABLED="true"
TIMING_ENABLED="true"
```

### Production Environment

```bash
# .env.production
PROJECT_PATH="/app/project"
OPENROUTER_API_KEY="your-prod-key"
EXECUTION_MODE="full"
AI_MODEL="anthropic/claude-3-sonnet"  # Best quality
LOG_LEVEL="ERROR"
AI_CACHE_ENABLED="true"
AI_CACHE_TTL="86400"  # 24 hours
```

### CI/CD Environment

```bash
# .env.ci
PROJECT_PATH="${GITHUB_WORKSPACE}"
OPENROUTER_API_KEY="${OPENROUTER_API_KEY}"  # From secrets
EXECUTION_MODE="full"
AI_MODEL="anthropic/claude-3-haiku"  # Fast for CI
LOG_LEVEL="INFO"
AI_CACHE_ENABLED="false"  # Fresh analysis each time
```

---

## 📱 MCP Client Configuration

### Claude Desktop

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/absolute/path/to/project",
        "OPENROUTER_API_KEY": "your_key_here",
        "EXECUTION_MODE": "full",
        "AI_MODEL": "anthropic/claude-3-sonnet",
        "ADR_DIRECTORY": "docs/adrs",
        "LOG_LEVEL": "ERROR"
      }
    }
  }
}
```

### Cline (VS Code)

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
        "ADR_DIRECTORY": "docs/adrs",
        "LOG_LEVEL": "ERROR"
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
      "args": ["mcp-adr-analysis-server"],
      "env": {
        "PROJECT_PATH": ".",
        "OPENROUTER_API_KEY": "your_key_here",
        "EXECUTION_MODE": "full",
        "ADR_DIRECTORY": "docs/adrs",
        "LOG_LEVEL": "ERROR"
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

| Error                        | Cause                              | Solution               |
| ---------------------------- | ---------------------------------- | ---------------------- |
| "Project path not found"     | Relative or invalid `PROJECT_PATH` | Use absolute path      |
| "Tools return prompts"       | Missing `EXECUTION_MODE=full`      | Set execution mode     |
| "AI execution not available" | Missing `OPENROUTER_API_KEY`       | Add API key            |
| "Permission denied"          | Wrong directory permissions        | Check file permissions |
| "Module not found"           | Server not installed properly      | Reinstall server       |

### Diagnostic Tool

```json
{
  "tool": "check_ai_execution_status",
  "parameters": {}
}
```

**Expected Response**:

```json
{
  "aiExecutionAvailable": true,
  "executionMode": "full",
  "apiKeyConfigured": true,
  "model": "anthropic/claude-3-sonnet",
  "projectPath": "/absolute/path/to/project",
  "adrDirectory": "docs/adrs"
}
```

---

## 🚀 Optimization Tips

### For Large Projects

```bash
# Reduce analysis scope
MAX_FILES_PER_ANALYSIS="500"
MAX_RECURSION_DEPTH="5"

# Use faster model for initial analysis
AI_MODEL="anthropic/claude-3-haiku"

# Enable aggressive caching
AI_CACHE_ENABLED="true"
AI_CACHE_TTL="86400"
```

### For Team Environments

```bash
# Shared cache location
CACHE_DIRECTORY="/shared/mcp-cache"

# Consistent model across team
AI_MODEL="anthropic/claude-3-sonnet"

# Standardized ADR location
ADR_DIRECTORY="docs/architecture/decisions"
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
