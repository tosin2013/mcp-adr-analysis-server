/**
 * Canonical MCP tool schemas (#1416).
 *
 * ListTools, CallTool dispatch, and the catalog all read this array.
 */
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { CONVERSATION_CONTEXT_SCHEMA } from '../types/conversation-context.js';

export function getSearchToolsDefinition(): Tool {
  return {
    name: 'search_tools',
    description:
      '[DEPRECATED host-native, ADR-023] Search and discover available tools by category, keyword, or capability. Use this to find the right tool for a task without loading all tool schemas. Returns lightweight tool metadata by default; use includeSchema:true for full schemas.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: [
            'analysis',
            'adr',
            'content-security',
            'research',
            'deployment',
            'memory',
            'file-system',
            'rules',
            'workflow',
            'utility',
          ],
          description: 'Filter tools by category',
        },
        query: {
          type: 'string',
          description: 'Search query to match tool names, descriptions, and keywords',
        },
        complexity: {
          type: 'string',
          enum: ['simple', 'moderate', 'complex'],
          description: 'Filter by tool complexity level',
        },
        cemcpOnly: {
          type: 'boolean',
          description: 'Only return tools with CE-MCP directive support (more token-efficient)',
          default: false,
        },
        includeSchema: {
          type: 'boolean',
          description: 'Include full input schemas in response (increases token count)',
          default: false,
        },
        limit: {
          type: 'number',
          description: 'Maximum number of tools to return',
          default: 20,
        },
      },
    },
  };
}

