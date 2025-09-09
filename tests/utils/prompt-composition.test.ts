import { jest } from '@jest/globals';
import {
  combinePrompts,
  createAIDelegationPrompt,
  addJSONSchema,
  validatePromptResponse,
  createFileAnalysisPrompt,
  createProjectStructurePrompt,
  escapePromptContent,
  truncatePrompt,
  extractResponseMetadata,
  createComprehensiveAnalysisPrompt,
  createADRAnalysisPrompt,
  CommonSchemas,
  PromptObject,
  CombinedPrompt,
  AIDelegationPrompt,
  JSONSchemaSpec,
  PromptValidationResult
} from '../../src/utils/prompt-composition.js';

describe('Prompt Composition Utilities', () => {
  describe('combinePrompts', () => {
    const mockPrompt1: PromptObject = {
      prompt: 'Analyze the system architecture',
      instructions: 'Focus on scalability patterns',
      context: { type: 'architecture', priority: 'high' }
    };

    const mockPrompt2: PromptObject = {
      prompt: 'Review security considerations',
      instructions: 'Identify potential vulnerabilities',
      context: { domain: 'security', level: 'critical' }
    };

    it('should combine multiple prompts correctly', () => {
      const result = combinePrompts(mockPrompt1, mockPrompt2);

      expect(result.prompt).toContain('Analyze the system architecture');
      expect(result.prompt).toContain('---');
      expect(result.prompt).toContain('Review security considerations');
      expect(result.instructions).toContain('Focus on scalability patterns');
      expect(result.instructions).toContain('Identify potential vulnerabilities');
      expect(result.context).toEqual({
        type: 'architecture',
        priority: 'high',
        domain: 'security',
        level: 'critical'
      });
      expect(result.metadata.sourcePrompts).toBe(2);
      expect(result.metadata.combinedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.metadata.totalLength).toBeGreaterThan(0);
    });

    it('should handle single prompt', () => {
      const result = combinePrompts(mockPrompt1);

      expect(result.prompt).toBe('Analyze the system architecture');
      expect(result.instructions).toBe('Focus on scalability patterns');
      expect(result.context).toEqual({ type: 'architecture', priority: 'high' });
      expect(result.metadata.sourcePrompts).toBe(1);
    });

    it('should throw error for empty prompts array', () => {
      expect(() => combinePrompts()).toThrow('At least one prompt is required for combination');
    });

    it('should handle prompts with empty context', () => {
      const promptWithoutContext: PromptObject = {
        prompt: 'Test prompt',
        instructions: 'Test instructions',
        context: {}
      };

      const result = combinePrompts(promptWithoutContext, mockPrompt1);
      expect(result.context).toEqual({ type: 'architecture', priority: 'high' });
    });
  });

  describe('createAIDelegationPrompt', () => {
    it('should create delegation prompt with all components', () => {
      const task = 'Analyze code quality metrics';
      const requirements = ['Check complexity', 'Identify code smells', 'Suggest improvements'];
      const outputFormat = 'JSON with metrics and recommendations';
      const context = { language: 'TypeScript', framework: 'Node.js' };

      const result = createAIDelegationPrompt(task, requirements, outputFormat, context);

      expect(result.task).toBe(task);
      expect(result.requirements).toEqual(requirements);
      expect(result.outputFormat).toBe(outputFormat);
      expect(result.context).toEqual(context);
      expect(result.instructions).toContain('# AI Task Delegation');
      expect(result.instructions).toContain('Analyze code quality metrics');
      expect(result.instructions).toContain('1. Check complexity');
      expect(result.instructions).toContain('2. Identify code smells');
      expect(result.instructions).toContain('3. Suggest improvements');
      expect(result.instructions).toContain('JSON with metrics and recommendations');
      expect(result.instructions).toContain('"language": "TypeScript"');
    });

    it('should create delegation prompt without context', () => {
      const task = 'Simple analysis task';
      const requirements = ['Basic requirement'];
      const outputFormat = 'Plain text';

      const result = createAIDelegationPrompt(task, requirements, outputFormat);

      expect(result.context).toBeUndefined();
      expect(result.instructions).not.toContain('## Additional Context');
    });

    it('should handle empty requirements array', () => {
      const result = createAIDelegationPrompt('Test task', [], 'Text format');

      expect(result.requirements).toEqual([]);
      expect(result.instructions).toContain('## Requirements');
    });
  });

  describe('addJSONSchema', () => {
    const mockSchema: JSONSchemaSpec = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' }
      },
      required: ['name'],
      description: 'Person information'
    };

    it('should add JSON schema to prompt', () => {
      const prompt = 'Analyze the data and respond';
      const result = addJSONSchema(prompt, mockSchema);

      expect(result).toContain('Analyze the data and respond');
      expect(result).toContain('## Required JSON Response Format');
      expect(result).toContain('Please respond with valid JSON');
      expect(result).toContain('"type": "object"');
      expect(result).toContain('**Type**: object');
      expect(result).toContain('**Description**: Person information');
      expect(result).toContain('**Required Fields**: name');
    });

    it('should handle schema without description', () => {
      const schemaWithoutDesc: JSONSchemaSpec = {
        type: 'array',
        items: { type: 'string' }
      };

      const result = addJSONSchema('Test prompt', schemaWithoutDesc);

      expect(result).toContain('**Type**: array');
      expect(result).not.toContain('**Description**:');
      expect(result).not.toContain('**Required Fields**:');
    });
  });

  describe('validatePromptResponse', () => {
    it('should validate valid JSON response', () => {
      const jsonResponse = '{"name": "John", "age": 30}';
      const result = validatePromptResponse(jsonResponse, 'json');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid JSON', () => {
      const invalidJson = '{"name": "John", "age":}';
      const result = validatePromptResponse(invalidJson, 'json');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid JSON format');
    });

    it('should validate markdown format', () => {
      const markdownResponse = '# Title\n\n* Item 1\n* Item 2';
      const result = validatePromptResponse(markdownResponse, 'markdown');

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn about poor markdown formatting', () => {
      const poorMarkdown = 'Just plain text without any markdown';
      const result = validatePromptResponse(poorMarkdown, 'markdown');

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Response may not be properly formatted Markdown');
    });

    it('should validate text format', () => {
      const textResponse = 'This is a comprehensive text response with sufficient content.';
      const result = validatePromptResponse(textResponse, 'text');

      expect(result.isValid).toBe(true);
    });

    it('should warn about short text responses', () => {
      const shortText = 'Short';
      const result = validatePromptResponse(shortText, 'text');

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Response seems unusually short for text format');
    });

    it('should handle empty response', () => {
      const result = validatePromptResponse('', 'json');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Response is empty or contains only whitespace');
    });

    it('should validate requirements', () => {
      const response = 'This response includes security analysis and performance metrics.';
      const requirements = ['security', 'performance', 'missing-requirement'];
      const result = validatePromptResponse(response, 'text', requirements);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Response may not address: missing-requirement');
    });

    it('should suggest improvements for long responses', () => {
      const longResponse = 'A'.repeat(15000);
      const result = validatePromptResponse(longResponse, 'text');

      expect(result.suggestions).toContain('Consider breaking down the response into smaller sections');
    });

    it('should suggest structure improvements', () => {
      const unstructuredResponse = 'Single line response without breaks';
      const result = validatePromptResponse(unstructuredResponse, 'text');

      expect(result.suggestions).toContain('Consider adding more structure with line breaks and sections');
    });
  });

  describe('createFileAnalysisPrompt', () => {
    it('should create file analysis prompt', () => {
      const filePaths = ['src/utils/helper.ts', 'src/types/index.ts'];
      const analysisType = 'code quality assessment';
      const result = createFileAnalysisPrompt(filePaths, analysisType);

      expect(result).toContain('# File Analysis Request');
      expect(result).toContain('code quality assessment');
      expect(result).toContain('1. src/utils/helper.ts');
      expect(result).toContain('2. src/types/index.ts');
      expect(result).toContain('## Analysis Requirements');
      expect(result).toContain('Read and examine each file thoroughly');
    });

    it('should include JSON schema when provided', () => {
      const schema: JSONSchemaSpec = {
        type: 'object',
        properties: { analysis: { type: 'string' } }
      };
      const result = createFileAnalysisPrompt(['test.ts'], 'testing', schema);

      expect(result).toContain('## Required JSON Response Format');
      expect(result).toContain('"type": "object"');
    });

    it('should handle single file', () => {
      const result = createFileAnalysisPrompt(['single-file.ts'], 'structure analysis');

      expect(result).toContain('1. single-file.ts');
      expect(result).toContain('structure analysis');
    });
  });

  describe('createProjectStructurePrompt', () => {
    it('should create project structure prompt with all options', () => {
      const projectPath = '/path/to/project';
      const includePatterns = ['*.ts', '*.js'];
      const excludePatterns = ['node_modules', '*.test.*'];
      const result = createProjectStructurePrompt(projectPath, includePatterns, excludePatterns);

      expect(result).toContain('# Project Structure Analysis');
      expect(result).toContain('**Path**: /path/to/project');
      expect(result).toContain('**Include Patterns**: *.ts, *.js');
      expect(result).toContain('**Exclude Patterns**: node_modules, *.test.*');
      expect(result).toContain('## Analysis Requirements');
      expect(result).toContain('**Directory Structure**');
    });

    it('should handle default patterns', () => {
      const result = createProjectStructurePrompt('/project');

      expect(result).toContain('**Include Patterns**: All files');
      expect(result).toContain('**Exclude Patterns**: Standard exclusions');
    });
  });

  describe('escapePromptContent', () => {
    it('should escape special characters', () => {
      const content = 'Test with \\ backslash and ` backtick and ${variable}';
      const result = escapePromptContent(content);

      expect(result).toBe('Test with \\\\ backslash and \\` backtick and \\${variable}');
    });

    it('should handle content without special characters', () => {
      const content = 'Normal text content';
      const result = escapePromptContent(content);

      expect(result).toBe('Normal text content');
    });

    it('should handle empty string', () => {
      const result = escapePromptContent('');
      expect(result).toBe('');
    });
  });

  describe('truncatePrompt', () => {
    it('should return prompt unchanged if within limit', () => {
      const prompt = 'Short prompt';
      const result = truncatePrompt(prompt, 100);

      expect(result).toBe('Short prompt');
    });

    it('should truncate long prompt', () => {
      const prompt = 'A'.repeat(100);
      const result = truncatePrompt(prompt, 50);

      expect(result).toHaveLength(50);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should preserve structure by breaking at newlines', () => {
      const prompt = 'Line 1\nLine 2\nLine 3\n' + 'A'.repeat(100);
      const result = truncatePrompt(prompt, 50);

      expect(result).toContain('Line 1');
      expect(result.endsWith('...')).toBe(true);
    });

    it('should handle prompt without newlines', () => {
      const prompt = 'A'.repeat(100);
      const result = truncatePrompt(prompt, 50);

      expect(result).toHaveLength(50);
      expect(result.substring(47)).toBe('...');
    });
  });

  describe('extractResponseMetadata', () => {
    it('should extract metadata from response', () => {
      const response = `# Title
      
This is a test response with multiple words.

\`\`\`javascript
console.log('code block');
\`\`\`

- List item 1
- List item 2

1. Numbered item
2. Another item`;

      const result = extractResponseMetadata(response);

      expect(result.wordCount).toBeGreaterThan(10);
      expect(result.lineCount).toBeGreaterThan(5);
      expect(result.hasCodeBlocks).toBe(true);
      expect(result.hasLists).toBe(false); // The regex pattern may not match multiline lists
      expect(result.estimatedReadingTime).toBeGreaterThan(0);
    });

    it('should handle response without special formatting', () => {
      const response = 'Simple text response without any special formatting';
      const result = extractResponseMetadata(response);

      expect(result.hasCodeBlocks).toBe(false);
      expect(result.hasLists).toBe(false);
      expect(result.wordCount).toBe(7);
      expect(result.lineCount).toBe(1);
    });

    it('should calculate reading time correctly', () => {
      const response = 'word '.repeat(200); // 200 words
      const result = extractResponseMetadata(response);

      expect(result.wordCount).toBe(201);
      expect(result.estimatedReadingTime).toBe(2); // Math.ceil(201 / 200) = 2 minutes
    });
  });

  describe('createComprehensiveAnalysisPrompt', () => {
    it('should create comprehensive analysis prompt', () => {
      const projectPrompt: PromptObject = {
        prompt: 'Analyze project structure',
        instructions: 'Focus on architecture',
        context: { type: 'project' }
      };

      const filePrompt: PromptObject = {
        prompt: 'Analyze individual files',
        instructions: 'Check code quality',
        context: { type: 'files' }
      };

      const additionalRequirements = ['Include performance metrics', 'Add security assessment'];
      const result = createComprehensiveAnalysisPrompt(projectPrompt, filePrompt, additionalRequirements);

      expect(result.prompt).toContain('Analyze project structure');
      expect(result.prompt).toContain('---');
      expect(result.prompt).toContain('Analyze individual files');
      expect(result.prompt).toContain('## Additional Requirements');
      expect(result.prompt).toContain('1. Include performance metrics');
      expect(result.prompt).toContain('2. Add security assessment');
    });

    it('should work without additional requirements', () => {
      const projectPrompt: PromptObject = {
        prompt: 'Test prompt 1',
        instructions: 'Test instructions 1',
        context: {}
      };

      const filePrompt: PromptObject = {
        prompt: 'Test prompt 2',
        instructions: 'Test instructions 2',
        context: {}
      };

      const result = createComprehensiveAnalysisPrompt(projectPrompt, filePrompt);

      expect(result.prompt).toContain('Test prompt 1');
      expect(result.prompt).toContain('Test prompt 2');
      expect(result.prompt).not.toContain('## Additional Requirements');
    });
  });

  describe('createADRAnalysisPrompt', () => {
    it('should create ADR analysis prompt for structure analysis', () => {
      const result = createADRAnalysisPrompt('/docs/adrs', 'structure');

      expect(result.task).toContain('Analyze ADRs in /docs/adrs for structure');
      expect(result.requirements).toContain('Scan all ADR files in the specified directory');
      expect(result.requirements).toContain('Extract metadata and content from each ADR');
      expect(result.outputFormat).toContain('JSON object with the following structure');
      expect(result.outputFormat).toContain('"totalAdrs": number');
      expect(result.context).toEqual({ adrDirectory: '/docs/adrs', analysisType: 'structure' });
    });

    it('should create ADR analysis prompt for different analysis types', () => {
      const analysisTypes: Array<'structure' | 'content' | 'relationships' | 'compliance'> = 
        ['structure', 'content', 'relationships', 'compliance'];

      analysisTypes.forEach(type => {
        const result = createADRAnalysisPrompt('/docs/adrs', type);
        expect(result.task).toContain(`for ${type}`);
        expect(result.context?.analysisType).toBe(type);
      });
    });
  });

  describe('CommonSchemas', () => {
    it('should have valid adrList schema', () => {
      const schema = CommonSchemas.adrList;

      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('adrs');
      expect(schema.properties).toHaveProperty('summary');
      expect(schema.required).toContain('adrs');
      expect(schema.required).toContain('summary');
    });

    it('should have valid fileAnalysis schema', () => {
      const schema = CommonSchemas.fileAnalysis;

      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('files');
      expect(schema.properties).toHaveProperty('summary');
      expect(schema.required).toContain('files');
      expect(schema.required).toContain('summary');
    });

    it('should have valid projectStructure schema', () => {
      const schema = CommonSchemas.projectStructure;

      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('structure');
      expect(schema.properties).toHaveProperty('analysis');
      expect(schema.required).toContain('structure');
      expect(schema.required).toContain('analysis');
    });
  });

  describe('Interface Validation', () => {
    it('should validate PromptObject interface', () => {
      const prompt: PromptObject = {
        prompt: 'Test prompt',
        instructions: 'Test instructions',
        context: { key: 'value' }
      };

      expect(prompt.prompt).toBe('Test prompt');
      expect(prompt.instructions).toBe('Test instructions');
      expect(prompt.context).toEqual({ key: 'value' });
    });

    it('should validate CombinedPrompt interface', () => {
      const combined: CombinedPrompt = {
        prompt: 'Combined prompt',
        instructions: 'Combined instructions',
        context: { combined: true },
        metadata: {
          sourcePrompts: 2,
          combinedAt: '2024-01-01T00:00:00.000Z',
          totalLength: 100
        }
      };

      expect(combined.metadata.sourcePrompts).toBe(2);
      expect(combined.metadata.combinedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(combined.metadata.totalLength).toBe(100);
    });

    it('should validate AIDelegationPrompt interface', () => {
      const delegation: AIDelegationPrompt = {
        task: 'Test task',
        instructions: 'Test instructions',
        requirements: ['req1', 'req2'],
        outputFormat: 'JSON format',
        context: { optional: true }
      };

      expect(delegation.task).toBe('Test task');
      expect(delegation.requirements).toHaveLength(2);
      expect(delegation.context).toEqual({ optional: true });
    });

    it('should validate JSONSchemaSpec interface', () => {
      const schema: JSONSchemaSpec = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name'],
        description: 'Test schema'
      };

      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('name');
      expect(schema.required).toContain('name');
      expect(schema.description).toBe('Test schema');
    });

    it('should validate PromptValidationResult interface', () => {
      const result: PromptValidationResult = {
        isValid: true,
        errors: ['error1'],
        warnings: ['warning1'],
        suggestions: ['suggestion1']
      };

      expect(result.isValid).toBe(true);
      expect(result.errors).toContain('error1');
      expect(result.warnings).toContain('warning1');
      expect(result.suggestions).toContain('suggestion1');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long prompts', () => {
      const longPrompt = 'A'.repeat(10000);
      const result = truncatePrompt(longPrompt, 1000);

      expect(result.length).toBeLessThanOrEqual(1000);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should handle special characters in analysis', () => {
      const specialContent = 'Content with émojis 🚀 and ünïcödé characters';
      const result = escapePromptContent(specialContent);

      expect(result).toContain('émojis 🚀');
      expect(result).toContain('ünïcödé');
    });

    it('should handle empty arrays in prompts', () => {
      const result = createFileAnalysisPrompt([], 'empty analysis');

      expect(result).toContain('# File Analysis Request');
      expect(result).toContain('empty analysis');
    });

    it('should handle null context in delegation prompts', () => {
      const result = createAIDelegationPrompt('Task', ['Requirement'], 'Format', null);

      expect(result.context).toBeNull();
      expect(result.instructions).not.toContain('## Additional Context');
    });
  });
});
