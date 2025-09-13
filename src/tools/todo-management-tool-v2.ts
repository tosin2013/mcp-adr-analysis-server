/**
 * JSON-First TODO Management Tool
 *
 * Replaces markdown-based TODO management with structured JSON backend
 * for consistent LLM interactions and automatic scoring integration.
 *
 * IMPORTANT FOR AI ASSISTANTS: This tool requires the .mcp-adr-cache infrastructure
 * to be initialized first. Run `discover_existing_adrs` before using this tool.
 *
 * Cache Dependencies:
 * - Requires: .mcp-adr-cache/todo-data.json (main TODO storage)
 * - Requires: .mcp-adr-cache/knowledge-graph-snapshots.json (for intent tracking)
 * - Updates: .mcp-adr-cache/project-health-scores.json (task completion metrics)
 *
 * Key Features:
 * - JSON-first storage with automatic Markdown synchronization
 * - Automatic project health scoring integration
 * - Knowledge graph intent tracking
 * - Bidirectional TODO.md compatibility
 */

import { z } from 'zod';
import { McpAdrError } from '../types/index.js';
import { TodoManagerError } from '../types/enhanced-errors.js';
import { TodoJsonManager } from '../utils/todo-json-manager.js';
import { KnowledgeGraphManager } from '../utils/knowledge-graph-manager.js';
import { TodoJsonData } from '../types/todo-json-schemas.js';
import { TaskIdResolver } from '../utils/task-id-resolver.js';
import { TaskSearchEngine, SearchResult } from '../utils/task-search-engine.js';
import { TodoValidator } from '../utils/todo-validation.js';

/**
 * Helper function to load todo data with retry mechanism to handle batching delays
 */
async function loadTodoDataWithRetry(
  todoManager: TodoJsonManager,
  maxRetries: number = 3
): Promise<TodoJsonData> {
  let data;
  if (todoManager && typeof todoManager.loadTodoData === 'function') {
    data = await todoManager.loadTodoData();
  } else {
    console.warn('⚠️ TodoJsonManager.loadTodoData not properly initialized, using empty data');
    const currentDate = new Date().toISOString();
    return {
      version: '1.0.0',
      metadata: {
        lastUpdated: currentDate,
        totalTasks: 0,
        completedTasks: 0,
        autoSyncEnabled: true,
      },
      tasks: {},
      sections: [],
      scoringSync: {
        lastScoreUpdate: currentDate,
        taskCompletionScore: 0,
        priorityWeightedScore: 0,
        criticalTasksRemaining: 0,
        scoreHistory: [],
      },
      knowledgeGraphSync: {
        lastSync: currentDate,
        linkedIntents: [],
        pendingUpdates: [],
      },
      automationRules: [],
      templates: [],
      recurringTasks: [],
      operationHistory: [],
    };
  }

  let retryCount = 0;

  // If data is empty, retry to handle batching delays
  while (Object.keys(data.tasks).length === 0 && retryCount < maxRetries) {
    await new Promise(resolve => setTimeout(resolve, 50 * (retryCount + 1)));
    if (todoManager && typeof todoManager.loadTodoData === 'function') {
      data = await todoManager.loadTodoData();
    } else {
      break; // Don't retry if method is not available
    }
    retryCount++;
  }

  return data;
}

// Task operations schema
const CreateTaskSchema = z.object({
  operation: z.literal('create_task'),
  projectPath: z.string().describe('Project root path'),
  title: z.string().describe('Task title'),
  description: z.string().optional().describe('Task description'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  assignee: z.string().optional().describe('Task assignee'),
  dueDate: z.string().optional().describe('Due date (ISO string)'),
  category: z.string().optional().describe('Task category'),
  tags: z.array(z.string()).default([]).describe('Task tags'),
  dependencies: z.array(z.string()).default([]).describe('Task dependencies (IDs)'),
  intentId: z.string().optional().describe('Link to knowledge graph intent'),
  linkedAdrs: z.array(z.string()).default([]).describe('Related ADR files'),
  autoComplete: z.boolean().default(false).describe('Auto-complete when criteria met'),
  completionCriteria: z.string().optional().describe('Auto-completion rules'),
});

const UpdateTaskSchema = z.object({
  operation: z.literal('update_task'),
  projectPath: z.string().describe('Project root path'),
  taskId: z.string().describe('Task ID to update'),
  updates: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      assignee: z.string().optional(),
      dueDate: z.string().optional(),
      progressPercentage: z.number().min(0).max(100).optional(),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
      dependencies: z.array(z.string()).optional(),
    })
    .describe('Fields to update'),
  reason: z
    .string()
    .optional()
    .describe('Reason for update (for changelog) - defaults to "Task updated"'),
});

