/**
 * Tests for Research Task Integration
 *
 * Validates the MCP Tasks integration for research orchestrator,
 * implementing ADR-020: MCP Tasks Integration Strategy.
 *
 * @see ADR-020: MCP Tasks Integration Strategy
 */

import {
  ResearchTaskManager,
  getResearchTaskManager,
  resetResearchTaskManager,
  createResearchWithDelegation,
  RESEARCH_PHASES,
  type CreateResearchTaskOptions,
  type ResearchTaskResult,
} from '../../src/utils/research-task-integration.js';
import { resetTaskManager } from '../../src/utils/task-manager.js';

describe('ResearchTaskManager', () => {
  let rtm: ResearchTaskManager;

  beforeEach(async () => {
    await resetTaskManager();
    await resetResearchTaskManager();
    rtm = getResearchTaskManager();
    await rtm.initialize();
  });

  afterEach(async () => {
    await resetResearchTaskManager();
    await resetTaskManager();
  });

  describe('Task Creation with LLM Delegation', () => {
    it('should create a research task with delegation plan', async () => {
      const options: CreateResearchTaskOptions = {
        question: 'How does authentication work in this codebase?',
        projectPath: '/path/to/project',
      };

      const { task, context, plan } = await rtm.createResearchTask(options);

      expect(task).toBeDefined();
      expect(task.taskId).toBeDefined();
      expect(task.status).toBe('working');
      expect(task.metadata?.type).toBe('research');
      expect(task.metadata?.tool).toBe('research_orchestrator');
      expect(task.metadata?.phases).toHaveLength(RESEARCH_PHASES.length);

      expect(context).toBeDefined();
      expect(context.taskId).toBe(task.taskId);
      expect(context.currentPhase).toBe('initialization');
      expect(context.question).toBe(options.question);
      expect(context.projectPath).toBe(options.projectPath);
      expect(context.cancelled).toBe(false);

      expect(plan).toBeDefined();
      expect(plan.taskId).toBe(task.taskId);
      expect(plan.question).toBe(options.question);
    });

    it('should generate research plan with correct phases', async () => {
      const { plan } = await rtm.createResearchTask({
        question: 'What is the architecture?',
        projectPath: '/project',
      });

      expect(plan.phases).toHaveLength(4); // project_files, knowledge_graph, environment, web_search
      expect(plan.phases[0].phase).toBe('project_files_search');
      expect(plan.phases[0].tool).toBe('searchCodebase');
      expect(plan.phases[1].phase).toBe('knowledge_graph_query');
      expect(plan.phases[1].tool).toBe('query_knowledge_graph');
      expect(plan.phases[2].phase).toBe('environment_analysis');
      expect(plan.phases[2].tool).toBe('environment_analysis');
      expect(plan.phases[3].phase).toBe('web_search');
      expect(plan.phases[3].tool).toBe('web_search');
    });

    it('should exclude web search when disabled', async () => {
      const { plan } = await rtm.createResearchTask({
        question: 'What is the architecture?',
        projectPath: '/project',
        includeWebSearch: false,
      });

      expect(plan.phases).toHaveLength(3); // No web_search
      expect(plan.phases.every(p => p.phase !== 'web_search')).toBe(true);
    });

    it('should include synthesis instructions in plan', async () => {
      const { plan } = await rtm.createResearchTask({
        question: 'Test question',
        projectPath: '/project',
      });

      expect(plan.synthesisInstructions).toContain('Combine Sources');
      expect(plan.synthesisInstructions).toContain('Calculate Confidence');
      expect(plan.expectedResultFormat).toContain('answer');
      expect(plan.expectedResultFormat).toContain('confidence');
    });
  });

  describe('Phase Management', () => {
    it('should start and complete phases', async () => {
      const { task } = await rtm.createResearchTask({
        question: 'Test question',
        projectPath: '/project',
      });

      await rtm.startPhase(task.taskId, 'project_files_search', 'Searching files...');

      const { task: updatedTask } = await rtm.getTaskStatus(task.taskId);
      const phase = updatedTask?.metadata?.phases?.find(p => p.name === 'project_files_search');
      expect(phase?.status).toBe('running');

      await rtm.completePhase(task.taskId, 'project_files_search', 'Files searched');

      const { task: completedTask } = await rtm.getTaskStatus(task.taskId);
      const completedPhase = completedTask?.metadata?.phases?.find(
        p => p.name === 'project_files_search'
      );
      expect(completedPhase?.status).toBe('completed');
      expect(completedPhase?.progress).toBe(100);
    });

    it('should fail a phase with error', async () => {
      const { task } = await rtm.createResearchTask({
        question: 'Test question',
        projectPath: '/project',
      });

      await rtm.startPhase(task.taskId, 'knowledge_graph_query');
      await rtm.failPhase(task.taskId, 'knowledge_graph_query', 'Graph connection failed');

      const { task: failedTask } = await rtm.getTaskStatus(task.taskId);
      const phase = failedTask?.metadata?.phases?.find(p => p.name === 'knowledge_graph_query');
      expect(phase?.status).toBe('failed');
      expect(phase?.error).toBe('Graph connection failed');
    });

    it('should update phase progress', async () => {
      const { task } = await rtm.createResearchTask({
        question: 'Test question',
        projectPath: '/project',
      });

      await rtm.startPhase(task.taskId, 'project_files_search');
      await rtm.updatePhaseProgress(task.taskId, 'project_files_search', 50, 'Halfway through');

      const { task: updatedTask } = await rtm.getTaskStatus(task.taskId);
      const phase = updatedTask?.metadata?.phases?.find(p => p.name === 'project_files_search');
      expect(phase?.progress).toBe(50);
    });
  });

  describe('Result Storage', () => {
    it('should store project files result', async () => {
      const { task, context } = await rtm.createResearchTask({
        question: 'Test question',
        projectPath: '/project',
      });

      await rtm.storeProjectFilesResult(task.taskId, {
        filesFound: 15,
        relevantFiles: ['src/auth.ts', 'src/login.ts'],
        confidence: 0.85,
      });

      expect(context.projectFilesResult).toBeDefined();
      expect(context.projectFilesResult?.filesFound).toBe(15);
      expect(context.projectFilesResult?.relevantFiles).toHaveLength(2);
      expect(context.projectFilesResult?.confidence).toBe(0.85);
    });

    it('should store knowledge graph result', async () => {
      const { task, context } = await rtm.createResearchTask({
        question: 'Test question',
        projectPath: '/project',
      });

      await rtm.storeKnowledgeGraphResult(task.taskId, {
        nodesFound: 10,
        relationshipsFound: 25,
        confidence: 0.9,
      });

      expect(context.knowledgeGraphResult).toBeDefined();
      expect(context.knowledgeGraphResult?.nodesFound).toBe(10);
      expect(context.knowledgeGraphResult?.relationshipsFound).toBe(25);
    });

    it('should store environment result', async () => {
      const { task, context } = await rtm.createResearchTask({
        question: 'Test question',
        projectPath: '/project',
      });

      await rtm.storeEnvironmentResult(task.taskId, {
        capabilitiesFound: 5,
        relevantData: { nodeVersion: '18.0.0' },
        confidence: 0.95,
      });

      expect(context.environmentResult).toBeDefined();
      expect(context.environmentResult?.capabilitiesFound).toBe(5);
    });

    it('should store web search result', async () => {
      const { task, context } = await rtm.createResearchTask({
        question: 'Test question',
        projectPath: '/project',
      });

      await rtm.storeWebSearchResult(task.taskId, {
        resultsFound: 8,
        sources: ['stackoverflow.com', 'github.com'],
        confidence: 0.7,
      });

      expect(context.webSearchResult).toBeDefined();
      expect(context.webSearchResult?.resultsFound).toBe(8);
      expect(context.webSearchResult?.sources).toHaveLength(2);
    });

    it('should store synthesized answer', async () => {
      const { task, context } = await rtm.createResearchTask({
        question: 'Test question',
        projectPath: '/project',
      });

      await rtm.storeSynthesizedAnswer(task.taskId, 'The answer is 42', 0.92);

      expect(context.synthesizedAnswer).toBe('The answer is 42');
      expect(context.overallConfidence).toBe(0.92);
    });
  });

  describe('Cancellation', () => {
    it('should check if task is cancelled', async () => {
      const { task } = await rtm.createResearchTask({
        question: 'Test question',
        projectPath: '/project',
      });

      expect(await rtm.isCancelled(task.taskId)).toBe(false);

      await rtm.cancelTask(task.taskId, 'User cancelled');

      // Context is removed after cancellation
      expect(rtm.getContext(task.taskId)).toBeUndefined();
    });

    it('should throw error when starting phase on cancelled task', async () => {
      const { task } = await rtm.createResearchTask({
        question: 'Test question',
        projectPath: '/project',
      });

      const context = rtm.getContext(task.taskId);
      if (context) {
        context.cancelled = true;
      }

      await expect(rtm.startPhase(task.taskId, 'project_files_search')).rejects.toThrow(
        'cancelled'
      );
    });
  });

  describe('Task Completion', () => {
    it('should complete task successfully', async () => {
      const { task } = await rtm.createResearchTask({
        question: 'Test question',
        projectPath: '/project',
      });

      const result: ResearchTaskResult = {
        success: true,
        data: {
          answer: 'The authentication uses JWT tokens',
          confidence: 0.88,
          sources: [
            {
              type: 'project_files',
              confidence: 0.9,
              data: {},
              timestamp: new Date().toISOString(),
            },
          ],
          phasesCompleted: ['project_files_search', 'knowledge_graph_query'],
        },
      };

      await rtm.completeTask(task.taskId, result);

      const { task: completedTask } = await rtm.getTaskStatus(task.taskId);
      expect(completedTask?.status).toBe('completed');
      expect(completedTask?.result).toEqual(result);

      // Context should be cleaned up
      expect(rtm.getContext(task.taskId)).toBeUndefined();
    });

    it('should fail task with error', async () => {
      const { task } = await rtm.createResearchTask({
        question: 'Test question',
        projectPath: '/project',
      });

      await rtm.failTask(task.taskId, 'Research failed due to timeout');

      const { task: failedTask } = await rtm.getTaskStatus(task.taskId);
      expect(failedTask?.status).toBe('failed');

      // Context should be cleaned up
      expect(rtm.getContext(task.taskId)).toBeUndefined();
    });
  });
});

