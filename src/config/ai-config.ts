/**
 * AI Configuration for OpenRouter.ai Integration and CE-MCP
 *
 * This module handles configuration for AI execution capabilities,
 * supporting both legacy OpenRouter execution and the new CE-MCP
 * (Code Execution with MCP) paradigm.
 *
 * @see ADR-014: CE-MCP Architecture
 */

/**
 * Execution mode for AI operations
 *
 * - 'full': Execute prompts via OpenRouter (legacy)
 * - 'prompt-only': Return prompts without execution (legacy)
 * - 'ce-mcp': Return orchestration directives for host LLM (recommended)
 * - 'hybrid': Support both CE-MCP and OpenRouter fallback
 */
export type ExecutionMode = 'full' | 'prompt-only' | 'ce-mcp' | 'hybrid';

export interface AIConfig {
  /** OpenRouter API key for authentication */
  apiKey: string;
  /** Base URL for OpenRouter API */
  baseURL: string;
  /** Default AI model to use for prompt execution */
  defaultModel: string;
  /** Execution mode */
  executionMode: ExecutionMode;
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
  /** CE-MCP specific configuration */
  cemcp?: CEMCPSettings;
}

/**
 * CE-MCP specific settings
 */
export interface CEMCPSettings {
  /** Enable sandbox execution */
  sandboxEnabled: boolean;
  /** Sandbox execution timeout in ms */
  sandboxTimeout: number;
  /** Sandbox memory limit in bytes */
  sandboxMemoryLimit: number;
  /** Maximum file system operations */
  sandboxFsLimit: number;
  /** Allow network access in sandbox */
  sandboxNetworkAllowed: boolean;
  /** Enable lazy prompt loading */
  lazyPromptLoading: boolean;
  /** Use OpenRouter as fallback when CE-MCP fails */
  openRouterFallback: boolean;
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
    useCases: ['analysis', 'reasoning', 'code-generation'],
  },
  'claude-3-haiku': {
    id: 'anthropic/claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    inputCost: 0.25,
    outputCost: 1.25,
    contextLength: 200000,
    useCases: ['quick-analysis', 'simple-tasks'],
  },
  'gpt-4o': {
    id: 'openai/gpt-4o',
    name: 'GPT-4 Omni',
    provider: 'openai',
    inputCost: 5.0,
    outputCost: 15.0,
    contextLength: 128000,
    useCases: ['analysis', 'reasoning', 'creative-tasks'],
  },
  'gpt-4o-mini': {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4 Omni Mini',
    provider: 'openai',
    inputCost: 0.15,
    outputCost: 0.6,
    contextLength: 128000,
    useCases: ['quick-analysis', 'simple-tasks', 'cost-effective'],
  },
};

/**
 * Default CE-MCP settings
 */
export const DEFAULT_CEMCP_SETTINGS: CEMCPSettings = {
  sandboxEnabled: true,
  sandboxTimeout: 30000, // 30 seconds
  sandboxMemoryLimit: 256 * 1024 * 1024, // 256 MB
  sandboxFsLimit: 1000,
  sandboxNetworkAllowed: false,
  lazyPromptLoading: true,
  openRouterFallback: true,
};

/**
 * Default AI configuration
 */
export const DEFAULT_AI_CONFIG: Omit<AIConfig, 'siteUrl' | 'siteName'> & {
  siteUrl: string;
  siteName: string;
} = {
  apiKey: '',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultModel: 'anthropic/claude-3-sonnet',
  executionMode: 'ce-mcp', // Default to CE-MCP mode (was 'full')
  siteUrl: 'https://github.com/tosin2013/mcp-adr-analysis-server',
  siteName: 'MCP ADR Analysis Server',
  timeout: 60000, // 60 seconds
  maxRetries: 3,
  temperature: 0.1, // Lower for more consistent results
  maxTokens: 4000,
  cacheEnabled: true,
  cacheTTL: 3600, // 1 hour
  cemcp: DEFAULT_CEMCP_SETTINGS,
};

/**
 * Load AI configuration from environment variables
 */
