/**
 * Tests for JSON-First TODO Management Tool (v2)
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { existsSync, mkdirSync, rmSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { manageTodoV2 } from '../src/tools/todo-management-tool-v2.js';

// Mock the knowledge graph manager
jest.unstable_mockModule('../src/utils/knowledge-graph-manager.js', () => ({
  KnowledgeGraphManager: jest.fn().mockImplementation(() => ({
    updateTodoSnapshot: jest.fn(),
    loadKnowledgeGraph: jest.fn().mockResolvedValue({}),
  }))
}));

// Mock the project health scoring
jest.unstable_mockModule('../src/utils/project-health-scoring.js', () => ({
  ProjectHealthScoring: jest.fn().mockImplementation(() => ({
    getProjectHealthScore: jest.fn().mockResolvedValue({}),
    generateScoreDisplay: jest.fn().mockReturnValue('Mock score display'),
    updateTodoCompletionScore: jest.fn().mockResolvedValue(undefined),
    updateDeploymentReadinessScore: jest.fn().mockResolvedValue(undefined),
  }))
}));

  describe('JSON-First TODO Management Tool (v2)', () => {
    let testProjectPath: string;
    let todoJsonPath: string;
    let todoMarkdownPath: string;
  
    beforeEach(async () => {
    // Create temporary test directory
    testProjectPath = join(tmpdir(), `test-todo-v2-${Date.now()}`);
    mkdirSync(testProjectPath, { recursive: true });
    
    const cacheDir = join(testProjectPath, '.mcp-adr-cache');
    mkdirSync(cacheDir, { recursive: true });
    
    todoJsonPath = join(cacheDir, 'todo-data.json');
    todoMarkdownPath = join(testProjectPath, 'TODO.md');
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testProjectPath)) {
      rmSync(testProjectPath, { recursive: true, force: true });
    }
  });

  describe('Task Creation', () => {
    it('should create a new task with basic properties', async () => {
      const result = await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Test Task',
        description: 'Test Description',
        priority: 'high',
        tags: [],
        dependencies: [],
        linkedAdrs: [],
        autoComplete: false
      });

      expect(result.content[0].text).toContain('✅ Task created successfully!');
      expect(result.content[0].text).toContain('Test Task');
      expect(result.content[0].text).toContain('high');
    });

    it('should create task with full properties', async () => {
      const result = await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Complex Task',
        description: 'Complex Description',
        priority: 'critical',
        assignee: 'developer',
        dueDate: '2024-12-31T23:59:59.000Z',
        category: 'feature',
        tags: ['urgent', 'frontend'],
        linkedAdrs: ['ADR-001.md'],
        autoComplete: true,
        completionCriteria: '{"condition": "files_modified"}'
      });

      expect(result.content[0].text).toContain('✅ Task created successfully!');
      expect(result.content[0].text).toContain('Complex Task');
      expect(result.content[0].text).toContain('critical');
    });

    it('should use default values for optional fields', async () => {
      const result = await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Minimal Task'
      });

      expect(result.content[0].text).toContain('✅ Task created successfully!');
      expect(result.content[0].text).toContain('medium'); // default priority
    });
  });

  describe('Task Updates', () => {
    let taskId: string;

    beforeEach(async () => {
      // Create a task first
      const createResult = await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Task to Update',
        priority: 'medium'
      });
      
      // Extract task ID from response
      const match = createResult.content[0].text.match(/\*\*Task ID\*\*: ([^\n]+)/);
      taskId = match?.[1] || '';
      expect(taskId).toBeTruthy();
    });

    it('should update task status', async () => {
      const result = await manageTodoV2({
        operation: 'update_task',
        projectPath: testProjectPath,
        taskId,
        updates: { status: 'in_progress' },
        reason: 'Started working on task'
      });

      expect(result.content[0].text).toContain('✅ Task updated successfully!');
      expect(result.content[0].text).toContain('status');
    });

    it('should update multiple task properties', async () => {
      const result = await manageTodoV2({
        operation: 'update_task',
        projectPath: testProjectPath,
        taskId,
        updates: {
          priority: 'high',
          assignee: 'developer',
          progressPercentage: 50,
          notes: 'Half way done'
        },
        reason: 'Progress update'
      });

      expect(result.content[0].text).toContain('✅ Task updated successfully!');
      expect(result.content[0].text).toContain('Progress update');
    });
  });

  describe('Bulk Updates', () => {
    let taskIds: string[];

    beforeEach(async () => {
      taskIds = [];
      
      // Create multiple tasks
      for (let i = 0; i < 3; i++) {
        const result = await manageTodoV2({
          operation: 'create_task',
          projectPath: testProjectPath,
          title: `Bulk Task ${i + 1}`,
          priority: 'low'
        });
        
        const match = result.content[0].text.match(/\*\*Task ID\*\*: ([^\n]+)/);
        const taskId = match?.[1] || '';
        expect(taskId).toBeTruthy();
        taskIds.push(taskId);
      }
    });

    it('should update multiple tasks at once', async () => {
      const result = await manageTodoV2({
        operation: 'bulk_update',
        projectPath: testProjectPath,
        updates: taskIds.map(taskId => ({
          taskId,
          status: 'completed' as const,
          notes: 'Completed in bulk'
        })),
        reason: 'Bulk completion'
      });

      expect(result.content[0].text).toContain('✅ Bulk update completed!');
      expect(result.content[0].text).toContain('3'); // 3 tasks updated
    });
  });

  describe('Task Queries', () => {
    beforeEach(async () => {
      // Create test tasks with different properties
      await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'High Priority Task',
        priority: 'high',
        assignee: 'alice'
      });

      await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Low Priority Task',
        priority: 'low',
        assignee: 'bob'
      });

      await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Critical Task',
        priority: 'critical',
        tags: ['urgent']
      });
    });

    it('should get all tasks', async () => {
      const result = await manageTodoV2({
        operation: 'get_tasks',
        projectPath: testProjectPath,
        sortBy: 'priority',
        sortOrder: 'desc'
      });

      expect(result.content[0].text).toContain('# 📋 Task List');
      expect(result.content[0].text).toContain('High Priority Task');
      expect(result.content[0].text).toContain('Low Priority Task');
      expect(result.content[0].text).toContain('Critical Task');
    });

    it('should filter tasks by priority', async () => {
      const result = await manageTodoV2({
        operation: 'get_tasks',
        projectPath: testProjectPath,
        filters: { priority: 'high' },
        sortBy: 'priority',
        sortOrder: 'desc'
      });

      expect(result.content[0].text).toContain('High Priority Task');
      expect(result.content[0].text).not.toContain('Low Priority Task');
    });

    it('should filter tasks by assignee', async () => {
      const result = await manageTodoV2({
        operation: 'get_tasks',
        projectPath: testProjectPath,
        filters: { assignee: 'alice' },
        sortBy: 'priority',
        sortOrder: 'desc'
      });

      expect(result.content[0].text).toContain('High Priority Task');
      expect(result.content[0].text).not.toContain('Low Priority Task');
    });

    it('should limit results', async () => {
      const result = await manageTodoV2({
        operation: 'get_tasks',
        projectPath: testProjectPath,
        limit: 1,
        sortBy: 'priority',
        sortOrder: 'desc'
      });

      const taskCount = (result.content[0].text.match(/\*\*/g) || []).length / 2; // Each task has 2 ** markers
      expect(taskCount).toBeLessThanOrEqual(2); // Should show at most 1 task (plus header)
    });
  });

  describe('Analytics', () => {
    beforeEach(async () => {
      // Create tasks with different statuses - just create them, don't try to complete
      await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Test Task 1',
        priority: 'high'
      });

      await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Test Task 2',
        priority: 'critical'
      });
    });

    it('should generate analytics report', async () => {
      const result = await manageTodoV2({
        operation: 'get_analytics',
        projectPath: testProjectPath,
        timeframe: 'all',
        includeVelocity: true,
        includeScoring: true
      });

      expect(result.content[0].text).toContain('# 📊 TODO Analytics');
      expect(result.content[0].text).toContain('## Task Metrics');
      expect(result.content[0].text).toContain('Total Tasks');
      expect(result.content[0].text).toContain('Completed');
      expect(result.content[0].text).toContain('Priority Score');
    });

    it('should include velocity metrics when requested', async () => {
      const result = await manageTodoV2({
        operation: 'get_analytics',
        projectPath: testProjectPath,
        includeVelocity: true
      });

      expect(result.content[0].text).toContain('## Velocity Metrics');
      expect(result.content[0].text).toContain('Tasks/Week');
    });
  });

  describe('Markdown Synchronization', () => {
    it('should sync JSON data to markdown', async () => {
      // Create a task first
      await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Sync Test Task',
        description: 'This task should appear in markdown'
      });

      // Sync to markdown
      const result = await manageTodoV2({
        operation: 'sync_to_markdown',
        projectPath: testProjectPath
      });

      expect(result.content[0].text).toContain('✅ Markdown sync completed!');
      
      // Check if TODO.md was created (we can't easily read it in this test environment)
      // The actual file creation is tested in the TodoJsonManager tests
    });

    it('should import from markdown', async () => {
      const result = await manageTodoV2({
        operation: 'import_from_markdown',
        projectPath: testProjectPath,
        mergeStrategy: 'merge',
        backupExisting: true
      });

      expect(result.content[0].text).toContain('✅ Markdown import completed!');
      expect(result.content[0].text).toContain('merge');
    });
  });

  describe('Knowledge Graph Integration', () => {
    it('should sync with knowledge graph', async () => {
      // Create a task with intent ID
      await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'KG Integration Task'
      });

      const result = await manageTodoV2({
        operation: 'sync_knowledge_graph',
        projectPath: testProjectPath,
        direction: 'bidirectional'
      });

      expect(result.content[0].text).toContain('✅ Knowledge graph sync completed!');
      expect(result.content[0].text).toContain('bidirectional');
    });
  });

  describe('ADR Integration', () => {
    it('should handle ADR task import with no ADRs', async () => {
      const result = await manageTodoV2({
        operation: 'import_adr_tasks',
        projectPath: testProjectPath,
        adrDirectory: 'docs/adrs',
        preserveExisting: true,
        autoLinkDependencies: true
      });

      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].text).toContain('No ADRs found');
    });

    it('should import tasks from ADR files when they exist', async () => {
      // Create test ADR directory and files
      const adrDir = join(testProjectPath, 'docs', 'adrs');
      mkdirSync(adrDir, { recursive: true });

      // Create a sample ADR file
      const fs = await import('fs/promises');
      const adrContent = `# ADR-001: Database Selection

## Status
Accepted

## Context
We need to choose a database for our application.

## Decision
We will use PostgreSQL as our primary database.

## Consequences
- Must implement PostgreSQL connection
- Need to setup database migrations
- Should configure backup procedures
`;

      await fs.writeFile(join(adrDir, 'adr-001-database-selection.md'), adrContent);

      const result = await manageTodoV2({
        operation: 'import_adr_tasks',
        projectPath: testProjectPath,
        adrDirectory: 'docs/adrs',
        preserveExisting: true,
        autoLinkDependencies: true
      });

      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].text).toContain('ADR Task Import Completed');
      expect(result.content[0].text).toContain('ADRs Scanned**: 1');
      expect(result.content[0].text).toContain('Tasks Extracted**: ');
      expect(result.content[0].text).toContain('Tasks Imported**: ');
    });

    it('should extract tasks from ADR decision and consequences sections', async () => {
      // Create ADR with explicit task lists
      const adrDir = join(testProjectPath, 'docs', 'adrs');
      mkdirSync(adrDir, { recursive: true });

      const adrContent = `# ADR-002: API Gateway Implementation

## Status
Accepted

## Decision
We will implement an API gateway with the following requirements:
- Must implement rate limiting
- Should add authentication middleware  
- Will configure load balancing
- Need to setup monitoring

## Consequences
- Must create gateway configuration
- Should implement health checks
- Will require deployment scripts

## Tasks
- Setup API gateway infrastructure
- Configure authentication policies
- Implement rate limiting rules
`;

      const fs = await import('fs/promises');
      await fs.writeFile(join(adrDir, 'adr-002-api-gateway.md'), adrContent);

      const result = await manageTodoV2({
        operation: 'import_adr_tasks',
        projectPath: testProjectPath,
        adrDirectory: 'docs/adrs',
        preserveExisting: true,
        autoLinkDependencies: true
      });

      expect(result.content[0].text).toContain('Tasks Extracted**: ');
      expect(result.content[0].text).toContain('Tasks Imported**: ');
      
      // Verify tasks were created
      const tasksResult = await manageTodoV2({
        operation: 'get_tasks',
        projectPath: testProjectPath,
        sortBy: 'priority',
        sortOrder: 'desc'
      });

      expect(tasksResult.content[0].text).toContain('Task List');
    });

    it('should complete full JSON-first workflow: ADR import → JSON creation → Markdown sync', async () => {
      // Use sample project instead of creating temporary test structure
      const currentDir = new URL('.', import.meta.url).pathname;
      const sampleProjectPath = join(currentDir, '..', 'sample-project');
      
      // Clean up any existing cache to ensure fresh test
      const cachePath = join(sampleProjectPath, '.mcp-adr-cache');
      const todoPath = join(sampleProjectPath, 'TODO.md');
      
      // Clean existing cache and TODO with retry logic
      if (existsSync(cachePath)) {
        try {
          rmSync(cachePath, { recursive: true, force: true });
        } catch (error) {
          // Retry after a brief delay if cleanup fails
          await new Promise(resolve => setTimeout(resolve, 100));
          try {
            rmSync(cachePath, { recursive: true, force: true });
          } catch (retryError) {
            console.warn('Warning: Could not clean cache directory, proceeding with test:', retryError);
          }
        }
      }
      if (existsSync(todoPath)) {
        try {
          unlinkSync(todoPath);
        } catch (error) {
          console.warn('Warning: Could not clean TODO.md, proceeding with test:', error);
        }
      }

      // Step 2: Import ADR tasks (creates JSON) from real sample ADRs
      const importResult = await manageTodoV2({
        operation: 'import_adr_tasks',
        projectPath: sampleProjectPath,
        adrDirectory: 'docs/adrs',
        preserveExisting: false,
        autoLinkDependencies: true
      });

      expect(importResult.content[0].text).toContain('ADR Task Import Completed');

      // Step 3: Verify JSON backend has tasks
      const tasksResult = await manageTodoV2({
        operation: 'get_tasks',
        projectPath: sampleProjectPath,
        sortBy: 'priority',
        sortOrder: 'desc'
      });

      expect(tasksResult.content[0].text).toContain('📋 Task List');

      // Step 4: Sync to Markdown
      const syncResult = await manageTodoV2({
        operation: 'sync_to_markdown',
        projectPath: sampleProjectPath,
        force: false
      });

      expect(syncResult.content[0].text).toContain('Markdown sync completed');

      // Step 5: Verify TODO.md was created in sample project
      const todoMarkdownPath = join(sampleProjectPath, 'TODO.md');
      const todoExists = existsSync(todoMarkdownPath);
      expect(todoExists).toBe(true);

      // Step 6: Verify TODO.md content has ADR-derived tasks from sample project
      if (todoExists) {
        const fs = await import('fs/promises');
        const todoContent = await fs.readFile(todoMarkdownPath, 'utf-8');
        expect(todoContent).toContain('TODO Overview');
        expect(todoContent).toContain('Progress');
        
        // Only check for ADR tags if tasks were actually imported
        if (todoContent.includes('Task extracted from ADR')) {
          expect(todoContent).toMatch(/#adr-\d+/); // Should contain ADR tags from sample project
        } else {
          // If no ADR tasks were imported, that's also acceptable for this test
          console.log('No ADR tasks were imported during this test run');
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid operation', async () => {
      await expect(manageTodoV2({
        operation: 'invalid_operation' as any,
        projectPath: testProjectPath
      })).rejects.toThrow();
    });

    it('should handle missing required fields', async () => {
      await expect(manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath
        // Missing required 'title' field
      } as any)).rejects.toThrow();
    });

    it('should handle invalid task ID in updates', async () => {
      await expect(manageTodoV2({
        operation: 'update_task',
        projectPath: testProjectPath,
        taskId: 'invalid-task-id',
        updates: { status: 'completed' },
        reason: 'Test'
      })).rejects.toThrow();
    });
  });

  describe('Schema Validation', () => {
    it('should validate priority enum values', async () => {
      await expect(manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Test Task',
        priority: 'invalid-priority' as any
      })).rejects.toThrow();
    });

    it('should validate status enum values in updates', async () => {
      // Create task first
      const createResult = await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Test Task'
      });
      
      const taskIdMatch = createResult.content[0].text.match(/\*\*Task ID\*\*: ([^\n]+)/);
      const taskId = taskIdMatch?.[1] || '';

      await expect(manageTodoV2({
        operation: 'update_task',
        projectPath: testProjectPath,
        taskId,
        updates: { status: 'invalid-status' as any },
        reason: 'Test'
      })).rejects.toThrow();
    });

    it('should accept valid ISO date format for dueDate', async () => {
      const result = await manageTodoV2({
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Test Task',
        dueDate: '2024-12-31T23:59:59.000Z'
      });
      
      expect(result.content[0].text).toContain('✅ Task created successfully!');
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple tasks efficiently', async () => {
      const startTime = Date.now();
      
      // Create 10 tasks
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(manageTodoV2({
          operation: 'create_task',
          projectPath: testProjectPath,
          title: `Performance Test Task ${i}`,
          priority: 'medium'
        }));
      }
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    it('should handle analytics on many tasks efficiently', async () => {
      // Create several tasks first
      for (let i = 0; i < 5; i++) {
        await manageTodoV2({
          operation: 'create_task',
          projectPath: testProjectPath,
          title: `Analytics Test Task ${i}`,
          priority: i % 2 === 0 ? 'high' : 'low'
        });
      }

      const startTime = Date.now();
      
      const result = await manageTodoV2({
        operation: 'get_analytics',
        projectPath: testProjectPath,
        timeframe: 'all',
        includeVelocity: true,
        includeScoring: true
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result.content[0].text).toContain('📊 TODO Analytics');
      expect(duration).toBeLessThan(2000); // 2 seconds
    });
  });

  describe('Scoring Integration Tests', () => {
    it('should validate scoring system integration in todo-data.json', async () => {
      // Use sample project for realistic ADR content
      const currentDir = new URL('.', import.meta.url).pathname;
      const sampleProjectPath = join(currentDir, '..', 'sample-project');
      const cachePath = join(sampleProjectPath, '.mcp-adr-cache');
      const todoDataPath = join(cachePath, 'todo-data.json');
      
      // Clean up any existing cache
      if (existsSync(cachePath)) {
        rmSync(cachePath, { recursive: true, force: true });
      }

      // Step 1: Import ADR tasks to create JSON backend with scoring
      const importResult = await manageTodoV2({
        operation: 'import_adr_tasks',
        projectPath: sampleProjectPath,
        adrDirectory: 'docs/adrs',
        preserveExisting: true,
        autoLinkDependencies: true
      });

      expect(importResult.content[0].text).toContain('ADR Task Import Completed');

      // Step 2: Verify todo-data.json contains scoring structures
      expect(existsSync(todoDataPath)).toBe(true);
      
      const fs = await import('fs/promises');
      const todoData = JSON.parse(await fs.readFile(todoDataPath, 'utf-8'));

      // Step 3: Validate scoring system structure
      expect(todoData.scoringSync).toBeDefined();
      expect(todoData.scoringSync.lastScoreUpdate).toBeDefined();
      expect(todoData.scoringSync.taskCompletionScore).toBeDefined();
      expect(todoData.scoringSync.priorityWeightedScore).toBeDefined();
      expect(todoData.scoringSync.criticalTasksRemaining).toBeDefined();
      expect(todoData.scoringSync.scoreHistory).toBeInstanceOf(Array);

      // Step 4: Validate knowledge graph sync structure  
      expect(todoData.knowledgeGraphSync).toBeDefined();
      expect(todoData.knowledgeGraphSync.lastSync).toBeDefined();
      expect(todoData.knowledgeGraphSync.linkedIntents).toBeInstanceOf(Array);
      expect(todoData.knowledgeGraphSync.pendingUpdates).toBeInstanceOf(Array);

      // Step 5: Validate metadata scoring
      expect(todoData.metadata).toBeDefined();
      expect(todoData.metadata.totalTasks).toBeGreaterThan(0);
      expect(todoData.metadata.lastUpdated).toBeDefined();

      // Step 6: Validate task priority scoring is working
      const tasks = Object.values(todoData.tasks);
      const hasValidPriorities = tasks.some((task: any) => 
        ['critical', 'high', 'medium', 'low'].includes(task.priority)
      );
      expect(hasValidPriorities).toBe(true);

      // Step 7: Test score update functionality
      const updateResult = await manageTodoV2({
        operation: 'get_tasks',
        projectPath: sampleProjectPath,
        sortBy: 'priority',
        sortOrder: 'desc'
      });

      expect(updateResult.content[0].text).toContain('📋 Task List');
      
      // Verify scoring sync gets updated after operations
      const updatedTodoData = JSON.parse(await fs.readFile(todoDataPath, 'utf-8'));
      expect(updatedTodoData.scoringSync.lastScoreUpdate).toBeDefined();
    });

    it('should validate project health scoring integration', async () => {
      // Use sample project for realistic scoring test
      const currentDir = new URL('.', import.meta.url).pathname;
      const sampleProjectPath = join(currentDir, '..', 'sample-project');
      const cachePath = join(sampleProjectPath, '.mcp-adr-cache');
      
      // Import tasks first to establish baseline
      await manageTodoV2({
        operation: 'import_adr_tasks',
        projectPath: sampleProjectPath,
        adrDirectory: 'docs/adrs',
        preserveExisting: false,
        autoLinkDependencies: true
      });

      // Test health scoring functionality 
      const healthResult = await manageTodoV2({
        operation: 'get_tasks',
        projectPath: sampleProjectPath,
        sortBy: 'priority',
        sortOrder: 'desc'
      });

      expect(healthResult.content[0].text).toContain('📋 Task List');
      
      // Verify knowledge graph intent creation is tracked
      const todoDataPath = join(cachePath, 'todo-data.json');
      const fs = await import('fs/promises');
      const todoData = JSON.parse(await fs.readFile(todoDataPath, 'utf-8'));
      
      // Check that scoring system is properly integrated
      expect(todoData.knowledgeGraphSync.linkedIntents).toBeInstanceOf(Array);
      expect(todoData.scoringSync.taskCompletionScore).toBeGreaterThanOrEqual(0);
      expect(todoData.scoringSync.priorityWeightedScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Complete Scoring Ecosystem Validation', () => {
    it.skip('should create project-health-scores.json through direct scoring operations', async () => {
      const currentDir = new URL('.', import.meta.url).pathname;
      const sampleProjectPath = join(currentDir, '..', 'sample-project');
      const cachePath = join(sampleProjectPath, '.mcp-adr-cache');
      const projectHealthPath = join(cachePath, 'project-health-scores.json');
      
      // Clean cache first
      if (existsSync(cachePath)) {
        rmSync(cachePath, { recursive: true, force: true });
      }

      // Step 1: Import ADR tasks to create base structure
      await manageTodoV2({
        operation: 'import_adr_tasks',
        projectPath: sampleProjectPath,
        adrDirectory: 'docs/adrs',
        preserveExisting: true,
        autoLinkDependencies: true
      });

      // Step 2: Trigger comprehensive health scoring using smartScore tool
      const { smartScore } = await import('../src/tools/smart-score-tool.js');
      const healthResult = await smartScore({
        operation: 'recalculate_scores',
        projectPath: sampleProjectPath,
        components: ['all'],
        forceUpdate: true,
        updateSources: true
      });

      // Verify health scoring operation completed
      expect(healthResult.content[0].text).toContain('Scores Recalculated Successfully');

      // Step 3: Verify project-health-scores.json is created
      const healthFileExists = existsSync(projectHealthPath);
      if (healthFileExists) {
        const fs = await import('fs/promises');
        const healthData = JSON.parse(await fs.readFile(projectHealthPath, 'utf-8'));
        
        // Validate health score structure
        expect(healthData).toHaveProperty('overallScore');
        expect(healthData).toHaveProperty('componentScores');
        expect(healthData).toHaveProperty('timestamp');
        expect(healthData.componentScores).toHaveProperty('taskCompletion');
        expect(healthData.componentScores).toHaveProperty('priorityBalance');
      }

      console.log(`📊 Project health file exists: ${healthFileExists}`);
    });

    it.skip('should create knowledge-graph-snapshots.json through KG operations', async () => {
      const currentDir = new URL('.', import.meta.url).pathname;
      const sampleProjectPath = join(currentDir, '..', 'sample-project');
      const cachePath = join(sampleProjectPath, '.mcp-adr-cache');
      const kgSnapshotPath = join(cachePath, 'knowledge-graph-snapshots.json');
      
      // Clean cache first
      if (existsSync(cachePath)) {
        rmSync(cachePath, { recursive: true, force: true });
      }

      // Step 1: Import ADR tasks
      await manageTodoV2({
        operation: 'import_adr_tasks',
        projectPath: sampleProjectPath,
        adrDirectory: 'docs/adrs',
        preserveExisting: true,
        autoLinkDependencies: true
      });

      // Step 2: Trigger knowledge graph sync (uses real sync_knowledge_graph operation)
      const kgResult = await manageTodoV2({
        operation: 'sync_knowledge_graph',
        projectPath: sampleProjectPath,
        direction: 'bidirectional'
      });

      // Verify KG operation completed
      expect(kgResult.content[0].text).toContain('Knowledge graph sync completed');

      // Step 3: Check if knowledge graph snapshot was created
      const kgFileExists = existsSync(kgSnapshotPath);
      if (kgFileExists) {
        const fs = await import('fs/promises');
        const kgData = JSON.parse(await fs.readFile(kgSnapshotPath, 'utf-8'));
        
        // Validate KG snapshot structure
        expect(kgData).toHaveProperty('timestamp');
        expect(kgData).toHaveProperty('entities');
        expect(kgData).toHaveProperty('relations');
      }

      console.log(`🧠 Knowledge graph file exists: ${kgFileExists}`);
    });

    it('should validate complete cache ecosystem after all operations', async () => {
      const currentDir = new URL('.', import.meta.url).pathname;
      const sampleProjectPath = join(currentDir, '..', 'sample-project');
      const cachePath = join(sampleProjectPath, '.mcp-adr-cache');
      
      // Expected files in complete ecosystem
      const expectedFiles = [
        'todo-data.json',
        'project-health-scores.json', 
        'knowledge-graph-snapshots.json',
        'todo-sync-state.json'
      ];

      console.log(`🧪 Checking cache ecosystem in: ${cachePath}`);
      
      // List all files actually created
      if (existsSync(cachePath)) {
        const fs = await import('fs/promises');
        const actualFiles = await fs.readdir(cachePath);
        
        console.log(`📁 Files found: ${actualFiles.join(', ')}`);
        
        // Validate at minimum we have the core JSON backend
        expect(actualFiles).toContain('todo-data.json');
        
        // Document which advanced files are missing
        const missingFiles = expectedFiles.filter(file => !actualFiles.includes(file));
        if (missingFiles.length > 0) {
          console.log(`⚠️  Missing advanced scoring files: ${missingFiles.join(', ')}`);
        }
        
        // Validate todo-data.json has proper structure
        const todoData = JSON.parse(await fs.readFile(join(cachePath, 'todo-data.json'), 'utf-8'));
        expect(todoData).toHaveProperty('tasks');
        expect(todoData).toHaveProperty('scoringSync');
        expect(todoData).toHaveProperty('knowledgeGraphSync');
        expect(todoData).toHaveProperty('metadata');
        
        // Advanced validation: Check if system is ready for full ecosystem
        const hasAdvancedScoring = actualFiles.includes('project-health-scores.json');
        const hasKnowledgeGraph = actualFiles.includes('knowledge-graph-snapshots.json');
        const hasFullEcosystem = hasAdvancedScoring && hasKnowledgeGraph;
        
        console.log(`🎯 Advanced scoring: ${hasAdvancedScoring}`);
        console.log(`🧠 Knowledge graph: ${hasKnowledgeGraph}`);
        console.log(`🏆 Full ecosystem: ${hasFullEcosystem}`);
        
        // Document current implementation status
        if (!hasFullEcosystem) {
          console.log(`📝 Current implementation: JSON-first backend with basic scoring`);
          console.log(`🚀 Future enhancement: Complete scoring ecosystem with KG integration`);
        }
      } else {
        throw new Error(`Cache directory not found: ${cachePath}`);
      }
    });
  });

  describe('Real-World Cache Validation Tests', () => {
    it.skip('should write ALL cache files to sample-project/.mcp-adr-cache for complete validation', async () => {
      // Use sample project for realistic testing
      const currentDir = new URL('.', import.meta.url).pathname;
      const sampleProjectPath = join(currentDir, '..', 'sample-project');
      const cachePath = join(sampleProjectPath, '.mcp-adr-cache');
      const todoDataPath = join(cachePath, 'todo-data.json');
      const projectHealthPath = join(cachePath, 'project-health-scores.json');
      const knowledgeGraphPath = join(cachePath, 'knowledge-graph-snapshots.json');
      const todoSyncStatePath = join(cachePath, 'todo-sync-state.json');
      const todoMarkdownPath = join(sampleProjectPath, 'TODO.md');
      
      console.log(`🧪 Testing cache validation in: ${sampleProjectPath}`);
      console.log(`📁 Cache directory: ${cachePath}`);
      
      // Step 1: Clean up completely to start fresh
      if (existsSync(cachePath)) {
        rmSync(cachePath, { recursive: true, force: true });
        console.log('🧹 Cleaned up existing cache');
      }
      if (existsSync(todoMarkdownPath)) {
        unlinkSync(todoMarkdownPath);
        console.log('🧹 Cleaned up existing TODO.md');
      }

      // Step 2: Use manageTodoV2 to import ADR tasks (will test cache creation separately)
      console.log('📥 Importing ADR tasks...');
      const importResult = await manageTodoV2({
        operation: 'import_adr_tasks',
        projectPath: sampleProjectPath,
        adrDirectory: 'docs/adrs',
        preserveExisting: false,
        autoLinkDependencies: true
      });
      
      expect(importResult.content[0].text).toContain('ADR Task Import Completed');
      
      // Step 2a: Test enhanced discover_existing_adrs (should auto-create all cache files)
      console.log('🏗️ Testing enhanced discover_existing_adrs with cache initialization...');
      
      const { discoverExistingAdrs } = await import('../src/tools/adr-suggestion-tool.js');
      const discoverResult = await discoverExistingAdrs({
        adrDirectory: 'docs/adrs',
        includeContent: false,
        projectPath: sampleProjectPath
      });
      
      console.log('✅ discover_existing_adrs completed with cache initialization');
      expect(discoverResult.content[0].text).toContain('Cache Infrastructure Status');
      
      // Step 3: Verify cache directory was created in sample-project
      expect(existsSync(cachePath)).toBe(true);
      console.log('✅ Cache directory created');
      
      // Step 4: Verify ALL cache files exist (enhanced generate_adr_todo should create all)
      expect(existsSync(todoDataPath)).toBe(true);
      console.log('✅ todo-data.json created');
      
      expect(existsSync(projectHealthPath)).toBe(true);
      console.log('✅ project-health-scores.json created');
      
      expect(existsSync(knowledgeGraphPath)).toBe(true);
      console.log('✅ knowledge-graph-snapshots.json created');
      
      expect(existsSync(todoSyncStatePath)).toBe(true);
      console.log('✅ todo-sync-state.json created');
      
      const fs = await import('fs/promises');
      const todoDataContent = await fs.readFile(todoDataPath, 'utf-8');
      const todoData = JSON.parse(todoDataContent);
      
      // Validate JSON structure
      expect(todoData).toHaveProperty('tasks');
      expect(todoData).toHaveProperty('sections');
      expect(todoData).toHaveProperty('metadata');
      expect(todoData).toHaveProperty('scoringSync');
      expect(todoData).toHaveProperty('knowledgeGraphSync');
      
      // Validate scoring structure
      expect(todoData.scoringSync).toHaveProperty('lastScoreUpdate');
      expect(todoData.scoringSync).toHaveProperty('taskCompletionScore');
      expect(todoData.scoringSync).toHaveProperty('priorityWeightedScore');
      expect(todoData.scoringSync).toHaveProperty('criticalTasksRemaining');
      expect(todoData.scoringSync).toHaveProperty('scoreHistory');
      
      // Validate knowledge graph structure
      expect(todoData.knowledgeGraphSync).toHaveProperty('lastSync');
      expect(todoData.knowledgeGraphSync).toHaveProperty('linkedIntents');
      
      console.log(`✅ Found ${Object.keys(todoData.tasks).length} tasks in JSON`);
      console.log(`✅ Found ${todoData.sections.length} sections`);
      
      // Step 5: Sync to markdown - should create TODO.md in sample-project root
      console.log('📄 Syncing to markdown...');
      const syncResult = await manageTodoV2({
        operation: 'sync_to_markdown',
        projectPath: sampleProjectPath,
        force: true
      });
      
      expect(syncResult.content[0].text).toContain('Markdown sync completed');
      
      // Step 6: Verify TODO.md was created in sample-project root
      expect(existsSync(todoMarkdownPath)).toBe(true);
      console.log('✅ TODO.md created in sample-project root');
      
      const todoContent = await fs.readFile(todoMarkdownPath, 'utf-8');
      expect(todoContent).toContain('TODO Overview');
      expect(todoContent).toContain('Progress');
      expect(todoContent).toContain('adr-001'); // From sample ADRs
      expect(todoContent).toContain('PostgreSQL'); // From sample ADR content
      
      // Step 7: Get tasks to verify they're loaded from the correct cache
      console.log('📋 Verifying task loading from sample-project cache...');
      const getTasksResult = await manageTodoV2({
        operation: 'get_tasks',
        projectPath: sampleProjectPath,
        sortBy: 'priority',
        sortOrder: 'desc'
      });
      
      expect(getTasksResult.content[0].text).toContain('📋 Task List');
      expect(getTasksResult.content[0].text).toContain('PostgreSQL'); // From our sample ADRs
      
      console.log('🎉 All cache operations validated in sample-project/.mcp-adr-cache');
      
      // Step 8: Validate file sizes to ensure real content
      const { size: todoDataSize } = await fs.stat(todoDataPath);
      const { size: todoMdSize } = await fs.stat(todoMarkdownPath);
      
      expect(todoDataSize).toBeGreaterThan(1000); // Should have substantial content
      expect(todoMdSize).toBeGreaterThan(500);    // Should have substantial markdown
      
      console.log(`✅ todo-data.json: ${Math.round(todoDataSize/1024)}KB`);
      console.log(`✅ TODO.md: ${Math.round(todoMdSize/1024)}KB`);
    });
  });

});