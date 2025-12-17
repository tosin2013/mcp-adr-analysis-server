/**
 * ESM Mock Helper
 *
 * Provides utilities for ESM-compatible module mocking in Jest.
 * Uses vi.mock() which works with ES modules.
 *
 * @see Issue #308 - Implement ESM-compatible Jest mocking
 *
 * Usage:
 * ```typescript
 * import { setupESMMocks, resetESMMocks } from './esm-mock-helper.js';
 *
 * describe('MyTest', () => {
 *   let myModule: any;
 *
 *   beforeAll(async () => {
 *     await setupESMMocks({
 *       '../../src/utils/some-module.js': {
 *         someFunction: vi.fn().mockReturnValue('mocked')
 *       }
 *     });
 *     myModule = await import('../../src/tools/my-tool.js');
 *   });
 *
 *   beforeEach(() => {
 *     resetESMMocks();
 *   });
 * });
 * ```
 */

import { vi, type Mock } from 'vitest';

/**
 * Type for mock module definitions
 */
export type MockModuleDefinition = Record<string, Mock | unknown>;

/**
 * Registry of registered mock modules for cleanup
 */
const registeredMocks: Map<string, MockModuleDefinition> = new Map();

/**
 * Setup ESM-compatible mocks using vi.mock
 *
 * IMPORTANT: This must be called BEFORE importing the module under test.
 * The order matters in ESM:
 * 1. Reset modules
 * 2. Set up mocks
 * 3. Import the module under test
 *
 * @param mocks - Object mapping module paths to their mock implementations
 */
export async function setupESMMocks(mocks: Record<string, MockModuleDefinition>): Promise<void> {
  // Reset modules to ensure clean state
  vi.resetModules();

  for (const [modulePath, mockImpl] of Object.entries(mocks)) {
    // Store for later cleanup/reset
    registeredMocks.set(modulePath, mockImpl);

    // Use unstable_mockModule for ESM compatibility
    vi.mock(modulePath, () => ({
      __esModule: true,
      ...mockImpl,
    }));
  }
}

/**
 * Reset all registered mock functions
 * Call this in beforeEach to reset mock call counts
 */
export function resetESMMocks(): void {
  for (const mockImpl of registeredMocks.values()) {
    for (const value of Object.values(mockImpl)) {
      if (typeof value === 'function' && 'mockReset' in value) {
        (value as Mock).mockReset();
      }
    }
  }
}

/**
 * Clear all registered mock functions
 * Call this in afterEach to clear mock call history
 */
export function clearESMMocks(): void {
  for (const mockImpl of registeredMocks.values()) {
    for (const value of Object.values(mockImpl)) {
      if (typeof value === 'function' && 'mockClear' in value) {
        (value as Mock).mockClear();
      }
    }
  }
}

/**
 * Get a registered mock by module path
 */
export function getMock(modulePath: string): MockModuleDefinition | undefined {
  return registeredMocks.get(modulePath);
}

/**
 * Common mock factories for frequently mocked modules
 */
