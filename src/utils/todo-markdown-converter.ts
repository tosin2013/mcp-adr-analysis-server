/**
 * TODO JSON ↔ Markdown Converter
 * 
 * Converts between structured JSON format and human-readable markdown,
 * preserving all metadata and enabling seamless bidirectional sync.
 */

import { TodoJsonData, TodoTask, TodoSection } from '../types/todo-json-schemas.js';
import { ProjectHealthScoring } from './project-health-scoring.js';
import { loadConfig } from './config.js';
import crypto from 'crypto';

/**
 * Convert JSON TODO data to markdown format
 */
export async function generateTodoMarkdown(data: TodoJsonData): Promise<string> {
  const config = loadConfig();
  const healthScoring = new ProjectHealthScoring(config.projectPath);
  
  // Generate health dashboard header
  const healthDashboard = await healthScoring.generateScoreDisplay();
  
  // Calculate progress metrics
  const metrics = calculateProgressMetrics(data);
  
  let markdown = healthDashboard;
  
  // Add TODO overview
  markdown += `\n## 📋 TODO Overview\n\n`;
  markdown += `**Progress**: ${metrics.completedTasks}/${metrics.totalTasks} tasks completed (${metrics.completionPercentage.toFixed(1)}%)\n`;
  markdown += `**Priority Score**: ${metrics.priorityWeightedScore.toFixed(1)}% (weighted by priority)\n`;
  markdown += `**Critical Remaining**: ${metrics.criticalRemaining} critical tasks\n`;
  markdown += `**Blocked**: ${metrics.blockedTasks} tasks blocked\n\n`;
  
  // Add velocity metrics if available
  if (metrics.velocity.tasksCompletedLastWeek > 0) {
    markdown += `**Velocity**: ${metrics.velocity.tasksCompletedLastWeek} tasks/week, avg ${metrics.velocity.averageCompletionTime.toFixed(1)}h completion time\n\n`;
  }
  
  // Add sections
  const sortedSections = data.sections.sort((a, b) => a.order - b.order);
  
  for (const section of sortedSections) {
    if (section.tasks.length === 0) continue;
    
    markdown += `## ${getEmojiForSection(section.id)} ${section.title}\n\n`;
    
    if (section.description) {
      markdown += `${section.description}\n\n`;
    }
    
    // Group tasks by priority for better organization
    const sectionTasks = section.tasks
      .map(taskId => data.tasks[taskId])
      .filter(Boolean)
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b!.priority] - priorityOrder[a!.priority];
      });
    
    for (const task of sectionTasks) {
      if (task) {
        markdown += formatTaskAsMarkdown(task, data.tasks);
      }
    }
    
    markdown += '\n';
  }
  
  // Add metadata footer
  markdown += `---\n\n`;
  markdown += `*Last updated: ${new Date(data.metadata.lastUpdated).toLocaleString()}*\n`;
  markdown += `*Auto-sync: ${data.metadata.autoSyncEnabled ? 'enabled' : 'disabled'}*\n`;
  markdown += `*Knowledge Graph: ${data.knowledgeGraphSync.linkedIntents.length} linked intents*\n`;
  
  return markdown;
}

/**
 * Format a single task as markdown
 */
function formatTaskAsMarkdown(task: TodoTask, allTasks: Record<string, TodoTask>): string {
  const checkbox = task.status === 'completed' ? '[x]' : '[ ]';
  const priorityEmoji = getPriorityEmoji(task.priority);
  const statusEmoji = getStatusEmoji(task.status);
  
  let line = `- ${checkbox} ${priorityEmoji} ${statusEmoji} **${task.title}**`;
  
  // Add assignee if present
  if (task.assignee) {
    line += ` (@${task.assignee})`;
  }
  
  // Add due date if present
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    const isOverdue = dueDate < new Date() && task.status !== 'completed';
    const dueDateStr = dueDate.toLocaleDateString();
    line += ` ${isOverdue ? '🔴' : '📅'} ${dueDateStr}`;
  }
  
  // Add progress for in-progress tasks
  if (task.status === 'in_progress' && task.progressPercentage > 0) {
    line += ` (${task.progressPercentage}%)`;
  }
  
  line += '\n';
  
  // Add description if present
  if (task.description) {
    line += `  ${task.description}\n`;
  }
  
  // Add subtasks
  if (task.subtasks.length > 0) {
    for (const subtaskId of task.subtasks) {
      const subtask = allTasks[subtaskId];
      if (subtask) {
        line += `  - ${subtask.status === 'completed' ? '[x]' : '[ ]'} ${subtask.title}\n`;
      }
    }
  }
  
  // Add dependencies
  if (task.dependencies.length > 0) {
    const depTasks = task.dependencies
      .map(depId => allTasks[depId])
      .filter(Boolean);
    
    if (depTasks.length > 0) {
      line += `  *Depends on: ${depTasks.map(t => t!.title).join(', ')}*\n`;
    }
  }
  
  // Add blocking information
  if (task.blockedBy.length > 0) {
    const blockers = task.blockedBy
      .map(blockerId => allTasks[blockerId])
      .filter(Boolean);
    
    if (blockers.length > 0) {
      line += `  *Blocked by: ${blockers.map(t => t!.title).join(', ')}*\n`;
    }
  }
  
  // Add linked ADRs
  if (task.linkedAdrs.length > 0) {
    line += `  *ADRs: ${task.linkedAdrs.join(', ')}*\n`;
  }
  
  // Add tags
  if (task.tags.length > 0) {
    line += `  *Tags: ${task.tags.map(tag => `#${tag}`).join(' ')}*\n`;
  }
  
  // Add notes
  if (task.notes) {
    line += `  *Notes: ${task.notes}*\n`;
  }
  
  return line;
}

