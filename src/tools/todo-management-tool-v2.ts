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
import { TodoJsonManager } from '../utils/todo-json-manager.js';
import { KnowledgeGraphManager } from '../utils/knowledge-graph-manager.js';
// Remove unused import

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
    tags: z.array(z.string()).optional()
  }).describe('Fields to update'),
  reason: z.string().describe('Reason for update (for changelog)')
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
  reason: z.string().describe('Reason for bulk update')
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
    tags: z.array(z.string()).optional()
  }).optional().describe('Filter criteria'),
  sortBy: z.enum(['priority', 'dueDate', 'createdAt', 'updatedAt']).default('priority'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().optional().describe('Maximum number of tasks to return')
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
  ImportFromMarkdownSchema
]);

type TodoManagementV2Args = z.infer<typeof TodoManagementV2Schema>;

/**
 * Main TODO management function with JSON backend
 */
export async function manageTodoV2(args: TodoManagementV2Args): Promise<any> {
  try {
    const validatedArgs = TodoManagementV2Schema.parse(args);
    const todoManager = new TodoJsonManager(validatedArgs.projectPath);
    const kgManager = new KnowledgeGraphManager();

    switch (validatedArgs.operation) {
      case 'create_task': {
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
        
        await todoManager.updateTask({
          taskId: validatedArgs.taskId,
          updates: cleanUpdates,
          reason: validatedArgs.reason,
          triggeredBy: 'tool'
        });

        return {
          content: [{
            type: 'text',
            text: `✅ Task updated successfully!\n\n**Task ID**: ${validatedArgs.taskId}\n**Updates**: ${Object.keys(validatedArgs.updates).join(', ')}\n**Reason**: ${validatedArgs.reason}\n\n*Changes synced to JSON backend and TODO.md.*`
          }]
        };
      }

      case 'bulk_update': {
        let updateCount = 0;
        
        for (const update of validatedArgs.updates) {
          // Filter out undefined values
          const cleanUpdates: any = {};
          if (update.status !== undefined) cleanUpdates.status = update.status;
          if (update.priority !== undefined) cleanUpdates.priority = update.priority;
          if (update.assignee !== undefined) cleanUpdates.assignee = update.assignee;
          if (update.notes !== undefined) cleanUpdates.notes = update.notes;
          
          await todoManager.updateTask({
            taskId: update.taskId,
            updates: cleanUpdates,
            reason: validatedArgs.reason,
            triggeredBy: 'tool'
          });
          updateCount++;
        }

        return {
          content: [{
            type: 'text',
            text: `✅ Bulk update completed!\n\n**Tasks Updated**: ${updateCount}\n**Reason**: ${validatedArgs.reason}\n\n*All changes synced to JSON backend and TODO.md.*`
          }]
        };
      }

      case 'get_tasks': {
        const data = await todoManager.loadTodoData();
        let tasks = Object.values(data.tasks);

        // Apply filters
        if (validatedArgs.filters) {
          const filters = validatedArgs.filters;
          
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
          
          return `**${task.title}** (${task.id.substring(0, 8)})\n` +
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
        
        // Extract tasks from each ADR
        const extractedTasks = await extractTasksFromAdrs(
          discoveryResult.adrs,
          adrDirectory,
          intentId,
          autoLinkDependencies
        );
        
        // Import tasks into JSON backend
        let importedCount = 0;
        let skippedCount = 0;
        const importResults = [];
        
        for (const task of extractedTasks) {
          try {
            // Check if task already exists (by title and ADR reference)
            const existingData = await todoManager.loadTodoData();
            const existingTask = Object.values(existingData.tasks).find(
              t => t.title === task.title && 
                   t.linkedAdrs.some(adr => task.linkedAdrs.includes(adr))
            );
            
            if (existingTask && preserveExisting) {
              skippedCount++;
              importResults.push(`⏭️ Skipped: "${task.title}" (already exists)`);
              continue;
            }
            
            // Create the task
            await todoManager.createTask({
              title: task.title,
              description: task.description,
              priority: task.priority,
              category: task.category,
              tags: task.tags,
              dependencies: task.dependencies,
              linkedAdrs: task.linkedAdrs,
              assignee: task.assignee,
              ...(intentId && { intentId })
            });
            
            importedCount++;
            importResults.push(`✅ Imported: "${task.title}" (${task.priority} priority)`);
            
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
- **Preserve Existing**: ${preserveExisting}
- **Auto-Link Dependencies**: ${autoLinkDependencies}

## ADR Status Overview
${Object.entries(discoveryResult.summary.byStatus)
  .map(([status, count]) => `- **${status}**: ${count} ADRs`)
  .join('\n')}

## Import Results
${importResults.join('\n')}

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

      default:
        throw new McpAdrError(`Unknown operation: ${(validatedArgs as any).operation}`, 'INVALID_INPUT');
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpAdrError(`Invalid input: ${error.errors.map(e => e.message).join(', ')}`, 'INVALID_INPUT');
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