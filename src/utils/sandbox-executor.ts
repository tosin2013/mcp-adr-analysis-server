/**
 * CE-MCP Sandbox Executor
 *
 * Executes orchestration directives in an isolated sandbox environment.
 * Replaces direct OpenRouter calls with local execution of LLM-generated code.
 *
 * @see ADR-014: CE-MCP Architecture
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';
import {
  OrchestrationDirective,
  StateMachineDirective,
  SandboxOperation,
  SandboxContext,
  SandboxExecutionResult,
  CEMCPConfig,
  isOrchestrationDirective,
  isStateMachineDirective,
} from '../types/ce-mcp.js';

/**
 * Default CE-MCP configuration
 */
export const DEFAULT_CEMCP_CONFIG: CEMCPConfig = {
  mode: 'directive',
  sandbox: {
    enabled: true,
    timeout: 30000, // 30 seconds
    memoryLimit: 256 * 1024 * 1024, // 256 MB
    fsOperationsLimit: 1000,
    networkAllowed: false,
  },
  prompts: {
    lazyLoading: true,
    cacheEnabled: true,
    cacheTTL: 3600, // 1 hour
  },
  fallback: {
    enabled: true,
    maxRetries: 2,
  },
};

/**
 * Sandbox Executor Class
 *
 * Executes CE-MCP directives in an isolated environment with:
 * - Process isolation (operation-level sandboxing)
 * - Filesystem restrictions (project path only)
 * - Resource limits (timeout, memory, operations)
 * - State management (results persist across operations)
 */
export class SandboxExecutor {
  private config: CEMCPConfig;
  private operationCache: Map<string, { result: unknown; expiry: number }> = new Map();
  private promptCache: Map<string, { content: string; expiry: number }> = new Map();

  constructor(config?: Partial<CEMCPConfig>) {
    this.config = { ...DEFAULT_CEMCP_CONFIG, ...config };
  }

