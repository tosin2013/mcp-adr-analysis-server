/**
 * Tests for ADR Planning Task Integration
 *
 * Validates the MCP Tasks integration for interactive ADR planning tool,
 * implementing ADR-020: MCP Tasks Integration Strategy.
 *
 * @see ADR-020: MCP Tasks Integration Strategy
 */

import {
  AdrPlanningTaskManager,
  getAdrPlanningTaskManager,
  resetAdrPlanningTaskManager,
  executeAdrPlanningWithTaskTracking,
  ADR_PLANNING_PHASES,
  type CreateAdrPlanningTaskOptions,
  type AdrPlanningTaskResult,
} from '../../src/utils/adr-planning-task-integration.js';
import { resetTaskManager } from '../../src/utils/task-manager.js';

describe('AdrPlanningTaskManager', () => {
  let apm: AdrPlanningTaskManager;

  beforeEach(async () => {
    // Reset both task managers before each test
    await resetTaskManager();
    await resetAdrPlanningTaskManager();
    apm = getAdrPlanningTaskManager();
    await apm.initialize();
  });

  afterEach(async () => {
    await resetAdrPlanningTaskManager();
    await resetTaskManager();
  });

  describe('Task Creation', () => {
    it('should create an ADR planning task with phases', async () => {
      const options: CreateAdrPlanningTaskOptions = {
        projectPath: '/path/to/project',
        adrDirectory: 'docs/adrs',
        sessionId: 'test-session-123',
        initialProblem: 'Should we use microservices?',
        enableResearchIntegration: true,
        enableTodoGeneration: true,
      };

      const { task, context } = await apm.createAdrPlanningTask(options);

      expect(task).toBeDefined();
      expect(task.taskId).toBeDefined();
      expect(task.status).toBe('working');
      expect(task.metadata?.type).toBe('adr_planning');
      expect(task.metadata?.tool).toBe('interactive_adr_planning');
      expect(task.metadata?.phases).toHaveLength(ADR_PLANNING_PHASES.length);

      expect(context).toBeDefined();
      expect(context.taskId).toBe(task.taskId);
      expect(context.sessionId).toBe('test-session-123');
      expect(context.currentPhase).toBe('problem_definition');
      expect(context.cancelled).toBe(false);
      expect(context.awaitingInput).toBe(false);
    });

    it('should generate sessionId if not provided', async () => {
      const { context } = await apm.createAdrPlanningTask({
        projectPath: '/my/project',
        adrDirectory: 'adrs',
      });

      expect(context.sessionId).toBeDefined();
      expect(context.sessionId).toMatch(/^adr-planning-\d+$/);
    });

    it('should include project path and ADR directory in metadata', async () => {
      const { task } = await apm.createAdrPlanningTask({
        projectPath: '/my/project',
        adrDirectory: 'docs/decisions',
      });

      expect(task.metadata?.projectPath).toBe('/my/project');
      expect(task.metadata?.adrDirectory).toBe('docs/decisions');
    });
  });

  describe('Phase Management', () => {
    it('should start and complete phases', async () => {
      const { task } = await apm.createAdrPlanningTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
      });

      // Start problem definition phase
      await apm.startPhase(task.taskId, 'problem_definition', 'Defining the problem...');

      const { task: updatedTask } = await apm.getTaskStatus(task.taskId);
      const phase = updatedTask?.metadata?.phases?.find(p => p.name === 'problem_definition');
      expect(phase?.status).toBe('running');

      // Complete the phase
      await apm.completePhase(task.taskId, 'problem_definition', 'Problem defined');

      const { task: completedTask } = await apm.getTaskStatus(task.taskId);
      const completedPhase = completedTask?.metadata?.phases?.find(
        p => p.name === 'problem_definition'
      );
      expect(completedPhase?.status).toBe('completed');
      expect(completedPhase?.progress).toBe(100);
    });

    it('should fail a phase with error', async () => {
      const { task } = await apm.createAdrPlanningTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
      });

      await apm.startPhase(task.taskId, 'research_analysis');
      await apm.failPhase(task.taskId, 'research_analysis', 'Research timeout');

      const { task: failedTask } = await apm.getTaskStatus(task.taskId);
      const phase = failedTask?.metadata?.phases?.find(p => p.name === 'research_analysis');
      expect(phase?.status).toBe('failed');
      expect(phase?.error).toBe('Research timeout');
    });

    it('should update phase progress', async () => {
      const { task } = await apm.createAdrPlanningTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
      });

      await apm.startPhase(task.taskId, 'option_exploration');
      await apm.updatePhaseProgress(
        task.taskId,
        'option_exploration',
        50,
        'Halfway through options'
      );

      const { task: updatedTask } = await apm.getTaskStatus(task.taskId);
      const phase = updatedTask?.metadata?.phases?.find(p => p.name === 'option_exploration');
      expect(phase?.progress).toBe(50);
    });
  });

  describe('Input Request Handling', () => {
    it('should request input and set awaiting state', async () => {
      const { task, context: _context } = await apm.createAdrPlanningTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
      });

      expect(apm.isAwaitingInput(task.taskId)).toBe(false);

      await apm.requestInput(task.taskId, 'What problem are you trying to solve?');

      expect(apm.isAwaitingInput(task.taskId)).toBe(true);

      const { task: inputTask } = await apm.getTaskStatus(task.taskId);
      expect(inputTask?.status).toBe('input_required');
      expect(inputTask?.statusMessage).toBe('What problem are you trying to solve?');
    });

    it('should resume after receiving input', async () => {
      const { task } = await apm.createAdrPlanningTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
      });

      await apm.requestInput(task.taskId, 'Describe the options');
      expect(apm.isAwaitingInput(task.taskId)).toBe(true);

      await apm.resumeAfterInput(task.taskId);

      expect(apm.isAwaitingInput(task.taskId)).toBe(false);

      const { task: resumedTask } = await apm.getTaskStatus(task.taskId);
      expect(resumedTask?.status).toBe('working');
    });
  });

  describe('Result Storage', () => {
    it('should store problem definition', async () => {
      const { task, context } = await apm.createAdrPlanningTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
      });

      await apm.storeProblemDefinition(
        task.taskId,
        'Should we migrate from monolith to microservices?'
      );

      expect(context.problemStatement).toBe('Should we migrate from monolith to microservices?');
    });

    it('should store research findings count', async () => {
      const { task, context } = await apm.createAdrPlanningTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
      });

      await apm.storeResearchFindings(task.taskId, 12);

      expect(context.researchCount).toBe(12);
    });

    it('should store options explored count', async () => {
      const { task, context } = await apm.createAdrPlanningTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
      });

      await apm.storeOptionsExplored(task.taskId, 4);

      expect(context.optionCount).toBe(4);
    });

    it('should store decision made', async () => {
      const { task, context } = await apm.createAdrPlanningTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
      });

      await apm.storeDecision(task.taskId, 'Microservices', 'Better scalability and team autonomy');

      expect(context.selectedOption).toBe('Microservices');
    });

    it('should store impact assessment', async () => {
      const { task, context } = await apm.createAdrPlanningTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
      });

      await apm.storeImpactAssessment(task.taskId, {
        technicalImpacts: 5,
        businessImpacts: 3,
        risks: 4,
      });

      expect(context.impactAssessment).toBeDefined();
      expect(context.impactAssessment?.technicalImpacts).toBe(5);
      expect(context.impactAssessment?.businessImpacts).toBe(3);
      expect(context.impactAssessment?.risks).toBe(4);
    });

    it('should store implementation plan', async () => {
      const { task, context } = await apm.createAdrPlanningTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
      });

      await apm.storeImplementationPlan(task.taskId, 15);

      expect(context.todoCount).toBe(15);
    });

    it('should store ADR generated', async () => {
      const { task, context } = await apm.createAdrPlanningTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
      });

      await apm.storeAdrGenerated(task.taskId, 'docs/adrs/adr-021-microservices.md');

      expect(context.adrGenerated).toBe(true);
    });
  });

  describe('Cancellation', () => {
    it('should check if task is cancelled', async () => {
      const { task } = await apm.createAdrPlanningTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
      });

      expect(await apm.isCancelled(task.taskId)).toBe(false);

      await apm.cancelTask(task.taskId, 'User cancelled');

      // Context is removed after cancellation
      expect(apm.getContext(task.taskId)).toBeUndefined();
    });

    it('should throw error when starting phase on cancelled task', async () => {
      const { task } = await apm.createAdrPlanningTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
      });

      // Set cancelled flag in context
      const context = apm.getContext(task.taskId);
      if (context) {
        context.cancelled = true;
      }

      await expect(apm.startPhase(task.taskId, 'problem_definition')).rejects.toThrow('cancelled');
    });
  });

  describe('Task Completion', () => {
    it('should complete task successfully', async () => {
      const { task } = await apm.createAdrPlanningTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
        sessionId: 'completed-session',
      });

      const result: AdrPlanningTaskResult = {
        success: true,
        data: {
          success: true,
          sessionId: 'completed-session',
          phase: 'completed',
          adrPath: 'docs/adrs/adr-021-microservices.md',
          adrTitle: 'ADR-021: Microservices Architecture',
          todoCount: 15,
          researchFindingsCount: 12,
          optionsEvaluated: 4,
        },
      };

      await apm.completeTask(task.taskId, result);

      const { task: completedTask } = await apm.getTaskStatus(task.taskId);
      expect(completedTask?.status).toBe('completed');
      expect(completedTask?.result).toEqual(result);

      // Context should be cleaned up
      expect(apm.getContext(task.taskId)).toBeUndefined();
    });

    it('should fail task with error', async () => {
      const { task } = await apm.createAdrPlanningTask({
        projectPath: '/project',
        adrDirectory: 'docs/adrs',
      });

      await apm.failTask(task.taskId, 'ADR generation failed');

      const { task: failedTask } = await apm.getTaskStatus(task.taskId);
      expect(failedTask?.status).toBe('failed');

      // Context should be cleaned up
      expect(apm.getContext(task.taskId)).toBeUndefined();
    });
  });
});

