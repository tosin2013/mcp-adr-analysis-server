/**
 * JSON-First TODO Management System
 * 
 * Provides consistent, structured TODO management with automatic scoring sync,
 * knowledge graph integration, and intelligent task automation.
 */

import * as fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { 
  TodoJsonData, 
  TodoTask, 
  TodoJsonDataSchema,
  TaskUpdateOperation,
  TodoScoreMetrics,
  TodoKnowledgeGraphLink
} from '../types/todo-json-schemas.js';
import { loadConfig } from './config.js';
import { KnowledgeGraphManager } from './knowledge-graph-manager.js';
import { ProjectHealthScoring } from './project-health-scoring.js';

export class TodoJsonManager {
  private todoJsonPath: string;
  private todoMdPath: string;
  private cacheDir: string;
  private kgManager: KnowledgeGraphManager;
  private healthScoring: ProjectHealthScoring;

  constructor(projectPath?: string) {
    const config = loadConfig();
    const basePath = projectPath || config.projectPath;
    
    this.cacheDir = path.join(basePath, '.mcp-adr-cache');
    this.todoJsonPath = path.join(this.cacheDir, 'todo-data.json');
    this.todoMdPath = path.join(basePath, 'TODO.md');
    
    this.kgManager = new KnowledgeGraphManager();
    this.healthScoring = new ProjectHealthScoring(basePath);
  }

  /**
   * Load TODO data from JSON, creating default structure if needed
   */
  async loadTodoData(): Promise<TodoJsonData> {
    await this.ensureCacheDirectory();
    
    try {
      const data = await fs.readFile(this.todoJsonPath, 'utf-8');
      const parsed = JSON.parse(data);
      return TodoJsonDataSchema.parse(parsed);
    } catch (error) {
      // Create default structure
      const defaultData: TodoJsonData = {
        version: '1.0.0',
        metadata: {
          lastUpdated: new Date().toISOString(),
          totalTasks: 0,
          completedTasks: 0,
          autoSyncEnabled: true
        },
        tasks: {},
        sections: [
          {
            id: 'pending',
            title: 'Pending Tasks',
            order: 1,
            collapsed: false,
            tasks: []
          },
          {
            id: 'in_progress',
            title: 'In Progress',
            order: 2,
            collapsed: false,
            tasks: []
          },
          {
            id: 'completed',
            title: 'Completed',
            order: 3,
            collapsed: false,
            tasks: []
          }
        ],
        scoringSync: {
          lastScoreUpdate: new Date().toISOString(),
          taskCompletionScore: 0,
          priorityWeightedScore: 0,
          criticalTasksRemaining: 0,
          scoreHistory: []
        },
        knowledgeGraphSync: {
          lastSync: new Date().toISOString(),
          linkedIntents: [],
          pendingUpdates: []
        },
        automationRules: [],
        operationHistory: []
      };
      
      await this.saveTodoData(defaultData);
      return defaultData;
    }
  }

  /**
   * Save TODO data to JSON and optionally sync to markdown
   */
  async saveTodoData(data: TodoJsonData, syncToMarkdown: boolean = true): Promise<void> {
    await this.ensureCacheDirectory();
    
    // Update metadata
    data.metadata.lastUpdated = new Date().toISOString();
    data.metadata.totalTasks = Object.keys(data.tasks).length;
    data.metadata.completedTasks = Object.values(data.tasks).filter(t => t.status === 'completed').length;
    
    // Save JSON
    await fs.writeFile(this.todoJsonPath, JSON.stringify(data, null, 2));
    
    // Auto-sync to markdown if enabled
    if (syncToMarkdown && data.metadata.autoSyncEnabled) {
      await this.convertToMarkdown(data);
      data.metadata.lastSyncToMarkdown = new Date().toISOString();
      await fs.writeFile(this.todoJsonPath, JSON.stringify(data, null, 2));
    }
  }

