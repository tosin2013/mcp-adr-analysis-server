import * as fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import {
  IntentSnapshot,
  ToolExecutionSnapshot,
  TodoSyncState,
  KnowledgeGraphSnapshot,
  TodoSyncStateSchema,
  KnowledgeGraphSnapshotSchema,
} from '../types/knowledge-graph-schemas.js';
import { loadConfig } from './config.js';
// ProjectHealthScoring removed as part of memory-centric architecture

export class KnowledgeGraphManager {
  private cacheDir: string;
  private snapshotsFile: string;
  private syncStateFile: string;
  // private healthScoring: ProjectHealthScoring; // Removed

  constructor() {
    const config = loadConfig();
    this.cacheDir = path.join(config.projectPath, '.mcp-adr-cache');
    this.snapshotsFile = path.join(this.cacheDir, 'knowledge-graph-snapshots.json');
    this.syncStateFile = path.join(this.cacheDir, 'todo-sync-state.json');
    // this.healthScoring = new ProjectHealthScoring(config.projectPath); // Removed
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
      const defaultSyncState = await this.getDefaultSyncState();
      const defaultSnapshot: KnowledgeGraphSnapshot = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        intents: [],
        todoSyncState: defaultSyncState,
        analytics: {
          totalIntents: 0,
          completedIntents: 0,
          activeIntents: 0,
          averageGoalCompletion: 0,
          mostUsedTools: [],
          successfulPatterns: [],
        },
        scoreHistory: [],
      };
      await this.saveKnowledgeGraph(defaultSnapshot);

      // Also create the separate sync state file
      await fs.writeFile(this.syncStateFile, JSON.stringify(defaultSyncState, null, 2));

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

    // Get current score as baseline (ProjectHealthScoring removed)
    const currentScore = { overall: 0.5, components: {}, timestamp: new Date().toISOString() };

    const intent: IntentSnapshot = {
      intentId,
      humanRequest,
      parsedGoals,
      priority,
      timestamp,
      toolChain: [],
      currentStatus: 'planning',
      todoMdSnapshot: '',
      scoreTracking: {
        initialScore: currentScore.overall,
        currentScore: currentScore.overall,
        componentScores: {
          taskCompletion: currentScore.taskCompletion,
          deploymentReadiness: currentScore.deploymentReadiness,
          architectureCompliance: currentScore.architectureCompliance,
          securityPosture: currentScore.securityPosture,
          codeQuality: currentScore.codeQuality,
        },
        lastScoreUpdate: timestamp,
      },
    };

    const kg = await this.loadKnowledgeGraph();
    kg.intents.push(intent);
    kg.analytics.totalIntents = kg.intents.length;
    kg.analytics.activeIntents = kg.intents.filter(i => i.currentStatus !== 'completed').length;

    // Add score history entry
    if (!kg.scoreHistory) kg.scoreHistory = [];
    kg.scoreHistory.push({
      timestamp,
      intentId,
      overallScore: currentScore.overall,
      componentScores: {
        taskCompletion: currentScore.taskCompletion,
        deploymentReadiness: currentScore.deploymentReadiness,
        architectureCompliance: currentScore.architectureCompliance,
        securityPosture: currentScore.securityPosture,
        codeQuality: currentScore.codeQuality,
      },
      triggerEvent: `Intent created: ${humanRequest.substring(0, 100)}...`,
      confidence: currentScore.confidence,
    });

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

    // Capture before score (ProjectHealthScoring removed)
    const beforeScore = { overall: 0.5, components: {}, timestamp: new Date().toISOString() };

    const execution: ToolExecutionSnapshot = {
      toolName,
      parameters,
      result,
      todoTasksCreated,
      todoTasksModified,
      executionTime: new Date().toISOString(),
      success,
      error,
    };

    intent.toolChain.push(execution);
    intent.currentStatus = success ? 'executing' : 'failed';

    // Update scores after tool execution and capture impact
    await this.updateScoreTracking(intentId, toolName, beforeScore, execution);

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

