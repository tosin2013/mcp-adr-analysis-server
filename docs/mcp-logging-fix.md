# MCP Server Logging Fix Documentation

## Problem Statement

The MCP ADR Analysis Server was using `console.log`, `console.warn`, and other console methods that write to stdout. Since MCP servers communicate via stdio (stdin/stdout) using the JSON-RPC protocol, any non-JSON output to stdout corrupts the protocol and breaks communication with MCP clients.

## Root Cause

MCP servers must:
- Use **stdout** exclusively for JSON-RPC protocol messages
- Use **stderr** for all logging, debugging, and diagnostic output
- Never write arbitrary text to stdout

## Solution Implemented

### 1. Logger Refactoring

Modified the custom logger in `src/utils/config.ts` to use `console.error` (which writes to stderr) for all log levels:

```typescript
return {
  debug: (message: string, ...args: any[]) => {
    if (currentLevel <= 0) console.error(`[DEBUG] ${message}`, ...args);
  },
  info: (message: string, ...args: any[]) => {
    if (currentLevel <= 1) console.error(`[INFO] ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    if (currentLevel <= 2) console.error(`[WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    if (currentLevel <= 3) console.error(`[ERROR] ${message}`, ...args);
  },
};
```

### 2. Warning Calls Update

Replaced all `console.warn` calls throughout the codebase with `console.error` using the `[WARN]` prefix:

- `src/index.ts`: Line 1700
- `src/utils/output-masking.ts`: Line 95
- `src/utils/rule-generation.ts`: Line 434
- `src/utils/environment-analysis.ts`: Line 408
- `src/utils/deployment-analysis.ts`: Line 82
- `src/utils/adr-suggestions.ts`: Lines 316, 339, 359

### 3. CLI Output Handling

The console output for CLI arguments (--help, --version, --config) was left unchanged as these execute before the MCP server starts and exit immediately, so they don't interfere with the MCP protocol.

## Best Practices for MCP Servers

1. **Always use stderr for logging**: Use `console.error()` for all diagnostic output
2. **Validate protocol compliance**: Test that stdout only contains valid JSON-RPC messages
3. **Provide log levels**: Allow users to control logging verbosity via environment variables
4. **Document logging behavior**: Make it clear where logs will appear

## Testing

A test script has been created at `scripts/test-mcp-logging.ts` to verify:
- All logging goes to stderr
- stdout only contains valid JSON-RPC messages
- The server responds correctly to MCP protocol requests

## Environment Variables

The server supports the following logging configuration:

- `LOG_LEVEL`: Controls logging verbosity (DEBUG, INFO, WARN, ERROR)
  - DEBUG: All messages
  - INFO: Informational messages and above
  - WARN: Warnings and errors only
  - ERROR: Errors only

## Migration Guide

If you're developing an MCP server, ensure:

1. Replace all console methods that write to stdout:
   ```typescript
   // ❌ Don't use these:
   console.log("message");
   console.info("message");
   console.warn("message");
   console.debug("message");
   
   // ✅ Use this instead:
   console.error("[INFO] message");
   console.error("[WARN] message");
   console.error("[DEBUG] message");
   ```

2. Or better yet, create a dedicated logger that writes to stderr:
   ```typescript
   const log = {
     info: (msg: string) => console.error(`[INFO] ${msg}`),
     warn: (msg: string) => console.error(`[WARN] ${msg}`),
     error: (msg: string) => console.error(`[ERROR] ${msg}`)
   };
   ```

3. Test your server with an MCP client to ensure protocol compliance

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io/docs)
- [MCP SDK Examples](https://github.com/modelcontextprotocol/sdk)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)