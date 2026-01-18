/**
 * Tool Catalog - Dynamic Tool Discovery System
 *
 * This module provides a centralized registry of all MCP tools with metadata
 * for dynamic discovery, categorization, and token-efficient listing.
 *
 * @see ADR-014: CE-MCP Architecture (Phase 3)
 * @see docs/IMPLEMENTATION-PLAN.md
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Tool category for organization and filtering
 */
export type ToolCategory =
  | 'analysis'
  | 'adr'
  | 'aggregator'
  | 'content-security'
  | 'research'
  | 'deployment'
  | 'memory'
  | 'file-system'
  | 'rules'
  | 'workflow'
  | 'utility';

/**
 * Tool complexity level for filtering
 */
export type ToolComplexity = 'simple' | 'moderate' | 'complex';

/**
 * Extended tool metadata for catalog
 */
export interface ToolMetadata {
  /** Tool name (unique identifier) */
  name: string;

  /** Short description (max 100 chars) for listing */
  shortDescription: string;

  /** Full description for detailed view */
  fullDescription: string;

  /** Tool category for filtering */
  category: ToolCategory;

  /** Complexity level */
  complexity: ToolComplexity;

  /** Estimated token cost range */
  tokenCost: {
    min: number;
    max: number;
  };

  /** Whether CE-MCP directive is available */
  hasCEMCPDirective: boolean;

  /** Related tools (by name) */
  relatedTools: string[];

  /** Keywords for search */
  keywords: string[];

  /** Whether tool requires AI execution */
  requiresAI: boolean;

  /** Input schema (full MCP Tool inputSchema) */
  inputSchema: Tool['inputSchema'];
}

/**
 * Catalog entry with computed properties
 */
export interface CatalogEntry extends ToolMetadata {
  /** Computed: is this a high-token-cost tool? */
  isHighTokenCost: boolean;

  /** Computed: search score (populated during search) */
  searchScore?: number;
}

/**
 * Search options for tool discovery
 */
export interface ToolSearchOptions {
  /** Filter by category */
  category?: ToolCategory;

  /** Search query (matches name, description, keywords) */
  query?: string;

  /** Filter by complexity */
  complexity?: ToolComplexity;

  /** Only tools with CE-MCP directives */
  cemcpOnly?: boolean;

  /** Maximum results */
  limit?: number;

  /** Include full input schema in results */
  includeSchema?: boolean;
}

/**
 * Search result with relevance scoring
 */
export interface ToolSearchResult {
  tools: CatalogEntry[];
  totalCount: number;
  categories: Record<ToolCategory, number>;
  query?: string;
}

/**
 * Tool Catalog Registry
 *
 * Central registry of all tools with metadata for dynamic discovery.
 * Tools are organized by category and include search-friendly metadata.
 */
export const TOOL_CATALOG: Map<string, ToolMetadata> = new Map();

// ============================================================================
// ANALYSIS & DISCOVERY TOOLS
// ============================================================================

TOOL_CATALOG.set('analyze_project_ecosystem', {
  name: 'analyze_project_ecosystem',
  shortDescription: 'Comprehensive project analysis with architectural insights',
  fullDescription:
    'Analyzes the entire project ecosystem including structure, dependencies, architecture patterns, and provides actionable recommendations. Supports knowledge enhancement and reflexion learning.',
  category: 'analysis',
  complexity: 'complex',
  tokenCost: { min: 8000, max: 15000 },
  hasCEMCPDirective: true,
  relatedTools: ['get_architectural_context', 'analyze_environment', 'smart_score'],
  keywords: ['project', 'analysis', 'architecture', 'ecosystem', 'comprehensive'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { type: 'string', description: 'Path to the project to analyze' },
      analysisDepth: {
        type: 'string',
        enum: ['basic', 'standard', 'comprehensive'],
        default: 'comprehensive',
      },
      includeEnvironment: { type: 'boolean', default: true },
      knowledgeEnhancement: { type: 'boolean', default: true },
      learningEnabled: { type: 'boolean', default: true },
      technologyFocus: { type: 'array', items: { type: 'string' } },
      analysisScope: { type: 'array', items: { type: 'string' } },
    },
    required: ['projectPath'],
  },
});

TOOL_CATALOG.set('get_architectural_context', {
  name: 'get_architectural_context',
  shortDescription: 'Retrieve architectural context and knowledge graph',
  fullDescription:
    'Retrieves the current architectural context including knowledge graph relationships, ADR decisions, and technology mappings.',
  category: 'analysis',
  complexity: 'moderate',
  tokenCost: { min: 2000, max: 5000 },
  hasCEMCPDirective: true, // Phase 4.3: Moderate tool - context assembly
  relatedTools: ['analyze_project_ecosystem', 'discover_existing_adrs'],
  keywords: ['architecture', 'context', 'knowledge', 'graph'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      includeGraph: { type: 'boolean', default: true },
      includeMetrics: { type: 'boolean', default: false },
    },
  },
});

TOOL_CATALOG.set('analyze_environment', {
  name: 'analyze_environment',
  shortDescription: 'Analyze deployment environment configuration',
  fullDescription:
    'Analyzes the deployment environment including containerization, CI/CD, cloud services, and infrastructure patterns.',
  category: 'analysis',
  complexity: 'moderate',
  tokenCost: { min: 2000, max: 4000 },
  hasCEMCPDirective: true,
  relatedTools: ['deployment_readiness', 'analyze_deployment_progress'],
  keywords: ['environment', 'deployment', 'infrastructure', 'container', 'ci/cd'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { type: 'string', description: 'Path to the project' },
      includeContainerization: { type: 'boolean', default: true },
      includeCICD: { type: 'boolean', default: true },
      includeCloudServices: { type: 'boolean', default: true },
    },
    required: ['projectPath'],
  },
});

TOOL_CATALOG.set('smart_score', {
  name: 'smart_score',
  shortDescription: 'Calculate code quality and architecture scores',
  fullDescription:
    'Analyzes code quality metrics, architectural patterns, and best practices to generate comprehensive scoring.',
  category: 'analysis',
  complexity: 'moderate',
  tokenCost: { min: 3000, max: 6000 },
  hasCEMCPDirective: true, // Phase 4.2: CE-MCP directive added
  relatedTools: ['analyze_project_ecosystem', 'validate_all_adrs'],
  keywords: ['score', 'quality', 'metrics', 'analysis'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { type: 'string' },
      includeDetails: { type: 'boolean', default: true },
    },
    required: ['projectPath'],
  },
});

// ============================================================================
// ADR MANAGEMENT TOOLS
// ============================================================================

TOOL_CATALOG.set('suggest_adrs', {
  name: 'suggest_adrs',
  shortDescription: 'Generate ADR suggestions based on project analysis',
  fullDescription:
    'Analyzes the project and suggests Architecture Decision Records based on detected patterns, technologies, and architectural decisions.',
  category: 'adr',
  complexity: 'complex',
  tokenCost: { min: 3000, max: 6000 },
  hasCEMCPDirective: true,
  relatedTools: ['generate_adr_from_decision', 'discover_existing_adrs', 'validate_adr'],
  keywords: ['adr', 'suggestion', 'architecture', 'decision', 'record'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { type: 'string' },
      focus: { type: 'array', items: { type: 'string' } },
      maxSuggestions: { type: 'number', default: 5 },
    },
    required: ['projectPath'],
  },
});

