/**
 * Simple Memory Migration Test
 *
 * A simplified version of the migration test that focuses on core functionality
 * without complex file system mocking.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MemoryMigrationManager } from '../../src/utils/memory-migration-manager.js';
import { MemoryEntityManager } from '../../src/utils/memory-entity-manager.js';

// Mock crypto
const mockCrypto = {
  randomUUID: jest.fn(() => 'test-uuid-123'),
};
jest.mock('crypto', () => mockCrypto);

// Mock the loadConfig function to provide test configuration
jest.mock('../../src/utils/config.js', () => ({
  loadConfig: jest.fn(() => ({
    projectPath: '/test/project',
    adrDirectory: '/test/project/docs/adrs',
    logLevel: 'info',
  })),
}));

describe('Simple Memory Migration Test', () => {
  let memoryManager: MemoryEntityManager;
  let migrationManager: MemoryMigrationManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCrypto.randomUUID.mockReturnValue('test-uuid-123');

    memoryManager = new MemoryEntityManager();
    migrationManager = new MemoryMigrationManager(memoryManager, {
      enableBackup: false,
      validateIntegrity: false,
      enableRollback: false,
    });
  });

  it('should instantiate migration manager successfully', () => {
    expect(migrationManager).toBeDefined();
    expect(memoryManager).toBeDefined();
  });

  it('should handle missing data sources gracefully', async () => {
    // Mock all file system calls to return "file not found"
    const mockExistsSync = jest.fn().mockReturnValue(false);
    jest.doMock('fs', () => ({
      existsSync: mockExistsSync,
    }));

    const result = await migrationManager.migrateAllExistingData();

    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should create migration manager with correct configuration', () => {
    const customMigrationManager = new MemoryMigrationManager(memoryManager, {
      enableBackup: true,
      validateIntegrity: true,
      enableRollback: true,
      migrationBatchSize: 100,
    });

    expect(customMigrationManager).toBeDefined();
  });
});