export const MockFactories = {
  /**
   * Create a mock ResearchOrchestrator
   */
  createResearchOrchestrator: (
    overrides?: Partial<{
      answerResearchQuestion: Mock;
    }>
  ) => ({
    ResearchOrchestrator: vi.fn().mockImplementation(() => ({
      answerResearchQuestion:
        overrides?.answerResearchQuestion ??
        vi.fn().mockResolvedValue({
          answer: 'Mock research answer',
          confidence: 0.8,
          sources: [],
          metadata: { filesAnalyzed: 0, duration: 100, sourcesQueried: [] },
          needsWebSearch: false,
        }),
    })),
  }),

  /**
   * Create a mock MemoryEntityManager
   */
  createMemoryEntityManager: () => ({
    MemoryEntityManager: vi.fn().mockImplementation(() => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      upsertEntity: vi.fn().mockResolvedValue({ id: 'mock-entity-id' }),
      upsertRelationship: vi.fn().mockResolvedValue(undefined),
      queryEntities: vi.fn().mockResolvedValue({ entities: [] }),
      updateEntity: vi.fn().mockResolvedValue(undefined),
    })),
  }),

  /**
   * Create a mock EnhancedLogger
   */
  createEnhancedLogger: () => ({
    EnhancedLogger: vi.fn().mockImplementation(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      clearLogs: vi.fn(),
    })),
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      clearLogs: vi.fn(),
    },
  }),

  /**
   * Create a mock AI executor
   */
  createAIExecutor: (overrides?: { isAvailable?: boolean }) => ({
    getAIExecutor: vi.fn().mockReturnValue({
      isAvailable: () => overrides?.isAvailable ?? false,
      executeStructuredPrompt: vi.fn().mockResolvedValue({
        data: { isValid: true, confidence: 0.9, findings: [], recommendations: [] },
        raw: { metadata: {} },
      }),
    }),
  }),

  /**
   * Create a mock KnowledgeGraphManager
   */
  createKnowledgeGraphManager: () => ({
    KnowledgeGraphManager: vi.fn().mockImplementation(() => ({
      getActiveConnections: vi.fn().mockResolvedValue([]),
      getPatternHistory: vi.fn().mockResolvedValue([]),
      addNode: vi.fn(),
      addEdge: vi.fn(),
      getNode: vi.fn(),
      getRelatedNodes: vi.fn().mockReturnValue([]),
    })),
  }),

  /**
   * Create mock environment analysis utilities
   */
  createEnvironmentAnalysis: () => ({
    analyzeEnvironmentSpecs: vi.fn().mockResolvedValue({
      analysisPrompt: 'Environment Specification Analysis\n\nMock analysis prompt',
      instructions: 'Mock instructions',
      actualData: {},
    }),
    detectContainerization: vi.fn().mockResolvedValue({
      analysisPrompt: 'Containerization Technology Detection\n\nMock containerization analysis',
      instructions: 'Mock instructions',
      actualData: {},
    }),
    determineEnvironmentRequirements: vi.fn().mockResolvedValue({
      analysisPrompt: 'Environment Requirements from ADRs\n\nMock requirements analysis',
      instructions: 'Mock instructions',
      actualData: {},
    }),
    assessEnvironmentCompliance: vi.fn().mockResolvedValue({
      analysisPrompt: 'Environment Compliance Assessment\n\nMock compliance analysis',
      instructions: 'Mock instructions',
      actualData: {},
    }),
  }),

  /**
   * Create mock knowledge generation
   */
  createKnowledgeGeneration: () => ({
    generateArchitecturalKnowledge: vi.fn().mockResolvedValue({
      prompt: 'Generated Knowledge Prompting\n\nMock knowledge enhancement',
      confidence: 0.9,
    }),
  }),

  /**
   * Create mock prompt execution
   */
  createPromptExecution: () => ({
    executePromptWithFallback: vi.fn().mockResolvedValue({
      content: 'Mock prompt execution result',
      isAIGenerated: false,
    }),
    formatMCPResponse: vi.fn((content: string) => ({
      content: [{ type: 'text', text: content }],
    })),
  }),
};

/**
 * Helper to create a complete mock setup for environment analysis tests
 */
export async function setupEnvironmentAnalysisMocks(): Promise<void> {
  await setupESMMocks({
    '../../src/utils/research-orchestrator.js': MockFactories.createResearchOrchestrator(),
    '../../src/utils/memory-entity-manager.js': MockFactories.createMemoryEntityManager(),
    '../../src/utils/enhanced-logging.js': MockFactories.createEnhancedLogger(),
    '../../src/utils/environment-analysis.js': MockFactories.createEnvironmentAnalysis(),
    '../../src/utils/knowledge-generation.js': MockFactories.createKnowledgeGeneration(),
    '../../src/utils/prompt-execution.js': MockFactories.createPromptExecution(),
  });
}

/**
 * Helper to create a complete mock setup for ADR validation tests
 */
export async function setupAdrValidationMocks(): Promise<void> {
  await setupESMMocks({
    '../../src/utils/research-orchestrator.js': MockFactories.createResearchOrchestrator(),
    '../../src/utils/ai-executor.js': MockFactories.createAIExecutor(),
    '../../src/utils/knowledge-graph-manager.js': MockFactories.createKnowledgeGraphManager(),
  });
}
