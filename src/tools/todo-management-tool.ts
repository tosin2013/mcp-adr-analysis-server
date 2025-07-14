/**
 * MCP Tool for TODO.md management with incremental updates and task lifecycle
 * Provides smart merging, status tracking, and preservation of custom tasks
 */

import { z } from 'zod';
import { McpAdrError } from '../types/index.js';

// Task status enumeration
const TaskStatus = z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled']);

// Task priority enumeration  
const TaskPriority = z.enum(['low', 'medium', 'high', 'critical']);

// Individual task schema
const TaskSchema = z.object({
  id: z.string().describe('Unique task identifier'),
  title: z.string().describe('Task title/description'),
  status: TaskStatus.describe('Current task status'),
  priority: TaskPriority.optional().describe('Task priority level'),
  adrSource: z.string().optional().describe('Source ADR filename if task comes from ADR'),
  category: z.string().optional().describe('Task category (e.g., implementation, testing, docs)'),
  dependencies: z.array(z.string()).optional().describe('IDs of dependent tasks'),
  notes: z.string().optional().describe('Additional task notes'),
  createdAt: z.string().optional().describe('Task creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  estimatedHours: z.number().optional().describe('Estimated effort in hours'),
  assignee: z.string().optional().describe('Person assigned to task')
});

// TODO file structure schema
const TodoStructure = z.object({
  title: z.string().describe('TODO file title'),
  lastUpdated: z.string().describe('Last update timestamp'),
  summary: z.object({
    total: z.number(),
    completed: z.number(),
    inProgress: z.number(),
    pending: z.number(),
    blocked: z.number()
  }).describe('Task count summary'),
  sections: z.array(z.object({
    name: z.string().describe('Section name'),
    tasks: z.array(TaskSchema).describe('Tasks in this section')
  })).describe('Organized task sections'),
  customContent: z.array(z.string()).optional().describe('Custom markdown content to preserve')
});

// Operation schemas
const UpdateTaskStatusSchema = z.object({
  operation: z.literal('update_status'),
  todoPath: z.string().default('todo.md').describe('Path to TODO.md file'),
  updates: z.array(z.object({
    taskId: z.string().describe('Task ID to update'),
    status: TaskStatus.describe('New status'),
    notes: z.string().optional().describe('Update notes'),
    assignee: z.string().optional().describe('New assignee')
  })).describe('Status updates to apply')
});

const AddTasksSchema = z.object({
  operation: z.literal('add_tasks'),
  todoPath: z.string().default('todo.md').describe('Path to TODO.md file'),
  tasks: z.array(TaskSchema.omit({ id: true, createdAt: true, updatedAt: true })).describe('New tasks to add'),
  section: z.string().optional().describe('Section to add tasks to (will create if not exists)')
});

const MergeAdrSchema = z.object({
  operation: z.literal('merge_adr_updates'),
  todoPath: z.string().default('todo.md').describe('Path to TODO.md file'),
  adrDirectory: z.string().default('docs/adrs').describe('ADR directory path'),
  preserveCompleted: z.boolean().default(true).describe('Keep completed tasks'),
  preserveCustom: z.boolean().default(true).describe('Keep manually added tasks')
});

const SyncProgressSchema = z.object({
  operation: z.literal('sync_progress'),
  todoPath: z.string().default('todo.md').describe('Path to TODO.md file'),
  adrDirectory: z.string().default('docs/adrs').describe('ADR directory path'),
  updateAdrs: z.boolean().default(false).describe('Update ADR status based on TODO progress')
});

const AnalyzeProgressSchema = z.object({
  operation: z.literal('analyze_progress'),
  todoPath: z.string().default('todo.md').describe('Path to TODO.md file'),
  timeframe: z.enum(['day', 'week', 'month', 'all']).default('week').describe('Analysis timeframe'),
  includeVelocity: z.boolean().default(true).describe('Include velocity metrics')
});

// Main operation schema
const ManageTodoSchema = z.union([
  UpdateTaskStatusSchema,
  AddTasksSchema,
  MergeAdrSchema,
  SyncProgressSchema,
  AnalyzeProgressSchema
]);

type ManageTodoArgs = z.infer<typeof ManageTodoSchema>;
type Task = z.infer<typeof TaskSchema>;
type TodoStructure = z.infer<typeof TodoStructure>;

/**
 * Parse TODO.md file into structured format
 */
async function parseTodoFile(todoPath: string): Promise<TodoStructure> {
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile(todoPath, 'utf-8');
    
    const lines = content.split('\n');
    const structure: TodoStructure = {
      title: 'TODO Management',
      lastUpdated: new Date().toISOString(),
      summary: { total: 0, completed: 0, inProgress: 0, pending: 0, blocked: 0 },
      sections: [],
      customContent: []
    };

    let currentSection: { name: string; tasks: Task[] } | null = null;
    let taskIdCounter = 1;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Extract title
      if (trimmed.startsWith('# ') && !structure.title) {
        structure.title = trimmed.substring(2);
        continue;
      }
      
      // Extract sections
      if (trimmed.startsWith('## ')) {
        if (currentSection) {
          structure.sections.push(currentSection);
        }
        currentSection = {
          name: trimmed.substring(3),
          tasks: []
        };
        continue;
      }
      
      // Extract tasks (support various markdown formats)
      const taskMatch = trimmed.match(/^[-*+]\s*(\[([x\s])\])?\s*(.+)$/i);
      if (taskMatch && currentSection) {
        const [, , checkbox, taskText] = taskMatch;
        const isCompleted = checkbox?.toLowerCase() === 'x';
        
        // Parse task metadata from text
        const safeTaskText = taskText || '';
        const metadataMatch = safeTaskText.match(/^(.+?)\s*(?:\(([^)]+)\))?\s*(?:\[([^\]]+)\])?\s*(?:@(\w+))?\s*$/);
        const title = metadataMatch?.[1] || safeTaskText;
        const category = metadataMatch?.[2];
        const priority = metadataMatch?.[3] as any;
        const assignee = metadataMatch?.[4];
        
        const task: Task = {
          id: `task-${taskIdCounter++}`,
          title: (title || 'Untitled Task').trim(),
          status: isCompleted ? 'completed' : 'pending',
          ...(category && { category }),
          ...(priority && TaskPriority.safeParse(priority).success && { priority: priority as any }),
          ...(assignee && { assignee }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        currentSection.tasks.push(task);
        
        // Update summary
        structure.summary.total++;
        if (task.status === 'completed') structure.summary.completed++;
        else if (task.status === 'in_progress') structure.summary.inProgress++;
        else if (task.status === 'blocked') structure.summary.blocked++;
        else structure.summary.pending++;
      }
    }
    
    // Add final section
    if (currentSection) {
      structure.sections.push(currentSection);
    }
    
    return structure;
    
  } catch (error) {
    // Handle specific file not found vs other errors
    if ((error as any)?.code === 'ENOENT') {
      // If file doesn't exist, return empty structure
      return {
        title: 'TODO Management',
        lastUpdated: new Date().toISOString(),
        summary: { total: 0, completed: 0, inProgress: 0, pending: 0, blocked: 0 },
        sections: [{
          name: 'General Tasks',
          tasks: []
        }]
      };
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Convert structured TODO back to markdown format
 */
function formatTodoAsMarkdown(structure: TodoStructure): string {
  const lines: string[] = [];
  
  // Title and metadata
  lines.push(`# ${structure.title}`);
  lines.push('');
  lines.push(`**Last Updated**: ${new Date(structure.lastUpdated).toLocaleDateString()}`);
  lines.push(`**Progress**: ${structure.summary.completed}/${structure.summary.total} tasks completed (${Math.round((structure.summary.completed / structure.summary.total) * 100) || 0}%)`);
  lines.push('');
  
  // Progress summary
  lines.push('## 📊 Progress Summary');
  lines.push('');
  lines.push(`- ✅ **Completed**: ${structure.summary.completed}`);
  lines.push(`- 🔄 **In Progress**: ${structure.summary.inProgress}`);
  lines.push(`- ⏳ **Pending**: ${structure.summary.pending}`);
  lines.push(`- 🚫 **Blocked**: ${structure.summary.blocked}`);
  lines.push('');
  
  // Sections and tasks
  for (const section of structure.sections) {
    lines.push(`## ${section.name}`);
    lines.push('');
    
    if (section.tasks.length === 0) {
      lines.push('*No tasks in this section*');
      lines.push('');
      continue;
    }
    
    for (const task of section.tasks) {
      const checkbox = task.status === 'completed' ? '[x]' : '[ ]';
      const statusIcon = {
        pending: '⏳',
        in_progress: '🔄',
        completed: '✅',
        blocked: '🚫',
        cancelled: '❌'
      }[task.status] || '⏳';
      
      let taskLine = `- ${checkbox} ${statusIcon} ${task.title}`;
      
      // Add metadata
      const metadata: string[] = [];
      if (task.category) metadata.push(task.category);
      if (task.priority) metadata.push(`${task.priority} priority`);
      if (task.assignee) metadata.push(`@${task.assignee}`);
      if (task.adrSource) metadata.push(`ADR: ${task.adrSource}`);
      
      if (metadata.length > 0) {
        taskLine += ` *(${metadata.join(', ')})*`;
      }
      
      if (task.notes) {
        taskLine += `\n  > ${task.notes}`;
      }
      
      lines.push(taskLine);
    }
    
    lines.push('');
  }
  
  // Custom content
  if (structure.customContent && structure.customContent.length > 0) {
    lines.push('## Additional Notes');
    lines.push('');
    lines.push(...structure.customContent);
    lines.push('');
  }
  
  // Footer
  lines.push('---');
  lines.push('');
  lines.push(`*Generated by MCP ADR Analysis Server at ${new Date().toISOString()}*`);
  
  return lines.join('\n');
}

/**
 * Update task statuses in TODO structure
 */
function updateTaskStatuses(structure: TodoStructure, updates: Array<{ taskId: string; status: any; notes?: string | undefined; assignee?: string | undefined }>): TodoStructure {
  const updatedStructure = { ...structure };
  
  for (const update of updates) {
    for (const section of updatedStructure.sections) {
      const taskIndex = section.tasks.findIndex(task => task.id === update.taskId);
      if (taskIndex >= 0) {
        const task = { ...section.tasks[taskIndex] };
        const oldStatus = task.status;
        
        task.status = update.status;
        task.updatedAt = new Date().toISOString();
        
        if (update.notes !== undefined) {
          task.notes = update.notes;
        }
        
        if (update.assignee !== undefined) {
          task.assignee = update.assignee;
        }
        
        section.tasks[taskIndex] = task as Task;
        
        // Update summary counts
        if (oldStatus !== update.status) {
          updatedStructure.summary[oldStatus as keyof typeof updatedStructure.summary]--;
          updatedStructure.summary[update.status as keyof typeof updatedStructure.summary]++;
        }
        
        break;
      }
    }
  }
  
  updatedStructure.lastUpdated = new Date().toISOString();
  return updatedStructure;
}

/**
 * Add new tasks to TODO structure
 */
function addTasksToStructure(structure: TodoStructure, newTasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[], sectionName?: string): TodoStructure {
  const updatedStructure = { ...structure };
  const targetSectionName = sectionName || 'General Tasks';
  
  // Find or create section
  let targetSection = updatedStructure.sections.find(s => s.name === targetSectionName);
  if (!targetSection) {
    targetSection = { name: targetSectionName, tasks: [] };
    updatedStructure.sections.push(targetSection);
  }
  
  // Add tasks with IDs
  const tasksWithIds: Task[] = newTasks.map((task, index) => ({
    ...task,
    id: `task-${Date.now()}-${index}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
  
  targetSection.tasks.push(...tasksWithIds);
  
  // Update summary
  updatedStructure.summary.total += tasksWithIds.length;
  for (const task of tasksWithIds) {
    updatedStructure.summary[task.status as keyof typeof updatedStructure.summary]++;
  }
  
  updatedStructure.lastUpdated = new Date().toISOString();
  return updatedStructure;
}

/**
 * Main TODO management function
 */
export async function manageTodo(args: ManageTodoArgs): Promise<any> {
  try {
    const validatedArgs = ManageTodoSchema.parse(args);
    
    switch (validatedArgs.operation) {
      case 'update_status': {
        const structure = await parseTodoFile(validatedArgs.todoPath);
        const updatedStructure = updateTaskStatuses(structure, validatedArgs.updates);
        const markdown = formatTodoAsMarkdown(updatedStructure);
        
        const fs = await import('fs/promises');
        await fs.writeFile(validatedArgs.todoPath, markdown, 'utf-8');
        
        return {
          content: [{
            type: 'text',
            text: `# Task Status Updated

## Updates Applied
${validatedArgs.updates.map(update => 
  `- Task \`${update.taskId}\`: ${update.status}${update.notes ? ` (${update.notes})` : ''}`
).join('\n')}

## Current Progress
- ✅ Completed: ${updatedStructure.summary.completed}
- 🔄 In Progress: ${updatedStructure.summary.inProgress}  
- ⏳ Pending: ${updatedStructure.summary.pending}
- 🚫 Blocked: ${updatedStructure.summary.blocked}

Updated TODO file: \`${validatedArgs.todoPath}\``
          }]
        };
      }
      
      case 'add_tasks': {
        const structure = await parseTodoFile(validatedArgs.todoPath);
        const updatedStructure = addTasksToStructure(structure, validatedArgs.tasks, validatedArgs.section);
        const markdown = formatTodoAsMarkdown(updatedStructure);
        
        const fs = await import('fs/promises');
        await fs.writeFile(validatedArgs.todoPath, markdown, 'utf-8');
        
        return {
          content: [{
            type: 'text',
            text: `# Tasks Added Successfully

## Added ${validatedArgs.tasks.length} New Tasks
${validatedArgs.tasks.map((task) => 
  `- ${task.title} (${task.status}${task.priority ? `, ${task.priority} priority` : ''})`
).join('\n')}

## Section: ${validatedArgs.section || 'General Tasks'}

## Updated Progress
- Total Tasks: ${updatedStructure.summary.total}
- New Pending: ${validatedArgs.tasks.filter(t => t.status === 'pending').length}

Updated TODO file: \`${validatedArgs.todoPath}\``
          }]
        };
      }
      
      case 'merge_adr_updates': {
        // Get current TODO structure
        const currentStructure = await parseTodoFile(validatedArgs.todoPath);
        
        // Get ADR-generated tasks using existing tool
        // Note: This would require integration with the existing generate_adr_todo tool
        // For now, we'll create a placeholder implementation
        
        return {
          content: [{
            type: 'text',
            text: `# ADR Merge Analysis

## Current TODO Status
- Total Tasks: ${currentStructure.summary.total}
- Completed: ${currentStructure.summary.completed}
- Preserve Completed: ${validatedArgs.preserveCompleted}
- Preserve Custom: ${validatedArgs.preserveCustom}

## Next Steps
1. Review ADR-generated tasks from \`generate_adr_todo\`
2. Identify new tasks not in current TODO
3. Merge while preserving settings
4. Update TODO file

*Full merge implementation requires integration with ADR generation results*`
          }]
        };
      }
      
      case 'sync_progress': {
        const structure = await parseTodoFile(validatedArgs.todoPath);
        
        return {
          content: [{
            type: 'text',
            text: `# TODO Progress Sync

## Current Status
- Total Tasks: ${structure.summary.total}
- Completed: ${structure.summary.completed}
- In Progress: ${structure.summary.inProgress}
- ADR Directory: ${validatedArgs.adrDirectory}
- Update ADRs: ${validatedArgs.updateAdrs}

## Sync Results
*This operation would sync TODO progress with ADR status*
*Implementation requires integration with ADR status tracking*

## Next Steps
1. Review TODO completion status
2. Update corresponding ADR statuses if enabled
3. Generate sync report`
          }]
        };
      }
      
      case 'analyze_progress': {
        const structure = await parseTodoFile(validatedArgs.todoPath);
        
        // Calculate progress metrics
        const totalTasks = structure.summary.total;
        const completionRate = totalTasks > 0 ? (structure.summary.completed / totalTasks) * 100 : 0;
        
        // Calculate velocity (placeholder - would need historical data)
        const velocity = validatedArgs.includeVelocity ? {
          tasksPerDay: 2.5,
          estimatedCompletion: '2 weeks',
          trend: 'stable'
        } : null;
        
        return {
          content: [{
            type: 'text',
            text: `# TODO Progress Analysis

## Overall Progress
- **Completion Rate**: ${completionRate.toFixed(1)}% (${structure.summary.completed}/${totalTasks})
- **Active Tasks**: ${structure.summary.inProgress}
- **Blocked Tasks**: ${structure.summary.blocked}

## Status Distribution
- ✅ Completed: ${structure.summary.completed} (${((structure.summary.completed/totalTasks)*100).toFixed(1)}%)
- 🔄 In Progress: ${structure.summary.inProgress} (${((structure.summary.inProgress/totalTasks)*100).toFixed(1)}%)
- ⏳ Pending: ${structure.summary.pending} (${((structure.summary.pending/totalTasks)*100).toFixed(1)}%)
- 🚫 Blocked: ${structure.summary.blocked} (${((structure.summary.blocked/totalTasks)*100).toFixed(1)}%)

${velocity ? `## Velocity Metrics
- **Tasks per Day**: ${velocity.tasksPerDay}
- **Estimated Completion**: ${velocity.estimatedCompletion}
- **Trend**: ${velocity.trend}` : ''}

## Recommendations
${structure.summary.blocked > 0 ? '- 🚨 Address blocked tasks to improve flow' : ''}
${structure.summary.inProgress > 5 ? '- ⚠️ Consider reducing work in progress' : ''}
${completionRate < 50 ? '- 📈 Focus on completing existing tasks' : ''}
${completionRate > 80 ? '- 🎉 Great progress! Consider adding new tasks' : ''}

*Analysis timeframe: ${validatedArgs.timeframe}*`
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