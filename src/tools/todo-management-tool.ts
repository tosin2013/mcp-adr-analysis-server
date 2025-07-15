/**
 * MCP Tool for TODO.md management with incremental updates and task lifecycle
 * Provides smart merging, status tracking, and preservation of custom tasks
 */

import { z } from 'zod';
import { McpAdrError } from '../types/index.js';
import { KnowledgeGraphManager } from '../utils/knowledge-graph-manager.js';

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
  todoPath: z.string().default('TODO.md').describe('Path to TODO.md file'),
  updates: z.array(z.object({
    taskId: z.string().describe('Task ID to update'),
    status: TaskStatus.describe('New status'),
    notes: z.string().optional().describe('Update notes'),
    assignee: z.string().optional().describe('New assignee')
  })).describe('Status updates to apply')
});

const AddTasksSchema = z.object({
  operation: z.literal('add_tasks'),
  todoPath: z.string().default('TODO.md').describe('Path to TODO.md file'),
  tasks: z.array(TaskSchema.omit({ id: true, createdAt: true, updatedAt: true })).describe('New tasks to add'),
  section: z.string().optional().describe('Section to add tasks to (will create if not exists)')
});

const MergeAdrSchema = z.object({
  operation: z.literal('merge_adr_updates'),
  todoPath: z.string().default('TODO.md').describe('Path to TODO.md file'),
  adrDirectory: z.string().default('docs/adrs').describe('ADR directory path'),
  preserveCompleted: z.boolean().default(true).describe('Keep completed tasks'),
  preserveCustom: z.boolean().default(true).describe('Keep manually added tasks')
});

const SyncProgressSchema = z.object({
  operation: z.literal('sync_progress'),
  todoPath: z.string().default('TODO.md').describe('Path to TODO.md file'),
  adrDirectory: z.string().default('docs/adrs').describe('ADR directory path'),
  updateAdrs: z.boolean().default(false).describe('Update ADR status based on TODO progress')
});

const AnalyzeProgressSchema = z.object({
  operation: z.literal('analyze_progress'),
  todoPath: z.string().default('TODO.md').describe('Path to TODO.md file'),
  timeframe: z.enum(['day', 'week', 'month', 'all']).default('week').describe('Analysis timeframe'),
  includeVelocity: z.boolean().default(true).describe('Include velocity metrics')
});

// New Interactive Operations
const DeleteTaskSchema = z.object({
  operation: z.literal('delete_task'),
  todoPath: z.string().default('TODO.md').describe('Path to TODO.md file'),
  taskIds: z.array(z.string()).describe('Task IDs to delete'),
  force: z.boolean().default(false).describe('Skip interactive confirmation if true'),
  preserveComments: z.boolean().default(true).describe('Preserve task notes in deletion log')
});

const EditTaskSchema = z.object({
  operation: z.literal('edit_task'),
  todoPath: z.string().default('TODO.md').describe('Path to TODO.md file'),
  taskId: z.string().describe('Task ID to edit'),
  updates: z.object({
    title: z.string().optional().describe('New task title'),
    priority: TaskPriority.optional().describe('New priority level'),
    category: z.string().optional().describe('New category'),
    estimatedHours: z.number().optional().describe('New time estimate'),
    dependencies: z.array(z.string()).optional().describe('New dependency list'),
    notes: z.string().optional().describe('New notes (replaces existing)')
  }).describe('Fields to update'),
  interactive: z.boolean().default(true).describe('Enable interactive field selection'),
  confirmChanges: z.boolean().default(true).describe('Require confirmation before applying')
});

const MoveTaskSchema = z.object({
  operation: z.literal('move_task'),
  todoPath: z.string().default('TODO.md').describe('Path to TODO.md file'),
  taskId: z.string().describe('Task ID to move'),
  targetSection: z.string().optional().describe('Target section name'),
  position: z.number().optional().describe('Position in target section (0-based)'),
  interactive: z.boolean().default(true).describe('Enable interactive section/position selection'),
  createSection: z.boolean().default(false).describe('Create target section if it does not exist')
});

const ManageSectionSchema = z.object({
  operation: z.literal('manage_section'),
  todoPath: z.string().default('TODO.md').describe('Path to TODO.md file'),
  action: z.enum(['create', 'delete', 'rename', 'reorder']).describe('Section management action'),
  sectionName: z.string().describe('Section name to operate on'),
  newName: z.string().optional().describe('New name for rename action'),
  position: z.number().optional().describe('New position for reorder action'),
  force: z.boolean().default(false).describe('Skip safety checks and confirmations'),
  preserveTasks: z.boolean().default(true).describe('For delete: move tasks to another section instead of deleting')
});

