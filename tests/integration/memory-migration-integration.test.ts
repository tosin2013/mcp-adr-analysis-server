/**
 * Memory Migration Integration Tests
 *
 * Comprehensive test suite for memory migration and data integrity validation.
 * Tests migration from legacy systems to memory entities with rollback capabilities.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MemoryMigrationManager } from '../../src/utils/memory-migration-manager.js';
import { MemoryEntityManager } from '../../src/utils/memory-entity-manager.js';
import * as fs from 'fs/promises';
import * as path from 'path';

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
  existsSync: jest.fn(),
}));

jest.mock('fs/promises', () => mockFsPromises);

// Mock crypto
const mockCrypto = {
  randomUUID: jest.fn(() => 'test-uuid-123'),
};

jest.mock('crypto', () => mockCrypto);

describe('Memory Migration Integration', () => {
  let memoryManager: MemoryEntityManager;
  let migrationManager: MemoryMigrationManager;
  let mockDate: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock date to be consistent
    mockDate = jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2024-01-01T00:00:00.000Z');
    jest.spyOn(Date, 'now').mockReturnValue(1704067200000); // 2024-01-01

    // Reset crypto mock
    mockCrypto.randomUUID.mockReturnValue('test-uuid-123');

    // Mock filesystem operations
    mockFsPromises.access.mockResolvedValue(undefined);
    mockFsPromises.mkdir.mockResolvedValue(undefined);
    mockFsPromises.readFile.mockRejectedValue(new Error('ENOENT'));
    mockFsPromises.writeFile.mockResolvedValue(undefined);
    mockFsPromises.copyFile.mockResolvedValue(undefined);
    mockFsPromises.readdir.mockResolvedValue([]);

    // Mock existsSync
    const mockExistsSync = jest.requireMock('fs').existsSync;
    mockExistsSync.mockReturnValue(false);

    memoryManager = new MemoryEntityManager();
    migrationManager = new MemoryMigrationManager(memoryManager);
  });

  afterEach(() => {
    mockDate.mockRestore();
  });

  describe('Complete Migration Flow', () => {
    it('should migrate deployment history successfully', async () => {
      // Mock deployment history data
      const deploymentHistory = [
        {
          timestamp: '2024-01-01T00:00:00.000Z',
          environment: 'production',
          readinessScore: 0.85,
          testsPassed: 120,
          testsFailed: 5,
          testCoverage: 0.8,
          securityScore: 0.9,
          performanceScore: 0.8,
          strategy: 'blue_green',
          blockers: [
            {
              issue: 'Minor security vulnerability',
              severity: 'low',
              category: 'security',
            },
          ],
          technicalStack: ['node.js', 'postgresql'],
        },
        {
          timestamp: '2024-01-02T00:00:00.000Z',
          environment: 'staging',
          readinessScore: 0.6,
          testsPassed: 80,
          testsFailed: 20,
          testCoverage: 0.6,
          securityScore: 0.7,
          performanceScore: 0.5,
          strategy: 'rolling',
          blockers: [
            {
              issue: 'Database connection issues',
              severity: 'high',
              category: 'configuration',
            },
          ],
          technicalStack: ['node.js', 'postgresql'],
        },
      ];

      // Mock file system for deployment history
      const mockExistsSync = jest.requireMock('fs').existsSync;
      mockExistsSync.mockImplementation((path: string) => {
        // Return true for paths that should exist during migration
        return (
          path.includes('deployment-history.json') ||
          path.includes('.mcp-adr-cache') ||
          path.includes('docs')
        );
      });

      mockFsPromises.readFile.mockImplementation(async (path: string) => {
        if (path.includes('deployment-history.json')) {
          return JSON.stringify(deploymentHistory);
        }
        throw new Error('ENOENT');
      });

      mockFsPromises.readdir.mockImplementation(async (path: string) => {
        if (path.includes('.mcp-adr-cache')) {
          return ['deployment-history.json'];
        }
        if (path.includes('docs')) {
          return [];
        }
        return [];
      });

      // Mock upsertEntity to track calls
      const upsertEntitySpy = jest.spyOn(memoryManager, 'upsertEntity').mockResolvedValue({
        id: 'test-uuid-123',
        type: 'deployment_assessment',
        title: 'Test Entity',
        description: 'Test description',
        confidence: 0.8,
        relevance: 0.7,
        tags: [],
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
          accessContext: [],
        },
        evolution: {
          origin: 'created',
          transformations: [],
        },
        validation: {
          isVerified: true,
        },
      } as any);

      // Mock createCrossToolRelationships
      jest.spyOn(memoryManager, 'createCrossToolRelationships').mockResolvedValue({
        suggestedRelationships: [],
        conflicts: [],
        autoCreatedCount: 0,
      });

      // Mock queryEntities for validation
      jest.spyOn(memoryManager, 'queryEntities').mockResolvedValue({
        entities: [
          { id: 'entity-1', type: 'deployment_assessment', title: 'Test' },
          { id: 'entity-2', type: 'deployment_assessment', title: 'Test' },
        ] as any,
        totalCount: 2,
        hasMore: false,
      });

      // Run migration
      const result = await migrationManager.migrateAllExistingData();

      // Verify results
      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(2); // Two deployment records
      expect(result.failedCount).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.performance.throughputPerSecond).toBeGreaterThan(0);

      // Verify entity creation calls
      expect(upsertEntitySpy).toHaveBeenCalledTimes(2);

      // Verify first deployment entity
      const firstEntityCall = upsertEntitySpy.mock.calls[0][0];
      expect(firstEntityCall.type).toBe('deployment_assessment');
      expect(firstEntityCall.tags).toContain('migrated');
      expect(firstEntityCall.assessmentData.environment).toBe('production');
      expect(firstEntityCall.assessmentData.readinessScore).toBe(0.85);
      expect(firstEntityCall.evolution.origin).toBe('imported');

      // Verify second deployment entity
      const secondEntityCall = upsertEntitySpy.mock.calls[1][0];
      expect(secondEntityCall.type).toBe('deployment_assessment');
      expect(secondEntityCall.assessmentData.environment).toBe('staging');
      expect(secondEntityCall.assessmentData.readinessScore).toBe(0.6);

      upsertEntitySpy.mockRestore();
    });

    it('should migrate ADR markdown files successfully', async () => {
      // Mock ADR markdown files
      const adrFiles = ['001-database-choice.md', '002-frontend-framework.md'];
      const adrContent1 = `# Database Technology Choice

## Status
Accepted

## Context
We need to choose a database technology for our new application. The system requires ACID compliance and complex queries.

## Decision
We will use PostgreSQL as our primary database technology.

## Consequences

### Positive
- Strong ACID compliance
- Rich query language
- Excellent performance for complex queries

### Negative
- More complex scaling compared to NoSQL
- Higher operational overhead

### Risks
- Single point of failure if not properly configured
- Learning curve for team members unfamiliar with SQL

## Alternatives

### MongoDB
Document-based NoSQL database
- Easier horizontal scaling
- Flexible schema
- But eventual consistency model doesn't meet our requirements
`;

      const adrContent2 = `# Frontend Framework Selection

## Status
Accepted

## Context
We need a modern frontend framework for building our user interface.

## Decision
Use React with TypeScript for frontend development.

## Consequences

### Positive
- Large ecosystem and community
- Strong typing with TypeScript
- Good performance with virtual DOM

### Negative
- Steep learning curve for new developers
- Frequent updates and changes

## Alternatives

### Vue.js
Progressive framework
- Easier learning curve
- Good documentation
- But smaller ecosystem
`;

      // Mock file system
      const mockExistsSync = jest.requireMock('fs').existsSync;
      mockExistsSync.mockReturnValue(true);

      mockFsPromises.readdir.mockResolvedValueOnce(adrFiles);
      mockFsPromises.readFile.mockResolvedValueOnce(adrContent1).mockResolvedValueOnce(adrContent2);

      // Mock upsertEntity
      const upsertEntitySpy = jest
        .spyOn(memoryManager, 'upsertEntity')
        .mockResolvedValue({} as any);

      // Mock other required methods
      jest.spyOn(memoryManager, 'createCrossToolRelationships').mockResolvedValue({
        suggestedRelationships: [],
        conflicts: [],
        autoCreatedCount: 0,
      });

      jest.spyOn(memoryManager, 'queryEntities').mockResolvedValue({
        entities: [
          { id: 'adr-1', type: 'architectural_decision', title: 'Database Choice' },
          { id: 'adr-2', type: 'architectural_decision', title: 'Frontend Framework' },
        ] as any,
        totalCount: 2,
        hasMore: false,
      });

      // Run migration
      const result = await migrationManager.migrateAllExistingData();

      // Verify results
      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(2);
      expect(upsertEntitySpy).toHaveBeenCalledTimes(2);

      // Verify ADR entity structure
      const firstAdrCall = upsertEntitySpy.mock.calls[0][0];
      expect(firstAdrCall.type).toBe('architectural_decision');
      expect(firstAdrCall.title).toBe('Database Technology Choice');
      expect(firstAdrCall.decisionData.status).toBe('accepted');
      expect(firstAdrCall.decisionData.decision).toContain('PostgreSQL');
      expect(firstAdrCall.decisionData.consequences.positive).toContain('Strong ACID compliance');
      expect(firstAdrCall.decisionData.alternatives).toHaveLength(1);
      expect(firstAdrCall.decisionData.alternatives[0].name).toBe('MongoDB');

      const secondAdrCall = upsertEntitySpy.mock.calls[1][0];
      expect(secondAdrCall.type).toBe('architectural_decision');
      expect(secondAdrCall.title).toBe('Frontend Framework Selection');
      expect(secondAdrCall.decisionData.decision).toContain('React with TypeScript');

      upsertEntitySpy.mockRestore();
    });

    it('should handle migration errors gracefully', async () => {
      // Mock file system to simulate some failures
      const mockExistsSync = jest.requireMock('fs').existsSync;
      mockExistsSync.mockReturnValue(true);

      // First file succeeds, second fails
      mockFsPromises.readFile
        .mockResolvedValueOnce('{"deployments": [{"environment": "prod"}]}')
        .mockRejectedValueOnce(new Error('File read error'));

      mockFsPromises.readdir
        .mockResolvedValueOnce(['deployment-history.json'])
        .mockResolvedValueOnce(['001-valid.md', '002-invalid.md']);

      // Mock upsertEntity to succeed for valid data, fail for invalid
      const upsertEntitySpy = jest
        .spyOn(memoryManager, 'upsertEntity')
        .mockResolvedValueOnce({} as any)
        .mockRejectedValueOnce(new Error('Entity validation error'));

      jest.spyOn(memoryManager, 'createCrossToolRelationships').mockResolvedValue({
        suggestedRelationships: [],
        conflicts: [],
        autoCreatedCount: 0,
      });

      jest.spyOn(memoryManager, 'queryEntities').mockResolvedValue({
        entities: [{ id: 'entity-1', type: 'deployment_assessment' }] as any,
        totalCount: 1,
        hasMore: false,
      });

      // Run migration
      const result = await migrationManager.migrateAllExistingData();

      // Should still succeed overall but record errors
      expect(result.success).toBe(true); // Overall success despite individual failures
      expect(result.migratedCount).toBeGreaterThan(0);
      expect(result.failedCount).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);

      upsertEntitySpy.mockRestore();
    });

    it('should create backup and rollback plan', async () => {
      // Mock file system
      const mockExistsSync = jest.requireMock('fs').existsSync;
      mockExistsSync.mockReturnValue(true);

      mockFsPromises.readdir.mockResolvedValue([]);

      jest.spyOn(memoryManager, 'createCrossToolRelationships').mockResolvedValue({
        suggestedRelationships: [],
        conflicts: [],
        autoCreatedCount: 0,
      });

      jest.spyOn(memoryManager, 'queryEntities').mockResolvedValue({
        entities: [],
        totalCount: 0,
        hasMore: false,
      });

      // Enable backup and rollback
      const migrationManagerWithBackup = new MemoryMigrationManager(memoryManager, {
        enableBackup: true,
        enableRollback: true,
      });

      // Run migration
      const result = await migrationManagerWithBackup.migrateAllExistingData();

      // Verify backup creation
      expect(result.backupPath).toBeDefined();
      expect(result.rollbackPlan).toBeDefined();
      expect(mockFsPromises.mkdir).toHaveBeenCalled();
      expect(mockFsPromises.writeFile).toHaveBeenCalled();

      // Verify backup manifest and rollback plan were written
      const writeFileCalls = (mockFsPromises.writeFile as jest.Mock).mock.calls;
      const manifestCall = writeFileCalls.find(call => call[0].includes('backup-manifest.json'));
      const rollbackCall = writeFileCalls.find(call => call[0].includes('rollback-plan.md'));

      expect(manifestCall).toBeDefined();
      expect(rollbackCall).toBeDefined();
    });

    it('should validate migration integrity', async () => {
      // Mock successful migration with validation
      const mockExistsSync = jest.requireMock('fs').existsSync;
      mockExistsSync.mockReturnValue(true);

      const deploymentData = [{ environment: 'test', readinessScore: 0.8 }];
      mockFsPromises.readFile.mockResolvedValue(JSON.stringify(deploymentData));
      mockFsPromises.readdir.mockResolvedValue(['deployment-history.json']);

      jest.spyOn(memoryManager, 'upsertEntity').mockResolvedValue({} as any);
      jest.spyOn(memoryManager, 'createCrossToolRelationships').mockResolvedValue({
        suggestedRelationships: [],
        conflicts: [],
        autoCreatedCount: 0,
      });

      // Mock validation query
      jest.spyOn(memoryManager, 'queryEntities').mockResolvedValue({
        entities: [
          {
            id: 'valid-entity-1',
            type: 'deployment_assessment',
            title: 'Valid Entity',
            description: 'Test',
            confidence: 0.8,
            relevance: 0.7,
            tags: [],
            created: '2024-01-01T00:00:00.000Z',
            lastModified: '2024-01-01T00:00:00.000Z',
            version: 1,
          },
        ] as any,
        totalCount: 1,
        hasMore: false,
      });

      // Enable validation
      const migrationManagerWithValidation = new MemoryMigrationManager(memoryManager, {
        validateIntegrity: true,
      });

      // Run migration
      const result = await migrationManagerWithValidation.migrateAllExistingData();

      // Verify validation passed
      expect(result.success).toBe(true);
      expect(result.errors.filter(e => e.source === 'validation')).toHaveLength(0);
    });

    it('should handle performance monitoring', async () => {
      // Mock large dataset migration
      const mockExistsSync = jest.requireMock('fs').existsSync;
      mockExistsSync.mockReturnValue(true);

      const largeDeploymentData = Array.from({ length: 100 }, (_, i) => ({
        environment: `env-${i}`,
        readinessScore: 0.8,
        timestamp: `2024-01-${String((i % 30) + 1).padStart(2, '0')}T00:00:00.000Z`,
      }));

      mockFsPromises.readFile.mockResolvedValue(JSON.stringify(largeDeploymentData));
      mockFsPromises.readdir.mockResolvedValue(['deployment-history.json']);

      jest.spyOn(memoryManager, 'upsertEntity').mockResolvedValue({} as any);
      jest.spyOn(memoryManager, 'createCrossToolRelationships').mockResolvedValue({
        suggestedRelationships: [],
        conflicts: [],
        autoCreatedCount: 0,
      });

      jest.spyOn(memoryManager, 'queryEntities').mockResolvedValue({
        entities: largeDeploymentData.map((_, i) => ({
          id: `entity-${i}`,
          type: 'deployment_assessment',
          title: `Entity ${i}`,
        })) as any,
        totalCount: largeDeploymentData.length,
        hasMore: false,
      });

      // Run migration
      const result = await migrationManagerWithValidation.migrateAllExistingData();

      // Verify performance metrics
      expect(result.performance.startTime).toBeDefined();
      expect(result.performance.endTime).toBeDefined();
      expect(result.performance.durationMs).toBeGreaterThan(0);
      expect(result.performance.throughputPerSecond).toBeGreaterThan(0);
      expect(result.migratedCount).toBe(100);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing data sources gracefully', async () => {
      // Mock non-existent files
      const mockExistsSync = jest.requireMock('fs').existsSync;
      mockExistsSync.mockReturnValue(false);

      jest.spyOn(memoryManager, 'createCrossToolRelationships').mockResolvedValue({
        suggestedRelationships: [],
        conflicts: [],
        autoCreatedCount: 0,
      });

      jest.spyOn(memoryManager, 'queryEntities').mockResolvedValue({
        entities: [],
        totalCount: 0,
        hasMore: false,
      });

      // Run migration
      const result = await migrationManager.migrateAllExistingData();

      // Should succeed with no migrations
      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });

    it('should handle corrupted JSON data', async () => {
      const mockExistsSync = jest.requireMock('fs').existsSync;
      mockExistsSync.mockReturnValue(true);

      // Mock corrupted JSON
      mockFsPromises.readFile.mockResolvedValue('{ invalid json }');
      mockFsPromises.readdir.mockResolvedValue(['deployment-history.json']);

      jest.spyOn(memoryManager, 'createCrossToolRelationships').mockResolvedValue({
        suggestedRelationships: [],
        conflicts: [],
        autoCreatedCount: 0,
      });

      jest.spyOn(memoryManager, 'queryEntities').mockResolvedValue({
        entities: [],
        totalCount: 0,
        hasMore: false,
      });

      // Run migration
      const result = await migrationManager.migrateAllExistingData();

      // Should record errors but not crash
      expect(result.success).toBe(true); // Overall success with recorded errors
      expect(result.failedCount).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].error).toContain('JSON');
    });
  });
});
