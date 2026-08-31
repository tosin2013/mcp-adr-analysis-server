#!/usr/bin/env node

/**
 * MCP ADR Analysis Server
 * Main entry point for the Model Context Protocol server.
 *
 * Tools and resources are registered in mcp-adr-analysis-server.ts
 * from the canonical MCP_TOOL_SCHEMAS list.
 */

import { McpAdrAnalysisServer, getPackageVersion } from './mcp-adr-analysis-server.js';
import { getToolListForMCP } from './tools/tool-dispatcher.js';

export { McpAdrAnalysisServer, getPackageVersion } from './mcp-adr-analysis-server.js';
export { getToolListForMCP };

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
MCP ADR Analysis Server v${getPackageVersion()}

Usage: mcp-adr-analysis-server [options]

Options:
  --help, -h        Show this help message
  --version, -v     Show version information
  --test            Run health check and exit
  --config          Show configuration and exit

Environment Variables:
  PROJECT_PATH      Path to project directory (default: current directory)
  ADR_DIRECTORY     ADR directory relative to project (default: docs/adrs)
  LOG_LEVEL         Logging level: DEBUG, INFO, WARN, ERROR (default: INFO)
  CACHE_ENABLED     Enable caching: true, false (default: true)
`);
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(`MCP ADR Analysis Server v${getPackageVersion()}`);
    process.exit(0);
  }

  try {
    const server = new McpAdrAnalysisServer();

    if (args.includes('--test')) {
      console.log('🔍 Running health check...');
      await server.healthCheck();
      console.log('✅ Health check passed - server can start successfully');
      process.exit(0);
    }

    if (args.includes('--config')) {
      console.log('📋 Server configuration validated');
      process.exit(0);
    }

    await server.start();
  } catch (error) {
    console.error('❌ MCP server failed to start');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  (process.argv[1].endsWith('index.js') ||
    process.argv[1].endsWith('index.ts') ||
    process.argv[1].endsWith('mcp-adr-analysis-server'))
) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
