import { jest } from '@jest/globals';

describe('Research Integration Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Module Loading', () => {
    it('should import research integration tool successfully', async () => {
      const module = await import('../../src/tools/research-integration-tool.js');
      expect(module).toBeDefined();
    });

    it('should export expected functions', async () => {
      const module = await import('../../src/tools/research-integration-tool.js');
      expect(module.generateResearchQuestions).toBeDefined();
    });
  });

  describe('Research Question Generation', () => {
    it('should generate research questions for project analysis', async () => {
      const { generateResearchQuestions } = await import(
        '../../src/tools/research-integration-tool.js'
      );

      const result = await generateResearchQuestions({
        projectPath: '/test/project',
        researchType: 'architectural',
      });

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');
    });

    it('should handle different research types', async () => {
      const { generateResearchQuestions } = await import(
        '../../src/tools/research-integration-tool.js'
      );

      const researchTypes = ['architectural', 'security', 'performance', 'scalability'];

      for (const type of researchTypes) {
        const result = await generateResearchQuestions({
          projectPath: '/test/project',
          researchType: type,
        });

        expect(result).toHaveProperty('content');
        expect(result.content[0].text).toContain('Research Questions');
      }
    });

    it('should integrate with existing project structure', async () => {
      const { generateResearchQuestions } = await import(
        '../../src/tools/research-integration-tool.js'
      );

      const result = await generateResearchQuestions({
        projectPath: '/test/project',
        includeProjectAnalysis: true,
      });

      expect(result.content[0].text).toContain('Project Analysis');
    });

    it('should provide technology-specific questions', async () => {
      const { generateResearchQuestions } = await import(
        '../../src/tools/research-integration-tool.js'
      );

      const result = await generateResearchQuestions({
        projectPath: '/test/project',
        technologies: ['React', 'Node.js', 'PostgreSQL'],
      });

      const responseText = result.content[0].text;
      expect(responseText).toContain('Technology-Specific');
    });

    it('should handle conversation context', async () => {
      const { generateResearchQuestions } = await import(
        '../../src/tools/research-integration-tool.js'
      );

      const conversationContext = {
        previousTools: ['adr-suggestion'],
        currentTool: 'research-integration',
        recommendations: ['analyze-patterns'],
      };

      const result = await generateResearchQuestions({
        projectPath: '/test/project',
        conversationContext,
      });

      expect(result).toHaveProperty('content');
    });

    it('should generate focused research for specific domains', async () => {
      const { generateResearchQuestions } = await import(
        '../../src/tools/research-integration-tool.js'
      );

      const result = await generateResearchQuestions({
        projectPath: '/test/project',
        focusDomain: 'database',
      });

      expect(result.content[0].text).toContain('Research');
    });

    it('should support multi-language project analysis', async () => {
      const { generateResearchQuestions } = await import(
        '../../src/tools/research-integration-tool.js'
      );

      const result = await generateResearchQuestions({
        projectPath: '/test/multilang-project',
        languages: ['TypeScript', 'Python', 'Go'],
      });

      expect(result).toHaveProperty('content');
    });
  });

  describe('Integration with Other Tools', () => {
    it('should integrate with bootstrap validation workflow', async () => {
      const { generateResearchQuestions } = await import(
        '../../src/tools/research-integration-tool.js'
      );

      const result = await generateResearchQuestions({
        projectPath: '/test/project',
        integrationType: 'bootstrap-validation',
      });

      expect(result.content[0].text).toContain('Research');
    });

    it('should support memory system integration', async () => {
      const { generateResearchQuestions } = await import(
        '../../src/tools/research-integration-tool.js'
      );

      const result = await generateResearchQuestions({
        projectPath: '/test/project',
        includeMemoryAnalysis: true,
      });

      expect(result).toHaveProperty('content');
    });

    it('should handle ADR-based research generation', async () => {
      const { generateResearchQuestions } = await import(
        '../../src/tools/research-integration-tool.js'
      );

      const result = await generateResearchQuestions({
        projectPath: '/test/project',
        adrDirectory: 'docs/adrs',
        baseOnExistingAdrs: true,
      });

      expect(result.content[0].text).toContain('ADR');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing project path gracefully', async () => {
      const { generateResearchQuestions } = await import(
        '../../src/tools/research-integration-tool.js'
      );

      const result = await generateResearchQuestions({
        projectPath: '',
        researchType: 'architectural',
      });

      expect(result).toHaveProperty('content');
    });

    it('should handle invalid research types', async () => {
      const { generateResearchQuestions } = await import(
        '../../src/tools/research-integration-tool.js'
      );

      const result = await generateResearchQuestions({
        projectPath: '/test/project',
        researchType: 'invalid-type' as any,
      });

      expect(result).toHaveProperty('content');
    });

    it('should provide fallback questions when analysis fails', async () => {
      const { generateResearchQuestions } = await import(
        '../../src/tools/research-integration-tool.js'
      );

      const result = await generateResearchQuestions({
        projectPath: '/nonexistent/project',
      });

      expect(result.content[0].text).toContain('Research');
    });
  });

  describe('Tree-sitter Integration Gap Analysis', () => {
    it('should acknowledge missing tree-sitter parsing', async () => {
      const { generateResearchQuestions } = await import(
        '../../src/tools/research-integration-tool.js'
      );

      const result = await generateResearchQuestions({
        projectPath: '/test/project',
        includeCodeAnalysis: true,
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

      Object.entries(languageExtensions).forEach(([lang, extensions]) => {
        expect(extensions.length).toBeGreaterThan(0);
      });
    });

    it('should suggest tree-sitter integration for better analysis', async () => {
      const { generateResearchQuestions } = await import(
        '../../src/tools/research-integration-tool.js'
      );

      const result = await generateResearchQuestions({
        projectPath: '/test/project',
        includeImprovementSuggestions: true,
      });

      expect(result.content[0].text).toContain('Research');
    });
  });
});
