/**
 * Tests for Deployment Task Integration
 *
 * Validates the MCP Tasks integration for deployment readiness tool,
 * implementing ADR-020: MCP Tasks Integration Strategy.
 *
 * @see ADR-020: MCP Tasks Integration Strategy
 */

import {
  DeploymentTaskManager,
  getDeploymentTaskManager,
  resetDeploymentTaskManager,
  executeDeploymentWithTaskTracking,
  DEPLOYMENT_PHASES,
  type CreateDeploymentTaskOptions,
  type DeploymentTaskResult,
} from '../../src/utils/deployment-task-integration.js';
import { resetTaskManager } from '../../src/utils/task-manager.js';

describe('DeploymentTaskManager', () => {
  let dtm: DeploymentTaskManager;

  beforeEach(async () => {
    // Reset both task managers before each test
    await resetTaskManager();
    await resetDeploymentTaskManager();
    dtm = getDeploymentTaskManager();
    await dtm.initialize();
  });

  afterEach(async () => {
    await resetDeploymentTaskManager();
    await resetTaskManager();
  });

  describe('Task Creation', () => {
    it('should create a deployment task with phases', async () => {
      const options: CreateDeploymentTaskOptions = {
        projectPath: '/path/to/project',
        targetEnvironment: 'production',
        operation: 'full_audit',
        strictMode: true,
        enableMemoryIntegration: true,
      };

      const { task, context } = await dtm.createDeploymentTask(options);

      expect(task).toBeDefined();
      expect(task.taskId).toBeDefined();
      expect(task.status).toBe('working');
      expect(task.metadata?.type).toBe('deployment');
      expect(task.metadata?.tool).toBe('deployment_readiness');
      expect(task.metadata?.phases).toHaveLength(DEPLOYMENT_PHASES.length);

      expect(context).toBeDefined();
      expect(context.taskId).toBe(task.taskId);
      expect(context.currentPhase).toBe('initialization');
      expect(context.operation).toBe('full_audit');
      expect(context.targetEnvironment).toBe('production');
      expect(context.cancelled).toBe(false);
    });

    it('should include project path and environment in metadata', async () => {
      const { task } = await dtm.createDeploymentTask({
        projectPath: '/my/project',
        targetEnvironment: 'staging',
        operation: 'test_validation',
      });

      expect(task.metadata?.projectPath).toBe('/my/project');
    });
  });

  describe('Phase Management', () => {
    it('should start and complete phases', async () => {
      const { task } = await dtm.createDeploymentTask({
        projectPath: '/project',
        targetEnvironment: 'production',
        operation: 'full_audit',
      });

      // Start test validation phase
      await dtm.startPhase(task.taskId, 'test_validation', 'Running tests...');

      const { task: updatedTask } = await dtm.getTaskStatus(task.taskId);
      const phase = updatedTask?.metadata?.phases?.find(p => p.name === 'test_validation');
      expect(phase?.status).toBe('running');

      // Complete the phase
      await dtm.completePhase(task.taskId, 'test_validation', 'Tests completed');

      const { task: completedTask } = await dtm.getTaskStatus(task.taskId);
      const completedPhase = completedTask?.metadata?.phases?.find(
        p => p.name === 'test_validation'
      );
      expect(completedPhase?.status).toBe('completed');
      expect(completedPhase?.progress).toBe(100);
    });

    it('should fail a phase with error', async () => {
      const { task } = await dtm.createDeploymentTask({
        projectPath: '/project',
        targetEnvironment: 'production',
        operation: 'full_audit',
      });

      await dtm.startPhase(task.taskId, 'code_quality_analysis');
      await dtm.failPhase(task.taskId, 'code_quality_analysis', 'Security vulnerabilities found');

      const { task: failedTask } = await dtm.getTaskStatus(task.taskId);
      const phase = failedTask?.metadata?.phases?.find(p => p.name === 'code_quality_analysis');
      expect(phase?.status).toBe('failed');
      expect(phase?.error).toBe('Security vulnerabilities found');
    });

    it('should update phase progress', async () => {
      const { task } = await dtm.createDeploymentTask({
        projectPath: '/project',
        targetEnvironment: 'production',
        operation: 'full_audit',
      });

      await dtm.startPhase(task.taskId, 'test_validation');
      await dtm.updatePhaseProgress(task.taskId, 'test_validation', 50, 'Halfway through tests');

      const { task: updatedTask } = await dtm.getTaskStatus(task.taskId);
      const phase = updatedTask?.metadata?.phases?.find(p => p.name === 'test_validation');
      expect(phase?.progress).toBe(50);
    });
  });

  describe('Result Storage', () => {
    it('should store test validation result', async () => {
      const { task, context } = await dtm.createDeploymentTask({
        projectPath: '/project',
        targetEnvironment: 'production',
        operation: 'test_validation',
      });

      await dtm.storeTestValidationResult(task.taskId, {
        passed: true,
        failureCount: 0,
        coveragePercentage: 85,
      });

      expect(context.testValidationResult).toBeDefined();
      expect(context.testValidationResult?.passed).toBe(true);
      expect(context.testValidationResult?.failureCount).toBe(0);
      expect(context.testValidationResult?.coveragePercentage).toBe(85);
    });

    it('should store code quality result', async () => {
      const { task, context } = await dtm.createDeploymentTask({
        projectPath: '/project',
        targetEnvironment: 'production',
        operation: 'full_audit',
      });

      await dtm.storeCodeQualityResult(task.taskId, {
        score: 92,
        securityIssues: 2,
        complexity: 8.5,
      });

      expect(context.codeQualityResult).toBeDefined();
      expect(context.codeQualityResult?.score).toBe(92);
      expect(context.codeQualityResult?.securityIssues).toBe(2);
    });

    it('should store deployment history analysis result', async () => {
      const { task, context } = await dtm.createDeploymentTask({
        projectPath: '/project',
        targetEnvironment: 'production',
        operation: 'deployment_history',
      });

      await dtm.storeHistoryAnalysisResult(task.taskId, {
        successRate: 95,
        rollbackRate: 5,
        recommendedAction: 'proceed',
      });

      expect(context.historyAnalysisResult).toBeDefined();
      expect(context.historyAnalysisResult?.successRate).toBe(95);
      expect(context.historyAnalysisResult?.rollbackRate).toBe(5);
      expect(context.historyAnalysisResult?.recommendedAction).toBe('proceed');
    });

    it('should store ADR compliance result', async () => {
      const { task, context } = await dtm.createDeploymentTask({
        projectPath: '/project',
        targetEnvironment: 'production',
        operation: 'full_audit',
      });

      await dtm.storeAdrComplianceResult(task.taskId, {
        score: 88,
        compliantAdrs: 15,
        totalAdrs: 17,
      });

      expect(context.adrComplianceResult).toBeDefined();
      expect(context.adrComplianceResult?.score).toBe(88);
      expect(context.adrComplianceResult?.compliantAdrs).toBe(15);
      expect(context.adrComplianceResult?.totalAdrs).toBe(17);
    });

    it('should store blocker count', async () => {
      const { task, context } = await dtm.createDeploymentTask({
        projectPath: '/project',
        targetEnvironment: 'production',
        operation: 'full_audit',
      });

      await dtm.storeBlockerCount(task.taskId, 3);

      expect(context.blockerCount).toBe(3);
    });
  });

  describe('Cancellation', () => {
    it('should check if task is cancelled', async () => {
      const { task } = await dtm.createDeploymentTask({
        projectPath: '/project',
        targetEnvironment: 'production',
        operation: 'full_audit',
      });

      expect(await dtm.isCancelled(task.taskId)).toBe(false);

      await dtm.cancelTask(task.taskId, 'User cancelled');

      // Context is removed after cancellation
      expect(dtm.getContext(task.taskId)).toBeUndefined();
    });

    it('should throw error when starting phase on cancelled task', async () => {
      const { task } = await dtm.createDeploymentTask({
        projectPath: '/project',
        targetEnvironment: 'production',
        operation: 'full_audit',
      });

      // Set cancelled flag in context
      const context = dtm.getContext(task.taskId);
      if (context) {
        context.cancelled = true;
      }

      await expect(dtm.startPhase(task.taskId, 'test_validation')).rejects.toThrow('cancelled');
    });
  });

  describe('Task Completion', () => {
    it('should complete task successfully', async () => {
      const { task } = await dtm.createDeploymentTask({
        projectPath: '/project',
        targetEnvironment: 'production',
        operation: 'full_audit',
      });

      const result: DeploymentTaskResult = {
        success: true,
        data: {
          isDeploymentReady: true,
          overallScore: 95,
          confidence: 90,
          blockerCount: 0,
          testsPassed: true,
          gitPushStatus: 'allowed',
        },
      };

      await dtm.completeTask(task.taskId, result);

      const { task: completedTask } = await dtm.getTaskStatus(task.taskId);
      expect(completedTask?.status).toBe('completed');
      expect(completedTask?.result).toEqual(result);

      // Context should be cleaned up
      expect(dtm.getContext(task.taskId)).toBeUndefined();
    });

    it('should fail task with error', async () => {
      const { task } = await dtm.createDeploymentTask({
        projectPath: '/project',
        targetEnvironment: 'production',
        operation: 'full_audit',
      });

      await dtm.failTask(task.taskId, 'Critical security vulnerability detected');

      const { task: failedTask } = await dtm.getTaskStatus(task.taskId);
      expect(failedTask?.status).toBe('failed');

      // Context should be cleaned up
      expect(dtm.getContext(task.taskId)).toBeUndefined();
    });
  });
});