/**
 * Parse markdown content back to JSON format
 */
export async function parseMarkdownToJson(markdown: string): Promise<TodoJsonData> {
  const lines = markdown.split('\n');
  const now = new Date().toISOString();
  
  const data: TodoJsonData = {
    version: '1.0.0',
    metadata: {
      lastUpdated: now,
      totalTasks: 0,
      completedTasks: 0,
      autoSyncEnabled: true
    },
    tasks: {},
    sections: [],
    scoringSync: {
      lastScoreUpdate: now,
      taskCompletionScore: 0,
      priorityWeightedScore: 0,
      criticalTasksRemaining: 0,
      scoreHistory: []
    },
    knowledgeGraphSync: {
      lastSync: now,
      linkedIntents: [],
      pendingUpdates: []
    },
    automationRules: [],
    templates: [],
    recurringTasks: [],
    operationHistory: []
  };
  
  let currentSection: TodoSection | null = null;
  let sectionOrder = 1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() || '';
    
    // Parse section headers
    if (line.startsWith('## ') && !line.includes('📊') && !line.includes('🎯')) {
      const sectionTitle = line.replace(/^## /, '').replace(/^[^\s]+ /, ''); // Remove emoji
      const sectionId = sectionTitle.toLowerCase().replace(/\s+/g, '_');
      
      currentSection = {
        id: sectionId,
        title: sectionTitle,
        order: sectionOrder++,
        collapsed: false,
        tasks: []
      };
      
      data.sections.push(currentSection);
      continue;
    }
    
    // Parse task lines
    if (line.match(/^- \[(x| )\]/)) {
      if (!currentSection) {
        // Create default section if none exists
        currentSection = {
          id: 'default',
          title: 'Tasks',
          order: sectionOrder++,
          collapsed: false,
          tasks: []
        };
        data.sections.push(currentSection);
      }
      
      const task = parseTaskLine(line, lines, i);
      if (task && currentSection) {
        data.tasks[task.id] = task;
        currentSection.tasks.push(task.id);
      }
    }
  }
  
  // Update metadata
  data.metadata.totalTasks = Object.keys(data.tasks).length;
  data.metadata.completedTasks = Object.values(data.tasks).filter(t => t.status === 'completed').length;
  
  return data;
}

/**
 * Parse a task line and extract task information
 */