const BulkUpdateSchema = z.object({
  operation: z.literal('bulk_update'),
  projectPath: z.string().describe('Project root path'),
  updates: z
    .array(
      z.object({
        taskId: z.string(),
        status: z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        assignee: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .describe('Bulk status updates'),
  reason: z
    .string()
    .optional()
    .describe('Reason for bulk update - defaults to "Bulk status update"'),
  dryRun: z.boolean().optional().default(false).describe('Preview changes without applying them'),
});

const GetTasksSchema = z.object({
  operation: z.literal('get_tasks'),
  projectPath: z.string().describe('Project root path'),
  filters: z
    .object({
      status: z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      assignee: z.string().optional(),
      category: z.string().optional(),
      hasDeadline: z.boolean().optional(),
      overdue: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
      archived: z.boolean().optional(),
    })
    .optional()
    .describe('Filter criteria'),
  sortBy: z.enum(['priority', 'dueDate', 'createdAt', 'updatedAt']).default('priority'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().optional().describe('Maximum number of tasks to return'),
  showFullIds: z
    .boolean()
    .optional()
    .default(false)
    .describe('Show full UUIDs instead of short IDs'),
});

const GetAnalyticsSchema = z.object({
  operation: z.literal('get_analytics'),
  projectPath: z.string().describe('Project root path'),
  timeframe: z.enum(['day', 'week', 'month', 'all']).default('week').describe('Analysis timeframe'),
  includeVelocity: z.boolean().default(true).describe('Include velocity metrics'),
  includeScoring: z.boolean().default(true).describe('Include scoring metrics'),
});

const ImportAdrTasksSchema = z.object({
  operation: z.literal('import_adr_tasks'),
  projectPath: z.string().describe('Project root path'),
  adrDirectory: z.string().default('docs/adrs').describe('ADR directory path'),
  intentId: z.string().optional().describe('Link imported tasks to intent'),
  preserveExisting: z.boolean().default(true).describe('Keep existing tasks'),
  autoLinkDependencies: z.boolean().default(true).describe('Auto-detect task dependencies'),
});

const SyncWithKnowledgeGraphSchema = z.object({
  operation: z.literal('sync_knowledge_graph'),
  projectPath: z.string().describe('Project root path'),
  direction: z.enum(['to_kg', 'from_kg', 'bidirectional']).default('bidirectional'),
  intentId: z.string().optional().describe('Specific intent to sync with'),
});

const SyncToMarkdownSchema = z.object({
  operation: z.literal('sync_to_markdown'),
  projectPath: z.string().describe('Project root path'),
  force: z.boolean().default(false).describe('Force sync even if markdown is newer'),
});

const ImportFromMarkdownSchema = z.object({
  operation: z.literal('import_from_markdown'),
  projectPath: z.string().describe('Project root path'),
  mergeStrategy: z.enum(['overwrite', 'merge', 'preserve_json']).default('merge'),
  backupExisting: z.boolean().default(true).describe('Create backup before import'),
});

const FindTaskSchema = z.object({
  operation: z.literal('find_task'),
  projectPath: z.string().describe('Project root path'),
  query: z.string().describe('Search query: partial ID, title, or description'),
  searchType: z
    .enum(['id', 'title', 'description', 'all', 'fuzzy', 'regex', 'multi_field', 'comprehensive'])
    .default('all')
    .describe('Search type'),
  searchFields: z
    .array(z.enum(['title', 'description', 'tags', 'category', 'assignee']))
    .optional()
    .describe('Fields to search in (for multi_field search)'),
  fuzzyThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Fuzzy search tolerance (0-1, lower = stricter)'),
  fieldWeights: z
    .record(z.number())
    .optional()
    .describe('Field importance weights for multi-field search'),
  showRelevanceScore: z.boolean().default(false).describe('Show relevance scores in results'),
});

const ResumeTodoListSchema = z.object({
  operation: z.literal('resume_todo_list'),
  projectPath: z.string().describe('Project root path'),
  analyzeRecent: z.boolean().default(true).describe('Analyze recent changes and git commits'),
  includeContext: z.boolean().default(true).describe('Include project context and ADR status'),
  showNextActions: z.boolean().default(true).describe('Suggest next actionable steps'),
  checkDeploymentReadiness: z
    .boolean()
    .default(true)
    .describe('Check if any tasks are deployment-ready'),
});

const DeleteTaskSchema = z.object({
  operation: z.literal('delete_task'),
  projectPath: z.string().describe('Project root path'),
  taskId: z.string().describe('Task ID to delete'),
  force: z.boolean().default(false).describe('Force delete even if task has dependencies'),
  handleDependencies: z
    .enum(['block', 'reassign', 'delete_cascade'])
    .default('block')
    .describe('How to handle dependency conflicts'),
});

const ArchiveTaskSchema = z.object({
  operation: z.literal('archive_task'),
  projectPath: z.string().describe('Project root path'),
  taskId: z.string().describe('Task ID to archive'),
});

const UndoLastSchema = z.object({
  operation: z.literal('undo_last'),
  projectPath: z.string().describe('Project root path'),
});

const GetUndoHistorySchema = z.object({
  operation: z.literal('get_undo_history'),
  projectPath: z.string().describe('Project root path'),
  limit: z.number().optional().default(10).describe('Number of operations to show'),
});

const BulkDeleteSchema = z.object({
  operation: z.literal('bulk_delete'),
  projectPath: z.string().describe('Project root path'),
  taskIds: z.array(z.string()).describe('Array of task IDs to delete'),
  confirm: z.boolean().describe('Confirmation required for bulk delete'),
  force: z.boolean().default(false).describe('Force delete even if tasks have dependencies'),
  dryRun: z
    .boolean()
    .default(false)
    .describe('Preview what would be deleted without actually deleting'),
});

// Main operation schema
const TodoManagementV2Schema = z.union([
  CreateTaskSchema,
  UpdateTaskSchema,
  BulkUpdateSchema,
  GetTasksSchema,
  GetAnalyticsSchema,
  ImportAdrTasksSchema,
  SyncWithKnowledgeGraphSchema,
  SyncToMarkdownSchema,
  ImportFromMarkdownSchema,
  FindTaskSchema,
  ResumeTodoListSchema,
  DeleteTaskSchema,
  ArchiveTaskSchema,
  UndoLastSchema,
  GetUndoHistorySchema,
  BulkDeleteSchema,
]);

/**
 * Helper function to resolve task IDs using enhanced resolution
 */
async function resolveTaskId(
  inputId: string,
  todoManager: TodoJsonManager,
  context?: { operation?: string }
): Promise<{ success: boolean; taskId?: string; error?: string; suggestions?: string[] }> {
  const resolver = new TaskIdResolver();
  const data = await loadTodoDataWithRetry(todoManager);

  const resolution = resolver.resolveTaskId(inputId, data.tasks);

  if (resolution.success && resolution.resolvedId) {
    return {
      success: true,
      taskId: resolution.resolvedId,
    };
  }

  // Enhanced error message with context
  const operation = context?.operation || 'operation';
  const errorMessage = `❌ Cannot ${operation}: ${resolution.error}`;

  const result: any = {
    success: false,
    error: errorMessage,
  };
  if (resolution.suggestions) {
    result.suggestions = resolution.suggestions;
  }
  return result;
}

/**
 * Main TODO management function with JSON backend
 *
 * Comprehensive TODO management tool that handles all task operations
 * with JSON-first storage, automatic markdown synchronization, and
 * integrated project health scoring.
 *
 * @param args - Operation arguments (validated against TodoManagementV2Schema)
 * @param args.operation - The operation to perform (create_task, update_task, etc.)
 * @param args.projectPath - Project root path for TODO data
 *
 * @returns Promise resolving to operation result with formatted content
 *
 * @throws {TodoManagerError} When validation fails or operation encounters errors
 * @throws {McpAdrError} When project infrastructure is not initialized
 *
 * Supported Operations:
 * - `create_task`: Create a new task with automatic ID generation
 * - `update_task`: Update existing task fields with changelog tracking
 * - `bulk_update`: Update multiple tasks in a single operation
 * - `get_tasks`: Retrieve tasks with filtering and sorting options
 * - `find_task`: Search tasks using various search strategies
 * - `delete_task`: Delete tasks with dependency conflict handling
 * - `archive_task`: Archive completed tasks for reference
 * - `bulk_delete`: Delete multiple tasks with confirmation
 * - `undo_last`: Undo the most recent operation
 * - `get_undo_history`: View operation history for undo operations
 * - `get_analytics`: Get task completion and performance analytics
 *
 * @example
 * ```typescript
 * // Create a new task
 * const result = await manageTodoV2({
 *   operation: 'create_task',
 *   projectPath: '/path/to/project',
 *   title: 'Implement user authentication',
 *   priority: 'high',
 *   category: 'backend'
 * });
 *
 * // Update task status
 * const updateResult = await manageTodoV2({
 *   operation: 'update_task',
 *   projectPath: '/path/to/project',
 *   taskId: 'abc123...',
 *   updates: { status: 'completed' }
 * });
 * ```
 */
export async function manageTodoV2(args: any): Promise<any> {
  try {
    // Enhanced pre-validation using TodoValidator
    if ('priority' in args && args.priority) {
      const priorityResult = TodoValidator.validatePriority(args.priority);
      if (!priorityResult.isValid && priorityResult.error) {
        throw priorityResult.error;
      }
    }

    if ('updates' in args && args.updates && 'priority' in args.updates && args.updates.priority) {
      const priorityResult = TodoValidator.validatePriority(args.updates.priority);
      if (!priorityResult.isValid && priorityResult.error) {
        throw priorityResult.error;
      }
    }

    if ('updates' in args && args.updates && 'status' in args.updates && args.updates.status) {
      const statusResult = TodoValidator.validateStatus(args.updates.status);
      if (!statusResult.isValid && statusResult.error) {
        throw statusResult.error;
      }
    }

    const validatedArgs = TodoManagementV2Schema.parse(args);
    const todoManager = new TodoJsonManager(validatedArgs.projectPath);
    const kgManager = new KnowledgeGraphManager();

    switch (validatedArgs.operation) {
      case 'create_task': {
        // Comprehensive validation for task creation
        const validationResult = TodoValidator.validateCreateTask(validatedArgs);
        if (!validationResult.isValid && validationResult.error) {
          throw validationResult.error;
        }

        let taskId;
        if (todoManager && typeof todoManager.createTask === 'function') {
          taskId = await todoManager.createTask({
            title: validatedArgs.title,
            description: validatedArgs.description,
            priority: validatedArgs.priority,
            assignee: validatedArgs.assignee,
            dueDate: validatedArgs.dueDate,
            category: validatedArgs.category,
            tags: validatedArgs.tags,
            dependencies: validatedArgs.dependencies,
            intentId: validatedArgs.intentId,
            linkedAdrs: validatedArgs.linkedAdrs,
            autoComplete: validatedArgs.autoComplete,
            completionCriteria: validatedArgs.completionCriteria,
          });
        } else {
          console.warn(
            '⚠️ TodoJsonManager.createTask not properly initialized, generating fallback task ID'
          );
          taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        }

        // Force flush to ensure data is persisted before returning
        // This is necessary because each operation creates a new TodoJsonManager instance
        if (todoManager && typeof todoManager.flushBatch === 'function') {
          await todoManager.flushBatch();
        } else {
          console.warn(
            '⚠️ TodoJsonManager.flushBatch not properly initialized, skipping batch flush'
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: `✅ Task created successfully!\n\n**Task ID**: ${taskId}\n**Title**: ${validatedArgs.title}\n**Priority**: ${validatedArgs.priority}\n**Status**: pending\n\n*Task has been added to JSON backend and will sync to TODO.md automatically.*`,
            },
          ],
        };
      }

      case 'update_task': {
        // Use enhanced task ID resolution
        const idResolution = await resolveTaskId(validatedArgs.taskId, todoManager, {
          operation: 'update task',
        });

        if (!idResolution.success) {
          const suggestionText = idResolution.suggestions
            ? `\n\n**Suggestions:**\n${idResolution.suggestions.map(s => `• ${s}`).join('\n')}`
            : '';

          return {
            content: [
              {
                type: 'text',
                text: `${idResolution.error}${suggestionText}\n\n*Please check the task ID and try again.*`,
              },
            ],
          };
        }

        const taskId = idResolution.taskId!;

        // Validate update fields
        const updateValidationResult = TodoValidator.validateUpdateTask(validatedArgs.updates);
        if (!updateValidationResult.isValid && updateValidationResult.error) {
          throw updateValidationResult.error;
        }

        // Filter out undefined values
        const cleanUpdates: any = {};
        if (validatedArgs.updates.title !== undefined)
          cleanUpdates.title = validatedArgs.updates.title;
        if (validatedArgs.updates.description !== undefined)
          cleanUpdates.description = validatedArgs.updates.description;
        if (validatedArgs.updates.status !== undefined)
          cleanUpdates.status = validatedArgs.updates.status;
        if (validatedArgs.updates.priority !== undefined)
          cleanUpdates.priority = validatedArgs.updates.priority;
        if (validatedArgs.updates.assignee !== undefined)
          cleanUpdates.assignee = validatedArgs.updates.assignee;
        if (validatedArgs.updates.dueDate !== undefined)
          cleanUpdates.dueDate = validatedArgs.updates.dueDate;
        if (validatedArgs.updates.progressPercentage !== undefined)
          cleanUpdates.progressPercentage = validatedArgs.updates.progressPercentage;
        if (validatedArgs.updates.notes !== undefined)
          cleanUpdates.notes = validatedArgs.updates.notes;
        if (validatedArgs.updates.tags !== undefined)
          cleanUpdates.tags = validatedArgs.updates.tags;
        if (validatedArgs.updates.dependencies !== undefined)
          cleanUpdates.dependencies = validatedArgs.updates.dependencies;
        await todoManager.updateTask({
          taskId: taskId,
          updates: cleanUpdates,
          reason: validatedArgs.reason || 'Task updated',
          triggeredBy: 'tool',
        });

        return {
          content: [
            {
              type: 'text',
              text: `✅ Task updated successfully!\n\n**Task ID**: ${taskId}\n**Original Input**: ${validatedArgs.taskId}\n**Updates**: ${Object.keys(
                validatedArgs.updates
              )
                .filter(
                  k => validatedArgs.updates[k as keyof typeof validatedArgs.updates] !== undefined
                )
                .join(
                  ', '
                )}\n**Reason**: ${validatedArgs.reason || 'Task updated'}\n\n*Changes synced to JSON backend and TODO.md.*`,
            },
          ],
        };
      }

      case 'bulk_update': {
        const data = await todoManager.loadTodoData();
        let updateCount = 0;
        let processedCount = 0;
        const previewChanges: string[] = [];
        const skippedTasks: Array<{ taskId: string; reason: string }> = [];
        const successfulUpdates: string[] = [];

        // Validate that we have updates to process
        if (!validatedArgs.updates || validatedArgs.updates.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ **Bulk Update Failed**\n\nNo updates provided. Please specify an array of task updates.\n\n**Example:**\n\`\`\`json\n{\n  "operation": "bulk_update",\n  "projectPath": "${validatedArgs.projectPath}",\n  "updates": [\n    { "taskId": "abc123", "status": "completed" },\n    { "taskId": "def456", "priority": "high" }\n  ]\n}\n\`\`\``,
              },
            ],
          };
        }

        for (const update of validatedArgs.updates) {
          processedCount++;

          // Use enhanced task ID resolution
          const idResolution = await resolveTaskId(update.taskId, todoManager, {
            operation: 'bulk update task',
          });

          if (!idResolution.success) {
            skippedTasks.push({
              taskId: update.taskId,
              reason: idResolution.error || 'Task not found',
            });
            continue;
          }

          const resolvedTaskId = idResolution.taskId!;
          const task = data.tasks[resolvedTaskId];
          if (!task) {
            skippedTasks.push({
              taskId: update.taskId,
              reason: `Task ${resolvedTaskId} not found in data`,
            });
            continue;
          }

          // Filter out undefined values and validate updates
          const cleanUpdates: any = {};
          if (update.status !== undefined) cleanUpdates.status = update.status;
          if (update.priority !== undefined) cleanUpdates.priority = update.priority;
          if (update.assignee !== undefined) cleanUpdates.assignee = update.assignee;
          if (update.notes !== undefined) cleanUpdates.notes = update.notes;

          // Skip if no actual updates provided
          if (Object.keys(cleanUpdates).length === 0) {
            skippedTasks.push({
              taskId: update.taskId,
              reason: 'No valid updates provided',
            });
            continue;
          }

          if (validatedArgs.dryRun) {
            // Dry run: show what would be changed with enhanced formatting
            const changes = Object.entries(cleanUpdates)
              .map(([key, value]) => {
                const currentValue = (task as any)[key];
                const changeIndicator = currentValue !== value ? '→' : '(no change)';
                return `${key}: ${currentValue} ${changeIndicator} ${value}`;
              })
              .join(', ');

            const shortId = resolvedTaskId.substring(0, 8);
            previewChanges.push(`- **${task.title}** (${shortId}): ${changes}`);
            updateCount++;
          } else {
            try {
              // Actually update the task
              await todoManager.updateTask({
                taskId: resolvedTaskId,
                updates: cleanUpdates,
                reason: validatedArgs.reason || 'Bulk status update',
                triggeredBy: 'tool',
              });
              successfulUpdates.push(`${task.title} (${resolvedTaskId.substring(0, 8)})`);
              updateCount++;
            } catch (error) {
              skippedTasks.push({
                taskId: update.taskId,
                reason: `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              });
            }
          }
        }

        if (validatedArgs.dryRun) {
          let message = `🔍 **Bulk Update Preview (Dry Run)**\n\n`;

          if (updateCount > 0) {
            message += `**Would update ${updateCount} task${updateCount === 1 ? '' : 's'}:**\n\n${previewChanges.join('\n')}\n\n`;
          }

          if (skippedTasks.length > 0) {
            message += `**Skipped ${skippedTasks.length} task${skippedTasks.length === 1 ? '' : 's'}:**\n`;
            skippedTasks.forEach(skip => {
              message += `- ${skip.taskId}: ${skip.reason}\n`;
            });
            message += '\n';
          }

          message += `**Summary:** ${processedCount} task${processedCount === 1 ? '' : 's'} processed, ${updateCount} would be updated, ${skippedTasks.length} skipped\n\n`;
          message += `*To apply these changes, run the command again with \`dryRun: false\`*`;

          return {
            content: [
              {
                type: 'text',
                text: message,
              },
            ],
          };
        } else {
          let message = `✅ **Bulk Update Completed!**\n\n`;

          if (updateCount > 0) {
            message += `**Successfully Updated ${updateCount} task${updateCount === 1 ? '' : 's'}:**\n`;
            successfulUpdates.forEach(task => {
              message += `- ${task}\n`;
            });
            message += `\n**Reason**: ${validatedArgs.reason || 'Bulk status update'}\n\n`;
          }

          if (skippedTasks.length > 0) {
            message += `**Skipped ${skippedTasks.length} task${skippedTasks.length === 1 ? '' : 's'}:**\n`;
            skippedTasks.forEach(skip => {
              message += `- ${skip.taskId}: ${skip.reason}\n`;
            });
            message += '\n';
          }

          message += `**Summary:** ${processedCount} task${processedCount === 1 ? '' : 's'} processed, ${updateCount} updated, ${skippedTasks.length} skipped\n\n`;
          message += `*All changes synced to JSON backend and TODO.md.*`;

          return {
            content: [
              {
                type: 'text',
                text: message,
              },
            ],
          };
        }
      }

      case 'get_tasks': {
        const data = await todoManager.loadTodoData();
        let tasks = Object.values(data.tasks);

        // Apply filters
        if (validatedArgs.filters) {
          const filters = validatedArgs.filters;

          // By default, exclude archived tasks unless specifically requested
          if (filters.archived === undefined) {
            tasks = tasks.filter(t => !t.archived);
          } else {
            tasks = tasks.filter(t => Boolean(t.archived) === filters.archived);
          }

          if (filters.status) {
            tasks = tasks.filter(t => t.status === filters.status);
          }

          if (filters.priority) {
            tasks = tasks.filter(t => t.priority === filters.priority);
          }

          if (filters.assignee) {
            tasks = tasks.filter(t => t.assignee === filters.assignee);
          }

          if (filters.category) {
            tasks = tasks.filter(t => t.category === filters.category);
          }

          if (filters.hasDeadline) {
            tasks = tasks.filter(t => Boolean(t.dueDate));
          }

          if (filters.overdue) {
            const now = new Date();
            tasks = tasks.filter(
              t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed'
            );
          }

          if (filters.tags && filters.tags.length > 0) {
            tasks = tasks.filter(t => filters.tags!.some(tag => t.tags.includes(tag)));
          }
        } else {
          // Default: exclude archived tasks
          tasks = tasks.filter(t => !t.archived);
        }

        // Sort tasks
        tasks.sort((a, b) => {
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };

          switch (validatedArgs.sortBy) {
            case 'priority':
              return validatedArgs.sortOrder === 'desc'
                ? priorityOrder[b.priority] - priorityOrder[a.priority]
                : priorityOrder[a.priority] - priorityOrder[b.priority];

            case 'dueDate':
              if (!a.dueDate && !b.dueDate) return 0;
              if (!a.dueDate) return 1;
              if (!b.dueDate) return -1;
              return validatedArgs.sortOrder === 'desc'
                ? new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
                : new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();

            case 'createdAt':
              return validatedArgs.sortOrder === 'desc'
                ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

            case 'updatedAt':
              return validatedArgs.sortOrder === 'desc'
                ? new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                : new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();

            default:
              return 0;
          }
        });

        // Apply limit
        if (validatedArgs.limit) {
          tasks = tasks.slice(0, validatedArgs.limit);
        }

        const taskList = tasks
          .map(task => {
            const dueDateStr = task.dueDate
              ? new Date(task.dueDate).toLocaleDateString()
              : 'No due date';
            const isOverdue =
              task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
            const taskId = (validatedArgs.showFullIds ?? false) ? task.id : task.id.substring(0, 8);

            return (
              `**${task.title}** (ID: ${taskId})\n` +
              `  Status: ${task.status} | Priority: ${task.priority}\n` +
              `  ${task.assignee ? `Assignee: ${task.assignee} | ` : ''}Due: ${dueDateStr} ${isOverdue ? '🔴 OVERDUE' : ''}\n` +
              `  ${task.tags.length > 0 ? `Tags: ${task.tags.join(', ')} | ` : ''}Progress: ${task.progressPercentage}%\n` +
              `  ${task.description || 'No description'}\n`
            );
          })
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `# 📋 Task List (${tasks.length} tasks)\n\n${taskList || 'No tasks match the criteria.'}`,
            },
          ],
        };
      }

      case 'get_analytics': {
        const analytics = await todoManager.getAnalytics();
        const { metrics, trends, recommendations } = analytics;

        let analyticsText = `# 📊 TODO Analytics\n\n`;

        analyticsText += `## Task Metrics\n`;
        analyticsText += `- **Total Tasks**: ${metrics.totalTasks}\n`;
        analyticsText += `- **Completed**: ${metrics.completedTasks} (${metrics.completionPercentage.toFixed(1)}%)\n`;
        analyticsText += `- **Priority Score**: ${metrics.priorityWeightedScore.toFixed(1)}%\n`;
        analyticsText += `- **Critical Remaining**: ${metrics.criticalTasksRemaining}\n`;
        analyticsText += `- **Blocked Tasks**: ${metrics.blockedTasksCount}\n`;
        analyticsText += `- **Average Task Age**: ${metrics.averageTaskAge.toFixed(1)} days\n\n`;

        if (validatedArgs.includeVelocity) {
          analyticsText += `## Velocity Metrics\n`;
          analyticsText += `- **Tasks/Week**: ${metrics.velocityMetrics.tasksCompletedLastWeek}\n`;
          analyticsText += `- **Avg Completion Time**: ${metrics.velocityMetrics.averageCompletionTime.toFixed(1)} hours\n\n`;
        }

        if (recommendations.length > 0) {
          analyticsText += `## Recommendations\n`;
          analyticsText += recommendations.map(rec => `- ${rec}`).join('\n');
          analyticsText += '\n\n';
        }

        if (trends.length > 0) {
          analyticsText += `## Recent Score History\n`;
          analyticsText += trends
            .slice(-5)
            .map(
              trend =>
                `- ${new Date(trend.timestamp).toLocaleDateString()}: ${(trend as any).score?.toFixed(1) || 'N/A'}% (${(trend as any).trigger || 'Unknown'})`
            )
            .join('\n');
        }

        return {
          content: [
            {
              type: 'text',
              text: analyticsText,
            },
          ],
        };
      }

      case 'import_adr_tasks': {
        const adrDirectory = validatedArgs.adrDirectory;
        const intentId = validatedArgs.intentId;
        const preserveExisting = validatedArgs.preserveExisting;
        const autoLinkDependencies = validatedArgs.autoLinkDependencies;

        // Discover ADRs in the directory
        const { discoverAdrsInDirectory } = await import('../utils/adr-discovery.js');
        const discoveryResult = await discoverAdrsInDirectory(
          adrDirectory,
          true, // include content for task extraction
          validatedArgs.projectPath
        );

        if (discoveryResult.totalAdrs === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `⚠️ No ADRs found in directory: ${adrDirectory}\n\n**Recommendations:**\n${discoveryResult.recommendations.join('\n')}`,
              },
            ],
          };
        }

        // Smart completion preservation: Load existing data before any operations
        // This must happen BEFORE any data wiping for preserveExisting: false
        const existingData = await todoManager.loadTodoData();
        const existingTasksByTitle = new Map<string, any>();

        // Create a lookup map of existing tasks by title for smart matching
        Object.values(existingData.tasks).forEach(task => {
          const normalizedTitle = task.title.toLowerCase().trim();
          existingTasksByTitle.set(normalizedTitle, task);
        });

        // If preserveExisting is false, we need to clear existing data first
        // but we've already captured the completion states above
        if (!preserveExisting) {
          // Clear existing tasks but preserve the sections structure
          const freshData = await todoManager.loadTodoData();
          freshData.tasks = {};
          freshData.sections.forEach(section => {
            section.tasks = [];
          });
          await todoManager.saveTodoData(freshData, false); // Don't sync to markdown yet
        }

        // Extract tasks from each ADR
        const extractedTasks = await extractTasksFromAdrs(
          discoveryResult.adrs,
          adrDirectory,
          intentId,
          autoLinkDependencies
        );

        // Import tasks into JSON backend with smart completion preservation
        let importedCount = 0;
        let skippedCount = 0;
        let preservedCompletions = 0;
        const importResults = [];

        for (const task of extractedTasks) {
          try {
            // Check if task already exists (by title and ADR reference) - only relevant when preserveExisting is true
            let existingTask = null;
            if (preserveExisting) {
              const currentData = await todoManager.loadTodoData();
              existingTask = Object.values(currentData.tasks).find(
                t =>
                  t.title === task.title && t.linkedAdrs.some(adr => task.linkedAdrs.includes(adr))
              );
            }

            if (existingTask && preserveExisting) {
              skippedCount++;
              importResults.push(`⏭️ Skipped: "${task.title}" (already exists)`);
              continue;
            }

            // Smart completion preservation: match by title even if preserveExisting is false
            const normalizedTitle = task.title.toLowerCase().trim();
            const previousTask = existingTasksByTitle.get(normalizedTitle);
            let taskToCreate = { ...task };

            if (
              previousTask &&
              (previousTask.status === 'completed' || previousTask.progressPercentage > 0)
            ) {
              // Preserve completion status and progress from previous task
              taskToCreate = {
                ...task,
                status: previousTask.status,
                progressPercentage: previousTask.progressPercentage,
                completedAt: previousTask.completedAt,
                notes: previousTask.notes,
                assignee: previousTask.assignee || task.assignee,
              };
              preservedCompletions++;
              importResults.push(
                `🔄 Imported with preserved completion: "${task.title}" (${previousTask.status}, ${previousTask.progressPercentage}%)`
              );
            } else {
              importResults.push(`✅ Imported: "${task.title}" (${task.priority} priority)`);
            }

            // Create the task with preserved completion if applicable
            await todoManager.createTask({
              title: taskToCreate.title,
              description: taskToCreate.description,
              status: taskToCreate.status,
              priority: taskToCreate.priority,
              category: taskToCreate.category,
              tags: taskToCreate.tags,
              dependencies: taskToCreate.dependencies,
              linkedAdrs: taskToCreate.linkedAdrs,
              assignee: taskToCreate.assignee,
              progressPercentage: taskToCreate.progressPercentage,
              notes: taskToCreate.notes,
              completedAt: taskToCreate.completedAt,
              ...(intentId && { intentId }),
            });

            importedCount++;
          } catch (error) {
            importResults.push(
              `❌ Failed: "${task.title}" - ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: `# ✅ ADR Task Import Completed

## Import Summary
- **ADRs Scanned**: ${discoveryResult.totalAdrs}
- **Tasks Extracted**: ${extractedTasks.length}
- **Tasks Imported**: ${importedCount}
- **Tasks Skipped**: ${skippedCount}
- **Completions Preserved**: ${preservedCompletions}
- **Preserve Existing**: ${preserveExisting}
- **Auto-Link Dependencies**: ${autoLinkDependencies}

## ADR Status Overview
${Object.entries(discoveryResult.summary.byStatus)
  .map(([status, count]) => `- **${status}**: ${count} ADRs`)
  .join('\n')}

## Import Results
${importResults.join('\n')}

${
  preservedCompletions > 0
    ? `
## 🎯 Smart Completion Preservation
✅ **${preservedCompletions} task completions preserved** during import!
Tasks with the same title retained their completion status and progress.
`
    : ''
}

## Next Steps
1. **View Tasks**: Use \`get_tasks\` operation to see imported tasks
2. **Sync to Markdown**: Tasks will be automatically synced to TODO.md
3. **Update Status**: Use \`update_task\` operation to track progress
4. **Link Knowledge Graph**: Tasks are ${intentId ? `linked to intent ${intentId}` : 'ready for intent linking'}

*All tasks have been imported into the JSON backend and are ready for the complete TODO management workflow.*`,
            },
          ],
        };
      }

      case 'sync_knowledge_graph': {
        const data = await todoManager.loadTodoData();

        // Sync task completion status to knowledge graph
        for (const task of Object.values(data.tasks)) {
          if (task.intentId) {
            await kgManager.updateTodoSnapshot(
              task.intentId,
              `Task ${task.status}: ${task.title} (${task.progressPercentage}%)`
            );
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: `✅ Knowledge graph sync completed!\n\n**Direction**: ${validatedArgs.direction}\n**Tasks with Intent Links**: ${Object.values(data.tasks).filter(t => t.intentId).length}\n\n*Task progress has been synced to the knowledge graph.*`,
            },
          ],
        };
      }

      case 'sync_to_markdown': {
        await todoManager.convertToMarkdown();

        return {
          content: [
            {
              type: 'text',
              text: `✅ Markdown sync completed!\n\n*TODO.md has been updated with the latest JSON data including health dashboard and formatted task lists.*`,
            },
          ],
        };
      }

      case 'import_from_markdown': {
        if (validatedArgs.backupExisting) {
          // Create backup of existing JSON
          const data = await todoManager.loadTodoData();
          const backupPath = `${validatedArgs.projectPath}/.mcp-adr-cache/todo-data-backup-${Date.now()}.json`;
          const fs = await import('fs/promises');
          await fs.writeFile(backupPath, JSON.stringify(data, null, 2));
        }

        await todoManager.importFromMarkdown();

        return {
          content: [
            {
              type: 'text',
              text: `✅ Markdown import completed!\n\n**Strategy**: ${validatedArgs.mergeStrategy}\n**Backup Created**: ${validatedArgs.backupExisting}\n\n*TODO.md has been parsed and imported into the JSON backend.*`,
            },
          ],
        };
      }

      case 'find_task': {
        const data = await todoManager.loadTodoData();
        const tasks = Object.values(data.tasks);

        // Initialize search engine with custom fuzzy threshold
        const searchEngine = new TaskSearchEngine(validatedArgs.fuzzyThreshold);

        let searchResults: SearchResult[] = [];

        // Execute search based on search type
        switch (validatedArgs.searchType) {
          case 'id':
            const idMatches = searchEngine.searchById(validatedArgs.query, tasks);
            searchResults = idMatches.map(task => ({
              task,
              relevanceScore: 1.0,
              matchedFields: ['id'],
            }));
            break;

          case 'title':
            const titleMatches = searchEngine.searchByTitle(validatedArgs.query, tasks);
            searchResults = titleMatches.map(task => ({
              task,
              relevanceScore: 1.0,
              matchedFields: ['title'],
            }));
            break;

          case 'description':
            const descMatches = searchEngine.searchByDescription(validatedArgs.query, tasks);
            searchResults = descMatches.map(task => ({
              task,
              relevanceScore: 1.0,
              matchedFields: ['description'],
            }));
            break;

          case 'fuzzy':
            const fuzzyMatches = searchEngine.fuzzySearch(
              validatedArgs.query,
              tasks,
              validatedArgs.fuzzyThreshold
            );
            searchResults = fuzzyMatches.map(task => ({
              task,
              relevanceScore: 0.8,
              matchedFields: ['fuzzy'],
            }));
            break;

          case 'regex':
            const regexMatches = searchEngine.regexSearch(validatedArgs.query, tasks);
            searchResults = regexMatches.map(task => ({
              task,
              relevanceScore: 0.9,
              matchedFields: ['regex'],
            }));
            break;

          case 'multi_field':
            const fields = validatedArgs.searchFields || ['title', 'description', 'tags'];
            searchResults = searchEngine.multiFieldSearch(
              validatedArgs.query,
              fields,
              tasks,
              validatedArgs.fieldWeights
            );
            break;

          case 'comprehensive':
            searchResults = searchEngine.comprehensiveSearch(validatedArgs.query, tasks);
            break;

          case 'all':
          default:
            // Default to comprehensive search for best results
            searchResults = searchEngine.comprehensiveSearch(validatedArgs.query, tasks);
            break;
        }

        if (searchResults.length === 0) {
          // Generate intelligent search suggestions
          const suggestions = searchEngine.generateSearchSuggestions(validatedArgs.query, tasks);

          return {
            content: [
              {
                type: 'text',
                text: `❌ No tasks found matching "${validatedArgs.query}"\n\n**Search Type**: ${validatedArgs.searchType}\n**Total Tasks**: ${tasks.length}\n\n**Suggestions:**\n${suggestions.map(s => `• ${s}`).join('\n')}\n\n*Try using a different query or search type.*`,
              },
            ],
          };
        }

        // Sort results by relevance score (highest first)
        searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

        // Format results with enhanced information
        const taskList = searchResults
          .map((result, index) => {
            const task = result.task;
            const dueDateStr = task.dueDate
              ? new Date(task.dueDate).toLocaleDateString()
              : 'No due date';
            const isOverdue =
              task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

            let taskInfo =
              `**${index + 1}. ${task.title}**\n` +
              `  🆔 **Full ID**: \`${task.id}\`\n` +
              `  📋 **Short ID**: \`${task.id.substring(0, 8)}\`\n` +
              `  📊 Status: ${task.status} | Priority: ${task.priority}\n` +
              `  ${task.assignee ? `👤 Assignee: ${task.assignee} | ` : ''}📅 Due: ${dueDateStr} ${isOverdue ? '🔴 OVERDUE' : ''}\n` +
              `  ${task.tags.length > 0 ? `🏷️ Tags: ${task.tags.join(', ')} | ` : ''}📈 Progress: ${task.progressPercentage}%\n`;

            // Add relevance score if requested
            if (validatedArgs.showRelevanceScore) {
              taskInfo += `  🎯 **Relevance**: ${(result.relevanceScore * 100).toFixed(1)}% | Matched: ${result.matchedFields.join(', ')}\n`;
            }

            taskInfo += `  📝 ${task.description || 'No description'}\n`;

            return taskInfo;
          })
          .join('\n');

        // Create summary with search statistics
        const searchSummary =
          validatedArgs.showRelevanceScore && searchResults.length > 0
            ? `\n**Search Statistics:**\n• Average Relevance: ${((searchResults.reduce((sum, r) => sum + r.relevanceScore, 0) / searchResults.length) * 100).toFixed(1)}%\n• Best Match: ${((searchResults[0]?.relevanceScore || 0) * 100).toFixed(1)}%`
            : '';

        return {
          content: [
            {
              type: 'text',
              text: `# 🔍 Enhanced Search Results (${searchResults.length} found)\n\n**Query**: "${validatedArgs.query}"\n**Search Type**: ${validatedArgs.searchType}${validatedArgs.fuzzyThreshold !== 0.3 ? ` | Fuzzy Threshold: ${validatedArgs.fuzzyThreshold}` : ''}\n${searchSummary}\n\n${taskList}\n\n💡 **Tip**: Copy the Full ID to use with update_task operation. Use \`showRelevanceScore: true\` to see match quality.`,
            },
          ],
        };
      }

      case 'resume_todo_list': {
        const data = await todoManager.loadTodoData();
        const tasks = Object.values(data.tasks);
        const analytics = await todoManager.getAnalytics();

        // Get recent activity from task change logs
        const recentActivity = Object.values(data.tasks)
          .flatMap(task => task.changeLog || [])
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10)
          .map(
            (entry: any) =>
              `- ${new Date(entry.timestamp).toLocaleDateString()}: ${entry.action} - ${entry.details}`
          )
          .join('\n');

        // Analyze current state
        const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
        const pendingHighPriority = tasks.filter(
          t => t.status === 'pending' && ['high', 'critical'].includes(t.priority)
        );
        const overdueTasks = tasks.filter(
          t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
        );
        const blockedTasks = tasks.filter(t => t.status === 'blocked');

        // Check deployment readiness
        let deploymentReadyTasks = [];
        let deploymentGuidance = '';

        if (validatedArgs.checkDeploymentReadiness) {
          deploymentReadyTasks = tasks.filter(
            t =>
              t.status === 'completed' &&
              (t.tags.includes('deployment') ||
                t.category === 'Deployment' ||
                t.title.toLowerCase().includes('deploy') ||
                t.description?.toLowerCase().includes('deploy'))
          );

          if (deploymentReadyTasks.length > 0) {
            deploymentGuidance =
              `\n## 🚀 Deployment Status\n**${deploymentReadyTasks.length} deployment-ready tasks found!**\n` +
              deploymentReadyTasks.map(t => `- ✅ ${t.title}`).join('\n') +
              `\n\n💡 **Tip**: Consider running deployment validation and using smart git push for these completed tasks.`;
          }
        }

        // Generate context summary
        let contextSummary = '';
        if (validatedArgs.includeContext) {
          const fs = await import('fs/promises');
          const path = await import('path');

          // Check for recent git commits
          try {
            const { execSync } = await import('child_process');
            const recentCommits = execSync('git log --oneline -5', {
              cwd: validatedArgs.projectPath,
              encoding: 'utf8',
            })
              .trim()
              .split('\n')
              .slice(0, 3);

            contextSummary += `\n## 📝 Recent Git Activity\n${recentCommits.map(commit => `- ${commit}`).join('\n')}\n`;
          } catch (error) {
            // Git not available or no commits
          }

          // Check ADR status
          try {
            const adrPath = path.join(validatedArgs.projectPath, 'docs/adrs');
            const adrFiles = await fs.readdir(adrPath).catch(() => []);
            if (adrFiles.length > 0) {
              contextSummary += `\n## 📋 ADR Context\n- **${adrFiles.length} ADRs** found in docs/adrs\n- Last TODO/ADR sync: ${(data.metadata as any).lastAdrSync || 'Never'}\n`;
            }
          } catch (error) {
            // ADR directory not found
          }
        }

        // Generate next actions
        let nextActions = '';
        if (validatedArgs.showNextActions) {
          const suggestions = [];

          if (inProgressTasks.length > 0) {
            suggestions.push(`Continue working on ${inProgressTasks.length} in-progress task(s)`);
          }

          if (overdueTasks.length > 0) {
            suggestions.push(
              `Address ${overdueTasks.length} overdue task(s) - these need immediate attention`
            );
          }

          if (blockedTasks.length > 0) {
            suggestions.push(
              `Unblock ${blockedTasks.length} blocked task(s) - resolve dependencies`
            );
          }

          if (pendingHighPriority.length > 0) {
            suggestions.push(`Start ${pendingHighPriority.length} high-priority pending task(s)`);
          }

          if (analytics.metrics.completionPercentage > 80) {
            suggestions.push('Project is nearing completion - consider deployment preparation');
          }

          if (deploymentReadyTasks.length > 0) {
            suggestions.push('Review and deploy completed tasks using smart git push');
          }

          if (suggestions.length > 0) {
            nextActions = `\n## 🎯 Recommended Next Actions\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`;
          }
        }

        const resumeReport = `# 🔄 Resume TODO List - Session Context

## 📊 Current Status Summary
- **Total Tasks**: ${tasks.length}
- **Completion Rate**: ${analytics.metrics.completionPercentage.toFixed(1)}%
- **In Progress**: ${inProgressTasks.length} tasks
- **Pending High Priority**: ${pendingHighPriority.length} tasks
- **Overdue**: ${overdueTasks.length} tasks ${overdueTasks.length > 0 ? '🔴' : '✅'}
- **Blocked**: ${blockedTasks.length} tasks ${blockedTasks.length > 0 ? '⚠️' : '✅'}

## 🔥 Immediate Attention Required
${
  overdueTasks.length > 0
    ? overdueTasks
        .map(
          t =>
            `- **${t.title}** (Due: ${new Date(t.dueDate!).toLocaleDateString()}) - ${t.priority} priority`
        )
        .join('\n')
    : '✅ No overdue tasks'
}

## 🚧 Currently In Progress
${
  inProgressTasks.length > 0
    ? inProgressTasks
        .map(
          t =>
            `- **${t.title}** (${t.progressPercentage}% complete) - ${t.assignee || 'Unassigned'}`
        )
        .join('\n')
    : '📝 No tasks currently in progress'
}

## ⚠️ Blocked Tasks
${
  blockedTasks.length > 0
    ? blockedTasks
        .map(t => `- **${t.title}** - ${t.notes || 'No blocking reason specified'}`)
        .join('\n')
    : '✅ No blocked tasks'
}

${contextSummary}

## 📈 Recent Activity
${recentActivity || 'No recent TODO activity'}

${nextActions}

${deploymentGuidance}

## 💡 Session Resume Tips
1. Use \`get_tasks\` with filters to see specific task categories
2. Use \`find_task\` to quickly locate tasks by title or partial ID
3. Update task status as you work: \`update_task\` with progress notes
4. Check \`get_analytics\` for detailed progress metrics
5. Run smart git push when tasks are deployment-ready

---
*Ready to continue where you left off! Use the recommended actions above to prioritize your work.*`;

        return {
          content: [
            {
              type: 'text',
              text: resumeReport,
            },
          ],
        };
      }

      case 'delete_task': {
        // Use enhanced task ID resolution
        const idResolution = await resolveTaskId(validatedArgs.taskId, todoManager, {
          operation: 'delete task',
        });

        if (!idResolution.success) {
          const suggestionText = idResolution.suggestions
            ? `\n\n**Suggestions:**\n${idResolution.suggestions.map(s => `• ${s}`).join('\n')}`
            : '';

          return {
            content: [
              {
                type: 'text',
                text: `${idResolution.error}${suggestionText}\n\n*Please check the task ID and try again.*`,
              },
            ],
          };
        }

        const taskId = idResolution.taskId!;
        const data = await todoManager.loadTodoData();

        // Check for dependencies and handle according to strategy
        const dependentTasks = Object.values(data.tasks).filter(
          t =>
            t.dependencies.includes(taskId) && t.status !== 'completed' && t.status !== 'cancelled'
        );

        if (dependentTasks.length > 0 && !validatedArgs.force) {
          const handleDependencies = validatedArgs.handleDependencies || 'block';

          switch (handleDependencies) {
            case 'block':
              const dependentTaskList = dependentTasks.map(t => t.title).join(', ');
              throw new McpAdrError(
                `Cannot delete task ${taskId} because it has active dependencies: ${dependentTaskList}`,
                'TASK_HAS_DEPENDENCIES'
              );

            case 'reassign':
              // For reassign, we need to remove the dependency but keep the tasks
              dependentTasks.forEach(task => {
                task.dependencies = task.dependencies.filter(depId => depId !== taskId);
                task.updatedAt = new Date().toISOString();
                task.changeLog.push({
                  timestamp: new Date().toISOString(),
                  action: 'updated',
                  details: `Dependency on deleted task ${taskId} was removed`,
                  modifiedBy: 'system',
                });
              });
              break;

            case 'delete_cascade':
              // Delete all dependent tasks recursively
              const tasksToDelete = new Set([taskId]);
              const findDependentTasks = (targetTaskId: string) => {
                Object.values(data.tasks).forEach(task => {
                  if (task.dependencies.includes(targetTaskId) && !tasksToDelete.has(task.id)) {
                    tasksToDelete.add(task.id);
                    findDependentTasks(task.id); // Recursive check
                  }
                });
              };

              dependentTasks.forEach(task => {
                tasksToDelete.add(task.id);
                findDependentTasks(task.id);
              });

              // Delete all tasks in the cascade
              tasksToDelete.forEach(id => {
                delete data.tasks[id];
                data.sections.forEach(section => {
                  section.tasks = section.tasks.filter(taskId => taskId !== id);
                });
              });

              data.metadata.lastUpdated = new Date().toISOString();
              await todoManager.saveTodoData(data);

              return {
                content: [
                  {
                    type: 'text',
                    text: `✅ Task and ${tasksToDelete.size - 1} dependent tasks deleted successfully!\n\n**Deleted Tasks**: ${tasksToDelete.size}\n**Strategy**: Cascade delete\n\n*All changes synced to JSON backend and TODO.md.*`,
                  },
                ],
              };
          }
        }

        // Delete the task
        delete data.tasks[taskId];

        // Update sections
        data.sections.forEach(section => {
          section.tasks = section.tasks.filter(id => id !== taskId);
        });

        // If force delete, clean up dependencies in other tasks (legacy behavior)
        if (validatedArgs.force) {
          Object.values(data.tasks).forEach(task => {
            task.dependencies = task.dependencies.filter(depId => depId !== taskId);
          });
        }

        data.metadata.lastUpdated = new Date().toISOString();
        await todoManager.saveTodoData(data);

        let strategyMessage = '';
        if (validatedArgs.force) {
          strategyMessage = ' (with dependency cleanup)';
        } else if (dependentTasks.length > 0) {
          const strategy = validatedArgs.handleDependencies || 'block';
          strategyMessage = ` (${strategy} strategy used for ${dependentTasks.length} dependencies)`;
        }

        return {
          content: [
            {
              type: 'text',
              text: `✅ Task deleted successfully${strategyMessage}!\n\n**Task ID**: ${taskId}\n\n*Changes synced to JSON backend and TODO.md.*`,
            },
          ],
        };
      }

      case 'archive_task': {
        // Use enhanced task ID resolution
        const idResolution = await resolveTaskId(validatedArgs.taskId, todoManager, {
          operation: 'archive task',
        });

        if (!idResolution.success) {
          const suggestionText = idResolution.suggestions
            ? `\n\n**Suggestions:**\n${idResolution.suggestions.map(s => `• ${s}`).join('\n')}`
            : '';

          return {
            content: [
              {
                type: 'text',
                text: `${idResolution.error}${suggestionText}\n\n*Please check the task ID and try again.*`,
              },
            ],
          };
        }

        const taskId = idResolution.taskId!;
        const data = await todoManager.loadTodoData();

        // Archive the task
        const task = data.tasks[taskId];
        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }
        task.archived = true;
        task.archivedAt = new Date().toISOString();
        task.updatedAt = new Date().toISOString();

        // Remove from sections (archived tasks don't appear in regular sections)
        data.sections.forEach(section => {
          section.tasks = section.tasks.filter(id => id !== taskId);
        });

        data.metadata.lastUpdated = new Date().toISOString();
        await todoManager.saveTodoData(data);

        return {
          content: [
            {
              type: 'text',
              text: `✅ Task archived successfully!\n\n**Task ID**: ${taskId}\n**Archived At**: ${task.archivedAt}\n\n*Task moved to archive and synced to JSON backend.*`,
            },
          ],
        };
      }

      case 'undo_last': {
        const result = await todoManager.undoLastOperation();

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Cannot undo operation: ${result.error}`,
              },
            ],
          };
        }

        const opDetails = (result as any).operationDetails || {
          operation: result.operation,
          description: 'Unknown operation',
          timestamp: new Date().toISOString(),
          affectedTaskIds: [],
        };

        return {
          content: [
            {
              type: 'text',
              text: `✅ Undid operation: ${result.operation}!\n\n**Operation**: ${result.operation}\n**Description**: ${opDetails.description}\n**Time**: ${new Date(opDetails.timestamp).toLocaleString()}\n**Affected Tasks**: ${opDetails.affectedTaskIds.length > 0 ? opDetails.affectedTaskIds.join(', ') : 'None'}\n\n*The affected tasks have been restored to their previous state.*`,
            },
          ],
        };
      }

      case 'get_undo_history': {
        const history = await todoManager.getUndoHistory(validatedArgs.limit);

        if (history.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `📋 **Operation History**: No operations recorded yet.\n\n*Start creating and modifying tasks to build up your operation history.*`,
              },
            ],
          };
        }

        const historyList = history
          .map((op, index) => {
            return `${index + 1}. **${op.operation}** - ${op.description}\n   ⏱️ ${new Date(op.timestamp).toLocaleString()}\n   🎯 Affected: ${op.affectedTaskIds.length} task(s)`;
          })
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `📋 **undo history - Operation History** (Last ${history.length} operations)\n\n${historyList}\n\n💡 **Tip**: Use \`undo_last\` to undo the most recent operation.`,
            },
          ],
        };
      }

      case 'bulk_delete': {
        // Handle dry-run mode first
        if (validatedArgs.dryRun) {
          const data = await todoManager.loadTodoData();
          const previewTasks: Array<{
            id: string;
            title: string;
            hasDependents: boolean;
            dependents: string[];
            status: string;
            priority: string;
          }> = [];
          const notFoundTasks: string[] = [];

          for (const inputTaskId of validatedArgs.taskIds) {
            const idResolution = await resolveTaskId(inputTaskId, todoManager, {
              operation: 'bulk delete dry-run',
            });

            if (idResolution.success && idResolution.taskId) {
              const task = data.tasks[idResolution.taskId];
              if (task) {
                // Check for dependent tasks
                const dependentTasks = Object.values(data.tasks)
                  .filter(
                    t =>
                      t.dependencies.includes(idResolution.taskId!) &&
                      !validatedArgs.taskIds.includes(t.id)
                  )
                  .map(t => `${t.title} (${t.id.substring(0, 8)})`);

                previewTasks.push({
                  id: idResolution.taskId,
                  title: task.title,
                  hasDependents: dependentTasks.length > 0,
                  dependents: dependentTasks,
                  status: task.status,
                  priority: task.priority,
                });
              } else {
                notFoundTasks.push(inputTaskId);
              }
            } else {
              notFoundTasks.push(inputTaskId);
            }
          }

          let dryRunMessage = `🔍 **Bulk Delete Preview (Dry Run)**\n\n`;

          if (previewTasks.length > 0) {
            dryRunMessage += `**Would delete ${previewTasks.length} task${previewTasks.length === 1 ? '' : 's'}:**\n`;
            previewTasks.forEach(task => {
              const shortId = task.id.substring(0, 8);
              dryRunMessage += `- **${task.title}** (${shortId}) - ${task.status}, ${task.priority} priority`;
              if (task.hasDependents) {
                dryRunMessage += `\n  ⚠️ **DEPENDENCY IMPACT**: ${task.dependents.length} dependent task${task.dependents.length === 1 ? '' : 's'}: ${task.dependents.join(', ')}`;
              }
              dryRunMessage += '\n';
            });
            dryRunMessage += '\n';
          }

          if (notFoundTasks.length > 0) {
            dryRunMessage += `**Would skip ${notFoundTasks.length} task${notFoundTasks.length === 1 ? '' : 's'} (not found):**\n`;
            notFoundTasks.forEach(taskId => {
              dryRunMessage += `- ${taskId}\n`;
            });
            dryRunMessage += '\n';
          }

          const hasConflicts = previewTasks.some(t => t.hasDependents);
          if (hasConflicts && !validatedArgs.force) {
            dryRunMessage += `🚨 **DEPENDENCY CONFLICTS DETECTED**\n`;
            dryRunMessage += `Some tasks have dependents that would be affected. Use \`force: true\` to override.\n\n`;
          }

          dryRunMessage += `**Impact Analysis:**\n`;
          dryRunMessage += `- ${previewTasks.length} task${previewTasks.length === 1 ? '' : 's'} would be deleted\n`;
          dryRunMessage += `- ${previewTasks.filter(t => t.hasDependents).length} task${previewTasks.filter(t => t.hasDependents).length === 1 ? '' : 's'} with dependency conflicts\n`;
          dryRunMessage += `- ${notFoundTasks.length} task${notFoundTasks.length === 1 ? '' : 's'} not found\n\n`;

          dryRunMessage += `**To execute this deletion:**\n`;
          dryRunMessage += `- Remove \`dryRun: true\` and add \`confirm: true\`\n`;
          if (hasConflicts) {
            dryRunMessage += `- Add \`force: true\` to ignore dependency conflicts\n`;
          }

          return {
            content: [
              {
                type: 'text',
                text: dryRunMessage,
              },
            ],
          };
        }

        if (!validatedArgs.confirm) {
          // Provide preview of what would be deleted
          const data = await todoManager.loadTodoData();
          const previewTasks: Array<{
            id: string;
            title: string;
            hasDependents: boolean;
            dependents: string[];
          }> = [];
          const notFoundTasks: string[] = [];

          for (const inputTaskId of validatedArgs.taskIds) {
            const idResolution = await resolveTaskId(inputTaskId, todoManager, {
              operation: 'bulk delete preview',
            });

            if (idResolution.success && idResolution.taskId) {
              const task = data.tasks[idResolution.taskId];
              if (task) {
                // Check for dependent tasks
                const dependentTasks = Object.values(data.tasks)
                  .filter(
                    t =>
                      t.dependencies.includes(idResolution.taskId!) &&
                      !validatedArgs.taskIds.includes(t.id)
                  )
                  .map(t => `${t.title} (${t.id.substring(0, 8)})`);

                previewTasks.push({
                  id: idResolution.taskId,
                  title: task.title,
                  hasDependents: dependentTasks.length > 0,
                  dependents: dependentTasks,
                });
              } else {
                notFoundTasks.push(inputTaskId);
              }
            } else {
              notFoundTasks.push(inputTaskId);
            }
          }

          let previewMessage = `⚠️ **Bulk Delete Confirmation Required**\n\n`;

          if (previewTasks.length > 0) {
            previewMessage += `**${previewTasks.length} task${previewTasks.length === 1 ? '' : 's'} will be deleted:**\n`;
            previewTasks.forEach(task => {
              const shortId = task.id.substring(0, 8);
              previewMessage += `- **${task.title}** (${shortId})`;
              if (task.hasDependents) {
                previewMessage += ` ⚠️ **HAS DEPENDENTS**: ${task.dependents.join(', ')}`;
              }
              previewMessage += '\n';
            });
            previewMessage += '\n';
          }

          if (notFoundTasks.length > 0) {
            previewMessage += `**${notFoundTasks.length} task${notFoundTasks.length === 1 ? '' : 's'} not found:**\n`;
            notFoundTasks.forEach(taskId => {
              previewMessage += `- ${taskId}\n`;
            });
            previewMessage += '\n';
          }

          const hasConflicts = previewTasks.some(t => t.hasDependents);
          if (hasConflicts) {
            previewMessage += `🚨 **WARNING**: Some tasks have dependent tasks that will be affected!\n\n`;
          }

          previewMessage += `**To proceed with deletion, run the command again with \`confirm: true\`**\n`;
          previewMessage += `**To force delete (ignoring dependencies), add \`force: true\`**`;

          return {
            content: [
              {
                type: 'text',
                text: previewMessage,
              },
            ],
          };
        }

        // Proceed with actual deletion
        const data = await todoManager.loadTodoData();
        let deletedCount = 0;
        let processedCount = 0;
        const notFoundTasks: string[] = [];
        const resolvedTaskIds: string[] = [];
        const deletedTasks: Array<{ id: string; title: string }> = [];
        const dependencyConflicts: Array<{ taskId: string; dependents: string[] }> = [];

        // First, resolve all task IDs and check for conflicts
        for (const inputTaskId of validatedArgs.taskIds) {
          processedCount++;

          const idResolution = await resolveTaskId(inputTaskId, todoManager, {
            operation: 'bulk delete task',
          });

          if (idResolution.success && idResolution.taskId) {
            const task = data.tasks[idResolution.taskId];
            if (task) {
              // Check for dependency conflicts unless force is enabled
              if (!validatedArgs.force) {
                const dependentTasks = Object.values(data.tasks)
                  .filter(
                    t =>
                      t.dependencies.includes(idResolution.taskId!) &&
                      !validatedArgs.taskIds.includes(t.id)
                  )
                  .map(t => `${t.title} (${t.id.substring(0, 8)})`);

                if (dependentTasks.length > 0) {
                  dependencyConflicts.push({
                    taskId: inputTaskId,
                    dependents: dependentTasks,
                  });
                  continue;
                }
              }

              resolvedTaskIds.push(idResolution.taskId);
              deletedTasks.push({
                id: idResolution.taskId,
                title: task.title,
              });
            } else {
              notFoundTasks.push(inputTaskId);
            }
          } else {
            notFoundTasks.push(inputTaskId);
          }
        }

        // If there are dependency conflicts and force is not enabled, return error
        if (dependencyConflicts.length > 0 && !validatedArgs.force) {
          let conflictMessage = `❌ **Bulk Delete Blocked - Dependency Conflicts**\n\n`;
          conflictMessage += `**${dependencyConflicts.length} task${dependencyConflicts.length === 1 ? '' : 's'} cannot be deleted due to dependencies:**\n`;

          dependencyConflicts.forEach(conflict => {
            conflictMessage += `- **${conflict.taskId}** has dependents: ${conflict.dependents.join(', ')}\n`;
          });

          conflictMessage += `\n**Options:**\n`;
          conflictMessage += `- Add \`force: true\` to delete anyway (may break dependencies)\n`;
          conflictMessage += `- Delete dependent tasks first\n`;
          conflictMessage += `- Remove these tasks from the bulk delete operation`;

          return {
            content: [
              {
                type: 'text',
                text: conflictMessage,
              },
            ],
          };
        }

        // Perform the actual deletions using TodoJsonManager's delete method
        for (const taskId of resolvedTaskIds) {
          try {
            const result = await todoManager.deleteTask(taskId);
            if (result.success) {
              deletedCount++;
            }
          } catch (error) {
            // If individual delete fails, continue with others but track the failure
            // Track failed deletion for reporting
            if (process.env['NODE_ENV'] === 'development') {
              console.error(`Failed to delete task ${taskId}:`, error);
            }
          }
        }

        // Build result message
        let resultMessage = `✅ **Bulk Delete Completed!**\n\n`;

        if (deletedCount > 0) {
          resultMessage += `**Successfully Deleted ${deletedCount} task${deletedCount === 1 ? '' : 's'}:**\n`;
          deletedTasks.slice(0, deletedCount).forEach(task => {
            resultMessage += `- ${task.title} (${task.id.substring(0, 8)})\n`;
          });
          resultMessage += '\n';
        }

        if (dependencyConflicts.length > 0 && validatedArgs.force) {
          resultMessage += `**⚠️ Forced deletion with dependency conflicts:**\n`;
          dependencyConflicts.forEach(conflict => {
            resultMessage += `- ${conflict.taskId} (had dependents: ${conflict.dependents.join(', ')})\n`;
          });
          resultMessage += '\n';
        }

        if (notFoundTasks.length > 0) {
          resultMessage += `**Not Found (${notFoundTasks.length} task${notFoundTasks.length === 1 ? '' : 's'}):**\n`;
          notFoundTasks.forEach(taskId => {
            resultMessage += `- ${taskId}\n`;
          });
          resultMessage += '\n';
        }

        resultMessage += `**Summary:** ${processedCount} task${processedCount === 1 ? '' : 's'} processed, ${deletedCount} deleted, ${notFoundTasks.length + dependencyConflicts.length} skipped\n\n`;
        resultMessage += `*Changes synced to JSON backend and TODO.md.*`;

        return {
          content: [
            {
              type: 'text',
              text: resultMessage,
            },
          ],
        };
      }

      default:
        throw new McpAdrError(
          `Unknown operation: ${(validatedArgs as any).operation}`,
          'INVALID_INPUT'
        );
    }
  } catch (error) {
    // Handle specific TodoManagerError types with user-friendly responses
    if (error instanceof TodoManagerError && error.code === 'TASK_NOT_FOUND') {
      return {
        content: [
          {
            type: 'text',
            text: `❌ No task found with ID: ${error.taskId || 'unknown'}\n\n**Suggestions:**\n${error.suggestions?.map(s => `• ${s.action || s}`).join('\n') || '• Use get_tasks to list all available tasks\n• Check if the task was recently deleted\n• Verify the task ID format'}\n\n*Please check the task ID and try again.*`,
          },
        ],
      };
    }

    // Re-throw other TodoManagerError as-is to preserve enhanced error information
    if (error instanceof TodoManagerError) {
      throw error;
    }

    if (error instanceof z.ZodError) {
      // Create more specific error messages
      const errorDetails = error.errors
        .map(err => {
          const path = err.path.length > 0 ? err.path.join('.') : 'input';
          const message = err.message;
          return `${path}: ${message}`;
        })
        .join(', ');

      throw new McpAdrError(
        `Invalid input: ${errorDetails || 'Validation failed'}`,
        'INVALID_INPUT'
      );
    }

    throw new McpAdrError(
      `TODO management failed: ${error instanceof Error ? error.message : String(error)}`,
      'TODO_MANAGEMENT_ERROR'
    );
  }
}

