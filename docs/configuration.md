# Configuration Reference

Complete reference for all environment variables and configuration options.

---

## Quick Start

The minimal configuration requires only setting your MCP client to run the server:

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/path/to/your/project"
      }
    }
  }
}
```

For AI-powered analysis, add your OpenRouter API key:

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

## Environment Variables

### Required

| Variable       | Description                             | Default                   |
| -------------- | --------------------------------------- | ------------------------- |
| `PROJECT_PATH` | Absolute path to the project to analyze | Current working directory |

### AI Execution

| Variable             | Description                                  | Default                     |
| -------------------- | -------------------------------------------- | --------------------------- |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI execution          | — (prompt-only mode)        |
| `EXECUTION_MODE`     | `full`, `prompt-only`, `ce-mcp`, or `hybrid` | `prompt-only`               |
| `AI_MODEL`           | AI model identifier                          | `anthropic/claude-3-sonnet` |
| `AI_TEMPERATURE`     | Response consistency (0.0–1.0)               | `0.3`                       |
| `AI_MAX_TOKENS`      | Maximum response length                      | `4096`                      |
| `AI_TIMEOUT`         | Request timeout in milliseconds              | `30000`                     |

### ADR Management

| Variable        | Description                                   | Default     |
| --------------- | --------------------------------------------- | ----------- |
| `ADR_DIRECTORY` | Directory for ADR files (relative to project) | `docs/adrs` |

### Logging

| Variable    | Description                                         | Default |
| ----------- | --------------------------------------------------- | ------- |
| `LOG_LEVEL` | Logging verbosity: `DEBUG`, `INFO`, `WARN`, `ERROR` | `INFO`  |

### Caching

| Variable          | Description                           | Default             |
| ----------------- | ------------------------------------- | ------------------- |
| `CACHE_ENABLED`   | Enable analysis caching               | `true`              |
| `CACHE_DIRECTORY` | Cache directory (relative to project) | `.mcp-adr-cache`    |
| `MAX_CACHE_SIZE`  | Maximum cache size in bytes           | `104857600` (100MB) |

### Analysis

| Variable           | Description                            | Default |
| ------------------ | -------------------------------------- | ------- |
| `ANALYSIS_TIMEOUT` | Tool execution timeout in milliseconds | `30000` |

### Firecrawl (Web Research)

| Variable             | Description                       | Default                 |
| -------------------- | --------------------------------- | ----------------------- |
| `FIRECRAWL_ENABLED`  | Enable Firecrawl integration      | `false`                 |
| `FIRECRAWL_API_KEY`  | Firecrawl API key (cloud service) | —                       |
| `FIRECRAWL_BASE_URL` | Firecrawl base URL (self-hosted)  | `http://localhost:3000` |

### ADR Aggregator

| Variable                 | Description                       | Default                         |
| ------------------------ | --------------------------------- | ------------------------------- |
| `ADR_AGGREGATOR_ENABLED` | Enable ADR Aggregator integration | `false`                         |
| `ADR_AGGREGATOR_API_KEY` | ADR Aggregator API key            | —                               |
| `ADR_AGGREGATOR_URL`     | ADR Aggregator endpoint           | `https://api.adraggregator.com` |

---

## Execution Modes

### prompt-only (Default)

Returns structured prompts without AI execution. Use this to:

- Explore available tools without cost
- Copy prompts to your preferred AI interface
- Test tool parameters before enabling AI

```bash
EXECUTION_MODE=prompt-only
```

### full

Executes prompts via OpenRouter API. Requires `OPENROUTER_API_KEY`.

```bash
EXECUTION_MODE=full
OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

### ce-mcp

Returns orchestration directives for the host LLM (MCP client) to execute. This is the recommended mode for advanced integrations.

```bash
EXECUTION_MODE=ce-mcp
```

### hybrid

Supports both CE-MCP directives and OpenRouter fallback. Uses OpenRouter when CE-MCP execution fails.

```bash
EXECUTION_MODE=hybrid
OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

---

## AI Model Selection

Set `AI_MODEL` to any model supported by OpenRouter:

