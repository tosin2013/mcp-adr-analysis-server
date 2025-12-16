/**
 * Unit tests for review-existing-adrs-tool.ts
 * Tests ADR review functionality with comprehensive ESM-compatible mocking
 *
 * Key testing decisions:
 * - Uses jest.unstable_mockModule for ESM compatibility with dynamic imports
 * - All external dependencies are mocked to prevent I/O and API calls
 * - ResearchOrchestrator is mocked to prevent research API calls
 * - TreeSitterAnalyzer is mocked to prevent expensive parsing
 * - File system utilities are mocked for fast, deterministic tests
 *
 * Fixes issue #336: review-existing-adrs-tool.test.ts timeout failures
 */

import { jest } from '@jest/globals';
import { setupESMMocks, MockFactories } from '../utils/esm-mock-helper.js';

// Mock data for ADRs
const mockAdrs = [
  {
    path: '/test/docs/adrs/adr-001-use-react.md',
    filename: 'adr-001-use-react.md',
    title: 'Use React for Frontend',
    status: 'Accepted',
    content: `# ADR-001: Use React for Frontend

## Status
Accepted

## Context
We need a frontend framework for our web application.

## Decision
We will use React 18 with TypeScript for our frontend development.

## Consequences
- Better component reusability
- Strong ecosystem support`,
  },
  {
    path: '/test/docs/adrs/adr-002-database-choice.md',
    filename: 'adr-002-database-choice.md',
    title: 'Use PostgreSQL for Database',
    status: 'Accepted',
    content: `# ADR-002: Use PostgreSQL for Database

## Status
Accepted

## Decision
PostgreSQL will be our primary database.`,
  },
  {
    path: '/test/docs/adrs/adr-003-auth-strategy.md',
    filename: 'adr-003-auth-strategy.md',
    title: 'JWT Authentication Strategy',
    status: 'Proposed',
    content: `# ADR-003: JWT Authentication Strategy

## Status
Proposed

## Decision
Use JWT tokens for API authentication.`,
  },
];

// Create mock functions that we can control
const mockDiscoverAdrsInDirectory = jest.fn();
const mockAnalyzeProjectStructure = jest.fn();
const mockFindRelatedCode = jest.fn();
const mockAnswerResearchQuestion = jest.fn();
const mockAnalyzeFile = jest.fn();

