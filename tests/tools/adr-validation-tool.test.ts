/**
 * Tests for ADR Validation Tool
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Use vi.hoisted to ensure mock constructors are available before vi.mock is hoisted
const { MockResearchOrchestrator, mockAnswerResearchQuestion } = vi.hoisted(() => ({
  MockResearchOrchestrator: vi.fn(),
  mockAnswerResearchQuestion: vi.fn(),
}));

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
    it('should validate a valid ADR successfully', async () => {
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

      mockAnswerResearchQuestion.mockResolvedValue({
        answer:
          'Kubernetes is deployed and running. Found kubectl config and deployment manifests.',
        confidence: 0.9,
        sources: [
          {
            type: 'project_files',
            found: true,
            confidence: 0.8,
            data: {},
            timestamp: new Date().toISOString(),
          },
          {
            type: 'environment',
            found: true,
            confidence: 0.95,
            data: {},
            timestamp: new Date().toISOString(),
          },
        ],
        metadata: {
          filesAnalyzed: 5,
          duration: 200,
          sourcesQueried: ['project_files', 'environment'],
        },
        needsWebSearch: false,
      });

      const result = await validateAdr({
        adrPath: 'docs/adrs/adr-001-kubernetes.md',
        projectPath: tempDir,
      });

      const text = result.content[0].text;
      expect(text).toContain('# ADR Validation Report');
      expect(text).toContain('✅ Valid');
      expect(text).toContain('**Confidence**: 90.0%');
      expect(text).toContain('Deterministic (rule-based over research evidence)');
      expect(text).toContain('No issues found');
      expect(text).toContain('project_files');
      expect(text).toContain('Environment Check**: ✅ Completed');
    });

    it('should flag ADR with missing Decision section as Needs Review', async () => {
      const adrContent = `# Use Docker Swarm for Container Orchestration

## Context
We evaluated several container orchestration platforms.

## Consequences
- Requires team training
`;

      const adrPath = path.join(tempAdrDir, 'adr-001-docker-swarm.md');
      await fs.writeFile(adrPath, adrContent, 'utf-8');

      const result = await validateAdr({
        adrPath: 'docs/adrs/adr-001-docker-swarm.md',
        projectPath: tempDir,
      });

      const text = result.content[0].text;
      expect(text).toContain('⚠️ Needs Review');
      expect(text).toContain('MISSING_EVIDENCE');
      expect(text).toContain('critical');
      expect(text).toContain('ADR records no decision');
      expect(text).toContain('Review Findings');
      expect(text).not.toContain('No issues found');
    });

    it('should handle missing evidence gracefully', async () => {
      const adrContent = `# Use Redis for Caching

## Decision

We will use Redis for caching.
`;

      const adrPath = path.join(tempAdrDir, 'adr-002-redis.md');
      await fs.writeFile(adrPath, adrContent, 'utf-8');

      mockAnswerResearchQuestion.mockResolvedValue({
        answer: 'No evidence of Redis found in project files or environment.',
        confidence: 0.3,
        sources: [
          {
            type: 'project_files',
            found: false,
            confidence: 0.2,
            data: {},
            timestamp: new Date().toISOString(),
          },
        ],
        metadata: { filesAnalyzed: 2, duration: 100, sourcesQueried: ['project_files'] },
        needsWebSearch: true,
      });

      const result = await validateAdr({
        adrPath: 'docs/adrs/adr-002-redis.md',
        projectPath: tempDir,
      });

      const text = result.content[0].text;
      expect(text).toContain('✅ Valid');
      expect(text).toContain('**Confidence**: 30.0%');
      expect(text).toContain('MISSING_EVIDENCE');
      expect(text).toContain('Low confidence in research findings');
      expect(text).toContain('Additional research may be needed');
      expect(text).toContain('⚠️ Yes');
      expect(text).toContain('❌ Not found');
    });

    it('should work without AI executor (rule-based fallback)', async () => {
      const adrContent = `# Use PostgreSQL

## Decision

We will use PostgreSQL as our primary database.
`;

      const adrPath = path.join(tempAdrDir, 'adr-003-postgresql.md');
      await fs.writeFile(adrPath, adrContent, 'utf-8');

      const result = await validateAdr({
        adrPath: 'docs/adrs/adr-003-postgresql.md',
        projectPath: tempDir,
      });

      const text = result.content[0].text;
      expect(text).toContain('# ADR Validation Report');
      expect(text).toContain('✅ Valid');
      expect(text).toContain('Deterministic (rule-based over research evidence)');
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
    it('should validate multiple ADRs', async () => {
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

      const result = await validateAllAdrs({
        projectPath: tempDir,
        adrDirectory: 'docs/adrs',
      });

      const text = result.content[0].text;
      expect(text).toContain('**Total ADRs Validated**: 2');
      expect(text).toContain('**Valid ADRs**: 2 (100.0%)');
      expect(text).toContain('**Invalid/Drifted ADRs**: 0');
      expect(text).not.toContain('README.md');
    });

    it('should generate validation summary', async () => {
      const adrContent = `# Test ADR

## Decision

Test decision content
`;
      await fs.writeFile(path.join(tempAdrDir, 'adr-001-test.md'), adrContent, 'utf-8');

      mockAnswerResearchQuestion.mockResolvedValue({
        answer: 'Test',
        confidence: 0.9,
        sources: [],
        metadata: { filesAnalyzed: 1, duration: 50, sourcesQueried: [] },
        needsWebSearch: false,
      });

      const result = await validateAllAdrs({
        projectPath: tempDir,
        adrDirectory: 'docs/adrs',
      });

      const text = result.content[0].text;
      expect(text).toContain('# ADR Validation Summary');
      expect(text).toContain('## Overview');
      expect(text).toContain('**Total ADRs Validated**: 1');
      expect(text).toContain('**Valid ADRs**: 1 (100.0%)');
      expect(text).toContain('## Validation Results');
    });
  });
});