TOOL_CATALOG.set('generate_adr_from_decision', {
  name: 'generate_adr_from_decision',
  shortDescription: 'Create ADR from a specific decision',
  fullDescription:
    'Generates a complete ADR document from a described architectural decision, including context, consequences, and alternatives.',
  category: 'adr',
  complexity: 'moderate',
  tokenCost: { min: 2000, max: 4000 },
  hasCEMCPDirective: true, // Phase 4.3: Moderate tool - document generation
  relatedTools: ['suggest_adrs', 'validate_adr'],
  keywords: ['adr', 'generate', 'decision', 'document'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      decision: { type: 'string', description: 'The architectural decision' },
      context: { type: 'string', description: 'Context and background' },
      outputPath: { type: 'string', description: 'Where to save the ADR' },
    },
    required: ['decision'],
  },
});

TOOL_CATALOG.set('generate_adrs_from_prd', {
  name: 'generate_adrs_from_prd',
  shortDescription: 'Generate ADRs from PRD document',
  fullDescription:
    'Analyzes a Product Requirements Document and generates relevant Architecture Decision Records.',
  category: 'adr',
  complexity: 'complex',
  tokenCost: { min: 4000, max: 8000 },
  hasCEMCPDirective: true, // Phase 4.2: CE-MCP directive added
  relatedTools: ['suggest_adrs', 'generate_adr_from_decision'],
  keywords: ['adr', 'prd', 'requirements', 'generate'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      prdPath: { type: 'string', description: 'Path to PRD document' },
      outputDirectory: { type: 'string', description: 'Where to save ADRs' },
    },
    required: ['prdPath'],
  },
});

TOOL_CATALOG.set('discover_existing_adrs', {
  name: 'discover_existing_adrs',
  shortDescription: 'Find and index existing ADRs',
  fullDescription: 'Discovers and indexes existing ADR documents in the project.',
  category: 'adr',
  complexity: 'simple',
  tokenCost: { min: 500, max: 1500 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - file discovery operation
  relatedTools: ['validate_all_adrs', 'analyze_adr_timeline'],
  keywords: ['adr', 'discover', 'find', 'index'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      searchPaths: { type: 'array', items: { type: 'string' } },
      includeDeprecated: { type: 'boolean', default: false },
    },
  },
});

TOOL_CATALOG.set('validate_adr', {
  name: 'validate_adr',
  shortDescription: 'Validate ADR structure and content',
  fullDescription:
    'Validates an ADR document for completeness, structure, and consistency with project patterns.',
  category: 'adr',
  complexity: 'simple',
  tokenCost: { min: 500, max: 1500 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - single validation operation
  relatedTools: ['validate_all_adrs', 'suggest_adrs'],
  keywords: ['adr', 'validate', 'check', 'structure'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      adrPath: { type: 'string', description: 'Path to ADR file' },
      strictMode: { type: 'boolean', default: false },
    },
    required: ['adrPath'],
  },
});

TOOL_CATALOG.set('validate_all_adrs', {
  name: 'validate_all_adrs',
  shortDescription: 'Validate all ADRs in project',
  fullDescription: 'Validates all ADR documents in the project for consistency and completeness.',
  category: 'adr',
  complexity: 'moderate',
  tokenCost: { min: 1000, max: 3000 },
  hasCEMCPDirective: true, // Phase 4.3: Moderate tool - batch validation
  relatedTools: ['validate_adr', 'discover_existing_adrs'],
  keywords: ['adr', 'validate', 'all', 'batch'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      includeWarnings: { type: 'boolean', default: true },
    },
  },
});

TOOL_CATALOG.set('analyze_adr_timeline', {
  name: 'analyze_adr_timeline',
  shortDescription: 'Analyze ADR evolution over time',
  fullDescription: 'Analyzes the timeline of ADR decisions to understand architectural evolution.',
  category: 'adr',
  complexity: 'moderate',
  tokenCost: { min: 1500, max: 3000 },
  hasCEMCPDirective: true, // Phase 4.3: Moderate tool - timeline analysis
  relatedTools: ['discover_existing_adrs', 'compare_adr_progress'],
  keywords: ['adr', 'timeline', 'history', 'evolution'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      startDate: { type: 'string', description: 'Start date for analysis' },
      endDate: { type: 'string', description: 'End date for analysis' },
    },
  },
});

TOOL_CATALOG.set('compare_adr_progress', {
  name: 'compare_adr_progress',
  shortDescription: 'Compare ADR implementation progress',
  fullDescription: 'Compares ADR decisions against actual implementation to measure progress.',
  category: 'adr',
  complexity: 'moderate',
  tokenCost: { min: 2000, max: 4000 },
  hasCEMCPDirective: true, // Phase 4.3: Moderate tool - progress comparison
  relatedTools: ['analyze_adr_timeline', 'validate_all_adrs'],
  keywords: ['adr', 'compare', 'progress', 'implementation'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      adrIds: { type: 'array', items: { type: 'string' } },
    },
  },
});

TOOL_CATALOG.set('review_existing_adrs', {
  name: 'review_existing_adrs',
  shortDescription: 'Review and analyze existing ADRs',
  fullDescription: 'Reviews existing ADRs for relevance, accuracy, and potential updates.',
  category: 'adr',
  complexity: 'moderate',
  tokenCost: { min: 2000, max: 4000 },
  hasCEMCPDirective: true, // Phase 4.3: Moderate tool - ADR review
  relatedTools: ['validate_all_adrs', 'suggest_adrs'],
  keywords: ['adr', 'review', 'analyze', 'update'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      focusArea: { type: 'string' },
      includeRecommendations: { type: 'boolean', default: true },
    },
  },
});

TOOL_CATALOG.set('generate_adr_bootstrap', {
  name: 'generate_adr_bootstrap',
  shortDescription: 'Bootstrap ADR infrastructure',
  fullDescription:
    'Sets up ADR infrastructure including templates, directory structure, and initial ADRs.',
  category: 'adr',
  complexity: 'simple',
  tokenCost: { min: 500, max: 1500 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - setup/initialization
  relatedTools: ['suggest_adrs', 'generate_adr_from_decision'],
  keywords: ['adr', 'bootstrap', 'setup', 'initialize'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      outputDirectory: { type: 'string', default: 'docs/adrs' },
      includeTemplate: { type: 'boolean', default: true },
    },
  },
});

TOOL_CATALOG.set('interactive_adr_planning', {
  name: 'interactive_adr_planning',
  shortDescription: 'Interactive ADR planning session',
  fullDescription:
    'Guides through an interactive ADR planning session to identify and prioritize decisions.',
  category: 'adr',
  complexity: 'complex',
  tokenCost: { min: 3000, max: 6000 },
  hasCEMCPDirective: true, // Phase 4.2: CE-MCP directive added
  relatedTools: ['suggest_adrs', 'generate_adr_from_decision'],
  keywords: ['adr', 'planning', 'interactive', 'session'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { type: 'string' },
      sessionMode: { type: 'string', enum: ['guided', 'free-form'] },
    },
    required: ['projectPath'],
  },
});