export function loadAIConfig(): AIConfig {
  // Load CE-MCP settings
  const cemcpSettings: CEMCPSettings = {
    sandboxEnabled: process.env['CEMCP_SANDBOX_ENABLED'] !== 'false',
    sandboxTimeout:
      parseInt(process.env['CEMCP_SANDBOX_TIMEOUT'] || '') || DEFAULT_CEMCP_SETTINGS.sandboxTimeout,
    sandboxMemoryLimit:
      parseInt(process.env['CEMCP_SANDBOX_MEMORY'] || '') ||
      DEFAULT_CEMCP_SETTINGS.sandboxMemoryLimit,
    sandboxFsLimit:
      parseInt(process.env['CEMCP_SANDBOX_FS_LIMIT'] || '') ||
      DEFAULT_CEMCP_SETTINGS.sandboxFsLimit,
    sandboxNetworkAllowed: process.env['CEMCP_SANDBOX_NETWORK'] === 'true',
    lazyPromptLoading: process.env['CEMCP_LAZY_PROMPTS'] !== 'false',
    openRouterFallback: process.env['CEMCP_OPENROUTER_FALLBACK'] !== 'false',
  };

  const config: AIConfig = {
    apiKey: process.env['OPENROUTER_API_KEY'] || '',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: process.env['AI_MODEL'] || DEFAULT_AI_CONFIG.defaultModel,
    executionMode:
      (process.env['EXECUTION_MODE'] as ExecutionMode) || DEFAULT_AI_CONFIG.executionMode,
    siteUrl: process.env['SITE_URL'] || DEFAULT_AI_CONFIG.siteUrl,
    siteName: process.env['SITE_NAME'] || DEFAULT_AI_CONFIG.siteName,
    timeout: parseInt(process.env['AI_TIMEOUT'] || '') || DEFAULT_AI_CONFIG.timeout,
    maxRetries: parseInt(process.env['AI_MAX_RETRIES'] || '') || DEFAULT_AI_CONFIG.maxRetries,
    temperature: parseFloat(process.env['AI_TEMPERATURE'] || '') || DEFAULT_AI_CONFIG.temperature,
    maxTokens: parseInt(process.env['AI_MAX_TOKENS'] || '') || DEFAULT_AI_CONFIG.maxTokens,
    cacheEnabled: process.env['AI_CACHE_ENABLED'] !== 'false',
    cacheTTL: parseInt(process.env['AI_CACHE_TTL'] || '') || DEFAULT_AI_CONFIG.cacheTTL,
    cemcp: cemcpSettings,
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
 * Check if AI execution is enabled (legacy OpenRouter mode)
 */
export function isAIExecutionEnabled(config: AIConfig): boolean {
  return (config.executionMode === 'full' || config.executionMode === 'hybrid') && !!config.apiKey;
}

/**
 * Check if CE-MCP mode is enabled
 */
export function isCEMCPEnabled(config: AIConfig): boolean {
  return config.executionMode === 'ce-mcp' || config.executionMode === 'hybrid';
}

/**
 * Check if OpenRouter fallback is available
 */
export function isOpenRouterFallbackAvailable(config: AIConfig): boolean {
  return (
    (config.executionMode === 'hybrid' || config.cemcp?.openRouterFallback === true) &&
    !!config.apiKey
  );
}

/**
 * Get the effective execution mode based on configuration and available resources
 */
export function getEffectiveExecutionMode(config: AIConfig): ExecutionMode {
  if (config.executionMode === 'ce-mcp') {
    // If CE-MCP is requested but sandbox is disabled, check for fallback
    if (!config.cemcp?.sandboxEnabled) {
      if (isOpenRouterFallbackAvailable(config)) {
        return 'full';
      }
      return 'prompt-only';
    }
    return 'ce-mcp';
  }

  if (config.executionMode === 'hybrid') {
    return 'hybrid';
  }

  if (config.executionMode === 'full' && !config.apiKey) {
    return 'prompt-only';
  }

  return config.executionMode;
}

/**
 * Get recommended model for a specific use case
 */
export function getRecommendedModel(useCase: string, costSensitive: boolean = false): string {
  const models = Object.values(AVAILABLE_MODELS);

  const suitableModels = models.filter(
    model => model.useCases.includes(useCase) || model.useCases.includes('analysis')
  );

  if (suitableModels.length === 0) {
    return DEFAULT_AI_CONFIG.defaultModel;
  }

  if (costSensitive) {
    // Sort by cost (input + output cost)
    suitableModels.sort((a, b) => a.inputCost + a.outputCost - (b.inputCost + b.outputCost));
  }

  return suitableModels[0]?.id ?? DEFAULT_AI_CONFIG.defaultModel;
}
