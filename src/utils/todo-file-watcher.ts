/**
 * @deprecated This utility was removed as part of memory-centric architecture transformation.
 * Please migrate to mcp-shrimp-task-manager for task management.
 * For architectural memory, use the new memory-centric tools.
 * Migration guide: https://github.com/tosin2013/mcp-adr-analysis-server/docs/migration.md
 */

export class TodoFileWatcher {
  constructor() {
    console.warn(
      '⚠️ TodoFileWatcher is deprecated and will be removed in v2.0.0.\n' +
        '   Please migrate to mcp-shrimp-task-manager: https://github.com/tosin2013/mcp-shrimp-task-manager\n' +
        '   See migration guide: /docs/migration.md'
    );
    throw new Error(
      'TodoFileWatcher was removed - use mcp-shrimp-task-manager for task management'
    );
  }

  watch() {
    throw new Error(
      'TodoFileWatcher was removed - use mcp-shrimp-task-manager for task management'
    );
  }

  stop() {
    throw new Error(
      'TodoFileWatcher was removed - use mcp-shrimp-task-manager for task management'
    );
  }

  static create() {
    throw new Error(
      'TodoFileWatcher was removed - use mcp-shrimp-task-manager for task management'
    );
  }
}

export default TodoFileWatcher;