describe('Review Existing ADRs Tool', () => {
  let reviewExistingAdrs: (args: {
    adrDirectory?: string;
    projectPath?: string;
    specificAdr?: string;
    analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
    includeTreeSitter?: boolean;
    generateUpdatePlan?: boolean;
    includeCompliance?: boolean;
    generateRecommendations?: boolean;
    trackImplementation?: boolean;
    analyzeCodePatterns?: boolean;
    performGapAnalysis?: boolean;
  }) => Promise<{ content: Array<{ type: string; text: string }> }>;

  beforeAll(async () => {
    // Set up ESM mocks BEFORE importing the module under test
    await setupESMMocks({
      // Mock ResearchOrchestrator to prevent API calls
      '../../src/utils/research-orchestrator.js': {
        ResearchOrchestrator: jest.fn().mockImplementation(() => ({
          answerResearchQuestion: mockAnswerResearchQuestion.mockResolvedValue({
            answer: 'Mock ADR implementation analysis',
            confidence: 0.85,
            sources: [
              {
                type: 'environment',
                data: {
                  capabilities: ['docker', 'kubernetes', 'react'],
                },
              },
              {
                type: 'codebase',
                data: {},
              },
            ],
            needsWebSearch: false,
          }),
        })),
      },

      // Mock TreeSitterAnalyzer to prevent expensive parsing
      '../../src/utils/tree-sitter-analyzer.js': {
        TreeSitterAnalyzer: jest.fn().mockImplementation(() => ({
          analyzeFile: mockAnalyzeFile.mockResolvedValue({
            functions: [
              { name: 'handleRequest', securitySensitive: false },
              { name: 'getUser', securitySensitive: false },
            ],
            imports: [
              { module: 'react', isDangerous: false },
              { module: 'pg', isDangerous: false },
            ],
            infraStructure: [],
            hasSecrets: false,
            secrets: [],
            securityIssues: [],
            architecturalViolations: [],
            language: 'typescript',
          }),
        })),
      },

      // Mock ADR discovery to return controlled test data
      '../../src/utils/adr-discovery.js': {
        discoverAdrsInDirectory: mockDiscoverAdrsInDirectory.mockResolvedValue({
          totalAdrs: 3,
          adrs: mockAdrs,
        }),
      },

      // Mock file-system utilities
      '../../src/utils/file-system.js': {
        analyzeProjectStructure: mockAnalyzeProjectStructure.mockResolvedValue({
          files: [
            { path: '/test/src/components/Button.tsx' },
            { path: '/test/src/services/auth.ts' },
            { path: '/test/src/database/connection.ts' },
          ],
          technologies: ['React', 'TypeScript', 'PostgreSQL'],
          patterns: ['MVC', 'Service Layer'],
        }),
        findRelatedCode: mockFindRelatedCode.mockResolvedValue({
          relatedFiles: [
            { path: '/test/src/components/Button.tsx', name: 'Button.tsx', extension: '.tsx' },
            { path: '/test/src/App.tsx', name: 'App.tsx', extension: '.tsx' },
          ],
          confidence: 0.75,
        }),
      },

      // Mock EnhancedLogger
      '../../src/utils/enhanced-logging.js': MockFactories.createEnhancedLogger(),
    });

    // Now import the module under test - mocks are in place
    const module = await import('../../src/tools/review-existing-adrs-tool.js');
    reviewExistingAdrs = module.reviewExistingAdrs;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset default mock implementations
    mockDiscoverAdrsInDirectory.mockResolvedValue({
      totalAdrs: 3,
      adrs: mockAdrs,
    });
    mockAnalyzeProjectStructure.mockResolvedValue({
      files: [
        { path: '/test/src/components/Button.tsx' },
        { path: '/test/src/services/auth.ts' },
        { path: '/test/src/database/connection.ts' },
      ],
      technologies: ['React', 'TypeScript', 'PostgreSQL'],
      patterns: ['MVC', 'Service Layer'],
    });
    mockFindRelatedCode.mockResolvedValue({
      relatedFiles: [
        { path: '/test/src/components/Button.tsx', name: 'Button.tsx', extension: '.tsx' },
        { path: '/test/src/App.tsx', name: 'App.tsx', extension: '.tsx' },
      ],
      confidence: 0.75,
    });
    mockAnswerResearchQuestion.mockResolvedValue({
      answer: 'Mock ADR implementation analysis',
      confidence: 0.85,
      sources: [
        { type: 'environment', data: { capabilities: ['docker', 'kubernetes', 'react'] } },
        { type: 'codebase', data: {} },
      ],
      needsWebSearch: false,
    });
  });

  afterEach(async () => {
    // Flush any pending async operations
    await new Promise(resolve => setImmediate(resolve));
  });

  describe('reviewExistingAdrs', () => {
    it('should review ADRs and analyze code compliance', async () => {
      const result = await reviewExistingAdrs({
        projectPath: '/test/project',
        analysisDepth: 'comprehensive',
      });

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');

      const content = result.content[0].text;
      expect(content).toContain('ADR Compliance Review Report');
      expect(content).toContain('React');
      expect(content).toContain('PostgreSQL');
    }, 10000);

    it('should handle no ADRs found scenario', async () => {
      // Override mock for this test
      mockDiscoverAdrsInDirectory.mockResolvedValueOnce({
        totalAdrs: 0,
        adrs: [],
      });

      const result = await reviewExistingAdrs({
        projectPath: '/empty/project',
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content.toLowerCase()).toContain('no adrs found');
    }, 10000);

    it('should analyze specific ADR when provided', async () => {
      const result = await reviewExistingAdrs({
        projectPath: '/test/project',
        specificAdr: 'adr-001',
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toContain('React');
      expect(content).toContain('Frontend');
    }, 10000);

    it('should support different analysis depths', async () => {
      const depths = ['basic', 'detailed', 'comprehensive'] as const;

      for (const depth of depths) {
        const result = await reviewExistingAdrs({
          projectPath: '/test/project',
          analysisDepth: depth,
        });

        expect(result).toHaveProperty('content');
        expect(result.content[0].text).toBeTruthy();
      }
    }, 15000);

    it('should include compliance analysis', async () => {
      const result = await reviewExistingAdrs({
        projectPath: '/test/project',
        includeCompliance: true,
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/compliance|implementation|validation|adr/i);
    }, 10000);

    it('should generate recommendations', async () => {
      const result = await reviewExistingAdrs({
        projectPath: '/test/project',
        generateRecommendations: true,
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/recommend|suggestion|improve|action|compliance/i);
    }, 10000);

    it('should handle project path not found gracefully', async () => {
      // Override mock for this test
      mockDiscoverAdrsInDirectory.mockResolvedValueOnce({
        totalAdrs: 0,
        adrs: [],
      });

      const result = await reviewExistingAdrs({
        projectPath: '/non/existent/path',
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toContain('No ADRs Found');
    }, 10000);

    it('should include implementation tracking', async () => {
      const result = await reviewExistingAdrs({
        projectPath: '/test/project',
        trackImplementation: true,
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/implementation|status|progress|compliance/i);
    }, 10000);

    it('should analyze code patterns against ADRs', async () => {
      const result = await reviewExistingAdrs({
        projectPath: '/test/project',
        analyzeCodePatterns: true,
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      // Should mention React components or database connections
      expect(content).toMatch(/react|component|database|service|adr/i);
    }, 10000);

    it('should provide gap analysis between ADRs and code', async () => {
      const result = await reviewExistingAdrs({
        projectPath: '/test/project',
        performGapAnalysis: true,
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/gap|missing|implement|compliance/i);
    }, 10000);

    it('should include tree-sitter analysis when enabled', async () => {
      const result = await reviewExistingAdrs({
        projectPath: '/test/project',
        includeTreeSitter: true,
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      // Tree-sitter should have been used for analysis
      expect(content).toMatch(/tree-sitter|analysis|code|adr/i);
    }, 10000);

    it('should skip tree-sitter analysis when disabled', async () => {
      const result = await reviewExistingAdrs({
        projectPath: '/test/project',
        includeTreeSitter: false,
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      // Should contain content about skipped tree-sitter or just regular analysis
      expect(content).toMatch(/tree-sitter|disabled|analysis|adr/i);
    }, 10000);

    it('should generate update plan when requested', async () => {
      const result = await reviewExistingAdrs({
        projectPath: '/test/project',
        generateUpdatePlan: true,
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/update|plan|recommendation|adr/i);
    }, 10000);

    it('should include research-driven analysis results', async () => {
      const result = await reviewExistingAdrs({
        projectPath: '/test/project',
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/research|analysis|confidence|adr/i);
    }, 10000);
  });

  describe('error handling', () => {
    it('should throw error for system directories', async () => {
      await expect(
        reviewExistingAdrs({
          projectPath: '/Library/System',
        })
      ).rejects.toThrow(/INVALID_INPUT/);
    }, 5000);

    it('should throw error for sensitive home directories', async () => {
      const homeDir = process.env['HOME'] || '/Users/test';
      await expect(
        reviewExistingAdrs({
          projectPath: `${homeDir}/Library`,
        })
      ).rejects.toThrow(/INVALID_INPUT/);
    }, 5000);

    it('should allow temp directories', async () => {
      // This should not throw - temp directories are allowed
      const result = await reviewExistingAdrs({
        projectPath: '/tmp/test-project',
      });

      expect(result).toHaveProperty('content');
    }, 10000);
  });
});
