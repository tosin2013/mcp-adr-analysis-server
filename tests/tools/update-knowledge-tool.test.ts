/**
 * Tests for Update Knowledge Tool
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { updateKnowledge, type UpdateKnowledgeArgs } from '../../src/tools/update-knowledge-tool.js';
import { KnowledgeGraphManager } from '../../src/utils/knowledge-graph-manager.js';
import type { KnowledgeGraphSnapshot } from '../../src/types/knowledge-graph-schemas.js';
import { createNoOpContext } from '../../src/types/tool-context.js';

describe('Update Knowledge Tool', () => {
  let mockKgManager: KnowledgeGraphManager;
  let mockSnapshot: KnowledgeGraphSnapshot;
  let ctx: ReturnType<typeof createNoOpContext>;

  beforeEach(() => {
    ctx = createNoOpContext();
    
    // Create mock knowledge graph snapshot
    mockSnapshot = {
      version: '1.0.0',
      timestamp: '2025-12-16T13:00:00.000Z',
      intents: [
        {
          intentId: 'intent-1',
          humanRequest: 'Test intent',
          parsedGoals: ['Goal 1'],
          priority: 'medium' as const,
          timestamp: '2025-12-16T12:00:00.000Z',
          toolChain: [
            {
              toolName: 'test_tool',
              parameters: {},
              result: {},
              todoTasksCreated: [],
              todoTasksModified: [],
              executionTime: '2025-12-16T12:05:00.000Z',
              success: true,
            },
          ],
          currentStatus: 'completed' as const,
          todoMdSnapshot: '',
        },
      ],
      todoSyncState: {
        lastSyncTimestamp: '2025-12-16T13:00:00.000Z',
        todoMdHash: 'abc123',
        knowledgeGraphHash: 'def456',
        syncStatus: 'synced' as const,
        lastModifiedBy: 'tool' as const,
        version: 1,
      },
      analytics: {
        totalIntents: 1,
        completedIntents: 1,
        activeIntents: 0,
        averageGoalCompletion: 1,
        mostUsedTools: [],
        successfulPatterns: [],
      },
    };

    // Create mock KnowledgeGraphManager
    mockKgManager = {
      loadKnowledgeGraph: jest.fn().mockResolvedValue(mockSnapshot),
      saveKnowledgeGraph: jest.fn().mockResolvedValue(undefined),
      createIntent: jest.fn().mockResolvedValue('new-intent-id'),
    } as any;
  });

  describe('add_entity operation', () => {
    it('should add a new intent entity', async () => {
      const args: UpdateKnowledgeArgs = {
        operation: 'add_entity',
        entity: 'intent-2',
        entityType: 'intent',
        metadata: {
          title: 'New feature',
          goals: ['Goal 1', 'Goal 2'],
          priority: 'high',
        },
      };

      const result = await updateKnowledge(args, ctx, mockKgManager);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      
      const response = JSON.parse(result.content[0].text as string);
      expect(response.success).toBe(true);
      expect(response.message).toContain('Successfully executed add_entity');
      expect(response.graphState).toBeDefined();
      expect(response.graphState.intentCount).toBeGreaterThan(0);
      
      // Should have called createIntent
      expect(mockKgManager.createIntent).toHaveBeenCalledWith(
        'New feature',
        ['Goal 1', 'Goal 2'],
        'high'
      );
    });

    it('should not add duplicate entity', async () => {
      const args: UpdateKnowledgeArgs = {
        operation: 'add_entity',
        entity: 'intent-1', // Already exists
        entityType: 'intent',
      };

      const result = await updateKnowledge(args, ctx, mockKgManager);

      const response = JSON.parse(result.content[0].text as string);
      expect(response.success).toBe(false);
      expect(response.message).toContain('already exists');
    });

    it('should require entity and entityType parameters', async () => {
      const args: UpdateKnowledgeArgs = {
        operation: 'add_entity',
        // Missing entity and entityType
      };

      const result = await updateKnowledge(args, ctx, mockKgManager);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text as string);
      expect(response.success).toBe(false);
      expect(response.error).toContain('requires entity and entityType');
    });
  });

  describe('remove_entity operation', () => {
    it('should remove an existing entity', async () => {
      const args: UpdateKnowledgeArgs = {
        operation: 'remove_entity',
        entity: 'intent-1',
      };

      const result = await updateKnowledge(args, ctx, mockKgManager);

      const response = JSON.parse(result.content[0].text as string);
      expect(response.success).toBe(true);
      expect(response.message).toContain('Successfully executed remove_entity');
      
      // Should have saved the updated graph
      expect(mockKgManager.saveKnowledgeGraph).toHaveBeenCalled();
    });

    it('should fail when entity not found', async () => {
      const args: UpdateKnowledgeArgs = {
        operation: 'remove_entity',
        entity: 'non-existent-intent',
      };

      const result = await updateKnowledge(args, ctx, mockKgManager);

      const response = JSON.parse(result.content[0].text as string);
      expect(response.success).toBe(false);
      expect(response.message).toContain('not found');
    });

    it('should require entity parameter', async () => {
      const args: UpdateKnowledgeArgs = {
        operation: 'remove_entity',
        // Missing entity
      };

      const result = await updateKnowledge(args, ctx, mockKgManager);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text as string);
      expect(response.success).toBe(false);
      expect(response.error).toContain('requires entity parameter');
    });
  });

  describe('add_relationship operation', () => {
    it('should add a relationship between entities', async () => {
      const args: UpdateKnowledgeArgs = {
        operation: 'add_relationship',
        relationship: 'implements',
        source: 'adr-001',
        target: 'src/api.ts',
      };

      const result = await updateKnowledge(args, ctx, mockKgManager);

      const response = JSON.parse(result.content[0].text as string);
      expect(response.success).toBe(true);
      expect(response.message).toContain('Successfully executed add_relationship');
      expect(response.modified).toBe(true);
    });

    it('should require relationship, source, and target parameters', async () => {
      const args: UpdateKnowledgeArgs = {
        operation: 'add_relationship',
        relationship: 'implements',
        // Missing source and target
      };

      const result = await updateKnowledge(args, ctx, mockKgManager);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text as string);
      expect(response.success).toBe(false);
      expect(response.error).toContain('requires relationship, source, and target');
    });
  });

  describe('remove_relationship operation', () => {
    it('should remove a relationship between entities', async () => {
      const args: UpdateKnowledgeArgs = {
        operation: 'remove_relationship',
        relationship: 'implements',
        source: 'adr-001',
        target: 'src/api.ts',
      };

      const result = await updateKnowledge(args, ctx, mockKgManager);

      const response = JSON.parse(result.content[0].text as string);
      expect(response.success).toBe(true);
      expect(response.message).toContain('Successfully executed remove_relationship');
      expect(response.modified).toBe(true);
    });

    it('should require relationship, source, and target parameters', async () => {
      const args: UpdateKnowledgeArgs = {
        operation: 'remove_relationship',
        // Missing all required parameters
      };

      const result = await updateKnowledge(args, ctx, mockKgManager);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text as string);
      expect(response.success).toBe(false);
      expect(response.error).toContain('requires relationship, source, and target');
    });
  });

  describe('validation', () => {
    it('should reject invalid operation', async () => {
      const args: UpdateKnowledgeArgs = {
        operation: 'invalid_operation' as any,
      };

      const result = await updateKnowledge(args, ctx, mockKgManager);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text as string);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Invalid operation');
    });
  });

  describe('graph summary', () => {
    it('should return graph summary with counts', async () => {
      const args: UpdateKnowledgeArgs = {
        operation: 'add_entity',
        entity: 'intent-2',
        entityType: 'intent',
        metadata: { title: 'Test' },
      };

      const result = await updateKnowledge(args, ctx, mockKgManager);

      const response = JSON.parse(result.content[0].text as string);
      expect(response.graphState).toBeDefined();
      expect(response.graphState.nodeCount).toBeDefined();
      expect(response.graphState.edgeCount).toBeDefined();
      expect(response.graphState.intentCount).toBeDefined();
      expect(response.graphState.adrCount).toBeDefined();
      expect(response.graphState.lastUpdated).toBeDefined();
    });
  });
});
