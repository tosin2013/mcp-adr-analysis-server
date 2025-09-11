/**
 * Enhanced Search Integration Tests
 * 
 * Tests the integration between the TaskSearchEngine and the find_task operation
 * to ensure the enhanced search functionality works end-to-end.
 */

import { manageTodoV2 } from '../../src/tools/todo-management-tool-v2.js';
import { TodoJsonManager } from '../../src/utils/todo-json-manager.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('Enhanced Search Integration', () => {
  let testProjectPath: string;
  let todoManager: TodoJsonManager;

  beforeEach(async () => {
    // Create temporary test directory
    testProjectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'enhanced-search-test-'));
    
    // Initialize cache directory
    const cacheDir = path.join(testProjectPath, '.mcp-adr-cache');
    await fs.mkdir(cacheDir, { recursive: true });
    
    todoManager = new TodoJsonManager(testProjectPath);
    
    // Create some test tasks
    await manageTodoV2({
      operation: 'create_task',
      projectPath: testProjectPath,
      title: 'Implement user authentication system',
      description: 'Add secure login and registration functionality with JWT tokens',
      priority: 'high',
      tags: ['auth', 'security', 'backend'],
      assignee: 'john.doe'
    });

    await manageTodoV2({
      operation: 'create_task',
      projectPath: testProjectPath,
      title: 'Setup database schema',
      description: 'Create tables for user data and authentication records',
      priority: 'medium',
      tags: ['database', 'schema', 'backend'],
      assignee: 'jane.smith'
    });

    await manageTodoV2({
      operation: 'create_task',
      projectPath: testProjectPath,
      title: 'Design user interface mockups',
      description: 'Create wireframes and mockups for the login page',
      priority: 'low',
      tags: ['ui', 'design', 'frontend'],
      assignee: 'bob.wilson'
    });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testProjectPath, { recursive: true, force: true });
  });

  describe('Enhanced find_task operation', () => {
    it('should use comprehensive search by default', async () => {
      const result = await manageTodoV2({
        operation: 'find_task',
        projectPath: testProjectPath,
        query: 'user'
      });

      expect(result.content[0].text).toContain('Enhanced Search Results');
      expect(result.content[0].text).toContain('Implement user authentication system');
      expect(result.content[0].text).toContain('Design user interface mockups');
    });

    it('should support fuzzy search for typos', async () => {
      const result = await manageTodoV2({
        operation: 'find_task',
        projectPath: testProjectPath,
        query: 'authentification', // typo in authentication
        searchType: 'fuzzy'
      });

      expect(result.content[0].text).toContain('Enhanced Search Results');
      expect(result.content[0].text).toContain('Implement user authentication system');
    });

    it('should support regex search patterns', async () => {
      const result = await manageTodoV2({
        operation: 'find_task',
        projectPath: testProjectPath,
        query: '^Setup',
        searchType: 'regex'
      });

      expect(result.content[0].text).toContain('Enhanced Search Results');
      expect(result.content[0].text).toContain('Setup database schema');
    });

    it('should support multi-field search with custom fields', async () => {
      const result = await manageTodoV2({
        operation: 'find_task',
        projectPath: testProjectPath,
        query: 'backend',
        searchType: 'multi_field',
        searchFields: ['tags', 'description']
      });

      expect(result.content[0].text).toContain('Enhanced Search Results');
      expect(result.content[0].text).toContain('Implement user authentication system');
      expect(result.content[0].text).toContain('Setup database schema');
    });

    it('should show relevance scores when requested', async () => {
      const result = await manageTodoV2({
        operation: 'find_task',
        projectPath: testProjectPath,
        query: 'authentication',
        showRelevanceScore: true
      });

      expect(result.content[0].text).toContain('Enhanced Search Results');
      expect(result.content[0].text).toContain('Relevance:');
      expect(result.content[0].text).toContain('%');
      expect(result.content[0].text).toContain('Matched:');
    });

    it('should provide intelligent suggestions when no results found', async () => {
      const result = await manageTodoV2({
        operation: 'find_task',
        projectPath: testProjectPath,
        query: 'nonexistent-feature'
      });

      expect(result.content[0].text).toContain('No tasks found matching');
      expect(result.content[0].text).toContain('Suggestions:');
      expect(result.content[0].text).toContain('Try a shorter search term');
    });

    it('should support custom fuzzy threshold', async () => {
      const result = await manageTodoV2({
        operation: 'find_task',
        projectPath: testProjectPath,
        query: 'authentification',
        searchType: 'fuzzy',
        fuzzyThreshold: 0.1 // Very strict
      });

      // With strict threshold, should not match the typo
      expect(result.content[0].text).toContain('No tasks found matching');
    });

    it('should support field weights in multi-field search', async () => {
      const result = await manageTodoV2({
        operation: 'find_task',
        projectPath: testProjectPath,
        query: 'user',
        searchType: 'multi_field',
        searchFields: ['title', 'description'],
        fieldWeights: { title: 1.0, description: 0.5 },
        showRelevanceScore: true
      });

      expect(result.content[0].text).toContain('Enhanced Search Results');
      expect(result.content[0].text).toContain('Relevance:');
      // Should find both tasks but with different relevance scores
    });

    it('should handle comprehensive search with search statistics', async () => {
      const result = await manageTodoV2({
        operation: 'find_task',
        projectPath: testProjectPath,
        query: 'database',
        searchType: 'comprehensive',
        showRelevanceScore: true
      });

      expect(result.content[0].text).toContain('Enhanced Search Results');
      expect(result.content[0].text).toContain('Search Statistics:');
      expect(result.content[0].text).toContain('Average Relevance:');
      expect(result.content[0].text).toContain('Best Match:');
    });
  });

  describe('Search performance and edge cases', () => {
    it('should handle empty search query gracefully', async () => {
      const result = await manageTodoV2({
        operation: 'find_task',
        projectPath: testProjectPath,
        query: ''
      });

      expect(result.content[0].text).toContain('No tasks found matching');
    });

    it('should handle special characters in regex search safely', async () => {
      const result = await manageTodoV2({
        operation: 'find_task',
        projectPath: testProjectPath,
        query: '[invalid-regex',
        searchType: 'regex'
      });

      // Should fall back to literal search without crashing
      expect(result.content[0].text).toContain('No tasks found matching');
    });

    it('should maintain backward compatibility with existing search types', async () => {
      const result = await manageTodoV2({
        operation: 'find_task',
        projectPath: testProjectPath,
        query: 'authentication',
        searchType: 'title'
      });

      expect(result.content[0].text).toContain('Enhanced Search Results');
      expect(result.content[0].text).toContain('Implement user authentication system');
    });
  });
});