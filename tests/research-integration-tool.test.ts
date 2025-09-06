/**
 * Comprehensive tests for research integration tool
 * Tests the incorporateResearch, createResearchTemplate, and requestActionConfirmation functions
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the dependencies
const mockMonitorResearchDirectory = jest.fn() as jest.MockedFunction<any>;
const mockExtractResearchTopics = jest.fn() as jest.MockedFunction<any>;
const mockEvaluateResearchImpact = jest.fn() as jest.MockedFunction<any>;
const mockGenerateAdrUpdateSuggestions = jest.fn() as jest.MockedFunction<any>;
const mockCreateResearchTemplate = jest.fn() as jest.MockedFunction<any>;
const mockPromptForActionConfirmation = jest.fn() as jest.MockedFunction<any>;

// Mock research-integration utilities
jest.unstable_mockModule('../src/utils/research-integration.js', () => ({
  monitorResearchDirectory: mockMonitorResearchDirectory,
  extractResearchTopics: mockExtractResearchTopics,
  evaluateResearchImpact: mockEvaluateResearchImpact,
  generateAdrUpdateSuggestions: mockGenerateAdrUpdateSuggestions,
  createResearchTemplate: mockCreateResearchTemplate,
  promptForActionConfirmation: mockPromptForActionConfirmation,
}));

// Import the functions to test after mocking
const { incorporateResearch, createResearchTemplate, requestActionConfirmation } = await import('../src/tools/research-integration-tool.js');

describe('Research Integration Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockMonitorResearchDirectory.mockResolvedValue({
      monitoringPrompt: 'Test monitoring prompt',
      instructions: 'Test monitoring instructions',
    });
    
    mockExtractResearchTopics.mockResolvedValue({
      extractionPrompt: 'Test extraction prompt',
      instructions: 'Test extraction instructions',
    });
    
    mockEvaluateResearchImpact.mockResolvedValue({
      evaluationPrompt: 'Test evaluation prompt',
      instructions: 'Test evaluation instructions',
    });
    
    mockGenerateAdrUpdateSuggestions.mockResolvedValue({
      updatePrompt: 'Test update prompt',
      instructions: 'Test update instructions',
    });
    
    mockCreateResearchTemplate.mockReturnValue(
      '# Test Template\n\n**Date**: 2023-01-01\n**Category**: test\n**Status**: In Progress'
    );
    
    mockPromptForActionConfirmation.mockReturnValue({
      confirmationPrompt: 'Test confirmation prompt',
      instructions: 'Test confirmation instructions',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('incorporateResearch', () => {
    describe('monitor analysis type', () => {
      test('should monitor research directory with default parameters', async () => {
        const result = await incorporateResearch({
          analysisType: 'monitor',
        });

        expect(mockMonitorResearchDirectory).toHaveBeenCalledWith('docs/research');
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('# Research Directory Monitoring');
        expect(result.content[0].text).toContain('Test monitoring instructions');
        expect(result.content[0].text).toContain('Test monitoring prompt');
      });

      test('should monitor research directory with custom path', async () => {
        const result = await incorporateResearch({
          analysisType: 'monitor',
          researchPath: 'custom/research',
        });

        expect(mockMonitorResearchDirectory).toHaveBeenCalledWith('custom/research');
        expect(result.content[0].text).toContain('# Research Directory Monitoring');
      });

      test('should include next steps in monitor response', async () => {
        const result = await incorporateResearch({
          analysisType: 'monitor',
        });

        const content = result.content[0].text;
        expect(content).toContain('## Next Steps');
        expect(content).toContain('Extract research topics');
        expect(content).toContain('Evaluate ADR impact');
        expect(content).toContain('Generate specific updates');
      });
    });

    describe('extract_topics analysis type', () => {
      test('should extract topics with default parameters', async () => {
        const result = await incorporateResearch({
          analysisType: 'extract_topics',
        });

        expect(mockExtractResearchTopics).toHaveBeenCalledWith('docs/research', undefined);
        expect(result.content[0].text).toContain('# Research Topic Extraction');
        expect(result.content[0].text).toContain('Test extraction instructions');
        expect(result.content[0].text).toContain('Test extraction prompt');
      });

      test('should extract topics with existing topics', async () => {
        const existingTopics = ['topic1', 'topic2'];
        
        await incorporateResearch({
          analysisType: 'extract_topics',
          existingTopics,
          researchPath: 'custom/research',
        });

        expect(mockExtractResearchTopics).toHaveBeenCalledWith('custom/research', existingTopics);
      });

      test('should include AI analysis workflow in response', async () => {
        const result = await incorporateResearch({
          analysisType: 'extract_topics',
        });

        const content = result.content[0].text;
        expect(content).toContain('## AI Analysis Prompt');
        expect(content).toContain('## Expected Output');
        expect(content).toContain('## Integration Workflow');
      });
    });

    describe('evaluate_impact analysis type', () => {
      const sampleResearchTopics = [
        {
          id: 'topic-1',
          title: 'Performance Optimization',
          category: 'performance',
          keyFindings: ['Finding 1', 'Finding 2'],
          relevanceScore: 0.8,
        },
      ];

      test('should evaluate impact with research topics', async () => {
        const result = await incorporateResearch({
          analysisType: 'evaluate_impact',
          researchTopics: sampleResearchTopics,
          adrDirectory: 'docs/adrs',
        });

        expect(mockEvaluateResearchImpact).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              id: 'topic-1',
              title: 'Performance Optimization',
              category: 'performance',
              description: 'Research topic: Performance Optimization',
              keyFindings: ['Finding 1', 'Finding 2'],
              evidence: ['Finding 1', 'Finding 2'],
              confidence: 0.8,
              sourceFiles: [],
              lastUpdated: expect.any(String),
              tags: ['performance'],
            }),
          ]),
          'docs/adrs'
        );
        expect(result.content[0].text).toContain('# Research Impact Evaluation');
      });

      test('should throw error when research topics missing', async () => {
        await expect(
          incorporateResearch({
            analysisType: 'evaluate_impact',
          })
        ).rejects.toThrow('Research topics are required for impact evaluation. Use extract_topics first.');
      });

      test('should throw error with empty research topics', async () => {
        await expect(
          incorporateResearch({
            analysisType: 'evaluate_impact',
            researchTopics: [],
          })
        ).rejects.toThrow('Research topics are required for impact evaluation. Use extract_topics first.');
      });

      test('should include implementation workflow in response', async () => {
        const result = await incorporateResearch({
          analysisType: 'evaluate_impact',
          researchTopics: sampleResearchTopics,
        });

        const content = result.content[0].text;
        expect(content).toContain('## Implementation Workflow');
        expect(content).toContain('generate_updates');
      });
    });

    describe('generate_updates analysis type', () => {
      const sampleResearchFindings = [
        {
          finding: 'Performance issue identified',
          evidence: ['Test data', 'Benchmark results'],
          impact: 'High impact on user experience',
        },
      ];

      test('should generate updates with all required parameters', async () => {
        const result = await incorporateResearch({
          analysisType: 'generate_updates',
          adrId: 'adr-001',
          updateType: 'content',
          researchFindings: sampleResearchFindings,
          adrDirectory: 'docs/adrs',
        });

        expect(mockGenerateAdrUpdateSuggestions).toHaveBeenCalledWith(
          'adr-001',
          sampleResearchFindings,
          'content',
          'docs/adrs'
        );
        expect(result.content[0].text).toContain('# ADR Update Generation');
      });

      test('should throw error when adrId missing', async () => {
        await expect(
          incorporateResearch({
            analysisType: 'generate_updates',
            updateType: 'content',
            researchFindings: sampleResearchFindings,
          })
        ).rejects.toThrow('ADR ID, update type, and research findings are required for update generation');
      });

      test('should throw error when updateType missing', async () => {
        await expect(
          incorporateResearch({
            analysisType: 'generate_updates',
            adrId: 'adr-001',
            researchFindings: sampleResearchFindings,
          })
        ).rejects.toThrow('ADR ID, update type, and research findings are required for update generation');
      });

      test('should throw error when researchFindings missing', async () => {
        await expect(
          incorporateResearch({
            analysisType: 'generate_updates',
            adrId: 'adr-001',
            updateType: 'content',
          })
        ).rejects.toThrow('ADR ID, update type, and research findings are required for update generation');
      });

      test('should handle different update types', async () => {
        const updateTypes: Array<'content' | 'status' | 'consequences' | 'alternatives' | 'deprecation'> = 
          ['content', 'status', 'consequences', 'alternatives', 'deprecation'];

        for (const updateType of updateTypes) {
          await incorporateResearch({
            analysisType: 'generate_updates',
            adrId: 'adr-001',
            updateType,
            researchFindings: sampleResearchFindings,
          });

          expect(mockGenerateAdrUpdateSuggestions).toHaveBeenCalledWith(
            'adr-001',
            sampleResearchFindings,
            updateType,
            'docs/adrs'
          );
        }
      });

      test('should include implementation checklist in response', async () => {
        const result = await incorporateResearch({
          analysisType: 'generate_updates',
          adrId: 'adr-001',
          updateType: 'content',
          researchFindings: sampleResearchFindings,
        });

        const content = result.content[0].text;
        expect(content).toContain('## Implementation Checklist');
        expect(content).toContain('Review all proposed changes');
        expect(content).toContain('Verify research evidence');
      });
    });

    describe('comprehensive analysis type', () => {
      test('should perform comprehensive analysis with default parameters', async () => {
        const result = await incorporateResearch({
          analysisType: 'comprehensive',
        });

        expect(mockMonitorResearchDirectory).toHaveBeenCalledWith('docs/research');
        expect(mockExtractResearchTopics).toHaveBeenCalledWith('docs/research', undefined);
        expect(result.content[0].text).toContain('# Comprehensive Research Integration');
      });

      test('should include all workflow steps', async () => {
        const result = await incorporateResearch({
          analysisType: 'comprehensive',
          researchPath: 'custom/research',
          existingTopics: ['topic1'],
        });

        const content = result.content[0].text;
        expect(content).toContain('### 1. **Topic Extraction**');
        expect(content).toContain('### 2. **Impact Evaluation**');
        expect(content).toContain('### 3. **Update Generation**');
        expect(content).toContain('### 4. **Implementation**');
      });

      test('should include quality assurance section', async () => {
        const result = await incorporateResearch({
          analysisType: 'comprehensive',
        });

        const content = result.content[0].text;
        expect(content).toContain('## Quality Assurance');
        expect(content).toContain('Evidence-based');
        expect(content).toContain('Impact-assessed');
        expect(content).toContain('Version-controlled');
      });
    });

    describe('default parameters', () => {
      test('should use default values when not specified', async () => {
        await incorporateResearch({});

        expect(mockMonitorResearchDirectory).toHaveBeenCalledWith('docs/research');
        expect(mockExtractResearchTopics).toHaveBeenCalledWith('docs/research', undefined);
      });

      test('should default to comprehensive analysis type', async () => {
        const result = await incorporateResearch({});

        expect(result.content[0].text).toContain('# Comprehensive Research Integration');
      });
    });

    describe('error handling', () => {
      test('should throw error for unknown analysis type', async () => {
        await expect(
          incorporateResearch({
            analysisType: 'unknown' as any,
          })
        ).rejects.toThrow('Unknown analysis type: unknown');
      });

      test('should wrap monitoring errors', async () => {
        mockMonitorResearchDirectory.mockRejectedValue(new Error('Monitoring failed'));

        await expect(
          incorporateResearch({
            analysisType: 'monitor',
          })
        ).rejects.toThrow('Failed to incorporate research: Monitoring failed');
      });

      test('should wrap extraction errors', async () => {
        mockExtractResearchTopics.mockRejectedValue(new Error('Extraction failed'));

        await expect(
          incorporateResearch({
            analysisType: 'extract_topics',
          })
        ).rejects.toThrow('Failed to incorporate research: Extraction failed');
      });

      test('should wrap evaluation errors', async () => {
        mockEvaluateResearchImpact.mockRejectedValue(new Error('Evaluation failed'));

        await expect(
          incorporateResearch({
            analysisType: 'evaluate_impact',
            researchTopics: [{
              id: 'test',
              title: 'Test',
              category: 'test',
              keyFindings: [],
              relevanceScore: 0.5,
            }],
          })
        ).rejects.toThrow('Failed to incorporate research: Evaluation failed');
      });

      test('should wrap update generation errors', async () => {
        mockGenerateAdrUpdateSuggestions.mockRejectedValue(new Error('Update generation failed'));

        await expect(
          incorporateResearch({
            analysisType: 'generate_updates',
            adrId: 'adr-001',
            updateType: 'content',
            researchFindings: [{
              finding: 'test',
              evidence: [],
              impact: 'test',
            }],
          })
        ).rejects.toThrow('Failed to incorporate research: Update generation failed');
      });

      test('should handle non-Error objects in catch blocks', async () => {
        mockMonitorResearchDirectory.mockRejectedValue('String error');

        await expect(
          incorporateResearch({
            analysisType: 'monitor',
          })
        ).rejects.toThrow('Failed to incorporate research: String error');
      });
    });

    describe('response format validation', () => {
      test('should return proper MCP response format', async () => {
        const result = await incorporateResearch({
          analysisType: 'monitor',
        });

        expect(result).toHaveProperty('content');
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content[0]).toHaveProperty('type', 'text');
        expect(result.content[0]).toHaveProperty('text');
        expect(typeof result.content[0].text).toBe('string');
      });
    });
  });

  describe('createResearchTemplate', () => {
    test('should create template with default parameters', async () => {
      const result = await createResearchTemplate({
        title: 'Test Research',
      });

      expect(mockCreateResearchTemplate).toHaveBeenCalledWith('Test Research', 'general');
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('# Research Template Created');
      expect(result.content[0].text).toContain('**Title**: Test Research');
      expect(result.content[0].text).toContain('**Category**: general');
    });

    test('should create template with custom category', async () => {
      const result = await createResearchTemplate({
        title: 'Performance Research',
        category: 'performance',
      });

      expect(mockCreateResearchTemplate).toHaveBeenCalledWith('Performance Research', 'performance');
      expect(result.content[0].text).toContain('**Category**: performance');
    });

    test('should create template with custom research path', async () => {
      const result = await createResearchTemplate({
        title: 'Security Research',
        category: 'security',
        researchPath: 'custom/research',
      });

      expect(result.content[0].text).toContain('**Full Path**: custom/research/security-research.md');
    });

    test('should generate proper filename from title', async () => {
      const result = await createResearchTemplate({
        title: 'Complex Title! With @#$ Characters & Spaces',
      });

      expect(result.content[0].text).toContain('**Filename**: complex-title-with-characters-spaces.md');
    });

    test('should include template content in response', async () => {
      const result = await createResearchTemplate({
        title: 'Test Research',
      });

      const content = result.content[0].text;
      expect(content).toContain('## Template Content');
      expect(content).toContain('```markdown');
      expect(content).toContain('# Test Template');
    });

    test('should include next steps and best practices', async () => {
      const result = await createResearchTemplate({
        title: 'Test Research',
      });

      const content = result.content[0].text;
      expect(content).toContain('## Next Steps');
      expect(content).toContain('## Template Sections');
      expect(content).toContain('## Research Best Practices');
    });

    test('should handle template creation errors', async () => {
      mockCreateResearchTemplate.mockImplementation(() => {
        throw new Error('Template creation failed');
      });

      await expect(
        createResearchTemplate({
          title: 'Test Research',
        })
      ).rejects.toThrow('Failed to create research template: Template creation failed');
    });

    test('should handle non-Error objects in template creation', async () => {
      mockCreateResearchTemplate.mockImplementation(() => {
        throw 'String error';
      });

      await expect(
        createResearchTemplate({
          title: 'Test Research',
        })
      ).rejects.toThrow('Failed to create research template: String error');
    });

    test('should return proper MCP response format', async () => {
      const result = await createResearchTemplate({
        title: 'Test Research',
      });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(typeof result.content[0].text).toBe('string');
    });
  });

  describe('requestActionConfirmation', () => {
    test('should request confirmation with default impact', async () => {
      const result = await requestActionConfirmation({
        action: 'Update ADR',
        details: 'Update ADR content based on research findings',
      });

      expect(mockPromptForActionConfirmation).toHaveBeenCalledWith(
        'Update ADR',
        'Update ADR content based on research findings',
        'medium'
      );
      expect(result.content[0].text).toContain('# Action Confirmation Request');
    });

    test('should handle different impact levels', async () => {
      const impactLevels: Array<'low' | 'medium' | 'high' | 'critical'> = 
        ['low', 'medium', 'high', 'critical'];

      for (const impact of impactLevels) {
        const result = await requestActionConfirmation({
          action: 'Test Action',
          details: 'Test details',
          impact,
        });

        expect(mockPromptForActionConfirmation).toHaveBeenCalledWith(
          'Test Action',
          'Test details',
          impact
        );
        expect(result.content[0].text).toContain(`**Impact Level**: ${impact.toUpperCase()}`);
      }
    });

    test('should include confirmation prompt and instructions', async () => {
      const result = await requestActionConfirmation({
        action: 'Deploy Changes',
        details: 'Deploy architectural changes to production',
        impact: 'critical',
      });

      const content = result.content[0].text;
      expect(content).toContain('## Confirmation Prompt');
      expect(content).toContain('Test confirmation prompt');
      expect(content).toContain('Test confirmation instructions');
    });

    test('should include response format and decision guidelines', async () => {
      const result = await requestActionConfirmation({
        action: 'Test Action',
        details: 'Test details',
      });

      const content = result.content[0].text;
      expect(content).toContain('### Response Format');
      expect(content).toContain('### Decision Guidelines');
      expect(content).toContain('APPROVED');
      expect(content).toContain('REJECTED');
      expect(content).toContain('MODIFIED');
      expect(content).toContain('DEFERRED');
    });

    test('should include impact-specific warnings', async () => {
      const criticalResult = await requestActionConfirmation({
        action: 'Critical Action',
        details: 'Critical details',
        impact: 'critical',
      });

      expect(criticalResult.content[0].text).toContain('⚠️ **CRITICAL IMPACT**');

      const lowResult = await requestActionConfirmation({
        action: 'Low Action',
        details: 'Low details',
        impact: 'low',
      });

      expect(lowResult.content[0].text).toContain('🔹 **LOW IMPACT**');
    });

    test('should handle confirmation errors', async () => {
      mockPromptForActionConfirmation.mockImplementation(() => {
        throw new Error('Confirmation failed');
      });

      await expect(
        requestActionConfirmation({
          action: 'Test Action',
          details: 'Test details',
        })
      ).rejects.toThrow('Failed to request action confirmation: Confirmation failed');
    });

    test('should handle non-Error objects in confirmation', async () => {
      mockPromptForActionConfirmation.mockImplementation(() => {
        throw 'String error';
      });

      await expect(
        requestActionConfirmation({
          action: 'Test Action',
          details: 'Test details',
        })
      ).rejects.toThrow('Failed to request action confirmation: String error');
    });

    test('should return proper MCP response format', async () => {
      const result = await requestActionConfirmation({
        action: 'Test Action',
        details: 'Test details',
      });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(typeof result.content[0].text).toBe('string');
    });
  });
});