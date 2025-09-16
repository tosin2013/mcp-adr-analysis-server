# Migration Rollback Plan

Generated: 2024-01-01T00:00:00.000Z
Migration ID: migration-2024-01-01T00-00-00-000Z

## Steps to Rollback:

1. Stop the MCP ADR Analysis Server
2. Clear memory entities:

   ```bash
   rm -rf "/home/runner/work/mcp-adr-analysis-server/mcp-adr-analysis-server/.mcp-adr-memory"
   ```

3. Restore backup data:

   ```bash
   cp -r "/home/runner/work/mcp-adr-analysis-server/mcp-adr-analysis-server/.mcp-migration-backups/migration-2024-01-01T00-00-00-000Z/cache" "/home/runner/work/mcp-adr-analysis-server/mcp-adr-analysis-server/.mcp-adr-cache"
   cp -r "/home/runner/work/mcp-adr-analysis-server/mcp-adr-analysis-server/.mcp-migration-backups/migration-2024-01-01T00-00-00-000Z/docs" "/home/runner/work/mcp-adr-analysis-server/mcp-adr-analysis-server/docs"
   ```

4. Restart the server

## Verification:

- Check that legacy cache files are restored
- Verify ADR documents are accessible
- Confirm troubleshooting history is available
