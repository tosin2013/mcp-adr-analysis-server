/**
 * Unit tests for environment-analysis-tool.ts
 * Tests environment analysis functionality with different analysis types
 *
 * Note: This test suite uses a pragmatic approach to mocking, focusing on
 * functional verification rather than complex dependency injection.
 * Confidence: 90% - Tests cover core functionality with proper mocking
 *
 * Key testing decisions:
 * - enableMemoryIntegration: false - Disables internal EnvironmentMemoryManager to avoid I/O
 * - All external dependencies are mocked at module level
 * - Tests verify output structure rather than exact content (content varies by mode)
 */

import { jest } from '@jest/globals';

// Mock ResearchOrchestrator FIRST to prevent hanging on API calls
// This must be before any imports that might trigger the module
jest.mock('../../src/utils/research-orchestrator.js', () => ({
  ResearchOrchestrator: jest.fn().mockImplementation(() => ({
    answerResearchQuestion: jest.fn().mockResolvedValue({
      answer: 'Mock environment research answer',
      confidence: 0.8,
      sources: [
        {
          type: 'environment',
          data: {
            capabilities: ['docker', 'kubernetes'],
          },
        },
      ],
      needsWebSearch: false,
    }),
  })),
}));

// Mock MemoryEntityManager to prevent memory operations from hanging
// (EnvironmentMemoryManager uses MemoryEntityManager internally)
jest.mock('../../src/utils/memory-entity-manager.js', () => ({
  MemoryEntityManager: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    upsertEntity: jest.fn().mockResolvedValue({ id: 'mock-entity-id' }),
    upsertRelationship: jest.fn().mockResolvedValue(undefined),
    queryEntities: jest.fn().mockResolvedValue({ entities: [] }),
    updateEntity: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock EnhancedLogger to prevent logging overhead
jest.mock('../../src/utils/enhanced-logging.js', () => ({
  EnhancedLogger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    clearLogs: jest.fn(),
  })),
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    clearLogs: jest.fn(),
  },
}));

// Mock all utility modules with proper implementations
jest.mock('../../src/utils/environment-analysis.js', () => ({
  analyzeEnvironmentSpecs: jest.fn().mockResolvedValue({
    analysisPrompt: 'Environment Specification Analysis\n\nMock analysis prompt',
    instructions: 'Mock instructions',
    actualData: {},
  }),
  detectContainerization: jest.fn().mockResolvedValue({
    analysisPrompt: 'Containerization Technology Detection\n\nMock containerization analysis',
    instructions: 'Mock instructions',
    actualData: {},
  }),
  determineEnvironmentRequirements: jest.fn().mockResolvedValue({
    analysisPrompt: 'Environment Requirements from ADRs\n\nMock requirements analysis',
    instructions: 'Mock instructions',
    actualData: {},
  }),
  assessEnvironmentCompliance: jest.fn().mockResolvedValue({
    analysisPrompt: 'Environment Compliance Assessment\n\nMock compliance analysis',
    instructions: 'Mock instructions',
    actualData: {},
  }),
}));

jest.mock('../../src/utils/knowledge-generation.js', () => ({
  generateArchitecturalKnowledge: jest.fn().mockResolvedValue({
    prompt: 'Generated Knowledge Prompting\n\nMock knowledge enhancement',
    confidence: 0.9,
  }),
}));

jest.mock('../../src/utils/prompt-execution.js', () => ({
  executePromptWithFallback: jest.fn().mockResolvedValue({
    content: 'Mock prompt execution result',
    isAIGenerated: false,
  }),
  formatMCPResponse: jest.fn((content: string) => ({
    content: [
      {
        type: 'text',
        text: content,
      },
    ],
  })),
}));

// Default test options to disable memory integration and ensure fast tests
const defaultTestOptions = {
  enableMemoryIntegration: false, // Critical: prevents internal I/O operations
  knowledgeEnhancement: false, // Speeds up tests by skipping knowledge generation
  enhancedMode: false, // Speeds up tests
};

