/**
 * Tests for Research Orchestrator LLM Delegation
 *
 * These tests verify the new createResearchPlan method that returns
 * research plans for LLM delegation instead of executing research internally.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResearchOrchestrator } from '../../src/utils/research-orchestrator.js';
import { resetResearchTaskManager } from '../../src/utils/research-task-integration.js';
import { resetTaskManager } from '../../src/utils/task-manager.js';

describe('ResearchOrchestrator LLM Delegation', () => {
  let orchestrator: ResearchOrchestrator;

  beforeEach(async () => {
    // Suppress deprecation warning in tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await resetTaskManager();
    await resetResearchTaskManager();
    orchestrator = new ResearchOrchestrator('/test/project', 'docs/adrs');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createResearchPlan', () => {
    it('should create a research plan with task ID', async () => {
      const { taskId, plan, tracker } = await orchestrator.createResearchPlan(
        'How does authentication work?'
      );

      expect(taskId).toBeDefined();
      expect(typeof taskId).toBe('string');
      expect(taskId.length).toBeGreaterThan(0);
      expect(plan).toBeDefined();
      expect(tracker).toBeDefined();
    });

    it('should return a plan with the research question', async () => {
      const question = 'What database is used in this project?';
      const { plan } = await orchestrator.createResearchPlan(question);

      expect(plan.question).toBe(question);
    });

    it('should include all standard phases in the plan', async () => {
      const { plan } = await orchestrator.createResearchPlan('Test question');

      // Should have at least 3 phases: project_files_search, knowledge_graph_query, environment_analysis
      expect(plan.phases.length).toBeGreaterThanOrEqual(3);

      const phaseNames = plan.phases.map(p => p.phase);
      expect(phaseNames).toContain('project_files_search');
      expect(phaseNames).toContain('knowledge_graph_query');
      expect(phaseNames).toContain('environment_analysis');
    });

    it('should include web search phase by default', async () => {
      const { plan } = await orchestrator.createResearchPlan('Test question');

      const phaseNames = plan.phases.map(p => p.phase);
      expect(phaseNames).toContain('web_search');
    });

    it('should exclude web search when includeWebSearch is false', async () => {
      const { plan } = await orchestrator.createResearchPlan('Test question', {
        includeWebSearch: false,
      });

      const phaseNames = plan.phases.map(p => p.phase);
      expect(phaseNames).not.toContain('web_search');
    });

    it('should include tool information for each phase', async () => {
      const { plan } = await orchestrator.createResearchPlan('Test question');

      for (const phase of plan.phases) {
        expect(phase.tool).toBeDefined();
        expect(typeof phase.tool).toBe('string');
        expect(phase.params).toBeDefined();
        expect(typeof phase.params).toBe('object');
        expect(phase.purpose).toBeDefined();
        expect(typeof phase.purpose).toBe('string');
        expect(phase.expectedOutput).toBeDefined();
      }
    });

    it('should include synthesis instructions', async () => {
      const { plan } = await orchestrator.createResearchPlan('Test question');

      expect(plan.synthesisInstructions).toBeDefined();
      expect(typeof plan.synthesisInstructions).toBe('string');
      expect(plan.synthesisInstructions.length).toBeGreaterThan(100);
    });

    it('should include expected result format', async () => {
      const { plan } = await orchestrator.createResearchPlan('Test question');

      expect(plan.expectedResultFormat).toBeDefined();
      expect(typeof plan.expectedResultFormat).toBe('string');
      expect(plan.expectedResultFormat).toContain('answer');
      expect(plan.expectedResultFormat).toContain('confidence');
    });

    it('should use project path from orchestrator', async () => {
      const { plan } = await orchestrator.createResearchPlan('Test question');

      // The project path should be included in phase params
      const projectFilesPhase = plan.phases.find(p => p.phase === 'project_files_search');
      expect(projectFilesPhase?.params.projectPath).toBe('/test/project');
    });
  });

  describe('Tracker Interface', () => {
    it('should provide all required tracker methods', async () => {
      const { tracker } = await orchestrator.createResearchPlan('Test question');

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

    it('should allow starting and completing phases', async () => {
      const { tracker } = await orchestrator.createResearchPlan('Test question');

      await tracker.startPhase('project_files_search', 'Starting search');
      await tracker.completePhase('project_files_search', 'Search complete');

      // Should not throw
      expect(true).toBe(true);
    });

    it('should allow storing results', async () => {
      const { tracker } = await orchestrator.createResearchPlan('Test question');

      await tracker.storeProjectFilesResult({
        filesFound: 10,
        relevantFiles: ['file1.ts', 'file2.ts'],
        confidence: 0.85,
      });

      await tracker.storeKnowledgeGraphResult({
        nodesFound: 5,
        relationshipsFound: 3,
        confidence: 0.75,
      });

      const context = tracker.getContext();
      expect(context.projectFilesResult).toBeDefined();
      expect(context.projectFilesResult?.filesFound).toBe(10);
      expect(context.knowledgeGraphResult).toBeDefined();
      expect(context.knowledgeGraphResult?.nodesFound).toBe(5);
    });

    it('should allow synthesizing and completing', async () => {
      const { tracker } = await orchestrator.createResearchPlan('Test question');

      await tracker.storeSynthesizedAnswer('The authentication uses JWT tokens.', 0.9);
      await tracker.complete({
        success: true,
        data: {
          answer: 'The authentication uses JWT tokens.',
          confidence: 0.9,
          sources: [],
          phasesCompleted: ['project_files_search', 'knowledge_graph_query'],
        },
      });

      // Should not throw
      expect(true).toBe(true);
    });

    it('should support cancellation', async () => {
      const { taskId, tracker } = await orchestrator.createResearchPlan('Test question');

      await tracker.cancel('User requested cancellation');

      // After cancellation, the context is deleted from the manager
      // So isCancelled() returns false (no context found)
      // This is correct behavior - the task is cancelled and cleaned up
      const { getResearchTaskManager } =
        await import('../../src/utils/research-task-integration.js');
      const rtm = getResearchTaskManager();
      const context = rtm.getContext(taskId);
      expect(context).toBeUndefined(); // Context is removed after cancellation
    });
  });

  describe('Getter Methods', () => {
    it('should return project path', () => {
      expect(orchestrator.getProjectPath()).toBe('/test/project');
    });

    it('should return ADR directory', () => {
      expect(orchestrator.getAdrDirectory()).toBe('docs/adrs');
    });
  });

  describe('Non-blocking Behavior', () => {
    it('should return immediately without executing research', async () => {
      const startTime = Date.now();

      await orchestrator.createResearchPlan(
        'Complex research question about authentication, databases, and deployment'
      );

      const duration = Date.now() - startTime;

      // Should complete in under 100ms since it's not executing research
      // The old method would take 2-8 seconds
      expect(duration).toBeLessThan(100);
    });

    it('should allow multiple createResearchPlan calls', async () => {
      // Verify we can call createResearchPlan multiple times without issues
      // This tests that the non-blocking delegation pattern works correctly

      // First createResearchPlan call
      const result1 = await orchestrator.createResearchPlan('Test question 1');
      expect(result1.taskId).toBeDefined();

      // Second createResearchPlan call
      const result2 = await orchestrator.createResearchPlan('Test question 2');
      expect(result2.taskId).toBeDefined();

      // Third createResearchPlan call
      const result3 = await orchestrator.createResearchPlan('Test question 3');
      expect(result3.taskId).toBeDefined();

      // Each call should produce unique task IDs
      expect(result1.taskId).not.toBe(result2.taskId);
      expect(result2.taskId).not.toBe(result3.taskId);
      expect(result1.taskId).not.toBe(result3.taskId);
    });
  });
});
