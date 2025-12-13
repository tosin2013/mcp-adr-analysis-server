/**
 * AI Executor Service for OpenRouter.ai Integration
 *
 * This service handles the execution of prompts using OpenRouter.ai,
 * transforming the MCP server from returning prompts to returning actual results.
 *
 * @deprecated This module is part of the legacy OpenRouter execution path.
 * As of CE-MCP Phase 4.4, tools should return OrchestrationDirectives instead
 * of using this executor. This module is retained for:
 * - Hybrid mode support (CE-MCP with OpenRouter fallback)
 * - LLM-specific tools (llm_web_search, llm_cloud_management, llm_database_management)
 *
 * For new tools, use the directive-based approach defined in ADR-014.
 * @see src/types/ce-mcp.ts for OrchestrationDirective types
 * @see docs/adrs/adr-014-ce-mcp-architecture.md
 */

import OpenAI from 'openai';
import {
  AIConfig,
  loadAIConfig,
  validateAIConfig,
  isAIExecutionEnabled,
} from '../config/ai-config.js';

export interface AIExecutionResult {
  /** The AI-generated response content */
  content: string;
  /** Model used for generation */
  model: string;
  /** Token usage information */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Execution metadata */
  metadata: {
    executionTime: number;
    cached: boolean;
    retryCount: number;
    timestamp: string;
  };
}

export interface AIExecutionError extends Error {
  code: string;
  retryable: boolean;
  originalError?: unknown;
}

/**
 * AI Executor Service Class
 *
 * @description Core service for executing AI prompts through OpenRouter.ai integration.
 * Transforms the MCP server from returning prompts to returning actual AI-generated results.
 * Includes caching, retry logic, and comprehensive error handling.
 *
 * @example
 * ```typescript
 * // Initialize with custom configuration
 * const executor = new AIExecutor({
 *   apiKey: 'your-api-key',
 *   model: 'anthropic/claude-3-sonnet',
 *   maxTokens: 4000
 * });
 *
 * // Execute a prompt
 * const result = await executor.executePrompt({
 *   prompt: 'Analyze this ADR...',
 *   context: { projectPath: '/path/to/project' }
 * });
 *
 * console.log(result.content); // AI-generated analysis
 * ```
 *
 * @example
 * ```typescript
 * // Use singleton instance
 * const executor = getAIExecutor();
 * const result = await executor.executePrompt({
 *   prompt: 'Generate ADR suggestions',
 *   maxTokens: 2000
 * });
 * ```
 *
 * @since 2.0.0
 * @category AI
 * @category Core
 */
export class AIExecutor {
  private client: OpenAI | null = null;
  private config: AIConfig;
  private cache: Map<string, { result: AIExecutionResult; expiry: number }> = new Map();

  constructor(config?: AIConfig) {
    this.config = config || loadAIConfig();
    this.initializeClient();
  }

  /**
   * Initialize OpenAI client for OpenRouter
   */
  private initializeClient(): void {
    if (!isAIExecutionEnabled(this.config)) {
      // NOTE: All console output goes to stderr to preserve stdout for MCP JSON-RPC
      console.error('[AI-Executor] AI execution disabled - running in prompt-only mode');
      return;
    }

    try {
      validateAIConfig(this.config);

      this.client = new OpenAI({
        baseURL: this.config.baseURL,
        apiKey: this.config.apiKey,
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries,
        defaultHeaders: {
          'HTTP-Referer': this.config.siteUrl || '',
          'X-Title': this.config.siteName || '',
        },
      });

      console.error(
        `[AI-Executor] AI Executor initialized with model: ${this.config.defaultModel}`
      );
    } catch (error) {
      console.error('Failed to initialize AI Executor:', error);
      this.client = null;
    }
  }

  /**
   * Check if AI execution is available
   */
  public isAvailable(): boolean {
    // Reload configuration to pick up environment variable changes
    this.reloadConfigIfNeeded();
    return this.client !== null && isAIExecutionEnabled(this.config);
  }

  /**
   * Reload configuration if environment variables have changed
   */
  private reloadConfigIfNeeded(): void {
    const currentConfig = loadAIConfig();

    // Check if key configuration has changed
    const configChanged =
      this.config.apiKey !== currentConfig.apiKey ||
      this.config.executionMode !== currentConfig.executionMode ||
      this.config.defaultModel !== currentConfig.defaultModel;

    if (configChanged) {
      console.error('[AI-Executor] AI configuration changed, reinitializing...');
      this.config = currentConfig;
      this.initializeClient();
    }
  }