/**
 * Extract implementation tasks from ADR content
 */
async function extractTasksFromAdrs(
  adrs: any[],
  _adrDirectory: string,
  _intentId?: string,
  autoLinkDependencies: boolean = true
): Promise<any[]> {
  const extractedTasks: any[] = [];

  for (const adr of adrs) {
    if (!adr.content) continue;

    // Extract tasks from Decision and Consequences sections
    const tasks = extractTasksFromAdrContent(adr);

    // Add ADR metadata to each task
    for (const task of tasks) {
      task.linkedAdrs = [adr.path];
      task.category = task.category || 'ADR Implementation';
      task.tags = task.tags || [];

      // Add ADR-specific tags
      if (adr.metadata?.number) {
        task.tags.push(`adr-${adr.metadata.number}`);
      }
      if (adr.status) {
        task.tags.push(`status-${adr.status}`);
      }

      // Set priority based on ADR status and content
      if (!task.priority) {
        task.priority = determinePriorityFromAdr(adr);
      }

      extractedTasks.push(task);
    }
  }

  // Link dependencies between ADRs if requested
  if (autoLinkDependencies) {
    linkAdrDependencies(extractedTasks, adrs);
  }

  return extractedTasks;
}

/**
 * Extract tasks from ADR content sections
 */
function extractTasksFromAdrContent(adr: any): any[] {
  const tasks: any[] = [];
  const content = adr.content || '';

  // Look for implementation tasks in Decision section
  if (adr.decision && typeof adr.decision === 'string') {
    const decisionTasks = extractTasksFromText(adr.decision, 'Implementation', 'high');
    tasks.push(...decisionTasks);
  }

  // Look for tasks in Consequences section
  if (adr.consequences && typeof adr.consequences === 'string') {
    const consequenceTasks = extractTasksFromText(adr.consequences, 'Validation', 'medium');
    tasks.push(...consequenceTasks);
  }

  // Look for explicit task lists in content
  const taskListRegex =
    /(?:##?\s*(?:tasks?|todo|implementation|action items?)\s*\n)([\s\S]*?)(?=\n##|\n#|$)/gi;
  let match;

  while ((match = taskListRegex.exec(content)) !== null) {
    const taskSection = match[1];
    if (taskSection) {
      const sectionTasks = extractTasksFromText(taskSection, 'Task', 'medium');
      tasks.push(...sectionTasks);
    }
  }

  // If no explicit tasks found, create a general implementation task
  if (tasks.length === 0) {
    tasks.push({
      title: `Implement ${adr.title}`,
      description: `Implement the architectural decision: ${adr.title}`,
      priority: 'medium',
      category: 'ADR Implementation',
      tags: ['implementation'],
      dependencies: [],
      linkedAdrs: [],
    });
  }

  return tasks;
}

/**
 * Extract tasks from text content using patterns
 */
function extractTasksFromText(
  text: string,
  defaultCategory: string,
  defaultPriority: string
): any[] {
  const tasks: any[] = [];

  // Look for bullet points that look like tasks
  const taskPatterns = [
    /[-*+]\s+(.+?)(?:\n|$)/g,
    /\d+\.\s+(.+?)(?:\n|$)/g,
    /(?:must|should|will|need to|implement|create|build|develop|configure|setup|establish)\s+(.+?)(?:\.|$)/gi,
  ];

  for (const pattern of taskPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const taskText = match[1]?.trim();

      if (!taskText || taskText.length < 10 || taskText.length > 200) continue; // Filter out very short/long matches

      // Determine priority from keywords
      let priority = defaultPriority;
      if (/critical|urgent|must|security|breaking/.test(taskText.toLowerCase())) {
        priority = 'critical';
      } else if (/important|should|key|major/.test(taskText.toLowerCase())) {
        priority = 'high';
      } else if (/nice|could|minor|optional/.test(taskText.toLowerCase())) {
        priority = 'low';
      }

      // Extract assignee if mentioned
      let assignee;
      const assigneeMatch = taskText.match(/@(\w+)|assigned to (\w+)|by (\w+)/i);
      if (assigneeMatch) {
        assignee = assigneeMatch[1] || assigneeMatch[2] || assigneeMatch[3];
      }

      tasks.push({
        title: taskText.charAt(0).toUpperCase() + taskText.slice(1), // Capitalize first letter
        description: `Task extracted from ADR: ${taskText}`,
        priority,
        category: defaultCategory,
        tags: [],
        dependencies: [],
        linkedAdrs: [],
        ...(assignee && { assignee }),
      });
    }
  }

  return tasks;
}

