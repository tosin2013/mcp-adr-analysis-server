/**
 * Integration Tests for Memory System
 *
 * End-to-end testing of the complete memory-centric architecture system
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MemoryEntityManager } from '../../src/utils/memory-entity-manager.js';
import { MemoryTransformer } from '../../src/utils/memory-transformation.js';
import { MemoryLoadingTool } from '../../src/tools/memory-loading-tool.js';
import { DiscoveredAdr } from '../../src/utils/adr-discovery.js';
import {
  MemoryEntity,
  MemoryRelationship,
  ArchitecturalDecisionMemory,
} from '../../src/types/memory-entities.js';

// Mock filesystem operations for integration tests
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock config with test directory
jest.mock('../../src/utils/config.js', () => ({
  loadConfig: jest.fn(() => ({
    projectPath: '/test/integration/project',
    adrDirectory: '/test/integration/project/docs/adrs',
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

describe('Memory System Integration', () => {
  let memoryManager: MemoryEntityManager;
  let memoryTransformer: MemoryTransformer;
  let memoryLoadingTool: MemoryLoadingTool;
  let testMemoryDir: string;

  beforeEach(async () => {
    jest.clearAllMocks();

    testMemoryDir = '/test/integration/project/.mcp-adr-memory';

    // Setup filesystem mocks
    mockFs.access.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.readFile.mockRejectedValue(new Error('ENOENT')); // No existing files
    mockFs.writeFile.mockResolvedValue(undefined);

    // Initialize components
    memoryManager = new MemoryEntityManager();
    memoryTransformer = new MemoryTransformer(memoryManager);
    memoryLoadingTool = new MemoryLoadingTool();

    await memoryManager.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('complete ADR-to-memory workflow', () => {
    it('should transform ADRs to memory entities and establish relationships', async () => {
      // Setup test ADRs
      const testAdrs: DiscoveredAdr[] = [
        {
          filename: 'adr-001-react-frontend.md',
          number: 1,
          title: 'Use React for Frontend Development',
          status: 'accepted',
          date: '2024-01-01',
          context: 'We need a modern, component-based frontend framework for our web application.',
          decision:
            'We will use React as our primary frontend framework with TypeScript for type safety.',
          consequences: `
Positive:
- Component reusability and maintainability
- Large ecosystem and community support
- Strong TypeScript integration

Negative:
- Learning curve for team members new to React
- Additional build complexity

Risks:
- Potential performance issues with large component trees
          `,
          content: `
# Use React for Frontend Development

## Status
Accepted

## Context
We need a modern, component-based frontend framework for our web application.
Our team has experience with JavaScript but limited React knowledge.
The application needs to be scalable and maintainable.

## Decision
We will use React as our primary frontend framework with TypeScript for type safety.

## Consequences
Positive:
- Component reusability and maintainability
- Large ecosystem and community support
- Strong TypeScript integration

Negative:
- Learning curve for team members new to React
- Additional build complexity

Risks:
- Potential performance issues with large component trees

## Implementation Tasks
- [ ] Set up React development environment
- [ ] Create base component library
- [ ] Establish coding standards
- [ ] Train team on React best practices
          `,
          metadata: {
            category: 'frontend',
            tags: ['react', 'typescript', 'frontend'],
          },
        },
        {
          filename: 'adr-002-api-design.md',
          number: 2,
          title: 'RESTful API Design Patterns',
          status: 'accepted',
          date: '2024-01-05',
          context: 'We need consistent API design patterns for our React frontend to consume.',
          decision:
            'We will implement RESTful APIs with JSON responses and follow OpenAPI specification.',
          consequences: `
Positive:
- Standardized API patterns
- Better frontend-backend integration
- Clear documentation with OpenAPI

Negative:
- Additional specification overhead
          `,
          content: `
# RESTful API Design Patterns

## Status
Accepted

## Context
We need consistent API design patterns for our React frontend to consume.
The frontend team needs predictable data structures and error handling.

## Decision
We will implement RESTful APIs with JSON responses and follow OpenAPI specification.

## Dependencies
This decision depends on the React frontend framework choice (ADR-001).

## Implementation
- Use Express.js for API development
- Implement consistent error handling
- Generate OpenAPI documentation
          `,
          metadata: {
            category: 'backend',
            tags: ['api', 'rest', 'backend', 'express'],
          },
        },
        {
          filename: 'adr-003-database-choice.md',
          number: 3,
          title: 'PostgreSQL as Primary Database',
          status: 'accepted',
          date: '2024-01-10',
          context: 'We need a robust database solution for our application data.',
          decision: 'We will use PostgreSQL as our primary database with proper indexing strategy.',
          consequences: `
Positive:
- ACID compliance and reliability
- Rich feature set with JSON support
- Excellent performance with proper indexing

Negative:
- Higher resource requirements than simpler databases
- More complex setup and maintenance
          `,
          content: `
# PostgreSQL as Primary Database

## Status
Accepted

## Context
We need a robust database solution for our application data.
The application will handle complex relationships and require ACID compliance.

## Decision
We will use PostgreSQL as our primary database with proper indexing strategy.

## Alternatives Considered
- MySQL: Less advanced features
- MongoDB: Not suitable for our relational data needs
- SQLite: Not suitable for production scale

## Implementation
- Set up PostgreSQL cluster
- Design database schema
- Implement migration system
          `,
          metadata: {
            category: 'database',
            tags: ['postgresql', 'database', 'backend'],
          },
        },
      ];

      // Mock ADR discovery
      mockDiscoverAdrs.mockResolvedValue({
        totalAdrs: 3,
        adrs: testAdrs,
        summary: {
          byStatus: { accepted: 3 },
          byCategory: { frontend: 1, backend: 1, database: 1 },
        },
        recommendations: [],
      });

      // Test 1: Transform ADRs to memory entities
      const { entities, relationships } =
        await memoryTransformer.transformAdrCollectionToMemories(testAdrs);

      expect(entities).toHaveLength(3);
      expect(relationships.length).toBeGreaterThan(0);

      // Verify entity transformations
      const reactEntity = entities.find(e => e.title.includes('React'));
      const apiEntity = entities.find(e => e.title.includes('API'));
      const dbEntity = entities.find(e => e.title.includes('PostgreSQL'));

      expect(reactEntity).toBeDefined();
      expect(apiEntity).toBeDefined();
      expect(dbEntity).toBeDefined();

      // Test specific transformations
      expect(reactEntity?.decisionData.status).toBe('accepted');
      expect(reactEntity?.decisionData.implementationTasks).toContain(
        'Set up React development environment'
      );
      expect(reactEntity?.context.technicalStack).toContain('react');
      expect(reactEntity?.context.technicalStack).toContain('typescript');

      // Test 2: Store entities in memory manager
      const storedEntities: MemoryEntity[] = [];
      for (const entity of entities) {
        const stored = await memoryManager.upsertEntity(entity);
        storedEntities.push(stored);
      }

      expect(storedEntities).toHaveLength(3);

      // Test 3: Store relationships
      const storedRelationships: MemoryRelationship[] = [];
      for (const relationship of relationships) {
        const stored = await memoryManager.upsertRelationship(relationship);
        storedRelationships.push(stored);
      }

      expect(storedRelationships.length).toBeGreaterThan(0);

      // Test 4: Query the complete system
      const queryResult = await memoryManager.queryEntities({
        includeRelated: true,
        sortBy: 'confidence',
      });

      expect(queryResult.entities).toHaveLength(3);
      expect(queryResult.relationships.length).toBeGreaterThan(0);
      expect(queryResult.aggregations.byType['architectural_decision']).toBe(3);

      // Test 5: Find related entities
      const reactEntityId = storedEntities.find(e => e.title.includes('React'))?.id;
      expect(reactEntityId).toBeDefined();

      const relatedData = await memoryManager.findRelatedEntities(reactEntityId!, 2);
      expect(relatedData.entities.length).toBeGreaterThan(0);

      // Test 6: Intelligence system updates
      const intelligence = await memoryManager.getIntelligence();
      expect(intelligence.contextAwareness.currentContext.lastEvent).toBe('entity_updated');
      expect(intelligence.adaptiveRecommendations.nextActions.length).toBeGreaterThan(0);
    });

    it('should handle the complete workflow through memory loading tool', async () => {
      // Setup test ADRs
      const testAdrs: DiscoveredAdr[] = [
        {
          filename: 'adr-004-microservices.md',
          number: 4,
          title: 'Microservices Architecture',
          status: 'accepted',
          context: 'Need scalable architecture',
          decision: 'Adopt microservices architecture',
          content: 'Microservices provide better scalability and team autonomy.',
          metadata: {
            tags: ['microservices', 'architecture'],
          },
        },
        {
          filename: 'adr-005-containerization.md',
          number: 5,
          title: 'Docker Containerization',
          status: 'accepted',
          context: 'Need consistent deployment',
          decision: 'Use Docker for containerization',
          content: 'Docker containers ensure consistent deployment across environments.',
          metadata: {
            tags: ['docker', 'deployment'],
          },
        },
      ];

      mockDiscoverAdrs.mockResolvedValue({
        totalAdrs: 2,
        adrs: testAdrs,
        summary: {
          byStatus: { accepted: 2 },
          byCategory: { architecture: 2 },
        },
        recommendations: [],
      });

      // Test complete workflow through memory loading tool
      const loadResult = await memoryLoadingTool.execute({
        action: 'load_adrs',
        forceReload: true,
      });

      expect(loadResult.isError).toBeFalsy();
      const loadResponse = JSON.parse(loadResult.content[0].text);
      expect(loadResponse.status).toBe('success');
      expect(loadResponse.summary.entitiesCreated).toBe(2);

      // Query entities through the tool
      const queryResult = await memoryLoadingTool.execute({
        action: 'query_entities',
        query: {
          tags: ['microservices'],
          includeRelated: true,
        },
      });

      expect(queryResult.isError).toBeFalsy();
      const queryResponse = JSON.parse(queryResult.content[0].text);
      expect(queryResponse.status).toBe('success');
      expect(queryResponse.entities.length).toBeGreaterThan(0);

      // Get specific entity
      const entityId = queryResponse.entities[0].id;
      const getResult = await memoryLoadingTool.execute({
        action: 'get_entity',
        entityId,
      });

      expect(getResult.isError).toBeFalsy();
      const getResponse = JSON.parse(getResult.content[0].text);
      expect(getResponse.status).toBe('success');
      expect(getResponse.entity.id).toBe(entityId);

      // Find related entities
      const relatedResult = await memoryLoadingTool.execute({
        action: 'find_related',
        entityId,
        maxDepth: 2,
      });

      expect(relatedResult.isError).toBeFalsy();
      const relatedResponse = JSON.parse(relatedResult.content[0].text);
      expect(relatedResponse.status).toBe('success');
      expect(relatedResponse.sourceEntityId).toBe(entityId);

      // Get intelligence
      const intelligenceResult = await memoryLoadingTool.execute({
        action: 'get_intelligence',
      });

      expect(intelligenceResult.isError).toBeFalsy();
      const intelligenceResponse = JSON.parse(intelligenceResult.content[0].text);
      expect(intelligenceResponse.status).toBe('success');
      expect(intelligenceResponse.intelligence.contextAwareness).toBeDefined();

      // Create snapshot
      const snapshotResult = await memoryLoadingTool.execute({
        action: 'create_snapshot',
      });

      expect(snapshotResult.isError).toBeFalsy();
      const snapshotResponse = JSON.parse(snapshotResult.content[0].text);
      expect(snapshotResponse.status).toBe('success');
      expect(snapshotResponse.snapshot.metadata.totalEntities).toBe(2);
    });
  });

  describe('memory persistence integration', () => {
    it('should persist and reload memory data correctly', async () => {
      // Create test entity
      const testEntity = await memoryManager.upsertEntity({
        type: 'architectural_decision',
        title: 'Test Persistence',
        description: 'Testing persistence functionality',
        confidence: 0.9,
      });

      // Mock time progression to trigger persistence
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now + 31 * 60 * 1000); // 31 minutes later

      // Create another entity to trigger persistence
      await memoryManager.upsertEntity({
        type: 'knowledge_artifact',
        title: 'Another Entity',
        description: 'Trigger persistence',
      });

      // Verify persistence was attempted
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(testMemoryDir, 'entities.json'),
        expect.stringContaining(testEntity.id)
      );

      // Test reload scenario
      const persistedEntities = [testEntity];
      mockFs.readFile.mockImplementation(file => {
        if (file.toString().includes('entities.json')) {
          return Promise.resolve(JSON.stringify(persistedEntities));
        }
        return Promise.reject(new Error('ENOENT'));
      });

      // Create new manager instance to test loading
      const newManager = new MemoryEntityManager();
      await newManager.initialize();

      const reloadedEntity = await newManager.getEntity(testEntity.id);
      expect(reloadedEntity).toBeTruthy();
      expect(reloadedEntity?.title).toBe('Test Persistence');
    });

    it('should handle persistence failures gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Disk full'));

      // Should not throw when persistence fails
      await expect(
        memoryManager.upsertEntity({
          type: 'architectural_decision',
          title: 'Test Entity',
          description: 'Test description',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('relationship inference integration', () => {
    it('should correctly infer and manage complex relationships', async () => {
      // Create entities with various relationship patterns
      const entities = await Promise.all([
        memoryManager.upsertEntity({
          type: 'architectural_decision',
          title: 'Frontend Framework Choice',
          description: 'Decision about React frontend',
          tags: ['frontend', 'react'],
          context: {
            technicalStack: ['react', 'typescript'],
            businessDomain: 'ecommerce',
          },
        }),
        memoryManager.upsertEntity({
          type: 'architectural_decision',
          title: 'Component Library',
          description: 'Decision about React component library',
          tags: ['frontend', 'react', 'components'],
          context: {
            technicalStack: ['react', 'typescript'],
            businessDomain: 'ecommerce',
          },
        }),
        memoryManager.upsertEntity({
          type: 'code_component',
          title: 'Button Component',
          description: 'Reusable button component',
          tags: ['react', 'components'],
          context: {
            technicalStack: ['react'],
          },
        }),
      ]);

      // Create explicit relationships
      const relationship1 = await memoryManager.upsertRelationship({
        sourceId: entities[1].id, // Component Library
        targetId: entities[0].id, // Frontend Framework
        type: 'depends_on',
        context: 'Component library depends on React framework choice',
      });

      const relationship2 = await memoryManager.upsertRelationship({
        sourceId: entities[2].id, // Button Component
        targetId: entities[1].id, // Component Library
        type: 'implements',
        context: 'Button component implements component library patterns',
      });

      // Test relationship traversal
      const relatedToFramework = await memoryManager.findRelatedEntities(entities[0].id, 3);

      expect(relatedToFramework.entities.length).toBeGreaterThan(0);
      expect(relatedToFramework.relationshipPaths.some(path => path.depth === 2)).toBe(true);

      // Test relationship strength and confidence
      expect(relationship1.strength).toBeGreaterThan(0);
      expect(relationship1.confidence).toBeGreaterThan(0);
      expect(relationship2.strength).toBeGreaterThan(0);
      expect(relationship2.confidence).toBeGreaterThan(0);

      // Test bidirectional relationship discovery
      const relatedToButton = await memoryManager.findRelatedEntities(entities[2].id, 3);
      expect(relatedToButton.entities.length).toBeGreaterThan(0);
    });
  });

  describe('intelligence system integration', () => {
    it('should evolve intelligence based on system usage', async () => {
      // Create initial entities
      await memoryManager.upsertEntity({
        type: 'architectural_decision',
        title: 'Initial Decision',
        description: 'First decision',
        confidence: 0.5, // Low confidence
      });

      // Get initial intelligence
      const initialIntelligence = await memoryManager.getIntelligence();
      expect(initialIntelligence.adaptiveRecommendations.knowledgeGaps.length).toBeGreaterThan(0);

      // Add more entities to improve the system
      await memoryManager.upsertEntity({
        type: 'architectural_decision',
        title: 'Well Documented Decision',
        description: 'Comprehensive decision with high confidence',
        confidence: 0.95,
      });

      await memoryManager.upsertEntity({
        type: 'knowledge_artifact',
        title: 'Supporting Documentation',
        description: 'Documentation that supports decisions',
        confidence: 0.9,
      });

      // Get updated intelligence
      const updatedIntelligence = await memoryManager.getIntelligence();
      expect(updatedIntelligence.contextAwareness.currentContext.lastEvent).toBe('entity_updated');
      expect(updatedIntelligence.patternRecognition.patternConfidence).toBeDefined();

      // Test pattern recognition
      const patterns = Object.keys(updatedIntelligence.patternRecognition.patternConfidence);
      expect(patterns.some(pattern => pattern.includes('architectural_decision_update'))).toBe(
        true
      );
    });
  });

  describe('error handling and recovery', () => {
    it('should handle partial failures in batch operations', async () => {
      const testAdrs: DiscoveredAdr[] = [
        {
          filename: 'valid.md',
          number: 1,
          title: 'Valid ADR',
          status: 'accepted',
          context: 'Valid context',
          decision: 'Valid decision',
        },
        {
          filename: 'invalid.md',
          number: 2,
          title: '', // Invalid - empty title
          status: 'accepted',
          context: 'Invalid context',
          decision: 'Invalid decision',
        } as any,
        {
          filename: 'valid2.md',
          number: 3,
          title: 'Another Valid ADR',
          status: 'accepted',
          context: 'Another valid context',
          decision: 'Another valid decision',
        },
      ];

      const { entities, relationships } =
        await memoryTransformer.transformAdrCollectionToMemories(testAdrs);

      // Should have transformed only valid ADRs
      expect(entities.length).toBe(2);
      expect(entities.every(e => e.title.length > 0)).toBe(true);
    });

    it('should maintain system consistency during concurrent operations', async () => {
      // Simulate concurrent entity creation
      const concurrentOperations = Array.from({ length: 5 }, (_, i) =>
        memoryManager.upsertEntity({
          type: 'architectural_decision',
          title: `Concurrent Decision ${i}`,
          description: `Decision created concurrently ${i}`,
        })
      );

      const results = await Promise.all(concurrentOperations);
      expect(results).toHaveLength(5);
      expect(results.every(r => r.id)).toBe(true);

      // Verify all entities are queryable
      const queryResult = await memoryManager.queryEntities({});
      expect(queryResult.entities.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('performance and scalability', () => {
    it('should handle large numbers of entities efficiently', async () => {
      const entityCount = 50;
      const entities: MemoryEntity[] = [];

      // Create many entities
      for (let i = 0; i < entityCount; i++) {
        const entity = await memoryManager.upsertEntity({
          type: 'architectural_decision',
          title: `Decision ${i}`,
          description: `Test decision number ${i}`,
          tags: [`tag${i % 10}`, 'test'],
          confidence: 0.7 + (i % 3) * 0.1,
        });
        entities.push(entity);
      }

      // Test querying performance
      const startTime = Date.now();
      const queryResult = await memoryManager.queryEntities({
        tags: ['test'],
        limit: 20,
      });
      const queryTime = Date.now() - startTime;

      expect(queryResult.entities).toHaveLength(20);
      expect(queryTime).toBeLessThan(1000); // Should be fast
      expect(queryResult.totalCount).toBe(entityCount);

      // Test aggregations
      expect(queryResult.aggregations.byType['architectural_decision']).toBe(entityCount);
      expect(Object.keys(queryResult.aggregations.byTag)).toContain('test');
    });

    it('should handle complex relationship graphs', async () => {
      // Create a network of related entities
      const entities: MemoryEntity[] = [];
      for (let i = 0; i < 10; i++) {
        const entity = await memoryManager.upsertEntity({
          type: 'architectural_decision',
          title: `Network Node ${i}`,
          description: `Node in relationship network ${i}`,
        });
        entities.push(entity);
      }

      // Create relationships in a network pattern
      const relationships: MemoryRelationship[] = [];
      for (let i = 0; i < entities.length - 1; i++) {
        const relationship = await memoryManager.upsertRelationship({
          sourceId: entities[i].id,
          targetId: entities[i + 1].id,
          type: 'relates_to',
        });
        relationships.push(relationship);
      }

      // Create some cross-connections
      for (let i = 0; i < entities.length; i += 3) {
        if (i + 2 < entities.length) {
          await memoryManager.upsertRelationship({
            sourceId: entities[i].id,
            targetId: entities[i + 2].id,
            type: 'depends_on',
          });
        }
      }

      // Test relationship traversal performance
      const startTime = Date.now();
      const relatedData = await memoryManager.findRelatedEntities(entities[0].id, 5);
      const traversalTime = Date.now() - startTime;

      expect(relatedData.entities.length).toBeGreaterThan(0);
      expect(traversalTime).toBeLessThan(500); // Should be reasonably fast
      expect(relatedData.relationshipPaths.length).toBeGreaterThan(0);
    });
  });
});