  /**
   * Execute a prompt and return the AI response
   */
  public async executePrompt(
    prompt: string,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<AIExecutionResult> {
    // Ensure configuration is up to date before execution
    this.reloadConfigIfNeeded();

    if (!this.isAvailable()) {
      throw this.createError(
        'AI execution not available - check configuration',
        'AI_UNAVAILABLE',
        false
      );
    }

    const startTime = Date.now();
    const model = options.model || this.config.defaultModel;
    const cacheKey = this.generateCacheKey(prompt, model, options);

    // Check cache first
    if (this.config.cacheEnabled) {
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }
    }

    let retryCount = 0;
    const maxRetries = this.config.maxRetries;

    while (retryCount <= maxRetries) {
      try {
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

        if (options.systemPrompt) {
          messages.push({ role: 'system', content: options.systemPrompt });
        }

        messages.push({ role: 'user', content: prompt });

        const completion = await this.client!.chat.completions.create({
          model,
          messages,
          temperature: options.temperature ?? this.config.temperature,
          max_tokens: options.maxTokens ?? this.config.maxTokens,
        });

        const result: AIExecutionResult = {
          content: completion.choices[0]?.message?.content || '',
          model: completion.model,
          metadata: {
            executionTime: Date.now() - startTime,
            cached: false,
            retryCount,
            timestamp: new Date().toISOString(),
          },
        };

        if (completion.usage) {
          result.usage = {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          };
        }

        // Cache the result
        if (this.config.cacheEnabled) {
          this.setCachedResult(cacheKey, result);
        }

        return result;
      } catch (error) {
        retryCount++;

        if (retryCount > maxRetries) {
          throw this.createError(
            `AI execution failed after ${maxRetries} retries: ${error}`,
            'AI_EXECUTION_FAILED',
            false,
            error
          );
        }

        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw this.createError('Unexpected error in AI execution', 'AI_UNEXPECTED_ERROR', false);
  }

  /**
   * Execute a structured prompt that expects JSON response
   */
  public async executeStructuredPrompt<T = any>(
    prompt: string,
    schema?: any,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<{ data: T; raw: AIExecutionResult }> {
    const systemPrompt =
      options.systemPrompt ||
      'You are a helpful assistant that responds with valid JSON. Always return properly formatted JSON that matches the requested schema. Do not wrap the JSON in markdown code blocks.';

    const result = await this.executePrompt(prompt, {
      ...options,
      systemPrompt,
      temperature: options.temperature ?? 0.1, // Lower temperature for structured output
    });

    try {
      // Extract JSON from response, handling markdown code blocks
      const jsonContent = this.extractJsonFromResponse(result.content);
      const data = JSON.parse(jsonContent) as T;

      // Basic schema validation if provided
      if (schema && typeof schema.parse === 'function') {
        schema.parse(data);
      }

      return { data, raw: result };
    } catch (error) {
      throw this.createError(
        `Failed to parse JSON response: ${error}`,
        'AI_JSON_PARSE_ERROR',
        false,
        error
      );
    }
  }

  /**
   * Extract JSON content from AI response, handling markdown code blocks
   */
  private extractJsonFromResponse(content: string): string {
    // Remove leading/trailing whitespace
    content = content.trim();

    // Check if content is wrapped in markdown code blocks
    const codeBlockMatch = content.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return codeBlockMatch[1].trim();
    }

    // Check for inline code blocks
    const inlineCodeMatch = content.match(/^`([\s\S]*?)`$/);
    if (inlineCodeMatch && inlineCodeMatch[1]) {
      return inlineCodeMatch[1].trim();
    }

    // Try to find JSON object/array in the content
    const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch && jsonMatch[1]) {
      return jsonMatch[1].trim();
    }

    // Return as-is if no patterns match
    return content;
  }

  /**
   * Generate cache key for a prompt execution
   */
  private generateCacheKey(prompt: string, model: string, options: any): string {
    const key = JSON.stringify({ prompt, model, options });
    return Buffer.from(key).toString('base64').slice(0, 32);
  }

  /**
   * Get cached result if available and not expired
   */
  private getCachedResult(cacheKey: string): AIExecutionResult | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Mark as cached
    const result = { ...cached.result };
    result.metadata = { ...result.metadata, cached: true };
    return result;
  }

  /**
   * Cache a result
   */
  private setCachedResult(cacheKey: string, result: AIExecutionResult): void {
    const expiry = Date.now() + this.config.cacheTTL * 1000;
    this.cache.set(cacheKey, { result, expiry });

    // Clean up expired entries periodically
    if (this.cache.size > 100) {
      this.cleanupCache();
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Create a standardized AI execution error
   */
  private createError(
    message: string,
    code: string,
    retryable: boolean,
    originalError?: unknown
  ): AIExecutionError {
    const error = new Error(message) as AIExecutionError;
    error.code = code;
    error.retryable = retryable;
    error.originalError = originalError;
    return error;
  }

  /**
   * Get current configuration
   */
  public getConfig(): AIConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AIConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initializeClient();
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; hitRate: number } {
    // This is a simplified implementation
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
    };
  }
}

/**
 * Global AI executor instance
 */
let globalExecutor: AIExecutor | null = null;

/**
 * Get or create the global AI executor instance
 */
export function getAIExecutor(): AIExecutor {
  if (!globalExecutor) {
    globalExecutor = new AIExecutor();
  }
  return globalExecutor;
}

/**
 * Reset the global AI executor (useful for testing)
 */
export function resetAIExecutor(): void {
  globalExecutor = null;
}