// ============================================================================
// CONTENT SECURITY TOOLS
// ============================================================================

TOOL_CATALOG.set('analyze_content_security', {
  name: 'analyze_content_security',
  shortDescription: 'Analyze content for security concerns',
  fullDescription:
    'Analyzes content for sensitive information, secrets, and security vulnerabilities.',
  category: 'content-security',
  complexity: 'moderate',
  tokenCost: { min: 1500, max: 3000 },
  hasCEMCPDirective: true, // Phase 4.3: Moderate tool - security analysis
  relatedTools: ['generate_content_masking', 'validate_content_masking'],
  keywords: ['security', 'content', 'analyze', 'secrets', 'sensitive'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'Content to analyze' },
      filePath: { type: 'string', description: 'Or path to file' },
      strictMode: { type: 'boolean', default: false },
    },
  },
});

TOOL_CATALOG.set('generate_content_masking', {
  name: 'generate_content_masking',
  shortDescription: 'Generate masking rules for content',
  fullDescription: 'Generates content masking rules to protect sensitive information in outputs.',
  category: 'content-security',
  complexity: 'moderate',
  tokenCost: { min: 1000, max: 2500 },
  hasCEMCPDirective: true, // Phase 4.3: Moderate tool - masking rule generation
  relatedTools: ['analyze_content_security', 'apply_basic_content_masking'],
  keywords: ['masking', 'generate', 'rules', 'protection'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      content: { type: 'string' },
      maskingLevel: { type: 'string', enum: ['minimal', 'standard', 'aggressive'] },
    },
    required: ['content'],
  },
});

TOOL_CATALOG.set('apply_basic_content_masking', {
  name: 'apply_basic_content_masking',
  shortDescription: 'Apply basic content masking',
  fullDescription: 'Applies basic content masking using predefined patterns.',
  category: 'content-security',
  complexity: 'simple',
  tokenCost: { min: 200, max: 500 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - single masking operation
  relatedTools: ['generate_content_masking', 'configure_custom_patterns'],
  keywords: ['masking', 'apply', 'basic', 'content'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      content: { type: 'string' },
    },
    required: ['content'],
  },
});

TOOL_CATALOG.set('configure_custom_patterns', {
  name: 'configure_custom_patterns',
  shortDescription: 'Configure custom masking patterns',
  fullDescription: 'Configures custom patterns for content masking.',
  category: 'content-security',
  complexity: 'simple',
  tokenCost: { min: 200, max: 500 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - pattern configuration
  relatedTools: ['apply_basic_content_masking', 'validate_content_masking'],
  keywords: ['patterns', 'configure', 'custom', 'masking'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      patterns: { type: 'array', items: { type: 'object' } },
      name: { type: 'string' },
    },
    required: ['patterns'],
  },
});

TOOL_CATALOG.set('validate_content_masking', {
  name: 'validate_content_masking',
  shortDescription: 'Validate content masking effectiveness',
  fullDescription: 'Validates that content masking is properly applied and effective.',
  category: 'content-security',
  complexity: 'simple',
  tokenCost: { min: 300, max: 800 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - validation operation
  relatedTools: ['apply_basic_content_masking', 'analyze_content_security'],
  keywords: ['validate', 'masking', 'check', 'verify'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      maskedContent: { type: 'string' },
      originalContent: { type: 'string' },
    },
    required: ['maskedContent'],
  },
});

TOOL_CATALOG.set('configure_output_masking', {
  name: 'configure_output_masking',
  shortDescription: 'Configure output masking settings',
  fullDescription: 'Configures global output masking settings and rules.',
  category: 'content-security',
  complexity: 'simple',
  tokenCost: { min: 200, max: 400 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - settings configuration
  relatedTools: ['apply_basic_content_masking', 'configure_custom_patterns'],
  keywords: ['configure', 'output', 'masking', 'settings'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      enabled: { type: 'boolean' },
      level: { type: 'string', enum: ['minimal', 'standard', 'aggressive'] },
    },
  },
});

// ============================================================================
// RESEARCH & INTEGRATION TOOLS
// ============================================================================

TOOL_CATALOG.set('perform_research', {
  name: 'perform_research',
  shortDescription: 'Perform research on a topic',
  fullDescription:
    'Performs comprehensive research on a given topic using web search and analysis.',
  category: 'research',
  complexity: 'complex',
  tokenCost: { min: 4000, max: 10000 },
  hasCEMCPDirective: true, // Phase 4.2: CE-MCP directive added
  relatedTools: ['incorporate_research', 'generate_research_questions'],
  keywords: ['research', 'search', 'investigate', 'topic'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      topic: { type: 'string', description: 'Research topic' },
      depth: { type: 'string', enum: ['quick', 'standard', 'deep'] },
      outputFormat: { type: 'string', enum: ['summary', 'detailed', 'structured'] },
    },
    required: ['topic'],
  },
});

TOOL_CATALOG.set('incorporate_research', {
  name: 'incorporate_research',
  shortDescription: 'Incorporate research findings',
  fullDescription: 'Incorporates research findings into project documentation or knowledge base.',
  category: 'research',
  complexity: 'moderate',
  tokenCost: { min: 2000, max: 4000 },
  hasCEMCPDirective: true, // Phase 4.3: Moderate tool - research integration
  relatedTools: ['perform_research', 'create_research_template'],
  keywords: ['research', 'incorporate', 'integrate', 'findings'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      researchId: { type: 'string' },
      targetPath: { type: 'string' },
    },
    required: ['researchId'],
  },
});

TOOL_CATALOG.set('generate_research_questions', {
  name: 'generate_research_questions',
  shortDescription: 'Generate research questions',
  fullDescription: 'Generates research questions based on project context and identified gaps.',
  category: 'research',
  complexity: 'moderate',
  tokenCost: { min: 1500, max: 3000 },
  hasCEMCPDirective: true, // Phase 4.3: Moderate tool - question generation
  relatedTools: ['perform_research', 'create_research_template'],
  keywords: ['research', 'questions', 'generate', 'gaps'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      context: { type: 'string' },
      focus: { type: 'array', items: { type: 'string' } },
    },
  },
});

TOOL_CATALOG.set('create_research_template', {
  name: 'create_research_template',
  shortDescription: 'Create research template',
  fullDescription: 'Creates a structured research template for a topic.',
  category: 'research',
  complexity: 'simple',
  tokenCost: { min: 500, max: 1000 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - template generation
  relatedTools: ['perform_research', 'incorporate_research'],
  keywords: ['research', 'template', 'create', 'structure'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      topic: { type: 'string' },
      templateType: { type: 'string', enum: ['investigation', 'comparison', 'analysis'] },
    },
    required: ['topic'],
  },
});

TOOL_CATALOG.set('llm_web_search', {
  name: 'llm_web_search',
  shortDescription: 'Web search via LLM',
  fullDescription: 'Performs web searches with LLM-enhanced result analysis.',
  category: 'research',
  complexity: 'moderate',
  tokenCost: { min: 2000, max: 5000 },
  hasCEMCPDirective: true, // Phase 4.3: Moderate tool - LLM web search
  relatedTools: ['perform_research', 'llm_cloud_management'],
  keywords: ['search', 'web', 'llm', 'internet'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      maxResults: { type: 'number', default: 10 },
    },
    required: ['query'],
  },
});

