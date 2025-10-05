/**
 * Conversation Memory Manager
 *
 * Phase 3 of context decay mitigation: Structured external memory.
 * Handles conversation persistence, expandable content storage, and resumption.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import crypto from 'crypto';

import {
  ConversationSession,
  ConversationTurn,
  ConversationMemoryConfig,
  ConversationContextSnapshot,
  MemoryExpansionRequest,
  MemoryExpansionResponse,
  SessionQuery,
  ConversationMemoryStats,
} from '../types/conversation-memory.js';
import type { ExpandableContent } from '../types/tiered-response.js';
import { KnowledgeGraphManager } from './knowledge-graph-manager.js';
import { createLogger, loadConfig } from './config.js';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ConversationMemoryConfig = {
  maxSessionsInMemory: 10,
  persistAfterTurns: 5,
  sessionMaxAgeHours: 24,
  autoCleanup: true,
  archivedRetentionDays: 30,
};

export class ConversationMemoryManager {
  private memoryDir: string;
  private sessionsDir: string;
  private expandableContentDir: string;
  private archiveDir: string;

  private config: ConversationMemoryConfig;
  private kgManager: KnowledgeGraphManager;
  private logger: ReturnType<typeof createLogger>;

  // In-memory cache
  private activeSession: ConversationSession | null = null;
  private expandableContentCache: Map<string, ExpandableContent> = new Map();

  constructor(kgManager: KnowledgeGraphManager, config: Partial<ConversationMemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.kgManager = kgManager;

    const serverConfig = loadConfig();
    this.logger = createLogger(serverConfig);

    // Setup storage directories
    const projectName = path.basename(serverConfig.projectPath);
    const baseDir = path.join(os.tmpdir(), projectName, 'conversation-memory');
    this.memoryDir = baseDir;
    this.sessionsDir = path.join(baseDir, 'sessions');
    this.expandableContentDir = path.join(baseDir, 'expandable-content');
    this.archiveDir = path.join(baseDir, 'archive');
  }

  /**
   * Initialize the conversation memory system
   */
  async initialize(): Promise<void> {
    try {
      // Ensure directories exist
      await fs.mkdir(this.memoryDir, { recursive: true });
      await fs.mkdir(this.sessionsDir, { recursive: true });
      await fs.mkdir(this.expandableContentDir, { recursive: true });
      await fs.mkdir(this.archiveDir, { recursive: true });

      // Try to load the most recent active session
      await this.loadMostRecentSession();

      this.logger.info('Conversation Memory Manager initialized', 'ConversationMemoryManager', {
        activeSession: this.activeSession?.sessionId ?? 'none',
      });

      // Schedule cleanup if enabled
      if (this.config.autoCleanup) {
        this.scheduleCleanup();
      }
    } catch (error) {
      this.logger.error(
        'Failed to initialize conversation memory',
        'ConversationMemoryManager',
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  /**
   * Start a new conversation session
   */
  async startNewSession(projectPath: string): Promise<string> {
    const sessionId = this.generateSessionId();
    const now = new Date().toISOString();

    this.activeSession = {
      sessionId,
      projectPath,
      startedAt: now,
      lastActivityAt: now,
      turns: [],
      metadata: {
        totalTokensUsed: 0,
        averageResponseTime: 0,
        toolsUsed: [],
        knowledgeGraphIntents: [],
      },
    };

    await this.persistSession();

    this.logger.info(`New conversation session started: ${sessionId}`, 'ConversationMemoryManager');

    return sessionId;
  }

  /**
   * Record a conversation turn
   */
  async recordTurn(
    request: ConversationTurn['request'],
    response: ConversationTurn['response'],
    metadata: Partial<ConversationTurn['metadata']> = {}
  ): Promise<string> {
    if (!this.activeSession) {
      const serverConfig = loadConfig();
      await this.startNewSession(serverConfig.projectPath);
    }

    const turnId = this.generateTurnId();
    const turnNumber = this.activeSession!.turns.length + 1;

    const turn: ConversationTurn = {
      id: turnId,
      turnNumber,
      timestamp: new Date().toISOString(),
      request,
      response,
      metadata: {
        ...(metadata.duration !== undefined ? { duration: metadata.duration } : {}),
        ...(metadata.model ? { model: metadata.model } : {}),
        cacheHit: metadata.cacheHit ?? false,
        errorOccurred: metadata.errorOccurred ?? false,
      },
    };

    this.activeSession!.turns.push(turn);
    this.activeSession!.lastActivityAt = turn.timestamp;

    // Update session metadata
    this.activeSession!.metadata.totalTokensUsed += response.tokenCount;
    if (request.toolName && !this.activeSession!.metadata.toolsUsed.includes(request.toolName)) {
      this.activeSession!.metadata.toolsUsed.push(request.toolName);
    }

    // Persist if threshold reached
    if (this.activeSession!.turns.length % this.config.persistAfterTurns === 0) {
      await this.persistSession();
    }

    this.logger.debug(
      `Turn ${turnNumber} recorded for session ${this.activeSession!.sessionId}`,
      'ConversationMemoryManager'
    );

    return turnId;
  }

  /**
   * Store expandable content from tiered response
   */
  async storeExpandableContent(expandableId: string, content: ExpandableContent): Promise<void> {
    try {
      const filePath = path.join(this.expandableContentDir, `${expandableId}.json`);
      await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf-8');

      // Cache in memory
      this.expandableContentCache.set(expandableId, content);

      this.logger.debug(`Expandable content stored: ${expandableId}`, 'ConversationMemoryManager');
    } catch (error) {
      this.logger.error(
        `Failed to store expandable content: ${expandableId}`,
        'ConversationMemoryManager',
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  /**
   * Retrieve and expand stored content
   */
  async expandContent(request: MemoryExpansionRequest): Promise<MemoryExpansionResponse> {
    try {
      // Check cache first
      let content = this.expandableContentCache.get(request.expandableId);

      if (!content) {
        // Load from disk
        const filePath = path.join(this.expandableContentDir, `${request.expandableId}.json`);
        const data = await fs.readFile(filePath, 'utf-8');
        content = JSON.parse(data) as ExpandableContent;
        this.expandableContentCache.set(request.expandableId, content);
      }

      // Get related turns if context requested
      let relatedTurns: ConversationTurn[] | undefined;
      if (request.includeContext && this.activeSession) {
        relatedTurns = this.activeSession.turns.filter(
          turn => turn.response.expandableId === request.expandableId
        );
      }

      // Get knowledge graph context
      let knowledgeGraphContext;
      if (request.includeContext) {
        const intents = await this.kgManager.getActiveIntents();
        knowledgeGraphContext = intents.slice(0, 3).map(intent => ({
          intent: intent.humanRequest,
          outcome: intent.currentStatus,
          timestamp: intent.timestamp,
        }));
      }

      return {
        expandableId: request.expandableId,
        content,
        ...(relatedTurns ? { relatedTurns } : {}),
        ...(knowledgeGraphContext ? { knowledgeGraphContext } : {}),
      };
    } catch (error) {
      this.logger.error(
        `Failed to expand content: ${request.expandableId}`,
        'ConversationMemoryManager',
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  /**
   * Get conversation context snapshot for resumption
   */
  async getContextSnapshot(
    recentTurnCount: number = 5
  ): Promise<ConversationContextSnapshot | null> {
    if (!this.activeSession) {
      return null;
    }

    const recentTurns = this.activeSession.turns.slice(-recentTurnCount);

    // Get active KG intents
    const intents = await this.kgManager.getActiveIntents();
    const activeIntents = intents.slice(0, 5).map(intent => ({
      id: intent.intentId,
      intent: intent.humanRequest,
      status: intent.currentStatus,
    }));

    // Get recorded decisions (from KG or metadata)
    const decisionsRecorded: ConversationContextSnapshot['decisionsRecorded'] = [];
    // This could be enhanced to query KG for ADRs created in this session

    return {
      sessionId: this.activeSession.sessionId,
      recentTurns,
      activeIntents,
      decisionsRecorded,
      // conversationFocus is optional and can be omitted
    };
  }

  /**
   * Query conversation sessions
   */
  async querySessions(query: SessionQuery): Promise<ConversationSession[]> {
    try {
      const sessionFiles = await fs.readdir(this.sessionsDir);
      const sessions: ConversationSession[] = [];

      for (const file of sessionFiles) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.sessionsDir, file);
        const data = await fs.readFile(filePath, 'utf-8');
        const session = JSON.parse(data) as ConversationSession;

        // Apply filters
        if (query.projectPath && session.projectPath !== query.projectPath) continue;
        if (
          query.toolsUsed &&
          !query.toolsUsed.some(tool => session.metadata.toolsUsed.includes(tool))
        )
          continue;
        if (query.dateRange) {
          const sessionDate = new Date(session.startedAt);
          const start = new Date(query.dateRange.start);
          const end = new Date(query.dateRange.end);
          if (sessionDate < start || sessionDate > end) continue;
        }

        sessions.push(session);
      }

      // Apply limit
      const limit = query.limit ?? 10;
      return sessions.slice(0, limit);
    } catch (error) {
      this.logger.error(
        'Failed to query sessions',
        'ConversationMemoryManager',
        error instanceof Error ? error : undefined
      );
      return [];
    }
  }

  /**
   * Get conversation memory statistics
   */
  async getStats(): Promise<ConversationMemoryStats> {
    try {
      const sessionFiles = await fs.readdir(this.sessionsDir);
      const archivedFiles = await fs.readdir(this.archiveDir);
      const expandableFiles = await fs.readdir(this.expandableContentDir);

      let totalTurns = 0;
      let activeSessions = 0;
      const now = Date.now();
      const maxAge = this.config.sessionMaxAgeHours * 60 * 60 * 1000;

      for (const file of sessionFiles) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.sessionsDir, file);
        const data = await fs.readFile(filePath, 'utf-8');
        const session = JSON.parse(data) as ConversationSession;

        totalTurns += session.turns.length;

        const sessionAge = now - new Date(session.lastActivityAt).getTime();
        if (sessionAge < maxAge) {
          activeSessions++;
        }
      }

      // Calculate storage size
      const getDirectorySize = async (dir: string): Promise<number> => {
        let size = 0;
        const files = await fs.readdir(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = await fs.stat(filePath);
          size += stat.size;
        }
        return size;
      };

      const totalStorageBytes =
        (await getDirectorySize(this.sessionsDir)) +
        (await getDirectorySize(this.expandableContentDir)) +
        (await getDirectorySize(this.archiveDir));

      return {
        totalSessions: sessionFiles.filter(f => f.endsWith('.json')).length,
        activeSessions,
        archivedSessions: archivedFiles.filter(f => f.endsWith('.json')).length,
        totalTurns,
        totalExpandableContent: expandableFiles.filter(f => f.endsWith('.json')).length,
        avgTurnsPerSession: sessionFiles.length > 0 ? totalTurns / sessionFiles.length : 0,
        totalStorageBytes,
      };
    } catch (error) {
      this.logger.error(
        'Failed to get conversation memory stats',
        'ConversationMemoryManager',
        error instanceof Error ? error : undefined
      );
      return {
        totalSessions: 0,
        activeSessions: 0,
        archivedSessions: 0,
        totalTurns: 0,
        totalExpandableContent: 0,
        avgTurnsPerSession: 0,
        totalStorageBytes: 0,
      };
    }
  }

  /**
   * Persist current session to disk
   */
  private async persistSession(): Promise<void> {
    if (!this.activeSession) return;

    try {
      const filePath = path.join(this.sessionsDir, `${this.activeSession.sessionId}.json`);
      await fs.writeFile(filePath, JSON.stringify(this.activeSession, null, 2), 'utf-8');

      this.logger.debug(
        `Session persisted: ${this.activeSession.sessionId}`,
        'ConversationMemoryManager'
      );
    } catch (error) {
      this.logger.error(
        'Failed to persist session',
        'ConversationMemoryManager',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Load most recent session
   */
  private async loadMostRecentSession(): Promise<void> {
    try {
      const sessionFiles = await fs.readdir(this.sessionsDir);
      if (sessionFiles.length === 0) return;

      // Find most recent session
      let mostRecentFile = '';
      let mostRecentTime = 0;

      for (const file of sessionFiles) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.sessionsDir, file);
        const data = await fs.readFile(filePath, 'utf-8');
        const session = JSON.parse(data) as ConversationSession;

        const sessionTime = new Date(session.lastActivityAt).getTime();
        if (sessionTime > mostRecentTime) {
          mostRecentTime = sessionTime;
          mostRecentFile = file;
        }
      }

      if (mostRecentFile) {
        const filePath = path.join(this.sessionsDir, mostRecentFile);
        const data = await fs.readFile(filePath, 'utf-8');
        this.activeSession = JSON.parse(data) as ConversationSession;

        this.logger.info(
          `Loaded most recent session: ${this.activeSession.sessionId}`,
          'ConversationMemoryManager'
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to load most recent session',
        'ConversationMemoryManager',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Schedule periodic cleanup of old sessions
   */
  private scheduleCleanup(): void {
    // Run cleanup every hour
    setInterval(
      () => {
        this.cleanupOldSessions().catch(error => {
          this.logger.error(
            'Scheduled cleanup failed',
            'ConversationMemoryManager',
            error instanceof Error ? error : undefined
          );
        });
      },
      60 * 60 * 1000
    );
  }

  /**
   * Archive old sessions and cleanup expired archives
   */
  private async cleanupOldSessions(): Promise<void> {
    try {
      const sessionFiles = await fs.readdir(this.sessionsDir);
      const now = Date.now();
      const maxAge = this.config.sessionMaxAgeHours * 60 * 60 * 1000;
      const archiveAge = this.config.archivedRetentionDays * 24 * 60 * 60 * 1000;

      // Archive old sessions
      for (const file of sessionFiles) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.sessionsDir, file);
        const data = await fs.readFile(filePath, 'utf-8');
        const session = JSON.parse(data) as ConversationSession;

        const sessionAge = now - new Date(session.lastActivityAt).getTime();
        if (sessionAge > maxAge) {
          // Move to archive
          const archivePath = path.join(this.archiveDir, file);
          await fs.rename(filePath, archivePath);
          this.logger.debug(`Session archived: ${session.sessionId}`, 'ConversationMemoryManager');
        }
      }

      // Delete expired archives
      const archiveFiles = await fs.readdir(this.archiveDir);
      for (const file of archiveFiles) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.archiveDir, file);
        const stat = await fs.stat(filePath);
        const fileAge = now - stat.mtimeMs;

        if (fileAge > archiveAge) {
          await fs.unlink(filePath);
          this.logger.debug(`Archived session deleted: ${file}`, 'ConversationMemoryManager');
        }
      }
    } catch (error) {
      this.logger.error(
        'Cleanup failed',
        'ConversationMemoryManager',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(6).toString('hex');
    return `session-${timestamp}-${random}`;
  }

  /**
   * Generate unique turn ID
   */
  private generateTurnId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `turn-${timestamp}-${random}`;
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.activeSession?.sessionId ?? null;
  }

  /**
   * Get current session
   */
  getCurrentSession(): ConversationSession | null {
    return this.activeSession;
  }
}