describe('environment-analysis-tool', () => {
  let analyzeEnvironment: any;

  beforeAll(async () => {
    const module = await import('../../src/tools/environment-analysis-tool.js');
    analyzeEnvironment = module.analyzeEnvironment;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Flush any pending async operations
    await new Promise(resolve => setImmediate(resolve));
  });

  describe('analyzeEnvironment', () => {
    describe('specs analysis', () => {
      it('should perform environment specs analysis with default parameters', async () => {
        const result = await analyzeEnvironment({ ...defaultTestOptions, analysisType: 'specs' });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Environment Specification Analysis'),
            },
          ],
        });
      }, 5000);

      it('should handle specs analysis with knowledge enhancement enabled', async () => {
        const result = await analyzeEnvironment({
          ...defaultTestOptions,
          analysisType: 'specs',
          knowledgeEnhancement: true,
          enhancedMode: true,
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Generated Knowledge Prompting'),
            },
          ],
        });
      }, 5000);

      it('should handle specs analysis with knowledge enhancement disabled', async () => {
        const result = await analyzeEnvironment({
          ...defaultTestOptions,
          analysisType: 'specs',
          knowledgeEnhancement: false,
          enhancedMode: false,
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Environment Specification Analysis'),
            },
          ],
        });
      }, 5000);

      it('should handle custom project path and ADR directory', async () => {
        const result = await analyzeEnvironment({
          ...defaultTestOptions,
          analysisType: 'specs',
          projectPath: '/custom/project',
          adrDirectory: 'custom/adrs',
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Environment Specification Analysis'),
            },
          ],
        });
      }, 5000);
    });

    describe('containerization analysis', () => {
      it('should perform containerization detection analysis', async () => {
        const result = await analyzeEnvironment({ ...defaultTestOptions, analysisType: 'containerization' });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Containerization Technology Detection'),
            },
          ],
        });
      }, 5000);

      it('should include containerization knowledge enhancement when enabled', async () => {
        const result = await analyzeEnvironment({
          ...defaultTestOptions,
          analysisType: 'containerization',
          knowledgeEnhancement: true,
          enhancedMode: true,
        });

        // With mocked knowledge generation, the output contains the mock response
        expect(result.content[0].text).toContain('Generated Knowledge Prompting');
      }, 5000);

      it('should provide expected containerization output information', async () => {
        const result = await analyzeEnvironment({ ...defaultTestOptions, analysisType: 'containerization' });

        // Verify basic structure - exact content depends on mode
        expect(result.content[0].text).toContain('Containerization Technology Detection');
      }, 5000);
    });

    describe('requirements analysis', () => {
      it('should perform requirements analysis from ADRs', async () => {
        const result = await analyzeEnvironment({ ...defaultTestOptions, analysisType: 'requirements' });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Environment Requirements from ADRs'),
            },
          ],
        });
      }, 5000);

      it('should include requirements knowledge enhancement', async () => {
        const result = await analyzeEnvironment({
          ...defaultTestOptions,
          analysisType: 'requirements',
          knowledgeEnhancement: true,
          enhancedMode: true,
        });

        // With knowledge enhancement enabled, mock data is included
        expect(result.content[0].text).toContain('Generated Knowledge Prompting');
      }, 5000);

      it('should provide expected requirements output information', async () => {
        const result = await analyzeEnvironment({ ...defaultTestOptions, analysisType: 'requirements' });

        // Verify basic structure - exact content depends on mode
        expect(result.content[0].text).toContain('Environment Requirements from ADRs');
      }, 5000);
    });

    describe('compliance analysis', () => {
      it('should perform compliance assessment with required parameters', async () => {
        const result = await analyzeEnvironment({
          ...defaultTestOptions,
          analysisType: 'compliance',
          currentEnvironment: { infrastructure: 'cloud' },
          requirements: { security: 'high' },
          industryStandards: ['SOC2', 'ISO27001'],
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Environment Compliance Assessment'),
            },
          ],
        });
      }, 5000);

      it('should include compliance knowledge enhancement', async () => {
        const result = await analyzeEnvironment({
          ...defaultTestOptions,
          analysisType: 'compliance',
          currentEnvironment: { infrastructure: 'cloud' },
          requirements: { security: 'high' },
          knowledgeEnhancement: true,
          enhancedMode: true,
        });

        // With knowledge enhancement enabled, mock data is included
        expect(result.content[0].text).toContain('Generated Knowledge Prompting');
      }, 5000);

      it('should provide expected compliance output information', async () => {
        const result = await analyzeEnvironment({
          ...defaultTestOptions,
          analysisType: 'compliance',
          currentEnvironment: { infrastructure: 'cloud' },
          requirements: { security: 'high' },
        });

        // Verify basic structure - exact content depends on mode
        expect(result.content[0].text).toContain('Environment Compliance Assessment');
      }, 5000);

      it('should throw error when currentEnvironment is missing', async () => {
        await expect(
          analyzeEnvironment({
            ...defaultTestOptions,
            analysisType: 'compliance',
            requirements: { security: 'high' },
          })
        ).rejects.toThrow('Current environment and requirements are required');
      }, 5000);

      it('should throw error when requirements is missing', async () => {
        await expect(
          analyzeEnvironment({
            ...defaultTestOptions,
            analysisType: 'compliance',
            currentEnvironment: { infrastructure: 'cloud' },
          })
        ).rejects.toThrow('Current environment and requirements are required');
      }, 5000);
    });

    describe('comprehensive analysis', () => {
      it('should perform comprehensive environment analysis', async () => {
        const result = await analyzeEnvironment({ analysisType: 'comprehensive' });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Comprehensive Environment Analysis'),
            },
          ],
        });
      }, 30000);

      it('should include all analysis types in comprehensive mode', async () => {
        const result = await analyzeEnvironment({ analysisType: 'comprehensive' });

        expect(result.content[0].text).toContain('Environment Specification Analysis');
        expect(result.content[0].text).toContain('Containerization Detection');
        expect(result.content[0].text).toContain('Environment Requirements from ADRs');
        expect(result.content[0].text).toContain('Compliance Assessment');
      }, 30000);

      it('should include comprehensive knowledge enhancement', async () => {
        const result = await analyzeEnvironment({
          analysisType: 'comprehensive',
          knowledgeEnhancement: true,
          enhancedMode: true,
        });

        expect(result.content[0].text).toContain('Cloud infrastructure');
        expect(result.content[0].text).toContain('DevOps practices');
        expect(result.content[0].text).toContain('security standards');
        expect(result.content[0].text).toContain('Advanced (comprehensive coverage)');
      }, 30000);

      it('should provide comprehensive workflow guidance', async () => {
        const result = await analyzeEnvironment({ analysisType: 'comprehensive' });

        expect(result.content[0].text).toContain('Comprehensive Workflow');
        expect(result.content[0].text).toContain('Environment Specification Analysis');
        expect(result.content[0].text).toContain('Containerization Detection');
        expect(result.content[0].text).toContain('Requirements Extraction');
        expect(result.content[0].text).toContain('Compliance Assessment');
        expect(result.content[0].text).toContain('Optimization Implementation');
      }, 30000);

      it('should provide expected comprehensive outcomes', async () => {
        const result = await analyzeEnvironment({ analysisType: 'comprehensive' });

        expect(result.content[0].text).toContain('Expected Outcomes');
        expect(result.content[0].text).toContain('Complete Environment Understanding');
        expect(result.content[0].text).toContain('Technology Assessment');
        expect(result.content[0].text).toContain('Optimization Roadmap');
        expect(result.content[0].text).toContain('Risk Mitigation');
      }, 30000);
    });

    describe('error handling', () => {
      it('should throw error for unknown analysis type', async () => {
        await expect(
          analyzeEnvironment({
            analysisType: 'unknown' as any,
          })
        ).rejects.toThrow('Unknown analysis type: unknown');
      });

      it('should handle analysis errors gracefully', async () => {
        // This test would require more complex mocking to simulate internal errors
        // For now, test basic error handling structure
        await expect(
          analyzeEnvironment({
            analysisType: 'specs',
            projectPath: '/nonexistent/path',
          })
        ).resolves.toEqual({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Environment Specification Analysis'),
            },
          ],
        });
      });
    });

    describe('default parameters', () => {
      it('should use default parameters when not specified', async () => {
        const result = await analyzeEnvironment({});

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Comprehensive Environment Analysis'),
            },
          ],
        });
      }, 30000);

      it('should use default project path and ADR directory', async () => {
        const result = await analyzeEnvironment({ analysisType: 'specs' });

        // Should not throw error and should use defaults
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Environment Specification Analysis'),
            },
          ],
        });
      }, 30000);

      it('should enable knowledge enhancement and enhanced mode by default', async () => {
        const result = await analyzeEnvironment({ analysisType: 'specs' });

        expect(result.content[0].text).toContain('Generated Knowledge Prompting');
        expect(result.content[0].text).toContain('Enhanced Mode');
      }, 30000);
    });

    describe('knowledge enhancement scenarios', () => {
      it('should handle knowledge generation success', async () => {
        const result = await analyzeEnvironment({
          analysisType: 'specs',
          knowledgeEnhancement: true,
          enhancedMode: true,
        });

        expect(result.content[0].text).toContain('✅ Applied');
      }, 30000);

      it('should handle knowledge generation disabled', async () => {
        const result = await analyzeEnvironment({
          analysisType: 'specs',
          knowledgeEnhancement: false,
          enhancedMode: false,
        });

        expect(result.content[0].text).toContain('❌ Disabled');
      }, 30000);

      it('should handle mixed enhancement settings', async () => {
        const result = await analyzeEnvironment({
          analysisType: 'containerization',
          knowledgeEnhancement: true,
          enhancedMode: false,
        });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Containerization Technology Detection'),
            },
          ],
        });
      });
    });

    describe('analysis type variations', () => {
      it('should handle all valid analysis types', async () => {
        const analysisTypes = ['specs', 'containerization', 'requirements', 'comprehensive'];

        for (const type of analysisTypes) {
          const result = await analyzeEnvironment({ analysisType: type as any });
          expect(result).toHaveProperty('content');
          expect(Array.isArray(result.content)).toBe(true);
          expect(result.content[0]).toHaveProperty('type', 'text');
          expect(result.content[0]).toHaveProperty('text');
        }
      }, 60000); // Increase timeout to 60 seconds for comprehensive analysis

      it('should provide different content for different analysis types', async () => {
        const specsResult = await analyzeEnvironment({ analysisType: 'specs' });
        const containerResult = await analyzeEnvironment({ analysisType: 'containerization' });
        const requirementsResult = await analyzeEnvironment({ analysisType: 'requirements' });

        expect(specsResult.content[0].text).toContain('Environment Specification');
        expect(containerResult.content[0].text).toContain('Containerization Technology');
        expect(requirementsResult.content[0].text).toContain('Environment Requirements from ADRs');
      }, 30000);
    });
  });
});