TOOL_CATALOG.set('llm_cloud_management', {
  name: 'llm_cloud_management',
  shortDescription: 'Cloud management via LLM',
  fullDescription: 'Cloud resource management with LLM assistance.',
  category: 'research',
  complexity: 'complex',
  tokenCost: { min: 3000, max: 6000 },
  hasCEMCPDirective: true, // Phase 4.3: Complex tool - cloud management orchestration
  relatedTools: ['llm_web_search', 'llm_database_management'],
  keywords: ['cloud', 'management', 'llm', 'aws', 'gcp', 'azure'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      operation: { type: 'string' },
      provider: { type: 'string', enum: ['aws', 'gcp', 'azure'] },
    },
    required: ['operation'],
  },
});

TOOL_CATALOG.set('llm_database_management', {
  name: 'llm_database_management',
  shortDescription: 'Database management via LLM',
  fullDescription: 'Database operations with LLM assistance.',
  category: 'research',
  complexity: 'complex',
  tokenCost: { min: 2500, max: 5000 },
  hasCEMCPDirective: true, // Phase 4.3: Complex tool - database management orchestration
  relatedTools: ['llm_cloud_management', 'llm_web_search'],
  keywords: ['database', 'management', 'llm', 'sql', 'nosql'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      operation: { type: 'string' },
      databaseType: { type: 'string' },
    },
    required: ['operation'],
  },
});

// ============================================================================
// DEPLOYMENT & OPERATIONS TOOLS
// ============================================================================

TOOL_CATALOG.set('deployment_readiness', {
  name: 'deployment_readiness',
  shortDescription: 'Check deployment readiness',
  fullDescription: 'Validates deployment readiness with zero-tolerance for critical failures.',
  category: 'deployment',
  complexity: 'complex',
  tokenCost: { min: 2000, max: 4000 },
  hasCEMCPDirective: true,
  relatedTools: ['smart_git_push', 'analyze_deployment_progress'],
  keywords: ['deployment', 'readiness', 'validation', 'check'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { type: 'string' },
      environment: { type: 'string', enum: ['development', 'staging', 'production'] },
      strictMode: { type: 'boolean', default: true },
    },
    required: ['projectPath'],
  },
});

TOOL_CATALOG.set('smart_git_push', {
  name: 'smart_git_push',
  shortDescription: 'Intelligent git push operations',
  fullDescription:
    'Performs intelligent git operations with pre-push validation and conflict detection.',
  category: 'deployment',
  complexity: 'moderate',
  tokenCost: { min: 1000, max: 2500 },
  hasCEMCPDirective: true, // Phase 4.3: Moderate tool - git operations
  relatedTools: ['deployment_readiness', 'analyze_deployment_progress'],
  keywords: ['git', 'push', 'smart', 'deployment'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      branch: { type: 'string' },
      force: { type: 'boolean', default: false },
      runTests: { type: 'boolean', default: true },
    },
  },
});

TOOL_CATALOG.set('bootstrap_validation_loop', {
  name: 'bootstrap_validation_loop',
  shortDescription: 'Bootstrap validation loop for deployment',
  fullDescription: 'Initiates a validation loop for deployment using validated patterns.',
  category: 'deployment',
  complexity: 'complex',
  tokenCost: { min: 3000, max: 6000 },
  hasCEMCPDirective: true, // Phase 4.3: Complex tool - state machine validation
  relatedTools: ['deployment_readiness', 'generate_deployment_guidance'],
  keywords: ['bootstrap', 'validation', 'loop', 'deployment', 'patterns'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { type: 'string' },
      pattern: { type: 'string' },
    },
    required: ['projectPath'],
  },
});

TOOL_CATALOG.set('analyze_deployment_progress', {
  name: 'analyze_deployment_progress',
  shortDescription: 'Analyze deployment progress',
  fullDescription: 'Analyzes the progress of ongoing deployments.',
  category: 'deployment',
  complexity: 'moderate',
  tokenCost: { min: 1500, max: 3000 },
  hasCEMCPDirective: true, // Phase 4.3: Moderate tool - deployment tracking
  relatedTools: ['deployment_readiness', 'generate_deployment_guidance'],
  keywords: ['deployment', 'progress', 'analyze', 'status'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      deploymentId: { type: 'string' },
      includeMetrics: { type: 'boolean', default: true },
    },
  },
});

TOOL_CATALOG.set('generate_deployment_guidance', {
  name: 'generate_deployment_guidance',
  shortDescription: 'Generate deployment guidance',
  fullDescription:
    'Generates deployment guidance based on project configuration and best practices.',
  category: 'deployment',
  complexity: 'moderate',
  tokenCost: { min: 2000, max: 4000 },
  hasCEMCPDirective: true, // Phase 4.3: Moderate tool - guidance generation
  relatedTools: ['deployment_readiness', 'bootstrap_validation_loop'],
  keywords: ['deployment', 'guidance', 'generate', 'best-practices'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { type: 'string' },
      targetEnvironment: { type: 'string' },
    },
    required: ['projectPath'],
  },
});

TOOL_CATALOG.set('troubleshoot_guided_workflow', {
  name: 'troubleshoot_guided_workflow',
  shortDescription: 'Guided troubleshooting workflow',
  fullDescription: 'Provides guided troubleshooting for deployment and operational issues.',
  category: 'deployment',
  complexity: 'complex',
  tokenCost: { min: 3000, max: 7000 },
  hasCEMCPDirective: true, // Phase 4.2: CE-MCP directive added
  relatedTools: ['deployment_readiness', 'analyze_deployment_progress'],
  keywords: ['troubleshoot', 'guided', 'workflow', 'issues'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      issue: { type: 'string', description: 'Issue description' },
      context: { type: 'string' },
    },
    required: ['issue'],
  },
});

// ============================================================================
// MEMORY & STATE TOOLS
// ============================================================================

TOOL_CATALOG.set('memory_loading', {
  name: 'memory_loading',
  shortDescription: 'Load memory context',
  fullDescription: 'Loads memory context from previous sessions.',
  category: 'memory',
  complexity: 'simple',
  tokenCost: { min: 500, max: 2000 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - memory retrieval
  relatedTools: ['expand_memory', 'query_conversation_history'],
  keywords: ['memory', 'load', 'context', 'session'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: { type: 'string' },
      maxItems: { type: 'number', default: 100 },
    },
  },
});

TOOL_CATALOG.set('expand_memory', {
  name: 'expand_memory',
  shortDescription: 'Expand memory with new context',
  fullDescription: 'Expands memory with additional context information.',
  category: 'memory',
  complexity: 'simple',
  tokenCost: { min: 300, max: 800 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - memory storage
  relatedTools: ['memory_loading', 'get_memory_stats'],
  keywords: ['memory', 'expand', 'add', 'context'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      key: { type: 'string' },
      value: { type: 'object' },
    },
    required: ['key', 'value'],
  },
});

TOOL_CATALOG.set('query_conversation_history', {
  name: 'query_conversation_history',
  shortDescription: 'Query conversation history',
  fullDescription: 'Queries the conversation history for relevant context.',
  category: 'memory',
  complexity: 'simple',
  tokenCost: { min: 500, max: 1500 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - history query
  relatedTools: ['get_conversation_snapshot', 'memory_loading'],
  keywords: ['conversation', 'history', 'query', 'search'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      limit: { type: 'number', default: 20 },
    },
  },
});

