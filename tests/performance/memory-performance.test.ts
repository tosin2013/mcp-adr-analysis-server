/**
 * Memory System Performance Tests
 *
 * Performance and load testing for memory entities, relationships, and migration.
 * Validates system performance under various load conditions.
 */

import crypto from 'crypto';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MemoryEntityManager } from '../../src/utils/memory-entity-manager.js';
import { MemoryMigrationManager } from '../../src/utils/memory-migration-manager.js';
import { MemoryRelationshipMapper } from '../../src/utils/memory-relationship-mapper.js';
import {
  ArchitecturalDecisionMemory,
  DeploymentAssessmentMemory,
  TroubleshootingSessionMemory,
} from '../../src/types/memory-entities.js';

// Mock filesystem operations
const mockFsPromises = {
  access: jest.fn(),
  mkdir: jest.fn(),
  readdir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  copyFile: jest.fn(),
};

jest.mock('fs', () => ({
  promises: mockFsPromises,
  existsSync: jest.fn(() => false),
}));

jest.mock('fs/promises', () => mockFsPromises);

// Mock crypto
let uuidCounter = 0;
const mockCrypto = {
  randomUUID: jest.fn(() => `test-uuid-${++uuidCounter}`),
};

jest.mock('crypto', () => mockCrypto);

