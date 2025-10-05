/**
 * Types for state reinforcement and context injection
 */

/**
 * Context reinforcement configuration
 */
export interface ContextReinforcementConfig {
  /**
   * Inject context every N turns
   * @default 5
   */
  turnInterval: number;

  /**
   * Inject context when response exceeds this token count
   * @default 3000
   */
  tokenThreshold: number;

  /**
   * Include recent knowledge graph intents
   * @default true
   */
  includeKnowledgeGraphContext: boolean;

  /**
   * Maximum number of recent intents to include
   * @default 3
   */
  maxRecentIntents: number;
}

/**
 * Enriched response with context reinforcement
 */
export interface EnrichedResponse {
  /**
   * Original response content
   */
  originalContent: string;

  /**
   * Enhanced content with context injection
   */
  enrichedContent: string;

  /**
   * Whether context was injected
   */
  contextInjected: boolean;

  /**
   * Reason for context injection (turn-based, token-threshold, or none)
   */
  injectionReason?: 'turn-interval' | 'token-threshold' | 'none';

  /**
   * Token count of original response
   */
  tokenCount: number;

  /**
   * Current turn number
   */
  turnNumber: number;
}

/**
 * Core context reminder structure
 */
export interface CoreContextReminder {
  /**
   * Primary objective reminder
   */
  objective: string;

  /**
   * Key architectural principles
   */
  principles: string[];

  /**
   * Recent knowledge graph intents
   */
  recentIntents?: Array<{
    intent: string;
    timestamp: string;
    outcome: string;
  }>;

  /**
   * Active conversation state
   */
  conversationState?: {
    phase: string;
    focus: string;
    nextSteps: string[];
  };
}
