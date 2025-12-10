#!/usr/bin/env node

/**
 * MCP ADR Analysis Server
 * Main entry point for the Model Context Protocol server
 *
 * This server provides Tools, Resources, and Prompts for analyzing
 * Architectural Decision Records and project architecture.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';

import { readFileSync } from 'fs';
import { join } from 'path';
import { getCurrentDirCompat } from './utils/directory-compat.js';
import { McpAdrError } from './types/index.js';
import { CONVERSATION_CONTEXT_SCHEMA } from './types/conversation-context.js';
import {
  maskMcpResponse,
  createMaskingConfig,
  type MaskingConfig,
} from './utils/output-masking.js';
import {
  loadConfig,
  validateProjectPath,
  createLogger,
  printConfigSummary,
  type ServerConfig,
} from './utils/config.js';
import { KnowledgeGraphManager } from './utils/knowledge-graph-manager.js';
import { StateReinforcementManager } from './utils/state-reinforcement-manager.js';
import { ConversationMemoryManager } from './utils/conversation-memory-manager.js';
import { MemoryEntityManager } from './utils/memory-entity-manager.js';
import { RootManager } from './utils/root-manager.js';
import { ServerContextGenerator } from './utils/server-context-generator.js';
import { type ToolContext, createNoOpContext } from './types/tool-context.js';
import {
  type GetWorkflowGuidanceArgs,
  type GetArchitecturalContextArgs,
  type GetDevelopmentGuidanceArgs,
  type GenerateAdrFromDecisionArgs,
  type ValidateRulesArgs,
  type CreateRuleSetArgs,
  type ToolChainOrchestratorArgs,
  type ReadFileArgs,
  type WriteFileArgs,
  type AnalyzeProjectEcosystemArgs,
  type ArchitecturalDomain,
  type AnalyzeContentSecurityArgs,
  type GenerateContentMaskingArgs,
  type ConfigureCustomPatternsArgs,
  type ApplyBasicContentMaskingArgs,
  type ValidateContentMaskingArgs,
  type ActionArgs,
  type TodoManagementV2Args,
  type GenerateArchitecturalKnowledgeFunction,
  type ExecuteWithReflexionFunction,
  type RetrieveRelevantMemoriesFunction,
  type CreateToolReflexionConfigFunction,
} from './types/tool-arguments.js';

/**
 * Get version from package.json
 */
function getPackageVersion(): string {
  try {
    // Handle both Jest environment and normal execution
    const currentDir = getCurrentDirCompat();

    // Strategy 1: Try multiple possible locations for package.json
    const possiblePaths = [
      join(currentDir, 'package.json'),
      join(currentDir, '..', 'package.json'),
      join(currentDir, '..', '..', 'package.json'),
      join(process.cwd(), 'package.json'),
    ];

    for (const packageJsonPath of possiblePaths) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.name === 'mcp-adr-analysis-server') {
          return packageJson.version;
        }
      } catch {
        // Try next path
      }
    }

    // Strategy 2: Use process.env.npm_package_version if available (during npm scripts)
    if (process.env['npm_package_version']) {
      return process.env['npm_package_version'];
    }

    // Final fallback: Use generic version instead of hardcoded specific version
    // This prevents the need to update this code when version changes
    return 'unknown'; // Generic fallback - no longer tied to specific version
  } catch (error) {
    console.error('Error reading package.json:', error);
    return 'unknown'; // Generic fallback - no longer tied to specific version
  }
}

/**
 * Server configuration
 */
const SERVER_INFO = {
  name: 'mcp-adr-analysis-server',
  version: getPackageVersion(),
  description: 'MCP server for analyzing Architectural Decision Records and project architecture',
};

/**
 * Main server class
 */
export class McpAdrAnalysisServer {
  private server: Server;
  private maskingConfig: MaskingConfig;
  private config: ServerConfig;
  private logger: ReturnType<typeof createLogger>;
  private kgManager: KnowledgeGraphManager;
  private stateReinforcementManager: StateReinforcementManager;
  private conversationMemoryManager: ConversationMemoryManager;
  private memoryEntityManager: MemoryEntityManager;
  private rootManager: RootManager;
  private contextGenerator: ServerContextGenerator;

  constructor() {
    // Load and validate configuration
    this.config = loadConfig();
    this.logger = createLogger(this.config);
    this.kgManager = new KnowledgeGraphManager();
    this.stateReinforcementManager = new StateReinforcementManager(this.kgManager);
    this.conversationMemoryManager = new ConversationMemoryManager(this.kgManager);
    this.memoryEntityManager = new MemoryEntityManager();

    // Initialize root manager for file access control
    this.rootManager = new RootManager(this.config.projectPath, this.config.adrDirectory);

    // Initialize server context generator
    this.contextGenerator = new ServerContextGenerator();

    // Print configuration summary
    printConfigSummary(this.config);

    // Note: Validation will be done during startup

    this.server = new Server(SERVER_INFO, {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    });

    this.maskingConfig = createMaskingConfig();
    this.setupHandlers();
  }

