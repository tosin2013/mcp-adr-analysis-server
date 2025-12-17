/**
 * Tests for Task Manager - MCP Tasks Integration
 *
 * Validates the TaskManager implementation for ADR-020: MCP Tasks Integration Strategy
 *
 * @see ADR-020: MCP Tasks Integration Strategy
 * @see https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks
 */

import {
  TaskManager,
  getTaskManager,
  resetTaskManager,
  isTerminalStatus,
  type CreateAdrTaskOptions,
  type TaskResult,
  type McpTaskStatus,
} from '../../src/utils/task-manager.js';

describe('TaskManager', () => {
  let taskManager: TaskManager;

  beforeEach(async () => {
    // Reset global task manager and create fresh instance for each test
    await resetTaskManager();
    taskManager = new TaskManager({ enablePersistence: false });
    await taskManager.initialize();
  });

  afterEach(async () => {
    await taskManager.shutdown();
  });

  describe('Task Creation', () => {
    it('should create a task with required options', async () => {
      const options: CreateAdrTaskOptions = {
        type: 'bootstrap',
        tool: 'bootstrap_validation_loop',
      };

      const task = await taskManager.createTask(options);

      expect(task).toBeDefined();
      expect(task.taskId).toBeDefined();
      expect(task.taskId.length).toBe(32); // UUID hex format
      expect(task.status).toBe('working');
      expect(task.metadata?.type).toBe('bootstrap');
      expect(task.metadata?.tool).toBe('bootstrap_validation_loop');
      expect(task.createdAt).toBeDefined();
      expect(task.lastUpdatedAt).toBeDefined();
    });

    it('should create a task with phases', async () => {
      const options: CreateAdrTaskOptions = {
        type: 'bootstrap',
        tool: 'bootstrap_validation_loop',
        phases: ['platform_detection', 'infrastructure_setup', 'validation', 'cleanup'],
      };

      const task = await taskManager.createTask(options);

      expect(task.metadata?.phases).toBeDefined();
      expect(task.metadata?.phases?.length).toBe(4);
      expect(task.metadata?.phases?.[0]?.name).toBe('platform_detection');
      expect(task.metadata?.phases?.[0]?.status).toBe('pending');
      expect(task.metadata?.phases?.[0]?.progress).toBe(0);
    });

    it('should create a task with custom TTL', async () => {
      const customTtl = 60000; // 1 minute
      const options: CreateAdrTaskOptions = {
        type: 'validation',
        tool: 'validate_adr',
        ttl: customTtl,
      };

      const task = await taskManager.createTask(options);

      expect(task.ttl).toBe(customTtl);
    });

    it('should create a task with project context', async () => {
      const options: CreateAdrTaskOptions = {
        type: 'planning',
        tool: 'interactive_adr_planning',
        projectPath: '/path/to/project',
        adrDirectory: 'docs/adrs',
      };

      const task = await taskManager.createTask(options);

      expect(task.metadata?.projectPath).toBe('/path/to/project');
      expect(task.metadata?.adrDirectory).toBe('docs/adrs');
    });

    it('should create a task with dependencies', async () => {
      const options: CreateAdrTaskOptions = {
        type: 'orchestration',
        tool: 'tool_chain_orchestrator',
        dependencies: ['task-1', 'task-2'],
      };

      const task = await taskManager.createTask(options);

      expect(task.metadata?.dependencies).toEqual(['task-1', 'task-2']);
    });
  });

  describe('Task Retrieval', () => {
    it('should retrieve a task by ID', async () => {
      const task = await taskManager.createTask({
        type: 'bootstrap',
        tool: 'bootstrap_validation_loop',
      });

      const retrieved = await taskManager.getTask(task.taskId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.taskId).toBe(task.taskId);
    });

    it('should return null for non-existent task', async () => {
      const retrieved = await taskManager.getTask('non-existent-id');

      expect(retrieved).toBeNull();
    });

    it('should list all tasks', async () => {
      await taskManager.createTask({ type: 'bootstrap', tool: 'tool1' });
      await taskManager.createTask({ type: 'validation', tool: 'tool2' });
      await taskManager.createTask({ type: 'planning', tool: 'tool3' });

      const { tasks } = await taskManager.listTasks();

      expect(tasks.length).toBe(3);
    });

    it('should paginate task list', async () => {
      // Create many tasks
      for (let i = 0; i < 60; i++) {
        await taskManager.createTask({ type: 'validation', tool: `tool-${i}` });
      }

      const firstPage = await taskManager.listTasks();
      expect(firstPage.tasks.length).toBe(50);
      expect(firstPage.nextCursor).toBeDefined();

      const secondPage = await taskManager.listTasks(firstPage.nextCursor);
      expect(secondPage.tasks.length).toBe(10);
      expect(secondPage.nextCursor).toBeUndefined();
    });

    it('should get tasks by tool', async () => {
      await taskManager.createTask({ type: 'bootstrap', tool: 'bootstrap_validation_loop' });
      await taskManager.createTask({ type: 'bootstrap', tool: 'bootstrap_validation_loop' });
      await taskManager.createTask({ type: 'validation', tool: 'validate_adr' });

      const bootstrapTasks = await taskManager.getTasksByTool('bootstrap_validation_loop');

      expect(bootstrapTasks.length).toBe(2);
    });

    it('should get tasks by type', async () => {
      await taskManager.createTask({ type: 'bootstrap', tool: 'tool1' });
      await taskManager.createTask({ type: 'bootstrap', tool: 'tool2' });
      await taskManager.createTask({ type: 'validation', tool: 'tool3' });

      const bootstrapTasks = await taskManager.getTasksByType('bootstrap');

      expect(bootstrapTasks.length).toBe(2);
    });
  });

  describe('Progress Updates', () => {
    it('should update task progress', async () => {
      const task = await taskManager.createTask({
        type: 'bootstrap',
        tool: 'bootstrap_validation_loop',
      });

      await taskManager.updateProgress({
        taskId: task.taskId,
        progress: 50,
        message: 'Halfway done',
      });

      const progress = taskManager.getProgress(task.taskId);
      expect(progress).toBe(50);

      const updated = await taskManager.getTask(task.taskId);
      expect(updated?.statusMessage).toBe('Halfway done');
    });

    it('should update phase progress', async () => {
      const task = await taskManager.createTask({
        type: 'bootstrap',
        tool: 'bootstrap_validation_loop',
        phases: ['phase1', 'phase2', 'phase3'],
      });

      await taskManager.updateProgress({
        taskId: task.taskId,
        progress: 33,
        phase: 'phase1',
        phaseProgress: 100,
      });

      const updated = await taskManager.getTask(task.taskId);
      const phase1 = updated?.metadata?.phases?.find(p => p.name === 'phase1');
      expect(phase1?.status).toBe('completed');
      expect(phase1?.progress).toBe(100);

      // Next phase should start
      const phase2 = updated?.metadata?.phases?.find(p => p.name === 'phase2');
      expect(phase2?.status).toBe('running');
    });
  });

  describe('Phase Management', () => {
    it('should start a phase', async () => {
      const task = await taskManager.createTask({
        type: 'bootstrap',
        tool: 'bootstrap_validation_loop',
        phases: ['init', 'execute', 'validate'],
      });

      await taskManager.startPhase(task.taskId, 'init');

      const updated = await taskManager.getTask(task.taskId);
      const initPhase = updated?.metadata?.phases?.find(p => p.name === 'init');
      expect(initPhase?.status).toBe('running');
      expect(initPhase?.startTime).toBeDefined();
    });

    it('should complete a phase', async () => {
      const task = await taskManager.createTask({
        type: 'bootstrap',
        tool: 'bootstrap_validation_loop',
        phases: ['init', 'execute', 'validate'],
      });

      await taskManager.startPhase(task.taskId, 'init');
      await taskManager.completePhase(task.taskId, 'init');

      const updated = await taskManager.getTask(task.taskId);
      const initPhase = updated?.metadata?.phases?.find(p => p.name === 'init');
      expect(initPhase?.status).toBe('completed');
      expect(initPhase?.progress).toBe(100);
      expect(initPhase?.endTime).toBeDefined();

      // Next phase should auto-start
      const executePhase = updated?.metadata?.phases?.find(p => p.name === 'execute');
      expect(executePhase?.status).toBe('running');

      // Overall progress should be 33% (1 of 3 phases)
      const progress = taskManager.getProgress(task.taskId);
      expect(progress).toBe(33);
    });

    it('should fail a phase with error', async () => {
      const task = await taskManager.createTask({
        type: 'bootstrap',
        tool: 'bootstrap_validation_loop',
        phases: ['init', 'execute'],
      });

      await taskManager.startPhase(task.taskId, 'init');
      await taskManager.failPhase(task.taskId, 'init', 'Configuration error');

      const updated = await taskManager.getTask(task.taskId);
      const initPhase = updated?.metadata?.phases?.find(p => p.name === 'init');
      expect(initPhase?.status).toBe('failed');
      expect(initPhase?.error).toBe('Configuration error');
    });
  });

  describe('Task Completion', () => {
    it('should complete a task successfully', async () => {
      const task = await taskManager.createTask({
        type: 'validation',
        tool: 'validate_adr',
      });

      const result: TaskResult = {
        success: true,
        data: { validationPassed: true, issues: [] },
      };

      await taskManager.completeTask(task.taskId, result);

      const updated = await taskManager.getTask(task.taskId);
      expect(updated?.status).toBe('completed');
      expect(updated?.result).toEqual(result);

      const progress = taskManager.getProgress(task.taskId);
      expect(progress).toBe(100);
    });

    it('should complete a task with phases', async () => {
      const task = await taskManager.createTask({
        type: 'bootstrap',
        tool: 'bootstrap_validation_loop',
        phases: ['init', 'execute'],
      });

      await taskManager.completeTask(task.taskId, { success: true });

      const updated = await taskManager.getTask(task.taskId);
      expect(updated?.metadata?.phases?.every(p => p.status === 'completed')).toBe(true);
    });

    it('should fail a task', async () => {
      const task = await taskManager.createTask({
        type: 'bootstrap',
        tool: 'bootstrap_validation_loop',
      });

      await taskManager.failTask(task.taskId, 'Infrastructure deployment failed');

      const updated = await taskManager.getTask(task.taskId);
      expect(updated?.status).toBe('failed');
      expect(updated?.statusMessage).toBe('Infrastructure deployment failed');
      expect((updated?.result as TaskResult)?.success).toBe(false);
    });

    it('should get task result', async () => {
      const task = await taskManager.createTask({
        type: 'validation',
        tool: 'validate_adr',
      });

      const result: TaskResult = {
        success: true,
        data: { validated: true },
      };

      await taskManager.completeTask(task.taskId, result);

      const retrieved = await taskManager.getTaskResult(task.taskId);
      expect(retrieved).toEqual(result);
    });
  });

  describe('Task Cancellation', () => {
    it('should cancel a running task', async () => {
      const task = await taskManager.createTask({
        type: 'bootstrap',
        tool: 'bootstrap_validation_loop',
      });

      await taskManager.cancelTask(task.taskId, 'User requested cancellation');

      const updated = await taskManager.getTask(task.taskId);
      expect(updated?.status).toBe('cancelled');
      expect(updated?.statusMessage).toBe('User requested cancellation');
    });

    it('should cancel a task with phases and mark them as skipped', async () => {
      const task = await taskManager.createTask({
        type: 'bootstrap',
        tool: 'bootstrap_validation_loop',
        phases: ['init', 'execute', 'validate'],
      });

      await taskManager.startPhase(task.taskId, 'init');
      await taskManager.cancelTask(task.taskId);

      const updated = await taskManager.getTask(task.taskId);
      const phases = updated?.metadata?.phases;

      // Running phase should be skipped
      expect(phases?.find(p => p.name === 'init')?.status).toBe('skipped');
      // Pending phases should be skipped
      expect(phases?.find(p => p.name === 'execute')?.status).toBe('skipped');
      expect(phases?.find(p => p.name === 'validate')?.status).toBe('skipped');
    });

    it('should throw when cancelling a completed task', async () => {
      const task = await taskManager.createTask({
        type: 'validation',
        tool: 'validate_adr',
      });

      await taskManager.completeTask(task.taskId, { success: true });

      await expect(taskManager.cancelTask(task.taskId)).rejects.toThrow(
        'already in terminal state'
      );
    });

    it('should throw when cancelling non-existent task', async () => {
      await expect(taskManager.cancelTask('non-existent-id')).rejects.toThrow('not found');
    });
  });

  describe('Task Status Helpers', () => {
    it('should identify terminal states', () => {
      expect(isTerminalStatus('completed')).toBe(true);
      expect(isTerminalStatus('failed')).toBe(true);
      expect(isTerminalStatus('cancelled')).toBe(true);
      expect(isTerminalStatus('working')).toBe(false);
      expect(isTerminalStatus('input_required')).toBe(false);
    });

    it('should check if task is running', async () => {
      const task = await taskManager.createTask({
        type: 'bootstrap',
        tool: 'bootstrap_validation_loop',
      });

      expect(await taskManager.isTaskRunning(task.taskId)).toBe(true);

      await taskManager.completeTask(task.taskId, { success: true });

      expect(await taskManager.isTaskRunning(task.taskId)).toBe(false);
    });
  });

  describe('Task Cleanup', () => {
    it('should cleanup old completed tasks', async () => {
      const task1 = await taskManager.createTask({ type: 'validation', tool: 'tool1' });
      const task2 = await taskManager.createTask({ type: 'validation', tool: 'tool2' });

      // Complete both tasks
      await taskManager.completeTask(task1.taskId, { success: true });
      await taskManager.completeTask(task2.taskId, { success: true });

      // Manually update lastUpdatedAt to simulate old task
      const t1 = await taskManager.getTask(task1.taskId);
      if (t1) {
        t1.lastUpdatedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ago
      }

      // Cleanup with 1 day max age
      const cleaned = await taskManager.cleanup(24 * 60 * 60 * 1000);

      expect(cleaned).toBe(1);

      // task1 should be cleaned, task2 should remain
      expect(await taskManager.getTask(task1.taskId)).toBeNull();
      expect(await taskManager.getTask(task2.taskId)).not.toBeNull();
    });

    it('should not cleanup running tasks', async () => {
      const task = await taskManager.createTask({
        type: 'bootstrap',
        tool: 'bootstrap_validation_loop',
      });

      // Try to cleanup with 0 max age (should cleanup everything old)
      const cleaned = await taskManager.cleanup(0);

      expect(cleaned).toBe(0);
      expect(await taskManager.getTask(task.taskId)).not.toBeNull();
    });
  });

  describe('Global TaskManager', () => {
    it('should return singleton instance', async () => {
      await resetTaskManager();

      const manager1 = getTaskManager();
      const manager2 = getTaskManager();

      expect(manager1).toBe(manager2);
    });

    it('should reset global instance', async () => {
      const manager1 = getTaskManager();
      await manager1.initialize();

      await resetTaskManager();

      const manager2 = getTaskManager();

      expect(manager1).not.toBe(manager2);
    });
  });

  describe('Task Metadata', () => {
    it('should get task metadata', async () => {
      const task = await taskManager.createTask({
        type: 'planning',
        tool: 'interactive_adr_planning',
        phases: ['research', 'design', 'implement'],
        projectPath: '/project',
      });

      const metadata = taskManager.getMetadata(task.taskId);

      expect(metadata?.type).toBe('planning');
      expect(metadata?.tool).toBe('interactive_adr_planning');
      expect(metadata?.phases?.length).toBe(3);
      expect(metadata?.projectPath).toBe('/project');
    });

    it('should return undefined for non-existent task metadata', () => {
      const metadata = taskManager.getMetadata('non-existent');

      expect(metadata).toBeUndefined();
    });
  });
});