describe('createResearchWithDelegation', () => {
  beforeEach(async () => {
    await resetTaskManager();
    await resetResearchTaskManager();
  });

  afterEach(async () => {
    await resetResearchTaskManager();
    await resetTaskManager();
  });

  it('should create research task and return delegation plan', async () => {
    const options: CreateResearchTaskOptions = {
      question: 'How does the caching system work?',
      projectPath: '/project',
    };

    const { taskId, plan, tracker } = await createResearchWithDelegation(options);

    expect(taskId).toBeDefined();
    expect(plan).toBeDefined();
    expect(plan.question).toBe(options.question);
    expect(plan.phases.length).toBeGreaterThan(0);
    expect(tracker).toBeDefined();
    expect(tracker.taskId).toBe(taskId);
  });

  it('should provide tracker with all required methods', async () => {
    const { tracker } = await createResearchWithDelegation({
      question: 'Test question',
      projectPath: '/project',
    });

    expect(typeof tracker.startPhase).toBe('function');
    expect(typeof tracker.updatePhaseProgress).toBe('function');
    expect(typeof tracker.completePhase).toBe('function');
    expect(typeof tracker.failPhase).toBe('function');
    expect(typeof tracker.storeProjectFilesResult).toBe('function');
    expect(typeof tracker.storeKnowledgeGraphResult).toBe('function');
    expect(typeof tracker.storeEnvironmentResult).toBe('function');
    expect(typeof tracker.storeWebSearchResult).toBe('function');
    expect(typeof tracker.storeSynthesizedAnswer).toBe('function');
    expect(typeof tracker.isCancelled).toBe('function');
    expect(typeof tracker.cancel).toBe('function');
    expect(typeof tracker.complete).toBe('function');
    expect(typeof tracker.fail).toBe('function');
    expect(typeof tracker.getContext).toBe('function');
  });

  it('should execute full research workflow with tracker', async () => {
    const { taskId, tracker } = await createResearchWithDelegation({
      question: 'What is the project structure?',
      projectPath: '/project',
    });

    // Simulate LLM executing the research plan

    // Phase 1: Project files search
    await tracker.startPhase('project_files_search');
    await tracker.storeProjectFilesResult({
      filesFound: 20,
      relevantFiles: ['src/index.ts', 'src/utils/cache.ts'],
      confidence: 0.85,
    });
    await tracker.completePhase('project_files_search');

    // Phase 2: Knowledge graph query
    await tracker.startPhase('knowledge_graph_query');
    await tracker.storeKnowledgeGraphResult({
      nodesFound: 5,
      relationshipsFound: 12,
      confidence: 0.8,
    });
    await tracker.completePhase('knowledge_graph_query');

    // Phase 3: Environment analysis
    await tracker.startPhase('environment_analysis');
    await tracker.storeEnvironmentResult({
      capabilitiesFound: 3,
      relevantData: { framework: 'express' },
      confidence: 0.9,
    });
    await tracker.completePhase('environment_analysis');

    // Synthesis
    await tracker.startPhase('synthesis');
    await tracker.storeSynthesizedAnswer(
      'The project is structured as a Node.js MCP server with utils, tools, and tests directories.',
      0.85
    );
    await tracker.completePhase('synthesis');

    // Complete the task
    await tracker.complete({
      success: true,
      data: {
        answer: 'The project is structured as a Node.js MCP server...',
        confidence: 0.85,
        sources: [
          {
            type: 'project_files',
            confidence: 0.85,
            data: {},
            timestamp: new Date().toISOString(),
          },
          {
            type: 'knowledge_graph',
            confidence: 0.8,
            data: {},
            timestamp: new Date().toISOString(),
          },
          { type: 'environment', confidence: 0.9, data: {}, timestamp: new Date().toISOString() },
        ],
        phasesCompleted: [
          'project_files_search',
          'knowledge_graph_query',
          'environment_analysis',
          'synthesis',
        ],
      },
    });

    // Verify final state
    const rtm = getResearchTaskManager();
    const { task } = await rtm.getTaskStatus(taskId);
    expect(task?.status).toBe('completed');
    expect(task?.result?.success).toBe(true);
  });

  it('should handle cancellation during execution', async () => {
    const { taskId, tracker } = await createResearchWithDelegation({
      question: 'Test question',
      projectPath: '/project',
    });

    await tracker.startPhase('project_files_search');

    // Check not cancelled
    expect(await tracker.isCancelled()).toBe(false);

    // Cancel the task
    await tracker.cancel('User requested cancellation');

    // Verify task is cancelled by checking manager directly
    const rtm = getResearchTaskManager();
    expect(rtm.getContext(taskId)).toBeUndefined();
  });

  it('should handle errors in research', async () => {
    const { taskId, tracker } = await createResearchWithDelegation({
      question: 'Test question',
      projectPath: '/project',
    });

    await tracker.startPhase('project_files_search');
    await tracker.failPhase('project_files_search', 'File system error');

    // Fail the entire task
    await tracker.fail('Research failed: File system error');

    const rtm = getResearchTaskManager();
    const { task } = await rtm.getTaskStatus(taskId);
    expect(task?.status).toBe('failed');
  });
});

