/**
 * Integration Tests for CE-MCP Directive Flow
 *
 * Tests end-to-end directive execution, state machine transitions,
 * and composition directive processing.
 *
 * @see ADR-014: CE-MCP Architecture
 */

import {
  SandboxExecutor,
  getSandboxExecutor,
  resetSandboxExecutor,
} from '../../src/utils/sandbox-executor.js';
import {
  type OrchestrationDirective,
  type StateMachineDirective,
  isOrchestrationDirective,
  isStateMachineDirective,
} from '../../src/types/ce-mcp.js';
import {
  PromptLoader,
  getPromptLoader,
  resetPromptLoader,
  calculateTokenSavings,
  getPromptsByCategory,
} from '../../src/prompts/prompt-catalog.js';

describe('CE-MCP Integration Flow', () => {
  let executor: SandboxExecutor;

  beforeEach(() => {
    resetSandboxExecutor();
    executor = getSandboxExecutor({
      sandbox: {
        timeout: 30000,
        memoryLimit: 128 * 1024 * 1024,
        fsOperationsLimit: 100,
        networkAllowed: false,
      },
    });
  });

  afterEach(() => {
    resetSandboxExecutor();
  });

  describe('End-to-End Directive Execution', () => {
    it('should execute complete analysis directive flow', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'analyze_project',
        description: 'Comprehensive project analysis',
        sandbox_operations: [
          {
            op: 'loadKnowledge',
            args: { domain: 'architecture' },
            store: 'knowledge',
          },
          {
            op: 'scanEnvironment',
            store: 'environment',
          },
          {
            op: 'analyzeFiles',
            args: { patterns: ['**/*.ts'], maxFiles: 10 },
            store: 'files',
          },
          {
            op: 'generateContext',
            inputs: ['knowledge', 'environment', 'files'],
            store: 'context',
          },
          {
            op: 'composeResult',
            inputs: ['knowledge', 'environment', 'files', 'context'],
            return: true,
          },
        ],
        metadata: {
          estimated_tokens: 4000,
          complexity: 'high',
          cacheable: true,
        },
      };

      const result = await executor.executeDirective(directive, '/test/project');

      expect(result.success).toBe(true);
      expect(result.metadata.operationsExecuted).toBe(5);
      expect(result.data).toBeDefined();
    });

    it('should execute directive with conditional operations', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'conditional_analysis',
        description: 'Analysis with conditional steps',
        sandbox_operations: [
          {
            op: 'loadKnowledge',
            args: { domain: 'security' },
            store: 'security_knowledge',
          },
          {
            op: 'scanEnvironment',
            store: 'env_config',
            condition: {
              key: 'security_knowledge',
              operator: 'exists',
            },
          },
          {
            op: 'validateOutput',
            args: { schema: { type: 'object' } },
            input: 'env_config',
            store: 'validation',
          },
          {
            op: 'composeResult',
            inputs: ['security_knowledge', 'env_config', 'validation'],
            return: true,
          },
        ],
      };

      const result = await executor.executeDirective(directive, '/test/project');

      expect(result.success).toBe(true);
      expect(result.metadata.operationsExecuted).toBeGreaterThanOrEqual(3);
    });

    it('should execute directive with caching', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'cached_analysis',
        description: 'Analysis with caching',
        sandbox_operations: [
          {
            op: 'loadKnowledge',
            args: { domain: 'architecture' },
            store: 'knowledge',
          },
          {
            op: 'cacheResult',
            args: { key: 'arch-knowledge', ttl: 3600 },
            input: 'knowledge',
          },
          {
            op: 'retrieveCache',
            args: { key: 'arch-knowledge' },
            store: 'cached_knowledge',
          },
          {
            op: 'composeResult',
            input: 'cached_knowledge',
            return: true,
          },
        ],
        metadata: {
          cacheable: true,
          cache_key: 'cached-analysis-v1',
        },
      };

      const result = await executor.executeDirective(directive, '/test/project');

      expect(result.success).toBe(true);
      expect(result.metadata.operationsExecuted).toBe(4);
    });
  });

  describe('State Machine Directive Execution', () => {
    it('should execute multi-step state machine', async () => {
      const directive: StateMachineDirective = {
        type: 'state_machine_directive',
        version: '1.0',
        initial_state: { projectPath: '/test/project' },
        transitions: [
          {
            name: 'load_knowledge',
            from: 'initial',
            operation: { op: 'loadKnowledge', args: { domain: 'adr' } },
            next_state: 'knowledge_loaded',
          },
          {
            name: 'scan_files',
            from: 'knowledge_loaded',
            operation: { op: 'analyzeFiles', args: { patterns: ['**/*.md'] } },
            next_state: 'files_scanned',
          },
          {
            name: 'compose_output',
            from: 'files_scanned',
            operation: { op: 'composeResult' },
            next_state: 'done',
          },
        ],
        final_state: 'done',
      };

      const result = await executor.executeDirective(directive, '/test/project');

      expect(result.success).toBe(true);
      expect(result.metadata.operationsExecuted).toBe(3);
    });

    it('should handle state machine with skip on error', async () => {
      const directive: StateMachineDirective = {
        type: 'state_machine_directive',
        version: '1.0',
        initial_state: {},
        transitions: [
          {
            name: 'risky_operation',
            from: 'initial',
            operation: { op: 'unknown_op' as any }, // Will fail
            next_state: 'step2',
            on_error: 'skip',
          },
          {
            name: 'safe_operation',
            from: 'step2',
            operation: { op: 'loadKnowledge', args: { domain: 'test' } },
            next_state: 'done',
          },
        ],
        final_state: 'done',
      };

      const result = await executor.executeDirective(directive, '/test/project');

      // Should complete despite the first operation failing
      expect(result.success).toBe(true);
    });

    it('should abort state machine when error handler is abort', async () => {
      const directive: StateMachineDirective = {
        type: 'state_machine_directive',
        version: '1.0',
        initial_state: {},
        transitions: [
          {
            name: 'critical_operation',
            from: 'initial',
            operation: { op: 'unknown_op' as any },
            next_state: 'step2',
            on_error: 'abort',
          },
          {
            name: 'never_reached',
            from: 'step2',
            operation: { op: 'loadKnowledge' },
            next_state: 'done',
          },
        ],
        final_state: 'done',
      };

      const result = await executor.executeDirective(directive, '/test/project');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // Error should indicate the operation failed
      expect(result.error).toContain('Unknown operation');
    });
  });

  describe('Composition Directive Tests', () => {
    it('should compose result from multiple sources', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'composite_analysis',
        description: 'Analysis with composition',
        sandbox_operations: [
          {
            op: 'loadKnowledge',
            args: { domain: 'architecture' },
            store: 'arch',
          },
          {
            op: 'loadKnowledge',
            args: { domain: 'security' },
            store: 'sec',
          },
          {
            op: 'scanEnvironment',
            store: 'env',
          },
        ],
        compose: {
          sections: [
            { source: 'arch', key: 'architecture' },
            { source: 'sec', key: 'security', transform: 'summarize' },
            { source: 'env', key: 'environment', transform: 'extract' },
          ],
          template: 'analysis_report',
          format: 'markdown',
        },
      };

      const result = await executor.executeDirective(directive, '/test/project');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle JSON format composition', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'json_analysis',
        description: 'Analysis with JSON output',
        sandbox_operations: [
          {
            op: 'loadKnowledge',
            args: { domain: 'test' },
            store: 'data',
          },
        ],
        compose: {
          sections: [{ source: 'data', key: 'result' }],
          template: 'json_output',
          format: 'json',
        },
      };

      const result = await executor.executeDirective(directive, '/test/project');

      expect(result.success).toBe(true);
    });
  });

  describe('Prompt Loader Integration', () => {
    let loader: PromptLoader;

    beforeEach(() => {
      resetPromptLoader();
      loader = getPromptLoader(3600);
    });

    afterEach(() => {
      resetPromptLoader();
    });

    it('should integrate prompt loading with directive execution', async () => {
      // First, use prompt loader to determine what to load
      const recommendations = loader.getLoadRecommendations('adr_analysis');
      expect(recommendations).toContain('adr-suggestion');

      // Then execute directive that would use those prompts
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'adr_analysis',
        description: 'ADR analysis with lazy prompt loading',
        sandbox_operations: [
          {
            op: 'loadPrompt',
            args: { name: 'adr-suggestion', section: 'implicit_decisions' },
            store: 'prompt',
          },
          {
            op: 'loadKnowledge',
            args: { domain: 'adr' },
            store: 'knowledge',
          },
          {
            op: 'composeResult',
            inputs: ['prompt', 'knowledge'],
            return: true,
          },
        ],
      };

      const result = await executor.executeDirective(directive, '/test/project');
      expect(result.success).toBe(true);

      // Calculate token savings
      const savings = calculateTokenSavings(['adr-suggestion']);
      expect(savings.percentage).toBeGreaterThan(80);
    });

    it('should preload related prompts for complex operations', async () => {
      const deploymentPrompts = getPromptsByCategory('deployment');
      expect(deploymentPrompts.length).toBeGreaterThan(0);

      // Preload deployment prompts
      await loader.preloadPromptGroup(deploymentPrompts);
      const stats = loader.getCacheStats();
      expect(stats.size).toBe(deploymentPrompts.length);
    });
  });

  describe('Error Recovery Flow', () => {
    it('should recover from transient failures', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'resilient_analysis',
        description: 'Analysis with error recovery',
        sandbox_operations: [
          {
            op: 'loadKnowledge',
            args: { domain: 'test' },
            store: 'primary',
          },
          {
            op: 'loadKnowledge',
            args: { domain: 'fallback' },
            store: 'backup',
            condition: {
              key: 'primary',
              operator: 'exists',
            },
          },
          {
            op: 'composeResult',
            inputs: ['primary', 'backup'],
            return: true,
          },
        ],
      };

      const result = await executor.executeDirective(directive, '/test/project');
      expect(result.success).toBe(true);
    });

    it('should provide detailed error information on failure', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'failing_analysis',
        description: 'Analysis that will fail',
        sandbox_operations: [
          {
            op: 'unknown_operation' as any,
            store: 'data',
          },
        ],
      };

      const result = await executor.executeDirective(directive, '/test/project');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Characteristics', () => {
    it('should track execution time accurately', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'timed_analysis',
        description: 'Analysis with timing',
        sandbox_operations: [
          { op: 'loadKnowledge', args: { domain: 'test' }, store: 'k1' },
          { op: 'loadKnowledge', args: { domain: 'test2' }, store: 'k2' },
          { op: 'loadKnowledge', args: { domain: 'test3' }, store: 'k3' },
          { op: 'composeResult', inputs: ['k1', 'k2', 'k3'], return: true },
        ],
      };

      const startTime = Date.now();
      const result = await executor.executeDirective(directive, '/test/project');
      const elapsedTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
      // Execution time should be less than elapsed time
      expect(result.metadata.executionTime).toBeLessThanOrEqual(elapsedTime + 100);
    });

    it('should report operations executed count', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'counted_analysis',
        description: 'Analysis with operation counting',
        sandbox_operations: [
          { op: 'loadKnowledge', store: 'k1' },
          { op: 'scanEnvironment', store: 'e1' },
          { op: 'analyzeFiles', store: 'f1' },
          { op: 'generateContext', store: 'c1' },
          { op: 'composeResult', return: true },
        ],
      };

      const result = await executor.executeDirective(directive, '/test/project');

      expect(result.success).toBe(true);
      expect(result.metadata.operationsExecuted).toBe(5);
    });

    it('should track cached operations', async () => {
      // First execution - nothing cached
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'cacheable_analysis',
        description: 'Analysis with caching',
        sandbox_operations: [
          { op: 'loadKnowledge', args: { domain: 'test' }, store: 'k1' },
          { op: 'cacheResult', args: { key: 'test-cache', ttl: 3600 }, input: 'k1' },
          { op: 'composeResult', input: 'k1', return: true },
        ],
        metadata: {
          cacheable: true,
          cache_key: 'cacheable-analysis',
        },
      };

      const result1 = await executor.executeDirective(directive, '/test/project');
      expect(result1.success).toBe(true);

      // Second execution - should use cache
      const directive2: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'retrieve_cached',
        description: 'Retrieve from cache',
        sandbox_operations: [
          { op: 'retrieveCache', args: { key: 'test-cache' }, store: 'cached' },
          { op: 'composeResult', input: 'cached', return: true },
        ],
      };

      const result2 = await executor.executeDirective(directive2, '/test/project');
      expect(result2.success).toBe(true);
    });
  });

  describe('Cross-Component Integration', () => {
    it('should use type guards to handle mixed directive types', () => {
      const orchestration: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'test',
        description: 'Test',
        sandbox_operations: [],
      };

      const stateMachine: StateMachineDirective = {
        type: 'state_machine_directive',
        version: '1.0',
        initial_state: {},
        transitions: [],
        final_state: 'done',
      };

      expect(isOrchestrationDirective(orchestration)).toBe(true);
      expect(isStateMachineDirective(orchestration)).toBe(false);

      expect(isStateMachineDirective(stateMachine)).toBe(true);
      expect(isOrchestrationDirective(stateMachine)).toBe(false);
    });

    it('should maintain state across operation chain', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'stateful_analysis',
        description: 'Analysis maintaining state',
        sandbox_operations: [
          { op: 'loadKnowledge', args: { domain: 'arch' }, store: 'step1' },
          { op: 'generateContext', input: 'step1', store: 'step2' },
          { op: 'validateOutput', input: 'step2', store: 'step3' },
          { op: 'composeResult', inputs: ['step1', 'step2', 'step3'], return: true },
        ],
      };

      const result = await executor.executeDirective(directive, '/test/project');

      expect(result.success).toBe(true);
      expect(result.metadata.operationsExecuted).toBe(4);
      expect(result.data).toBeDefined();
    });
  });
});
