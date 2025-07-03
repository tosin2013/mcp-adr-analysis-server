/**
 * Prompt Composition Utilities for 100% Prompt-Driven Architecture
 * 
 * This module provides standardized utilities for composing prompts and implementing
 * AI delegation patterns across the MCP ADR Analysis Server.
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface PromptObject {
  prompt: string;
  instructions: string;
  context: any;
}

export interface CombinedPrompt {
  prompt: string;
  instructions: string;
  context: any;
  metadata: {
    sourcePrompts: number;
    combinedAt: string;
    totalLength: number;
  };
}

export interface AIDelegationPrompt {
  task: string;
  instructions: string;
  requirements: string[];
  outputFormat: string;
  context?: any;
}

export interface JSONSchemaSpec {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, any>;
  items?: any;
  required?: string[];
  description?: string;
}

export interface PromptValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// ============================================================================
// Core Prompt Composition Functions
// ============================================================================

/**
 * Combine multiple prompt objects into a single comprehensive prompt
 */
export function combinePrompts(...prompts: PromptObject[]): CombinedPrompt {
  if (prompts.length === 0) {
    throw new Error('At least one prompt is required for combination');
  }

  const combinedPrompt = prompts.map(p => p.prompt).join('\n\n---\n\n');
  const combinedInstructions = prompts.map(p => p.instructions).join('\n\n');
  
  // Merge context objects
  const combinedContext = prompts.reduce((acc, p) => ({ ...acc, ...p.context }), {});

  return {
    prompt: combinedPrompt,
    instructions: combinedInstructions,
    context: combinedContext,
    metadata: {
      sourcePrompts: prompts.length,
      combinedAt: new Date().toISOString(),
      totalLength: combinedPrompt.length + combinedInstructions.length,
    },
  };
}

/**
 * Create a standardized AI delegation prompt for specific tasks
 */
export function createAIDelegationPrompt(
  task: string,
  requirements: string[],
  outputFormat: string,
  context?: any
): AIDelegationPrompt {
  const instructions = `
# AI Task Delegation

Please complete the following task with precision and attention to detail.

## Task Description
${task}

## Requirements
${requirements.map((req, index) => `${index + 1}. ${req}`).join('\n')}

## Expected Output Format
${outputFormat}

${context ? `## Additional Context\n${JSON.stringify(context, null, 2)}` : ''}

## Quality Standards
- Ensure all requirements are met
- Follow the specified output format exactly
- Provide clear and actionable results
- Include relevant details and explanations
`;

  return {
    task,
    instructions,
    requirements,
    outputFormat,
    context,
  };
}

/**
 * Add JSON schema specification to a prompt for structured responses
 */
export function addJSONSchema(prompt: string, schema: JSONSchemaSpec): string {
  const schemaSection = `
## Required JSON Response Format

Please respond with valid JSON that conforms to the following schema:

\`\`\`json
${JSON.stringify(schema, null, 2)}
\`\`\`

### Schema Requirements:
- **Type**: ${schema.type}
${schema.description ? `- **Description**: ${schema.description}` : ''}
${schema.required ? `- **Required Fields**: ${schema.required.join(', ')}` : ''}

### Response Validation:
- Ensure the response is valid JSON
- All required fields must be present
- Field types must match the schema
- Follow naming conventions consistently
`;

  return `${prompt}\n\n${schemaSection}`;
}

/**
 * Validate AI response against expected format and requirements
 */