export const MCP_TOOL_SCHEMAS: Tool[] = [
  // search_tools removed from wire — spec assigns to host, ADR-023 (#1673)
  {
    name: 'analyze_project_ecosystem',
    description:
      'Comprehensive recursive project ecosystem analysis with advanced prompting techniques (Knowledge Generation + Reflexion)',
    annotations: {
      title: 'Analyze Project Ecosystem',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
          description: 'Enable advanced prompting features (Knowledge Generation + Reflexion)',
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
          description: 'Specific technologies to focus analysis on (auto-detected if not provided)',
        },
        analysisDepth: {
          type: 'string',
          enum: ['basic', 'detailed', 'comprehensive'],
          description: 'Depth of ecosystem analysis',
          default: 'comprehensive',
        },
        includeEnvironment: {
          type: 'boolean',
          description: 'Automatically include comprehensive environment analysis (default: true)',
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
      },
      required: [],
    },
  },
  {
    name: 'get_architectural_context',
    description:
      'Get detailed architectural context for specific files or the entire project, automatically sets up ADR infrastructure if missing, and provides outcome-focused workflow for project success',
    annotations: {
      title: 'Get Architectural Context',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
      },
    },
  },
  {
    name: 'generate_adrs_from_prd',
    description:
      'Generate Architectural Decision Records from a Product Requirements Document with advanced prompting techniques (APE + Knowledge Generation)',
    annotations: {
      title: 'Generate ADRs from PRD',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
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
      },
      required: ['prdPath'],
    },
  },
  {
    name: 'compare_adr_progress',
    description:
      'Compare TODO.md progress against ADRs and current environment to validate implementation status',
    annotations: {
      title: 'Compare ADR Progress',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
    annotations: {
      title: 'Analyze Content Security',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
          description: 'Enable Generated Knowledge Prompting for security and privacy expertise',
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
    annotations: {
      title: 'Generate Content Masking',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
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
    annotations: {
      title: 'Configure Custom Patterns',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
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
    annotations: {
      title: 'Apply Basic Content Masking',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
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
    annotations: {
      title: 'Validate Content Masking',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
    annotations: {
      title: 'Manage Cache',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
    annotations: {
      title: 'Configure Output Masking',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
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
    annotations: {
      title: 'Suggest ADRs',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
          description: 'Enable advanced prompting features (Knowledge Generation + Reflexion)',
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
    annotations: {
      title: 'Generate ADR from Decision',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
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
    annotations: {
      title: 'Generate ADR Bootstrap',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
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
      },
    },
  },
  {
    name: 'bootstrap_validation_loop',
    description:
      '**GUIDED EXECUTION MODE**: This tool guides you through an interactive, step-by-step deployment validation workflow. It does NOT execute commands internally - instead, it tells YOU what commands to run and processes the results iteratively. **Workflow**: (1) First call with iteration=0: Detects platform (OpenShift/K8s/Docker), validates environment connection, and requests human approval for target platform. (2) Subsequent calls: After running each command and reporting back with output, the tool provides next steps. **Environment Validation**: Before deployment, the tool verifies connection to the target platform (e.g., `oc status` for OpenShift, `kubectl cluster-info` for K8s) and requires explicit human confirmation. **Validated Patterns Integration**: Automatically identifies base code repositories (e.g., validatedpatterns/common for OpenShift) and guides you to merge them into your project. **Deployment Cleanup**: Supports CI/CD-style workflows with deployment teardown/restart guidance. **Call this tool iteratively**, passing previous command output back each time.',
    annotations: {
      title: 'Bootstrap Validation Loop',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
        appSelector: {
          type: 'string',
          description:
            'Label selector scoping every destructive teardown command, e.g. "app=checkout-api". Required before any kubectl/oc delete is offered — the tool will not guess a selector, and without this it returns discovery instructions instead of a delete.',
        },
      },
    },
  },
  {
    name: 'discover_existing_adrs',
    description: 'Discover and catalog existing ADRs in the project',
    annotations: {
      title: 'Discover Existing ADRs',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
    annotations: {
      title: 'Analyze ADR Timeline',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
          description: 'Threshold profile for action generation (auto-detected if not specified)',
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
    annotations: {
      title: 'Review Existing ADRs',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
      },
    },
  },
  {
    name: 'validate_adr',
    description:
      'Validate an existing ADR against actual infrastructure reality using research-driven analysis. TIP: Compare findings against patterns in @.mcp-server-context.md for consistency checks.',
    annotations: {
      title: 'Validate ADR',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
    annotations: {
      title: 'Validate All ADRs',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
    annotations: {
      title: 'Incorporate Research',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
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
    annotations: {
      title: 'Create Research Template',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
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
    annotations: {
      title: 'Request Action Confirmation',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
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
    annotations: {
      title: 'Generate Rules',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
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
    annotations: {
      title: 'Validate Rules',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
    annotations: {
      title: 'Create Rule Set',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
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
    annotations: {
      title: 'Analyze Environment',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
          enum: ['specs', 'containerization', 'requirements', 'compliance', 'comprehensive'],
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
          description: 'Enable analysis of environment changes over time using stored snapshots',
          default: true,
        },
      },
    },
  },
  {
    name: 'generate_research_questions',
    description: 'Generate context-aware research questions and create research tracking system',
    annotations: {
      title: 'Generate Research Questions',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
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
          description: 'Problems to correlate with project session/tool-usage state',
        },
        knowledgeGraph: {
          type: 'object',
          properties: {
            technologies: { type: 'array', items: { type: 'object' } },
            patterns: { type: 'array', items: { type: 'object' } },
            adrs: { type: 'array', items: { type: 'object' } },
            relationships: { type: 'array', items: { type: 'object' } },
          },
          description: 'Project session state (intents, tool usage, ADR registrations)',
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
      'Perform research using cascading sources: project files → session/tool-usage tracker → environment resources → web search (fallback)',
    annotations: {
      title: 'Perform Research',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
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
        researchDirectory: {
          type: 'string',
          description:
            'Directory the research document is written to. Previously unset and unsettable: output went to docs/context/research/ regardless (#1528).',
          default: 'docs/research',
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
    name: 'search_codebase',
    description:
      'Atomic tool for searching codebase files based on query patterns. Returns raw file matches with relevance scores. Extracted from ResearchOrchestrator per ADR-018.',
    annotations: {
      title: 'Search Codebase',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "Docker configuration", "authentication")',
        },
        projectPath: {
          type: 'string',
          description: 'Path to project root',
          default: '.',
        },
        scope: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional file scope patterns (e.g., ["src/**", "config/**"])',
        },
        includeContent: {
          type: 'boolean',
          description: 'Include file content in results',
          default: false,
        },
        maxFiles: {
          type: 'number',
          description: 'Maximum files to return',
          default: 20,
          minimum: 1,
          maximum: 100,
        },
        enableTreeSitter: {
          type: 'boolean',
          description: 'Use tree-sitter for enhanced analysis',
          default: true,
        },
        relevanceThreshold: {
          type: 'number',
          description: 'Minimum relevance threshold (0-1)',
          default: 0.2,
          minimum: 0,
          maximum: 1,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'analyze_deployment_progress',
    description: 'Analyze deployment progress and verify completion with outcome rules',
    annotations: {
      title: 'Analyze Deployment Progress',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
  // check_ai_execution_status removed — dies with AI layer, ADR-023 (#1673)
  {
    name: 'get_workflow_guidance',
    description:
      'Get intelligent workflow guidance and tool recommendations based on your goals and project context to achieve expected outcomes efficiently',
    annotations: {
      title: 'Get Workflow Guidance',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
          enum: ['quick_analysis', 'thorough_review', 'comprehensive_audit', 'ongoing_process'],
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
    annotations: {
      title: 'Get Development Guidance',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
          description: 'List of ADR titles or file paths that need to be implemented in code',
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
  // Host-native tools removed: list_roots, read_directory, read_file,
  // write_file, list_directory — ADR-023 Phase 0 (#1673)
  {
    name: 'generate_deployment_guidance',
    description:
      'Generate deployment guidance and instructions from ADRs with environment-specific configurations',
    annotations: {
      title: 'Generate Deployment Guidance',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
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
          description: 'Project root path (optional, uses configured PROJECT_PATH if not provided)',
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
    annotations: {
      title: 'Smart Git Push',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      properties: {
        branch: {
          type: 'string',
          description: 'Target branch for push (optional, uses current branch if not specified)',
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
    annotations: {
      title: 'Check Deployment Readiness',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
          description: 'Business justification for overrides (required for emergency_override)',
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
    name: 'release_tracking',
    description:
      'Track releases mapped to ADR decisions. Generates changelogs, manages milestones, compares releases, and assesses release readiness. Supports greenfield and brownfield projects. Writes CHANGELOG.md, creates GitHub Releases and Milestones.',
    annotations: {
      title: 'Track Releases',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: [
            'detect_releases',
            'track_release',
            'generate_changelog',
            'compare_releases',
            'release_summary',
            'next_release_preview',
            'create_milestone',
            'sync_milestones',
            'push_local_milestones',
          ],
          description: 'Operation to perform',
        },
        projectPath: {
          type: 'string',
          description: 'Project root path (defaults to current working directory)',
        },
        version: {
          type: 'string',
          description: 'Release version to track (e.g., v2.3.0)',
        },
        compareFrom: {
          type: 'string',
          description: 'Starting version for comparison',
        },
        compareTo: {
          type: 'string',
          description: 'Ending version for comparison',
        },
        format: {
          type: 'string',
          enum: ['markdown', 'keep-a-changelog', 'conventional'],
          default: 'keep-a-changelog',
          description: 'Changelog output format',
        },
        includeAdrLinks: {
          type: 'boolean',
          default: true,
          description: 'Include ADR references in changelog',
        },
        includeCommitHashes: {
          type: 'boolean',
          default: false,
          description: 'Include commit hashes in output',
        },
        groupByAdr: {
          type: 'boolean',
          default: false,
          description: 'Group changelog entries by ADR',
        },
        writeToFile: {
          type: 'boolean',
          default: false,
          description: 'Write CHANGELOG.md to repo',
        },
        includeReadiness: {
          type: 'boolean',
          default: true,
          description: 'Include release readiness score',
        },
        includeTimeline: {
          type: 'boolean',
          default: true,
          description: 'Include mermaid timeline diagram',
        },
        milestoneTitle: {
          type: 'string',
          description: 'GitHub milestone title (for create_milestone)',
        },
        milestoneDescription: {
          type: 'string',
          description: 'GitHub milestone description',
        },
        milestoneDueDate: {
          type: 'string',
          description: 'Milestone due date (YYYY-MM-DD)',
        },
        createGithubRelease: {
          type: 'boolean',
          default: false,
          description: 'Create a GitHub Release (requires gh CLI)',
        },
        syncGithubMilestones: {
          type: 'boolean',
          default: false,
          description: 'Sync milestones to GitHub (requires gh CLI)',
        },
        updateTodo: {
          type: 'boolean',
          default: false,
          description: 'Update TODO.md with milestone status',
        },
        localOnly: {
          type: 'boolean',
          default: false,
          description:
            'For create_milestone: persist locally instead of calling gh CLI. Useful when gh auth is unavailable.',
        },
        writeReleasePlan: {
          type: 'boolean',
          default: false,
          description:
            'For create_milestone/push_local_milestones: also render local milestones into RELEASE_PLAN.md (bounded section).',
        },
        releasePlanPath: {
          type: 'string',
          default: 'RELEASE_PLAN.md',
          description: 'Path to RELEASE_PLAN.md (relative to projectPath).',
        },
      },
      required: ['operation'],
    },
  },
  {
    name: 'generate_adr_todo',
    description:
      'Generate TODO.md from ADRs with comprehensive task breakdown. Decomposes each ADR into paired test+production tasks (TDD), links tasks to release milestones, and preserves manual edits via a bounded HTML-comment section. Re-runs are idempotent; tasks for deleted/superseded ADRs move to a Stale Tasks section.',
    annotations: {
      title: 'Generate ADR Todo',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      properties: {
        adrDirectory: {
          type: 'string',
          default: 'docs/adrs',
          description: 'Directory containing ADR files (relative to projectPath)',
        },
        scope: {
          type: 'string',
          enum: ['all', 'pending', 'accepted'],
          default: 'pending',
          description: 'Which ADRs to decompose: all, pending (proposed/draft), or accepted only',
        },
        projectPath: {
          type: 'string',
          description: 'Project root path (defaults to current working directory)',
        },
        todoPath: {
          type: 'string',
          default: 'TODO.md',
          description: 'Output TODO file (relative to projectPath)',
        },
        phase: {
          type: 'string',
          enum: ['both', 'test', 'production'],
          default: 'both',
          description:
            'TDD pairing — "both" emits paired test+production tasks (default), "production" or "test" narrows output',
        },
        linkToMilestones: {
          type: 'boolean',
          default: true,
          description: 'Link generated tasks to release milestones (local + GitHub merged)',
        },
        dryRun: {
          type: 'boolean',
          default: false,
          description: 'Compute changes but do not write TODO.md (preview only)',
        },
      },
      required: [],
    },
  },
  {
    name: 'troubleshoot_guided_workflow',
    description:
      'Structured failure analysis and test plan generation with memory integration for troubleshooting session tracking and intelligent ADR/research suggestion capabilities - provide JSON failure info to get specific test commands',
    annotations: {
      title: 'Troubleshoot Guided Workflow',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
          description: 'Enable automatic research question generation for persistent problems',
          default: true,
        },
      },
      required: ['operation'],
    },
  },
  {
    name: 'smart_score',
    description:
      'Central coordination for project health scoring system - recalculate, sync, diagnose, optimize, and reset scores across all MCP tools',
    annotations: {
      title: 'Smart Score',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
          description: 'Validate data freshness across tools (for diagnose_scores operation)',
        },
        suggestImprovements: {
          type: 'boolean',
          default: true,
          description: 'Provide score improvement suggestions (for diagnose_scores operation)',
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
          description: 'Intent ID to get score trends for (for get_intent_scores operation)',
        },
      },
      required: ['operation', 'projectPath'],
    },
  },
  {
    name: 'mcp_planning',
    description:
      'Enhanced project planning and workflow management tool - phase-based project management, team resource allocation, progress tracking, risk analysis, and executive reporting',
    annotations: {
      title: 'MCP Planning',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
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
    annotations: {
      title: 'Interactive ADR Planning',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
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
          description: 'Planning session ID (required for all operations except start_session)',
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
    annotations: {
      title: 'Load Memory',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
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
    annotations: {
      title: 'Expand Analysis Section',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
    annotations: {
      title: 'Tool Chain Orchestrator',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
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
    annotations: {
      title: 'Expand Memory',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
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
          description: 'Include related conversation context and session/tool-usage state',
          default: true,
        },
      },
      required: ['expandableId'],
    },
  },
  {
    name: 'query_conversation_history',
    description: 'Phase 3: Search and retrieve conversation sessions based on filters',
    annotations: {
      title: 'Query Conversation History',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
    description: 'Phase 3: Get current conversation context snapshot for resumption or analysis',
    annotations: {
      title: 'Get Conversation Snapshot',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
    annotations: {
      title: 'Get Memory Stats',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'update_knowledge',
    description:
      'ADR-018: Simple CRUD operations for project session state. Not a graph database — keyword retrieval over local JSON snapshots. Add/remove entities (intents, ADRs, tools, code) and relationships. Use knowledge://graph resource to read current state (zero token cost).',
    annotations: {
      title: 'Update Knowledge',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['add_entity', 'remove_entity', 'add_relationship', 'remove_relationship'],
          description: 'Type of operation to perform on project session state',
        },
        entity: {
          type: 'string',
          description: 'Entity ID (for add_entity/remove_entity operations)',
        },
        entityType: {
          type: 'string',
          enum: ['intent', 'adr', 'code', 'tool', 'decision'],
          description: 'Type of entity (required for add_entity operation)',
        },
        relationship: {
          type: 'string',
          enum: ['implements', 'uses', 'created', 'depends-on', 'supersedes'],
          description: 'Relationship type (for add_relationship/remove_relationship)',
        },
        source: {
          type: 'string',
          description: 'Source node ID (for relationship operations)',
        },
        target: {
          type: 'string',
          description: 'Target node ID (for relationship operations)',
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata for the entity or relationship',
          additionalProperties: true,
        },
      },
      required: ['operation'],
    },
  },
  {
    name: 'get_server_context',
    description:
      "Generate a comprehensive context file showing the server's current state, memory, and capabilities. Creates .mcp-server-context.md that can be @ referenced in conversations for instant LLM awareness",
    annotations: {
      title: 'Get Server Context',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
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
  // get_current_datetime removed — host-native, ADR-023 (#1673)
  // Session management tool for dynamic project switching
  {
    name: 'set_project_path',
    description:
      'Dynamically set the active project path for the current session. Call this at the start of a session to switch between projects without restarting the server or modifying environment variables. All subsequent tool calls will use this path as the default.',
    annotations: {
      title: 'Set Project Path',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path to the project directory. Must be an existing directory.',
        },
        validatePath: {
          type: 'boolean',
          description:
            'Whether to validate that the path exists and is a directory (default: true)',
          default: true,
        },
      },
      required: ['path'],
    },
  },
  // load_prompt removed — spec assigns to host, ADR-023 (#1673)
  // ADR Aggregator Integration Tools (https://adraggregator.com)
  {
    name: 'sync_to_aggregator',
    description:
      'Sync ADRs to ADR Aggregator platform (https://adraggregator.com) for centralized tracking, visualization, and team collaboration. Supports incremental and full sync modes with optional metadata.',
    annotations: {
      title: 'Sync to Aggregator',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: 'object',
      properties: {
        full_sync: {
          type: 'boolean',
          description: 'Replace all ADRs instead of incremental sync',
          default: false,
        },
        include_metadata: {
          type: 'boolean',
          description: 'Include analysis metadata in sync',
          default: true,
        },
        include_diagrams: {
          type: 'boolean',
          description: 'Include Mermaid diagrams (Pro+ tier)',
          default: false,
        },
        include_timeline: {
          type: 'boolean',
          description: 'Include timeline/staleness data',
          default: false,
        },
        include_security_scan: {
          type: 'boolean',
          description: 'Include security scan results',
          default: false,
        },
        include_code_links: {
          type: 'boolean',
          description: 'Include AST-based code links (Pro+ tier)',
          default: false,
        },
        adr_paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific ADR paths to sync (syncs all if not provided)',
        },
        projectPath: {
          type: 'string',
          description: 'Project path (defaults to PROJECT_PATH)',
        },
      },
    },
  },
  {
    name: 'get_adr_context',
    description:
      'Fetch ADR context from ADR Aggregator including summaries, diagrams, timeline data, and code links. Useful for getting a consolidated view of architectural decisions.',
    annotations: {
      title: 'Get ADR Context',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: 'object',
      properties: {
        include_diagrams: {
          type: 'boolean',
          description: 'Include Mermaid diagrams (Pro+ tier)',
          default: false,
        },
        include_timeline: {
          type: 'boolean',
          description: 'Include timeline data',
          default: true,
        },
        include_code_links: {
          type: 'boolean',
          description: 'Include code links (Pro+ tier)',
          default: false,
        },
        include_research: {
          type: 'boolean',
          description: 'Include research context (Pro+ tier)',
          default: false,
        },
        staleness_filter: {
          type: 'string',
          enum: ['all', 'fresh', 'stale', 'very_stale'],
          description: 'Filter by staleness level',
          default: 'all',
        },
        graph_depth: {
          type: 'number',
          description: 'Knowledge graph depth (Team tier)',
          minimum: 1,
          maximum: 5,
        },
        projectPath: {
          type: 'string',
          description: 'Project path (defaults to PROJECT_PATH)',
        },
      },
    },
  },
  {
    name: 'get_staleness_report',
    description:
      'Get ADR staleness report from ADR Aggregator with review compliance metrics. Identifies stale ADRs that need attention and provides governance insights.',
    annotations: {
      title: 'Get Staleness Report',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: 'object',
      properties: {
        threshold: {
          type: 'number',
          description: 'Days threshold for staleness',
          default: 90,
        },
        projectPath: {
          type: 'string',
          description: 'Project path (defaults to PROJECT_PATH)',
        },
      },
    },
  },
  {
    name: 'get_adr_templates',
    description:
      'Get domain-specific ADR templates and anti-patterns from ADR Aggregator. Includes best practices for web applications, microservices, APIs, and more. No authentication required.',
    annotations: {
      title: 'Get ADR Templates',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Domain filter (web_application, microservices, api, data_platform, etc.)',
        },
      },
    },
  },
  {
    name: 'get_adr_diagrams',
    description:
      'Get Mermaid diagrams for ADRs from ADR Aggregator. Includes workflow, relationship, and impact diagrams. Requires Pro+ tier.',
    annotations: {
      title: 'Get ADR Diagrams',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: 'object',
      properties: {
        adr_path: {
          type: 'string',
          description: 'Specific ADR path (returns all if not specified)',
        },
        projectPath: {
          type: 'string',
          description: 'Project path (defaults to PROJECT_PATH)',
        },
      },
    },
  },
  {
    name: 'validate_adr_compliance',
    description:
      'Validate ADR compliance against implementation via ADR Aggregator. Checks that code actually implements documented decisions. Requires Pro+ tier.',
    annotations: {
      title: 'Validate ADR Compliance',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: 'object',
      properties: {
        adr_paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific ADR paths to validate',
        },
        validation_type: {
          type: 'string',
          enum: ['implementation', 'architecture', 'security', 'all'],
          description: 'Type of validation to perform',
          default: 'all',
        },
        projectPath: {
          type: 'string',
          description: 'Project path (defaults to PROJECT_PATH)',
        },
      },
    },
  },
  {
    name: 'get_knowledge_graph',
    description:
      'Get cross-repository knowledge graph from ADR Aggregator with analytics and insights. Visualize ADR relationships across repositories. Requires Team tier.',
    annotations: {
      title: 'Get Knowledge Graph',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          enum: ['repository', 'organization'],
          description: 'Scope of the graph',
          default: 'repository',
        },
        include_analytics: {
          type: 'boolean',
          description: 'Include graph analytics and insights',
          default: true,
        },
        projectPath: {
          type: 'string',
          description: 'Project path (defaults to PROJECT_PATH)',
        },
      },
    },
  },
  {
    name: 'update_implementation_status',
    description:
      'Update the implementation status of synced ADRs directly from the IDE. Supports statuses: not_started, in_progress, implemented, deprecated, blocked. Requires Pro+ tier.',
    annotations: {
      title: 'Update Implementation Status',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      type: 'object',
      properties: {
        updates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              adr_path: {
                type: 'string',
                description: 'Path to the ADR file relative to project root',
              },
              implementation_status: {
                type: 'string',
                enum: ['not_started', 'in_progress', 'implemented', 'deprecated', 'blocked'],
                description: 'New implementation status',
              },
              notes: {
                type: 'string',
                description: 'Optional notes about the status change',
              },
            },
            required: ['adr_path', 'implementation_status'],
          },
          description: 'Array of ADR status updates to apply',
        },
        projectPath: {
          type: 'string',
          description: 'Project path (defaults to PROJECT_PATH)',
        },
      },
      required: ['updates'],
    },
  },
  {
    name: 'get_adr_priorities',
    description:
      'Get ADR priorities for roadmap and backlog planning from ADR Aggregator. Returns prioritized ADRs with scores, dependencies, blockers, implementation status, and gap counts.',
    annotations: {
      title: 'Get ADR Priorities',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
      type: 'object',
      properties: {
        include_ai: {
          type: 'boolean',
          description: 'Include AI-based priority recommendations',
          default: false,
        },
        projectPath: {
          type: 'string',
          description: 'Project path (defaults to PROJECT_PATH)',
        },
      },
    },
  },
  {
    name: 'analyze_gaps',
    description:
      'Scan local codebase and compare with ADRs to detect bi-directional gaps. Finds: (1) ADR-to-code gaps: file references in ADRs that do not exist, (2) Code-to-ADR gaps: technologies in package.json and architectural patterns without ADR coverage. Reports gaps to ADR Aggregator for tracking.',
    annotations: {
      title: 'Analyze Gaps',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Project path (defaults to PROJECT_PATH)',
        },
        reportToAggregator: {
          type: 'boolean',
          description: 'Whether to report gaps to ADR Aggregator',
          default: true,
        },
        includeDismissed: {
          type: 'boolean',
          description: 'Include previously dismissed gaps in analysis',
          default: false,
        },
        scanDirectories: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific directories to scan (defaults to src, lib, app, packages)',
        },
        includePatterns: {
          type: 'array',
          items: { type: 'string' },
          description: 'File patterns to include in scan (regex)',
        },
        excludePatterns: {
          type: 'array',
          items: { type: 'string' },
          description: 'File patterns to exclude from scan (regex)',
        },
      },
    },
  },
  {
    name: 'get_gaps',
    description:
      'Get current code gaps from ADR Aggregator. Returns gaps with their status (open, dismissed, resolved) for tracking and management.',
    annotations: {
      title: 'Get Gaps',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Project path (defaults to PROJECT_PATH)',
        },
        includeDismissed: {
          type: 'boolean',
          description: 'Include dismissed gaps',
          default: false,
        },
        includeResolved: {
          type: 'boolean',
          description: 'Include resolved gaps',
          default: false,
        },
      },
    },
  },
];