  /**
   * Create a new task with automatic ID generation and scoring integration
   */
  async createTask(taskData: Partial<TodoTask> & { title: string }): Promise<string> {
    const data = await this.loadTodoData();
    
    const taskId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const task: TodoTask = {
      id: taskId,
      title: taskData.title,
      description: taskData.description || '',
      status: taskData.status || 'pending',
      priority: taskData.priority || 'medium',
      category: taskData.category,
      assignee: taskData.assignee,
      createdAt: now,
      updatedAt: now,
      completedAt: taskData.completedAt || (taskData.status === 'completed' ? now : undefined),
      dueDate: taskData.dueDate,
      archived: taskData.archived || false,
      archivedAt: taskData.archivedAt,
      parentTaskId: taskData.parentTaskId,
      subtasks: taskData.subtasks || [],
      dependencies: taskData.dependencies || [],
      blockedBy: taskData.blockedBy || [],
      linkedAdrs: taskData.linkedAdrs || [],
      adrGeneratedTask: taskData.adrGeneratedTask || false,
      intentId: taskData.intentId,
      toolExecutions: taskData.toolExecutions || [],
      scoreWeight: taskData.scoreWeight || 1,
      scoreCategory: taskData.scoreCategory || 'task_completion',
      estimatedHours: taskData.estimatedHours,
      actualHours: taskData.actualHours,
      progressPercentage: taskData.progressPercentage || (taskData.status === 'completed' ? 100 : 0),
      tags: taskData.tags || [],
      notes: taskData.notes,
      lastModifiedBy: taskData.lastModifiedBy || 'tool',
      autoComplete: taskData.autoComplete || false,
      completionCriteria: taskData.completionCriteria,
      version: 1,
      changeLog: [{
        timestamp: now,
        action: 'created',
        details: taskData.status === 'completed' ? 
          `Task created with preserved completion: ${taskData.title}` : 
          `Task created: ${taskData.title}`,
        modifiedBy: taskData.lastModifiedBy || 'tool'
      }],
      comments: []
    };
    
    // Add to tasks
    data.tasks[taskId] = task;
    
    // Add to appropriate section
    const targetSection = data.sections.find(s => s.id === task.status) || data.sections[0];
    if (targetSection) {
      targetSection.tasks.push(taskId);
    }
    
    // Update knowledge graph if intentId provided
    if (task.intentId) {
      await this.linkToKnowledgeGraph(taskId, task.intentId, 'generated_from');
    }
    
    await this.saveTodoData(data);
    await this.updateScoring(data);
    
    // Record operation in history
    await this.recordOperation(
      'create_task',
      `Created task: ${taskData.title}`,
      [taskId],
      {}, // No task before creation
      { [taskId]: task }
    );
    
    return taskId;
  }

  /**
   * Update task with automatic changelog and scoring sync
   */
  async updateTask(operation: TaskUpdateOperation): Promise<void> {
    const data = await this.loadTodoData();
    const task = data.tasks[operation.taskId];
    
    if (!task) {
      throw new Error(`Task ${operation.taskId} not found`);
    }
    
    const now = new Date().toISOString();
    const oldStatus = task.status;
    
    // Record snapshot before changes for undo
    const snapshotBefore = { [operation.taskId]: { ...task } };
    
    // Check for circular dependencies if updating dependencies
    if (operation.updates.dependencies) {
      console.log('Checking circular dependencies for:', operation.taskId, 'with deps:', operation.updates.dependencies);
      
      const checkCircularDependency = (taskId: string, deps: string[], visited: Set<string> = new Set()): boolean => {
        console.log('Checking task:', taskId, 'deps:', deps, 'visited:', Array.from(visited));
        if (visited.has(taskId)) {
          console.log('Circular dependency found at:', taskId);
          return true;
        }
        visited.add(taskId);
        
        for (const depId of deps) {
          const depTask = data.tasks[depId];
          if (depTask) {
            console.log('Found dep task:', depId, 'with deps:', depTask.dependencies || []);
            if (checkCircularDependency(depId, depTask.dependencies || [], new Set(visited))) {
              return true;
            }
          }
        }
        return false;
      };
      
      if (checkCircularDependency(operation.taskId, operation.updates.dependencies)) {
        throw new Error('Circular dependency detected: This update would create a dependency loop');
      }
    }
    
    // Apply updates
    Object.assign(task, operation.updates);
    task.updatedAt = now;
    task.version += 1;
    
    // Add changelog entry
    task.changeLog.push({
      timestamp: now,
      action: 'updated',
      details: operation.reason,
      modifiedBy: operation.triggeredBy
    });
    
    // Handle status changes
    if (operation.updates.status && operation.updates.status !== oldStatus) {
      await this.moveTaskBetweenSections(data, operation.taskId, oldStatus, operation.updates.status);
      
      // Handle completion
      if (operation.updates.status === 'completed') {
        task.completedAt = now;
        task.progressPercentage = 100;
        
        // Update knowledge graph
        if (task.intentId) {
          await this.kgManager.updateTodoSnapshot(task.intentId, `Task completed: ${task.title}`);
        }
        
        // Check for auto-completion rules
        await this.processAutoCompletionRules(data, operation.taskId);
      }
    }
    
    await this.saveTodoData(data);
    await this.updateScoring(data);
    
    // Record operation in history
    await this.recordOperation(
      'update_task',
      operation.reason,
      [operation.taskId],
      snapshotBefore,
      { [operation.taskId]: { ...task } }
    );
  }

