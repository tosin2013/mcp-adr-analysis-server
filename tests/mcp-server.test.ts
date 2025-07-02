/**
 * Tests for MCP server functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock the MCP SDK
const mockServer = {
  setRequestHandler: jest.fn(),
  connect: jest.fn(),
  close: jest.fn()
};

const mockTransport = {
  start: jest.fn(),
  close: jest.fn()
};

jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => mockServer)
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => mockTransport)
}));

describe('MCP ADR Analysis Server Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('File System Utilities', () => {
    it('should have file system utilities available', async () => {
      const { analyzeProjectStructure, findFiles, readFileContent } = await import('../src/utils/file-system.js');

      expect(typeof analyzeProjectStructure).toBe('function');
      expect(typeof findFiles).toBe('function');
      expect(typeof readFileContent).toBe('function');
    });
  });

  describe('Analysis Prompts', () => {
    it('should have analysis prompt generators available', async () => {
      const {
        generateAnalysisContext,
        generateTechnologyDetectionPrompt,
        generatePatternDetectionPrompt,
        generateComprehensiveAnalysisPrompt
      } = await import('../src/prompts/analysis-prompts.js');

      expect(typeof generateAnalysisContext).toBe('function');
      expect(typeof generateTechnologyDetectionPrompt).toBe('function');
      expect(typeof generatePatternDetectionPrompt).toBe('function');
      expect(typeof generateComprehensiveAnalysisPrompt).toBe('function');
    });

    it('should generate valid analysis context', async () => {
      const { generateAnalysisContext } = await import('../src/prompts/analysis-prompts.js');

      const mockProjectStructure = {
        rootPath: '/test/project',
        files: [
          { path: 'package.json', name: 'package.json', extension: '.json', size: 1000, directory: '.' },
          { path: 'src/index.ts', name: 'index.ts', extension: '.ts', size: 500, directory: 'src' }
        ],
        directories: ['src', 'tests'],
        totalFiles: 2,
        totalDirectories: 2
      };

      const context = generateAnalysisContext(mockProjectStructure);
      expect(typeof context).toBe('string');

      // Should be valid JSON
      const parsed = JSON.parse(context);
      expect(parsed).toHaveProperty('projectPath');
      expect(parsed).toHaveProperty('totalFiles');
      expect(parsed).toHaveProperty('fileTypes');
    });
  });
});

describe('Prompt Templates', () => {
  it('should load all prompt templates correctly', async () => {
    const { allPrompts } = await import('../src/prompts/index.js');
    
    expect(Array.isArray(allPrompts)).toBe(true);
    expect(allPrompts.length).toBeGreaterThan(0);
    
    // Check that each prompt has required properties
    for (const prompt of allPrompts) {
      expect(prompt).toHaveProperty('name');
      expect(prompt).toHaveProperty('description');
      expect(prompt).toHaveProperty('arguments');
      expect(prompt).toHaveProperty('template');
      
      expect(typeof prompt.name).toBe('string');
      expect(typeof prompt.description).toBe('string');
      expect(Array.isArray(prompt.arguments)).toBe(true);
      expect(typeof prompt.template).toBe('string');
    }
  });

  it('should have valid argument definitions', async () => {
    const { allPrompts } = await import('../src/prompts/index.js');
    
    for (const prompt of allPrompts) {
      for (const arg of prompt.arguments) {
        expect(arg).toHaveProperty('name');
        expect(arg).toHaveProperty('description');
        expect(arg).toHaveProperty('required');
        
        expect(typeof arg.name).toBe('string');
        expect(typeof arg.description).toBe('string');
        expect(typeof arg.required).toBe('boolean');
      }
    }
  });
});
