/**
 * CE-MCP (Code Execution with MCP) Type Definitions
 *
 * These types define the orchestration directive system that replaces
 * direct OpenRouter calls with host LLM-generated execution code.
 *
 * @see ADR-014: CE-MCP Architecture
 */

/**
 * Operation types that can be executed in the sandbox
 */
export type SandboxOperationType =
  | 'loadKnowledge'
  | 'loadPrompt'
  | 'analyzeFiles'
  | 'scanEnvironment'
  | 'generateContext'
  | 'composeResult'
  | 'validateOutput'
  | 'cacheResult'
  | 'retrieveCache';

/**
 * Single sandbox operation definition
 */
export interface SandboxOperation {
  /** Operation identifier */
  op: SandboxOperationType;
  /** Operation arguments */
  args?: Record<string, unknown>;
  /** Store result in this key for later use */
  store?: string;
  /** Use result from previous operation as input */
  input?: string;
  /** Multiple inputs from previous operations */
  inputs?: string[];
  /** Whether this operation's result should be returned */
  return?: boolean;
  /** Conditional execution based on previous result */
  condition?: {
    key: string;
    operator: 'exists' | 'equals' | 'contains' | 'truthy';
    value?: unknown;
  };
}

/**
 * Composition section for result building
 */
export interface CompositionSection {
  /** Source operation or data key */
  source: string;
  /** Key to use in composed result */
  key: string;
  /** Optional transformation to apply */
  transform?: 'summarize' | 'extract' | 'format' | 'filter';
  /** Transform options */
  transformOptions?: Record<string, unknown>;
}

/**
 * Composition directive for building final results
 */
export interface CompositionDirective {
  /** Sections to include in composition */
  sections: CompositionSection[];
  /** Template to use for composition */
  template: string;
  /** Output format */
  format?: 'json' | 'markdown' | 'text';
}

/**
 * Orchestration directive returned by CE-MCP tools
 *
 * Instead of executing prompts directly, tools return these directives
 * for the host LLM to generate execution code.
 */
export interface OrchestrationDirective {
  /** Directive type identifier */
  type: 'orchestration_directive';
  /** Version of the directive format */
  version: '1.0';
  /** Tool that generated this directive */
  tool: string;
  /** Human-readable description of what this directive accomplishes */
  description: string;
  /** Ordered list of sandbox operations */
  sandbox_operations: SandboxOperation[];
  /** Optional composition directive for final result */
  compose?: CompositionDirective;
  /** Expected output schema (for validation) */
  output_schema?: Record<string, unknown>;
  /** Metadata for tracking and debugging */
  metadata?: {
    estimated_tokens?: number;
    complexity?: 'low' | 'medium' | 'high';
    cacheable?: boolean;
    cache_key?: string;
  };
}

/**
 * State machine definition for multi-step tool chains
 */
export interface StateMachineDirective {
  /** Directive type identifier */
  type: 'state_machine_directive';
  /** Version of the directive format */
  version: '1.0';
  /** Initial state data */
  initial_state: Record<string, unknown>;
  /** State transitions */
  transitions: StateTransition[];
  /** Final state key that contains the result */
  final_state: string;
}

/**
 * Single state transition in a state machine
 */
export interface StateTransition {
  /** Transition name */
  name: string;
  /** From state (or 'initial' for first transition) */
  from: string;
  /** Operation to execute */
  operation: SandboxOperation | string;
  /** Next state after this transition */
  next_state: string;
  /** Error handling */
  on_error?: 'retry' | 'skip' | 'abort';
  /** Maximum retries if on_error is 'retry' */
  max_retries?: number;
}

/**
 * Sandbox execution context
 */
export interface SandboxContext {
  /** Project path being analyzed */
  projectPath: string;
  /** Working directory for sandbox operations */
  workingDir: string;
  /** Environment variables available to sandbox */
  env: Record<string, string>;
  /** Resource limits */
  limits: {
    /** Maximum execution time in ms */
    timeout: number;
    /** Maximum memory in bytes */
    memory: number;
    /** Maximum file system operations */
    fsOperations: number;
    /** Network access allowed */
    networkAllowed: boolean;
  };
  /** State storage for operation results */
  state: Map<string, unknown>;
}

/**
 * Sandbox execution result
 */
export interface SandboxExecutionResult {
  /** Whether execution succeeded */
  success: boolean;
  /** Result data if successful */
  data?: unknown;
  /** Error message if failed */
  error?: string;
  /** Execution metadata */
  metadata: {
    /** Total execution time in ms */
    executionTime: number;
    /** Number of operations executed */
    operationsExecuted: number;
    /** Peak memory usage */
    peakMemory?: number;
    /** Operations that were cached */
    cachedOperations: string[];
  };
}

/**
 * Prompt catalog entry for lazy loading
 */
export interface PromptCatalogEntry {
  /** Prompt file name */
  file: string;
  /** Estimated token count */
  tokens: number;
  /** Category for organization */
  category: 'adr' | 'deployment' | 'analysis' | 'research' | 'security' | 'rules';
  /** Available sections within this prompt */
  sections: string[];
  /** Dependencies on other prompts */
  dependencies?: string[];
  /** Whether this prompt should be loaded on-demand */
  loadOnDemand: boolean;
}

/**
 * Prompt catalog for lazy loading
 */
export type PromptCatalog = Record<string, PromptCatalogEntry>;

/**
 * CE-MCP execution mode
 */
export type CEMCPExecutionMode =
  | 'directive' // Return orchestration directives (default CE-MCP)
  | 'hybrid' // Support both directives and direct execution
  | 'legacy' // Original OpenRouter-based execution
  | 'fallback'; // Use OpenRouter only when directive execution fails

/**
 * CE-MCP configuration
 */
export interface CEMCPConfig {
  /** Execution mode */
  mode: CEMCPExecutionMode;
  /** Sandbox configuration */
  sandbox: {
    enabled: boolean;
    timeout: number;
    memoryLimit: number;
    fsOperationsLimit: number;
    networkAllowed: boolean;
  };
  /** Prompt loading configuration */
  prompts: {
    lazyLoading: boolean;
    cacheEnabled: boolean;
    cacheTTL: number;
  };
  /** OpenRouter fallback configuration */
  fallback: {
    enabled: boolean;
    apiKey?: string;
    model?: string;
    maxRetries: number;
  };
}

/**
 * Tool response that can be either traditional or CE-MCP directive
 */
export type ToolResponse =
  | { type: 'content'; content: Array<{ type: 'text'; text: string }> }
  | OrchestrationDirective
  | StateMachineDirective;

/**
 * Type guard for orchestration directive
 */
export function isOrchestrationDirective(
  response: ToolResponse
): response is OrchestrationDirective {
  return response.type === 'orchestration_directive';
}

/**
 * Type guard for state machine directive
 */
export function isStateMachineDirective(response: ToolResponse): response is StateMachineDirective {
  return response.type === 'state_machine_directive';
}

/**
 * Type guard for traditional content response
 */
export function isContentResponse(
  response: ToolResponse
): response is { type: 'content'; content: Array<{ type: 'text'; text: string }> } {
  return response.type === 'content';
}
