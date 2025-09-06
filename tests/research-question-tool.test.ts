/**
 * Comprehensive tests for research question tool
 * Tests the generateResearchQuestions function and related utilities
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the dependencies
const mockCorrelateProblemKnowledge = jest.fn() as jest.MockedFunction<any>;
const mockFindRelevantAdrPatterns = jest.fn() as jest.MockedFunction<any>;
const mockGenerateContextAwareQuestions = jest.fn() as jest.MockedFunction<any>;
const mockCreateResearchTaskTracking = jest.fn() as jest.MockedFunction<any>;
const mockGenerateArchitecturalKnowledge = jest.fn() as jest.MockedFunction<any>;
const mockExecuteResearchPrompt = jest.fn() as jest.MockedFunction<any>;
const mockFormatMCPResponse = jest.fn() as jest.MockedFunction<any>;

// Mock research-questions utilities
jest.unstable_mockModule('../src/utils/research-questions.js', () => ({
  correlateProblemKnowledge: mockCorrelateProblemKnowledge,
  findRelevantAdrPatterns: mockFindRelevantAdrPatterns,
  generateContextAwareQuestions: mockGenerateContextAwareQuestions,
  createResearchTaskTracking: mockCreateResearchTaskTracking,
}));

// Mock knowledge generation utilities
jest.unstable_mockModule('../src/utils/knowledge-generation.js', () => ({
  generateArchitecturalKnowledge: mockGenerateArchitecturalKnowledge,
}));

// Mock prompt execution utilities
jest.unstable_mockModule('../src/utils/prompt-execution.js', () => ({
  executeResearchPrompt: mockExecuteResearchPrompt,
  formatMCPResponse: mockFormatMCPResponse,
}));

// Import the function to test after mocking
const { generateResearchQuestions } = await import('../src/tools/research-question-tool.js');

describe('Research Question Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockCorrelateProblemKnowledge.mockResolvedValue({
      correlationPrompt: 'Test correlation prompt',
      instructions: 'Test correlation instructions',
    });
    
    mockFindRelevantAdrPatterns.mockResolvedValue({
      relevancePrompt: 'Test relevance prompt',
      instructions: 'Test relevance instructions',
    });
    
    mockGenerateContextAwareQuestions.mockResolvedValue({
      questionPrompt: 'Test question prompt',
      instructions: 'Test question instructions',
    });
    
    mockCreateResearchTaskTracking.mockResolvedValue({
      trackingPrompt: 'Test tracking prompt',
      instructions: 'Test tracking instructions',
    });
    
    mockGenerateArchitecturalKnowledge.mockResolvedValue({
      prompt: 'Test knowledge prompt',
    });
    
    mockExecuteResearchPrompt.mockResolvedValue({
      isAIGenerated: false,
      content: 'Test AI content',
    });
    
    mockFormatMCPResponse.mockReturnValue({
      content: [{
        type: 'text',
        text: 'Formatted response',
      }],
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateResearchQuestions', () => {
    const sampleProblems = [
      {
        id: 'problem-1',
        description: 'Performance issue',
        category: 'performance',
        severity: 'high',
        context: 'Database queries',
      },
    ];

    const sampleKnowledgeGraph = {
      technologies: [{ name: 'React', description: 'UI Library' }],
      patterns: [{ name: 'MVC', description: 'Model-View-Controller' }],
      adrs: [{ id: 'adr-1', title: 'Use React', status: 'accepted' }],
      relationships: [{ source: 'React', target: 'UI', type: 'implements' }],
    };

    const sampleResearchContext = {
      topic: 'Architecture Analysis',
      category: 'architecture',
      scope: 'project',
      objectives: ['Improve performance', 'Reduce complexity'],
      constraints: ['Budget limitations'],
      timeline: '3 months',
    };

    const sampleRelevantKnowledge = {
      adrs: [{ id: 'adr-1', title: 'Use React' }],
      patterns: [{ name: 'MVC' }],
      gaps: [{ area: 'Testing' }],
      opportunities: [{ area: 'Performance' }],
    };

    const sampleResearchQuestions = [
      {
        id: 'q1',
        question: 'How can we improve performance?',
        type: 'investigative',
        priority: 'high',
        timeline: '2 weeks',
        methodology: 'analysis',
      },
    ];

    describe('correlation analysis type', () => {
      test('should generate correlation analysis when problems and knowledge graph provided', async () => {
        const result = await generateResearchQuestions({
          analysisType: 'correlation',
          problems: sampleProblems,
          knowledgeGraph: sampleKnowledgeGraph,
        });

        expect(mockCorrelateProblemKnowledge).toHaveBeenCalledWith(
          sampleProblems,
          sampleKnowledgeGraph
        );
        expect(result.content).toHaveLength(1);
        expect(result.content[0].text).toContain('Problem-Knowledge Correlation Analysis');
        expect(result.content[0].text).toContain('Generated Knowledge Prompting');
      });

      test('should throw error when problems missing for correlation', async () => {
        await expect(
          generateResearchQuestions({
            analysisType: 'correlation',
            knowledgeGraph: sampleKnowledgeGraph,
          })
        ).rejects.toThrow('Problems and knowledge graph are required for correlation analysis');
      });

      test('should throw error when knowledge graph missing for correlation', async () => {
        await expect(
          generateResearchQuestions({
            analysisType: 'correlation',
            problems: sampleProblems,
          })
        ).rejects.toThrow('Problems and knowledge graph are required for correlation analysis');
      });

      test('should handle knowledge generation with enhanced mode enabled', async () => {
        await generateResearchQuestions({
          analysisType: 'correlation',
          problems: sampleProblems,
          knowledgeGraph: sampleKnowledgeGraph,
          enhancedMode: true,
          knowledgeEnhancement: true,
        });

        expect(mockGenerateArchitecturalKnowledge).toHaveBeenCalledWith(
          expect.objectContaining({
            projectPath: process.cwd(),
            technologies: [],
            patterns: [],
            projectType: 'research-methodology',
          }),
          expect.objectContaining({
            domains: ['data-architecture'],
            depth: 'intermediate',
            cacheEnabled: true,
          })
        );
      });

      test('should handle knowledge generation failure gracefully', async () => {
        mockGenerateArchitecturalKnowledge.mockRejectedValue(new Error('Knowledge generation failed'));

        const result = await generateResearchQuestions({
          analysisType: 'correlation',
          problems: sampleProblems,
          knowledgeGraph: sampleKnowledgeGraph,
          enhancedMode: true,
          knowledgeEnhancement: true,
        });

        expect(result.content[0].text).toContain('Research methodology knowledge generation unavailable');
      });
    });

    describe('relevance analysis type', () => {
      test('should generate relevance analysis with provided context', async () => {
        const result = await generateResearchQuestions({
          analysisType: 'relevance',
          researchContext: sampleResearchContext,
          adrDirectory: 'docs/adrs',
        });

        expect(mockFindRelevantAdrPatterns).toHaveBeenCalledWith(
          sampleResearchContext,
          'docs/adrs'
        );
        expect(result.content).toHaveLength(1);
        expect(result.content[0].text).toContain('Relevant ADR and Pattern Discovery');
      });

      test('should use intelligent defaults when no research context provided', async () => {
        const result = await generateResearchQuestions({
          analysisType: 'relevance',
        });

        expect(mockFindRelevantAdrPatterns).toHaveBeenCalledWith(
          expect.objectContaining({
            topic: 'Architectural Relevance Analysis',
            category: 'architecture',
            scope: 'project',
            objectives: ['Identify relevant architectural patterns and decisions'],
            constraints: [],
            timeline: 'Not specified',
          }),
          'docs/adrs'
        );
        expect(result.content[0].text).toContain('Relevant ADR and Pattern Discovery');
      });
    });

    describe('questions analysis type', () => {
      test('should generate context-aware questions when relevant knowledge provided', async () => {
        mockExecuteResearchPrompt.mockResolvedValue({
          isAIGenerated: true,
          content: 'Generated research questions content',
        });

        await generateResearchQuestions({
          analysisType: 'questions',
          researchContext: sampleResearchContext,
          relevantKnowledge: sampleRelevantKnowledge,
          projectPath: '/test/path',
        });

        expect(mockGenerateContextAwareQuestions).toHaveBeenCalledWith(
          sampleResearchContext,
          sampleRelevantKnowledge,
          '/test/path'
        );
        expect(mockExecuteResearchPrompt).toHaveBeenCalled();
        expect(mockFormatMCPResponse).toHaveBeenCalled();
      });

      test('should throw error when relevant knowledge missing for questions', async () => {
        await expect(
          generateResearchQuestions({
            analysisType: 'questions',
            researchContext: sampleResearchContext,
          })
        ).rejects.toThrow('Relevant knowledge is required for question generation');
      });

      test('should use intelligent defaults for research context in questions', async () => {
        await generateResearchQuestions({
          analysisType: 'questions',
          relevantKnowledge: sampleRelevantKnowledge,
        });

        expect(mockGenerateContextAwareQuestions).toHaveBeenCalledWith(
          expect.objectContaining({
            topic: 'Architectural Question Generation',
            category: 'architecture',
            scope: 'project',
            objectives: ['Generate relevant research questions for architectural analysis'],
            constraints: [],
            timeline: 'Not specified',
          }),
          sampleRelevantKnowledge,
          process.cwd()
        );
      });

      test('should handle AI generation failure and fallback to prompt-only mode', async () => {
        mockExecuteResearchPrompt.mockResolvedValue({
          isAIGenerated: false,
          content: 'Prompt only content',
        });

        const result = await generateResearchQuestions({
          analysisType: 'questions',
          researchContext: sampleResearchContext,
          relevantKnowledge: sampleRelevantKnowledge,
        });

        expect(result.content[0].text).toContain('Context-Aware Research Question Generation with File Persistence');
        expect(result.content[0].text).toContain('AI Question Generation Prompt');
      });
    });

    describe('tracking analysis type', () => {
      test('should create research task tracking when questions provided', async () => {
        const result = await generateResearchQuestions({
          analysisType: 'tracking',
          researchQuestions: sampleResearchQuestions,
        });

        expect(mockCreateResearchTaskTracking).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              id: 'q1',
              question: 'How can we improve performance?',
              complexity: 'medium',
              expectedOutcome: 'Research findings and recommendations',
              successCriteria: ['Clear findings documented', 'Recommendations provided'],
              relatedKnowledge: [],
              resources: [],
              risks: [],
              dependencies: [],
            }),
          ]),
          undefined
        );
        expect(result.content[0].text).toContain('Research Task Tracking System');
      });

      test('should throw error when research questions missing for tracking', async () => {
        await expect(
          generateResearchQuestions({
            analysisType: 'tracking',
          })
        ).rejects.toThrow('Research questions are required for task tracking');
      });

      test('should handle current progress when provided', async () => {
        const currentProgress = [
          {
            questionId: 'q1',
            status: 'in-progress',
            progress: 50,
            findings: ['Initial finding'],
            blockers: ['Resource constraint'],
          },
        ];

        await generateResearchQuestions({
          analysisType: 'tracking',
          researchQuestions: sampleResearchQuestions,
          currentProgress,
        });

        expect(mockCreateResearchTaskTracking).toHaveBeenCalledWith(
          expect.any(Array),
          currentProgress
        );
      });
    });

    describe('comprehensive analysis type', () => {
      test('should generate comprehensive analysis with provided context', async () => {
        const result = await generateResearchQuestions({
          analysisType: 'comprehensive',
          researchContext: sampleResearchContext,
          projectPath: '/test/path',
          adrDirectory: 'docs/adrs',
        });

        expect(mockFindRelevantAdrPatterns).toHaveBeenCalledWith(
          sampleResearchContext,
          'docs/adrs'
        );
        expect(result.content[0].text).toContain('Comprehensive Research Question Generation');
        expect(result.content[0].text).toContain('Research Context');
        expect(result.content[0].text).toContain(sampleResearchContext.topic);
      });

      test('should use intelligent defaults for comprehensive analysis', async () => {
        const result = await generateResearchQuestions({
          analysisType: 'comprehensive',
        });

        expect(mockFindRelevantAdrPatterns).toHaveBeenCalledWith(
          expect.objectContaining({
            topic: 'General Architectural Research',
            category: 'architecture',
            scope: 'project',
            objectives: [
              'Identify architectural patterns and best practices',
              'Analyze current system design decisions',
              'Discover improvement opportunities',
              'Evaluate technology choices and alternatives',
            ],
            constraints: ['Time and resource limitations'],
            timeline: 'Not specified',
          }),
          'docs/adrs'
        );
        expect(result.content[0].text).toContain('Using intelligent defaults');
      });

      test('should include all workflow steps in comprehensive analysis', async () => {
        const result = await generateResearchQuestions({
          analysisType: 'comprehensive',
          researchContext: sampleResearchContext,
        });

        const content = result.content[0].text;
        expect(content).toContain('1. **Relevance Analysis**');
        expect(content).toContain('2. **Research Question Generation**');
        expect(content).toContain('3. **Task Tracking System**');
        expect(content).toContain('4. **Problem Correlation**');
        expect(content).toContain('File Persistence Requirements');
      });
    });

    describe('error handling', () => {
      test('should throw error for unknown analysis type', async () => {
        await expect(
          generateResearchQuestions({
            analysisType: 'unknown' as any,
          })
        ).rejects.toThrow('Unknown analysis type: unknown');
      });

      test('should wrap and rethrow correlation errors', async () => {
        mockCorrelateProblemKnowledge.mockRejectedValue(new Error('Correlation failed'));

        await expect(
          generateResearchQuestions({
            analysisType: 'correlation',
            problems: sampleProblems,
            knowledgeGraph: sampleKnowledgeGraph,
          })
        ).rejects.toThrow('Failed to generate research questions: Correlation failed');
      });

      test('should wrap and rethrow relevance errors', async () => {
        mockFindRelevantAdrPatterns.mockRejectedValue(new Error('Relevance analysis failed'));

        await expect(
          generateResearchQuestions({
            analysisType: 'relevance',
            researchContext: sampleResearchContext,
          })
        ).rejects.toThrow('Failed to generate research questions: Relevance analysis failed');
      });

      test('should wrap and rethrow question generation errors', async () => {
        mockGenerateContextAwareQuestions.mockRejectedValue(new Error('Question generation failed'));

        await expect(
          generateResearchQuestions({
            analysisType: 'questions',
            researchContext: sampleResearchContext,
            relevantKnowledge: sampleRelevantKnowledge,
          })
        ).rejects.toThrow('Failed to generate research questions: Question generation failed');
      });

      test('should wrap and rethrow tracking errors', async () => {
        mockCreateResearchTaskTracking.mockRejectedValue(new Error('Tracking failed'));

        await expect(
          generateResearchQuestions({
            analysisType: 'tracking',
            researchQuestions: sampleResearchQuestions,
          })
        ).rejects.toThrow('Failed to generate research questions: Tracking failed');
      });
    });

    describe('default parameter handling', () => {
      test('should use default values for optional parameters', async () => {
        const result = await generateResearchQuestions({});

        expect(result.content[0].text).toContain('Comprehensive Research Question Generation');
        // Should default to comprehensive analysis type
      });

      test('should apply default project path when not provided', async () => {
        await generateResearchQuestions({
          analysisType: 'questions',
          relevantKnowledge: sampleRelevantKnowledge,
        });

        expect(mockGenerateContextAwareQuestions).toHaveBeenCalledWith(
          expect.any(Object),
          sampleRelevantKnowledge,
          process.cwd()
        );
      });

      test('should apply default ADR directory when not provided', async () => {
        await generateResearchQuestions({
          analysisType: 'relevance',
          researchContext: sampleResearchContext,
        });

        expect(mockFindRelevantAdrPatterns).toHaveBeenCalledWith(
          sampleResearchContext,
          'docs/adrs'
        );
      });

      test('should enable enhanced mode and knowledge enhancement by default', async () => {
        await generateResearchQuestions({
          analysisType: 'correlation',
          problems: sampleProblems,
          knowledgeGraph: sampleKnowledgeGraph,
        });

        expect(mockGenerateArchitecturalKnowledge).toHaveBeenCalled();
      });
    });

    describe('response format validation', () => {
      test('should return proper MCP response format for correlation', async () => {
        const result = await generateResearchQuestions({
          analysisType: 'correlation',
          problems: sampleProblems,
          knowledgeGraph: sampleKnowledgeGraph,
        });

        expect(result).toHaveProperty('content');
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content[0]).toHaveProperty('type', 'text');
        expect(result.content[0]).toHaveProperty('text');
        expect(typeof result.content[0].text).toBe('string');
      });

      test('should return proper MCP response format for AI-generated questions', async () => {
        mockExecuteResearchPrompt.mockResolvedValue({
          isAIGenerated: true,
          content: 'AI generated content',
        });

        mockFormatMCPResponse.mockReturnValue({
          content: [{
            type: 'text',
            text: 'Formatted AI response',
          }],
        });

        await generateResearchQuestions({
          analysisType: 'questions',
          researchContext: sampleResearchContext,
          relevantKnowledge: sampleRelevantKnowledge,
        });

        expect(mockFormatMCPResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            isAIGenerated: true,
            content: expect.stringContaining('Context-Aware Research Question Generation Results'),
          })
        );
      });
    });

    describe('configuration options', () => {
      test('should handle disabled enhanced mode', async () => {
        await generateResearchQuestions({
          analysisType: 'correlation',
          problems: sampleProblems,
          knowledgeGraph: sampleKnowledgeGraph,
          enhancedMode: false,
          knowledgeEnhancement: false,
        });

        expect(mockGenerateArchitecturalKnowledge).not.toHaveBeenCalled();
      });

      test('should handle disabled knowledge enhancement only', async () => {
        await generateResearchQuestions({
          analysisType: 'correlation',
          problems: sampleProblems,
          knowledgeGraph: sampleKnowledgeGraph,
          enhancedMode: true,
          knowledgeEnhancement: false,
        });

        expect(mockGenerateArchitecturalKnowledge).not.toHaveBeenCalled();
      });
    });
  });
});