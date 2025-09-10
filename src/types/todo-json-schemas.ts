import { z } from 'zod';

/**
 * JSON-First TODO System Schemas
 * 
 * This replaces inconsistent markdown parsing with structured JSON storage
 * that integrates seamlessly with the knowledge graph and scoring system.
 */

export const TodoTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.string().optional(),
  assignee: z.string().optional(),
  
  // Timestamps
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
  dueDate: z.string().optional(),
  
  // Archive support
  archived: z.boolean().default(false),
  archivedAt: z.string().optional(),
  
  // Relationships
  parentTaskId: z.string().optional(),
  subtasks: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  blockedBy: z.array(z.string()).default([]),
  
  // ADR Integration
  linkedAdrs: z.array(z.string()).default([]),
  adrGeneratedTask: z.boolean().default(false),
  
  // Knowledge Graph Integration
  intentId: z.string().optional(),
  toolExecutions: z.array(z.string()).default([]),
  
  // Scoring Integration
  scoreWeight: z.number().default(1), // How much this task impacts overall score
  scoreCategory: z.enum(['task_completion', 'deployment_readiness', 'architecture_compliance', 'security_posture', 'code_quality']).default('task_completion'),
  
  // Progress tracking
  estimatedHours: z.number().optional(),
  actualHours: z.number().optional(),
  progressPercentage: z.number().default(0),
  
  // Metadata
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  lastModifiedBy: z.enum(['human', 'tool', 'adr_generator', 'knowledge_graph']).default('tool'),
  
  // Automation
  autoComplete: z.boolean().default(false), // Auto-complete when criteria met
  completionCriteria: z.string().optional(), // JSON string of completion rules
  
  // Version control
  version: z.number().default(1),
  changeLog: z.array(z.object({
    timestamp: z.string(),
    action: z.enum(['created', 'updated', 'completed', 'blocked', 'cancelled', 'moved']),
    details: z.string(),
    modifiedBy: z.string()
  })).default([]),
  
  // Comments and collaboration
  comments: z.array(z.object({
    id: z.string(),
    author: z.string(),
    text: z.string(),
    mentions: z.array(z.string()).default([]),
    createdAt: z.string()
  })).optional().default([])
});

export const TodoSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  order: z.number(),
  collapsed: z.boolean().default(false),
  tasks: z.array(z.string()), // Task IDs
  metadata: z.record(z.any()).optional()
});

export const TodoJsonDataSchema = z.object({
  version: z.string().default('1.0.0'),
  metadata: z.object({
    projectName: z.string().optional(),
    lastUpdated: z.string(),
    totalTasks: z.number(),
    completedTasks: z.number(),
    lastSyncToMarkdown: z.string().optional(),
    autoSyncEnabled: z.boolean().default(true),
    lastGitPush: z.string().optional(),
    lastPushFiles: z.array(z.string()).optional(),
    syncMonitoring: z.object({
      enabled: z.boolean(),
      autoResolve: z.boolean(),
      conflictStrategy: z.enum(['newest', 'json', 'markdown']),
      lastCheck: z.string()
    }).optional()
  }),
  
  // Task storage
  tasks: z.record(TodoTaskSchema), // taskId -> Task
  sections: z.array(TodoSectionSchema),
  
  // Scoring integration
  scoringSync: z.object({
    lastScoreUpdate: z.string(),
    taskCompletionScore: z.number(),
    priorityWeightedScore: z.number(),
    criticalTasksRemaining: z.number(),
    scoreHistory: z.array(z.object({
      timestamp: z.string(),
      score: z.number(),
      trigger: z.string()
    })).default([])
  }),
  
  // Knowledge graph integration
  knowledgeGraphSync: z.object({
    lastSync: z.string(),
    linkedIntents: z.array(z.string()),
    pendingUpdates: z.array(z.object({
      taskId: z.string(),
      updateType: z.enum(['status', 'progress', 'completion']),
      timestamp: z.string()
    })).default([])
  }),
  
  // Automation rules
  automationRules: z.array(z.object({
    id: z.string(),
    name: z.string(),
    trigger: z.enum(['task_completed', 'all_dependencies_met', 'score_threshold', 'time_based']),
    conditions: z.record(z.any()),
    actions: z.array(z.object({
      type: z.enum(['complete_task', 'create_task', 'update_status', 'notify', 'update_score']),
      parameters: z.record(z.any())
    }))
  })).default([]),
  
  // Templates for task creation
  templates: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    template: z.object({
      title: z.string(),
      description: z.string().optional(),
      priority: z.string().optional(),
      category: z.string().optional(),
      estimatedHours: z.number().optional(),
      tags: z.array(z.string()).optional()
    }),
    createdAt: z.string(),
    usageCount: z.number()
  })).optional().default([]),
  
  // Recurring tasks
  recurringTasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    priority: z.string(),
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    startDate: z.string(),
    endDate: z.string().optional(),
    createdAt: z.string(),
    lastGenerated: z.string().nullable(),
    nextDue: z.string(),
    isActive: z.boolean()
  })).optional().default([]),
  
  // Operation history for undo functionality
  operationHistory: z.array(z.object({
    id: z.string(),
    timestamp: z.string(),
    operation: z.enum(['create_task', 'update_task', 'delete_task', 'archive_task', 'bulk_update', 'bulk_delete']),
    description: z.string(),
    snapshotBefore: z.record(z.any()).optional(), // Task state before operation
    snapshotAfter: z.record(z.any()).optional(),  // Task state after operation
    affectedTaskIds: z.array(z.string()).default([])
  })).default([])
});

export type TodoTask = z.infer<typeof TodoTaskSchema>;
export type TodoSection = z.infer<typeof TodoSectionSchema>;
export type TodoJsonData = z.infer<typeof TodoJsonDataSchema>;

// Helper types for specific operations
export interface TaskUpdateOperation {
  taskId: string;
  updates: Partial<TodoTask>;
  reason: string;
  triggeredBy: 'human' | 'tool' | 'automation';
}

export interface TaskMovementOperation {
  taskId: string;
  fromSectionId: string;
  toSectionId: string;
  newIndex?: number;
  reason: string;
}

export interface AutoCompletionRule {
  taskId: string;
  criteria: {
    allDependenciesCompleted?: boolean;
    scoreThreshold?: number;
    timeElapsed?: number;
    externalTrigger?: string;
  };
  action: 'complete' | 'move_to_section' | 'update_priority';
}

// Scoring integration types
export interface TodoScoreMetrics {
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  priorityWeightedScore: number;
  criticalTasksRemaining: number;
  blockedTasksCount: number;
  averageTaskAge: number;
  velocityMetrics: {
    tasksCompletedLastWeek: number;
    averageCompletionTime: number;
  };
}

// Knowledge graph integration types
export interface TodoKnowledgeGraphLink {
  taskId: string;
  intentId: string;
  linkType: 'generated_from' | 'contributes_to' | 'blocks' | 'depends_on';
  confidence: number;
  lastUpdated: string;
}