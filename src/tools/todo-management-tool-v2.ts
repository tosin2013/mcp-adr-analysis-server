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
  completionCriteria: z.string().optional().describe('Auto-completion rules')
});

const UpdateTaskSchema = z.object({
  operation: z.literal('update_task'),
  projectPath: z.string().describe('Project root path'),
  taskId: z.string().describe('Task ID to update'),
  updates: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    assignee: z.string().optional(),
    dueDate: z.string().optional(),
    progressPercentage: z.number().min(0).max(100).optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
    dependencies: z.array(z.string()).optional()
  }).describe('Fields to update'),
  reason: z.string().optional().describe('Reason for update (for changelog) - defaults to "Task updated"')
});

const BulkUpdateSchema = z.object({
  operation: z.literal('bulk_update'),
  projectPath: z.string().describe('Project root path'),
  updates: z.array(z.object({
    taskId: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    assignee: z.string().optional(),
    notes: z.string().optional()
  })).describe('Bulk status updates'),
  reason: z.string().optional().describe('Reason for bulk update - defaults to "Bulk status update"'),
  dryRun: z.boolean().optional().default(false).describe('Preview changes without applying them')
});

const GetTasksSchema = z.object({
  operation: z.literal('get_tasks'),
  projectPath: z.string().describe('Project root path'),
  filters: z.object({
    status: z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    assignee: z.string().optional(),
    category: z.string().optional(),
    hasDeadline: z.boolean().optional(),
    overdue: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    archived: z.boolean().optional()
  }).optional().describe('Filter criteria'),
  sortBy: z.enum(['priority', 'dueDate', 'createdAt', 'updatedAt']).default('priority'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().optional().describe('Maximum number of tasks to return'),
  showFullIds: z.boolean().optional().default(false).describe('Show full UUIDs instead of short IDs')
});

const GetAnalyticsSchema = z.object({
  operation: z.literal('get_analytics'),
  projectPath: z.string().describe('Project root path'),
  timeframe: z.enum(['day', 'week', 'month', 'all']).default('week').describe('Analysis timeframe'),
  includeVelocity: z.boolean().default(true).describe('Include velocity metrics'),
  includeScoring: z.boolean().default(true).describe('Include scoring metrics')
});

const ImportAdrTasksSchema = z.object({
  operation: z.literal('import_adr_tasks'),
  projectPath: z.string().describe('Project root path'),
  adrDirectory: z.string().default('docs/adrs').describe('ADR directory path'),
  intentId: z.string().optional().describe('Link imported tasks to intent'),
  preserveExisting: z.boolean().default(true).describe('Keep existing tasks'),
  autoLinkDependencies: z.boolean().default(true).describe('Auto-detect task dependencies')
});

const SyncWithKnowledgeGraphSchema = z.object({
  operation: z.literal('sync_knowledge_graph'),
  projectPath: z.string().describe('Project root path'),
  direction: z.enum(['to_kg', 'from_kg', 'bidirectional']).default('bidirectional'),
  intentId: z.string().optional().describe('Specific intent to sync with')
});

const SyncToMarkdownSchema = z.object({
  operation: z.literal('sync_to_markdown'),
  projectPath: z.string().describe('Project root path'),
  force: z.boolean().default(false).describe('Force sync even if markdown is newer')
});

const ImportFromMarkdownSchema = z.object({
  operation: z.literal('import_from_markdown'),
  projectPath: z.string().describe('Project root path'),
  mergeStrategy: z.enum(['overwrite', 'merge', 'preserve_json']).default('merge'),
  backupExisting: z.boolean().default(true).describe('Create backup before import')
});

const FindTaskSchema = z.object({
  operation: z.literal('find_task'),
  projectPath: z.string().describe('Project root path'),
  query: z.string().describe('Search query: partial ID, title, or description'),
  searchType: z.enum(['id', 'title', 'description', 'all', 'fuzzy', 'regex', 'multi_field']).default('all').describe('Search type'),
  searchFields: z.array(z.enum(['title', 'description', 'tags', 'category', 'assignee'])).optional().describe('Fields to search in (for multi_field search)')
});

const ResumeTodoListSchema = z.object({
  operation: z.literal('resume_todo_list'),
  projectPath: z.string().describe('Project root path'),
  analyzeRecent: z.boolean().default(true).describe('Analyze recent changes and git commits'),
  includeContext: z.boolean().default(true).describe('Include project context and ADR status'),
  showNextActions: z.boolean().default(true).describe('Suggest next actionable steps'),
  checkDeploymentReadiness: z.boolean().default(true).describe('Check if any tasks are deployment-ready')
});

const DeleteTaskSchema = z.object({
  operation: z.literal('delete_task'),
  projectPath: z.string().describe('Project root path'),
  taskId: z.string().describe('Task ID to delete'),
  force: z.boolean().default(false).describe('Force delete even if task has dependencies')
});

const ArchiveTaskSchema = z.object({
  operation: z.literal('archive_task'),
  projectPath: z.string().describe('Project root path'),
  taskId: z.string().describe('Task ID to archive')
});

const UndoLastSchema = z.object({
  operation: z.literal('undo_last'),
  projectPath: z.string().describe('Project root path')
});

const GetUndoHistorySchema = z.object({
  operation: z.literal('get_undo_history'),
  projectPath: z.string().describe('Project root path'),
  limit: z.number().optional().default(10).describe('Number of operations to show')
});

const BulkDeleteSchema = z.object({
  operation: z.literal('bulk_delete'),
  projectPath: z.string().describe('Project root path'),
  taskIds: z.array(z.string()).describe('Array of task IDs to delete'),
  confirm: z.boolean().describe('Confirmation required for bulk delete')
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
  BulkDeleteSchema
]);


/**
 * Main TODO management function with JSON backend
 */
export async function manageTodoV2(args: any): Promise<any> {
  try {
    // Pre-validate priority values with enhanced error messages
    if ('priority' in args && args.priority && 
        !['low', 'medium', 'high', 'critical'].includes(args.priority)) {
      const priority = args.priority;
      const suggestion = priority === 'urgent' ? 'critical' : 
                        priority === 'normal' ? 'medium' :
                        priority === 'important' ? 'high' : undefined;
      throw TodoManagerError.invalidPriority(priority, suggestion);
    }
    
    if ('updates' in args && args.updates && 'priority' in args.updates && 
        args.updates.priority && 
        !['low', 'medium', 'high', 'critical'].includes(args.updates.priority)) {
      const priority = args.updates.priority;
      const suggestion = priority === 'urgent' ? 'critical' : 
                        priority === 'normal' ? 'medium' :
                        priority === 'important' ? 'high' : undefined;
      throw TodoManagerError.invalidPriority(priority, suggestion);
    }
    
    const validatedArgs = TodoManagementV2Schema.parse(args);
    const todoManager = new TodoJsonManager(validatedArgs.projectPath);
    const kgManager = new KnowledgeGraphManager();

    switch (validatedArgs.operation) {
      case 'create_task': {
        // Validate due date format if provided
        if (validatedArgs.dueDate) {
          const date = new Date(validatedArgs.dueDate);
          if (isNaN(date.getTime())) {
            throw new TodoManagerError(
              `Invalid date format: '${validatedArgs.dueDate}'`,
              'INVALID_DATE_FORMAT',
              {
                field: 'dueDate',
                value: validatedArgs.dueDate,
                suggestions: [
                  {
                    action: 'Use ISO date format',
                    description: 'Provide dates in YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS.sssZ format',
                    example: '2024-01-15T10:00:00.000Z'
                  }
                ]
              }
            );
          }
        }
        
        const taskId = await todoManager.createTask({
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
          completionCriteria: validatedArgs.completionCriteria
        });

        return {
          content: [{
            type: 'text',
            text: `✅ Task created successfully!\n\n**Task ID**: ${taskId}\n**Title**: ${validatedArgs.title}\n**Priority**: ${validatedArgs.priority}\n**Status**: pending\n\n*Task has been added to JSON backend and will sync to TODO.md automatically.*`
          }]
        };
      }

      case 'update_task': {
        // Validate task ID format first
        let taskId = validatedArgs.taskId;
        
        // Check for valid UUID format or partial UUID (at least 8 characters)
        const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
        const partialUuidPattern = /^[0-9a-f]{8,}$/i;
        
        if (!uuidPattern.test(taskId) && !partialUuidPattern.test(taskId)) {
          throw TodoManagerError.invalidTaskId(taskId);
        }
        
        // If taskId looks like a partial ID (less than full UUID length), try to find the full ID
        if (taskId.length < 36) {
          const data = await todoManager.loadTodoData();
          const tasks = Object.values(data.tasks);
          const matchingTasks = tasks.filter(task => task.id.startsWith(taskId.toLowerCase()));
          
          if (matchingTasks.length === 0) {
            throw TodoManagerError.taskNotFound(taskId);
          } else if (matchingTasks.length > 1) {
            const taskList = matchingTasks.map(task => 
              `- **${task.title}** (ID: \`${task.id}\`)`
            ).join('\n');
            
            return {
              content: [{
                type: 'text',
                text: `❌ Multiple tasks found with ID starting with "${taskId}"\n\n**Matching tasks:**\n${taskList}\n\n**Please use a more specific ID or the full UUID.**`
              }]
            };
          }
          
          taskId = matchingTasks[0]!.id;
        } else {
          // For full UUID, verify it exists
          const data = await todoManager.loadTodoData();
          if (!data.tasks[taskId]) {
            throw TodoManagerError.taskNotFound(taskId);
          }
        }
        
        // Filter out undefined values
        const cleanUpdates: any = {};
        if (validatedArgs.updates.title !== undefined) cleanUpdates.title = validatedArgs.updates.title;
        if (validatedArgs.updates.description !== undefined) cleanUpdates.description = validatedArgs.updates.description;
        if (validatedArgs.updates.status !== undefined) cleanUpdates.status = validatedArgs.updates.status;
        if (validatedArgs.updates.priority !== undefined) cleanUpdates.priority = validatedArgs.updates.priority;
        if (validatedArgs.updates.assignee !== undefined) cleanUpdates.assignee = validatedArgs.updates.assignee;
        if (validatedArgs.updates.dueDate !== undefined) cleanUpdates.dueDate = validatedArgs.updates.dueDate;
        if (validatedArgs.updates.progressPercentage !== undefined) cleanUpdates.progressPercentage = validatedArgs.updates.progressPercentage;
        if (validatedArgs.updates.notes !== undefined) cleanUpdates.notes = validatedArgs.updates.notes;
        if (validatedArgs.updates.tags !== undefined) cleanUpdates.tags = validatedArgs.updates.tags;
        if (validatedArgs.updates.dependencies !== undefined) cleanUpdates.dependencies = validatedArgs.updates.dependencies;
        
        await todoManager.updateTask({
          taskId: taskId,
          updates: cleanUpdates,
          reason: validatedArgs.reason || 'Task updated',
          triggeredBy: 'tool'
        });

        return {
          content: [{
            type: 'text',
            text: `✅ Task updated successfully!\n\n**Task ID**: ${taskId}\n**Original Input**: ${validatedArgs.taskId}\n**Updates**: ${Object.keys(validatedArgs.updates).filter(k => validatedArgs.updates[k as keyof typeof validatedArgs.updates] !== undefined).join(', ')}\n**Reason**: ${validatedArgs.reason || 'Task updated'}\n\n*Changes synced to JSON backend and TODO.md.*`
          }]
        };
      }

      case 'bulk_update': {
        const data = await todoManager.loadTodoData();
        let updateCount = 0;
        const previewChanges: string[] = [];
        
        for (const update of validatedArgs.updates) {
          const task = data.tasks[update.taskId];
          if (!task) {
            continue; // Skip non-existent tasks
          }

          // Filter out undefined values
          const cleanUpdates: any = {};
          if (update.status !== undefined) cleanUpdates.status = update.status;
          if (update.priority !== undefined) cleanUpdates.priority = update.priority;
          if (update.assignee !== undefined) cleanUpdates.assignee = update.assignee;
          if (update.notes !== undefined) cleanUpdates.notes = update.notes;
          
          if (validatedArgs.dryRun) {
            // Dry run: show what would be changed
            const changes = Object.entries(cleanUpdates).map(([key, value]) => 
              `${key}: ${(task as any)[key]} → ${value}`
            ).join(', ');
            previewChanges.push(`- **${task.title}** (${update.taskId}): ${changes}`);
            updateCount++;
          } else {
            // Actually update the task
            await todoManager.updateTask({
              taskId: update.taskId,
              updates: cleanUpdates,
              reason: validatedArgs.reason || 'Bulk status update',
              triggeredBy: 'tool'
            });
            updateCount++;
          }
        }

        if (validatedArgs.dryRun) {
          return {
            content: [{
              type: 'text',
              text: `🔍 **Bulk Update Preview (dry run)**\n\n**would update ${updateCount} tasks:**\n\n${previewChanges.join('\n')}\n\n*To apply these changes, run the command again with dryRun: false*`
            }]
          };
        } else {
          return {
            content: [{
              type: 'text',
              text: `✅ Bulk update completed!\n\n**Tasks Updated**: ${updateCount}\n**Reason**: ${validatedArgs.reason || 'Bulk status update'}\n\n*All changes synced to JSON backend and TODO.md.*`
            }]
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
            tasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed');
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

        const taskList = tasks.map(task => {
          const dueDateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
          const taskId = (validatedArgs.showFullIds ?? false) ? task.id : task.id.substring(0, 8);
          
          return `**${task.title}** (ID: ${taskId})\n` +
                 `  Status: ${task.status} | Priority: ${task.priority}\n` +
                 `  ${task.assignee ? `Assignee: ${task.assignee} | ` : ''}Due: ${dueDateStr} ${isOverdue ? '🔴 OVERDUE' : ''}\n` +
                 `  ${task.tags.length > 0 ? `Tags: ${task.tags.join(', ')} | ` : ''}Progress: ${task.progressPercentage}%\n` +
                 `  ${task.description || 'No description'}\n`;
        }).join('\n');

        return {
          content: [{
            type: 'text',
            text: `# 📋 Task List (${tasks.length} tasks)\n\n${taskList || 'No tasks match the criteria.'}`
          }]
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
          analyticsText += trends.slice(-5).map(trend => 
            `- ${new Date(trend.timestamp).toLocaleDateString()}: ${trend.score.toFixed(1)}% (${trend.trigger})`
          ).join('\n');
        }

        return {
          content: [{
            type: 'text',
            text: analyticsText
          }]
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
            content: [{
              type: 'text',
              text: `⚠️ No ADRs found in directory: ${adrDirectory}\n\n**Recommendations:**\n${discoveryResult.recommendations.join('\n')}`
            }]
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
                t => t.title === task.title && 
                     t.linkedAdrs.some(adr => task.linkedAdrs.includes(adr))
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
            
            if (previousTask && (previousTask.status === 'completed' || previousTask.progressPercentage > 0)) {
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
              importResults.push(`🔄 Imported with preserved completion: "${task.title}" (${previousTask.status}, ${previousTask.progressPercentage}%)`);
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
              ...(intentId && { intentId })
            });
            
            importedCount++;
            
          } catch (error) {
            importResults.push(`❌ Failed: "${task.title}" - ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        
        return {
          content: [{
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

${preservedCompletions > 0 ? `
## 🎯 Smart Completion Preservation
✅ **${preservedCompletions} task completions preserved** during import!
Tasks with the same title retained their completion status and progress.
` : ''}

## Next Steps
1. **View Tasks**: Use \`get_tasks\` operation to see imported tasks
2. **Sync to Markdown**: Tasks will be automatically synced to TODO.md
3. **Update Status**: Use \`update_task\` operation to track progress
4. **Link Knowledge Graph**: Tasks are ${intentId ? `linked to intent ${intentId}` : 'ready for intent linking'}

*All tasks have been imported into the JSON backend and are ready for the complete TODO management workflow.*`
          }]
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
          content: [{
            type: 'text',
            text: `✅ Knowledge graph sync completed!\n\n**Direction**: ${validatedArgs.direction}\n**Tasks with Intent Links**: ${Object.values(data.tasks).filter(t => t.intentId).length}\n\n*Task progress has been synced to the knowledge graph.*`
          }]
        };
      }

      case 'sync_to_markdown': {
        await todoManager.convertToMarkdown();
        
        return {
          content: [{
            type: 'text',
            text: `✅ Markdown sync completed!\n\n*TODO.md has been updated with the latest JSON data including health dashboard and formatted task lists.*`
          }]
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
          content: [{
            type: 'text',
            text: `✅ Markdown import completed!\n\n**Strategy**: ${validatedArgs.mergeStrategy}\n**Backup Created**: ${validatedArgs.backupExisting}\n\n*TODO.md has been parsed and imported into the JSON backend.*`
          }]
        };
      }

      case 'find_task': {
        const data = await todoManager.loadTodoData();
        const tasks = Object.values(data.tasks);
        const query = validatedArgs.query.toLowerCase();
        
        let matchingTasks = tasks.filter(task => {
          switch (validatedArgs.searchType) {
            case 'id':
              return task.id.toLowerCase().includes(query);
            case 'title':
              return task.title.toLowerCase().includes(query);
            case 'description':
              return task.description?.toLowerCase().includes(query);
            case 'fuzzy': {
              // Fuzzy search using edit distance for typos
              const fuzzyMatch = (text: string, searchTerm: string): boolean => {
                const editDistance = (a: string, b: string): number => {
                  const dp = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));
                  
                  for (let i = 0; i <= a.length; i++) dp[i]![0] = i;
                  for (let j = 0; j <= b.length; j++) dp[0]![j] = j;
                  
                  for (let i = 1; i <= a.length; i++) {
                    for (let j = 1; j <= b.length; j++) {
                      if (a[i - 1] === b[j - 1]) {
                        dp[i]![j] = dp[i - 1]![j - 1]!;
                      } else {
                        dp[i]![j] = Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!) + 1;
                      }
                    }
                  }
                  return dp[a.length]![b.length]!;
                };
                
                const words = text.toLowerCase().split(/\s+/);
                const searchWords = searchTerm.toLowerCase().split(/\s+/);
                
                return searchWords.every(searchWord => 
                  words.some(word => {
                    const distance = editDistance(word, searchWord);
                    const tolerance = Math.max(1, Math.floor(searchWord.length * 0.3)); // Allow 30% error
                    return distance <= tolerance;
                  })
                );
              };
              
              return fuzzyMatch(task.title, validatedArgs.query) ||
                     fuzzyMatch(task.description || '', validatedArgs.query) ||
                     task.tags.some(tag => fuzzyMatch(tag, validatedArgs.query));
            }
            case 'regex': {
              try {
                const regex = new RegExp(validatedArgs.query, 'i');
                return regex.test(task.title) ||
                       regex.test(task.description || '') ||
                       task.tags.some(tag => regex.test(tag));
              } catch {
                // Invalid regex, fall back to literal search
                return task.title.toLowerCase().includes(query) ||
                       (task.description?.toLowerCase().includes(query) || false) ||
                       task.tags.some(tag => tag.toLowerCase().includes(query));
              }
            }
            case 'multi_field': {
              const fields = validatedArgs.searchFields || ['title', 'description', 'tags'];
              return fields.some(field => {
                switch (field) {
                  case 'title':
                    return task.title.toLowerCase().includes(query);
                  case 'description':
                    return task.description?.toLowerCase().includes(query);
                  case 'assignee':
                    return task.assignee?.toLowerCase().includes(query);
                  case 'category':
                    return task.category?.toLowerCase().includes(query);
                  case 'tags':
                    return task.tags.some(tag => tag.toLowerCase().includes(query));
                  default:
                    return false;
                }
              });
            }
            case 'all':
            default:
              return task.id.toLowerCase().includes(query) ||
                     task.title.toLowerCase().includes(query) ||
                     task.description?.toLowerCase().includes(query) ||
                     task.tags.some(tag => tag.toLowerCase().includes(query));
          }
        });

        if (matchingTasks.length === 0) {
          // Provide search suggestions
          const suggestions = [
            "Try a shorter search term",
            "Use fuzzy search for typos: searchType: 'fuzzy'",
            "Search all fields with searchType: 'all'",
            "Use regex patterns with searchType: 'regex'"
          ];
          
          return {
            content: [{
              type: 'text',
              text: `❌ No tasks found matching "${validatedArgs.query}"\n\n**Search Type**: ${validatedArgs.searchType}\n**Total Tasks**: ${tasks.length}\n\n**suggestions:**\n${suggestions.map(s => `• ${s}`).join('\n')}\n\n*Try using a different query or search type.*`
            }]
          };
        }

        const taskList = matchingTasks.map(task => {
          const dueDateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
          
          return `**${task.title}**\n` +
                 `  🆔 **Full ID**: \`${task.id}\`\n` +
                 `  📋 **Short ID**: \`${task.id.substring(0, 8)}\`\n` +
                 `  📊 Status: ${task.status} | Priority: ${task.priority}\n` +
                 `  ${task.assignee ? `👤 Assignee: ${task.assignee} | ` : ''}📅 Due: ${dueDateStr} ${isOverdue ? '🔴 OVERDUE' : ''}\n` +
                 `  ${task.tags.length > 0 ? `🏷️ Tags: ${task.tags.join(', ')} | ` : ''}📈 Progress: ${task.progressPercentage}%\n` +
                 `  📝 ${task.description || 'No description'}\n`;
        }).join('\n');

        return {
          content: [{
            type: 'text',
            text: `# 🔍 Search Results (${matchingTasks.length} found)\n\n**Query**: "${validatedArgs.query}"\n**Search Type**: ${validatedArgs.searchType}\n\n${taskList}\n\n💡 **Tip**: Copy the Full ID to use with update_task operation.`
          }]
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
          .map((entry: any) => `- ${new Date(entry.timestamp).toLocaleDateString()}: ${entry.action} - ${entry.details}`)
          .join('\n');

        // Analyze current state
        const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
        const pendingHighPriority = tasks.filter(t => t.status === 'pending' && ['high', 'critical'].includes(t.priority));
        const overdueTasks = tasks.filter(t => 
          t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
        );
        const blockedTasks = tasks.filter(t => t.status === 'blocked');

        // Check deployment readiness
        let deploymentReadyTasks = [];
        let deploymentGuidance = '';
        
        if (validatedArgs.checkDeploymentReadiness) {
          deploymentReadyTasks = tasks.filter(t => 
            t.status === 'completed' && 
            (t.tags.includes('deployment') || t.category === 'Deployment' || 
             t.title.toLowerCase().includes('deploy') || t.description?.toLowerCase().includes('deploy'))
          );
          
          if (deploymentReadyTasks.length > 0) {
            deploymentGuidance = `\n## 🚀 Deployment Status\n**${deploymentReadyTasks.length} deployment-ready tasks found!**\n` +
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
              encoding: 'utf8'
            }).trim().split('\n').slice(0, 3);
            
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
            suggestions.push(`Address ${overdueTasks.length} overdue task(s) - these need immediate attention`);
          }
          
          if (blockedTasks.length > 0) {
            suggestions.push(`Unblock ${blockedTasks.length} blocked task(s) - resolve dependencies`);
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
${overdueTasks.length > 0 ? 
  overdueTasks.map(t => `- **${t.title}** (Due: ${new Date(t.dueDate!).toLocaleDateString()}) - ${t.priority} priority`).join('\n') : 
  '✅ No overdue tasks'}

## 🚧 Currently In Progress
${inProgressTasks.length > 0 ? 
  inProgressTasks.map(t => `- **${t.title}** (${t.progressPercentage}% complete) - ${t.assignee || 'Unassigned'}`).join('\n') : 
  '📝 No tasks currently in progress'}

## ⚠️ Blocked Tasks
${blockedTasks.length > 0 ? 
  blockedTasks.map(t => `- **${t.title}** - ${t.notes || 'No blocking reason specified'}`).join('\n') : 
  '✅ No blocked tasks'}

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
          content: [{
            type: 'text',
            text: resumeReport
          }]
        };
      }

      case 'delete_task': {
        const taskId = validatedArgs.taskId;
        const data = await todoManager.loadTodoData();
        
        if (!data.tasks[taskId]) {
          throw new McpAdrError(`Task ${taskId} not found`, 'TASK_NOT_FOUND');
        }

        // Check for dependencies unless force is true
        if (!validatedArgs.force) {
          const dependentTasks = Object.values(data.tasks).filter(t => 
            t.dependencies.includes(taskId) && t.status !== 'completed' && t.status !== 'cancelled'
          );
          
          if (dependentTasks.length > 0) {
            throw new McpAdrError(
              `Cannot delete task ${taskId} because it has active dependencies: ${dependentTasks.map(t => t.title).join(', ')}`, 
              'TASK_HAS_DEPENDENCIES'
            );
          }
        }

        // Delete the task
        delete data.tasks[taskId];
        
        // Update sections
        data.sections.forEach(section => {
          section.tasks = section.tasks.filter(id => id !== taskId);
        });

        // If force delete, clean up dependencies in other tasks
        if (validatedArgs.force) {
          Object.values(data.tasks).forEach(task => {
            task.dependencies = task.dependencies.filter(depId => depId !== taskId);
          });
        }

        data.metadata.lastUpdated = new Date().toISOString();
        await todoManager.saveTodoData(data);

        const forceMessage = validatedArgs.force ? ' (with dependency cleanup)' : '';
        return {
          content: [{
            type: 'text',
            text: `✅ Task deleted successfully${forceMessage}!\n\n**Task ID**: ${taskId}\n\n*Changes synced to JSON backend and TODO.md.*`
          }]
        };
      }

      case 'archive_task': {
        const taskId = validatedArgs.taskId;
        const data = await todoManager.loadTodoData();
        
        if (!data.tasks[taskId]) {
          throw new McpAdrError(`Task ${taskId} not found`, 'TASK_NOT_FOUND');
        }

        // Archive the task
        data.tasks[taskId].archived = true;
        data.tasks[taskId].archivedAt = new Date().toISOString();
        data.tasks[taskId].updatedAt = new Date().toISOString();
        
        data.metadata.lastUpdated = new Date().toISOString();
        await todoManager.saveTodoData(data);

        return {
          content: [{
            type: 'text',
            text: `✅ Task archived successfully!\n\n**Task ID**: ${taskId}\n**Archived At**: ${data.tasks[taskId].archivedAt}\n\n*Task moved to archive and synced to JSON backend.*`
          }]
        };
      }

      case 'undo_last': {
        const result = await todoManager.undoLastOperation();
        
        if (!result.success) {
          return {
            content: [{
              type: 'text',
              text: `❌ Cannot undo operation: ${result.error}`
            }]
          };
        }
        
        return {
          content: [{
            type: 'text',
            text: `✅ Undid operation: ${result.operation.operation}!\n\n**Operation**: ${result.operation.operation}\n**Description**: ${result.operation.description}\n**Time**: ${new Date(result.operation.timestamp).toLocaleString()}\n**Affected Tasks**: ${result.operation.affectedTaskIds.length > 0 ? result.operation.affectedTaskIds.join(', ') : 'None'}\n\n*The affected tasks have been restored to their previous state.*`
          }]
        };
      }

      case 'get_undo_history': {
        const history = await todoManager.getOperationHistory(validatedArgs.limit);
        
        if (history.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `📋 **Operation History**: No operations recorded yet.\n\n*Start creating and modifying tasks to build up your operation history.*`
            }]
          };
        }
        
        const historyList = history.map((op, index) => {
          return `${index + 1}. **${op.operation}** - ${op.description}\n   ⏱️ ${new Date(op.timestamp).toLocaleString()}\n   🎯 Affected: ${op.affectedTaskIds.length} task(s)`;
        }).join('\n\n');
        
        return {
          content: [{
            type: 'text',
            text: `📋 **undo history - Operation History** (Last ${history.length} operations)\n\n${historyList}\n\n💡 **Tip**: Use \`undo_last\` to undo the most recent operation.`
          }]
        };
      }

      case 'bulk_delete': {
        if (!validatedArgs.confirm) {
          throw new McpAdrError('Bulk delete requires confirmation. Set confirm: true to proceed.', 'CONFIRMATION_REQUIRED');
        }

        const data = await todoManager.loadTodoData();
        let deletedCount = 0;
        const notFoundTasks: string[] = [];

        for (const taskId of validatedArgs.taskIds) {
          if (data.tasks[taskId]) {
            delete data.tasks[taskId];
            // Remove from sections
            data.sections.forEach(section => {
              section.tasks = section.tasks.filter(id => id !== taskId);
            });
            deletedCount++;
          } else {
            notFoundTasks.push(taskId);
          }
        }

        data.metadata.lastUpdated = new Date().toISOString();
        await todoManager.saveTodoData(data);

        let resultMessage = `✅ ${deletedCount} tasks deleted successfully!\n\n**Tasks Deleted**: ${deletedCount}`;
        if (notFoundTasks.length > 0) {
          resultMessage += `\n**Not Found**: ${notFoundTasks.length} tasks were not found`;
        }
        resultMessage += `\n\n*Changes synced to JSON backend and TODO.md.*`;

        return {
          content: [{
            type: 'text',
            text: resultMessage
          }]
        };
      }

      default:
        throw new McpAdrError(`Unknown operation: ${(validatedArgs as any).operation}`, 'INVALID_INPUT');
    }

  } catch (error) {
    // Re-throw TodoManagerError as-is to preserve enhanced error information
    if (error instanceof TodoManagerError) {
      throw error;
    }
    
    if (error instanceof z.ZodError) {
      // Create more specific error messages
      const errorDetails = error.errors.map(err => {
        const path = err.path.length > 0 ? err.path.join('.') : 'input';
        const message = err.message;
        return `${path}: ${message}`;
      }).join(', ');
      
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
  const taskListRegex = /(?:##?\s*(?:tasks?|todo|implementation|action items?)\s*\n)([\s\S]*?)(?=\n##|\n#|$)/gi;
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
      linkedAdrs: []
    });
  }
  
  return tasks;
}

/**
 * Extract tasks from text content using patterns
 */
function extractTasksFromText(text: string, defaultCategory: string, defaultPriority: string): any[] {
  const tasks: any[] = [];
  
  // Look for bullet points that look like tasks
  const taskPatterns = [
    /[-*+]\s+(.+?)(?:\n|$)/g,
    /\d+\.\s+(.+?)(?:\n|$)/g,
    /(?:must|should|will|need to|implement|create|build|develop|configure|setup|establish)\s+(.+?)(?:\.|$)/gi
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
        ...(assignee && { assignee })
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