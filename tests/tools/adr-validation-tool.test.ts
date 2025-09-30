/**
 * Tests for ADR Validation Tool
 */

import { jest } from '@jest/globals';
import type * as fsType from 'fs/promises';

// Create mock functions BEFORE any imports
const mockReadFile = jest.fn<typeof fsType.readFile>();
const mockReaddir = jest.fn<typeof fsType.readdir>();

// Create mock constructors that can be reconfigured per test
const MockResearchOrchestrator = jest.fn();
const mockGetAIExecutor = jest.fn();

// Mock dependencies BEFORE importing the module under test
jest.mock('fs/promises', () => ({
  __esModule: true,
  readFile: mockReadFile,
  readdir: mockReaddir,
}));

// Mock ResearchOrchestrator with proper constructor
jest.mock('../../src/utils/research-orchestrator.js', () => ({
  __esModule: true,
  ResearchOrchestrator: MockResearchOrchestrator,
}));

// Mock AI executor
jest.mock('../../src/utils/ai-executor.js', () => ({
  __esModule: true,
  getAIExecutor: mockGetAIExecutor,
}));

jest.mock('../../src/utils/knowledge-graph-manager.js');

// NOW import the module under test after all mocks are set up
import { validateAdr, validateAllAdrs } from '../../src/tools/adr-validation-tool.js';

