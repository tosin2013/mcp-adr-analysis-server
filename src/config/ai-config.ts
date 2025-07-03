/**
 * AI Configuration for OpenRouter.ai Integration
 * 
 * This module handles configuration for AI execution capabilities,
 * allowing the MCP server to execute prompts internally and return
 * actual results instead of prompts.
 */

export interface AIConfig {
  /** OpenRouter API key for authentication */
  apiKey: string;
  /** Base URL for OpenRouter API */
  baseURL: string;
  /** Default AI model to use for prompt execution */
  defaultModel: string;
  /** Execution mode: 'full' executes prompts, 'prompt-only' returns prompts */
  executionMode: 'full' | 'prompt-only';
  /** Site URL for OpenRouter rankings (optional) */
  siteUrl?: string;
  /** Site name for OpenRouter rankings (optional) */
  siteName?: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Maximum retries for failed requests */
  maxRetries: number;
  /** Temperature for AI responses (0-1) */
  temperature: number;
  /** Maximum tokens for AI responses */
  maxTokens: number;
  /** Enable response caching */
  cacheEnabled: boolean;
  /** Cache TTL in seconds */
  cacheTTL: number;
}

export interface ModelConfig {
  /** Model identifier for OpenRouter */
  id: string;
  /** Human-readable model name */
  name: string;
  /** Model provider (openai, anthropic, etc.) */
  provider: string;
  /** Cost per 1K tokens (input) */
  inputCost: number;
  /** Cost per 1K tokens (output) */
  outputCost: number;
  /** Maximum context length */
  contextLength: number;
  /** Recommended use cases */
  useCases: string[];
}

/**
 * Available AI models for different use cases
 */
export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  'claude-3-sonnet': {
    id: 'anthropic/claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    inputCost: 3.0,
    outputCost: 15.0,
    contextLength: 200000,
    useCases: ['analysis', 'reasoning', 'code-generation']
  },
  'claude-3-haiku': {
    id: 'anthropic/claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    inputCost: 0.25,
    outputCost: 1.25,
    contextLength: 200000,
    useCases: ['quick-analysis', 'simple-tasks']
  },
  'gpt-4o': {
    id: 'openai/gpt-4o',
    name: 'GPT-4 Omni',
    provider: 'openai',
    inputCost: 5.0,
    outputCost: 15.0,
    contextLength: 128000,
    useCases: ['analysis', 'reasoning', 'creative-tasks']
  },
  'gpt-4o-mini': {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4 Omni Mini',
    provider: 'openai',
    inputCost: 0.15,
    outputCost: 0.6,
    contextLength: 128000,
    useCases: ['quick-analysis', 'simple-tasks', 'cost-effective']
  }
};

/**
 * Default AI configuration
 */
export const DEFAULT_AI_CONFIG: Omit<AIConfig, 'siteUrl' | 'siteName'> & { siteUrl: string; siteName: string } = {
  apiKey: '',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultModel: 'anthropic/claude-3-sonnet',
  executionMode: 'full',
  siteUrl: 'https://github.com/tosin2013/mcp-adr-analysis-server',
  siteName: 'MCP ADR Analysis Server',
  timeout: 60000, // 60 seconds
  maxRetries: 3,
  temperature: 0.1, // Lower for more consistent results
  maxTokens: 4000,
  cacheEnabled: true,
  cacheTTL: 3600 // 1 hour
};

/**
 * Load AI configuration from environment variables
 */
export function loadAIConfig(): AIConfig {
  const config: AIConfig = {
    apiKey: process.env['OPENROUTER_API_KEY'] || '',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: process.env['AI_MODEL'] || DEFAULT_AI_CONFIG.defaultModel,
    executionMode: (process.env['EXECUTION_MODE'] as 'full' | 'prompt-only') || DEFAULT_AI_CONFIG.executionMode,
    siteUrl: process.env['SITE_URL'] || DEFAULT_AI_CONFIG.siteUrl,
    siteName: process.env['SITE_NAME'] || DEFAULT_AI_CONFIG.siteName,
    timeout: parseInt(process.env['AI_TIMEOUT'] || '') || DEFAULT_AI_CONFIG.timeout,
    maxRetries: parseInt(process.env['AI_MAX_RETRIES'] || '') || DEFAULT_AI_CONFIG.maxRetries,
    temperature: parseFloat(process.env['AI_TEMPERATURE'] || '') || DEFAULT_AI_CONFIG.temperature,
    maxTokens: parseInt(process.env['AI_MAX_TOKENS'] || '') || DEFAULT_AI_CONFIG.maxTokens,
    cacheEnabled: process.env['AI_CACHE_ENABLED'] !== 'false',
    cacheTTL: parseInt(process.env['AI_CACHE_TTL'] || '') || DEFAULT_AI_CONFIG.cacheTTL
  };

  return config;
}

/**
 * Validate AI configuration
 */
export function validateAIConfig(config: AIConfig): void {
  if (config.executionMode === 'full' && !config.apiKey) {
    throw new Error('OPENROUTER_API_KEY is required when execution mode is "full"');
  }

  if (!AVAILABLE_MODELS[config.defaultModel.replace('anthropic/', '').replace('openai/', '')]) {
    console.warn(`Unknown model: ${config.defaultModel}. Using default.`);
  }

  if (config.temperature < 0 || config.temperature > 1) {
    throw new Error('Temperature must be between 0 and 1');
  }

  if (config.maxTokens < 100 || config.maxTokens > 8000) {
    throw new Error('Max tokens must be between 100 and 8000');
  }

  if (config.timeout < 1000 || config.timeout > 300000) {
    throw new Error('Timeout must be between 1000ms and 300000ms');
  }
}

/**
 * Get model configuration by ID
 */
export function getModelConfig(modelId: string): ModelConfig | undefined {
  const normalizedId = modelId.replace('anthropic/', '').replace('openai/', '');
  return AVAILABLE_MODELS[normalizedId];
}

/**
 * Check if AI execution is enabled
 */
export function isAIExecutionEnabled(config: AIConfig): boolean {
  return config.executionMode === 'full' && !!config.apiKey;
}

/**
 * Get recommended model for a specific use case
 */
export function getRecommendedModel(useCase: string, costSensitive: boolean = false): string {
  const models = Object.values(AVAILABLE_MODELS);

  const suitableModels = models.filter(model =>
    model.useCases.includes(useCase) || model.useCases.includes('analysis')
  );

  if (suitableModels.length === 0) {
    return DEFAULT_AI_CONFIG.defaultModel;
  }

  if (costSensitive) {
    // Sort by cost (input + output cost)
    suitableModels.sort((a, b) => (a.inputCost + a.outputCost) - (b.inputCost + b.outputCost));
  }

  return suitableModels[0]!.id;
}
