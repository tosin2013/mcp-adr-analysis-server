/**
 * Tests for Bootstrap Task Integration
 *
 * Validates the MCP Tasks integration for bootstrap validation loop,
 * implementing ADR-020: MCP Tasks Integration Strategy.
 *
 * @see ADR-020: MCP Tasks Integration Strategy
 */

import {
  BootstrapTaskManager,
  getBootstrapTaskManager,
  resetBootstrapTaskManager,
  executeWithTaskTracking,
  BOOTSTRAP_PHASES,
  type CreateBootstrapTaskOptions,
  type BootstrapTaskResult,
} from '../../src/utils/bootstrap-task-integration.js';
import { resetTaskManager } from '../../src/utils/task-manager.js';

describe('BootstrapTaskManager', () => {
  let btm: BootstrapTaskManager;

  beforeEach(async () => {
    // Reset both task managers before each test
    await resetTaskManager();
    await resetBootstrapTaskManager();
    btm = getBootstrapTaskManager();
    await btm.initialize();
  });

  afterEach(async () => {
    await resetBootstrapTaskManager();
    await resetTaskManager();
  });

  describe('Task Creation', () => {
    it('should create a bootstrap task with phases', async () => {
      const options: CreateBootstrapTaskOptions = {
        projectPath: '/path/to/project',
        adrDirectory: 'docs/adrs',
        targetEnvironment: 'development',
        maxIterations: 5,
        autoFix: true,
        updateAdrsWithLearnings: true,
      };

      const { task, context } = await btm.createBootstrapTask(options);

      expect(task).toBeDefined();
      expect(task.taskId).toBeDefined();
      expect(task.status).toBe('working');
      expect(task.metadata?.type).toBe('bootstrap');
      expect(task.metadata?.tool).toBe('bootstrap_validation_loop');
      expect(task.metadata?.phases).toHaveLength(BOOTSTRAP_PHASES.length);

      expect(context).toBeDefined();
      expect(context.taskId).toBe(task.taskId);
      expect(context.currentPhase).toBe('platform_detection');
      expect(context.iteration).toBe(0);
      expect(context.maxIterations).toBe(5);
      expect(context.cancelled).toBe(false);
    });

    it('should include project path and ADR directory in metadata', async () => {
      const { task } = await btm.createBootstrapTask({
        projectPath: '/my/project',
        adrDirectory: 'adrs',
        targetEnvironment: 'production',
        maxIterations: 3,
        autoFix: false,
        updateAdrsWithLearnings: false,
      });

      expect(task.metadata?.projectPath).toBe('/my/project');
      expect(task.metadata?.adrDirectory).toBe('adrs');
    });
  });

  describe('Phase Management', () => {
    it('should start and complete phases', async () => {
      const { task } = await btm.createBootstrapTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
        targetEnvironment: 'development',
        maxIterations: 5,
        autoFix: true,
        updateAdrsWithLearnings: true,
      });

      // Start platform detection phase
      await btm.startPhase(task.taskId, 'platform_detection', 'Detecting platform...');

      const { task: updatedTask } = await btm.getTaskStatus(task.taskId);
      const phase = updatedTask?.metadata?.phases?.find(p => p.name === 'platform_detection');
      expect(phase?.status).toBe('running');

      // Complete the phase
      await btm.completePhase(task.taskId, 'platform_detection', 'Platform detected');

      const { task: completedTask } = await btm.getTaskStatus(task.taskId);
      const completedPhase = completedTask?.metadata?.phases?.find(
        p => p.name === 'platform_detection'
      );
      expect(completedPhase?.status).toBe('completed');
      expect(completedPhase?.progress).toBe(100);
    });

    it('should fail a phase with error', async () => {
      const { task } = await btm.createBootstrapTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
        targetEnvironment: 'development',
        maxIterations: 5,
        autoFix: true,
        updateAdrsWithLearnings: true,
      });

      await btm.startPhase(task.taskId, 'infrastructure_setup');
      await btm.failPhase(task.taskId, 'infrastructure_setup', 'Docker not found');

      const { task: failedTask } = await btm.getTaskStatus(task.taskId);
      const phase = failedTask?.metadata?.phases?.find(p => p.name === 'infrastructure_setup');
      expect(phase?.status).toBe('failed');
      expect(phase?.error).toBe('Docker not found');
    });

    it('should update phase progress', async () => {
      const { task } = await btm.createBootstrapTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
        targetEnvironment: 'development',
        maxIterations: 5,
        autoFix: true,
        updateAdrsWithLearnings: true,
      });

      await btm.startPhase(task.taskId, 'platform_detection');
      await btm.updatePhaseProgress(
        task.taskId,
        'platform_detection',
        50,
        'Halfway through detection'
      );

      const { task: updatedTask } = await btm.getTaskStatus(task.taskId);
      const phase = updatedTask?.metadata?.phases?.find(p => p.name === 'platform_detection');
      expect(phase?.progress).toBe(50);
    });
  });

  describe('Iteration Tracking', () => {
    it('should update iteration count', async () => {
      const { task, context } = await btm.createBootstrapTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
        targetEnvironment: 'development',
        maxIterations: 5,
        autoFix: true,
        updateAdrsWithLearnings: true,
      });

      expect(context.iteration).toBe(0);

      await btm.updateIteration(task.taskId, 1);
      expect(btm.getContext(task.taskId)?.iteration).toBe(1);

      await btm.updateIteration(task.taskId, 2);
      expect(btm.getContext(task.taskId)?.iteration).toBe(2);
    });
  });

  describe('Platform Detection Storage', () => {
    it('should store platform detection result', async () => {
      const { task, context } = await btm.createBootstrapTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
        targetEnvironment: 'development',
        maxIterations: 5,
        autoFix: true,
        updateAdrsWithLearnings: true,
      });

      await btm.storePlatformDetection(task.taskId, 'kubernetes', 0.95);

      expect(context.platformDetected).toBe('kubernetes');
    });
  });

  describe('Infrastructure Result Storage', () => {
    it('should store infrastructure result on success', async () => {
      const { task, context } = await btm.createBootstrapTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
        targetEnvironment: 'development',
        maxIterations: 5,
        autoFix: true,
        updateAdrsWithLearnings: true,
      });

      await btm.storeInfrastructureResult(task.taskId, {
        success: true,
        executedTasks: ['task1', 'task2', 'task3'],
        failedTasks: [],
      });

      expect(context.infrastructureResult).toBeDefined();
      expect(context.infrastructureResult?.success).toBe(true);
      expect(context.infrastructureResult?.executedTasks).toHaveLength(3);
    });

    it('should store infrastructure result on failure', async () => {
      const { task, context } = await btm.createBootstrapTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
        targetEnvironment: 'development',
        maxIterations: 5,
        autoFix: true,
        updateAdrsWithLearnings: true,
      });

      await btm.storeInfrastructureResult(task.taskId, {
        success: false,
        executedTasks: ['task1'],
        failedTasks: ['task2', 'task3'],
      });

      expect(context.infrastructureResult?.success).toBe(false);
      expect(context.infrastructureResult?.failedTasks).toHaveLength(2);
    });
  });

  describe('Cancellation', () => {
    it('should check if task is cancelled', async () => {
      const { task } = await btm.createBootstrapTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
        targetEnvironment: 'development',
        maxIterations: 5,
        autoFix: true,
        updateAdrsWithLearnings: true,
      });

      expect(await btm.isCancelled(task.taskId)).toBe(false);

      await btm.cancelTask(task.taskId, 'User cancelled');

      // Context is removed after cancellation
      expect(btm.getContext(task.taskId)).toBeUndefined();
    });

    it('should throw error when starting phase on cancelled task', async () => {
      const { task } = await btm.createBootstrapTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
        targetEnvironment: 'development',
        maxIterations: 5,
        autoFix: true,
        updateAdrsWithLearnings: true,
      });

      // Set cancelled flag in context
      const context = btm.getContext(task.taskId);
      if (context) {
        context.cancelled = true;
      }

      await expect(btm.startPhase(task.taskId, 'platform_detection')).rejects.toThrow('cancelled');
    });
  });

  describe('Task Completion', () => {
    it('should complete task successfully', async () => {
      const { task } = await btm.createBootstrapTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
        targetEnvironment: 'development',
        maxIterations: 5,
        autoFix: true,
        updateAdrsWithLearnings: true,
      });

      const result: BootstrapTaskResult = {
        success: true,
        data: {
          success: true,
          iterations: 3,
          platformDetected: 'kubernetes',
        },
      };

      await btm.completeTask(task.taskId, result);

      const { task: completedTask } = await btm.getTaskStatus(task.taskId);
      expect(completedTask?.status).toBe('completed');
      expect(completedTask?.result).toEqual(result);

      // Context should be cleaned up
      expect(btm.getContext(task.taskId)).toBeUndefined();
    });

    it('should fail task with error', async () => {
      const { task } = await btm.createBootstrapTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
        targetEnvironment: 'development',
        maxIterations: 5,
        autoFix: true,
        updateAdrsWithLearnings: true,
      });

      await btm.failTask(task.taskId, 'Infrastructure deployment failed');

      const { task: failedTask } = await btm.getTaskStatus(task.taskId);
      expect(failedTask?.status).toBe('failed');

      // Context should be cleaned up
      expect(btm.getContext(task.taskId)).toBeUndefined();
    });
  });
});

