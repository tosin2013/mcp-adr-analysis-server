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
        automationRules: []
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

  private async ensureCacheDirectory(): Promise<void> {
    try {
      await fs.access(this.cacheDir);
    } catch {
      await fs.mkdir(this.cacheDir, { recursive: true });
    }
  }
}