/**
 * Unit Tests for Memory Transformation
 *
 * Test coverage for ADR to memory entity transformation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import crypto from 'crypto';
import { MemoryTransformer } from '../../src/utils/memory-transformation.js';
import { MemoryEntityManager } from '../../src/utils/memory-entity-manager.js';
import { DiscoveredAdr } from '../../src/utils/adr-discovery.js';
import {
  ArchitecturalDecisionMemory,
  KnowledgeArtifactMemory,
  MemoryRelationship,
} from '../../src/types/memory-entities.js';

// Import crypto to spy on it
import crypto from 'crypto';

// Mock enhanced logging
jest.mock('../../src/utils/enhanced-logging.js', () => ({
  EnhancedLogger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock memory entity manager
const mockMemoryManager = {
  initialize: jest.fn(),
  upsertEntity: jest.fn(),
  upsertRelationship: jest.fn(),
} as unknown as jest.Mocked<MemoryEntityManager>;

describe('MemoryTransformer', () => {
  let transformer: MemoryTransformer;
  let mockDate: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    transformer = new MemoryTransformer(mockMemoryManager);

    // Mock crypto randomUUID
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid-123');

    // Mock date to be consistent
    mockDate = jest
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2024-01-01T00:00:00.000Z');
  });

  afterEach(() => {
    mockDate.mockRestore();
  });

  describe('transformAdrToMemory', () => {
    it('should transform a basic ADR to memory entity', async () => {
      const adr: DiscoveredAdr = {
        filename: 'adr-001-use-react.md',
        number: 1,
        title: 'Use React for Frontend',
        status: 'accepted',
        date: '2023-12-01',
        context: 'We need a modern frontend framework',
        decision: 'Use React for all frontend development',
        consequences: 'Better developer experience and maintainability',
        content: 'Full ADR content here',
        metadata: {
          category: 'frontend',
          tags: ['react', 'frontend'],
        },
      };

      const result = await transformer.transformAdrToMemory(adr);

      expect(result.id).toBe('test-uuid-123');
      expect(result.type).toBe('architectural_decision');
      expect(result.title).toBe('Use React for Frontend');
      expect(result.description).toBe('We need a modern frontend framework');
      expect(result.created).toBe('2024-01-01T00:00:00.000Z');
      expect(result.version).toBe(1);
      expect(result.tags).toContain('frontend');
      expect(result.tags).toContain('react');
      expect(result.tags).toContain('status:accepted');

      // Check decision data
      expect(result.decisionData.status).toBe('accepted');
      expect(result.decisionData.context).toBe('We need a modern frontend framework');
      expect(result.decisionData.decision).toBe('Use React for all frontend development');
      expect(result.decisionData.implementationStatus).toBe('in_progress');

      // Check evolution
      expect(result.evolution.origin).toBe('discovered');
      expect(result.evolution.transformations).toHaveLength(1);
      expect(result.evolution.transformations[0].type).toBe('imported_from_adr');
      expect(result.evolution.transformations[0].description).toContain('adr-001-use-react.md');

      // Check validation
      expect(result.validation.isVerified).toBe(true);
      expect(result.validation.verificationMethod).toBe('adr_status');
    });

    it('should handle ADR with structured consequences', async () => {
      const adr: DiscoveredAdr = {
        filename: 'adr-002-database.md',
        number: 2,
        title: 'Use PostgreSQL',
        status: 'accepted',
        context: 'Need robust database',
        decision: 'Use PostgreSQL',
        consequences: `
Positive:
- ACID compliance
- Strong consistency
- Rich feature set

Negative:
- Higher resource usage
- More complex setup

Risks:
- Scaling challenges
- Learning curve
        `,
        content: 'Full content',
      };

      const result = await transformer.transformAdrToMemory(adr);

      expect(result.decisionData.consequences.positive).toContain('ACID compliance');
      expect(result.decisionData.consequences.positive).toContain('Strong consistency');
      expect(result.decisionData.consequences.negative).toContain('Higher resource usage');
      expect(result.decisionData.consequences.risks).toContain('Scaling challenges');
    });

    it('should extract implementation tasks from content', async () => {
      const adr: DiscoveredAdr = {
        filename: 'adr-003-tasks.md',
        number: 3,
        title: 'API Design',
        status: 'accepted',
        context: 'Need API',
        decision: 'REST API',
        content: `
# API Design Decision

## Implementation Tasks
- [ ] Create API endpoints
- [ ] Write documentation
- [ ] Add authentication
- [ ] Implement rate limiting

## Other content
Some other content here.
        `,
      };

      const result = await transformer.transformAdrToMemory(adr);

      expect(result.decisionData.implementationTasks).toContain('Create API endpoints');
      expect(result.decisionData.implementationTasks).toContain('Write documentation');
      expect(result.decisionData.implementationTasks).toContain('Add authentication');
      expect(result.decisionData.implementationTasks).toContain('Implement rate limiting');
    });

    it('should infer technical stack from content', async () => {
      const adr: DiscoveredAdr = {
        filename: 'adr-004-stack.md',
        number: 4,
        title: 'Technology Stack',
        status: 'accepted',
        context: 'Technology decisions',
        decision: 'Use React, TypeScript, Express, and PostgreSQL',
        content:
          'We will use React for frontend, TypeScript for type safety, Express for backend, and PostgreSQL for database.',
      };

      const result = await transformer.transformAdrToMemory(adr);

      expect(result.context.technicalStack).toContain('react');
      expect(result.context.technicalStack).toContain('typescript');
      expect(result.context.technicalStack).toContain('express');
      expect(result.context.technicalStack).toContain('postgresql');
    });

    it('should infer project phase from content', async () => {
      const testCases = [
        { content: 'This is a prototype decision', expectedPhase: 'prototype' },
        { content: 'MVP implementation strategy', expectedPhase: 'mvp' },
        { content: 'Architecture design patterns', expectedPhase: 'design' },
        { content: 'Development approach', expectedPhase: 'development' },
        { content: 'Testing strategy', expectedPhase: 'testing' },
        { content: 'Deployment configuration', expectedPhase: 'deployment' },
      ];

      for (const testCase of testCases) {
        const adr: DiscoveredAdr = {
          filename: 'test.md',
          number: 1,
          title: 'Test',
          status: 'accepted',
          context: testCase.content,
          decision: 'Test decision',
        };

        const result = await transformer.transformAdrToMemory(adr);
        expect(result.context.projectPhase).toBe(testCase.expectedPhase);
      }
    });

    it('should infer business domain from content', async () => {
      const testCases = [
        { content: 'e-commerce platform features', expectedDomain: 'ecommerce' },
        { content: 'financial trading system', expectedDomain: 'finance' },
        { content: 'healthcare patient data', expectedDomain: 'healthcare' },
        { content: 'education learning management', expectedDomain: 'education' },
        { content: 'IoT device communication', expectedDomain: 'iot' },
      ];

      for (const testCase of testCases) {
        const adr: DiscoveredAdr = {
          filename: 'test.md',
          number: 1,
          title: 'Test',
          status: 'accepted',
          context: testCase.content,
          decision: 'Test decision',
        };

        const result = await transformer.transformAdrToMemory(adr);
        expect(result.context.businessDomain).toBe(testCase.expectedDomain);
      }
    });

    it('should infer environmental factors from content', async () => {
      const adr: DiscoveredAdr = {
        filename: 'test.md',
        number: 1,
        title: 'Test',
        status: 'accepted',
        context:
          'Cloud-based microservices architecture with high-availability requirements and mobile support',
        decision: 'Test decision',
      };

      const result = await transformer.transformAdrToMemory(adr);

      expect(result.context.environmentalFactors).toContain('cloud');
      expect(result.context.environmentalFactors).toContain('microservices');
      expect(result.context.environmentalFactors).toContain('high-availability');
      expect(result.context.environmentalFactors).toContain('mobile');
    });

    it('should infer stakeholders from content', async () => {
      const adr: DiscoveredAdr = {
        filename: 'test.md',
        number: 1,
        title: 'Test',
        status: 'accepted',
        context:
          'Development team and operations team need to coordinate with security team for end-users',
        decision: 'Test decision',
      };

      const result = await transformer.transformAdrToMemory(adr);

      expect(result.context.stakeholders).toContain('development-team');
      expect(result.context.stakeholders).toContain('operations-team');
      expect(result.context.stakeholders).toContain('security-team');
      expect(result.context.stakeholders).toContain('end-users');
    });

    it('should calculate confidence based on ADR completeness', async () => {
      // High confidence ADR
      const completeAdr: DiscoveredAdr = {
        filename: 'complete.md',
        number: 1,
        title: 'Complete ADR',
        status: 'accepted',
        date: '2023-12-01',
        context: 'Complete context',
        decision: 'Complete decision',
        consequences: 'Complete consequences',
      };

      const completeResult = await transformer.transformAdrToMemory(completeAdr);
      expect(completeResult.confidence).toBeGreaterThan(0.8);

      // Low confidence ADR
      const incompleteAdr: DiscoveredAdr = {
        filename: 'incomplete.md',
        number: 2,
        title: 'Incomplete ADR',
        status: 'proposed',
      };

      const incompleteResult = await transformer.transformAdrToMemory(incompleteAdr);
      expect(incompleteResult.confidence).toBeLessThan(0.7);
    });

    it('should handle different ADR status mappings', async () => {
      const statusMappings = [
        { input: 'accepted', expectedStatus: 'accepted', expectedImplementation: 'in_progress' },
        { input: 'implemented', expectedStatus: 'proposed', expectedImplementation: 'completed' },
        {
          input: 'deprecated',
          expectedStatus: 'deprecated',
          expectedImplementation: 'not_started',
        },
        {
          input: 'superseded',
          expectedStatus: 'superseded',
          expectedImplementation: 'not_started',
        },
        { input: 'proposed', expectedStatus: 'proposed', expectedImplementation: 'not_started' },
        { input: 'on hold', expectedStatus: 'proposed', expectedImplementation: 'on_hold' },
      ];

      for (const mapping of statusMappings) {
        const adr: DiscoveredAdr = {
          filename: 'test.md',
          number: 1,
          title: 'Test',
          status: mapping.input,
          context: 'Test context',
          decision: 'Test decision',
        };

        const result = await transformer.transformAdrToMemory(adr);
        expect(result.decisionData.status).toBe(mapping.expectedStatus);
        expect(result.decisionData.implementationStatus).toBe(mapping.expectedImplementation);
      }
    });

    it('should extract alternatives from content', async () => {
      const adr: DiscoveredAdr = {
        filename: 'test.md',
        number: 1,
        title: 'Test',
        status: 'accepted',
        context: 'Test context',
        decision: 'Test decision',
        content: `
# Decision

## Alternatives Considered
- Angular framework
- Vue.js framework
- Svelte framework

## Decision
We chose React.
        `,
      };

      const result = await transformer.transformAdrToMemory(adr);

      expect(result.decisionData.alternatives).toHaveLength(3);
      expect(result.decisionData.alternatives[0].description).toBe('Angular framework');
      expect(result.decisionData.alternatives[1].description).toBe('Vue.js framework');
      expect(result.decisionData.alternatives[2].description).toBe('Svelte framework');
    });

    it('should handle ADR date parsing', async () => {
      const adr: DiscoveredAdr = {
        filename: 'test.md',
        number: 1,
        title: 'Test',
        status: 'accepted',
        date: '2023-12-15',
        context: 'Test context',
        decision: 'Test decision',
      };

      const result = await transformer.transformAdrToMemory(adr);

      expect(result.decisionData.reviewHistory).toHaveLength(1);
      expect(result.decisionData.reviewHistory[0].timestamp).toBe('2023-12-15T00:00:00.000Z');
      expect(result.decisionData.reviewHistory[0].decision).toBe('approve');
    });

    it('should handle transformation errors', async () => {
      const invalidAdr = {
        // Missing required fields
        filename: 'invalid.md',
      } as DiscoveredAdr;

      await expect(transformer.transformAdrToMemory(invalidAdr)).rejects.toThrow(
        'Failed to transform ADR to memory'
      );
    });
  });

  describe('transformAdrCollectionToMemories', () => {
    it('should transform multiple ADRs and infer relationships', async () => {
      const adrs: DiscoveredAdr[] = [
        {
          filename: 'adr-001-react.md',
          number: 1,
          title: 'Use React',
          status: 'accepted',
          context: 'Need frontend framework',
          decision: 'Use React for frontend',
          content: 'React decision content with react and typescript',
        },
        {
          filename: 'adr-002-typescript.md',
          number: 2,
          title: 'Use TypeScript',
          status: 'accepted',
          context: 'Need type safety',
          decision: 'Use TypeScript for type safety',
          content: 'TypeScript decision content with react and typescript',
        },
        {
          filename: 'adr-003-old.md',
          number: 3,
          title: 'Old Decision',
          status: 'superseded',
          context: 'Old approach',
          decision: 'Old decision',
          content: 'Old decision content',
        },
      ];

      const result = await transformer.transformAdrCollectionToMemories(adrs);

      expect(result.entities).toHaveLength(3);
      expect(result.relationships).toHaveLength(1); // React and TypeScript should be related

      // Check that relationship was inferred between React and TypeScript
      const relationship = result.relationships[0];
      expect(relationship.type).toBe('relates_to');
      expect(relationship.context).toContain('react');
      expect(relationship.context).toContain('typescript');
    });

    it('should handle ADR transformation failures gracefully', async () => {
      const adrs: DiscoveredAdr[] = [
        {
          filename: 'valid.md',
          number: 1,
          title: 'Valid ADR',
          status: 'accepted',
          context: 'Valid context',
          decision: 'Valid decision',
        },
        {
          // Invalid ADR that will cause transformation to fail
          filename: 'invalid.md',
          number: 2,
          title: '', // Empty title should cause validation error
          status: 'accepted',
        } as DiscoveredAdr,
      ];

      const result = await transformer.transformAdrCollectionToMemories(adrs);

      // Should have transformed only the valid ADR
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].title).toBe('Valid ADR');
    });

    it('should infer supersedes relationships', async () => {
      const olderDate = '2023-01-01T00:00:00.000Z';
      const newerDate = '2023-12-01T00:00:00.000Z';

      const adrs: DiscoveredAdr[] = [
        {
          filename: 'adr-001-old.md',
          number: 1,
          title: 'Old Decision',
          status: 'superseded',
          context: 'Old approach',
          decision: 'Old decision',
        },
        {
          filename: 'adr-002-new.md',
          number: 2,
          title: 'New Decision',
          status: 'accepted',
          context: 'New approach',
          decision: 'New decision',
        },
      ];

      // Mock dates for entities
      let callCount = 0;
      jest.spyOn(Date.prototype, 'toISOString').mockImplementation(() => {
        callCount++;
        return callCount <= 6 ? olderDate : newerDate; // First entity gets older date
      });

      const result = await transformer.transformAdrCollectionToMemories(adrs);

      // Should find supersedes relationship
      const supersedesRel = result.relationships.find(r => r.type === 'supersedes');
      expect(supersedesRel).toBeDefined();
      expect(supersedesRel?.strength).toBe(0.9);
      expect(supersedesRel?.context).toContain('superseded status');
    });
  });

  describe('createKnowledgeArtifact', () => {
    it('should create a knowledge artifact from content', async () => {
      const title = 'API Documentation';
      const content =
        '# API Guide\n\nThis is documentation for our REST API using Express and Node.js.';
      const artifactType = 'documentation';

      const result = await transformer.createKnowledgeArtifact(title, content, artifactType);

      expect(result.id).toBe('test-uuid-123');
      expect(result.type).toBe('knowledge_artifact');
      expect(result.title).toBe(title);
      expect(result.artifactData.artifactType).toBe(artifactType);
      expect(result.artifactData.content).toBe(content);
      expect(result.artifactData.format).toBe('markdown');
      expect(result.context.technicalStack).toContain('express');
    });

    it('should detect different content formats', async () => {
      const testCases = [
        { content: '# Markdown\n## Header', expectedFormat: 'markdown' },
        { content: '{"key": "value"}', expectedFormat: 'json' },
        { content: 'apiVersion: v1\nkind: Pod', expectedFormat: 'yaml' },
        { content: 'function test() { return true; }', expectedFormat: 'code' },
        { content: 'Plain text content', expectedFormat: 'text' },
      ];

      for (const testCase of testCases) {
        const result = await transformer.createKnowledgeArtifact(
          'Test',
          testCase.content,
          'documentation'
        );
        expect(result.artifactData.format).toBe(testCase.expectedFormat);
      }
    });

    it('should infer applicability scope from content', async () => {
      const content = 'Frontend React components and backend API security testing';
      const result = await transformer.createKnowledgeArtifact('Test', content, 'documentation');

      expect(result.artifactData.applicabilityScope).toContain('frontend');
      expect(result.artifactData.applicabilityScope).toContain('backend');
      expect(result.artifactData.applicabilityScope).toContain('security');
      expect(result.artifactData.applicabilityScope).toContain('testing');
    });

    it('should extract key insights from content', async () => {
      const content = `
# Guide

Key insight: Always validate input data before processing.
Important: Remember to handle edge cases properly.
Note: Performance optimization should be considered early.
      `;

      const result = await transformer.createKnowledgeArtifact('Test', content, 'documentation');

      expect(result.artifactData.keyInsights).toContain(
        'Always validate input data before processing'
      );
      expect(result.artifactData.keyInsights).toContain('Remember to handle edge cases properly');
      expect(result.artifactData.keyInsights).toContain(
        'Performance optimization should be considered early'
      );
    });

    it('should extract actionable items from content', async () => {
      const content = `
# Tasks

TODO: Implement authentication
Action: Update documentation
- [ ] Write unit tests
Must: Review security implications
      `;

      const result = await transformer.createKnowledgeArtifact('Test', content, 'documentation');

      expect(result.artifactData.actionableItems).toHaveLength(4);
      expect(result.artifactData.actionableItems[0].action).toBe('Implement authentication');
      expect(result.artifactData.actionableItems[1].action).toBe('Update documentation');
      expect(result.artifactData.actionableItems[2].action).toBe('Review security implications');
      expect(result.artifactData.actionableItems[3].action).toBe('Write unit tests');
      expect(result.artifactData.actionableItems[2].priority).toBe('high'); // 'must' keyword
    });

    it('should assign correct action priorities', async () => {
      const content = `
TODO: Fix critical security vulnerability
Action: Update important documentation
TODO: Add feature
      `;

      const result = await transformer.createKnowledgeArtifact('Test', content, 'documentation');

      expect(result.artifactData.actionableItems[0].priority).toBe('high'); // 'critical' keyword in text
      expect(result.artifactData.actionableItems[1].priority).toBe('medium'); // 'important' keyword in text
      expect(result.artifactData.actionableItems[2].priority).toBe('low'); // default
    });
  });

  describe('transformCodeStructureToMemories', () => {
    it('should handle code structure transformation placeholder', async () => {
      const codeStructure = {
        files: ['src/index.ts', 'src/utils/helper.ts'],
        directories: ['src/', 'tests/'],
      };
      const projectPath = '/test/project';

      const result = await transformer.transformCodeStructureToMemories(codeStructure, projectPath);

      // Currently returns empty array as implementation is placeholder
      expect(result).toEqual([]);
    });
  });

  describe('private helper methods', () => {
    it('should parse unstructured consequences', async () => {
      const adr: DiscoveredAdr = {
        filename: 'test.md',
        number: 1,
        title: 'Test',
        status: 'accepted',
        context: 'Test context',
        decision: 'Test decision',
        consequences: `
- Better performance and scalability
- Increased development complexity
- Risk of vendor lock-in
        `,
      };

      const result = await transformer.transformAdrToMemory(adr);

      // Should classify consequences based on keywords
      expect(result.decisionData.consequences.positive.length).toBeGreaterThan(0);
      expect(result.decisionData.consequences.negative.length).toBeGreaterThan(0);
    });

    it('should handle empty or missing consequences', async () => {
      const adr: DiscoveredAdr = {
        filename: 'test.md',
        number: 1,
        title: 'Test',
        status: 'accepted',
        context: 'Test context',
        decision: 'Test decision',
        consequences: '',
      };

      const result = await transformer.transformAdrToMemory(adr);

      expect(result.decisionData.consequences.positive).toEqual([]);
      expect(result.decisionData.consequences.negative).toEqual([]);
      expect(result.decisionData.consequences.risks).toEqual([]);
    });

    it('should extract tags from content with hashtags', async () => {
      const content = 'This is about #react and #typescript development';
      const result = await transformer.createKnowledgeArtifact('Test', content, 'documentation');

      expect(result.tags).toContain('react');
      expect(result.tags).toContain('typescript');
    });
  });
});
