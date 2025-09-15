/**
 * DEPRECATED: Todo JSON schemas removed in memory-centric transformation
 * This is a stub file to prevent import errors
 */

export interface TodoJsonData {
  version: string;
  metadata: {
    lastUpdated: string;
    totalTasks: number;
    completedTasks: number;
  };
  tasks: any[];
}

// Export empty stubs for compatibility
export const TODO_JSON_SCHEMA = {};
export const TASK_SCHEMA = {};
export const TODO_METADATA_SCHEMA = {};
