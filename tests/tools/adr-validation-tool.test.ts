/**
 * Tests for ADR Validation Tool
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Use vi.hoisted to ensure mock constructors are available before vi.mock is hoisted
const { MockResearchOrchestrator, mockAnswerResearchQuestion } = vi.hoisted(
  () => ({
    MockResearchOrchestrator: vi.fn(),
    mockAnswerResearchQuestion: vi.fn(),
  })
);

vi.mock('../../src/utils/research-orchestrator.js', () => ({
  __esModule: true,
  ResearchOrchestrator: MockResearchOrchestrator,
  answerResearchQuestion: mockAnswerResearchQuestion,
}));

vi.mock('../../src/utils/knowledge-graph-manager.js');

// NOW import the module under test after all mocks are set up
import { validateAdr, validateAllAdrs } from '../../src/tools/adr-validation-tool.js';

describe('ADR Validation Tool', () => {
  let tempDir: string;
  let tempAdrDir: string;

  beforeEach(async () => {
    // Create temp directory structure
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'adr-test-'));
    tempAdrDir = path.join(tempDir, 'docs', 'adrs');
    await fs.mkdir(tempAdrDir, { recursive: true });

    // Clear mocks AFTER directory setup
    vi.clearAllMocks();

    mockAnswerResearchQuestion.mockResolvedValue({
      answer: 'Default research answer',
      confidence: 0.8,
      sources: [],
      metadata: { filesAnalyzed: 0, duration: 100, sourcesQueried: [] },
      needsWebSearch: false,
    });

    // Set up default research orchestrator mock
    MockResearchOrchestrator.mockImplementation(
      () =>
        ({
          answerResearchQuestion: vi.fn().mockResolvedValue({
            answer: 'Default research answer',
            confidence: 0.8,
            sources: [],
            metadata: { filesAnalyzed: 0, duration: 100, sourcesQueried: [] },
            needsWebSearch: false,
          }),
        }) as any
    );
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('validateAdr', () => {
    // Skip: ESM mocking of ResearchOrchestrator fails, causing timeouts
    // See issue #308 for ESM-compatible mocking improvements
    it.skip('should validate a valid ADR successfully', async () => {
      // Create actual ADR file
      const adrContent = `# Use Kubernetes for Container Orchestration

## Context
We need a container orchestration platform.

## Decision
We will use Kubernetes for container orchestration.

## Consequences
- Improved scalability
- Industry standard platform
`;

      const adrPath = path.join(tempAdrDir, 'adr-001-kubernetes.md');
      await fs.writeFile(adrPath, adrContent, 'utf-8');

      // Mock research orchestrator
      MockResearchOrchestrator.mockImplementation(
        () =>
          ({
            answerResearchQuestion: vi.fn().mockResolvedValue({
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

      const result = await validateAdr({
        adrPath: 'docs/adrs/adr-001-kubernetes.md',
        projectPath: tempDir,
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('✅ Valid');
    });

    // Skip: ESM mocking of ResearchOrchestrator fails, causing timeouts
    // See issue #308 for ESM-compatible mocking improvements
    it.skip('should detect ADR drift when infrastructure differs', async () => {
      const adrContent = `# Use Docker Swarm for Container Orchestration

## Decision
We will use Docker Swarm for container orchestration.
`;

      const adrPath = path.join(tempAdrDir, 'adr-001-docker-swarm.md');
      await fs.writeFile(adrPath, adrContent, 'utf-8');

      MockResearchOrchestrator.mockImplementation(
        () =>
          ({
            answerResearchQuestion: vi.fn().mockResolvedValue({
              answer: 'Found Kubernetes cluster running, no Docker Swarm detected.',
              confidence: 0.85,
              sources: [{ type: 'environment', found: true, confidence: 0.9, data: {} }],
              metadata: { filesAnalyzed: 3, duration: 150, sourcesQueried: ['environment'] },
              needsWebSearch: false,
            }),
          }) as any
      );

      const result = await validateAdr({
        adrPath: 'docs/adrs/adr-001-docker-swarm.md',
        projectPath: tempDir,
      });

      // Should contain AI-analyzed drift findings (case-insensitive check)
      expect(result.content[0].text.toLowerCase()).toContain('drift');
    });

    // Skip: ESM mocking of ResearchOrchestrator fails, causing timeouts
    // See issue #308 for ESM-compatible mocking improvements
    it.skip('should handle missing evidence gracefully', async () => {
      const adrContent = `# Use Redis for Caching

## Decision
We will use Redis for caching.
`;

      const adrPath = path.join(tempAdrDir, 'adr-002-redis.md');
      await fs.writeFile(adrPath, adrContent, 'utf-8');

      MockResearchOrchestrator.mockImplementation(
        () =>
          ({
            answerResearchQuestion: vi.fn().mockResolvedValue({
              answer: 'No evidence of Redis found in project files or environment.',
              confidence: 0.3,
              sources: [{ type: 'project_files', found: false, confidence: 0.2, data: {} }],
              metadata: { filesAnalyzed: 2, duration: 100, sourcesQueried: ['project_files'] },
              needsWebSearch: true,
            }),
          }) as any
      );

      const result = await validateAdr({
        adrPath: 'docs/adrs/adr-002-redis.md',
        projectPath: tempDir,
      });

      // Should indicate missing evidence or web search needed
      expect(
        result.content[0].text.includes('missing_evidence') ||
          result.content[0].text.includes('Needs Web Search') ||
          result.content[0].text.includes('Not found')
      ).toBe(true);
    });

    // Skip: ESM mocking of ResearchOrchestrator fails, causing timeouts
    // See issue #308 for ESM-compatible mocking improvements
    it('should work without AI executor (rule-based fallback)', async () => {
      const adrContent = `# Use PostgreSQL

## Decision
We will use PostgreSQL as our primary database.
`;

      const adrPath = path.join(tempAdrDir, 'adr-003-postgresql.md');
      await fs.writeFile(adrPath, adrContent, 'utf-8');

      MockResearchOrchestrator.mockImplementation(
        () =>
          ({
            answerResearchQuestion: vi.fn().mockResolvedValue({
              answer: 'Found PostgreSQL in docker-compose.yml and connection strings in config.',
              confidence: 0.8,
              sources: [{ type: 'project_files', found: true, confidence: 0.8, data: {} }],
              metadata: { filesAnalyzed: 4, duration: 120, sourcesQueried: ['project_files'] },
              needsWebSearch: false,
            }),
          }) as any
      );

      const result = await validateAdr({
        adrPath: 'docs/adrs/adr-003-postgresql.md',
        projectPath: tempDir,
      });

      expect(result.content).toBeDefined();
      // Deterministic path (ADR-021 Option B): no AI executor, rule-based over research.
      expect(result.content[0].text).toContain('# ADR Validation Report');
      expect(result.content[0].text).toContain('Deterministic (rule-based over research evidence)');
    });

    it('should handle file read errors', async () => {
      // Don't create the file - it should not exist
      await expect(
        validateAdr({
          adrPath: 'docs/adrs/nonexistent.md',
          projectPath: tempDir,
        })
      ).rejects.toThrow('Failed to read ADR');
    });
  });

  describe('validateAllAdrs', () => {
    // Skip: ESM mocking of ResearchOrchestrator fails, causing timeouts
    // See issue #308 for ESM-compatible mocking improvements
    it.skip('should validate multiple ADRs', async () => {
      // Create multiple ADR files
      const adr1Content = `# Test ADR 1

## Decision
Test decision 1
`;
      const adr2Content = `# Test ADR 2

## Decision
Test decision 2
`;
      const readmeContent = `# README\n\nThis should be filtered out.`;

      await fs.writeFile(path.join(tempAdrDir, 'adr-001-kubernetes.md'), adr1Content, 'utf-8');
      await fs.writeFile(path.join(tempAdrDir, 'adr-002-redis.md'), adr2Content, 'utf-8');
      await fs.writeFile(path.join(tempAdrDir, 'README.md'), readmeContent, 'utf-8');

      MockResearchOrchestrator.mockImplementation(
        () =>
          ({
            answerResearchQuestion: vi.fn().mockResolvedValue({
              answer: 'Test answer',
              confidence: 0.8,
              sources: [],
              metadata: { filesAnalyzed: 1, duration: 100, sourcesQueried: [] },
              needsWebSearch: false,
            }),
          }) as any
      );

      const result = await validateAllAdrs({
        projectPath: tempDir,
        adrDirectory: 'docs/adrs',
      });

      expect(result.content[0].text).toContain('Total ADRs Validated');
      expect(result.content[0].text).not.toContain('README.md');
    });

    // Skip: ESM mocking of ResearchOrchestrator fails, causing timeouts
    // See issue #308 for ESM-compatible mocking improvements
    it.skip('should generate validation summary', async () => {
      // Create a test ADR file
      const adrContent = `# Test\n## Decision\nTest`;
      await fs.writeFile(path.join(tempAdrDir, 'adr-001-test.md'), adrContent, 'utf-8');

      MockResearchOrchestrator.mockImplementation(
        () =>
          ({
            answerResearchQuestion: vi.fn().mockResolvedValue({
              answer: 'Test',
              confidence: 0.9,
              sources: [],
              metadata: { filesAnalyzed: 1, duration: 50, sourcesQueried: [] },
              needsWebSearch: false,
            }),
          }) as any
      );

      const result = await validateAllAdrs({
        projectPath: tempDir,
      });

      expect(result.content[0].text).toContain('ADR Validation Summary');
      expect(result.content[0].text).toContain('Overview');
    });
  });
});
