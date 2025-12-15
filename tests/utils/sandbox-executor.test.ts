/**
 * CE-MCP Sandbox Executor Tests
 *
 * Tests for the sandbox execution engine that processes orchestration directives
 * and state machine directives in an isolated environment.
 *
 * @see ADR-014: CE-MCP Architecture
 */

import { jest as _jest } from '@jest/globals';
import { join } from 'path';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import {
  SandboxExecutor,
  DEFAULT_CEMCP_CONFIG,
  getSandboxExecutor,
  resetSandboxExecutor,
} from '../../src/utils/sandbox-executor';
import {
  OrchestrationDirective,
  StateMachineDirective,
  SandboxOperation as _SandboxOperation,
  CEMCPConfig,
} from '../../src/types/ce-mcp';

describe('SandboxExecutor', () => {
  let executor: SandboxExecutor;
  let testProjectPath: string;

  beforeEach(async () => {
    // Reset global singleton
    resetSandboxExecutor();

    // Create a temporary test project directory
    testProjectPath = await mkdtemp(join(tmpdir(), 'sandbox-test-'));

    // Create project structure
    await mkdir(join(testProjectPath, 'src', 'prompts'), { recursive: true });
    await mkdir(join(testProjectPath, 'src', 'utils'), { recursive: true });
    await mkdir(join(testProjectPath, '.github', 'workflows'), { recursive: true });

    // Create package.json
    await writeFile(
      join(testProjectPath, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: { typescript: '^5.0.0' },
        devDependencies: { jest: '^29.0.0' },
      })
    );

    // Create tsconfig.json
    await writeFile(
      join(testProjectPath, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { target: 'ES2022' } })
    );

    // Create sample TypeScript files
    await writeFile(
      join(testProjectPath, 'src', 'index.ts'),
      'export const main = () => console.log("hello");'
    );
    await writeFile(
      join(testProjectPath, 'src', 'utils', 'helper.ts'),
      'export const helper = (x: number) => x * 2;'
    );

    // Create a prompt file for testing
    await writeFile(
      join(testProjectPath, 'src', 'prompts', 'test-prompt.ts'),
      `// SECTION: test_section\nexport const TEST_PROMPT = 'test prompt content';\n// SECTION: another_section\nexport const ANOTHER = 'another content';`
    );

    executor = new SandboxExecutor();
  });

  afterEach(async () => {
    // Cleanup temp directory
    await rm(testProjectPath, { recursive: true, force: true });
    resetSandboxExecutor();
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      expect(executor['config']).toEqual(DEFAULT_CEMCP_CONFIG);
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig: Partial<CEMCPConfig> = {
        sandbox: {
          enabled: true,
          timeout: 60000,
          memoryLimit: 512 * 1024 * 1024,
          fsOperationsLimit: 2000,
          networkAllowed: false,
        },
      };
      const customExecutor = new SandboxExecutor(customConfig);
      expect(customExecutor['config'].sandbox.timeout).toBe(60000);
      expect(customExecutor['config'].sandbox.memoryLimit).toBe(512 * 1024 * 1024);
      // Other defaults preserved
      expect(customExecutor['config'].prompts.lazyLoading).toBe(true);
    });
  });

  describe('Orchestration Directive Execution', () => {
    it('should execute simple orchestration directive', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'test_tool',
        description: 'Test directive',
        sandbox_operations: [
          { op: 'loadKnowledge', args: { domain: 'architecture' }, store: 'knowledge' },
        ],
      };

      const result = await executor.executeDirective(directive, testProjectPath);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.metadata.operationsExecuted).toBe(1);
    });

    it('should execute multiple operations in sequence', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'multi_op_tool',
        description: 'Multi-operation directive',
        sandbox_operations: [
          { op: 'loadKnowledge', args: { domain: 'testing' }, store: 'knowledge' },
          { op: 'scanEnvironment', store: 'env' },
          { op: 'analyzeFiles', args: { patterns: ['**/*.ts'] }, store: 'files' },
        ],
      };

      const result = await executor.executeDirective(directive, testProjectPath);

      expect(result.success).toBe(true);
      expect(result.metadata.operationsExecuted).toBe(3);
      expect(result.data).toHaveProperty('knowledge');
      expect(result.data).toHaveProperty('env');
      expect(result.data).toHaveProperty('files');
    });

    it('should handle composition directive for result building', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'compose_tool',
        description: 'Composition test',
        sandbox_operations: [
          { op: 'loadKnowledge', args: { domain: 'test' }, store: 'data1' },
          { op: 'scanEnvironment', store: 'data2' },
        ],
        compose: {
          sections: [
            { source: 'data1', key: 'knowledge' },
            { source: 'data2', key: 'environment' },
          ],
          template: 'analysis_result',
          format: 'json',
        },
      };

      const result = await executor.executeDirective(directive, testProjectPath);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('knowledge');
      expect(result.data).toHaveProperty('environment');
      expect(result.data).toHaveProperty('template', 'analysis_result');
    });

    it('should handle return flag for early termination', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'early_return_tool',
        description: 'Early return test',
        sandbox_operations: [
          { op: 'loadKnowledge', args: { domain: 'test' }, store: 'result', return: true },
          { op: 'scanEnvironment', store: 'env' }, // Should not execute
        ],
      };

      const result = await executor.executeDirective(directive, testProjectPath);

      expect(result.success).toBe(true);
      expect(result.metadata.operationsExecuted).toBe(1);
      // Second operation should not have executed
    });

    it('should handle conditional operations', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'conditional_tool',
        description: 'Conditional operation test',
        sandbox_operations: [
          { op: 'loadKnowledge', args: { domain: 'test' }, store: 'knowledge' },
          {
            op: 'scanEnvironment',
            store: 'env',
            condition: { key: 'knowledge', operator: 'exists' },
          },
          {
            op: 'analyzeFiles',
            store: 'files',
            condition: { key: 'nonexistent', operator: 'exists' }, // Should skip
          },
        ],
      };

      const result = await executor.executeDirective(directive, testProjectPath);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('knowledge');
      expect(result.data).toHaveProperty('env');
      expect(result.data).not.toHaveProperty('files');
    });
  });

  describe('State Machine Directive Execution', () => {
    it('should execute simple state machine directive', async () => {
      const directive: StateMachineDirective = {
        type: 'state_machine_directive',
        version: '1.0',
        initial_state: { input: 'test' },
        transitions: [
          {
            name: 'process',
            from: 'initial',
            operation: { op: 'loadKnowledge', args: { domain: 'test' }, store: 'result' },
            next_state: 'result',
          },
        ],
        final_state: 'result',
      };

      const result = await executor.executeDirective(directive, testProjectPath);

      expect(result.success).toBe(true);
      expect(result.metadata.operationsExecuted).toBe(1);
    });

    it('should execute multi-step state machine', async () => {
      const directive: StateMachineDirective = {
        type: 'state_machine_directive',
        version: '1.0',
        initial_state: { step: 0 },
        transitions: [
          {
            name: 'step1',
            from: 'initial',
            operation: { op: 'loadKnowledge', args: { domain: 'step1' }, store: 'step1_result' },
            next_state: 'step1_done',
          },
          {
            name: 'step2',
            from: 'step1_done',
            operation: { op: 'scanEnvironment', store: 'step2_result' },
            next_state: 'step2_done',
          },
          {
            name: 'finalize',
            from: 'step2_done',
            operation: { op: 'composeResult', store: 'final' },
            next_state: 'final',
          },
        ],
        final_state: 'final',
      };

      const result = await executor.executeDirective(directive, testProjectPath);

      expect(result.success).toBe(true);
      expect(result.metadata.operationsExecuted).toBe(3);
    });

    it('should handle state machine error with skip', async () => {
      const directive: StateMachineDirective = {
        type: 'state_machine_directive',
        version: '1.0',
        initial_state: {},
        transitions: [
          {
            name: 'failing_step',
            from: 'initial',
            operation: 'nonexistent_tool', // This will fail (tool invocation not supported)
            next_state: 'result',
            on_error: 'skip',
          },
        ],
        final_state: 'result',
      };

      const result = await executor.executeDirective(directive, testProjectPath);

      expect(result.success).toBe(true); // Skipped, so continued
    });

    it('should handle state machine error with abort', async () => {
      const directive: StateMachineDirective = {
        type: 'state_machine_directive',
        version: '1.0',
        initial_state: {},
        transitions: [
          {
            name: 'failing_step',
            from: 'initial',
            operation: 'nonexistent_tool',
            next_state: 'result',
            on_error: 'abort',
          },
        ],
        final_state: 'result',
      };

      const result = await executor.executeDirective(directive, testProjectPath);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Operation Handlers', () => {
    describe('loadKnowledge', () => {
      it('should load knowledge for specified domain', async () => {
        const directive: OrchestrationDirective = {
          type: 'orchestration_directive',
          version: '1.0',
          tool: 'knowledge_tool',
          description: 'Load knowledge test',
          sandbox_operations: [
            { op: 'loadKnowledge', args: { domain: 'architecture', scope: 'global' }, store: 'k' },
          ],
        };

        const result = await executor.executeDirective(directive, testProjectPath);

        expect(result.success).toBe(true);
        const knowledge = (result.data as Record<string, unknown>)['k'];
        expect(knowledge).toHaveProperty('domain', 'architecture');
        expect(knowledge).toHaveProperty('scope', 'global');
      });
    });

    describe('loadPrompt', () => {
      it('should load prompt file', async () => {
        const directive: OrchestrationDirective = {
          type: 'orchestration_directive',
          version: '1.0',
          tool: 'prompt_tool',
          description: 'Load prompt test',
          sandbox_operations: [
            { op: 'loadPrompt', args: { name: 'test-prompt' }, store: 'prompt' },
          ],
        };

        const result = await executor.executeDirective(directive, testProjectPath);

        expect(result.success).toBe(true);
      });

      it('should fail when prompt name is missing', async () => {
        const directive: OrchestrationDirective = {
          type: 'orchestration_directive',
          version: '1.0',
          tool: 'prompt_tool',
          description: 'Missing prompt test',
          sandbox_operations: [{ op: 'loadPrompt', args: {}, store: 'prompt' }],
        };

        const result = await executor.executeDirective(directive, testProjectPath);

        expect(result.success).toBe(false);
        expect(result.error).toContain('requires "name" argument');
      });
    });

    describe('analyzeFiles', () => {
      it('should analyze files matching patterns', async () => {
        const directive: OrchestrationDirective = {
          type: 'orchestration_directive',
          version: '1.0',
          tool: 'analyze_tool',
          description: 'Analyze files test',
          sandbox_operations: [
            { op: 'analyzeFiles', args: { patterns: ['**/*.ts'], maxFiles: 10 }, store: 'files' },
          ],
        };

        const result = await executor.executeDirective(directive, testProjectPath);

        expect(result.success).toBe(true);
        const files = (result.data as Record<string, unknown>)['files'] as Record<string, unknown>;
        expect(files).toHaveProperty('totalFiles');
        expect(files).toHaveProperty('files');
        expect(files['totalFiles'] as number).toBeGreaterThan(0);
      });

      it('should respect maxFiles limit', async () => {
        const directive: OrchestrationDirective = {
          type: 'orchestration_directive',
          version: '1.0',
          tool: 'analyze_tool',
          description: 'Max files test',
          sandbox_operations: [
            { op: 'analyzeFiles', args: { patterns: ['**/*.ts'], maxFiles: 1 }, store: 'files' },
          ],
        };

        const result = await executor.executeDirective(directive, testProjectPath);

        expect(result.success).toBe(true);
        const files = (result.data as Record<string, unknown>)['files'] as Record<string, unknown>;
        expect(files['totalFiles'] as number).toBeLessThanOrEqual(1);
      });
    });

    describe('scanEnvironment', () => {
      it('should scan environment configuration', async () => {
        const directive: OrchestrationDirective = {
          type: 'orchestration_directive',
          version: '1.0',
          tool: 'scan_tool',
          description: 'Scan environment test',
          sandbox_operations: [{ op: 'scanEnvironment', store: 'env' }],
        };

        const result = await executor.executeDirective(directive, testProjectPath);

        expect(result.success).toBe(true);
        const env = (result.data as Record<string, unknown>)['env'] as Record<string, unknown>;
        expect(env).toHaveProperty('configFiles');
        expect(env).toHaveProperty('dependencies');
        expect(env).toHaveProperty('hasTypeScript', true);
      });
    });

    describe('generateContext', () => {
      it('should generate context from inputs', async () => {
        const directive: OrchestrationDirective = {
          type: 'orchestration_directive',
          version: '1.0',
          tool: 'context_tool',
          description: 'Generate context test',
          sandbox_operations: [
            { op: 'loadKnowledge', args: { domain: 'test' }, store: 'input1' },
            { op: 'scanEnvironment', store: 'input2' },
            {
              op: 'generateContext',
              args: { type: 'analysis' },
              inputs: ['input1', 'input2'],
              store: 'ctx',
            },
          ],
        };

        const result = await executor.executeDirective(directive, testProjectPath);

        expect(result.success).toBe(true);
        const ctx = (result.data as Record<string, unknown>)['ctx'] as Record<string, unknown>;
        expect(ctx).toHaveProperty('type', 'analysis');
        expect(ctx).toHaveProperty('inputCount', 2);
      });
    });

    describe('composeResult', () => {
      it('should compose result from state', async () => {
        const directive: OrchestrationDirective = {
          type: 'orchestration_directive',
          version: '1.0',
          tool: 'compose_tool',
          description: 'Compose result test',
          sandbox_operations: [
            { op: 'loadKnowledge', args: { domain: 'test' }, store: 'data' },
            { op: 'composeResult', args: { template: 'report', format: 'markdown' }, store: 'r' },
          ],
        };

        const result = await executor.executeDirective(directive, testProjectPath);

        expect(result.success).toBe(true);
        const composed = (result.data as Record<string, unknown>)['r'] as Record<string, unknown>;
        expect(composed).toHaveProperty('template', 'report');
        expect(composed).toHaveProperty('format', 'markdown');
      });
    });

    describe('validateOutput', () => {
      it('should validate non-null output', async () => {
        const directive: OrchestrationDirective = {
          type: 'orchestration_directive',
          version: '1.0',
          tool: 'validate_tool',
          description: 'Validate output test',
          sandbox_operations: [
            { op: 'loadKnowledge', args: { domain: 'test' }, store: 'data' },
            { op: 'validateOutput', input: 'data', store: 'valid' },
          ],
        };

        const result = await executor.executeDirective(directive, testProjectPath);

        expect(result.success).toBe(true);
        const valid = (result.data as Record<string, unknown>)['valid'] as Record<string, unknown>;
        expect(valid).toHaveProperty('valid', true);
      });
    });

    describe('cacheResult and retrieveCache', () => {
      it('should cache and retrieve results', async () => {
        const directive: OrchestrationDirective = {
          type: 'orchestration_directive',
          version: '1.0',
          tool: 'cache_tool',
          description: 'Cache test',
          sandbox_operations: [
            { op: 'loadKnowledge', args: { domain: 'test' }, store: 'data' },
            {
              op: 'cacheResult',
              args: { key: 'test-cache', ttl: 60 },
              input: 'data',
              store: 'cached',
            },
            { op: 'retrieveCache', args: { key: 'test-cache' }, store: 'retrieved' },
          ],
        };

        const result = await executor.executeDirective(directive, testProjectPath);

        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('retrieved');
      });

      it('should return null for non-existent cache', async () => {
        const directive: OrchestrationDirective = {
          type: 'orchestration_directive',
          version: '1.0',
          tool: 'cache_tool',
          description: 'Missing cache test',
          sandbox_operations: [
            { op: 'retrieveCache', args: { key: 'nonexistent' }, store: 'retrieved' },
          ],
        };

        const result = await executor.executeDirective(directive, testProjectPath);

        expect(result.success).toBe(true);
        const retrieved = (result.data as Record<string, unknown>)['retrieved'];
        expect(retrieved).toBeNull();
      });
    });
  });

  describe('Condition Evaluation', () => {
    it('should evaluate exists condition', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'cond_tool',
        description: 'Exists condition test',
        sandbox_operations: [
          { op: 'loadKnowledge', args: { domain: 'test' }, store: 'data' },
          {
            op: 'scanEnvironment',
            store: 'env',
            condition: { key: 'data', operator: 'exists' },
          },
        ],
      };

      const result = await executor.executeDirective(directive, testProjectPath);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('env');
    });

    it('should evaluate truthy condition', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'cond_tool',
        description: 'Truthy condition test',
        sandbox_operations: [
          { op: 'loadKnowledge', args: { domain: 'test' }, store: 'data' },
          {
            op: 'scanEnvironment',
            store: 'env',
            condition: { key: 'data', operator: 'truthy' },
          },
        ],
      };

      const result = await executor.executeDirective(directive, testProjectPath);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('env');
    });

    it('should skip operation when condition fails', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'cond_tool',
        description: 'Failed condition test',
        sandbox_operations: [
          {
            op: 'scanEnvironment',
            store: 'env',
            condition: { key: 'nonexistent', operator: 'exists' },
          },
        ],
      };

      const result = await executor.executeDirective(directive, testProjectPath);

      expect(result.success).toBe(true);
      expect(result.data).not.toHaveProperty('env');
    });
  });

  describe('Resource Limits', () => {
    it('should have configurable timeout setting', () => {
      // Verify timeout configuration works
      const shortTimeoutExecutor = new SandboxExecutor({
        sandbox: {
          enabled: true,
          timeout: 100,
          memoryLimit: 256 * 1024 * 1024,
          fsOperationsLimit: 1000,
          networkAllowed: false,
        },
      });

      expect(shortTimeoutExecutor['config'].sandbox.timeout).toBe(100);
    });

    it('should track execution time in metadata', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'time_tool',
        description: 'Time tracking test',
        sandbox_operations: [
          { op: 'loadKnowledge', args: { domain: 'test' }, store: 'k' },
          { op: 'scanEnvironment', store: 'env' },
        ],
      };

      const result = await executor.executeDirective(directive, testProjectPath);

      expect(result.success).toBe(true);
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.metadata.executionTime).toBe('number');
    });

    it('should enforce fs operations limit configuration', () => {
      const limitedExecutor = new SandboxExecutor({
        sandbox: {
          enabled: true,
          timeout: 30000,
          memoryLimit: 256 * 1024 * 1024,
          fsOperationsLimit: 50,
          networkAllowed: false,
        },
      });

      expect(limitedExecutor['config'].sandbox.fsOperationsLimit).toBe(50);
    });

    it('should enforce memory limit configuration', () => {
      const limitedExecutor = new SandboxExecutor({
        sandbox: {
          enabled: true,
          timeout: 30000,
          memoryLimit: 128 * 1024 * 1024,
          fsOperationsLimit: 1000,
          networkAllowed: false,
        },
      });

      expect(limitedExecutor['config'].sandbox.memoryLimit).toBe(128 * 1024 * 1024);
    });
  });

  describe('Caching', () => {
    it('should cache operation results when cacheable is true', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'cache_tool',
        description: 'Caching test',
        sandbox_operations: [{ op: 'loadKnowledge', args: { domain: 'cache-test' }, store: 'k' }],
        metadata: {
          cacheable: true,
        },
      };

      // Execute twice
      await executor.executeDirective(directive, testProjectPath);
      const result2 = await executor.executeDirective(directive, testProjectPath);

      expect(result2.success).toBe(true);
      expect(result2.metadata.cachedOperations.length).toBeGreaterThan(0);
    });

    it('should track cache statistics', () => {
      const stats = executor.getCacheStats();
      expect(stats).toHaveProperty('operations');
      expect(stats).toHaveProperty('prompts');
    });

    it('should clear caches', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'cache_tool',
        description: 'Cache clear test',
        sandbox_operations: [
          { op: 'cacheResult', args: { key: 'test' }, input: undefined, store: 'cached' },
        ],
      };

      await executor.executeDirective(directive, testProjectPath);
      executor.clearCaches();
      const stats = executor.getCacheStats();

      expect(stats.operations).toBe(0);
      expect(stats.prompts).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown directive type', async () => {
      const invalidDirective = {
        type: 'invalid_type',
        version: '1.0',
      } as unknown as OrchestrationDirective;

      const result = await executor.executeDirective(invalidDirective, testProjectPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown directive type');
    });

    it('should handle unknown operation type', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'error_tool',
        description: 'Unknown op test',
        sandbox_operations: [{ op: 'unknownOperation' as any, store: 'result' }],
      };

      const result = await executor.executeDirective(directive, testProjectPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown operation');
    });

    it('should handle state machine with missing transition', async () => {
      const directive: StateMachineDirective = {
        type: 'state_machine_directive',
        version: '1.0',
        initial_state: {},
        transitions: [
          {
            name: 'step1',
            from: 'initial',
            operation: { op: 'loadKnowledge', store: 'result' },
            next_state: 'step2', // No transition from step2
          },
        ],
        final_state: 'final',
      };

      const result = await executor.executeDirective(directive, testProjectPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No transition found');
    });

    it('should return execution metadata on error', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'error_tool',
        description: 'Error metadata test',
        sandbox_operations: [
          { op: 'loadKnowledge', store: 'k' },
          { op: 'unknownOperation' as any, store: 'err' },
        ],
      };

      const result = await executor.executeDirective(directive, testProjectPath);

      expect(result.success).toBe(false);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.operationsExecuted).toBe(1); // First op succeeded
    });
  });

  describe('Global Singleton', () => {
    it('should return same instance from getSandboxExecutor', () => {
      resetSandboxExecutor();
      const exec1 = getSandboxExecutor();
      const exec2 = getSandboxExecutor();
      expect(exec1).toBe(exec2);
    });

    it('should reset global instance', () => {
      const exec1 = getSandboxExecutor();
      resetSandboxExecutor();
      const exec2 = getSandboxExecutor();
      expect(exec1).not.toBe(exec2);
    });

    it('should accept config on first call only', () => {
      resetSandboxExecutor();
      const exec1 = getSandboxExecutor({
        sandbox: { ...DEFAULT_CEMCP_CONFIG.sandbox, timeout: 99999 },
      });
      const exec2 = getSandboxExecutor({
        sandbox: { ...DEFAULT_CEMCP_CONFIG.sandbox, timeout: 11111 },
      });
      // Second config should be ignored
      expect(exec1).toBe(exec2);
      expect(exec1['config'].sandbox.timeout).toBe(99999);
    });
  });

  describe('Security', () => {
    it('should restrict file access to project path', async () => {
      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'security_tool',
        description: 'Security test',
        sandbox_operations: [
          { op: 'analyzeFiles', args: { patterns: ['**/*.ts'] }, store: 'files' },
        ],
      };

      const result = await executor.executeDirective(directive, testProjectPath);

      expect(result.success).toBe(true);
      const files = (result.data as Record<string, unknown>)['files'] as Record<string, unknown>;
      const fileList = files['files'] as Array<{ path: string }>;

      // All paths should be relative to project
      for (const file of fileList) {
        expect(file.path.startsWith('/')).toBe(true); // Paths start with / (relative from project root)
        expect(file.path).not.toContain('..');
      }
    });

    it('should exclude node_modules and hidden directories', async () => {
      // Create node_modules and hidden directory
      await mkdir(join(testProjectPath, 'node_modules', 'dep'), { recursive: true });
      await mkdir(join(testProjectPath, '.hidden'), { recursive: true });
      await writeFile(
        join(testProjectPath, 'node_modules', 'dep', 'index.ts'),
        'export default {};'
      );
      await writeFile(join(testProjectPath, '.hidden', 'secret.ts'), 'const secret = "hidden";');

      const directive: OrchestrationDirective = {
        type: 'orchestration_directive',
        version: '1.0',
        tool: 'security_tool',
        description: 'Exclusion test',
        sandbox_operations: [
          { op: 'analyzeFiles', args: { patterns: ['**/*.ts'] }, store: 'files' },
        ],
      };

      const result = await executor.executeDirective(directive, testProjectPath);

      expect(result.success).toBe(true);
      const files = (result.data as Record<string, unknown>)['files'] as Record<string, unknown>;
      const fileList = files['files'] as Array<{ path: string }>;

      // No files from node_modules or hidden directories
      for (const file of fileList) {
        expect(file.path).not.toContain('node_modules');
        expect(file.path).not.toContain('.hidden');
      }
    });

    it('should not allow network access by default', () => {
      expect(DEFAULT_CEMCP_CONFIG.sandbox.networkAllowed).toBe(false);
    });
  });
});
