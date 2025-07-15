import * as fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { 
  IntentSnapshot, 
  ToolExecutionSnapshot, 
  TodoSyncState, 
  KnowledgeGraphSnapshot,
  TodoSyncStateSchema,
  KnowledgeGraphSnapshotSchema
} from '../types/knowledge-graph-schemas.js';
import { loadConfig } from './config.js';

export class KnowledgeGraphManager {
  private cacheDir: string;
  private snapshotsFile: string;
  private syncStateFile: string;

  constructor() {
    const config = loadConfig();
    this.cacheDir = path.join(config.projectPath, '.mcp-adr-cache');
    this.snapshotsFile = path.join(this.cacheDir, 'knowledge-graph-snapshots.json');
    this.syncStateFile = path.join(this.cacheDir, 'todo-sync-state.json');
  }

  async ensureCacheDirectory(): Promise<void> {
    try {
      await fs.access(this.cacheDir);
    } catch {
      await fs.mkdir(this.cacheDir, { recursive: true });
    }
  }

  async loadKnowledgeGraph(): Promise<KnowledgeGraphSnapshot> {
    await this.ensureCacheDirectory();
    
    try {
      const data = await fs.readFile(this.snapshotsFile, 'utf-8');
      const parsed = JSON.parse(data);
      return KnowledgeGraphSnapshotSchema.parse(parsed);
    } catch {
      const defaultSnapshot: KnowledgeGraphSnapshot = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        intents: [],
        todoSyncState: await this.getDefaultSyncState(),
        analytics: {
          totalIntents: 0,
          completedIntents: 0,
          activeIntents: 0,
          averageGoalCompletion: 0,
          mostUsedTools: [],
          successfulPatterns: []
        }
      };
      await this.saveKnowledgeGraph(defaultSnapshot);
      return defaultSnapshot;
    }
  }

  async saveKnowledgeGraph(snapshot: KnowledgeGraphSnapshot): Promise<void> {
    await this.ensureCacheDirectory();
    await fs.writeFile(this.snapshotsFile, JSON.stringify(snapshot, null, 2));
  }

  async createIntent(
    humanRequest: string, 
    parsedGoals: string[], 
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<string> {
    const intentId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    const intent: IntentSnapshot = {
      intentId,
      humanRequest,
      parsedGoals,
      priority,
      timestamp,
      toolChain: [],
      currentStatus: 'planning',
      todoMdSnapshot: ''
    };

    const kg = await this.loadKnowledgeGraph();
    kg.intents.push(intent);
    kg.analytics.totalIntents = kg.intents.length;
    kg.analytics.activeIntents = kg.intents.filter(i => i.currentStatus !== 'completed').length;
    
    await this.saveKnowledgeGraph(kg);
    return intentId;
  }

  async addToolExecution(
    intentId: string,
    toolName: string,
    parameters: Record<string, any>,
    result: Record<string, any>,
    success: boolean,
    todoTasksCreated: string[] = [],
    todoTasksModified: string[] = [],
    error?: string
  ): Promise<void> {
    const kg = await this.loadKnowledgeGraph();
    const intent = kg.intents.find(i => i.intentId === intentId);
    
    if (!intent) {
      throw new Error(`Intent ${intentId} not found`);
    }

    const execution: ToolExecutionSnapshot = {
      toolName,
      parameters,
      result,
      todoTasksCreated,
      todoTasksModified,
      executionTime: new Date().toISOString(),
      success,
      error
    };

    intent.toolChain.push(execution);
    intent.currentStatus = success ? 'executing' : 'failed';

    this.updateAnalytics(kg);
    await this.saveKnowledgeGraph(kg);
  }

  async updateIntentStatus(
    intentId: string, 
    status: 'planning' | 'executing' | 'completed' | 'failed'
  ): Promise<void> {
    const kg = await this.loadKnowledgeGraph();
    const intent = kg.intents.find(i => i.intentId === intentId);
    
    if (!intent) {
      throw new Error(`Intent ${intentId} not found`);
    }

    intent.currentStatus = status;
    this.updateAnalytics(kg);
    await this.saveKnowledgeGraph(kg);
  }

  async updateTodoSnapshot(intentId: string, todoContent: string): Promise<void> {
    const kg = await this.loadKnowledgeGraph();
    const intent = kg.intents.find(i => i.intentId === intentId);
    
    if (!intent) {
      throw new Error(`Intent ${intentId} not found`);
    }

    intent.todoMdSnapshot = todoContent;
    await this.saveKnowledgeGraph(kg);
  }

  async getSyncState(): Promise<TodoSyncState> {
    try {
      const data = await fs.readFile(this.syncStateFile, 'utf-8');
      const parsed = JSON.parse(data);
      return TodoSyncStateSchema.parse(parsed);
    } catch {
      return this.getDefaultSyncState();
    }
  }

  async updateSyncState(updates: Partial<TodoSyncState>): Promise<void> {
    const current = await this.getSyncState();
    const updated = { ...current, ...updates };
    await fs.writeFile(this.syncStateFile, JSON.stringify(updated, null, 2));
    
    const kg = await this.loadKnowledgeGraph();
    kg.todoSyncState = updated;
    await this.saveKnowledgeGraph(kg);
  }

  async getIntentById(intentId: string): Promise<IntentSnapshot | null> {
    const kg = await this.loadKnowledgeGraph();
    return kg.intents.find(i => i.intentId === intentId) || null;
  }

  async getActiveIntents(): Promise<IntentSnapshot[]> {
    const kg = await this.loadKnowledgeGraph();
    return kg.intents.filter(i => i.currentStatus !== 'completed' && i.currentStatus !== 'failed');
  }

  async getIntentsByStatus(status: 'planning' | 'executing' | 'completed' | 'failed'): Promise<IntentSnapshot[]> {
    const kg = await this.loadKnowledgeGraph();
    return kg.intents.filter(i => i.currentStatus === status);
  }

  private async getDefaultSyncState(): Promise<TodoSyncState> {
    return {
      lastSyncTimestamp: new Date().toISOString(),
      todoMdHash: '',
      knowledgeGraphHash: '',
      syncStatus: 'synced',
      lastModifiedBy: 'tool',
      version: 1
    };
  }

  private updateAnalytics(kg: KnowledgeGraphSnapshot): void {
    const intents = kg.intents;
    
    kg.analytics.totalIntents = intents.length;
    kg.analytics.completedIntents = intents.filter(i => i.currentStatus === 'completed').length;
    kg.analytics.activeIntents = intents.filter(i => i.currentStatus !== 'completed' && i.currentStatus !== 'failed').length;
    
    if (kg.analytics.totalIntents > 0) {
      kg.analytics.averageGoalCompletion = kg.analytics.completedIntents / kg.analytics.totalIntents;
    }

    const toolUsage = new Map<string, number>();
    intents.forEach(intent => {
      intent.toolChain.forEach(execution => {
        toolUsage.set(execution.toolName, (toolUsage.get(execution.toolName) || 0) + 1);
      });
    });

    kg.analytics.mostUsedTools = Array.from(toolUsage.entries())
      .map(([toolName, usageCount]) => ({ toolName, usageCount }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);
  }

  async calculateTodoMdHash(todoPath: string): Promise<string> {
    try {
      const content = await fs.readFile(todoPath, 'utf-8');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch {
      return '';
    }
  }

  async detectTodoChanges(todoPath: string): Promise<{
    hasChanges: boolean;
    currentHash: string;
    lastHash: string;
  }> {
    const syncState = await this.getSyncState();
    const currentHash = await this.calculateTodoMdHash(todoPath);
    
    return {
      hasChanges: currentHash !== syncState.todoMdHash,
      currentHash,
      lastHash: syncState.todoMdHash
    };
  }
}