describe('ADR Validation Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAdr', () => {
    it('should validate a valid ADR successfully', async () => {
      // Mock ADR content
      const mockAdrContent = `# Use Kubernetes for Container Orchestration

## Context
We need a container orchestration platform.

## Decision
We will use Kubernetes for container orchestration.

## Consequences
- Improved scalability
- Industry standard platform
`;

      mockReadFile.mockResolvedValue(mockAdrContent);

      // Mock research orchestrator
      MockResearchOrchestrator.mockImplementation(
        () =>
          ({
            answerResearchQuestion: jest.fn().mockResolvedValue({
              answer:
                'Kubernetes is deployed and running. Found kubectl config and deployment manifests.',
              confidence: 0.9,
              sources: [
                { type: 'project_files', found: true, confidence: 0.8, data: {} },
                { type: 'environment', found: true, confidence: 0.95, data: {} },
              ],
              metadata: {
                filesAnalyzed: 5,
                duration: 200,
                sourcesQueried: ['project_files', 'environment'],
              },
              needsWebSearch: false,
            }),
          }) as any
      );

      // Mock AI executor
      mockGetAIExecutor.mockReturnValue({
        isAvailable: () => true,
        executeStructuredPrompt: jest.fn().mockResolvedValue({
          data: {
            isValid: true,
            confidence: 0.9,
            findings: [],
            recommendations: ['Continue monitoring for drift'],
          },
          raw: { metadata: {} },
        }),
      } as any);

      const result = await validateAdr({
        adrPath: 'docs/adrs/adr-001-kubernetes.md',
        projectPath: '/test/project',
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('✅ Valid');
    });

    it('should detect ADR drift when infrastructure differs', async () => {
      const mockAdrContent = `# Use Docker Swarm for Container Orchestration

## Decision
We will use Docker Swarm for container orchestration.
`;

      mockReadFile.mockResolvedValue(mockAdrContent);

      MockResearchOrchestrator.mockImplementation(
        () =>
          ({
            answerResearchQuestion: jest.fn().mockResolvedValue({
              answer: 'Found Kubernetes cluster running, no Docker Swarm detected.',
              confidence: 0.85,
              sources: [{ type: 'environment', found: true, confidence: 0.9, data: {} }],
              metadata: { filesAnalyzed: 3, duration: 150, sourcesQueried: ['environment'] },
              needsWebSearch: false,
            }),
          }) as any
      );

      mockGetAIExecutor.mockReturnValue({
        isAvailable: () => true,
        executeStructuredPrompt: jest.fn().mockResolvedValue({
          data: {
            isValid: false,
            confidence: 0.85,
            findings: [
              {
                type: 'drift',
                severity: 'high',
                description: 'ADR states Docker Swarm but Kubernetes is deployed',
                evidence: 'Found kubectl and K8s manifests, no Swarm evidence',
              },
            ],
            recommendations: [
              'Update ADR to reflect Kubernetes deployment',
              'Document migration from Swarm to K8s',
            ],
          },
          raw: { metadata: {} },
        }),
      } as any);

      const result = await validateAdr({
        adrPath: 'docs/adrs/adr-001-docker-swarm.md',
        projectPath: '/test/project',
      });

      expect(result.content[0].text).toContain('⚠️ Needs Review');
      expect(result.content[0].text).toContain('drift');
    });

    it('should handle missing evidence gracefully', async () => {
      const mockAdrContent = `# Use Redis for Caching

## Decision
We will use Redis for caching.
`;

      mockReadFile.mockResolvedValue(mockAdrContent);

      MockResearchOrchestrator.mockImplementation(
        () =>
          ({
            answerResearchQuestion: jest.fn().mockResolvedValue({
              answer: 'No evidence of Redis found in project files or environment.',
              confidence: 0.3,
              sources: [{ type: 'project_files', found: false, confidence: 0.2, data: {} }],
              metadata: { filesAnalyzed: 2, duration: 100, sourcesQueried: ['project_files'] },
              needsWebSearch: true,
            }),
          }) as any
      );

      mockGetAIExecutor.mockReturnValue({
        isAvailable: () => true,
        executeStructuredPrompt: jest.fn().mockResolvedValue({
          data: {
            isValid: false,
            confidence: 0.3,
            findings: [
              {
                type: 'missing_evidence',
                severity: 'medium',
                description: 'No evidence of Redis deployment found',
                evidence: 'No config files, no environment variables, no running processes',
              },
            ],
            recommendations: [
              'Verify Redis is deployed',
              'Check if ADR was implemented',
              'Consider updating ADR status',
            ],
          },
          raw: { metadata: {} },
        }),
      } as any);

      const result = await validateAdr({
        adrPath: 'docs/adrs/adr-002-redis.md',
        projectPath: '/test/project',
      });

      expect(result.content[0].text).toContain('missing_evidence');
      expect(result.content[0].text).toContain('Needs Web Search');
    });

    it('should work without AI executor (rule-based fallback)', async () => {
      const mockAdrContent = `# Use PostgreSQL

## Decision
We will use PostgreSQL as our primary database.
`;

      mockReadFile.mockResolvedValue(mockAdrContent);

      MockResearchOrchestrator.mockImplementation(
        () =>
          ({
            answerResearchQuestion: jest.fn().mockResolvedValue({
              answer: 'Found PostgreSQL in docker-compose.yml and connection strings in config.',
              confidence: 0.8,
              sources: [{ type: 'project_files', found: true, confidence: 0.8, data: {} }],
              metadata: { filesAnalyzed: 4, duration: 120, sourcesQueried: ['project_files'] },
              needsWebSearch: false,
            }),
          }) as any
      );

      mockGetAIExecutor.mockReturnValue({
        isAvailable: () => false,
        executeStructuredPrompt: jest.fn(),
      } as any);

      const result = await validateAdr({
        adrPath: 'docs/adrs/adr-003-postgresql.md',
        projectPath: '/test/project',
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('rule-based validation');
    });

    it('should handle file read errors', async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));

      await expect(
        validateAdr({
          adrPath: 'docs/adrs/nonexistent.md',
          projectPath: '/test/project',
        })
      ).rejects.toThrow('Failed to read ADR');
    });
  });

  describe('validateAllAdrs', () => {
    it('should validate multiple ADRs', async () => {
      mockReaddir.mockResolvedValue([
        'adr-001-kubernetes.md',
        'adr-002-redis.md',
        'README.md', // Should be filtered out
      ] as any);

      mockReadFile.mockResolvedValue(`# Test ADR

## Decision
Test decision
`);

      MockResearchOrchestrator.mockImplementation(
        () =>
          ({
            answerResearchQuestion: jest.fn().mockResolvedValue({
              answer: 'Test answer',
              confidence: 0.8,
              sources: [],
              metadata: { filesAnalyzed: 1, duration: 100, sourcesQueried: [] },
              needsWebSearch: false,
            }),
          }) as any
      );

      mockGetAIExecutor.mockReturnValue({
        isAvailable: () => false,
      } as any);

      const result = await validateAllAdrs({
        projectPath: '/test/project',
        adrDirectory: 'docs/adrs',
      });

      expect(result.content[0].text).toContain('Total ADRs Validated: 2');
      expect(result.content[0].text).not.toContain('README.md');
    });

    it('should generate validation summary', async () => {
      mockReaddir.mockResolvedValue(['adr-001-test.md'] as any);
      mockReadFile.mockResolvedValue('# Test\n## Decision\nTest');

      MockResearchOrchestrator.mockImplementation(
        () =>
          ({
            answerResearchQuestion: jest.fn().mockResolvedValue({
              answer: 'Test',
              confidence: 0.9,
              sources: [],
              metadata: { filesAnalyzed: 1, duration: 50, sourcesQueried: [] },
              needsWebSearch: false,
            }),
          }) as any
      );

      mockGetAIExecutor.mockReturnValue({
        isAvailable: () => false,
      } as any);

      const result = await validateAllAdrs({
        projectPath: '/test/project',
      });

      expect(result.content[0].text).toContain('ADR Validation Summary');
      expect(result.content[0].text).toContain('Overview');
    });
  });
});
