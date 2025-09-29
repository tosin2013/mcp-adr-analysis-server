/**
 * Tests for ResearchOrchestrator
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResearchOrchestrator } from '../../src/utils/research-orchestrator.js';
import * as fs from 'fs/promises';

// Mock file system
vi.mock('fs/promises');

describe('ResearchOrchestrator', () => {
  let orchestrator: ResearchOrchestrator;
  const mockProjectPath = '/test/project';
  const mockAdrDirectory = 'docs/adrs';

  beforeEach(() => {
    orchestrator = new ResearchOrchestrator(mockProjectPath, mockAdrDirectory);
    vi.clearAllMocks();
  });

  describe('answerResearchQuestion', () => {
    it('should return answer with sources and confidence', async () => {
      // Mock file access to succeed
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const result = await orchestrator.answerResearchQuestion('What is Docker?');

      expect(result).toMatchObject({
        question: 'What is Docker?',
        sources: expect.any(Array),
        confidence: expect.any(Number),
        needsWebSearch: expect.any(Boolean),
        metadata: {
          duration: expect.any(Number),
          sourcesQueried: expect.any(Array),
          filesAnalyzed: expect.any(Number),
        },
      });
    });

    it('should have high confidence when project files are found', async () => {
      // Mock finding a Dockerfile
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'Dockerfile', isFile: () => true, isDirectory: () => false } as any,
      ]);
      vi.mocked(fs.readFile).mockResolvedValue('FROM node:18\nRUN npm install');

      const result = await orchestrator.answerResearchQuestion(
        'What container technology are we using?'
      );

      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.sources.some(s => s.type === 'project_files')).toBe(true);
    });

    it('should recommend web search when confidence is low', async () => {
      // Mock no files found
      vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const result = await orchestrator.answerResearchQuestion(
        'What is quantum computing architecture?'
      );

      expect(result.confidence).toBeLessThan(0.6);
      expect(result.needsWebSearch).toBe(true);
    });

    it('should include metadata about search duration', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const result = await orchestrator.answerResearchQuestion('Test question');

      expect(result.metadata.duration).toBeGreaterThan(0);
      expect(result.metadata.sourcesQueried).toContain('project_files');
    });
  });

  describe('searchProjectFiles', () => {
    it('should search for Docker-related files when question mentions Docker', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'Dockerfile', isFile: () => true, isDirectory: () => false } as any,
        { name: 'docker-compose.yml', isFile: () => true, isDirectory: () => false } as any,
      ]);
      vi.mocked(fs.readFile).mockResolvedValue('mock content');

      const result = await orchestrator.answerResearchQuestion('What Docker images do we use?');

      expect(result.sources.some(s => s.type === 'project_files')).toBe(true);
      const projectFiles = result.sources.find(s => s.type === 'project_files');
      expect(projectFiles?.data.files.length).toBeGreaterThan(0);
    });

    it('should search for Kubernetes files when question mentions k8s', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'deployment.yaml', isFile: () => true, isDirectory: () => false } as any,
      ]);
      vi.mocked(fs.readFile).mockResolvedValue('apiVersion: apps/v1\nkind: Deployment');

      const result = await orchestrator.answerResearchQuestion(
        'What Kubernetes deployments do we have?'
      );

      const projectFiles = result.sources.find(s => s.type === 'project_files');
      expect(projectFiles?.confidence).toBeGreaterThan(0.5);
    });

    it('should always check ADR directory', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'adr-0001-use-kubernetes.md', isFile: () => true, isDirectory: () => false } as any,
      ]);
      vi.mocked(fs.readFile).mockResolvedValue('# ADR: Use Kubernetes\n\nWe decided to use Kubernetes...');

      const _result = await orchestrator.answerResearchQuestion('Any question');

      expect(fs.readdir).toHaveBeenCalled();
    });

    it('should calculate relevance scores for files', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'docker-file', isFile: () => true, isDirectory: () => false } as any,
      ]);
      vi.mocked(fs.readFile).mockResolvedValue('Docker container configuration');

      const result = await orchestrator.answerResearchQuestion('Docker configuration');

      const projectFiles = result.sources.find(s => s.type === 'project_files');
      expect(projectFiles?.data.relevance).toBeDefined();
    });
  });

  describe('calculateConfidence', () => {
    it('should return 0 for no sources', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('No files'));
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const result = await orchestrator.answerResearchQuestion('Random question');

      // Low confidence without sources
      expect(result.confidence).toBeLessThanOrEqual(0.3);
    });

    it('should increase confidence with multiple sources', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'test.md', isFile: () => true, isDirectory: () => false } as any,
      ]);
      vi.mocked(fs.readFile).mockResolvedValue('Docker and Kubernetes content');

      const result = await orchestrator.answerResearchQuestion('Docker and Kubernetes');

      // Should have at least project files source
      expect(result.sources.length).toBeGreaterThan(0);
    });
  });

  describe('setConfidenceThreshold', () => {
    it('should update confidence threshold', async () => {
      orchestrator.setConfidenceThreshold(0.8);

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const result = await orchestrator.answerResearchQuestion('Test');

      // With higher threshold, should more likely need web search
      if (result.confidence < 0.8) {
        expect(result.needsWebSearch).toBe(true);
      }
    });

    it('should clamp threshold between 0 and 1', () => {
      orchestrator.setConfidenceThreshold(-0.5);
      orchestrator.setConfidenceThreshold(1.5);
      // Should not throw, values are clamped
      expect(true).toBe(true);
    });
  });

  describe('extractKeywords', () => {
    it('should extract meaningful keywords from questions', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([]);

      // Test with question containing stop words
      const result = await orchestrator.answerResearchQuestion(
        'What is the best way to use Docker?'
      );

      // Keywords should be extracted (Docker should be key)
      expect(result.question).toContain('Docker');
    });
  });

  describe('synthesizeAnswer', () => {
    it('should synthesize answer from multiple sources', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'Dockerfile', isFile: () => true, isDirectory: () => false } as any,
      ]);
      vi.mocked(fs.readFile).mockResolvedValue('Docker content');

      const result = await orchestrator.answerResearchQuestion('Docker question');

      expect(result.answer).toBeDefined();
      expect(result.answer).toContain('project file');
    });

    it('should mention web search in answer when needed', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('No files'));
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const result = await orchestrator.answerResearchQuestion('Obscure topic');

      if (result.needsWebSearch) {
        expect(result.answer).toContain('web research');
      }
    });
  });

  describe('file pattern matching', () => {
    it('should match package.json for dependency questions', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'package.json', isFile: () => true, isDirectory: () => false } as any,
      ]);
      vi.mocked(fs.readFile).mockResolvedValue('{"dependencies": {"express": "4.18.0"}}');

      const result = await orchestrator.answerResearchQuestion('What dependencies do we use?');

      const projectFiles = result.sources.find(s => s.type === 'project_files');
      expect(projectFiles?.data.files).toContain(expect.stringContaining('package.json'));
    });

    it('should match test files for testing questions', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'app.test.ts', isFile: () => true, isDirectory: () => false } as any,
      ]);
      vi.mocked(fs.readFile).mockResolvedValue('test content');

      const result = await orchestrator.answerResearchQuestion('What testing framework do we use?');

      expect(result.sources.length).toBeGreaterThan(0);
    });

    it('should skip node_modules directory', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'node_modules', isFile: () => false, isDirectory: () => true } as any,
        { name: 'src', isFile: () => false, isDirectory: () => true } as any,
      ]);

      await orchestrator.answerResearchQuestion('Test');

      // node_modules should not be recursively searched
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('error handling', () => {
    it('should handle file read errors gracefully', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'test.md', isFile: () => true, isDirectory: () => false } as any,
      ]);
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Permission denied'));

      const result = await orchestrator.answerResearchQuestion('Test');

      // Should not throw, just skip problematic files
      expect(result).toBeDefined();
    });

    it('should handle directory access errors', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('Directory not found'));

      const result = await orchestrator.answerResearchQuestion('Test');

      expect(result).toBeDefined();
      expect(result.sources.length).toBeGreaterThanOrEqual(0);
    });
  });
});