describe('Global ResearchTaskManager', () => {
  beforeEach(async () => {
    await resetResearchTaskManager();
    await resetTaskManager();
  });

  afterEach(async () => {
    await resetResearchTaskManager();
    await resetTaskManager();
  });

  it('should return singleton instance', () => {
    const rtm1 = getResearchTaskManager();
    const rtm2 = getResearchTaskManager();

    expect(rtm1).toBe(rtm2);
  });

  it('should reset global instance', async () => {
    const rtm1 = getResearchTaskManager();
    await resetResearchTaskManager();
    const rtm2 = getResearchTaskManager();

    expect(rtm1).not.toBe(rtm2);
  });
});

describe('Research Plan Structure', () => {
  beforeEach(async () => {
    await resetTaskManager();
    await resetResearchTaskManager();
  });

  afterEach(async () => {
    await resetResearchTaskManager();
    await resetTaskManager();
  });

  it('should include tool parameters in plan phases', async () => {
    const rtm = getResearchTaskManager();
    await rtm.initialize();

    const { plan } = await rtm.createResearchTask({
      question: 'How does auth work?',
      projectPath: '/my/project',
    });

    const projectFilesPhase = plan.phases.find(p => p.phase === 'project_files_search');
    expect(projectFilesPhase?.params).toEqual({
      query: 'How does auth work?',
      projectPath: '/my/project',
      includeAdr: true,
      maxResults: 20,
    });

    const kgPhase = plan.phases.find(p => p.phase === 'knowledge_graph_query');
    expect(kgPhase?.params).toEqual({
      question: 'How does auth work?',
      projectPath: '/my/project',
    });
  });

  it('should include conditional web search', async () => {
    const rtm = getResearchTaskManager();
    await rtm.initialize();

    const { plan } = await rtm.createResearchTask({
      question: 'Test',
      projectPath: '/project',
      confidenceThreshold: 0.7,
    });

    const webSearchPhase = plan.phases.find(p => p.phase === 'web_search');
    expect(webSearchPhase?.condition).toContain('0.7');
  });

  it('should have purpose and expectedOutput for each phase', async () => {
    const rtm = getResearchTaskManager();
    await rtm.initialize();

    const { plan } = await rtm.createResearchTask({
      question: 'Test',
      projectPath: '/project',
    });

    for (const phase of plan.phases) {
      expect(phase.purpose).toBeDefined();
      expect(phase.purpose.length).toBeGreaterThan(10);
      expect(phase.expectedOutput).toBeDefined();
      expect(phase.expectedOutput.length).toBeGreaterThan(10);
    }
  });
});
