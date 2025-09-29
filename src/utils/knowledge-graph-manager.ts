import * as fs from 'fs/promises';
import path from 'path';
import * as os from 'os';
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
// Using new MemoryHealthScoring instead of deprecated ProjectHealthScoring
import { MemoryHealthScoring, MemoryHealthScore } from './memory-health-scoring.js';

/**
 * Manages knowledge graph snapshots and todo synchronization state
 * Provides persistent storage and retrieval of architectural knowledge
 */
export class KnowledgeGraphManager {
  private cacheDir: string;
  private snapshotsFile: string;
  private syncStateFile: string;
  private memoryScoring: MemoryHealthScoring;

  /**
   * Initialize the knowledge graph manager with cache directory setup
   */
  constructor() {
    const config = loadConfig();
    // Use OS temp directory for cache
    const projectName = path.basename(config.projectPath);
    this.cacheDir = path.join(os.tmpdir(), projectName, 'cache');
    this.snapshotsFile = path.join(this.cacheDir, 'knowledge-graph-snapshots.json');
    this.syncStateFile = path.join(this.cacheDir, 'todo-sync-state.json');
    this.memoryScoring = new MemoryHealthScoring();
  }

  /**
   * Ensure the cache directory exists, creating it if necessary
   */
  async ensureCacheDirectory(): Promise<void> {
    try {
      await fs.access(this.cacheDir);
    } catch {
      await fs.mkdir(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Load the knowledge graph snapshot from cache
   * @returns Promise resolving to the knowledge graph snapshot
   */
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

    // Get current score as baseline
    // Calculate memory-based health score
    const kgData = await this.loadKnowledgeGraph();
    const currentScore = await this.calculateMemoryScore(kgData);

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
          taskCompletion: currentScore.memoryQuality,
          deploymentReadiness: currentScore.retrievalPerformance,
          architectureCompliance: currentScore.entityCoherence,
          securityPosture: currentScore.contextUtilization,
          codeQuality: currentScore.decisionAlignment,
        },
        lastScoreUpdate: timestamp,
      },
    };

    const kgUpdate = await this.loadKnowledgeGraph();
    kgUpdate.intents.push(intent);
    kgUpdate.analytics.totalIntents = kgUpdate.intents.length;
    kgUpdate.analytics.activeIntents = kgUpdate.intents.filter(
      i => i.currentStatus !== 'completed'
    ).length;

    // Add score history entry
    if (!kgUpdate.scoreHistory) kgUpdate.scoreHistory = [];
    kgUpdate.scoreHistory.push({
      timestamp,
      intentId,
      overallScore: currentScore.overall,
      componentScores: {
        taskCompletion: currentScore.memoryQuality,
        deploymentReadiness: currentScore.retrievalPerformance,
        architectureCompliance: currentScore.entityCoherence,
        securityPosture: currentScore.contextUtilization,
        codeQuality: currentScore.decisionAlignment,
      },
      triggerEvent: `Intent created: ${humanRequest.substring(0, 100)}...`,
      confidence: currentScore.confidence,
    });

    await this.saveKnowledgeGraph(kgUpdate);
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

    // Capture before score
    // ProjectHealthScoring removed - get current memory score
    const beforeScore = await this.memoryScoring.calculateMemoryHealth([], {}, {});

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

