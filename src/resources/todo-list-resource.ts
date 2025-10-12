/**
 * Todo List Resource
 * Provides access to project task list with status and dependencies
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { McpAdrError } from '../types/index.js';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';

export interface TodoTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  dependencies?: string[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Parse TODO.md markdown file into structured task data
 */
function parseTodoMarkdown(content: string): TodoTask[] {
  const todos: TodoTask[] = [];
  const lines = content.split('\n');

  let currentTask: Partial<TodoTask> | null = null;
  let taskCounter = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Parse task line: ## Task Title
    if (trimmed.startsWith('## ')) {
      if (currentTask) {
        todos.push(currentTask as TodoTask);
      }

      const title = trimmed.substring(3).trim();
      taskCounter++;
      currentTask = {
        id: `task-${taskCounter}`,
        title,
        status: 'pending',
      };
      continue;
    }

    // Parse status
    if (trimmed.startsWith('**Status:**') && currentTask) {
      const status = trimmed.substring(11).trim().toLowerCase();
      if (status.includes('progress')) {
        currentTask.status = 'in_progress';
      } else if (status.includes('completed')) {
        currentTask.status = 'completed';
      } else {
        currentTask.status = 'pending';
      }
      continue;
    }

    // Parse priority
    if (trimmed.startsWith('**Priority:**') && currentTask) {
      const priority = trimmed.substring(13).trim().toLowerCase();
      if (priority.includes('critical')) {
        currentTask.priority = 'critical';
      } else if (priority.includes('high')) {
        currentTask.priority = 'high';
      } else if (priority.includes('low')) {
        currentTask.priority = 'low';
      } else {
        currentTask.priority = 'medium';
      }
      continue;
    }

    // Parse description (plain text lines)
    if (
      currentTask &&
      !trimmed.startsWith('**') &&
      !trimmed.startsWith('#') &&
      trimmed.length > 0
    ) {
      currentTask.description = (currentTask.description || '') + '\n' + trimmed;
    }
  }

  // Add last task
  if (currentTask) {
    todos.push(currentTask as TodoTask);
  }

  return todos;
}

/**
 * Generate comprehensive todo list resource with task management and progress tracking.
 *
 * Parses the project's `todo.md` file and extracts structured task information including
 * status, priority, assignees, and dependencies. Provides aggregated statistics for
 * project planning and progress monitoring.
 *
 * **File Location:** `{projectRoot}/todo.md`
 *
 * **Supported Task Statuses:**
 * - pending: Task not yet started
 * - in_progress: Task currently being worked on
 * - completed: Task finished
 *
 * **Supported Priorities:**
 * - critical: Must be done immediately
 * - high: Important, should be done soon
 * - medium: Normal priority
 * - low: Can be deferred
 *
 * @returns Promise resolving to resource generation result containing:
 *   - data: Complete todo list with tasks array and summary statistics
 *   - contentType: "application/json"
 *   - lastModified: ISO timestamp of generation
 *   - cacheKey: "todo-list:current"
 *   - ttl: Cache duration (120 seconds / 2 minutes)
 *   - etag: Entity tag for cache validation
 *
 * @throws {McpAdrError} When todo list generation fails due to:
 *   - RESOURCE_GENERATION_ERROR: Parse errors in todo.md format
 *   - Cache operation failures
 *
 * @example
 * ```typescript
 * const todoList = await generateTodoListResource();
 *
 * console.log(`Total tasks: ${todoList.data.summary.total}`);
 * console.log(`Completed: ${todoList.data.summary.completed}`);
 * console.log(`In progress: ${todoList.data.summary.inProgress}`);
 * console.log(`Completion rate: ${(todoList.data.summary.completed / todoList.data.summary.total * 100).toFixed(1)}%`);
 *
 * // Filter critical tasks
 * const criticalTasks = todoList.data.tasks.filter(t => t.priority === 'critical' && t.status !== 'completed');
 * console.log(`Critical tasks remaining: ${criticalTasks.length}`);
 *
 * // Expected output structure:
 * {
 *   data: {
 *     version: "1.0.0",
 *     timestamp: "2025-10-12T17:00:00.000Z",
 *     source: "/project/todo.md",
 *     summary: {
 *       total: 25,
 *       pending: 10,
 *       inProgress: 5,
 *       completed: 10,
 *       byPriority: { critical: 2, high: 8, medium: 10, low: 5 }
 *     },
 *     tasks: [
 *       {
 *         id: "task-001",
 *         title: "Implement user authentication",
 *         status: "in_progress",
 *         priority: "high",
 *         assignee: "developer@example.com",
 *         dueDate: "2025-10-20",
 *         dependencies: ["task-002"]
 *       }
 *     ]
 *   },
 *   contentType: "application/json",
 *   cacheKey: "todo-list:current",
 *   ttl: 120
 * }
 * ```
 *
 * @since v2.0.0
 * @see {@link parseTodoMarkdown} for todo.md parsing logic
 */
export async function generateTodoListResource(): Promise<ResourceGenerationResult> {
  try {
    const cacheKey = 'todo-list:current';

    // Check cache
    const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const todoPath = path.resolve(process.cwd(), 'todo.md');
    let todos: TodoTask[] = [];

    try {
      const todoContent = await fs.readFile(todoPath, 'utf-8');
      todos = parseTodoMarkdown(todoContent);
    } catch {
      // Todo file may not exist, return empty list
      console.warn(`[TodoListResource] Todo file not found at ${todoPath}`);
    }

    const todoListData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      source: todoPath,
      summary: {
        total: todos.length,
        pending: todos.filter(t => t.status === 'pending').length,
        inProgress: todos.filter(t => t.status === 'in_progress').length,
        completed: todos.filter(t => t.status === 'completed').length,
        byPriority: {
          critical: todos.filter(t => t.priority === 'critical').length,
          high: todos.filter(t => t.priority === 'high').length,
          medium: todos.filter(t => t.priority === 'medium').length,
          low: todos.filter(t => t.priority === 'low').length,
        },
      },
      todos,
    };

    const result: ResourceGenerationResult = {
      data: todoListData,
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 60, // 1 minute cache (tasks change frequently)
      etag: generateETag(todoListData),
    };

    // Cache result
    resourceCache.set(cacheKey, result, result.ttl);

    return result;
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate todo list resource: ${error instanceof Error ? error.message : String(error)}`,
      'RESOURCE_GENERATION_ERROR'
    );
  }
}
