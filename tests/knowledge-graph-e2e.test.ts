/**
 * Knowledge Graph End-to-End Test Suite
 * Tests complete workflows from human intent to LLM access
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { KnowledgeGraphManager } from '../src/utils/knowledge-graph-manager.js';
import { TodoFileWatcher } from '../src/utils/todo-file-watcher.js';
import { generateArchitecturalKnowledgeGraph } from '../src/resources/index.js';

describe('Knowledge Graph End-to-End Workflows', () => {
  let testDir: string;
  let kgManager: KnowledgeGraphManager;
  let todoWatcher: TodoFileWatcher;

  beforeAll(async () => {
    testDir = path.join(process.cwd(), 'test-kg-e2e');
    await fs.mkdir(testDir, { recursive: true });
    
    // Create project structure
    const adrDir = path.join(testDir, 'docs', 'adrs');
    await fs.mkdir(adrDir, { recursive: true });
    
    // Create sample ADRs
    await fs.writeFile(path.join(adrDir, '001-database-choice.md'), `# ADR-001: Database Selection

## Status
Accepted

## Context
We need to choose a database for our application.

## Decision
We will use PostgreSQL as our primary database.

## Consequences
- ACID compliance
- Strong ecosystem
- JSON support
`);

    await fs.writeFile(path.join(adrDir, '002-api-design.md'), `# ADR-002: API Design Pattern

## Status
Proposed

## Context
We need a consistent API design pattern.

## Decision
We will use REST API with OpenAPI specification.

## Consequences
- Standard HTTP methods
- Clear documentation
- Easy testing
`);

    // Set environment
    process.env['PROJECT_PATH'] = testDir;
    process.env['ADR_DIRECTORY'] = adrDir;
    process.env['CACHE_ENABLED'] = 'true';
    process.env['LOG_LEVEL'] = 'ERROR';
  });

  beforeEach(async () => {
    // Clean cache
    try {
      await fs.rm(path.join(testDir, '.mcp-adr-cache'), { recursive: true, force: true });
      await fs.rm(path.join(testDir, 'TODO.md'), { force: true });
    } catch {}
    
    kgManager = new KnowledgeGraphManager();
    todoWatcher = new TodoFileWatcher(path.join(testDir, 'TODO.md'));
  });

  afterEach(async () => {
    if (todoWatcher) {
      await todoWatcher.stopWatching();
    }
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Complete Development Workflow', () => {
    test('should track full TDD implementation cycle', async () => {
      // Scenario: Developer implements authentication feature using TDD approach
      
      // 1. Human Intent: "Implement JWT authentication with tests"
      const intentId = await kgManager.createIntent(
        'Implement JWT authentication using TDD approach',
        [
          'Generate comprehensive test suite for JWT auth',
          'Implement JWT middleware',
          'Add authentication endpoints',
          'Integrate with existing user system'
        ],
        'high'
      );

      // 2. Phase 1: Generate ADR TODO for TDD
      await kgManager.addToolExecution(
        intentId,
        'generate_adr_todo',
        {
          adrDirectory: 'docs/adrs',
          scope: 'all',
          phase: 'test',
          linkAdrs: true,
          includeRules: true
        },
        {
          todoGenerated: true,
          todoPath: 'TODO.md',
          tasksGenerated: 12,
          phase: 'test',
          adrsCovered: 2,
          rulesIncluded: 5
        },
        true,
        [
          'test-jwt-middleware',
          'test-auth-endpoints', 
          'test-user-integration',
          'test-security-rules',
          'mock-jwt-service',
          'mock-user-service'
        ],
        []
      );

      // 3. TODO.md is generated and monitored
      const todoContent = `# TODO

## Test Phase - JWT Authentication Implementation

### Mock Test Generation (Phase 1)
- [ ] test-jwt-middleware: Test JWT middleware functionality
- [ ] test-auth-endpoints: Test authentication endpoints
- [ ] test-user-integration: Test user system integration
- [ ] test-security-rules: Test security rule compliance
- [ ] mock-jwt-service: Mock JWT service implementation
- [ ] mock-user-service: Mock user service

### ADR Implementation Tasks
- [ ] adr-001-database: Implement user storage in PostgreSQL
- [ ] adr-002-api: Design auth API endpoints

### Security Validation
- [ ] validate-jwt-secret: Ensure strong JWT secrets
- [ ] validate-token-expiry: Test token expiration
- [ ] validate-refresh-flow: Test token refresh flow
`;

      await fs.writeFile(path.join(testDir, 'TODO.md'), todoContent);
      
      // Start monitoring TODO.md changes
      await todoWatcher.startWatching(100);
      await new Promise(resolve => setTimeout(resolve, 150));

      // 4. Developer works on tests and updates TODO.md
      const updatedTodoContent = todoContent.replace(
        '- [ ] test-jwt-middleware',
        '- [x] test-jwt-middleware'
      ).replace(
        '- [ ] mock-jwt-service',
        '- [x] mock-jwt-service'
      );

      await fs.writeFile(path.join(testDir, 'TODO.md'), updatedTodoContent);
      await new Promise(resolve => setTimeout(resolve, 200));

      // 5. Manage TODO updates through tool
      await kgManager.addToolExecution(
        intentId,
        'manage_todo',
        {
          operation: 'update_status',
          updates: [
            { taskId: 'test-auth-endpoints', status: 'in_progress' },
            { taskId: 'test-user-integration', status: 'completed' }
          ]
        },
        {
          tasksUpdated: 2,
          statusChanges: ['pending->in_progress', 'pending->completed']
        },
        true,
        [],
        ['test-auth-endpoints', 'test-user-integration']
      );

      // 6. Phase 2: Generate production implementation TODO
      await kgManager.addToolExecution(
        intentId,
        'generate_adr_todo',
        {
          adrDirectory: 'docs/adrs',
          scope: 'in_progress',
          phase: 'production',
          linkAdrs: true
        },
        {
          todoUpdated: true,
          todoPath: 'TODO.md',
          tasksGenerated: 8,
          phase: 'production',
          testsToImplement: 6
        },
        true,
        [
          'impl-jwt-middleware',
          'impl-auth-routes',
          'impl-user-service',
          'impl-security-middleware',
          'impl-token-refresh',
          'impl-auth-guards'
        ],
        ['test-auth-endpoints']
      );

      // 7. Validate progress against ADRs
      await kgManager.addToolExecution(
        intentId,
        'compare_adr_progress',
        {
          todoPath: 'TODO.md',
          adrDirectory: 'docs/adrs',
          validationType: 'comprehensive'
        },
        {
          validationResults: {
            'adr-001-database': { implemented: true, tested: true, score: 95 },
            'adr-002-api': { implemented: false, tested: true, score: 60 }
          },
          overallProgress: 78,
          recommendations: [
            'Complete API implementation for ADR-002',
            'Add integration tests for complete auth flow'
          ]
        },
        true,
        [],
        ['adr-001-database', 'adr-002-api']
      );

      // 8. Final implementation and completion
      await kgManager.addToolExecution(
        intentId,
        'smart_score',
        {
          filePath: 'src/auth',
          includeAdrs: true,
          includeRules: true,
          context: 'authentication-implementation'
        },
        {
          overallScore: 88,
          healthMetrics: {
            architecture: 90,
            security: 95,
            testing: 85,
            maintainability: 82
          },
          recommendations: [
            'Add more edge case tests',
            'Improve error handling documentation'
          ]
        },
        true,
        ['performance-optimization-task'],
        ['impl-auth-routes', 'impl-security-middleware']
      );

      // Update intent status to completed
      await kgManager.updateIntentStatus(intentId, 'completed');

      // 9. Verify complete workflow is tracked (may include TODO file watcher executions)
      const intent = await kgManager.getIntentById(intentId);
      expect(intent).toBeTruthy();
      expect(intent?.currentStatus).toBe('completed');
      expect(intent?.toolChain.length).toBeGreaterThanOrEqual(5);
      
      // Verify main tool execution sequence (filter out watcher events)
      const mainToolNames = intent?.toolChain
        .filter(t => !t.toolName.includes('todo_file_watcher'))
        .map(t => t.toolName);
      expect(mainToolNames).toEqual([
        'generate_adr_todo',
        'manage_todo', 
        'generate_adr_todo',
        'compare_adr_progress',
        'smart_score'
      ]);

      // Verify TODO task tracking
      const allTasksCreated = intent?.toolChain.flatMap(t => t.todoTasksCreated);
      expect(allTasksCreated).toContain('test-jwt-middleware');
      expect(allTasksCreated).toContain('impl-jwt-middleware');
      expect(allTasksCreated).toContain('performance-optimization-task');

      // 10. LLM accesses complete workflow context
      const resource = await generateArchitecturalKnowledgeGraph(testDir);
      const snapshot = resource.data.knowledgeGraphSnapshot;
      
      expect(snapshot.intents).toHaveLength(1);
      const exposedIntent = snapshot.intents[0];
      
      expect(exposedIntent).toMatchObject({
        intentId,
        humanRequest: 'Implement JWT authentication using TDD approach',
        parsedGoals: [
          'Generate comprehensive test suite for JWT auth',
          'Implement JWT middleware',
          'Add authentication endpoints',
          'Integrate with existing user system'
        ],
        priority: 'high',
        currentStatus: 'completed',
        toolChainSummary: {
          totalTools: expect.any(Number), // May include file watcher executions
          completedTools: expect.any(Number),
          failedTools: 0
        }
      });

      // LLM can see the complete development lifecycle
      expect(exposedIntent.todoTasksCreated.length).toBeGreaterThanOrEqual(13);
      expect(exposedIntent.todoTasksModified.length).toBeGreaterThanOrEqual(4);
    });

    test.skip('should handle complex multi-developer workflow', async () => {
      // Scenario: Multiple developers working on different features with overlapping concerns
      
      // Developer A: Database optimization
      const intentA = await kgManager.createIntent(
        'Optimize database performance',
        ['Analyze query performance', 'Implement connection pooling', 'Add database monitoring'],
        'high'
      );

      // Developer B: API security hardening  
      const intentB = await kgManager.createIntent(
        'Enhance API security',
        ['Implement rate limiting', 'Add input validation', 'Security audit'],
        'high'
      );

      // Developer C: Frontend integration
      const intentC = await kgManager.createIntent(
        'Update frontend for new API',
        ['Modify auth flows', 'Update API client', 'Add error handling'],
        'medium'
      );

      // Sequential tool executions to avoid race conditions
      // Developer A's work
      await kgManager.addToolExecution(
        intentA,
        'analyze_project_ecosystem',
        { projectPath: testDir, focusArea: 'database' },
        { performance_issues: ['slow queries', 'connection leaks'] },
        true,
        ['db-analysis-task', 'query-optimization-task'],
        []
      );
      
      // Developer B's work
      await kgManager.addToolExecution(
        intentB,
        'analyze_content_security',
        { projectPath: testDir, scanDepth: 'deep' },
        { security_issues: ['missing rate limits', 'weak validation'] },
        true,
        ['security-audit-task', 'rate-limiting-task'],
        []
      );
      
      // Developer C's work
      await kgManager.addToolExecution(
        intentC,
        'smart_score',
        { filePath: 'frontend/src', includeAdrs: true },
        { integration_score: 72, issues: ['outdated API calls'] },
        true,
        ['frontend-update-task', 'api-client-task'],
        []
      );

      // Cross-cutting concerns: All developers need TODO coordination (sequential)
      await kgManager.addToolExecution(
        intentA,
        'generate_adr_todo',
        { adrDirectory: 'docs/adrs', scope: 'all' },
        { tasksGenerated: 4, focus: 'database' },
        true,
        ['adr-001-db-impl', 'db-connection-pool'],
        []
      );
      
      await kgManager.addToolExecution(
        intentB,
        'generate_adr_todo', 
        { adrDirectory: 'docs/adrs', scope: 'all' },
        { tasksGenerated: 5, focus: 'security' },
        true,
        ['adr-002-api-security', 'security-middleware'],
        []
      );
      
      await kgManager.addToolExecution(
        intentC,
        'generate_adr_todo',
        { adrDirectory: 'docs/adrs', scope: 'all' },
        { tasksGenerated: 3, focus: 'frontend' },
        true,
        ['frontend-auth-update'],
        ['adr-002-api-security'] // Modifies existing task
      );

      // TODO.md reflects all work
      const consolidatedTodo = `# TODO

## Database Optimization (Developer A)
- [ ] db-analysis-task: Analyze database performance
- [ ] query-optimization-task: Optimize slow queries
- [ ] adr-001-db-impl: Implement PostgreSQL optimizations
- [ ] db-connection-pool: Set up connection pooling

## Security Hardening (Developer B)  
- [ ] security-audit-task: Complete security audit
- [ ] rate-limiting-task: Implement rate limiting
- [ ] adr-002-api-security: API security enhancements
- [ ] security-middleware: Add security middleware

## Frontend Integration (Developer C)
- [ ] frontend-update-task: Update frontend auth flows
- [ ] api-client-task: Update API client library
- [ ] frontend-auth-update: Frontend auth integration
`;

      await fs.writeFile(path.join(testDir, 'TODO.md'), consolidatedTodo);

      // Progress validation across all intents
      await kgManager.addToolExecution(
        intentA,
        'compare_adr_progress',
        { todoPath: 'TODO.md', adrDirectory: 'docs/adrs' },
        { progress: 'database tasks on track' },
        true,
        [],
        ['adr-001-db-impl']
      );

      // Complete some intents
      await kgManager.updateIntentStatus(intentA, 'completed');
      await kgManager.updateIntentStatus(intentB, 'executing');
      await kgManager.updateIntentStatus(intentC, 'executing');

      // LLM analyzes multi-developer context
      const resource = await generateArchitecturalKnowledgeGraph(testDir);
      const snapshot = resource.data.knowledgeGraphSnapshot;

      expect(snapshot.intents).toHaveLength(3);
      expect(snapshot.analytics.totalIntents).toBe(3);
      expect(snapshot.analytics.completedIntents).toBe(1);
      expect(snapshot.analytics.activeIntents).toBe(2);

      // Verify LLM can see cross-cutting concerns
      const allTasksCreated = snapshot.intents.flatMap((intent: any) => 
        intent.todoTasksCreated
      );
      expect(allTasksCreated).toContain('adr-001-db-impl');
      expect(allTasksCreated).toContain('adr-002-api-security');
      expect(allTasksCreated).toContain('frontend-auth-update');

      // Verify shared task modifications
      const sharedTaskModifications = snapshot.intents.flatMap((intent: any) =>
        intent.todoTasksModified
      );
      expect(sharedTaskModifications).toContain('adr-002-api-security');

      // LLM can identify tool usage patterns across developers
      const toolUsage = snapshot.analytics.mostUsedTools;
      expect(toolUsage).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ toolName: 'generate_adr_todo', usageCount: 3 }),
          expect.objectContaining({ toolName: 'analyze_project_ecosystem', usageCount: 1 }),
          expect.objectContaining({ toolName: 'analyze_content_security', usageCount: 1 }),
          expect.objectContaining({ toolName: 'smart_score', usageCount: 1 }),
          expect.objectContaining({ toolName: 'compare_adr_progress', usageCount: 1 })
        ])
      );
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should handle and recover from tool execution failures', async () => {
      const intentId = await kgManager.createIntent(
        'Test error recovery workflow',
        ['Attempt complex operation', 'Handle failures gracefully', 'Continue after recovery'],
        'medium'
      );

      // Successful tool execution
      await kgManager.addToolExecution(
        intentId,
        'analyze_project_ecosystem',
        { projectPath: testDir },
        { analysis: 'successful' },
        true,
        ['analysis-task'],
        []
      );

      // Failed tool execution
      await kgManager.addToolExecution(
        intentId,
        'failing_tool',
        { param: 'invalid' },
        {},
        false,
        [],
        [],
        'Tool execution failed due to invalid parameters'
      );

      // Recovery attempt
      await kgManager.addToolExecution(
        intentId,
        'recovery_tool',
        { param: 'valid', retry: true },
        { recovered: true, warning: 'Previous attempt failed' },
        true,
        ['recovery-task'],
        ['analysis-task']
      );

      // Continue workflow after recovery
      await kgManager.addToolExecution(
        intentId,
        'smart_score',
        { context: 'post-recovery' },
        { score: 85, note: 'Recovered successfully' },
        true,
        ['final-task'],
        []
      );

      // Verify error tracking and recovery
      const intent = await kgManager.getIntentById(intentId);
      expect(intent?.toolChain).toHaveLength(4);
      
      const executions = intent?.toolChain;
      expect(executions?.[0]?.success).toBe(true);
      expect(executions?.[1]?.success).toBe(false);
      expect(executions?.[1]?.error).toBe('Tool execution failed due to invalid parameters');
      expect(executions?.[2]?.success).toBe(true);
      expect(executions?.[3]?.success).toBe(true);

      // Intent should still be executing (not failed) due to recovery
      expect(intent?.currentStatus).toBe('executing');

      // LLM can see error patterns and recovery strategies
      const resource = await generateArchitecturalKnowledgeGraph(testDir);
      const snapshot = resource.data.knowledgeGraphSnapshot;
      
      const exposedIntent = snapshot.intents[0];
      expect(exposedIntent.toolChainSummary.totalTools).toBe(4);
      expect(exposedIntent.toolChainSummary.completedTools).toBe(3);
      expect(exposedIntent.toolChainSummary.failedTools).toBe(1);
    });

    test('should maintain data integrity during system interruptions', async () => {
      // Simulate system interruption during complex workflow
      const intentId = await kgManager.createIntent(
        'System interruption test',
        ['Complex multi-step process'],
        'high'
      );

      // Start complex workflow
      await kgManager.addToolExecution(
        intentId,
        'step_1',
        { data: 'initial' },
        { processed: true },
        true,
        ['step1-task'],
        []
      );

      // Save current state (for reference)
      await kgManager.loadKnowledgeGraph();
      
      // Simulate interruption by creating new manager instance
      const newKgManager = new KnowledgeGraphManager();
      
      // Verify data persistence across interruption
      const afterInterruption = await newKgManager.loadKnowledgeGraph();
      expect(afterInterruption.intents).toHaveLength(1);
      expect(afterInterruption.intents[0]?.intentId).toBe(intentId);
      expect(afterInterruption.intents[0]?.toolChain).toHaveLength(1);

      // Continue workflow with new manager instance
      await newKgManager.addToolExecution(
        intentId,
        'step_2',
        { data: 'continuation' },
        { processed: true },
        true,
        ['step2-task'],
        []
      );

      // Verify workflow continuation
      const finalState = await newKgManager.loadKnowledgeGraph();
      expect(finalState.intents[0]?.toolChain).toHaveLength(2);
      
      // LLM sees complete workflow despite interruption
      const resource = await generateArchitecturalKnowledgeGraph(testDir);
      const snapshot = resource.data.knowledgeGraphSnapshot;
      
      expect(snapshot.intents[0].toolChainSummary.totalTools).toBe(2);
      expect(snapshot.intents[0].todoTasksCreated).toEqual(['step1-task', 'step2-task']);
    });
  });

  describe('Performance Under Load', () => {
    test('should maintain performance with high-frequency operations', async () => {
      const startTime = Date.now();
      
      // Create intent for load testing
      const intentId = await kgManager.createIntent(
        'High-frequency operation test',
        ['Process many operations quickly'],
        'medium'
      );

      // Perform many sequential tool executions to avoid race conditions
      for (let i = 0; i < 20; i++) {
        await kgManager.addToolExecution(
          intentId,
          `rapid_tool_${i % 5}`, // 5 different tools cycling
          { iteration: i, batch: Math.floor(i / 10) },
          { processed: true, index: i },
          true,
          [`task-${i}`],
          i > 0 ? [`task-${i-1}`] : []
        );
      }
      
      const midTime = Date.now();
      
      // Generate resource while under load
      const resource = await generateArchitecturalKnowledgeGraph(testDir);
      
      const endTime = Date.now();
      
      // Verify performance
      expect(midTime - startTime).toBeLessThan(5000); // Tool executions < 5s
      expect(endTime - midTime).toBeLessThan(2000);   // Resource generation < 2s
      
      // Verify data integrity
      const snapshot = resource.data.knowledgeGraphSnapshot;
      expect(snapshot.intents[0].toolChainSummary.totalTools).toBe(20);
      expect(snapshot.intents[0].todoTasksCreated).toHaveLength(20);
      expect(snapshot.intents[0].todoTasksModified).toHaveLength(19); // All but first
      
      // Verify analytics are correct
      expect(snapshot.analytics.mostUsedTools).toHaveLength(5);
      snapshot.analytics.mostUsedTools.forEach((tool: any) => {
        expect(tool.usageCount).toBe(4); // Each tool used 4 times (20/5)
      });
    });

    test('should scale with large TODO.md files', async () => {
      // Create large TODO.md file
      const largeTodoLines = Array.from({ length: 2000 }, (_, i) => 
        `- [ ] large-task-${i}: Description for task ${i}`
      );
      const largeTodoContent = `# TODO\n\n${largeTodoLines.join('\n')}`;
      
      const todoPath = path.join(testDir, 'TODO.md');
      await fs.writeFile(todoPath, largeTodoContent);
      
      // Start watcher on large file
      const startTime = Date.now();
      await todoWatcher.startWatching(500); // Slower polling for large file
      const watcherStartTime = Date.now();
      
      // Modify large file
      const modifiedContent = largeTodoContent + '\n- [ ] new-task: Additional task';
      await fs.writeFile(todoPath, modifiedContent);
      
      // Wait for change detection
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const changeDetectionTime = Date.now();
      
      // Verify performance is acceptable
      expect(watcherStartTime - startTime).toBeLessThan(1000);
      expect(changeDetectionTime - watcherStartTime).toBeLessThan(2000);
      
      // Verify hash calculation is efficient
      const hashStart = Date.now();
      const hash = await kgManager.calculateTodoMdHash(todoPath);
      const hashEnd = Date.now();
      
      expect(hash).toBeTruthy();
      expect(hashEnd - hashStart).toBeLessThan(500); // Hash calculation < 500ms
    });
  });
});