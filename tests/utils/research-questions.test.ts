import { jest } from '@jest/globals';
import {
  correlateProblemKnowledge,
  findRelevantAdrPatterns,
  generateContextAwareQuestions,
  createResearchTaskTracking,
  ResearchProblem,
  KnowledgeGraph,
  ResearchContext,
  ResearchQuestion
} from '../../src/utils/research-questions.js';

// Mock dependencies
jest.mock('../../src/prompts/research-question-prompts.js', () => ({
  generateProblemKnowledgeCorrelationPrompt: jest.fn().mockReturnValue('correlation prompt'),
  generateContextAwareResearchQuestionsPrompt: jest.fn().mockReturnValue('question generation prompt'),
  generateResearchTaskTrackingPrompt: jest.fn().mockReturnValue('task tracking prompt')
}));

jest.mock('../../src/utils/adr-discovery.js', () => ({
  discoverAdrsInDirectory: jest.fn().mockResolvedValue({
    totalAdrs: 2,
    adrs: [
      { title: 'Test ADR 1', filename: 'adr-001.md', status: 'accepted', path: '/test/adr-001.md', content: 'Test content 1' },
      { title: 'Test ADR 2', filename: 'adr-002.md', status: 'proposed', path: '/test/adr-002.md', content: 'Test content 2' }
    ]
  })
}));

jest.mock('../../src/utils/actual-file-operations.js', () => ({
  scanProjectStructure: jest.fn().mockResolvedValue({
    files: ['package.json', 'src/index.ts'],
    directories: ['src', 'tests'],
    structure: { type: 'project' }
  })
}));

