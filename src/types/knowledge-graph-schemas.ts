import { z } from 'zod';

export const ToolExecutionSnapshotSchema = z.object({
  toolName: z.string(),
  parameters: z.record(z.any()),
  result: z.record(z.any()),
  todoTasksCreated: z.array(z.string()),
  todoTasksModified: z.array(z.string()),
  executionTime: z.string(),
  success: z.boolean(),
  error: z.string().optional()
});

export const IntentSnapshotSchema = z.object({
  intentId: z.string(),
  humanRequest: z.string(),
  parsedGoals: z.array(z.string()),
  priority: z.enum(['high', 'medium', 'low']),
  timestamp: z.string(),
  toolChain: z.array(ToolExecutionSnapshotSchema),
  currentStatus: z.enum(['planning', 'executing', 'completed', 'failed']),
  todoMdSnapshot: z.string(),
  parentIntentId: z.string().optional(),
  tags: z.array(z.string()).optional()
});

export const TodoSyncStateSchema = z.object({
  lastSyncTimestamp: z.string(),
  todoMdHash: z.string(),
  knowledgeGraphHash: z.string(),
  syncStatus: z.enum(['synced', 'pending', 'conflict', 'error']),
  conflictDetails: z.array(z.object({
    taskId: z.string(),
    conflict: z.string(),
    todoVersion: z.string(),
    kgVersion: z.string()
  })).optional(),
  lastModifiedBy: z.enum(['human', 'tool', 'sync']),
  version: z.number()
});

export const KnowledgeGraphSnapshotSchema = z.object({
  version: z.string(),
  timestamp: z.string(),
  intents: z.array(IntentSnapshotSchema),
  todoSyncState: TodoSyncStateSchema,
  analytics: z.object({
    totalIntents: z.number(),
    completedIntents: z.number(),
    activeIntents: z.number(),
    averageGoalCompletion: z.number(),
    mostUsedTools: z.array(z.object({
      toolName: z.string(),
      usageCount: z.number()
    })),
    successfulPatterns: z.array(z.object({
      pattern: z.string(),
      successRate: z.number(),
      examples: z.array(z.string())
    }))
  })
});

export type ToolExecutionSnapshot = z.infer<typeof ToolExecutionSnapshotSchema>;
export type IntentSnapshot = z.infer<typeof IntentSnapshotSchema>;
export type TodoSyncState = z.infer<typeof TodoSyncStateSchema>;
export type KnowledgeGraphSnapshot = z.infer<typeof KnowledgeGraphSnapshotSchema>;

export interface IntentGoal {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  completionPercentage: number;
  linkedTasks: string[];
  linkedAdrs: string[];
}

export interface ToolChainPattern {
  id: string;
  name: string;
  tools: string[];
  successRate: number;
  averageExecutionTime: number;
  commonGoalTypes: string[];
  lastUsed: string;
}

export interface ConflictResolutionStrategy {
  type: 'timestamp' | 'manual' | 'merge' | 'preserve_human';
  description: string;
  autoResolve: boolean;
}