TOOL_CATALOG.set('get_conversation_snapshot', {
  name: 'get_conversation_snapshot',
  shortDescription: 'Get conversation snapshot',
  fullDescription: 'Gets a snapshot of the current conversation state.',
  category: 'memory',
  complexity: 'simple',
  tokenCost: { min: 300, max: 800 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - state snapshot
  relatedTools: ['query_conversation_history', 'get_memory_stats'],
  keywords: ['conversation', 'snapshot', 'state'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      includeMetadata: { type: 'boolean', default: false },
    },
  },
});

TOOL_CATALOG.set('get_memory_stats', {
  name: 'get_memory_stats',
  shortDescription: 'Get memory statistics',
  fullDescription: 'Gets statistics about memory usage and storage.',
  category: 'memory',
  complexity: 'simple',
  tokenCost: { min: 200, max: 400 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - stats retrieval
  relatedTools: ['memory_loading', 'expand_memory'],
  keywords: ['memory', 'stats', 'statistics', 'usage'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      detailed: { type: 'boolean', default: false },
    },
  },
});

TOOL_CATALOG.set('expand_analysis_section', {
  name: 'expand_analysis_section',
  shortDescription: 'Expand analysis section',
  fullDescription: 'Expands a specific section of analysis with more detail.',
  category: 'memory',
  complexity: 'moderate',
  tokenCost: { min: 1500, max: 3000 },
  hasCEMCPDirective: true, // Phase 4.3: Moderate tool - section expansion
  relatedTools: ['analyze_project_ecosystem', 'memory_loading'],
  keywords: ['expand', 'analysis', 'section', 'detail'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      sectionId: { type: 'string' },
      depth: { type: 'string', enum: ['summary', 'detailed', 'comprehensive'] },
    },
    required: ['sectionId'],
  },
});

// ============================================================================
// FILE SYSTEM TOOLS
// ============================================================================

TOOL_CATALOG.set('read_file', {
  name: 'read_file',
  shortDescription: 'Read file contents',
  fullDescription: 'Reads the contents of a file.',
  category: 'file-system',
  complexity: 'simple',
  tokenCost: { min: 100, max: 5000 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - file read operation
  relatedTools: ['write_file', 'read_directory'],
  keywords: ['file', 'read', 'contents'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to file' },
    },
    required: ['path'],
  },
});

TOOL_CATALOG.set('write_file', {
  name: 'write_file',
  shortDescription: 'Write file contents',
  fullDescription: 'Writes content to a file.',
  category: 'file-system',
  complexity: 'simple',
  tokenCost: { min: 100, max: 1000 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - file write operation
  relatedTools: ['read_file', 'list_directory'],
  keywords: ['file', 'write', 'save'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to file' },
      content: { type: 'string', description: 'Content to write' },
    },
    required: ['path', 'content'],
  },
});

TOOL_CATALOG.set('read_directory', {
  name: 'read_directory',
  shortDescription: 'Read directory contents',
  fullDescription: 'Lists contents of a directory.',
  category: 'file-system',
  complexity: 'simple',
  tokenCost: { min: 100, max: 1000 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - directory read
  relatedTools: ['read_file', 'list_directory'],
  keywords: ['directory', 'read', 'list'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to directory' },
      recursive: { type: 'boolean', default: false },
    },
    required: ['path'],
  },
});

TOOL_CATALOG.set('list_directory', {
  name: 'list_directory',
  shortDescription: 'List directory contents',
  fullDescription: 'Lists files and directories in a path.',
  category: 'file-system',
  complexity: 'simple',
  tokenCost: { min: 100, max: 500 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - directory listing
  relatedTools: ['read_directory', 'read_file'],
  keywords: ['directory', 'list', 'files'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to directory' },
    },
    required: ['path'],
  },
});

TOOL_CATALOG.set('list_roots', {
  name: 'list_roots',
  shortDescription: 'List root directories',
  fullDescription: 'Lists configured root directories.',
  category: 'file-system',
  complexity: 'simple',
  tokenCost: { min: 50, max: 200 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - root listing
  relatedTools: ['read_directory', 'list_directory'],
  keywords: ['roots', 'list', 'directories'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {},
  },
});

// ============================================================================
// RULES & VALIDATION TOOLS
// ============================================================================

TOOL_CATALOG.set('generate_rules', {
  name: 'generate_rules',
  shortDescription: 'Generate validation rules',
  fullDescription: 'Generates validation rules based on project patterns and best practices.',
  category: 'rules',
  complexity: 'complex',
  tokenCost: { min: 3000, max: 6000 },
  hasCEMCPDirective: true,
  relatedTools: ['validate_rules', 'create_rule_set'],
  keywords: ['rules', 'generate', 'validation', 'patterns'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { type: 'string' },
      ruleType: { type: 'string', enum: ['code', 'architecture', 'deployment'] },
      outputFormat: { type: 'string', enum: ['json', 'yaml', 'typescript'] },
    },
    required: ['projectPath'],
  },
});

TOOL_CATALOG.set('validate_rules', {
  name: 'validate_rules',
  shortDescription: 'Validate rules against codebase',
  fullDescription: 'Validates rules against the codebase and reports violations.',
  category: 'rules',
  complexity: 'moderate',
  tokenCost: { min: 1500, max: 3000 },
  hasCEMCPDirective: true, // Phase 4.3: Moderate tool - rule validation
  relatedTools: ['generate_rules', 'create_rule_set'],
  keywords: ['rules', 'validate', 'check', 'violations'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      rulePath: { type: 'string' },
      targetPath: { type: 'string' },
    },
    required: ['rulePath'],
  },
});

TOOL_CATALOG.set('create_rule_set', {
  name: 'create_rule_set',
  shortDescription: 'Create rule set',
  fullDescription: 'Creates a new rule set configuration.',
  category: 'rules',
  complexity: 'simple',
  tokenCost: { min: 500, max: 1000 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - rule set creation
  relatedTools: ['generate_rules', 'validate_rules'],
  keywords: ['rules', 'create', 'set', 'configuration'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      rules: { type: 'array', items: { type: 'object' } },
    },
    required: ['name', 'rules'],
  },
});

// ============================================================================
// WORKFLOW & GUIDANCE TOOLS
// ============================================================================

TOOL_CATALOG.set('get_workflow_guidance', {
  name: 'get_workflow_guidance',
  shortDescription: 'Get workflow guidance',
  fullDescription: 'Provides guidance for specific workflows.',
  category: 'workflow',
  complexity: 'moderate',
  tokenCost: { min: 1500, max: 3000 },
  hasCEMCPDirective: true, // Phase 4.3: Moderate tool - workflow guidance
  relatedTools: ['get_development_guidance', 'mcp_planning'],
  keywords: ['workflow', 'guidance', 'help', 'process'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      workflowType: { type: 'string' },
      context: { type: 'string' },
    },
    required: ['workflowType'],
  },
});

