/**
 * ESM Mocking Proof of Concept Test
 *
 * This test verifies that jest.unstable_mockModule works correctly
 * with our ESM setup in Jest 30.x
 *
 * @see Issue #308 - Implement ESM-compatible Jest mocking
 *
 * Pattern based on:
 * - https://jestjs.io/docs/ecmascript-modules
 * - https://world.hey.com/michael.weiner/developer-from-the-future-1-mock-ing-third-party-libraries-in-an-esm-with-jest-unstable-mocking-4741561e
 */

import { jest, describe, it, expect } from '@jest/globals';

describe('ESM Mocking POC', () => {
  describe('jest.unstable_mockModule basic test', () => {
    // This test verifies the basic pattern works
    it('should mock a module using unstable_mockModule', async () => {
      // Reset modules first
      jest.resetModules();

      // Create the mock BEFORE importing the module
      const mockGenerateArchitecturalKnowledge = jest.fn().mockResolvedValue({
        prompt: 'MOCKED: Generated Knowledge Prompting',
        confidence: 0.99,
      });

      jest.unstable_mockModule('../../src/utils/knowledge-generation.js', () => ({
        __esModule: true,
        generateArchitecturalKnowledge: mockGenerateArchitecturalKnowledge,
      }));

      // Now dynamically import the module
      const { generateArchitecturalKnowledge } =
        await import('../../src/utils/knowledge-generation.js');

      // Call the function
      const result = await generateArchitecturalKnowledge(
        { projectPath: '/test', technologies: [], patterns: [], projectType: 'test' },
        { domains: ['cloud'], depth: 'basic', cacheEnabled: false }
      );

      // Verify mock was called
      expect(mockGenerateArchitecturalKnowledge).toHaveBeenCalled();
      expect(result.prompt).toBe('MOCKED: Generated Knowledge Prompting');
      expect(result.confidence).toBe(0.99);
    });
  });

  describe('Mocking ResearchOrchestrator class', () => {
    it('should mock ResearchOrchestrator class', async () => {
      // Reset modules first
      jest.resetModules();

      // Create the mock for ResearchOrchestrator
      const mockAnswerResearchQuestion = jest.fn().mockResolvedValue({
        answer: 'MOCKED: Research answer',
        confidence: 0.85,
        sources: [{ type: 'mock', data: {} }],
        metadata: { filesAnalyzed: 0, duration: 1, sourcesQueried: [] },
        needsWebSearch: false,
      });

      const MockResearchOrchestrator = jest.fn().mockImplementation(() => ({
        answerResearchQuestion: mockAnswerResearchQuestion,
      }));

      jest.unstable_mockModule('../../src/utils/research-orchestrator.js', () => ({
        __esModule: true,
        ResearchOrchestrator: MockResearchOrchestrator,
      }));

      // Now dynamically import
      const { ResearchOrchestrator } = await import('../../src/utils/research-orchestrator.js');

      // Create instance and call method
      const orchestrator = new ResearchOrchestrator({ projectPath: '/test' } as any);
      const result = await orchestrator.answerResearchQuestion('test question');

      // Verify mocks work
      expect(MockResearchOrchestrator).toHaveBeenCalled();
      expect(mockAnswerResearchQuestion).toHaveBeenCalledWith('test question');
      expect(result.answer).toBe('MOCKED: Research answer');
      expect(result.confidence).toBe(0.85);
    });
  });

  describe('Mocking a module used by environment-analysis-tool', () => {
    it('should mock knowledge generation when used by environment analysis', async () => {
      // Reset modules to ensure clean state
      jest.resetModules();

      // 1. Set up all the mocks BEFORE importing the tool
      const mockGenerateArchitecturalKnowledge = jest.fn().mockResolvedValue({
        prompt: 'MOCKED: GKP Knowledge',
        confidence: 0.95,
      });

      jest.unstable_mockModule('../../src/utils/knowledge-generation.js', () => ({
        __esModule: true,
        generateArchitecturalKnowledge: mockGenerateArchitecturalKnowledge,
      }));

      // Mock environment analysis utilities
      jest.unstable_mockModule('../../src/utils/environment-analysis.js', () => ({
        __esModule: true,
        analyzeEnvironmentSpecs: jest.fn().mockResolvedValue({
          analysisPrompt: 'MOCKED: Environment Specification Analysis',
          instructions: 'Mock instructions',
          actualData: {},
        }),
        detectContainerization: jest.fn().mockResolvedValue({
          analysisPrompt: 'MOCKED: Containerization',
          instructions: 'Mock instructions',
          actualData: {},
        }),
        determineEnvironmentRequirements: jest.fn().mockResolvedValue({
          analysisPrompt: 'MOCKED: Requirements',
          instructions: 'Mock instructions',
          actualData: {},
        }),
        assessEnvironmentCompliance: jest.fn().mockResolvedValue({
          analysisPrompt: 'MOCKED: Compliance',
          instructions: 'Mock instructions',
          actualData: {},
        }),
      }));

      // Mock memory entity manager
      jest.unstable_mockModule('../../src/utils/memory-entity-manager.js', () => ({
        __esModule: true,
        MemoryEntityManager: jest.fn().mockImplementation(() => ({
          initialize: jest.fn().mockResolvedValue(undefined),
          upsertEntity: jest.fn().mockResolvedValue({ id: 'mock-id' }),
          queryEntities: jest.fn().mockResolvedValue({ entities: [] }),
        })),
      }));

      // Mock enhanced logging
      jest.unstable_mockModule('../../src/utils/enhanced-logging.js', () => ({
        __esModule: true,
        EnhancedLogger: jest.fn().mockImplementation(() => ({
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          debug: jest.fn(),
        })),
        logger: {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          debug: jest.fn(),
        },
      }));

      // Mock research orchestrator
      jest.unstable_mockModule('../../src/utils/research-orchestrator.js', () => ({
        __esModule: true,
        ResearchOrchestrator: jest.fn().mockImplementation(() => ({
          answerResearchQuestion: jest.fn().mockResolvedValue({
            answer: 'Mock answer',
            confidence: 0.8,
            sources: [],
            metadata: { filesAnalyzed: 0, duration: 1, sourcesQueried: [] },
            needsWebSearch: false,
          }),
        })),
      }));

      // 2. NOW import the module under test
      const { analyzeEnvironment } = await import('../../src/tools/environment-analysis-tool.js');

      // 3. Run the test
      const result = await analyzeEnvironment({
        analysisType: 'specs',
        enableMemoryIntegration: false,
        knowledgeEnhancement: false,
        enhancedMode: false,
      });

      // 4. Verify the result uses mocked data
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('MOCKED: Environment Specification Analysis');
    }, 10000);
  });
});
