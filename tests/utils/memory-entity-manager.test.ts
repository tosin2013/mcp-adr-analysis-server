/**
 * Unit Tests for Memory Entity Manager
 *
 * Test coverage for the core memory-centric architecture component
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock fs module first
const mockFsPromises = {
  access: jest.fn(),
  mkdir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
};

jest.mock('fs', () => ({
  promises: mockFsPromises,
}));

// Mock crypto module first
const mockCrypto = {
  randomUUID: jest.fn(() => 'test-uuid-123'),
};

jest.mock('crypto', () => mockCrypto);

// Import after mocking
import * as path from 'path';
import { MemoryEntityManager } from '../../src/utils/memory-entity-manager.js';
import {
  MemoryEntity,
  MemoryRelationship,
  MemoryQuery,
  ArchitecturalDecisionMemory,
  CodeComponentMemory,
  KnowledgeArtifactMemory,
} from '../../src/types/memory-entities.js';

const mockFs = mockFsPromises;

// Mock config
jest.mock('../../src/utils/config.js', () => ({
  loadConfig: jest.fn(() => ({
    projectPath: '/test/project',
    adrDirectory: '/test/project/docs/adrs',
  })),
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

// Helper functions for creating valid test entities
function createValidADREntity(overrides: any = {}) {
  return {
    type: 'architectural_decision' as const,
    title: 'Test ADR Entity',
    description: 'A test architectural decision',
    confidence: 0.9,
    decisionData: {
      status: 'proposed' as const,
      context:
        'We are building a microservices architecture and need to select a database technology for high-availability requirements.',
      decision:
        'We will use PostgreSQL as our primary database technology for the microservices architecture.',
      consequences: {
        positive: [
          'Strong ACID compliance',
          'Rich query capabilities',
          'Excellent ecosystem support',
        ],
        negative: ['More complex horizontal scaling', 'Higher operational overhead'],
        risks: ['Single point of failure if not properly clustered', 'Learning curve for team'],
      },
      alternatives: [
        {
          name: 'PostgreSQL',
          description: 'Relational database with strong consistency',
          tradeoffs: 'Strong consistency vs horizontal scalability',
        },
        {
          name: 'MongoDB',
          description: 'Document database with flexible schema',
          tradeoffs: 'Flexibility vs consistency guarantees',
        },
      ],
      implementationStatus: 'not_started' as const,
      implementationTasks: ['Setup database cluster', 'Configure connection pooling'],
      reviewHistory: [],
    },
    ...overrides,
  };
}

function createValidKnowledgeArtifactEntity(overrides: any = {}) {
  return {
    type: 'knowledge_artifact' as const,
    title: 'Test Knowledge Artifact',
    description: 'A test knowledge artifact',
    confidence: 0.8,
    artifactData: {
      artifactType: 'documentation' as const,
      content: 'Test content',
      format: 'markdown' as const,
      sourceReliability: 0.8,
      applicabilityScope: ['backend', 'api'],
      keyInsights: ['Key insight 1', 'Key insight 2'],
      actionableItems: [
        {
          action: 'Update documentation',
          priority: 'medium' as const,
          timeframe: '1 week',
          dependencies: [],
        },
      ],
    },
    ...overrides,
  };
}

function createValidCodeComponentEntity(overrides: any = {}) {
  return {
    type: 'code_component' as const,
    title: 'Test Code Component',
    description: 'A test code component',
    confidence: 0.85,
    componentData: {
      filePath: '/src/components/TestComponent.ts',
      componentType: 'class' as const,
      language: 'TypeScript',
      size: {
        lines: 150,
        complexity: 5,
        dependencies: 3,
      },
      qualityMetrics: {
        maintainability: 0.8,
        testCoverage: 0.9,
        performance: 0.85,
        security: 0.9,
      },
      architecturalRole: 'Business logic component',
      businessValue: 'Core functionality implementation',
      technicalDebt: [],
      dependencies: ['lodash', 'react'],
      publicInterface: ['render', 'update'],
      changeFrequency: 'medium' as const,
      riskProfile: {
        technicalRisk: 'low' as const,
        businessRisk: 'medium' as const,
        changeRisk: 'low' as const,
        mitigationStrategies: ['Unit testing', 'Code review'],
      },
    },
    ...overrides,
  };
}

describe('MemoryEntityManager', () => {
  let memoryManager: MemoryEntityManager;
  let mockDate: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    memoryManager = new MemoryEntityManager();

    // Mock date to be consistent
    mockDate = jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2024-01-01T00:00:00.000Z');
    jest.spyOn(Date, 'now').mockReturnValue(1704067200000); // 2024-01-01

    // Reset crypto mock
    mockCrypto.randomUUID.mockReturnValue('test-uuid-123');

    // Mock filesystem operations
    mockFs.access.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.readFile.mockRejectedValue(new Error('ENOENT'));
    mockFs.writeFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    mockDate.mockRestore();
  });

  describe('initialization', () => {
    it('should initialize successfully with empty memory', async () => {
      await expect(memoryManager.initialize()).resolves.not.toThrow();
    });

    it('should create memory directory if it does not exist', async () => {
      mockFs.access.mockRejectedValueOnce(new Error('ENOENT'));
      mockFs.mkdir.mockResolvedValueOnce(undefined);

      await memoryManager.initialize();

      expect(mockFs.mkdir).toHaveBeenCalledWith(path.join('/test/project', '.mcp-adr-memory'), {
        recursive: true,
      });
    });

    it('should load existing entities from persistence', async () => {
      const existingEntities: MemoryEntity[] = [
        {
          id: 'existing-1',
          type: 'architectural_decision',
          created: '2023-12-01T00:00:00.000Z',
          lastModified: '2023-12-01T00:00:00.000Z',
          version: 1,
          confidence: 0.8,
          relevance: 0.7,
          title: 'Test ADR',
          description: 'Test description',
          tags: ['test'],
          relationships: [],
          context: {
            technicalStack: ['react'],
            environmentalFactors: [],
            stakeholders: [],
          },
          accessPattern: {
            lastAccessed: '2023-12-01T00:00:00.000Z',
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
        } as ArchitecturalDecisionMemory,
      ];

      mockFs.readFile.mockImplementation(file => {
        if (file.toString().includes('entities.json')) {
          return Promise.resolve(JSON.stringify(existingEntities));
        }
        return Promise.reject(new Error('ENOENT'));
      });

      await memoryManager.initialize();

      const entity = await memoryManager.getEntity('existing-1');
      expect(entity).toBeTruthy();
      expect(entity?.title).toBe('Test ADR');
    });

    it('should handle initialization errors gracefully', async () => {
      // Reset previous mocks and make directory creation fail
      mockFs.access.mockRejectedValue(new Error('Directory does not exist'));
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(memoryManager.initialize()).rejects.toThrow();
    });
  });

  describe('entity management', () => {
    beforeEach(async () => {
      await memoryManager.initialize();
    });

    describe('upsertEntity', () => {
      it('should create a new entity with all required fields', async () => {
        const entityData = createValidADREntity();

        const result = await memoryManager.upsertEntity(entityData);

        expect(result.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        ); // UUID v4 format
        expect(result.type).toBe('architectural_decision');
        expect(result.title).toBe('Test ADR Entity');
        expect(result.description).toBe('A test architectural decision');
        expect(result.confidence).toBe(0.9);
        expect(result.created).toBe('2024-01-01T00:00:00.000Z');
        expect(result.lastModified).toBe('2024-01-01T00:00:00.000Z');
        expect(result.version).toBe(1);
        expect(result.accessPattern.accessCount).toBe(1);

        // Validate the schema-specific data structure
        expect(result.decisionData).toBeDefined();
        expect(result.decisionData.status).toBe('proposed');
        expect(result.decisionData.decision).toContain('PostgreSQL');
        expect(result.decisionData.consequences).toBeDefined();
        expect(result.decisionData.alternatives).toHaveLength(2);
      });

      it('should update an existing entity', async () => {
        // First create an entity
        const createData = createValidKnowledgeArtifactEntity({
          title: 'Original Title',
          description: 'Original description',
        });
        const created = await memoryManager.upsertEntity(createData);

        // Update the entity
        const updateData = createValidKnowledgeArtifactEntity({
          id: created.id,
          title: 'Updated Title',
          description: 'Updated description',
          confidence: 0.95,
        });
        const updated = await memoryManager.upsertEntity(updateData);

        expect(updated.id).toBe(created.id);
        expect(updated.title).toBe('Updated Title');
        expect(updated.description).toBe('Updated description');
        expect(updated.confidence).toBe(0.95);
        expect(updated.version).toBe(2);
        expect(updated.created).toBe(created.created);
        expect(updated.lastModified).toBe('2024-01-01T00:00:00.000Z');
      });

      it('should apply default values correctly', async () => {
        const minimalData = createValidCodeComponentEntity({
          title: 'Test Component',
          description: 'Test description',
        });

        const result = await memoryManager.upsertEntity(minimalData);

        expect(result.confidence).toBe(0.85); // Default
        expect(result.relevance).toBe(0.7); // Default
        expect(result.tags).toEqual([]);
        expect(result.relationships).toEqual([]);
        expect(result.context.technicalStack).toEqual([]);
        expect(result.context.environmentalFactors).toEqual([]);
        expect(result.context.stakeholders).toEqual([]);
      });

      it('should validate entity schema', async () => {
        const invalidData = {
          type: 'invalid_type' as any,
          title: 'Test',
          description: 'Test',
        };

        await expect(memoryManager.upsertEntity(invalidData)).rejects.toThrow();
      });

      it('should track evolution for new entities', async () => {
        const entityData = createValidADREntity({
          title: 'Test ADR',
          description: 'Test description',
        });

        const result = await memoryManager.upsertEntity(entityData);

        expect(result.evolution.origin).toBe('created');
        expect(result.evolution.transformations).toHaveLength(1);
        expect(result.evolution.transformations[0].type).toBe('created');
        expect(result.evolution.transformations[0].agent).toBe('MemoryEntityManager');
      });

      it('should track evolution for updated entities', async () => {
        // Create entity
        const createData = createValidKnowledgeArtifactEntity({
          title: 'Original',
          description: 'Original description',
        });
        const created = await memoryManager.upsertEntity(createData);

        // Update entity
        const updateData = createValidKnowledgeArtifactEntity({
          id: created.id,
          title: 'Updated',
          description: 'Updated description',
        });
        const updated = await memoryManager.upsertEntity(updateData);

        expect(updated.evolution.transformations).toHaveLength(2);
        expect(updated.evolution.transformations[1].type).toBe('updated');
        expect(updated.evolution.transformations[1].description).toContain(
          'Updated knowledge_artifact entity'
        );
      });
    });

    describe('getEntity', () => {
      it('should retrieve an existing entity', async () => {
        const entityData = createValidADREntity({
          title: 'Test ADR',
          description: 'Test description',
        });
        const created = await memoryManager.upsertEntity(entityData);

        const retrieved = await memoryManager.getEntity(created.id);

        expect(retrieved).toBeTruthy();
        expect(retrieved?.id).toBe(created.id);
        expect(retrieved?.title).toBe('Test ADR');
      });

      it('should return null for non-existent entity', async () => {
        const result = await memoryManager.getEntity('non-existent-id');
        expect(result).toBeNull();
      });

      it('should update access pattern when retrieving entity', async () => {
        const entityData = createValidCodeComponentEntity({
          title: 'Test Component',
          description: 'Test description',
        });
        const created = await memoryManager.upsertEntity(entityData);

        // First access
        const firstAccess = await memoryManager.getEntity(created.id);
        expect(firstAccess?.accessPattern.accessCount).toBe(2); // 1 from creation + 1 from access

        // Second access
        const secondAccess = await memoryManager.getEntity(created.id);
        expect(secondAccess?.accessPattern.accessCount).toBe(3);
      });
    });

    describe('deleteEntity', () => {
      it('should delete an existing entity', async () => {
        const entityData = createValidKnowledgeArtifactEntity({
          title: 'Test Artifact',
          description: 'Test description',
        });
        const created = await memoryManager.upsertEntity(entityData);

        const deleted = await memoryManager.deleteEntity(created.id);
        expect(deleted).toBe(true);

        const retrieved = await memoryManager.getEntity(created.id);
        expect(retrieved).toBeNull();
      });

      it('should return false for non-existent entity', async () => {
        const result = await memoryManager.deleteEntity('non-existent-id');
        expect(result).toBe(false);
      });

      it('should remove related relationships when deleting entity', async () => {
        // Create two entities
        const entity1Data = createValidADREntity({
          title: 'ADR 1',
          description: 'Description 1',
        });
        const entity2Data = createValidADREntity({
          title: 'ADR 2',
          description: 'Description 2',
        });

        const entity1 = await memoryManager.upsertEntity(entity1Data);
        const entity2 = await memoryManager.upsertEntity(entity2Data);

        // Create relationship
        const relationshipData = {
          sourceId: entity1.id,
          targetId: entity2.id,
          type: 'relates_to' as const,
        };
        await memoryManager.upsertRelationship(relationshipData);

        // Delete first entity
        await memoryManager.deleteEntity(entity1.id);

        // Query for relationships should not find the deleted relationship
        const queryResult = await memoryManager.queryEntities({
          includeRelated: true,
        });
        const relationships = queryResult.relationships.filter(
          r => r.sourceId === entity1.id || r.targetId === entity1.id
        );
        expect(relationships).toHaveLength(0);
      });
    });
  });

  describe('relationship management', () => {
    let entity1: MemoryEntity;
    let entity2: MemoryEntity;

    beforeEach(async () => {
      await memoryManager.initialize();

      // Create test entities
      entity1 = await memoryManager.upsertEntity(
        createValidADREntity({
          title: 'ADR 1',
          description: 'First ADR',
        })
      );

      entity2 = await memoryManager.upsertEntity(
        createValidADREntity({
          title: 'ADR 2',
          description: 'Second ADR',
        })
      );
    });

    describe('upsertRelationship', () => {
      it('should create a new relationship', async () => {
        const relationshipData = {
          sourceId: entity1.id,
          targetId: entity2.id,
          type: 'depends_on' as const,
          strength: 0.8,
        };

        const result = await memoryManager.upsertRelationship(relationshipData);

        expect(result.id).toBe('test-uuid-123');
        expect(result.sourceId).toBe(entity1.id);
        expect(result.targetId).toBe(entity2.id);
        expect(result.type).toBe('depends_on');
        expect(result.strength).toBe(0.8);
        expect(result.confidence).toBe(0.85); // Default
      });

      it('should apply default values for optional fields', async () => {
        const relationshipData = {
          sourceId: entity1.id,
          targetId: entity2.id,
          type: 'relates_to' as const,
        };

        const result = await memoryManager.upsertRelationship(relationshipData);

        expect(result.strength).toBe(0.7); // Default
        expect(result.confidence).toBe(0.85); // Default
        expect(result.context).toBe('');
        expect(result.evidence).toEqual([]);
      });

      it('should fail when source entity does not exist', async () => {
        const relationshipData = {
          sourceId: 'non-existent',
          targetId: entity2.id,
          type: 'relates_to' as const,
        };

        await expect(memoryManager.upsertRelationship(relationshipData)).rejects.toThrow(
          'Source or target entity not found'
        );
      });

      it('should fail when target entity does not exist', async () => {
        const relationshipData = {
          sourceId: entity1.id,
          targetId: 'non-existent',
          type: 'relates_to' as const,
        };

        await expect(memoryManager.upsertRelationship(relationshipData)).rejects.toThrow(
          'Source or target entity not found'
        );
      });

      it('should update entity relationships', async () => {
        const relationshipData = {
          sourceId: entity1.id,
          targetId: entity2.id,
          type: 'supersedes' as const,
          strength: 0.9,
        };

        await memoryManager.upsertRelationship(relationshipData);

        const updatedEntity1 = await memoryManager.getEntity(entity1.id);
        expect(updatedEntity1?.relationships).toHaveLength(1);
        expect(updatedEntity1?.relationships[0].targetId).toBe(entity2.id);
        expect(updatedEntity1?.relationships[0].type).toBe('supersedes');
      });
    });
  });

  describe('querying', () => {
    beforeEach(async () => {
      await memoryManager.initialize();

      // Create test entities with different properties
      await memoryManager.upsertEntity(
        createValidADREntity({
          title: 'React Architecture',
          description: 'Decision to use React for frontend',
          tags: ['frontend', 'react'],
          confidence: 0.9,
          relevance: 0.8,
          context: {
            projectPhase: 'design',
            businessDomain: 'ecommerce',
            technicalStack: ['react', 'typescript'],
            environmentalFactors: ['web'],
            stakeholders: ['development-team'],
          },
        })
      );

      await memoryManager.upsertEntity(
        createValidKnowledgeArtifactEntity({
          title: 'API Documentation',
          description: 'REST API documentation',
          tags: ['backend', 'api'],
          confidence: 0.7,
          relevance: 0.9,
          context: {
            projectPhase: 'development',
            businessDomain: 'ecommerce',
            technicalStack: ['express', 'nodejs'],
            environmentalFactors: ['api-first'],
            stakeholders: ['development-team'],
          },
        })
      );

      await memoryManager.upsertEntity(
        createValidCodeComponentEntity({
          title: 'Database Schema',
          description: 'PostgreSQL database schema',
          tags: ['database', 'schema'],
          confidence: 0.8,
          relevance: 0.7,
          context: {
            businessDomain: 'finance',
            technicalStack: ['postgresql'],
            environmentalFactors: ['cloud'],
            stakeholders: ['operations-team'],
          },
        })
      );
    });

    describe('queryEntities', () => {
      it('should return all entities with default query', async () => {
        const result = await memoryManager.queryEntities({});

        expect(result.entities).toHaveLength(3);
        expect(result.totalCount).toBe(3);
        expect(result.queryTime).toBeGreaterThan(0);
      });

      it('should filter by entity types', async () => {
        const result = await memoryManager.queryEntities({
          entityTypes: ['architectural_decision'],
        });

        expect(result.entities).toHaveLength(1);
        expect(result.entities[0].type).toBe('architectural_decision');
      });

      it('should filter by tags', async () => {
        const result = await memoryManager.queryEntities({
          tags: ['frontend'],
        });

        expect(result.entities).toHaveLength(1);
        expect(result.entities[0].title).toBe('React Architecture');
      });

      it('should filter by text query', async () => {
        const result = await memoryManager.queryEntities({
          textQuery: 'react',
        });

        expect(result.entities).toHaveLength(1);
        expect(result.entities[0].title).toBe('React Architecture');
      });

      it('should filter by confidence threshold', async () => {
        const result = await memoryManager.queryEntities({
          confidenceThreshold: 0.85,
        });

        expect(result.entities).toHaveLength(1);
        expect(result.entities[0].confidence).toBeGreaterThanOrEqual(0.85);
      });

      it('should filter by context filters', async () => {
        const result = await memoryManager.queryEntities({
          contextFilters: {
            businessDomain: 'ecommerce',
          },
        });

        expect(result.entities).toHaveLength(2);
        result.entities.forEach(entity => {
          expect(entity.context.businessDomain).toBe('ecommerce');
        });
      });

      it('should sort entities correctly', async () => {
        const result = await memoryManager.queryEntities({
          sortBy: 'confidence',
        });

        expect(result.entities).toHaveLength(3);
        expect(result.entities[0].confidence).toBeGreaterThanOrEqual(result.entities[1].confidence);
        expect(result.entities[1].confidence).toBeGreaterThanOrEqual(result.entities[2].confidence);
      });

      it('should limit results', async () => {
        const result = await memoryManager.queryEntities({
          limit: 2,
        });

        expect(result.entities).toHaveLength(2);
        expect(result.totalCount).toBe(3);
      });

      it('should include aggregations', async () => {
        const result = await memoryManager.queryEntities({});

        expect(result.aggregations.byType).toBeDefined();
        expect(result.aggregations.byTag).toBeDefined();
        expect(result.aggregations.byConfidence).toBeDefined();
        expect(result.aggregations.byType['architectural_decision']).toBe(1);
        expect(result.aggregations.byType['knowledge_artifact']).toBe(1);
        expect(result.aggregations.byType['code_component']).toBe(1);
      });
    });

    describe('findRelatedEntities', () => {
      let entity1: MemoryEntity;
      let entity2: MemoryEntity;
      let entity3: MemoryEntity;

      beforeEach(async () => {
        // Create a chain of related entities
        entity1 = await memoryManager.upsertEntity(
          createValidADREntity({
            title: 'Root ADR',
            description: 'Root decision',
          })
        );

        entity2 = await memoryManager.upsertEntity(
          createValidADREntity({
            title: 'Related ADR',
            description: 'Related decision',
          })
        );

        entity3 = await memoryManager.upsertEntity(
          createValidCodeComponentEntity({
            title: 'Implementation',
            description: 'Code implementation',
          })
        );

        // Create relationships
        await memoryManager.upsertRelationship({
          sourceId: entity1.id,
          targetId: entity2.id,
          type: 'relates_to',
        });

        await memoryManager.upsertRelationship({
          sourceId: entity2.id,
          targetId: entity3.id,
          type: 'implements',
        });
      });

      it('should find directly related entities', async () => {
        const result = await memoryManager.findRelatedEntities(entity1.id, 1);

        expect(result.entities).toHaveLength(1);
        expect(result.entities[0].id).toBe(entity2.id);
        expect(result.relationshipPaths).toHaveLength(1);
        expect(result.relationshipPaths[0].depth).toBe(1);
      });

      it('should find entities at multiple depths', async () => {
        const result = await memoryManager.findRelatedEntities(entity1.id, 2);

        expect(result.entities).toHaveLength(2);
        expect(result.relationshipPaths).toHaveLength(2);

        const depths = result.relationshipPaths.map(path => path.depth);
        expect(depths).toContain(1);
        expect(depths).toContain(2);
      });

      it('should respect maxDepth parameter', async () => {
        const result = await memoryManager.findRelatedEntities(entity1.id, 1);

        expect(result.entities).toHaveLength(1);
        expect(result.relationshipPaths.every(path => path.depth <= 1)).toBe(true);
      });

      it('should filter by relationship types', async () => {
        const result = await memoryManager.findRelatedEntities(entity1.id, 2, ['implements']);

        // Should not find entity2 (relates_to) but should find entity3 through entity2 (implements)
        expect(result.entities).toHaveLength(0); // No direct 'implements' from entity1
      });
    });
  });

  describe('intelligence', () => {
    beforeEach(async () => {
      await memoryManager.initialize();
    });

    it('should initialize default intelligence', async () => {
      const intelligence = await memoryManager.getIntelligence();

      expect(intelligence.contextAwareness).toBeDefined();
      expect(intelligence.patternRecognition).toBeDefined();
      expect(intelligence.relationshipInference).toBeDefined();
      expect(intelligence.adaptiveRecommendations).toBeDefined();
    });

    it('should update intelligence when entities are modified', async () => {
      await memoryManager.upsertEntity(
        createValidADREntity({
          title: 'Test ADR',
          description: 'Test description',
        })
      );

      const intelligence = await memoryManager.getIntelligence();

      expect(intelligence.contextAwareness.currentContext.lastEvent).toBe('entity_updated');
      expect(
        intelligence.patternRecognition.patternConfidence['architectural_decision_update']
      ).toBe(1);
    });

    it('should generate recommendations based on current state', async () => {
      // Create entity with low confidence
      await memoryManager.upsertEntity(
        createValidKnowledgeArtifactEntity({
          title: 'Low Confidence Artifact',
          description: 'Test description',
          confidence: 0.3,
        })
      );

      const intelligence = await memoryManager.getIntelligence();

      expect(intelligence.adaptiveRecommendations.knowledgeGaps.length).toBeGreaterThan(0);
      expect(intelligence.adaptiveRecommendations.knowledgeGaps[0]).toContain('Low confidence');
    });
  });

  describe('snapshots', () => {
    beforeEach(async () => {
      await memoryManager.initialize();

      // Create some test data
      await memoryManager.upsertEntity(
        createValidADREntity({
          title: 'Test ADR',
          description: 'Test description',
          confidence: 0.8,
        })
      );

      await memoryManager.upsertEntity(
        createValidKnowledgeArtifactEntity({
          title: 'Test Artifact',
          description: 'Test description',
          confidence: 0.9,
        })
      );
    });

    it('should create a memory snapshot', async () => {
      const snapshot = await memoryManager.createSnapshot();

      expect(snapshot.id).toBe('test-uuid-123');
      expect(snapshot.timestamp).toBe('2024-01-01T00:00:00.000Z');
      expect(snapshot.version).toBe('1.0.0');
      expect(snapshot.entities).toHaveLength(2);
      expect(snapshot.relationships).toHaveLength(0);
      expect(snapshot.metadata.totalEntities).toBe(2);
      expect(snapshot.metadata.totalRelationships).toBe(0);
      expect(snapshot.metadata.averageConfidence).toBe(0.85); // (0.8 + 0.9) / 2
    });

    it('should include intelligence in snapshot', async () => {
      const snapshot = await memoryManager.createSnapshot();

      expect(snapshot.intelligence).toBeDefined();
      expect(snapshot.intelligence.contextAwareness).toBeDefined();
      expect(snapshot.intelligence.patternRecognition).toBeDefined();
      expect(snapshot.intelligence.relationshipInference).toBeDefined();
      expect(snapshot.intelligence.adaptiveRecommendations).toBeDefined();
    });
  });

  describe('persistence', () => {
    beforeEach(async () => {
      await memoryManager.initialize();
    });

    it('should persist data when snapshot frequency is reached', async () => {
      // Create entity
      await memoryManager.upsertEntity(
        createValidADREntity({
          title: 'Test ADR',
          description: 'Test description',
        })
      );

      // Mock time to trigger persistence
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now + 31 * 60 * 1000); // 31 minutes later

      // Create another entity to trigger persistence check
      await memoryManager.upsertEntity(
        createValidKnowledgeArtifactEntity({
          title: 'Test Artifact',
          description: 'Test description',
        })
      );

      // Should have written entities file
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('entities.json'),
        expect.any(String)
      );
    });

    it('should handle persistence errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));

      // Should not throw when persistence fails
      await expect(
        memoryManager.upsertEntity(
          createValidADREntity({
            title: 'Test ADR',
            description: 'Test description',
          })
        )
      ).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await memoryManager.initialize();
    });

    it('should handle invalid entity data', async () => {
      const invalidData = {
        type: 'invalid_type' as any,
        title: '',
        description: '',
      };

      await expect(memoryManager.upsertEntity(invalidData)).rejects.toThrow();
    });

    it('should handle query errors gracefully', async () => {
      // Mock a scenario that would cause query to fail
      const invalidQuery: MemoryQuery = {
        timeRange: {
          from: 'invalid-date',
          to: 'invalid-date',
        },
      };

      await expect(memoryManager.queryEntities(invalidQuery)).rejects.toThrow();
    });

    it('should handle relationship creation with missing entities', async () => {
      await expect(
        memoryManager.upsertRelationship({
          sourceId: 'non-existent-1',
          targetId: 'non-existent-2',
          type: 'relates_to',
        })
      ).rejects.toThrow('Source or target entity not found');
    });
  });
});
