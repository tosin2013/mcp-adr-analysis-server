import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TodoFileWatcher } from '../../src/utils/todo-file-watcher.js';

describe('TodoFileWatcher (Deprecated)', () => {
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Constructor', () => {
    it('should show deprecation warning', () => {
      expect(() => new TodoFileWatcher()).toThrow(
        'TodoFileWatcher was removed - use mcp-shrimp-task-manager for task management'
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('TodoFileWatcher is deprecated')
      );
    });

    it('should throw error when attempting to instantiate', () => {
      expect(() => new TodoFileWatcher()).toThrow();
    });
  });

  describe('Instance Methods', () => {
    it('should throw error for watch method when called on prototype', () => {
      const instance = Object.create(TodoFileWatcher.prototype);
      expect(() => instance.watch()).toThrow(
        'TodoFileWatcher was removed - use mcp-shrimp-task-manager for task management'
      );
    });

    it('should throw error for stop method when called on prototype', () => {
      const instance = Object.create(TodoFileWatcher.prototype);
      expect(() => instance.stop()).toThrow(
        'TodoFileWatcher was removed - use mcp-shrimp-task-manager for task management'
      );
    });
  });

  describe('Static Methods', () => {
    it('should throw error for create static method', () => {
      expect(() => TodoFileWatcher.create()).toThrow(
        'TodoFileWatcher was removed - use mcp-shrimp-task-manager for task management'
      );
    });
  });

  describe('Error Messages', () => {
    it('should provide consistent error message across all methods', () => {
      const expectedMessage =
        'TodoFileWatcher was removed - use mcp-shrimp-task-manager for task management';

      expect(() => new TodoFileWatcher()).toThrow(expectedMessage);
      expect(() => TodoFileWatcher.create()).toThrow(expectedMessage);

      const instance = Object.create(TodoFileWatcher.prototype);
      expect(() => instance.watch()).toThrow(expectedMessage);
      expect(() => instance.stop()).toThrow(expectedMessage);
    });

    it('should include migration information in warning', () => {
      try {
        new TodoFileWatcher();
      } catch {
        // Error is expected
      }

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('mcp-shrimp-task-manager')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('migration guide'));
    });
  });

  describe('Class Structure', () => {
    it('should be a proper class with expected methods', () => {
      expect(typeof TodoFileWatcher).toBe('function');
      expect(TodoFileWatcher.prototype.watch).toBeDefined();
      expect(TodoFileWatcher.prototype.stop).toBeDefined();
      expect(TodoFileWatcher.create).toBeDefined();
    });

    it('should have correct method types', () => {
      expect(typeof TodoFileWatcher.prototype.watch).toBe('function');
      expect(typeof TodoFileWatcher.prototype.stop).toBe('function');
      expect(typeof TodoFileWatcher.create).toBe('function');
    });
  });

  describe('Import/Export', () => {
    it('should be importable as named export', () => {
      expect(TodoFileWatcher).toBeDefined();
      expect(TodoFileWatcher.name).toBe('TodoFileWatcher');
    });

    it('should maintain class identity', () => {
      expect(TodoFileWatcher.prototype.constructor).toBe(TodoFileWatcher);
    });
  });

  describe('Deprecation Behavior', () => {
    it('should consistently block usage across all entry points', () => {
      // Constructor
      expect(() => new TodoFileWatcher()).toThrow();

      // Static factory
      expect(() => TodoFileWatcher.create()).toThrow();

      // Instance methods (called on prototype)
      const instance = Object.create(TodoFileWatcher.prototype);
      expect(() => instance.watch()).toThrow();
      expect(() => instance.stop()).toThrow();
    });

    it('should provide clear migration path in error messages', () => {
      const errors: string[] = [];

      try {
        new TodoFileWatcher();
      } catch (e) {
        errors.push((e as Error).message);
      }
      try {
        TodoFileWatcher.create();
      } catch (e) {
        errors.push((e as Error).message);
      }

      const instance = Object.create(TodoFileWatcher.prototype);
      try {
        instance.watch();
      } catch (e) {
        errors.push((e as Error).message);
      }
      try {
        instance.stop();
      } catch (e) {
        errors.push((e as Error).message);
      }

      errors.forEach(error => {
        expect(error).toContain('mcp-shrimp-task-manager');
      });
    });
  });
});