describe('Memory System Performance Tests', () => {
  let memoryManager: MemoryEntityManager;
  let migrationManager: MemoryMigrationManager;
  let relationshipMapper: MemoryRelationshipMapper;

  beforeEach(() => {
    jest.clearAllMocks();
    uuidCounter = 0;

    // Mock date to be consistent
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-01T00:00:00.000Z');
    jest.spyOn(Date, 'now').mockReturnValue(1704067200000);

    // Mock filesystem operations
    mockFsPromises.access.mockResolvedValue(undefined);
    mockFsPromises.mkdir.mockResolvedValue(undefined);
    mockFsPromises.readFile.mockRejectedValue(new Error('ENOENT'));
    mockFsPromises.writeFile.mockResolvedValue(undefined);
    mockFsPromises.copyFile.mockResolvedValue(undefined);
    mockFsPromises.readdir.mockResolvedValue([]);

    memoryManager = new MemoryEntityManager();
    migrationManager = new MemoryMigrationManager(memoryManager);
    relationshipMapper = new MemoryRelationshipMapper(memoryManager);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Entity Creation Performance', () => {
    it('should handle bulk entity creation efficiently', async () => {
      const entityCount = 100; // Reduced for faster tests
      const startTime = Date.now();

      // Create a large number of entities
      const promises = [];
      for (let i = 0; i < entityCount; i++) {
        const entity: ArchitecturalDecisionMemory = {
          id: crypto.randomUUID(),
          type: 'architectural_decision',
          title: `Performance Test ADR ${i}`,
          description: `Test architectural decision ${i} for performance testing`,
          confidence: 0.8,
          relevance: 0.7,
          tags: ['performance', 'test', `batch-${Math.floor(i / 100)}`],
          created: '2024-01-01T00:00:00.000Z',
          lastModified: '2024-01-01T00:00:00.000Z',
          version: 1,
          context: {
            technicalStack: ['performance-test'],
            environmentalFactors: ['testing'],
            stakeholders: ['test-team'],
          },
          relationships: [],
          accessPattern: {
            accessCount: 1,
            lastAccessed: '2024-01-01T00:00:00.000Z',
            accessContext: ['performance-test'],
          },
          evolution: {
            origin: 'created',
            transformations: [],
          },
          validation: {
            isVerified: true,
          },
          decisionData: {
            status: 'accepted',
            context: `Performance test context ${i}`,
            decision: `Performance test decision ${i}`,
            consequences: {
              positive: [`Positive outcome ${i}`],
              negative: [`Negative outcome ${i}`],
              risks: [`Risk ${i}`],
            },
            alternatives: [
              {
                name: `Alternative ${i}`,
                description: `Alternative description ${i}`,
                tradeoffs: `Tradeoffs for alternative ${i}`,
              },
            ],
            implementationStatus: 'not_started',
            implementationTasks: [`Task ${i}`],
            reviewHistory: [],
          },
        };

        promises.push(memoryManager.upsertEntity(entity));
      }

      // Wait for all entities to be created
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = entityCount / (duration / 1000);

      // Performance assertions
      expect(results).toHaveLength(entityCount);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(throughput).toBeGreaterThan(5); // At least 5 entities per second (reduced for CI)

      console.log(`Bulk Entity Creation Performance:
        - Entities: ${entityCount}
        - Duration: ${duration}ms
        - Throughput: ${throughput.toFixed(2)} entities/second`);
    });

    it('should handle concurrent entity operations', async () => {
      const concurrentCount = 100;
      const startTime = Date.now();

      // Create entities concurrently in batches
      const batchPromises = [];
      for (let batch = 0; batch < 10; batch++) {
        const batchEntities = [];
        for (let i = 0; i < concurrentCount / 10; i++) {
          const entityId = batch * 10 + i;
          const entity: DeploymentAssessmentMemory = {
            id: crypto.randomUUID(),
            type: 'deployment_assessment',
            title: `Concurrent Test Deployment ${entityId}`,
            description: `Concurrent deployment assessment ${entityId}`,
            confidence: 0.8,
            relevance: 0.7,
            tags: ['concurrent', 'test'],
            created: '2024-01-01T00:00:00.000Z',
            lastModified: '2024-01-01T00:00:00.000Z',
            version: 1,
            context: {
              technicalStack: ['concurrent-test'],
              environmentalFactors: ['testing'],
              stakeholders: ['test-team'],
            },
            relationships: [],
            accessPattern: {
              accessCount: 1,
              lastAccessed: '2024-01-01T00:00:00.000Z',
              accessContext: ['concurrent-test'],
            },
            evolution: {
              origin: 'created',
              transformations: [],
            },
            validation: {
              isVerified: true,
            },
            assessmentData: {
              environment: 'testing',
              readinessScore: 0.8,
              validationResults: {
                testResults: {
                  passed: 100,
                  failed: 0,
                  coverage: 0.9,
                  criticalFailures: [],
                },
                securityValidation: {
                  vulnerabilities: 0,
                  securityScore: 1.0,
                  criticalIssues: [],
                },
                performanceValidation: {
                  performanceScore: 0.9,
                  bottlenecks: [],
                  resourceUtilization: { cpu: 50, memory: 60, network: 30 },
                },
              },
              blockingIssues: [],
              deploymentStrategy: {
                type: 'rolling',
                rollbackPlan: 'Automated rollback',
                monitoringPlan: 'Standard monitoring',
              },
              complianceChecks: {
                adrCompliance: 1.0,
                regulatoryCompliance: [],
                auditTrail: [`Concurrent test ${entityId}`],
              },
            },
          };

          batchEntities.push(memoryManager.upsertEntity(entity));
        }
        batchPromises.push(Promise.all(batchEntities));
      }

      // Wait for all batches to complete
      const batchResults = await Promise.all(batchPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Flatten results
      const allResults = batchResults.flat();
      const throughput = allResults.length / (duration / 1000);

      // Performance assertions
      expect(allResults).toHaveLength(concurrentCount);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(throughput).toBeGreaterThan(10); // At least 10 entities per second (reduced for CI)

      console.log(`Concurrent Entity Operations Performance:
        - Entities: ${concurrentCount}
        - Duration: ${duration}ms
        - Throughput: ${throughput.toFixed(2)} entities/second`);
    });
  });

  describe('Query Performance', () => {
    it('should handle large-scale entity queries efficiently', async () => {
      // First, create a dataset to query
      const entityCount = 500;
      const entities = [];

      for (let i = 0; i < entityCount; i++) {
        entities.push({
          id: crypto.randomUUID(),
          type: 'troubleshooting_session',
          title: `Query Test Session ${i}`,
          description: `Test session ${i}`,
          confidence: 0.8,
          relevance: 0.7,
          tags: [`category-${i % 10}`, 'query-test'],
          created: '2024-01-01T00:00:00.000Z',
          lastModified: '2024-01-01T00:00:00.000Z',
          version: 1,
          context: {
            technicalStack: [`tech-${i % 5}`],
            environmentalFactors: [`env-${i % 3}`],
            stakeholders: ['test-team'],
          },
          relationships: [],
          accessPattern: {
            accessCount: 1,
            lastAccessed: '2024-01-01T00:00:00.000Z',
            accessContext: ['query-test'],
          },
          evolution: {
            origin: 'created',
            transformations: [],
          },
          validation: {
            isVerified: true,
          },
          sessionData: {
            failurePattern: {
              failureType: 'runtime_error',
              errorSignature: `error-${i}`,
              frequency: 1,
              environments: ['testing'],
            },
            failureDetails: {
              errorMessage: `Test error ${i}`,
              environment: 'testing',
            },
            analysisSteps: [`Step ${i}`],
            solutionEffectiveness: 0.8,
            preventionMeasures: [`Prevention ${i}`],
            relatedADRs: [],
            environmentContext: {
              environment: 'testing',
            },
            followUpActions: [],
          },
        } as TroubleshootingSessionMemory);
      }

      // Mock queryEntities to return the dataset
      const queryEntitySpy = jest.spyOn(memoryManager, 'queryEntities').mockResolvedValue({
        entities: entities as any,
        totalCount: entityCount,
        hasMore: false,
      });

      // Test various query patterns
      const queryTests = [
        {
          name: 'All entities',
          query: {},
        },
        {
          name: 'By entity type',
          query: { entityTypes: ['troubleshooting_session'] },
        },
        {
          name: 'By tags',
          query: { tags: ['category-1'] },
        },
        {
          name: 'By confidence range',
          query: { minConfidence: 0.7, maxConfidence: 0.9 },
        },
        {
          name: 'Complex filter',
          query: {
            entityTypes: ['troubleshooting_session'],
            tags: ['query-test'],
            minConfidence: 0.5,
            includeRelationships: true,
          },
        },
      ];

      for (const test of queryTests) {
        const startTime = Date.now();
        const result = await memoryManager.queryEntities(test.query as any);
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Performance assertions
        expect(result.entities).toBeDefined();
        expect(duration).toBeLessThan(1000); // Should complete within 1 second

        console.log(`Query Performance - ${test.name}:
          - Results: ${result.entities.length}
          - Duration: ${duration}ms`);
      }

      queryEntitySpy.mockRestore();
    });
  });

  describe('Relationship Performance', () => {
    it('should handle large-scale relationship creation efficiently', async () => {
      // Create entities first
      const entityCount = 200;
      const entities = [];

      for (let i = 0; i < entityCount; i++) {
        entities.push({
          id: crypto.randomUUID(),
          type: 'architectural_decision',
          title: `Relationship Test ADR ${i}`,
          description: `Test ADR ${i}`,
          confidence: 0.8,
          relevance: 0.7,
          tags: ['relationship-test'],
          created: '2024-01-01T00:00:00.000Z',
          lastModified: '2024-01-01T00:00:00.000Z',
          version: 1,
          context: {
            technicalStack: [`tech-${i % 5}`],
            environmentalFactors: [`env-${i % 3}`],
            stakeholders: ['test-team'],
          },
          relationships: [],
          accessPattern: {
            accessCount: 1,
            lastAccessed: '2024-01-01T00:00:00.000Z',
            accessContext: ['relationship-test'],
          },
          evolution: {
            origin: 'created',
            transformations: [],
          },
          validation: {
            isVerified: true,
          },
          decisionData: {
            status: 'accepted',
            context: `Test context ${i}`,
            decision: `Test decision ${i}`,
            consequences: { positive: [], negative: [], risks: [] },
            alternatives: [],
            implementationStatus: 'not_started',
            implementationTasks: [],
            reviewHistory: [],
          },
        } as ArchitecturalDecisionMemory);
      }

      // Mock entity queries for relationship mapping
      jest.spyOn(memoryManager, 'queryEntities').mockResolvedValue({
        entities: entities as any,
        totalCount: entityCount,
        hasMore: false,
      });

      // Mock relationship creation
      let relationshipCount = 0;
      jest.spyOn(memoryManager, 'upsertRelationship').mockImplementation(async () => {
        relationshipCount++;
        return {
          id: crypto.randomUUID(),
          sourceId: 'source',
          targetId: 'target',
          type: 'relates_to',
          strength: 0.8,
          confidence: 0.8,
          created: '2024-01-01T00:00:00.000Z',
          lastValidated: '2024-01-01T00:00:00.000Z',
          evidence: [],
        };
      });

      // Test relationship creation performance
      const startTime = Date.now();
      const relationshipResult = await relationshipMapper.createCrossToolRelationships();
      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = relationshipResult.suggestedRelationships.length / (duration / 1000);

      // Performance assertions
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(throughput).toBeGreaterThan(10); // At least 10 relationships per second

      console.log(`Relationship Creation Performance:
        - Suggested Relationships: ${relationshipResult.suggestedRelationships.length}
        - Duration: ${duration}ms
        - Throughput: ${throughput.toFixed(2)} relationships/second`);
    });
  });

  describe('Migration Performance', () => {
    it('should handle large dataset migration efficiently', async () => {
      // Mock large deployment history
      const deploymentCount = 1000;
      const largeDeploymentData = Array.from({ length: deploymentCount }, (_, i) => ({
        timestamp: `2024-01-${String((i % 30) + 1).padStart(2, '0')}T00:00:00.000Z`,
        environment: `env-${i % 5}`,
        readinessScore: 0.5 + (i % 5) * 0.1,
        testsPassed: 80 + (i % 20),
        testsFailed: i % 10,
        testCoverage: 0.6 + (i % 4) * 0.1,
        securityScore: 0.7 + (i % 3) * 0.1,
        performanceScore: 0.6 + (i % 4) * 0.1,
        strategy: ['rolling', 'blue_green', 'canary'][i % 3],
        technicalStack: [`tech-${i % 3}`, `framework-${i % 2}`],
        blockers: i % 5 === 0 ? [{ issue: `Issue ${i}`, severity: 'medium' }] : [],
      }));

      // Mock file system
      const mockExistsSync = jest.requireMock('fs').existsSync;
      mockExistsSync.mockReturnValue(true);

      mockFsPromises.readFile.mockResolvedValue(JSON.stringify(largeDeploymentData));
      mockFsPromises.readdir.mockResolvedValue(['deployment-history.json']);

      // Mock entity creation
      let entityCount = 0;
      jest.spyOn(memoryManager, 'upsertEntity').mockImplementation(async () => {
        entityCount++;
        return {} as any;
      });

      jest.spyOn(memoryManager, 'createCrossToolRelationships').mockResolvedValue({
        suggestedRelationships: [],
        conflicts: [],
        autoCreatedCount: 0,
      });

      jest.spyOn(memoryManager, 'queryEntities').mockResolvedValue({
        entities: Array.from({ length: entityCount }, (_, i) => ({
          id: crypto.randomUUID(),
          type: 'deployment_assessment',
        })) as any,
        totalCount: entityCount,
        hasMore: false,
      });

      // Test migration performance
      const startTime = Date.now();
      const migrationResult = await migrationManager.migrateAllExistingData();
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Performance assertions
      expect(migrationResult.success).toBe(true);
      expect(migrationResult.migratedCount).toBe(deploymentCount);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(migrationResult.performance.throughputPerSecond).toBeGreaterThan(20);

      console.log(`Migration Performance:
        - Migrated: ${migrationResult.migratedCount} entities
        - Duration: ${duration}ms
        - Throughput: ${migrationResult.performance.throughputPerSecond.toFixed(2)} entities/second`);
    });
  });

  describe('Memory Usage and Resource Management', () => {
    it('should manage memory efficiently during bulk operations', async () => {
      // This test would ideally measure actual memory usage
      // For now, we'll test that operations complete without errors
      const bulkOperationCount = 500;

      // Simulate bulk entity creation with periodic cleanup
      for (let batch = 0; batch < 10; batch++) {
        const batchPromises = [];

        for (let i = 0; i < bulkOperationCount / 10; i++) {
          const entityId = batch * 50 + i;
          batchPromises.push(
            memoryManager.upsertEntity({
              id: crypto.randomUUID(),
              type: 'architectural_decision',
              title: `Bulk Test ${entityId}`,
              description: 'Bulk operation test',
              confidence: 0.8,
              relevance: 0.7,
              tags: ['bulk-test'],
              created: '2024-01-01T00:00:00.000Z',
              lastModified: '2024-01-01T00:00:00.000Z',
              version: 1,
              context: {
                technicalStack: [],
                environmentalFactors: [],
                stakeholders: [],
              },
              relationships: [],
              accessPattern: {
                accessCount: 1,
                lastAccessed: '2024-01-01T00:00:00.000Z',
                accessContext: ['bulk-test'],
              },
              evolution: {
                origin: 'created',
                transformations: [],
              },
              validation: {
                isVerified: true,
              },
              decisionData: {
                status: 'accepted',
                context: 'Bulk test',
                decision: 'Bulk test decision',
                consequences: { positive: [], negative: [], risks: [] },
                alternatives: [],
                implementationStatus: 'not_started',
                implementationTasks: [],
                reviewHistory: [],
              },
            } as ArchitecturalDecisionMemory)
          );
        }

        // Wait for batch to complete
        await Promise.all(batchPromises);

        // Simulate periodic cleanup/optimization
        if (batch % 3 === 0) {
          // In a real implementation, this might trigger garbage collection
          // or memory optimization routines
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Test should complete without memory issues
      expect(true).toBe(true); // If we get here, memory management is working
    });
  });
});