describe('executeAdrPlanningWithTaskTracking', () => {
  beforeEach(async () => {
    await resetTaskManager();
    await resetAdrPlanningTaskManager();
  });

  afterEach(async () => {
    await resetAdrPlanningTaskManager();
    await resetTaskManager();
  });

  it('should execute ADR planning workflow with task tracking', async () => {
    const options: CreateAdrPlanningTaskOptions = {
      projectPath: '/project',
      adrDirectory: 'docs/adrs',
      sessionId: 'workflow-test',
    };

    const { taskId, result } = await executeAdrPlanningWithTaskTracking<AdrPlanningTaskResult>(
      options,
      async tracker => {
        // Problem definition phase
        await tracker.startPhase('problem_definition');
        await tracker.storeProblemDefinition('Should we use GraphQL vs REST?');
        await tracker.completePhase('problem_definition');

        // Research phase
        await tracker.startPhase('research_analysis');
        await tracker.storeResearchFindings(8);
        await tracker.completePhase('research_analysis');

        // Options phase
        await tracker.startPhase('option_exploration');
        await tracker.storeOptionsExplored(3);
        await tracker.completePhase('option_exploration');

        // Decision phase
        await tracker.startPhase('decision_making');
        await tracker.storeDecision('GraphQL', 'Better flexibility for frontend needs');
        await tracker.completePhase('decision_making');

        // Impact phase
        await tracker.startPhase('impact_assessment');
        await tracker.storeImpactAssessment({
          technicalImpacts: 4,
          businessImpacts: 2,
          risks: 3,
        });
        await tracker.completePhase('impact_assessment');

        // Implementation phase
        await tracker.startPhase('implementation_planning');
        await tracker.storeImplementationPlan(10);
        await tracker.completePhase('implementation_planning');

        // ADR generation phase
        await tracker.startPhase('adr_generation');
        await tracker.storeAdrGenerated('docs/adrs/adr-022-graphql.md');
        await tracker.completePhase('adr_generation');

        // Return result
        return {
          success: true,
          sessionId: tracker.sessionId,
          phase: 'completed' as const,
          adrPath: 'docs/adrs/adr-022-graphql.md',
          adrTitle: 'ADR-022: GraphQL API',
          todoCount: 10,
          researchFindingsCount: 8,
          optionsEvaluated: 3,
        };
      }
    );

    expect(taskId).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.data?.adrPath).toBe('docs/adrs/adr-022-graphql.md');
    expect(result.data?.optionsEvaluated).toBe(3);
  });

  it('should handle errors in executor', async () => {
    const options: CreateAdrPlanningTaskOptions = {
      projectPath: '/project',
      adrDirectory: 'docs/adrs',
    };

    const { taskId, result } = await executeAdrPlanningWithTaskTracking<AdrPlanningTaskResult>(
      options,
      async () => {
        throw new Error('Research service unavailable');
      }
    );

    expect(taskId).toBeDefined();
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('ADR_PLANNING_ERROR');
    expect(result.error?.message).toBe('Research service unavailable');
  });

  it('should check cancellation during execution', async () => {
    const options: CreateAdrPlanningTaskOptions = {
      projectPath: '/project',
      adrDirectory: 'docs/adrs',
    };

    const { taskId: _taskId, result } =
      await executeAdrPlanningWithTaskTracking<AdrPlanningTaskResult>(options, async tracker => {
        // Check cancellation at start
        if (await tracker.isCancelled()) {
          throw new Error('Task was cancelled');
        }

        await tracker.startPhase('problem_definition');
        await tracker.completePhase('problem_definition');

        return {
          success: true,
          sessionId: tracker.sessionId,
          phase: 'completed' as const,
        };
      });

    expect(result.success).toBe(true);
  });

  it('should handle input request during execution', async () => {
    const options: CreateAdrPlanningTaskOptions = {
      projectPath: '/project',
      adrDirectory: 'docs/adrs',
    };

    const { taskId: _taskId2, result } =
      await executeAdrPlanningWithTaskTracking<AdrPlanningTaskResult>(options, async tracker => {
        await tracker.startPhase('problem_definition');

        // Simulate checking for input state
        const isAwaiting = tracker.isAwaitingInput();
        expect(isAwaiting).toBe(false);

        await tracker.completePhase('problem_definition');

        return {
          success: true,
          sessionId: tracker.sessionId,
          phase: 'completed' as const,
        };
      });

    expect(result.success).toBe(true);
  });

  it('should provide sessionId in tracker', async () => {
    const options: CreateAdrPlanningTaskOptions = {
      projectPath: '/project',
      adrDirectory: 'docs/adrs',
      sessionId: 'custom-session-id',
    };

    let capturedSessionId: string | undefined;

    await executeAdrPlanningWithTaskTracking<AdrPlanningTaskResult>(options, async tracker => {
      capturedSessionId = tracker.sessionId;
      return {
        success: true,
        sessionId: tracker.sessionId,
        phase: 'completed' as const,
      };
    });

    expect(capturedSessionId).toBe('custom-session-id');
  });
});

describe('Global AdrPlanningTaskManager', () => {
  beforeEach(async () => {
    await resetAdrPlanningTaskManager();
    await resetTaskManager();
  });

  afterEach(async () => {
    await resetAdrPlanningTaskManager();
    await resetTaskManager();
  });

  it('should return singleton instance', () => {
    const apm1 = getAdrPlanningTaskManager();
    const apm2 = getAdrPlanningTaskManager();

    expect(apm1).toBe(apm2);
  });

  it('should reset global instance', async () => {
    const apm1 = getAdrPlanningTaskManager();
    await resetAdrPlanningTaskManager();
    const apm2 = getAdrPlanningTaskManager();

    expect(apm1).not.toBe(apm2);
  });
});