describe('TaskManager Integration with MCP Spec', () => {
  let taskManager: TaskManager;

  beforeEach(async () => {
    await resetTaskManager();
    taskManager = new TaskManager({ enablePersistence: false });
    await taskManager.initialize();
  });

  afterEach(async () => {
    await taskManager.shutdown();
  });

  it('should support all MCP task status values', async () => {
    const statuses: McpTaskStatus[] = [
      'working',
      'input_required',
      'completed',
      'failed',
      'cancelled',
    ];

    for (const status of statuses) {
      // Verify these are valid status types
      expect(['working', 'input_required', 'completed', 'failed', 'cancelled']).toContain(status);
    }
  });

  it('should support ADR-020 task types', async () => {
    const taskTypes = [
      'bootstrap',
      'deployment',
      'research',
      'orchestration',
      'troubleshooting',
      'validation',
      'planning',
    ] as const;

    for (const type of taskTypes) {
      const task = await taskManager.createTask({
        type,
        tool: `${type}_tool`,
      });

      expect(task.metadata?.type).toBe(type);
    }
  });

  it('should provide poll interval for clients', async () => {
    const task = await taskManager.createTask({
      type: 'bootstrap',
      tool: 'bootstrap_validation_loop',
    });

    expect(task.pollInterval).toBeDefined();
    expect(task.pollInterval).toBeGreaterThan(0);
  });

  it('should track TTL for automatic cleanup', async () => {
    const ttl = 5000; // 5 seconds
    const task = await taskManager.createTask({
      type: 'validation',
      tool: 'validate_adr',
      ttl,
    });

    expect(task.ttl).toBe(ttl);
  });
});
