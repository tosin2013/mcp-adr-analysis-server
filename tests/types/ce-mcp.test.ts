/**
 * Tests for CE-MCP Type Definitions
 *
 * Tests type guards and directive validation.
 *
 * @see ADR-014: CE-MCP Architecture
 */

import {
  isOrchestrationDirective,
  isStateMachineDirective,
  isContentResponse,
  type OrchestrationDirective,
  type StateMachineDirective,
  type ToolResponse,
  type SandboxOperation,
  type SandboxOperationType,
  type SandboxContext,
  type SandboxExecutionResult,
  type CompositionDirective,
  type StateTransition,
  type PromptCatalogEntry,
  type CEMCPExecutionMode,
  type CEMCPConfig,
} from '../../src/types/ce-mcp.js';

describe('CE-MCP Types', () => {
  describe('Type Guards', () => {
    describe('isOrchestrationDirective', () => {
      it('should return true for valid orchestration directive', () => {
        const directive: OrchestrationDirective = {
          type: 'orchestration_directive',
          version: '1.0',
          tool: 'test_tool',
          description: 'Test directive',
          sandbox_operations: [],
        };

        expect(isOrchestrationDirective(directive)).toBe(true);
      });

      it('should return false for state machine directive', () => {
        const directive: StateMachineDirective = {
          type: 'state_machine_directive',
          version: '1.0',
          initial_state: {},
          transitions: [],
          final_state: 'done',
        };

        expect(isOrchestrationDirective(directive)).toBe(false);
      });

      it('should return false for content response', () => {
        const response: ToolResponse = {
          type: 'content',
          content: [{ type: 'text', text: 'test' }],
        };

        expect(isOrchestrationDirective(response)).toBe(false);
      });
    });

    describe('isStateMachineDirective', () => {
      it('should return true for valid state machine directive', () => {
        const directive: StateMachineDirective = {
          type: 'state_machine_directive',
          version: '1.0',
          initial_state: { value: 1 },
          transitions: [
            {
              name: 'transition1',
              from: 'initial',
              operation: { op: 'loadKnowledge' },
              next_state: 'done',
            },
          ],
          final_state: 'done',
        };

        expect(isStateMachineDirective(directive)).toBe(true);
      });

      it('should return false for orchestration directive', () => {
        const directive: OrchestrationDirective = {
          type: 'orchestration_directive',
          version: '1.0',
          tool: 'test_tool',
          description: 'Test directive',
          sandbox_operations: [],
        };

        expect(isStateMachineDirective(directive)).toBe(false);
      });

      it('should return false for content response', () => {
        const response: ToolResponse = {
          type: 'content',
          content: [{ type: 'text', text: 'test' }],
        };

        expect(isStateMachineDirective(response)).toBe(false);
      });
    });

    describe('isContentResponse', () => {
      it('should return true for valid content response', () => {
        const response: ToolResponse = {
          type: 'content',
          content: [{ type: 'text', text: 'test' }],
        };

        expect(isContentResponse(response)).toBe(true);
      });

      it('should return true for content response with multiple items', () => {
        const response: ToolResponse = {
          type: 'content',
          content: [
            { type: 'text', text: 'line 1' },
            { type: 'text', text: 'line 2' },
          ],
        };

        expect(isContentResponse(response)).toBe(true);
      });

      it('should return false for orchestration directive', () => {
        const directive: OrchestrationDirective = {
          type: 'orchestration_directive',
          version: '1.0',
          tool: 'test_tool',
          description: 'Test directive',
          sandbox_operations: [],
        };

        expect(isContentResponse(directive)).toBe(false);
      });

      it('should return false for state machine directive', () => {
        const directive: StateMachineDirective = {
          type: 'state_machine_directive',
          version: '1.0',
          initial_state: {},
          transitions: [],
          final_state: 'done',
        };

        expect(isContentResponse(directive)).toBe(false);
      });
    });
  });

  describe('Directive Validation', () => {
    describe('OrchestrationDirective structure', () => {
      it('should support minimal directive', () => {
        const directive: OrchestrationDirective = {
          type: 'orchestration_directive',
          version: '1.0',
          tool: 'test_tool',
          description: 'Test',
          sandbox_operations: [],
        };

        expect(directive.type).toBe('orchestration_directive');
        expect(directive.version).toBe('1.0');
        expect(directive.sandbox_operations).toHaveLength(0);
      });

      it('should support full directive with all optional fields', () => {
        const directive: OrchestrationDirective = {
          type: 'orchestration_directive',
          version: '1.0',
          tool: 'analyze_project',
          description: 'Analyze project ecosystem',
          sandbox_operations: [
            { op: 'loadKnowledge', args: { domain: 'architecture' }, store: 'knowledge' },
            { op: 'analyzeFiles', args: { patterns: ['**/*.ts'] }, store: 'files' },
            { op: 'composeResult', inputs: ['knowledge', 'files'], return: true },
          ],
          compose: {
            sections: [
              { source: 'knowledge', key: 'architectureInsights' },
              { source: 'files', key: 'fileAnalysis', transform: 'summarize' },
            ],
            template: 'analysis_report',
            format: 'markdown',
          },
          output_schema: {
            type: 'object',
            properties: {
              summary: { type: 'string' },
              findings: { type: 'array' },
            },
          },
          metadata: {
            estimated_tokens: 4000,
            complexity: 'high',
            cacheable: true,
            cache_key: 'project-analysis-v1',
          },
        };

        expect(directive.sandbox_operations).toHaveLength(3);
        expect(directive.compose?.sections).toHaveLength(2);
        expect(directive.metadata?.complexity).toBe('high');
      });
    });

    describe('StateMachineDirective structure', () => {
      it('should support minimal state machine', () => {
        const directive: StateMachineDirective = {
          type: 'state_machine_directive',
          version: '1.0',
          initial_state: {},
          transitions: [],
          final_state: 'done',
        };

        expect(directive.type).toBe('state_machine_directive');
        expect(directive.transitions).toHaveLength(0);
      });

      it('should support complex state machine with error handling', () => {
        const directive: StateMachineDirective = {
          type: 'state_machine_directive',
          version: '1.0',
          initial_state: { projectPath: '/test' },
          transitions: [
            {
              name: 'load_context',
              from: 'initial',
              operation: { op: 'loadKnowledge', args: { domain: 'adr' } },
              next_state: 'context_loaded',
              on_error: 'retry',
              max_retries: 3,
            },
            {
              name: 'analyze',
              from: 'context_loaded',
              operation: { op: 'analyzeFiles', args: { patterns: ['**/*.md'] } },
              next_state: 'analyzed',
              on_error: 'skip',
            },
            {
              name: 'finalize',
              from: 'analyzed',
              operation: { op: 'composeResult' },
              next_state: 'done',
              on_error: 'abort',
            },
          ],
          final_state: 'done',
        };

        expect(directive.transitions).toHaveLength(3);
        expect(directive.transitions[0].on_error).toBe('retry');
        expect(directive.transitions[0].max_retries).toBe(3);
      });
    });

    describe('SandboxOperation structure', () => {
      it('should support all operation types', () => {
        const operationTypes: SandboxOperationType[] = [
          'loadKnowledge',
          'loadPrompt',
          'analyzeFiles',
          'scanEnvironment',
          'generateContext',
          'composeResult',
          'validateOutput',
          'cacheResult',
          'retrieveCache',
        ];

        for (const op of operationTypes) {
          const operation: SandboxOperation = { op };
          expect(operation.op).toBe(op);
        }
      });

      it('should support conditional operations', () => {
        const operation: SandboxOperation = {
          op: 'loadKnowledge',
          args: { domain: 'architecture' },
          store: 'knowledge',
          condition: {
            key: 'skipKnowledge',
            operator: 'truthy',
          },
        };

        expect(operation.condition?.operator).toBe('truthy');
      });

      it('should support all condition operators', () => {
        const operators: Array<'exists' | 'equals' | 'contains' | 'truthy'> = [
          'exists',
          'equals',
          'contains',
          'truthy',
        ];

        for (const operator of operators) {
          const operation: SandboxOperation = {
            op: 'loadKnowledge',
            condition: { key: 'test', operator, value: 'test' },
          };
          expect(operation.condition?.operator).toBe(operator);
        }
      });
    });

    describe('CompositionDirective structure', () => {
      it('should support all transform types', () => {
        const transforms: Array<'summarize' | 'extract' | 'format' | 'filter'> = [
          'summarize',
          'extract',
          'format',
          'filter',
        ];

        for (const transform of transforms) {
          const composition: CompositionDirective = {
            sections: [{ source: 'data', key: 'output', transform }],
            template: 'test',
          };
          expect(composition.sections[0].transform).toBe(transform);
        }
      });

      it('should support all output formats', () => {
        const formats: Array<'json' | 'markdown' | 'text'> = ['json', 'markdown', 'text'];

        for (const format of formats) {
          const composition: CompositionDirective = {
            sections: [],
            template: 'test',
            format,
          };
          expect(composition.format).toBe(format);
        }
      });
    });

    describe('StateTransition structure', () => {
      it('should support string operation reference', () => {
        const transition: StateTransition = {
          name: 'step1',
          from: 'initial',
          operation: 'load_knowledge', // String reference to operation
          next_state: 'loaded',
        };

        expect(typeof transition.operation).toBe('string');
      });

      it('should support inline operation definition', () => {
        const transition: StateTransition = {
          name: 'step1',
          from: 'initial',
          operation: { op: 'loadKnowledge', args: { domain: 'test' } },
          next_state: 'loaded',
        };

        expect(typeof transition.operation).toBe('object');
      });
    });
  });

  describe('Context and Result Types', () => {
    describe('SandboxContext structure', () => {
      it('should have required fields', () => {
        const context: SandboxContext = {
          projectPath: '/test/project',
          workingDir: '/test/project',
          env: { NODE_ENV: 'test' },
          limits: {
            timeout: 30000,
            memory: 128 * 1024 * 1024,
            fsOperations: 100,
            networkAllowed: false,
          },
          state: new Map(),
        };

        expect(context.projectPath).toBe('/test/project');
        expect(context.limits.networkAllowed).toBe(false);
        expect(context.state).toBeInstanceOf(Map);
      });
    });

    describe('SandboxExecutionResult structure', () => {
      it('should represent successful execution', () => {
        const result: SandboxExecutionResult = {
          success: true,
          data: { analysis: 'complete' },
          metadata: {
            executionTime: 1500,
            operationsExecuted: 5,
            cachedOperations: ['loadKnowledge'],
          },
        };

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.error).toBeUndefined();
      });

      it('should represent failed execution', () => {
        const result: SandboxExecutionResult = {
          success: false,
          error: 'Operation timeout',
          metadata: {
            executionTime: 30000,
            operationsExecuted: 2,
            cachedOperations: [],
          },
        };

        expect(result.success).toBe(false);
        expect(result.error).toBe('Operation timeout');
        expect(result.data).toBeUndefined();
      });

      it('should track peak memory usage', () => {
        const result: SandboxExecutionResult = {
          success: true,
          data: {},
          metadata: {
            executionTime: 500,
            operationsExecuted: 3,
            peakMemory: 64 * 1024 * 1024,
            cachedOperations: [],
          },
        };

        expect(result.metadata.peakMemory).toBe(64 * 1024 * 1024);
      });
    });
  });

  describe('Configuration Types', () => {
    describe('PromptCatalogEntry structure', () => {
      it('should support all categories', () => {
        const categories: Array<'adr' | 'deployment' | 'analysis' | 'research' | 'security' | 'rules'> =
          ['adr', 'deployment', 'analysis', 'research', 'security', 'rules'];

        for (const category of categories) {
          const entry: PromptCatalogEntry = {
            file: 'test.ts',
            tokens: 1000,
            category,
            sections: ['test'],
            loadOnDemand: true,
          };
          expect(entry.category).toBe(category);
        }
      });

      it('should support optional dependencies', () => {
        const entryWithDeps: PromptCatalogEntry = {
          file: 'test.ts',
          tokens: 1000,
          category: 'analysis',
          sections: ['test'],
          dependencies: ['other-prompt'],
          loadOnDemand: true,
        };

        const entryWithoutDeps: PromptCatalogEntry = {
          file: 'test.ts',
          tokens: 1000,
          category: 'analysis',
          sections: ['test'],
          loadOnDemand: true,
        };

        expect(entryWithDeps.dependencies).toBeDefined();
        expect(entryWithoutDeps.dependencies).toBeUndefined();
      });
    });

    describe('CEMCPExecutionMode', () => {
      it('should support all execution modes', () => {
        const modes: CEMCPExecutionMode[] = ['directive', 'hybrid', 'legacy', 'fallback'];

        for (const mode of modes) {
          const config: CEMCPConfig = {
            mode,
            sandbox: {
              enabled: true,
              timeout: 30000,
              memoryLimit: 128 * 1024 * 1024,
              fsOperationsLimit: 100,
              networkAllowed: false,
            },
            prompts: {
              lazyLoading: true,
              cacheEnabled: true,
              cacheTTL: 3600,
            },
            fallback: {
              enabled: mode === 'fallback' || mode === 'hybrid',
              maxRetries: 3,
            },
          };
          expect(config.mode).toBe(mode);
        }
      });
    });

    describe('CEMCPConfig structure', () => {
      it('should have complete configuration options', () => {
        const config: CEMCPConfig = {
          mode: 'directive',
          sandbox: {
            enabled: true,
            timeout: 30000,
            memoryLimit: 128 * 1024 * 1024,
            fsOperationsLimit: 100,
            networkAllowed: false,
          },
          prompts: {
            lazyLoading: true,
            cacheEnabled: true,
            cacheTTL: 3600,
          },
          fallback: {
            enabled: false,
            apiKey: 'test-key',
            model: 'anthropic/claude-3-sonnet',
            maxRetries: 3,
          },
        };

        expect(config.sandbox.enabled).toBe(true);
        expect(config.prompts.lazyLoading).toBe(true);
        expect(config.fallback.apiKey).toBe('test-key');
      });
    });
  });

  describe('Type Inference', () => {
    it('should narrow types correctly with type guards', () => {
      const responses: ToolResponse[] = [
        {
          type: 'orchestration_directive',
          version: '1.0',
          tool: 'test',
          description: 'Test',
          sandbox_operations: [],
        },
        {
          type: 'state_machine_directive',
          version: '1.0',
          initial_state: {},
          transitions: [],
          final_state: 'done',
        },
        {
          type: 'content',
          content: [{ type: 'text', text: 'test' }],
        },
      ];

      let orchestrationCount = 0;
      let stateMachineCount = 0;
      let contentCount = 0;

      for (const response of responses) {
        if (isOrchestrationDirective(response)) {
          orchestrationCount++;
          // TypeScript should know this is OrchestrationDirective
          expect(response.tool).toBeDefined();
        } else if (isStateMachineDirective(response)) {
          stateMachineCount++;
          // TypeScript should know this is StateMachineDirective
          expect(response.final_state).toBeDefined();
        } else if (isContentResponse(response)) {
          contentCount++;
          // TypeScript should know this is content response
          expect(response.content).toBeDefined();
        }
      }

      expect(orchestrationCount).toBe(1);
      expect(stateMachineCount).toBe(1);
      expect(contentCount).toBe(1);
    });
  });
});