TOOL_CATALOG.set('get_development_guidance', {
  name: 'get_development_guidance',
  shortDescription: 'Get development guidance',
  fullDescription: 'Provides development guidance and best practices.',
  category: 'workflow',
  complexity: 'moderate',
  tokenCost: { min: 1500, max: 3000 },
  hasCEMCPDirective: true, // Phase 4.3: Moderate tool - development guidance
  relatedTools: ['get_workflow_guidance', 'mcp_planning'],
  keywords: ['development', 'guidance', 'best-practices'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      topic: { type: 'string' },
      level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
    },
    required: ['topic'],
  },
});

TOOL_CATALOG.set('mcp_planning', {
  name: 'mcp_planning',
  shortDescription: 'MCP planning assistant',
  fullDescription: 'Assists with MCP server planning and design.',
  category: 'workflow',
  complexity: 'complex',
  tokenCost: { min: 3000, max: 6000 },
  hasCEMCPDirective: true, // Phase 4.2: CE-MCP directive added
  relatedTools: ['get_workflow_guidance', 'tool_chain_orchestrator'],
  keywords: ['mcp', 'planning', 'design', 'server'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      goal: { type: 'string' },
      constraints: { type: 'array', items: { type: 'string' } },
    },
    required: ['goal'],
  },
});

TOOL_CATALOG.set('tool_chain_orchestrator', {
  name: 'tool_chain_orchestrator',
  shortDescription: 'Orchestrate tool chains',
  fullDescription: 'Orchestrates multiple tools in a workflow chain.',
  category: 'workflow',
  complexity: 'complex',
  tokenCost: { min: 2000, max: 5000 },
  hasCEMCPDirective: true, // Phase 4.3: Complex tool - multi-tool orchestration
  relatedTools: ['mcp_planning', 'get_workflow_guidance'],
  keywords: ['orchestrator', 'tools', 'chain', 'workflow'],
  requiresAI: true,
  inputSchema: {
    type: 'object',
    properties: {
      chain: { type: 'array', items: { type: 'object' } },
      mode: { type: 'string', enum: ['sequential', 'parallel'] },
    },
    required: ['chain'],
  },
});

TOOL_CATALOG.set('request_action_confirmation', {
  name: 'request_action_confirmation',
  shortDescription: 'Request action confirmation',
  fullDescription: 'Requests user confirmation for actions.',
  category: 'workflow',
  complexity: 'simple',
  tokenCost: { min: 100, max: 300 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - confirmation request
  relatedTools: ['tool_chain_orchestrator'],
  keywords: ['confirmation', 'request', 'action', 'approve'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', description: 'Action to confirm' },
      details: { type: 'string' },
    },
    required: ['action'],
  },
});

// ============================================================================
// UTILITY TOOLS
// ============================================================================

TOOL_CATALOG.set('manage_cache', {
  name: 'manage_cache',
  shortDescription: 'Manage cache operations',
  fullDescription: 'Manages cache operations including clear, stats, and cleanup.',
  category: 'utility',
  complexity: 'simple',
  tokenCost: { min: 100, max: 500 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - cache management
  relatedTools: ['get_server_context', 'get_memory_stats'],
  keywords: ['cache', 'manage', 'clear', 'cleanup'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['clear', 'stats', 'cleanup', 'invalidate'] },
      key: { type: 'string' },
    },
    required: ['action'],
  },
});

TOOL_CATALOG.set('check_ai_execution_status', {
  name: 'check_ai_execution_status',
  shortDescription: 'Check AI execution status',
  fullDescription: 'Checks the status of AI execution capabilities.',
  category: 'utility',
  complexity: 'simple',
  tokenCost: { min: 100, max: 300 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - status check
  relatedTools: ['get_server_context'],
  keywords: ['ai', 'status', 'check', 'execution'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {},
  },
});

TOOL_CATALOG.set('get_server_context', {
  name: 'get_server_context',
  shortDescription: 'Get server context',
  fullDescription: 'Gets the current server context and configuration.',
  category: 'utility',
  complexity: 'simple',
  tokenCost: { min: 200, max: 500 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - context retrieval
  relatedTools: ['check_ai_execution_status', 'manage_cache'],
  keywords: ['server', 'context', 'config', 'status'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      includeConfig: { type: 'boolean', default: false },
    },
  },
});

TOOL_CATALOG.set('get_current_datetime', {
  name: 'get_current_datetime',
  shortDescription: 'Get current date/time',
  fullDescription: 'Gets the current date and time in various formats.',
  category: 'utility',
  complexity: 'simple',
  tokenCost: { min: 50, max: 100 },
  hasCEMCPDirective: true, // Phase 4.3: Simple tool - datetime retrieval
  relatedTools: [],
  keywords: ['datetime', 'time', 'date', 'current'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      format: { type: 'string', enum: ['iso', 'human', 'adr', 'all'] },
      timezone: { type: 'string' },
    },
  },
});

// CE-MCP Phase 4: Lazy Prompt Loading
TOOL_CATALOG.set('load_prompt', {
  name: 'load_prompt',
  shortDescription: 'Load prompts on-demand (CE-MCP)',
  fullDescription:
    'Loads prompts on-demand instead of eagerly loading all prompts at startup. Part of CE-MCP lazy loading system that reduces token usage by ~96%.',
  category: 'utility',
  complexity: 'simple',
  tokenCost: { min: 100, max: 500 },
  hasCEMCPDirective: true,
  relatedTools: ['search_tools', 'analyze_project_ecosystem'],
  keywords: ['prompt', 'load', 'lazy', 'ce-mcp', 'token', 'optimization'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      promptName: {
        type: 'string',
        description: 'Name of the prompt to load',
        enum: [
          'adr-suggestion',
          'deployment-analysis',
          'environment-analysis',
          'research-question',
          'rule-generation',
          'analysis',
          'research-integration',
          'validated-pattern',
          'security',
        ],
      },
      section: {
        type: 'string',
        description: 'Specific section within the prompt to load',
      },
      estimateOnly: {
        type: 'boolean',
        description: 'Return only token estimate without loading content',
      },
    },
    required: ['promptName'],
  },
});

// ============================================================================
// ADR AGGREGATOR INTEGRATION TOOLS
// ============================================================================

TOOL_CATALOG.set('sync_to_aggregator', {
  name: 'sync_to_aggregator',
  shortDescription: 'Sync ADRs to ADR Aggregator platform',
  fullDescription:
    'Syncs Architecture Decision Records to the ADR Aggregator platform (adraggregator.com) for centralized tracking, visualization, and team collaboration. Auto-detects repository from git remote.',
  category: 'aggregator',
  complexity: 'moderate',
  tokenCost: { min: 1000, max: 3000 },
  hasCEMCPDirective: true,
  relatedTools: ['get_adr_context', 'get_staleness_report', 'discover_existing_adrs'],
  keywords: ['aggregator', 'sync', 'adr', 'dashboard', 'platform', 'push'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      full_sync: {
        type: 'boolean',
        default: false,
        description: 'Replace all ADRs instead of incremental sync',
      },
      include_metadata: {
        type: 'boolean',
        default: true,
        description: 'Include analysis metadata',
      },
      include_diagrams: {
        type: 'boolean',
        default: false,
        description: 'Include Mermaid diagrams (Pro+ tier)',
      },
      include_timeline: {
        type: 'boolean',
        default: true,
        description: 'Include timeline/staleness data',
      },
      include_security_scan: {
        type: 'boolean',
        default: true,
        description: 'Include security scan results',
      },
      include_code_links: {
        type: 'boolean',
        default: false,
        description: 'Include AST-based code links (Pro+ tier)',
      },
      adr_paths: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific ADR paths to sync (optional)',
      },
      projectPath: {
        type: 'string',
        description: 'Project path (defaults to PROJECT_PATH)',
      },
    },
  },
});

