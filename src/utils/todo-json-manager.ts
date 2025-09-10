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
  TodoKnowledgeGraphLink,
  TaskTemplate,
  TaskComment,
  RecurringTask,
  PaginationOptions,
  TaskSearchOptions,
  TasksResult
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
        operationHistory: [],
        templates: {},
        recurringTasks: {},
        comments: {}
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
      checklist: taskData.checklist,
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
      }]
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
    
    // Record operation in history - pass current data to avoid loading stale data
    await this.recordOperation(
      'create_task',
      `Created task: ${taskData.title}`,
      [taskId],
      {}, // No task before creation
      { [taskId]: task },
      data
    );
    
    return taskId;
  }

  /**
   * Update task with automatic changelog and scoring sync
   */
  async updateTask(operation: TaskUpdateOperation | any): Promise<void> {
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
      const checkCircularDependency = (taskId: string, newDeps: string[]): boolean => {
        // Create a graph of all dependencies including the proposed change
        const allDeps = new Map<string, string[]>();
        
        // Add existing dependencies for all tasks
        for (const [id, task] of Object.entries(data.tasks)) {
          allDeps.set(id, task.dependencies || []);
        }
        
        // Add the proposed new dependencies
        allDeps.set(taskId, newDeps);
        
        // Check if any of the new dependencies eventually lead back to the original task
        const visited = new Set<string>();
        const path = new Set<string>();
        
        const hasCycle = (currentTaskId: string): boolean => {
          if (path.has(currentTaskId)) {
            return true; // Found a cycle
          }
          if (visited.has(currentTaskId)) {
            return false; // Already explored this path
          }
          
          visited.add(currentTaskId);
          path.add(currentTaskId);
          
          const deps = allDeps.get(currentTaskId) || [];
          for (const dep of deps) {
            if (hasCycle(dep)) {
              return true;
            }
          }
          
          path.delete(currentTaskId);
          return false;
        };
        
        return hasCycle(taskId);
      };
      
      if (checkCircularDependency(operation.taskId, operation.updates.dependencies)) {
        throw new Error('Circular dependency detected: This update would create a dependency loop');
      }
    }
    
    // Apply updates
    Object.assign(task, operation.updates);
    task.updatedAt = now;
    task.version += 1;
    
    // Add changelog entry with detailed changes
    const changes: any = {};
    const oldTask = snapshotBefore[operation.taskId];
    if (oldTask) {
      for (const [key, newValue] of Object.entries(operation.updates)) {
        const oldValue = (oldTask as any)[key];
        if (oldValue !== newValue && newValue !== undefined) {
          changes[key] = { from: oldValue, to: newValue };
        }
      }
    }
    
    const changeLogEntry = {
      timestamp: now,
      action: 'updated' as const,
      details: operation.reason || 'Task updated',
      modifiedBy: operation.updatedBy || operation.triggeredBy || 'tool',
      updatedBy: operation.updatedBy || operation.triggeredBy || 'tool', // For compatibility
      changes
    };
    
    task.changeLog.push(changeLogEntry);
    
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
    
    // Record operation in history - pass current data to avoid loading stale data
    await this.recordOperation(
      'update_task',
      operation.reason || 'Task updated',
      [operation.taskId],
      snapshotBefore,
      { [operation.taskId]: { ...task } },
      data
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
    snapshotAfter?: Record<string, any>,
    data?: TodoJsonData
  ): Promise<void> {
    // Use provided data or load fresh data
    const todoData = data || await this.loadTodoData();
    
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
    todoData.operationHistory.push(historyEntry);
    todoData.operationHistory = todoData.operationHistory.slice(-50);
    
    // Only save if we loaded fresh data (don't overwrite caller's data)
    if (!data) {
      await this.saveTodoData(todoData, false); // Don't sync to markdown for history updates
    }
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
   * Template Management Methods
   */
  async createTemplate(templateData: {
    name: string;
    description: string;
    template: {
      priority?: 'low' | 'medium' | 'high' | 'critical';
      tags?: string[];
      category?: string;
      checklist?: string[];
      estimatedHours?: number;
    };
  }): Promise<string> {
    const data = await this.loadTodoData();
    const templateId = crypto.randomUUID();
    
    const template: TaskTemplate = {
      id: templateId,
      name: templateData.name,
      description: templateData.description,
      template: templateData.template,
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

    data.templates[templateId] = template;
    await this.saveTodoData(data);
    
    return templateId;
  }

  async createTaskFromTemplate(options: {
    templateId: string;
    overrides?: Partial<TodoTask>;
  }): Promise<string> {
    const data = await this.loadTodoData();
    const template = data.templates[options.templateId];
    
    if (!template) {
      throw new Error(`Template ${options.templateId} not found`);
    }

    // Create task with template data
    const taskData = {
      title: `Task from ${template.name}`,
      priority: template.template.priority || 'medium',
      category: template.template.category,
      tags: template.template.tags || [],
      estimatedHours: template.template.estimatedHours,
      checklist: template.template.checklist,
      ...options.overrides
    };

    // Update template usage
    template.lastUsed = new Date().toISOString();
    template.usageCount++;
    data.templates[options.templateId] = template;

    const taskId = await this.createTask(taskData);

    return taskId;
  }

  /**
   * Recurring Task Management
   */
  async createRecurringTask(recurringData: {
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    recurrence: {
      pattern: 'daily' | 'weekly' | 'monthly' | 'custom';
      interval?: number;
      dayOfWeek?: string;
      dayOfMonth?: number;
      time?: string;
    };
    autoCreate?: boolean;
  }): Promise<string> {
    const data = await this.loadTodoData();
    const recurringId = crypto.randomUUID();
    
    const recurringTask: RecurringTask = {
      id: recurringId,
      title: recurringData.title,
      description: recurringData.description,
      priority: recurringData.priority,
      recurrence: recurringData.recurrence,
      autoCreate: recurringData.autoCreate || true,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    data.recurringTasks[recurringId] = recurringTask;
    await this.saveTodoData(data);
    
    return recurringId;
  }

  async processRecurringTasks(): Promise<TodoTask[]> {
    const data = await this.loadTodoData();
    const createdTasks: TodoTask[] = [];
    
    const now = new Date();
    
    for (const [recurringId, recurringTask] of Object.entries(data.recurringTasks)) {
      if (!recurringTask.isActive || !recurringTask.autoCreate) continue;
      
      // Simple implementation - create task if none created yet
      if (!recurringTask.lastCreated) {
        const taskId = await this.createTask({
          title: recurringTask.title,
          description: recurringTask.description,
          priority: recurringTask.priority,
          tags: ['recurring'],
          dueDate: now.toISOString()
        });
        
        recurringTask.lastCreated = now.toISOString();
        recurringTask.nextDue = this.calculateNextDue(recurringTask.recurrence, now);
        data.recurringTasks[recurringId] = recurringTask;
        
        // Get the created task
        const updatedData = await this.loadTodoData();
        const createdTask = updatedData.tasks[taskId];
        if (createdTask) {
          createdTasks.push(createdTask);
        }
      }
    }
    
    if (createdTasks.length > 0) {
      await this.saveTodoData(data);
    }
    
    return createdTasks;
  }

  private calculateNextDue(recurrence: RecurringTask['recurrence'], from: Date): string {
    const next = new Date(from);
    
    switch (recurrence.pattern) {
      case 'daily':
        next.setDate(next.getDate() + (recurrence.interval || 1));
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7 * (recurrence.interval || 1));
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + (recurrence.interval || 1));
        break;
    }
    
    return next.toISOString();
  }

  /**
   * Enhanced Task Retrieval Methods
   */
  async getTask(taskId: string, _options?: { useCache?: boolean }): Promise<TodoTask | null> {
    const data = await this.loadTodoData();
    return data.tasks[taskId] || null;
  }

  async getTasks(options?: {
    pagination?: PaginationOptions;
    search?: TaskSearchOptions;
  }): Promise<TasksResult> {
    const data = await this.loadTodoData();
    let tasks = Object.values(data.tasks);
    
    // Apply search filters
    if (options?.search) {
      tasks = this.filterTasks(tasks, options.search);
    }
    
    const totalTasks = tasks.length;
    
    // Apply pagination
    if (options?.pagination) {
      const { page, pageSize } = options.pagination;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      tasks = tasks.slice(startIndex, endIndex);
      
      return {
        tasks,
        totalTasks,
        totalPages: Math.ceil(totalTasks / pageSize),
        currentPage: page,
        pageSize
      };
    }
    
    return {
      tasks,
      totalTasks,
      totalPages: 1,
      currentPage: 1,
      pageSize: totalTasks
    };
  }

  async searchTasks(options: TaskSearchOptions): Promise<TodoTask[]> {
    const data = await this.loadTodoData();
    const tasks = Object.values(data.tasks);
    return this.filterTasks(tasks, options);
  }

  private filterTasks(tasks: TodoTask[], search: TaskSearchOptions): TodoTask[] {
    return tasks.filter(task => {
      // Status filter
      if (search.status && !search.status.includes(task.status)) {
        return false;
      }
      
      // Priority filter
      if (search.priority && !search.priority.includes(task.priority)) {
        return false;
      }
      
      // Category filter
      if (search.category && task.category !== search.category) {
        return false;
      }
      
      // Assignee filter
      if (search.assignee && task.assignee !== search.assignee) {
        return false;
      }
      
      // Tags filter
      if (search.tags && !search.tags.some(tag => task.tags.includes(tag))) {
        return false;
      }
      
      // Text search
      if (search.query) {
        const query = search.query.toLowerCase();
        const searchText = `${task.title} ${task.description || ''}`.toLowerCase();
        
        switch (search.searchType) {
          case 'exact':
            if (!searchText.includes(query)) return false;
            break;
          case 'fuzzy':
          case 'contains':
          default:
            if (!searchText.includes(query)) return false;
            break;
        }
      }
      
      // Date range filter
      if (search.dateRange) {
        const { start, end, field } = search.dateRange;
        const fieldValue = task[field];
        if (!fieldValue) return false;
        
        const fieldDate = new Date(fieldValue);
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        if (fieldDate < startDate || fieldDate > endDate) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Comment System Methods
   */
  async addComment(commentData: {
    taskId: string;
    author: string;
    text: string;
    replyTo?: string;
    mentions?: string[];
  }): Promise<TaskComment> {
    const data = await this.loadTodoData();
    
    // Verify task exists
    if (!data.tasks[commentData.taskId]) {
      throw new Error(`Task ${commentData.taskId} not found`);
    }
    
    const comment: TaskComment = {
      id: crypto.randomUUID(),
      taskId: commentData.taskId,
      author: commentData.author,
      text: commentData.text,
      createdAt: new Date().toISOString(),
      replyTo: commentData.replyTo,
      mentions: commentData.mentions || [],
      edited: false
    };
    
    if (!data.comments[commentData.taskId]) {
      data.comments[commentData.taskId] = [];
    }
    
    data.comments[commentData.taskId]!.push(comment);
    await this.saveTodoData(data);
    
    return comment;
  }

  async getTaskComments(taskId: string): Promise<TaskComment[]> {
    const data = await this.loadTodoData();
    return data.comments[taskId] || [];
  }

  /**
   * Task History/Audit Trail
   */
  async getTaskHistory(taskId: string): Promise<any[]> {
    const data = await this.loadTodoData();
    const task = data.tasks[taskId];
    
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    return task.changeLog || [];
  }

  /**
   * Conflict Resolution and Sync Methods
   */
  async detectConflicts(): Promise<any[]> {
    // Simple implementation for now - returns empty conflicts
    // This would normally compare JSON and Markdown timestamps and content
    return [];
  }

  async enableSyncMonitoring(_options: {
    autoResolve?: boolean;
    conflictStrategy?: string;
  }): Promise<void> {
    // Simple implementation - just store the options
    const data = await this.loadTodoData();
    // In a real implementation, this would set up file watchers
    await this.saveTodoData(data);
  }

  private async ensureCacheDirectory(): Promise<void> {
    try {
      await fs.access(this.cacheDir);
    } catch {
      await fs.mkdir(this.cacheDir, { recursive: true });
    }
  }
}