  /**
   * Move task between sections automatically
   */
  private async moveTaskBetweenSections(
    data: TodoJsonData, 
    taskId: string, 
    fromStatus: string, 
    toStatus: string
  ): Promise<void> {
    const fromSection = data.sections.find(s => s.id === fromStatus);
    const toSection = data.sections.find(s => s.id === toStatus);
    
    if (fromSection) {
      fromSection.tasks = fromSection.tasks.filter(id => id !== taskId);
    }
    
    if (toSection) {
      toSection.tasks.push(taskId);
    }
  }

  /**
   * Process auto-completion rules
   */
  private async processAutoCompletionRules(data: TodoJsonData, completedTaskId: string): Promise<void> {
    
    // Check for dependent tasks that can now be auto-completed
    for (const [taskId, task] of Object.entries(data.tasks)) {
      if (task.autoComplete && task.dependencies.includes(completedTaskId)) {
        const allDependenciesCompleted = task.dependencies.every(depId => {
          const depTask = data.tasks[depId];
          return depTask && depTask.status === 'completed';
        });
        
        if (allDependenciesCompleted) {
          await this.updateTask({
            taskId,
            updates: { status: 'completed' },
            reason: `Auto-completed: all dependencies satisfied`,
            triggeredBy: 'automation'
          });
        }
      }
    }
  }

  /**
   * Update scoring system with current task data
   */
  private async updateScoring(data: TodoJsonData): Promise<void> {
    const metrics = this.calculateScoreMetrics(data);
    
    // Update scoring sync
    data.scoringSync = {
      lastScoreUpdate: new Date().toISOString(),
      taskCompletionScore: metrics.completionPercentage,
      priorityWeightedScore: metrics.priorityWeightedScore,
      criticalTasksRemaining: metrics.criticalTasksRemaining,
      scoreHistory: [
        ...data.scoringSync.scoreHistory,
        {
          timestamp: new Date().toISOString(),
          score: metrics.completionPercentage,
          trigger: 'task_update'
        }
      ].slice(-50) // Keep last 50 entries
    };
    
    // Update project health scoring
    await this.healthScoring.updateTaskCompletionScore({
      completed: metrics.completedTasks,
      total: metrics.totalTasks,
      criticalTasksRemaining: metrics.criticalTasksRemaining,
      priorityWeightedScore: metrics.priorityWeightedScore
    });
  }

