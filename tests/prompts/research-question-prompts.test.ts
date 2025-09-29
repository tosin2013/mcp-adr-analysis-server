/**
 * Unit tests for research-question-prompts.ts
 * Testing all exported functions with comprehensive scenarios
 */

import {
  generateProblemKnowledgeCorrelationPrompt,
  generateRelevantAdrPatternPrompt,
  generateContextAwareResearchQuestionsPrompt,
  generateResearchTaskTrackingPrompt,
} from '../../src/prompts/research-question-prompts';

describe('Research Question Prompts', () => {
  describe('generateProblemKnowledgeCorrelationPrompt', () => {
    const mockProblems = [
      {
        id: 'prob-1',
        description: 'Database performance issues',
        category: 'performance',
        severity: 'high',
        context: 'Production environment experiencing slow queries',
      },
      {
        id: 'prob-2',
        description: 'Authentication system complexity',
        category: 'security',
        severity: 'medium',
        context: 'Multiple authentication methods causing confusion',
      },
    ];

    const mockKnowledgeGraph = {
      technologies: [
        { name: 'PostgreSQL', description: 'Relational database system' },
        { name: 'Redis', description: 'In-memory data store' },
      ],
      patterns: [
        { name: 'CQRS', description: 'Command Query Responsibility Segregation' },
        { name: 'Event Sourcing', description: 'Event-based data persistence' },
      ],
      adrs: [
        { title: 'ADR-001: Database Selection', status: 'accepted' },
        { title: 'ADR-002: Authentication Strategy', status: 'proposed' },
      ],
      relationships: [
        { source: 'PostgreSQL', target: 'CQRS', type: 'implements' },
        { source: 'Redis', target: 'Event Sourcing', type: 'supports' },
      ],
    };

    it('should generate prompt with problems and knowledge graph', () => {
      const result = generateProblemKnowledgeCorrelationPrompt(mockProblems, mockKnowledgeGraph);

      expect(result).toContain('Problem-Knowledge Graph Correlation Analysis Guide');
      expect(result).toContain('Database performance issues');
      expect(result).toContain('Authentication system complexity');
      expect(result).toContain('PostgreSQL');
      expect(result).toContain('Redis');
      expect(result).toContain('CQRS');
      expect(result).toContain('Event Sourcing');
      expect(result).toContain('ADR-001: Database Selection');
      expect(result).toContain('PostgreSQL → CQRS (implements)');
      expect(result).toContain('"totalProblems": 2');
    });

    it('should handle empty problems array', () => {
      const result = generateProblemKnowledgeCorrelationPrompt([], mockKnowledgeGraph);

      expect(result).toContain('Problem-Knowledge Graph Correlation Analysis Guide');
      expect(result).toContain('"totalProblems": 0');
      expect(result).toContain('PostgreSQL');
    });

    it('should handle empty knowledge graph', () => {
      const emptyKnowledgeGraph = {
        technologies: [],
        patterns: [],
        adrs: [],
        relationships: [],
      };

      const result = generateProblemKnowledgeCorrelationPrompt(mockProblems, emptyKnowledgeGraph);

      expect(result).toContain('Database performance issues');
      expect(result).toContain('"totalProblems": 2');
    });

    it('should handle knowledge graph items without descriptions', () => {
      const knowledgeGraphNoDesc = {
        technologies: [{ name: 'MySQL' }],
        patterns: [{ name: 'MVC' }],
        adrs: [{ title: 'ADR-003: Framework Choice', status: 'draft' }],
        relationships: [{ source: 'MySQL', target: 'MVC', type: 'uses' }],
      };

      const result = generateProblemKnowledgeCorrelationPrompt(mockProblems, knowledgeGraphNoDesc);

      expect(result).toContain('MySQL**: No description');
      expect(result).toContain('MVC**: No description');
      expect(result).toContain('ADR-003: Framework Choice**: draft');
    });

    it('should handle special characters in problem descriptions', () => {
      const specialProblems = [
        {
          id: 'prob-special',
          description: 'API rate limiting & throttling issues (>1000 req/s)',
          category: 'performance',
          severity: 'critical',
          context: 'High-traffic scenarios with "burst" patterns',
        },
      ];

      const result = generateProblemKnowledgeCorrelationPrompt(specialProblems, mockKnowledgeGraph);

      expect(result).toContain('API rate limiting & throttling issues (>1000 req/s)');
      expect(result).toContain('High-traffic scenarios with "burst" patterns');
    });

    it('should include JSON template structure', () => {
      const result = generateProblemKnowledgeCorrelationPrompt(mockProblems, mockKnowledgeGraph);

      expect(result).toContain('correlationAnalysis');
      expect(result).toContain('problemCorrelations');
      expect(result).toContain('knowledgeGaps');
      expect(result).toContain('researchOpportunities');
      expect(result).toContain('recommendations');
    });

    it('should handle large number of problems', () => {
      const manyProblems = Array.from({ length: 50 }, (_, i) => ({
        id: `prob-${i}`,
        description: `Problem ${i} description`,
        category: 'general',
        severity: 'low',
        context: `Context for problem ${i}`,
      }));

      const result = generateProblemKnowledgeCorrelationPrompt(manyProblems, mockKnowledgeGraph);

      expect(result).toContain('"totalProblems": 50');
      expect(result).toContain('Problem 0 description');
      expect(result).toContain('Problem 49 description');
    });

    it('should include analysis guidelines', () => {
      const result = generateProblemKnowledgeCorrelationPrompt(mockProblems, mockKnowledgeGraph);

      expect(result).toContain('Analysis Guidelines');
      expect(result).toContain('Systematic Correlation');
      expect(result).toContain('Gap Identification');
      expect(result).toContain('Priority Assessment');
    });
  });

  describe('generateRelevantAdrPatternPrompt', () => {
    const mockResearchContext = {
      topic: 'Microservices Architecture Migration',
      category: 'architecture',
      scope: 'enterprise-wide',
      objectives: ['Improve scalability', 'Reduce coupling', 'Enable team autonomy'],
    };

    const mockAdrs = [
      {
        id: 'adr-001',
        title: 'Service Decomposition Strategy',
        content:
          'We will decompose the monolith into microservices based on business capabilities...',
        status: 'accepted',
      },
      {
        id: 'adr-002',
        title: 'API Gateway Implementation',
        content: 'Use Kong as the API gateway for routing and authentication...',
        status: 'proposed',
      },
    ];

    const mockPatterns = [
      {
        name: 'Domain-Driven Design',
        description: 'Strategic design approach for complex domains',
        category: 'architecture',
      },
      {
        name: 'Circuit Breaker',
        description: 'Fault tolerance pattern for distributed systems',
        category: 'resilience',
      },
    ];

    it('should generate prompt with research context and available resources', () => {
      const result = generateRelevantAdrPatternPrompt(mockResearchContext, mockAdrs, mockPatterns);

      expect(result).toContain('Relevant ADR and Pattern Discovery');
      expect(result).toContain('Microservices Architecture Migration');
      expect(result).toContain('Improve scalability, Reduce coupling, Enable team autonomy');
      expect(result).toContain('Service Decomposition Strategy');
      expect(result).toContain('Domain-Driven Design');
      expect(result).toContain('"totalAdrsAnalyzed": 2');
      expect(result).toContain('"totalPatternsAnalyzed": 2');
    });

    it('should handle empty ADRs array', () => {
      const result = generateRelevantAdrPatternPrompt(mockResearchContext, [], mockPatterns);

      expect(result).toContain('Microservices Architecture Migration');
      expect(result).toContain('"totalAdrsAnalyzed": 0');
      expect(result).toContain('Domain-Driven Design');
    });

    it('should handle empty patterns array', () => {
      const result = generateRelevantAdrPatternPrompt(mockResearchContext, mockAdrs, []);

      expect(result).toContain('Service Decomposition Strategy');
      expect(result).toContain('"totalPatternsAnalyzed": 0');
    });

    it('should truncate long ADR content', () => {
      const longContentAdr = {
        id: 'adr-long',
        title: 'Very Long ADR',
        content: 'A'.repeat(600) + ' This should be truncated',
        status: 'accepted',
      };

      const result = generateRelevantAdrPatternPrompt(
        mockResearchContext,
        [longContentAdr],
        mockPatterns
      );

      expect(result).toContain('A'.repeat(500));
      expect(result).toContain('...');
      expect(result).not.toContain('This should be truncated');
    });

    it('should handle single objective', () => {
      const singleObjectiveContext = {
        ...mockResearchContext,
        objectives: ['Improve performance'],
      };

      const result = generateRelevantAdrPatternPrompt(
        singleObjectiveContext,
        mockAdrs,
        mockPatterns
      );

      expect(result).toContain('Improve performance');
    });

    it('should include JSON template structure', () => {
      const result = generateRelevantAdrPatternPrompt(mockResearchContext, mockAdrs, mockPatterns);

      expect(result).toContain('relevanceAnalysis');
      expect(result).toContain('relevantAdrs');
      expect(result).toContain('relevantPatterns');
      expect(result).toContain('researchImplications');
      expect(result).toContain('researchGuidance');
    });

    it('should handle special characters in content', () => {
      const specialAdr = {
        id: 'adr-special',
        title: 'API Design & Security',
        content: 'Use OAuth 2.0 & JWT tokens for authentication. Rate limit: >1000 req/s',
        status: 'accepted',
      };

      const result = generateRelevantAdrPatternPrompt(
        mockResearchContext,
        [specialAdr],
        mockPatterns
      );

      expect(result).toContain('API Design & Security');
      expect(result).toContain('OAuth 2.0 & JWT tokens');
      expect(result).toContain('>1000 req/s');
    });

    it('should include analysis requirements sections', () => {
      const result = generateRelevantAdrPatternPrompt(mockResearchContext, mockAdrs, mockPatterns);

      expect(result).toContain('ADR Relevance Analysis');
      expect(result).toContain('Pattern Relevance Analysis');
      expect(result).toContain('Research Implications');
      expect(result).toContain('Analysis Guidelines');
    });
  });

  describe('generateContextAwareResearchQuestionsPrompt', () => {
    const mockResearchContext = {
      topic: 'Container Orchestration Strategy',
      category: 'infrastructure',
      objectives: ['Improve deployment efficiency', 'Enhance scalability'],
      constraints: ['Budget limitations', 'Security requirements'],
      timeline: '6 months',
    };

    const mockRelevantKnowledge = {
      adrs: [
        {
          title: 'Container Platform Selection',
          relevanceReason: 'Directly related to orchestration',
        },
        { title: 'Security Baseline', relevanceReason: 'Defines security constraints' },
      ],
      patterns: [
        { patternName: 'Blue-Green Deployment', relevanceReason: 'Deployment strategy pattern' },
        { patternName: 'Service Mesh', relevanceReason: 'Container networking pattern' },
      ],
      gaps: [
        { description: 'Monitoring strategy undefined', impact: 'high' },
        { description: 'Disaster recovery plan missing', impact: 'critical' },
      ],
      opportunities: [
        { title: 'Automated scaling', description: 'Implement horizontal pod autoscaling' },
        { title: 'Cost optimization', description: 'Right-size container resources' },
      ],
    };

    const mockProjectContext = {
      technologies: ['Kubernetes', 'Docker', 'Prometheus'],
      architecture: 'microservices',
      domain: 'e-commerce',
      scale: 'enterprise',
    };

    it('should generate prompt with all context sections', () => {
      const result = generateContextAwareResearchQuestionsPrompt(
        mockResearchContext,
        mockRelevantKnowledge,
        mockProjectContext
      );

      expect(result).toContain('Context-Aware Research Question Generation');
      expect(result).toContain('Container Orchestration Strategy');
      expect(result).toContain('Improve deployment efficiency, Enhance scalability');
      expect(result).toContain('Budget limitations, Security requirements');
      expect(result).toContain('6 months');
      expect(result).toContain('Container Platform Selection');
      expect(result).toContain('Blue-Green Deployment');
      expect(result).toContain('Monitoring strategy undefined');
      expect(result).toContain('Automated scaling');
      expect(result).toContain('Kubernetes, Docker, Prometheus');
      expect(result).toContain('microservices');
      expect(result).toContain('e-commerce');
      expect(result).toContain('enterprise');
    });

    it('should handle empty objectives array', () => {
      const contextWithEmptyObjectives = {
        ...mockResearchContext,
        objectives: [],
      };

      const result = generateContextAwareResearchQuestionsPrompt(
        contextWithEmptyObjectives,
        mockRelevantKnowledge,
        mockProjectContext
      );

      expect(result).toContain('Container Orchestration Strategy');
      expect(result).toContain('**Objectives**: ');
    });

    it('should handle empty constraints array', () => {
      const contextWithEmptyConstraints = {
        ...mockResearchContext,
        constraints: [],
      };

      const result = generateContextAwareResearchQuestionsPrompt(
        contextWithEmptyConstraints,
        mockRelevantKnowledge,
        mockProjectContext
      );

      expect(result).toContain('**Constraints**: ');
    });

    it('should handle empty relevant knowledge arrays', () => {
      const emptyKnowledge = {
        adrs: [],
        patterns: [],
        gaps: [],
        opportunities: [],
      };

      const result = generateContextAwareResearchQuestionsPrompt(
        mockResearchContext,
        emptyKnowledge,
        mockProjectContext
      );

      expect(result).toContain('Container Orchestration Strategy');
      expect(result).toContain('Kubernetes, Docker, Prometheus');
    });

    it('should handle empty technologies array', () => {
      const contextWithEmptyTech = {
        ...mockProjectContext,
        technologies: [],
      };

      const result = generateContextAwareResearchQuestionsPrompt(
        mockResearchContext,
        mockRelevantKnowledge,
        contextWithEmptyTech
      );

      expect(result).toContain('**Technologies**: ');
      expect(result).toContain('microservices');
    });

    it('should include JSON template structure', () => {
      const result = generateContextAwareResearchQuestionsPrompt(
        mockResearchContext,
        mockRelevantKnowledge,
        mockProjectContext
      );

      expect(result).toContain('researchQuestionGeneration');
      expect(result).toContain('primaryQuestions');
      expect(result).toContain('secondaryQuestions');
      expect(result).toContain('methodologicalQuestions');
      expect(result).toContain('researchPlan');
      expect(result).toContain('qualityAssurance');
      expect(result).toContain('expectedImpact');
    });

    it('should include research question categories', () => {
      const result = generateContextAwareResearchQuestionsPrompt(
        mockResearchContext,
        mockRelevantKnowledge,
        mockProjectContext
      );

      expect(result).toContain('Primary Research Questions');
      expect(result).toContain('Secondary Research Questions');
      expect(result).toContain('Methodological Questions');
      expect(result).toContain('Core Questions');
      expect(result).toContain('Hypothesis Questions');
      expect(result).toContain('Context Questions');
      expect(result).toContain('Approach Questions');
    });

    it('should handle special characters in context', () => {
      const specialContext = {
        topic: 'API Gateway & Rate Limiting',
        category: 'security & performance',
        objectives: ['Handle >10K req/s', 'Implement OAuth 2.0'],
        constraints: ['PCI-DSS compliance', 'GDPR requirements'],
        timeline: '3-6 months',
      };

      const result = generateContextAwareResearchQuestionsPrompt(
        specialContext,
        mockRelevantKnowledge,
        mockProjectContext
      );

      expect(result).toContain('API Gateway & Rate Limiting');
      expect(result).toContain('security & performance');
      expect(result).toContain('Handle >10K req/s, Implement OAuth 2.0');
      expect(result).toContain('PCI-DSS compliance, GDPR requirements');
    });

    it('should include question generation guidelines', () => {
      const result = generateContextAwareResearchQuestionsPrompt(
        mockResearchContext,
        mockRelevantKnowledge,
        mockProjectContext
      );

      expect(result).toContain('Question Generation Guidelines');
      expect(result).toContain('Specific and Actionable');
      expect(result).toContain('Context-Aware');
      expect(result).toContain('Testable');
      expect(result).toContain('Prioritized');
    });
  });

  describe('generateResearchTaskTrackingPrompt', () => {
    const mockResearchQuestions = [
      {
        id: 'q1',
        question: 'What is the optimal container orchestration platform?',
        type: 'evaluation',
        priority: 'high',
        timeline: 'short_term',
        methodology: 'comparative analysis',
      },
      {
        id: 'q2',
        question: 'How should we implement service discovery?',
        type: 'implementation',
        priority: 'medium',
        timeline: 'medium_term',
        methodology: 'prototype development',
      },
    ];

    const mockCurrentProgress = [
      {
        questionId: 'q1',
        status: 'in_progress',
        progress: 60,
        findings: ['Kubernetes shows better scalability', 'Docker Swarm easier to manage'],
        blockers: ['Need access to production metrics'],
      },
      {
        questionId: 'q2',
        status: 'not_started',
        progress: 0,
        findings: [],
        blockers: ['Waiting for platform decision'],
      },
    ];

    it('should generate prompt with research questions only', () => {
      const result = generateResearchTaskTrackingPrompt(mockResearchQuestions);

      expect(result).toContain('Research Task Tracking and Management');
      expect(result).toContain('What is the optimal container orchestration platform?');
      expect(result).toContain('How should we implement service discovery?');
      expect(result).toContain('"totalQuestions": 2');
      expect(result).not.toContain('Current Progress');
    });

    it('should generate prompt with research questions and progress', () => {
      const result = generateResearchTaskTrackingPrompt(mockResearchQuestions, mockCurrentProgress);

      expect(result).toContain('Research Task Tracking and Management');
      expect(result).toContain('What is the optimal container orchestration platform?');
      expect(result).toContain('Current Progress');
      expect(result).toContain('Kubernetes shows better scalability');
      expect(result).toContain('Need access to production metrics');
      expect(result).toContain('**Progress**: 60%');
    });

    it('should handle empty research questions array', () => {
      const result = generateResearchTaskTrackingPrompt([]);

      expect(result).toContain('Research Task Tracking and Management');
      expect(result).toContain('"totalQuestions": 0');
    });

    it('should handle empty current progress array', () => {
      const result = generateResearchTaskTrackingPrompt(mockResearchQuestions, []);

      expect(result).toContain('What is the optimal container orchestration platform?');
      expect(result).toContain('Current Progress');
    });

    it('should handle progress with empty findings and blockers', () => {
      const emptyProgress = [
        {
          questionId: 'q1',
          status: 'not_started',
          progress: 0,
          findings: [],
          blockers: [],
        },
      ];

      const result = generateResearchTaskTrackingPrompt(mockResearchQuestions, emptyProgress);

      expect(result).toContain('**Findings**: ');
      expect(result).toContain('**Blockers**: ');
    });

    it('should include JSON template structure', () => {
      const result = generateResearchTaskTrackingPrompt(mockResearchQuestions);

      expect(result).toContain('researchTaskTracking');
      expect(result).toContain('researchTasks');
      expect(result).toContain('milestones');
      expect(result).toContain('riskManagement');
      expect(result).toContain('progressMetrics');
      expect(result).toContain('communicationPlan');
      expect(result).toContain('qualityAssurance');
      expect(result).toContain('recommendations');
    });

    it('should include task tracking requirements', () => {
      const result = generateResearchTaskTrackingPrompt(mockResearchQuestions);

      expect(result).toContain('Task Tracking Requirements');
      expect(result).toContain('Task Breakdown');
      expect(result).toContain('Progress Tracking');
      expect(result).toContain('Management Framework');
    });

    it('should handle special characters in questions and progress', () => {
      const specialQuestions = [
        {
          id: 'q-special',
          question: 'How to handle >10K req/s with OAuth 2.0 & JWT?',
          type: 'performance & security',
          priority: 'critical',
          timeline: 'ASAP',
          methodology: 'load testing & analysis',
        },
      ];

      const specialProgress = [
        {
          questionId: 'q-special',
          status: 'in_progress',
          progress: 75,
          findings: ['JWT validation adds ~5ms latency', 'OAuth 2.0 scales well'],
          blockers: ['Need SSL certificates & load balancer'],
        },
      ];

      const result = generateResearchTaskTrackingPrompt(specialQuestions, specialProgress);

      expect(result).toContain('How to handle >10K req/s with OAuth 2.0 & JWT?');
      expect(result).toContain('performance & security');
      expect(result).toContain('JWT validation adds ~5ms latency');
      expect(result).toContain('Need SSL certificates & load balancer');
    });

    it('should include tracking guidelines', () => {
      const result = generateResearchTaskTrackingPrompt(mockResearchQuestions);

      expect(result).toContain('Tracking Guidelines');
      expect(result).toContain('Comprehensive Coverage');
      expect(result).toContain('Actionable Metrics');
      expect(result).toContain('Regular Updates');
      expect(result).toContain('Risk Awareness');
    });

    it('should handle large number of questions', () => {
      const manyQuestions = Array.from({ length: 20 }, (_, i) => ({
        id: `q${i}`,
        question: `Research question ${i}?`,
        type: 'analysis',
        priority: 'medium',
        timeline: 'medium_term',
        methodology: 'literature review',
      }));

      const result = generateResearchTaskTrackingPrompt(manyQuestions);

      expect(result).toContain('"totalQuestions": 20');
      expect(result).toContain('Research question 0?');
      expect(result).toContain('Research question 19?');
    });
  });
});
