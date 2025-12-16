/**
 * ESM Mocking Proof of Concept Test
 *
 * This test verifies that vi.mock works correctly
 * with our ESM setup in Vitest
 *
 * @see Issue #308 - Implement ESM-compatible mocking
 *
 * KEY VITEST PATTERN:
 * - vi.mock() factories are HOISTED to the top of the file
 * - Factory functions must be SELF-CONTAINED (no external variable references)
 * - Use vi.fn() directly inside factories, not references to variables defined elsewhere
 * - For class mocks, use class syntax or function() constructor, not arrow functions
 */

import { describe, it, expect, vi } from 'vitest';

// ============================================================================
// ALL MOCKS MUST BE AT MODULE LEVEL (hoisted by Vitest)
// ============================================================================

// Mock knowledge-generation module
vi.mock('../../src/utils/knowledge-generation.js', () => ({
  __esModule: true,
  generateArchitecturalKnowledge: vi.fn().mockResolvedValue({
    prompt: 'MOCKED: Generated Knowledge Prompting',
    confidence: 0.99,
  }),
}));

// Mock research-orchestrator module with proper class constructor
vi.mock('../../src/utils/research-orchestrator.js', () => ({
  __esModule: true,
  ResearchOrchestrator: class MockResearchOrchestrator {
    answerResearchQuestion = vi.fn().mockResolvedValue({
      answer: 'MOCKED: Research answer',
      confidence: 0.85,
      sources: [{ type: 'mock', data: {} }],
      metadata: { filesAnalyzed: 0, duration: 1, sourcesQueried: [] },
      needsWebSearch: false,
    });
  },
}));

// Mock environment analysis utilities for third test
vi.mock('../../src/utils/environment-analysis.js', () => ({
  __esModule: true,
  analyzeEnvironmentSpecs: vi.fn().mockResolvedValue({
    analysisPrompt: 'MOCKED: Environment Specification Analysis',
    instructions: 'Mock instructions',
    actualData: {},
  }),
  detectContainerization: vi.fn().mockResolvedValue({
    analysisPrompt: 'MOCKED: Containerization',
    instructions: 'Mock instructions',
    actualData: {},
  }),
  determineEnvironmentRequirements: vi.fn().mockResolvedValue({
    analysisPrompt: 'MOCKED: Requirements',
    instructions: 'Mock instructions',
    actualData: {},
  }),
  assessEnvironmentCompliance: vi.fn().mockResolvedValue({
    analysisPrompt: 'MOCKED: Compliance',
    instructions: 'Mock instructions',
    actualData: {},
  }),
}));

// Mock memory entity manager with proper class constructor
vi.mock('../../src/utils/memory-entity-manager.js', () => ({
  __esModule: true,
  MemoryEntityManager: class MockMemoryEntityManager {
    initialize = vi.fn().mockResolvedValue(undefined);
    upsertEntity = vi.fn().mockResolvedValue({ id: 'mock-id' });
    queryEntities = vi.fn().mockResolvedValue({ entities: [] });
  },
}));

// Mock enhanced logging
vi.mock('../../src/utils/enhanced-logging.js', () => ({
  __esModule: true,
  EnhancedLogger: class MockEnhancedLogger {
    info = vi.fn();
    warn = vi.fn();
    error = vi.fn();
    debug = vi.fn();
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ============================================================================
// TESTS
// ============================================================================

describe('ESM Mocking POC', () => {
  describe('vi.mock basic test', () => {
    it('should mock a module using vi.mock with hoisted factory', async () => {
      // Import the mocked module (mock is already set up at module level)
      const { generateArchitecturalKnowledge } =
        await import('../../src/utils/knowledge-generation.js');

      // Call the function
      const result = await generateArchitecturalKnowledge(
        { projectPath: '/test', technologies: [], patterns: [], projectType: 'test' },
        { domains: ['cloud'], depth: 'basic', cacheEnabled: false }
      );

      // Verify mock returned expected values
      expect(result.prompt).toBe('MOCKED: Generated Knowledge Prompting');
      expect(result.confidence).toBe(0.99);
    });
  });

  describe('Mocking ResearchOrchestrator class', () => {
    it('should mock ResearchOrchestrator class', async () => {
      // Import the mocked module (mock is already set up at module level)
      const { ResearchOrchestrator } = await import('../../src/utils/research-orchestrator.js');

      // Create instance and call method
      const orchestrator = new ResearchOrchestrator({ projectPath: '/test' } as any);
      const result = await orchestrator.answerResearchQuestion('test question');

      // Verify mocks work
      expect(result.answer).toBe('MOCKED: Research answer');
      expect(result.confidence).toBe(0.85);
    });
  });

  describe('Mocking a module used by environment-analysis-tool', () => {
    it('should mock knowledge generation when used by environment analysis', async () => {
      // Import the module under test (all mocks already set up at module level)
      const { analyzeEnvironment } = await import('../../src/tools/environment-analysis-tool.js');

      // Run the test
      const result = await analyzeEnvironment({
        analysisType: 'specs',
        enableMemoryIntegration: false,
        knowledgeEnhancement: false,
        enhancedMode: false,
      });

      // Verify the result uses mocked data
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('MOCKED: Environment Specification Analysis');
    }, 10000);
  });
});