export function validatePromptResponse(
  response: string,
  expectedFormat: 'json' | 'markdown' | 'text',
  requirements?: string[]
): PromptValidationResult {
  const result: PromptValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  // Basic validation
  if (!response || response.trim().length === 0) {
    result.isValid = false;
    result.errors.push('Response is empty or contains only whitespace');
    return result;
  }

  // Format-specific validation
  switch (expectedFormat) {
    case 'json':
      try {
        JSON.parse(response);
      } catch (error) {
        result.isValid = false;
        result.errors.push(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      break;
    
    case 'markdown':
      if (!response.includes('#') && !response.includes('*') && !response.includes('-')) {
        result.warnings.push('Response may not be properly formatted Markdown');
      }
      break;
    
    case 'text':
      if (response.length < 10) {
        result.warnings.push('Response seems unusually short for text format');
      }
      break;
  }

  // Requirements validation
  if (requirements) {
    const missingRequirements = requirements.filter(req => 
      !response.toLowerCase().includes(req.toLowerCase())
    );
    
    if (missingRequirements.length > 0) {
      result.warnings.push(`Response may not address: ${missingRequirements.join(', ')}`);
    }
  }

  // Quality suggestions
  if (response.length > 10000) {
    result.suggestions.push('Consider breaking down the response into smaller sections');
  }
  
  if (response.split('\n').length < 3) {
    result.suggestions.push('Consider adding more structure with line breaks and sections');
  }

  return result;
}

// ============================================================================
// Specialized Prompt Builders
// ============================================================================

/**
 * Create a file analysis prompt with standardized structure
 */
export function createFileAnalysisPrompt(
  filePaths: string[],
  analysisType: string,
  outputSchema?: JSONSchemaSpec
): string {
  let prompt = `
# File Analysis Request

Please analyze the following files for ${analysisType}.

## Files to Analyze
${filePaths.map((path, index) => `${index + 1}. ${path}`).join('\n')}

## Analysis Requirements
1. Read and examine each file thoroughly
2. Extract relevant information based on the analysis type
3. Identify patterns, structures, and key elements
4. Provide comprehensive insights and findings
5. Ensure accuracy and completeness in the analysis

## Analysis Focus: ${analysisType}

Please provide detailed analysis results with clear explanations and evidence.
`;

  if (outputSchema) {
    prompt = addJSONSchema(prompt, outputSchema);
  }

  return prompt;
}

/**
 * Create a project structure analysis prompt
 */
export function createProjectStructurePrompt(
  projectPath: string,
  includePatterns: string[] = [],
  excludePatterns: string[] = []
): string {
  return `
# Project Structure Analysis

Please analyze the project structure and provide comprehensive insights.

## Project Information
- **Path**: ${projectPath}
- **Include Patterns**: ${includePatterns.length > 0 ? includePatterns.join(', ') : 'All files'}
- **Exclude Patterns**: ${excludePatterns.length > 0 ? excludePatterns.join(', ') : 'Standard exclusions (node_modules, .git, etc.)'}

## Analysis Requirements
1. **Directory Structure**: Map the overall project organization
2. **File Types**: Identify and categorize different file types
3. **Dependencies**: Analyze package files and dependency structures
4. **Architecture Patterns**: Identify architectural patterns and conventions
5. **Code Organization**: Assess code organization and module structure
6. **Configuration Files**: Examine configuration and setup files

## Expected Deliverables
- Complete directory tree structure
- File type distribution and statistics
- Dependency analysis and recommendations
- Architecture pattern identification
- Code quality and organization assessment
- Configuration and setup analysis

Please provide thorough analysis with actionable insights.
`;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Escape special characters in prompts for safe processing
 */
export function escapePromptContent(content: string): string {
  return content
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\${/g, '\\${');
}

/**
 * Truncate prompt content to specified length while preserving structure
 */
export function truncatePrompt(prompt: string, maxLength: number): string {
  if (prompt.length <= maxLength) {
    return prompt;
  }

  const truncated = prompt.substring(0, maxLength - 3);
  const lastNewline = truncated.lastIndexOf('\n');
  
  if (lastNewline > maxLength * 0.8) {
    return truncated.substring(0, lastNewline) + '\n...';
  }
  
  return truncated + '...';
}

/**
 * Extract metadata from prompt responses
 */
export function extractResponseMetadata(response: string): {
  wordCount: number;
  lineCount: number;
  hasCodeBlocks: boolean;
  hasLists: boolean;
  estimatedReadingTime: number;
} {
  const wordCount = response.split(/\s+/).length;
  const lineCount = response.split('\n').length;
  const hasCodeBlocks = /```/.test(response);
  const hasLists = /^[\s]*[-*+]\s/.test(response) || /^[\s]*\d+\.\s/.test(response);
  const estimatedReadingTime = Math.ceil(wordCount / 200); // 200 words per minute

  return {
    wordCount,
    lineCount,
    hasCodeBlocks,
    hasLists,
    estimatedReadingTime,
  };
}

// ============================================================================
// Example Usage and Templates
// ============================================================================

/**
 * Example: Combining multiple prompts for comprehensive analysis
 */
export function createComprehensiveAnalysisPrompt(
  projectPrompt: PromptObject,
  filePrompt: PromptObject,
  additionalRequirements: string[] = []
): CombinedPrompt {
  const combined = combinePrompts(projectPrompt, filePrompt);

  if (additionalRequirements.length > 0) {
    combined.prompt += `\n\n## Additional Requirements\n${additionalRequirements.map((req, i) => `${i + 1}. ${req}`).join('\n')}`;
  }

  return combined;
}

/**
 * Example: Creating a standardized ADR analysis prompt
 */
export function createADRAnalysisPrompt(
  adrDirectory: string,
  analysisType: 'structure' | 'content' | 'relationships' | 'compliance'
): AIDelegationPrompt {
  const requirements = [
    'Scan all ADR files in the specified directory',
    'Extract metadata and content from each ADR',
    'Analyze according to the specified analysis type',
    'Provide structured results with clear categorization',
    'Include recommendations for improvements',
  ];

  const outputFormat = `
JSON object with the following structure:
{
  "summary": {
    "totalAdrs": number,
    "analysisType": string,
    "completedAt": string
  },
  "findings": [
    {
      "adrId": string,
      "title": string,
      "analysis": object,
      "recommendations": string[]
    }
  ],
  "overallRecommendations": string[]
}`;

  return createAIDelegationPrompt(
    `Analyze ADRs in ${adrDirectory} for ${analysisType}`,
    requirements,
    outputFormat,
    { adrDirectory, analysisType }
  );
}

/**
 * Common JSON schemas for MCP responses
 */
export const CommonSchemas = {
  adrList: {
    type: 'object' as const,
    properties: {
      adrs: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            status: { type: 'string' },
            date: { type: 'string' },
            filePath: { type: 'string' },
          },
          required: ['id', 'title', 'status', 'date', 'filePath'],
        },
      },
      summary: {
        type: 'object',
        properties: {
          total: { type: 'number' },
          byStatus: { type: 'object' },
        },
      },
    },
    required: ['adrs', 'summary'],
  },

  fileAnalysis: {
    type: 'object' as const,
    properties: {
      files: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            type: { type: 'string' },
            size: { type: 'number' },
            analysis: { type: 'object' },
          },
          required: ['path', 'type', 'analysis'],
        },
      },
      summary: {
        type: 'object',
        properties: {
          totalFiles: { type: 'number' },
          fileTypes: { type: 'object' },
          insights: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    required: ['files', 'summary'],
  },

  projectStructure: {
    type: 'object' as const,
    properties: {
      structure: {
        type: 'object',
        properties: {
          directories: { type: 'array', items: { type: 'string' } },
          files: { type: 'array', items: { type: 'string' } },
          totalFiles: { type: 'number' },
          totalDirectories: { type: 'number' },
        },
      },
      analysis: {
        type: 'object',
        properties: {
          patterns: { type: 'array', items: { type: 'string' } },
          technologies: { type: 'array', items: { type: 'string' } },
          recommendations: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    required: ['structure', 'analysis'],
  },
} as const;
