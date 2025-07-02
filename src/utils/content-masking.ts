/**
 * Content masking utilities using prompt-driven AI analysis
 * Implements intelligent sensitive content detection and masking
 */

import { McpAdrError } from '../types/index.js';

export interface SensitiveItem {
  type: string;
  category: string;
  content: string;
  startPosition: number;
  endPosition: number;
  confidence: number;
  reasoning: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedMask: string;
}

export interface SensitiveContentAnalysis {
  hasSensitiveContent: boolean;
  detectedItems: SensitiveItem[];
  recommendations: string[];
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
}

export interface MaskingResult {
  maskedContent: string;
  maskingApplied: Array<{
    originalContent: string;
    maskedWith: string;
    position: string;
    reason: string;
  }>;
  preservedStructure: boolean;
  readabilityScore: number;
  securityScore: number;
  recommendations: string[];
}

export interface CustomPattern {
  name: string;
  description: string;
  regex: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  examples: string[];
  falsePositives: string[];
  maskingStrategy: 'full' | 'partial' | 'placeholder' | 'environment';
}

/**
 * Analyze content for sensitive information using AI prompts
 */
export async function analyzeSensitiveContent(
  content: string,
  contentType: 'code' | 'documentation' | 'configuration' | 'logs' | 'general' = 'general',
  userDefinedPatterns?: string[]
): Promise<{ analysisPrompt: string; instructions: string }> {
  try {
    const { generateSensitiveContentDetectionPrompt } = await import(
      '../prompts/security-prompts.js'
    );

    const analysisPrompt = generateSensitiveContentDetectionPrompt(
      content,
      contentType,
      userDefinedPatterns
    );

    const instructions = `
# Sensitive Content Analysis Instructions

This analysis will help identify sensitive information that should be masked or redacted.

## Next Steps:
1. **Review the generated prompt** for sensitive content detection
2. **Submit the prompt to an AI agent** for analysis
3. **Parse the JSON response** to get detected sensitive items
4. **Apply appropriate masking** based on the results

## Expected AI Response Format:
The AI will return a JSON object with:
- \`hasSensitiveContent\`: boolean indicating if sensitive content was found
- \`detectedItems\`: array of sensitive items with positions and severity
- \`recommendations\`: security recommendations
- \`overallRisk\`: risk assessment (low/medium/high/critical)

## Usage Example:
\`\`\`typescript
const result = await analyzeSensitiveContent(fileContent, 'code');
// Submit result.analysisPrompt to AI agent
// Parse AI response as SensitiveContentAnalysis
\`\`\`
`;

    return {
      analysisPrompt,
      instructions,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate sensitive content analysis: ${error instanceof Error ? error.message : String(error)}`,
      'ANALYSIS_ERROR'
    );
  }
}

/**
 * Generate content masking prompt for AI processing
 */
export async function generateMaskingInstructions(
  content: string,
  detectedSensitiveItems: SensitiveItem[],
  maskingStrategy: 'full' | 'partial' | 'placeholder' | 'environment' = 'full'
): Promise<{ maskingPrompt: string; instructions: string }> {
  try {
    const { generateContentMaskingPrompt } = await import('../prompts/security-prompts.js');

    const maskingPrompt = generateContentMaskingPrompt(
      content,
      detectedSensitiveItems,
      maskingStrategy
    );

    const instructions = `
# Content Masking Instructions

This will apply intelligent masking to content based on detected sensitive information.

## Masking Strategy: ${maskingStrategy}

## Next Steps:
1. **Review the generated masking prompt**
2. **Submit to AI agent** for intelligent masking
3. **Parse the JSON response** to get masked content
4. **Validate the results** for security and usability

## Expected AI Response Format:
The AI will return a JSON object with:
- \`maskedContent\`: the content with sensitive information masked
- \`maskingApplied\`: details of what was masked and how
- \`readabilityScore\`: how readable the masked content remains
- \`securityScore\`: how secure the masking is

## Usage Example:
\`\`\`typescript
const result = await generateMaskingInstructions(content, sensitiveItems, 'partial');
// Submit result.maskingPrompt to AI agent
// Parse AI response as MaskingResult
\`\`\`
`;

    return {
      maskingPrompt,
      instructions,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate masking instructions: ${error instanceof Error ? error.message : String(error)}`,
      'MASKING_ERROR'
    );
  }
}

/**
 * Generate custom pattern configuration prompt
 */
export async function generateCustomPatternConfiguration(
  projectContext: string,
  existingPatterns?: string[]
): Promise<{ configurationPrompt: string; instructions: string }> {
  try {
    const { generateCustomPatternConfigurationPrompt } = await import(
      '../prompts/security-prompts.js'
    );

    const configurationPrompt = generateCustomPatternConfigurationPrompt(
      projectContext,
      existingPatterns
    );

    const instructions = `
# Custom Pattern Configuration Instructions

This will help configure project-specific sensitive information patterns.

## Next Steps:
1. **Review the generated configuration prompt**
2. **Submit to AI agent** for pattern recommendations
3. **Parse the JSON response** to get custom patterns
4. **Integrate patterns** into the detection system

## Expected AI Response Format:
The AI will return a JSON object with:
- \`customPatterns\`: array of project-specific patterns
- \`recommendations\`: additional security recommendations
- \`integrationNotes\`: notes on pattern integration

## Usage Example:
\`\`\`typescript
const result = await generateCustomPatternConfiguration(projectInfo);
// Submit result.configurationPrompt to AI agent
// Parse AI response to get CustomPattern[]
\`\`\`
`;

    return {
      configurationPrompt,
      instructions,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate pattern configuration: ${error instanceof Error ? error.message : String(error)}`,
      'CONFIGURATION_ERROR'
    );
  }
}

/**
 * Apply basic masking patterns (fallback when AI is not available)
 */
export function applyBasicMasking(
  content: string,
  maskingStrategy: 'full' | 'partial' | 'placeholder' = 'full'
): string {
  // Basic patterns for common sensitive information
  const patterns = [
    // API Keys
    {
      pattern: /sk-[a-zA-Z0-9]{32,}/g,
      replacement: maskingStrategy === 'partial' ? 'sk-...****' : '[API_KEY_REDACTED]',
    },
    {
      pattern: /ghp_[a-zA-Z0-9]{36}/g,
      replacement: maskingStrategy === 'partial' ? 'ghp_...****' : '[GITHUB_TOKEN_REDACTED]',
    },

    // AWS Keys
    {
      pattern: /AKIA[0-9A-Z]{16}/g,
      replacement: maskingStrategy === 'partial' ? 'AKIA...****' : '[AWS_ACCESS_KEY_REDACTED]',
    },

    // Email addresses
    {
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      replacement: maskingStrategy === 'partial' ? '***@***.***' : '[EMAIL_REDACTED]',
    },

    // IP Addresses (private ranges)
    {
      pattern: /\b(?:10\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|192\.168\.)\d{1,3}\.\d{1,3}\b/g,
      replacement: '[IP_ADDRESS_REDACTED]',
    },

    // Common password patterns
    {
      pattern: /password\s*[:=]\s*["']?[^"'\s]+["']?/gi,
      replacement: 'password=[PASSWORD_REDACTED]',
    },
  ];

  let maskedContent = content;

  for (const { pattern, replacement } of patterns) {
    maskedContent = maskedContent.replace(pattern, replacement);
  }

  return maskedContent;
}

/**
 * Validate that content has been properly masked
 */
export function validateMasking(
  originalContent: string,
  maskedContent: string
): {
  isValid: boolean;
  issues: string[];
  securityScore: number;
} {
  const issues: string[] = [];
  let securityScore = 1.0;

  // Check for common patterns that should have been masked
  const sensitivePatterns = [
    /sk-[a-zA-Z0-9]{32,}/g,
    /ghp_[a-zA-Z0-9]{36}/g,
    /AKIA[0-9A-Z]{16}/g,
    /password\s*[:=]\s*["']?[^"'\s\\[\\]]+["']?/gi,
  ];

  for (const pattern of sensitivePatterns) {
    const matches = maskedContent.match(pattern);
    if (matches) {
      issues.push(`Potential unmasked sensitive content found: ${matches[0].substring(0, 10)}...`);
      securityScore -= 0.2;
    }
  }

  // Check that masking was actually applied
  if (originalContent === maskedContent) {
    issues.push('No masking appears to have been applied');
    securityScore = 0;
  }

  return {
    isValid: issues.length === 0,
    issues,
    securityScore: Math.max(0, securityScore),
  };
}
