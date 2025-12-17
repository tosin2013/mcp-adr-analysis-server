import { describe, it, expect, _beforeEach, _afterEach } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  ToolContextManager,
  ToolContextDocument,
} from '../../src/utils/context-document-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('ToolContextManager', () => {
  const testProjectPath = path.join(__dirname, '../fixtures/test-project');
  const contextDir = path.join(testProjectPath, 'docs', 'context');
  let manager: ToolContextManager;

  beforeEach(async () => {
    // Create test project directory
    await fs.mkdir(testProjectPath, { recursive: true });
    manager = new ToolContextManager(testProjectPath);
  });

  afterEach(async () => {
    // Clean up test directories
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialize', () => {
    it('should create context directory structure', async () => {
      await manager.initialize();

      // Check main directory exists
      const mainDirExists = await fs
        .access(contextDir)
        .then(() => true)
        .catch(() => false);
      expect(mainDirExists).toBe(true);

      // Check category directories exist
      const categories = [
        'bootstrap',
        'deployment',
        'environment',
        'research',
        'planning',
        'validation',
        'git',
      ];
      for (const category of categories) {
        const categoryDir = path.join(contextDir, category);
        const exists = await fs
          .access(categoryDir)
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);
      }
    });

    it('should handle existing directories gracefully', async () => {
      await manager.initialize();
      // Should not throw when called again
      await expect(manager.initialize()).resolves.not.toThrow();
    });
  });

  describe('saveContext', () => {
    it('should save context document and create category directory', async () => {
      const document: ToolContextDocument = {
        metadata: {
          toolName: 'test_tool',
          toolVersion: '1.0.0',
          generated: new Date().toISOString(),
          projectPath: testProjectPath,
          projectName: 'test-project',
          status: 'success',
          confidence: 95,
        },
        quickReference: 'Test quick reference',
        executionSummary: {
          status: 'Success',
          confidence: 95,
          keyFindings: ['Finding 1', 'Finding 2'],
        },
        detectedContext: {
          platform: 'test-platform',
          runtime: 'nodejs',
        },
        generatedArtifacts: ['file1.txt', 'file2.txt'],
        keyDecisions: [
          {
            decision: 'Use test platform',
            rationale: 'Best for testing',
            alternatives: ['Other platform'],
          },
        ],
      };

      const filePath = await manager.saveContext('bootstrap', document);

      // Check file was created
      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);

      // Check file contains expected content
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toContain('# Tool Context: test_tool');
      expect(content).toContain('Test quick reference');
      expect(content).toContain('Finding 1');
      expect(content).toContain('Finding 2');
      expect(content).toContain('test-platform');
    });

    it('should update latest.md when saving context', async () => {
      const document: ToolContextDocument = {
        metadata: {
          toolName: 'test_tool',
          toolVersion: '1.0.0',
          generated: new Date().toISOString(),
          projectPath: testProjectPath,
          projectName: 'test-project',
          status: 'success',
        },
        quickReference: 'Test reference',
        executionSummary: {
          status: 'Success',
          keyFindings: ['Finding'],
        },
        detectedContext: {},
      };

      await manager.saveContext('bootstrap', document);

      const latestPath = path.join(contextDir, 'bootstrap', 'latest.md');
      const exists = await fs
        .access(latestPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);

      const content = await fs.readFile(latestPath, 'utf-8');
      expect(content).toContain('# Tool Context: test_tool');
    });

    it('should include all optional sections when provided', async () => {
      const document: ToolContextDocument = {
        metadata: {
          toolName: 'test_tool',
          toolVersion: '1.0.0',
          generated: new Date().toISOString(),
          projectPath: testProjectPath,
          projectName: 'test-project',
          status: 'success',
        },
        quickReference: 'Quick ref',
        executionSummary: {
          status: 'Success',
          keyFindings: [],
        },
        detectedContext: {},
        learnings: {
          successes: ['Success 1'],
          failures: ['Failure 1'],
          recommendations: ['Recommendation 1'],
          environmentSpecific: ['Note 1'],
        },
        relatedDocuments: {
          adrs: ['adr-001.md'],
          configs: ['config.json'],
          otherContexts: ['other-context.md'],
        },
        rawData: { test: 'data' },
      };

      const filePath = await manager.saveContext('deployment', document);
      const content = await fs.readFile(filePath, 'utf-8');

      expect(content).toContain('## Learnings & Recommendations');
      expect(content).toContain('Success 1');
      expect(content).toContain('Failure 1');
      expect(content).toContain('Recommendation 1');
      expect(content).toContain('## Related Documents');
      expect(content).toContain('adr-001.md');
      expect(content).toContain('## Raw Data');
    });
  });

  describe('listContexts', () => {
    it('should list all context documents in a category', async () => {
      const document: ToolContextDocument = {
        metadata: {
          toolName: 'test_tool',
          toolVersion: '1.0.0',
          generated: new Date().toISOString(),
          projectPath: testProjectPath,
          projectName: 'test-project',
          status: 'success',
        },
        quickReference: 'Quick ref',
        executionSummary: {
          status: 'Success',
          keyFindings: [],
        },
        detectedContext: {},
      };

      // Save multiple contexts
      await manager.saveContext('bootstrap', document);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for different timestamps
      await manager.saveContext('bootstrap', document);

      const contexts = await manager.listContexts('bootstrap');

      // Should have 2 contexts (latest.md is excluded)
      expect(contexts.length).toBe(2);
      expect(contexts.every(c => c.endsWith('.md'))).toBe(true);
      expect(contexts.every(c => c !== 'latest.md')).toBe(true);
    });

    it('should return empty array for non-existent category', async () => {
      const contexts = await manager.listContexts('non-existent');
      expect(contexts).toEqual([]);
    });

    it('should return contexts in reverse chronological order', async () => {
      const document: ToolContextDocument = {
        metadata: {
          toolName: 'test_tool',
          toolVersion: '1.0.0',
          generated: new Date().toISOString(),
          projectPath: testProjectPath,
          projectName: 'test-project',
          status: 'success',
        },
        quickReference: 'Quick ref',
        executionSummary: {
          status: 'Success',
          keyFindings: [],
        },
        detectedContext: {},
      };

      await manager.saveContext('bootstrap', document);
      await new Promise(resolve => setTimeout(resolve, 10));
      await manager.saveContext('bootstrap', document);
      await new Promise(resolve => setTimeout(resolve, 10));
      await manager.saveContext('bootstrap', document);

      const contexts = await manager.listContexts('bootstrap');

      // First context should be newer than last
      expect(contexts[0] > contexts[contexts.length - 1]).toBe(true);
    });
  });

  describe('cleanupOldContexts', () => {
    it('should keep only the specified number of recent contexts', async () => {
      const document: ToolContextDocument = {
        metadata: {
          toolName: 'test_tool',
          toolVersion: '1.0.0',
          generated: new Date().toISOString(),
          projectPath: testProjectPath,
          projectName: 'test-project',
          status: 'success',
        },
        quickReference: 'Quick ref',
        executionSummary: {
          status: 'Success',
          keyFindings: [],
        },
        detectedContext: {},
      };

      // Create 5 contexts
      for (let i = 0; i < 5; i++) {
        await manager.saveContext('bootstrap', document);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Keep only 2
      await manager.cleanupOldContexts('bootstrap', 2);

      const contexts = await manager.listContexts('bootstrap');
      expect(contexts.length).toBe(2);
    });

    it('should not delete contexts if under the limit', async () => {
      const document: ToolContextDocument = {
        metadata: {
          toolName: 'test_tool',
          toolVersion: '1.0.0',
          generated: new Date().toISOString(),
          projectPath: testProjectPath,
          projectName: 'test-project',
          status: 'success',
        },
        quickReference: 'Quick ref',
        executionSummary: {
          status: 'Success',
          keyFindings: [],
        },
        detectedContext: {},
      };

      // Create 3 contexts
      for (let i = 0; i < 3; i++) {
        await manager.saveContext('bootstrap', document);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      await manager.cleanupOldContexts('bootstrap', 10);

      const contexts = await manager.listContexts('bootstrap');
      expect(contexts.length).toBe(3);
    });
  });

  describe('generateMarkdown', () => {
    it('should generate valid markdown with all sections', () => {
      const document: ToolContextDocument = {
        metadata: {
          toolName: 'bootstrap_validation_loop',
          toolVersion: '1.0.0',
          generated: '2025-01-19T14:30:22.123Z',
          projectPath: '/test/project',
          projectName: 'test-project',
          status: 'success',
          confidence: 95,
        },
        quickReference: 'Detected OpenShift (95% confidence)',
        executionSummary: {
          status: 'Platform detected successfully',
          confidence: 95,
          keyFindings: ['Primary platform: openshift', 'Validated pattern: Multicluster GitOps'],
        },
        detectedContext: {
          platform: {
            primary: 'openshift',
            confidence: 0.95,
          },
        },
        generatedArtifacts: ['docs/adrs/bootstrap-deployment.md', 'bootstrap.sh'],
        keyDecisions: [
          {
            decision: 'Use OpenShift as deployment platform',
            rationale: 'Detected with 95% confidence',
            alternatives: ['Kubernetes', 'Docker'],
          },
        ],
        learnings: {
          successes: ['Platform detection worked'],
          failures: [],
          recommendations: ['Review bootstrap ADR'],
          environmentSpecific: ['OpenShift 4.x required'],
        },
        relatedDocuments: {
          adrs: ['docs/adrs/bootstrap-deployment.md'],
          configs: ['values-global.yaml'],
          otherContexts: [],
        },
      };

      const markdown = manager.generateMarkdown(document);

      expect(markdown).toContain('# Tool Context: bootstrap_validation_loop');
      expect(markdown).toContain('> **Generated**: 2025-01-19T14:30:22.123Z');
      expect(markdown).toContain('## Quick Reference');
      expect(markdown).toContain('## Execution Summary');
      expect(markdown).toContain('## Detected Context');
      expect(markdown).toContain('## Generated Artifacts');
      expect(markdown).toContain('## Key Decisions');
      expect(markdown).toContain('## Learnings & Recommendations');
      expect(markdown).toContain('## Usage in Future Sessions');
      expect(markdown).toContain('### Related Documents');
      expect(markdown).toContain('*Auto-generated by bootstrap_validation_loop v1.0.0*');
    });

    it('should handle minimal document without optional fields', () => {
      const document: ToolContextDocument = {
        metadata: {
          toolName: 'minimal_tool',
          toolVersion: '1.0.0',
          generated: '2025-01-19T14:30:22.123Z',
          projectPath: '/test/project',
          projectName: 'test-project',
          status: 'success',
        },
        quickReference: 'Quick reference',
        executionSummary: {
          status: 'Success',
          keyFindings: ['Finding 1'],
        },
        detectedContext: {},
      };

      const markdown = manager.generateMarkdown(document);

      expect(markdown).toContain('# Tool Context: minimal_tool');
      expect(markdown).not.toContain('## Generated Artifacts');
      expect(markdown).not.toContain('## Key Decisions');
      expect(markdown).not.toContain('## Learnings & Recommendations');
      expect(markdown).not.toContain('## Raw Data');
    });
  });
});
