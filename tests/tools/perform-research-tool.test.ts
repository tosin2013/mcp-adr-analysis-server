/**
 * Tests for Perform Research Tool
 */

import { jest } from '@jest/globals';
import { performResearch } from '../../src/tools/perform-research-tool.js';
import { McpAdrError } from '../../src/types/index.js';
import { ResearchOrchestrator } from '../../src/utils/research-orchestrator.js';

// Mock dependencies
jest.mock('../../src/utils/research-orchestrator.js', () => ({
  ResearchOrchestrator: jest.fn(),
}));

describe('Perform Research Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Parameter Validation', () => {
    it('should require question parameter', async () => {
      await expect(
        performResearch({
          question: '',
          projectPath: process.cwd(),
        })
      ).rejects.toThrow(McpAdrError);
    });

    it('should reject undefined question', async () => {
      await expect(
        performResearch({
          question: undefined as any,
          projectPath: process.cwd(),
        })
      ).rejects.toThrow('Research question is required');
    });

    it('should reject whitespace-only question', async () => {
      await expect(
        performResearch({
          question: '   ',
          projectPath: process.cwd(),
        })
      ).rejects.toThrow('Research question is required');
    });

    it('should accept valid question with default parameters', async () => {
      const mockOrchestrator = {
        setConfidenceThreshold: jest.fn(),
        answerResearchQuestion: jest.fn().mockResolvedValue({
          question: 'What is Docker?',
          sources: [],
          confidence: 0.5,
          needsWebSearch: true,
          answer: 'No relevant information found.',
          metadata: {
            duration: 100,
            sourcesQueried: [],
            filesAnalyzed: 0,
          },
        }),
      };

      (ResearchOrchestrator as jest.MockedClass<typeof ResearchOrchestrator>).mockImplementation(
        () => mockOrchestrator as any
      );

      const result = await performResearch({
        question: 'What is Docker?',
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('Confidence Threshold Handling', () => {
    it('should use default confidence threshold of 0.6', async () => {
      const { ResearchOrchestrator } = await import('../../src/utils/research-orchestrator.js');

      const mockOrchestrator = {
        setConfidenceThreshold: jest.fn(),
        answerResearchQuestion: jest.fn().mockResolvedValue({
          question: 'Test question',
          sources: [],
          confidence: 0.5,
          needsWebSearch: false,
          answer: 'Test answer',
          metadata: { duration: 100, sourcesQueried: [], filesAnalyzed: 0 },
        }),
      };

      (ResearchOrchestrator as any).mockImplementation(() => mockOrchestrator);

      await performResearch({ question: 'Test question' });

      expect(mockOrchestrator.setConfidenceThreshold).toHaveBeenCalledWith(0.6);
    });

    it('should use custom confidence threshold when provided', async () => {
      const { ResearchOrchestrator } = await import('../../src/utils/research-orchestrator.js');

      const mockOrchestrator = {
        setConfidenceThreshold: jest.fn(),
        answerResearchQuestion: jest.fn().mockResolvedValue({
          question: 'Test question',
          sources: [],
          confidence: 0.5,
          needsWebSearch: false,
          answer: 'Test answer',
          metadata: { duration: 100, sourcesQueried: [], filesAnalyzed: 0 },
        }),
      };

      (ResearchOrchestrator as any).mockImplementation(() => mockOrchestrator);

      await performResearch({
        question: 'Test question',
        confidenceThreshold: 0.8,
      });

      expect(mockOrchestrator.setConfidenceThreshold).toHaveBeenCalledWith(0.8);
    });
  });

  describe('Response Structure', () => {
    it('should return proper MCP response structure', async () => {
      const { ResearchOrchestrator } = await import('../../src/utils/research-orchestrator.js');

      const mockOrchestrator = {
        setConfidenceThreshold: jest.fn(),
        answerResearchQuestion: jest.fn().mockResolvedValue({
          question: 'Test question',
          sources: [
            {
              type: 'project_files',
              data: { files: ['test.ts'], relevance: { 'test.ts': 0.9 } },
              confidence: 0.9,
              timestamp: new Date().toISOString(),
            },
          ],
          confidence: 0.85,
          needsWebSearch: false,
          answer: 'Found test files.',
          metadata: { duration: 150, sourcesQueried: ['project_files'], filesAnalyzed: 1 },
        }),
      };

      (ResearchOrchestrator as any).mockImplementation(() => mockOrchestrator);

      const result = await performResearch({ question: 'Test question' });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should include confidence score in response text', async () => {
      const { ResearchOrchestrator } = await import('../../src/utils/research-orchestrator.js');

      const mockOrchestrator = {
        setConfidenceThreshold: jest.fn(),
        answerResearchQuestion: jest.fn().mockResolvedValue({
          question: 'Test',
          sources: [],
          confidence: 0.75,
          needsWebSearch: false,
          answer: 'Answer',
          metadata: { duration: 100, sourcesQueried: [], filesAnalyzed: 0 },
        }),
      };

      (ResearchOrchestrator as any).mockImplementation(() => mockOrchestrator);

      const result = await performResearch({ question: 'Test' });

      expect(result.content[0].text).toContain('75.0%');
    });

    it('should include metadata in response', async () => {
      const { ResearchOrchestrator } = await import('../../src/utils/research-orchestrator.js');

      const mockOrchestrator = {
        setConfidenceThreshold: jest.fn(),
        answerResearchQuestion: jest.fn().mockResolvedValue({
          question: 'Test',
          sources: [],
          confidence: 0.8,
          needsWebSearch: false,
          answer: 'Answer',
          metadata: { duration: 250, sourcesQueried: ['project_files'], filesAnalyzed: 5 },
        }),
      };

      (ResearchOrchestrator as any).mockImplementation(() => mockOrchestrator);

      const result = await performResearch({ question: 'Test' });

      expect(result.content[0].text).toContain('250ms');
      expect(result.content[0].text).toContain('project_files');
      expect(result.content[0].text).toContain('Files Analyzed: 5');
    });
  });

  describe('Source Integration', () => {
    it('should format project files source', async () => {
      const { ResearchOrchestrator } = await import('../../src/utils/research-orchestrator.js');

      const mockOrchestrator = {
        setConfidenceThreshold: jest.fn(),
        answerResearchQuestion: jest.fn().mockResolvedValue({
          question: 'Test',
          sources: [
            {
              type: 'project_files',
              data: {
                files: ['src/index.ts', 'src/utils.ts'],
                relevance: { 'src/index.ts': 0.9, 'src/utils.ts': 0.8 },
              },
              confidence: 0.85,
              timestamp: new Date().toISOString(),
            },
          ],
          confidence: 0.85,
          needsWebSearch: false,
          answer: 'Found files',
          metadata: { duration: 100, sourcesQueried: ['project_files'], filesAnalyzed: 2 },
        }),
      };

      (ResearchOrchestrator as any).mockImplementation(() => mockOrchestrator);

      const result = await performResearch({ question: 'Test' });

      expect(result.content[0].text).toContain('📁 Project Files');
      expect(result.content[0].text).toContain('src/index.ts');
      expect(result.content[0].text).toContain('relevance: 90%');
    });

    it('should format knowledge graph source', async () => {
      const { ResearchOrchestrator } = await import('../../src/utils/research-orchestrator.js');

      const mockOrchestrator = {
        setConfidenceThreshold: jest.fn(),
        answerResearchQuestion: jest.fn().mockResolvedValue({
          question: 'Test',
          sources: [
            {
              type: 'knowledge_graph',
              data: { nodes: [{ id: 'adr-1' }, { id: 'adr-2' }], relationships: [] },
              confidence: 0.85,
              timestamp: new Date().toISOString(),
            },
          ],
          confidence: 0.85,
          needsWebSearch: false,
          answer: 'Found ADRs',
          metadata: { duration: 100, sourcesQueried: ['knowledge_graph'], filesAnalyzed: 0 },
        }),
      };

      (ResearchOrchestrator as any).mockImplementation(() => mockOrchestrator);

      const result = await performResearch({ question: 'Test' });

      expect(result.content[0].text).toContain('🧠 Knowledge Graph');
      expect(result.content[0].text).toContain('Related ADRs: 2');
    });

    it('should format environment source', async () => {
      const { ResearchOrchestrator } = await import('../../src/utils/research-orchestrator.js');

      const mockOrchestrator = {
        setConfidenceThreshold: jest.fn(),
        answerResearchQuestion: jest.fn().mockResolvedValue({
          question: 'Test',
          sources: [
            {
              type: 'environment',
              data: {
                capabilities: ['docker', 'kubernetes'],
                data: [
                  { capability: 'docker', found: true },
                  { capability: 'kubernetes', found: false },
                ],
              },
              confidence: 0.95,
              timestamp: new Date().toISOString(),
            },
          ],
          confidence: 0.95,
          needsWebSearch: false,
          answer: 'Found environment',
          metadata: { duration: 100, sourcesQueried: ['environment'], filesAnalyzed: 0 },
        }),
      };

      (ResearchOrchestrator as any).mockImplementation(() => mockOrchestrator);

      const result = await performResearch({ question: 'Test' });

      expect(result.content[0].text).toContain('🔧 Environment Resources');
      expect(result.content[0].text).toContain('docker, kubernetes');
      expect(result.content[0].text).toContain('✅ Data found');
    });
  });

  describe('Web Search Recommendation', () => {
    it('should recommend web search when confidence is low', async () => {
      const { ResearchOrchestrator } = await import('../../src/utils/research-orchestrator.js');

      const mockOrchestrator = {
        setConfidenceThreshold: jest.fn(),
        answerResearchQuestion: jest.fn().mockResolvedValue({
          question: 'What is quantum computing?',
          sources: [],
          confidence: 0.3,
          needsWebSearch: true,
          answer: 'Low confidence answer',
          metadata: { duration: 100, sourcesQueried: [], filesAnalyzed: 0 },
        }),
      };

      (ResearchOrchestrator as any).mockImplementation(() => mockOrchestrator);

      const result = await performResearch({
        question: 'What is quantum computing?',
        performWebSearch: true,
      });

      expect(result.content[0].text).toContain('🌐 Web Search Recommended');
      expect(result.content[0].text).toContain('Suggested search queries');
    });

    it('should not recommend web search when confidence is high', async () => {
      const { ResearchOrchestrator } = await import('../../src/utils/research-orchestrator.js');

      const mockOrchestrator = {
        setConfidenceThreshold: jest.fn(),
        answerResearchQuestion: jest.fn().mockResolvedValue({
          question: 'Test',
          sources: [{ type: 'project_files', data: {}, confidence: 0.9, timestamp: '' }],
          confidence: 0.9,
          needsWebSearch: false,
          answer: 'High confidence answer',
          metadata: { duration: 100, sourcesQueried: ['project_files'], filesAnalyzed: 1 },
        }),
      };

      (ResearchOrchestrator as any).mockImplementation(() => mockOrchestrator);

      const result = await performResearch({ question: 'Test' });

      expect(result.content[0].text).not.toContain('🌐 Web Search Recommended');
    });

    it('should respect performWebSearch flag', async () => {
      const { ResearchOrchestrator } = await import('../../src/utils/research-orchestrator.js');

      const mockOrchestrator = {
        setConfidenceThreshold: jest.fn(),
        answerResearchQuestion: jest.fn().mockResolvedValue({
          question: 'Test',
          sources: [],
          confidence: 0.3,
          needsWebSearch: true,
          answer: 'Low confidence',
          metadata: { duration: 100, sourcesQueried: [], filesAnalyzed: 0 },
        }),
      };

      (ResearchOrchestrator as any).mockImplementation(() => mockOrchestrator);

      const result = await performResearch({
        question: 'Test',
        performWebSearch: false,
      });

      expect(result.content[0].text).not.toContain('🌐 Web Search Recommended');
    });
  });

  describe('Error Handling', () => {
    it('should wrap orchestrator errors in McpAdrError', async () => {
      const { ResearchOrchestrator } = await import('../../src/utils/research-orchestrator.js');

      const mockOrchestrator = {
        setConfidenceThreshold: jest.fn(),
        answerResearchQuestion: jest.fn().mockRejectedValue(new Error('Orchestrator failed')),
      };

      (ResearchOrchestrator as any).mockImplementation(() => mockOrchestrator);

      await expect(performResearch({ question: 'Test' })).rejects.toThrow(McpAdrError);
      await expect(performResearch({ question: 'Test' })).rejects.toThrow(
        'Failed to perform research: Orchestrator failed'
      );
    });

    it('should handle non-Error exceptions', async () => {
      const { ResearchOrchestrator } = await import('../../src/utils/research-orchestrator.js');

      const mockOrchestrator = {
        setConfidenceThreshold: jest.fn(),
        answerResearchQuestion: jest.fn().mockRejectedValue('String error'),
      };

      (ResearchOrchestrator as any).mockImplementation(() => mockOrchestrator);

      await expect(performResearch({ question: 'Test' })).rejects.toThrow(McpAdrError);
      await expect(performResearch({ question: 'Test' })).rejects.toThrow(
        'Failed to perform research: String error'
      );
    });
  });

  describe('Next Steps Recommendations', () => {
    it('should provide high confidence next steps', async () => {
      const { ResearchOrchestrator } = await import('../../src/utils/research-orchestrator.js');

      const mockOrchestrator = {
        setConfidenceThreshold: jest.fn(),
        answerResearchQuestion: jest.fn().mockResolvedValue({
          question: 'Test',
          sources: [],
          confidence: 0.85,
          needsWebSearch: false,
          answer: 'Answer',
          metadata: { duration: 100, sourcesQueried: [], filesAnalyzed: 0 },
        }),
      };

      (ResearchOrchestrator as any).mockImplementation(() => mockOrchestrator);

      const result = await performResearch({ question: 'Test' });

      expect(result.content[0].text).toContain('✅ High confidence answer');
    });

    it('should provide moderate confidence next steps', async () => {
      const { ResearchOrchestrator } = await import('../../src/utils/research-orchestrator.js');

      const mockOrchestrator = {
        setConfidenceThreshold: jest.fn(),
        answerResearchQuestion: jest.fn().mockResolvedValue({
          question: 'Test',
          sources: [],
          confidence: 0.65,
          needsWebSearch: false,
          answer: 'Answer',
          metadata: { duration: 100, sourcesQueried: [], filesAnalyzed: 0 },
        }),
      };

      (ResearchOrchestrator as any).mockImplementation(() => mockOrchestrator);

      const result = await performResearch({ question: 'Test' });

      expect(result.content[0].text).toContain('⚠️ Moderate confidence');
    });

    it('should provide low confidence next steps', async () => {
      const { ResearchOrchestrator } = await import('../../src/utils/research-orchestrator.js');

      const mockOrchestrator = {
        setConfidenceThreshold: jest.fn(),
        answerResearchQuestion: jest.fn().mockResolvedValue({
          question: 'Test',
          sources: [],
          confidence: 0.3,
          needsWebSearch: true,
          answer: 'Answer',
          metadata: { duration: 100, sourcesQueried: [], filesAnalyzed: 0 },
        }),
      };

      (ResearchOrchestrator as any).mockImplementation(() => mockOrchestrator);

      const result = await performResearch({ question: 'Test' });

      expect(result.content[0].text).toContain('❌ Low confidence');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty sources array', async () => {
      const { ResearchOrchestrator } = await import('../../src/utils/research-orchestrator.js');

      const mockOrchestrator = {
        setConfidenceThreshold: jest.fn(),
        answerResearchQuestion: jest.fn().mockResolvedValue({
          question: 'Test',
          sources: [],
          confidence: 0,
          needsWebSearch: true,
          answer: 'No information found',
          metadata: { duration: 50, sourcesQueried: [], filesAnalyzed: 0 },
        }),
      };

      (ResearchOrchestrator as any).mockImplementation(() => mockOrchestrator);

      const result = await performResearch({ question: 'Test' });

      expect(result.content[0].text).toContain('*No relevant sources found*');
    });

    it('should handle many files in project source', async () => {
      const { ResearchOrchestrator } = await import('../../src/utils/research-orchestrator.js');

      const files = Array.from({ length: 15 }, (_, i) => `file${i}.ts`);
      const mockOrchestrator = {
        setConfidenceThreshold: jest.fn(),
        answerResearchQuestion: jest.fn().mockResolvedValue({
          question: 'Test',
          sources: [
            {
              type: 'project_files',
              data: { files, relevance: {} },
              confidence: 0.8,
              timestamp: new Date().toISOString(),
            },
          ],
          confidence: 0.8,
          needsWebSearch: false,
          answer: 'Found many files',
          metadata: { duration: 200, sourcesQueried: ['project_files'], filesAnalyzed: 15 },
        }),
      };

      (ResearchOrchestrator as any).mockImplementation(() => mockOrchestrator);

      const result = await performResearch({ question: 'Test' });

      expect(result.content[0].text).toContain('... and 5 more files');
    });
  });
});
