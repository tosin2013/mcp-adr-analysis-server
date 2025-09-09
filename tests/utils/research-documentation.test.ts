import { jest } from '@jest/globals';
import {
  createResearchDocument,
  createResearchIndex,
  ResearchDocument
} from '../../src/utils/research-documentation.js';

// Mock fs and path modules
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('path', () => ({
  join: jest.fn().mockImplementation((...args: string[]) => args.join('/'))
}));

describe('Research Documentation Utilities', () => {
  const mockResearchData: ResearchDocument = {
    id: 'test-research-001',
    title: 'Test Research Topic',
    category: 'architecture',
    status: 'planned',
    priority: 'high',
    questions: [
      {
        id: 'q-001',
        question: 'How can we improve system performance?',
        type: 'exploratory',
        methodology: 'analysis'
      },
      {
        id: 'q-002',
        question: 'What are the scalability constraints?',
        type: 'investigative',
        methodology: 'testing'
      }
    ],
    timeline: {
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      milestones: [
        {
          name: 'Research Planning Complete',
          date: '2024-01-15',
          description: 'All research questions and methodology defined'
        },
        {
          name: 'Data Collection Complete',
          date: '2024-02-28',
          description: 'All required data collected and validated'
        }
      ]
    },
    resources: [
      {
        type: 'personnel',
        description: 'Senior architect for analysis',
        status: 'available'
      },
      {
        type: 'tools',
        description: 'Performance monitoring tools',
        status: 'requested'
      }
    ],
    findings: [
      {
        date: '2024-01-20',
        finding: 'Database queries are the primary bottleneck',
        confidence: 0.85,
        impact: 'high'
      }
    ],
    recommendations: [
      {
        recommendation: 'Implement database query optimization',
        rationale: 'Queries account for 70% of response time',
        implementation: 'Add indexes and optimize slow queries',
        priority: 'high'
      }
    ]
  };

  describe('createResearchDocument', () => {
    it('should create research document with proper structure', async () => {
      const result = await createResearchDocument(mockResearchData);

      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('content');
      expect(result.filePath).toContain('perform_research_test_research_001.md');
      expect(result.content).toContain('# Research: Test Research Topic');
      expect(result.content).toContain('**Research ID**: test-research-001');
      expect(result.content).toContain('**Category**: architecture');
      expect(result.content).toContain('**Status**: planned');
      expect(result.content).toContain('**Priority**: high');
    });

    it('should include all research questions in content', async () => {
      const result = await createResearchDocument(mockResearchData);

      expect(result.content).toContain('## Research Questions');
      expect(result.content).toContain('1. How can we improve system performance?');
      expect(result.content).toContain('**Question ID**: q-001');
      expect(result.content).toContain('**Type**: exploratory');
      expect(result.content).toContain('**Methodology**: analysis');
      expect(result.content).toContain('2. What are the scalability constraints?');
      expect(result.content).toContain('**Question ID**: q-002');
    });

    it('should include timeline and milestones', async () => {
      const result = await createResearchDocument(mockResearchData);

      expect(result.content).toContain('## Timeline & Milestones');
      expect(result.content).toContain('**Start Date**: 2024-01-01');
      expect(result.content).toContain('**End Date**: 2024-03-31');
      expect(result.content).toContain('**Research Planning Complete** (2024-01-15)');
      expect(result.content).toContain('**Data Collection Complete** (2024-02-28)');
    });

    it('should include resources section', async () => {
      const result = await createResearchDocument(mockResearchData);

      expect(result.content).toContain('## Resources Required');
      expect(result.content).toContain('**personnel**: Senior architect for analysis (Status: available)');
      expect(result.content).toContain('**tools**: Performance monitoring tools (Status: requested)');
    });

    it('should include findings when present', async () => {
      const result = await createResearchDocument(mockResearchData);

      expect(result.content).toContain('## Findings');
      expect(result.content).toContain('### Finding: Database queries are the primary bottleneck');
      expect(result.content).toContain('**Date**: 2024-01-20');
      expect(result.content).toContain('**Confidence**: 85%');
      expect(result.content).toContain('**Impact**: high');
    });

    it('should include recommendations when present', async () => {
      const result = await createResearchDocument(mockResearchData);

      expect(result.content).toContain('## Recommendations');
      expect(result.content).toContain('### Recommendation 1: Implement database query optimization');
      expect(result.content).toContain('**Priority**: high');
      expect(result.content).toContain('**Rationale**: Queries account for 70% of response time');
      expect(result.content).toContain('**Implementation**: Add indexes and optimize slow queries');
    });

    it('should handle research data with no findings', async () => {
      const dataWithoutFindings: ResearchDocument = {
        ...mockResearchData,
        findings: []
      };

      const result = await createResearchDocument(dataWithoutFindings);

      expect(result.content).toContain('## Findings');
      expect(result.content).toContain('<!-- Findings will be documented here as research progresses -->');
      expect(result.content).toContain('### Template for Findings');
    });

    it('should handle research data with no recommendations', async () => {
      const dataWithoutRecommendations: ResearchDocument = {
        ...mockResearchData,
        recommendations: []
      };

      const result = await createResearchDocument(dataWithoutRecommendations);

      expect(result.content).toContain('## Recommendations');
      expect(result.content).toContain('<!-- Recommendations will be documented here based on research findings -->');
      expect(result.content).toContain('### Template for Recommendations');
    });

    it('should sanitize filename from research ID', async () => {
      const dataWithSpecialChars: ResearchDocument = {
        ...mockResearchData,
        id: 'Test-Research@#$%^&*()_001'
      };

      const result = await createResearchDocument(dataWithSpecialChars);
      expect(result.filePath).toContain('perform_research_test_research__________001.md');
    });

    it('should handle empty questions array', async () => {
      const dataWithoutQuestions: ResearchDocument = {
        ...mockResearchData,
        questions: []
      };

      const result = await createResearchDocument(dataWithoutQuestions);

      expect(result.content).toContain('## Research Questions');
      expect(result.content).not.toContain('### 1.');
    });

    it('should handle empty milestones array', async () => {
      const dataWithoutMilestones: ResearchDocument = {
        ...mockResearchData,
        timeline: {
          ...mockResearchData.timeline,
          milestones: []
        }
      };

      const result = await createResearchDocument(dataWithoutMilestones);

      expect(result.content).toContain('### Milestones');
      expect(result.content).not.toContain('**Research Planning Complete**');
    });

    it('should handle empty resources array', async () => {
      const dataWithoutResources: ResearchDocument = {
        ...mockResearchData,
        resources: []
      };

      const result = await createResearchDocument(dataWithoutResources);

      expect(result.content).toContain('## Resources Required');
      expect(result.content).not.toContain('**personnel**:');
    });

    it('should create document with custom directory', async () => {
      const customDir = 'custom/research/dir';
      const result = await createResearchDocument(mockResearchData, customDir);

      expect(result.filePath).toContain('custom/research/dir/perform_research_test_research_001.md');
    });
  });

  describe('createResearchIndex', () => {
    const mockResearchDocuments: ResearchDocument[] = [
      {
        id: 'research-001',
        title: 'Performance Analysis',
        category: 'performance',
        status: 'in_progress',
        priority: 'high',
        questions: [],
        timeline: { startDate: '2024-01-01', endDate: '2024-03-31', milestones: [] },
        resources: [],
        findings: [],
        recommendations: []
      },
      {
        id: 'research-002',
        title: 'Security Assessment',
        category: 'security',
        status: 'planned',
        priority: 'critical',
        questions: [],
        timeline: { startDate: '2024-02-01', endDate: '2024-04-30', milestones: [] },
        resources: [],
        findings: [],
        recommendations: []
      },
      {
        id: 'research-003',
        title: 'Architecture Review',
        category: 'architecture',
        status: 'completed',
        priority: 'medium',
        questions: [],
        timeline: { startDate: '2023-10-01', endDate: '2023-12-31', milestones: [] },
        resources: [],
        findings: [],
        recommendations: []
      },
      {
        id: 'research-004',
        title: 'Cancelled Research',
        category: 'performance',
        status: 'cancelled',
        priority: 'low',
        questions: [],
        timeline: { startDate: '2024-01-01', endDate: '2024-02-28', milestones: [] },
        resources: [],
        findings: [],
        recommendations: []
      }
    ];

    it('should create research index with proper structure', async () => {
      const result = await createResearchIndex(mockResearchDocuments);

      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('content');
      expect(result.filePath).toContain('README.md');
      expect(result.content).toContain('# Research Documentation Index');
    });

    it('should include correct statistics in index', async () => {
      const result = await createResearchIndex(mockResearchDocuments);

      expect(result.content).toContain('**Total Research Topics**: 4');
      expect(result.content).toContain('- **Planned**: 1');
      expect(result.content).toContain('- **In Progress**: 1');
      expect(result.content).toContain('- **Completed**: 1');
      expect(result.content).toContain('- **Cancelled**: 1');
    });

    it('should group research by status correctly', async () => {
      const result = await createResearchIndex(mockResearchDocuments);

      expect(result.content).toContain('### 🔄 In Progress');
      expect(result.content).toContain('[Performance Analysis](./perform_research_research_001.md) (high priority)');
      
      expect(result.content).toContain('### 📋 Planned');
      expect(result.content).toContain('[Security Assessment](./perform_research_research_002.md) (critical priority)');
      
      expect(result.content).toContain('### ✅ Completed');
      expect(result.content).toContain('[Architecture Review](./perform_research_research_003.md) (medium priority)');
      
      expect(result.content).toContain('### ❌ Cancelled');
      expect(result.content).toContain('[Cancelled Research](./perform_research_research_004.md) (low priority)');
    });

    it('should group research by category correctly', async () => {
      const result = await createResearchIndex(mockResearchDocuments);

      expect(result.content).toContain('## Research by Category');
      expect(result.content).toContain('### Performance');
      expect(result.content).toContain('### Security');
      expect(result.content).toContain('### Architecture');
    });

    it('should handle empty research documents array', async () => {
      const result = await createResearchIndex([]);

      expect(result.content).toContain('**Total Research Topics**: 0');
      expect(result.content).toContain('- **Planned**: 0');
      expect(result.content).toContain('- **In Progress**: 0');
      expect(result.content).toContain('- **Completed**: 0');
      expect(result.content).toContain('- **Cancelled**: 0');
      expect(result.content).toContain('No research currently in progress.');
      expect(result.content).toContain('No research currently planned.');
      expect(result.content).toContain('No research completed yet.');
      expect(result.content).toContain('No research cancelled.');
    });

    it('should handle research documents with only one status', async () => {
      const singleStatusDocs: ResearchDocument[] = [
        {
          id: 'research-001',
          title: 'Single Research',
          category: 'test',
          status: 'in_progress',
          priority: 'medium',
          questions: [],
          timeline: { startDate: '2024-01-01', endDate: '2024-03-31', milestones: [] },
          resources: [],
          findings: [],
          recommendations: []
        }
      ];

      const result = await createResearchIndex(singleStatusDocs);

      expect(result.content).toContain('**Total Research Topics**: 1');
      expect(result.content).toContain('- **In Progress**: 1');
      expect(result.content).toContain('- **Planned**: 0');
      expect(result.content).toContain('No research currently planned.');
    });

    it('should include research guidelines and process information', async () => {
      const result = await createResearchIndex(mockResearchDocuments);

      expect(result.content).toContain('## Research Guidelines');
      expect(result.content).toContain('### Creating New Research');
      expect(result.content).toContain('### Research Process');
      expect(result.content).toContain('### Quality Standards');
      expect(result.content).toContain('### Documentation Standards');
      expect(result.content).toContain('## Research Tools');
      expect(result.content).toContain('## Knowledge Management');
    });

    it('should properly sanitize research IDs in links', async () => {
      const docsWithSpecialChars: ResearchDocument[] = [
        {
          id: 'Research@#$%^&*()_001',
          title: 'Special Chars Research',
          category: 'test',
          status: 'planned',
          priority: 'high',
          questions: [],
          timeline: { startDate: '2024-01-01', endDate: '2024-03-31', milestones: [] },
          resources: [],
          findings: [],
          recommendations: []
        }
      ];

      const result = await createResearchIndex(docsWithSpecialChars);

      expect(result.content).toContain('[Special Chars Research](./perform_research_research__________001.md)');
    });

    it('should create index with custom directory', async () => {
      const customDir = 'custom/research';
      const result = await createResearchIndex(mockResearchDocuments, customDir);

      expect(result.filePath).toContain('custom/research/README.md');
    });
  });

  describe('Interface Validation', () => {
    it('should validate ResearchDocument interface', () => {
      const document: ResearchDocument = {
        id: 'test-id',
        title: 'Test Title',
        category: 'test-category',
        status: 'planned',
        priority: 'medium',
        questions: [
          {
            id: 'q-1',
            question: 'Test question?',
            type: 'exploratory',
            methodology: 'analysis'
          }
        ],
        timeline: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          milestones: [
            {
              name: 'Test Milestone',
              date: '2024-06-01',
              description: 'Test milestone description'
            }
          ]
        },
        resources: [
          {
            type: 'personnel',
            description: 'Test resource',
            status: 'available'
          }
        ],
        findings: [
          {
            date: '2024-01-15',
            finding: 'Test finding',
            confidence: 0.8,
            impact: 'medium'
          }
        ],
        recommendations: [
          {
            recommendation: 'Test recommendation',
            rationale: 'Test rationale',
            implementation: 'Test implementation',
            priority: 'high'
          }
        ]
      };

      expect(document.id).toBe('test-id');
      expect(document.status).toBe('planned');
      expect(document.priority).toBe('medium');
      expect(Array.isArray(document.questions)).toBe(true);
      expect(Array.isArray(document.timeline.milestones)).toBe(true);
      expect(Array.isArray(document.resources)).toBe(true);
      expect(Array.isArray(document.findings)).toBe(true);
      expect(Array.isArray(document.recommendations)).toBe(true);
    });

    it('should validate status enum values', () => {
      const validStatuses: ResearchDocument['status'][] = ['planned', 'in_progress', 'completed', 'cancelled'];
      
      validStatuses.forEach(status => {
        const document: ResearchDocument = {
          id: 'test',
          title: 'Test',
          category: 'test',
          status,
          priority: 'medium',
          questions: [],
          timeline: { startDate: '2024-01-01', endDate: '2024-12-31', milestones: [] },
          resources: [],
          findings: [],
          recommendations: []
        };
        
        expect(document.status).toBe(status);
      });
    });

    it('should validate priority enum values', () => {
      const validPriorities: ResearchDocument['priority'][] = ['critical', 'high', 'medium', 'low'];
      
      validPriorities.forEach(priority => {
        const document: ResearchDocument = {
          id: 'test',
          title: 'Test',
          category: 'test',
          status: 'planned',
          priority,
          questions: [],
          timeline: { startDate: '2024-01-01', endDate: '2024-12-31', milestones: [] },
          resources: [],
          findings: [],
          recommendations: []
        };
        
        expect(document.priority).toBe(priority);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long research titles', async () => {
      const longTitleData: ResearchDocument = {
        ...mockResearchData,
        title: 'A'.repeat(200)
      };

      const result = await createResearchDocument(longTitleData);
      expect(result.content).toContain('A'.repeat(200));
    });

    it('should handle special characters in research content', async () => {
      const specialCharsData: ResearchDocument = {
        id: 'test-unicode',
        title: 'Research with émojis 🚀 and ünïcödé',
        category: 'tëst-cätëgöry',
        status: 'planned',
        priority: 'medium',
        questions: [
          {
            id: 'q-unicode',
            question: 'How do we handle ünïcödé characters?',
            type: 'exploratory',
            methodology: 'tëstïng'
          }
        ],
        timeline: { startDate: '2024-01-01', endDate: '2024-12-31', milestones: [] },
        resources: [],
        findings: [],
        recommendations: []
      };

      const result = await createResearchDocument(specialCharsData);
      expect(result.content).toContain('Research with émojis 🚀 and ünïcödé');
      expect(result.content).toContain('How do we handle ünïcödé characters?');
    });

    it('should handle large numbers of research documents', async () => {
      const largeDocs: ResearchDocument[] = Array.from({ length: 50 }, (_, i) => ({
        id: `research-${i.toString().padStart(3, '0')}`,
        title: `Research Topic ${i}`,
        category: `category-${i % 5}`,
        status: ['planned', 'in_progress', 'completed', 'cancelled'][i % 4] as ResearchDocument['status'],
        priority: ['critical', 'high', 'medium', 'low'][i % 4] as ResearchDocument['priority'],
        questions: [],
        timeline: { startDate: '2024-01-01', endDate: '2024-12-31', milestones: [] },
        resources: [],
        findings: [],
        recommendations: []
      }));

      const result = await createResearchIndex(largeDocs);
      expect(result.content).toContain('**Total Research Topics**: 50');
    });
  });
});