  /**
   * Validate configuration and project setup
   */
  private async validateConfiguration(): Promise<void> {
    try {
      await validateProjectPath(this.config.projectPath);
      this.logger.info(`Project path validated: ${this.config.projectPath}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Configuration validation failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Public health check method for testing
   */
  async healthCheck(): Promise<void> {
    await this.validateConfiguration();
    this.logger.info('Health check completed successfully');
  }

  /**
   * Setup MCP protocol handlers
   *
   * @description Configures all Model Context Protocol request handlers for the ADR Analysis Server.
   * Implements the complete MCP specification including tools, resources, and prompts.
   *
   * @private
   * @since 2.0.0
   * @category MCP Protocol
   */
  private setupHandlers(): void {
    /**
     * List Tools Handler - MCP Protocol Endpoint
     *
     * @description Returns the complete catalog of available tools for ADR analysis,
     * research, validation, and deployment operations. Each tool includes comprehensive
     * input schemas and descriptions for client integration.
     *
     * @returns {Promise<{tools: Array}>} Complete tool catalog with schemas
     *
     * @example
     * ```typescript
     * // MCP Client usage
     * const tools = await mcpClient.listTools();
     * console.log(tools.tools.length); // 20+ available tools
     *
     * // Find specific tool
     * const researchTool = tools.tools.find(t => t.name === 'perform_research');
     * console.log(researchTool.description); // Tool description
     * ```
     *
     * @mcp-endpoint
     * @category Tools
     */
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'analyze_project_ecosystem',
            description:
              'Comprehensive recursive project ecosystem analysis with advanced prompting techniques (Knowledge Generation + Reflexion)',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description:
                    'Path to the project directory to analyze (optional, uses configured PROJECT_PATH if not provided)',
                },
                includePatterns: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'File patterns to include in analysis',
                },
                enhancedMode: {
                  type: 'boolean',
                  description:
                    'Enable advanced prompting features (Knowledge Generation + Reflexion)',
                  default: true,
                },
                knowledgeEnhancement: {
                  type: 'boolean',
                  description: 'Enable Knowledge Generation for technology-specific insights',
                  default: true,
                },
                learningEnabled: {
                  type: 'boolean',
                  description: 'Enable Reflexion learning from past analysis outcomes',
                  default: true,
                },
                technologyFocus: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'Specific technologies to focus analysis on (auto-detected if not provided)',
                },
                analysisDepth: {
                  type: 'string',
                  enum: ['basic', 'detailed', 'comprehensive'],
                  description: 'Depth of ecosystem analysis',
                  default: 'comprehensive',
                },
                includeEnvironment: {
                  type: 'boolean',
                  description:
                    'Automatically include comprehensive environment analysis (default: true)',
                  default: true,
                },
                recursiveDepth: {
                  type: 'string',
                  description: 'Depth of recursive project analysis',
                  enum: ['shallow', 'moderate', 'deep', 'comprehensive'],
                  default: 'comprehensive',
                },
                analysisScope: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'Specific analysis areas to focus on (e.g., ["security", "performance", "architecture", "dependencies"])',
                },
                conversationContext: CONVERSATION_CONTEXT_SCHEMA,
              },
              required: [],
            },
          },
          {
            name: 'get_architectural_context',
            description:
              'Get detailed architectural context for specific files or the entire project, automatically sets up ADR infrastructure if missing, and provides outcome-focused workflow for project success',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description:
                    'Specific file path to analyze (optional, analyzes entire project if not provided)',
                },
                includeCompliance: {
                  type: 'boolean',
                  description: 'Include compliance checks in the analysis',
                  default: true,
                },
                conversationContext: CONVERSATION_CONTEXT_SCHEMA,
              },
            },
          },
          {
            name: 'generate_adrs_from_prd',
            description:
              'Generate Architectural Decision Records from a Product Requirements Document with advanced prompting techniques (APE + Knowledge Generation)',
            inputSchema: {
              type: 'object',
              properties: {
                prdPath: {
                  type: 'string',
                  description: 'Path to the PRD.md file',
                },
                outputDirectory: {
                  type: 'string',
                  description:
                    'Directory to output generated ADRs (optional, uses configured ADR_DIRECTORY if not provided)',
                },
                enhancedMode: {
                  type: 'boolean',
                  description: 'Enable advanced prompting features (APE + Knowledge Generation)',
                  default: true,
                },
                promptOptimization: {
                  type: 'boolean',
                  description: 'Enable Automatic Prompt Engineering for optimized ADR generation',
                  default: true,
                },
                knowledgeEnhancement: {
                  type: 'boolean',
                  description: 'Enable Knowledge Generation for domain-specific insights',
                  default: true,
                },
                prdType: {
                  type: 'string',
                  enum: [
                    'web-application',
                    'mobile-app',
                    'microservices',
                    'data-platform',
                    'api-service',
                    'general',
                  ],
                  description: 'Type of PRD for optimized knowledge generation',
                  default: 'general',
                },
                conversationContext: CONVERSATION_CONTEXT_SCHEMA,
              },
              required: ['prdPath'],
            },
          },
          {
            name: 'compare_adr_progress',
            description:
              'Compare TODO.md progress against ADRs and current environment to validate implementation status',
            inputSchema: {
              type: 'object',
              properties: {
                todoPath: {
                  type: 'string',
                  description: 'Path to TODO.md file to analyze',
                  default: 'TODO.md',
                },
                adrDirectory: {
                  type: 'string',
                  description: 'Directory containing ADR files',
                  default: 'docs/adrs',
                },
                projectPath: {
                  type: 'string',
                  description: 'Path to project root for environment analysis',
                  default: '.',
                },
                environment: {
                  type: 'string',
                  enum: ['development', 'staging', 'production', 'testing', 'auto-detect'],
                  description:
                    'Target environment context for validation (auto-detect will infer from project structure)',
                  default: 'auto-detect',
                },
                environmentConfig: {
                  type: 'object',
                  description: 'Environment-specific configuration and requirements',
                  properties: {
                    requiredFiles: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Files required for this environment',
                    },
                    requiredServices: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Services that must be implemented for this environment',
                    },
                    securityLevel: {
                      type: 'string',
                      enum: ['low', 'medium', 'high', 'critical'],
                      description: 'Required security level for this environment',
                    },
                    performanceRequirements: {
                      type: 'object',
                      description: 'Performance requirements for this environment',
                    },
                  },
                },
                validationType: {
                  type: 'string',
                  enum: ['full', 'todo-only', 'adr-only', 'environment-only'],
                  description: 'Type of validation to perform',
                  default: 'full',
                },
                includeFileChecks: {
                  type: 'boolean',
                  description: 'Include file existence and implementation checks',
                  default: true,
                },
                includeRuleValidation: {
                  type: 'boolean',
                  description: 'Include architectural rule compliance validation',
                  default: true,
                },
                deepCodeAnalysis: {
                  type: 'boolean',
                  description:
                    'Perform deep code analysis to distinguish mock from production implementations',
                  default: true,
                },
                functionalValidation: {
                  type: 'boolean',
                  description:
                    'Validate that code actually functions according to ADR goals, not just exists',
                  default: true,
                },
                strictMode: {
                  type: 'boolean',
                  description:
                    'Enable strict validation mode with reality-check mechanisms against overconfident assessments',
                  default: true,
                },
                environmentValidation: {
                  type: 'boolean',
                  description: 'Enable environment-specific validation rules and checks',
                  default: true,
                },
              },
            },
          },
          {
            name: 'analyze_content_security',
            description:
              'Analyze content for sensitive information using AI-powered detection with optional memory integration for security pattern learning',
            inputSchema: {
              type: 'object',
              properties: {
                content: {
                  type: 'string',
                  description: 'Content to analyze for sensitive information',
                },
                contentType: {
                  type: 'string',
                  enum: ['code', 'documentation', 'configuration', 'logs', 'general'],
                  description: 'Type of content being analyzed',
                  default: 'general',
                },
                userDefinedPatterns: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'User-defined sensitive patterns to detect',
                },
                enableMemoryIntegration: {
                  type: 'boolean',
                  description:
                    'Enable memory entity storage for security pattern learning and institutional knowledge building',
                  default: true,
                },
                knowledgeEnhancement: {
                  type: 'boolean',
                  description:
                    'Enable Generated Knowledge Prompting for security and privacy expertise',
                  default: true,
                },
                enhancedMode: {
                  type: 'boolean',
                  description: 'Enable advanced prompting features',
                  default: true,
                },
              },
              required: ['content'],
            },
          },
          {
            name: 'generate_content_masking',
            description: 'Generate masking instructions for detected sensitive content',
            inputSchema: {
              type: 'object',
              properties: {
                content: {
                  type: 'string',
                  description: 'Content to mask',
                },
                detectedItems: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      content: { type: 'string' },
                      startPosition: { type: 'number' },
                      endPosition: { type: 'number' },
                      severity: { type: 'string' },
                    },
                  },
                  description: 'Detected sensitive items to mask',
                },
                maskingStrategy: {
                  type: 'string',
                  enum: ['full', 'partial', 'placeholder', 'environment'],
                  description: 'Strategy for masking content',
                  default: 'full',
                },
              },
              required: ['content', 'detectedItems'],
            },
          },
          {
            name: 'configure_custom_patterns',
            description: 'Configure custom sensitive patterns for a project',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the project directory',
                },
                existingPatterns: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Existing patterns to consider',
                },
              },
              required: ['projectPath'],
            },
          },
          {
            name: 'apply_basic_content_masking',
            description: 'Apply basic content masking (fallback when AI is not available)',
            inputSchema: {
              type: 'object',
              properties: {
                content: {
                  type: 'string',
                  description: 'Content to mask',
                },
                maskingStrategy: {
                  type: 'string',
                  enum: ['full', 'partial', 'placeholder'],
                  description: 'Strategy for masking content',
                  default: 'full',
                },
              },
              required: ['content'],
            },
          },
          {
            name: 'validate_content_masking',
            description: 'Validate that content masking was applied correctly',
            inputSchema: {
              type: 'object',
              properties: {
                originalContent: {
                  type: 'string',
                  description: 'Original content before masking',
                },
                maskedContent: {
                  type: 'string',
                  description: 'Content after masking',
                },
              },
              required: ['originalContent', 'maskedContent'],
            },
          },
          {
            name: 'manage_cache',
            description: 'Manage MCP resource cache (clear, stats, cleanup)',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['clear', 'stats', 'cleanup', 'invalidate'],
                  description: 'Cache management action to perform',
                },
                key: {
                  type: 'string',
                  description: 'Specific cache key to invalidate (for invalidate action)',
                },
              },
              required: ['action'],
            },
          },
          {
            name: 'configure_output_masking',
            description: 'Configure content masking for all MCP outputs',
            inputSchema: {
              type: 'object',
              properties: {
                enabled: {
                  type: 'boolean',
                  description: 'Enable or disable output masking',
                },
                strategy: {
                  type: 'string',
                  enum: ['full', 'partial', 'placeholder', 'environment'],
                  description: 'Masking strategy to use',
                },
                customPatterns: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Custom patterns to mask',
                },
                action: {
                  type: 'string',
                  enum: ['get', 'set', 'reset'],
                  description: 'Configuration action',
                  default: 'get',
                },
              },
            },
          },
          {
            name: 'suggest_adrs',
            description:
              'Suggest architectural decisions with advanced prompting techniques (Knowledge Generation + Reflexion). TIP: Read @.mcp-server-context.md first for project history, patterns, and previous ADRs to ensure consistency.',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the project directory',
                  default: '.',
                },
                analysisType: {
                  type: 'string',
                  enum: ['implicit_decisions', 'code_changes', 'comprehensive'],
                  description: 'Type of analysis to perform',
                  default: 'comprehensive',
                },
                beforeCode: {
                  type: 'string',
                  description: 'Code before changes (for code_changes analysis)',
                },
                afterCode: {
                  type: 'string',
                  description: 'Code after changes (for code_changes analysis)',
                },
                changeDescription: {
                  type: 'string',
                  description: 'Description of the changes (for code_changes analysis)',
                },
                commitMessages: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Related commit messages (for code_changes analysis)',
                },
                existingAdrs: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of existing ADR titles to avoid duplication',
                },
                enhancedMode: {
                  type: 'boolean',
                  description:
                    'Enable advanced prompting features (Knowledge Generation + Reflexion)',
                  default: true,
                },
                learningEnabled: {
                  type: 'boolean',
                  description: 'Enable Reflexion learning from past experiences',
                  default: true,
                },
                knowledgeEnhancement: {
                  type: 'boolean',
                  description: 'Enable Knowledge Generation for domain-specific insights',
                  default: true,
                },
                conversationContext: CONVERSATION_CONTEXT_SCHEMA,
              },
            },
          },
          {
            name: 'generate_adr_from_decision',
            description:
              'Generate a complete ADR from decision data. TIP: Reference @.mcp-server-context.md to align with existing architectural patterns and decisions.',
            inputSchema: {
              type: 'object',
              properties: {
                decisionData: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Decision title' },
                    context: { type: 'string', description: 'Decision context and problem' },
                    decision: { type: 'string', description: 'The architectural decision' },
                    consequences: { type: 'string', description: 'Decision consequences' },
                    alternatives: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Alternative approaches considered',
                    },
                    evidence: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Supporting evidence for the decision',
                    },
                  },
                  required: ['title', 'context', 'decision', 'consequences'],
                },
                templateFormat: {
                  type: 'string',
                  enum: ['nygard', 'madr', 'custom'],
                  description: 'ADR template format to use',
                  default: 'nygard',
                },
                existingAdrs: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of existing ADRs for numbering and references',
                },
                adrDirectory: {
                  type: 'string',
                  description: 'Directory where ADRs are stored',
                  default: 'docs/adrs',
                },
              },
              required: ['decisionData'],
            },
          },
          {
            name: 'generate_adr_bootstrap',
            description:
              "Generate bootstrap.sh and validate_bootstrap.sh scripts to ensure deployed code follows ADR requirements. **CRITICAL**: Before generating scripts, use WebFetch to query the base code repository (e.g., https://github.com/validatedpatterns/common for OpenShift) and authoritative pattern documentation (e.g., https://play.validatedpatterns.io/). Merge the base repository code into your project and have bootstrap.sh call the pattern's scripts rather than generating everything from scratch. This ensures compliance with validated deployment patterns.",
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the project directory',
                  default: '.',
                },
                adrDirectory: {
                  type: 'string',
                  description: 'Directory where ADRs are stored',
                  default: 'docs/adrs',
                },
                outputPath: {
                  type: 'string',
                  description: 'Directory where to generate scripts',
                  default: '.',
                },
                scriptType: {
                  type: 'string',
                  enum: ['bootstrap', 'validate', 'both'],
                  description: 'Which scripts to generate',
                  default: 'both',
                },
                includeTests: {
                  type: 'boolean',
                  description: 'Include test execution in bootstrap',
                  default: true,
                },
                includeDeployment: {
                  type: 'boolean',
                  description: 'Include deployment steps in bootstrap',
                  default: true,
                },
                customValidations: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Custom validation commands to include',
                },
                conversationContext: CONVERSATION_CONTEXT_SCHEMA,
              },
            },
          },
          {
            name: 'bootstrap_validation_loop',
            description:
              '**GUIDED EXECUTION MODE**: This tool guides you through an interactive, step-by-step deployment validation workflow. It does NOT execute commands internally - instead, it tells YOU what commands to run and processes the results iteratively. **Workflow**: (1) First call with iteration=0: Detects platform (OpenShift/K8s/Docker), validates environment connection, and requests human approval for target platform. (2) Subsequent calls: After running each command and reporting back with output, the tool provides next steps. **Environment Validation**: Before deployment, the tool verifies connection to the target platform (e.g., `oc status` for OpenShift, `kubectl cluster-info` for K8s) and requires explicit human confirmation. **Validated Patterns Integration**: Automatically identifies base code repositories (e.g., validatedpatterns/common for OpenShift) and guides you to merge them into your project. **Deployment Cleanup**: Supports CI/CD-style workflows with deployment teardown/restart guidance. **Call this tool iteratively**, passing previous command output back each time.',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the project directory',
                  default: '.',
                },
                adrDirectory: {
                  type: 'string',
                  description: 'Directory where ADRs are stored',
                  default: 'docs/adrs',
                },
                targetEnvironment: {
                  type: 'string',
                  enum: ['development', 'staging', 'production', 'testing'],
                  description: 'Target deployment environment',
                  default: 'development',
                },
                maxIterations: {
                  type: 'number',
                  description: 'Maximum validation/fix iterations',
                  default: 5,
                },
                autoFix: {
                  type: 'boolean',
                  description: 'Whether to generate auto-fix suggestions in guidance',
                  default: true,
                },
                updateAdrsWithLearnings: {
                  type: 'boolean',
                  description: 'Update ADRs with deployment learnings (non-sensitive)',
                  default: true,
                },
                currentIteration: {
                  type: 'number',
                  description:
                    'Current iteration number (0 for initial call, then increment). Used to track workflow progress.',
                  default: 0,
                },
                previousExecutionOutput: {
                  type: 'string',
                  description:
                    'Output from the previous command execution. Paste the stdout/stderr from running the command that was recommended in the previous iteration.',
                  default: '',
                },
                previousExecutionSuccess: {
                  type: 'boolean',
                  description:
                    'Whether the previous command execution succeeded (exit code 0). Set to true if command succeeded, false if it failed.',
                  default: false,
                },
                deploymentCleanupRequested: {
                  type: 'boolean',
                  description:
                    'Set to true to request deployment cleanup/teardown guidance (for CI/CD workflows that need to delete and restart deployments).',
                  default: false,
                },
                conversationContext: CONVERSATION_CONTEXT_SCHEMA,
              },
            },
          },
          {
            name: 'discover_existing_adrs',
            description: 'Discover and catalog existing ADRs in the project',
            inputSchema: {
              type: 'object',
              properties: {
                adrDirectory: {
                  type: 'string',
                  description: 'Directory to search for ADRs',
                  default: 'docs/adrs',
                },
                includeContent: {
                  type: 'boolean',
                  description: 'Whether to include ADR content in analysis',
                  default: false,
                },
              },
            },
          },
          {
            name: 'analyze_adr_timeline',
            description:
              'Analyze ADR timeline with smart time tracking, adaptive thresholds, and actionable recommendations. Auto-detects project context (startup/growth/mature) and generates prioritized work queue based on staleness, implementation lag, and technical debt.',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the project directory',
                  default: '.',
                },
                adrDirectory: {
                  type: 'string',
                  description: 'Directory containing ADR files',
                  default: 'docs/adrs',
                },
                generateActions: {
                  type: 'boolean',
                  description: 'Generate actionable work items with priority and effort estimates',
                  default: true,
                },
                thresholdProfile: {
                  type: 'string',
                  enum: ['startup', 'growth', 'mature', 'maintenance', 'feature_development'],
                  description:
                    'Threshold profile for action generation (auto-detected if not specified)',
                },
                autoDetectContext: {
                  type: 'boolean',
                  description: 'Auto-detect project phase from git activity and ADR patterns',
                  default: true,
                },
                includeContent: {
                  type: 'boolean',
                  description: 'Include ADR content for better analysis',
                  default: true,
                },
                forceExtract: {
                  type: 'boolean',
                  description: 'Force timeline extraction even if ADRs have dates',
                  default: false,
                },
              },
            },
          },
          {
            name: 'review_existing_adrs',
            description:
              'Review existing ADRs against actual code implementation with cloud/DevOps expertise. TIP: After review, call get_server_context to update @.mcp-server-context.md with findings.',
            inputSchema: {
              type: 'object',
              properties: {
                adrDirectory: {
                  type: 'string',
                  description: 'Directory containing ADR files',
                  default: 'docs/adrs',
                },
                projectPath: {
                  type: 'string',
                  description: 'Path to the project directory',
                  default: '.',
                },
                specificAdr: {
                  type: 'string',
                  description: 'Specific ADR filename or title to review (optional)',
                },
                analysisDepth: {
                  type: 'string',
                  enum: ['basic', 'detailed', 'comprehensive'],
                  description: 'Depth of analysis to perform',
                  default: 'detailed',
                },
                includeTreeSitter: {
                  type: 'boolean',
                  description: 'Use tree-sitter for enhanced code analysis',
                  default: true,
                },
                generateUpdatePlan: {
                  type: 'boolean',
                  description: 'Generate action plan for updating non-compliant ADRs',
                  default: true,
                },
                conversationContext: CONVERSATION_CONTEXT_SCHEMA,
              },
            },
          },
          {
            name: 'validate_adr',
            description:
              'Validate an existing ADR against actual infrastructure reality using research-driven analysis. TIP: Compare findings against patterns in @.mcp-server-context.md for consistency checks.',
            inputSchema: {
              type: 'object',
              properties: {
                adrPath: {
                  type: 'string',
                  description: 'Path to the ADR file to validate (relative or absolute)',
                },
                projectPath: {
                  type: 'string',
                  description: 'Path to the project directory',
                  default: '.',
                },
                adrDirectory: {
                  type: 'string',
                  description: 'Directory containing ADR files',
                  default: 'docs/adrs',
                },
                includeEnvironmentCheck: {
                  type: 'boolean',
                  description: 'Include live environment verification in validation',
                  default: true,
                },
                confidenceThreshold: {
                  type: 'number',
                  description: 'Minimum research confidence threshold (0-1)',
                  default: 0.6,
                },
              },
              required: ['adrPath'],
            },
          },
          {
            name: 'validate_all_adrs',
            description: 'Validate all ADRs in a directory against actual infrastructure reality',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to the project directory',
                  default: '.',
                },
                adrDirectory: {
                  type: 'string',
                  description: 'Directory containing ADR files',
                  default: 'docs/adrs',
                },
                includeEnvironmentCheck: {
                  type: 'boolean',
                  description: 'Include live environment verification in validation',
                  default: true,
                },
                minConfidence: {
                  type: 'number',
                  description: 'Minimum research confidence for validation (0-1)',
                  default: 0.6,
                },
              },
            },
          },
          {
            name: 'incorporate_research',
            description: 'Incorporate research findings into architectural decisions',
            inputSchema: {
              type: 'object',
              properties: {
                researchPath: {
                  type: 'string',
                  description: 'Path to research directory',
                  default: 'docs/research',
                },
                adrDirectory: {
                  type: 'string',
                  description: 'Path to ADR directory',
                  default: 'docs/adrs',
                },
                analysisType: {
                  type: 'string',
                  enum: [
                    'monitor',
                    'extract_topics',
                    'evaluate_impact',
                    'generate_updates',
                    'comprehensive',
                  ],
                  description: 'Type of research analysis to perform',
                  default: 'comprehensive',
                },
                existingTopics: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Previously identified research topics',
                },
                researchTopics: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      title: { type: 'string' },
                      category: { type: 'string' },
                      keyFindings: { type: 'array', items: { type: 'string' } },
                      relevanceScore: { type: 'number' },
                    },
                  },
                  description: 'Research topics for impact evaluation',
                },
                adrId: {
                  type: 'string',
                  description: 'ADR ID for update generation',
                },
                updateType: {
                  type: 'string',
                  enum: ['content', 'status', 'consequences', 'alternatives', 'deprecation'],
                  description: 'Type of ADR update to generate',
                },
                researchFindings: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      finding: { type: 'string' },
                      evidence: { type: 'array', items: { type: 'string' } },
                      impact: { type: 'string' },
                    },
                  },
                  description: 'Research findings for update generation',
                },
              },
            },
          },
          {
            name: 'create_research_template',
            description: 'Create a research template file for documenting findings',
            inputSchema: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'Title of the research',
                },
                category: {
                  type: 'string',
                  description: 'Research category',
                  default: 'general',
                },
                researchPath: {
                  type: 'string',
                  description: 'Path to research directory',
                  default: 'docs/research',
                },
              },
              required: ['title'],
            },
          },
          {
            name: 'request_action_confirmation',
            description: 'Request confirmation before applying research-based changes',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  description: 'Description of the action to be performed',
                },
                details: {
                  type: 'string',
                  description: 'Detailed information about the action',
                },
                impact: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'critical'],
                  description: 'Impact level of the action',
                  default: 'medium',
                },
              },
              required: ['action', 'details'],
            },
          },
          {
            name: 'generate_rules',
            description: 'Generate architectural rules from ADRs and code patterns',
            inputSchema: {
              type: 'object',
              properties: {
                source: {
                  type: 'string',
                  enum: ['adrs', 'patterns', 'both'],
                  description: 'Source for rule generation',
                  default: 'both',
                },
                adrDirectory: {
                  type: 'string',
                  description: 'Directory containing ADR files',
                  default: 'docs/adrs',
                },
                projectPath: {
                  type: 'string',
                  description: 'Path to project for pattern analysis',
                  default: '.',
                },
                existingRules: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      description: { type: 'string' },
                    },
                  },
                  description: 'Existing rules to avoid duplication',
                },
                outputFormat: {
                  type: 'string',
                  enum: ['json', 'yaml', 'both'],
                  description: 'Output format for rules',
                  default: 'json',
                },
              },
            },
          },
          {
            name: 'validate_rules',
            description: 'Validate code against architectural rules',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to file to validate',
                },
                fileContent: {
                  type: 'string',
                  description: 'Content to validate (alternative to filePath)',
                },
                fileName: {
                  type: 'string',
                  description: 'Name of file being validated (when using fileContent)',
                },
                rules: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      description: { type: 'string' },
                      pattern: { type: 'string' },
                      severity: { type: 'string' },
                      message: { type: 'string' },
                    },
                    required: ['id', 'name', 'pattern', 'severity', 'message'],
                  },
                  description: 'Rules to validate against',
                },
                validationType: {
                  type: 'string',
                  enum: ['file', 'function', 'component', 'module'],
                  description: 'Type of validation to perform',
                  default: 'file',
                },
                reportFormat: {
                  type: 'string',
                  enum: ['summary', 'detailed', 'json'],
                  description: 'Format for validation report',
                  default: 'detailed',
                },
              },
              required: ['rules'],
            },
          },
          {
            name: 'create_rule_set',
            description: 'Create machine-readable rule set in JSON/YAML format',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name of the rule set',
                },
                description: {
                  type: 'string',
                  description: 'Description of the rule set',
                  default: 'Generated architectural rule set',
                },
                adrRules: {
                  type: 'array',
                  items: { type: 'object' },
                  description: 'Rules extracted from ADRs',
                },
                patternRules: {
                  type: 'array',
                  items: { type: 'object' },
                  description: 'Rules generated from code patterns',
                },
                rules: {
                  type: 'array',
                  items: { type: 'object' },
                  description: 'Additional rules to include',
                },
                outputFormat: {
                  type: 'string',
                  enum: ['json', 'yaml', 'both'],
                  description: 'Output format for rule set',
                  default: 'json',
                },
                author: {
                  type: 'string',
                  description: 'Author of the rule set',
                  default: 'MCP ADR Analysis Server',
                },
              },
              required: ['name'],
            },
          },
          {
            name: 'analyze_environment',
            description:
              'Analyze environment context and provide optimization recommendations with optional memory integration for environment snapshot tracking',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Path to project directory',
                  default: '.',
                },
                adrDirectory: {
                  type: 'string',
                  description: 'Directory containing ADR files',
                  default: 'docs/adrs',
                },
                analysisType: {
                  type: 'string',
                  enum: [
                    'specs',
                    'containerization',
                    'requirements',
                    'compliance',
                    'comprehensive',
                  ],
                  description: 'Type of environment analysis to perform',
                  default: 'comprehensive',
                },
                currentEnvironment: {
                  type: 'object',
                  description: 'Current environment specifications (for compliance analysis)',
                },
                requirements: {
                  type: 'object',
                  description: 'Environment requirements (for compliance analysis)',
                },
                industryStandards: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Industry standards to assess compliance against',
                },
                enableMemoryIntegration: {
                  type: 'boolean',
                  description:
                    'Enable memory entity storage for environment snapshot tracking and historical analysis',
                  default: true,
                },
                enableTrendAnalysis: {
                  type: 'boolean',
                  description:
                    'Enable analysis of environment changes over time using stored snapshots',
                  default: true,
                },
              },
            },
          },
          {
            name: 'generate_research_questions',
            description:
              'Generate context-aware research questions and create research tracking system',
            inputSchema: {
              type: 'object',
              properties: {
                analysisType: {
                  type: 'string',
                  enum: ['correlation', 'relevance', 'questions', 'tracking', 'comprehensive'],
                  description: 'Type of research analysis to perform',
                  default: 'comprehensive',
                },
                researchContext: {
                  type: 'object',
                  properties: {
                    topic: { type: 'string' },
                    category: { type: 'string' },
                    scope: { type: 'string' },
                    objectives: { type: 'array', items: { type: 'string' } },
                    constraints: { type: 'array', items: { type: 'string' } },
                    timeline: { type: 'string' },
                  },
                  description: 'Research context and objectives',
                },
                problems: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      description: { type: 'string' },
                      category: { type: 'string' },
                      severity: { type: 'string' },
                      context: { type: 'string' },
                    },
                  },
                  description: 'Problems to correlate with knowledge graph',
                },
                knowledgeGraph: {
                  type: 'object',
                  properties: {
                    technologies: { type: 'array', items: { type: 'object' } },
                    patterns: { type: 'array', items: { type: 'object' } },
                    adrs: { type: 'array', items: { type: 'object' } },
                    relationships: { type: 'array', items: { type: 'object' } },
                  },
                  description: 'Architectural knowledge graph',
                },
                relevantKnowledge: {
                  type: 'object',
                  properties: {
                    adrs: { type: 'array', items: { type: 'object' } },
                    patterns: { type: 'array', items: { type: 'object' } },
                    gaps: { type: 'array', items: { type: 'object' } },
                    opportunities: { type: 'array', items: { type: 'object' } },
                  },
                  description: 'Relevant knowledge for question generation',
                },
                researchQuestions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      question: { type: 'string' },
                      type: { type: 'string' },
                      priority: { type: 'string' },
                      timeline: { type: 'string' },
                      methodology: { type: 'string' },
                    },
                  },
                  description: 'Research questions for task tracking',
                },
                currentProgress: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      questionId: { type: 'string' },
                      status: { type: 'string' },
                      progress: { type: 'number' },
                      findings: { type: 'array', items: { type: 'string' } },
                      blockers: { type: 'array', items: { type: 'string' } },
                    },
                  },
                  description: 'Current research progress',
                },
                projectPath: {
                  type: 'string',
                  description: 'Path to project directory',
                  default: '.',
                },
                adrDirectory: {
                  type: 'string',
                  description: 'Directory containing ADR files',
                  default: 'docs/adrs',
                },
              },
            },
          },
          {
            name: 'perform_research',
            description:
              'Perform research using cascading sources: project files → knowledge graph → environment resources → web search (fallback)',
            inputSchema: {
              type: 'object',
              properties: {
                question: {
                  type: 'string',
                  description: 'The research question to answer',
                },
                projectPath: {
                  type: 'string',
                  description: 'Path to project directory',
                  default: '.',
                },
                adrDirectory: {
                  type: 'string',
                  description: 'Directory containing ADR files',
                  default: 'docs/adrs',
                },
                confidenceThreshold: {
                  type: 'number',
                  description: 'Minimum confidence threshold (0-1) before suggesting web search',
                  default: 0.6,
                  minimum: 0,
                  maximum: 1,
                },
                performWebSearch: {
                  type: 'boolean',
                  description: 'Enable web search recommendations when confidence is low',
                  default: true,
                },
              },
              required: ['question'],
            },
          },
          {
            name: 'llm_web_search',
            description: 'LLM-managed web search using Firecrawl for cross-platform support',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query to execute',
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum results to return',
                  default: 5,
                  minimum: 1,
                  maximum: 20,
                },
                includeContent: {
                  type: 'boolean',
                  description: 'Include full content in results',
                  default: true,
                },
                llmInstructions: {
                  type: 'string',
                  description: 'LLM instructions for search optimization',
                },
                projectPath: {
                  type: 'string',
                  description: 'Path to project directory',
                  default: '.',
                },
                adrDirectory: {
                  type: 'string',
                  description: 'Directory containing ADR files',
                  default: 'docs/adrs',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'llm_cloud_management',
            description: 'LLM-managed cloud provider operations with research-driven approach',
            inputSchema: {
              type: 'object',
              properties: {
                provider: {
                  type: 'string',
                  enum: ['aws', 'azure', 'gcp', 'redhat', 'ubuntu', 'macos'],
                  description: 'Cloud provider to use',
                },
                action: {
                  type: 'string',
                  description: 'Action to perform',
                },
                parameters: {
                  type: 'object',
                  description: 'Action parameters',
                },
                llmInstructions: {
                  type: 'string',
                  description: 'LLM instructions for command generation',
                },
                researchFirst: {
                  type: 'boolean',
                  description: 'Research best approach first',
                  default: true,
                },
                projectPath: {
                  type: 'string',
                  description: 'Path to project directory',
                  default: '.',
                },
                adrDirectory: {
                  type: 'string',
                  description: 'Directory containing ADR files',
                  default: 'docs/adrs',
                },
              },
              required: ['provider', 'action', 'llmInstructions'],
            },
          },
          {
            name: 'llm_database_management',
            description: 'LLM-managed database operations with research-driven approach',
            inputSchema: {
              type: 'object',
              properties: {
                database: {
                  type: 'string',
                  enum: ['postgresql', 'mongodb', 'redis', 'mysql', 'mariadb'],
                  description: 'Database type to use',
                },
                action: {
                  type: 'string',
                  description: 'Database action to perform',
                },
                parameters: {
                  type: 'object',
                  description: 'Action parameters',
                },
                llmInstructions: {
                  type: 'string',
                  description: 'LLM instructions for command generation',
                },
                researchFirst: {
                  type: 'boolean',
                  description: 'Research best approach first',
                  default: true,
                },
                projectPath: {
                  type: 'string',
                  description: 'Path to project directory',
                  default: '.',
                },
                adrDirectory: {
                  type: 'string',
                  description: 'Directory containing ADR files',
                  default: 'docs/adrs',
                },
              },
              required: ['database', 'action', 'llmInstructions'],
            },
          },
          {
            name: 'analyze_deployment_progress',
            description: 'Analyze deployment progress and verify completion with outcome rules',
            inputSchema: {
              type: 'object',
              properties: {
                analysisType: {
                  type: 'string',
                  enum: ['tasks', 'cicd', 'progress', 'completion', 'comprehensive'],
                  description: 'Type of deployment analysis to perform',
                  default: 'comprehensive',
                },
                adrDirectory: {
                  type: 'string',
                  description: 'Directory containing ADR files',
                  default: 'docs/adrs',
                },
                todoPath: {
                  type: 'string',
                  description: 'Path to TODO.md file for task identification',
                  default: 'TODO.md',
                },
                cicdLogs: {
                  type: 'string',
                  description: 'CI/CD pipeline logs for analysis',
                },
                pipelineConfig: {
                  type: 'string',
                  description: 'CI/CD pipeline configuration',
                },
                deploymentTasks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      taskId: { type: 'string' },
                      taskName: { type: 'string' },
                      status: { type: 'string' },
                      progress: { type: 'number' },
                      category: { type: 'string' },
                      priority: { type: 'string' },
                      verificationCriteria: { type: 'array', items: { type: 'string' } },
                      expectedOutcome: { type: 'string' },
                    },
                  },
                  description: 'Deployment tasks for progress calculation',
                },
                outcomeRules: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      ruleId: { type: 'string' },
                      description: { type: 'string' },
                      criteria: { type: 'array', items: { type: 'string' } },
                      verificationMethod: { type: 'string' },
                    },
                  },
                  description: 'Outcome rules for completion verification',
                },
                actualOutcomes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      taskId: { type: 'string' },
                      outcome: { type: 'string' },
                      evidence: { type: 'array', items: { type: 'string' } },
                      timestamp: { type: 'string' },
                    },
                  },
                  description: 'Actual deployment outcomes',
                },
                cicdStatus: {
                  type: 'object',
                  description: 'CI/CD pipeline status data',
                },
                environmentStatus: {
                  type: 'object',
                  description: 'Environment status data',
                },
              },
            },
          },
          {
            name: 'check_ai_execution_status',
            description:
              'Check AI execution configuration and status for debugging prompt-only mode issues',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'get_workflow_guidance',
            description:
              'Get intelligent workflow guidance and tool recommendations based on your goals and project context to achieve expected outcomes efficiently',
            inputSchema: {
              type: 'object',
              properties: {
                goal: {
                  type: 'string',
                  description:
                    'What you want to accomplish (e.g., "analyze new project", "document existing decisions", "security audit", "modernize legacy system")',
                },
                projectContext: {
                  type: 'string',
                  description:
                    'Current state of your project (e.g., "new project", "existing project with ADRs", "legacy codebase", "greenfield development")',
                  enum: [
                    'new_project',
                    'existing_with_adrs',
                    'existing_without_adrs',
                    'legacy_codebase',
                    'greenfield',
                    'maintenance_mode',
                    'unknown',
                  ],
                },
                availableAssets: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'What assets you already have (e.g., ["PRD.md", "existing ADRs", "codebase", "documentation", "test suite"])',
                },
                timeframe: {
                  type: 'string',
                  description: 'Available time/effort level',
                  enum: [
                    'quick_analysis',
                    'thorough_review',
                    'comprehensive_audit',
                    'ongoing_process',
                  ],
                },
                primaryConcerns: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'Main areas of concern (e.g., ["security", "performance", "maintainability", "scalability", "compliance"])',
                },
              },
              required: ['goal', 'projectContext'],
            },
          },
          {
            name: 'get_development_guidance',
            description:
              'Get comprehensive development guidance that translates architectural decisions and workflow recommendations into specific coding tasks, implementation patterns, and development roadmap',
            inputSchema: {
              type: 'object',
              properties: {
                developmentPhase: {
                  type: 'string',
                  description: 'Current development phase',
                  enum: [
                    'planning',
                    'setup',
                    'implementation',
                    'testing',
                    'deployment',
                    'maintenance',
                    'refactoring',
                  ],
                },
                adrsToImplement: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'List of ADR titles or file paths that need to be implemented in code',
                },
                technologyStack: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'Current technology stack (e.g., ["TypeScript", "React", "Node.js", "PostgreSQL", "Docker"])',
                },
                currentProgress: {
                  type: 'string',
                  description: 'What has already been implemented or current state of development',
                },
                teamContext: {
                  type: 'object',
                  properties: {
                    size: {
                      type: 'string',
                      enum: ['solo', 'small_team', 'medium_team', 'large_team'],
                    },
                    experienceLevel: {
                      type: 'string',
                      enum: ['junior', 'mixed', 'senior', 'expert'],
                    },
                  },
                },
                timeline: {
                  type: 'string',
                  description: 'Development timeline or deadline constraints',
                },
                focusAreas: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'Specific areas to focus on (e.g., ["API design", "database schema", "testing strategy", "deployment pipeline"])',
                },
              },
              required: ['developmentPhase'],
            },
          },
          {
            name: 'list_roots',
            description:
              'List available file system roots that can be accessed. Use this to discover what directories are available before reading files.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'read_directory',
            description:
              'List files and folders in a directory. Use this to explore the file structure within accessible roots.',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description:
                    'Directory path to list (relative to project root or absolute within roots)',
                },
              },
              required: ['path'],
            },
          },
          {
            name: 'read_file',
            description: 'Read contents of a file',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to the file to read',
                },
                path: {
                  type: 'string',
                  description: 'Path to the file to read (alias for filePath)',
                },
              },
              required: [],
            },
          },
          {
            name: 'write_file',
            description: 'Write content to a file',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Path to the file to write',
                },
                content: {
                  type: 'string',
                  description: 'Content to write to the file',
                },
              },
              required: ['path', 'content'],
            },
          },
          {
            name: 'list_directory',
            description: 'List contents of a directory',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Path to the directory to list',
                },
              },
              required: ['path'],
            },
          },
          {
            name: 'generate_deployment_guidance',
            description:
              'Generate deployment guidance and instructions from ADRs with environment-specific configurations',
            inputSchema: {
              type: 'object',
              properties: {
                adrDirectory: {
                  type: 'string',
                  default: 'docs/adrs',
                  description: 'Directory containing ADR files',
                },
                environment: {
                  type: 'string',
                  enum: ['development', 'staging', 'production', 'all'],
                  default: 'production',
                  description: 'Target deployment environment',
                },
                format: {
                  type: 'string',
                  enum: ['markdown', 'scripts', 'structured', 'all'],
                  default: 'markdown',
                  description: 'Output format for guidance',
                },
                projectPath: {
                  type: 'string',
                  description:
                    'Project root path (optional, uses configured PROJECT_PATH if not provided)',
                },
                includeScripts: {
                  type: 'boolean',
                  default: true,
                  description: 'Generate deployment scripts',
                },
                includeConfigs: {
                  type: 'boolean',
                  default: true,
                  description: 'Generate configuration files',
                },
                includeValidation: {
                  type: 'boolean',
                  default: true,
                  description: 'Include validation and health checks',
                },
                technologyFilter: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: [
                      'containerization',
                      'database',
                      'web-server',
                      'cache',
                      'message-queue',
                      'monitoring',
                      'security',
                      'ci-cd',
                      'infrastructure',
                    ],
                  },
                  description: 'Filter by specific technology categories',
                },
                customRequirements: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional custom requirements',
                },
                includeRollback: {
                  type: 'boolean',
                  default: true,
                  description: 'Include rollback procedures',
                },
                generateFiles: {
                  type: 'boolean',
                  default: false,
                  description: 'Actually generate files (vs just guidance)',
                },
              },
              required: [],
            },
          },
          {
            name: 'smart_git_push',
            description:
              'AI-driven security-focused git push with credential detection, file filtering, and deployment metrics tracking. Tests should be run by calling AI and results provided.',
            inputSchema: {
              type: 'object',
              properties: {
                branch: {
                  type: 'string',
                  description:
                    'Target branch for push (optional, uses current branch if not specified)',
                },
                message: {
                  type: 'string',
                  description: 'Commit message (optional, commits staged files if provided)',
                },
                testResults: {
                  type: 'object',
                  description:
                    'Test results from AI-executed tests (required for proper deployment tracking)',
                  properties: {
                    success: {
                      type: 'boolean',
                      description: 'Whether all tests passed',
                    },
                    testsRun: {
                      type: 'number',
                      description: 'Total number of tests executed',
                    },
                    testsPassed: {
                      type: 'number',
                      description: 'Number of tests that passed',
                    },
                    testsFailed: {
                      type: 'number',
                      description: 'Number of tests that failed',
                    },
                    duration: {
                      type: 'number',
                      description: 'Test execution duration in seconds',
                    },
                    command: {
                      type: 'string',
                      description: 'Test command that was executed by AI',
                    },
                    output: {
                      type: 'string',
                      description: 'Test execution output',
                    },
                    failureDetails: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Details of test failures',
                    },
                    testTypes: {
                      type: 'object',
                      description: 'Results broken down by test type (unit, integration, etc.)',
                      additionalProperties: {
                        type: 'object',
                        properties: {
                          passed: { type: 'number' },
                          failed: { type: 'number' },
                        },
                      },
                    },
                  },
                  required: ['success', 'testsRun', 'testsPassed', 'testsFailed'],
                },
                skipSecurity: {
                  type: 'boolean',
                  default: false,
                  description: 'Skip security scanning (NOT RECOMMENDED)',
                },
                dryRun: {
                  type: 'boolean',
                  default: false,
                  description: 'Show what would be pushed without actually pushing',
                },
                projectPath: {
                  type: 'string',
                  description: 'Path to project directory (defaults to current working directory)',
                },
                forceUnsafe: {
                  type: 'boolean',
                  default: false,
                  description: 'Override security blocks and test failures (DANGEROUS)',
                },
              },
            },
          },
          {
            name: 'deployment_readiness',
            description:
              'Comprehensive deployment readiness validation with test failure tracking, deployment history analysis, and hard blocking for unsafe deployments. Integrates with smart_git_push for deployment gating.',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  enum: [
                    'check_readiness',
                    'validate_production',
                    'test_validation',
                    'deployment_history',
                    'full_audit',
                    'emergency_override',
                  ],
                  description: 'Type of deployment readiness check to perform',
                },
                projectPath: {
                  type: 'string',
                  description: 'Path to project directory (defaults to current working directory)',
                },
                targetEnvironment: {
                  type: 'string',
                  enum: ['staging', 'production', 'integration'],
                  default: 'production',
                  description: 'Target deployment environment',
                },
                strictMode: {
                  type: 'boolean',
                  default: true,
                  description: 'Enable strict validation (recommended for production)',
                },
                allowMockCode: {
                  type: 'boolean',
                  default: false,
                  description: 'Allow mock code in deployment (NOT RECOMMENDED)',
                },
                productionCodeThreshold: {
                  type: 'number',
                  default: 85,
                  description: 'Minimum production code quality score (0-100)',
                },
                mockCodeMaxAllowed: {
                  type: 'number',
                  default: 0,
                  description: 'Maximum mock code indicators allowed',
                },
                maxTestFailures: {
                  type: 'number',
                  default: 0,
                  description: 'Maximum test failures allowed (0 = zero tolerance)',
                },
                requireTestCoverage: {
                  type: 'number',
                  default: 80,
                  description: 'Minimum test coverage percentage required',
                },
                blockOnFailingTests: {
                  type: 'boolean',
                  default: true,
                  description: 'Block deployment if tests are failing',
                },
                testSuiteRequired: {
                  type: 'array',
                  items: { type: 'string' },
                  default: [],
                  description: 'Required test suites that must pass',
                },
                maxRecentFailures: {
                  type: 'number',
                  default: 2,
                  description: 'Maximum recent deployment failures allowed',
                },
                deploymentSuccessThreshold: {
                  type: 'number',
                  default: 80,
                  description: 'Minimum deployment success rate required (%)',
                },
                blockOnRecentFailures: {
                  type: 'boolean',
                  default: true,
                  description: 'Block if recent deployments failed',
                },
                rollbackFrequencyThreshold: {
                  type: 'number',
                  default: 20,
                  description: 'Maximum rollback frequency allowed (%)',
                },
                requireAdrCompliance: {
                  type: 'boolean',
                  default: true,
                  description: 'Require ADR compliance validation',
                },
                integrateTodoTasks: {
                  type: 'boolean',
                  default: true,
                  description: 'Auto-create blocking tasks for issues',
                },
                updateHealthScoring: {
                  type: 'boolean',
                  default: true,
                  description: 'Update project health scores',
                },
                triggerSmartGitPush: {
                  type: 'boolean',
                  default: false,
                  description: 'Trigger smart git push validation',
                },
                emergencyBypass: {
                  type: 'boolean',
                  default: false,
                  description: 'Emergency bypass for critical fixes',
                },
                businessJustification: {
                  type: 'string',
                  description:
                    'Business justification for overrides (required for emergency_override)',
                },
                approvalRequired: {
                  type: 'boolean',
                  default: true,
                  description: 'Require approval for overrides',
                },
                enableMemoryIntegration: {
                  type: 'boolean',
                  description:
                    'Enable memory entity storage for deployment assessment tracking and historical analysis',
                  default: true,
                },
                migrateExistingHistory: {
                  type: 'boolean',
                  description: 'Migrate existing JSON-based deployment history to memory entities',
                  default: true,
                },
              },
              required: ['operation'],
            },
          },
          {
            name: 'troubleshoot_guided_workflow',
            description:
              'Structured failure analysis and test plan generation with memory integration for troubleshooting session tracking and intelligent ADR/research suggestion capabilities - provide JSON failure info to get specific test commands',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  enum: ['analyze_failure', 'generate_test_plan', 'full_workflow'],
                  description: 'Type of troubleshooting operation',
                },
                failure: {
                  type: 'object',
                  properties: {
                    failureType: {
                      type: 'string',
                      enum: [
                        'test_failure',
                        'deployment_failure',
                        'build_failure',
                        'runtime_error',
                        'performance_issue',
                        'security_issue',
                        'other',
                      ],
                      description: 'Type of failure',
                    },
                    failureDetails: {
                      type: 'object',
                      properties: {
                        command: {
                          type: 'string',
                          description: 'Command that failed (optional)',
                        },
                        exitCode: {
                          type: 'number',
                          description: 'Exit code of failed process (optional)',
                        },
                        errorMessage: {
                          type: 'string',
                          description: 'Primary error message',
                        },
                        stackTrace: {
                          type: 'string',
                          description: 'Stack trace if available (optional)',
                        },
                        logOutput: {
                          type: 'string',
                          description: 'Relevant log output (optional)',
                        },
                        environment: {
                          type: 'string',
                          description: 'Environment where failure occurred (optional)',
                        },
                        timestamp: {
                          type: 'string',
                          description: 'When the failure occurred (optional)',
                        },
                        affectedFiles: {
                          type: 'array',
                          items: { type: 'string' },
                          description: 'Files involved in the failure (optional)',
                        },
                      },
                      required: ['errorMessage'],
                      description: 'Detailed failure information',
                    },
                    context: {
                      type: 'object',
                      properties: {
                        recentChanges: {
                          type: 'string',
                          description: 'Recent changes that might be related (optional)',
                        },
                        reproducible: {
                          type: 'boolean',
                          description: 'Whether the failure is reproducible (optional)',
                        },
                        frequency: {
                          type: 'string',
                          description: 'How often this failure occurs (optional)',
                        },
                        impact: {
                          type: 'string',
                          enum: ['low', 'medium', 'high', 'critical'],
                          description: 'Impact level of the failure (optional)',
                        },
                      },
                      description: 'Additional context about the failure (optional)',
                    },
                  },
                  required: ['failureType', 'failureDetails'],
                  description:
                    'Structured failure information (required for analyze_failure and generate_test_plan)',
                },
                projectPath: {
                  type: 'string',
                  description: 'Path to project directory (optional)',
                },
                adrDirectory: {
                  type: 'string',
                  description: 'ADR directory path',
                  default: 'docs/adrs',
                },
                todoPath: {
                  type: 'string',
                  description: 'Path to TODO.md file',
                  default: 'TODO.md',
                },
                enableMemoryIntegration: {
                  type: 'boolean',
                  description:
                    'Enable memory entity storage for troubleshooting session tracking and pattern recognition',
                  default: true,
                },
                enablePatternRecognition: {
                  type: 'boolean',
                  description: 'Enable automatic pattern recognition and failure classification',
                  default: true,
                },
                enableAdrSuggestion: {
                  type: 'boolean',
                  description: 'Enable automatic ADR suggestion based on recurring failures',
                  default: true,
                },
                enableResearchGeneration: {
                  type: 'boolean',
                  description:
                    'Enable automatic research question generation for persistent problems',
                  default: true,
                },
                conversationContext: CONVERSATION_CONTEXT_SCHEMA,
              },
              required: ['operation'],
            },
          },
          {
            name: 'smart_score',
            description:
              'Central coordination for project health scoring system - recalculate, sync, diagnose, optimize, and reset scores across all MCP tools',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  enum: [
                    'recalculate_scores',
                    'sync_scores',
                    'diagnose_scores',
                    'optimize_weights',
                    'reset_scores',
                    'get_score_trends',
                    'get_intent_scores',
                  ],
                  description: 'Smart scoring operation to perform',
                },
                projectPath: {
                  type: 'string',
                  description: 'Path to project directory',
                },
                components: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: [
                      'task_completion',
                      'deployment_readiness',
                      'architecture_compliance',
                      'security_posture',
                      'code_quality',
                      'all',
                    ],
                  },
                  default: ['all'],
                  description: 'Score components to recalculate (for recalculate_scores operation)',
                },
                forceUpdate: {
                  type: 'boolean',
                  default: false,
                  description: 'Force update even if data is fresh',
                },
                updateSources: {
                  type: 'boolean',
                  default: true,
                  description: 'Trigger source tool updates before recalculating',
                },
                todoPath: {
                  type: 'string',
                  default: 'TODO.md',
                  description: 'Path to TODO.md file (for sync_scores operation)',
                },
                triggerTools: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: [
                      'smart_git_push',
                      'compare_adr_progress',
                      'analyze_content_security',
                      'validate_rules',
                    ],
                  },
                  description: 'Tools to trigger for fresh data (for sync_scores operation)',
                },
                rebalanceWeights: {
                  type: 'boolean',
                  default: false,
                  description: 'Recalculate optimal scoring weights (for sync_scores operation)',
                },
                includeHistory: {
                  type: 'boolean',
                  default: true,
                  description: 'Include score history analysis (for diagnose_scores operation)',
                },
                checkDataFreshness: {
                  type: 'boolean',
                  default: true,
                  description:
                    'Validate data freshness across tools (for diagnose_scores operation)',
                },
                suggestImprovements: {
                  type: 'boolean',
                  default: true,
                  description:
                    'Provide score improvement suggestions (for diagnose_scores operation)',
                },
                analysisMode: {
                  type: 'string',
                  enum: ['current_state', 'historical_data', 'project_type'],
                  default: 'current_state',
                  description: 'Method for weight optimization (for optimize_weights operation)',
                },
                customWeights: {
                  type: 'object',
                  properties: {
                    taskCompletion: { type: 'number', minimum: 0, maximum: 1 },
                    deploymentReadiness: { type: 'number', minimum: 0, maximum: 1 },
                    architectureCompliance: { type: 'number', minimum: 0, maximum: 1 },
                    securityPosture: { type: 'number', minimum: 0, maximum: 1 },
                    codeQuality: { type: 'number', minimum: 0, maximum: 1 },
                  },
                  description: 'Custom weight overrides (for optimize_weights operation)',
                },
                previewOnly: {
                  type: 'boolean',
                  default: false,
                  description: 'Preview changes without applying (for optimize_weights operation)',
                },
                component: {
                  type: 'string',
                  enum: [
                    'task_completion',
                    'deployment_readiness',
                    'architecture_compliance',
                    'security_posture',
                    'code_quality',
                    'all',
                  ],
                  default: 'all',
                  description: 'Score component to reset (for reset_scores operation)',
                },
                preserveHistory: {
                  type: 'boolean',
                  default: true,
                  description: 'Preserve score history in backup (for reset_scores operation)',
                },
                recalculateAfterReset: {
                  type: 'boolean',
                  default: true,
                  description: 'Immediately recalculate after reset (for reset_scores operation)',
                },
                intentId: {
                  type: 'string',
                  description:
                    'Intent ID to get score trends for (for get_intent_scores operation)',
                },
              },
              required: ['operation', 'projectPath'],
            },
          },
          {
            name: 'mcp_planning',
            description:
              'Enhanced project planning and workflow management tool - phase-based project management, team resource allocation, progress tracking, risk analysis, and executive reporting',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  enum: [
                    'create_project',
                    'manage_phases',
                    'track_progress',
                    'manage_resources',
                    'risk_analysis',
                    'generate_reports',
                  ],
                  description: 'Project planning operation to perform',
                },
                projectPath: {
                  type: 'string',
                  description: 'Project root path',
                },
                projectName: {
                  type: 'string',
                  description: 'Project name (for create_project operation)',
                },
                description: {
                  type: 'string',
                  description: 'Project description (for create_project operation)',
                },
                phases: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      duration: { type: 'string' },
                      dependencies: {
                        type: 'array',
                        items: { type: 'string' },
                        default: [],
                      },
                      milestones: {
                        type: 'array',
                        items: { type: 'string' },
                        default: [],
                      },
                    },
                    required: ['name', 'duration'],
                  },
                  description: 'Initial project phases (for create_project operation)',
                },
                team: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      role: { type: 'string' },
                      skills: {
                        type: 'array',
                        items: { type: 'string' },
                        default: [],
                      },
                      capacity: { type: 'string' },
                    },
                    required: ['name', 'role', 'capacity'],
                  },
                  default: [],
                  description: 'Team structure (for create_project operation)',
                },
                importFromAdrs: {
                  type: 'boolean',
                  default: true,
                  description: 'Import phases from existing ADRs (for create_project operation)',
                },
                importFromTodos: {
                  type: 'boolean',
                  default: true,
                  description: 'Import tasks from TODO system (for create_project operation)',
                },
                action: {
                  type: 'string',
                  enum: [
                    'list',
                    'create',
                    'update',
                    'delete',
                    'transition',
                    'add',
                    'remove',
                    'allocate',
                    'optimize',
                  ],
                  description: 'Management action (for manage_phases/manage_resources operations)',
                },
                phaseId: {
                  type: 'string',
                  description: 'Phase ID for phase operations',
                },
                phaseData: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    estimatedDuration: { type: 'string' },
                    dependencies: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    milestones: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    linkedAdrs: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                  description: 'Phase data for create/update operations',
                },
                targetStatus: {
                  type: 'string',
                  enum: ['planning', 'active', 'completed', 'blocked', 'cancelled'],
                  description: 'Target status for phase transition',
                },
                reportType: {
                  type: 'string',
                  enum: [
                    'summary',
                    'detailed',
                    'gantt',
                    'milestones',
                    'risks',
                    'executive',
                    'status',
                    'health',
                    'team_performance',
                    'milestone_tracking',
                  ],
                  default: 'summary',
                  description: 'Type of progress report or generated report',
                },
                timeframe: {
                  type: 'string',
                  enum: [
                    'current',
                    'weekly',
                    'monthly',
                    'quarterly',
                    'week',
                    'month',
                    'quarter',
                    'project',
                  ],
                  default: 'current',
                  description: 'Time frame for reports and tracking',
                },
                includeVisuals: {
                  type: 'boolean',
                  default: true,
                  description: 'Include visual progress indicators',
                },
                updateTaskProgress: {
                  type: 'boolean',
                  default: true,
                  description: 'Sync progress from TODO system',
                },
                memberId: {
                  type: 'string',
                  description: 'Team member ID for resource operations',
                },
                memberData: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    role: { type: 'string' },
                    skills: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    capacity: { type: 'string' },
                  },
                  description: 'Team member data for resource operations',
                },
                allocationData: {
                  type: 'object',
                  properties: {
                    phaseId: { type: 'string' },
                    allocation: {
                      type: 'number',
                      minimum: 0,
                      maximum: 100,
                    },
                  },
                  required: ['phaseId', 'allocation'],
                  description: 'Resource allocation data',
                },
                analysisType: {
                  type: 'string',
                  enum: ['automated', 'manual', 'comprehensive'],
                  default: 'comprehensive',
                  description: 'Type of risk analysis',
                },
                includeAdrRisks: {
                  type: 'boolean',
                  default: true,
                  description: 'Analyze risks from ADR complexity',
                },
                includeDependencyRisks: {
                  type: 'boolean',
                  default: true,
                  description: 'Analyze dependency chain risks',
                },
                includeResourceRisks: {
                  type: 'boolean',
                  default: true,
                  description: 'Analyze resource allocation risks',
                },
                generateMitigation: {
                  type: 'boolean',
                  default: true,
                  description: 'Generate mitigation strategies',
                },
                format: {
                  type: 'string',
                  enum: ['markdown', 'json', 'html'],
                  default: 'markdown',
                  description: 'Report output format',
                },
                includeCharts: {
                  type: 'boolean',
                  default: true,
                  description: 'Include progress charts and graphs',
                },
              },
              required: ['operation', 'projectPath'],
            },
          },
          {
            name: 'interactive_adr_planning',
            description:
              'Interactive guided ADR planning and creation tool - walks users through structured decision-making process with research integration, option evaluation, and automatic ADR generation. TIP: Start by reading @.mcp-server-context.md to understand project context and previous decisions.',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  enum: [
                    'start_session',
                    'continue_session',
                    'provide_input',
                    'request_research',
                    'evaluate_options',
                    'make_decision',
                    'assess_impact',
                    'plan_implementation',
                    'generate_adr',
                    'update_todos',
                    'get_guidance',
                    'save_session',
                    'complete_session',
                  ],
                  description: 'Interactive planning operation to perform',
                },
                sessionId: {
                  type: 'string',
                  description:
                    'Planning session ID (required for all operations except start_session)',
                },
                input: {
                  type: 'string',
                  description: 'User input for the current phase (varies by phase)',
                },
                projectPath: {
                  type: 'string',
                  description: 'Project root path',
                },
                autoResearch: {
                  type: 'boolean',
                  default: true,
                  description: 'Automatically trigger research when needed',
                },
                generateTodos: {
                  type: 'boolean',
                  default: true,
                  description: 'Automatically generate TODO items from decisions',
                },
              },
              required: ['operation', 'projectPath'],
            },
          },
          {
            name: 'memory_loading',
            description:
              'Advanced memory loading tool for the memory-centric architecture. Query, explore, and manage memory entities and relationships. Load ADRs into memory system and perform intelligent queries.',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: [
                    'load_adrs',
                    'query_entities',
                    'get_entity',
                    'find_related',
                    'get_intelligence',
                    'create_snapshot',
                  ],
                  description: 'Memory operation to perform',
                  default: 'query_entities',
                },
                query: {
                  type: 'object',
                  properties: {
                    entityTypes: {
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: [
                          'architectural_decision',
                          'code_component',
                          'business_requirement',
                          'technical_constraint',
                          'quality_concern',
                          'implementation_pattern',
                          'environmental_factor',
                          'stakeholder_input',
                          'knowledge_artifact',
                          'decision_context',
                        ],
                      },
                      description: 'Filter by entity types',
                    },
                    tags: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Filter by tags',
                    },
                    textQuery: {
                      type: 'string',
                      description: 'Full-text search query',
                    },
                    relationshipTypes: {
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: [
                          'depends_on',
                          'influences',
                          'conflicts_with',
                          'implements',
                          'supersedes',
                          'relates_to',
                          'originated_from',
                          'impacts',
                          'constrains',
                        ],
                      },
                      description: 'Filter by relationship types',
                    },
                    confidenceThreshold: {
                      type: 'number',
                      minimum: 0,
                      maximum: 1,
                      description: 'Minimum confidence threshold',
                    },
                    relevanceThreshold: {
                      type: 'number',
                      minimum: 0,
                      maximum: 1,
                      description: 'Minimum relevance threshold',
                    },
                    timeRange: {
                      type: 'object',
                      properties: {
                        from: { type: 'string', description: 'Start date (ISO 8601)' },
                        to: { type: 'string', description: 'End date (ISO 8601)' },
                      },
                      description: 'Filter by time range',
                    },
                    contextFilters: {
                      type: 'object',
                      properties: {
                        projectPhase: { type: 'string', description: 'Project phase filter' },
                        businessDomain: { type: 'string', description: 'Business domain filter' },
                        technicalStack: {
                          type: 'array',
                          items: { type: 'string' },
                          description: 'Technical stack filter',
                        },
                        environmentalFactors: {
                          type: 'array',
                          items: { type: 'string' },
                          description: 'Environmental factors filter',
                        },
                      },
                      description: 'Context-based filters',
                    },
                    limit: {
                      type: 'number',
                      minimum: 1,
                      description: 'Maximum number of results',
                    },
                    sortBy: {
                      type: 'string',
                      enum: ['relevance', 'confidence', 'lastModified', 'created', 'accessCount'],
                      description: 'Sort field',
                      default: 'relevance',
                    },
                    includeRelated: {
                      type: 'boolean',
                      description: 'Include related entities and relationships',
                      default: false,
                    },
                    relationshipDepth: {
                      type: 'number',
                      minimum: 1,
                      maximum: 5,
                      description: 'Maximum relationship traversal depth',
                      default: 2,
                    },
                  },
                  description: 'Query parameters for entity search',
                },
                entityId: {
                  type: 'string',
                  description: 'Entity ID for get_entity and find_related actions',
                },
                maxDepth: {
                  type: 'number',
                  minimum: 1,
                  maximum: 5,
                  description: 'Maximum depth for relationship traversal (find_related action)',
                  default: 2,
                },
                forceReload: {
                  type: 'boolean',
                  description: 'Force reload of ADRs (load_adrs action)',
                  default: false,
                },
              },
            },
          },
          {
            name: 'expand_analysis_section',
            description:
              'Retrieve full analysis content from tiered responses. Expand entire analysis or specific sections stored in memory. Use this when a tool returns a summary with an expandable ID.',
            inputSchema: {
              type: 'object',
              properties: {
                expandableId: {
                  type: 'string',
                  description: 'ID of the expandable analysis (provided in tiered response)',
                },
                section: {
                  type: 'string',
                  description:
                    'Optional: Specific section to expand (omit to get full analysis). Available sections are listed in the tiered response.',
                },
                format: {
                  type: 'string',
                  enum: ['markdown', 'json'],
                  description: 'Output format (default: markdown)',
                  default: 'markdown',
                },
              },
              required: ['expandableId'],
            },
          },
          {
            name: 'tool_chain_orchestrator',
            description:
              'AI-powered dynamic tool sequencing - intelligently analyze user requests and generate structured tool execution plans',
            inputSchema: {
              type: 'object',
              properties: {
                userRequest: {
                  type: 'string',
                  description: 'User request to analyze and create tool execution plan for',
                },
                availableTools: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of available MCP tools to orchestrate',
                },
                executionMode: {
                  type: 'string',
                  enum: ['plan_only', 'plan_and_execute', 'validate_plan'],
                  description: 'Orchestration mode',
                  default: 'plan_only',
                },
                maxSteps: {
                  type: 'number',
                  description: 'Maximum number of steps in the execution plan',
                  default: 10,
                },
                allowParallel: {
                  type: 'boolean',
                  description: 'Allow parallel execution of independent steps',
                  default: true,
                },
                contextHints: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional context hints for better plan generation',
                },
              },
              required: ['userRequest'],
            },
          },
          {
            name: 'expand_memory',
            description:
              'Phase 3: Retrieve and expand stored content from a tiered response using its expandable ID',
            inputSchema: {
              type: 'object',
              properties: {
                expandableId: {
                  type: 'string',
                  description: 'Expandable ID from a tiered response',
                },
                section: {
                  type: 'string',
                  description: 'Optional: specific section to expand',
                },
                includeContext: {
                  type: 'boolean',
                  description: 'Include related conversation context and knowledge graph state',
                  default: true,
                },
              },
              required: ['expandableId'],
            },
          },
          {
            name: 'query_conversation_history',
            description: 'Phase 3: Search and retrieve conversation sessions based on filters',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Filter by project path',
                },
                dateRange: {
                  type: 'object',
                  properties: {
                    start: { type: 'string', description: 'Start date (ISO 8601)' },
                    end: { type: 'string', description: 'End date (ISO 8601)' },
                  },
                  description: 'Filter by date range',
                },
                toolsUsed: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by tools used in the session',
                },
                keyword: {
                  type: 'string',
                  description: 'Search keyword in conversation turns',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of sessions to return',
                  default: 10,
                },
              },
            },
          },
          {
            name: 'get_conversation_snapshot',
            description:
              'Phase 3: Get current conversation context snapshot for resumption or analysis',
            inputSchema: {
              type: 'object',
              properties: {
                recentTurnCount: {
                  type: 'number',
                  description: 'Number of recent turns to include',
                  default: 5,
                },
              },
            },
          },
          {
            name: 'get_memory_stats',
            description: 'Phase 3: Get statistics about stored conversation memory',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_server_context',
            description:
              "Generate a comprehensive context file showing the server's current state, memory, and capabilities. Creates .mcp-server-context.md that can be @ referenced in conversations for instant LLM awareness",
            inputSchema: {
              type: 'object',
              properties: {
                writeToFile: {
                  type: 'boolean',
                  description: 'Whether to write the context to .mcp-server-context.md file',
                  default: true,
                },
                outputPath: {
                  type: 'string',
                  description: 'Custom output path for the context file',
                },
                includeDetailed: {
                  type: 'boolean',
                  description: 'Include detailed information',
                  default: true,
                },
                maxRecentItems: {
                  type: 'number',
                  description: 'Maximum number of recent items to show',
                  default: 5,
                },
              },
            },
          },
          {
            name: 'get_current_datetime',
            description:
              'Get the current date and time in various formats. Useful for timestamping ADRs, research documents, and other architectural artifacts. Returns ISO 8601, human-readable, and ADR-specific date formats.',
            inputSchema: {
              type: 'object',
              properties: {
                timezone: {
                  type: 'string',
                  description:
                    'Timezone for the datetime (e.g., "UTC", "America/New_York", "Europe/London"). Defaults to UTC.',
                  default: 'UTC',
                },
                format: {
                  type: 'string',
                  enum: ['iso', 'human', 'adr', 'all'],
                  description:
                    'Output format: "iso" for ISO 8601, "human" for human-readable, "adr" for ADR date format (YYYY-MM-DD), "all" for all formats',
                  default: 'all',
                },
                includeTimestamp: {
                  type: 'boolean',
                  description: 'Include Unix timestamp in milliseconds',
                  default: true,
                },
              },
            },
          },
        ],
      };
    });

    /**
     * Call Tool Handler - MCP Protocol Endpoint
     *
     * @description Executes specific tools with provided arguments. This is the core
     * execution endpoint that routes tool calls to their respective implementations.
     * Includes comprehensive error handling, argument validation, and response masking.
     *
     * @param {CallToolRequest} request - MCP tool execution request
     * @param {string} request.params.name - Tool name to execute
     * @param {Object} request.params.arguments - Tool-specific arguments
     *
     * @returns {Promise<CallToolResult>} Tool execution result with content and metadata
     *
     * @throws {McpAdrError} When tool execution fails or arguments are invalid
     *
     * @example
     * ```typescript
     * // Execute research tool
     * const result = await mcpClient.callTool('perform_research', {
     *   question: 'What authentication methods are used?',
     *   projectPath: '/path/to/project'
     * });
     *
     * console.log(result.content); // Research findings
     * ```
     *
     * @example
     * ```typescript
     * // Execute ADR validation
     * const validation = await mcpClient.callTool('validate_adr', {
     *   adrPath: 'docs/adrs/0001-auth-choice.md',
     *   includeEnvironmentCheck: true
     * });
     *
     * console.log(validation.isValid); // true/false
     * console.log(validation.findings); // Validation issues
     * ```
     *
     * @mcp-endpoint
     * @category Tools
     * @category Execution
     */
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      // Create context for progress notifications and logging
      const context: ToolContext = {
        info: (message: string) => {
          this.logger.info(message);
          // Note: MCP progress notifications will be available in future SDK versions
          // For now, we log to server console for visibility
        },
        report_progress: (progress: number, total?: number) => {
          const percentage = total ? Math.round((progress / total) * 100) : progress;
          this.logger.info(`Progress: ${percentage}%${total ? ` (${progress}/${total})` : ''}`);
        },
        warn: (message: string) => {
          this.logger.warn(message);
        },
        error: (message: string) => {
          this.logger.error(message);
        },
      };

      try {
        let response: CallToolResult;
        const safeArgs = args || {};

        switch (name) {
          case 'analyze_project_ecosystem':
            response = await this.analyzeProjectEcosystem(
              safeArgs as unknown as AnalyzeProjectEcosystemArgs,
              context
            );
            break;
          case 'get_architectural_context':
            response = await this.getArchitecturalContext(
              safeArgs as unknown as GetArchitecturalContextArgs
            );
            break;
          case 'generate_adrs_from_prd':
            response = await this.generateAdrsFromPrd(safeArgs, context);
            break;
          case 'compare_adr_progress':
            response = await this.compareAdrProgress(safeArgs);
            break;
          case 'analyze_content_security':
            response = await this.analyzeContentSecurity(
              safeArgs as unknown as AnalyzeContentSecurityArgs
            );
            break;
          case 'generate_content_masking':
            response = await this.generateContentMasking(
              safeArgs as unknown as GenerateContentMaskingArgs
            );
            break;
          case 'configure_custom_patterns':
            response = await this.configureCustomPatterns(
              safeArgs as unknown as ConfigureCustomPatternsArgs
            );
            break;
          case 'apply_basic_content_masking':
            response = await this.applyBasicContentMasking(
              safeArgs as unknown as ApplyBasicContentMaskingArgs
            );
            break;
          case 'validate_content_masking':
            response = await this.validateContentMasking(
              safeArgs as unknown as ValidateContentMaskingArgs
            );
            break;
          case 'manage_cache':
            response = await this.manageCache(safeArgs);
            break;
          case 'configure_output_masking':
            response = await this.configureOutputMasking(safeArgs);
            break;
          case 'suggest_adrs':
            response = await this.suggestAdrs(safeArgs);
            break;
          case 'generate_adr_from_decision':
            response = await this.generateAdrFromDecision(
              safeArgs as unknown as GenerateAdrFromDecisionArgs
            );
            break;
          case 'generate_adr_bootstrap':
            response = await this.generateAdrBootstrap(safeArgs);
            break;
          case 'bootstrap_validation_loop':
            response = await this.bootstrapValidationLoop(safeArgs);
            break;
          case 'discover_existing_adrs':
            response = await this.discoverExistingAdrs(safeArgs, context);
            break;
          case 'analyze_adr_timeline':
            response = await this.analyzeAdrTimeline(safeArgs);
            break;
          case 'review_existing_adrs':
            response = await this.reviewExistingAdrs(safeArgs);
            break;
          case 'validate_adr':
            response = await this.validateAdr(safeArgs);
            break;
          case 'validate_all_adrs':
            response = await this.validateAllAdrs(safeArgs);
            break;
          case 'incorporate_research':
            response = await this.incorporateResearch(safeArgs);
            break;
          case 'create_research_template':
            response = await this.createResearchTemplate(safeArgs);
            break;
          case 'request_action_confirmation':
            response = await this.requestActionConfirmation(safeArgs);
            break;
          case 'generate_rules':
            response = await this.generateRules(safeArgs);
            break;
          case 'validate_rules':
            response = await this.validateRules(safeArgs as unknown as ValidateRulesArgs);
            break;
          case 'create_rule_set':
            response = await this.createRuleSet(safeArgs as unknown as CreateRuleSetArgs);
            break;
          case 'analyze_environment':
            response = await this.analyzeEnvironment(safeArgs);
            break;
          case 'generate_research_questions':
            response = await this.generateResearchQuestions(safeArgs);
            break;
          case 'perform_research':
            response = await this.performResearch(safeArgs, context);
            break;
          case 'llm_web_search':
            response = await this.llmWebSearch(safeArgs);
            break;
          case 'llm_cloud_management':
            response = await this.llmCloudManagement(safeArgs);
            break;
          case 'llm_database_management':
            response = await this.llmDatabaseManagement(safeArgs);
            break;
          case 'analyze_deployment_progress':
            response = await this.analyzeDeploymentProgress(safeArgs);
            break;
          case 'check_ai_execution_status':
            response = await this.checkAIExecutionStatus(safeArgs);
            break;
          case 'get_workflow_guidance':
            response = await this.getWorkflowGuidance(
              safeArgs as unknown as GetWorkflowGuidanceArgs
            );
            break;
          case 'get_development_guidance':
            response = await this.getDevelopmentGuidance(
              safeArgs as unknown as GetDevelopmentGuidanceArgs
            );
            break;
          case 'list_roots':
            response = await this.listRoots();
            break;
          case 'read_directory':
            response = await this.readDirectory(safeArgs);
            break;
          case 'read_file': {
            // Map 'path' parameter to 'filePath' for compatibility
            const readFileArgs = safeArgs as { path?: string; filePath?: string };
            response = await this.readFile({
              filePath: readFileArgs.filePath || readFileArgs.path || '',
            } as ReadFileArgs);
            break;
          }
          case 'write_file':
            response = await this.writeFile(safeArgs as unknown as WriteFileArgs);
            break;
          case 'list_directory':
            response = await this.listDirectory(safeArgs);
            break;
          case 'generate_deployment_guidance':
            response = await this.generateDeploymentGuidance(safeArgs);
            break;
          case 'smart_git_push':
            response = await this.smartGitPush(safeArgs);
            break;
          case 'deployment_readiness':
            response = await this.deploymentReadiness(safeArgs);
            break;
          case 'troubleshoot_guided_workflow':
            response = await this.troubleshootGuidedWorkflow(safeArgs);
            break;
          case 'smart_score':
            response = await this.smartScore(safeArgs);
            break;
          case 'mcp_planning':
            response = await this.mcpPlanning(safeArgs);
            break;
          case 'memory_loading':
            response = await this.memoryLoading(safeArgs);
            break;
          case 'expand_analysis_section':
            response = await this.expandAnalysisSection(safeArgs);
            break;
          case 'interactive_adr_planning':
            response = await this.interactiveAdrPlanning(safeArgs);
            break;
          case 'tool_chain_orchestrator':
            response = await this.toolChainOrchestrator(
              safeArgs as unknown as ToolChainOrchestratorArgs
            );
            break;
          case 'expand_memory':
            response = await this.expandMemory(safeArgs);
            break;
          case 'query_conversation_history':
            response = await this.queryConversationHistory(safeArgs);
            break;
          case 'get_conversation_snapshot':
            response = await this.getConversationSnapshot(safeArgs);
            break;
          case 'get_memory_stats':
            response = await this.getMemoryStats();
            break;
          case 'get_server_context':
            response = await this.getServerContext(safeArgs);
            break;
          case 'get_current_datetime':
            response = await this.getCurrentDatetime(safeArgs);
            break;
          default:
            throw new McpAdrError(`Unknown tool: ${name}`, 'UNKNOWN_TOOL');
        }

        // Track tool execution in knowledge graph
        await this.trackToolExecution(name, args, response, true);

        // Apply state reinforcement (Phase 2: Context Decay Mitigation) and content masking
        // Also record conversation turn (Phase 3: Structured External Memory)
        return await this.enrichResponseWithStateReinforcement(response, name, args);
      } catch (error) {
        // Track failed execution
        await this.trackToolExecution(
          name,
          args,
          {},
          false,
          error instanceof Error ? error.message : String(error)
        );

        if (error instanceof McpAdrError) {
          throw error;
        }
        throw new McpAdrError(
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          'TOOL_EXECUTION_ERROR'
        );
      }
    });

    /**
     * List Resources Handler - MCP Protocol Endpoint
     *
     * @description Returns available resources for client access including the
     * architectural knowledge graph and project analysis data. Resources provide
     * read-only access to server-managed data structures.
     *
     * @returns {Promise<{resources: Array}>} Available resources with URIs and descriptions
     *
     * @example
     * ```typescript
     * // List available resources
     * const resources = await mcpClient.listResources();
     * console.log(resources.resources.length); // Available resources
     *
     * // Find knowledge graph resource
     * const kgResource = resources.resources.find(r =>
     *   r.uri === 'adr://architectural_knowledge_graph'
     * );
     * console.log(kgResource.name); // "Architectural Knowledge Graph"
     * ```
     *
     * @mcp-endpoint
     * @category Resources
     */
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          // Existing resources (refactored to return data)
          {
            uri: 'adr://architectural_knowledge_graph',
            name: 'Architectural Knowledge Graph',
            description:
              'Complete architectural knowledge graph with technologies, patterns, and relationships',
            mimeType: 'application/json',
          },
          {
            uri: 'adr://analysis_report',
            name: 'Analysis Report',
            description: 'Comprehensive project analysis report with metrics and recommendations',
            mimeType: 'application/json',
          },
          {
            uri: 'adr://adr_list',
            name: 'ADR List',
            description: 'List of all Architectural Decision Records with status and metadata',
            mimeType: 'application/json',
          },
          // NEW Phase 1 Resources
          {
            uri: 'adr://todo_list',
            name: 'Todo List',
            description: 'Current project task list with status, priorities, and dependencies',
            mimeType: 'application/json',
          },
          {
            uri: 'adr://research_index',
            name: 'Research Index',
            description: 'Index of all research documents and findings with metadata',
            mimeType: 'application/json',
          },
          {
            uri: 'adr://rule_catalog',
            name: 'Rule Catalog',
            description: 'Catalog of all architectural and validation rules from ADRs and code',
            mimeType: 'application/json',
          },
          {
            uri: 'adr://rule_generation',
            name: 'Rule Generation',
            description:
              'AI-powered rule generation from ADRs and code patterns. Supports query parameters: ?operation=generate|validate|create_set, ?source=adrs|patterns|both, ?knowledge=true|false, ?enhanced=true|false, ?format=json|yaml|both, ?comprehensive=true|false',
            mimeType: 'application/json',
          },
          {
            uri: 'adr://project_status',
            name: 'Project Status',
            description: 'Current project status and health metrics aggregated from all sources',
            mimeType: 'application/json',
          },
          // NEW Phase 2 Templated Resources
          {
            uri: 'adr://adr/{id}',
            name: 'ADR by ID',
            description: 'Individual Architectural Decision Record by ID or title match',
            mimeType: 'application/json',
          },
          {
            uri: 'adr://research/{topic}',
            name: 'Research by Topic',
            description: 'Research documents filtered by topic with full content',
            mimeType: 'application/json',
          },
          {
            uri: 'adr://todo/{task_id}',
            name: 'Todo by Task ID',
            description:
              'Individual task details by ID or title match with dependencies and history',
            mimeType: 'application/json',
          },
          {
            uri: 'adr://rule/{rule_id}',
            name: 'Rule by ID',
            description:
              'Individual architectural rule by ID or name match with violations and usage stats',
            mimeType: 'application/json',
          },
          // NEW Phase 3 Advanced Resources
          {
            uri: 'adr://deployment_status',
            name: 'Deployment Status',
            description:
              'Current deployment state with health checks, build status, and readiness score',
            mimeType: 'application/json',
          },
          {
            uri: 'adr://environment_analysis',
            name: 'Environment Analysis',
            description:
              'System environment details including platform, dependencies, and capabilities',
            mimeType: 'application/json',
          },
          {
            uri: 'adr://memory_snapshots',
            name: 'Memory Snapshots',
            description:
              'Knowledge graph snapshots with statistics, insights, and relationship data',
            mimeType: 'application/json',
          },
          {
            uri: 'adr://project_metrics',
            name: 'Project Metrics',
            description:
              'Code metrics and quality scores including codebase stats, quality assessment, and git metrics',
            mimeType: 'application/json',
          },
          {
            uri: 'adr://technology/{name}',
            name: 'Technology by Name',
            description:
              'Individual technology analysis by name with usage, relationships, and adoption status',
            mimeType: 'application/json',
          },
          {
            uri: 'adr://pattern/{name}',
            name: 'Pattern by Name',
            description:
              'Individual pattern analysis by name with quality metrics, relationships, and examples',
            mimeType: 'application/json',
          },
          // NEW Phase 4 Final Resources
          {
            uri: 'adr://deployment_history',
            name: 'Deployment History',
            description:
              'Historical deployment data with trends, failure analysis, and patterns. Supports query parameters: ?period=7d|30d|90d|1y|all, ?environment=production|staging|development|all, ?includeFailures=true|false, ?includeMetrics=true|false, ?format=summary|detailed',
            mimeType: 'application/json',
          },
          {
            uri: 'adr://code_quality',
            name: 'Code Quality',
            description:
              'Comprehensive code quality assessment with metrics, issues, and recommendations. Supports query parameters: ?scope=full|changes|critical, ?includeMetrics=true|false, ?includeRecommendations=true|false, ?threshold=0-100, ?format=summary|detailed',
            mimeType: 'application/json',
          },
          // NEW Phase 5 Validated Pattern Resources
          {
            uri: 'adr://validated_patterns',
            name: 'Validated Patterns Catalog',
            description:
              'Complete catalog of validated deployment patterns for different platforms (OpenShift, Kubernetes, Docker, Node.js, Python, MCP, A2A) with bill of materials, deployment phases, validation checks, and authoritative sources',
            mimeType: 'application/json',
          },
          {
            uri: 'adr://validated_pattern/{platform}',
            name: 'Validated Pattern by Platform',
            description:
              'Individual validated pattern by platform type (openshift, kubernetes, docker, nodejs, python, mcp, a2a) with complete bill of materials, deployment phases, validation checks, health checks, and authoritative sources for LLM research',
            mimeType: 'application/json',
          },
          {
            uri: 'adr://pattern_sources/{platform}',
            name: 'Pattern Authoritative Sources',
            description:
              'Authoritative documentation and repository sources for a specific platform pattern, prioritized by importance with query instructions for LLMs',
            mimeType: 'application/json',
          },
          {
            uri: 'adr://pattern_base_code/{platform}',
            name: 'Pattern Base Code Repository',
            description:
              'Base code repository information for a platform pattern including URL, integration instructions, required files, and script entrypoint',
            mimeType: 'application/json',
          },
        ],
      };
    });

    /**
     * Read Resource Handler - MCP Protocol Endpoint
     *
     * @description Reads specific resource content by URI. Provides access to
     * architectural knowledge graphs, project analysis data, and other server-managed
     * resources with appropriate content masking applied.
     *
     * @param {ReadResourceRequest} request - MCP resource read request
     * @param {string} request.params.uri - Resource URI to read
     *
     * @returns {Promise<ReadResourceResult>} Resource content with metadata
     *
     * @throws {McpAdrError} When resource URI is invalid or access fails
     *
     * @example
     * ```typescript
     * // Read knowledge graph resource
     * const kgData = await mcpClient.readResource(
     *   'adr://architectural_knowledge_graph'
     * );
     * console.log(kgData.contents); // Knowledge graph JSON
     * ```
     *
     * @mcp-endpoint
     * @category Resources
     */
    this.server.setRequestHandler(ReadResourceRequestSchema, async request => {
      const { uri } = request.params;

      try {
        const response = await this.readResource(uri);
        return await this.applyOutputMasking(response);
      } catch (error) {
        if (error instanceof McpAdrError) {
          throw error;
        }
        throw new McpAdrError(
          `Resource reading failed: ${error instanceof Error ? error.message : String(error)}`,
          'RESOURCE_ERROR'
        );
      }
    });

    /**
     * List Prompts Handler - MCP Protocol Endpoint
     *
     * @description Returns available prompt templates for ADR analysis, research,
     * and architectural decision support. Prompts can be executed directly or
     * used as templates for custom implementations.
     *
     * @returns {Promise<{prompts: Array}>} Available prompt templates with metadata
     *
     * @example
     * ```typescript
     * // List available prompts
     * const prompts = await mcpClient.listPrompts();
     * console.log(prompts.prompts.length); // Available prompt templates
     *
     * // Find ADR analysis prompt
     * const adrPrompt = prompts.prompts.find(p =>
     *   p.name === 'adr_analysis_prompt'
     * );
     * console.log(adrPrompt.description); // Prompt description
     * ```
     *
     * @mcp-endpoint
     * @category Prompts
     */
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const { allPrompts } = await import('./prompts/index.js');

      return {
        prompts: allPrompts.map(prompt => ({
          name: prompt.name,
          description: prompt.description,
          arguments: prompt.arguments,
        })),
      };
    });

    /**
     * Get Prompt Handler - MCP Protocol Endpoint
     *
     * @description Executes specific prompt templates with provided arguments.
     * Returns formatted prompts ready for AI execution or further processing.
     * Supports dynamic argument injection and template customization.
     *
     * @param {GetPromptRequest} request - MCP prompt execution request
     * @param {string} request.params.name - Prompt template name
     * @param {Object} request.params.arguments - Template-specific arguments
     *
     * @returns {Promise<GetPromptResult>} Formatted prompt with metadata
     *
     * @throws {McpAdrError} When prompt template is not found or arguments are invalid
     *
     * @example
     * ```typescript
     * // Execute ADR analysis prompt
     * const prompt = await mcpClient.getPrompt('adr_analysis_prompt', {
     *   adrPath: 'docs/adrs/0001-auth.md',
     *   projectContext: 'microservices architecture'
     * });
     *
     * console.log(prompt.messages); // Formatted prompt messages
     * ```
     *
     * @example
     * ```typescript
     * // Execute research prompt
     * const researchPrompt = await mcpClient.getPrompt('research_question_prompt', {
     *   domain: 'authentication',
     *   complexity: 'advanced'
     * });
     *
     * console.log(researchPrompt.messages[0].content); // Research prompt
     * ```
     *
     * @mcp-endpoint
     * @category Prompts
     * @category Execution
     */
    this.server.setRequestHandler(GetPromptRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      try {
        const { allPrompts } = await import('./prompts/index.js');
        const prompt = allPrompts.find(p => p.name === name);

        if (!prompt) {
          throw new McpAdrError(`Unknown prompt: ${name}`, 'UNKNOWN_PROMPT');
        }

        // Simple template rendering (replace {{variable}} with values)
        let renderedTemplate = prompt.template;
        if (args) {
          for (const [key, value] of Object.entries(args)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            renderedTemplate = renderedTemplate.replace(regex, String(value));
          }
        }

        const response = {
          description: prompt.description,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: renderedTemplate,
              },
            },
          ],
        };

        return await this.applyOutputMasking(response);
      } catch (error) {
        if (error instanceof McpAdrError) {
          throw error;
        }
        throw new McpAdrError(
          `Prompt execution failed: ${error instanceof Error ? error.message : String(error)}`,
          'PROMPT_EXECUTION_ERROR'
        );
      }
    });
  }

  /**
   * Tool implementations
   */
  private async checkAIExecutionStatus(_args: Record<string, unknown>): Promise<CallToolResult> {
    try {
      const { getAIExecutionStatus } = await import('./utils/prompt-execution.js');
      const status = getAIExecutionStatus();

      return {
        content: [
          {
            type: 'text',
            text: `# AI Execution Status Diagnostic

## Current Configuration
- **AI Execution Enabled**: ${status.isEnabled ? '✅ YES' : '❌ NO'}
- **Has API Key**: ${status.hasApiKey ? '✅ YES' : '❌ NO'}
- **Execution Mode**: ${status.executionMode}
- **AI Model**: ${status.model}

${
  status.reason
    ? `## ⚠️ Issue Detected
**Problem**: ${status.reason}

## Solution
${
  !status.hasApiKey
    ? `
1. Get an OpenRouter API key from https://openrouter.ai/keys
2. Add it to your MCP configuration:
   \`\`\`json
   {
     "mcpServers": {
       "adr-analysis": {
         "command": "mcp-adr-analysis-server",
         "env": {
           "OPENROUTER_API_KEY": "your_api_key_here",
           "EXECUTION_MODE": "full",
           "AI_MODEL": "anthropic/claude-3-sonnet"
         }
       }
     }
   }
   \`\`\`
3. Restart your MCP client (Claude Desktop, etc.)
`
    : status.executionMode !== 'full'
      ? `
1. Update your MCP configuration to set EXECUTION_MODE to "full":
   \`\`\`json
   {
     "mcpServers": {
       "adr-analysis": {
         "env": {
           "EXECUTION_MODE": "full"
         }
       }
     }
   }
   \`\`\`
2. Restart your MCP client
`
      : ''
}`
    : `## ✅ Configuration Looks Good!

AI execution is properly configured. Tools should return actual results instead of prompts.

If you're still seeing prompts instead of results, try:
1. Restart your MCP client
2. Check your OpenRouter API key has sufficient credits
3. Verify network connectivity to OpenRouter.ai`
}

## Environment Variables Expected
- **OPENROUTER_API_KEY**: Your OpenRouter API key
- **EXECUTION_MODE**: Set to "full" for AI execution
- **AI_MODEL**: AI model to use (optional, defaults to claude-3-sonnet)

## Testing
After fixing the configuration, try calling \`suggest_adrs\` - it should return actual ADR suggestions instead of prompts.
`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `# AI Execution Status Check Failed

**Error**: ${error instanceof Error ? error.message : String(error)}

This diagnostic tool helps identify why tools return prompts instead of actual results.

## Manual Check
Verify these environment variables are set in your MCP configuration:
- OPENROUTER_API_KEY
- EXECUTION_MODE=full
- AI_MODEL (optional)
`,
          },
        ],
      };
    }
  }

  private async getWorkflowGuidance(args: GetWorkflowGuidanceArgs): Promise<CallToolResult> {
    const {
      goal,
      projectContext,
      availableAssets = [],
      timeframe = 'thorough_review',
      primaryConcerns = [],
    } = args;

    try {
      const workflowPrompt = `
# Workflow Guidance & Tool Recommendation System

## User Context Analysis
- **Goal**: ${goal}
- **Project Context**: ${projectContext}
- **Available Assets**: ${availableAssets.length > 0 ? availableAssets.join(', ') : 'None specified'}
- **Timeframe**: ${timeframe}
- **Primary Concerns**: ${primaryConcerns.length > 0 ? primaryConcerns.join(', ') : 'General analysis'}

## Available MCP Tools (24 Total)

### 🎯 **Core Analysis Tools** (AI-Powered ✅)
1. **analyze_project_ecosystem** - Comprehensive technology and pattern detection
2. **get_architectural_context** - Generate intelligent architectural insights + ADR setup
3. **generate_adrs_from_prd** - Convert requirements to structured ADRs
4. **analyze_content_security** - Detect sensitive information patterns

### 📋 **ADR Management Tools** (AI-Powered ✅)
5. **suggest_adrs** - Auto-suggest ADRs from implicit decisions
6. **generate_adr_from_decision** - Create ADRs from specific decisions
7. **discover_existing_adrs** - Intelligent ADR discovery and analysis

### 🔍 **Research & Documentation Tools** (AI-Powered ✅)
8. **generate_research_questions** - Create context-aware research questions
9. **incorporate_research** - Integrate research findings into decisions
10. **create_research_template** - Generate research documentation templates

### 🛡️ **Security & Compliance Tools** (AI-Powered ✅)
11. **generate_content_masking** - Intelligent content masking and protection
12. **configure_custom_patterns** - Customize security and masking settings
13. **apply_basic_content_masking** - Basic content masking (fallback)
14. **validate_content_masking** - Validate masking effectiveness

### 🏗️ **Rule & Governance Tools** (AI-Powered ✅)
16. **generate_rules** - Extract architectural rules from ADRs
17. **validate_rules** - Validate code against architectural rules
18. **create_rule_set** - Create comprehensive rule management systems

### 🚀 **Deployment & Environment Tools** (AI-Powered ✅)
19. **analyze_environment** - Environment analysis and optimization
20. **analyze_deployment_progress** - Deployment tracking and verification

### ⚙️ **Utility & Management Tools**
21. **manage_cache** - Cache management and optimization
22. **configure_output_masking** - Configure global output masking
23. **request_action_confirmation** - Interactive user confirmation workflows
24. **get_workflow_guidance** - This tool - intelligent workflow advisor

## Workflow Recommendation Instructions

Based on the user's goal, project context, available assets, timeframe, and concerns, provide:

### 1. **Recommended Tool Sequence**
Provide a step-by-step workflow with:
- **Tool Name**: Exact tool to call
- **Purpose**: Why this tool is needed
- **Expected Outcome**: What it will deliver
- **Parameters**: Suggested parameters for the tool call
- **Success Criteria**: How to know it worked

### 2. **Alternative Workflows**
Provide 2-3 alternative approaches based on:
- Different time constraints
- Different priorities
- Different starting points

### 3. **Expected Timeline & Effort**
For each recommended workflow:
- **Estimated Time**: How long each step takes
- **Effort Level**: Low/Medium/High effort required
- **Dependencies**: Which steps must be completed first

### 4. **Success Metrics**
Define how to measure success:
- **Immediate Indicators**: Quick wins and early signals
- **Progress Milestones**: Key checkpoints
- **Final Outcomes**: Ultimate success criteria

### 5. **Common Pitfalls & Tips**
- **What to Avoid**: Common mistakes in this workflow
- **Pro Tips**: Best practices for maximum effectiveness
- **Troubleshooting**: What to do if steps fail

## Common Workflow Patterns

### **New Project Setup**
1. analyze_project_ecosystem → 2. get_architectural_context → 3. suggest_adrs → 4. generate_adr_from_decision

### **Existing Project Analysis**
1. discover_existing_adrs → 2. get_architectural_context → 3. validate_rules

### **Security Audit**
1. analyze_content_security → 2. generate_content_masking → 3. configure_custom_patterns → 4. validate_content_masking

### **PRD to Implementation**
1. generate_adrs_from_prd → 2. analyze_deployment_progress

### **Legacy Modernization**
1. analyze_project_ecosystem → 2. get_architectural_context → 3. suggest_adrs → 4. generate_rules → 5. validate_rules

## Output Format

Provide a comprehensive workflow guide that includes:

1. **🎯 Recommended Primary Workflow** (step-by-step with tool calls)
2. **🔄 Alternative Approaches** (2-3 different paths)
3. **⏱️ Timeline & Effort Estimates** (realistic expectations)
4. **📊 Success Metrics** (how to measure progress)
5. **💡 Pro Tips & Best Practices** (maximize effectiveness)
6. **⚠️ Common Pitfalls** (what to avoid)

Make the guidance **actionable, specific, and outcome-focused** so the user can immediately start executing the recommended workflow.
`;

      // Execute the workflow guidance with AI if enabled
      const { executePromptWithFallback, formatMCPResponse } = await import(
        './utils/prompt-execution.js'
      );
      const executionResult = await executePromptWithFallback(
        workflowPrompt,
        'Analyze the user context and provide intelligent workflow guidance with specific tool recommendations.',
        {
          temperature: 0.1,
          maxTokens: 6000,
          systemPrompt: `You are an expert workflow advisor for the MCP ADR Analysis Server.
Your role is to analyze user goals and project context, then recommend the optimal sequence of tools to achieve their objectives efficiently.
Provide specific, actionable guidance with clear tool sequences, expected outcomes, and success criteria.
Focus on practical workflows that deliver measurable results.`,
        }
      );

      if (executionResult.isAIGenerated) {
        // AI execution successful - return actual workflow guidance
        return formatMCPResponse({
          ...executionResult,
          content: `# Workflow Guidance & Tool Recommendations

## Your Context
- **Goal**: ${goal}
- **Project Context**: ${projectContext}
- **Available Assets**: ${availableAssets.length > 0 ? availableAssets.join(', ') : 'None specified'}
- **Timeframe**: ${timeframe}
- **Primary Concerns**: ${primaryConcerns.length > 0 ? primaryConcerns.join(', ') : 'General analysis'}

## AI-Generated Workflow Guidance

${executionResult.content}

## Quick Reference: Available Tools

**Core Analysis**: analyze_project_ecosystem, get_architectural_context, generate_adrs_from_prd, analyze_content_security
**ADR Management**: suggest_adrs, generate_adr_from_decision, discover_existing_adrs
**Security**: generate_content_masking, configure_custom_patterns, validate_content_masking
**Governance**: generate_rules, validate_rules, create_rule_set
**Environment**: analyze_environment, analyze_deployment_progress
**Utilities**: manage_cache, configure_output_masking, check_ai_execution_status

## Next Steps

1. **Start with the recommended primary workflow** above
2. **Call the first tool** with the suggested parameters
3. **Review the results** and proceed to the next step
4. **Track progress** using the success metrics provided
5. **Adjust as needed** based on your specific findings

This guidance is tailored to your specific context and goals for maximum effectiveness!
`,
        });
      } else {
        // Fallback to prompt-only mode
        return {
          content: [
            {
              type: 'text',
              text: workflowPrompt,
            },
          ],
        };
      }
    } catch (error) {
      throw new McpAdrError(
        `Failed to generate workflow guidance: ${error instanceof Error ? error.message : String(error)}`,
        'WORKFLOW_ERROR'
      );
    }
  }

  private async getDevelopmentGuidance(args: GetDevelopmentGuidanceArgs): Promise<CallToolResult> {
    const {
      developmentPhase,
      adrsToImplement = [],
      technologyStack = [],
      currentProgress = '',
      teamContext = { size: 'small_team', experienceLevel: 'mixed' },
      timeline = '',
      focusAreas = [],
    } = args;

    try {
      // Use actual ADR discovery if ADRs are specified
      let adrAnalysisPrompt = '';

      if (adrsToImplement.length > 0) {
        const { getAdrDirectoryPath } = await import('./utils/config.js');
        const { discoverAdrsInDirectory } = await import('./utils/adr-discovery.js');
        const absoluteAdrPath = getAdrDirectoryPath(this.config);

        const discoveryResult = await discoverAdrsInDirectory(
          absoluteAdrPath,
          this.config.projectPath,
          {
            includeContent: true,
            includeTimeline: false,
          }
        );

        // Filter ADRs to only those specified for implementation
        const targetAdrs = discoveryResult.adrs.filter(adr =>
          adrsToImplement.some(
            (target: string) =>
              adr.title.toLowerCase().includes(target.toLowerCase()) ||
              adr.filename.toLowerCase().includes(target.toLowerCase())
          )
        );

        adrAnalysisPrompt = `
## ADR Analysis for Implementation

**ADRs to Implement**: ${adrsToImplement.join(', ')}
**ADR Directory**: ${absoluteAdrPath}
**Found ${targetAdrs.length} matching ADRs**

${targetAdrs
  .map(
    adr => `
### ${adr.title}
- **File**: ${adr.filename}
- **Status**: ${adr.status}
- **Context**: ${adr.context}
- **Decision**: ${adr.decision}
- **Consequences**: ${adr.consequences}
`
  )
  .join('\n')}
`;
      }

      const developmentPrompt = `
# Development Guidance & Implementation Roadmap

## Development Context
- **Development Phase**: ${developmentPhase}
- **Technology Stack**: ${technologyStack.length > 0 ? technologyStack.join(', ') : 'Not specified'}
- **Current Progress**: ${currentProgress || 'Starting fresh'}
- **Team Size**: ${teamContext.size}
- **Team Experience**: ${teamContext.experienceLevel}
- **Timeline**: ${timeline || 'Not specified'}
- **Focus Areas**: ${focusAreas.length > 0 ? focusAreas.join(', ') : 'General development'}

${adrAnalysisPrompt}

## Development Guidance Instructions

Based on the development context, ADRs to implement, and technology stack, provide comprehensive development guidance including:

### 1. **Implementation Roadmap**
Create a detailed development plan with:
- **Phase-by-Phase Breakdown**: Logical development phases
- **Task Prioritization**: Order tasks by dependencies and impact
- **Milestone Definition**: Clear checkpoints and deliverables
- **Risk Assessment**: Potential blockers and mitigation strategies

### 2. **Code Structure & Architecture**
Provide specific guidance on:
- **Project Structure**: How to organize code files and directories
- **Module Architecture**: How to structure components/modules
- **Design Patterns**: Which patterns to use and where
- **Code Organization**: Separation of concerns and layering

### 3. **Implementation Patterns & Best Practices**
For each technology in the stack, provide:
- **Framework-Specific Patterns**: Best practices for the chosen frameworks
- **API Design**: How to structure APIs and endpoints
- **Data Layer**: Database schema and data access patterns
- **State Management**: How to handle application state
- **Error Handling**: Consistent error handling strategies

### 4. **ADR-to-Code Translation**
For each ADR to implement:
- **Implementation Tasks**: Specific coding tasks derived from the ADR
- **Code Examples**: Pseudo-code or pattern examples
- **Integration Points**: How this ADR affects other parts of the system
- **Validation Criteria**: How to verify the ADR is properly implemented

### 5. **Testing Strategy**
Comprehensive testing approach:
- **Unit Testing**: What to test and how
- **Integration Testing**: API and component integration tests
- **End-to-End Testing**: User workflow testing
- **Performance Testing**: Load and performance validation
- **Security Testing**: Security validation approaches

### 6. **Development Workflow**
Team-specific guidance:
- **Git Workflow**: Branching strategy and code review process
- **CI/CD Pipeline**: Automated testing and deployment
- **Code Quality**: Linting, formatting, and quality gates
- **Documentation**: What to document and how

### 7. **Quality Gates & Checkpoints**
Define success criteria:
- **Code Quality Metrics**: Coverage, complexity, maintainability
- **Performance Benchmarks**: Response times, throughput targets
- **Security Checkpoints**: Security validation at each phase
- **Architectural Compliance**: Adherence to ADR decisions

### 8. **Technology-Specific Implementation**
For each technology in the stack, provide:
- **Setup Instructions**: Environment and tooling setup
- **Configuration**: Framework and tool configuration
- **Optimization**: Performance and build optimization
- **Deployment**: Technology-specific deployment considerations

## Expected Output Format

Provide a comprehensive development guide that includes:

### 📋 **1. Development Roadmap**
- **Phase 1-N**: Logical development phases with tasks
- **Dependencies**: Task dependencies and critical path
- **Timeline**: Estimated effort and duration
- **Milestones**: Key deliverables and checkpoints

### 🏗️ **2. Implementation Guide**
- **Code Structure**: Detailed project organization
- **Design Patterns**: Specific patterns to implement
- **API Design**: Endpoint structure and conventions
- **Data Architecture**: Database and data flow design

### 🧪 **3. Testing & Quality Strategy**
- **Test Types**: Unit, integration, e2e testing approach
- **Quality Gates**: Code quality and performance criteria
- **Automation**: CI/CD and automated testing setup

### 🚀 **4. Deployment & Operations**
- **Environment Setup**: Development, staging, production
- **Deployment Pipeline**: Automated deployment process
- **Monitoring**: Logging, metrics, and alerting
- **Maintenance**: Ongoing maintenance and updates

### 📊 **5. Progress Tracking**
- **Success Metrics**: How to measure development progress
- **Quality Indicators**: Code quality and performance metrics
- **Milestone Validation**: How to verify milestone completion
- **Risk Monitoring**: Early warning signs and mitigation

### 💡 **6. Team-Specific Recommendations**
Based on team size (${teamContext.size}) and experience (${teamContext.experienceLevel}):
- **Workflow Adaptations**: Process adjustments for team context
- **Skill Development**: Areas for team skill building
- **Tool Recommendations**: Development tools and practices
- **Communication**: Coordination and documentation practices

## Integration with Architectural Decisions

Ensure all development guidance:
- **Aligns with ADRs**: Every recommendation supports architectural decisions
- **Maintains Consistency**: Consistent patterns across the codebase
- **Enables Evolution**: Flexible design for future changes
- **Supports Quality**: Built-in quality and maintainability

Make the guidance **actionable, specific, and immediately implementable** so developers can start coding with confidence and architectural alignment.
`;

      // Execute the development guidance with AI if enabled
      const { executePromptWithFallback, formatMCPResponse } = await import(
        './utils/prompt-execution.js'
      );
      const executionResult = await executePromptWithFallback(
        developmentPrompt,
        'Analyze the development context and provide comprehensive implementation guidance that translates architectural decisions into specific coding tasks and development roadmap.',
        {
          temperature: 0.1,
          maxTokens: 8000,
          systemPrompt: `You are an expert software development advisor specializing in translating architectural decisions into practical implementation guidance.
Your role is to bridge the gap between architectural planning and actual code development.
Provide specific, actionable development guidance with clear implementation steps, code patterns, and quality criteria.
Focus on practical guidance that ensures architectural decisions are properly implemented in code.
Consider team context, technology stack, and development phase to provide tailored recommendations.`,
        }
      );

      if (executionResult.isAIGenerated) {
        // AI execution successful - return actual development guidance
        return formatMCPResponse({
          ...executionResult,
          content: `# Development Guidance & Implementation Roadmap

## Your Development Context
- **Development Phase**: ${developmentPhase}
- **Technology Stack**: ${technologyStack.length > 0 ? technologyStack.join(', ') : 'Not specified'}
- **Current Progress**: ${currentProgress || 'Starting fresh'}
- **Team Context**: ${teamContext.size} team with ${teamContext.experienceLevel} experience
- **Timeline**: ${timeline || 'Not specified'}
- **Focus Areas**: ${focusAreas.length > 0 ? focusAreas.join(', ') : 'General development'}
- **ADRs to Implement**: ${adrsToImplement.length > 0 ? adrsToImplement.join(', ') : 'None specified'}

## AI-Generated Development Guidance

${executionResult.content}

## Integration with Workflow Tools

This development guidance works seamlessly with other MCP tools:

### **Workflow Integration**
1. **get_workflow_guidance** → Recommends architectural process
2. **get_development_guidance** → Guides implementation (this tool)
3. **validate_rules** → Ensures code follows architectural decisions
4. **analyze_deployment_progress** → Tracks implementation progress

### **Quality Assurance Tools**
- **generate_rules** → Extract coding standards from ADRs
- **validate_rules** → Validate code against architectural rules
- **analyze_content_security** → Security validation during development

### **Documentation Tools**
- **discover_existing_adrs** → Reference existing architectural decisions

## Next Steps: From Architecture to Code

1. **📋 Review the Development Roadmap** above
2. **🏗️ Set Up Project Structure** as recommended
3. **🧪 Implement Testing Strategy** early in development
4. **📊 Track Progress** using the success metrics provided
5. **🔄 Iterate and Refine** based on implementation learnings

This guidance ensures your development work is **architecturally aligned**, **quality-focused**, and **efficiently executed**!
`,
        });
      } else {
        // Fallback to prompt-only mode
        return {
          content: [
            {
              type: 'text',
              text: developmentPrompt,
            },
          ],
        };
      }
    } catch (error) {
      throw new McpAdrError(
        `Failed to generate development guidance: ${error instanceof Error ? error.message : String(error)}`,
        'DEVELOPMENT_ERROR'
      );
    }
  }

  private async analyzeProjectEcosystem(
    args: AnalyzeProjectEcosystemArgs,
    context?: ToolContext
  ): Promise<CallToolResult> {
    const ctx = context || createNoOpContext();

    // Use configured project path if not provided in args
    const projectPath = args.projectPath || this.config.projectPath;
    const {
      includePatterns,
      enhancedMode = true,
      knowledgeEnhancement = true,
      learningEnabled = true,
      technologyFocus = [],
      analysisDepth = 'comprehensive',
      includeEnvironment = true,
      recursiveDepth = 'comprehensive',
      analysisScope = [],
      // conversationContext - TODO: implement context integration for ecosystem analysis
    } = args;

    this.logger.info(`Generating comprehensive ecosystem analysis for project at: ${projectPath}`);
    this.logger.info(
      `Analysis configuration - Depth: ${analysisDepth}, Recursive: ${recursiveDepth}, Environment: ${includeEnvironment}`
    );
    this.logger.info(
      `Enhancement features - Knowledge: ${knowledgeEnhancement}, Learning: ${learningEnabled}`
    );
    this.logger.info(
      `Analysis scope: ${analysisScope.length > 0 ? analysisScope.join(', ') : 'Full ecosystem analysis'}`
    );

    ctx.info(`🌐 Starting comprehensive ecosystem analysis: ${projectPath}`);
    ctx.report_progress(0, 100);

    try {
      ctx.info('📊 Phase 1: Analyzing project structure');
      ctx.report_progress(10, 100);

      // Import utilities dynamically to avoid circular dependencies
      const { analyzeProjectStructureCompat: analyzeProjectStructure } = await import(
        './utils/file-system.js'
      );

      // Initialize ADR knowledge base on first run
      ctx.info('📚 Phase 1.5: Initializing ADR knowledge base');
      ctx.report_progress(15, 100);

      try {
        const { initializeAdrKnowledgeBase, isAdrKnowledgeBaseInitialized } = await import(
          './utils/adr-knowledge-initializer.js'
        );

        const isInitialized = await isAdrKnowledgeBaseInitialized(this.kgManager);

        if (!isInitialized) {
          this.logger.info('First run detected - initializing ADR knowledge base');
          const initResult = await initializeAdrKnowledgeBase(
            this.kgManager,
            this.config.adrDirectory,
            projectPath
          );

          if (initResult.success) {
            this.logger.info(
              `✅ ADR knowledge base initialized with ${initResult.adrsIndexed} ADRs`
            );
            ctx.info(`📚 Indexed ${initResult.adrsIndexed} existing ADRs to knowledge base`);
          } else {
            this.logger.warn(
              `ADR knowledge base initialization completed with errors: ${initResult.errors.join(', ')}`
            );
          }
        } else {
          this.logger.info('ADR knowledge base already initialized - skipping');
        }
      } catch (error) {
        this.logger.warn('Failed to initialize ADR knowledge base:', error);
        // Don't fail the entire analysis if ADR initialization fails
      }

      // Import advanced prompting utilities if enhanced mode is enabled
      let generateArchitecturalKnowledge: GenerateArchitecturalKnowledgeFunction | null = null;
      let executeWithReflexion: ExecuteWithReflexionFunction | null = null;
      let retrieveRelevantMemories: RetrieveRelevantMemoriesFunction | null = null;
      let createToolReflexionConfig: CreateToolReflexionConfigFunction | null = null;

      if (enhancedMode) {
        if (knowledgeEnhancement) {
          const knowledgeModule = await import('./utils/knowledge-generation.js');
          generateArchitecturalKnowledge = knowledgeModule.generateArchitecturalKnowledge;
        }

        if (learningEnabled) {
          const reflexionModule = await import('./utils/reflexion.js');
          executeWithReflexion = reflexionModule.executeWithReflexion;
          retrieveRelevantMemories = reflexionModule.retrieveRelevantMemories;
          createToolReflexionConfig = reflexionModule.createToolReflexionConfig;
        }
      }

      // Step 1: Generate technology-specific knowledge if enabled
      ctx.info('🧠 Phase 2: Generating architectural knowledge');
      ctx.report_progress(25, 100);

      let knowledgeContext = '';
      if (enhancedMode && knowledgeEnhancement && generateArchitecturalKnowledge) {
        try {
          const knowledgeResult = await generateArchitecturalKnowledge(
            {
              projectPath,
              technologies: technologyFocus,
              patterns: [],
              projectType: 'ecosystem-analysis',
              existingAdrs: [],
            },
            {
              domains: this.getEcosystemAnalysisDomains(technologyFocus) as ArchitecturalDomain[],
              depth: analysisDepth === 'basic' ? 'basic' : 'intermediate',
              cacheEnabled: true,
            }
          );

          knowledgeContext = `
## Technology-Specific Knowledge Enhancement

The following architectural knowledge has been generated to enhance ecosystem analysis:

${knowledgeResult.prompt}

---
`;
        } catch (error) {
          this.logger.warn('Knowledge generation failed:', error);
          knowledgeContext = '<!-- Knowledge generation unavailable -->\n';
        }
      }

      // Step 2: Retrieve relevant memories if learning is enabled
      let reflexionContext = '';
      if (enhancedMode && learningEnabled && retrieveRelevantMemories) {
        try {
          const memoryResult = await retrieveRelevantMemories(
            'ecosystem-analysis',
            { projectPath, analysisDepth, technologyFocus },
            { maxResults: 5, relevanceThreshold: 0.6 }
          );

          reflexionContext = `
## Learning from Past Analyses

The following insights from past ecosystem analysis tasks will inform this analysis:

${memoryResult.prompt}

---
`;
        } catch (error) {
          this.logger.warn('Reflexion memory retrieval failed:', error);
          reflexionContext = '<!-- Learning context unavailable -->\n';
        }
      }

      // Step 3: Generate base project analysis prompt with recursive depth
      ctx.info('📁 Phase 3: Scanning project files and structure');
      ctx.report_progress(40, 100);

      const baseProjectAnalysisPrompt = await analyzeProjectStructure(projectPath);

      // Step 4: Generate environment analysis if enabled
      ctx.info('🔧 Phase 4: Analyzing environment and infrastructure');
      ctx.report_progress(55, 100);
      let environmentAnalysisContext = '';
      if (includeEnvironment) {
        try {
          this.logger.info('Including comprehensive environment analysis in ecosystem analysis');
          const { analyzeEnvironment } = await import('./tools/environment-analysis-tool.js');

          // Call environment analysis with comprehensive scope
          const environmentResult = await analyzeEnvironment({
            projectPath,
            adrDirectory: this.config.adrDirectory,
            analysisType: 'comprehensive',
          });

          // Extract environment analysis content
          if (environmentResult.content && environmentResult.content[0]) {
            environmentAnalysisContext = `
## Integrated Environment Analysis

${environmentResult.content[0].text}

---
`;
          }
        } catch (error) {
          this.logger.warn('Environment analysis integration failed:', error);
          environmentAnalysisContext = `
## Environment Analysis
<!-- Environment analysis unavailable: ${error instanceof Error ? error.message : 'Unknown error'} -->

---
`;
        }
      }

      // Step 5: Apply Reflexion execution if learning is enabled
      ctx.info('🧪 Phase 5: Applying learning and reflexion');
      ctx.report_progress(70, 100);

      let enhancedAnalysisPrompt = baseProjectAnalysisPrompt.prompt + environmentAnalysisContext;
      if (enhancedMode && learningEnabled && executeWithReflexion && createToolReflexionConfig) {
        try {
          const reflexionConfig = createToolReflexionConfig('analyze_project_ecosystem', {
            reflectionDepth: analysisDepth === 'basic' ? 'basic' : 'detailed',
            evaluationCriteria: ['task-success', 'accuracy', 'completeness'],
            learningRate: 0.7,
          });

          const reflexionResult = await executeWithReflexion(
            {
              prompt:
                baseProjectAnalysisPrompt.prompt + knowledgeContext + environmentAnalysisContext,
              instructions: baseProjectAnalysisPrompt.instructions,
              context: {
                projectPath,
                analysisDepth,
                recursiveDepth,
                technologyFocus,
                includePatterns,
                includeEnvironment,
                analysisScope,
                knowledgeEnhanced: knowledgeEnhancement,
                learningEnabled: true,
              },
            },
            reflexionConfig
          );

          enhancedAnalysisPrompt = reflexionResult.prompt;
        } catch (error) {
          this.logger.warn('Reflexion execution failed:', error);
          enhancedAnalysisPrompt =
            baseProjectAnalysisPrompt.prompt + knowledgeContext + environmentAnalysisContext;
        }
      } else {
        enhancedAnalysisPrompt =
          baseProjectAnalysisPrompt.prompt + knowledgeContext + environmentAnalysisContext;
      }

      // Execute the analysis with AI if enabled, otherwise return prompt
      ctx.info('🤖 Phase 6: Executing AI-powered ecosystem analysis');
      ctx.report_progress(85, 100);

      const { executeEcosystemAnalysisPrompt, formatMCPResponse } = await import(
        './utils/prompt-execution.js'
      );
      const executionResult = await executeEcosystemAnalysisPrompt(
        enhancedAnalysisPrompt,
        baseProjectAnalysisPrompt.instructions,
        {
          temperature: 0.1,
          maxTokens: 6000,
        }
      );

      // Step 6: Record project structure to knowledge graph
      try {
        this.logger.info('Recording project structure to knowledge graph');

        const projectStructureSnapshot = {
          projectPath,
          analysisDepth,
          recursiveDepth,
          technologyFocus,
          analysisScope,
          includeEnvironment,
          timestamp: new Date().toISOString(),
          structureData: baseProjectAnalysisPrompt.context || {},
        };

        await this.kgManager.recordProjectStructure(projectStructureSnapshot);
        this.logger.info('✅ Project structure recorded to knowledge graph');
      } catch (kgError) {
        this.logger.warn('Failed to record project structure to knowledge graph:', kgError);
        // Don't fail the entire analysis if KG recording fails
      }

      ctx.info('✅ Ecosystem analysis completed successfully');
      ctx.report_progress(100, 100);

      // Return appropriate response based on execution result
      if (executionResult.isAIGenerated) {
        // AI execution successful - return actual analysis results
        return formatMCPResponse({
          ...executionResult,
          content: `# Comprehensive Project Ecosystem Analysis Results

## Analysis Configuration
- **Project Path**: ${projectPath}
- **Analysis Depth**: ${analysisDepth}
- **Recursive Depth**: ${recursiveDepth}
- **Environment Analysis**: ${includeEnvironment ? '✅ Included' : '❌ Excluded'}
- **Analysis Scope**: ${analysisScope.length > 0 ? analysisScope.join(', ') : 'Full ecosystem analysis'}

## Enhancement Features
- **Knowledge Generation**: ${enhancedMode && knowledgeEnhancement ? '✅ Enabled' : '❌ Disabled'}
- **Reflexion Learning**: ${enhancedMode && learningEnabled ? '✅ Enabled' : '❌ Disabled'}
- **Enhanced Mode**: ${enhancedMode ? '✅ Enabled' : '❌ Disabled'}
- **Technology Focus**: ${technologyFocus.length > 0 ? technologyFocus.join(', ') : 'Auto-detect'}
- **Knowledge Graph**: ✅ Project structure recorded

${knowledgeContext}

${reflexionContext}

## Comprehensive Ecosystem Analysis Results

${executionResult.content}

${
  includeEnvironment
    ? `

## Environment Integration Summary

The analysis above includes comprehensive environment analysis covering:
- **Infrastructure Specifications**: Deployment and runtime environment details
- **Containerization**: Docker, Kubernetes, and container orchestration analysis
- **Environment Requirements**: Configuration and dependency requirements
- **Compliance Assessment**: Security and regulatory compliance evaluation

This integrated approach provides complete understanding of both codebase patterns AND operational environment.
`
    : ''
}

## Next Steps: Complete Ecosystem Understanding

Based on the comprehensive analysis above:

### **Immediate Actions**
1. **Review Ecosystem Overview**: Examine the complete technology stack and environment context
2. **Assess Integration Points**: Understand how code patterns relate to operational environment
3. **Identify Critical Dependencies**: Focus on key dependencies between code and infrastructure

### **Strategic Planning**
4. **Address Architectural Issues**: Prioritize improvements based on both code and environment analysis
5. **Plan Environment Optimization**: Optimize deployment and operational configurations
6. **Update Documentation**: Document both architectural decisions and environment specifications

### **Implementation Roadmap**
7. **Implement Code Improvements**: Execute code-level architectural enhancements
8. **Optimize Environment**: Improve infrastructure and deployment configurations
9. **Monitor Integration**: Ensure code and environment changes work together effectively

This comprehensive ecosystem analysis provides the foundation for informed architectural and operational decisions.
`,
        });
      } else {
        // Fallback to prompt-only mode
        return {
          content: [
            {
              type: 'text',
              text: `# Comprehensive Project Ecosystem Analysis

This comprehensive analysis provides deep recursive project understanding with integrated environment analysis.

## Analysis Configuration
- **Project Path**: ${projectPath}
- **Analysis Depth**: ${analysisDepth}
- **Recursive Depth**: ${recursiveDepth}
- **Environment Analysis**: ${includeEnvironment ? '✅ Included' : '❌ Excluded'}
- **Analysis Scope**: ${analysisScope.length > 0 ? analysisScope.join(', ') : 'Full ecosystem analysis'}

## Enhancement Features
- **Knowledge Generation**: ${enhancedMode && knowledgeEnhancement ? '✅ Enabled' : '❌ Disabled'}
- **Reflexion Learning**: ${enhancedMode && learningEnabled ? '✅ Enabled' : '❌ Disabled'}
- **Enhanced Mode**: ${enhancedMode ? '✅ Enabled' : '❌ Disabled'}
- **Technology Focus**: ${technologyFocus.length > 0 ? technologyFocus.join(', ') : 'Auto-detect'}
- **Include Patterns**: ${includePatterns?.length ? includePatterns.join(', ') : 'Default patterns'}
- **Knowledge Graph**: ✅ Project structure recorded

${knowledgeContext}

${reflexionContext}

## Enhanced Analysis Prompt

${enhancedAnalysisPrompt}

## Enhanced Implementation Instructions

${baseProjectAnalysisPrompt.instructions}

### Enhancement-Specific Instructions

${
  enhancedMode && knowledgeEnhancement
    ? `
#### Knowledge Enhancement
- Apply technology-specific knowledge to ecosystem analysis
- Use domain expertise to identify patterns and anti-patterns
- Leverage architectural best practices for technology stack evaluation
`
    : ''
}

${
  enhancedMode && learningEnabled
    ? `
#### Learning Integration
- Apply lessons learned from past ecosystem analyses
- Use memory insights to improve pattern recognition accuracy
- Incorporate feedback from previous analysis outcomes
`
    : ''
}

## Expected Enhanced Output

The enhanced analysis should provide:
1. **Technology Stack Analysis** with domain knowledge context
2. **Architectural Pattern Detection** informed by past experiences
3. **Ecosystem Health Assessment** using learned evaluation criteria
4. **Improvement Recommendations** based on domain best practices
5. **Learning Insights** for future analysis improvement

## Quality Assurance

- Ensure analysis leverages all available enhancement features
- Verify technology-specific knowledge is properly applied
- Confirm learning insights improve analysis accuracy
- Validate recommendations align with domain best practices`,
            },
          ],
        };
      }
    } catch (error) {
      throw new McpAdrError(
        `Failed to analyze project ecosystem: ${error instanceof Error ? error.message : String(error)}`,
        'ANALYSIS_ERROR'
      );
    }
  }

  private async getArchitecturalContext(
    args: GetArchitecturalContextArgs
  ): Promise<CallToolResult> {
    const { filePath, includeCompliance = true } = args;

    try {
      const {
        analyzeProjectStructureCompat: analyzeProjectStructure,
        fileExistsCompat: fileExists,
        ensureDirectoryCompat: ensureDirectory,
      } = await import('./utils/file-system.js');
      const path = await import('path');

      // Determine project path
      const projectPath = filePath
        ? filePath.split('/').slice(0, -1).join('/')
        : this.config.projectPath;
      const adrDirectory = path.join(projectPath, this.config.adrDirectory);

      // Generate prompts for ADR directory setup
      const adrDirectoryCheckPrompt = await fileExists(adrDirectory);
      const adrDirectorySetupPrompt = await ensureDirectory(adrDirectory);

      // Generate architectural analysis prompt
      const projectAnalysisPrompt = await analyzeProjectStructure(projectPath);

      const architecturalPrompt = `
# Architectural Context Analysis & Project Setup

## Project Overview
**Project Path**: ${projectPath}
**Analysis Scope**: ${filePath ? `Specific file: ${filePath}` : 'Entire project'}
**ADR Directory**: ${this.config.adrDirectory}
**Include Compliance**: ${includeCompliance ? 'Yes' : 'No'}

## 🚀 ADR Infrastructure Setup

This analysis will include setting up ADR infrastructure if needed:

### ADR Directory Check
${adrDirectoryCheckPrompt.prompt}

### ADR Directory Setup (if needed)
${adrDirectorySetupPrompt.prompt}

## Comprehensive Project Analysis

${projectAnalysisPrompt.prompt}

## Enhanced Architectural Focus

Please provide a **comprehensive, outcome-focused analysis** including:

### 1. Technology Stack & Infrastructure Analysis
- **Core Technologies**: Programming languages, frameworks, runtime environments
- **Dependencies**: Package managers, third-party libraries, version constraints
- **Build & Deployment**: CI/CD pipelines, build tools, deployment strategies
- **Data Layer**: Databases, caching, data storage and retrieval patterns

### 2. Architectural Pattern & Design Analysis
- **System Architecture**: Monolith, microservices, serverless, hybrid patterns
- **Code Organization**: Module structure, separation of concerns, layering
- **API Design**: REST, GraphQL, RPC patterns and conventions
- **Data Flow**: Request/response cycles, event handling, state management
${filePath ? `- **File-specific Context**: How ${filePath} fits into the overall architecture` : ''}

### 3. Quality, Security & Performance Assessment
- **Code Quality**: Structure, naming, documentation, testing strategies
- **Security Implementation**: Authentication, authorization, data protection
- **Performance Patterns**: Caching, optimization, scalability considerations
- **Monitoring & Observability**: Logging, metrics, error tracking

### 4. Architectural Decision Discovery & Documentation
- **Explicit Decisions**: Find existing documentation and decision records
- **Implicit Decisions**: Identify significant undocumented architectural choices
- **Technology Rationale**: Understand selection criteria and trade-offs
- **Evolution Path**: How the architecture has changed over time

${
  includeCompliance
    ? `### 5. Compliance & Standards Assessment
- **Industry Standards**: Adherence to relevant industry standards and best practices
- **Security Compliance**: Security standards compliance (OWASP, SOC2, etc.)
- **Code Standards**: Coding standards and style guide compliance
- **Architectural Compliance**: Adherence to established architectural principles
- **Regulatory Requirements**: Any regulatory compliance requirements (GDPR, HIPAA, etc.)`
    : ''
}

## Expected Output: Outcome-Focused Architectural Context

Provide a **comprehensive architectural context** with **clear project outcomes**:

### 📋 **1. Executive Summary & Project Outcomes**
- **Current State**: What the project is and what it does
- **Architectural Maturity**: Assessment of current architectural practices
- **Key Strengths**: What's working well architecturally
- **Critical Gaps**: What needs immediate attention
- **Success Metrics**: How to measure architectural improvements

### 🔧 **2. Technology & Infrastructure Inventory**
- **Technology Stack**: Complete inventory with versions and purposes
- **Infrastructure Components**: Deployment, monitoring, data storage
- **Dependencies**: Critical dependencies and potential risks
- **Tool Chain**: Development, testing, and deployment tools

### 🏗️ **3. Architectural Patterns & Design Decisions**
- **System Design**: Overall architectural approach and patterns
- **Component Architecture**: How major components interact
- **Data Architecture**: How data flows and is managed
- **Integration Patterns**: How external systems are integrated

### 📊 **4. Quality & Compliance Assessment**
- **Code Quality Score**: Assessment of current code quality
- **Security Posture**: Security implementation and gaps
- **Performance Profile**: Current performance characteristics
- **Maintainability Index**: How easy the system is to maintain and evolve

### 🎯 **5. Outcome-Focused Action Plan**
Based on the analysis, provide a **clear workflow** with **projected outcomes**:

#### **Immediate Actions (Next 1-2 weeks)**
- **Priority 1**: Most critical architectural issues to address
- **Quick Wins**: Low-effort, high-impact improvements
- **Documentation**: Essential decisions that need immediate documentation

#### **Short-term Goals (Next 1-3 months)**
- **Architectural Improvements**: Planned enhancements with expected outcomes
- **Technical Debt**: Priority technical debt to address
- **Process Improvements**: Development workflow enhancements

#### **Long-term Vision (3-12 months)**
- **Strategic Architecture**: Long-term architectural evolution
- **Scalability Roadmap**: How to scale the system effectively
- **Innovation Opportunities**: Areas for architectural innovation

### 📈 **6. Success Metrics & Outcomes**
Define **measurable outcomes** for architectural improvements:

- **Performance Metrics**: Response times, throughput, resource utilization
- **Quality Metrics**: Code coverage, bug rates, maintainability scores
- **Developer Experience**: Build times, deployment frequency, developer satisfaction
- **Business Impact**: Feature delivery speed, system reliability, cost efficiency

### 🏗️ **7. ADR Infrastructure & Documentation Plan**

If ADR directory doesn't exist, also provide:

1. **Create Directory Structure**:
   \`\`\`
   ${this.config.adrDirectory}/
   ├── 0001-record-architecture-decisions.md (template)
   ├── README.md (ADR process guide)
   └── template.md (ADR template)
   \`\`\`

2. **Generate Initial ADRs** for discovered architectural decisions
3. **Create ADR Process Guide** for the team
4. **Establish ADR Workflow** for future decisions

### 🔄 **8. Continuous Improvement Workflow**
Establish ongoing architectural governance:

- **Regular Reviews**: Monthly architectural health checks
- **Decision Documentation**: Process for documenting new architectural decisions
- **Compliance Monitoring**: Ongoing adherence to architectural standards
- **Evolution Planning**: Quarterly architectural roadmap updates

## Next Steps: Grounded Project Workflow

After this analysis, follow this **outcome-focused workflow**:

1. **📋 Review Analysis**: Examine the architectural context and recommendations
2. **🎯 Set Priorities**: Choose 3-5 most impactful improvements based on outcomes
3. **📝 Document Decisions**: Create ADRs for significant architectural choices
4. **🔧 Implement Changes**: Execute improvements in priority order
5. **📊 Measure Progress**: Track success metrics and outcomes
6. **🔄 Iterate**: Regular reviews and continuous improvement

This approach ensures that architectural work is **grounded in measurable outcomes** and **aligned with project success**.
`;

      // Execute the analysis with AI if enabled, otherwise return prompt
      const { executeEcosystemAnalysisPrompt, formatMCPResponse } = await import(
        './utils/prompt-execution.js'
      );
      const executionResult = await executeEcosystemAnalysisPrompt(
        architecturalPrompt,
        projectAnalysisPrompt.instructions,
        {
          temperature: 0.1,
          maxTokens: 5000,
          systemPrompt: `You are a senior software architect specializing in architectural context analysis.
Analyze the provided project to understand its architectural patterns, design decisions, and structural organization.
Focus on providing actionable insights about the architecture that can guide development decisions.`,
        }
      );

      if (executionResult.isAIGenerated) {
        // AI execution successful - return actual analysis results
        return formatMCPResponse({
          ...executionResult,
          content: `# Architectural Context Analysis Results

${filePath ? `## Target File: ${filePath}` : '## Project-wide Analysis'}

## Project Information
- **Project Path**: ${projectPath}
- **Analysis Scope**: ${filePath ? 'File-specific' : 'Project-wide'}
- **ADR Directory**: ${this.config.adrDirectory}

## ADR Infrastructure Setup

The analysis includes automatic ADR infrastructure setup:

${adrDirectoryCheckPrompt.instructions}

${adrDirectorySetupPrompt.instructions}

## AI Analysis Results

${executionResult.content}

## Outcome-Focused Next Steps

Based on the architectural analysis, follow this **grounded workflow**:

### **Immediate Actions (This Week)**
1. **Review Analysis**: Examine the architectural context and recommendations above
2. **Set Up ADRs**: Ensure ADR directory structure is created and ready
3. **Identify Quick Wins**: Focus on low-effort, high-impact improvements

### **Short-term Goals (Next Month)**
4. **Document Key Decisions**: Create ADRs for the most significant architectural choices
5. **Address Critical Issues**: Tackle the highest-priority architectural concerns
6. **Establish Metrics**: Set up measurement for the success metrics identified

### **Long-term Vision (Next Quarter)**
7. **Implement Roadmap**: Execute the architectural improvement plan
8. **Monitor Progress**: Track success metrics and adjust approach as needed
9. **Continuous Improvement**: Establish regular architectural reviews

This **outcome-focused approach** ensures architectural work delivers **measurable value** and keeps the project **grounded in clear objectives**.
`,
        });
      } else {
        // Fallback to prompt-only mode
        return {
          content: [
            {
              type: 'text',
              text: architecturalPrompt,
            },
          ],
        };
      }
    } catch (error) {
      throw new McpAdrError(
        `Failed to get architectural context: ${error instanceof Error ? error.message : String(error)}`,
        'ANALYSIS_ERROR'
      );
    }
  }

  private async generateAdrsFromPrd(
    args: Record<string, unknown>,
    context?: ToolContext
  ): Promise<CallToolResult> {
    const ctx = context || createNoOpContext();

    const {
      prdPath,
      enhancedMode = true,
      promptOptimization = true,
      knowledgeEnhancement = true,
      prdType = 'general',
    } = args;
    const outputDirectory = args['outputDirectory'] || this.config.adrDirectory;

    this.logger.info(`Generating enhanced ADRs from PRD: ${prdPath} to ${outputDirectory}`);
    this.logger.info(
      `Enhancement features - APE: ${promptOptimization}, Knowledge: ${knowledgeEnhancement}, Type: ${prdType}`
    );

    ctx.info(`📝 Starting ADR generation from PRD: ${prdPath}`);
    ctx.report_progress(0, 100);

    try {
      ctx.info('📂 Phase 1: Validating PRD file');
      ctx.report_progress(10, 100);
      const { readFileContentCompat: readFileContent, fileExistsCompat: fileExists } = await import(
        './utils/file-system.js'
      );

      // Import advanced prompting utilities if enhanced mode is enabled
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let generateArchitecturalKnowledge: any = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let optimizePromptWithAPE: any = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let createToolAPEConfig: any = null;

      if (enhancedMode) {
        if (knowledgeEnhancement) {
          const knowledgeModule = await import('./utils/knowledge-generation.js');
          generateArchitecturalKnowledge = knowledgeModule.generateArchitecturalKnowledge;
        }

        if (promptOptimization) {
          const apeModule = await import('./utils/automatic-prompt-engineering.js');
          optimizePromptWithAPE = apeModule.optimizePromptWithAPE;
          createToolAPEConfig = apeModule.createToolAPEConfig;
        }
      }

      // Generate file existence check prompt
      const fileExistsPrompt = await fileExists(prdPath as string);

      // Generate file content reading prompt
      const fileContentPrompt = await readFileContent(prdPath as string);

      ctx.info('📚 Phase 2: Reading PRD content');
      ctx.report_progress(25, 100);

      // Step 1: Generate domain-specific knowledge if enabled
      ctx.info('🧠 Phase 3: Generating domain knowledge');
      ctx.report_progress(40, 100);

      let knowledgeContext = '';
      if (enhancedMode && knowledgeEnhancement && generateArchitecturalKnowledge) {
        try {
          const knowledgeResult = await generateArchitecturalKnowledge(
            {
              projectPath: outputDirectory,
              technologies: [],
              patterns: [],
              projectType: prdType,
              existingAdrs: [],
            },
            {
              domains: this.getPrdTypeDomains(prdType as string),
              depth: 'intermediate',
              cacheEnabled: true,
            }
          );

          knowledgeContext = `
## Domain-Specific Knowledge Enhancement

The following architectural knowledge has been generated to enhance PRD analysis and ADR creation:

${knowledgeResult.prompt}

---
`;
        } catch (error) {
          this.logger.warn('Knowledge generation failed:', error);
          knowledgeContext = '<!-- Knowledge generation unavailable -->\n';
        }
      }

      // Step 2: Create base ADR generation prompt
      ctx.info('📋 Phase 4: Creating base ADR prompts');
      ctx.report_progress(60, 100);

      const baseAdrPrompt = this.createBaseAdrPrompt(
        prdPath as string,
        outputDirectory as string,
        knowledgeContext
      );

      // Step 3: Apply APE optimization if enabled
      ctx.info('⚡ Phase 5: Optimizing prompts with APE');
      ctx.report_progress(75, 100);

      let finalAdrPrompt = baseAdrPrompt;
      if (enhancedMode && promptOptimization && optimizePromptWithAPE && createToolAPEConfig) {
        try {
          const apeConfig = createToolAPEConfig('generate_adrs_from_prd', {
            candidateCount: 5,
            evaluationCriteria: ['task-completion', 'clarity', 'specificity'],
            optimizationRounds: 2,
            qualityThreshold: 0.75,
          });

          const apeResult = await optimizePromptWithAPE(
            {
              prompt: baseAdrPrompt,
              instructions: 'Generate comprehensive ADRs from PRD analysis',
              context: {
                prdPath,
                outputDirectory,
                prdType,
                knowledgeEnhanced: knowledgeEnhancement,
              },
            },
            apeConfig
          );

          finalAdrPrompt = apeResult.prompt;
        } catch (error) {
          this.logger.warn('APE optimization failed:', error);
          finalAdrPrompt = baseAdrPrompt;
        }
      }

      // Generate comprehensive ADR creation prompt that includes file operations
      const adrPrompt = `
# Enhanced ADR Generation from PRD Request

This is a comprehensive prompt-driven ADR generation process enhanced with advanced prompting techniques.

## Enhancement Status
- **APE Optimization**: ${enhancedMode && promptOptimization ? '✅ Enabled' : '❌ Disabled'}
- **Knowledge Generation**: ${enhancedMode && knowledgeEnhancement ? '✅ Enabled' : '❌ Disabled'}
- **PRD Type**: ${prdType}
- **Enhanced Mode**: ${enhancedMode ? '✅ Enabled' : '❌ Disabled'}

## Step 1: File Validation
${fileExistsPrompt.prompt}

**Instructions**: First, execute the file existence check above. If the file does not exist, stop the process and report the error. Only proceed to Step 2 if the file exists.

## Step 2: PRD Content Reading
${fileContentPrompt.prompt}

**Instructions**: Execute the file reading operation above to obtain the PRD content. Use the content from this step for the enhanced ADR generation in Step 3.

## Step 3: Enhanced ADR Generation

${
  enhancedMode && promptOptimization
    ? `
### APE-Optimized Analysis
This prompt has been optimized using Automatic Prompt Engineering for superior ADR generation quality.
The optimization focused on task completion, clarity, and specificity for PRD analysis.

`
    : ''
}

${finalAdrPrompt}

### File Creation Instructions

For each generated ADR, create a file creation prompt using the following pattern:
- **File Path**: ${outputDirectory}/[number]-[decision-title].md
- **Content**: The complete enhanced ADR markdown content
- **Action Confirmation**: Require user confirmation before creating files
- **Security Validation**: Ensure output directory is safe and authorized

### Enhanced Quality Assurance

- Ensure each ADR leverages domain knowledge when available
- Verify decisions align with PRD type best practices
- Check that enhancement features are properly utilized
- Validate that ADR content exceeds baseline quality expectations
- Confirm all decisions are traceable back to PRD requirements with domain context
`;

      // Execute the ADR generation with AI if enabled, otherwise return prompt
      ctx.info('🤖 Phase 6: Executing AI-powered ADR generation');
      ctx.report_progress(90, 100);

      const { executeADRGenerationPrompt, formatMCPResponse } = await import(
        './utils/prompt-execution.js'
      );
      const executionResult = await executeADRGenerationPrompt(
        adrPrompt,
        'Generate comprehensive ADRs from PRD analysis with enhanced domain knowledge and optimization',
        {
          temperature: 0.1,
          maxTokens: 8000,
          systemPrompt: `You are an expert software architect who creates comprehensive Architectural Decision Records (ADRs) from Product Requirements Documents (PRDs).
Generate well-structured ADRs that follow best practices and include all necessary sections.
Focus on extracting architectural decisions from the PRD and creating actionable ADRs with clear reasoning.`,
        }
      );

      ctx.info('✅ ADR generation completed successfully');
      ctx.report_progress(100, 100);

      if (executionResult.isAIGenerated) {
        // AI execution successful - return actual ADR generation results
        return formatMCPResponse({
          ...executionResult,
          content: `# ADR Generation from PRD Results

## Enhancement Features
- **APE Optimization**: ${enhancedMode && promptOptimization ? '✅ Enabled' : '❌ Disabled'}
- **Knowledge Generation**: ${enhancedMode && knowledgeEnhancement ? '✅ Enabled' : '❌ Disabled'}
- **PRD Type Optimization**: ${prdType}
- **Enhanced Mode**: ${enhancedMode ? '✅ Enabled' : '❌ Disabled'}

## Source Information
- **PRD Path**: ${prdPath}
- **Output Directory**: ${outputDirectory}

## Generated ADRs

${executionResult.content}

## Next Steps

1. **Review Generated ADRs**: Examine each ADR for completeness and accuracy
2. **Save ADR Files**: Create individual .md files for each ADR in ${outputDirectory}
3. **Update ADR Index**: Add new ADRs to your project's ADR catalog
4. **Stakeholder Review**: Share ADRs with team for feedback and approval
5. **Implementation Planning**: Create tasks for implementing the architectural decisions

## File Creation Commands

To save the generated ADRs, create individual files in ${outputDirectory}:

\`\`\`bash
# Create ADR directory if it doesn't exist
mkdir -p ${outputDirectory}

# Save each ADR as a separate file (example)
# Replace [NUMBER] and [TITLE] with actual values from generated ADRs
# cat > "${outputDirectory}/001-example-decision.md" << 'EOF'
# [ADR content here]
# EOF
\`\`\`
`,
        });
      } else {
        // Fallback to prompt-only mode
        return {
          content: [
            {
              type: 'text',
              text: `# Enhanced ADR Generation from PRD: ${prdPath}

## Advanced Prompt-Driven ADR Generation Process

This tool uses a 100% prompt-driven architecture enhanced with advanced prompting techniques:

### Enhancement Features
- **APE Optimization**: ${enhancedMode && promptOptimization ? '✅ Enabled - Prompts optimized for superior quality' : '❌ Disabled'}
- **Knowledge Generation**: ${enhancedMode && knowledgeEnhancement ? '✅ Enabled - Domain knowledge enhanced analysis' : '❌ Disabled'}
- **PRD Type Optimization**: ${prdType} - Tailored for specific domain requirements
- **Enhanced Mode**: ${enhancedMode ? '✅ Enabled - All advanced features active' : '❌ Disabled - Basic mode'}

### Enhanced AI Agent Workflow

1. **Validate PRD file existence** using secure file system operations
2. **Read PRD content** safely with proper security validation
3. **Apply domain knowledge** to enhance understanding (if enabled)
4. **Generate optimized ADRs** using APE-enhanced prompts (if enabled)
5. **Create enhanced ADR files** in the specified output directory: ${outputDirectory}

## Execution Instructions

Please execute the following enhanced comprehensive prompt:

${adrPrompt}

## Advanced Features

${
  enhancedMode && knowledgeEnhancement
    ? `
### Knowledge Enhancement
- Domain-specific architectural knowledge has been generated
- PRD analysis is enhanced with ${prdType} domain expertise
- ADR decisions leverage domain best practices and patterns
`
    : ''
}

${
  enhancedMode && promptOptimization
    ? `
### APE Optimization
- Prompts have been automatically optimized for quality
- Enhanced evaluation criteria ensure superior ADR generation
- Optimization focused on task completion, clarity, and specificity
`
    : ''
}

## Security and Validation

- All file operations include security validation
- Path traversal protection is enabled
- System directory access is prevented
- User confirmation is required for file creation
- Content validation ensures safe enhanced ADR generation

## Expected Enhanced Workflow

1. Execute file existence check for: ${prdPath}
2. If file exists, read PRD content securely
3. Apply domain knowledge to enhance PRD understanding
4. Analyze PRD content using optimized prompts
5. Generate domain-enhanced individual ADRs for each decision
6. Create file creation prompts for each enhanced ADR
7. Confirm with user before writing files to: ${outputDirectory}

The enhanced process maintains full traceability from PRD requirements to generated ADRs while providing superior quality through advanced prompting techniques and ensuring security and user control over file operations.`,
            },
          ],
        };
      }
    } catch (error) {
      throw new McpAdrError(
        `Failed to generate ADR prompts from PRD: ${error instanceof Error ? error.message : String(error)}`,
        'PROMPT_GENERATION_ERROR'
      );
    }
  }

  private async compareAdrProgress(args: Record<string, unknown>): Promise<CallToolResult> {
    const {
      todoPath = 'TODO.md',
      adrDirectory = this.config.adrDirectory,
      projectPath = this.config.projectPath,
      environment = 'auto-detect',
      environmentConfig = {},
      validationType = 'full',
      includeFileChecks = true,
      includeRuleValidation = true,
      deepCodeAnalysis = true,
      functionalValidation = true,
      strictMode = true,
      environmentValidation = true,
    } = args;

    const { getAdrDirectoryPath } = await import('./utils/config.js');
    const path = await import('path');

    // Resolve paths
    const absoluteTodoPath = path.resolve(projectPath as string, todoPath as string);
    const absoluteAdrPath = adrDirectory
      ? path.resolve(projectPath as string, adrDirectory as string)
      : getAdrDirectoryPath(this.config);

    this.logger.info(
      `Comparing ADR progress: TODO(${absoluteTodoPath}) vs ADRs(${absoluteAdrPath}) vs Environment(${projectPath}) [env: ${environment}]`
    );

    // Environment validation and auto-detection
    let detectedEnvironment = environment;
    let finalEnvironmentConfig = { ...(environmentConfig as Record<string, unknown>) };

    if (
      environmentValidation &&
      (validationType === 'full' || validationType === 'environment-only')
    ) {
      try {
        const envResult = await this.detectAndValidateEnvironment(
          projectPath as string,
          environment as string,
          environmentConfig as Record<string, unknown>
        );
        detectedEnvironment = envResult.detectedEnvironment;
        finalEnvironmentConfig = { ...finalEnvironmentConfig, ...envResult.environmentConfig };
        this.logger.info(`Environment detection result: ${detectedEnvironment}`);
      } catch (error) {
        this.logger.warn(
          `Environment detection failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    try {
      // Step 1: Read TODO.md file directly
      let todoContent = '';
      if (validationType === 'full' || validationType === 'todo-only') {
        try {
          const fs = await import('fs/promises');
          todoContent = await fs.readFile(absoluteTodoPath, 'utf-8');
        } catch (error) {
          this.logger.warn(
            `Could not read TODO.md file: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Step 2: Use actual project structure scanning
      let projectStructure = null;
      if (validationType === 'full' || validationType === 'environment-only') {
        try {
          const { scanProjectStructure } = await import('./utils/actual-file-operations.js');
          const includeContent = (deepCodeAnalysis as boolean) || (functionalValidation as boolean);
          projectStructure = await scanProjectStructure(projectPath as string, {
            readContent: includeContent,
            maxFileSize: includeContent ? 10000 : 0,
          });
        } catch (error) {
          this.logger.warn(
            `Could not scan project structure: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Perform actual analysis locally instead of relying on AI execution
      let discoveryResult: unknown = null;
      if (validationType === 'full' || validationType === 'adr-only') {
        const { discoverAdrsInDirectory } = await import('./utils/adr-discovery.js');
        discoveryResult = await discoverAdrsInDirectory(
          absoluteAdrPath as string,
          projectPath as string,
          {
            includeContent: true,
            includeTimeline: false,
          }
        );
      }
      const analysis = await this.performLocalAdrProgressAnalysis({
        todoContent,
        todoPath: absoluteTodoPath,
        discoveredAdrs: (discoveryResult as { adrs?: unknown[] })?.adrs || [],
        adrDirectory: absoluteAdrPath,
        projectStructure: projectStructure || null,
        projectPath: projectPath as string,
        validationType: validationType as string,
        includeFileChecks: includeFileChecks as boolean,
        includeRuleValidation: includeRuleValidation as boolean,
        deepCodeAnalysis: deepCodeAnalysis as boolean,
        functionalValidation: functionalValidation as boolean,
        strictMode: strictMode as boolean,
        environment: detectedEnvironment as string,
        environmentConfig: finalEnvironmentConfig,
        environmentValidation: environmentValidation as boolean,
      });

      return {
        content: [
          {
            type: 'text',
            text: analysis,
          },
        ],
      };
    } catch (error) {
      throw new McpAdrError(
        `Failed to compare ADR progress: ${error instanceof Error ? error.message : String(error)}`,
        'VALIDATION_ERROR'
      );
    }
  }

  /**
   * Detect and validate environment context
   */
  private async detectAndValidateEnvironment(
    projectPath: string,
    environment: string,
    environmentConfig: Record<string, unknown>
  ): Promise<{ detectedEnvironment: string; environmentConfig: Record<string, unknown> }> {
    const path = await import('path');
    const fs = await import('fs/promises');

    let detectedEnvironment = environment;
    let finalConfig = { ...environmentConfig };

    if (environment === 'auto-detect') {
      // Auto-detect environment based on project structure
      try {
        // Check for environment indicator files
        const envFiles = [
          '.env.development',
          '.env.staging',
          '.env.production',
          '.env.test',
          'package.json',
          'docker-compose.yml',
          'Dockerfile',
        ];

        const existingFiles: string[] = [];
        for (const file of envFiles) {
          try {
            await fs.access(path.join(projectPath, file));
            existingFiles.push(file);
          } catch {
            // File doesn't exist, continue
          }
        }

        // Environment detection logic
        if (existingFiles.includes('.env.production') || existingFiles.includes('Dockerfile')) {
          detectedEnvironment = 'production';
        } else if (existingFiles.includes('.env.staging')) {
          detectedEnvironment = 'staging';
        } else if (existingFiles.includes('.env.test')) {
          detectedEnvironment = 'testing';
        } else {
          detectedEnvironment = 'development';
        }

        // Set environment-specific default configurations
        switch (detectedEnvironment) {
          case 'production':
            finalConfig = {
              securityLevel: 'critical',
              requiredFiles: ['package.json', 'README.md'],
              requiredServices: ['monitoring', 'logging'],
              performanceRequirements: { minUptime: 99.9 },
              ...finalConfig,
            };
            break;
          case 'staging':
            finalConfig = {
              securityLevel: 'high',
              requiredFiles: ['package.json'],
              requiredServices: ['testing', 'monitoring'],
              performanceRequirements: { minUptime: 95 },
              ...finalConfig,
            };
            break;
          case 'testing':
            finalConfig = {
              securityLevel: 'medium',
              requiredFiles: ['package.json'],
              requiredServices: ['testing'],
              performanceRequirements: {},
              ...finalConfig,
            };
            break;
          default: // development
            finalConfig = {
              securityLevel: 'medium',
              requiredFiles: ['package.json'],
              requiredServices: [],
              performanceRequirements: {},
              ...finalConfig,
            };
        }
      } catch (error) {
        this.logger.warn(
          `Environment auto-detection failed: ${error instanceof Error ? error.message : String(error)}`
        );
        detectedEnvironment = 'development'; // fallback
      }
    }

    return { detectedEnvironment, environmentConfig: finalConfig };
  }

  /**
   * Perform local ADR progress analysis without relying on AI execution
   */
  private async performLocalAdrProgressAnalysis(params: {
    todoContent: string;
    todoPath: string;
    discoveredAdrs: unknown[];
    adrDirectory: string;
    projectStructure: unknown;
    projectPath: string;
    validationType: string;
    includeFileChecks: boolean;
    includeRuleValidation: boolean;
    deepCodeAnalysis: boolean;
    functionalValidation: boolean;
    strictMode: boolean;
    environment: string;
    environmentConfig: unknown;
    environmentValidation: boolean;
  }): Promise<string> {
    const {
      todoContent,
      todoPath,
      discoveredAdrs,
      adrDirectory,
      projectStructure,
      projectPath,
      validationType,
      includeFileChecks,
      includeRuleValidation,
      deepCodeAnalysis,
      functionalValidation,
      strictMode,
      environment,
      environmentConfig,
      environmentValidation,
    } = params;

    const currentDate = new Date().toISOString().split('T')[0];

    // Parse TODO content to extract tasks
    const todoTasks = this.parseTodoTasks(todoContent);

    // Basic analysis
    const totalAdrs = discoveredAdrs.length;
    const totalTasks = todoTasks.length;
    const completedTasks = todoTasks.filter(task => task.completed).length;

    // Calculate alignment score (simplified, now environment-aware)
    const adrTaskMapping = this.mapTasksToAdrs(
      todoTasks,
      discoveredAdrs,
      environment,
      environmentConfig
    );
    const alignedTasks = adrTaskMapping.aligned.length;
    let alignmentScore = totalTasks > 0 ? Math.round((alignedTasks / totalTasks) * 100) : 0;

    // Environment-aware scoring adjustments
    if (environmentValidation && environmentConfig) {
      const envScore = this.calculateEnvironmentScore(
        projectStructure,
        environment,
        environmentConfig
      );
      alignmentScore = Math.round((alignmentScore + envScore) / 2); // Blend scores
    }

    // File existence checks
    let fileCheckResults = '';
    if (includeFileChecks && projectStructure) {
      fileCheckResults = this.performFileExistenceChecks(todoTasks, projectStructure);
    }

    // Environment compliance checks
    let environmentAnalysisResults = '';
    if (environmentValidation && environmentConfig) {
      environmentAnalysisResults = this.performEnvironmentComplianceAnalysis(
        projectStructure,
        environment,
        environmentConfig,
        strictMode
      );
    }

    // Mock vs Production analysis
    let mockAnalysisResults = '';
    if (deepCodeAnalysis && projectStructure) {
      mockAnalysisResults = this.performMockVsProductionAnalysis(projectStructure, strictMode);
    }

    return `# ADR Progress Validation Report

**Validation Date**: ${currentDate}
**Validation Type**: ${validationType}
**Project Path**: ${projectPath}
**TODO Path**: ${todoPath}
**ADR Directory**: ${adrDirectory}
**Environment**: ${environment}${environmentValidation ? ` (validation enabled)` : ''}

## Summary
- **Total ADRs**: ${totalAdrs}
- **Total TODO Tasks**: ${totalTasks}
- **Completed Tasks**: ${completedTasks}
- **Alignment Score**: ${alignmentScore}%
- **Compliance Score**: ${Math.max(alignmentScore - 10, 0)}%
- **Environment**: ${environment}

## Configuration
- **File Checks**: ${includeFileChecks ? 'Enabled' : 'Disabled'}
- **Rule Validation**: ${includeRuleValidation ? 'Enabled' : 'Disabled'}
- **Deep Code Analysis**: ${deepCodeAnalysis ? 'Enabled' : 'Disabled'}
- **Functional Validation**: ${functionalValidation ? 'Enabled' : 'Disabled'}
- **Strict Mode**: ${strictMode ? 'Enabled - High scrutiny for mock vs production' : 'Disabled'}
- **Environment Validation**: ${environmentValidation ? 'Enabled' : 'Disabled'}

## Environment Context
- **Target Environment**: ${environment}
- **Security Level**: ${(environmentConfig as Record<string, unknown>)?.['securityLevel'] || 'Not specified'}
- **Required Files**: ${((environmentConfig as Record<string, unknown>)?.['requiredFiles'] as unknown[] | undefined)?.length || 0} files
- **Required Services**: ${((environmentConfig as Record<string, unknown>)?.['requiredServices'] as unknown[] | undefined)?.length || 0} services

## ADR Discovery Results
${
  totalAdrs > 0
    ? `Found ${totalAdrs} ADRs:\n${discoveredAdrs
        .map((adr, i) => {
          const adrRecord = adr as Record<string, unknown>;
          return `${i + 1}. **${adrRecord['title']}** (${adrRecord['status']}) - ${adrRecord['filename']}`;
        })
        .join('\n')}`
    : 'No ADRs found in the specified directory.'
}

## TODO Task Analysis
${
  totalTasks > 0
    ? `Found ${totalTasks} tasks:\n${todoTasks
        .map((task, i) => `${i + 1}. ${task.completed ? '✅' : '⏳'} ${task.title}`)
        .join('\n')}`
    : 'No tasks found in TODO.md file.'
}

## Alignment Analysis

### ✅ Properly Aligned Tasks
${
  adrTaskMapping.aligned.length > 0
    ? adrTaskMapping.aligned
        .map(task => `- ${task.title}: Corresponds to ADR requirements`)
        .join('\n')
    : '- No aligned tasks identified'
}

### ⚠️ Misaligned Tasks
${
  adrTaskMapping.misaligned.length > 0
    ? adrTaskMapping.misaligned
        .map(task => `- ${task.title}: May not fully align with ADR specifications`)
        .join('\n')
    : '- No misaligned tasks identified'
}

### ❌ Missing Tasks
${
  adrTaskMapping.missing.length > 0
    ? adrTaskMapping.missing.map(gap => `- ${gap}: Required by ADRs but not in TODO`).join('\n')
    : '- No obvious missing tasks identified'
}

## Implementation Status

${fileCheckResults || '### File Existence Validation\n- File checks disabled or no project structure available'}

${environmentAnalysisResults || ''}

${mockAnalysisResults || ''}

## Recommendations

### High Priority Actions
${
  alignmentScore < 70
    ? '1. **Improve ADR-TODO Alignment**: Review TODO tasks against ADR requirements\n2. **Add Missing Tasks**: Identify and add tasks required by ADRs'
    : '1. **Maintain Current Alignment**: Continue following ADR specifications'
}
${
  completedTasks < totalTasks * 0.5
    ? '\n3. **Accelerate Implementation**: Focus on completing pending tasks'
    : ''
}
${
  environmentValidation && environment === 'production' && alignmentScore < 90
    ? '\n4. **⚠️ Production Environment Warning**: Current alignment may not meet production requirements'
    : ''
}

### Medium Priority Actions
1. **Review Implementation Quality**: ${strictMode ? 'Strict mode analysis above shows' : 'Consider enabling strict mode for'} detailed quality assessment
2. **Update Documentation**: Ensure TODO.md reflects current project state
${
  environmentValidation
    ? `3. **Environment Compliance**: Ensure ${environment} environment requirements are met`
    : ''
}

### Low Priority Actions
1. **Optimize Workflow**: Consider tools for automated ADR-TODO synchronization
2. **Regular Validation**: Schedule periodic ADR progress reviews

## Next Steps
1. Address high-priority alignment issues identified above
2. ${totalTasks === 0 ? 'Create initial TODO.md from ADR requirements' : 'Update TODO.md with missing tasks'}
3. ${includeFileChecks ? 'Verify implementation of completed tasks' : 'Enable file checks for detailed implementation verification'}
4. ${includeRuleValidation ? 'Resolve architectural rule compliance violations' : 'Enable rule validation for compliance checking'}
\`\`\`

To re-run this validation with strict mode:
\`\`\`json
{
  "tool": "compare_adr_progress",
  "args": {
    "todoPath": "${todoPath}",
    "adrDirectory": "${adrDirectory}",
    "validationType": "full",
    "deepCodeAnalysis": true,
    "functionalValidation": true,
    "strictMode": true
  }
}
\`\`\`
`;
  }

  /**
   * Parse TODO.md content to extract tasks
   */
  private parseTodoTasks(
    todoContent: string
  ): Array<{ title: string; completed: boolean; description?: string }> {
    if (!todoContent) return [];

    const lines = todoContent.split('\n');
    const tasks: Array<{ title: string; completed: boolean; description?: string }> = [];

    for (const line of lines) {
      // Look for markdown checkbox patterns
      const taskMatch = line.match(/^\s*[-*]\s*\[([x\s])\]\s*(.+)$/i);
      if (taskMatch && taskMatch[1] && taskMatch[2]) {
        const checkbox = taskMatch[1];
        const title = taskMatch[2];
        tasks.push({
          title: title.trim(),
          completed: checkbox.toLowerCase() === 'x',
        });
      }
      // Also look for simple list items that might be tasks
      else if (line.match(/^\s*[-*]\s+\w+/)) {
        const title = line.replace(/^\s*[-*]\s+/, '').trim();
        if (title.length > 3) {
          // Avoid very short items
          tasks.push({
            title,
            completed: false,
          });
        }
      }
    }

    return tasks;
  }

  /**
   * Map TODO tasks to ADRs to identify alignment (now environment-aware)
   */
  private mapTasksToAdrs(
    tasks: Array<{ title: string; completed: boolean }>,
    adrs: unknown[],
    environment?: string,
    environmentConfig?: unknown
  ): {
    aligned: typeof tasks;
    misaligned: typeof tasks;
    missing: string[];
  } {
    const aligned: typeof tasks = [];
    const misaligned: typeof tasks = [];
    const missing: string[] = [];

    // Simple keyword matching for alignment detection
    const adrKeywords = adrs.flatMap(adr => {
      const adrRecord = adr as Record<string, unknown>;
      return [
        String(adrRecord['title'] || '').toLowerCase(),
        ...String(adrRecord['decision'] || '')
          .toLowerCase()
          .split(/\s+/)
          .filter((w: string) => w.length > 4),
        ...String(adrRecord['context'] || '')
          .toLowerCase()
          .split(/\s+/)
          .filter((w: string) => w.length > 4),
      ];
    });

    // Environment-specific keywords that should be prioritized
    const envKeywords: string[] = [];
    if (environment && environmentConfig) {
      if (environment === 'production') {
        envKeywords.push('deploy', 'production', 'monitoring', 'security', 'performance');
      } else if (environment === 'staging') {
        envKeywords.push('test', 'staging', 'integration', 'validation');
      } else if (environment === 'development') {
        envKeywords.push('setup', 'development', 'local', 'debug');
      }
    }

    for (const task of tasks) {
      const taskLower = task.title.toLowerCase();
      const firstWord = taskLower.split(' ')[0] || '';
      const hasKeywordMatch = adrKeywords.some(
        keyword => taskLower.includes(keyword) || keyword.includes(firstWord)
      );

      // Environment-aware alignment scoring
      const hasEnvKeywordMatch = envKeywords.some(keyword => taskLower.includes(keyword));

      if (hasKeywordMatch || hasEnvKeywordMatch) {
        aligned.push(task);
      } else {
        misaligned.push(task);
      }
    }

    // Identify potential missing tasks based on ADR content
    for (const adr of adrs) {
      const adrRecord = adr as Record<string, unknown>;
      if (adrRecord['status'] === 'accepted' && adrRecord['decision']) {
        const decisionWords = String(adrRecord['decision']).toLowerCase().split(/\s+/);
        const implementationWords = [
          'implement',
          'create',
          'build',
          'develop',
          'add',
          'setup',
          'configure',
        ];

        if (implementationWords.some(word => decisionWords.includes(word))) {
          const adrTitle = String(adrRecord['title'] || '');
          const adrFirstWord = adrTitle.toLowerCase().split(' ')[0] || '';
          const hasCorrespondingTask = tasks.some(task =>
            task.title.toLowerCase().includes(adrFirstWord)
          );

          if (!hasCorrespondingTask) {
            missing.push(`Implement ${adrTitle}`);
          }
        }
      }
    }

    // Environment-specific missing tasks
    if (environment && environmentConfig) {
      const envConfig = environmentConfig as Record<string, unknown>;
      if (envConfig['requiredFiles']) {
        for (const file of envConfig['requiredFiles'] as string[]) {
          const hasFileTask = tasks.some(task =>
            task.title.toLowerCase().includes(file.toLowerCase())
          );
          if (!hasFileTask) {
            missing.push(`Create ${file} for ${environment} environment`);
          }
        }
      }

      if (envConfig['requiredServices']) {
        for (const service of envConfig['requiredServices'] as string[]) {
          const hasServiceTask = tasks.some(task =>
            task.title.toLowerCase().includes(service.toLowerCase())
          );
          if (!hasServiceTask) {
            missing.push(`Setup ${service} service for ${environment}`);
          }
        }
      }
    }

    return { aligned, misaligned, missing };
  }

  /**
   * Check file existence for completed tasks
   */
  private performFileExistenceChecks(
    tasks: Array<{ title: string; completed: boolean }>,
    projectStructure: any
  ): string {
    if (!projectStructure) return '- Project structure not available';

    const allFiles = [
      ...(projectStructure.packageFiles || []),
      ...(projectStructure.configFiles || []),
      ...(projectStructure.buildFiles || []),
      ...(projectStructure.dockerFiles || []),
      ...(projectStructure.ciFiles || []),
      ...(projectStructure.scriptFiles || []),
    ];

    let results = '### File Existence Validation\n';
    let checkCount = 0;

    for (const task of tasks) {
      if (task.completed) {
        // Simple heuristic: look for files mentioned in task title
        const taskLower = task.title.toLowerCase();
        const mentionedFiles = allFiles.filter(
          file =>
            taskLower.includes(file.filename.toLowerCase()) ||
            taskLower.includes(file.filename.replace(/\.[^.]+$/, '').toLowerCase())
        );

        if (mentionedFiles.length > 0) {
          results += `- ✅ **${task.title}**: Found related files (${mentionedFiles.map(f => f.filename).join(', ')})\n`;
          checkCount++;
        } else if (
          taskLower.includes('file') ||
          taskLower.includes('create') ||
          taskLower.includes('implement')
        ) {
          results += `- ⚠️ **${task.title}**: No clearly related files found\n`;
          checkCount++;
        }
      }
    }

    if (checkCount === 0) {
      results += '- No file-related completed tasks to validate\n';
    }

    return results;
  }

  /**
   * Analyze code for mock vs production implementation
   */
  private performMockVsProductionAnalysis(projectStructure: any, strictMode: boolean): string {
    if (!projectStructure) return '';

    const codeFiles = [
      ...(projectStructure.buildFiles || []),
      ...(projectStructure.configFiles || []),
    ].filter(file => file.content && file.content !== '[Binary or unreadable file]');

    if (codeFiles.length === 0) return '';

    let results = '\n### Mock vs Production Code Analysis\n';
    let mockIndicators = 0;
    let productionIndicators = 0;

    const mockPatterns = [
      /TODO:/gi,
      /FIXME:/gi,
      /NotImplementedException/gi,
      /throw.*not.*implement/gi,
      /return.*mock/gi,
      /placeholder/gi,
      /stub/gi,
      /return\s+null;/gi,
      /return\s+""/gi,
      /return\s+\[\]/gi,
      /return\s+{}/gi,
    ];

    const productionPatterns = [
      /error\s+handling/gi,
      /try\s*{/gi,
      /catch\s*\(/gi,
      /validate/gi,
      /authentication/gi,
      /authorization/gi,
      /database/gi,
      /api/gi,
      /config/gi,
    ];

    for (const file of codeFiles.slice(0, 10)) {
      // Limit analysis to prevent overwhelming output
      const content = file.content;
      const fileMockCount = mockPatterns.reduce(
        (count, pattern) => count + (content.match(pattern) || []).length,
        0
      );
      const fileProdCount = productionPatterns.reduce(
        (count, pattern) => count + (content.match(pattern) || []).length,
        0
      );

      mockIndicators += fileMockCount;
      productionIndicators += fileProdCount;

      if (fileMockCount > 0 || fileProdCount > 2) {
        const status =
          fileMockCount > fileProdCount
            ? '❌ **Mock/Stub**'
            : fileProdCount > fileMockCount * 2
              ? '✅ **Production Ready**'
              : '⚠️ **Partial Implementation**';

        results += `- ${status}: ${file.filename} `;
        if (fileMockCount > 0) {
          results += `(${fileMockCount} mock indicators) `;
        }
        if (fileProdCount > 0) {
          results += `(${fileProdCount} production indicators)`;
        }
        results += '\n';
      }
    }

    results += `\n#### Overall Code Quality Assessment\n`;
    results += `- **Mock Indicators Found**: ${mockIndicators} instances\n`;
    results += `- **Production Indicators Found**: ${productionIndicators} instances\n`;

    if (strictMode) {
      const qualityScore =
        productionIndicators > mockIndicators * 2
          ? 'Good'
          : productionIndicators > mockIndicators
            ? 'Fair'
            : 'Needs Improvement';
      results += `- **Quality Assessment**: ${qualityScore}\n`;

      if (mockIndicators > 0) {
        results += `- **⚠️ Strict Mode Warning**: Found ${mockIndicators} potential mock/stub indicators\n`;
      }
    }

    return results;
  }

  /**
   * Calculate environment-specific compliance score
   */
  private calculateEnvironmentScore(
    projectStructure: any,
    environment: string,
    environmentConfig: any
  ): number {
    if (!projectStructure || !environmentConfig) return 0;

    let score = 100; // Start with perfect score

    // Check required files
    if (environmentConfig.requiredFiles) {
      const allFiles = [
        ...(projectStructure.packageFiles || []),
        ...(projectStructure.configFiles || []),
        ...(projectStructure.buildFiles || []),
        ...(projectStructure.dockerFiles || []),
        ...(projectStructure.ciFiles || []),
        ...(projectStructure.scriptFiles || []),
      ];

      const existingFiles = allFiles.map(f => f.filename);
      const missingFiles = environmentConfig.requiredFiles.filter(
        (file: string) => !existingFiles.includes(file)
      );

      // Deduct 10 points per missing required file
      score -= missingFiles.length * 10;
    }

    // Environment-specific penalties
    if (environment === 'production') {
      // Production requires higher standards
      if (!projectStructure.dockerFiles?.length) score -= 15;
      if (!projectStructure.ciFiles?.length) score -= 10;
    }

    return Math.max(score, 0);
  }

  /**
   * Perform environment compliance analysis
   */
  private performEnvironmentComplianceAnalysis(
    projectStructure: any,
    environment: string,
    environmentConfig: any,
    strictMode: boolean
  ): string {
    if (!projectStructure || !environmentConfig) {
      return '\n### Environment Compliance Analysis\n- Environment analysis disabled or no project structure available\n';
    }

    let results = '\n### Environment Compliance Analysis\n';

    // Required files analysis
    if (environmentConfig.requiredFiles) {
      results += `#### Required Files for ${environment} Environment\n`;
      const allFiles = [
        ...(projectStructure.packageFiles || []),
        ...(projectStructure.configFiles || []),
        ...(projectStructure.buildFiles || []),
        ...(projectStructure.dockerFiles || []),
        ...(projectStructure.ciFiles || []),
        ...(projectStructure.scriptFiles || []),
      ];

      const existingFiles = allFiles.map(f => f.filename);

      for (const requiredFile of environmentConfig.requiredFiles) {
        const exists = existingFiles.includes(requiredFile);
        results += `- ${exists ? '✅' : '❌'} **${requiredFile}**: ${exists ? 'Found' : 'Missing'}\n`;
      }
    }

    // Security level compliance
    if (environmentConfig.securityLevel) {
      results += `\n#### Security Level: ${environmentConfig.securityLevel}\n`;

      const securityIndicators = this.analyzeSecurityCompliance(
        projectStructure,
        environmentConfig.securityLevel
      );
      results += securityIndicators;
    }

    // Environment-specific recommendations
    results += `\n#### ${environment} Environment Recommendations\n`;
    switch (environment) {
      case 'production':
        results +=
          '- ⚠️ **Production Critical**: Ensure monitoring, logging, and backup strategies are implemented\n';
        results += '- 🔒 **Security**: Implement comprehensive security measures\n';
        results += '- 📊 **Performance**: Monitor and optimize for production workloads\n';
        if (strictMode) {
          results +=
            '- 🔍 **Strict Mode**: Enhanced validation enabled for production environment\n';
        }
        break;
      case 'staging':
        results += '- 🧪 **Testing**: Ensure comprehensive test coverage and validation\n';
        results += '- 📋 **Validation**: Implement environment parity checks\n';
        break;
      case 'development':
        results += '- 🛠️ **Development**: Focus on developer experience and debugging tools\n';
        results += '- 🔄 **Iteration**: Ensure fast feedback loops\n';
        break;
    }

    return results;
  }

  /**
   * Analyze security compliance based on security level
   */
  private analyzeSecurityCompliance(projectStructure: any, securityLevel: string): string {
    let results = '';

    const securityFiles = [
      ...(projectStructure.configFiles || []),
      ...(projectStructure.dockerFiles || []),
    ].filter(
      file =>
        file.filename.includes('security') ||
        file.filename.includes('auth') ||
        file.filename.includes('.env') ||
        file.filename === 'Dockerfile'
    );

    const hasSecurityConfig = securityFiles.length > 0;

    switch (securityLevel) {
      case 'critical':
        results += `- ${hasSecurityConfig ? '✅' : '❌'} **Critical Security**: ${hasSecurityConfig ? 'Security configuration found' : 'No security configuration detected'}\n`;
        if (!hasSecurityConfig) {
          results += '  - **Action Required**: Implement comprehensive security measures\n';
        }
        break;
      case 'high':
        results += `- ${hasSecurityConfig ? '✅' : '⚠️'} **High Security**: ${hasSecurityConfig ? 'Some security configuration found' : 'Limited security configuration'}\n`;
        break;
      case 'medium':
        results += `- ℹ️ **Medium Security**: Basic security measures recommended\n`;
        break;
      default:
        results += `- ℹ️ **Security Level**: ${securityLevel} (consider increasing for production)\n`;
    }

    return results;
  }

  /**
   * Content masking tool implementations
   */
  private async analyzeContentSecurity(args: AnalyzeContentSecurityArgs): Promise<CallToolResult> {
    const { analyzeContentSecurity } = await import('./tools/content-masking-tool.js');
    return await analyzeContentSecurity(args);
  }

  private async generateContentMasking(args: GenerateContentMaskingArgs): Promise<CallToolResult> {
    const { generateContentMasking } = await import('./tools/content-masking-tool.js');
    return await generateContentMasking(args);
  }

  private async configureCustomPatterns(
    args: ConfigureCustomPatternsArgs
  ): Promise<CallToolResult> {
    const { configureCustomPatterns } = await import('./tools/content-masking-tool.js');
    return await configureCustomPatterns(args);
  }

  private async applyBasicContentMasking(
    args: ApplyBasicContentMaskingArgs
  ): Promise<CallToolResult> {
    const { applyBasicContentMasking } = await import('./tools/content-masking-tool.js');
    return await applyBasicContentMasking(args);
  }

  private async validateContentMasking(args: ValidateContentMaskingArgs): Promise<CallToolResult> {
    const { validateContentMasking } = await import('./tools/content-masking-tool.js');
    return await validateContentMasking(args);
  }

  private async manageCache(args: Record<string, unknown>): Promise<CallToolResult> {
    const { action, key } = args;

    try {
      const { clearCache, getCacheStats, cleanupCache, invalidateCache } = await import(
        './utils/cache.js'
      );

      switch (action) {
        case 'clear': {
          const clearPrompt = await clearCache();
          return {
            content: [
              {
                type: 'text',
                text: `# Cache Clear Operation

## AI Delegation Required

Please execute the following cache clearing operation:

${clearPrompt.prompt}

## Implementation Instructions

${clearPrompt.instructions}

## Expected Result

After successful execution, all cache entries will be removed while preserving the cache directory structure and metadata.json file.`,
              },
            ],
          };
        }

        case 'stats': {
          const statsPrompt = await getCacheStats();
          return {
            content: [
              {
                type: 'text',
                text: `# Cache Statistics Collection

## AI Delegation Required

Please execute the following cache statistics collection operation:

${statsPrompt.prompt}

## Implementation Instructions

${statsPrompt.instructions}

## Expected Information

The AI agent will provide:
- **Total Entries**: Number of cache files
- **Total Size**: Combined size of all cache files
- **Oldest Entry**: Cache key of the oldest entry
- **Newest Entry**: Cache key of the newest entry

## Cache Directory
\`.mcp-adr-cache/\`

## Cache Types
- **Knowledge Graph**: Architectural analysis results (TTL: 1 hour)
- **Analysis Report**: Project analysis reports (TTL: 30 minutes)
- **ADR List**: ADR inventory and metadata (TTL: 15 minutes)

## Management
Use \`manage_cache\` tool with different actions:
- \`clear\`: Remove all cache entries
- \`cleanup\`: Remove expired entries only
- \`invalidate\`: Remove specific cache entry`,
              },
            ],
          };
        }

        case 'cleanup': {
          const cleanupPrompt = await cleanupCache();
          return {
            content: [
              {
                type: 'text',
                text: `# Cache Cleanup Operation

## AI Delegation Required

Please execute the following cache cleanup operation:

${cleanupPrompt.prompt}

## Implementation Instructions

${cleanupPrompt.instructions}

## Expected Result

The AI agent will remove expired cache entries and provide a count of cleaned files.`,
              },
            ],
          };
        }

        case 'invalidate': {
          if (!key) {
            throw new McpAdrError('Cache key is required for invalidate action', 'INVALID_INPUT');
          }

          const invalidatePrompt = await invalidateCache(key as string);
          return {
            content: [
              {
                type: 'text',
                text: `# Cache Invalidation Operation

## AI Delegation Required

Please execute the following cache invalidation operation:

${invalidatePrompt.prompt}

## Implementation Instructions

${invalidatePrompt.instructions}

## Target Cache Entry

**Cache Key**: ${key}

The AI agent will safely remove the specified cache entry.`,
              },
            ],
          };
        }

        default:
          throw new McpAdrError(`Unknown cache action: ${action}`, 'INVALID_INPUT');
      }
    } catch (error) {
      throw new McpAdrError(
        `Cache management failed: ${error instanceof Error ? error.message : String(error)}`,
        'CACHE_ERROR'
      );
    }
  }

  private async configureOutputMasking(args: Record<string, unknown>): Promise<CallToolResult> {
    const { action = 'get', enabled, strategy, customPatterns } = args;

    try {
      const { validateMaskingConfig } = await import('./utils/output-masking.js');

      switch (action) {
        case 'get': {
          return {
            content: [
              {
                type: 'text',
                text: `# Current Output Masking Configuration

## Settings
- **Enabled**: ${this.maskingConfig.enabled}
- **Strategy**: ${this.maskingConfig.strategy}
- **Custom Patterns**: ${this.maskingConfig.customPatterns?.length || 0} patterns
- **Skip Patterns**: ${this.maskingConfig.skipPatterns?.length || 0} patterns

## Available Strategies
- **full**: Replace entire sensitive content with [REDACTED]
- **partial**: Show safe prefix/suffix, mask middle (e.g., sk-...****)
- **placeholder**: Replace with descriptive placeholders (e.g., <YOUR_API_KEY>)
- **environment**: Replace with environment variable references (e.g., \${API_KEY})

## Configuration
Use \`configure_output_masking\` tool with:
- \`action: "set"\` to update configuration
- \`action: "reset"\` to restore defaults

## Current Status
${this.maskingConfig.enabled ? '✅ Output masking is ACTIVE' : '⚠️ Output masking is DISABLED'}
`,
              },
            ],
          };
        }

        case 'set': {
          const newConfig = { ...this.maskingConfig };

          if (typeof enabled === 'boolean') {
            newConfig.enabled = enabled;
          }

          if (
            strategy &&
            ['full', 'partial', 'placeholder', 'environment'].includes(strategy as string)
          ) {
            newConfig.strategy = strategy as 'full' | 'partial' | 'placeholder' | 'environment';
          }

          if (Array.isArray(customPatterns)) {
            newConfig.customPatterns = customPatterns;
          }

          const validation = validateMaskingConfig(newConfig);
          if (!validation.isValid) {
            throw new McpAdrError(
              `Invalid masking configuration: ${validation.errors.join(', ')}`,
              'INVALID_CONFIG'
            );
          }

          this.maskingConfig = newConfig;

          return {
            content: [
              {
                type: 'text',
                text: `✅ Output masking configuration updated successfully!

## New Settings
- **Enabled**: ${newConfig.enabled}
- **Strategy**: ${newConfig.strategy}
- **Custom Patterns**: ${newConfig.customPatterns?.length || 0} patterns

${
  newConfig.enabled
    ? '🔒 All MCP tool and resource outputs will now be masked according to the new configuration.'
    : '⚠️ Output masking is disabled. Sensitive information may be exposed in responses.'
}
`,
              },
            ],
          };
        }

        case 'reset': {
          const { createMaskingConfig } = await import('./utils/output-masking.js');
          this.maskingConfig = createMaskingConfig();

          return {
            content: [
              {
                type: 'text',
                text: `✅ Output masking configuration reset to defaults!

## Default Settings
- **Enabled**: ${this.maskingConfig.enabled}
- **Strategy**: ${this.maskingConfig.strategy}
- **Custom Patterns**: ${this.maskingConfig.customPatterns?.length || 0} patterns
- **Skip Patterns**: ${this.maskingConfig.skipPatterns?.length || 0} patterns

🔒 Default masking is now active for all outputs.
`,
              },
            ],
          };
        }

        default:
          throw new McpAdrError(`Unknown masking action: ${action}`, 'INVALID_INPUT');
      }
    } catch (error) {
      throw new McpAdrError(
        `Output masking configuration failed: ${error instanceof Error ? error.message : String(error)}`,
        'CONFIG_ERROR'
      );
    }
  }

  /**
   * Helper method to get domains based on PRD type
   */
  private getPrdTypeDomains(prdType: string): string[] {
    const domainMap: Record<string, string[]> = {
      'web-application': ['api-design', 'frontend-architecture', 'database-design', 'security'],
      'mobile-app': ['mobile-architecture', 'api-design', 'performance-optimization', 'security'],
      microservices: ['microservices', 'api-design', 'distributed-systems', 'database-design'],
      'data-platform': [
        'database-design',
        'data-architecture',
        'performance-optimization',
        'scalability',
      ],
      'api-service': ['api-design', 'microservices', 'security', 'performance-optimization'],
      general: ['api-design', 'database-design', 'security'],
    };

    return (
      domainMap[prdType] || domainMap['general'] || ['api-design', 'database-design', 'security']
    );
  }

  /**
   * Helper method to get domains for ecosystem analysis based on technology focus
   */
  private getEcosystemAnalysisDomains(technologyFocus: string[]): string[] {
    // Base domains for ecosystem analysis
    const baseDomains = ['api-design', 'database-design', 'security', 'performance-optimization'];

    // Technology-specific domain mapping
    const technologyDomainMap: Record<string, string[]> = {
      react: ['frontend-architecture', 'web-applications'],
      vue: ['frontend-architecture', 'web-applications'],
      angular: ['frontend-architecture', 'web-applications'],
      node: ['api-design', 'microservices'],
      express: ['api-design', 'web-applications'],
      fastify: ['api-design', 'performance-optimization'],
      nestjs: ['api-design', 'microservices'],
      spring: ['api-design', 'microservices'],
      django: ['api-design', 'web-applications'],
      flask: ['api-design', 'web-applications'],
      rails: ['api-design', 'web-applications'],
      laravel: ['api-design', 'web-applications'],
      docker: ['containerization', 'microservices'],
      kubernetes: ['containerization', 'distributed-systems'],
      mongodb: ['database-design', 'data-architecture'],
      postgresql: ['database-design', 'data-architecture'],
      mysql: ['database-design', 'data-architecture'],
      redis: ['database-design', 'performance-optimization'],
      elasticsearch: ['database-design', 'data-architecture'],
      kafka: ['distributed-systems', 'data-architecture'],
      rabbitmq: ['distributed-systems', 'microservices'],
      aws: ['cloud-architecture', 'scalability'],
      azure: ['cloud-architecture', 'scalability'],
      gcp: ['cloud-architecture', 'scalability'],
      terraform: ['infrastructure-as-code', 'cloud-architecture'],
      ansible: ['infrastructure-as-code', 'automation'],
      jenkins: ['ci-cd', 'automation'],
      'github-actions': ['ci-cd', 'automation'],
      'gitlab-ci': ['ci-cd', 'automation'],
    };

    // Collect domains based on technology focus
    const technologyDomains = new Set<string>();
    for (const tech of technologyFocus) {
      const techLower = tech.toLowerCase();
      const domains = technologyDomainMap[techLower];
      if (domains) {
        domains.forEach(domain => technologyDomains.add(domain));
      }
    }

    // Combine base domains with technology-specific domains
    const allDomains = [...baseDomains, ...Array.from(technologyDomains)];

    // Remove duplicates and limit to reasonable number
    const uniqueDomains = [...new Set(allDomains)];

    // Return up to 6 most relevant domains
    return uniqueDomains.slice(0, 6);
  }

  /**
   * Helper method to create base ADR generation prompt
   */
  private createBaseAdrPrompt(
    prdPath: string,
    outputDirectory: string,
    knowledgeContext: string
  ): string {
    return `
# Enhanced ADR Generation from PRD Request

This is a comprehensive prompt-driven ADR generation process enhanced with domain knowledge and optimized prompting.

${knowledgeContext}

## Step 1: File Validation
Please verify that the PRD file exists at: ${prdPath}

## Step 2: PRD Content Reading
Read and analyze the PRD content from: ${prdPath}

## Step 3: Enhanced ADR Generation and Creation

Once you have successfully read the PRD content, analyze it using the domain knowledge above and generate Architectural Decision Records (ADRs).

### Enhanced Analysis Requirements

1. **Extract Key Decisions**: Identify all architectural decisions implied or stated in the PRD
2. **Apply Domain Knowledge**: Use the generated domain knowledge to enhance decision analysis
3. **Decision Categorization**: Group decisions by:
   - Technology stack choices (informed by domain best practices)
   - Architectural patterns (leveraging domain-specific patterns)
   - Infrastructure decisions (considering domain requirements)
   - Security considerations (applying domain security knowledge)
   - Performance requirements (using domain performance insights)
   - Integration approaches (following domain integration patterns)

### Enhanced ADR Generation Requirements

1. **Follow ADR Format**: Use standard ADR template with domain-enhanced content
2. **Number Sequentially**: Use format 001-decision-title.md, 002-next-decision.md, etc.
3. **Output Directory**: Place ADRs in ${outputDirectory}/
4. **Domain Context**: Include relevant domain knowledge in each ADR
5. **File Creation**: Generate file creation prompts for each ADR

### Enhanced ADR Template Format

\`\`\`markdown
# [Number]. [Title]

**Status**: [Proposed/Accepted/Deprecated/Superseded]
**Date**: [YYYY-MM-DD]
**Domain**: [Relevant domain from knowledge enhancement]

## Context
[Describe the context and problem statement from PRD, enhanced with domain knowledge]

## Decision
[Describe the architectural decision, informed by domain best practices]

## Consequences
[Describe positive and negative consequences, considering domain-specific implications]

## Domain Considerations
[Specific considerations from the domain knowledge that influenced this decision]

## Implementation Plan
[Steps to implement this decision, leveraging domain expertise]

## Related PRD Sections
[Reference specific sections from the PRD that led to this decision]

## Domain References
[References to domain knowledge that informed this decision]
\`\`\`

### Expected Enhanced Output

Please provide:
1. **File Validation Results**: Confirmation that PRD file exists and is readable
2. **PRD Content Summary**: Brief summary enhanced with domain context
3. **Domain Analysis**: How domain knowledge applies to this PRD
4. **Identified Decisions**: List of all architectural decisions with domain context
5. **Generated ADRs**: Complete enhanced ADR content for each decision
6. **File Creation Plan**: File names, directory structure, and creation order
7. **Implementation Priority**: Recommended order considering domain best practices

### Quality Assurance with Domain Enhancement

- Ensure each ADR leverages relevant domain knowledge
- Verify decisions align with domain best practices
- Check that domain considerations are properly documented
- Validate that ADR content is enhanced beyond basic analysis
`;
  }

  /**
   * ADR suggestion tool implementations
   */
  private async suggestAdrs(args: Record<string, unknown>): Promise<CallToolResult> {
    const { suggestAdrs } = await import('./tools/adr-suggestion-tool.js');
    return await suggestAdrs(args);
  }

  private async generateAdrFromDecision(
    args: GenerateAdrFromDecisionArgs
  ): Promise<CallToolResult> {
    const { generateAdrFromDecision } = await import('./tools/adr-suggestion-tool.js');
    return await generateAdrFromDecision(args);
  }

  private async generateAdrBootstrap(args: Record<string, unknown>): Promise<CallToolResult> {
    const { default: generateAdrBootstrapScripts } = await import(
      './tools/adr-bootstrap-validation-tool.js'
    );
    return await generateAdrBootstrapScripts(args);
  }

  private async bootstrapValidationLoop(args: Record<string, unknown>): Promise<CallToolResult> {
    const { default: bootstrapValidationLoop } = await import(
      './tools/bootstrap-validation-loop-tool.js'
    );
    return await bootstrapValidationLoop(args);
  }

  private async discoverExistingAdrs(
    args: Record<string, unknown>,
    context?: ToolContext
  ): Promise<CallToolResult> {
    const ctx = context || createNoOpContext();

    try {
      ctx.info('🔍 Starting ADR discovery process...');
      ctx.report_progress(0, 100);

      ctx.info('📂 Phase 1: Scanning ADR directory');
      ctx.report_progress(30, 100);

      const { discoverExistingAdrs } = await import('./tools/adr-suggestion-tool.js');

      ctx.info('📄 Phase 2: Analyzing ADR files');
      ctx.report_progress(60, 100);

      const result = await discoverExistingAdrs(args);

      ctx.info('✅ ADR discovery completed successfully');
      ctx.report_progress(100, 100);

      return result;
    } catch (error) {
      ctx.error?.(
        `❌ ADR discovery failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  private async analyzeAdrTimeline(args: Record<string, unknown>): Promise<CallToolResult> {
    try {
      const projectPath = (args['projectPath'] as string) || this.config.projectPath;
      const adrDirectory = (args['adrDirectory'] as string) || 'docs/adrs';
      const generateActions = (args['generateActions'] as boolean) ?? true;
      const thresholdProfile = args['thresholdProfile'] as string | undefined;
      const autoDetectContext = (args['autoDetectContext'] as boolean) ?? true;
      const includeContent = (args['includeContent'] as boolean) ?? true;
      const forceExtract = (args['forceExtract'] as boolean) ?? false;

      const { discoverAdrsInDirectory } = await import('./utils/adr-discovery.js');
      const { formatActionReport } = await import('./utils/adr-action-analyzer.js');

      // Discover ADRs with timeline analysis
      const result = await discoverAdrsInDirectory(adrDirectory, projectPath, {
        includeContent,
        includeTimeline: true,
        timelineOptions: {
          forceExtract,
          useCache: true,
          cacheTTL: 3600,
        },
        generateActions,
        ...(thresholdProfile ? { thresholdProfile } : {}),
        autoDetectContext,
      });

      // Format response
      let responseText = `# ADR Timeline Analysis\n\n`;
      responseText += `**Project:** ${projectPath}\n`;
      responseText += `**ADR Directory:** ${adrDirectory}\n`;
      responseText += `**Total ADRs:** ${result.totalAdrs}\n\n`;

      // Add timeline summary
      if (result.adrs.some(adr => adr.timeline)) {
        const withTimeline = result.adrs.filter(adr => adr.timeline).length;
        responseText += `## Timeline Data\n\n`;
        responseText += `- **ADRs with Timeline:** ${withTimeline}/${result.totalAdrs}\n`;

        const ages = result.adrs.filter(adr => adr.timeline).map(adr => adr.timeline!.age_days);
        if (ages.length > 0) {
          const avgAge = Math.floor(ages.reduce((a, b) => a + b, 0) / ages.length);
          const oldestAge = Math.max(...ages);
          responseText += `- **Average ADR Age:** ${avgAge} days\n`;
          responseText += `- **Oldest ADR:** ${oldestAge} days\n`;
        }
        responseText += `\n`;
      }

      // Add action queue report
      if (result.actionQueue) {
        responseText += `---\n\n`;
        responseText += formatActionReport(result.actionQueue, {
          projectPath,
          thresholdProfile: thresholdProfile || 'auto-detected',
        });
      } else if (generateActions) {
        responseText += `## No Actions Required\n\n`;
        responseText += `All ADRs are up to date and within acceptable thresholds.\n`;
      }

      // Add summary stats
      if (result.summary.byStatus) {
        responseText += `\n---\n\n## ADR Status Distribution\n\n`;
        Object.entries(result.summary.byStatus).forEach(([status, count]) => {
          responseText += `- **${status}:** ${count}\n`;
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `# ADR Timeline Analysis Failed\n\n**Error:** ${error instanceof Error ? error.message : String(error)}\n\nPlease check that the ADR directory exists and contains valid ADR files.`,
          },
        ],
        isError: true,
      };
    }
  }

  private async reviewExistingAdrs(args: Record<string, unknown>): Promise<CallToolResult> {
    const { reviewExistingAdrs } = await import('./tools/review-existing-adrs-tool.js');
    return await reviewExistingAdrs(args);
  }

  /**
   * ADR validation tool implementations
   */
  private async validateAdr(args: Record<string, unknown>): Promise<CallToolResult> {
    const { validateAdr } = await import('./tools/adr-validation-tool.js');
    return await validateAdr(args as any);
  }

  private async validateAllAdrs(args: Record<string, unknown>): Promise<CallToolResult> {
    const { validateAllAdrs } = await import('./tools/adr-validation-tool.js');
    return await validateAllAdrs(args as any);
  }

  /**
   * Research integration tool implementations
   */
  private async incorporateResearch(args: Record<string, unknown>): Promise<CallToolResult> {
    const { incorporateResearch } = await import('./tools/research-integration-tool.js');
    return await incorporateResearch(args);
  }

  private async createResearchTemplate(args: Record<string, unknown>): Promise<CallToolResult> {
    const { createResearchTemplate } = await import('./tools/research-integration-tool.js');
    return await createResearchTemplate(args);
  }

  private async requestActionConfirmation(args: Record<string, unknown>): Promise<CallToolResult> {
    const { requestActionConfirmation } = await import('./tools/research-integration-tool.js');
    return await requestActionConfirmation(args as unknown as ActionArgs);
  }

  /**
   * Rule generation and validation tool implementations
   */
  private async generateRules(args: Record<string, unknown>): Promise<CallToolResult> {
    const { generateRules } = await import('./tools/rule-generation-tool.js');
    return await generateRules(args);
  }

  private async validateRules(args: ValidateRulesArgs): Promise<CallToolResult> {
    const { validateRules } = await import('./tools/rule-generation-tool.js');
    return await validateRules(args);
  }

  private async createRuleSet(args: CreateRuleSetArgs): Promise<CallToolResult> {
    const { createRuleSet } = await import('./tools/rule-generation-tool.js');
    return await createRuleSet(args);
  }

  /**
   * Environment analysis tool implementation
   */
  private async analyzeEnvironment(args: Record<string, unknown>): Promise<CallToolResult> {
    const { analyzeEnvironment } = await import('./tools/environment-analysis-tool.js');
    return await analyzeEnvironment(args);
  }

  /**
   * Research question generation tool implementation
   */
  private async generateResearchQuestions(args: Record<string, unknown>): Promise<CallToolResult> {
    const { generateResearchQuestions } = await import('./tools/research-question-tool.js');
    return await generateResearchQuestions(args);
  }

  /**
   * Perform research tool implementation
   */
  private async performResearch(
    args: Record<string, unknown>,
    context?: ToolContext
  ): Promise<CallToolResult> {
    const ctx = context || createNoOpContext();

    if (!('question' in args) || typeof args['question'] !== 'string') {
      throw new McpAdrError('Missing required parameter: question', 'INVALID_ARGUMENTS');
    }

    try {
      ctx.info('🔍 Starting research process...');
      ctx.report_progress(0, 100);

      ctx.info('📊 Phase 1: Initializing research framework');
      ctx.report_progress(10, 100);

      const { performResearch } = await import('./tools/perform-research-tool.js');

      ctx.info('📚 Phase 2: Executing research orchestration');
      ctx.report_progress(20, 100);

      const result = await performResearch(
        args as {
          question: string;
          projectPath?: string;
          adrDirectory?: string;
          confidenceThreshold?: number;
          performWebSearch?: boolean;
        },
        ctx // ✅ Pass context to tool function for progress updates
      );

      return result;
    } catch (error) {
      ctx.error?.(
        `❌ Research execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new McpAdrError(
        `Failed to perform research: ${error instanceof Error ? error.message : String(error)}`,
        'RESEARCH_EXECUTION_ERROR'
      );
    }
  }

  /**
   * LLM web search tool implementation
   */
  private async llmWebSearch(
    args: Record<string, unknown>,
    context?: ToolContext
  ): Promise<CallToolResult> {
    const ctx = context || createNoOpContext();

    if (!('query' in args) || typeof args['query'] !== 'string') {
      throw new McpAdrError('Missing required parameter: query', 'INVALID_ARGUMENTS');
    }

    ctx.info('🌐 Starting LLM-managed web search...');
    ctx.report_progress(0, 100);

    const { llmWebSearch } = await import('./tools/llm-web-search-tool.js');
    return await llmWebSearch(
      args as {
        query: string;
        maxResults?: number;
        includeContent?: boolean;
        llmInstructions?: string;
        projectPath?: string;
        adrDirectory?: string;
      },
      ctx // ✅ Pass context to tool function for progress updates
    );
  }

  /**
   * LLM cloud management tool implementation
   */
  private async llmCloudManagement(
    args: Record<string, unknown>,
    context?: ToolContext
  ): Promise<CallToolResult> {
    const ctx = context || createNoOpContext();

    if (!('provider' in args) || !('action' in args) || !('llmInstructions' in args)) {
      throw new McpAdrError(
        'Missing required parameters: provider, action, llmInstructions',
        'INVALID_ARGUMENTS'
      );
    }

    ctx.info('🔧 Starting LLM-managed cloud operation...');
    ctx.report_progress(0, 100);

    const { llmCloudManagement } = await import('./tools/llm-cloud-management-tool.js');
    return await llmCloudManagement(
      args as {
        provider: 'aws' | 'azure' | 'gcp' | 'redhat' | 'ubuntu' | 'macos';
        action: string;
        parameters?: Record<string, any>;
        llmInstructions: string;
        researchFirst?: boolean;
        projectPath?: string;
        adrDirectory?: string;
      },
      ctx // ✅ Pass context to tool function for progress updates
    );
  }

  /**
   * LLM database management tool implementation
   */
  private async llmDatabaseManagement(
    args: Record<string, unknown>,
    context?: ToolContext
  ): Promise<CallToolResult> {
    const ctx = context || createNoOpContext();

    if (!('database' in args) || !('action' in args) || !('llmInstructions' in args)) {
      throw new McpAdrError(
        'Missing required parameters: database, action, llmInstructions',
        'INVALID_ARGUMENTS'
      );
    }

    ctx.info('🗄️ Starting LLM-managed database operation...');
    ctx.report_progress(0, 100);

    const { llmDatabaseManagement } = await import('./tools/llm-database-management-tool.js');
    return await llmDatabaseManagement(
      args as {
        database: 'postgresql' | 'mongodb' | 'redis' | 'mysql' | 'mariadb';
        action: string;
        parameters?: Record<string, any>;
        llmInstructions: string;
        researchFirst?: boolean;
        projectPath?: string;
        adrDirectory?: string;
      },
      ctx // ✅ Pass context to tool function for progress updates
    );
  }

  /**
   * Deployment analysis tool implementation
   */
  private async analyzeDeploymentProgress(args: Record<string, unknown>): Promise<CallToolResult> {
    const { analyzeDeploymentProgress } = await import('./tools/deployment-analysis-tool.js');
    return await analyzeDeploymentProgress(args);
  }

  /**
   * Apply content masking to MCP response
   */
  /**
   * Track memory operations performed by tools
   */
  private async trackMemoryOperations(
    toolName: string,
    parameters: any,
    result: any,
    success: boolean
  ): Promise<void> {
    try {
      // Check if memory integration was enabled and used
      if (parameters?.enableMemoryIntegration === false) {
        return; // Memory integration was explicitly disabled
      }

      // Extract memory operation information from result
      const memoryOps = this.extractMemoryOperations(toolName, parameters, result);

      if (memoryOps.length > 0) {
        // Store memory operation tracking in knowledge graph
        for (const op of memoryOps) {
          await this.kgManager.addMemoryExecution(
            toolName,
            op.action,
            op.entityType,
            success && op.success,
            op.details
          );
        }
      }
    } catch (error) {
      // Don't let memory tracking errors break execution
      console.error('[WARN] Memory operation tracking failed:', error);
    }
  }

  /**
   * Extract memory operation details from tool execution
   */
  private extractMemoryOperations(toolName: string, parameters: any, result: any): any[] {
    const operations: any[] = [];

    // Define memory-enabled tools and their expected operations
    const memoryEnabledTools = {
      analyze_content_security: {
        entityType: 'security_pattern',
        actions: ['store_pattern', 'analyze_institutional_security', 'track_evolution'],
      },
      analyze_environment: {
        entityType: 'environment_snapshot',
        actions: ['store_snapshot', 'analyze_trends', 'compare_configurations'],
      },
      deployment_readiness: {
        entityType: 'deployment_assessment',
        actions: ['store_assessment', 'migrate_history', 'analyze_patterns'],
      },
      troubleshoot_guided_workflow: {
        entityType: 'troubleshooting_session',
        actions: ['store_session', 'pattern_recognition', 'suggest_adrs', 'generate_research'],
      },
    };

    // Check if this tool supports memory operations
    const toolConfig = memoryEnabledTools[toolName as keyof typeof memoryEnabledTools];
    if (!toolConfig) {
      return operations; // Tool doesn't support memory operations
    }

    // Extract memory operation details from result
    if (result?.memoryIntegration) {
      const memoryInfo = result.memoryIntegration;

      // Pattern entity storage operation
      if (memoryInfo.entityStored || memoryInfo.patternStored) {
        operations.push({
          action: 'entity_storage',
          entityType: toolConfig.entityType,
          success: memoryInfo.storageSuccess !== false,
          details: {
            entityId: memoryInfo.entityId || memoryInfo.patternId,
            entityCount: memoryInfo.entityCount || 1,
            storageMethod: memoryInfo.storageMethod || 'standard',
          },
        });
      }

      // Historical analysis operation
      if (memoryInfo.historicalAnalysis || memoryInfo.trendAnalysis) {
        operations.push({
          action: 'historical_analysis',
          entityType: toolConfig.entityType,
          success: memoryInfo.analysisSuccess !== false,
          details: {
            analysisType: memoryInfo.analysisType || 'trend_analysis',
            entitiesAnalyzed: memoryInfo.entitiesAnalyzed || 0,
            insights: memoryInfo.insights || [],
          },
        });
      }

      // Evolution tracking operation
      if (memoryInfo.evolutionTracking) {
        operations.push({
          action: 'evolution_tracking',
          entityType: toolConfig.entityType,
          success: memoryInfo.evolutionSuccess !== false,
          details: {
            improvements: memoryInfo.improvements || [],
            degradations: memoryInfo.degradations || [],
            recommendations: memoryInfo.recommendations || [],
          },
        });
      }

      // Migration operation (for deployment readiness)
      if (memoryInfo.migrationCompleted) {
        operations.push({
          action: 'data_migration',
          entityType: toolConfig.entityType,
          success: memoryInfo.migrationSuccess !== false,
          details: {
            migratedRecords: memoryInfo.migratedRecords || 0,
            migrationMethod: memoryInfo.migrationMethod || 'json_to_memory',
          },
        });
      }
    }

    // If no specific memory integration info, infer from parameters
    if (operations.length === 0 && parameters?.enableMemoryIntegration !== false) {
      // Default assumption: entity was stored
      operations.push({
        action: 'entity_storage',
        entityType: toolConfig.entityType,
        success: true, // Assume success if no explicit info
        details: {
          entityCount: 1,
          storageMethod: 'inferred',
          note: 'Memory operation inferred from tool execution',
        },
      });
    }

    return operations;
  }

  /**
   * Track tool execution in knowledge graph
   */
  private async trackToolExecution(
    toolName: string,
    parameters: any,
    result: any,
    success: boolean,
    error?: string
  ): Promise<void> {
    try {
      // Extract intentId from metadata if available
      let intentId: string | undefined;

      if (result?.metadata?.intentId) {
        intentId = result.metadata.intentId;
      } else {
        // Check for active intents that might be related to this tool execution
        const activeIntents = await this.kgManager.getActiveIntents();
        if (activeIntents.length > 0) {
          // Use the most recent active intent
          const latestIntent = activeIntents[activeIntents.length - 1];
          if (latestIntent) {
            intentId = latestIntent.intentId;
          }
        }
      }

      // If no intent found, create a standalone execution record
      if (!intentId) {
        // Extract human request from conversation context if available
        let humanRequest = `Standalone tool execution: ${toolName}`;
        if (parameters?.conversationContext?.humanRequest) {
          humanRequest = parameters.conversationContext.humanRequest;
        }

        intentId = await this.kgManager.createIntent(
          humanRequest,
          [`Execute ${toolName}`, 'Complete tool operation'],
          'medium'
        );
      }

      // Determine tasks created/modified from tool operation
      const todoTasksCreated: string[] = [];
      const todoTasksModified: string[] = [];

      // Extract task information from result metadata
      if (result?.metadata) {
        if (result.metadata.tasksCreated) {
          todoTasksCreated.push(...result.metadata.tasksCreated);
        }
        if (result.metadata.tasksModified) {
          todoTasksModified.push(...result.metadata.tasksModified);
        }
        if (result.metadata.taskIds) {
          todoTasksModified.push(...result.metadata.taskIds);
        }
      }

      // Track memory operations if present
      await this.trackMemoryOperations(toolName, parameters, result, success);

      // Store execution in knowledge graph
      await this.kgManager.addToolExecution(
        intentId,
        toolName,
        parameters,
        result,
        success,
        todoTasksCreated,
        todoTasksModified,
        error
      );

      // If execution completed successfully, update intent status
      if (success && !error) {
        // Check if this might be the final tool in a chain
        const intent = await this.kgManager.getIntentById(intentId);
        if (intent && intent.currentStatus === 'executing') {
          // Simple heuristic: if tool is a "completion" type tool, mark intent as completed
          const completionTools = ['smart_git_push', 'generate_deployment_guidance', 'smart_score'];
          if (completionTools.includes(toolName)) {
            await this.kgManager.updateIntentStatus(intentId, 'completed');
          }
        }
      }
    } catch (trackingError) {
      // Don't let tracking errors break tool execution
      console.error('[WARN] Knowledge graph tracking failed:', trackingError);
    }
  }

  private async applyOutputMasking(response: any): Promise<any> {
    try {
      return await maskMcpResponse(response, this.maskingConfig);
    } catch (error) {
      // If masking fails, log warning and return original response
      // Log to stderr to avoid corrupting MCP protocol
      console.error('[WARN] Output masking failed:', error);
      return response;
    }
  }

  /**
   * Enrich response with state reinforcement and apply masking
   *
   * Implements Phase 2 of context decay mitigation by injecting
   * context reminders every N turns or when response exceeds token threshold.
   *
   * Phase 3 extension: Records conversation turns to structured external memory.
   */
  private async enrichResponseWithStateReinforcement(
    response: CallToolResult,
    toolName?: string,
    toolArgs?: any
  ): Promise<CallToolResult> {
    const startTime = Date.now();
    try {
      // Extract text content from response
      const textContent = response.content
        .filter((item): item is { type: 'text'; text: string } => item.type === 'text')
        .map(item => item.text)
        .join('\n\n');

      if (!textContent) {
        // No text content to enrich, just apply masking
        return await this.applyOutputMasking(response);
      }

      // Enrich with state reinforcement (Phase 2)
      const enriched = await this.stateReinforcementManager.enrichResponseWithContext(textContent);

      // Prepare final response
      let finalResponse: CallToolResult;

      // Replace text content with enriched version if context was injected
      if (enriched.contextInjected) {
        finalResponse = {
          ...response,
          content: response.content.map(item => {
            if (item.type === 'text') {
              return {
                type: 'text',
                text: enriched.enrichedContent,
              };
            }
            return item;
          }),
        };
      } else {
        finalResponse = response;
      }

      // Record conversation turn (Phase 3: Structured External Memory)
      if (toolName) {
        const duration = Date.now() - startTime;

        // Check if response has expandableId (from tiered response)
        const expandableIdMatch = textContent.match(/expandableId:\s*(\S+)/);
        const expandableId = expandableIdMatch ? expandableIdMatch[1] : undefined;

        await this.conversationMemoryManager.recordTurn(
          {
            type: 'tool_call',
            toolName,
            toolArgs,
          },
          {
            content: enriched.enrichedContent || textContent,
            tokenCount: enriched.tokenCount,
            contextInjected: enriched.contextInjected,
            ...(expandableId ? { expandableId } : {}),
          },
          {
            duration,
            cacheHit: false, // Could be enhanced to track cache hits
            errorOccurred: false,
          }
        );

        this.logger.debug(`Conversation turn recorded for ${toolName}`, 'McpAdrAnalysisServer', {
          turnNumber: enriched.turnNumber,
        });
      }

      // Apply masking to final response
      return await this.applyOutputMasking(finalResponse);
    } catch (error) {
      this.logger.error(
        'State reinforcement or conversation recording failed, returning original response',
        'McpAdrAnalysisServer',
        error instanceof Error ? error : undefined
      );
      // Fallback to just masking if enrichment fails
      return await this.applyOutputMasking(response);
    }
  }

  /**
   * Read MCP resource with prompt-driven caching
   */
  private async readResource(uri: string): Promise<any> {
    try {
      // Import resource router and templated resources (ensures routes are registered)
      const { resourceRouter } = await import('./resources/resource-router.js');

      // Import templated resources to register routes
      await import('./resources/adr-by-id-resource.js');
      await import('./resources/research-by-topic-resource.js');
      await import('./resources/todo-by-id-resource.js');
      await import('./resources/rule-by-id-resource.js');
      await import('./resources/technology-by-name-resource.js');
      await import('./resources/pattern-by-name-resource.js');
      await import('./resources/validated-pattern-by-platform-resource.js');
      await import('./resources/pattern-sources-by-platform-resource.js');
      await import('./resources/pattern-base-code-by-platform-resource.js');

      // Try routing first (handles templated resources)
      if (resourceRouter.canRoute(uri)) {
        const result = await resourceRouter.route(uri);

        return {
          contents: [
            {
              uri,
              mimeType: result.contentType,
              text: JSON.stringify(result.data, null, 2),
            },
          ],
          _meta: {
            lastModified: result.lastModified,
            etag: result.etag,
            cacheKey: result.cacheKey,
          },
        };
      }

      // Fall back to static resource handling
      // Parse URI to determine resource type and parameters
      const url = new globalThis.URL(uri);
      const resourceType = url.pathname.replace('/', '');
      const params = Object.fromEntries(url.searchParams.entries());

      switch (resourceType) {
        case 'architectural_knowledge_graph': {
          const { generateArchitecturalKnowledgeGraph } = await import('./resources/index.js');
          const projectPath = params['projectPath'] || process.cwd();

          // Generate resource directly (caching is now handled through AI delegation)
          const result = await generateArchitecturalKnowledgeGraph(projectPath);

          return {
            contents: [
              {
                uri,
                mimeType: result.contentType,
                text: JSON.stringify(result.data, null, 2),
              },
            ],
          };
        }

        case 'analysis_report': {
          const { generateAnalysisReport } = await import('./resources/index.js');
          const projectPath = params['projectPath'] || process.cwd();
          const focusAreas = params['focusAreas'] ? params['focusAreas'].split(',') : undefined;

          // Generate resource directly (caching is now handled through AI delegation)
          const result = await generateAnalysisReport(projectPath, focusAreas);

          return {
            contents: [
              {
                uri,
                mimeType: result.contentType,
                text: JSON.stringify(result.data, null, 2),
              },
            ],
          };
        }

        case 'adr_list': {
          const { generateAdrList } = await import('./resources/index.js');
          const { getAdrDirectoryPath } = await import('./utils/config.js');
          const path = await import('path');

          // Use absolute ADR path relative to project
          const absoluteAdrPath = params['adrDirectory']
            ? path.resolve(this.config.projectPath, params['adrDirectory'])
            : getAdrDirectoryPath(this.config);

          // Generate resource directly (caching is now handled through AI delegation)
          const result = await generateAdrList(absoluteAdrPath, this.config.projectPath);

          return {
            contents: [
              {
                uri,
                mimeType: result.contentType,
                text: JSON.stringify(result.data, null, 2),
              },
            ],
          };
        }

        case 'todo_list': {
          const { generateTodoListResource } = await import('./resources/todo-list-resource.js');
          const result = await generateTodoListResource();

          return {
            contents: [
              {
                uri,
                mimeType: result.contentType,
                text: JSON.stringify(result.data, null, 2),
              },
            ],
            _meta: {
              lastModified: result.lastModified,
              etag: result.etag,
              cacheKey: result.cacheKey,
            },
          };
        }

        case 'research_index': {
          const { generateResearchIndexResource } = await import(
            './resources/research-index-resource.js'
          );
          const result = await generateResearchIndexResource();

          return {
            contents: [
              {
                uri,
                mimeType: result.contentType,
                text: JSON.stringify(result.data, null, 2),
              },
            ],
            _meta: {
              lastModified: result.lastModified,
              etag: result.etag,
              cacheKey: result.cacheKey,
            },
          };
        }

        case 'rule_catalog': {
          const { generateRuleCatalogResource } = await import(
            './resources/rule-catalog-resource.js'
          );
          const result = await generateRuleCatalogResource();

          return {
            contents: [
              {
                uri,
                mimeType: result.contentType,
                text: JSON.stringify(result.data, null, 2),
              },
            ],
            _meta: {
              lastModified: result.lastModified,
              etag: result.etag,
              cacheKey: result.cacheKey,
            },
          };
        }

        case 'rule_generation': {
          const { generateRuleGenerationResource } = await import(
            './resources/rule-generation-resource.js'
          );
          const result = await generateRuleGenerationResource(undefined, url.searchParams);

          return {
            contents: [
              {
                uri,
                mimeType: result.contentType,
                text: JSON.stringify(result.data, null, 2),
              },
            ],
            _meta: {
              lastModified: result.lastModified,
              etag: result.etag,
              cacheKey: result.cacheKey,
            },
          };
        }

        case 'project_status': {
          const { generateProjectStatusResource } = await import(
            './resources/project-status-resource.js'
          );
          const result = await generateProjectStatusResource();

          return {
            contents: [
              {
                uri,
                mimeType: result.contentType,
                text: JSON.stringify(result.data, null, 2),
              },
            ],
            _meta: {
              lastModified: result.lastModified,
              etag: result.etag,
              cacheKey: result.cacheKey,
            },
          };
        }

        case 'deployment_status': {
          const { generateDeploymentStatusResource } = await import(
            './resources/deployment-status-resource.js'
          );
          const result = await generateDeploymentStatusResource(undefined, url.searchParams);

          return {
            contents: [
              {
                uri,
                mimeType: result.contentType,
                text: JSON.stringify(result.data, null, 2),
              },
            ],
            _meta: {
              lastModified: result.lastModified,
              etag: result.etag,
              cacheKey: result.cacheKey,
            },
          };
        }

        case 'environment_analysis': {
          const { generateEnvironmentAnalysisResource } = await import(
            './resources/environment-analysis-resource.js'
          );
          const result = await generateEnvironmentAnalysisResource(undefined, url.searchParams);

          return {
            contents: [
              {
                uri,
                mimeType: result.contentType,
                text: JSON.stringify(result.data, null, 2),
              },
            ],
            _meta: {
              lastModified: result.lastModified,
              etag: result.etag,
              cacheKey: result.cacheKey,
            },
          };
        }

        case 'memory_snapshots': {
          const { generateMemorySnapshotsResource } = await import(
            './resources/memory-snapshots-resource.js'
          );
          const result = await generateMemorySnapshotsResource(undefined, url.searchParams);

          return {
            contents: [
              {
                uri,
                mimeType: result.contentType,
                text: JSON.stringify(result.data, null, 2),
              },
            ],
            _meta: {
              lastModified: result.lastModified,
              etag: result.etag,
              cacheKey: result.cacheKey,
            },
          };
        }

        case 'project_metrics': {
          const { generateProjectMetricsResource } = await import(
            './resources/project-metrics-resource.js'
          );
          const result = await generateProjectMetricsResource();

          return {
            contents: [
              {
                uri,
                mimeType: result.contentType,
                text: JSON.stringify(result.data, null, 2),
              },
            ],
            _meta: {
              lastModified: result.lastModified,
              etag: result.etag,
              cacheKey: result.cacheKey,
            },
          };
        }

        case 'deployment_history': {
          const { generateDeploymentHistoryResource } = await import(
            './resources/deployment-history-resource.js'
          );
          const result = await generateDeploymentHistoryResource(undefined, url.searchParams);

          return {
            contents: [
              {
                uri,
                mimeType: result.contentType,
                text: JSON.stringify(result.data, null, 2),
              },
            ],
            _meta: {
              lastModified: result.lastModified,
              etag: result.etag,
              cacheKey: result.cacheKey,
            },
          };
        }

        case 'code_quality': {
          const { generateCodeQualityResource } = await import(
            './resources/code-quality-resource.js'
          );
          const result = await generateCodeQualityResource(undefined, url.searchParams);

          return {
            contents: [
              {
                uri,
                mimeType: result.contentType,
                text: JSON.stringify(result.data, null, 2),
              },
            ],
            _meta: {
              lastModified: result.lastModified,
              etag: result.etag,
              cacheKey: result.cacheKey,
            },
          };
        }

        case 'validated_patterns': {
          const { generateValidatedPatternsCatalogResource } = await import(
            './resources/validated-patterns-catalog-resource.js'
          );
          const result = await generateValidatedPatternsCatalogResource();

          return {
            contents: [
              {
                uri,
                mimeType: result.contentType,
                text: JSON.stringify(result.data, null, 2),
              },
            ],
            _meta: {
              lastModified: result.lastModified,
              etag: result.etag,
              cacheKey: result.cacheKey,
            },
          };
        }

        default:
          throw new McpAdrError(`Unknown resource type: ${resourceType}`, 'UNKNOWN_RESOURCE');
      }
    } catch (error) {
      if (error instanceof McpAdrError) {
        throw error;
      }
      throw new McpAdrError(
        `Failed to read resource: ${error instanceof Error ? error.message : String(error)}`,
        'RESOURCE_ERROR'
      );
    }
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    // Validate configuration before starting
    await this.validateConfiguration();

    // Initialize memory entity manager
    await this.memoryEntityManager.initialize();
    this.logger.info('Memory Entity Manager initialized', 'McpAdrAnalysisServer');

    // Initialize conversation memory manager (Phase 3: Structured External Memory)
    await this.conversationMemoryManager.initialize();
    this.logger.info('Phase 3 (Structured External Memory) initialized', 'McpAdrAnalysisServer');

    // Generate initial server context file
    try {
      await this.contextGenerator.writeContextFile(
        this.kgManager,
        this.memoryEntityManager,
        this.conversationMemoryManager
      );
      this.logger.info(
        'Server context file generated at .mcp-server-context.md',
        'McpAdrAnalysisServer'
      );
    } catch (error) {
      this.logger.warn('Failed to generate initial server context file', 'McpAdrAnalysisServer', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Keep the process alive
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * File system tool implementations
   */

  /**
   * List accessible roots (MCP best practice)
   */
  private async listRoots(): Promise<CallToolResult> {
    const roots = this.rootManager.listRoots();

    const rootsList = roots
      .map(r => `### ${r.name}\n\n**Path**: \`${r.path}\`\n\n**Description**: ${r.description}\n`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `# Available File System Roots\n\nThese are the directories that can be accessed by this MCP server.\n\n${rootsList}\nUse these paths with \`read_directory\` and \`read_file\` tools to explore and access files.`,
        },
      ],
    };
  }

  /**
   * Read directory contents (MCP best practice for autonomous file discovery)
   */
  private async readDirectory(args: { path?: string }): Promise<CallToolResult> {
    const targetPath = args.path || this.config.projectPath;

    try {
      const path = await import('path');
      const resolvedPath = path.resolve(targetPath);

      // Security check: ensure path is within accessible roots
      if (!this.rootManager.isPathAllowed(resolvedPath)) {
        const roots = this.rootManager.listRoots();
        const rootList = roots.map(r => `  - ${r.name}: ${r.path}`).join('\n');

        throw new McpAdrError(
          `Access denied: Path '${targetPath}' is outside accessible roots.\n\nAccessible roots:\n${rootList}\n\nUse list_roots tool for more details.`,
          'ACCESS_DENIED'
        );
      }

      const { readdir } = await import('fs/promises');
      const entries = await readdir(resolvedPath, { withFileTypes: true });

      const files = entries.filter(e => e.isFile()).map(e => `📄 ${e.name}`);

      const dirs = entries.filter(e => e.isDirectory()).map(e => `📁 ${e.name}/`);

      const root = this.rootManager.getRootForPath(resolvedPath);
      const relPath = this.rootManager.getRelativePathFromRoot(resolvedPath);

      const filesList = files.length > 0 ? files.join('\n') : '(no files)';
      const dirsList = dirs.length > 0 ? dirs.join('\n') : '(no directories)';

      return {
        content: [
          {
            type: 'text',
            text: `# Directory: ${targetPath}\n\n**Root**: ${root?.name}\n**Relative Path**: ${relPath || '/'}\n**Full Path**: \`${resolvedPath}\`\n\n## Directories (${dirs.length})\n\n${dirsList}\n\n## Files (${files.length})\n\n${filesList}`,
          },
        ],
      };
    } catch (error) {
      throw new McpAdrError(
        `Failed to read directory: ${error instanceof Error ? error.message : String(error)}`,
        'DIRECTORY_READ_ERROR'
      );
    }
  }

  private async readFile(args: ReadFileArgs): Promise<CallToolResult> {
    const { filePath } = args;

    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // Resolve path (handle both relative and absolute paths)
      const safePath = path.resolve(filePath);

      // Security check: ensure path is within accessible roots
      if (!this.rootManager.isPathAllowed(safePath)) {
        const roots = this.rootManager.listRoots();
        const rootList = roots.map(r => `  - ${r.name}: ${r.path}`).join('\n');

        throw new McpAdrError(
          `Access denied: Path '${filePath}' is outside accessible roots.\n\nAccessible roots:\n${rootList}\n\nUse list_roots tool for more details.`,
          'ACCESS_DENIED'
        );
      }

      const content = await fs.readFile(safePath, 'utf-8');

      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
      };
    } catch (error) {
      throw new McpAdrError(
        `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
        'FILE_READ_ERROR'
      );
    }
  }

  private async writeFile(args: WriteFileArgs): Promise<CallToolResult> {
    const { filePath, content } = args;

    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // Resolve path relative to project path for security
      const safePath = path.resolve(this.config.projectPath, filePath);

      // Security check: ensure path is within project directory
      if (!safePath.startsWith(this.config.projectPath)) {
        throw new McpAdrError('Access denied: Path is outside project directory', 'ACCESS_DENIED');
      }

      // Ensure directory exists
      await fs.mkdir(path.dirname(safePath), { recursive: true });

      // Write file
      await fs.writeFile(safePath, content, 'utf-8');

      return {
        content: [
          {
            type: 'text',
            text: `Successfully wrote to ${filePath}`,
          },
        ],
      };
    } catch (error) {
      throw new McpAdrError(
        `Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
        'FILE_WRITE_ERROR'
      );
    }
  }

  private async listDirectory(args: Record<string, unknown>): Promise<CallToolResult> {
    const { path: dirPath } = args;

    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // Resolve path relative to project path for security
      const safePath = path.resolve(this.config.projectPath, dirPath as string);

      // Security check: ensure path is within project directory
      if (!safePath.startsWith(this.config.projectPath)) {
        throw new McpAdrError('Access denied: Path is outside project directory', 'ACCESS_DENIED');
      }

      const entries = await fs.readdir(safePath, { withFileTypes: true });
      const fileList = entries.map(entry => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
        path: path.join(dirPath as string, entry.name),
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(fileList, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpAdrError(
        `Failed to list directory: ${error instanceof Error ? error.message : String(error)}`,
        'DIRECTORY_LIST_ERROR'
      );
    }
  }

  private async generateDeploymentGuidance(args: Record<string, unknown>): Promise<CallToolResult> {
    try {
      const { generateDeploymentGuidance } = await import('./tools/deployment-guidance-tool.js');
      return await generateDeploymentGuidance(args);
    } catch (error) {
      throw new McpAdrError(
        `Deployment guidance generation failed: ${error instanceof Error ? error.message : String(error)}`,
        'DEPLOYMENT_GUIDANCE_ERROR'
      );
    }
  }

  private async smartGitPush(args: Record<string, unknown>): Promise<CallToolResult> {
    try {
      const { smartGitPush } = await import('./tools/smart-git-push-tool-v2.js');
      return await smartGitPush(args);
    } catch (error) {
      throw new McpAdrError(
        `Smart git push failed: ${error instanceof Error ? error.message : String(error)}`,
        'SMART_GIT_PUSH_ERROR'
      );
    }
  }

  private async deploymentReadiness(args: Record<string, unknown>): Promise<CallToolResult> {
    try {
      const { deploymentReadiness } = await import('./tools/deployment-readiness-tool.js');
      return await deploymentReadiness(args);
    } catch (error) {
      throw new McpAdrError(
        `Deployment readiness check failed: ${error instanceof Error ? error.message : String(error)}`,
        'DEPLOYMENT_READINESS_ERROR'
      );
    }
  }

  private async troubleshootGuidedWorkflow(args: Record<string, unknown>): Promise<CallToolResult> {
    try {
      const { troubleshootGuidedWorkflow } = await import(
        './tools/troubleshoot-guided-workflow-tool.js'
      );
      return await troubleshootGuidedWorkflow(args as unknown as TodoManagementV2Args);
    } catch (error) {
      throw new McpAdrError(
        `Troubleshoot guided workflow failed: ${error instanceof Error ? error.message : String(error)}`,
        'TROUBLESHOOT_GUIDED_WORKFLOW_ERROR'
      );
    }
  }

  private async smartScore(_args: Record<string, unknown>): Promise<CallToolResult> {
    // Smart score tool was removed - return deprecation message
    return {
      content: [
        {
          type: 'text',
          text: `⚠️ **Smart Score Tool Deprecated**

This tool has been deprecated and replaced with memory-centric health scoring.

**Replacement:** The new MemoryHealthScoring system tracks:
- Memory quality and relevance
- Retrieval performance
- Entity relationship coherence
- Context utilization
- Decision alignment

**Migration:** Health scoring is now integrated into the knowledge graph and automatically calculated based on memory usage patterns.`,
        },
      ],
      isError: false,
    };
  }

  private async mcpPlanning(args: Record<string, unknown>): Promise<CallToolResult> {
    try {
      const { mcpPlanning } = await import('./tools/mcp-planning-tool.js');
      return await mcpPlanning(args);
    } catch (error) {
      throw new McpAdrError(
        `MCP planning failed: ${error instanceof Error ? error.message : String(error)}`,
        'MCP_PLANNING_ERROR'
      );
    }
  }

  private async memoryLoading(args: Record<string, unknown>): Promise<CallToolResult> {
    try {
      const { MemoryLoadingTool } = await import('./tools/memory-loading-tool.js');
      const memoryTool = new MemoryLoadingTool();
      return await memoryTool.execute(args);
    } catch (error) {
      throw new McpAdrError(
        `Memory loading failed: ${error instanceof Error ? error.message : String(error)}`,
        'MEMORY_LOADING_ERROR'
      );
    }
  }

  private async expandAnalysisSection(args: Record<string, unknown>): Promise<CallToolResult> {
    try {
      const { expandAnalysisSection } = await import('./tools/expand-analysis-tool.js');
      return await expandAnalysisSection(args as any);
    } catch (error) {
      throw new McpAdrError(
        `Failed to expand analysis: ${error instanceof Error ? error.message : String(error)}`,
        'EXPAND_ANALYSIS_ERROR'
      );
    }
  }

  private async interactiveAdrPlanning(args: Record<string, unknown>): Promise<CallToolResult> {
    try {
      const { interactiveAdrPlanning } = await import('./tools/interactive-adr-planning-tool.js');
      return await interactiveAdrPlanning(args);
    } catch (error) {
      throw new McpAdrError(
        `Interactive ADR planning failed: ${error instanceof Error ? error.message : String(error)}`,
        'INTERACTIVE_ADR_PLANNING_ERROR'
      );
    }
  }

  /**
   * Tool chain orchestrator implementation
   */
  private async toolChainOrchestrator(args: ToolChainOrchestratorArgs): Promise<CallToolResult> {
    try {
      const { toolChainOrchestrator } = await import('./tools/tool-chain-orchestrator.js');
      return await toolChainOrchestrator(args as any);
    } catch (error) {
      throw new McpAdrError(
        `Tool chain orchestration failed: ${error instanceof Error ? error.message : String(error)}`,
        'TOOL_CHAIN_ORCHESTRATOR_ERROR'
      );
    }
  }

  /**
   * Phase 3: Expand Memory Tool
   * Retrieves and expands stored content from tiered responses
   */
  private async expandMemory(args: any): Promise<CallToolResult> {
    try {
      const { expandMemory } = await import('./tools/conversation-memory-tool.js');
      return await expandMemory(args, this.conversationMemoryManager);
    } catch (error) {
      throw new McpAdrError(
        `Memory expansion failed: ${error instanceof Error ? error.message : String(error)}`,
        'MEMORY_EXPANSION_ERROR'
      );
    }
  }

  /**
   * Phase 3: Query Conversation History Tool
   * Searches and retrieves conversation sessions
   */
  private async queryConversationHistory(args: any): Promise<CallToolResult> {
    try {
      const { queryConversationHistory } = await import('./tools/conversation-memory-tool.js');
      return await queryConversationHistory(args, this.conversationMemoryManager);
    } catch (error) {
      throw new McpAdrError(
        `Conversation history query failed: ${error instanceof Error ? error.message : String(error)}`,
        'CONVERSATION_QUERY_ERROR'
      );
    }
  }

  /**
   * Phase 3: Get Conversation Snapshot Tool
   * Retrieves current conversation context
   */
  private async getConversationSnapshot(args: any): Promise<CallToolResult> {
    try {
      const { getConversationSnapshot } = await import('./tools/conversation-memory-tool.js');
      return await getConversationSnapshot(args, this.conversationMemoryManager);
    } catch (error) {
      throw new McpAdrError(
        `Conversation snapshot retrieval failed: ${error instanceof Error ? error.message : String(error)}`,
        'SNAPSHOT_ERROR'
      );
    }
  }

  /**
   * Phase 3: Get Memory Statistics Tool
   * Retrieves conversation memory statistics
   */
  private async getMemoryStats(): Promise<CallToolResult> {
    try {
      const { getMemoryStats } = await import('./tools/conversation-memory-tool.js');
      return await getMemoryStats(this.conversationMemoryManager);
    } catch (error) {
      throw new McpAdrError(
        `Memory stats retrieval failed: ${error instanceof Error ? error.message : String(error)}`,
        'MEMORY_STATS_ERROR'
      );
    }
  }

  /**
   * Get Server Context Tool
   * Generates comprehensive server context file for LLM @ referencing
   */
  private async getServerContext(args: any): Promise<CallToolResult> {
    try {
      const { getServerContext } = await import('./tools/get-server-context-tool.js');
      return await getServerContext(
        args,
        this.kgManager,
        this.memoryEntityManager,
        this.conversationMemoryManager
      );
    } catch (error) {
      throw new McpAdrError(
        `Server context generation failed: ${error instanceof Error ? error.message : String(error)}`,
        'SERVER_CONTEXT_ERROR'
      );
    }
  }

  /**
   * Get Current Datetime Tool
   * Returns the current date and time in various formats for ADR generation and timestamping
   */
  private async getCurrentDatetime(args: {
    timezone?: string;
    format?: 'iso' | 'human' | 'adr' | 'all';
    includeTimestamp?: boolean;
  }): Promise<CallToolResult> {
    const { timezone = 'UTC', format = 'all', includeTimestamp = true } = args;

    try {
      const now = new Date();

      // Format date for different timezones
      const formatOptions: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };

      // Get date parts for the specified timezone
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const parts = formatter.formatToParts(now);
      const year = parts.find(p => p.type === 'year')?.value || '';
      const month = parts.find(p => p.type === 'month')?.value || '';
      const day = parts.find(p => p.type === 'day')?.value || '';

      // ADR date format: YYYY-MM-DD
      const adrDate = `${year}-${month}-${day}`;

      // ISO 8601 format
      const isoDate = now.toISOString();

      // Human-readable format
      const humanFormatter = new Intl.DateTimeFormat('en-US', {
        ...formatOptions,
        weekday: 'long',
        month: 'long',
      });
      const humanDate = humanFormatter.format(now);

      // Build response based on requested format
      let responseData: Record<string, string | number> = {};

      switch (format) {
        case 'iso':
          responseData = { iso: isoDate };
          break;
        case 'human':
          responseData = { human: humanDate };
          break;
        case 'adr':
          responseData = { adr: adrDate };
          break;
        case 'all':
        default:
          responseData = {
            iso: isoDate,
            human: humanDate,
            adr: adrDate,
            timezone: timezone,
          };
      }

      if (includeTimestamp) {
        responseData['timestamp'] = now.getTime();
      }

      const responseText = `# Current Date and Time

## Formats
${format === 'all' || format === 'iso' ? `- **ISO 8601**: ${isoDate}` : ''}
${format === 'all' || format === 'human' ? `- **Human Readable**: ${humanDate}` : ''}
${format === 'all' || format === 'adr' ? `- **ADR Date (YYYY-MM-DD)**: ${adrDate}` : ''}
${format === 'all' ? `- **Timezone**: ${timezone}` : ''}
${includeTimestamp ? `- **Unix Timestamp (ms)**: ${now.getTime()}` : ''}

## Usage for ADR Generation

When generating ADRs, use the ADR date format (\`${adrDate}\`) in the Date field:

\`\`\`markdown
# ADR-XXXX: [Title]

## Date
${adrDate}

## Status
Proposed
\`\`\`

## Raw Data

\`\`\`json
${JSON.stringify(responseData, null, 2)}
\`\`\`
`;

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
      };
    } catch (error) {
      throw new McpAdrError(
        `Failed to get current datetime: ${error instanceof Error ? error.message : String(error)}`,
        'DATETIME_ERROR'
      );
    }
  }
}

/**
 * Main execution function for the MCP ADR Analysis Server
 *
 * @description Initializes and starts the MCP server with proper configuration,
 * error handling, and graceful shutdown. Handles command line arguments for
 * help, version, and test modes.
 *
 * @returns {Promise<void>} Resolves when server shuts down gracefully
 *
 * @throws {Error} When server initialization fails or configuration is invalid
 *
 * @example
 * ```typescript
 * // Start the server (typically called from CLI)
 * await main();
 * ```
 *
 * @since 1.0.0
 * @category Main
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Handle command line arguments
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
MCP ADR Analysis Server v${SERVER_INFO.version}

Usage: mcp-adr-analysis-server [options]

Options:
  --help, -h        Show this help message
  --version, -v     Show version information
  --test            Run health check and exit
  --config          Show configuration and exit

Environment Variables:
  PROJECT_PATH      Path to project directory (default: current directory)
  ADR_DIRECTORY     ADR directory relative to project (default: docs/adrs)
  LOG_LEVEL         Logging level: DEBUG, INFO, WARN, ERROR (default: INFO)
  CACHE_ENABLED     Enable caching: true, false (default: true)

Examples:
  mcp-adr-analysis-server                    # Start MCP server
  PROJECT_PATH=/path/to/project mcp-adr-analysis-server
  mcp-adr-analysis-server --test             # Health check
`);
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(`MCP ADR Analysis Server v${SERVER_INFO.version}`);
    process.exit(0);
  }

  try {
    const server = new McpAdrAnalysisServer();

    if (args.includes('--test')) {
      console.log('🔍 Running health check...');
      await server.healthCheck();
      console.log('✅ Health check passed - server can start successfully');
      process.exit(0);
    }

    if (args.includes('--config')) {
      console.log('📋 Server configuration validated');
      process.exit(0);
    }

    // Normal server startup
    await server.start();
  } catch (error) {
    console.error('❌ MCP server failed to start');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Start the server if this file is run directly
// Jest-compatible check: avoid import.meta.url which Jest cannot handle
// Handle both direct execution and npm global package symlinks
if (
  process.argv[1] &&
  (process.argv[1].endsWith('index.js') ||
    process.argv[1].endsWith('index.ts') ||
    process.argv[1].endsWith('mcp-adr-analysis-server'))
) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
// Test comment for pre-commit hook
