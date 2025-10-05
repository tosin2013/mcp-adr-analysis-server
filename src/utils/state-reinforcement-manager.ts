/**
 * State Reinforcement Manager
 *
 * Handles context injection and state reinforcement to combat context decay.
 * Periodically re-injects core instructions and context reminders into responses.
 */

import {
  type ContextReinforcementConfig,
  type EnrichedResponse,
  type CoreContextReminder,
} from '../types/state-reinforcement.js';
import { KnowledgeGraphManager } from './knowledge-graph-manager.js';
import { createLogger, loadConfig } from './config.js';

/**
 * Default configuration for context reinforcement
 */
const DEFAULT_CONFIG: ContextReinforcementConfig = {
  turnInterval: 5,
  tokenThreshold: 3000,
  includeKnowledgeGraphContext: true,
  maxRecentIntents: 3,
};

/**
 * Core context that should be reinforced
 */
const CORE_CONTEXT_REMINDER: Omit<CoreContextReminder, 'recentIntents' | 'conversationState'> = {
  objective:
    'You are an MCP server providing architectural analysis and ADR management. Your primary goal is to help maintain architectural consistency, provide actionable insights, and track project decisions.',
  principles: [
    'Always prioritize architectural consistency and alignment with existing ADRs',
    'Provide evidence-based recommendations with confidence scores',
    'Maintain knowledge graph relationships between decisions, code, and outcomes',
    'Use tiered responses for comprehensive analyses to optimize token usage',
    'Track and persist important project context across conversations',
  ],
};

export class StateReinforcementManager {
  private config: ContextReinforcementConfig;
  private kgManager: KnowledgeGraphManager;
  private logger: ReturnType<typeof createLogger>;
  private turnCounter: number = 0;

  constructor(kgManager: KnowledgeGraphManager, config: Partial<ContextReinforcementConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.kgManager = kgManager;
    const serverConfig = loadConfig();
    this.logger = createLogger(serverConfig);
  }

  /**
   * Increment turn counter
   */
  incrementTurn(): number {
    this.turnCounter++;
    return this.turnCounter;
  }

  /**
   * Get current turn number
   */
  getCurrentTurn(): number {
    return this.turnCounter;
  }

  /**
   * Reset turn counter
   */
  resetTurnCounter(): void {
    this.turnCounter = 0;
  }

  /**
   * Estimate token count (rough approximation: 1 token ≈ 4 characters)
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Get recent knowledge graph intents
   */
  private async getRecentIntents(): Promise<
    Array<{ intent: string; timestamp: string; outcome: string }>
  > {
    try {
      const activeIntents = await this.kgManager.getActiveIntents();

      // Take most recent intents up to maxRecentIntents limit
      const recentIntents = activeIntents
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, this.config.maxRecentIntents);

      return recentIntents.map(intent => ({
        intent: intent.humanRequest,
        timestamp: intent.timestamp,
        outcome: intent.currentStatus,
      }));
    } catch (error) {
      this.logger.error(
        'Failed to retrieve recent intents',
        'StateReinforcementManager',
        error instanceof Error ? error : undefined
      );
      return [];
    }
  }

  /**
   * Build core context reminder with recent knowledge graph context
   */
  private async buildContextReminder(): Promise<CoreContextReminder> {
    const baseReminder = { ...CORE_CONTEXT_REMINDER };

    if (this.config.includeKnowledgeGraphContext) {
      const recentIntents = await this.getRecentIntents();
      return {
        ...baseReminder,
        recentIntents,
      };
    }

    return baseReminder;
  }

  /**
   * Format context reminder for injection
   */
  private formatContextReminder(reminder: CoreContextReminder): string {
    const parts: string[] = [];

    parts.push('## 🔄 Context Reminder');
    parts.push('');
    parts.push(`**Objective**: ${reminder.objective}`);
    parts.push('');

    if (reminder.principles.length > 0) {
      parts.push('**Key Principles**:');
      reminder.principles.forEach(principle => {
        parts.push(`- ${principle}`);
      });
      parts.push('');
    }

    if (reminder.recentIntents && reminder.recentIntents.length > 0) {
      parts.push('**Recent Actions**:');
      reminder.recentIntents.forEach(intent => {
        parts.push(`- ${intent.intent} (${intent.timestamp}): ${intent.outcome}`);
      });
      parts.push('');
    }

    parts.push('---');
    parts.push('');

    return parts.join('\n');
  }

  /**
   * Determine if context should be injected
   */
  private shouldInjectContext(
    tokenCount: number,
    currentTurn: number
  ): { shouldInject: boolean; reason?: 'turn-interval' | 'token-threshold' } {
    // Check turn interval
    if (currentTurn > 0 && currentTurn % this.config.turnInterval === 0) {
      return { shouldInject: true, reason: 'turn-interval' };
    }

    // Check token threshold
    if (tokenCount >= this.config.tokenThreshold) {
      return { shouldInject: true, reason: 'token-threshold' };
    }

    return { shouldInject: false };
  }

  /**
   * Enrich response with context reinforcement
   */
  async enrichResponseWithContext(content: string): Promise<EnrichedResponse> {
    const currentTurn = this.incrementTurn();
    const tokenCount = this.estimateTokenCount(content);

    const { shouldInject, reason } = this.shouldInjectContext(tokenCount, currentTurn);

    if (!shouldInject) {
      return {
        originalContent: content,
        enrichedContent: content,
        contextInjected: false,
        injectionReason: 'none',
        tokenCount,
        turnNumber: currentTurn,
      };
    }

    try {
      const contextReminder = await this.buildContextReminder();
      const reminderText = this.formatContextReminder(contextReminder);

      // Inject context at the beginning of the response
      const enrichedContent = `${reminderText}${content}`;

      this.logger.info(
        `Context reinforcement injected at turn ${currentTurn} (reason: ${reason}, tokens: ${tokenCount})`,
        'StateReinforcementManager'
      );

      return {
        originalContent: content,
        enrichedContent,
        contextInjected: true,
        injectionReason: reason as 'turn-interval' | 'token-threshold',
        tokenCount,
        turnNumber: currentTurn,
      };
    } catch (error) {
      this.logger.error(
        'Failed to enrich response with context',
        'StateReinforcementManager',
        error instanceof Error ? error : undefined
      );

      // Return original content if enrichment fails
      return {
        originalContent: content,
        enrichedContent: content,
        contextInjected: false,
        tokenCount,
        turnNumber: currentTurn,
      };
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ContextReinforcementConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ContextReinforcementConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info(
      'State reinforcement configuration updated',
      'StateReinforcementManager',
      undefined,
      { newConfig: this.config }
    );
  }
}