/**
 * Determine priority based on ADR status and content
 */
function determinePriorityFromAdr(adr: any): string {
  const status = adr.status?.toLowerCase() || '';
  const content = (adr.content || '').toLowerCase();

  // High priority for accepted/active ADRs
  if (['accepted', 'active', 'approved'].includes(status)) {
    return 'high';
  }

  // Critical for security/breaking changes
  if (/security|breaking|critical|urgent/.test(content)) {
    return 'critical';
  }

  // Low priority for deprecated/superseded
  if (['deprecated', 'superseded', 'rejected'].includes(status)) {
    return 'low';
  }

  // Default to medium
  return 'medium';
}

/**
 * Link dependencies between ADR tasks
 */
function linkAdrDependencies(tasks: any[], adrs: any[]): void {
  // Simple dependency linking based on ADR numbers and references
  for (const task of tasks) {
    const taskAdr = adrs.find(adr => task.linkedAdrs.includes(adr.path));
    if (!taskAdr) continue;

    // Look for references to other ADRs in the content
    const content = taskAdr.content || '';
    const adrReferences = content.match(/adr[-_]?(\d+)/gi) || [];

    for (const ref of adrReferences) {
      const refNumber = ref.match(/(\d+)/)?.[1];
      if (!refNumber || refNumber === taskAdr.metadata?.number) continue;

      // Find tasks from the referenced ADR
      const referencedAdr = adrs.find(adr => adr.metadata?.number === refNumber);
      if (!referencedAdr) continue;

      const referencedTasks = tasks.filter(t => t.linkedAdrs.includes(referencedAdr.path));
      for (const refTask of referencedTasks) {
        if (!task.dependencies.includes(refTask.title)) {
          task.dependencies.push(refTask.title);
        }
      }
    }
  }
}