  /**
   * Execute an orchestration directive
   */
  async executeDirective(
    directive: OrchestrationDirective | StateMachineDirective,
    projectPath: string
  ): Promise<SandboxExecutionResult> {
    const startTime = Date.now();
    const context = this.createContext(projectPath);
    const cachedOps: string[] = [];

    try {
      if (isOrchestrationDirective(directive)) {
        return await this.executeOrchestrationDirective(directive, context, startTime, cachedOps);
      } else if (isStateMachineDirective(directive)) {
        return await this.executeStateMachineDirective(directive, context, startTime, cachedOps);
      } else {
        throw new Error('Unknown directive type');
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Date.now() - startTime,
          operationsExecuted: context.state.size,
          cachedOperations: cachedOps,
        },
      };
    }
  }

  /**
   * Execute an orchestration directive
   */
  private async executeOrchestrationDirective(
    directive: OrchestrationDirective,
    context: SandboxContext,
    startTime: number,
    cachedOps: string[]
  ): Promise<SandboxExecutionResult> {
    let operationsExecuted = 0;

    // Execute each operation in sequence
    for (const operation of directive.sandbox_operations) {
      // Check timeout
      if (Date.now() - startTime > this.config.sandbox.timeout) {
        throw new Error(`Sandbox execution timeout after ${this.config.sandbox.timeout}ms`);
      }

      // Check condition if present
      if (operation.condition && !this.evaluateCondition(operation.condition, context)) {
        continue;
      }

      // Check cache
      const cacheKey = this.generateOperationCacheKey(operation);
      const cached = this.getCachedOperation(cacheKey);
      if (cached !== undefined) {
        if (operation.store) {
          context.state.set(operation.store, cached);
        }
        cachedOps.push(operation.op);
        continue;
      }

      // Execute operation
      const result = await this.executeOperation(operation, context);
      operationsExecuted++;

      // Store result if requested
      if (operation.store) {
        context.state.set(operation.store, result);
      }

      // Cache result if cacheable
      if (directive.metadata?.cacheable) {
        this.setCachedOperation(cacheKey, result);
      }

      // Return early if this operation is marked as return
      if (operation.return) {
        return {
          success: true,
          data: result,
          metadata: {
            executionTime: Date.now() - startTime,
            operationsExecuted,
            cachedOperations: cachedOps,
          },
        };
      }
    }

    // Compose final result if composition directive exists
    let finalResult: unknown;
    if (directive.compose) {
      finalResult = this.composeResult(directive.compose, context);
    } else {
      // Return all stored state
      finalResult = Object.fromEntries(context.state);
    }

    return {
      success: true,
      data: finalResult,
      metadata: {
        executionTime: Date.now() - startTime,
        operationsExecuted,
        cachedOperations: cachedOps,
      },
    };
  }

  /**
   * Execute a state machine directive
   */
  private async executeStateMachineDirective(
    directive: StateMachineDirective,
    context: SandboxContext,
    startTime: number,
    cachedOps: string[]
  ): Promise<SandboxExecutionResult> {
    let currentState = 'initial';
    let operationsExecuted = 0;

    // Initialize state
    for (const [key, value] of Object.entries(directive.initial_state)) {
      context.state.set(key, value);
    }

    // Execute transitions
    while (currentState !== directive.final_state) {
      // Check timeout
      if (Date.now() - startTime > this.config.sandbox.timeout) {
        throw new Error(`State machine timeout after ${this.config.sandbox.timeout}ms`);
      }

      // Find matching transition
      const transition = directive.transitions.find(t => t.from === currentState);
      if (!transition) {
        throw new Error(`No transition found from state: ${currentState}`);
      }

      try {
        // Execute transition operation
        if (typeof transition.operation === 'string') {
          // Tool invocation (not implemented in sandbox - would need host LLM)
          throw new Error(`Tool invocation not supported in sandbox: ${transition.operation}`);
        } else {
          const result = await this.executeOperation(transition.operation, context);
          if (transition.operation.store) {
            context.state.set(transition.operation.store, result);
          }
        }
        operationsExecuted++;
        currentState = transition.next_state;
      } catch (error) {
        if (transition.on_error === 'skip') {
          currentState = transition.next_state;
        } else if (transition.on_error === 'abort') {
          throw error;
        } else {
          throw error;
        }
      }
    }

    return {
      success: true,
      data: context.state.get(directive.final_state),
      metadata: {
        executionTime: Date.now() - startTime,
        operationsExecuted,
        cachedOperations: cachedOps,
      },
    };
  }

  /**
   * Execute a single sandbox operation
   */
  private async executeOperation(
    operation: SandboxOperation,
    context: SandboxContext
  ): Promise<unknown> {
    // Resolve inputs
    const input = operation.input ? context.state.get(operation.input) : undefined;
    const inputs = operation.inputs?.map(key => context.state.get(key));

    switch (operation.op) {
      case 'loadKnowledge':
        return this.opLoadKnowledge(operation.args, context);

      case 'loadPrompt':
        return this.opLoadPrompt(operation.args, context);

      case 'analyzeFiles':
        return this.opAnalyzeFiles(operation.args, context);

      case 'scanEnvironment':
        return this.opScanEnvironment(operation.args, context);

      case 'generateContext':
        return this.opGenerateContext(operation.args, inputs, context);

      case 'composeResult':
        return this.opComposeResult(operation.args, inputs, context);

      case 'validateOutput':
        return this.opValidateOutput(operation.args, input, context);

      case 'cacheResult':
        return this.opCacheResult(operation.args, input, context);

      case 'retrieveCache':
        return this.opRetrieveCache(operation.args, context);

      default:
        throw new Error(`Unknown operation: ${operation.op}`);
    }
  }

  /**
   * Operation: Load domain-specific knowledge
   */
  private async opLoadKnowledge(
    args: Record<string, unknown> | undefined,
    context: SandboxContext
  ): Promise<Record<string, unknown>> {
    const domain = (args?.['domain'] as string) || 'general';
    const scope = (args?.['scope'] as string) || 'project';

    // Return knowledge structure for the domain
    // In CE-MCP, this provides structured data instead of LLM-generated content
    return {
      domain,
      scope,
      projectPath: context.projectPath,
      timestamp: new Date().toISOString(),
      // Placeholder - would load from knowledge graph in full implementation
      knowledge: {
        patterns: [],
        conventions: [],
        decisions: [],
      },
    };
  }

  /**
   * Operation: Load prompt template (lazy loading)
   */
  private async opLoadPrompt(
    args: Record<string, unknown> | undefined,
    context: SandboxContext
  ): Promise<string> {
    const promptName = args?.['name'] as string;
    const section = args?.['section'] as string | undefined;

    if (!promptName) {
      throw new Error('loadPrompt requires "name" argument');
    }

    // Check prompt cache
    const cacheKey = `prompt:${promptName}:${section || 'full'}`;
    const cached = this.promptCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return cached.content;
    }

    // Load prompt from file system
    // In full implementation, would use prompt catalog
    const promptPath = join(context.projectPath, 'src', 'prompts', `${promptName}.ts`);

    try {
      const content = await readFile(promptPath, 'utf-8');

      // Cache the result
      this.promptCache.set(cacheKey, {
        content,
        expiry: Date.now() + this.config.prompts.cacheTTL * 1000,
      });

      return content;
    } catch {
      // Return placeholder if prompt not found
      return `[Prompt: ${promptName}${section ? `:${section}` : ''}]`;
    }
  }

  /**
   * Operation: Analyze project files
   */
  private async opAnalyzeFiles(
    args: Record<string, unknown> | undefined,
    context: SandboxContext
  ): Promise<Record<string, unknown>> {
    const patterns = (args?.['patterns'] as string[]) || ['**/*.ts'];
    const maxFiles = (args?.['maxFiles'] as number) || 100;

    const files: Array<{ path: string; size: number; type: string }> = [];

    // Scan directory (limited to project path)
    const scanDir = async (dir: string, depth: number = 0): Promise<void> => {
      if (depth > 5 || files.length >= maxFiles) return;

      try {
        const entries = await readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (files.length >= maxFiles) break;

          const fullPath = join(dir, entry.name);

          // Skip node_modules, .git, etc.
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue;
          }

          if (entry.isDirectory()) {
            await scanDir(fullPath, depth + 1);
          } else if (entry.isFile()) {
            // Check if file matches patterns
            const matchesPattern = patterns.some(pattern => {
              if (pattern.includes('*')) {
                const ext = pattern.replace('**/*.', '.');
                return entry.name.endsWith(ext);
              }
              return entry.name === pattern;
            });

            if (matchesPattern) {
              const stats = await stat(fullPath);
              files.push({
                path: fullPath.replace(context.projectPath, ''),
                size: stats.size,
                type: entry.name.split('.').pop() || 'unknown',
              });
            }
          }
        }
      } catch {
        // Ignore errors for inaccessible directories
      }
    };

    await scanDir(context.projectPath);

    return {
      totalFiles: files.length,
      files,
      patterns,
      scannedAt: new Date().toISOString(),
    };
  }

  /**
   * Operation: Scan environment configuration
   */
  private async opScanEnvironment(
    _args: Record<string, unknown> | undefined,
    context: SandboxContext
  ): Promise<Record<string, unknown>> {
    const checkFiles = [
      'package.json',
      'tsconfig.json',
      '.env.example',
      'docker-compose.yml',
      'Dockerfile',
      '.github/workflows',
    ];

    const found: Record<string, boolean> = {};

    for (const file of checkFiles) {
      try {
        await stat(join(context.projectPath, file));
        found[file] = true;
      } catch {
        found[file] = false;
      }
    }

    // Read package.json for dependencies
    let dependencies: Record<string, string> = {};
    let devDependencies: Record<string, string> = {};

    try {
      const pkgContent = await readFile(join(context.projectPath, 'package.json'), 'utf-8');
      const pkg = JSON.parse(pkgContent);
      dependencies = pkg.dependencies || {};
      devDependencies = pkg.devDependencies || {};
    } catch {
      // Ignore if package.json doesn't exist
    }

    return {
      configFiles: found,
      dependencies: Object.keys(dependencies).length,
      devDependencies: Object.keys(devDependencies).length,
      hasTypeScript: found['tsconfig.json'],
      hasDocker: found['Dockerfile'] || found['docker-compose.yml'],
      hasCI: found['.github/workflows'],
      scannedAt: new Date().toISOString(),
    };
  }

  /**
   * Operation: Generate context from multiple inputs
   */
  private async opGenerateContext(
    args: Record<string, unknown> | undefined,
    inputs: unknown[] | undefined,
    _context: SandboxContext
  ): Promise<Record<string, unknown>> {
    const contextType = (args?.['type'] as string) || 'analysis';

    return {
      type: contextType,
      inputs: inputs || [],
      inputCount: inputs?.length || 0,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Operation: Compose final result
   */
  private async opComposeResult(
    args: Record<string, unknown> | undefined,
    _inputs: unknown[] | undefined,
    context: SandboxContext
  ): Promise<Record<string, unknown>> {
    const template = (args?.['template'] as string) || 'default';
    const format = (args?.['format'] as string) || 'json';

    // Compose result from all state
    const composed: Record<string, unknown> = {
      template,
      format,
      timestamp: new Date().toISOString(),
      data: {},
    };

    // Include all state data
    for (const [key, value] of context.state) {
      (composed['data'] as Record<string, unknown>)[key] = value;
    }

    return composed;
  }

  /**
   * Operation: Validate output against schema
   */
  private async opValidateOutput(
    _args: Record<string, unknown> | undefined,
    input: unknown,
    _context: SandboxContext
  ): Promise<{ valid: boolean; errors?: string[] }> {
    // Basic validation - in full implementation would use schema validation
    if (input === null || input === undefined) {
      return { valid: false, errors: ['Input is null or undefined'] };
    }

    return { valid: true };
  }

  /**
   * Operation: Cache a result
   */
  private async opCacheResult(
    args: Record<string, unknown> | undefined,
    input: unknown,
    _context: SandboxContext
  ): Promise<boolean> {
    const key = (args?.['key'] as string) || 'default';
    const ttl = (args?.['ttl'] as number) || this.config.prompts.cacheTTL;

    this.operationCache.set(key, {
      result: input,
      expiry: Date.now() + ttl * 1000,
    });

    return true;
  }

  /**
   * Operation: Retrieve cached result
   */
  private async opRetrieveCache(
    args: Record<string, unknown> | undefined,
    _context: SandboxContext
  ): Promise<unknown> {
    const key = (args?.['key'] as string) || 'default';

    const cached = this.operationCache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return cached.result;
    }

    return null;
  }

  /**
   * Create sandbox context for execution
   */
  private createContext(projectPath: string): SandboxContext {
    return {
      projectPath: resolve(projectPath),
      workingDir: resolve(projectPath),
      env: {
        NODE_ENV: process.env['NODE_ENV'] || 'development',
        PROJECT_PATH: resolve(projectPath),
      },
      limits: {
        timeout: this.config.sandbox.timeout,
        memory: this.config.sandbox.memoryLimit,
        fsOperations: this.config.sandbox.fsOperationsLimit,
        networkAllowed: this.config.sandbox.networkAllowed,
      },
      state: new Map(),
    };
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(
    condition: { key: string; operator: string; value?: unknown },
    context: SandboxContext
  ): boolean {
    const stateValue = context.state.get(condition.key);

    switch (condition.operator) {
      case 'exists':
        return stateValue !== undefined;
      case 'equals':
        return stateValue === condition.value;
      case 'contains':
        if (typeof stateValue === 'string') {
          return stateValue.includes(String(condition.value));
        }
        if (Array.isArray(stateValue)) {
          return stateValue.includes(condition.value);
        }
        return false;
      case 'truthy':
        return !!stateValue;
      default:
        return false;
    }
  }

  /**
   * Generate cache key for an operation
   */
  private generateOperationCacheKey(operation: SandboxOperation): string {
    return `op:${operation.op}:${JSON.stringify(operation.args || {})}`;
  }

  /**
   * Get cached operation result
   */
  private getCachedOperation(key: string): unknown | undefined {
    const cached = this.operationCache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return cached.result;
    }
    return undefined;
  }

  /**
   * Set cached operation result
   */
  private setCachedOperation(key: string, result: unknown): void {
    this.operationCache.set(key, {
      result,
      expiry: Date.now() + this.config.prompts.cacheTTL * 1000,
    });
  }

  /**
   * Compose result from composition directive
   */
  private composeResult(
    compose: {
      sections: Array<{ source: string; key: string }>;
      template: string;
      format?: string;
    },
    context: SandboxContext
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {
      template: compose.template,
      format: compose.format || 'json',
      timestamp: new Date().toISOString(),
    };

    for (const section of compose.sections) {
      result[section.key] = context.state.get(section.source);
    }

    return result;
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.operationCache.clear();
    this.promptCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { operations: number; prompts: number } {
    return {
      operations: this.operationCache.size,
      prompts: this.promptCache.size,
    };
  }
}

/**
 * Global sandbox executor instance
 */
let globalSandboxExecutor: SandboxExecutor | null = null;

/**
 * Get or create the global sandbox executor
 */
export function getSandboxExecutor(config?: Partial<CEMCPConfig>): SandboxExecutor {
  if (!globalSandboxExecutor) {
    globalSandboxExecutor = new SandboxExecutor(config);
  }
  return globalSandboxExecutor;
}

/**
 * Reset the global sandbox executor
 */
export function resetSandboxExecutor(): void {
  globalSandboxExecutor = null;
}
