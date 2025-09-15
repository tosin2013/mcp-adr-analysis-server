/**
 * Unit Tests for Memory Loading Tool
 *
 * Test coverage for the MCP tool that loads and manages memory entities
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MemoryLoadingTool } from '../../src/tools/memory-loading-tool.js';
import { MemoryEntityManager } from '../../src/utils/memory-entity-manager.js';
import { MemoryTransformer } from '../../src/utils/memory-transformation.js';
import { DiscoveredAdr } from '../../src/utils/adr-discovery.js';
import {
  MemoryEntity,
  MemoryRelationship,
  ArchitecturalDecisionMemory,
  MemoryIntelligence,
  MemorySnapshot,
} from '../../src/types/memory-entities.js';

// Mock dependencies
jest.mock('../../src/utils/memory-entity-manager.js');
jest.mock('../../src/utils/memory-transformation.js');
jest.mock('../../src/utils/adr-discovery.js');
jest.mock('../../src/utils/config.js');
jest.mock('../../src/utils/enhanced-logging.js');

// Mock config
jest.mock('../../src/utils/config.js', () => ({
  loadConfig: jest.fn(() => ({
    projectPath: '/test/project',
    adrDirectory: '/test/project/docs/adrs',
  })),
}));

// Mock ADR discovery
const mockDiscoverAdrs = jest.fn();
jest.mock('../../src/utils/adr-discovery.js', () => ({
  discoverAdrsInDirectory: mockDiscoverAdrs,
}));

// Mock enhanced logging
jest.mock('../../src/utils/enhanced-logging.js', () => ({
  EnhancedLogger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

describe('MemoryLoadingTool', () => {
  let memoryLoadingTool: MemoryLoadingTool;
  let mockMemoryManager: jest.Mocked<MemoryEntityManager>;
  let mockMemoryTransformer: jest.Mocked<MemoryTransformer>;

  const mockEntity: ArchitecturalDecisionMemory = {
    id: 'entity-1',
    type: 'architectural_decision',
    created: '2024-01-01T00:00:00.000Z',
    lastModified: '2024-01-01T00:00:00.000Z',
    version: 1,
    confidence: 0.8,
    relevance: 0.7,
    title: 'Test ADR',
    description: 'Test description',
    tags: ['test'],
    relationships: [],
    context: {
      projectPhase: 'design',
      businessDomain: 'ecommerce',
      technicalStack: ['react'],
      environmentalFactors: [],
      stakeholders: [],
    },
    accessPattern: {
      lastAccessed: '2024-01-01T00:00:00.000Z',
      accessCount: 1,
      accessContext: [],
    },
    evolution: {
      origin: 'created',
      transformations: [],
    },
    validation: {
      isVerified: false,
    },
    decisionData: {
      status: 'accepted',
      context: 'Test context',
      decision: 'Test decision',
      consequences: { positive: [], negative: [], risks: [] },
      alternatives: [],
      implementationStatus: 'not_started',
      implementationTasks: [],
      reviewHistory: [],
    },
  };

  const mockRelationship: MemoryRelationship = {
    id: 'rel-1',
    sourceId: 'entity-1',
    targetId: 'entity-2',
    type: 'relates_to',
    strength: 0.7,
    context: 'Test relationship',
    evidence: [],
    created: '2024-01-01T00:00:00.000Z',
    lastValidated: '2024-01-01T00:00:00.000Z',
    confidence: 0.8,
  };

  const mockIntelligence: MemoryIntelligence = {
    contextAwareness: {
      currentContext: { lastEvent: 'test' },
      contextHistory: [],
    },
    patternRecognition: {
      discoveredPatterns: [
        {
          pattern: 'test-pattern',
          confidence: 0.8,
          frequency: 5,
          contexts: ['test'],
          applicabilityScore: 0.7,
        },
      ],
      patternConfidence: { 'test-pattern': 0.8 },
      emergentBehaviors: [],
    },
    relationshipInference: {
      suggestedRelationships: [],
      weakConnections: [],
      conflictDetection: [],
    },
    adaptiveRecommendations: {
      nextActions: [
        {
          action: 'Test action',
          priority: 1,
          reasoning: 'Test reasoning',
          requiredEntities: ['entity-1'],
        },
      ],
      knowledgeGaps: ['Test gap'],
      optimizationOpportunities: ['Test optimization'],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock memory manager
    mockMemoryManager = {
      initialize: jest.fn().mockResolvedValue(undefined),
      upsertEntity: jest.fn().mockResolvedValue(mockEntity),
      upsertRelationship: jest.fn().mockResolvedValue(mockRelationship),
      getEntity: jest.fn().mockResolvedValue(mockEntity),
      deleteEntity: jest.fn().mockResolvedValue(true),
      queryEntities: jest.fn().mockResolvedValue({
        entities: [mockEntity],
        relationships: [mockRelationship],
        totalCount: 1,
        queryTime: 10,
        aggregations: {
          byType: { architectural_decision: 1 },
          byTag: { test: 1 },
          byConfidence: { '0.8-0.9': 1 },
        },
      }),
      findRelatedEntities: jest.fn().mockResolvedValue({
        entities: [mockEntity],
        relationshipPaths: [
          {
            path: ['entity-1', 'entity-2'],
            relationships: [mockRelationship],
            depth: 1,
          },
        ],
      }),
      getIntelligence: jest.fn().mockResolvedValue(mockIntelligence),
      createSnapshot: jest.fn().mockResolvedValue({
        id: 'snapshot-1',
        timestamp: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
        entities: [mockEntity],
        relationships: [mockRelationship],
        intelligence: mockIntelligence,
        metadata: {
          totalEntities: 1,
          totalRelationships: 1,
          averageConfidence: 0.8,
          lastOptimization: '2024-01-01T00:00:00.000Z',
        },
      } as MemorySnapshot),
    } as any;

    // Setup mock memory transformer
    mockMemoryTransformer = {
      transformAdrToMemory: jest.fn().mockResolvedValue(mockEntity),
      transformAdrCollectionToMemories: jest.fn().mockResolvedValue({
        entities: [mockEntity],
        relationships: [mockRelationship],
      }),
      createKnowledgeArtifact: jest.fn(),
      transformCodeStructureToMemories: jest.fn(),
    } as any;

    // Mock the constructors
    (MemoryEntityManager as jest.MockedClass<typeof MemoryEntityManager>).mockImplementation(
      () => mockMemoryManager
    );
    (MemoryTransformer as jest.MockedClass<typeof MemoryTransformer>).mockImplementation(
      () => mockMemoryTransformer
    );

    memoryLoadingTool = new MemoryLoadingTool();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(memoryLoadingTool.initialize()).resolves.not.toThrow();
      expect(mockMemoryManager.initialize).toHaveBeenCalled();
    });
  });

  describe('load_adrs action', () => {
    it('should load ADRs into memory successfully', async () => {
      const mockAdrDiscovery = {
        totalAdrs: 2,
        adrs: [
          {
            filename: 'adr-001.md',
            number: 1,
            title: 'ADR 1',
            status: 'accepted',
          },
          {
            filename: 'adr-002.md',
            number: 2,
            title: 'ADR 2',
            status: 'proposed',
          },
        ] as DiscoveredAdr[],
        summary: {
          byStatus: { accepted: 1, proposed: 1 },
          byCategory: { architecture: 2 },
        },
        recommendations: [],
      };

      mockDiscoverAdrs.mockResolvedValue(mockAdrDiscovery);

      const result = await memoryLoadingTool.execute({
        action: 'load_adrs',
        forceReload: true,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.summary.totalAdrs).toBe(2);
      expect(response.summary.entitiesCreated).toBe(1);
      expect(response.summary.relationshipsInferred).toBe(1);

      expect(mockDiscoverAdrs).toHaveBeenCalledWith(
        '/test/project/docs/adrs',
        true,
        '/test/project'
      );
      expect(mockMemoryTransformer.transformAdrCollectionToMemories).toHaveBeenCalledWith(
        mockAdrDiscovery.adrs
      );
      expect(mockMemoryManager.upsertEntity).toHaveBeenCalled();
      expect(mockMemoryManager.upsertRelationship).toHaveBeenCalled();
    });

    it('should handle case when no ADRs are found', async () => {
      const mockAdrDiscovery = {
        totalAdrs: 0,
        adrs: [],
        summary: { byStatus: {}, byCategory: {} },
        recommendations: ['Create your first ADR'],
      };

      mockDiscoverAdrs.mockResolvedValue(mockAdrDiscovery);

      const result = await memoryLoadingTool.execute({
        action: 'load_adrs',
      });

      expect(result.isError).toBeFalsy();
      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('no_adrs_found');
      expect(response.recommendations).toEqual(['Create your first ADR']);
    });

    it('should handle ADR loading errors', async () => {
      mockDiscoverAdrs.mockRejectedValue(new Error('Discovery failed'));

      const result = await memoryLoadingTool.execute({
        action: 'load_adrs',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Memory loading failed');
    });
  });

  describe('query_entities action', () => {
    it('should query entities with default parameters', async () => {
      const result = await memoryLoadingTool.execute({
        action: 'query_entities',
      });

      expect(result.isError).toBeFalsy();
      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.entities).toHaveLength(1);
      expect(response.query.totalResults).toBe(1);

      expect(mockMemoryManager.queryEntities).toHaveBeenCalledWith({});
    });

    it('should query entities with filters', async () => {
      const queryParams = {
        entityTypes: ['architectural_decision'],
        tags: ['test'],
        textQuery: 'react',
        confidenceThreshold: 0.7,
        contextFilters: {
          businessDomain: 'ecommerce',
        },
        limit: 5,
        sortBy: 'confidence' as const,
        includeRelated: true,
      };

      const result = await memoryLoadingTool.execute({
        action: 'query_entities',
        query: queryParams,
      });

      expect(result.isError).toBeFalsy();
      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.relationships).toHaveLength(1); // includeRelated = true

      expect(mockMemoryManager.queryEntities).toHaveBeenCalledWith(
        expect.objectContaining({
          entityTypes: ['architectural_decision'],
          tags: ['test'],
          textQuery: 'react',
          confidenceThreshold: 0.7,
          contextFilters: { businessDomain: 'ecommerce' },
          limit: 5,
          sortBy: 'confidence',
          includeRelated: true,
        })
      );
    });

    it('should include intelligence insights in query results', async () => {
      const result = await memoryLoadingTool.execute({
        action: 'query_entities',
      });

      expect(result.isError).toBeFalsy();
      const response = JSON.parse(result.content[0].text);
      expect(response.intelligence.patterns).toBeDefined();
      expect(response.intelligence.recommendations).toBeDefined();
    });

    it('should handle query errors', async () => {
      mockMemoryManager.queryEntities.mockRejectedValue(new Error('Query failed'));

      const result = await memoryLoadingTool.execute({
        action: 'query_entities',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Memory loading failed');
    });
  });

  describe('get_entity action', () => {
    it('should get entity by ID successfully', async () => {
      const result = await memoryLoadingTool.execute({
        action: 'get_entity',
        entityId: 'entity-1',
      });

      expect(result.isError).toBeFalsy();
      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.entity.id).toBe('entity-1');
      expect(response.relatedEntities).toHaveLength(1);

      expect(mockMemoryManager.getEntity).toHaveBeenCalledWith('entity-1');
      expect(mockMemoryManager.findRelatedEntities).toHaveBeenCalledWith('entity-1', 2);
    });

    it('should handle entity not found', async () => {
      mockMemoryManager.getEntity.mockResolvedValue(null);

      const result = await memoryLoadingTool.execute({
        action: 'get_entity',
        entityId: 'non-existent',
      });

      expect(result.isError).toBeFalsy();
      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('not_found');
      expect(response.entityId).toBe('non-existent');
    });

    it('should require entityId parameter', async () => {
      const result = await memoryLoadingTool.execute({
        action: 'get_entity',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('entityId required');
    });

    it('should include intelligence suggestions for the entity', async () => {
      const result = await memoryLoadingTool.execute({
        action: 'get_entity',
        entityId: 'entity-1',
      });

      expect(result.isError).toBeFalsy();
      const response = JSON.parse(result.content[0].text);
      expect(response.intelligence.suggestedActions).toBeDefined();
    });
  });

  describe('find_related action', () => {
    it('should find related entities successfully', async () => {
      const result = await memoryLoadingTool.execute({
        action: 'find_related',
        entityId: 'entity-1',
        maxDepth: 3,
      });

      expect(result.isError).toBeFalsy();
      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.sourceEntityId).toBe('entity-1');
      expect(response.maxDepth).toBe(3);
      expect(response.relatedEntities).toHaveLength(1);
      expect(response.statistics.totalRelatedEntities).toBe(1);

      expect(mockMemoryManager.findRelatedEntities).toHaveBeenCalledWith('entity-1', 3);
    });

    it('should use default maxDepth', async () => {
      const result = await memoryLoadingTool.execute({
        action: 'find_related',
        entityId: 'entity-1',
      });

      expect(result.isError).toBeFalsy();
      expect(mockMemoryManager.findRelatedEntities).toHaveBeenCalledWith('entity-1', 2);
    });

    it('should require entityId parameter', async () => {
      const result = await memoryLoadingTool.execute({
        action: 'find_related',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('entityId required');
    });

    it('should include relationship statistics', async () => {
      const result = await memoryLoadingTool.execute({
        action: 'find_related',
        entityId: 'entity-1',
      });

      expect(result.isError).toBeFalsy();
      const response = JSON.parse(result.content[0].text);
      expect(response.statistics.pathDistribution).toBeDefined();
      expect(response.statistics.relationshipTypes).toBeDefined();
    });
  });

  describe('get_intelligence action', () => {
    it('should get memory intelligence successfully', async () => {
      const result = await memoryLoadingTool.execute({
        action: 'get_intelligence',
      });

      expect(result.isError).toBeFalsy();
      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.intelligence.contextAwareness).toBeDefined();
      expect(response.intelligence.patternRecognition).toBeDefined();
      expect(response.intelligence.relationshipInference).toBeDefined();
      expect(response.intelligence.adaptiveRecommendations).toBeDefined();

      expect(mockMemoryManager.getIntelligence).toHaveBeenCalled();
    });

    it('should handle intelligence retrieval errors', async () => {
      mockMemoryManager.getIntelligence.mockRejectedValue(new Error('Intelligence failed'));

      const result = await memoryLoadingTool.execute({
        action: 'get_intelligence',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Memory loading failed');
    });
  });

  describe('create_snapshot action', () => {
    it('should create memory snapshot successfully', async () => {
      const result = await memoryLoadingTool.execute({
        action: 'create_snapshot',
      });

      expect(result.isError).toBeFalsy();
      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(response.snapshot.id).toBe('snapshot-1');
      expect(response.snapshot.metadata.totalEntities).toBe(1);
      expect(response.snapshot.entitySummary.totalEntities).toBe(1);
      expect(response.snapshot.relationshipSummary.totalRelationships).toBe(1);

      expect(mockMemoryManager.createSnapshot).toHaveBeenCalled();
    });

    it('should include intelligence summary in snapshot', async () => {
      const result = await memoryLoadingTool.execute({
        action: 'create_snapshot',
      });

      expect(result.isError).toBeFalsy();
      const response = JSON.parse(result.content[0].text);
      expect(response.snapshot.intelligenceSummary.discoveredPatterns).toBe(1);
      expect(response.snapshot.intelligenceSummary.nextActions).toBe(1);
    });

    it('should handle snapshot creation errors', async () => {
      mockMemoryManager.createSnapshot.mockRejectedValue(new Error('Snapshot failed'));

      const result = await memoryLoadingTool.execute({
        action: 'create_snapshot',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Memory loading failed');
    });
  });

  describe('error handling', () => {
    it('should handle unknown action', async () => {
      const result = await memoryLoadingTool.execute({
        action: 'unknown_action' as any,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown action');
    });

    it('should handle initialization errors', async () => {
      mockMemoryManager.initialize.mockRejectedValue(new Error('Init failed'));

      const result = await memoryLoadingTool.execute({
        action: 'query_entities',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Memory loading failed');
    });

    it('should provide detailed error information', async () => {
      const testError = new Error('Specific test error');
      mockMemoryManager.queryEntities.mockRejectedValue(testError);

      const result = await memoryLoadingTool.execute({
        action: 'query_entities',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Specific test error');
    });
  });

  describe('data transformation and formatting', () => {
    it('should truncate long descriptions in query results', async () => {
      const longDescEntity = {
        ...mockEntity,
        description: 'A'.repeat(250), // Long description
      };

      mockMemoryManager.queryEntities.mockResolvedValue({
        entities: [longDescEntity],
        relationships: [],
        totalCount: 1,
        queryTime: 10,
        aggregations: { byType: {}, byTag: {}, byConfidence: {} },
      });

      const result = await memoryLoadingTool.execute({
        action: 'query_entities',
      });

      expect(result.isError).toBeFalsy();
      const response = JSON.parse(result.content[0].text);
      expect(response.entities[0].description).toHaveLength(200); // 197 + '...'
      expect(response.entities[0].description).toEndWith('...');
    });

    it('should include type-specific data in query results', async () => {
      const result = await memoryLoadingTool.execute({
        action: 'query_entities',
      });

      expect(result.isError).toBeFalsy();
      const response = JSON.parse(result.content[0].text);
      expect(response.entities[0].adrStatus).toBe('accepted');
      expect(response.entities[0].implementationStatus).toBe('not_started');
    });

    it('should format relationship paths correctly', async () => {
      const result = await memoryLoadingTool.execute({
        action: 'find_related',
        entityId: 'entity-1',
      });

      expect(result.isError).toBeFalsy();
      const response = JSON.parse(result.content[0].text);
      expect(response.relationshipPaths[0].pathLength).toBe(2);
      expect(response.relationshipPaths[0].entities).toEqual(['entity-1', 'entity-2']);
      expect(response.relationshipPaths[0].relationshipChain[0].type).toBe('relates_to');
    });
  });

  describe('default action handling', () => {
    it('should default to query_entities when no action specified', async () => {
      const result = await memoryLoadingTool.execute({});

      expect(result.isError).toBeFalsy();
      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('success');
      expect(mockMemoryManager.queryEntities).toHaveBeenCalled();
    });
  });

  describe('integration with memory system', () => {
    it('should properly initialize memory manager before operations', async () => {
      await memoryLoadingTool.execute({
        action: 'query_entities',
      });

      expect(mockMemoryManager.initialize).toHaveBeenCalled();
    });

    it('should handle concurrent operations', async () => {
      // Simulate multiple concurrent operations
      const operations = [
        memoryLoadingTool.execute({ action: 'query_entities' }),
        memoryLoadingTool.execute({ action: 'get_intelligence' }),
        memoryLoadingTool.execute({ action: 'create_snapshot' }),
      ];

      const results = await Promise.all(operations);

      results.forEach(result => {
        expect(result.isError).toBeFalsy();
      });

      // Initialize should be called for each operation
      expect(mockMemoryManager.initialize).toHaveBeenCalledTimes(3);
    });
  });
});
