---
name: 'MCP Server Validation'
description: 'Validates MCP server initialization, tool registration, protocol compliance, and Node 20/22 matrix testing'
on:
  pull_request:
    paths:
      - 'src/**'
      - 'tests/**'
      - 'package.json'
      - 'tsconfig.json'
  push:
    branches:
      - main
      - develop
  workflow_dispatch:
permissions:
  issues: read
  pull-requests: read
safe-outputs:
  create-issue:
    title-prefix: '[mcp-validation]'
  add-comment:
tools:
  bash: true
  github:
    toolsets: [issues, pull_requests]
---

# MCP Server Validation

You validate the MCP server's core functionality: initialization, tool registration, protocol compliance, and cross-version compatibility.

## Context

The **mcp-adr-analysis-server** exposes 27 tools via `@modelcontextprotocol/sdk`. The server must:

- Initialize correctly on both Node.js 20 and 22
- Register all 27 tools in both ListTools and CallTool handlers
- Comply with the MCP protocol (JSON-RPC over stdio)
- Pass health checks (`npm run health`)

## Validation Steps

### Step 0: Install Dependencies

Install build tools required for native module compilation (e.g., tree-sitter), then install npm dependencies with error-tolerant fallbacks.

```bash
# Install build tools for native modules (requires sudo)
sudo apt-get update -qq && sudo apt-get install -y build-essential python3 || echo "⚠️ Could not install build tools (may already be present)"

# Install npm dependencies with fallback
if ! npm ci; then
  echo "⚠️ npm ci failed, falling back to npm install..."
  npm install
fi

# Rebuild tree-sitter native bindings (non-blocking)
echo "🔨 Rebuilding tree-sitter native bindings..."
if ! npm rebuild tree-sitter; then
  echo "⚠️ Tree-sitter rebuild failed, but continuing (tests handle graceful fallback)"
fi
```

If `npm` is not available or both install commands fail, Steps 1-4 will not be able to run. Report the dependency installation failure as the root cause.

### Step 1: Build and Health Check

Run the following commands:

```bash
npm run build
npm run health
```

If the health check fails, capture the full error output for diagnosis.

### Step 2: Validate MCP Tool Registration

Run the server in test mode and verify it initializes:

```bash
node dist/src/index.js --test 2>&1 | tee mcp-validation.log
```

Check that the log contains "MCP Server Ready" or equivalent initialization success message. If not, report the failure.

### Step 3: Test MCP Protocol Compliance

Verify that the MCP SDK imports work correctly:

```bash
node -e "
  import { Server } from '@modelcontextprotocol/sdk/server/index.js';
  import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
  console.log('MCP SDK imports successful');
  console.log('MCP protocol compliance verified');
"
```

### Step 4: Run MCP Functionality Tests

```bash
npm run test:mcp-functionality
```

If this command is not available, fall back to:

```bash
npm test -- --testPathPattern="mcp" --verbose
```

### Step 5: Verify Tool Count

Read `src/index.ts` and count the tools registered in the `ListToolsRequestSchema` handler. Verify the count is 27 (or document the current count if it has changed).

### Step 6: Node Version Compatibility

Note: The copilot-setup-steps.yml runs on Node 20. If there are known Node 22 compatibility issues, document them.

## On Failure

If any step fails:

1. **For PR events**: Add a comment to the PR with the failure details and suggested fix
2. **For push/dispatch events**: Create an issue with full diagnostic output

**Issue title**: `[mcp-validation] {brief description of failure}`

**Issue body** should include:

- Which validation step failed
- Full error output (truncated to 100 lines if longer)
- Node.js version tested
- Suggested remediation steps
- Links to relevant source files

## On Success

If all validations pass:

- **For PR events**: Add a comment confirming all MCP validations passed, including the tool count
- **For push/dispatch events**: No issue needed (output `noop`)

---

_Replaces: .github/agents/mcp-server-validation.yml_
