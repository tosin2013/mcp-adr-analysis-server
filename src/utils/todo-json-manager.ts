/**
 * DEPRECATED: Todo JSON Manager removed in memory-centric transformation
 * This is a stub file to prevent import errors
 */

export class TodoJsonManager {
  constructor() {
    console.warn(
      '⚠️ TodoJsonManager is deprecated and was removed in memory-centric transformation'
    );
  }

  async loadTodoData() {
    throw new Error(
      'TodoJsonManager was removed - use mcp-shrimp-task-manager for task management'
    );
  }

  async saveTodoData() {
    throw new Error(
      'TodoJsonManager was removed - use mcp-shrimp-task-manager for task management'
    );
  }
}