describe('executeDeploymentWithTaskTracking', () => {
  beforeEach(async () => {
    await resetTaskManager();
    await resetDeploymentTaskManager();
  });

  afterEach(async () => {
    await resetDeploymentTaskManager();
    await resetTaskManager();
  });

  it('should execute deployment workflow with task tracking', async () => {
    const options: CreateDeploymentTaskOptions = {
      projectPath: '/project',
      targetEnvironment: 'production',
      operation: 'full_audit',
    };

    const { taskId, result } = await executeDeploymentWithTaskTracking<DeploymentTaskResult>(
      options,
      async tracker => {
        // Test validation phase
        await tracker.startPhase('test_validation');
        await tracker.storeTestValidationResult({
          passed: true,
          failureCount: 0,
          coveragePercentage: 90,
        });
        await tracker.completePhase('test_validation');

        // Code quality phase
        await tracker.startPhase('code_quality_analysis');
        await tracker.storeCodeQualityResult({
          score: 95,
          securityIssues: 0,
          complexity: 5.2,
        });
        await tracker.completePhase('code_quality_analysis');

        // ADR compliance phase
        await tracker.startPhase('adr_compliance_check');
        await tracker.storeAdrComplianceResult({
          score: 100,
          compliantAdrs: 20,
          totalAdrs: 20,
        });
        await tracker.completePhase('adr_compliance_check');

        // Store blocker count
        await tracker.storeBlockerCount(0);

        // Return result
        return {
          isDeploymentReady: true,
          overallScore: 95,
          confidence: 90,
          blockerCount: 0,
          testsPassed: true,
          gitPushStatus: 'allowed',
        };
      }
    );

    expect(taskId).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.data?.isDeploymentReady).toBe(true);
    expect(result.data?.gitPushStatus).toBe('allowed');
  });

  it('should handle errors in executor', async () => {
    const options: CreateDeploymentTaskOptions = {
      projectPath: '/project',
      targetEnvironment: 'production',
      operation: 'full_audit',
    };

    const { taskId, result } = await executeDeploymentWithTaskTracking<DeploymentTaskResult>(
      options,
      async () => {
        throw new Error('Critical test failures');
      }
    );

    expect(taskId).toBeDefined();
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('DEPLOYMENT_READINESS_ERROR');
    expect(result.error?.message).toBe('Critical test failures');
  });

  it('should check cancellation during execution', async () => {
    const options: CreateDeploymentTaskOptions = {
      projectPath: '/project',
      targetEnvironment: 'production',
      operation: 'full_audit',
    };

    const { taskId: _taskId, result } =
      await executeDeploymentWithTaskTracking<DeploymentTaskResult>(options, async tracker => {
        // Check cancellation at start
        if (await tracker.isCancelled()) {
          throw new Error('Task was cancelled');
        }

        await tracker.startPhase('test_validation');
        await tracker.completePhase('test_validation');

        return {
          isDeploymentReady: true,
          overallScore: 100,
          confidence: 100,
          blockerCount: 0,
          testsPassed: true,
          gitPushStatus: 'allowed',
        };
      });

    expect(result.success).toBe(true);
  });

  it('should handle blocked deployment scenario', async () => {
    const options: CreateDeploymentTaskOptions = {
      projectPath: '/project',
      targetEnvironment: 'production',
      operation: 'full_audit',
    };

    const { taskId, result } = await executeDeploymentWithTaskTracking<DeploymentTaskResult>(
      options,
      async tracker => {
        // Test validation phase - with failures
        await tracker.startPhase('test_validation');
        await tracker.storeTestValidationResult({
          passed: false,
          failureCount: 5,
          coveragePercentage: 60,
        });
        await tracker.completePhase('test_validation');

        // Store blocker count
        await tracker.storeBlockerCount(3);

        // Return blocked result
        return {
          isDeploymentReady: false,
          overallScore: 45,
          confidence: 80,
          blockerCount: 3,
          testsPassed: false,
          gitPushStatus: 'blocked',
        };
      }
    );

    expect(taskId).toBeDefined();
    expect(result.success).toBe(false);
    expect(result.data?.isDeploymentReady).toBe(false);
    expect(result.data?.gitPushStatus).toBe('blocked');
    expect(result.data?.blockerCount).toBe(3);
  });
});

describe('Global DeploymentTaskManager', () => {
  beforeEach(async () => {
    await resetDeploymentTaskManager();
    await resetTaskManager();
  });

  afterEach(async () => {
    await resetDeploymentTaskManager();
    await resetTaskManager();
  });

  it('should return singleton instance', () => {
    const dtm1 = getDeploymentTaskManager();
    const dtm2 = getDeploymentTaskManager();

    expect(dtm1).toBe(dtm2);
  });

  it('should reset global instance', async () => {
    const dtm1 = getDeploymentTaskManager();
    await resetDeploymentTaskManager();
    const dtm2 = getDeploymentTaskManager();

    expect(dtm1).not.toBe(dtm2);
  });
});
