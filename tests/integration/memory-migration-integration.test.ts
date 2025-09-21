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
import * as os from 'os';
import { existsSync } from 'fs';

// Mock crypto
const mockCrypto = {
  randomUUID: jest.fn(() => 'test-uuid-123'),
};

jest.mock('crypto', () => mockCrypto);

describe('Memory Migration Integration', () => {
  let memoryManager: MemoryEntityManager;
  let migrationManager: MemoryMigrationManager;
  let mockDate: jest.SpyInstance;
  let testTempDir: string;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock date to be consistent
    mockDate = jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2024-01-01T00:00:00.000Z');

    // Create temporary directory for test files
    testTempDir = path.join('/tmp', `mcp-test-${Date.now()}`);
    await fs.mkdir(testTempDir, { recursive: true });
    await fs.mkdir(path.join(testTempDir, '.mcp-adr-cache'), { recursive: true });
    await fs.mkdir(path.join(testTempDir, 'docs', 'adrs'), { recursive: true });

    memoryManager = new MemoryEntityManager();
  });

  afterEach(async () => {
    mockDate.mockRestore();
    // Clean up environment variables
    delete process.env['PROJECT_PATH'];

    // Clean up temporary directory
    if (testTempDir && existsSync(testTempDir)) {
      await fs.rm(testTempDir, { recursive: true, force: true });
    }

    // Clean up cache directory in os.tmpdir()
    if (testTempDir) {
      const projectName = path.basename(testTempDir);
      const cacheDir = path.join(os.tmpdir(), projectName);
      if (existsSync(cacheDir)) {
        await fs.rm(cacheDir, { recursive: true, force: true });
      }
    }
  });

  describe('Complete Migration Flow', () => {
    it('should migrate deployment history successfully', async () => {
      // Set PROJECT_PATH to our test temp directory
      process.env['PROJECT_PATH'] = testTempDir;

      // Initialize migration manager AFTER setting environment variable
      migrationManager = new MemoryMigrationManager(memoryManager, {
        enableBackup: false,
        validateIntegrity: false,
        enableRollback: false,
      });

      // Create deployment history data and write to expected file location
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

      // Write real deployment history file to the expected cache location
      // Migration manager uses: os.tmpdir() + projectName + 'cache'
      const projectName = path.basename(testTempDir);
      const cacheDir = path.join(os.tmpdir(), projectName, 'cache');
      await fs.mkdir(cacheDir, { recursive: true });
      const deploymentHistoryPath = path.join(cacheDir, 'deployment-history.json');
      await fs.writeFile(deploymentHistoryPath, JSON.stringify(deploymentHistory, null, 2));

      // Mock upsertEntity to track calls and return success
      const upsertEntitySpy = jest
        .spyOn(memoryManager, 'upsertEntity')
        .mockImplementation(async entity => {
          // Return the entity with a guaranteed UUID to simulate successful creation
          return {
            ...entity,
            id: mockCrypto.randomUUID(),
          };
        });

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

      // Verify the entities have correct structure
      const firstCall = upsertEntitySpy.mock.calls[0][0];
      expect(firstCall.type).toBe('deployment_assessment');
      expect(firstCall.title).toContain('production');
      expect(firstCall.assessmentData.readinessScore).toBe(0.85);

      const secondCall = upsertEntitySpy.mock.calls[1][0];
      expect(secondCall.type).toBe('deployment_assessment');
      expect(secondCall.title).toContain('staging');
      expect(secondCall.assessmentData.readinessScore).toBe(0.6);
    });

    it('should handle migration errors gracefully', async () => {
      // Set PROJECT_PATH to our test temp directory
      process.env['PROJECT_PATH'] = testTempDir;

      // Initialize migration manager
      migrationManager = new MemoryMigrationManager(memoryManager, {
        enableBackup: false,
        validateIntegrity: false,
        enableRollback: false,
      });

      // Create deployment history with some invalid data
      const mixedDeploymentHistory = [
        // Valid deployment
        {
          timestamp: '2024-01-01T00:00:00.000Z',
          environment: 'production',
          readinessScore: 0.85,
          technicalStack: ['node.js'],
        },
        // Invalid deployment (missing required fields)
        {
          timestamp: null,
          environment: undefined,
        },
        // Another valid deployment
        {
          timestamp: '2024-01-03T00:00:00.000Z',
          environment: 'staging',
          readinessScore: 0.7,
          technicalStack: ['python'],
        },
      ];

      // Write deployment history file
      const deploymentHistoryPath = path.join(
        testTempDir,
        '.mcp-adr-cache',
        'deployment-history.json'
      );
      await fs.writeFile(deploymentHistoryPath, JSON.stringify(mixedDeploymentHistory, null, 2));

      // Mock upsertEntity to sometimes fail
      let callCount = 0;
      const _upsertEntitySpy = jest
        .spyOn(memoryManager, 'upsertEntity')
        .mockImplementation(async entity => {
          callCount++;
          // Fail the second entity (with invalid data)
          if (callCount === 2) {
            throw new Error('Invalid entity data');
          }
          return { ...entity, id: mockCrypto.randomUUID() };
        });

      // Mock other methods
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

      // Should still succeed overall but record errors
      expect(result.success).toBe(true); // Overall success despite individual failures
      expect(result.migratedCount).toBeGreaterThan(0);
      expect(result.failedCount).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle large dataset migration with 1000 entities', async () => {
      // Set PROJECT_PATH to our test temp directory
      process.env['PROJECT_PATH'] = testTempDir;

      // Initialize migration manager
      migrationManager = new MemoryMigrationManager(memoryManager, {
        enableBackup: false,
        validateIntegrity: false,
        enableRollback: false,
      });

      // Generate large deployment history
      const largeDeploymentHistory = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: new Date(2024, 0, 1, 0, i).toISOString(),
        environment: i % 2 === 0 ? 'production' : 'staging',
        readinessScore: Math.random() * 0.4 + 0.6, // 0.6 to 1.0
        testsPassed: Math.floor(Math.random() * 50) + 50,
        testsFailed: Math.floor(Math.random() * 10),
        technicalStack: ['node.js', 'postgresql'],
        strategy: i % 3 === 0 ? 'blue_green' : 'rolling',
      }));

      // Write large deployment history file
      const deploymentHistoryPath = path.join(
        testTempDir,
        '.mcp-adr-cache',
        'deployment-history.json'
      );
      await fs.writeFile(deploymentHistoryPath, JSON.stringify(largeDeploymentHistory, null, 2));

      // Mock upsertEntity
      const upsertEntitySpy = jest
        .spyOn(memoryManager, 'upsertEntity')
        .mockImplementation(async entity => ({ ...entity, id: mockCrypto.randomUUID() }));

      // Mock other methods
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

      const startTime = Date.now();

      // Run migration
      const result = await migrationManager.migrateAllExistingData();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify that exactly 1000 entities were processed
      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(1000);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Performance checks
      expect(result.performance.throughputPerSecond).toBeGreaterThan(20); // At least 20 entities/second
      expect(duration).toBeLessThan(60000); // Should complete within 60 seconds

      // Verify all entities were created
      expect(upsertEntitySpy).toHaveBeenCalledTimes(1000);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing data sources gracefully', async () => {
      // Set PROJECT_PATH to our test temp directory
      process.env['PROJECT_PATH'] = testTempDir;

      // Initialize migration manager
      migrationManager = new MemoryMigrationManager(memoryManager, {
        enableBackup: false,
        validateIntegrity: false,
        enableRollback: false,
      });

      // Don't create any data files - all sources should be missing

      // Mock methods (they shouldn't be called)
      const upsertEntitySpy = jest.spyOn(memoryManager, 'upsertEntity');
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

      // Should succeed with no entities migrated
      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toHaveLength(0);

      // No entities should have been created
      expect(upsertEntitySpy).not.toHaveBeenCalled();
    });

    it('should handle corrupted JSON data', async () => {
      // Set PROJECT_PATH to our test temp directory
      process.env['PROJECT_PATH'] = testTempDir;

      // Initialize migration manager
      migrationManager = new MemoryMigrationManager(memoryManager, {
        enableBackup: false,
        validateIntegrity: false,
        enableRollback: false,
      });

      // Write corrupted JSON file
      const deploymentHistoryPath = path.join(
        testTempDir,
        '.mcp-adr-cache',
        'deployment-history.json'
      );
      await fs.writeFile(deploymentHistoryPath, '{ invalid json content');

      // Mock methods
      const upsertEntitySpy = jest.spyOn(memoryManager, 'upsertEntity');
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

      // Should record JSON parsing error but continue processing other sources
      expect(result.success).toBe(true); // Overall migration succeeds despite source error
      expect(result.migratedCount).toBe(0); // No entities migrated from corrupted source
      expect(result.errors.length).toBeGreaterThan(0); // Error should be recorded
      expect(
        result.errors.some(
          e =>
            e.error.includes('JSON') ||
            e.error.includes('parse') ||
            e.error.includes('Unexpected token')
        )
      ).toBe(true);

      // No entities should have been created
      expect(upsertEntitySpy).not.toHaveBeenCalled();
    });

    it('should handle entity validation failures gracefully', async () => {
      // Set PROJECT_PATH to our test temp directory
      process.env['PROJECT_PATH'] = testTempDir;

      // Initialize migration manager
      migrationManager = new MemoryMigrationManager(memoryManager, {
        enableBackup: false,
        validateIntegrity: false,
        enableRollback: false,
      });

      // Create deployment history with valid structure
      const deploymentHistory = [
        {
          timestamp: '2024-01-01T00:00:00.000Z',
          environment: 'production',
          readinessScore: 0.85,
          technicalStack: ['node.js'],
        },
      ];

      // Write deployment history file
      const deploymentHistoryPath = path.join(
        testTempDir,
        '.mcp-adr-cache',
        'deployment-history.json'
      );
      await fs.writeFile(deploymentHistoryPath, JSON.stringify(deploymentHistory, null, 2));

      // Mock upsertEntity to fail validation
      const _upsertEntitySpy = jest
        .spyOn(memoryManager, 'upsertEntity')
        .mockRejectedValue(new Error('Entity validation failed'));

      // Mock other methods
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

      // Should record validation failures
      expect(result.failedCount).toBeGreaterThan(0); // Should fail due to validation
      expect(result.errors.length).toBeGreaterThan(0); // Errors should be recorded
    });

    it('should handle network timeouts and retries', async () => {
      // Set PROJECT_PATH to our test temp directory
      process.env['PROJECT_PATH'] = testTempDir;

      // Initialize migration manager
      migrationManager = new MemoryMigrationManager(memoryManager, {
        enableBackup: false,
        validateIntegrity: false,
        enableRollback: false,
      });

      // Create deployment history
      const deploymentHistory = [
        {
          timestamp: '2024-01-01T00:00:00.000Z',
          environment: 'production',
          readinessScore: 0.85,
          technicalStack: ['node.js'],
        },
      ];

      // Write deployment history file
      const deploymentHistoryPath = path.join(
        testTempDir,
        '.mcp-adr-cache',
        'deployment-history.json'
      );
      await fs.writeFile(deploymentHistoryPath, JSON.stringify(deploymentHistory, null, 2));

      // Mock network timeout
      jest
        .spyOn(memoryManager, 'upsertEntity')
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockImplementation(async entity => ({ ...entity, id: mockCrypto.randomUUID() }));

      // Mock other methods
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

      // Should record network failures appropriately
      expect(result.success).toBe(true); // May still succeed overall
      expect(result.errors.length).toBeGreaterThan(0); // Should record errors
      expect(result.errors[0].error).toContain('timeout');
    });

    it('should handle progress tracking for long operations', async () => {
      // Set PROJECT_PATH to our test temp directory
      process.env['PROJECT_PATH'] = testTempDir;

      // Initialize migration manager
      migrationManager = new MemoryMigrationManager(memoryManager, {
        enableBackup: false,
        validateIntegrity: false,
        enableRollback: false,
      });

      // Create moderately large dataset
      const largeDataset = Array.from({ length: 50 }, (_, i) => ({
        timestamp: new Date(2024, 0, 1, 0, i).toISOString(),
        environment: 'test',
        readinessScore: 0.8,
        technicalStack: ['node.js'],
      }));

      // Write deployment history file
      const deploymentHistoryPath = path.join(
        testTempDir,
        '.mcp-adr-cache',
        'deployment-history.json'
      );
      await fs.writeFile(deploymentHistoryPath, JSON.stringify(largeDataset, null, 2));

      // Track progress
      let progressUpdates = 0;
      jest.spyOn(memoryManager, 'upsertEntity').mockImplementation(async entity => {
        progressUpdates++;
        return { ...entity, id: mockCrypto.randomUUID() };
      });

      // Mock other methods
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

      const startTime = performance.now();
      const result = await migrationManager.migrateAllExistingData();
      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(largeDataset.length);
      expect(progressUpdates).toBe(largeDataset.length);
      expect(duration).toBeGreaterThan(0);
    });
  });
});