  async getIntentsByStatus(
    status: 'planning' | 'executing' | 'completed' | 'failed'
  ): Promise<IntentSnapshot[]> {
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
      version: 1,
    };
  }

  private updateAnalytics(kg: KnowledgeGraphSnapshot): void {
    const intents = kg.intents;

    kg.analytics.totalIntents = intents.length;
    kg.analytics.completedIntents = intents.filter(i => i.currentStatus === 'completed').length;
    kg.analytics.activeIntents = intents.filter(
      i => i.currentStatus !== 'completed' && i.currentStatus !== 'failed'
    ).length;

    if (kg.analytics.totalIntents > 0) {
      kg.analytics.averageGoalCompletion =
        kg.analytics.completedIntents / kg.analytics.totalIntents;
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
      lastHash: syncState.todoMdHash,
    };
  }

  /**
   * Update score tracking for an intent after tool execution
   */
  private async updateScoreTracking(
    intentId: string,
    toolName: string,
    beforeScore: ProjectHealthScore,
    execution: ToolExecutionSnapshot
  ): Promise<void> {
    const kg = await this.loadKnowledgeGraph();
    const intent = kg.intents.find(i => i.intentId === intentId);

    if (!intent) return;

    // Get current score after tool execution (ProjectHealthScoring removed)
    const afterScore = { overall: 0.5, components: {}, timestamp: new Date().toISOString() };

    // Calculate score impact
    const scoreImpact = {
      beforeScore: beforeScore.overall,
      afterScore: afterScore.overall,
      componentImpacts: {
        taskCompletion: afterScore.taskCompletion - beforeScore.taskCompletion,
        deploymentReadiness: afterScore.deploymentReadiness - beforeScore.deploymentReadiness,
        architectureCompliance:
          afterScore.architectureCompliance - beforeScore.architectureCompliance,
        securityPosture: afterScore.securityPosture - beforeScore.securityPosture,
        codeQuality: afterScore.codeQuality - beforeScore.codeQuality,
      },
      scoreConfidence: afterScore.confidence,
    };

    // Update execution with score impact
    execution.scoreImpact = scoreImpact;

    // Update intent score tracking
    if (intent.scoreTracking) {
      intent.scoreTracking.currentScore = afterScore.overall;
      intent.scoreTracking.componentScores = {
        taskCompletion: afterScore.taskCompletion,
        deploymentReadiness: afterScore.deploymentReadiness,
        architectureCompliance: afterScore.architectureCompliance,
        securityPosture: afterScore.securityPosture,
        codeQuality: afterScore.codeQuality,
      };
      intent.scoreTracking.lastScoreUpdate = new Date().toISOString();

      // Calculate progress if we have initial score
      if (intent.scoreTracking.initialScore !== undefined) {
        const initialScore = intent.scoreTracking.initialScore;
        const targetScore = intent.scoreTracking.targetScore || 100;
        const currentScore = afterScore.overall;

        // Calculate progress as percentage of improvement toward target
        const totalPossibleImprovement = targetScore - initialScore;
        const actualImprovement = currentScore - initialScore;
        intent.scoreTracking.scoreProgress =
          totalPossibleImprovement > 0
            ? Math.min(100, (actualImprovement / totalPossibleImprovement) * 100)
            : 0;
      }
    }

    // Add to score history
    if (!kg.scoreHistory) kg.scoreHistory = [];
    kg.scoreHistory.push({
      timestamp: new Date().toISOString(),
      intentId,
      overallScore: afterScore.overall,
      componentScores: {
        taskCompletion: afterScore.taskCompletion,
        deploymentReadiness: afterScore.deploymentReadiness,
        architectureCompliance: afterScore.architectureCompliance,
        securityPosture: afterScore.securityPosture,
        codeQuality: afterScore.codeQuality,
      },
      triggerEvent: `Tool executed: ${toolName}`,
      confidence: afterScore.confidence,
    });

    // Keep only last 100 score history entries
    if (kg.scoreHistory.length > 100) {
      kg.scoreHistory = kg.scoreHistory.slice(-100);
    }
  }

  /**
   * Get score trends for an intent
   */
  async getIntentScoreTrends(intentId: string): Promise<{
    initialScore: number;
    currentScore: number;
    progress: number;
    componentTrends: Record<string, number>;
    scoreHistory: Array<{
      timestamp: string;
      score: number;
      triggerEvent: string;
    }>;
  }> {
    const kg = await this.loadKnowledgeGraph();
    const intent = kg.intents.find(i => i.intentId === intentId);

    if (!intent?.scoreTracking) {
      throw new Error(`Intent ${intentId} not found or has no score tracking`);
    }

    const scoreHistory = kg.scoreHistory?.filter(h => h.intentId === intentId) || [];

    return {
      initialScore: intent.scoreTracking.initialScore || 0,
      currentScore: intent.scoreTracking.currentScore || 0,
      progress: intent.scoreTracking.scoreProgress || 0,
      componentTrends: intent.scoreTracking.componentScores || {},
      scoreHistory: scoreHistory.map(h => ({
        timestamp: h.timestamp,
        score: h.overallScore,
        triggerEvent: h.triggerEvent,
      })),
    };
  }

  /**
   * Get overall project score trends
   */
  async getProjectScoreTrends(): Promise<{
    currentScore: number;
    scoreHistory: Array<{
      timestamp: string;
      score: number;
      triggerEvent: string;
      intentId?: string;
    }>;
    averageImprovement: number;
    topImpactingIntents: Array<{
      intentId: string;
      humanRequest: string;
      scoreImprovement: number;
    }>;
  }> {
    const kg = await this.loadKnowledgeGraph();
    const currentScore = { overall: 0.5, components: {}, timestamp: new Date().toISOString() }; // ProjectHealthScoring removed

    const scoreHistory = kg.scoreHistory || [];
    const intentImpacts = kg.intents
      .filter(
        i =>
          i.scoreTracking?.initialScore !== undefined && i.scoreTracking?.currentScore !== undefined
      )
      .map(i => ({
        intentId: i.intentId,
        humanRequest: i.humanRequest,
        scoreImprovement: i.scoreTracking!.currentScore! - i.scoreTracking!.initialScore!,
      }))
      .sort((a, b) => b.scoreImprovement - a.scoreImprovement)
      .slice(0, 5);

    const averageImprovement =
      intentImpacts.length > 0
        ? intentImpacts.reduce((sum, i) => sum + i.scoreImprovement, 0) / intentImpacts.length
        : 0;

    return {
      currentScore: currentScore.overall,
      scoreHistory: scoreHistory.map(h => ({
        timestamp: h.timestamp,
        score: h.overallScore,
        triggerEvent: h.triggerEvent,
        ...(h.intentId && { intentId: h.intentId }),
      })),
      averageImprovement,
      topImpactingIntents: intentImpacts,
    };
  }

  /**
   * Record project structure analysis to knowledge graph
   */
  async recordProjectStructure(structureSnapshot: {
    projectPath: string;
    analysisDepth: string;
    recursiveDepth: string;
    technologyFocus: string[];
    analysisScope: string[];
    includeEnvironment: boolean;
    timestamp: string;
    structureData: any;
  }): Promise<void> {
    const intentId = `project-structure-${Date.now()}`;

    const intent: IntentSnapshot = {
      intentId: intentId,
      humanRequest: `Analyze project ecosystem with ${structureSnapshot.analysisDepth} depth`,
      parsedGoals: [
        `Analyze project structure at ${structureSnapshot.projectPath}`,
        `Record directory structure and technology patterns`,
        `Track architectural decisions and dependencies`,
      ],
      priority: 'medium',
      timestamp: structureSnapshot.timestamp,
      toolChain: [
        {
          toolName: 'analyze_project_ecosystem',
          parameters: {
            projectPath: structureSnapshot.projectPath,
            analysisDepth: structureSnapshot.analysisDepth,
            recursiveDepth: structureSnapshot.recursiveDepth,
            technologyFocus: structureSnapshot.technologyFocus,
            analysisScope: structureSnapshot.analysisScope,
            includeEnvironment: structureSnapshot.includeEnvironment,
          },
          result: {
            structureData: structureSnapshot.structureData,
            timestamp: structureSnapshot.timestamp,
          },
          todoTasksCreated: [],
          todoTasksModified: [],
          executionTime: structureSnapshot.timestamp,
          success: true,
        },
      ],
      currentStatus: 'completed',
      todoMdSnapshot: '', // No specific TODO.md impact for structure analysis
      tags: ['project-structure', 'ecosystem-analysis', 'architecture'],
    };

    await this.createIntent(intent.humanRequest, intent.parsedGoals, intent.priority);
  }
}