describe('Research Questions Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('correlateProblemKnowledge', () => {
    const mockProblems: ResearchProblem[] = [
      {
        id: 'prob-1',
        description: 'A test research problem',
        category: 'architecture',
        severity: 'medium',
        context: 'software development'
      }
    ];

    const mockKnowledge: KnowledgeGraph = {
      technologies: [
        { name: 'Node.js', description: 'JavaScript runtime', category: 'backend' }
      ],
      patterns: [
        { name: 'Microservices', description: 'Distributed architecture', category: 'architecture' }
      ],
      adrs: [
        { id: 'adr-001', title: 'Use Microservices', status: 'accepted' }
      ],
      relationships: [
        { source: 'Node.js', target: 'Microservices', type: 'implements' }
      ]
    };

    it('should correlate problems with knowledge graph', async () => {
      const result = await correlateProblemKnowledge(mockProblems, mockKnowledge);
      
      expect(result).toHaveProperty('correlationPrompt');
      expect(result).toHaveProperty('instructions');
      expect(typeof result.correlationPrompt).toBe('string');
      expect(typeof result.instructions).toBe('string');
    });

    it('should handle empty knowledge graph', async () => {
      const emptyKnowledge: KnowledgeGraph = {
        technologies: [],
        patterns: [],
        adrs: [],
        relationships: []
      };

      const result = await correlateProblemKnowledge(mockProblems, emptyKnowledge);
      expect(result).toHaveProperty('correlationPrompt');
      expect(result).toHaveProperty('instructions');
    });

    it('should handle empty problems array', async () => {
      const result = await correlateProblemKnowledge([], mockKnowledge);
      expect(result).toHaveProperty('correlationPrompt');
      expect(result).toHaveProperty('instructions');
    });

    it('should handle multiple problems', async () => {
      const multipleProblems: ResearchProblem[] = [
        ...mockProblems,
        {
          id: 'prob-2',
          description: 'Another research problem',
          category: 'performance',
          severity: 'high',
          context: 'optimization'
        }
      ];

      const result = await correlateProblemKnowledge(multipleProblems, mockKnowledge);
      expect(result).toHaveProperty('correlationPrompt');
      expect(result).toHaveProperty('instructions');
    });
  });

  describe('findRelevantAdrPatterns', () => {
    const mockContext: ResearchContext = {
      topic: 'Performance Optimization',
      category: 'architecture',
      scope: 'system-wide',
      objectives: ['improve-performance', 'reduce-complexity'],
      constraints: ['scalability', 'performance'],
      timeline: '3 months'
    };

    it('should find relevant ADR patterns', async () => {
      const result = await findRelevantAdrPatterns(mockContext);
      
      expect(result).toHaveProperty('relevancePrompt');
      expect(result).toHaveProperty('instructions');
      expect(typeof result.relevancePrompt).toBe('string');
      expect(typeof result.instructions).toBe('string');
    });

    it('should handle custom ADR directory', async () => {
      const result = await findRelevantAdrPatterns(mockContext, 'custom/adrs');
      expect(result).toHaveProperty('relevancePrompt');
      expect(result).toHaveProperty('instructions');
    });

    it('should handle minimal context', async () => {
      const minimalContext: ResearchContext = {
        topic: 'Test Topic',
        category: 'test',
        scope: 'limited',
        objectives: ['test-objective']
      };

      const result = await findRelevantAdrPatterns(minimalContext);
      expect(result).toHaveProperty('relevancePrompt');
      expect(result).toHaveProperty('instructions');
    });

    it('should handle context with all optional fields', async () => {
      const fullContext: ResearchContext = {
        topic: 'Full Context Test',
        category: 'comprehensive',
        scope: 'enterprise',
        objectives: ['obj1', 'obj2', 'obj3'],
        constraints: ['constraint1', 'constraint2'],
        timeline: '6 months'
      };

      const result = await findRelevantAdrPatterns(fullContext);
      expect(result).toHaveProperty('relevancePrompt');
      expect(result).toHaveProperty('instructions');
    });
  });

  describe('generateContextAwareQuestions', () => {
    const mockContext: ResearchContext = {
      topic: 'Performance Optimization',
      category: 'architecture',
      scope: 'system-wide',
      objectives: ['improve-performance', 'reduce-complexity'],
      constraints: ['scalability', 'performance'],
      timeline: '3 months'
    };

    const mockRelevantKnowledge = {
      adrs: [
        { id: 'adr-001', title: 'Use Microservices', status: 'accepted' }
      ],
      patterns: [
        { name: 'Event Sourcing', category: 'data' }
      ],
      gaps: [
        { area: 'monitoring', severity: 'medium' }
      ],
      opportunities: [
        { type: 'optimization', priority: 'high' }
      ]
    };

    it('should generate context-aware questions', async () => {
      const result = await generateContextAwareQuestions(mockContext, mockRelevantKnowledge);
      
      expect(result).toHaveProperty('questionPrompt');
      expect(result).toHaveProperty('instructions');
      expect(typeof result.questionPrompt).toBe('string');
      expect(typeof result.instructions).toBe('string');
    });

    it('should handle custom project path', async () => {
      const result = await generateContextAwareQuestions(mockContext, mockRelevantKnowledge, '/custom/path');
      expect(result).toHaveProperty('questionPrompt');
      expect(result).toHaveProperty('instructions');
    });

    it('should handle empty relevant knowledge', async () => {
      const emptyKnowledge = {
        adrs: [],
        patterns: [],
        gaps: [],
        opportunities: []
      };

      const result = await generateContextAwareQuestions(mockContext, emptyKnowledge);
      expect(result).toHaveProperty('questionPrompt');
      expect(result).toHaveProperty('instructions');
    });
  });

  describe('createResearchTaskTracking', () => {
    const mockCurrentProgress = [
      {
        questionId: 'q-1',
        status: 'in_progress',
        progress: 50,
        findings: ['finding 1', 'finding 2'],
        blockers: ['blocker 1']
      },
      {
        questionId: 'q-2',
        status: 'not_started',
        progress: 0,
        findings: [],
        blockers: []
      }
    ];

    it('should create research task tracking', async () => {
      const result = await createResearchTaskTracking(mockCurrentProgress);
      
      expect(result).toHaveProperty('trackingPrompt');
      expect(result).toHaveProperty('instructions');
      expect(typeof result.trackingPrompt).toBe('string');
      expect(typeof result.instructions).toBe('string');
    });

    it('should handle empty progress array', async () => {
      const result = await createResearchTaskTracking([]);
      
      expect(result).toHaveProperty('trackingPrompt');
      expect(result).toHaveProperty('instructions');
    });

    it('should handle progress with multiple statuses', async () => {
      const mixedProgress = [
        ...mockCurrentProgress,
        {
          questionId: 'q-3',
          status: 'completed',
          progress: 100,
          findings: ['final finding'],
          blockers: []
        },
        {
          questionId: 'q-4',
          status: 'blocked',
          progress: 25,
          findings: ['partial finding'],
          blockers: ['critical blocker']
        }
      ];

      const result = await createResearchTaskTracking(mixedProgress);
      expect(result).toHaveProperty('trackingPrompt');
      expect(result).toHaveProperty('instructions');
    });
  });

  describe('Interface Validation', () => {
    it('should validate ResearchProblem interface', () => {
      const problem: ResearchProblem = {
        id: 'test-id',
        description: 'Test Description',
        category: 'test-category',
        severity: 'medium',
        context: 'test-context'
      };

      expect(problem.id).toBe('test-id');
      expect(problem.description).toBe('Test Description');
      expect(problem.category).toBe('test-category');
      expect(problem.severity).toBe('medium');
      expect(problem.context).toBe('test-context');
    });

    it('should validate KnowledgeGraph interface', () => {
      const knowledge: KnowledgeGraph = {
        technologies: [{ name: 'Test Tech', description: 'Test', category: 'test' }],
        patterns: [{ name: 'Test Pattern', description: 'Test', category: 'test' }],
        adrs: [{ id: 'adr-1', title: 'Test ADR', status: 'accepted' }],
        relationships: [{ source: 'src', target: 'tgt', type: 'test' }]
      };

      expect(Array.isArray(knowledge.technologies)).toBe(true);
      expect(Array.isArray(knowledge.patterns)).toBe(true);
      expect(Array.isArray(knowledge.adrs)).toBe(true);
      expect(Array.isArray(knowledge.relationships)).toBe(true);
    });

    it('should validate ResearchContext interface', () => {
      const context: ResearchContext = {
        topic: 'Test Topic',
        category: 'test-category',
        scope: 'test-scope',
        objectives: ['obj1', 'obj2'],
        constraints: ['constraint1'],
        timeline: '3 months'
      };

      expect(typeof context.topic).toBe('string');
      expect(typeof context.category).toBe('string');
      expect(typeof context.scope).toBe('string');
      expect(Array.isArray(context.objectives)).toBe(true);
      expect(Array.isArray(context.constraints)).toBe(true);
      expect(typeof context.timeline).toBe('string');
    });

    it('should validate ResearchQuestion interface', () => {
      const question: ResearchQuestion = {
        id: 'q-test',
        question: 'Test question?',
        type: 'exploratory',
        priority: 'medium',
        complexity: 'low',
        timeline: '2 weeks',
        methodology: 'analysis',
        expectedOutcome: 'Test outcome',
        successCriteria: ['criteria1'],
        relatedKnowledge: ['knowledge1'],
        resources: ['resource1'],
        risks: ['risk1'],
        dependencies: ['dep1']
      };

      expect(typeof question.id).toBe('string');
      expect(typeof question.question).toBe('string');
      expect(typeof question.type).toBe('string');
      expect(typeof question.priority).toBe('string');
      expect(Array.isArray(question.successCriteria)).toBe(true);
      expect(Array.isArray(question.dependencies)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle null inputs gracefully', async () => {
      await expect(correlateProblemKnowledge(null as any, null as any))
        .rejects.toThrow();
    });

    it('should handle undefined inputs gracefully', async () => {
      await expect(findRelevantAdrPatterns(undefined as any))
        .rejects.toThrow();
    });

    it('should handle invalid context gracefully', async () => {
      const invalidContext = {} as ResearchContext;
      await expect(findRelevantAdrPatterns(invalidContext))
        .rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large knowledge graphs', async () => {
      const largeKnowledge: KnowledgeGraph = {
        technologies: Array.from({ length: 100 }, (_, i) => ({
          name: `Tech ${i}`,
          description: `Description ${i}`,
          category: `Category ${i % 5}`
        })),
        patterns: Array.from({ length: 50 }, (_, i) => ({
          name: `Pattern ${i}`,
          description: `Description ${i}`,
          category: `Category ${i % 3}`
        })),
        adrs: Array.from({ length: 25 }, (_, i) => ({
          id: `adr-${i}`,
          title: `ADR ${i}`,
          status: i % 2 === 0 ? 'accepted' : 'proposed'
        })),
        relationships: Array.from({ length: 75 }, (_, i) => ({
          source: `Tech ${i % 10}`,
          target: `Pattern ${i % 5}`,
          type: 'implements'
        }))
      };

      const problems: ResearchProblem[] = [
        {
          id: 'large-test',
          description: 'Testing with large knowledge graph',
          category: 'performance',
          severity: 'high',
          context: 'scalability testing'
        }
      ];

      const result = await correlateProblemKnowledge(problems, largeKnowledge);
      expect(result).toHaveProperty('correlationPrompt');
      expect(result).toHaveProperty('instructions');
    });

    it('should handle special characters in inputs', async () => {
      const specialContext: ResearchContext = {
        topic: 'Special Characters: @#$%^&*()',
        category: 'tëst-cätëgöry',
        scope: 'ünïcödë-scöpë',
        objectives: ['öbjëctïvë-1', 'öbjëctïvë-2'],
        constraints: ['cönstraïnt-1'],
        timeline: '3 mönths'
      };

      const result = await findRelevantAdrPatterns(specialContext);
      expect(result).toHaveProperty('relevancePrompt');
      expect(result).toHaveProperty('instructions');
    });
  });
});
