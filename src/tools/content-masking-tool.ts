/**
 * MCP Tool for content masking and sensitive information detection
 * Implements prompt-driven security analysis
 */

import { McpAdrError } from '../types/index.js';

/**
 * Analyze content for sensitive information
 */
export async function analyzeContentSecurity(args: {
  content: string;
  contentType?: 'code' | 'documentation' | 'configuration' | 'logs' | 'general';
  userDefinedPatterns?: string[];
}): Promise<any> {
  const { content, contentType = 'general', userDefinedPatterns } = args;

  try {
    const { analyzeSensitiveContent } = await import('../utils/content-masking.js');

    if (!content || content.trim().length === 0) {
      throw new McpAdrError('Content is required for security analysis', 'INVALID_INPUT');
    }

    const result = await analyzeSensitiveContent(content, contentType, userDefinedPatterns);

    return {
      content: [
        {
          type: 'text',
          text: `# Sensitive Content Analysis\n\n${result.instructions}\n\n## AI Analysis Prompt\n\n${result.analysisPrompt}`,
        },
      ],
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to analyze content security: ${error instanceof Error ? error.message : String(error)}`,
      'ANALYSIS_ERROR'
    );
  }
}

/**
 * Generate masking instructions for detected sensitive content
 */
export async function generateContentMasking(args: {
  content: string;
  detectedItems: Array<{
    type: string;
    category?: string;
    content: string;
    startPosition: number;
    endPosition: number;
    confidence?: number;
    reasoning?: string;
    severity: string;
    suggestedMask?: string;
  }>;
  maskingStrategy?: 'full' | 'partial' | 'placeholder' | 'environment';
}): Promise<any> {
  const { content, detectedItems, maskingStrategy = 'full' } = args;

  try {
    const { generateMaskingInstructions } = await import('../utils/content-masking.js');

    if (!content || content.trim().length === 0) {
      throw new McpAdrError('Content is required for masking', 'INVALID_INPUT');
    }

    if (!detectedItems || detectedItems.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No sensitive items detected. Content does not require masking.',
          },
        ],
      };
    }

    // Convert to SensitiveItem format
    const sensitiveItems = detectedItems.map(item => ({
      type: item.type,
      category: item.category || 'unknown',
      content: item.content,
      startPosition: item.startPosition,
      endPosition: item.endPosition,
      confidence: item.confidence || 0.8,
      reasoning: item.reasoning || 'Detected by user input',
      severity: item.severity as 'low' | 'medium' | 'high' | 'critical',
      suggestedMask: item.suggestedMask || '[REDACTED]',
    }));

    const result = await generateMaskingInstructions(content, sensitiveItems, maskingStrategy);

    return {
      content: [
        {
          type: 'text',
          text: `# Content Masking Instructions\n\n${result.instructions}\n\n## AI Masking Prompt\n\n${result.maskingPrompt}`,
        },
      ],
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate masking instructions: ${error instanceof Error ? error.message : String(error)}`,
      'MASKING_ERROR'
    );
  }
}

/**
 * Configure custom sensitive patterns for a project
 */
export async function configureCustomPatterns(args: {
  projectPath: string;
  existingPatterns?: string[];
}): Promise<any> {
  const { projectPath, existingPatterns } = args;

  try {
    const { analyzeProjectStructure } = await import('../utils/file-system.js');
    const { generateAnalysisContext } = await import('../prompts/analysis-prompts.js');
    const { generateCustomPatternConfiguration } = await import('../utils/content-masking.js');

    // Analyze project structure for context
    const projectStructure = await analyzeProjectStructure(projectPath);
    const projectContext = generateAnalysisContext(projectStructure);

    const result = await generateCustomPatternConfiguration(projectContext, existingPatterns);

    return {
      content: [
        {
          type: 'text',
          text: `# Custom Pattern Configuration\n\n${result.instructions}\n\n## AI Configuration Prompt\n\n${result.configurationPrompt}`,
        },
      ],
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to configure custom patterns: ${error instanceof Error ? error.message : String(error)}`,
      'CONFIGURATION_ERROR'
    );
  }
}

/**
 * Apply basic masking (fallback when AI is not available)
 */
export async function applyBasicContentMasking(args: {
  content: string;
  maskingStrategy?: 'full' | 'partial' | 'placeholder';
}): Promise<any> {
  const { content, maskingStrategy = 'full' } = args;

  try {
    const { applyBasicMasking, validateMasking } = await import('../utils/content-masking.js');

    if (!content || content.trim().length === 0) {
      throw new McpAdrError('Content is required for masking', 'INVALID_INPUT');
    }

    const maskedContent = applyBasicMasking(content, maskingStrategy);
    const validation = validateMasking(content, maskedContent);

    return {
      content: [
        {
          type: 'text',
          text: `# Basic Content Masking Applied

## Masking Strategy
${maskingStrategy}

## Original Content Length
${content.length} characters

## Masked Content
\`\`\`
${maskedContent}
\`\`\`

## Validation Results
- **Security Score**: ${(validation.securityScore * 100).toFixed(1)}%
- **Is Valid**: ${validation.isValid ? '✅ Yes' : '❌ No'}

${
  validation.issues.length > 0
    ? `## Issues Found
${validation.issues.map(issue => `- ${issue}`).join('\n')}`
    : '## ✅ No Issues Found'
}

## Recommendations
- For better security analysis, use AI-powered detection with \`analyze_content_security\`
- Consider using custom patterns for project-specific sensitive information
- Review masked content to ensure it maintains necessary functionality
`,
        },
      ],
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to apply basic masking: ${error instanceof Error ? error.message : String(error)}`,
      'MASKING_ERROR'
    );
  }
}

/**
 * Validate that content masking was applied correctly
 */
export async function validateContentMasking(args: {
  originalContent: string;
  maskedContent: string;
}): Promise<any> {
  const { originalContent, maskedContent } = args;

  try {
    const { validateMasking } = await import('../utils/content-masking.js');

    if (!originalContent || !maskedContent) {
      throw new McpAdrError('Both original and masked content are required', 'INVALID_INPUT');
    }

    const validation = validateMasking(originalContent, maskedContent);

    return {
      content: [
        {
          type: 'text',
          text: `# Content Masking Validation

## Validation Results
- **Security Score**: ${(validation.securityScore * 100).toFixed(1)}%
- **Is Valid**: ${validation.isValid ? '✅ Yes' : '❌ No'}

## Content Comparison
- **Original Length**: ${originalContent.length} characters
- **Masked Length**: ${maskedContent.length} characters
- **Size Change**: ${((maskedContent.length / originalContent.length - 1) * 100).toFixed(1)}%

${
  validation.issues.length > 0
    ? `## ⚠️ Issues Found
${validation.issues.map(issue => `- ${issue}`).join('\n')}

## Recommendations
- Review the masking process to address identified issues
- Consider using more comprehensive AI-powered masking
- Ensure all sensitive patterns are properly detected and masked`
    : '## ✅ Validation Passed'
}

## Security Assessment
${
  validation.securityScore >= 0.9
    ? '🟢 **Excellent**: Content appears to be properly masked'
    : validation.securityScore >= 0.7
      ? '🟡 **Good**: Minor issues detected, review recommended'
      : validation.securityScore >= 0.5
        ? '🟠 **Fair**: Several issues found, masking needs improvement'
        : '🔴 **Poor**: Significant security issues, masking failed'
}
`,
        },
      ],
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to validate masking: ${error instanceof Error ? error.message : String(error)}`,
      'VALIDATION_ERROR'
    );
  }
}
