/**
 * Unit tests for todo-management-tool-v2.ts
 * Target: Achieve 80% coverage for JSON-first TODO management
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';

// Mock file system operations
const mockReadFile = jest.fn() as jest.MockedFunction<(path: string) => Promise<string>>;
const mockWriteFile = jest.fn() as jest.MockedFunction<(path: string, data: string) => Promise<void>>;
const mockReaddir = jest.fn() as jest.MockedFunction<(path: string) => Promise<string[]>>;

jest.unstable_mockModule('fs/promises', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  readdir: mockReaddir,
}));

// Mock child_process
const mockExecSync = jest.fn() as jest.MockedFunction<(command: string, options?: any) => string>;
jest.unstable_mockModule('child_process', () => ({
  execSync: mockExecSync,
}));

// Mock TodoJsonManager class
const mockCreateTask = jest.fn() as jest.MockedFunction<(task: any) => Promise<string>>;
const mockUpdateTask = jest.fn() as jest.MockedFunction<(update: any) => Promise<void>>;
const mockLoadTodoData = jest.fn() as jest.MockedFunction<() => Promise<any>>;
const mockGetAnalytics = jest.fn() as jest.MockedFunction<() => Promise<any>>;
const mockConvertToMarkdown = jest.fn() as jest.MockedFunction<() => Promise<void>>;
const mockImportFromMarkdown = jest.fn() as jest.MockedFunction<() => Promise<void>>;

const MockTodoJsonManager = jest.fn().mockImplementation(() => ({
  createTask: mockCreateTask,
  updateTask: mockUpdateTask,
  loadTodoData: mockLoadTodoData,
  getAnalytics: mockGetAnalytics,
  convertToMarkdown: mockConvertToMarkdown,
  importFromMarkdown: mockImportFromMarkdown,
}));

// Mock KnowledgeGraphManager class
const mockUpdateTodoSnapshot = jest.fn() as jest.MockedFunction<(intentId: string, status: string) => Promise<void>>;
const MockKnowledgeGraphManager = jest.fn().mockImplementation(() => ({
  updateTodoSnapshot: mockUpdateTodoSnapshot,
}));

// Mock ADR discovery
const mockDiscoverAdrsInDirectory = jest.fn() as jest.MockedFunction<(dir: string, includeContent: boolean, projectPath: string) => Promise<any>>;

jest.unstable_mockModule('../../src/utils/todo-json-manager.js', () => ({
  TodoJsonManager: MockTodoJsonManager
}));

jest.unstable_mockModule('../../src/utils/knowledge-graph-manager.js', () => ({
  KnowledgeGraphManager: MockKnowledgeGraphManager
}));

jest.unstable_mockModule('../../src/utils/adr-discovery.js', () => ({
  discoverAdrsInDirectory: mockDiscoverAdrsInDirectory
}));

describe('Todo Management Tool V2', () => {
  const testProjectPath = '/tmp/test-project';
  let manageTodoV2: any;
  
  beforeAll(async () => {
    const module = await import('../../src/tools/todo-management-tool-v2.js');
    manageTodoV2 = module.manageTodoV2;
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockCreateTask.mockResolvedValue('task-123');
    mockUpdateTask.mockResolvedValue(undefined);
    mockConvertToMarkdown.mockResolvedValue(undefined);
    mockImportFromMarkdown.mockResolvedValue(undefined);
    mockUpdateTodoSnapshot.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockReaddir.mockResolvedValue([]);
    mockExecSync.mockReturnValue('abc123 Initial commit\ndef456 Add feature');
    
    // Default todo data
    mockLoadTodoData.mockResolvedValue({
      tasks: {
        'task-1': {
          id: 'task-1',
          title: 'Test Task 1',
          description: 'Test description',
          status: 'pending',
          priority: 'high',
          assignee: 'john',
          dueDate: '2025-12-31',
          category: 'Development',
          tags: ['test'],
          dependencies: [],
          linkedAdrs: [],
          progressPercentage: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          changeLog: []
        }
      },
      sections: [],
      metadata: { lastAdrSync: '2024-01-01T00:00:00Z' }
    });
    
    // Default analytics
    mockGetAnalytics.mockResolvedValue({
      metrics: {
        totalTasks: 10,
        completedTasks: 8,
        completionPercentage: 80,
        priorityWeightedScore: 75,
        criticalTasksRemaining: 1,
        blockedTasksCount: 0,
        averageTaskAge: 5.5,
        velocityMetrics: {
          tasksCompletedLastWeek: 3,
          averageCompletionTime: 24.5
        }
      },
      trends: [
        { timestamp: '2024-01-01T00:00:00Z', score: 70, trigger: 'manual_update' }
      ],
      recommendations: ['Focus on critical tasks', 'Review blocked items']
    });
    
    // Default ADR discovery
    mockDiscoverAdrsInDirectory.mockResolvedValue({
      totalAdrs: 2,
      adrs: [
        {
          path: 'docs/adrs/001-test.md',
          title: 'Test ADR',
          status: 'accepted',
          content: 'Test content with tasks:\n- Implement feature A\n- Configure system B',
          metadata: { number: '001' }
        }
      ],
      summary: { byStatus: { accepted: 1, proposed: 1 } },
      recommendations: ['Review ADR status']
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Schema Validation', () => {
    it('should reject invalid operation', async () => {
      const invalidInput = {
        operation: 'invalid_operation',
        projectPath: testProjectPath
      };

      await expect(manageTodoV2(invalidInput)).rejects.toThrow();
    });

    it('should reject missing required fields', async () => {
      const invalidInput = {
        operation: 'create_task'
        // Missing projectPath and title
      };

      await expect(manageTodoV2(invalidInput)).rejects.toThrow();
    });
  });

  describe('Create Task Operation', () => {
    it('should create task with minimal required fields', async () => {
      const validInput = {
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'New Test Task'
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Task created successfully');
      expect(result.content[0].text).toContain('task-123');
      expect(result.content[0].text).toContain('New Test Task');
      expect(mockCreateTask).toHaveBeenCalledWith({
        title: 'New Test Task',
        description: undefined,
        priority: 'medium',
        assignee: undefined,
        dueDate: undefined,
        category: undefined,
        tags: [],
        dependencies: [],
        intentId: undefined,
        linkedAdrs: [],
        autoComplete: false,
        completionCriteria: undefined
      });
    });

    it('should create task with all optional fields', async () => {
      const validInput = {
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Complex Task',
        description: 'Detailed description',
        priority: 'critical' as const,
        assignee: 'jane',
        dueDate: '2025-12-31',
        category: 'Security',
        tags: ['urgent', 'security'],
        dependencies: ['task-1'],
        intentId: 'intent-123',
        linkedAdrs: ['adr-001.md'],
        autoComplete: true,
        completionCriteria: 'All tests pass'
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Task created successfully');
      expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Complex Task',
        priority: 'critical',
        assignee: 'jane',
        tags: ['urgent', 'security']
      }));
    });
  });

  describe('Update Task Operation', () => {
    it('should update task with full ID', async () => {
      const validInput = {
        operation: 'update_task',
        projectPath: testProjectPath,
        taskId: 'task-1',
        updates: {
          status: 'completed' as const,
          priority: 'low' as const
        },
        reason: 'Task completed'
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Task updated successfully');
      expect(mockUpdateTask).toHaveBeenCalledWith({
        taskId: 'task-1',
        updates: { status: 'completed', priority: 'low' },
        reason: 'Task completed',
        triggeredBy: 'tool'
      });
    });

    it('should resolve partial ID to full ID', async () => {
      const validInput = {
        operation: 'update_task',
        projectPath: testProjectPath,
        taskId: 'task-1',
        updates: { status: 'in_progress' as const },
        reason: 'Started work'
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Task updated successfully');
    });

    it('should handle task not found', async () => {
      mockLoadTodoData.mockResolvedValueOnce({
        tasks: {},
        sections: [],
        metadata: {}
      });

      const validInput = {
        operation: 'update_task',
        projectPath: testProjectPath,
        taskId: 'nonexistent',
        updates: { status: 'completed' as const },
        reason: 'Test'
      };

      const result = await manageTodoV2(validInput);
      
      expect(result.content[0].text).toContain('No task found');
    });

    it('should handle multiple matching partial IDs', async () => {
      mockLoadTodoData.mockResolvedValueOnce({
        tasks: {
          'task-123': { id: 'task-123', title: 'Task 1' },
          'task-124': { id: 'task-124', title: 'Task 2' }
        },
        sections: [],
        metadata: {}
      });

      const validInput = {
        operation: 'update_task',
        projectPath: testProjectPath,
        taskId: 'task-12',
        updates: { status: 'completed' as const },
        reason: 'Test'
      };

      const result = await manageTodoV2(validInput);
      
      expect(result.content[0].text).toContain('Multiple tasks found');
    });
  });

  describe('Bulk Update Operation', () => {
    it('should perform bulk updates', async () => {
      // Add task-2 to mock data for this test
      mockLoadTodoData.mockResolvedValue({
        tasks: {
          'task-1': {
            id: 'task-1',
            title: 'Test Task 1',
            description: 'Test description',
            status: 'pending',
            priority: 'high',
            assignee: 'john',
            dueDate: '2025-12-31',
            category: 'Development',
            tags: ['test'],
            dependencies: [],
            linkedAdrs: [],
            progressPercentage: 0,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            changeLog: []
          },
          'task-2': {
            id: 'task-2',
            title: 'Test Task 2',
            description: 'Another test description',
            status: 'pending',
            priority: 'medium',
            assignee: 'jane',
            dueDate: '2025-12-31',
            category: 'Development',
            tags: ['test'],
            dependencies: [],
            linkedAdrs: [],
            progressPercentage: 0,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            changeLog: []
          }
        },
        sections: [],
        metadata: { lastAdrSync: '2024-01-01T00:00:00Z' }
      });

      const validInput = {
        operation: 'bulk_update',
        projectPath: testProjectPath,
        updates: [
          { taskId: 'task-1', status: 'completed' as const },
          { taskId: 'task-2', priority: 'high' as const }
        ],
        reason: 'Bulk status update'
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Bulk Update Completed');
      expect(result.content[0].text).toContain('Successfully Updated 2 tasks');
      expect(mockUpdateTask).toHaveBeenCalledTimes(2);
    });
  });

  describe('Get Tasks Operation', () => {
    it('should get tasks with no filters', async () => {
      const validInput = {
        operation: 'get_tasks',
        projectPath: testProjectPath
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Task List');
      expect(result.content[0].text).toContain('Test Task 1');
    });

    it('should filter tasks by status', async () => {
      const validInput = {
        operation: 'get_tasks',
        projectPath: testProjectPath,
        filters: { status: 'pending' as const }
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Task List');
    });

    it('should filter tasks by multiple criteria', async () => {
      const validInput = {
        operation: 'get_tasks',
        projectPath: testProjectPath,
        filters: {
          priority: 'high' as const,
          assignee: 'john',
          hasDeadline: true,
          tags: ['test']
        },
        sortBy: 'dueDate' as const,
        sortOrder: 'asc' as const,
        limit: 5,
        showFullIds: true
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Task List');
    });

    it('should handle overdue tasks filter', async () => {
      mockLoadTodoData.mockResolvedValueOnce({
        tasks: {
          'task-1': {
            id: 'task-1',
            title: 'Overdue Task',
            status: 'pending',
            priority: 'high',
            dueDate: '2020-01-01',
            tags: [],
            dependencies: [],
            linkedAdrs: [],
            progressPercentage: 0,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        },
        sections: [],
        metadata: {}
      });

      const validInput = {
        operation: 'get_tasks',
        projectPath: testProjectPath,
        filters: { overdue: true }
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('OVERDUE');
    });
  });

  describe('Get Analytics Operation', () => {
    it('should get analytics with all options', async () => {
      const validInput = {
        operation: 'get_analytics',
        projectPath: testProjectPath,
        timeframe: 'week' as const,
        includeVelocity: true,
        includeScoring: true
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('TODO Analytics');
      expect(result.content[0].text).toContain('**Total Tasks**: 10');
      expect(result.content[0].text).toContain('**Completed**: 8 (80.0%)');
      expect(result.content[0].text).toContain('Velocity Metrics');
      expect(result.content[0].text).toContain('Recommendations');
    });

    it('should get analytics without velocity', async () => {
      const validInput = {
        operation: 'get_analytics',
        projectPath: testProjectPath,
        includeVelocity: false
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('TODO Analytics');
      expect(result.content[0].text).not.toContain('Velocity Metrics');
    });
  });

  describe('Import ADR Tasks Operation', () => {
    it('should import tasks from ADRs', async () => {
      const validInput = {
        operation: 'import_adr_tasks',
        projectPath: testProjectPath,
        adrDirectory: 'docs/adrs',
        preserveExisting: true,
        autoLinkDependencies: true
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('ADR Task Import Completed');
      expect(result.content[0].text).toContain('**ADRs Scanned**: 2');
      expect(mockDiscoverAdrsInDirectory).toHaveBeenCalledWith(
        'docs/adrs',
        true,
        testProjectPath
      );
    });

    it('should handle no ADRs found', async () => {
      mockDiscoverAdrsInDirectory.mockResolvedValueOnce({
        totalAdrs: 0,
        adrs: [],
        summary: { byStatus: {} },
        recommendations: ['Create ADR directory']
      });

      const validInput = {
        operation: 'import_adr_tasks',
        projectPath: testProjectPath
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('No ADRs found');
    });
  });

  describe('Sync Operations', () => {
    it('should sync with knowledge graph', async () => {
      mockLoadTodoData.mockResolvedValueOnce({
        tasks: {
          'task-1': {
            id: 'task-1',
            title: 'Test Task',
            status: 'completed',
            progressPercentage: 100,
            intentId: 'intent-123'
          }
        },
        sections: [],
        metadata: {}
      });

      const validInput = {
        operation: 'sync_knowledge_graph',
        projectPath: testProjectPath,
        direction: 'to_kg' as const
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Knowledge graph sync completed');
      expect(mockUpdateTodoSnapshot).toHaveBeenCalledWith(
        'intent-123',
        'Task completed: Test Task (100%)'
      );
    });

    it('should sync to markdown', async () => {
      const validInput = {
        operation: 'sync_to_markdown',
        projectPath: testProjectPath
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Markdown sync completed');
      expect(mockConvertToMarkdown).toHaveBeenCalled();
    });

    it('should import from markdown with backup', async () => {
      const validInput = {
        operation: 'import_from_markdown',
        projectPath: testProjectPath,
        backupExisting: true,
        mergeStrategy: 'merge' as const
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Markdown import completed');
      expect(result.content[0].text).toContain('**Backup Created**: true');
      expect(mockWriteFile).toHaveBeenCalled();
      expect(mockImportFromMarkdown).toHaveBeenCalled();
    });
  });

  describe('Find Task Operation', () => {
    it('should find tasks by query', async () => {
      const validInput = {
        operation: 'find_task',
        projectPath: testProjectPath,
        query: 'Test',
        searchType: 'title' as const
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Search Results');
      expect(result.content[0].text).toContain('Test Task 1');
    });

    it('should handle no matching tasks', async () => {
      const validInput = {
        operation: 'find_task',
        projectPath: testProjectPath,
        query: 'NonExistent'
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('No tasks found');
    });
  });

  describe('Resume Todo List Operation', () => {
    it('should generate resume report with all options', async () => {
      mockLoadTodoData.mockResolvedValueOnce({
        tasks: {
          'task-1': {
            id: 'task-1',
            title: 'In Progress Task',
            status: 'in_progress',
            priority: 'high',
            progressPercentage: 50,
            assignee: 'john',
            changeLog: [
              { timestamp: '2024-01-01T00:00:00Z', action: 'created', details: 'Task created' }
            ]
          },
          'task-2': {
            id: 'task-2',
            title: 'Overdue Task',
            status: 'pending',
            priority: 'critical',
            dueDate: '2020-01-01',
            progressPercentage: 0
          }
        },
        sections: [],
        metadata: { lastAdrSync: '2024-01-01T00:00:00Z' }
      });

      mockReaddir.mockResolvedValueOnce(['001-test.md', '002-example.md']);

      const validInput = {
        operation: 'resume_todo_list',
        projectPath: testProjectPath,
        analyzeRecent: true,
        includeContext: true,
        showNextActions: true,
        checkDeploymentReadiness: true
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Resume TODO List');
      expect(result.content[0].text).toContain('Current Status Summary');
      expect(result.content[0].text).toContain('Immediate Attention Required');
      expect(result.content[0].text).toContain('Currently In Progress');
      expect(result.content[0].text).toContain('Recent Git Activity');
      expect(result.content[0].text).toContain('ADR Context');
      expect(result.content[0].text).toContain('Recommended Next Actions');
      expect(mockExecSync).toHaveBeenCalledWith('git log --oneline -5', expect.any(Object));
    });
  });

  describe('Error Handling', () => {
    it('should handle TodoJsonManager errors', async () => {
      mockCreateTask.mockRejectedValueOnce(new Error('Database error'));

      const validInput = {
        operation: 'create_task',
        projectPath: testProjectPath,
        title: 'Test Task'
      };

      await expect(manageTodoV2(validInput)).rejects.toThrow('TODO management failed');
    });

    it('should handle unknown operation', async () => {
      const invalidInput = {
        operation: 'unknown_operation',
        projectPath: testProjectPath
      } as any;

      await expect(manageTodoV2(invalidInput)).rejects.toThrow();
    });
  });

  describe('Task Extraction Functions', () => {
    it('should extract tasks from ADR content', async () => {
      const adrWithTasks = {
        path: 'test.md',
        title: 'Test ADR',
        status: 'accepted',
        content: `
## Tasks
- Implement authentication system
- Configure database connections
- Set up monitoring

## Decision
Must implement secure login system with 2FA.

## Consequences  
Should validate all user inputs for security.
        `,
        decision: 'Must implement secure login system with 2FA.',
        consequences: 'Should validate all user inputs for security.',
        metadata: { number: '001' }
      };

      mockDiscoverAdrsInDirectory.mockResolvedValueOnce({
        totalAdrs: 1,
        adrs: [adrWithTasks],
        summary: { byStatus: { accepted: 1 } },
        recommendations: []
      });

      const validInput = {
        operation: 'import_adr_tasks',
        projectPath: testProjectPath
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('ADR Task Import Completed');
      expect(mockCreateTask).toHaveBeenCalled();
    });

    it('should handle ADRs with different priority statuses', async () => {
      const criticalAdr = {
        path: 'critical.md',
        title: 'Critical Security ADR',
        status: 'approved',
        content: 'This is a critical security update that must be implemented urgently.',
        metadata: { number: '002' }
      };

      const deprecatedAdr = {
        path: 'deprecated.md',
        title: 'Deprecated ADR',
        status: 'deprecated',
        content: 'This ADR is no longer relevant.',
        metadata: { number: '003' }
      };

      mockDiscoverAdrsInDirectory.mockResolvedValueOnce({
        totalAdrs: 2,
        adrs: [criticalAdr, deprecatedAdr],
        summary: { byStatus: { approved: 1, deprecated: 1 } },
        recommendations: []
      });

      const validInput = {
        operation: 'import_adr_tasks',
        projectPath: testProjectPath
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('ADR Task Import Completed');
      expect(mockCreateTask).toHaveBeenCalled();
    });

    it('should handle ADRs with task patterns and assignees', async () => {
      const adrWithPatterns = {
        path: 'patterns.md',
        title: 'Pattern ADR',
        status: 'active',
        content: `
1. Must implement feature X by @john
2. Should configure system Y
3. Will create database schema
4. Need to setup monitoring @jane
- Critical task for security
- Important feature update
- Nice to have optimization
        `,
        metadata: { number: '004' }
      };

      mockDiscoverAdrsInDirectory.mockResolvedValueOnce({
        totalAdrs: 1,
        adrs: [adrWithPatterns],
        summary: { byStatus: { active: 1 } },
        recommendations: []
      });

      const validInput = {
        operation: 'import_adr_tasks',
        projectPath: testProjectPath,
        autoLinkDependencies: true
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('ADR Task Import Completed');
      expect(mockCreateTask).toHaveBeenCalled();
    });

    it('should handle ADRs with dependency linking', async () => {
      const adr1 = {
        path: 'adr-001.md',
        title: 'Base ADR',
        status: 'accepted',
        content: 'Base implementation',
        metadata: { number: '001' }
      };

      const adr2 = {
        path: 'adr-002.md',
        title: 'Dependent ADR',
        status: 'accepted',
        content: 'This depends on adr-001 implementation',
        metadata: { number: '002' }
      };

      mockDiscoverAdrsInDirectory.mockResolvedValueOnce({
        totalAdrs: 2,
        adrs: [adr1, adr2],
        summary: { byStatus: { accepted: 2 } },
        recommendations: []
      });

      const validInput = {
        operation: 'import_adr_tasks',
        projectPath: testProjectPath,
        autoLinkDependencies: true
      };

      const result = await manageTodoV2(validInput);
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('ADR Task Import Completed');
      expect(mockCreateTask).toHaveBeenCalled();
    });
  });
});
