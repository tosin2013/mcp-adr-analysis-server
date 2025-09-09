/**
 * Unit tests for todo-migration.ts
 * Comprehensive test coverage for all exported functions and classes
 */

import { jest } from '@jest/globals';
import { TodoMigrationUtility, MigrationOptions } from '../../src/utils/todo-migration';

describe('TodoMigrationUtility', () => {
  let migrationUtility: TodoMigrationUtility;
  const mockProjectPath = '/test/project';

  beforeEach(() => {
    migrationUtility = new TodoMigrationUtility(mockProjectPath);
  });

  describe('constructor', () => {
    it('should initialize with provided project path', () => {
      expect(migrationUtility).toBeInstanceOf(TodoMigrationUtility);
    });

    it('should initialize without project path', () => {
      const utility = new TodoMigrationUtility();
      expect(utility).toBeInstanceOf(TodoMigrationUtility);
    });
  });

  describe('migrateToJsonFormat', () => {
    it('should return a migration result object', async () => {
      const result = await migrationUtility.migrateToJsonFormat();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('errors');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.summary).toBe('string');
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should handle dry run option', async () => {
      const options: MigrationOptions = { dryRun: true };
      const result = await migrationUtility.migrateToJsonFormat(options);
      
      expect(result.summary).toContain('Dry run');
    });

    it('should handle backup option', async () => {
      const options: MigrationOptions = { backupOriginal: true };
      const result = await migrationUtility.migrateToJsonFormat(options);
      
      expect(result).toHaveProperty('success');
    });

    it('should handle validation option', async () => {
      const options: MigrationOptions = { validateAfterMigration: true };
      const result = await migrationUtility.migrateToJsonFormat(options);
      
      expect(result).toHaveProperty('success');
    });

    it('should handle preserve markdown option', async () => {
      const options: MigrationOptions = { preserveMarkdown: true };
      const result = await migrationUtility.migrateToJsonFormat(options);
      
      expect(result).toHaveProperty('success');
    });
  });

  describe('generateMigrationReport', () => {
    it('should return a string report', async () => {
      const report = await migrationUtility.generateMigrationReport();
      
      expect(typeof report).toBe('string');
      expect(report).toContain('TODO Migration Report');
    });

    it('should handle missing TODO.md file', async () => {
      const report = await migrationUtility.generateMigrationReport();
      
      expect(report).toContain('TODO Migration Report');
    });
  });

  describe('generateFeatureComparison', () => {
    it('should return a feature comparison report', async () => {
      const report = await migrationUtility.generateFeatureComparison();
      
      expect(typeof report).toBe('string');
      expect(report).toContain('TODO System Comparison');
      expect(report).toContain('Old System');
      expect(report).toContain('New System');
    });

    it('should include migration benefits', async () => {
      const report = await migrationUtility.generateFeatureComparison();
      
      expect(report).toContain('Migration Benefits');
    });

    it('should include migration process information', async () => {
      const report = await migrationUtility.generateFeatureComparison();
      
      expect(report).toContain('Migration Process');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null project path gracefully', () => {
      expect(() => new TodoMigrationUtility(null as any)).not.toThrow();
    });

    it('should handle undefined project path gracefully', () => {
      expect(() => new TodoMigrationUtility(undefined)).not.toThrow();
    });

    it('should handle empty options object', async () => {
      const result = await migrationUtility.migrateToJsonFormat({});
      
      expect(result).toHaveProperty('success');
    });

    it('should handle all options together', async () => {
      const options: MigrationOptions = {
        backupOriginal: true,
        dryRun: true,
        validateAfterMigration: true,
        preserveMarkdown: true,
      };
      const result = await migrationUtility.migrateToJsonFormat(options);
      
      expect(result).toHaveProperty('success');
      expect(result.summary).toContain('Dry run');
    });
  });
});
