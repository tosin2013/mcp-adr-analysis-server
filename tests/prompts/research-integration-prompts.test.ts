/**
 * Unit tests for research-integration-prompts.ts
 * Testing all exported functions with comprehensive scenarios
 */

import {
  generateResearchTopicExtractionPrompt,
  generateResearchImpactEvaluationPrompt,
  generateAdrUpdateSuggestionPrompt,
} from '../../src/prompts/research-integration-prompts';

describe('Research Integration Prompts', () => {
  describe('generateResearchTopicExtractionPrompt', () => {
    const mockResearchFiles = [
      {
        filename: 'kubernetes-performance-study.md',
        content: 'This study evaluates Kubernetes performance under high load conditions. Our findings show that horizontal pod autoscaling provides significant benefits for CPU-intensive workloads...',
        lastModified: '2024-01-15T10:30:00Z',
        size: 15420,
      },
      {
        filename: 'microservices-security-analysis.pdf',
        content: 'Security analysis of microservices architecture reveals several key vulnerabilities in service-to-service communication. OAuth 2.0 implementation shows promise but requires careful configuration...',
        lastModified: '2024-01-10T14:22:00Z',
        size: 8750,
      },
    ];

    const mockExistingTopics = [
      'Container Orchestration',
      'API Security',
      'Performance Optimization',
    ];

    it('should generate prompt with research files only', () => {
      const result = generateResearchTopicExtractionPrompt(mockResearchFiles);

      expect(result).toContain('Research Topic Extraction Guide');
      expect(result).toContain('kubernetes-performance-study.md');
      expect(result).toContain('microservices-security-analysis.pdf');
      expect(result).toContain('2024-01-15T10:30:00Z');
      expect(result).toContain('15420 bytes');
      expect(result).toContain('Kubernetes performance under high load');
      expect(result).toContain('OAuth 2.0 implementation');
      expect(result).toContain('"totalFiles": 2');
      expect(result).not.toContain('Previously Identified Topics');
    });

    it('should generate prompt with research files and existing topics', () => {
      const result = generateResearchTopicExtractionPrompt(mockResearchFiles, mockExistingTopics);

      expect(result).toContain('Research Topic Extraction Guide');
      expect(result).toContain('kubernetes-performance-study.md');
      expect(result).toContain('Previously Identified Topics');
      expect(result).toContain('Container Orchestration');
      expect(result).toContain('API Security');
      expect(result).toContain('Performance Optimization');
    });

    it('should handle empty research files array', () => {
      const result = generateResearchTopicExtractionPrompt([]);

      expect(result).toContain('Research Topic Extraction Guide');
      expect(result).toContain('"totalFiles": 0');
      expect(result).not.toContain('Previously Identified Topics');
    });

    it('should handle empty existing topics array', () => {
      const result = generateResearchTopicExtractionPrompt(mockResearchFiles, []);

      expect(result).toContain('kubernetes-performance-study.md');
      expect(result).toContain('Previously Identified Topics');
    });

    it('should truncate long file content', () => {
      const longContentFile = {
        filename: 'large-research-file.md',
        content: 'A'.repeat(2500) + ' This content should be truncated',
        lastModified: '2024-01-20T09:15:00Z',
        size: 25000,
      };

      const result = generateResearchTopicExtractionPrompt([longContentFile]);

      expect(result).toContain('A'.repeat(2000));
      expect(result).toContain('... (truncated for analysis)');
      expect(result).not.toContain('This content should be truncated');
    });

    it('should handle special characters in filenames and content', () => {
      const specialFiles = [
        {
          filename: 'api-rate-limiting & security (v2.0).md',
          content: 'Analysis of API rate limiting with >10K req/s & JWT tokens. OAuth 2.0 "bearer" tokens provide security...',
          lastModified: '2024-01-25T16:45:00Z',
          size: 5200,
        },
      ];

      const result = generateResearchTopicExtractionPrompt(specialFiles);

      expect(result).toContain('api-rate-limiting & security (v2.0).md');
      expect(result).toContain('>10K req/s & JWT tokens');
      expect(result).toContain('OAuth 2.0 "bearer" tokens');
    });

    it('should include JSON template structure', () => {
      const result = generateResearchTopicExtractionPrompt(mockResearchFiles);

      expect(result).toContain('extractedTopics');
      expect(result).toContain('researchSummary');
      expect(result).toContain('keyInsights');
      expect(result).toContain('recommendations');
      expect(result).toContain('gaps');
    });

    it('should include extraction areas and guidelines', () => {
      const result = generateResearchTopicExtractionPrompt(mockResearchFiles);

      expect(result).toContain('Research Topics');
      expect(result).toContain('Research Findings');
      expect(result).toContain('Architectural Relevance');
      expect(result).toContain('Technology Evaluations');
      expect(result).toContain('Performance Studies');
      expect(result).toContain('Extraction Guidelines');
      expect(result).toContain('Comprehensive Coverage');
    });

    it('should handle large number of files', () => {
      const manyFiles = Array.from({ length: 25 }, (_, i) => ({
        filename: `research-file-${i}.md`,
        content: `Research content for file ${i} with various findings and insights.`,
        lastModified: `2024-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
        size: 1000 + i * 100,
      }));

      const result = generateResearchTopicExtractionPrompt(manyFiles);

      expect(result).toContain('"totalFiles": 25');
      expect(result).toContain('research-file-0.md');
      expect(result).toContain('research-file-24.md');
    });

    it('should handle files with zero size', () => {
      const zeroSizeFile = {
        filename: 'empty-research.md',
        content: '',
        lastModified: '2024-01-01T00:00:00Z',
        size: 0,
      };

      const result = generateResearchTopicExtractionPrompt([zeroSizeFile]);

      expect(result).toContain('empty-research.md');
      expect(result).toContain('0 bytes');
      expect(result).toContain('"totalFiles": 1');
    });
  });

  describe('generateResearchImpactEvaluationPrompt', () => {
    const mockResearchTopics = [
      {
        id: 'topic-1',
        title: 'Kubernetes Performance Optimization',
        category: 'performance',
        keyFindings: [
          'Horizontal pod autoscaling reduces response time by 40%',
          'Memory limits should be set 20% above average usage',
        ],
        relevanceScore: 0.9,
      },
      {
        id: 'topic-2',
        title: 'OAuth 2.0 Security Best Practices',
        category: 'security',
        keyFindings: [
          'JWT token expiration should be under 15 minutes',
          'Refresh tokens must be rotated on each use',
        ],
        relevanceScore: 0.8,
      },
    ];

    const mockExistingAdrs = [
      {
        id: 'adr-001',
        title: 'Container Orchestration Platform Selection',
        status: 'accepted',
        content: 'We have decided to use Kubernetes for container orchestration due to its scalability and ecosystem support. The decision was made based on initial performance benchmarks...',
        category: 'infrastructure',
      },
      {
        id: 'adr-002',
        title: 'API Authentication Strategy',
        status: 'proposed',
        content: 'We propose using OAuth 2.0 with JWT tokens for API authentication. Token expiration will be set to 1 hour to balance security and user experience...',
        category: 'security',
      },
    ];

    it('should generate prompt with research topics and existing ADRs', () => {
      const result = generateResearchImpactEvaluationPrompt(mockResearchTopics, mockExistingAdrs);

      expect(result).toContain('Research Impact Evaluation on Existing ADRs');
      expect(result).toContain('Kubernetes Performance Optimization');
      expect(result).toContain('OAuth 2.0 Security Best Practices');
      expect(result).toContain('Horizontal pod autoscaling reduces response time by 40%');
      expect(result).toContain('JWT token expiration should be under 15 minutes');
      expect(result).toContain('Container Orchestration Platform Selection');
      expect(result).toContain('API Authentication Strategy');
      expect(result).toContain('"totalAdrsAnalyzed": 2');
    });

    it('should handle empty research topics array', () => {
      const result = generateResearchImpactEvaluationPrompt([], mockExistingAdrs);

      expect(result).toContain('Research Impact Evaluation on Existing ADRs');
      expect(result).toContain('Container Orchestration Platform Selection');
      expect(result).toContain('"totalAdrsAnalyzed": 2');
    });

    it('should handle empty existing ADRs array', () => {
      const result = generateResearchImpactEvaluationPrompt(mockResearchTopics, []);

      expect(result).toContain('Kubernetes Performance Optimization');
      expect(result).toContain('"totalAdrsAnalyzed": 0');
    });

    it('should handle ADRs without category', () => {
      const adrsWithoutCategory = [
        {
          id: 'adr-003',
          title: 'Database Selection',
          status: 'draft',
          content: 'We are considering PostgreSQL for our primary database...',
        },
      ];

      const result = generateResearchImpactEvaluationPrompt(mockResearchTopics, adrsWithoutCategory);

      expect(result).toContain('Database Selection');
      expect(result).toContain('**Category**: Unknown');
    });

    it('should truncate long ADR content', () => {
      const longContentAdr = {
        id: 'adr-long',
        title: 'Very Long ADR',
        status: 'accepted',
        content: 'A'.repeat(1200) + ' This should be truncated',
        category: 'architecture',
      };

      const result = generateResearchImpactEvaluationPrompt(mockResearchTopics, [longContentAdr]);

      expect(result).toContain('A'.repeat(1000));
      expect(result).toContain('... (truncated)');
      expect(result).not.toContain('This should be truncated');
    });

    it('should handle special characters in topics and ADRs', () => {
      const specialTopics = [
        {
          id: 'topic-special',
          title: 'API Rate Limiting & Performance (>10K req/s)',
          category: 'performance & security',
          keyFindings: [
            'Rate limiting with Redis achieves >15K req/s',
            'OAuth 2.0 "bearer" tokens add ~2ms latency',
          ],
          relevanceScore: 0.95,
        },
      ];

      const specialAdrs = [
        {
          id: 'adr-special',
          title: 'High-Performance API Design & Security',
          status: 'accepted',
          content: 'API design for >10K req/s with OAuth 2.0 & rate limiting...',
          category: 'performance & security',
        },
      ];

      const result = generateResearchImpactEvaluationPrompt(specialTopics, specialAdrs);

      expect(result).toContain('API Rate Limiting & Performance (>10K req/s)');
      expect(result).toContain('OAuth 2.0 "bearer" tokens');
      expect(result).toContain('High-Performance API Design & Security');
    });

    it('should include JSON template structure', () => {
      const result = generateResearchImpactEvaluationPrompt(mockResearchTopics, mockExistingAdrs);

      expect(result).toContain('impactAnalysis');
      expect(result).toContain('updateRecommendations');
      expect(result).toContain('newAdrSuggestions');
      expect(result).toContain('deprecationSuggestions');
      expect(result).toContain('overallAssessment');
    });

    it('should include impact analysis requirements', () => {
      const result = generateResearchImpactEvaluationPrompt(mockResearchTopics, mockExistingAdrs);

      expect(result).toContain('Direct Impact Assessment');
      expect(result).toContain('Decision Validity');
      expect(result).toContain('Update Recommendations');
      expect(result).toContain('Contradictory Findings');
      expect(result).toContain('Supporting Evidence');
      expect(result).toContain('Evaluation Guidelines');
    });

    it('should handle topics with empty key findings', () => {
      const topicsWithEmptyFindings = [
        {
          id: 'topic-empty',
          title: 'Empty Topic',
          category: 'general',
          keyFindings: [],
          relevanceScore: 0.5,
        },
      ];

      const result = generateResearchImpactEvaluationPrompt(topicsWithEmptyFindings, mockExistingAdrs);

      expect(result).toContain('Empty Topic');
      expect(result).toContain('Container Orchestration Platform Selection');
    });

    it('should handle large datasets', () => {
      const manyTopics = Array.from({ length: 15 }, (_, i) => ({
        id: `topic-${i}`,
        title: `Research Topic ${i}`,
        category: 'general',
        keyFindings: [`Finding ${i}A`, `Finding ${i}B`],
        relevanceScore: 0.7,
      }));

      const manyAdrs = Array.from({ length: 20 }, (_, i) => ({
        id: `adr-${i}`,
        title: `ADR ${i}`,
        status: 'accepted',
        content: `Content for ADR ${i}`,
        category: 'general',
      }));

      const result = generateResearchImpactEvaluationPrompt(manyTopics, manyAdrs);

      expect(result).toContain('"totalAdrsAnalyzed": 20');
      expect(result).toContain('Research Topic 0');
      expect(result).toContain('ADR 19');
    });
  });

  describe('generateAdrUpdateSuggestionPrompt', () => {
    const mockAdrToUpdate = {
      id: 'adr-001',
      title: 'Container Orchestration Platform Selection',
      content: '# Container Orchestration Platform Selection\n\n## Status\nAccepted\n\n## Context\nWe need a container orchestration platform...\n\n## Decision\nWe will use Kubernetes...',
      status: 'accepted',
    };

    const mockResearchFindings = [
      {
        finding: 'Kubernetes performance can be improved by 40% with proper autoscaling configuration',
        evidence: [
          'Benchmark study shows 40% improvement in response time',
          'Memory utilization reduced by 25%',
          'CPU efficiency increased by 30%',
        ],
        impact: 'high',
      },
      {
        finding: 'New Kubernetes security vulnerabilities discovered in service mesh',
        evidence: [
          'CVE-2024-1234 affects Istio integration',
          'Mitigation requires updated network policies',
        ],
        impact: 'critical',
      },
    ];

    it('should generate prompt for content update', () => {
      const result = generateAdrUpdateSuggestionPrompt(
        mockAdrToUpdate,
        mockResearchFindings,
        'content'
      );

      expect(result).toContain('ADR Update Suggestion');
      expect(result).toContain('Container Orchestration Platform Selection');
      expect(result).toContain('adr-001');
      expect(result).toContain('accepted');
      expect(result).toContain('We will use Kubernetes');
      expect(result).toContain('Kubernetes performance can be improved by 40%');
      expect(result).toContain('New Kubernetes security vulnerabilities');
      expect(result).toContain('content');
      expect(result).toContain('"updateType": "content"');
    });

    it('should generate prompt for status update', () => {
      const result = generateAdrUpdateSuggestionPrompt(
        mockAdrToUpdate,
        mockResearchFindings,
        'status'
      );

      expect(result).toContain('ADR Update Suggestion');
      expect(result).toContain('status');
      expect(result).toContain('"updateType": "status"');
      expect(result).toContain('Status Updates');
    });

    it('should generate prompt for consequences update', () => {
      const result = generateAdrUpdateSuggestionPrompt(
        mockAdrToUpdate,
        mockResearchFindings,
        'consequences'
      );

      expect(result).toContain('consequences');
      expect(result).toContain('"updateType": "consequences"');
      expect(result).toContain('Consequences Updates');
    });

    it('should generate prompt for alternatives update', () => {
      const result = generateAdrUpdateSuggestionPrompt(
        mockAdrToUpdate,
        mockResearchFindings,
        'alternatives'
      );

      expect(result).toContain('alternatives');
      expect(result).toContain('"updateType": "alternatives"');
      expect(result).toContain('Alternatives Updates');
    });

    it('should generate prompt for deprecation', () => {
      const result = generateAdrUpdateSuggestionPrompt(
        mockAdrToUpdate,
        mockResearchFindings,
        'deprecation'
      );

      expect(result).toContain('deprecation');
      expect(result).toContain('"updateType": "deprecation"');
      expect(result).toContain('Deprecation Suggestions');
    });

    it('should handle empty research findings array', () => {
      const result = generateAdrUpdateSuggestionPrompt(mockAdrToUpdate, [], 'content');

      expect(result).toContain('Container Orchestration Platform Selection');
      expect(result).toContain('content');
    });

    it('should handle research findings with empty evidence', () => {
      const findingsWithEmptyEvidence = [
        {
          finding: 'Some finding without evidence',
          evidence: [],
          impact: 'low',
        },
      ];

      const result = generateAdrUpdateSuggestionPrompt(
        mockAdrToUpdate,
        findingsWithEmptyEvidence,
        'content'
      );

      expect(result).toContain('Some finding without evidence');
      expect(result).toContain('**Evidence**:');
    });

    it('should handle special characters in ADR content and findings', () => {
      const specialAdr = {
        id: 'adr-special',
        title: 'API Rate Limiting & Security (OAuth 2.0)',
        content: '# API Rate Limiting & Security\n\nHandle >10K req/s with OAuth 2.0 "bearer" tokens...',
        status: 'accepted',
      };

      const specialFindings = [
        {
          finding: 'Rate limiting achieves >15K req/s with Redis & JWT',
          evidence: [
            'Benchmark: >15K req/s sustained',
            'OAuth 2.0 "bearer" tokens add ~2ms latency',
          ],
          impact: 'high',
        },
      ];

      const result = generateAdrUpdateSuggestionPrompt(specialAdr, specialFindings, 'content');

      expect(result).toContain('API Rate Limiting & Security (OAuth 2.0)');
      expect(result).toContain('Handle >10K req/s with OAuth 2.0 "bearer" tokens');
      expect(result).toContain('Rate limiting achieves >15K req/s with Redis & JWT');
    });

    it('should include JSON template structure', () => {
      const result = generateAdrUpdateSuggestionPrompt(
        mockAdrToUpdate,
        mockResearchFindings,
        'content'
      );

      expect(result).toContain('updateSuggestion');
      expect(result).toContain('proposedChanges');
      expect(result).toContain('newContent');
      expect(result).toContain('migrationGuidance');
      expect(result).toContain('qualityChecks');
      expect(result).toContain('reviewRecommendations');
    });

    it('should include update requirements sections', () => {
      const result = generateAdrUpdateSuggestionPrompt(
        mockAdrToUpdate,
        mockResearchFindings,
        'content'
      );

      expect(result).toContain('Update Requirements');
      expect(result).toContain('Content Updates');
      expect(result).toContain('Status Updates');
      expect(result).toContain('Consequences Updates');
      expect(result).toContain('Alternatives Updates');
      expect(result).toContain('Deprecation Suggestions');
    });

    it('should include update guidelines', () => {
      const result = generateAdrUpdateSuggestionPrompt(
        mockAdrToUpdate,
        mockResearchFindings,
        'content'
      );

      expect(result).toContain('Update Guidelines');
      expect(result).toContain('Preserve Intent');
      expect(result).toContain('Clear Justification');
      expect(result).toContain('Evidence-Based');
      expect(result).toContain('Backward Compatibility');
    });

    it('should handle large research findings', () => {
      const manyFindings = Array.from({ length: 10 }, (_, i) => ({
        finding: `Research finding ${i}`,
        evidence: [`Evidence ${i}A`, `Evidence ${i}B`],
        impact: i % 2 === 0 ? 'high' : 'medium',
      }));

      const result = generateAdrUpdateSuggestionPrompt(mockAdrToUpdate, manyFindings, 'content');

      expect(result).toContain('Research finding 0');
      expect(result).toContain('Research finding 9');
      expect(result).toContain('Evidence 0A');
      expect(result).toContain('Evidence 9B');
    });
  });
});
