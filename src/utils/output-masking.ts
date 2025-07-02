/**
 * Output masking middleware for MCP responses
 * Automatically applies content masking to all tool and resource outputs
 */

import { McpAdrError } from '../types/index.js';

export interface MaskingConfig {
  enabled: boolean;
  strategy: 'full' | 'partial' | 'placeholder' | 'environment';
  customPatterns?: string[];
  skipPatterns?: string[];
}

/**
 * Default masking configuration
 */
const DEFAULT_MASKING_CONFIG: MaskingConfig = {
  enabled: true,
  strategy: 'partial',
  customPatterns: [],
  skipPatterns: [
    '[REDACTED]',
    '[API_KEY_REDACTED]',
    '[PASSWORD_REDACTED]',
    '[EMAIL_REDACTED]',
    '[IP_ADDRESS_REDACTED]'
  ]
};

/**
 * Apply content masking to MCP response content
 */
export async function maskMcpResponse(
  response: any,
  config: MaskingConfig = DEFAULT_MASKING_CONFIG
): Promise<any> {
  if (!config.enabled) {
    return response;
  }

  try {
    // Deep clone the response to avoid modifying the original
    const maskedResponse = JSON.parse(JSON.stringify(response));

    // Apply masking to different response types
    if (maskedResponse.content && Array.isArray(maskedResponse.content)) {
      // Tool response with content array
      for (const contentItem of maskedResponse.content) {
        if (contentItem.type === 'text' && contentItem.text) {
          contentItem.text = await maskContent(contentItem.text, config);
        }
      }
    } else if (maskedResponse.contents && Array.isArray(maskedResponse.contents)) {
      // Resource response with contents array
      for (const contentItem of maskedResponse.contents) {
        if (contentItem.text) {
          contentItem.text = await maskContent(contentItem.text, config);
        }
      }
    } else if (maskedResponse.messages && Array.isArray(maskedResponse.messages)) {
      // Prompt response with messages array
      for (const message of maskedResponse.messages) {
        if (message.content && message.content.text) {
          message.content.text = await maskContent(message.content.text, config);
        }
      }
    }

    return maskedResponse;
  } catch (error) {
    throw new McpAdrError(
      `Failed to mask MCP response: ${error instanceof Error ? error.message : String(error)}`,
      'MASKING_ERROR'
    );
  }
}

/**
 * Apply content masking to a text string
 */
async function maskContent(
  content: string,
  config: MaskingConfig
): Promise<string> {
  try {
    // Skip if content is already masked
    if (config.skipPatterns?.some(pattern => content.includes(pattern))) {
      return content;
    }

    // Apply basic masking patterns
    const { applyBasicMasking } = await import('./content-masking.js');
    const strategy = config.strategy === 'environment' ? 'placeholder' : config.strategy;
    return applyBasicMasking(content, strategy);
  } catch (error) {
    // If masking fails, return original content with warning
    console.warn('Content masking failed:', error);
    return content;
  }
}

/**
 * Generate AI-powered masking for sensitive content
 */
export async function generateAiMasking(
  content: string,
  contentType: 'code' | 'documentation' | 'configuration' | 'logs' | 'general' = 'general'
): Promise<{ maskedContent: string; analysisPrompt: string }> {
  try {
    const { generateSensitiveContentDetectionPrompt } = await import('../prompts/security-prompts.js');
    
    const analysisPrompt = generateSensitiveContentDetectionPrompt(content, contentType);
    
    // For now, apply basic masking as fallback
    const { applyBasicMasking } = await import('./content-masking.js');
    const maskedContent = applyBasicMasking(content, 'partial');
    
    return {
      maskedContent,
      analysisPrompt: `
# AI-Powered Content Masking Available

The following content has been processed with basic masking. For enhanced AI-powered masking, use the analysis prompt below:

## Basic Masked Content
\`\`\`
${maskedContent}
\`\`\`

## AI Analysis Prompt
${analysisPrompt}

## Instructions
1. Submit the AI analysis prompt to detect sensitive information
2. Use the results with the \`generate_content_masking\` tool for intelligent masking
3. Apply the enhanced masking for better security
`
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate AI masking: ${error instanceof Error ? error.message : String(error)}`,
      'MASKING_ERROR'
    );
  }
}

/**
 * Create masking configuration from environment or defaults
 */
export function createMaskingConfig(overrides?: Partial<MaskingConfig>): MaskingConfig {
  const envConfig: Partial<MaskingConfig> = {
    enabled: process.env['MCP_MASKING_ENABLED'] !== 'false',
    strategy: (process.env['MCP_MASKING_STRATEGY'] as any) || 'partial'
  };

  return {
    ...DEFAULT_MASKING_CONFIG,
    ...envConfig,
    ...overrides
  };
}

/**
 * Validate masking configuration
 */
export function validateMaskingConfig(config: MaskingConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof config.enabled !== 'boolean') {
    errors.push('enabled must be a boolean');
  }

  if (!['full', 'partial', 'placeholder', 'environment'].includes(config.strategy)) {
    errors.push('strategy must be one of: full, partial, placeholder, environment');
  }

  if (config.customPatterns && !Array.isArray(config.customPatterns)) {
    errors.push('customPatterns must be an array');
  }

  if (config.skipPatterns && !Array.isArray(config.skipPatterns)) {
    errors.push('skipPatterns must be an array');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Middleware wrapper for MCP tool responses
 */
export function withContentMasking<T extends (..._args: any[]) => Promise<any>>(
  toolFunction: T,
  config?: MaskingConfig
): T {
  return (async (...args: any[]) => {
    const response = await toolFunction(...args);
    const maskingConfig = config || createMaskingConfig();
    return await maskMcpResponse(response, maskingConfig);
  }) as T;
}

/**
 * Apply progressive masking based on content sensitivity
 */
export async function applyProgressiveMasking(
  content: string,
  sensitivityLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): Promise<string> {
  const strategies: Record<string, 'full' | 'partial' | 'placeholder'> = {
    low: 'placeholder',
    medium: 'partial',
    high: 'full',
    critical: 'full'
  };

  const strategy = strategies[sensitivityLevel];
  const { applyBasicMasking } = await import('./content-masking.js');
  
  return applyBasicMasking(content, strategy);
}

/**
 * Detect content sensitivity level using heuristics
 */
export function detectContentSensitivity(content: string): 'low' | 'medium' | 'high' | 'critical' {
  const criticalPatterns = [
    /password/gi,
    /secret/gi,
    /private.*key/gi,
    /api.*key/gi,
    /token/gi
  ];

  const highPatterns = [
    /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // emails
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, // IP addresses
    /\b[A-Z0-9]{20,}\b/g // potential keys/tokens
  ];

  const mediumPatterns = [
    /localhost/gi,
    /127\.0\.0\.1/g,
    /config/gi,
    /env/gi
  ];

  if (criticalPatterns.some(pattern => pattern.test(content))) {
    return 'critical';
  }

  if (highPatterns.some(pattern => pattern.test(content))) {
    return 'high';
  }

  if (mediumPatterns.some(pattern => pattern.test(content))) {
    return 'medium';
  }

  return 'low';
}
