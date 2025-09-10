/**
 * Unit tests for research-integration.ts
 * Tests research directory monitoring, topic extraction, impact evaluation, and update suggestions
 */

import { jest } from '@jest/globals';
import { McpAdrError } from '../../src/types/index.js';

// Pragmatic mocking approach to avoid TypeScript complexity
jest.unstable_mockModule('fs/promises', () => ({
  access: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  readFile: jest.fn()
}));

jest.unstable_mockModule('path', () => ({
  resolve: jest.fn(),
  join: jest.fn(),
  extname: jest.fn(),
  relative: jest.fn()
}));

jest.unstable_mockModule('../../src/utils/adr-discovery.js', () => ({
  discoverAdrsInDirectory: jest.fn()
}));

const {
  monitorResearchDirectory,
  extractResearchTopics,
  evaluateResearchImpact,
  generateAdrUpdateSuggestions,
  createResearchTemplate,
  promptForActionConfirmation
} = await import('../../src/utils/research-integration.js');

const fs = await import('fs/promises');
const path = await import('path');
const { discoverAdrsInDirectory } = await import('../../src/utils/adr-discovery.js');

describe('research-integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('monitorResearchDirectory', () => {
    it('should monitor research directory with files', async () => {
      const mockStats = {
        mtime: new Date('2024-01-01T12:00:00Z'),
        size: 1024
      };

      (path.resolve as jest.MockedFunction<typeof path.resolve>)
        .mockReturnValue('/project/docs/research');
      (fs.access as jest.MockedFunction<typeof fs.access>)
        .mockResolvedValue(undefined);
      (fs.readdir as jest.MockedFunction<typeof fs.readdir>)
        .mockResolvedValue([
          { name: 'research1.md', isDirectory: () => false, isFile: () => true },
          { name: 'research2.txt', isDirectory: () => false, isFile: () => true }
        ] as any);
      (path.join as jest.MockedFunction<typeof path.join>)
        .mockImplementation((...args) => args.join('/'));
      (path.extname as jest.MockedFunction<typeof path.extname>)
        .mockImplementation((filename) => filename.includes('.md') ? '.md' : '.txt');
      (fs.stat as jest.MockedFunction<typeof fs.stat>)
        .mockResolvedValue(mockStats as any);
      (fs.readFile as any)
        .mockImplementation((filepath: any) => {
          if (filepath.toString().includes('research1.md')) {
            return Promise.resolve('# Research 1\nContent for research 1');
          }
          return Promise.resolve('Research 2 text content');
        });
      (path.relative as jest.MockedFunction<typeof path.relative>)
        .mockImplementation((from, to) => to.replace(from, '').replace(/^\//, ''));

      const result = await monitorResearchDirectory('docs/research');

      expect(result).toHaveProperty('monitoringPrompt');
      expect(result).toHaveProperty('instructions');
      expect(result).toHaveProperty('actualData');

      // Verify prompt contains file content
      expect(result.monitoringPrompt).toContain('Files Found**: 2 research files');
      expect(result.monitoringPrompt).toContain('research1.md');
      expect(result.monitoringPrompt).toContain('research2.txt');
      expect(result.monitoringPrompt).toContain('Research 1');

      // Verify instructions
      expect(result.instructions).toContain('Files Found**: 2 research files');
      expect(result.instructions).toContain('Readable Files**: 2 files');

      // Verify actual data
      expect(result.actualData.researchFiles).toHaveLength(2);
      expect(result.actualData.summary.totalFiles).toBe(2);
      expect(result.actualData.summary.readableFiles).toBe(2);
      expect(result.actualData.summary.directoryExists).toBe(true);
    });

    it('should handle empty research directory', async () => {
      (path.resolve as jest.MockedFunction<typeof path.resolve>)
        .mockReturnValue('/project/docs/research');
      (fs.access as jest.MockedFunction<typeof fs.access>)
        .mockRejectedValue(new Error('Directory not found'));

      const result = await monitorResearchDirectory('docs/research');

      expect(result.monitoringPrompt).toContain('No research files found');
      expect(result.monitoringPrompt).toContain('mkdir -p docs/research');
      expect(result.instructions).toContain('Files Found**: 0 research files');
      expect(result.actualData.summary.totalFiles).toBe(0);
      expect(result.actualData.summary.directoryExists).toBe(false);
    });

    it('should use default research path when not specified', async () => {
      (path.resolve as jest.MockedFunction<typeof path.resolve>)
        .mockReturnValue('/project/docs/research');
      (fs.access as jest.MockedFunction<typeof fs.access>)
        .mockRejectedValue(new Error('Directory not found'));

      await monitorResearchDirectory();

      expect(path.resolve).toHaveBeenCalledWith(process.cwd(), 'docs/research');
    });

    it('should handle nested directories', async () => {
      const mockStats = { mtime: new Date('2024-01-01T12:00:00Z'), size: 512 };

      (path.resolve as jest.MockedFunction<typeof path.resolve>)
        .mockReturnValue('/project/docs/research');
      (fs.access as jest.MockedFunction<typeof fs.access>)
        .mockResolvedValue(undefined);
      (fs.readdir as jest.MockedFunction<typeof fs.readdir>)
        .mockImplementation((dirPath) => {
          if (dirPath === '/project/docs/research') {
            return Promise.resolve([
              { name: 'subdir', isDirectory: () => true, isFile: () => false }
            ] as any);
          }
          return Promise.resolve([
            { name: 'nested.md', isDirectory: () => false, isFile: () => true }
          ] as any);
        });
      (path.join as jest.MockedFunction<typeof path.join>)
        .mockImplementation((...args) => args.join('/'));
      (path.extname as jest.MockedFunction<typeof path.extname>)
        .mockReturnValue('.md');
      (fs.stat as jest.MockedFunction<typeof fs.stat>)
        .mockResolvedValue(mockStats as any);
      (fs.readFile as jest.MockedFunction<typeof fs.readFile>)
        .mockResolvedValue('Nested file content');
      (path.relative as jest.MockedFunction<typeof path.relative>)
        .mockReturnValue('subdir/nested.md');

      const result = await monitorResearchDirectory('docs/research');

      expect(result.actualData.researchFiles).toHaveLength(1);
      expect(result.actualData.researchFiles[0].filename).toBe('nested.md');
    });

    it('should throw McpAdrError on monitoring failure', async () => {
      const monitoringError = new Error('File system error');
      (path.resolve as jest.MockedFunction<typeof path.resolve>)
        .mockImplementation(() => { throw monitoringError; });

      await expect(monitorResearchDirectory()).rejects.toThrow(McpAdrError);
      await expect(monitorResearchDirectory()).rejects.toThrow('Failed to monitor research directory: File system error');
    });
  });

  describe('extractResearchTopics', () => {
    it('should extract topics from research files', async () => {
      // Set up proper mocks for the file system operations
      (path.resolve as jest.MockedFunction<typeof path.resolve>)
        .mockReturnValue('/project/docs/research');
      (fs.access as jest.MockedFunction<typeof fs.access>)
        .mockResolvedValue(undefined);
      (fs.readdir as jest.MockedFunction<typeof fs.readdir>)
        .mockResolvedValue([
          { name: 'architecture.md', isDirectory: () => false, isFile: () => true }
        ] as any);
      (path.join as jest.MockedFunction<typeof path.join>)
        .mockImplementation((...args) => args.join('/'));
      (path.extname as jest.MockedFunction<typeof path.extname>)
        .mockReturnValue('.md');
      (fs.stat as jest.MockedFunction<typeof fs.stat>)
        .mockResolvedValue({ mtime: new Date('2024-01-01T12:00:00Z'), size: 1024 } as any);
      (fs.readFile as jest.MockedFunction<typeof fs.readFile>)
        .mockResolvedValue('# Architecture Research\nKey findings about microservices');
      (path.relative as jest.MockedFunction<typeof path.relative>)
        .mockReturnValue('docs/research/architecture.md');

      const existingTopics = ['Topic 1', 'Topic 2'];
      const result = await extractResearchTopics('docs/research', existingTopics);

      expect(result).toHaveProperty('extractionPrompt');
      expect(result).toHaveProperty('instructions');
      expect(result).toHaveProperty('actualData');

      expect(result.extractionPrompt).toContain('architecture.md');
      expect(result.extractionPrompt).toContain('Key findings about microservices');
      expect(result.extractionPrompt).toContain('Current Topics (2)');
      expect(result.extractionPrompt).toContain('Topic 1');

      expect(result.instructions).toContain('Text-Based Files**: 1 files');
      expect(result.instructions).toContain('Existing Topics**: 2 topics');
    });

    it('should handle no existing topics', async () => {
      // Set up mocks for empty directory
      (path.resolve as jest.MockedFunction<typeof path.resolve>)
        .mockReturnValue('/project/docs/research');
      (fs.access as jest.MockedFunction<typeof fs.access>)
        .mockRejectedValue(new Error('Directory not found'));

      const result = await extractResearchTopics('docs/research');

      expect(result.extractionPrompt).toContain('No existing topics provided');
      expect(result.instructions).toContain('Existing Topics**: 0 topics');
    });

    it('should throw McpAdrError on extraction failure', async () => {
      const extractionError = new Error('File system error');
      (path.resolve as jest.MockedFunction<typeof path.resolve>)
        .mockImplementation(() => { throw extractionError; });

      await expect(extractResearchTopics()).rejects.toThrow(McpAdrError);
      await expect(extractResearchTopics()).rejects.toThrow('Failed to extract research topics: Failed to monitor research directory: File system error');
    });
  });

  describe('evaluateResearchImpact', () => {
    it('should evaluate research impact on ADRs', async () => {
      const mockResearchTopics = [
        {
          id: 'topic-1',
          title: 'Microservices Architecture',
          category: 'architecture',
          description: 'Research on microservices patterns',
          sourceFiles: ['research1.md'],
          keyFindings: ['Improved scalability', 'Increased complexity'],
          evidence: ['Performance tests', 'Case studies'],
          confidence: 0.8,
          relevanceScore: 0.9,
          lastUpdated: '2024-01-01T12:00:00Z',
          tags: ['architecture', 'scalability']
        }
      ];

      const mockDiscoveryResult = {
        adrs: [
          {
            title: 'Use Monolithic Architecture',
            filename: 'ADR-001-monolith.md',
            status: 'Accepted',
            content: 'We will use a monolithic architecture for simplicity.',
            path: '/test/ADR-001-monolith.md',
            metadata: { number: 1 }
          }
        ],
        totalAdrs: 1,
        summary: { byStatus: { Accepted: 1 }, byCategory: {} },
        directory: 'docs/adrs',
        recommendations: []
      };

      (discoverAdrsInDirectory as jest.MockedFunction<typeof discoverAdrsInDirectory>)
        .mockResolvedValue(mockDiscoveryResult as any);

      const result = await evaluateResearchImpact(mockResearchTopics, 'docs/adrs');

      expect(discoverAdrsInDirectory).toHaveBeenCalledWith('docs/adrs', true, process.cwd());
      expect(result).toHaveProperty('evaluationPrompt');
      expect(result).toHaveProperty('instructions');
      expect(result).toHaveProperty('actualData');

      expect(result.evaluationPrompt).toContain('Use Monolithic Architecture');
      expect(result.evaluationPrompt).toContain('Microservices Architecture');
      expect(result.evaluationPrompt).toContain('Relevance Score**: 0.9');
      expect(result.evaluationPrompt).toContain('Confidence**: 0.8');

      expect(result.instructions).toContain('Research Topics**: 1 topics');
      expect(result.instructions).toContain('ADRs Found**: 1 files');
      expect(result.instructions).toContain('High Relevance Topics**: 1 topics');
    });

    it('should handle no ADRs found', async () => {
      const mockResearchTopics = [
        {
          id: 'topic-1',
          title: 'Test Topic',
          category: 'test',
          description: 'Test description',
          sourceFiles: ['test.md'],
          keyFindings: ['Finding 1'],
          evidence: ['Evidence 1'],
          confidence: 0.5,
          relevanceScore: 0.3,
          lastUpdated: '2024-01-01T12:00:00Z',
          tags: ['test']
        }
      ];

      const mockDiscoveryResult = {
        adrs: [],
        totalAdrs: 0,
        summary: { byStatus: {}, byCategory: {} },
        directory: 'docs/adrs',
        recommendations: []
      };

      (discoverAdrsInDirectory as jest.MockedFunction<typeof discoverAdrsInDirectory>)
        .mockResolvedValue(mockDiscoveryResult as any);

      const result = await evaluateResearchImpact(mockResearchTopics, 'docs/adrs');

      expect(result.evaluationPrompt).toContain('No ADRs found in the specified directory');
      expect(result.instructions).toContain('High Relevance Topics**: 0 topics');
    });

    it('should throw McpAdrError on evaluation failure', async () => {
      const evaluationError = new Error('ADR discovery failed');
      (discoverAdrsInDirectory as jest.MockedFunction<typeof discoverAdrsInDirectory>)
        .mockRejectedValue(evaluationError);

      const mockTopics = [
        {
          id: 'topic-1',
          title: 'Test Topic',
          category: 'test',
          description: 'Test',
          sourceFiles: ['test.md'],
          keyFindings: ['Test'],
          evidence: ['Test'],
          confidence: 0.5,
          relevanceScore: 0.5,
          lastUpdated: '2024-01-01T12:00:00Z',
          tags: ['test']
        }
      ];

      await expect(evaluateResearchImpact(mockTopics)).rejects.toThrow(McpAdrError);
      await expect(evaluateResearchImpact(mockTopics)).rejects.toThrow('Failed to evaluate research impact: ADR discovery failed');
    });
  });

  describe('generateAdrUpdateSuggestions', () => {
    it('should generate update suggestions for found ADR', async () => {
      const mockDiscoveryResult = {
        adrs: [
          {
            title: 'Database Selection',
            filename: 'ADR-001-database.md',
            status: 'Accepted',
            content: 'We will use PostgreSQL for our database needs.',
            path: '/test/ADR-001-database.md',
            metadata: { number: 1 }
          }
        ],
        totalAdrs: 1,
        summary: { byStatus: { Accepted: 1 }, byCategory: {} },
        directory: 'docs/adrs',
        recommendations: []
      };

      const mockResearchFindings = [
        {
          finding: 'NoSQL databases show better performance for our use case',
          evidence: ['Performance benchmarks', 'Scalability studies'],
          impact: 'High - may require architecture change'
        }
      ];

      (discoverAdrsInDirectory as jest.MockedFunction<typeof discoverAdrsInDirectory>)
        .mockResolvedValue(mockDiscoveryResult as any);

      const result = await generateAdrUpdateSuggestions('001', mockResearchFindings, 'content', 'docs/adrs');

      expect(result).toHaveProperty('updatePrompt');
      expect(result).toHaveProperty('instructions');
      expect(result).toHaveProperty('actualData');

      expect(result.updatePrompt).toContain('Database Selection');
      expect(result.updatePrompt).toContain('✅ FOUND TARGET ADR');
      expect(result.updatePrompt).toContain('NoSQL databases show better performance');
      expect(result.updatePrompt).toContain('Update Type**: content');

      expect(result.instructions).toContain('✅ Found - Database Selection');
      expect(result.instructions).toContain('Research Findings**: 1 findings');

      expect(result.actualData.summary.targetFound).toBe(true);
      expect(result.actualData.summary.updateType).toBe('content');
    });

    it('should handle ADR not found scenario', async () => {
      const mockDiscoveryResult = {
        adrs: [
          {
            title: 'Different ADR',
            filename: 'ADR-002-other.md',
            status: 'Accepted',
            content: 'Different content',
            path: '/test/ADR-002-other.md',
            metadata: { number: 2 }
          }
        ],
        totalAdrs: 1,
        summary: { byStatus: { Accepted: 1 }, byCategory: {} },
        directory: 'docs/adrs',
        recommendations: []
      };

      const mockResearchFindings = [
        {
          finding: 'Test finding',
          evidence: ['Test evidence'],
          impact: 'Low'
        }
      ];

      (discoverAdrsInDirectory as jest.MockedFunction<typeof discoverAdrsInDirectory>)
        .mockResolvedValue(mockDiscoveryResult as any);

      const result = await generateAdrUpdateSuggestions('999', mockResearchFindings, 'status', 'docs/adrs');

      expect(result.updatePrompt).toContain('❌ TARGET ADR NOT FOUND');
      expect(result.updatePrompt).toContain('Target ADR ID**: 999');
      expect(result.instructions).toContain('❌ Not found - will need identification');
      expect(result.actualData.summary.targetFound).toBe(false);
    });

    it('should handle different update types', async () => {
      const mockDiscoveryResult = {
        adrs: [
          {
            title: 'Test ADR',
            filename: 'ADR-test.md',
            status: 'Accepted',
            content: 'Test content',
            path: '/test/ADR-test.md'
          }
        ],
        totalAdrs: 1,
        summary: { byStatus: { Accepted: 1 }, byCategory: {} },
        directory: 'docs/adrs',
        recommendations: []
      };

      const mockFindings = [{ finding: 'Test', evidence: ['Test'], impact: 'Test' }];

      (discoverAdrsInDirectory as jest.MockedFunction<typeof discoverAdrsInDirectory>)
        .mockResolvedValue(mockDiscoveryResult as any);

      const updateTypes = ['content', 'status', 'consequences', 'alternatives', 'deprecation'] as const;
      
      for (const updateType of updateTypes) {
        const result = await generateAdrUpdateSuggestions('test', mockFindings, updateType);
        expect(result.updatePrompt).toContain(`Update Type**: ${updateType}`);
      }
    });

    it('should throw McpAdrError on update generation failure', async () => {
      const updateError = new Error('Update generation failed');
      (discoverAdrsInDirectory as jest.MockedFunction<typeof discoverAdrsInDirectory>)
        .mockRejectedValue(updateError);

      const mockFindings = [{ finding: 'Test', evidence: ['Test'], impact: 'Test' }];

      await expect(generateAdrUpdateSuggestions('test', mockFindings, 'content')).rejects.toThrow(McpAdrError);
      await expect(generateAdrUpdateSuggestions('test', mockFindings, 'content')).rejects.toThrow('Failed to generate ADR update suggestions: Update generation failed');
    });
  });

  describe('createResearchTemplate', () => {
    it('should create research template with title and category', () => {
      const template = createResearchTemplate('API Design Research', 'architecture');
      
      expect(template).toContain('# API Design Research');
      expect(template).toContain('**Category**: architecture');
      expect(template).toContain('**Status**: In Progress');
      expect(template).toContain('## Research Question');
      expect(template).toContain('## Key Findings');
      expect(template).toContain('## Implications');
      expect(template).toContain('## Recommendations');
      expect(template).toContain('## Related ADRs');
      expect(template).toContain('## Next Steps');
      expect(template).toContain('## References');
    });

    it('should use default category when not specified', () => {
      const template = createResearchTemplate('Test Research');
      
      expect(template).toContain('# Test Research');
      expect(template).toContain('**Category**: general');
    });

    it('should include current date', () => {
      const template = createResearchTemplate('Date Test');
      const currentDate = new Date().toISOString().split('T')[0];
      
      expect(template).toContain(`**Date**: ${currentDate}`);
    });
  });

  describe('promptForActionConfirmation', () => {
    it('should create confirmation prompt for different impact levels', () => {
      const impactLevels = ['low', 'medium', 'high', 'critical'] as const;
      
      for (const impact of impactLevels) {
        const result = promptForActionConfirmation('Test Action', 'Test details', impact);
        
        expect(result).toHaveProperty('confirmationPrompt');
        expect(result).toHaveProperty('instructions');
        expect(result.confirmationPrompt).toContain('Test Action');
        expect(result.confirmationPrompt).toContain('Test details');
        expect(result.confirmationPrompt).toContain(impact.toUpperCase());
        
        // Check risk assessment icons
        if (impact === 'critical') {
          expect(result.confirmationPrompt).toContain('🔴 **CRITICAL**');
        } else if (impact === 'high') {
          expect(result.confirmationPrompt).toContain('🟠 **HIGH**');
        } else if (impact === 'medium') {
          expect(result.confirmationPrompt).toContain('🟡 **MEDIUM**');
        } else {
          expect(result.confirmationPrompt).toContain('🟢 **LOW**');
        }
      }
    });

    it('should include response options', () => {
      const result = promptForActionConfirmation('Test', 'Details', 'medium');
      
      expect(result.confirmationPrompt).toContain('**APPROVED**');
      expect(result.confirmationPrompt).toContain('**REJECTED**');
      expect(result.confirmationPrompt).toContain('**MODIFIED**');
      expect(result.confirmationPrompt).toContain('**DEFERRED**');
    });

    it('should include confirmation requirements', () => {
      const result = promptForActionConfirmation('Test', 'Details', 'high');
      
      expect(result.confirmationPrompt).toContain('Understanding');
      expect(result.confirmationPrompt).toContain('Authorization');
      expect(result.confirmationPrompt).toContain('Impact Assessment');
      expect(result.confirmationPrompt).toContain('Timing');
      expect(result.confirmationPrompt).toContain('Resources');
    });
  });
});
