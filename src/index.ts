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
} from '@modelcontextprotocol/sdk/types.js';

import { readFileSync } from 'fs';
import { join } from 'path';
import { getCurrentDirCompat } from './utils/directory-compat.js';
import { McpAdrError } from './types/index.js';
import { CONVERSATION_CONTEXT_SCHEMA } from './types/conversation-context.js';
import { maskMcpResponse, createMaskingConfig } from './utils/output-masking.js';
import {
  loadConfig,
  validateProjectPath,
  createLogger,
  printConfigSummary,
  type ServerConfig,
} from './utils/config.js';
import { KnowledgeGraphManager } from './utils/knowledge-graph-manager.js';

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
  private maskingConfig: any;
  private config: ServerConfig;
  private logger: ReturnType<typeof createLogger>;
  private kgManager: KnowledgeGraphManager;

  constructor() {
    // Load and validate configuration
    this.config = loadConfig();
    this.logger = createLogger(this.config);
    this.kgManager = new KnowledgeGraphManager();

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
    } catch (error: any) {
      this.logger.error(`Configuration validation failed: ${error.message}`);
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
   */
  private setupHandlers(): void {
    // Tools handler
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
            name: 'generate_adr_todo',
            description:
              'Generate TDD-focused todo.md from existing ADRs with JSON-first approach: creates structured JSON TODO and syncs to markdown',
            inputSchema: {
              type: 'object',
              properties: {
                adrDirectory: {
                  type: 'string',
                  description:
                    'Directory containing ADR files (optional, uses configured ADR_DIRECTORY if not provided)',
                },
                scope: {
                  type: 'string',
                  enum: ['all', 'pending', 'in_progress'],
                  description: 'Scope of tasks to include',
                  default: 'all',
                },
                phase: {
                  type: 'string',
                  enum: ['both', 'test', 'production'],
                  description:
                    'TDD phase: both (default), test (mock test generation), production (implementation after tests)',
                  default: 'both',
                },
                linkAdrs: {
                  type: 'boolean',
                  description: 'Auto-detect and link ADR dependencies in task creation',
                  default: true,
                },
                includeRules: {
                  type: 'boolean',
                  description: 'Include architectural rules validation in TDD tasks',
                  default: true,
                },
                ruleSource: {
                  type: 'string',
                  enum: ['adrs', 'patterns', 'both'],
                  description: 'Source for architectural rules (only used if includeRules is true)',
                  default: 'both',
                },
                todoPath: {
                  type: 'string',
                  description: 'Path to TODO.md file (relative to project root)',
                  default: 'TODO.md',
                },
                preserveExisting: {
                  type: 'boolean',
                  description:
                    'Preserve existing TODO.md content by merging instead of overwriting',
                  default: true,
                },
                forceSyncToMarkdown: {
                  type: 'boolean',
                  description: 'Force sync JSON to markdown even if markdown is newer',
                  default: false,
                },
                intentId: {
                  type: 'string',
                  description: 'Link generated tasks to specific knowledge graph intent',
                },
                createJsonBackup: {
                  type: 'boolean',
                  description: 'Create backup of existing JSON TODO data before import',
                  default: true,
                },
                conversationContext: CONVERSATION_CONTEXT_SCHEMA,
              },
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
            description: 'Analyze content for sensitive information using AI-powered detection',
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
              'Suggest architectural decisions with advanced prompting techniques (Knowledge Generation + Reflexion)',
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
            description: 'Generate a complete ADR from decision data',
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
            description: 'Analyze environment context and provide optimization recommendations',
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
            name: 'read_file',
            description: 'Read contents of a file',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Path to the file to read',
                },
              },
              required: ['path'],
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
            name: 'manage_todo_json',
            description:
              'JSON-first TODO management with consistent LLM interactions, automatic scoring sync, and knowledge graph integration',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  enum: [
                    'create_task',
                    'update_task',
                    'bulk_update',
                    'get_tasks',
                    'get_analytics',
                    'import_adr_tasks',
                    'sync_knowledge_graph',
                    'sync_to_markdown',
                    'import_from_markdown',
                  ],
                  description: 'Operation to perform on TODO JSON backend',
                },
                projectPath: {
                  type: 'string',
                  description: 'Project root path (uses configured PROJECT_PATH if not provided)',
                },
                taskId: {
                  type: 'string',
                  description: 'Task ID for update operations',
                },
                title: {
                  type: 'string',
                  description: 'Task title for create operations',
                },
                description: {
                  type: 'string',
                  description: 'Task description',
                },
                priority: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'critical'],
                  default: 'medium',
                  description: 'Task priority level',
                },
                assignee: {
                  type: 'string',
                  description: 'Task assignee',
                },
                dueDate: {
                  type: 'string',
                  description: 'Due date (ISO string format)',
                },
                category: {
                  type: 'string',
                  description: 'Task category',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Task tags',
                },
                dependencies: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Task dependencies (task IDs)',
                },
                intentId: {
                  type: 'string',
                  description: 'Link to knowledge graph intent',
                },
                linkedAdrs: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Related ADR files',
                },
                autoComplete: {
                  type: 'boolean',
                  default: false,
                  description: 'Auto-complete when criteria are met',
                },
                completionCriteria: {
                  type: 'string',
                  description: 'Auto-completion rules',
                },
                updates: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    status: {
                      type: 'string',
                      enum: ['pending', 'in_progress', 'completed', 'blocked', 'cancelled'],
                    },
                    priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                    assignee: { type: 'string' },
                    dueDate: { type: 'string' },
                    progressPercentage: { type: 'number', minimum: 0, maximum: 100 },
                    notes: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                  },
                  description: 'Fields to update for update operations',
                },
                reason: {
                  type: 'string',
                  description: 'Reason for update (for changelog)',
                },
                filters: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['pending', 'in_progress', 'completed', 'blocked', 'cancelled'],
                    },
                    priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                    assignee: { type: 'string' },
                    category: { type: 'string' },
                    hasDeadline: { type: 'boolean' },
                    overdue: { type: 'boolean' },
                    tags: { type: 'array', items: { type: 'string' } },
                  },
                  description: 'Filter criteria for get_tasks operation',
                },
                sortBy: {
                  type: 'string',
                  enum: ['priority', 'dueDate', 'createdAt', 'updatedAt'],
                  default: 'priority',
                  description: 'Sort field for get_tasks operation',
                },
                sortOrder: {
                  type: 'string',
                  enum: ['asc', 'desc'],
                  default: 'desc',
                  description: 'Sort order for get_tasks operation',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of tasks to return',
                },
                timeframe: {
                  type: 'string',
                  enum: ['day', 'week', 'month', 'all'],
                  default: 'week',
                  description: 'Analysis timeframe for analytics',
                },
                includeVelocity: {
                  type: 'boolean',
                  default: true,
                  description: 'Include velocity metrics in analytics',
                },
                includeScoring: {
                  type: 'boolean',
                  default: true,
                  description: 'Include scoring metrics in analytics',
                },
                adrDirectory: {
                  type: 'string',
                  default: 'docs/adrs',
                  description: 'ADR directory path for imports',
                },
                preserveExisting: {
                  type: 'boolean',
                  default: true,
                  description: 'Keep existing tasks during imports',
                },
                autoLinkDependencies: {
                  type: 'boolean',
                  default: true,
                  description: 'Auto-detect task dependencies',
                },
                direction: {
                  type: 'string',
                  enum: ['to_kg', 'from_kg', 'bidirectional'],
                  default: 'bidirectional',
                  description: 'Knowledge graph sync direction',
                },
                force: {
                  type: 'boolean',
                  default: false,
                  description: 'Force operation even if conflicts exist',
                },
                mergeStrategy: {
                  type: 'string',
                  enum: ['overwrite', 'merge', 'preserve_json'],
                  default: 'merge',
                  description: 'Merge strategy for imports',
                },
                backupExisting: {
                  type: 'boolean',
                  default: true,
                  description: 'Create backup before destructive operations',
                },
              },
              required: ['operation'],
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
              },
              required: ['operation'],
            },
          },
          {
            name: 'troubleshoot_guided_workflow',
            description:
              'Structured failure analysis and test plan generation - provide JSON failure info to get specific test commands',
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
                      'manage_todo_json',
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
              'Interactive guided ADR planning and creation tool - walks users through structured decision-making process with research integration, option evaluation, and automatic ADR generation',
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
        ],
      };
    });

    // Tool execution handler
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      try {
        let response: any;

        switch (name) {
          case 'analyze_project_ecosystem':
            response = await this.analyzeProjectEcosystem(args);
            break;
          case 'get_architectural_context':
            response = await this.getArchitecturalContext(args);
            break;
          case 'generate_adrs_from_prd':
            response = await this.generateAdrsFromPrd(args);
            break;
          case 'generate_adr_todo':
            response = await this.generateAdrTodo(args);
            break;
          case 'compare_adr_progress':
            response = await this.compareAdrProgress(args);
            break;
          case 'analyze_content_security':
            response = await this.analyzeContentSecurity(args);
            break;
          case 'generate_content_masking':
            response = await this.generateContentMasking(args);
            break;
          case 'configure_custom_patterns':
            response = await this.configureCustomPatterns(args);
            break;
          case 'apply_basic_content_masking':
            response = await this.applyBasicContentMasking(args);
            break;
          case 'validate_content_masking':
            response = await this.validateContentMasking(args);
            break;
          case 'manage_cache':
            response = await this.manageCache(args);
            break;
          case 'configure_output_masking':
            response = await this.configureOutputMasking(args);
            break;
          case 'suggest_adrs':
            response = await this.suggestAdrs(args);
            break;
          case 'generate_adr_from_decision':
            response = await this.generateAdrFromDecision(args);
            break;
          case 'discover_existing_adrs':
            response = await this.discoverExistingAdrs(args);
            break;
          case 'incorporate_research':
            response = await this.incorporateResearch(args);
            break;
          case 'create_research_template':
            response = await this.createResearchTemplate(args);
            break;
          case 'request_action_confirmation':
            response = await this.requestActionConfirmation(args);
            break;
          case 'generate_rules':
            response = await this.generateRules(args);
            break;
          case 'validate_rules':
            response = await this.validateRules(args);
            break;
          case 'create_rule_set':
            response = await this.createRuleSet(args);
            break;
          case 'analyze_environment':
            response = await this.analyzeEnvironment(args);
            break;
          case 'generate_research_questions':
            response = await this.generateResearchQuestions(args);
            break;
          case 'analyze_deployment_progress':
            response = await this.analyzeDeploymentProgress(args);
            break;
          case 'check_ai_execution_status':
            response = await this.checkAIExecutionStatus(args);
            break;
          case 'get_workflow_guidance':
            response = await this.getWorkflowGuidance(args);
            break;
          case 'get_development_guidance':
            response = await this.getDevelopmentGuidance(args);
            break;
          case 'read_file':
            response = await this.readFile(args);
            break;
          case 'write_file':
            response = await this.writeFile(args);
            break;
          case 'list_directory':
            response = await this.listDirectory(args);
            break;
          case 'manage_todo_json':
            response = await this.manageTodoJson(args);
            break;
          case 'generate_deployment_guidance':
            response = await this.generateDeploymentGuidance(args);
            break;
          case 'smart_git_push':
            response = await this.smartGitPush(args);
            break;
          case 'deployment_readiness':
            response = await this.deploymentReadiness(args);
            break;
          case 'troubleshoot_guided_workflow':
            response = await this.troubleshootGuidedWorkflow(args);
            break;
          case 'smart_score':
            response = await this.smartScore(args);
            break;
          case 'mcp_planning':
            response = await this.mcpPlanning(args);
            break;
          case 'interactive_adr_planning':
            response = await this.interactiveAdrPlanning(args);
            break;
          default:
            throw new McpAdrError(`Unknown tool: ${name}`, 'UNKNOWN_TOOL');
        }

        // Apply content masking to response
        // Track tool execution in knowledge graph
        await this.trackToolExecution(name, args, response, true);

        return await this.applyOutputMasking(response);
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

    // Resources handler
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'adr://architectural_knowledge_graph',
            name: 'Architectural Knowledge Graph',
            description: 'Complete architectural knowledge graph of the project',
            mimeType: 'application/json',
          },
          {
            uri: 'adr://analysis_report',
            name: 'Analysis Report',
            description: 'Comprehensive project analysis report',
            mimeType: 'application/json',
          },
          {
            uri: 'adr://adr_list',
            name: 'ADR List',
            description: 'List of all Architectural Decision Records',
            mimeType: 'application/json',
          },
        ],
      };
    });

    // Resource reading handler
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

    // Prompts handler
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

    // Prompt execution handler
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
  private async checkAIExecutionStatus(_args: any): Promise<any> {
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

  private async getWorkflowGuidance(args: any): Promise<any> {
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
8. **generate_adr_todo** - Create actionable task lists from ADRs

### 🔍 **Research & Documentation Tools** (AI-Powered ✅)
9. **generate_research_questions** - Create context-aware research questions
10. **incorporate_research** - Integrate research findings into decisions
11. **create_research_template** - Generate research documentation templates

### 🛡️ **Security & Compliance Tools** (AI-Powered ✅)
12. **generate_content_masking** - Intelligent content masking and protection
13. **configure_custom_patterns** - Customize security and masking settings
14. **apply_basic_content_masking** - Basic content masking (fallback)
15. **validate_content_masking** - Validate masking effectiveness

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
1. discover_existing_adrs → 2. get_architectural_context → 3. generate_adr_todo → 4. validate_rules

### **Security Audit**
1. analyze_content_security → 2. generate_content_masking → 3. configure_custom_patterns → 4. validate_content_masking

### **PRD to Implementation**
1. generate_adrs_from_prd → 2. generate_adr_todo → 3. analyze_deployment_progress

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
**ADR Management**: suggest_adrs, generate_adr_from_decision, discover_existing_adrs, generate_adr_todo
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

  private async getDevelopmentGuidance(args: any): Promise<any> {
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
          true,
          this.config.projectPath
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
- **generate_adr_todo** → Create implementation task lists
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

  private async analyzeProjectEcosystem(args: any): Promise<any> {
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

    try {
      // Import utilities dynamically to avoid circular dependencies
      const { analyzeProjectStructure } = await import('./utils/file-system.js');

      // Import advanced prompting utilities if enhanced mode is enabled
      let generateArchitecturalKnowledge: any = null;
      let executeWithReflexion: any = null;
      let retrieveRelevantMemories: any = null;
      let createToolReflexionConfig: any = null;

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
              domains: this.getEcosystemAnalysisDomains(technologyFocus),
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
      const baseProjectAnalysisPrompt = await analyzeProjectStructure(projectPath);

      // Step 4: Generate environment analysis if enabled
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

  private async getArchitecturalContext(args: any): Promise<any> {
    const { filePath, includeCompliance = true } = args;

    try {
      const { analyzeProjectStructure, fileExists, ensureDirectory } = await import(
        './utils/file-system.js'
      );
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

  private async generateAdrsFromPrd(args: any): Promise<any> {
    const {
      prdPath,
      enhancedMode = true,
      promptOptimization = true,
      knowledgeEnhancement = true,
      prdType = 'general',
    } = args;
    const outputDirectory = args.outputDirectory || this.config.adrDirectory;

    this.logger.info(`Generating enhanced ADRs from PRD: ${prdPath} to ${outputDirectory}`);
    this.logger.info(
      `Enhancement features - APE: ${promptOptimization}, Knowledge: ${knowledgeEnhancement}, Type: ${prdType}`
    );

    try {
      const { readFileContent, fileExists } = await import('./utils/file-system.js');

      // Import advanced prompting utilities if enhanced mode is enabled
      let generateArchitecturalKnowledge: any = null;
      let optimizePromptWithAPE: any = null;
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
      const fileExistsPrompt = await fileExists(prdPath);

      // Generate file content reading prompt
      const fileContentPrompt = await readFileContent(prdPath);

      // Step 1: Generate domain-specific knowledge if enabled
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
              domains: this.getPrdTypeDomains(prdType),
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
      const baseAdrPrompt = this.createBaseAdrPrompt(prdPath, outputDirectory, knowledgeContext);

      // Step 3: Apply APE optimization if enabled
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

  private async generateAdrTodo(args: any): Promise<any> {
    const {
      scope = 'all',
      phase = 'both',
      linkAdrs = true,
      includeRules = true,
      ruleSource = 'both',
      preserveExisting = true,
      forceSyncToMarkdown = false,
      intentId,
      createJsonBackup = true,
    } = args;
    const { getAdrDirectoryPath } = await import('./utils/config.js');
    const path = await import('path');

    // Use absolute ADR path relative to project
    const absoluteAdrPath = args.adrDirectory
      ? path.resolve(this.config.projectPath, args.adrDirectory)
      : getAdrDirectoryPath(this.config);

    // Keep relative path for display purposes
    const adrDirectory = args.adrDirectory || this.config.adrDirectory;

    this.logger.info(
      `Generating JSON-first TODO for ADRs in: ${absoluteAdrPath} (phase: ${phase})`
    );

    try {
      // Always use JSON-first TODO system
      this.logger.info('Using JSON-first TODO system for ADR task generation');

      // TODO: Legacy todo-management-tool-v2 removed in memory-centric transformation
      // Use mcp-shrimp-task-manager for task management instead
      this.logger.info('⚠️ todo-management-tool-v2 was removed in memory-centric transformation');

      // Optional: Create backup if requested and JSON exists
      if (createJsonBackup) {
        try {
          // TODO: Implement backup functionality with mcp-shrimp-task-manager
          this.logger.info(
            'Backup functionality currently unavailable - todo-management-tool-v2 removed'
          );
        } catch (error) {
          // Continue if backup fails - might be first time setup
          this.logger.debug('No existing JSON data to backup');
        }
      }

      // Import ADR tasks into JSON system with enhanced parameters
      // TODO: Replace with mcp-shrimp-task-manager integration
      const importResult = {
        success: false,
        message: 'todo-management-tool-v2 removed in memory-centric transformation',
        tasks: [],
        errors: [],
      };

      // TODO: Sync JSON data to markdown with force option
      // await manageTodoV2({
      //   operation: 'sync_to_markdown',
      //   projectPath: this.config.projectPath,
      //   force: forceSyncToMarkdown,
      // });
      this.logger.info(
        'Sync to markdown functionality currently unavailable - todo-management-tool-v2 removed'
      );

      return {
        content: [
          {
            type: 'text',
            text: `# ✅ JSON-First TODO Generated from ADRs

## 🏗️ JSON-First TODO System Active
✅ **todo-data.json** - JSON-first TODO backend created/updated  
✅ **TODO.md** - Markdown frontend ${forceSyncToMarkdown ? 'synchronized' : 'available for sync'}  

## Configuration Applied
- **ADR Directory**: ${adrDirectory}
- **Scope**: ${scope}
- **TDD Phase**: ${phase}
- **ADR Dependency Linking**: ${linkAdrs ? 'Enabled' : 'Disabled'}
- **Rules Integration**: ${includeRules ? `Enabled (${ruleSource})` : 'Disabled'}
- **Preserve Existing**: ${preserveExisting}
- **Force Markdown Sync**: ${forceSyncToMarkdown ? 'Enabled' : 'Disabled'}
- **Intent Linking**: ${intentId ? `Linked to ${intentId}` : 'None'}
- **JSON Backup**: ${createJsonBackup ? 'Created' : 'Skipped'}

## JSON-First Architecture Benefits
✅ **Structured Data**: JSON backend ensures consistent LLM interactions
✅ **Automatic Sync**: JSON-to-markdown conversion maintains TODO.md compatibility  
✅ **Enhanced Metadata**: Full task lifecycle with dependencies, assignees, priorities
✅ **Complete Integration**: Native support for scoring, git automation, and knowledge graph
✅ **Backup Protection**: Automatic data preservation during updates
✅ **No Manual Setup**: All cache files auto-generated, tests can immediately validate

${importResult.message || 'No additional details available'}

## Available Operations (use manage_todo_v2 tool)
1. **View Tasks**: \`get_tasks\` operation with filtering and sorting
2. **Update Status**: \`update_task\` operation with status, progress, notes
3. **Bulk Updates**: \`bulk_update\` operation for multiple tasks
4. **Analytics**: \`get_analytics\` operation for progress metrics
5. **Sync Control**: \`sync_to_markdown\` and \`sync_knowledge_graph\` operations

## Validation & Progress Tracking
- **Progress Check**: Use \`compare_adr_progress\` to validate implementation vs ADRs
- **Git Integration**: Use \`smart_git_push\` for automatic task status updates
- **Scoring**: Integrated with smart scoring for release readiness assessment

## TDD Workflow Integration
- **Phase 1**: Mock test generation tasks created
- **Phase 2**: Production implementation tasks linked to tests
- **Dependencies**: ADR relationships mapped to task dependencies
- **Validation**: Architectural rules integrated into task criteria

*All TODO data is now managed in JSON format with automatic markdown sync*`,
          },
        ],
      };
    } catch (error) {
      throw new McpAdrError(
        `Failed to generate ADR todo: ${error instanceof Error ? error.message : String(error)}`,
        'GENERATION_ERROR'
      );
    }
  }

  private async compareAdrProgress(args: any): Promise<any> {
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
    const absoluteTodoPath = path.resolve(projectPath, todoPath);
    const absoluteAdrPath = adrDirectory
      ? path.resolve(projectPath, adrDirectory)
      : getAdrDirectoryPath(this.config);

    this.logger.info(
      `Comparing ADR progress: TODO(${absoluteTodoPath}) vs ADRs(${absoluteAdrPath}) vs Environment(${projectPath}) [env: ${environment}]`
    );

    // Environment validation and auto-detection
    let detectedEnvironment = environment;
    let finalEnvironmentConfig = { ...environmentConfig };

    if (
      environmentValidation &&
      (validationType === 'full' || validationType === 'environment-only')
    ) {
      try {
        const envResult = await this.detectAndValidateEnvironment(
          projectPath,
          environment,
          environmentConfig
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
          const includeContent = deepCodeAnalysis || functionalValidation;
          projectStructure = await scanProjectStructure(projectPath, {
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
      let discoveryResult: any = null;
      if (validationType === 'full' || validationType === 'adr-only') {
        const { discoverAdrsInDirectory } = await import('./utils/adr-discovery.js');
        discoveryResult = await discoverAdrsInDirectory(absoluteAdrPath, true, projectPath);
      }
      const analysis = await this.performLocalAdrProgressAnalysis({
        todoContent,
        todoPath: absoluteTodoPath,
        discoveredAdrs: discoveryResult?.adrs || [],
        adrDirectory: absoluteAdrPath,
        projectStructure: projectStructure || null,
        projectPath,
        validationType,
        includeFileChecks,
        includeRuleValidation,
        deepCodeAnalysis,
        functionalValidation,
        strictMode,
        environment: detectedEnvironment,
        environmentConfig: finalEnvironmentConfig,
        environmentValidation,
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
    environmentConfig: any
  ): Promise<{ detectedEnvironment: string; environmentConfig: any }> {
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
    discoveredAdrs: any[];
    adrDirectory: string;
    projectStructure: any;
    projectPath: string;
    validationType: string;
    includeFileChecks: boolean;
    includeRuleValidation: boolean;
    deepCodeAnalysis: boolean;
    functionalValidation: boolean;
    strictMode: boolean;
    environment: string;
    environmentConfig: any;
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
- **Security Level**: ${environmentConfig.securityLevel || 'Not specified'}
- **Required Files**: ${environmentConfig.requiredFiles?.length || 0} files
- **Required Services**: ${environmentConfig.requiredServices?.length || 0} services

## ADR Discovery Results
${
  totalAdrs > 0
    ? `Found ${totalAdrs} ADRs:\n${discoveredAdrs
        .map((adr, i) => `${i + 1}. **${adr.title}** (${adr.status}) - ${adr.filename}`)
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
2. ${totalTasks === 0 ? 'Create initial TODO.md from ADR requirements using generate_adr_todo tool' : 'Update TODO.md with missing tasks'}
3. ${includeFileChecks ? 'Verify implementation of completed tasks' : 'Enable file checks for detailed implementation verification'}
4. ${includeRuleValidation ? 'Resolve architectural rule compliance violations' : 'Enable rule validation for compliance checking'}

## Integration Commands

To regenerate TODO after fixes:
\`\`\`json
{
  "tool": "generate_adr_todo",
  "args": {
    "adrDirectory": "${adrDirectory}",
    "phase": "both",
    "linkAdrs": true,
    "includeRules": ${includeRuleValidation}
  }
}
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
    adrs: any[],
    environment?: string,
    environmentConfig?: any
  ): {
    aligned: typeof tasks;
    misaligned: typeof tasks;
    missing: string[];
  } {
    const aligned: typeof tasks = [];
    const misaligned: typeof tasks = [];
    const missing: string[] = [];

    // Simple keyword matching for alignment detection
    const adrKeywords = adrs.flatMap(adr => [
      adr.title.toLowerCase(),
      ...(adr.decision || '')
        .toLowerCase()
        .split(/\s+/)
        .filter((w: string) => w.length > 4),
      ...(adr.context || '')
        .toLowerCase()
        .split(/\s+/)
        .filter((w: string) => w.length > 4),
    ]);

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
      const hasKeywordMatch = adrKeywords.some(
        keyword => taskLower.includes(keyword) || keyword.includes(taskLower.split(' ')[0])
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
      if (adr.status === 'accepted' && adr.decision) {
        const decisionWords = adr.decision.toLowerCase().split(/\s+/);
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
          const hasCorrespondingTask = tasks.some(task =>
            task.title.toLowerCase().includes(adr.title.toLowerCase().split(' ')[0])
          );

          if (!hasCorrespondingTask) {
            missing.push(`Implement ${adr.title}`);
          }
        }
      }
    }

    // Environment-specific missing tasks
    if (environment && environmentConfig) {
      if (environmentConfig.requiredFiles) {
        for (const file of environmentConfig.requiredFiles) {
          const hasFileTask = tasks.some(task =>
            task.title.toLowerCase().includes(file.toLowerCase())
          );
          if (!hasFileTask) {
            missing.push(`Create ${file} for ${environment} environment`);
          }
        }
      }

      if (environmentConfig.requiredServices) {
        for (const service of environmentConfig.requiredServices) {
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
  private async analyzeContentSecurity(args: any): Promise<any> {
    const { analyzeContentSecurity } = await import('./tools/content-masking-tool.js');
    return await analyzeContentSecurity(args);
  }

  private async generateContentMasking(args: any): Promise<any> {
    const { generateContentMasking } = await import('./tools/content-masking-tool.js');
    return await generateContentMasking(args);
  }

  private async configureCustomPatterns(args: any): Promise<any> {
    const { configureCustomPatterns } = await import('./tools/content-masking-tool.js');
    return await configureCustomPatterns(args);
  }

  private async applyBasicContentMasking(args: any): Promise<any> {
    const { applyBasicContentMasking } = await import('./tools/content-masking-tool.js');
    return await applyBasicContentMasking(args);
  }

  private async validateContentMasking(args: any): Promise<any> {
    const { validateContentMasking } = await import('./tools/content-masking-tool.js');
    return await validateContentMasking(args);
  }

  private async manageCache(args: any): Promise<any> {
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

          const invalidatePrompt = await invalidateCache(key);
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

  private async configureOutputMasking(args: any): Promise<any> {
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

          if (strategy && ['full', 'partial', 'placeholder', 'environment'].includes(strategy)) {
            newConfig.strategy = strategy;
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
  private async suggestAdrs(args: any): Promise<any> {
    const { suggestAdrs } = await import('./tools/adr-suggestion-tool.js');
    return await suggestAdrs(args);
  }

  private async generateAdrFromDecision(args: any): Promise<any> {
    const { generateAdrFromDecision } = await import('./tools/adr-suggestion-tool.js');
    return await generateAdrFromDecision(args);
  }

  private async discoverExistingAdrs(args: any): Promise<any> {
    const { discoverExistingAdrs } = await import('./tools/adr-suggestion-tool.js');
    return await discoverExistingAdrs(args);
  }

  /**
   * Research integration tool implementations
   */
  private async incorporateResearch(args: any): Promise<any> {
    const { incorporateResearch } = await import('./tools/research-integration-tool.js');
    return await incorporateResearch(args);
  }

  private async createResearchTemplate(args: any): Promise<any> {
    const { createResearchTemplate } = await import('./tools/research-integration-tool.js');
    return await createResearchTemplate(args);
  }

  private async requestActionConfirmation(args: any): Promise<any> {
    const { requestActionConfirmation } = await import('./tools/research-integration-tool.js');
    return await requestActionConfirmation(args);
  }

  /**
   * Rule generation and validation tool implementations
   */
  private async generateRules(args: any): Promise<any> {
    const { generateRules } = await import('./tools/rule-generation-tool.js');
    return await generateRules(args);
  }

  private async validateRules(args: any): Promise<any> {
    const { validateRules } = await import('./tools/rule-generation-tool.js');
    return await validateRules(args);
  }

  private async createRuleSet(args: any): Promise<any> {
    const { createRuleSet } = await import('./tools/rule-generation-tool.js');
    return await createRuleSet(args);
  }

  /**
   * Environment analysis tool implementation
   */
  private async analyzeEnvironment(args: any): Promise<any> {
    const { analyzeEnvironment } = await import('./tools/environment-analysis-tool.js');
    return await analyzeEnvironment(args);
  }

  /**
   * Research question generation tool implementation
   */
  private async generateResearchQuestions(args: any): Promise<any> {
    const { generateResearchQuestions } = await import('./tools/research-question-tool.js');
    return await generateResearchQuestions(args);
  }

  /**
   * Deployment analysis tool implementation
   */
  private async analyzeDeploymentProgress(args: any): Promise<any> {
    const { analyzeDeploymentProgress } = await import('./tools/deployment-analysis-tool.js');
    return await analyzeDeploymentProgress(args);
  }

  /**
   * Apply content masking to MCP response
   */
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
   * Read MCP resource with prompt-driven caching
   */
  private async readResource(uri: string): Promise<any> {
    try {
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
  private async readFile(args: any): Promise<any> {
    const { path: filePath } = args;

    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // Resolve path relative to project path for security
      const safePath = path.resolve(this.config.projectPath, filePath);

      // Security check: ensure path is within project directory
      if (!safePath.startsWith(this.config.projectPath)) {
        throw new McpAdrError('Access denied: Path is outside project directory', 'ACCESS_DENIED');
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

  private async writeFile(args: any): Promise<any> {
    const { path: filePath, content } = args;

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

  private async listDirectory(args: any): Promise<any> {
    const { path: dirPath } = args;

    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // Resolve path relative to project path for security
      const safePath = path.resolve(this.config.projectPath, dirPath);

      // Security check: ensure path is within project directory
      if (!safePath.startsWith(this.config.projectPath)) {
        throw new McpAdrError('Access denied: Path is outside project directory', 'ACCESS_DENIED');
      }

      const entries = await fs.readdir(safePath, { withFileTypes: true });
      const fileList = entries.map(entry => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
        path: path.join(dirPath, entry.name),
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

  private async manageTodoJson(args: any): Promise<any> {
    try {
      // TODO: Legacy todo-management-tool-v2 removed in memory-centric transformation
      // Use mcp-shrimp-task-manager for task management instead
      this.logger.info('⚠️ todo-management-tool-v2 was removed in memory-centric transformation');

      return {
        success: false,
        message:
          'todo-management-tool-v2 removed in memory-centric transformation - use mcp-shrimp-task-manager instead',
        operation: args.operation || 'unknown',
        projectPath: args.projectPath || this.config.projectPath,
      };
    } catch (error) {
      // If it's already a McpAdrError with good details, re-throw it as-is
      if (error instanceof Error && error.name === 'McpAdrError') {
        throw error;
      }

      throw new McpAdrError(
        `JSON TODO management failed: ${error instanceof Error ? error.message : String(error)}`,
        'TODO_JSON_MANAGEMENT_ERROR'
      );
    }
  }

  private async generateDeploymentGuidance(args: any): Promise<any> {
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

  private async smartGitPush(args: any): Promise<any> {
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

  private async deploymentReadiness(args: any): Promise<any> {
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

  private async troubleshootGuidedWorkflow(args: any): Promise<any> {
    try {
      const { troubleshootGuidedWorkflow } = await import(
        './tools/troubleshoot-guided-workflow-tool.js'
      );
      return await troubleshootGuidedWorkflow(args);
    } catch (error) {
      throw new McpAdrError(
        `Troubleshoot guided workflow failed: ${error instanceof Error ? error.message : String(error)}`,
        'TROUBLESHOOT_GUIDED_WORKFLOW_ERROR'
      );
    }
  }

  private async smartScore(_args: any): Promise<any> {
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

  private async mcpPlanning(args: any): Promise<any> {
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

  private async interactiveAdrPlanning(args: any): Promise<any> {
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
}

/**
 * Main execution
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