  /**
   * Calculate comprehensive score metrics
   */
  private calculateScoreMetrics(data: TodoJsonData): TodoScoreMetrics {
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
    
    // Critical tasks remaining
    const criticalTasksRemaining = tasks.filter(t => 
      t.priority === 'critical' && t.status !== 'completed'
    ).length;
    
    // Other metrics
    const blockedTasksCount = tasks.filter(t => t.status === 'blocked').length;
    const now = new Date();
    const averageTaskAge = tasks.reduce((sum, t) => {
      const age = (now.getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return sum + age;
    }, 0) / totalTasks;
    
    // Velocity metrics (last 7 days)
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
      criticalTasksRemaining,
      blockedTasksCount,
      averageTaskAge,
      velocityMetrics: {
        tasksCompletedLastWeek,
        averageCompletionTime
      }
    };
  }

  /**
   * Link task to knowledge graph
   */
  private async linkToKnowledgeGraph(
    taskId: string, 
    intentId: string, 
    _linkType: TodoKnowledgeGraphLink['linkType']
  ): Promise<void> {
    const data = await this.loadTodoData();
    
    // Update knowledge graph sync
    data.knowledgeGraphSync.linkedIntents.push(intentId);
    data.knowledgeGraphSync.pendingUpdates.push({
      taskId,
      updateType: 'status',
      timestamp: new Date().toISOString()
    });
    
    await this.saveTodoData(data, false); // Don't sync to markdown yet
  }

  /**
   * Convert JSON data to markdown format
   */
  async convertToMarkdown(data?: TodoJsonData): Promise<void> {
    if (!data) {
      data = await this.loadTodoData();
    }
    
    const { generateTodoMarkdown } = await import('./todo-markdown-converter.js');
    const markdown = await generateTodoMarkdown(data);
    
    await fs.writeFile(this.todoMdPath, markdown);
  }

  /**
   * Import existing TODO.md into JSON format
   */
  async importFromMarkdown(): Promise<void> {
    try {
      const markdownContent = await fs.readFile(this.todoMdPath, 'utf-8');
      const { parseMarkdownToJson } = await import('./todo-markdown-converter.js');
      const jsonData = await parseMarkdownToJson(markdownContent);
      
      await this.saveTodoData(jsonData, false);
    } catch (error) {
      // If TODO.md doesn't exist, create fresh JSON
      await this.loadTodoData();
    }
  }

  /**
   * Get analytics and metrics
   */
  async getAnalytics(): Promise<{
    metrics: TodoScoreMetrics;
    trends: any[];
    recommendations: string[];
  }> {
    const data = await this.loadTodoData();
    const metrics = this.calculateScoreMetrics(data);
    
    const recommendations = [];
    if (metrics.criticalTasksRemaining > 0) {
      recommendations.push(`Address ${metrics.criticalTasksRemaining} critical tasks`);
    }
    if (metrics.blockedTasksCount > 0) {
      recommendations.push(`Resolve ${metrics.blockedTasksCount} blocked tasks`);
    }
    if (metrics.averageTaskAge > 30) {
      recommendations.push('Consider breaking down old tasks or removing stale ones');
    }
    
    return {
      metrics,
      trends: data.scoringSync.scoreHistory,
      recommendations
    };
  }

  /**
   * Record an operation in history for undo functionality
   */
  async recordOperation(
    operation: string, 
    description: string, 
    affectedTaskIds: string[], 
    snapshotBefore?: Record<string, any>,
    snapshotAfter?: Record<string, any>
  ): Promise<void> {
    const data = await this.loadTodoData();
    
    const historyEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      operation: operation as any,
      description,
      snapshotBefore,
      snapshotAfter,
      affectedTaskIds
    };
    
    // Add to history and keep only last 50 operations
    data.operationHistory.push(historyEntry);
    data.operationHistory = data.operationHistory.slice(-50);
    
