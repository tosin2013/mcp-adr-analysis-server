/**
 * Configuration management for MCP ADR Analysis Server
 * Handles environment variables and default settings
 */

import path from 'path';
import { z } from 'zod';

/**
 * Configuration schema for validation
 */
const ConfigSchema = z.object({
  projectPath: z.string().min(1, 'PROJECT_PATH is required'),
  adrDirectory: z.string().default('docs/adrs'),
  logLevel: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).default('INFO'),
  cacheEnabled: z.boolean().default(true),
  cacheDirectory: z.string().default('.mcp-adr-cache'),
  maxCacheSize: z.number().default(100 * 1024 * 1024), // 100MB
  analysisTimeout: z.number().default(30000), // 30 seconds
  // Firecrawl configuration
  firecrawlApiKey: z.string().optional(),
  firecrawlBaseUrl: z.string().default('http://localhost:3000'),
  firecrawlEnabled: z.boolean().default(false),
});

export type ServerConfig = z.infer<typeof ConfigSchema>;

/**
 * Load and validate configuration from environment variables
 * 
 * @description Loads server configuration from environment variables with fallback defaults.
 * Validates all configuration values using Zod schema and returns a type-safe config object.
 * 
 * @returns {ServerConfig} Validated configuration object with all required settings
 * 
 * @throws {Error} When configuration validation fails or required values are missing
 * 
 * @example
 * ```typescript
 * // Load configuration with environment variables
 * process.env.PROJECT_PATH = '/path/to/project';
 * process.env.LOG_LEVEL = 'DEBUG';
 * 
 * const config = loadConfig();
 * console.log(config.projectPath); // '/path/to/project'
 * console.log(config.logLevel);    // 'DEBUG'
 * ```
 * 
 * @example
 * ```typescript
 * // Load configuration with defaults
 * const config = loadConfig();
 * console.log(config.adrDirectory);  // 'docs/adrs'
 * console.log(config.cacheEnabled);  // true
 * console.log(config.maxCacheSize);  // 104857600 (100MB)
 * ```
 * 
 * @since 2.0.0
 * @category Configuration
 */
export function loadConfig(): ServerConfig {
  // Get PROJECT_PATH from environment or use current working directory
  const projectPath = process.env['PROJECT_PATH'] || process.cwd();

  // Resolve to absolute path
  const absoluteProjectPath = path.resolve(projectPath);

  const rawConfig = {
    projectPath: absoluteProjectPath,
    adrDirectory: process.env['ADR_DIRECTORY'] || 'docs/adrs',
    logLevel: (process.env['LOG_LEVEL'] || 'INFO').toUpperCase(),
    cacheEnabled: process.env['CACHE_ENABLED'] !== 'false',
    cacheDirectory: process.env['CACHE_DIRECTORY'] || '.mcp-adr-cache',
    maxCacheSize: parseInt(process.env['MAX_CACHE_SIZE'] || '104857600'), // 100MB
    analysisTimeout: parseInt(process.env['ANALYSIS_TIMEOUT'] || '30000'), // 30 seconds
    // Firecrawl configuration
    firecrawlApiKey: process.env['FIRECRAWL_API_KEY'],
    firecrawlBaseUrl: process.env['FIRECRAWL_BASE_URL'] || 'http://localhost:3000',
    firecrawlEnabled: process.env['FIRECRAWL_ENABLED'] === 'true' || !!process.env['FIRECRAWL_API_KEY'],
  };

  try {
    return ConfigSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new Error(`Configuration validation failed: ${issues}`);
    }
    throw error;
  }
}

/**
 * Get the absolute path for ADR directory
 */
export function getAdrDirectoryPath(config: ServerConfig): string {
  return path.resolve(config.projectPath, config.adrDirectory);
}

/**
 * Get the absolute path for cache directory
 */
export function getCacheDirectoryPath(config: ServerConfig): string {
  // Always use the cache directory relative to project path
  return path.resolve(config.projectPath, config.cacheDirectory);
}

/**
 * Validate that the project path exists and is accessible
 * 
 * @description Performs filesystem validation to ensure the specified project path
 * exists, is accessible, and is a directory. This is critical for server initialization
 * as all ADR analysis operations depend on a valid project root.
 * 
 * @param {string} projectPath - Absolute or relative path to validate
 * 
 * @returns {Promise<void>} Resolves if path is valid, rejects with descriptive error
 * 
 * @throws {Error} When path doesn't exist, isn't a directory, or isn't accessible
 * 
 * @example
 * ```typescript
 * // Validate existing project directory
 * await validateProjectPath('/path/to/project');
 * console.log('Project path is valid');
 * ```
 * 
 * @example
 * ```typescript
 * // Handle validation errors
 * try {
 *   await validateProjectPath('/invalid/path');
 * } catch (error) {
 *   console.error('Validation failed:', error.message);
 *   // Error: PROJECT_PATH does not exist: /invalid/path
 * }
 * ```
 * 
 * @since 2.0.0
 * @category Configuration
 * @category Validation
 */
export async function validateProjectPath(projectPath: string): Promise<void> {
  const fs = await import('fs/promises');

  try {
    const stats = await fs.stat(projectPath);
    if (!stats.isDirectory()) {
      throw new Error(`PROJECT_PATH is not a directory: ${projectPath}`);
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`PROJECT_PATH does not exist: ${projectPath}`);
    }
    throw new Error(`Cannot access PROJECT_PATH: ${projectPath} - ${error.message}`);
  }
}

/**
 * Create logger with configured log level
 */
export function createLogger(config: ServerConfig) {
  const levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
  const currentLevel = levels[config.logLevel as keyof typeof levels] || 1;

  return {
    debug: (message: string, ...args: any[]) => {
      if (currentLevel <= 0) console.error(`[DEBUG] ${message}`, ...args);
    },
    info: (message: string, ...args: any[]) => {
      if (currentLevel <= 1) console.error(`[INFO] ${message}`, ...args);
    },
    warn: (message: string, ...args: any[]) => {
      if (currentLevel <= 2) console.error(`[WARN] ${message}`, ...args);
    },
    error: (message: string, ...args: any[]) => {
      if (currentLevel <= 3) console.error(`[ERROR] ${message}`, ...args);
    },
  };
}

/**
 * Print configuration summary for debugging
 */
export function printConfigSummary(config: ServerConfig): void {
  const logger = createLogger(config);

  logger.info('MCP ADR Analysis Server Configuration:');
  logger.info(`  Project Path: ${config.projectPath}`);
  logger.info(`  ADR Directory: ${config.adrDirectory}`);
  logger.info(`  Log Level: ${config.logLevel}`);
  logger.info(`  Cache Enabled: ${config.cacheEnabled}`);
  logger.info(`  Cache Directory: ${config.cacheDirectory}`);
  logger.info(`  Max Cache Size: ${Math.round(config.maxCacheSize / 1024 / 1024)}MB`);
  logger.info(`  Analysis Timeout: ${config.analysisTimeout}ms`);
  logger.info(`  Firecrawl Enabled: ${config.firecrawlEnabled}`);
  if (config.firecrawlEnabled) {
    logger.info(`  Firecrawl Base URL: ${config.firecrawlBaseUrl}`);
    logger.info(`  Firecrawl API Key: ${config.firecrawlApiKey ? '***configured***' : 'not set'}`);
  }
}
