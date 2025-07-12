/**
 * MCP Tool for content masking and sensitive information detection
 * Implements prompt-driven security analysis
 * Enhanced with Generated Knowledge Prompting (GKP) for security and privacy expertise
 */

import { McpAdrError } from '../types/index.js';

/**
 * Analyze content for sensitive information
 * Enhanced with Generated Knowledge Prompting for security and privacy expertise
 */
export async function analyzeContentSecurity(args: {
  content: string;
  contentType?: 'code' | 'documentation' | 'configuration' | 'logs' | 'general';
  userDefinedPatterns?: string[];
  knowledgeEnhancement?: boolean; // Enable GKP for security and privacy knowledge
  enhancedMode?: boolean; // Enable advanced prompting features
}): Promise<any> {
  const { 
    content, 
    contentType = 'general', 
    userDefinedPatterns,
    knowledgeEnhancement = true, // Default to GKP enabled
    enhancedMode = true // Default to enhanced mode
  } = args;

  try {
    const { analyzeSensitiveContent } = await import('../utils/content-masking.js');

    if (!content || content.trim().length === 0) {
      throw new McpAdrError('Content is required for security analysis', 'INVALID_INPUT');
    }

    let enhancedPrompt = '';
    let knowledgeContext = '';
    
    // Generate security and privacy knowledge if enabled
    if (enhancedMode && knowledgeEnhancement) {
      try {
        const { generateArchitecturalKnowledge } = await import('../utils/knowledge-generation.js');
        const knowledgeResult = await generateArchitecturalKnowledge({
          projectPath: process.cwd(),
          technologies: [],
          patterns: [],
          projectType: 'security-content-analysis'
        }, {
          domains: ['security-patterns'],
          depth: 'intermediate',
          cacheEnabled: true
        });

        knowledgeContext = `\n## Security & Privacy Knowledge Enhancement\n\n${knowledgeResult.prompt}\n\n---\n`;
      } catch (error) {
        console.error('[WARNING] GKP knowledge generation failed for content security analysis:', error);
        knowledgeContext = '<!-- Security knowledge generation unavailable -->\n';
      }
    }

    const result = await analyzeSensitiveContent(content, contentType, userDefinedPatterns);
    enhancedPrompt = knowledgeContext + result.analysisPrompt;

    // Execute the security analysis with AI if enabled, otherwise return prompt
    const { executePromptWithFallback, formatMCPResponse } = await import('../utils/prompt-execution.js');
    const executionResult = await executePromptWithFallback(
      enhancedPrompt,
      result.instructions,
      {
        temperature: 0.1,
        maxTokens: 4000,
        systemPrompt: `You are a cybersecurity expert specializing in sensitive information detection.
Analyze the provided content to identify potential security risks, secrets, and sensitive data.
Leverage the provided cybersecurity and data privacy knowledge to create comprehensive, industry-standard analysis.
Provide detailed findings with confidence scores and practical remediation recommendations.
Consider regulatory compliance requirements, data classification standards, and modern security practices.
Focus on actionable security insights that can prevent data exposure and ensure compliance.`,
        responseFormat: 'text'
      }
    );

    if (executionResult.isAIGenerated) {
      // AI execution successful - return actual security analysis results
      return formatMCPResponse({
        ...executionResult,
        content: `# Content Security Analysis Results (GKP Enhanced)

## Enhancement Features
- **Generated Knowledge Prompting**: ${knowledgeEnhancement ? '✅ Enabled' : '❌ Disabled'}
- **Enhanced Mode**: ${enhancedMode ? '✅ Enabled' : '❌ Disabled'}
- **Knowledge Domains**: Cybersecurity, data privacy, regulatory compliance, secret management

## Analysis Information
- **Content Type**: ${contentType}

${knowledgeContext ? `## Applied Security Knowledge

${knowledgeContext}
` : ''}
- **Content Length**: ${content.length} characters
- **User-Defined Patterns**: ${userDefinedPatterns?.length || 0} patterns

## AI Security Analysis

${executionResult.content}

## Next Steps

Based on the security analysis:

1. **Review Identified Issues**: Examine each flagged item for actual sensitivity
2. **Apply Recommended Masking**: Use suggested masking strategies for sensitive content
3. **Update Security Policies**: Incorporate findings into security guidelines
4. **Implement Monitoring**: Set up detection for similar patterns in the future
5. **Train Team**: Share findings to improve security awareness

## Remediation Commands

To apply masking to identified sensitive content, use the \`generate_content_masking\` tool with the detected items.
`,
      });
    } else {
      // Fallback to prompt-only mode
      return {
        content: [
          {
            type: 'text',
            text: `# Sensitive Content Analysis (GKP Enhanced)\n\n## Enhancement Status\n- **Generated Knowledge Prompting**: ${knowledgeEnhancement ? '\u2705 Applied' : '\u274c Disabled'}\n- **Enhanced Mode**: ${enhancedMode ? '\u2705 Applied' : '\u274c Disabled'}\n\n${knowledgeContext ? `## Security Knowledge Context\n\n${knowledgeContext}\n` : ''}\n\n${result.instructions}\n\n## Enhanced AI Analysis Prompt\n\n${enhancedPrompt}`,
          },
        ],
      };
    }
  } catch (error) {
    throw new McpAdrError(
      `Failed to analyze content security: ${error instanceof Error ? error.message : String(error)}`,
      'ANALYSIS_ERROR'
    );
  }
}

