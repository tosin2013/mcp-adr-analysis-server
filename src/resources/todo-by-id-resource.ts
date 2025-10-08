/**
 * Todo by Task ID Resource - Individual task details
 * URI Pattern: adr://todo/{task_id}
 */

import { URLSearchParams } from 'url';
import * as fs from 'fs/promises';
import * as path from 'path';
import { McpAdrError } from '../types/index.js';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';
import { resourceRouter } from './resource-router.js';

// Reuse TodoTask interface from todo-list-resource
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

export interface DetailedTodoTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  createdAt?: string;
  updatedAt?: string;
  dependencies: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  blockedBy: Array<{
    id: string;
    title: string;
    reason: string;
  }>;
  relatedAdrs: string[];
  history: Array<{
    timestamp: string;
    action: string;
    details: string;
  }>;
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
    if (currentTask && !trimmed.startsWith('**') && !trimmed.startsWith('#') && trimmed.length > 0) {
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
 * Resolve task dependencies with full details
 */
async function resolveDependencies(
  task: TodoTask,
  allTasks: TodoTask[]
): Promise<Array<{ id: string; title: string; status: string }>> {
  if (!task.dependencies || task.dependencies.length === 0) {
    return [];
  }

  return task.dependencies
    .map(depId => {
      const dep = allTasks.find(t => t.id === depId);
      return dep ? { id: dep.id, title: dep.title, status: dep.status } : null;
    })
    .filter(dep => dep !== null) as Array<{ id: string; title: string; status: string }>;
}

/**
 * Find tasks that are blocking this task
 */
async function findBlockingTasks(
  task: TodoTask,
  allTasks: TodoTask[]
): Promise<Array<{ id: string; title: string; reason: string }>> {
  const blocking: Array<{ id: string; title: string; reason: string }> = [];

  if (!task.dependencies || task.dependencies.length === 0) {
    return blocking;
  }

  for (const depId of task.dependencies) {
    const dep = allTasks.find(t => t.id === depId);
    if (dep && dep.status !== 'completed') {
      blocking.push({
        id: dep.id,
        title: dep.title,
        reason: `Dependency not completed (status: ${dep.status})`,
      });
    }
  }

  return blocking;
}

/**
 * Find ADRs related to this task
 */
async function findRelatedAdrs(task: TodoTask): Promise<string[]> {
  // TODO: Implement actual ADR relationship detection
  // For now, extract ADR references from description
  const relatedAdrs: string[] = [];

  if (task.description) {
    const adrReferences = task.description.match(/ADR[-\s]?(\d+)/gi);
    if (adrReferences) {
      relatedAdrs.push(...adrReferences.map(ref => ref.trim()));
    }
  }

  return [...new Set(relatedAdrs)];
}

/**
 * Get task history (placeholder - would require history tracking)
 */
async function getTaskHistory(_taskId: string): Promise<Array<{
  timestamp: string;
  action: string;
  details: string;
}>> {
  // TODO: Implement actual task history tracking
  // For now, return placeholder history
  return [
    {
      timestamp: new Date().toISOString(),
      action: 'created',
      details: 'Task created from todo.md',
    },
  ];
}

/**
 * Generate todo by task ID resource
 */
export async function generateTodoByIdResource(
  params: Record<string, string>,
  _searchParams: URLSearchParams
): Promise<ResourceGenerationResult> {
  const task_id = params['task_id'];

  if (!task_id) {
    throw new McpAdrError('Missing required parameter: task_id', 'INVALID_PARAMS');
  }

  const cacheKey = `todo-task:${task_id}`;

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  const todoPath = path.resolve(process.cwd(), 'todo.md');

  let todoContent: string;
  try {
    todoContent = await fs.readFile(todoPath, 'utf-8');
  } catch (error) {
    throw new McpAdrError(
      `Todo file not found at ${todoPath}`,
      'RESOURCE_NOT_FOUND'
    );
  }

  const todos = parseTodoMarkdown(todoContent);

  // Find task by ID or title match
  const task = todos.find(
    t => t.id === task_id || t.title.toLowerCase().includes(task_id.toLowerCase())
  );

  if (!task) {
    throw new McpAdrError(`Task not found: ${task_id}`, 'RESOURCE_NOT_FOUND');
  }

  // Build detailed task data
  const detailedTask: DetailedTodoTask = {
    ...task,
    dependencies: await resolveDependencies(task, todos),
    blockedBy: await findBlockingTasks(task, todos),
    relatedAdrs: await findRelatedAdrs(task),
    history: await getTaskHistory(task_id),
  };

  const result: ResourceGenerationResult = {
    data: detailedTask,
    contentType: 'application/json',
    lastModified: new Date().toISOString(),
    cacheKey,
    ttl: 60, // 1 minute cache (tasks change frequently)
    etag: generateETag(detailedTask),
  };

  // Cache result
  resourceCache.set(cacheKey, result, result.ttl);

  return result;
}

// Register route
resourceRouter.register(
  '/todo/{task_id}',
  generateTodoByIdResource,
  'Individual task details by ID or title match'
);
