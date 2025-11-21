/**
 * Unit Tests for adr-suggestion-tool.ts
 * Target Coverage: ~20% → 80%
 *
 * Following methodological pragmatism principles:
 * - Systematic Verification: Structured test cases with clear assertions
 * - Explicit Fallibilism: Testing both success and failure scenarios
 * - Pragmatic Success Criteria: Focus on reliable, maintainable test coverage
 */

import { jest } from '@jest/globals';
import { McpAdrError } from '../../src/types/index.js';

import {
  suggestAdrs,
  generateAdrFromDecision,
  discoverExistingAdrs,
} from '../../src/tools/adr-suggestion-tool.js';

describe('ADR Suggestion Tool', () => {
  // Use actual project directory for portable tests
  const projectPath = process.cwd();

  beforeEach(() => {
    jest.clearAllMocks();
    // No need to mock process.cwd() - use real working directory
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // suggestAdrs Function Tests
  // ============================================================================

  describe('suggestAdrs function', () => {
    describe('basic functionality', () => {
      test('handles implicit_decisions analysis type', async () => {
        const result = await suggestAdrs({
          analysisType: 'implicit_decisions',
          enhancedMode: false,
        });

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('ADR Suggestions');
      });

      test('handles code_changes analysis type with required parameters', async () => {
        const result = await suggestAdrs({
          analysisType: 'code_changes',
          beforeCode: 'old code',
          afterCode: 'new code',
          changeDescription: 'test change',
        });

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('Code Change Analysis');
      });

      test('handles comprehensive analysis type', async () => {
        const result = await suggestAdrs({
          analysisType: 'comprehensive',
        });

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('Comprehensive Analysis');
      }, 30000);
    });

    describe('parameter validation', () => {
      test('throws error when code_changes missing required parameters', async () => {
        await expect(
          suggestAdrs({
            analysisType: 'code_changes',
          })
        ).rejects.toThrow(McpAdrError);
      });

      test('throws error for unknown analysis type', async () => {
        await expect(
          suggestAdrs({
            analysisType: 'unknown' as any,
          })
        ).rejects.toThrow(McpAdrError);
      });
    });

    describe('enhancement modes', () => {
      test('works with enhanced mode disabled', async () => {
        const result = await suggestAdrs({
          analysisType: 'implicit_decisions',
          enhancedMode: false,
        });

        expect(result.content[0].text).toContain('Enhanced Mode**: ❌ Disabled');
      });

      test('works with enhanced mode enabled', async () => {
        const result = await suggestAdrs({
          analysisType: 'implicit_decisions',
          enhancedMode: true,
          knowledgeEnhancement: false,
          learningEnabled: false,
        });

        expect(result.content[0].text).toContain('Enhancement Status');
      });
    });

    describe('optional parameters', () => {
      test('accepts all optional parameters', async () => {
        const result = await suggestAdrs({
          projectPath: projectPath,
          analysisType: 'implicit_decisions',
          existingAdrs: ['ADR 1', 'ADR 2'],
          enhancedMode: true,
          learningEnabled: false,
          knowledgeEnhancement: false,
        });

        expect(result).toBeDefined();
      });

      test('works with commit messages for code changes', async () => {
        const result = await suggestAdrs({
          analysisType: 'code_changes',
          beforeCode: 'old code',
          afterCode: 'new code',
          changeDescription: 'test change',
          commitMessages: ['commit 1', 'commit 2'],
        });

        expect(result).toBeDefined();
      });
    });
  });

  // ============================================================================
  // generateAdrFromDecision Function Tests
  // ============================================================================

  describe('generateAdrFromDecision function', () => {
    describe('parameter validation', () => {
      test('validates required decision data fields', async () => {
        await expect(
          generateAdrFromDecision({
            decisionData: {
              title: '',
              context: 'Test context',
              decision: 'Test decision',
              consequences: 'Test consequences',
            },
          })
        ).rejects.toThrow(McpAdrError);
      });

      test('validates all required fields are present', async () => {
        await expect(
          generateAdrFromDecision({
            decisionData: {
              title: 'Test',
              context: '',
              decision: 'Test decision',
              consequences: 'Test consequences',
            },
          })
        ).rejects.toThrow(McpAdrError);
      });
    });

    describe('successful generation', () => {
      test('generates ADR with valid decision data', async () => {
        const decisionData = {
          title: 'Test Decision',
          context: 'Test context',
          decision: 'Test decision',
          consequences: 'Test consequences',
        };

        const result = await generateAdrFromDecision({
          decisionData,
        });

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('ADR Generation: Test Decision');
      });

      test('uses default template format when not specified', async () => {
        const decisionData = {
          title: 'Test Decision',
          context: 'Test context',
          decision: 'Test decision',
          consequences: 'Test consequences',
        };

        const result = await generateAdrFromDecision({
          decisionData,
        });

        expect(result.content[0].text).toContain('NYGARD');
      });

      test('uses custom template format', async () => {
        const decisionData = {
          title: 'Test Decision',
          context: 'Test context',
          decision: 'Test decision',
          consequences: 'Test consequences',
        };

        const result = await generateAdrFromDecision({
          decisionData,
          templateFormat: 'madr',
        });

        expect(result.content[0].text).toContain('MADR');
      });
    });

    describe('optional parameters', () => {
      test('accepts optional decision data fields', async () => {
        const decisionData = {
          title: 'Complete Decision',
          context: 'Full context',
          decision: 'Full decision',
          consequences: 'Full consequences',
          alternatives: ['Alt 1', 'Alt 2'],
          evidence: ['Evidence 1', 'Evidence 2'],
        };

        const result = await generateAdrFromDecision({
          decisionData,
          templateFormat: 'custom',
          existingAdrs: ['Existing ADR'],
          adrDirectory: 'custom/dir',
        });

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('custom/dir');
      });
    });
  });

  // ============================================================================
  // discoverExistingAdrs Function Tests
  // ============================================================================

  describe('discoverExistingAdrs function', () => {
    describe('basic functionality', () => {
      test('discovers ADRs with default parameters', async () => {
        const result = await discoverExistingAdrs({});

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain(
          'Complete ADR Discovery & Cache Infrastructure Initialized'
        );
        expect(result.content[0].text).toContain('Cache Infrastructure Status');
      });

      test('uses custom ADR directory', async () => {
        const result = await discoverExistingAdrs({
          adrDirectory: 'custom/adrs',
        });

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('custom/adrs');
      });

      test('includes content when requested', async () => {
        const result = await discoverExistingAdrs({
          includeContent: true,
        });

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('Include Content**: Yes');
      });
    });

    describe('cache infrastructure', () => {
      test('initializes cache infrastructure', async () => {
        const result = await discoverExistingAdrs({});

        expect(result.content[0].text).toContain('todo-data.json');
        expect(result.content[0].text).toContain('project-health-scores.json');
        expect(result.content[0].text).toContain('knowledge-graph-snapshots.json');
        expect(result.content[0].text).toContain('todo-sync-state.json');
      });
    });

    describe('optional parameters', () => {
      test('accepts custom project path', async () => {
        const result = await discoverExistingAdrs({
          projectPath: projectPath,
        });

        expect(result).toBeDefined();
      });

      test('works with all parameters', async () => {
        const result = await discoverExistingAdrs({
          adrDirectory: 'docs/decisions',
          includeContent: true,
          projectPath: projectPath,
        });

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('docs/decisions');
      });
    });
  });

  // ============================================================================
  // Error Handling and Edge Cases
  // ============================================================================

  describe('Error Handling and Edge Cases', () => {
    describe('McpAdrError handling', () => {
      test('suggestAdrs wraps errors in McpAdrError', async () => {
        await expect(
          suggestAdrs({
            analysisType: 'invalid' as any,
          })
        ).rejects.toThrow(McpAdrError);
      });

      test('generateAdrFromDecision wraps errors in McpAdrError', async () => {
        await expect(
          generateAdrFromDecision({
            decisionData: {} as any,
          })
        ).rejects.toThrow(McpAdrError);
      });
    });

    describe('default parameter handling', () => {
      test('suggestAdrs uses default parameters', async () => {
        const result = await suggestAdrs({});

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('Comprehensive Analysis');
      }, 30000);

      test('generateAdrFromDecision uses default parameters', async () => {
        const decisionData = {
          title: 'Test Decision',
          context: 'Test context',
          decision: 'Test decision',
          consequences: 'Test consequences',
        };

        const result = await generateAdrFromDecision({
          decisionData,
        });

        expect(result.content[0].text).toContain('docs/adrs');
        expect(result.content[0].text).toContain('NYGARD');
      });
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration Tests', () => {
    test('full workflow simulation', async () => {
      // Step 1: Discover existing ADRs
      const discoveryResult = await discoverExistingAdrs({});
      expect(discoveryResult).toBeDefined();

      // Step 2: Suggest new ADRs
      const suggestionResult = await suggestAdrs({
        analysisType: 'comprehensive',
        existingAdrs: ['Existing ADR 1'],
      });
      expect(suggestionResult).toBeDefined();

      // Step 3: Generate ADR from decision
      const generationResult = await generateAdrFromDecision({
        decisionData: {
          title: 'Integration Test Decision',
          context: 'Integration test context',
          decision: 'Integration test decision',
          consequences: 'Integration test consequences',
        },
      });
      expect(generationResult).toBeDefined();
    }, 30000);
  });
});
