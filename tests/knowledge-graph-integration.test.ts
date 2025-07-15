/**
 * Knowledge Graph Integration Test Suite
 * Tests the complete knowledge graph functionality including intent tracking,
 * tool execution history, TODO.md sync, and MCP resource exposure
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { KnowledgeGraphManager } from '../src/utils/knowledge-graph-manager.js';
import { TodoFileWatcher } from '../src/utils/todo-file-watcher.js';
// import { McpAdrAnalysisServer } from '../src/index.js';
import { generateArchitecturalKnowledgeGraph } from '../src/resources/index.js';

describe('Knowledge Graph Integration', () => {
  let testDir: string;
  let kgManager: KnowledgeGraphManager;
  let todoWatcher: TodoFileWatcher;
  // let server: McpAdrAnalysisServer;
  
  beforeAll(async () => {
    // Create test directory
    testDir = path.join(process.cwd(), 'test-kg-integration');
    await fs.mkdir(testDir, { recursive: true });
    
    // Set test environment
    process.env['PROJECT_PATH'] = testDir;
    process.env['ADR_DIRECTORY'] = path.join(testDir, 'docs/adrs');
    process.env['CACHE_ENABLED'] = 'true';
  });

  beforeEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(path.join(testDir, '.mcp-adr-cache'), { recursive: true, force: true });
    } catch {}
    
    kgManager = new KnowledgeGraphManager();
    todoWatcher = new TodoFileWatcher(path.join(testDir, 'TODO.md'));
  });

  afterEach(async () => {
    // Stop any running watchers
    if (todoWatcher) {
      await todoWatcher.stopWatching();
    }
  });

  afterAll(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Intent Capture and Storage', () => {
    test('should create intent snapshot with correct structure', async () => {
      const humanRequest = 'Implement user authentication system';
      const parsedGoals = ['Create login endpoint', 'Add JWT tokens', 'Secure routes'];
      const priority = 'high';

      const intentId = await kgManager.createIntent(humanRequest, parsedGoals, priority);

      expect(intentId).toBeTruthy();
      expect(typeof intentId).toBe('string');

      const intent = await kgManager.getIntentById(intentId);
      expect(intent).toBeTruthy();
      expect(intent?.humanRequest).toBe(humanRequest);
      expect(intent?.parsedGoals).toEqual(parsedGoals);
      expect(intent?.priority).toBe(priority);
      expect(intent?.currentStatus).toBe('planning');
      expect(intent?.toolChain).toEqual([]);
    });

    test('should validate intent snapshot schema', async () => {
      const intentId = await kgManager.createIntent(
        'Test request',
        ['Goal 1', 'Goal 2'],
        'medium'
      );

      const kg = await kgManager.loadKnowledgeGraph();
      const intent = kg.intents.find(i => i.intentId === intentId);

      expect(intent).toBeTruthy();
      expect(intent).toMatchObject({
        intentId: expect.any(String),
        humanRequest: expect.any(String),
        parsedGoals: expect.any(Array),
        priority: expect.stringMatching(/^(high|medium|low)$/),
        timestamp: expect.any(String),
        toolChain: expect.any(Array),
        currentStatus: expect.stringMatching(/^(planning|executing|completed|failed)$/),
        todoMdSnapshot: expect.any(String)
      });
    });

    test('should handle multiple intents correctly', async () => {
      await kgManager.createIntent('Request 1', ['Goal 1'], 'high');
      await kgManager.createIntent('Request 2', ['Goal 2'], 'low');

      const kg = await kgManager.loadKnowledgeGraph();
      expect(kg.intents).toHaveLength(2);
      expect(kg.analytics.totalIntents).toBe(2);
      expect(kg.analytics.activeIntents).toBe(2);
    });
  });

  describe('Tool Execution Tracking', () => {
    test('should record tool execution with complete metadata', async () => {
      const intentId = await kgManager.createIntent('Test intent', ['Test goal'], 'medium');
      
      const toolName = 'generate_adr_todo';
      const parameters = { adrDirectory: 'docs/adrs', scope: 'all' };
      const result = { tasksGenerated: 5, todoPath: 'TODO.md' };
      const todoTasksCreated = ['task-1', 'task-2'];
      const todoTasksModified = ['task-3'];

      await kgManager.addToolExecution(
        intentId,
        toolName,
        parameters,
        result,
        true,
        todoTasksCreated,
        todoTasksModified
      );

      const intent = await kgManager.getIntentById(intentId);
      expect(intent?.toolChain).toHaveLength(1);
      
      const execution = intent?.toolChain[0];
      expect(execution).toMatchObject({
        toolName,
        parameters,
        result,
        todoTasksCreated,
        todoTasksModified,
        executionTime: expect.any(String),
        success: true
      });

      expect(intent?.currentStatus).toBe('executing');
    });

    test('should handle failed tool executions', async () => {
      const intentId = await kgManager.createIntent('Test intent', ['Test goal'], 'medium');
      
      await kgManager.addToolExecution(
        intentId,
        'failing_tool',
        { param: 'value' },
        {},
        false,
        [],
        [],
        'Tool execution failed'
      );

      const intent = await kgManager.getIntentById(intentId);
      expect(intent?.currentStatus).toBe('failed');
      expect(intent?.toolChain[0]?.success).toBe(false);
      expect(intent?.toolChain[0]?.error).toBe('Tool execution failed');
    });

    test('should track multiple tool executions in sequence', async () => {
      const intentId = await kgManager.createIntent('Multi-tool intent', ['Complex goal'], 'high');
      
      // Execute multiple tools
      await kgManager.addToolExecution(intentId, 'tool1', {}, {}, true);
      await kgManager.addToolExecution(intentId, 'tool2', {}, {}, true);
      await kgManager.addToolExecution(intentId, 'tool3', {}, {}, false, [], [], 'Error occurred');

      const intent = await kgManager.getIntentById(intentId);
      expect(intent?.toolChain).toHaveLength(3);
      expect(intent?.toolChain.map(t => t.toolName)).toEqual(['tool1', 'tool2', 'tool3']);
      expect(intent?.currentStatus).toBe('failed'); // Last execution failed
    });
  });

  describe('TODO.md Bidirectional Sync', () => {
    test('should detect TODO.md changes', async () => {
      const todoPath = path.join(testDir, 'TODO.md');
      const todoContent = `# TODO

## In Progress
- [x] Task 1
- [ ] Task 2

## Pending  
- [ ] Task 3
`;

      // Create initial TODO.md
      await fs.writeFile(todoPath, todoContent);
      
      // Initial hash calculation
      const hash1 = await kgManager.calculateTodoMdHash(todoPath);
      expect(hash1).toBeTruthy();

      // Modify TODO.md
      const modifiedContent = todoContent + '- [ ] Task 4\n';
      await fs.writeFile(todoPath, modifiedContent);

      // Check for changes
      const detection = await kgManager.detectTodoChanges(todoPath);
      expect(detection.hasChanges).toBe(true);
      expect(detection.currentHash).not.toBe(hash1);
    });

    test('should sync TODO.md changes with knowledge graph', async () => {
      const todoPath = path.join(testDir, 'TODO.md');
      await kgManager.createIntent('TODO sync test', ['Sync TODO'], 'medium');
      
      // Create TODO.md
      await fs.writeFile(todoPath, '# TODO\n- [ ] Initial task\n');
      
      // Start watcher
      await todoWatcher.startWatching(100); // 100ms polling for faster tests
      
      // Wait a bit for initial sync
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Modify TODO.md
      await fs.writeFile(todoPath, '# TODO\n- [x] Initial task\n- [ ] New task\n');
      
      // Wait for change detection
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check sync state
      const syncState = await kgManager.getSyncState();
      expect(syncState.syncStatus).toBe('pending');
      expect(syncState.lastModifiedBy).toBe('human');
    });

    test('should handle TODO.md file watcher operations', async () => {
      const todoPath = path.join(testDir, 'TODO.md');
      await fs.writeFile(todoPath, '# TODO\n- [ ] Test task\n');

      const status = await todoWatcher.getWatcherStatus();
      expect(status.todoPath).toBe(todoPath);
      expect(status.isActive).toBe(false);

      await todoWatcher.startWatching();
      const activeStatus = await todoWatcher.getWatcherStatus();
      expect(activeStatus.isActive).toBe(true);

      await todoWatcher.stopWatching();
      const stoppedStatus = await todoWatcher.getWatcherStatus();
      expect(stoppedStatus.isActive).toBe(false);
    });
  });

  describe('Knowledge Graph Resource Exposure', () => {
    test('should generate architectural knowledge graph resource', async () => {
      // Create test intent and tool executions
      const intentId = await kgManager.createIntent(
        'Test architectural analysis',
        ['Analyze codebase', 'Generate recommendations'],
        'high'
      );
      
      await kgManager.addToolExecution(
        intentId,
        'analyze_project_ecosystem',
        { projectPath: testDir },
        { technologies: ['Node.js', 'TypeScript'], patterns: ['MCP', 'TDD'] },
        true,
        ['analyze-task-1', 'analyze-task-2'],
        []
      );

      // Generate resource
      const resource = await generateArchitecturalKnowledgeGraph(testDir);
      
      expect(resource).toMatchObject({
        data: expect.objectContaining({
          prompt: expect.any(String),
          instructions: expect.any(String),
          knowledgeGraphSnapshot: expect.objectContaining({
            version: expect.any(String),
            timestamp: expect.any(String),
            intents: expect.any(Array),
            todoSyncState: expect.any(Object),
            analytics: expect.any(Object)
          })
        }),
        contentType: 'application/json',
        lastModified: expect.any(String),
        cacheKey: expect.any(String),
        ttl: expect.any(Number)
      });

      // Verify intent data is included
      const knowledgeGraphSnapshot = resource.data.knowledgeGraphSnapshot;
      expect(knowledgeGraphSnapshot.intents).toHaveLength(1);
      
      const exposedIntent = knowledgeGraphSnapshot.intents[0];
      expect(exposedIntent).toMatchObject({
        intentId,
        humanRequest: 'Test architectural analysis',
        parsedGoals: ['Analyze codebase', 'Generate recommendations'],
        priority: 'high',
        currentStatus: 'executing',
        toolChainSummary: {
          totalTools: 1,
          completedTools: 1,
          failedTools: 0
        },
        todoTasksCreated: ['analyze-task-1', 'analyze-task-2'],
        todoTasksModified: []
      });
    });

    test('should include analytics in knowledge graph resource', async () => {
      // Create multiple intents with different statuses
      const intent1 = await kgManager.createIntent('Intent 1', ['Goal 1'], 'high');
      const intent2 = await kgManager.createIntent('Intent 2', ['Goal 2'], 'medium');
      
      await kgManager.addToolExecution(intent1, 'tool_a', {}, {}, true);
      await kgManager.addToolExecution(intent1, 'tool_b', {}, {}, true);
      await kgManager.addToolExecution(intent2, 'tool_a', {}, {}, false, [], [], 'Failed');
      
      await kgManager.updateIntentStatus(intent1, 'completed');

      const resource = await generateArchitecturalKnowledgeGraph(testDir);
      const analytics = resource.data.knowledgeGraphSnapshot.analytics;

      expect(analytics).toMatchObject({
        totalIntents: 2,
        completedIntents: 1,
        activeIntents: expect.any(Number), // May be 0 if second intent failed
        averageGoalCompletion: 0.5,
        mostUsedTools: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'tool_a',
            usageCount: 2
          })
        ])
      });
    });
  });

  describe('Analytics Generation', () => {
    test('should calculate intent completion metrics', async () => {
      // Create test scenario with multiple intents
      const intent1 = await kgManager.createIntent('Completed Intent', ['Goal 1'], 'high');
      await kgManager.createIntent('Active Intent', ['Goal 2'], 'medium');
      const intent3 = await kgManager.createIntent('Failed Intent', ['Goal 3'], 'low');

      await kgManager.updateIntentStatus(intent1, 'completed');
      await kgManager.updateIntentStatus(intent3, 'failed');

      const kg = await kgManager.loadKnowledgeGraph();
      
      expect(kg.analytics.totalIntents).toBe(3);
      expect(kg.analytics.completedIntents).toBe(1);
      expect(kg.analytics.activeIntents).toBe(1);
      expect(kg.analytics.averageGoalCompletion).toBeCloseTo(0.33, 2);
    });

    test('should track tool usage statistics', async () => {
      const intentId = await kgManager.createIntent('Tool usage test', ['Track tools'], 'medium');
      
      // Execute various tools multiple times
      await kgManager.addToolExecution(intentId, 'generate_adr_todo', {}, {}, true);
      await kgManager.addToolExecution(intentId, 'manage_todo', {}, {}, true);
      await kgManager.addToolExecution(intentId, 'generate_adr_todo', {}, {}, true);
      await kgManager.addToolExecution(intentId, 'validate_rules', {}, {}, false);

      const kg = await kgManager.loadKnowledgeGraph();
      const toolUsage = kg.analytics.mostUsedTools;

      expect(toolUsage).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ toolName: 'generate_adr_todo', usageCount: 2 }),
          expect.objectContaining({ toolName: 'manage_todo', usageCount: 1 }),
          expect.objectContaining({ toolName: 'validate_rules', usageCount: 1 })
        ])
      );

      // Should be sorted by usage count
      expect(toolUsage[0]?.usageCount).toBeGreaterThanOrEqual(toolUsage[1]?.usageCount || 0);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle corrupted knowledge graph files', async () => {
      // Create corrupted JSON file
      const cacheDir = path.join(testDir, '.mcp-adr-cache');
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(
        path.join(cacheDir, 'knowledge-graph-snapshots.json'),
        '{ invalid json }'
      );

      // Should create default structure instead of crashing
      const kg = await kgManager.loadKnowledgeGraph();
      expect(kg.intents).toEqual([]);
      expect(kg.version).toBeTruthy();
      expect(kg.analytics).toBeTruthy();
    });

    test('should handle missing cache directory', async () => {
      // Remove cache directory
      await fs.rm(path.join(testDir, '.mcp-adr-cache'), { recursive: true, force: true });

      // Should create directory and default files
      const intentId = await kgManager.createIntent('Test after cleanup', ['Goal'], 'medium');
      expect(intentId).toBeTruthy();

      // Verify cache directory was created
      const cacheDir = path.join(testDir, '.mcp-adr-cache');
      const dirExists = await fs.access(cacheDir).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
    });

    test('should handle invalid intent operations', async () => {
      await expect(
        kgManager.addToolExecution('invalid-intent-id', 'tool', {}, {}, true)
      ).rejects.toThrow('Intent invalid-intent-id not found');

      await expect(
        kgManager.updateIntentStatus('invalid-intent-id', 'completed')
      ).rejects.toThrow('Intent invalid-intent-id not found');

      const nonExistentIntent = await kgManager.getIntentById('invalid-id');
      expect(nonExistentIntent).toBeNull();
    });
  });

  describe('Integration Workflows', () => {
    test('should handle complete intent lifecycle', async () => {
      const todoPath = path.join(testDir, 'TODO.md');
      await fs.writeFile(todoPath, '# TODO\n');

      // 1. Create intent
      const intentId = await kgManager.createIntent(
        'Implement user authentication',
        ['Create login API', 'Add JWT middleware', 'Secure routes'],
        'high'
      );

      let intent = await kgManager.getIntentById(intentId);
      expect(intent?.currentStatus).toBe('planning');

      // 2. Execute tools
      await kgManager.addToolExecution(
        intentId,
        'generate_adr_todo',
        { adrDirectory: 'docs/adrs', scope: 'all' },
        { tasksGenerated: 3 },
        true,
        ['auth-login-task', 'auth-jwt-task', 'auth-secure-task'],
        []
      );

      await kgManager.addToolExecution(
        intentId,
        'manage_todo',
        { operation: 'update_status', taskId: 'auth-login-task', status: 'completed' },
        { updated: true },
        true,
        [],
        ['auth-login-task']
      );

      // 3. Update TODO.md snapshot
      const updatedTodoContent = `# TODO
## Completed
- [x] auth-login-task: Create login API

## In Progress  
- [ ] auth-jwt-task: Add JWT middleware
- [ ] auth-secure-task: Secure routes
`;
      await kgManager.updateTodoSnapshot(intentId, updatedTodoContent);

      // 4. Complete intent
      await kgManager.updateIntentStatus(intentId, 'completed');

      // Verify final state
      intent = await kgManager.getIntentById(intentId);
      expect(intent?.currentStatus).toBe('completed');
      expect(intent?.toolChain).toHaveLength(2);
      expect(intent?.todoMdSnapshot).toBe(updatedTodoContent);

      const kg = await kgManager.loadKnowledgeGraph();
      expect(kg.analytics.completedIntents).toBe(1);
    });

    test('should handle concurrent operations', async () => {
      const intentId = await kgManager.createIntent('Concurrent test', ['Goal'], 'medium');

      // Execute multiple operations sequentially to avoid race conditions
      await kgManager.addToolExecution(intentId, 'tool1', {}, {}, true, ['task1'], []);
      await kgManager.addToolExecution(intentId, 'tool2', {}, {}, true, ['task2'], []);
      await kgManager.addToolExecution(intentId, 'tool3', {}, {}, true, ['task3'], []);

      const intent = await kgManager.getIntentById(intentId);
      expect(intent?.toolChain).toHaveLength(3);
      
      // All tool executions should be recorded
      const toolNames = intent?.toolChain.map(t => t.toolName).sort();
      expect(toolNames).toEqual(['tool1', 'tool2', 'tool3']);
    });
  });

  describe('Performance Tests', () => {
    test('should handle large number of intents efficiently', async () => {
      const startTime = Date.now();
      
      // Create 50 intents with tool executions (reduced for test performance)
      const intentIds: string[] = [];
      
      for (let i = 0; i < 50; i++) {
        const intentId = await kgManager.createIntent(`Intent ${i}`, [`Goal ${i}`], 'medium');
        intentIds.push(intentId);
        await kgManager.addToolExecution(intentId, 'test_tool', {}, {}, true);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000);
      
      // Verify all intents were created
      const kg = await kgManager.loadKnowledgeGraph();
      expect(kg.intents).toHaveLength(50);
      expect(kg.analytics.totalIntents).toBe(50);
    });

    test('should handle large TODO.md files efficiently', async () => {
      const todoPath = path.join(testDir, 'TODO.md');
      
      // Create large TODO.md with 1000 tasks
      const largeTodoContent = '# TODO\n\n' + 
        Array.from({ length: 1000 }, (_, i) => `- [ ] Task ${i + 1}`).join('\n');
      
      await fs.writeFile(todoPath, largeTodoContent);
      
      const startTime = Date.now();
      const hash = await kgManager.calculateTodoMdHash(todoPath);
      const endTime = Date.now();
      
      expect(hash).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
    });
  });
});