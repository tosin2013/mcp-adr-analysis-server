# VS Code Integration Guide

This guide walks through setting up the MCP ADR Analysis Server with VS Code using Cline or Continue as your MCP client.

## Prerequisites

- [VS Code](https://code.visualstudio.com/) 1.85+
- [Node.js](https://nodejs.org/) 18+
- One of:
  - [Cline extension](https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev) (recommended)
  - [Continue extension](https://marketplace.visualstudio.com/items?itemName=Continue.continue)

## Step 1: Install the server

```bash
npm install -g mcp-adr-analysis-server
```

Verify the installation:

```bash
mcp-adr-analysis-server --help
```

If you prefer running from source:

```bash
git clone https://github.com/tosin2013/mcp-adr-analysis-server.git
cd mcp-adr-analysis-server
npm install && npm run build
```

## Step 2: Configure your MCP client

### Option A: Cline

1. Open VS Code and install the [Cline extension](https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev) from the marketplace.
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **Cline: MCP Servers**.
3. Click **Edit MCP Settings** to open the settings file, or create `.vscode/cline_mcp_settings.json` in your workspace:

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

4. Replace `/path/to/your/project` with the absolute path to the project you want to analyze.
5. Cline will detect the new server and show it in the MCP Servers panel. The status indicator should turn green.

> **Tip:** Use the workspace root if you want to analyze the project you have open: set `PROJECT_PATH` to the result of `pwd` in your terminal.

### Option B: Continue

1. Install the [Continue extension](https://marketplace.visualstudio.com/items?itemName=Continue.continue) from the marketplace.
2. Open Continue settings (`~/.continue/config.yaml` or via the Continue sidebar gear icon).
3. Add the MCP server under the `mcpServers` section:

```yaml
mcpServers:
  - name: adr-analysis
    command: mcp-adr-analysis-server
    env:
      PROJECT_PATH: /path/to/your/project
```

4. Reload VS Code. Continue will connect to the server on startup.

### Option C: VS Code native MCP support

VS Code 1.99+ has built-in MCP support. Create or copy the example `.vscode/mcp.json` into your workspace:

```json
{
  "servers": {
    "adr-analysis": {
      "type": "stdio",
      "command": "mcp-adr-analysis-server",
      "env": {
        "PROJECT_PATH": "${workspaceFolder}"
      }
    }
  }
}
```

An example file is available at [`examples/vscode/mcp.json`](../../examples/vscode/mcp.json).

## Step 3: Verify the connection

Once configured, verify the server is connected:

1. Open the MCP client panel (Cline sidebar or Continue sidebar).
2. Check that **adr-analysis** appears in the server list with a connected status.
3. Try a simple query:

> "List all ADRs in this project"

The server should respond with a list of architectural decision records found in your project's `docs/adrs/` directory (or the path set by `ADR_DIRECTORY`).

## Step 4: Try common workflows

### Analyze project architecture

> "Analyze this project's architecture and suggest ADRs for any implicit decisions"

### Review existing ADRs

> "Review the existing ADRs and check if the code still matches the documented decisions"

### Generate ADRs from a PRD

> "Generate ADRs from docs/PRD.md and create a todo.md with implementation tasks"

### Security analysis

> "Check this codebase for security issues and provide masking recommendations"

## Debugging the server in VS Code

If you are developing or debugging the server itself, use the provided launch configuration. Copy [`examples/vscode/launch.json`](../../examples/vscode/launch.json) to your `.vscode/` directory:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "MCP ADR Analysis Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dist/src/index.js",
      "env": {
        "PROJECT_PATH": "${workspaceFolder}",
        "LOG_LEVEL": "DEBUG"
      },
      "console": "integratedTerminal",
      "preLaunchTask": "npm: build"
    }
  ]
}
```

Press `F5` to build and launch the server with debug logging. Set breakpoints in `src/` to step through tool execution.

## Configuration reference

| Environment variable     | Default     | Description                                  |
| ------------------------ | ----------- | -------------------------------------------- |
| `PROJECT_PATH`           | current dir | Absolute path to the project to analyze      |
| `ADR_DIRECTORY`          | `docs/adrs` | Relative path to the ADR directory           |
| `EXECUTION_MODE`         | `ce-mcp`    | `ce-mcp` (default), `full`, or `prompt-only` |
| `LOG_LEVEL`              | `INFO`      | `DEBUG`, `INFO`, `WARN`, `ERROR`             |
| `OPENROUTER_API_KEY`     | —           | Required only for `full` execution mode      |
| `ADR_AGGREGATOR_API_KEY` | —           | Optional SaaS sync for shared ADR context    |

## Troubleshooting

**Server not appearing in Cline**

- Ensure `mcp-adr-analysis-server` is on your `PATH` (run `which mcp-adr-analysis-server`).
- If installed from source, make sure you ran `npm run build` first.
- Restart VS Code after changing MCP settings.

**"PROJECT_PATH does not exist"**

- Use an absolute path, not a relative one.
- On Windows, use forward slashes or escaped backslashes: `C:/Users/you/project`.

**Connection drops or timeouts**

- Check the VS Code Output panel (select "Cline" or "Continue" from the dropdown) for error messages.
- Set `LOG_LEVEL=DEBUG` to see detailed server logs.
- Ensure Node.js 18+ is installed (`node --version`).

**No ADRs found**

- The server looks for ADRs in `docs/adrs/` by default. Set `ADR_DIRECTORY` if your ADRs are elsewhere.
- ADR files must be Markdown (`.md`) and follow the standard ADR format with a `# Title` and `## Status` section.

## Next steps

- [Full configuration reference](../reference/environment-config.md)
- [MCP client compatibility matrix](mcp-client-compatibility.md)
- [Tool development guide](tool-development.md)
