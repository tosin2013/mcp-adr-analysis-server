/**
 * Task Search Engine Tests
 *
 * Tests for the enhanced search functionality including fuzzy search,
 * multi-field search, and regex pattern matching.
 */

import { TaskSearchEngine, SearchResult } from '../../src/utils/task-search-engine.js';
import { TodoTask } from '../../src/types/todo-json-schemas.js';

describe('TaskSearchEngine', () => {
  let searchEngine: TaskSearchEngine;
  let sampleTasks: TodoTask[];

  beforeEach(() => {
    searchEngine = new TaskSearchEngine(0.3);

    sampleTasks = [
      {
        id: 'task-001',
        title: 'Implement user authentication',
        description: 'Add login and registration functionality',
        status: 'pending',
        priority: 'high',
        tags: ['auth', 'security', 'backend'],
        category: 'feature',
        assignee: 'john.doe',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
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
        lastModifiedBy: 'tool',
        version: 1,
        changeLog: [],
        comments: [],
      },
      {
        id: 'task-002',
        title: 'Setup database schema',
        description: 'Create tables for user data and authentication',
        status: 'in_progress',
        priority: 'medium',
        tags: ['database', 'schema', 'backend'],
        category: 'infrastructure',
        assignee: 'jane.smith',
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
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
        lastModifiedBy: 'tool',
        version: 1,
        changeLog: [],
        comments: [],
      },
      {
        id: 'task-003',
        title: 'Design user interface',
        description: 'Create mockups and wireframes for the login page',
        status: 'completed',
        priority: 'low',
        tags: ['ui', 'design', 'frontend'],
        category: 'design',
        assignee: 'bob.wilson',
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
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
        lastModifiedBy: 'tool',
        version: 1,
        changeLog: [],
        comments: [],
      },
    ];
  });

  describe('searchById', () => {
    it('should find tasks by partial ID', () => {
      const results = searchEngine.searchById('task-00', sampleTasks);
      expect(results).toHaveLength(3);
      expect(results.map(t => t.id)).toEqual(['task-001', 'task-002', 'task-003']);
    });

    it('should find specific task by full ID', () => {
      const results = searchEngine.searchById('task-002', sampleTasks);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('task-002');
    });

    it('should return empty array for non-matching ID', () => {
      const results = searchEngine.searchById('nonexistent', sampleTasks);
      expect(results).toHaveLength(0);
    });
  });

  describe('searchByTitle', () => {
    it('should find tasks by title substring', () => {
      const results = searchEngine.searchByTitle('user', sampleTasks);
      expect(results).toHaveLength(2);
      expect(results.map(t => t.title)).toEqual([
        'Implement user authentication',
        'Design user interface',
      ]);
    });

    it('should be case insensitive', () => {
      const results = searchEngine.searchByTitle('USER', sampleTasks);
      expect(results).toHaveLength(2);
    });
  });

  describe('fuzzySearch', () => {
    it('should find tasks with typos', () => {
      const results = searchEngine.fuzzySearch('authentification', sampleTasks); // typo in authentication
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some(task => task.title === 'Implement user authentication')).toBe(true);
    });

    it('should handle multiple word typos', () => {
      const results = searchEngine.fuzzySearch('databse schema', sampleTasks); // typo in database
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Setup database schema');
    });

    it('should respect fuzzy threshold', () => {
      const strictEngine = new TaskSearchEngine(0.1); // Very strict
      const results = strictEngine.fuzzySearch('authentification', sampleTasks);
      expect(results).toHaveLength(0); // Should not match with strict threshold
    });
  });

  describe('regexSearch', () => {
    it('should find tasks using regex patterns', () => {
      const results = searchEngine.regexSearch('^Implement', sampleTasks);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Implement user authentication');
    });

    it('should handle invalid regex gracefully', () => {
      const results = searchEngine.regexSearch('[invalid', sampleTasks);
      expect(results).toHaveLength(0); // Should fall back to literal search
    });

    it('should search across multiple fields', () => {
      const results = searchEngine.regexSearch('backend', sampleTasks);
      expect(results).toHaveLength(2); // Should match tags and description
    });
  });

  describe('multiFieldSearch', () => {
    it('should search across specified fields', () => {
      const results = searchEngine.multiFieldSearch(
        'backend',
        ['tags', 'description'],
        sampleTasks
      );
      expect(results).toHaveLength(2);
      expect(results.every(r => r.relevanceScore > 0)).toBe(true);
    });

    it('should apply field weights correctly', () => {
      const results = searchEngine.multiFieldSearch('user', ['title', 'description'], sampleTasks, {
        title: 1.0,
        description: 0.5,
      });

      // Results should be sorted by relevance score
      expect(results[0].relevanceScore).toBeGreaterThanOrEqual(results[1].relevanceScore);
    });

    it('should include matched fields information', () => {
      const results = searchEngine.multiFieldSearch(
        'authentication',
        ['title', 'description'],
        sampleTasks
      );

      expect(results.length).toBeGreaterThanOrEqual(1);
      const authTask = results.find(r => r.task.title === 'Implement user authentication');
      expect(authTask).toBeDefined();
      expect(authTask!.matchedFields).toContain('title');
    });
  });

  describe('comprehensiveSearch', () => {
    it('should prioritize exact matches over fuzzy matches', () => {
      const results = searchEngine.comprehensiveSearch('user', sampleTasks);
      expect(results.length).toBeGreaterThanOrEqual(2);
      // Should find tasks with "user" in title
      expect(results.some(r => r.task.title.includes('user'))).toBe(true);
    });

    it('should fall back to fuzzy search when no exact matches', () => {
      const results = searchEngine.comprehensiveSearch('authentification', sampleTasks);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].relevanceScore).toBeLessThan(0.8); // Should be lower for fuzzy match
    });

    it('should fall back to ID search as last resort', () => {
      const results = searchEngine.comprehensiveSearch('task-001', sampleTasks);
      expect(results).toHaveLength(1);
      expect(results[0].matchedFields).toContain('id');
    });
  });

  describe('generateSearchSuggestions', () => {
    it('should suggest shorter terms for long queries', () => {
      const suggestions = searchEngine.generateSearchSuggestions(
        'very long search query that is too specific',
        sampleTasks
      );
      expect(suggestions.some(s => s.includes('shorter'))).toBe(true);
    });

    it('should suggest fuzzy search for potential typos', () => {
      const suggestions = searchEngine.generateSearchSuggestions('authentification', sampleTasks);
      expect(suggestions.some(s => s.includes('fuzzy'))).toBe(true);
    });

    it('should suggest similar terms when available', () => {
      const suggestions = searchEngine.generateSearchSuggestions('authent', sampleTasks);
      // Should suggest similar terms or provide helpful suggestions
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty search query', () => {
      const results = searchEngine.comprehensiveSearch('', sampleTasks);
      expect(results).toHaveLength(0);
    });

    it('should handle empty task list', () => {
      const results = searchEngine.comprehensiveSearch('test', []);
      expect(results).toHaveLength(0);
    });

    it('should handle tasks with missing optional fields', () => {
      const taskWithMissingFields: TodoTask = {
        ...sampleTasks[0],
        description: undefined,
        assignee: undefined,
        category: undefined,
        tags: [],
      };

      const results = searchEngine.searchByTitle('authentication', [taskWithMissingFields]);
      expect(results).toHaveLength(1);
    });
  });
});