    await this.saveTodoData(data, false); // Don't sync to markdown for history updates
  }

  /**
   * Get operation history
   */
  async getOperationHistory(limit: number = 10): Promise<any[]> {
    const data = await this.loadTodoData();
    return data.operationHistory
      .slice(-limit)
      .reverse(); // Most recent first
  }

  /**
   * Undo the last operation
   */
  async undoLastOperation(): Promise<{ success: boolean; operation?: any; error?: string }> {
    const data = await this.loadTodoData();
    const lastOperation = data.operationHistory[data.operationHistory.length - 1];
    
    if (!lastOperation) {
      return { success: false, error: 'No operations to undo' };
    }
    
    try {
      // Restore the snapshot before the operation
      if (lastOperation.snapshotBefore) {
        for (const taskId of lastOperation.affectedTaskIds) {
          if (lastOperation.snapshotBefore[taskId]) {
            // Restore task to previous state
            data.tasks[taskId] = lastOperation.snapshotBefore[taskId];
          } else if (data.tasks[taskId]) {
            // Task was created, so delete it
            delete data.tasks[taskId];
            // Remove from sections
            data.sections.forEach(section => {
              section.tasks = section.tasks.filter(id => id !== taskId);
            });
          }
        }
      }
      
      // Remove the last operation from history
      data.operationHistory.pop();
      
      await this.saveTodoData(data);
      
      return { success: true, operation: lastOperation };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error during undo' 
      };
    }
  }

  /**
   * Detect conflicts between JSON and Markdown versions
   */
  async detectConflicts(): Promise<Array<{
    type: 'title_mismatch' | 'status_mismatch' | 'description_mismatch';
    taskId: string;
    jsonValue: any;
    markdownValue: any;
  }>> {
    try {
      const markdownContent = await fs.readFile(this.todoMdPath, 'utf-8');
      const { parseMarkdownToJson } = await import('./todo-markdown-converter.js');
      const markdownData = await parseMarkdownToJson(markdownContent);
      const jsonData = await this.loadTodoData();
      
      const conflicts = [];
      
      for (const [taskId, jsonTask] of Object.entries(jsonData.tasks)) {
        const markdownTask = markdownData.tasks[taskId];
        if (markdownTask) {
          if (jsonTask.title !== markdownTask.title) {
            conflicts.push({
              type: 'title_mismatch' as const,
              taskId,
              jsonValue: jsonTask.title,
              markdownValue: markdownTask.title
            });
          }
          if (jsonTask.status !== markdownTask.status) {
            conflicts.push({
              type: 'status_mismatch' as const,
              taskId,
              jsonValue: jsonTask.status,
              markdownValue: markdownTask.status
            });
          }
          if (jsonTask.description !== markdownTask.description) {
            conflicts.push({
              type: 'description_mismatch' as const,
              taskId,
              jsonValue: jsonTask.description,
              markdownValue: markdownTask.description
            });
          }
        }
      }
      
      return conflicts;
    } catch (error) {
      return [];
    }
  }

  /**
   * Resolve conflicts between JSON and Markdown
   */
  async resolveConflicts(options: {
    strategy: 'merge' | 'json' | 'markdown';
    preferSource?: 'json' | 'markdown';
  }): Promise<{ resolved: number }> {
    const conflicts = await this.detectConflicts();
    const data = await this.loadTodoData();
    let resolved = 0;
    
    try {
      const markdownContent = await fs.readFile(this.todoMdPath, 'utf-8');
      const { parseMarkdownToJson } = await import('./todo-markdown-converter.js');
      const markdownData = await parseMarkdownToJson(markdownContent);
      
      for (const conflict of conflicts) {
        const jsonTask = data.tasks[conflict.taskId];
        const markdownTask = markdownData.tasks[conflict.taskId];
        
        if (jsonTask && markdownTask) {
          const fieldName = conflict.type.replace('_mismatch', '') as keyof TodoTask;
          if (options.strategy === 'markdown' || options.preferSource === 'markdown') {
            (jsonTask as any)[fieldName] = conflict.markdownValue;
          } else if (options.strategy === 'json' || options.preferSource === 'json') {
            // Keep JSON value (no change needed)
          } else if (options.strategy === 'merge') {
            // For merge, prefer the specified source
            if (options.preferSource === 'markdown') {
              (jsonTask as any)[fieldName] = conflict.markdownValue;
            }
          }
          resolved++;
        }
      }
      
      await this.saveTodoData(data);
    } catch (error) {
      // Ignore markdown parsing errors
    }
    
    return { resolved };
  }

  /**
   * Enable sync monitoring between JSON and Markdown
   */
  async enableSyncMonitoring(options: {
    autoResolve?: boolean;
    conflictStrategy?: 'newest' | 'json' | 'markdown';
  }): Promise<void> {
    const data = await this.loadTodoData();
    
    // Add sync monitoring configuration to metadata
    data.metadata.syncMonitoring = {
      enabled: true,
      autoResolve: options.autoResolve || false,
      conflictStrategy: options.conflictStrategy || 'newest',
      lastCheck: new Date().toISOString()
    };
    
    await this.saveTodoData(data, false);
  }

  /**
   * Create task template
   */
  async createTemplate(template: {
    name: string;
    description: string;
    template: {
      title: string;
      description?: string;
      priority?: string;
      category?: string;
      estimatedHours?: number;
      tags?: string[];
    };
  }): Promise<string> {
    const data = await this.loadTodoData();
    const templateId = crypto.randomUUID();
    
    // Initialize templates array if it doesn't exist
    if (!data.templates) {
      data.templates = [];
    }
    
    data.templates.push({
      id: templateId,
      name: template.name,
      description: template.description,
      template: template.template,
      createdAt: new Date().toISOString(),
      usageCount: 0
    });
    
    await this.saveTodoData(data, false);
    return templateId;
  }

  /**
   * Create recurring task
   */
  async createRecurringTask(taskData: {
    title: string;
    description?: string;
    priority?: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    startDate?: string;
    endDate?: string;
  }): Promise<string> {
    const data = await this.loadTodoData();
    const recurringId = crypto.randomUUID();
    
    // Initialize recurring tasks array if it doesn't exist
    if (!data.recurringTasks) {
      data.recurringTasks = [];
    }
    
    data.recurringTasks.push({
      id: recurringId,
      title: taskData.title,
      description: taskData.description || '',
      priority: taskData.priority || 'medium',
      frequency: taskData.frequency,
      startDate: taskData.startDate || new Date().toISOString(),
      endDate: taskData.endDate,
      createdAt: new Date().toISOString(),
      lastGenerated: null,
      nextDue: this.calculateNextDue(taskData.frequency, taskData.startDate),
      isActive: true
    });
    
    await this.saveTodoData(data, false);
    return recurringId;
  }

  /**
   * Calculate next due date for recurring task
   */
  private calculateNextDue(frequency: string, startDate?: string): string {
    const base = startDate ? new Date(startDate) : new Date();
    
    switch (frequency) {
      case 'daily':
        base.setDate(base.getDate() + 1);
        break;
      case 'weekly':
        base.setDate(base.getDate() + 7);
        break;
      case 'monthly':
        base.setMonth(base.getMonth() + 1);
        break;
    }
    
    return base.toISOString();
  }

  /**
   * Get single task by ID
   */
  async getTask(taskId: string, _options?: { useCache?: boolean }): Promise<TodoTask | null> {
    const data = await this.loadTodoData();
    return data.tasks[taskId] || null;
  }

  /**
   * Get tasks with pagination and filtering
   */
  async getTasks(options?: {
    pagination?: { page: number; pageSize: number };
    status?: string;
    priority?: string;
  }): Promise<{
    tasks: TodoTask[];
    total: number;
    page?: number;
    pageSize?: number;
  }> {
    const data = await this.loadTodoData();
    let tasks = Object.values(data.tasks);
    
    // Apply filters
    if (options?.status) {
      tasks = tasks.filter(t => t.status === options.status);
    }
    if (options?.priority) {
      tasks = tasks.filter(t => t.priority === options.priority);
    }
    
    const total = tasks.length;
    
    // Apply pagination
    if (options?.pagination) {
      const { page, pageSize } = options.pagination;
      const startIndex = (page - 1) * pageSize;
      tasks = tasks.slice(startIndex, startIndex + pageSize);
    }
    
    return {
      tasks,
      total,
      ...(options?.pagination && {
        page: options.pagination.page,
        pageSize: options.pagination.pageSize
      })
    };
  }

  /**
   * Add comment to task
   */
  async addComment(comment: {
    taskId: string;
    author: string;
    text: string;
    mentions?: string[];
  }): Promise<string> {
    const data = await this.loadTodoData();
    const task = data.tasks[comment.taskId];
    
    if (!task) {
      throw new Error(`Task ${comment.taskId} not found`);
    }
    
    const commentId = crypto.randomUUID();
    
    // Initialize comments array if it doesn't exist
    if (!task.comments) {
      task.comments = [];
    }
    
    task.comments.push({
      id: commentId,
      author: comment.author,
      text: comment.text,
      mentions: comment.mentions || [],
      createdAt: new Date().toISOString()
    });
    
    task.updatedAt = new Date().toISOString();
    
    await this.saveTodoData(data);
    return commentId;
  }

  /**
   * Get task comments
   */
  async getTaskComments(taskId: string): Promise<Array<{
    id: string;
    author: string;
    text: string;
    mentions: string[];
    createdAt: string;
  }>> {
    const data = await this.loadTodoData();
    const task = data.tasks[taskId];
    
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    return task.comments || [];
  }

  /**
   * Get task history (changelog)
   */
  async getTaskHistory(taskId: string): Promise<Array<{
    timestamp: string;
    action: string;
    details: string;
    modifiedBy: string;
  }>> {
    const data = await this.loadTodoData();
    const task = data.tasks[taskId];
    
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    return task.changeLog || [];
  }

  /**
   * Create task from template
   */
  async createTaskFromTemplate(options: {
    templateId: string;
    overrides?: Partial<TodoTask>;
  }): Promise<string> {
    const data = await this.loadTodoData();
    
    // Find the template
    const template = data.templates?.find(t => t.id === options.templateId);
    if (!template) {
      throw new Error(`Template ${options.templateId} not found`);
    }
    
    // Create task from template
    const taskData = {
      title: template.template.title,
      description: template.template.description,
      priority: template.template.priority as any,
      category: template.template.category,
      estimatedHours: template.template.estimatedHours,
      tags: template.template.tags || [],
      ...options.overrides
    };
    
    // Increment template usage count
    template.usageCount += 1;
    await this.saveTodoData(data, false);
    
    // Create the task
    return await this.createTask(taskData);
  }

  /**
   * Process recurring tasks and generate new ones if due
   */
  async processRecurringTasks(): Promise<Array<{
    id: string;
    title: string;
    recurringTaskId: string;
  }>> {
    const data = await this.loadTodoData();
    const now = new Date();
    const createdTasks = [];
    
    if (!data.recurringTasks) {
      return [];
    }
    
    for (const recurringTask of data.recurringTasks) {
      if (!recurringTask.isActive) {
        continue;
      }
      
      const nextDue = new Date(recurringTask.nextDue);
      
      // Check if it's time to create a new task
      if (now >= nextDue) {
        // Check if we're within the end date range
        if (recurringTask.endDate && now > new Date(recurringTask.endDate)) {
          recurringTask.isActive = false;
          continue;
        }
        
        // Create new task
        const taskId = await this.createTask({
          title: recurringTask.title,
          description: recurringTask.description,
          priority: recurringTask.priority as any,
          tags: ['recurring']
        });
        
        createdTasks.push({
          id: taskId,
          title: recurringTask.title,
          recurringTaskId: recurringTask.id
        });
        
        // Update recurring task
        recurringTask.lastGenerated = now.toISOString();
        recurringTask.nextDue = this.calculateNextDue(recurringTask.frequency, now.toISOString());
      }
    }
    
    if (createdTasks.length > 0) {
      await this.saveTodoData(data, false);
    }
    
    return createdTasks;
  }

  private async ensureCacheDirectory(): Promise<void> {
    try {
      await fs.access(this.cacheDir);
    } catch {
      await fs.mkdir(this.cacheDir, { recursive: true });
    }
  }
}