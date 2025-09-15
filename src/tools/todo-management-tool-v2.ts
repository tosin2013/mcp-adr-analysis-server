/**
 * External TODO Management Tool (DEPRECATED)
 *
 * This tool has been deprecated and replaced with mcp-shrimp-task-manager.
 * TodoJsonManager and ProjectHealthScoring have been removed in favor of
 * the memory-centric architecture.
 */

// McpAdrError import removed as it's not used

/**
 * DEPRECATED: Use mcp-shrimp-task-manager instead
 */
export async function manageTodoV2(_args: any): Promise<any> {
  console.warn('⚠️ TodoJsonManager is deprecated and was removed in memory-centric transformation');

  return {
    content: [
      {
        type: 'text',
        text: `⚠️ **TODO Management Tool Deprecated**

This tool (manageTodoV2) has been deprecated and is no longer functional.

**Replacement:** Use the external \`mcp-shrimp-task-manager\` for task management:
- Task planning and breaking down
- Task tracking and status updates
- Task dependencies and priorities
- Task completion and verification

**Migration:** The system has moved to a memory-centric architecture where task management is handled by external MCP servers rather than internal JSON files.

**Error:** TodoJsonManager was removed - use mcp-shrimp-task-manager for task management`,
      },
    ],
    isError: false,
  };
}
