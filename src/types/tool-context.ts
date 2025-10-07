/**
 * Tool Context for MCP Protocol
 *
 * Provides logging and progress notification capabilities to tools,
 * following MCP best practices for real-time user feedback.
 *
 * @see https://modelcontextprotocol.io/docs/concepts/tools
 */

/**
 * Context passed to tool implementations for logging and progress reporting
 *
 * @example
 * ```typescript
 * async function myTool(args: MyArgs, context: ToolContext) {
 *   context.info('Starting operation...');
 *   // ... do work ...
 *   context.report_progress(50, 100);
 *   // ... more work ...
 *   context.info('Operation complete');
 * }
 * ```
 */
export interface ToolContext {
  /**
   * Send an informational log message to the client
   * @param message - Log message to display
   */
  info(message: string): void;

  /**
   * Report progress on long-running operations
   * @param progress - Current progress value
   * @param total - Optional total value for percentage calculation
   */
  report_progress(progress: number, total?: number): void;

  /**
   * Send a warning log message to the client
   * @param message - Warning message to display
   */
  warn?(message: string): void;

  /**
   * Send an error log message to the client
   * @param message - Error message to display
   */
  error?(message: string): void;
}

/**
 * Create a no-op context for tools that don't support progress
 */
export function createNoOpContext(): ToolContext {
  return {
    info: () => {},
    report_progress: () => {},
    warn: () => {},
    error: () => {},
  };
}
