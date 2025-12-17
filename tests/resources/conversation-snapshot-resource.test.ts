/**
 * Unit tests for conversation-snapshot-resource.ts
 * Tests conversation snapshot generation, caching, and parameter handling
 */

import { URLSearchParams } from 'url';
import { describe, it, expect, beforeAll, _beforeEach, _afterEach, _jest } from 'vitest';

// Mock conditional-request (needed for generateETag)
vi.mock('../../src/utils/conditional-request.js', () => ({
  generateStrongETag: vi.fn((data: any) => `etag-${JSON.stringify(data).length}`),
}));

// Mock ResourceCache
const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();

vi.mock('../../src/resources/resource-cache.js', () => ({
  resourceCache: {
    get: mockCacheGet,
    set: mockCacheSet,
  },
  generateETag: (data: any) => `etag-${JSON.stringify(data).length}`,
  ResourceCache: vi.fn(),
}));

describe('Conversation Snapshot Resource', () => {
  let generateConversationSnapshotResource: any;
  let mockMemoryManager: any;

  beforeAll(async () => {
    const module = await import('../../src/resources/conversation-snapshot-resource.js');
    generateConversationSnapshotResource = module.generateConversationSnapshotResource;
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: no cache hit
    mockCacheGet.mockResolvedValue(null);

    // Mock memory manager with typical snapshot
    mockMemoryManager = {
      getContextSnapshot: vi.fn().mockResolvedValue({
        sessionId: 'session-123',
        recentTurns: [
          {
            turnNumber: 1,
            timestamp: '2025-12-16T04:00:00.000Z',
            request: { toolName: 'analyze_project_ecosystem' },
            response: { tokenCount: 1500, expandableId: 'exp-1' },
          },
          {
            turnNumber: 2,
            timestamp: '2025-12-16T04:05:00.000Z',
            request: { toolName: 'adr_suggestion' },
            response: { tokenCount: 2000 },
          },
        ],
        activeIntents: [
          {
            id: 'intent-1',
            intent: 'analyze-architecture',
            status: 'in-progress',
          },
        ],
        decisionsRecorded: [
          {
            adrId: '001',
            title: 'Use PostgreSQL',
            timestamp: '2025-12-16T04:10:00.000Z',
          },
        ],
        conversationFocus: {
          topic: 'Database architecture',
          phase: 'Decision making',
          nextSteps: ['Review options', 'Make decision'],
        },
      }),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Resource Generation', () => {
    it('should generate conversation snapshot with default parameters', async () => {
      const result = await generateConversationSnapshotResource(
        {},
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.snapshot).toBeDefined();
      expect(result.data.snapshot.sessionId).toBe('session-123');
      expect(result.data.recentTurnCount).toBe(5);
      expect(result.contentType).toBe('application/json');
    });

    it('should include timestamp in response', async () => {
      const result = await generateConversationSnapshotResource(
        {},
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result.data.timestamp).toBeDefined();
      expect(new Date(result.data.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should call memory manager getContextSnapshot with default turn count', async () => {
      await generateConversationSnapshotResource({}, new URLSearchParams(), mockMemoryManager);

      expect(mockMemoryManager.getContextSnapshot).toHaveBeenCalledWith(5);
    });

    it('should include all snapshot components', async () => {
      const result = await generateConversationSnapshotResource(
        {},
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result.data.snapshot.recentTurns).toHaveLength(2);
      expect(result.data.snapshot.activeIntents).toHaveLength(1);
      expect(result.data.snapshot.decisionsRecorded).toHaveLength(1);
      expect(result.data.snapshot.conversationFocus).toBeDefined();
    });
  });

  describe('Query Parameter Handling', () => {
    it('should respect recentTurnCount parameter', async () => {
      const result = await generateConversationSnapshotResource(
        {},
        new URLSearchParams('recentTurnCount=10'),
        mockMemoryManager
      );

      expect(result.data.recentTurnCount).toBe(10);
      expect(mockMemoryManager.getContextSnapshot).toHaveBeenCalledWith(10);
    });

    it('should handle custom recentTurnCount values', async () => {
      await generateConversationSnapshotResource(
        {},
        new URLSearchParams('recentTurnCount=3'),
        mockMemoryManager
      );

      expect(mockMemoryManager.getContextSnapshot).toHaveBeenCalledWith(3);
    });

    it('should use default when recentTurnCount is invalid', async () => {
      const _result = await generateConversationSnapshotResource(
        {},
        new URLSearchParams('recentTurnCount=invalid'),
        mockMemoryManager
      );

      // parseInt('invalid') returns NaN
      expect(mockMemoryManager.getContextSnapshot).toHaveBeenCalled();
    });
  });

  describe('Snapshot Content Validation', () => {
    it('should include recent turns with correct structure', async () => {
      const result = await generateConversationSnapshotResource(
        {},
        new URLSearchParams(),
        mockMemoryManager
      );

      const turn = result.data.snapshot.recentTurns[0];
      expect(turn).toHaveProperty('turnNumber');
      expect(turn).toHaveProperty('timestamp');
      expect(turn).toHaveProperty('request');
      expect(turn).toHaveProperty('response');
    });

    it('should include active intents with correct structure', async () => {
      const result = await generateConversationSnapshotResource(
        {},
        new URLSearchParams(),
        mockMemoryManager
      );

      const intent = result.data.snapshot.activeIntents[0];
      expect(intent).toHaveProperty('id');
      expect(intent).toHaveProperty('intent');
      expect(intent).toHaveProperty('status');
    });

    it('should include decisions with correct structure', async () => {
      const result = await generateConversationSnapshotResource(
        {},
        new URLSearchParams(),
        mockMemoryManager
      );

      const decision = result.data.snapshot.decisionsRecorded[0];
      expect(decision).toHaveProperty('adrId');
      expect(decision).toHaveProperty('title');
      expect(decision).toHaveProperty('timestamp');
    });

    it('should include conversation focus when present', async () => {
      const result = await generateConversationSnapshotResource(
        {},
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result.data.snapshot.conversationFocus).toBeDefined();
      expect(result.data.snapshot.conversationFocus?.topic).toBe('Database architecture');
      expect(result.data.snapshot.conversationFocus?.phase).toBe('Decision making');
      expect(result.data.snapshot.conversationFocus?.nextSteps).toHaveLength(2);
    });
  });

  describe('No Active Session Handling', () => {
    it('should handle null snapshot when no active session', async () => {
      mockMemoryManager.getContextSnapshot.mockResolvedValue(null);

      const result = await generateConversationSnapshotResource(
        {},
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result.data.snapshot).toBeNull();
      expect(result.data.timestamp).toBeDefined();
    });

    it('should handle empty recent turns', async () => {
      mockMemoryManager.getContextSnapshot.mockResolvedValue({
        sessionId: 'session-empty',
        recentTurns: [],
        activeIntents: [],
        decisionsRecorded: [],
      });

      const result = await generateConversationSnapshotResource(
        {},
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result.data.snapshot.recentTurns).toHaveLength(0);
      expect(result.data.snapshot.activeIntents).toHaveLength(0);
      expect(result.data.snapshot.decisionsRecorded).toHaveLength(0);
    });
  });

  describe('Caching', () => {
    it('should return cached result when available', async () => {
      const cachedResult = {
        data: {
          snapshot: {
            sessionId: 'cached-session',
            recentTurns: [],
            activeIntents: [],
            decisionsRecorded: [],
          },
          timestamp: new Date().toISOString(),
          recentTurnCount: 5,
        },
        contentType: 'application/json',
        cacheKey: 'conversation-snapshot',
      };

      mockCacheGet.mockResolvedValue(cachedResult);

      const result = await generateConversationSnapshotResource(
        {},
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result).toBe(cachedResult);
      expect(mockMemoryManager.getContextSnapshot).not.toHaveBeenCalled();
    });

    it('should cache result after generation', async () => {
      await generateConversationSnapshotResource({}, new URLSearchParams(), mockMemoryManager);

      expect(mockCacheSet).toHaveBeenCalledWith(
        'conversation-snapshot',
        expect.objectContaining({
          data: expect.any(Object),
          contentType: 'application/json',
          cacheKey: 'conversation-snapshot',
          ttl: 10,
        }),
        10
      );
    });

    it('should use very short TTL for rapidly changing data', async () => {
      const result = await generateConversationSnapshotResource(
        {},
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result.ttl).toBe(10); // 10 seconds
    });
  });

  describe('Error Handling', () => {
    it('should throw error when memory manager is not provided', async () => {
      await expect(generateConversationSnapshotResource({}, new URLSearchParams())).rejects.toThrow(
        'Conversation snapshot requires initialized memory manager'
      );
    });

    it('should throw error when getContextSnapshot fails', async () => {
      mockMemoryManager.getContextSnapshot.mockRejectedValue(
        new Error('Snapshot retrieval failed')
      );

      await expect(
        generateConversationSnapshotResource({}, new URLSearchParams(), mockMemoryManager)
      ).rejects.toThrow('Failed to generate conversation snapshot');
    });
  });

  describe('Response Structure', () => {
    it('should return properly structured ResourceGenerationResult', async () => {
      const result = await generateConversationSnapshotResource(
        {},
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result).toMatchObject({
        data: expect.objectContaining({
          snapshot: expect.any(Object),
          timestamp: expect.any(String),
          recentTurnCount: expect.any(Number),
        }),
        contentType: 'application/json',
        lastModified: expect.any(String),
        cacheKey: 'conversation-snapshot',
        ttl: 10,
        etag: expect.any(String),
      });
    });

    it('should generate valid etag', async () => {
      const result = await generateConversationSnapshotResource(
        {},
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result.etag).toBeDefined();
      expect(typeof result.etag).toBe('string');
      expect(result.etag.length).toBeGreaterThan(0);
    });

    it('should handle snapshot with optional conversationFocus', async () => {
      mockMemoryManager.getContextSnapshot.mockResolvedValue({
        sessionId: 'session-minimal',
        recentTurns: [],
        activeIntents: [],
        decisionsRecorded: [],
        // No conversationFocus
      });

      const result = await generateConversationSnapshotResource(
        {},
        new URLSearchParams(),
        mockMemoryManager
      );

      expect(result.data.snapshot.conversationFocus).toBeUndefined();
    });
  });
});