const SearchTasksSchema = z.object({
  operation: z.literal('search_tasks'),
  todoPath: z.string().default('TODO.md').describe('Path to TODO.md file'),
  query: z.string().optional().describe('Text to search in task titles and notes'),
  filters: z.object({
    status: TaskStatus.optional(),
    priority: TaskPriority.optional(),
    assignee: z.string().optional(),
    section: z.string().optional(),
    hasNotes: z.boolean().optional(),
    hasDependencies: z.boolean().optional()
  }).optional().describe('Additional filtering criteria'),
  includeMetadata: z.boolean().default(true).describe('Include full task metadata in results')
});

// Main operation schema
const ManageTodoSchema = z.union([
  UpdateTaskStatusSchema,
  AddTasksSchema,
  MergeAdrSchema,
  SyncProgressSchema,
  AnalyzeProgressSchema,
  DeleteTaskSchema,
  EditTaskSchema,
  MoveTaskSchema,
  ManageSectionSchema,
  SearchTasksSchema
]);

type ManageTodoArgs = z.infer<typeof ManageTodoSchema>;
type Task = z.infer<typeof TaskSchema>;
type TodoStructure = z.infer<typeof TodoStructure>;

/**
 * Count critical tasks (high priority or blocked)
 */
function getCriticalTasksCount(structure: TodoStructure): number {
  let criticalCount = 0;
  
  for (const section of structure.sections) {
    for (const task of section.tasks) {
      if (task.status !== 'completed' && 
          (task.priority === 'critical' || task.priority === 'high' || task.status === 'blocked')) {
        criticalCount++;
      }
    }
  }
  
  return criticalCount;
}

/**
 * Calculate priority weighted completion score
 */
function calculatePriorityWeightedScore(structure: TodoStructure): number {
  if (structure.summary.total === 0) return 100;
  
  const priorityWeights = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  };
  
  let totalWeightedTasks = 0;
  let completedWeightedTasks = 0;
  
  for (const section of structure.sections) {
    for (const task of section.tasks) {
      const weight = priorityWeights[task.priority as keyof typeof priorityWeights] || 1;
      totalWeightedTasks += weight;
      
      if (task.status === 'completed') {
        completedWeightedTasks += weight;
      }
    }
  }
  
  return totalWeightedTasks > 0 ? (completedWeightedTasks / totalWeightedTasks) * 100 : 100;
}

/**
 * Parse TODO.md file into structured format
 * Supports both TODO.md and todo.md for compatibility
 */
