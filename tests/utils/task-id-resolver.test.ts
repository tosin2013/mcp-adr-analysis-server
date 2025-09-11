/**
 * Tests for TaskIdResolver utility
 */

import { TaskIdResolver } from '../../src/utils/task-id-resolver.js';
import { TodoTask } from '../../src/types/todo-json-schemas.js';

describe('TaskIdResolver', () => {
  let resolver: TaskIdResolver;
  let mockTasks: Record<string, TodoTask>;

  beforeEach(() => {
    resolver = new TaskIdResolver();
    
    // Create mock tasks for testing
    mockTasks = {
      'abcd1234-5678-9012-3456-789012345678': {
        id: 'abcd1234-5678-9012-3456-789012345678',
        title: 'Test Task 1',
        description: 'First test task',
        status: 'pending',
        priority: 'medium',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        archived: false,
        subtasks: [],
        dependencies: [],
        blockedBy: [],
        linkedAdrs: [],
        adrGeneratedTask: false,
        toolExecutions: [],
        scoreWeight: 1,
        scoreCategory: 'task_completion',
        progressPercentage: 0,
        tags: [],
        version: 1,
        changeLog: [],
        comments: []
      },
      'efgh5678-9012-3456-7890-123456789012': {
        id: 'efgh5678-9012-3456-7890-123456789012',
        title: 'Test Task 2',
        description: 'Second test task',
        status: 'in_progress',
        priority: 'high',
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        archived: false,
        subtasks: [],
        dependencies: [],
        blockedBy: [],
        linkedAdrs: [],
        adrGeneratedTask: false,
        toolExecutions: [],
        scoreWeight: 1,
        scoreCategory: 'task_completion',
        progressPercentage: 50,
        tags: [],
        version: 1,
        changeLog: [],
        comments: []
      },
      'abef9999-1111-2222-3333-444444444444': {
        id: 'abef9999-1111-2222-3333-444444444444',
        title: 'Similar ID Task',
        description: 'Task with similar ID prefix',
        status: 'completed',
        priority: 'low',
        createdAt: '2024-01-03T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z',
        archived: false,
        subtasks: [],
        dependencies: [],
        blockedBy: [],
        linkedAdrs: [],
        adrGeneratedTask: false,
        toolExecutions: [],
        scoreWeight: 1,
        scoreCategory: 'task_completion',
        progressPercentage: 100,
        tags: [],
        version: 1,
        changeLog: [],
        comments: []
      }
    };
  });

  describe('validateTaskId', () => {
    it('should validate correct task IDs', () => {
      const result = resolver.validateTaskId('abcd1234');
      expect(result.isValid).toBe(true);
    });

    it('should reject empty task IDs', () => {
      const result = resolver.validateTaskId('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should reject task IDs with spaces', () => {
      const result = resolver.validateTaskId('abc def');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('spaces');
    });

    it('should reject task IDs starting with #', () => {
      const result = resolver.validateTaskId('#abcd1234');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('#');
      expect(result.suggestions).toContain('Try using "abcd1234" instead');
    });

    it('should reject very short non-hex IDs', () => {
      const result = resolver.validateTaskId('xy');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too short');
    });
  });

  describe('resolveTaskId', () => {
    it('should resolve exact task ID matches', () => {
      const fullId = 'abcd1234-5678-9012-3456-789012345678';
      const result = resolver.resolveTaskId(fullId, mockTasks);
      
      expect(result.success).toBe(true);
      expect(result.resolvedId).toBe(fullId);
      expect(result.matches).toHaveLength(1);
      expect(result.matches![0].title).toBe('Test Task 1');
    });

    it('should resolve partial UUID matches', () => {
      const result = resolver.resolveTaskId('abcd1234', mockTasks);
      
      expect(result.success).toBe(true);
      expect(result.resolvedId).toBe('abcd1234-5678-9012-3456-789012345678');
      expect(result.matches).toHaveLength(1);
    });

    it('should handle multiple partial matches', () => {
      const result = resolver.resolveTaskId('ab', mockTasks);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Multiple tasks found');
      expect(result.matches).toHaveLength(2); // Both abcd1234... and abef9999... match
      expect(result.suggestions).toContain('Use a more specific ID prefix');
    });

    it('should handle no matches found', () => {
      const result = resolver.resolveTaskId('xyz123', mockTasks);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No task found');
      expect(result.suggestions).toContain('Use get_tasks to list all available tasks');
    });

    it('should provide similar ID suggestions', () => {
      const result = resolver.resolveTaskId('abcd12345', mockTasks); // Close but not exact
      
      expect(result.success).toBe(false);
      expect(result.suggestions?.some(s => s.includes('Similar IDs found'))).toBe(true);
    });
  });

  describe('suggestSimilarIds', () => {
    it('should suggest similar task IDs', () => {
      const suggestions = resolver.suggestSimilarIds('abcd123', mockTasks);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('abcd1234');
      expect(suggestions[0]).toContain('Test Task 1');
    });

    it('should return empty array for very dissimilar inputs', () => {
      const suggestions = resolver.suggestSimilarIds('xyz999', mockTasks);
      
      expect(suggestions.length).toBe(0);
    });

    it('should limit suggestions to reasonable number', () => {
      const suggestions = resolver.suggestSimilarIds('a', mockTasks);
      
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('resolveTaskIdWithContext', () => {
    it('should use context for better suggestions', () => {
      const context = {
        recentTaskIds: ['abcd1234-5678-9012-3456-789012345678'],
        preferredStatus: 'pending' as const
      };
      
      const result = resolver.resolveTaskIdWithContext('xy', mockTasks, context);
      
      expect(result.success).toBe(false);
      expect(result.suggestions?.some(s => s.includes('Recent tasks'))).toBe(true);
    });

    it('should suggest tasks with preferred status', () => {
      const context = {
        preferredStatus: 'in_progress' as const
      };
      
      const result = resolver.resolveTaskIdWithContext('xyz', mockTasks, context);
      
      expect(result.success).toBe(false);
      expect(result.suggestions?.some(s => s.includes('with status in_progress'))).toBe(true);
    });

    it('should fall back to basic resolution when context does not help', () => {
      const basicResult = resolver.resolveTaskId('abcd1234', mockTasks);
      const contextResult = resolver.resolveTaskIdWithContext('abcd1234', mockTasks, {});
      
      expect(contextResult.success).toBe(basicResult.success);
      expect(contextResult.resolvedId).toBe(basicResult.resolvedId);
    });
  });
});