/**
 * Generate masking instructions for detected sensitive content
 * Enhanced with Generated Knowledge Prompting for security and privacy expertise
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
  knowledgeEnhancement?: boolean; // Enable GKP for security and privacy knowledge
  enhancedMode?: boolean; // Enable advanced prompting features
}): Promise<any> {
  const { 
    content, 
    detectedItems, 
    maskingStrategy = 'full'
  } = args;

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

    // Execute the content masking with AI if enabled, otherwise return prompt
    const { executePromptWithFallback, formatMCPResponse } = await import('../utils/prompt-execution.js');
    const executionResult = await executePromptWithFallback(
      result.maskingPrompt,
      result.instructions,
      {
        temperature: 0.1,
        maxTokens: 4000,
        systemPrompt: `You are a cybersecurity expert specializing in intelligent content masking.
Apply appropriate masking to sensitive content while preserving functionality and readability.
Focus on balancing security with usability, maintaining context where possible.
Provide detailed explanations for masking decisions and security recommendations.`,
        responseFormat: 'text'
      }
    );

    if (executionResult.isAIGenerated) {
      // AI execution successful - return actual content masking results
      return formatMCPResponse({
        ...executionResult,
        content: `# Content Masking Results

## Masking Information
- **Content Length**: ${content.length} characters
- **Detected Items**: ${detectedItems.length} sensitive items
- **Masking Strategy**: ${maskingStrategy}

## AI Content Masking Results

${executionResult.content}

## Next Steps

Based on the masking results:

1. **Review Masked Content**: Examine the masked content for accuracy and completeness
2. **Validate Functionality**: Ensure masked content still functions as intended
3. **Apply to Production**: Use the masked content in documentation or sharing
4. **Update Security Policies**: Incorporate findings into security guidelines
5. **Monitor for Similar Patterns**: Set up detection for similar sensitive content

## Security Benefits

The applied masking provides:
- **Data Protection**: Sensitive information is properly redacted
- **Context Preservation**: Enough context remains for understanding
- **Consistent Approach**: Uniform masking patterns across content
- **Compliance Support**: Helps meet data protection requirements
- **Usability Balance**: Security without sacrificing functionality
`,
      });
    } else {
      // Fallback to prompt-only mode
      return {
        content: [
          {
            type: 'text',
            text: `# Content Masking Instructions\n\n${result.instructions}\n\n## AI Masking Prompt\n\n${result.maskingPrompt}`,
          },
        ],
      };
    }
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
    // Use actual file operations to scan project structure
    const { scanProjectStructure } = await import('../utils/actual-file-operations.js');

    // Actually scan project structure
    const projectStructure = await scanProjectStructure(projectPath, { readContent: true, maxFileSize: 10000 });

    const customPatternPrompt = `
# Custom Pattern Configuration Generation

Based on actual project structure analysis, here are the findings:

## Project Structure
- **Root Path**: ${projectStructure.rootPath}
- **Total Files**: ${projectStructure.totalFiles}
- **Directories**: ${projectStructure.directories.join(', ')}

## Package Management Files
${projectStructure.packageFiles.length > 0 ? 
  projectStructure.packageFiles.map(f => `
### ${f.filename}
\`\`\`
${f.content.slice(0, 500)}${f.content.length > 500 ? '\n... (truncated)' : ''}
\`\`\`
`).join('\n') : '- No package files found'}

## Environment Configuration Files
${projectStructure.environmentFiles.length > 0 ? 
  projectStructure.environmentFiles.map(f => `
### ${f.filename}
\`\`\`
${f.content.slice(0, 300)}${f.content.length > 300 ? '\n... (truncated)' : ''}
\`\`\`
`).join('\n') : '- No environment files found'}

## Configuration Files
${projectStructure.configFiles.length > 0 ? 
  projectStructure.configFiles.map(f => `
### ${f.filename}
\`\`\`
${f.content.slice(0, 300)}${f.content.length > 300 ? '\n... (truncated)' : ''}
\`\`\`
`).join('\n') : '- No config files found'}

## Script Files
${projectStructure.scriptFiles.length > 0 ? 
  projectStructure.scriptFiles.map(f => `
### ${f.filename}
\`\`\`
${f.content.slice(0, 400)}${f.content.length > 400 ? '\n... (truncated)' : ''}
\`\`\`
`).join('\n') : '- No script files found'}

## Existing Patterns Context

${existingPatterns ? `
### Current Patterns (${existingPatterns.length})
${existingPatterns.map((pattern, index) => `
#### ${index + 1}. ${pattern}
`).join('')}
` : 'No existing patterns provided.'}

## Pattern Generation Requirements

1. **Analyze project-specific content types** that need masking based on actual file content
2. **Identify sensitive data patterns** in code and documentation shown above
3. **Generate regex patterns** for consistent content masking
4. **Create appropriate replacements** that maintain context
5. **Ensure patterns don't conflict** with existing ones
6. **Provide clear descriptions** for each pattern

## Required Output Format

Please provide custom pattern configuration in JSON format:
\`\`\`json
{
  "patterns": [
    {
      "name": "pattern-name",
      "pattern": "regex-pattern",
      "replacement": "replacement-text",
      "description": "pattern-description",
      "category": "pattern-category"
    }
  ],
  "recommendations": ["list", "of", "recommendations"],
  "conflicts": ["any", "potential", "conflicts"]
}
\`\`\`
`;

    const instructions = `
# Custom Pattern Configuration Instructions

This analysis provides **actual project file contents** for comprehensive pattern generation.

## Analysis Scope
- **Project Path**: ${projectPath}
- **Package Files**: ${projectStructure.packageFiles.length} found
- **Environment Files**: ${projectStructure.environmentFiles.length} found
- **Config Files**: ${projectStructure.configFiles.length} found
- **Script Files**: ${projectStructure.scriptFiles.length} found
- **Total Files Analyzed**: ${projectStructure.totalFiles}
- **Existing Patterns**: ${existingPatterns?.length || 0} patterns

## Next Steps
1. **Submit the configuration prompt** to an AI agent for pattern analysis
2. **Parse the JSON response** to get custom patterns and recommendations
3. **Review generated patterns** for accuracy and completeness
4. **Implement patterns** in the content masking system

## Expected AI Response Format
The AI will return a JSON object with:
- \`patterns\`: Array of custom pattern configurations
- \`recommendations\`: Best practices and implementation guidance
- \`conflicts\`: Potential conflicts with existing patterns

## Usage Example
\`\`\`typescript
const result = await configureCustomPatterns({ projectPath, existingPatterns });
// Submit result.configurationPrompt to AI agent
// Parse AI response for custom pattern configuration
\`\`\`
`;

    const result = {
      configurationPrompt: customPatternPrompt,
      instructions,
      actualData: {
        projectStructure,
        summary: {
          totalFiles: projectStructure.totalFiles,
          packageFiles: projectStructure.packageFiles.length,
          environmentFiles: projectStructure.environmentFiles.length,
          configFiles: projectStructure.configFiles.length,
          scriptFiles: projectStructure.scriptFiles.length
        }
      }
    };

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