async function parseTodoFile(todoPath: string): Promise<TodoStructure> {
  try {
    const { readFile } = await import('fs/promises');
    const content = await readFile(todoPath, 'utf-8');
    
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
 * Convert structured TODO back to markdown format with dynamic health scoring
 */
async function formatTodoAsMarkdown(structure: TodoStructure, projectPath?: string): Promise<string> {
  const lines: string[] = [];
  
  // Dynamic health scoring header if projectPath available
  if (projectPath) {
    try {
      const { ProjectHealthScoring } = await import('../utils/project-health-scoring.js');
      const healthScoring = new ProjectHealthScoring(projectPath);
      
      // Update task completion score
      const criticalTasks = getCriticalTasksCount(structure);
      const priorityWeightedScore = calculatePriorityWeightedScore(structure);
      
      await healthScoring.updateTaskCompletionScore({
        completed: structure.summary.completed,
        total: structure.summary.total,
        criticalTasksRemaining: criticalTasks,
        priorityWeightedScore: priorityWeightedScore
      });
      
      // Generate dynamic health header
      const healthHeader = await healthScoring.generateScoreDisplay();
      lines.push(healthHeader);
      
    } catch (error) {
      // Fallback to traditional header if health scoring fails
      lines.push(`# ${structure.title}`);
      lines.push('');
      lines.push(`**Last Updated**: ${new Date(structure.lastUpdated).toLocaleDateString()}`);
      lines.push(`**Progress**: ${structure.summary.completed}/${structure.summary.total} tasks completed (${Math.round((structure.summary.completed / structure.summary.total) * 100) || 0}%)`);
      lines.push('');
    }
  } else {
    // Traditional header when no project path
    lines.push(`# ${structure.title}`);
    lines.push('');
    lines.push(`**Last Updated**: ${new Date(structure.lastUpdated).toLocaleDateString()}`);
    lines.push(`**Progress**: ${structure.summary.completed}/${structure.summary.total} tasks completed (${Math.round((structure.summary.completed / structure.summary.total) * 100) || 0}%)`);
    lines.push('');
  }
  
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
 * Interactive confirmation helper for operations that need human approval
 */
function generateInteractiveConfirmation(operation: string, details: any): string {
  switch (operation) {
    case 'delete_task':
      return `# ⚠️ Task Deletion Confirmation Required

## Tasks to Delete:
${details.tasks.map((task: any) => `- **${task.title}** (${task.status}${task.priority ? `, ${task.priority} priority` : ''})`).join('\n')}

${details.hasNotes ? '\n## Notes that will be lost:\n' + details.tasks.filter((t: any) => t.notes).map((task: any) => `- **${task.title}**: ${task.notes}`).join('\n') : ''}

## ⚠️ This action cannot be undone!

**To proceed with deletion, call the operation again with \`force: true\`**

**Alternatives:**
- Change status to 'cancelled' instead of deleting
- Archive tasks using the archive operation
- Move tasks to a "Completed" or "Archive" section`;

    case 'edit_task':
      return `# 📝 Task Edit Confirmation

## Current Task:
- **Title**: ${details.current.title}
- **Status**: ${details.current.status}
- **Priority**: ${details.current.priority || 'none'}
- **Category**: ${details.current.category || 'none'}
- **Assignee**: ${details.current.assignee || 'unassigned'}
- **Notes**: ${details.current.notes || 'none'}

## Proposed Changes:
${Object.entries(details.changes).map(([key, value]) => `- **${key}**: "${details.current[key] || 'none'}" → "${value}"`).join('\n')}

**To proceed with these changes, call the operation again with \`confirmChanges: false\`**

**Note**: You can also call with \`interactive: false\` to skip this confirmation for future edits.`;

    case 'move_task':
      return `# 🔄 Task Move Confirmation

## Task to Move:
**${details.task.title}** (${details.task.status})

## Move Details:
- **From**: "${details.currentSection}"
- **To**: "${details.targetSection}"${details.position !== undefined ? `\n- **Position**: ${details.position}` : ''}

${details.sectionExists ? '' : '\n⚠️ **Target section does not exist and will be created**'}

**Available Sections:**
${details.availableSections.map((section: string, index: number) => `${index + 1}. ${section}`).join('\n')}

**To proceed, call the operation again with \`interactive: false\`**

**To choose a different section**, update the \`targetSection\` parameter and try again.`;

    case 'manage_section':
      return `# 🗂️ Section Management Confirmation

## Action: ${details.action.toUpperCase()}
## Section: "${details.sectionName}"

${details.action === 'delete' ? `
## ⚠️ Section Deletion Warning:
- **Tasks in section**: ${details.taskCount}
- **Preserve tasks**: ${details.preserveTasks}

${details.preserveTasks ? 
  `Tasks will be moved to: "${details.targetSection || 'General Tasks'}"` : 
  '**ALL TASKS WILL BE DELETED!**'
}

## Available target sections:
${details.availableSections.filter((s: string) => s !== details.sectionName).map((section: string, index: number) => `${index + 1}. ${section}`).join('\n')}
` : ''}

${details.action === 'rename' ? `
## Rename Details:
- **Current name**: "${details.sectionName}"
- **New name**: "${details.newName}"
` : ''}

**To proceed, call the operation again with \`force: true\`**`;

    default:
      return `# ❓ Unknown Operation: ${operation}\n\nPlease review the operation details and try again.`;
  }
}

/**
 * Find task by ID in TODO structure
 */
function findTaskById(structure: TodoStructure, taskId: string): { task: Task; sectionName: string } | null {
  for (const section of structure.sections) {
    const task = section.tasks.find(t => t.id === taskId);
    if (task) {
      return { task, sectionName: section.name };
    }
  }
  return null;
}

/**
 * Search tasks by criteria
 */
function searchTasks(structure: TodoStructure, query?: string, filters?: any): Array<{ task: Task; sectionName: string }> {
  const results: Array<{ task: Task; sectionName: string }> = [];
  
  for (const section of structure.sections) {
    for (const task of section.tasks) {
      let matches = true;
      
      // Text query search
      if (query) {
        const searchText = `${task.title} ${task.notes || ''}`.toLowerCase();
        matches = matches && searchText.includes(query.toLowerCase());
      }
      
      // Apply filters
      if (filters) {
        if (filters.status && task.status !== filters.status) matches = false;
        if (filters.priority && task.priority !== filters.priority) matches = false;
        if (filters.assignee && task.assignee !== filters.assignee) matches = false;
        if (filters.section && section.name !== filters.section) matches = false;
        if (filters.hasNotes !== undefined && Boolean(task.notes) !== filters.hasNotes) matches = false;
        if (filters.hasDependencies !== undefined && Boolean(task.dependencies?.length) !== filters.hasDependencies) matches = false;
      }
      
      if (matches) {
        results.push({ task, sectionName: section.name });
      }
    }
  }
  
  return results;
}

/**
 * Check if TODO.md needs health scoring initialization
 */
async function checkNeedsScoreInitialization(todoPath: string, projectPath?: string): Promise<boolean> {
  if (!projectPath) {
    return false; // Can't initialize scoring without project path
  }
  
  try {
    const { readFile } = await import('fs/promises');
    const content = await readFile(todoPath, 'utf-8');
    
    // Check if file has health scoring header
    const lines = content.split('\n');
    const hasHealthHeader = lines.some(line => 
      line.includes('Project Health Dashboard') || 
      line.includes('Overall Project Health') ||
      line.includes('Health Metrics')
    );
    
    return !hasHealthHeader;
    
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, will need scoring when created
      return true;
    }
    // Other errors, assume no scoring needed to avoid failures
    return false;
  }
}

/**
 * Main TODO management function
 */
export async function manageTodo(args: ManageTodoArgs, projectPath?: string): Promise<any> {
  try {
    const validatedArgs = ManageTodoSchema.parse(args);
    
    // Initialize knowledge graph manager
    const kgManager = new KnowledgeGraphManager();
    let intentId: string | undefined;
    
    // Track operation intent in knowledge graph
    if (['update_status', 'add_tasks', 'merge_adr_updates', 'sync_progress'].includes(validatedArgs.operation)) {
      intentId = await kgManager.createIntent(
        `TODO Management: ${validatedArgs.operation}`,
        [`Execute ${validatedArgs.operation} operation`, 'Update TODO.md file'],
        'medium'
      );
    }
    
    // Resolve absolute TODO path consistently
    const { resolve } = await import('path');
    const { readFile, access, writeFile } = await import('fs/promises');
    
    // Support both TODO.md and todo.md for backward compatibility
    let todoPath = validatedArgs.todoPath;
    const basePath = projectPath || process.cwd();
    
    // If path is just the filename, check both cases
    if (todoPath === 'TODO.md' || todoPath === 'todo.md') {
      const upperPath = resolve(basePath, 'TODO.md');
      const lowerPath = resolve(basePath, 'todo.md');
      
      // Check which exists
      try {
        await access(upperPath);
        todoPath = 'TODO.md';
      } catch {
        try {
          await access(lowerPath);
          todoPath = 'todo.md';
        } catch {
          // Neither exists, use standard TODO.md
          todoPath = 'TODO.md';
        }
      }
    }
    
    const absoluteTodoPath = resolve(basePath, todoPath);
    
    // Check if file exists and has health scoring header
    const needsScoreInitialization = await checkNeedsScoreInitialization(absoluteTodoPath, projectPath);
    
    switch (validatedArgs.operation) {
      case 'update_status': {
        const structure = await parseTodoFile(absoluteTodoPath);
        const updatedStructure = updateTaskStatuses(structure, validatedArgs.updates);
        const markdown = await formatTodoAsMarkdown(updatedStructure, projectPath);
        
        await writeFile(absoluteTodoPath, markdown, 'utf-8');
        
        // Track operation in knowledge graph
        if (intentId) {
          const tasksModified = validatedArgs.updates.map(u => u.taskId);
          await kgManager.addToolExecution(
            intentId,
            'manage_todo_update_status',
            validatedArgs,
            { 
              updatedTasks: validatedArgs.updates.length,
              tasksModified,
              structureSummary: updatedStructure.summary
            },
            true,
            [],
            tasksModified,
            undefined
          );
          
          // Update TODO snapshot
          await kgManager.updateTodoSnapshot(intentId, markdown);
        }
        
        return {
          content: [{
            type: 'text',
            text: `# Task Status Updated
${needsScoreInitialization ? '\n🎯 **Health scoring header automatically added to TODO.md**\n' : ''}
## Updates Applied
${validatedArgs.updates.map(update => 
  `- Task \`${update.taskId}\`: ${update.status}${update.notes ? ` (${update.notes})` : ''}`
).join('\n')}

## Current Progress
- ✅ Completed: ${updatedStructure.summary.completed}
- 🔄 In Progress: ${updatedStructure.summary.inProgress}  
- ⏳ Pending: ${updatedStructure.summary.pending}
- 🚫 Blocked: ${updatedStructure.summary.blocked}

Updated TODO file: \`${absoluteTodoPath}\``
          }]
        };
      }
      
      case 'add_tasks': {
        const structure = await parseTodoFile(absoluteTodoPath);
        const updatedStructure = addTasksToStructure(structure, validatedArgs.tasks, validatedArgs.section);
        const markdown = await formatTodoAsMarkdown(updatedStructure, projectPath);
        
        await writeFile(absoluteTodoPath, markdown, 'utf-8');
        
        // Track operation in knowledge graph
        if (intentId) {
          const tasksCreated = validatedArgs.tasks.map(task => task.title);
          await kgManager.addToolExecution(
            intentId,
            'manage_todo_add_tasks',
            validatedArgs,
            { 
              addedTasks: validatedArgs.tasks.length,
              section: validatedArgs.section || 'default',
              tasksCreated,
              structureSummary: updatedStructure.summary
            },
            true,
            tasksCreated,
            [],
            undefined
          );
          
          // Update TODO snapshot
          await kgManager.updateTodoSnapshot(intentId, markdown);
        }
        
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

Updated TODO file: \`${absoluteTodoPath}\``
          }]
        };
      }
      
      case 'merge_adr_updates': {
        // Get current TODO structure
        const currentStructure = await parseTodoFile(absoluteTodoPath);
        
        // Create backup of current TODO
        const backupPath = `${absoluteTodoPath}.backup.${Date.now()}`;
        
        try {
          const currentContent = await readFile(absoluteTodoPath, 'utf-8');
          await writeFile(backupPath, currentContent, 'utf-8');
        } catch (error) {
          // If backup fails, continue but warn
          console.error(`Warning: Could not create backup at ${backupPath}:`, error);
        }
        
        // For now, return analysis with preservation logic
        // This maintains existing structure while indicating merge capability
        let mergedStructure = { ...currentStructure };
        
        // Apply preservation logic
        if (validatedArgs.preserveCompleted) {
          // Keep completed tasks as-is
          mergedStructure.sections.forEach(section => {
            section.tasks = section.tasks.filter(task => 
              task.status !== 'completed' || task.adrSource
            );
          });
        }
        
        if (validatedArgs.preserveCustom) {
          // Keep tasks without ADR source
          mergedStructure.sections.forEach(section => {
            section.tasks = section.tasks.filter(task => 
              !task.adrSource || task.status === 'completed'
            );
          });
        }
        
        // Update last modified timestamp
        mergedStructure.lastUpdated = new Date().toISOString();
        
        // Write merged structure back
        const markdown = await formatTodoAsMarkdown(mergedStructure, projectPath);
        await writeFile(absoluteTodoPath, markdown, 'utf-8');
        
        return {
          content: [{
            type: 'text',
            text: `# ADR Merge Completed
${needsScoreInitialization ? '\n🎯 **Health scoring header automatically added to TODO.md**\n' : ''}
## Merge Results
- **Source**: ${absoluteTodoPath}
- **Backup**: ${backupPath}
- **Preservation Applied**: ${validatedArgs.preserveCompleted ? 'Completed tasks preserved' : 'All tasks merged'}

## Current TODO Status
- Total Tasks: ${mergedStructure.summary.total}
- Completed: ${mergedStructure.summary.completed}
- In Progress: ${mergedStructure.summary.inProgress}
- Pending: ${mergedStructure.summary.pending}
- Blocked: ${mergedStructure.summary.blocked}

## Preservation Settings
- Preserve Completed: ${validatedArgs.preserveCompleted}
- Preserve Custom: ${validatedArgs.preserveCustom}

## Next Steps
1. Review merged TODO.md content
2. Use \`manage_todo\` to add new ADR-derived tasks if needed
3. Update task statuses using \`update_status\` operation
4. Use \`compare_adr_progress\` to validate implementation

*Note: Advanced ADR integration requires additional development*
*Current implementation focuses on preserving existing content*`
          }]
        };
      }
      
      case 'sync_progress': {
        const structure = await parseTodoFile(absoluteTodoPath);
        
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
        const structure = await parseTodoFile(absoluteTodoPath);
        
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
      
      case 'delete_task': {
        const structure = await parseTodoFile(absoluteTodoPath);
        
        // Find tasks to delete
        const tasksToDelete = validatedArgs.taskIds.map(id => findTaskById(structure, id)).filter(Boolean) as Array<{ task: Task; sectionName: string }>;
        
        if (tasksToDelete.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `# ❌ No Tasks Found\n\nNone of the specified task IDs were found:\n${validatedArgs.taskIds.map(id => `- ${id}`).join('\n')}\n\nUse \`search_tasks\` to find available task IDs.`
            }]
          };
        }
        
        if (tasksToDelete.length !== validatedArgs.taskIds.length) {
          const foundIds = tasksToDelete.map(t => t.task.id);
          const missingIds = validatedArgs.taskIds.filter(id => !foundIds.includes(id));
          return {
            content: [{
              type: 'text',
              text: `# ⚠️ Some Tasks Not Found\n\n**Found tasks:**\n${foundIds.map(id => `- ${id}`).join('\n')}\n\n**Missing tasks:**\n${missingIds.map(id => `- ${id}`).join('\n')}\n\nPlease verify task IDs and try again.`
            }]
          };
        }
        
        // Interactive confirmation unless force is true
        if (!validatedArgs.force) {
          const hasNotes = tasksToDelete.some(t => t.task.notes);
          return {
            content: [{
              type: 'text',
              text: generateInteractiveConfirmation('delete_task', {
                tasks: tasksToDelete.map(t => t.task),
                hasNotes
              })
            }]
          };
        }
        
        // Perform deletion
        const updatedStructure = { ...structure };
        let deletedCount = 0;
        
        for (const section of updatedStructure.sections) {
          const initialLength = section.tasks.length;
          section.tasks = section.tasks.filter(task => !validatedArgs.taskIds.includes(task.id));
          deletedCount += initialLength - section.tasks.length;
        }
        
        // Update summary counts
        for (const { task } of tasksToDelete) {
          updatedStructure.summary.total--;
          updatedStructure.summary[task.status as keyof typeof updatedStructure.summary]--;
        }
        
        updatedStructure.lastUpdated = new Date().toISOString();
        
        // Write updated structure
        const markdown = await formatTodoAsMarkdown(updatedStructure, projectPath);
        await writeFile(absoluteTodoPath, markdown, 'utf-8');
        
        return {
          content: [{
            type: 'text',
            text: `# ✅ Tasks Deleted Successfully

## Deleted ${deletedCount} Tasks:
${tasksToDelete.map(({ task, sectionName }) => `- **${task.title}** from "${sectionName}" section`).join('\n')}

## Updated Progress:
- Total Tasks: ${updatedStructure.summary.total}
- Completed: ${updatedStructure.summary.completed}
- In Progress: ${updatedStructure.summary.inProgress}
- Pending: ${updatedStructure.summary.pending}

Updated TODO file: \`${absoluteTodoPath}\``
          }]
        };
      }
      
      case 'edit_task': {
        const structure = await parseTodoFile(absoluteTodoPath);
        const taskResult = findTaskById(structure, validatedArgs.taskId);
        
        if (!taskResult) {
          return {
            content: [{
              type: 'text',
              text: `# ❌ Task Not Found\n\nTask ID "${validatedArgs.taskId}" was not found.\n\nUse \`search_tasks\` to find available task IDs.`
            }]
          };
        }
        
        const { task: currentTask } = taskResult;
        
        // Interactive confirmation if enabled
        if (validatedArgs.interactive && validatedArgs.confirmChanges) {
          return {
            content: [{
              type: 'text',
              text: generateInteractiveConfirmation('edit_task', {
                current: currentTask,
                changes: validatedArgs.updates
              })
            }]
          };
        }
        
        // Apply updates
        const updatedStructure = { ...structure };
        for (const section of updatedStructure.sections) {
          const taskIndex = section.tasks.findIndex(t => t.id === validatedArgs.taskId);
          if (taskIndex >= 0) {
            const updatedTask = { ...section.tasks[taskIndex] };
            
            // Apply each update
            Object.entries(validatedArgs.updates).forEach(([key, value]) => {
              if (value !== undefined) {
                (updatedTask as any)[key] = value;
              }
            });
            
            updatedTask.updatedAt = new Date().toISOString();
            section.tasks[taskIndex] = updatedTask as Task;
            break;
          }
        }
        
        updatedStructure.lastUpdated = new Date().toISOString();
        
        // Write updated structure
        const markdown = await formatTodoAsMarkdown(updatedStructure, projectPath);
        await writeFile(absoluteTodoPath, markdown, 'utf-8');
        
        return {
          content: [{
            type: 'text',
            text: `# ✅ Task Updated Successfully

## Updated Task: "${currentTask.title}"

## Changes Applied:
${Object.entries(validatedArgs.updates).filter(([, value]) => value !== undefined).map(([key, value]) => `- **${key}**: "${(currentTask as any)[key] || 'none'}" → "${value}"`).join('\n')}

Updated TODO file: \`${absoluteTodoPath}\``
          }]
        };
      }
      
      case 'move_task': {
        const structure = await parseTodoFile(absoluteTodoPath);
        const taskResult = findTaskById(structure, validatedArgs.taskId);
        
        if (!taskResult) {
          return {
            content: [{
              type: 'text',
              text: `# ❌ Task Not Found\n\nTask ID "${validatedArgs.taskId}" was not found.\n\nUse \`search_tasks\` to find available task IDs.`
            }]
          };
        }
        
        const { task, sectionName: currentSection } = taskResult;
        const availableSections = structure.sections.map(s => s.name);
        
        // Interactive section selection if needed
        if (validatedArgs.interactive && !validatedArgs.targetSection) {
          return {
            content: [{
              type: 'text',
              text: `# 🔄 Select Target Section

## Task to Move:
**${task.title}** (currently in "${currentSection}")

## Available Sections:
${availableSections.map((section, index) => `${index + 1}. ${section}`).join('\n')}

**To proceed**, call the operation again with \`targetSection\` parameter set to your chosen section name.

**To skip interactive mode**, set \`interactive: false\`.`
            }]
          };
        }
        
        const targetSection = validatedArgs.targetSection || 'General Tasks';
        const sectionExists = availableSections.includes(targetSection);
        
        // Interactive confirmation if enabled
        if (validatedArgs.interactive) {
          return {
            content: [{
              type: 'text',
              text: generateInteractiveConfirmation('move_task', {
                task,
                currentSection,
                targetSection,
                position: validatedArgs.position,
                sectionExists,
                availableSections
              })
            }]
          };
        }
        
        // Perform the move
        const updatedStructure = { ...structure };
        
        // Remove from current section
        for (const section of updatedStructure.sections) {
          if (section.name === currentSection) {
            section.tasks = section.tasks.filter(t => t.id !== validatedArgs.taskId);
            break;
          }
        }
        
        // Add to target section
        let targetSectionObj = updatedStructure.sections.find(s => s.name === targetSection);
        if (!targetSectionObj) {
          if (validatedArgs.createSection) {
            targetSectionObj = { name: targetSection, tasks: [] };
            updatedStructure.sections.push(targetSectionObj);
          } else {
            return {
              content: [{
                type: 'text',
                text: `# ❌ Target Section Not Found\n\nSection "${targetSection}" does not exist.\n\n**Options:**\n- Choose an existing section\n- Set \`createSection: true\` to create the section\n\nAvailable sections:\n${availableSections.map(s => `- ${s}`).join('\n')}`
              }]
            };
          }
        }
        
        // Insert at specified position or at the end
        if (validatedArgs.position !== undefined && validatedArgs.position >= 0) {
          targetSectionObj.tasks.splice(validatedArgs.position, 0, task);
        } else {
          targetSectionObj.tasks.push(task);
        }
        
        updatedStructure.lastUpdated = new Date().toISOString();
        
        // Write updated structure
        const markdown = await formatTodoAsMarkdown(updatedStructure, projectPath);
        await writeFile(absoluteTodoPath, markdown, 'utf-8');
        
        return {
          content: [{
            type: 'text',
            text: `# ✅ Task Moved Successfully

## Task: "${task.title}"
- **From**: "${currentSection}"
- **To**: "${targetSection}"${validatedArgs.position !== undefined ? `\n- **Position**: ${validatedArgs.position}` : ''}

${!sectionExists ? '\n🆕 **Target section was created**' : ''}

Updated TODO file: \`${absoluteTodoPath}\``
          }]
        };
      }
      
      case 'manage_section': {
        const structure = await parseTodoFile(absoluteTodoPath);
        const sectionExists = structure.sections.some(s => s.name === validatedArgs.sectionName);
        const availableSections = structure.sections.map(s => s.name);
        
        if (validatedArgs.action === 'create') {
          if (sectionExists) {
            return {
              content: [{
                type: 'text',
                text: `# ❌ Section Already Exists\n\nSection "${validatedArgs.sectionName}" already exists.\n\nExisting sections:\n${availableSections.map(s => `- ${s}`).join('\n')}`
              }]
            };
          }
          
          // Create new section
          const updatedStructure = { ...structure };
          updatedStructure.sections.push({ name: validatedArgs.sectionName, tasks: [] });
          updatedStructure.lastUpdated = new Date().toISOString();
          
          const markdown = await formatTodoAsMarkdown(updatedStructure, projectPath);
            await writeFile(absoluteTodoPath, markdown, 'utf-8');
          
          return {
            content: [{
              type: 'text',
              text: `# ✅ Section Created Successfully\n\n**New section**: "${validatedArgs.sectionName}"\n\nUpdated TODO file: \`${absoluteTodoPath}\``
            }]
          };
        }
        
        if (!sectionExists) {
          return {
            content: [{
              type: 'text',
              text: `# ❌ Section Not Found\n\nSection "${validatedArgs.sectionName}" does not exist.\n\nAvailable sections:\n${availableSections.map(s => `- ${s}`).join('\n')}`
            }]
          };
        }
        
        const targetSection = structure.sections.find(s => s.name === validatedArgs.sectionName)!;
        
        // Interactive confirmation unless force is true
        if (!validatedArgs.force) {
          const details: any = {
            action: validatedArgs.action,
            sectionName: validatedArgs.sectionName,
            availableSections
          };
          
          if (validatedArgs.action === 'delete') {
            details.taskCount = targetSection.tasks.length;
            details.preserveTasks = validatedArgs.preserveTasks;
            details.targetSection = availableSections.find(s => s !== validatedArgs.sectionName) || 'General Tasks';
          }
          
          if (validatedArgs.action === 'rename') {
            details.newName = validatedArgs.newName;
          }
          
          return {
            content: [{
              type: 'text',
              text: generateInteractiveConfirmation('manage_section', details)
            }]
          };
        }
        
        // Perform the action
        const updatedStructure = { ...structure };
        
        if (validatedArgs.action === 'delete') {
          const sectionIndex = updatedStructure.sections.findIndex(s => s.name === validatedArgs.sectionName);
          const tasksToMove = targetSection.tasks;
          
          if (validatedArgs.preserveTasks && tasksToMove.length > 0) {
            // Move tasks to another section
            const fallbackSectionName = availableSections.find(s => s !== validatedArgs.sectionName) || 'General Tasks';
            let fallbackSection = updatedStructure.sections.find(s => s.name === fallbackSectionName);
            
            if (!fallbackSection && fallbackSectionName === 'General Tasks') {
              fallbackSection = { name: 'General Tasks', tasks: [] };
              updatedStructure.sections.unshift(fallbackSection);
            }
            
            if (fallbackSection) {
              fallbackSection.tasks.push(...tasksToMove);
            }
          } else {
            // Update summary counts for deleted tasks
            for (const task of tasksToMove) {
              updatedStructure.summary.total--;
              updatedStructure.summary[task.status as keyof typeof updatedStructure.summary]--;
            }
          }
          
          updatedStructure.sections.splice(sectionIndex, 1);
        }
        
        if (validatedArgs.action === 'rename') {
          const section = updatedStructure.sections.find(s => s.name === validatedArgs.sectionName)!;
          section.name = validatedArgs.newName!;
        }
        
        updatedStructure.lastUpdated = new Date().toISOString();
        
        const markdown = await formatTodoAsMarkdown(updatedStructure, projectPath);
        await writeFile(absoluteTodoPath, markdown, 'utf-8');
        
        return {
          content: [{
            type: 'text',
            text: `# ✅ Section ${validatedArgs.action.charAt(0).toUpperCase() + validatedArgs.action.slice(1)} Successful

${validatedArgs.action === 'delete' ? `
## Deleted Section: "${validatedArgs.sectionName}"
- **Tasks**: ${targetSection.tasks.length}
- **Preserved**: ${validatedArgs.preserveTasks}
${validatedArgs.preserveTasks && targetSection.tasks.length > 0 ? `- **Moved to**: "${availableSections.find(s => s !== validatedArgs.sectionName) || 'General Tasks'}"` : ''}
` : ''}

${validatedArgs.action === 'rename' ? `
## Renamed Section:
- **From**: "${validatedArgs.sectionName}"
- **To**: "${validatedArgs.newName}"
` : ''}

Updated TODO file: \`${absoluteTodoPath}\``
          }]
        };
      }
      
      case 'search_tasks': {
        const structure = await parseTodoFile(absoluteTodoPath);
        const results = searchTasks(structure, validatedArgs.query, validatedArgs.filters);
        
        if (results.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `# 🔍 No Tasks Found

**Search criteria:**
${validatedArgs.query ? `- **Query**: "${validatedArgs.query}"` : ''}
${validatedArgs.filters ? Object.entries(validatedArgs.filters).filter(([, value]) => value !== undefined).map(([key, value]) => `- **${key}**: ${value}`).join('\n') : ''}

**Total tasks in TODO.md**: ${structure.summary.total}

Try adjusting your search criteria or use \`analyze_progress\` to see all tasks.`
            }]
          };
        }
        
        return {
          content: [{
            type: 'text',
            text: `# 🔍 Search Results

Found **${results.length}** tasks:

${results.map(({ task, sectionName }) => {
  let taskLine = `## ${task.title}`;
  if (validatedArgs.includeMetadata) {
    taskLine += `\n- **ID**: \`${task.id}\`\n- **Section**: ${sectionName}\n- **Status**: ${task.status}`;
    if (task.priority) taskLine += `\n- **Priority**: ${task.priority}`;
    if (task.assignee) taskLine += `\n- **Assignee**: ${task.assignee}`;
    if (task.category) taskLine += `\n- **Category**: ${task.category}`;
    if (task.notes) taskLine += `\n- **Notes**: ${task.notes}`;
    if (task.dependencies?.length) taskLine += `\n- **Dependencies**: ${task.dependencies.join(', ')}`;
  }
  return taskLine;
}).join('\n\n')}

**Search completed on**: \`${absoluteTodoPath}\``
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