describe('executeWithTaskTracking', () => {
  beforeEach(async () => {
    await resetTaskManager();
    await resetBootstrapTaskManager();
  });

  afterEach(async () => {
    await resetBootstrapTaskManager();
    await resetTaskManager();
  });

  it('should execute bootstrap workflow with task tracking', async () => {
    const options: CreateBootstrapTaskOptions = {
      projectPath: '/project',
      adrDirectory: 'docs/adrs',
      targetEnvironment: 'development',
      maxIterations: 5,
      autoFix: true,
      updateAdrsWithLearnings: true,
    };

    const { taskId, result } = await executeWithTaskTracking<BootstrapTaskResult>(
      options,
      async tracker => {
        // Simulate platform detection
        await tracker.startPhase('platform_detection');
        await tracker.storePlatformDetection('kubernetes', 0.95);
        await tracker.completePhase('platform_detection');

        // Simulate infrastructure setup
        await tracker.startPhase('infrastructure_setup');
        await tracker.storeInfrastructureResult({
          success: true,
          executedTasks: ['cluster-setup', 'namespace-creation'],
          failedTasks: [],
        });
        await tracker.completePhase('infrastructure_setup');

        // Return result
        return {
          success: true,
          iterations: 1,
          platformDetected: 'kubernetes',
        };
      }
    );

    expect(taskId).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.data?.platformDetected).toBe('kubernetes');
  });

  it('should handle errors in executor', async () => {
    const options: CreateBootstrapTaskOptions = {
      projectPath: '/project',
      adrDirectory: 'docs/adrs',
      targetEnvironment: 'development',
      maxIterations: 5,
      autoFix: true,
      updateAdrsWithLearnings: true,
    };

    const { taskId, result } = await executeWithTaskTracking<BootstrapTaskResult>(
      options,
      async () => {
        throw new Error('Simulated failure');
      }
    );

    expect(taskId).toBeDefined();
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('BOOTSTRAP_ERROR');
    expect(result.error?.message).toBe('Simulated failure');
  });

  it('should check cancellation during execution', async () => {
    const options: CreateBootstrapTaskOptions = {
      projectPath: '/project',
      adrDirectory: 'docs/adrs',
      targetEnvironment: 'development',
      maxIterations: 5,
      autoFix: true,
      updateAdrsWithLearnings: true,
    };

    const { taskId: _taskId, result } = await executeWithTaskTracking<BootstrapTaskResult>(
      options,
      async tracker => {
        // Check cancellation at start
        if (await tracker.isCancelled()) {
          throw new Error('Task was cancelled');
        }

        await tracker.startPhase('platform_detection');
        await tracker.completePhase('platform_detection');

        return {
          success: true,
          iterations: 1,
        };
      }
    );

    expect(result.success).toBe(true);
  });
});

describe('Global BootstrapTaskManager', () => {
  beforeEach(async () => {
    await resetBootstrapTaskManager();
    await resetTaskManager();
  });

  afterEach(async () => {
    await resetBootstrapTaskManager();
    await resetTaskManager();
  });

  it('should return singleton instance', () => {
    const btm1 = getBootstrapTaskManager();
    const btm2 = getBootstrapTaskManager();

    expect(btm1).toBe(btm2);
  });

  it('should reset global instance', async () => {
    const btm1 = getBootstrapTaskManager();
    await resetBootstrapTaskManager();
    const btm2 = getBootstrapTaskManager();

    expect(btm1).not.toBe(btm2);
  });
});