| Model           | Identifier                        | Best For                   |
| --------------- | --------------------------------- | -------------------------- |
| Claude 3 Sonnet | `anthropic/claude-3-sonnet`       | General analysis (default) |
| Claude 3 Haiku  | `anthropic/claude-3-haiku`        | Fast, cost-effective       |
| Claude 3 Opus   | `anthropic/claude-3-opus`         | Complex reasoning          |
| GPT-4 Turbo     | `openai/gpt-4-turbo`              | Alternative to Claude      |
| Llama 3 70B     | `meta-llama/llama-3-70b-instruct` | Open-source alternative    |

Example:

```bash
AI_MODEL=anthropic/claude-3-haiku
AI_TEMPERATURE=0.2
AI_MAX_TOKENS=8192
```

---

## Client-Specific Configuration

### Claude Desktop

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/path/to/project",
        "OPENROUTER_API_KEY": "sk-or-v1-xxxxx",
        "EXECUTION_MODE": "full",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

### Cursor

Settings → MCP → Add Server

```json
{
  "mcp-adr-analysis-server": {
    "command": "npx",
    "args": ["mcp-adr-analysis-server"],
    "env": {
      "PROJECT_PATH": "${workspaceFolder}",
      "OPENROUTER_API_KEY": "sk-or-v1-xxxxx",
      "EXECUTION_MODE": "full"
    }
  }
}
```

### Cline (VS Code)

`.vscode/cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "${workspaceFolder}",
        "OPENROUTER_API_KEY": "sk-or-v1-xxxxx",
        "EXECUTION_MODE": "full"
      }
    }
  }
}
```

---

## Full Configuration Example

All options with recommended values:

```json
{
  "mcpServers": {
    "adr-analysis": {
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "/path/to/project",
        "ADR_DIRECTORY": "docs/adrs",
        "OPENROUTER_API_KEY": "sk-or-v1-xxxxx",
        "EXECUTION_MODE": "full",
        "AI_MODEL": "anthropic/claude-3-sonnet",
        "AI_TEMPERATURE": "0.3",
        "AI_MAX_TOKENS": "4096",
        "LOG_LEVEL": "INFO",
        "CACHE_ENABLED": "true",
        "CACHE_DIRECTORY": ".mcp-adr-cache",
        "MAX_CACHE_SIZE": "104857600",
        "ANALYSIS_TIMEOUT": "30000",
        "FIRECRAWL_ENABLED": "true",
        "FIRECRAWL_API_KEY": "fc-xxxxx",
        "ADR_AGGREGATOR_ENABLED": "true",
        "ADR_AGGREGATOR_API_KEY": "agg_xxxxx"
      }
    }
  }
}
```

---

## Validation

Check your configuration by running the server with `LOG_LEVEL=DEBUG`:

```bash
PROJECT_PATH=/your/project LOG_LEVEL=DEBUG mcp-adr-analysis-server
```

The server logs configuration details on startup:

```
[INFO] MCP ADR Analysis Server Configuration:
[INFO]   Project Path: /your/project
[INFO]   ADR Directory: docs/adrs
[INFO]   Log Level: DEBUG
[INFO]   Cache Enabled: true
[INFO]   Firecrawl Enabled: false
[INFO]   ADR Aggregator Enabled: false
```

---

## Common Issues

### "PROJECT_PATH does not exist"

The specified project path doesn't exist or isn't a directory:

```bash
# Verify path exists
ls -la /path/to/project

# Use absolute path
PROJECT_PATH=$(pwd) mcp-adr-analysis-server
```

### "Missing OPENROUTER_API_KEY"

AI execution requires an API key:

1. Sign up at [openrouter.ai/keys](https://openrouter.ai/keys)
2. Set the environment variable:
   ```bash
   OPENROUTER_API_KEY=sk-or-v1-xxxxx
   EXECUTION_MODE=full
   ```

### Cache corruption

Clear the cache and restart:

```bash
rm -rf /path/to/project/.mcp-adr-cache
```

---

## Related Documentation

- **[Architecture Overview](./explanation/architecture-overview.md)** — System design
- **[AI Architecture](./explanation/ai-architecture-concepts.md)** — AI integration details
- **[API Reference](./reference/api-reference.md)** — Tool documentation
- **[Troubleshooting](./how-to-guides/troubleshooting.md)** — Common issues

---

**Questions about configuration?** → **[Open an Issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues)**