  async addMemoryExecution(
    toolName: string,
    action: string,
    entityType: string,
    success: boolean,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      const kg = await this.loadKnowledgeGraph();

      // Create memory execution record
      const memoryExecution = {
        toolName,
        action,
        entityType,
        success,
        details: details || {},
        timestamp: new Date().toISOString(),
      };

      // Initialize memory operations array if it doesn't exist
      if (!kg.memoryOperations) {
        kg.memoryOperations = [];
      }

      // Add memory execution to knowledge graph
      kg.memoryOperations.push(memoryExecution);

      // Limit memory operations history to last 1000 entries
      if (kg.memoryOperations.length > 1000) {
        kg.memoryOperations = kg.memoryOperations.slice(-1000);
      }

      // Update analytics to include memory operation metrics
      this.updateMemoryAnalytics(kg);
      await this.saveKnowledgeGraph(kg);
    } catch (error) {
      console.error('[WARN] Failed to track memory execution:', error);
      // Don't throw - memory tracking shouldn't break tool execution
    }
  }

  private updateMemoryAnalytics(kg: KnowledgeGraphSnapshot): void {
    if (!kg.memoryOperations || kg.memoryOperations.length === 0) {
      return;
    }

    // Calculate memory operation statistics
    const totalOps = kg.memoryOperations.length;
    const successfulOps = kg.memoryOperations.filter((op: any) => op.success).length;
    const successRate = totalOps > 0 ? successfulOps / totalOps : 0;

    // Group by entity type
    const byEntityType: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    const byTool: Record<string, number> = {};

    for (const op of kg.memoryOperations) {
      byEntityType[op.entityType] = (byEntityType[op.entityType] || 0) + 1;
      byAction[op.action] = (byAction[op.action] || 0) + 1;
      byTool[op.toolName] = (byTool[op.toolName] || 0) + 1;
    }

    // Add memory analytics to knowledge graph
    if (!kg.analytics) {
      kg.analytics = {
        totalIntents: 0,
        completedIntents: 0,
        activeIntents: 0,
        averageGoalCompletion: 0,
        mostUsedTools: [],
        successfulPatterns: [],
      };
    }

    kg.analytics.memoryOperations = {
      totalOperations: totalOps,
      successRate,
      byEntityType,
      byAction,
      byTool,
      lastMemoryOperation: kg.memoryOperations[kg.memoryOperations.length - 1]?.timestamp,
    };
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
    beforeScore: MemoryHealthScore,
    execution: ToolExecutionSnapshot
  ): Promise<void> {
    const kg = await this.loadKnowledgeGraph();
    const intent = kg.intents.find(i => i.intentId === intentId);

    if (!intent) return;

    // Get current score after tool execution
    const afterScore = await this.calculateMemoryScore(kg);

    // Calculate score impact - map memory scores to legacy component names
    const scoreImpact = {
      beforeScore: beforeScore.overall,
      afterScore: afterScore.overall,
      componentImpacts: {
        taskCompletion: afterScore.memoryQuality - beforeScore.memoryQuality,
        deploymentReadiness: afterScore.retrievalPerformance - beforeScore.retrievalPerformance,
        architectureCompliance: afterScore.entityCoherence - beforeScore.entityCoherence,
        securityPosture: afterScore.contextUtilization - beforeScore.contextUtilization,
        codeQuality: afterScore.decisionAlignment - beforeScore.decisionAlignment,
      },
      scoreConfidence: afterScore.confidence,
    };

    // Update execution with score impact
    execution.scoreImpact = scoreImpact;

    // Update intent score tracking - map memory scores to legacy component names
    if (intent.scoreTracking) {
      intent.scoreTracking.currentScore = afterScore.overall;
      intent.scoreTracking.componentScores = {
        taskCompletion: afterScore.memoryQuality,
        deploymentReadiness: afterScore.retrievalPerformance,
        architectureCompliance: afterScore.entityCoherence,
        securityPosture: afterScore.contextUtilization,
        codeQuality: afterScore.decisionAlignment,
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
        taskCompletion: afterScore.memoryQuality,
        deploymentReadiness: afterScore.retrievalPerformance,
        architectureCompliance: afterScore.entityCoherence,
        securityPosture: afterScore.contextUtilization,
        codeQuality: afterScore.decisionAlignment,
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
    // Calculate memory-based health score
    const kgData = await this.loadKnowledgeGraph();
    const currentScore = await this.calculateMemoryScore(kgData);

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

  /**
   * Get relationships from knowledge graph
   */
  getRelationships(_nodeType: string, _relationType: string): Array<any> {
    // Placeholder implementation - returns empty array
    // Future: Query knowledge graph for actual relationships
    return [];
  }

  /**
   * Calculate memory-based health score from knowledge graph
   */
  private async calculateMemoryScore(kg: KnowledgeGraphSnapshot): Promise<MemoryHealthScore> {
    // Extract memories from intents and their tool executions
    const memories = this.extractMemoriesFromKG(kg);

    // Calculate retrieval metrics from tool execution patterns
    const retrievalMetrics = this.calculateRetrievalMetrics(kg);

    // Build entity graph from intents and relationships
    const entityGraph = this.buildEntityGraph(kg);

    return this.memoryScoring.calculateMemoryHealth(memories, retrievalMetrics, entityGraph);
  }

  /**
   * Extract memory representations from knowledge graph
   */
  private extractMemoriesFromKG(kg: KnowledgeGraphSnapshot): any[] {
    const memories: any[] = [];

    kg.intents.forEach(intent => {
      // Each intent is a memory
      memories.push({
        id: intent.intentId,
        content: intent.humanRequest,
        context: {
          goals: intent.parsedGoals,
          priority: intent.priority,
          status: intent.currentStatus,
        },
        timestamp: intent.timestamp,
        metadata: {
          relevanceScore: this.calculateIntentRelevance(intent),
          toolExecutions: intent.toolChain.length,
        },
        relatedDecisions: (intent as any).adrsCreated || [],
      });

      // Each tool execution is also a memory
      intent.toolChain.forEach(tool => {
        memories.push({
          id: `${intent.intentId}-${tool.toolName}`,
          content: `${tool.toolName} execution`,
          context: {
            parameters: tool.parameters,
            result: tool.result,
            success: tool.success,
          },
          timestamp: tool.executionTime,
          metadata: {
            relevanceScore: tool.success ? 0.8 : 0.3,
            parentIntent: intent.intentId,
          },
        });
      });
    });

    return memories;
  }

  /**
   * Calculate retrieval metrics from tool execution patterns
   */
  private calculateRetrievalMetrics(kg: KnowledgeGraphSnapshot): any {
    let totalRetrievals = 0;
    let successfulRetrievals = 0;
    let totalTime = 0;

    kg.intents.forEach(intent => {
      intent.toolChain.forEach(tool => {
        totalRetrievals++;
        if (tool.success) successfulRetrievals++;
        // Estimate retrieval time (would be actual in production)
        totalTime += tool.executionTime ? 50 : 100;
      });
    });

    return {
      totalRetrievals,
      successfulRetrievals,
      averageRetrievalTime: totalRetrievals > 0 ? totalTime / totalRetrievals : 0,
      precisionScore: 0.8, // Placeholder - would calculate from actual retrievals
      recallScore: 0.7, // Placeholder - would calculate from actual retrievals
    };
  }

  /**
   * Build entity graph from knowledge graph
   */
  private buildEntityGraph(kg: KnowledgeGraphSnapshot): any {
    const entities: any[] = [];
    const relationships: any[] = [];

    // Intents as entities
    kg.intents.forEach(intent => {
      entities.push({
        id: intent.intentId,
        type: 'intent',
        name: intent.humanRequest.substring(0, 50),
      });

      // Create relationships between intents and their tools
      intent.toolChain.forEach(tool => {
        entities.push({
          id: `tool-${tool.toolName}`,
          type: 'tool',
          name: tool.toolName,
        });

        relationships.push({
          sourceId: intent.intentId,
          targetId: `tool-${tool.toolName}`,
          type: 'uses',
          strength: tool.success ? 0.9 : 0.3,
        });
      });
    });

    // Add ADR entities and relationships
    kg.intents.forEach(intent => {
      ((intent as any).adrsCreated || []).forEach((adrId: any) => {
        entities.push({
          id: `adr-${adrId}`,
          type: 'decision',
          name: `ADR ${adrId}`,
        });

        relationships.push({
          sourceId: intent.intentId,
          targetId: `adr-${adrId}`,
          type: 'created',
          strength: 0.95,
        });
      });
    });

    return {
      entities,
      relationships,
      decisions: entities.filter(e => e.type === 'decision'),
    };
  }

  /**
   * Calculate relevance score for an intent
   */
  private calculateIntentRelevance(intent: IntentSnapshot): number {
    const now = new Date();
    const age = now.getTime() - new Date(intent.timestamp).getTime();
    const ageInDays = age / (24 * 60 * 60 * 1000);

    // Base relevance on status and age
    let relevance = 0.5;

    if (intent.currentStatus === 'executing') relevance = 0.9;
    else if (intent.currentStatus === 'planning') relevance = 0.8;
    else if (intent.currentStatus === 'completed') relevance = 0.6;

    // Decay relevance over time
    relevance *= Math.max(0.3, 1 - ageInDays / 30);

    // Boost relevance if it has successful tool executions
    const successRate =
      intent.toolChain.filter(t => t.success).length / (intent.toolChain.length || 1);
    relevance = (relevance + successRate) / 2;

    return relevance;
  }
}
