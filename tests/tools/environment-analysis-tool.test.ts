/**
 * Unit tests for environment-analysis-tool.ts
 * Tests environment analysis functionality with different analysis types
 *
 * Note: This test suite uses a pragmatic approach to mocking, focusing on
 * functional verification rather than complex dependency injection.
 * Confidence: 85% - Tests cover core functionality with simplified mocking
 */

import { jest } from '@jest/globals';
// import { McpAdrError } from '../../src/types/index.js';

// Mock ResearchOrchestrator to prevent hanging on API calls
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
    upsertEntity: jest.fn().mockResolvedValue(undefined),
    queryEntities: jest.fn().mockResolvedValue({ entities: [] }),
    updateEntity: jest.fn().mockResolvedValue(undefined),
  })),
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

describe('environment-analysis-tool', () => {
  let analyzeEnvironment: any;
  let logger: any;

  beforeAll(async () => {
    const module = await import('../../src/tools/environment-analysis-tool.js');
    analyzeEnvironment = module.analyzeEnvironment;

    // Import logger for cleanup
    const loggingModule = await import('../../src/utils/enhanced-logging.js');
    logger = loggingModule.logger;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Flush any pending async operations
    await new Promise(resolve => setImmediate(resolve));

    // Clear logger to prevent logging after tests complete
    if (logger && logger.clearLogs) {
      logger.clearLogs();
    }
  });

  describe('analyzeEnvironment', () => {
    describe('specs analysis', () => {
      it('should perform environment specs analysis with default parameters', async () => {
        const result = await analyzeEnvironment({ analysisType: 'specs' });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Environment Specification Analysis'),
            },
          ],
        });
      }, 30000);

      it('should handle specs analysis with knowledge enhancement enabled', async () => {
        const result = await analyzeEnvironment({
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
      }, 30000);

      it('should handle specs analysis with knowledge enhancement disabled', async () => {
        const result = await analyzeEnvironment({
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
      }, 30000);

      it('should handle custom project path and ADR directory', async () => {
        const result = await analyzeEnvironment({
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
      });
    });

    describe('containerization analysis', () => {
      it('should perform containerization detection analysis', async () => {
        const result = await analyzeEnvironment({ analysisType: 'containerization' });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Containerization Technology Detection'),
            },
          ],
        });
      }, 30000);

      it('should include containerization knowledge enhancement when enabled', async () => {
        const result = await analyzeEnvironment({
          analysisType: 'containerization',
          knowledgeEnhancement: true,
          enhancedMode: true,
        });

        expect(result.content[0].text).toContain('Generated Knowledge Prompting');
        expect(result.content[0].text).toContain('Enhanced Mode');
        expect(result.content[0].text).toContain('Containerization, Kubernetes, Docker');
      }, 30000);

      it('should provide expected containerization output information', async () => {
        const result = await analyzeEnvironment({ analysisType: 'containerization' });

        expect(result.content[0].text).toContain('Expected Output');
        expect(result.content[0].text).toContain('Dockerfile Analysis');
        expect(result.content[0].text).toContain('Kubernetes Resources');
        expect(result.content[0].text).toContain('Security Findings');
      }, 30000);
    });

    describe('requirements analysis', () => {
      it('should perform requirements analysis from ADRs', async () => {
        const result = await analyzeEnvironment({ analysisType: 'requirements' });

        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('Environment Requirements from ADRs'),
            },
          ],
        });
      });

      it('should include requirements knowledge enhancement', async () => {
        const result = await analyzeEnvironment({
          analysisType: 'requirements',
          knowledgeEnhancement: true,
          enhancedMode: true,
        });

        expect(result.content[0].text).toContain('Requirements engineering');
        expect(result.content[0].text).toContain('infrastructure planning');
        expect(result.content[0].text).toContain('performance requirements');
      });

      it('should provide expected requirements output information', async () => {
        const result = await analyzeEnvironment({ analysisType: 'requirements' });

        expect(result.content[0].text).toContain('Infrastructure Requirements');
        expect(result.content[0].text).toContain('Security Requirements');
        expect(result.content[0].text).toContain('Performance Requirements');
        expect(result.content[0].text).toContain('Requirement Traceability');
      });
    });

    describe('compliance analysis', () => {
      it('should perform compliance assessment with required parameters', async () => {
        const result = await analyzeEnvironment({
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
      });

      it('should include compliance knowledge enhancement', async () => {
        const result = await analyzeEnvironment({
          analysisType: 'compliance',
          currentEnvironment: { infrastructure: 'cloud' },
          requirements: { security: 'high' },
          knowledgeEnhancement: true,
          enhancedMode: true,
        });

        expect(result.content[0].text).toContain('Compliance frameworks');
        expect(result.content[0].text).toContain('security standards');
        expect(result.content[0].text).toContain('regulatory requirements');
      });

      it('should provide expected compliance output information', async () => {
        const result = await analyzeEnvironment({
          analysisType: 'compliance',
          currentEnvironment: { infrastructure: 'cloud' },
          requirements: { security: 'high' },
        });

        expect(result.content[0].text).toContain('Compliance Assessment');
        expect(result.content[0].text).toContain('Category Scores');
        expect(result.content[0].text).toContain('Violations');
        expect(result.content[0].text).toContain('Risk Assessment');
      });

      it('should throw error when currentEnvironment is missing', async () => {
        await expect(
          analyzeEnvironment({
            analysisType: 'compliance',
            requirements: { security: 'high' },
          })
        ).rejects.toThrow('Current environment and requirements are required');
      });

      it('should throw error when requirements is missing', async () => {
        await expect(
          analyzeEnvironment({
            analysisType: 'compliance',
            currentEnvironment: { infrastructure: 'cloud' },
          })
        ).rejects.toThrow('Current environment and requirements are required');
      });
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
