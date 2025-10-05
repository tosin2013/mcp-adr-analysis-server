/**
 * Conversation Memory Types
 *
 * Phase 3 of context decay mitigation: Structured external memory
 * for conversation persistence, expandable content storage, and resumption.
 */

import type { ExpandableContent } from './tiered-response.js';

/**
 * A single turn in the conversation
 */
export interface ConversationTurn {
  /** Unique turn ID */
  id: string;

  /** Turn number in sequence */
  turnNumber: number;

  /** Timestamp of the turn */
  timestamp: string;

  /** User request or tool invocation */
  request: {
    type: 'tool_call' | 'user_message';
    toolName?: string;
    toolArgs?: any;
    message?: string;
  };

  /** Response provided */
  response: {
    content: string;
    tokenCount: number;
    contextInjected?: boolean;
    expandableId?: string; // Link to tiered response expandable content
  };

  /** Metadata */
  metadata: {
    duration?: number; // milliseconds
    model?: string;
    cacheHit?: boolean;
    errorOccurred?: boolean;
  };
}

/**
 * Complete conversation session
 */
export interface ConversationSession {
  /** Unique session ID */
  sessionId: string;

  /** Project path this session is for */
  projectPath: string;

  /** Session start time */
  startedAt: string;

  /** Session last activity time */
  lastActivityAt: string;

  /** All conversation turns */
  turns: ConversationTurn[];

  /** Session metadata */
  metadata: {
    totalTokensUsed: number;
    averageResponseTime: number;
    toolsUsed: string[];
    knowledgeGraphIntents: string[]; // IDs from KG
  };
}

/**
 * Conversation memory storage configuration
 */
export interface ConversationMemoryConfig {
  /**
   * Maximum number of sessions to keep in memory
   * @default 10
   */
  maxSessionsInMemory: number;

  /**
   * Persist session to disk after N turns
   * @default 5
   */
  persistAfterTurns: number;

  /**
   * Maximum age of session in hours before archival
   * @default 24
   */
  sessionMaxAgeHours: number;

  /**
   * Enable automatic cleanup of old sessions
   * @default true
   */
  autoCleanup: boolean;

  /**
   * Retention period for archived sessions in days
   * @default 30
   */
  archivedRetentionDays: number;
}

/**
 * Conversation context snapshot for state resumption
 */
export interface ConversationContextSnapshot {
  /** Session ID */
  sessionId: string;

  /** Last N turns for context */
  recentTurns: ConversationTurn[];

  /** Active knowledge graph intents */
  activeIntents: Array<{
    id: string;
    intent: string;
    status: string;
  }>;

  /** Architectural decisions made in this session */
  decisionsRecorded: Array<{
    adrId: string;
    title: string;
    timestamp: string;
  }>;

  /** Current conversation focus */
  conversationFocus?: {
    topic: string;
    phase: string;
    nextSteps: string[];
  };
}

/**
 * Memory expansion request
 */
export interface MemoryExpansionRequest {
  /** Expandable ID from tiered response */
  expandableId: string;

  /** Optional: specific section to expand */
  section?: string;

  /** Include related context */
  includeContext?: boolean;
}

/**
 * Memory expansion response
 */
export interface MemoryExpansionResponse {
  /** Request ID */
  expandableId: string;

  /** Expanded content */
  content: ExpandableContent;

  /** Related conversation turns */
  relatedTurns?: ConversationTurn[];

  /** Knowledge graph context */
  knowledgeGraphContext?: Array<{
    intent: string;
    outcome: string;
    timestamp: string;
  }>;
}

/**
 * Session query for retrieval
 */
export interface SessionQuery {
  /** Filter by project path */
  projectPath?: string;

  /** Filter by date range */
  dateRange?: {
    start: string;
    end: string;
  };

  /** Filter by tools used */
  toolsUsed?: string[];

  /** Filter by keyword in turns */
  keyword?: string;

  /** Limit results */
  limit?: number;
}

/**
 * Conversation memory statistics
 */
export interface ConversationMemoryStats {
  /** Total sessions stored */
  totalSessions: number;

  /** Active sessions (< 24h old) */
  activeSessions: number;

  /** Archived sessions */
  archivedSessions: number;

  /** Total turns across all sessions */
  totalTurns: number;

  /** Total expandable content items */
  totalExpandableContent: number;

  /** Average turns per session */
  avgTurnsPerSession: number;

  /** Total storage size (bytes) */
  totalStorageBytes: number;
}