function parseTaskLine(line: string, _allLines: string[], _lineIndex: number): TodoTask | null {
  const taskMatch = line.match(/^- \[(x| )\] (.+)$/);
  if (!taskMatch) return null;
  
  const isCompleted = taskMatch[1] === 'x';
  const content = taskMatch[2];
  
  if (!content) return null;
  
  // Extract priority from emoji
  const priority = extractPriorityFromEmoji(content);
  
  // Extract title - handle different formats
  let title = content;
  
  // Case 1: **Bold title** format
  const boldTitleMatch = content.match(/\*\*(.+?)\*\*/);
  if (boldTitleMatch) {
    title = boldTitleMatch[1] || '';
  } else {
    // Case 2: Emoji + title format
    const emojiMatch = content.match(/^[^\s]+ [^\s]+ (.+?)(?:\s+\(.*|\s+@.*|\s+📅.*|$)/);
    if (emojiMatch) {
      title = emojiMatch[1] || '';
    } else {
      // Case 3: Simple title
      title = content.split(' ')[0] || content;
    }
  }
  
  // Extract assignee
  const assigneeMatch = content.match(/@(\w+)/);
  const assignee = assigneeMatch ? assigneeMatch[1] : undefined;
  
  // Extract due date
  const dueDateMatch = content.match(/📅 (\d{1,2}\/\d{1,2}\/\d{4})/);
  const dueDate = dueDateMatch?.[1] ? new Date(dueDateMatch[1]).toISOString() : undefined;
  
  // Extract progress
  const progressMatch = content.match(/\((\d+)%\)/);
  const progressPercentage = progressMatch?.[1] ? parseInt(progressMatch[1]) : 0;
  
  const taskId = crypto.randomUUID();
  const now = new Date().toISOString();
  
  return {
    id: taskId,
    title,
    description: '', // Will be extracted from following lines if present
    status: isCompleted ? 'completed' : 'pending',
    priority,
    assignee,
    createdAt: now,
    updatedAt: now,
    completedAt: isCompleted ? now : undefined,
    dueDate,
    archived: false,
    archivedAt: undefined,
    parentTaskId: undefined,
    subtasks: [],
    dependencies: [],
    blockedBy: [],
    linkedAdrs: [],
    adrGeneratedTask: false,
    intentId: undefined,
    toolExecutions: [],
    scoreWeight: 1,
    scoreCategory: 'task_completion',
    progressPercentage,
    tags: [],
    notes: undefined,
    lastModifiedBy: 'tool',
    autoComplete: false,
    version: 1,
    changeLog: [{
      timestamp: now,
      action: 'created',
      details: `Task imported from markdown: ${title}`,
      modifiedBy: 'tool'
    }],
    comments: []
  };
}

/**
 * Extract priority from emoji
 */
function extractPriorityFromEmoji(content: string): 'low' | 'medium' | 'high' | 'critical' {
  if (content.includes('🔴')) return 'critical';
  if (content.includes('🟠')) return 'high';
  if (content.includes('🟡')) return 'medium';
  return 'low';
}

/**
 * Get emoji for task priority
 */
function getPriorityEmoji(priority: string): string {
  switch (priority) {
    case 'critical': return '🔴';
    case 'high': return '🟠';
    case 'medium': return '🟡';
    case 'low': return '🟢';
    default: return '⚪';
  }
}

/**
 * Get emoji for task status
 */
function getStatusEmoji(status: string): string {
  switch (status) {
    case 'completed': return '✅';
    case 'in_progress': return '🔄';
    case 'blocked': return '🚫';
    case 'cancelled': return '❌';
    default: return '⏳';
  }
}

/**
 * Get emoji for section
 */
function getEmojiForSection(sectionId: string): string {
  switch (sectionId) {
    case 'pending': return '📋';
    case 'in_progress': return '🔄';
    case 'completed': return '✅';
    case 'blocked': return '🚫';
    case 'cancelled': return '❌';
    default: return '📁';
  }
}

/**
 * Calculate progress metrics from JSON data
 */
function calculateProgressMetrics(data: TodoJsonData) {
  const tasks = Object.values(data.tasks);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100;
  
  // Priority-weighted scoring
  const priorityWeights = { low: 1, medium: 2, high: 3, critical: 4 };
  const totalWeight = tasks.reduce((sum, t) => sum + priorityWeights[t.priority], 0);
  const completedWeight = tasks
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + priorityWeights[t.priority], 0);
  const priorityWeightedScore = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 100;
  
  // Other metrics
  const criticalRemaining = tasks.filter(t => t.priority === 'critical' && t.status !== 'completed').length;
  const blockedTasks = tasks.filter(t => t.status === 'blocked').length;
  
  // Velocity metrics
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const tasksCompletedLastWeek = tasks.filter(t => 
    t.status === 'completed' && 
    t.completedAt && 
    new Date(t.completedAt) > weekAgo
  ).length;
  
  const completedTasksWithDuration = tasks.filter(t => 
    t.status === 'completed' && 
    t.completedAt
  );
  const averageCompletionTime = completedTasksWithDuration.length > 0
    ? completedTasksWithDuration.reduce((sum, t) => {
        const duration = (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
        return sum + duration;
      }, 0) / completedTasksWithDuration.length
    : 0;
  
  return {
    totalTasks,
    completedTasks,
    completionPercentage,
    priorityWeightedScore,
    criticalRemaining,
    blockedTasks,
    velocity: {
      tasksCompletedLastWeek,
      averageCompletionTime
    }
  };
}