/**
 * Tests for Knowledge Graph Resource
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { URLSearchParams } from 'url';
import { generateKnowledgeGraphResource, type KnowledgeGraphData } from '../../src/resources/knowledge-graph-resource.js';
import { KnowledgeGraphManager } from '../../src/utils/knowledge-graph-manager.js';
import type { KnowledgeGraphSnapshot } from '../../src/types/knowledge-graph-schemas.js';

describe('Knowledge Graph Resource', () => {
  let mockKgManager: KnowledgeGraphManager;
  let mockSnapshot: KnowledgeGraphSnapshot;

  beforeEach(() => {
    // Create mock knowledge graph snapshot
    mockSnapshot = {
      version: '1.0.0',
      timestamp: '2025-12-16T13:00:00.000Z',
      intents: [
        {
          intentId: 'intent-1',
          humanRequest: 'Add authentication',
          parsedGoals: ['Implement OAuth', 'Add JWT'],
          priority: 'high' as const,
          timestamp: '2025-12-16T12:00:00.000Z',
          toolChain: [
            {
              toolName: 'analyze_project_ecosystem',
              parameters: { projectPath: '/test' },
              result: { success: true },
              todoTasksCreated: [],
              todoTasksModified: [],
              executionTime: '2025-12-16T12:05:00.000Z',
              success: true,
            },
          ],
          currentStatus: 'executing' as const,
          todoMdSnapshot: '',
        },
        {
          intentId: 'intent-2',
          humanRequest: 'Add database schema',
          parsedGoals: ['Design schema', 'Add migrations'],
          priority: 'medium' as const,
          timestamp: '2025-12-15T10:00:00.000Z',
          toolChain: [],
          currentStatus: 'completed' as const,
          todoMdSnapshot: '',
          adrsCreated: ['001', '002'] as any,
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
        totalIntents: 2,
        completedIntents: 1,
        activeIntents: 1,
        averageGoalCompletion: 0.5,
        mostUsedTools: [
          { toolName: 'analyze_project_ecosystem', usageCount: 1 },
        ],
        successfulPatterns: [],
      },
    };

    // Create mock KnowledgeGraphManager
    mockKgManager = {
      loadKnowledgeGraph: jest.fn().mockResolvedValue(mockSnapshot),
    } as any;
  });

  describe('generateKnowledgeGraphResource', () => {
    it('should generate knowledge graph resource with nodes and edges', async () => {
      const result = await generateKnowledgeGraphResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      expect(result).toBeDefined();
      expect(result.contentType).toBe('application/json');
      expect(result.data).toBeDefined();

      const data = result.data as KnowledgeGraphData;
      
      // Should have intent nodes
      const intentNodes = data.nodes.filter(n => n.type === 'intent');
      expect(intentNodes).toHaveLength(2);
      expect(intentNodes[0].id).toBe('intent-1');
      expect(intentNodes[0].name).toBe('Add authentication');
      expect(intentNodes[0].status).toBe('executing');

      // Should have tool nodes
      const toolNodes = data.nodes.filter(n => n.type === 'tool');
      expect(toolNodes.length).toBeGreaterThan(0);
      expect(toolNodes[0].name).toBe('analyze_project_ecosystem');

      // Should have ADR nodes
      const adrNodes = data.nodes.filter(n => n.type === 'adr');
      expect(adrNodes).toHaveLength(2);
      expect(adrNodes[0].id).toBe('adr-001');
      expect(adrNodes[1].id).toBe('adr-002');

      // Should have edges for tool usage
      const toolEdges = data.edges.filter(e => e.relationship === 'uses');
      expect(toolEdges.length).toBeGreaterThan(0);
      expect(toolEdges[0].source).toBe('intent-1');
      expect(toolEdges[0].target).toBe('tool-analyze_project_ecosystem');

      // Should have edges for ADR creation
      const adrEdges = data.edges.filter(e => e.relationship === 'created');
      expect(adrEdges).toHaveLength(2);
      expect(adrEdges[0].source).toBe('intent-2');
      expect(adrEdges[0].target).toBe('adr-001');
    });

    it('should include metadata with node and edge counts', async () => {
      const result = await generateKnowledgeGraphResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      const data = result.data as KnowledgeGraphData;
      
      expect(data.metadata).toBeDefined();
      expect(data.metadata.nodeCount).toBeGreaterThan(0);
      expect(data.metadata.edgeCount).toBeGreaterThan(0);
      expect(data.metadata.intentCount).toBe(2);
      expect(data.metadata.adrCount).toBe(2);
      expect(data.metadata.toolCount).toBeGreaterThan(0);
      expect(data.metadata.version).toBe('1.0.0');
      expect(data.metadata.lastUpdated).toBeDefined();
    });

    it('should include analytics data', async () => {
      const result = await generateKnowledgeGraphResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      const data = result.data as KnowledgeGraphData;
      
      expect(data.analytics).toBeDefined();
      expect(data.analytics.totalIntents).toBe(2);
      expect(data.analytics.completedIntents).toBe(1);
      expect(data.analytics.activeIntents).toBe(1);
      expect(data.analytics.averageGoalCompletion).toBe(0.5);
      expect(data.analytics.mostUsedTools).toHaveLength(1);
      expect(data.analytics.mostUsedTools[0].toolName).toBe('analyze_project_ecosystem');
    });

    it('should have cache metadata', async () => {
      const result = await generateKnowledgeGraphResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      expect(result.cacheKey).toBe('knowledge-graph');
      expect(result.ttl).toBe(60);
      expect(result.etag).toBeDefined();
      expect(result.lastModified).toBeDefined();
    });

    it('should throw error when manager not provided', async () => {
      await expect(
        generateKnowledgeGraphResource({}, new URLSearchParams(), undefined)
      ).rejects.toThrow('Knowledge graph requires initialized knowledge graph manager');
    });

    it('should calculate relevance scores for intents', async () => {
      const result = await generateKnowledgeGraphResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      const data = result.data as KnowledgeGraphData;
      const intentNodes = data.nodes.filter(n => n.type === 'intent');
      
      // Executing intent should have higher relevance than completed
      const executingIntent = intentNodes.find(n => n.status === 'executing');
      const completedIntent = intentNodes.find(n => n.status === 'completed');
      
      expect(executingIntent?.relevanceScore).toBeDefined();
      expect(completedIntent?.relevanceScore).toBeDefined();
      expect(executingIntent!.relevanceScore!).toBeGreaterThan(
        completedIntent!.relevanceScore!
      );
    });

    it('should handle empty knowledge graph', async () => {
      const emptySnapshot: KnowledgeGraphSnapshot = {
        ...mockSnapshot,
        intents: [],
      };

      mockKgManager.loadKnowledgeGraph = jest.fn().mockResolvedValue(emptySnapshot);

      const result = await generateKnowledgeGraphResource(
        {},
        new URLSearchParams(),
        mockKgManager
      );

      const data = result.data as KnowledgeGraphData;
      
      expect(data.nodes).toHaveLength(0);
      expect(data.edges).toHaveLength(0);
      expect(data.metadata.nodeCount).toBe(0);
      expect(data.metadata.edgeCount).toBe(0);
      expect(data.metadata.intentCount).toBe(0);
    });
  });
});