TOOL_CATALOG.set('get_adr_context', {
  name: 'get_adr_context',
  shortDescription: 'Get ADR context from ADR Aggregator',
  fullDescription:
    'Retrieves ADR context, metadata, and analytics from the ADR Aggregator platform for the current repository. Useful for LLM-assisted development with architectural awareness.',
  category: 'aggregator',
  complexity: 'simple',
  tokenCost: { min: 500, max: 1500 },
  hasCEMCPDirective: true,
  relatedTools: ['sync_to_aggregator', 'get_staleness_report'],
  keywords: ['aggregator', 'context', 'adr', 'fetch', 'retrieve', 'pull'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      include_diagrams: {
        type: 'boolean',
        default: false,
        description: 'Include Mermaid diagrams (Pro+ tier)',
      },
      include_timeline: {
        type: 'boolean',
        default: true,
        description: 'Include timeline data',
      },
      include_code_links: {
        type: 'boolean',
        default: false,
        description: 'Include code links (Pro+ tier)',
      },
      include_research: {
        type: 'boolean',
        default: false,
        description: 'Include research context (Pro+ tier)',
      },
      staleness_filter: {
        type: 'string',
        enum: ['all', 'fresh', 'stale', 'very_stale'],
        default: 'all',
        description: 'Filter by staleness level',
      },
      graph_depth: {
        type: 'number',
        default: 1,
        description: 'Knowledge graph depth (Team tier)',
      },
      projectPath: {
        type: 'string',
        description: 'Project path (defaults to PROJECT_PATH)',
      },
    },
  },
});

TOOL_CATALOG.set('get_staleness_report', {
  name: 'get_staleness_report',
  shortDescription: 'Get ADR staleness report from aggregator',
  fullDescription:
    'Retrieves a staleness report showing which ADRs need review based on age and code changes. Helps maintain architectural documentation hygiene.',
  category: 'aggregator',
  complexity: 'simple',
  tokenCost: { min: 300, max: 800 },
  hasCEMCPDirective: true,
  relatedTools: ['get_adr_context', 'analyze_adr_timeline'],
  keywords: ['aggregator', 'staleness', 'report', 'governance', 'review', 'freshness'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      threshold: {
        type: 'number',
        default: 90,
        description: 'Days threshold for staleness',
      },
      projectPath: {
        type: 'string',
        description: 'Project path (defaults to PROJECT_PATH)',
      },
    },
  },
});

TOOL_CATALOG.set('get_adr_templates', {
  name: 'get_adr_templates',
  shortDescription: 'Get ADR templates from aggregator',
  fullDescription:
    'Retrieves domain-specific ADR templates and best practices from the ADR Aggregator platform. Includes anti-patterns to avoid.',
  category: 'aggregator',
  complexity: 'simple',
  tokenCost: { min: 300, max: 1000 },
  hasCEMCPDirective: true,
  relatedTools: ['generate_adr_from_decision', 'suggest_adrs'],
  keywords: ['aggregator', 'templates', 'best-practices', 'domain', 'anti-patterns'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      domain: {
        type: 'string',
        description: 'Domain filter (web_application, microservices, api, etc.)',
      },
    },
  },
});

TOOL_CATALOG.set('get_adr_diagrams', {
  name: 'get_adr_diagrams',
  shortDescription: 'Get Mermaid diagrams from aggregator (Pro+)',
  fullDescription:
    'Retrieves Mermaid diagrams for ADR visualization including workflow, relationships, and impact diagrams. Requires Pro+ tier subscription.',
  category: 'aggregator',
  complexity: 'simple',
  tokenCost: { min: 500, max: 1500 },
  hasCEMCPDirective: true,
  relatedTools: ['get_adr_context', 'sync_to_aggregator'],
  keywords: ['aggregator', 'diagrams', 'mermaid', 'visualization', 'pro', 'tier'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      adr_path: {
        type: 'string',
        description: 'Specific ADR path (optional, returns all if not specified)',
      },
      projectPath: {
        type: 'string',
        description: 'Project path (defaults to PROJECT_PATH)',
      },
    },
  },
});

TOOL_CATALOG.set('validate_adr_compliance', {
  name: 'validate_adr_compliance',
  shortDescription: 'Validate ADR compliance via aggregator (Pro+)',
  fullDescription:
    'Validates that ADRs are properly implemented in code using AST analysis from the ADR Aggregator platform. Requires Pro+ tier subscription.',
  category: 'aggregator',
  complexity: 'moderate',
  tokenCost: { min: 1000, max: 2500 },
  hasCEMCPDirective: true,
  relatedTools: ['get_adr_context', 'deployment_readiness'],
  keywords: ['aggregator', 'compliance', 'validation', 'ast', 'pro', 'tier', 'implementation'],
  requiresAI: false,
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
        default: 'all',
        description: 'Type of validation to perform',
      },
      projectPath: {
        type: 'string',
        description: 'Project path (defaults to PROJECT_PATH)',
      },
    },
  },
});

TOOL_CATALOG.set('get_knowledge_graph', {
  name: 'get_knowledge_graph',
  shortDescription: 'Get knowledge graph from aggregator (Team)',
  fullDescription:
    'Retrieves the organizational knowledge graph showing relationships between ADRs, code, patterns, and technologies across repositories. Requires Team tier subscription.',
  category: 'aggregator',
  complexity: 'moderate',
  tokenCost: { min: 1000, max: 3000 },
  hasCEMCPDirective: true,
  relatedTools: ['get_architectural_context', 'get_adr_context'],
  keywords: [
    'aggregator',
    'knowledge-graph',
    'relationships',
    'team',
    'organization',
    'cross-repo',
  ],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      scope: {
        type: 'string',
        enum: ['repository', 'organization'],
        default: 'repository',
        description: 'Scope of the knowledge graph',
      },
      include_analytics: {
        type: 'boolean',
        default: true,
        description: 'Include graph analytics and insights',
      },
      projectPath: {
        type: 'string',
        description: 'Project path (defaults to PROJECT_PATH)',
      },
    },
  },
});

TOOL_CATALOG.set('update_implementation_status', {
  name: 'update_implementation_status',
  shortDescription: 'Update ADR implementation status (Pro+)',
  fullDescription:
    'Update the implementation status of synced ADRs directly from the IDE. Supports statuses: not_started, in_progress, implemented, deprecated, blocked. Requires Pro+ tier subscription.',
  category: 'aggregator',
  complexity: 'simple',
  tokenCost: { min: 300, max: 800 },
  hasCEMCPDirective: true,
  relatedTools: ['sync_to_aggregator', 'get_adr_context', 'validate_adr_compliance'],
  keywords: [
    'aggregator',
    'implementation',
    'status',
    'update',
    'pro',
    'tier',
    'tracking',
    'progress',
  ],
  requiresAI: false,
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
});

