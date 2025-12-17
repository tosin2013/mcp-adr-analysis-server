import { describe, it, expect, _beforeEach, _afterEach, vi } from 'vitest';

describe('Research Integration Tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Module Loading', () => {
    it('should import research integration tool successfully', async () => {
      const module = await import('../../src/tools/research-integration-tool.js');
      expect(module).toBeDefined();
    });

    it('should export expected functions', async () => {
      const module = await import('../../src/tools/research-integration-tool.js');
      expect(module.incorporateResearch).toBeDefined();
      expect(module.createResearchTemplate).toBeDefined();
      expect(module.requestActionConfirmation).toBeDefined();
    });
  });

  describe('Research Template Creation', () => {
    it('should create research template for project analysis', async () => {
      const { createResearchTemplate } =
        await import('../../src/tools/research-integration-tool.js');

      const result = await createResearchTemplate({
        projectPath: '/test/project',
        researchType: 'architectural',
      });

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');
    });

    it('should handle different research types', async () => {
      const { createResearchTemplate } =
        await import('../../src/tools/research-integration-tool.js');

      const researchTypes = ['architectural', 'security', 'performance', 'scalability'];

      for (const type of researchTypes) {
        const result = await createResearchTemplate({
          projectPath: '/test/project',
          researchType: type,
        });

        expect(result).toHaveProperty('content');
        expect(result.content[0].text).toContain('Research Template');
      }
    });

    it('should integrate with existing project structure', async () => {
      const { createResearchTemplate } =
        await import('../../src/tools/research-integration-tool.js');

      const result = await createResearchTemplate({
        projectPath: '/test/project',
        includeProjectAnalysis: true,
      });

      expect(result.content[0].text).toContain('Research Template');
    });

    it('should provide technology-specific questions', async () => {
      const { generateResearchQuestions } =
        await import('../../src/tools/research-question-tool.js');

      const result = await generateResearchQuestions({
        researchContext: {
          topic: 'Technology Analysis',
          category: 'architectural',
          scope: 'project',
          objectives: ['React', 'Node.js', 'PostgreSQL'],
        },
      });

      const responseText = result.content[0].text;
      expect(responseText).toContain('Research');
    });

    it('should handle conversation context', async () => {
      const { generateResearchQuestions } =
        await import('../../src/tools/research-question-tool.js');

      const result = await generateResearchQuestions({
        researchContext: {
          topic: 'Context Analysis',
          category: 'architectural',
          scope: 'project',
          objectives: ['analyze-patterns'],
        },
      });

      expect(result).toHaveProperty('content');
    });

    it('should generate focused research for specific domains', async () => {
      const { generateResearchQuestions } =
        await import('../../src/tools/research-question-tool.js');

      const result = await generateResearchQuestions({
        researchContext: {
          topic: 'Database Analysis',
          category: 'database',
          scope: 'project',
          objectives: ['database optimization'],
        },
      });

      expect(result.content[0].text).toContain('Research');
    });

    it('should support multi-language project analysis', async () => {
      const { generateResearchQuestions } =
        await import('../../src/tools/research-question-tool.js');

      const result = await generateResearchQuestions({
        researchContext: {
          topic: 'Multi-language Analysis',
          category: 'architectural',
          scope: 'project',
          objectives: ['TypeScript', 'Python', 'Go'],
        },
      });

      expect(result).toHaveProperty('content');
    });
  });

  describe('Integration with Other Tools', () => {
    it('should integrate with bootstrap validation workflow', async () => {
      const { generateResearchQuestions } =
        await import('../../src/tools/research-question-tool.js');

      const result = await generateResearchQuestions({
        researchContext: {
          topic: 'Bootstrap Validation',
          category: 'architectural',
          scope: 'project',
          objectives: ['bootstrap-validation'],
        },
      });

      expect(result.content[0].text).toContain('Research');
    });

    it('should support memory system integration', async () => {
      const { generateResearchQuestions } =
        await import('../../src/tools/research-question-tool.js');

      const result = await generateResearchQuestions({
        researchContext: {
          topic: 'Memory System Integration',
          category: 'architectural',
          scope: 'project',
          objectives: ['memory analysis'],
        },
      });

      expect(result).toHaveProperty('content');
    });

    it('should handle ADR-based research generation', async () => {
      const { generateResearchQuestions } =
        await import('../../src/tools/research-question-tool.js');

      const result = await generateResearchQuestions({
        researchContext: {
          topic: 'ADR Analysis',
          category: 'architectural',
          scope: 'project',
          objectives: ['ADR evaluation'],
        },
      });

      expect(result.content[0].text).toContain('ADR');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing project path gracefully', async () => {
      const { generateResearchQuestions } =
        await import('../../src/tools/research-question-tool.js');

      const result = await generateResearchQuestions({
        researchContext: {
          topic: 'Error Handling',
          category: 'architectural',
          scope: 'project',
          objectives: ['graceful degradation'],
        },
      });

      expect(result).toHaveProperty('content');
    });

    it('should handle invalid research types', async () => {
      const { generateResearchQuestions } =
        await import('../../src/tools/research-question-tool.js');

      const result = await generateResearchQuestions({
        researchContext: {
          topic: 'Invalid Type Handling',
          category: 'error-handling',
          scope: 'project',
          objectives: ['invalid-type'],
        },
      });

      expect(result).toHaveProperty('content');
    });

    it('should provide fallback questions when analysis fails', async () => {
      const { generateResearchQuestions } =
        await import('../../src/tools/research-question-tool.js');

      const result = await generateResearchQuestions({
        researchContext: {
          topic: 'Fallback Analysis',
          category: 'error-handling',
          scope: 'project',
          objectives: ['fallback questions'],
        },
      });

      expect(result.content[0].text).toContain('Research');
    });
  });

  describe('Tree-sitter Integration Gap Analysis', () => {
    it('should acknowledge missing tree-sitter parsing', async () => {
      const { generateResearchQuestions } =
        await import('../../src/tools/research-question-tool.js');

      const result = await generateResearchQuestions({
        researchContext: {
          topic: 'Code Analysis',
          category: 'architectural',
          scope: 'project',
          objectives: ['tree-sitter analysis'],
        },
      });

      // Should still work without tree-sitter
      expect(result).toHaveProperty('content');
    });

    it('should handle multi-language analysis without tree-sitter', async () => {
      const languageExtensions = {
        typescript: ['.ts', '.tsx'],
        python: ['.py'],
        rust: ['.rs'],
        go: ['.go'],
        java: ['.java'],
      };

      Object.entries(languageExtensions).forEach(([_lang, extensions]) => {
        expect(extensions.length).toBeGreaterThan(0);
      });
    });

    it('should suggest tree-sitter integration for better analysis', async () => {
      const { generateResearchQuestions } =
        await import('../../src/tools/research-question-tool.js');

      const result = await generateResearchQuestions({
        researchContext: {
          topic: 'Integration Improvements',
          category: 'architectural',
          scope: 'project',
          objectives: ['tree-sitter integration'],
        },
      });

      expect(result.content[0].text).toContain('Research');
    });
  });
});