TOOL_CATALOG.set('get_adr_priorities', {
  name: 'get_adr_priorities',
  shortDescription: 'Get ADR priorities for roadmap/backlog planning',
  fullDescription:
    'Get ADR priorities for roadmap and backlog planning from ADR Aggregator. Returns prioritized ADRs with scores, dependencies, blockers, implementation status, and gap counts.',
  category: 'aggregator',
  complexity: 'simple',
  tokenCost: { min: 500, max: 1500 },
  hasCEMCPDirective: true,
  relatedTools: ['get_adr_context', 'update_implementation_status', 'analyze_gaps'],
  keywords: ['aggregator', 'priorities', 'roadmap', 'backlog', 'planning', 'score', 'dependencies'],
  requiresAI: false,
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
});

// CE-MCP Meta-Tool: search_tools
TOOL_CATALOG.set('search_tools', {
  name: 'search_tools',
  shortDescription: 'Search and discover tools (CE-MCP)',
  fullDescription:
    'Search and discover available tools by category, keyword, or capability. Returns lightweight tool metadata for token-efficient discovery.',
  category: 'utility',
  complexity: 'simple',
  tokenCost: { min: 100, max: 300 },
  hasCEMCPDirective: true,
  relatedTools: ['load_prompt'],
  keywords: ['search', 'discover', 'tools', 'catalog', 'ce-mcp', 'meta'],
  requiresAI: false,
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Filter by tool category',
        enum: [
          'analysis',
          'adr',
          'aggregator',
          'content-security',
          'research',
          'deployment',
          'memory',
          'file-system',
          'rules',
          'workflow',
          'utility',
        ],
      },
      query: {
        type: 'string',
        description: 'Search query to match tool names, descriptions, and keywords',
      },
      complexity: {
        type: 'string',
        enum: ['simple', 'moderate', 'complex'],
        description: 'Filter by complexity level',
      },
      cemcpOnly: {
        type: 'boolean',
        description: 'Only return tools with CE-MCP directive support',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of tools to return',
      },
    },
  },
});

// ============================================================================
// CATALOG HELPER FUNCTIONS
// ============================================================================

/**
 * Get catalog entry with computed properties
 */
export function getCatalogEntry(toolName: string): CatalogEntry | undefined {
  const metadata = TOOL_CATALOG.get(toolName);
  if (!metadata) return undefined;

  return {
    ...metadata,
    isHighTokenCost: metadata.tokenCost.max > 5000,
  };
}

/**
 * Search tools in the catalog
 */
export function searchTools(options: ToolSearchOptions = {}): ToolSearchResult {
  const { category, query, complexity, cemcpOnly, limit = 20, includeSchema = false } = options;

  let results: CatalogEntry[] = [];

  // Convert map to array and apply filters
  for (const [_name, metadata] of TOOL_CATALOG) {
    // Apply category filter
    if (category && metadata.category !== category) continue;

    // Apply complexity filter
    if (complexity && metadata.complexity !== complexity) continue;

    // Apply CE-MCP filter
    if (cemcpOnly && !metadata.hasCEMCPDirective) continue;

    // Create catalog entry
    const entry: CatalogEntry = {
      ...metadata,
      isHighTokenCost: metadata.tokenCost.max > 5000,
    };

    // Apply query filter with scoring
    if (query) {
      const lowerQuery = query.toLowerCase();
      let score = 0;

      // Name match (highest priority)
      if (metadata.name.toLowerCase().includes(lowerQuery)) {
        score += 100;
      }

      // Keyword match
      for (const keyword of metadata.keywords) {
        if (keyword.toLowerCase().includes(lowerQuery)) {
          score += 50;
        }
      }

      // Description match
      if (metadata.shortDescription.toLowerCase().includes(lowerQuery)) {
        score += 25;
      }
      if (metadata.fullDescription.toLowerCase().includes(lowerQuery)) {
        score += 10;
      }

      if (score === 0) continue;
      entry.searchScore = score;
    }

    // Remove schema if not requested (token savings)
    if (!includeSchema) {
      // Create a copy without inputSchema for lighter response
      const lightEntry = { ...entry };
      delete (lightEntry as Record<string, unknown>)['inputSchema'];
      results.push(lightEntry as CatalogEntry);
    } else {
      results.push(entry);
    }
  }

  // Sort by search score if query provided, otherwise by name
  if (query) {
    results.sort((a, b) => (b.searchScore || 0) - (a.searchScore || 0));
  } else {
    results.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Calculate category counts
  const categories: Record<ToolCategory, number> = {
    analysis: 0,
    adr: 0,
    aggregator: 0,
    'content-security': 0,
    research: 0,
    deployment: 0,
    memory: 0,
    'file-system': 0,
    rules: 0,
    workflow: 0,
    utility: 0,
  };

  for (const entry of results) {
    categories[entry.category]++;
  }

  // Apply limit
  const totalCount = results.length;
  if (limit && results.length > limit) {
    results = results.slice(0, limit);
  }

  const result: ToolSearchResult = {
    tools: results,
    totalCount,
    categories,
  };

  if (query !== undefined) {
    result.query = query;
  }

  return result;
}

/**
 * Get all tools in a category
 */
export function getToolsByCategory(category: ToolCategory): CatalogEntry[] {
  return searchTools({ category, limit: 100 }).tools;
}

/**
 * Get tools with CE-MCP directives
 */
export function getCEMCPTools(): CatalogEntry[] {
  return searchTools({ cemcpOnly: true, limit: 100 }).tools;
}

/**
 * Get high token cost tools (candidates for CE-MCP migration)
 */
export function getHighTokenCostTools(): CatalogEntry[] {
  return searchTools({ limit: 100 }).tools.filter(t => t.isHighTokenCost);
}

/**
 * Get catalog summary (for token-efficient listing)
 */
export function getCatalogSummary(): {
  totalTools: number;
  byCategory: Record<ToolCategory, number>;
  cemcpEnabled: number;
  highTokenCost: number;
} {
  const result = searchTools({ limit: 1000 });

  return {
    totalTools: result.totalCount,
    byCategory: result.categories,
    cemcpEnabled: getCEMCPTools().length,
    highTokenCost: getHighTokenCostTools().length,
  };
}

/**
 * Convert catalog entry to MCP Tool format (for ListTools)
 */
export function toMCPTool(entry: CatalogEntry | ToolMetadata): Tool {
  return {
    name: entry.name,
    description: entry.fullDescription,
    inputSchema: entry.inputSchema,
  };
}

/**
 * Get lightweight tool listing (metadata only, no schemas)
 * Token savings: ~15K → ~5K for full listing
 */
export function getLightweightToolList(): Array<{
  name: string;
  description: string;
  category: ToolCategory;
  hasCEMCPDirective: boolean;
}> {
  const result: Array<{
    name: string;
    description: string;
    category: ToolCategory;
    hasCEMCPDirective: boolean;
  }> = [];

  for (const [, metadata] of TOOL_CATALOG) {
    result.push({
      name: metadata.name,
      description: metadata.shortDescription,
      category: metadata.category,
      hasCEMCPDirective: metadata.hasCEMCPDirective,
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}
