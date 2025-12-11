/**
 * CE-MCP Tool Wrappers
 *
 * This module provides CE-MCP directive-based versions of high-token-cost tools.
 * Instead of executing prompts directly with OpenRouter, these tools return
 * orchestration directives that the host LLM can execute with minimal context.
 *
 * @see ADR-014: CE-MCP Architecture
 * @see docs/IMPLEMENTATION-PLAN.md Phase 2
 */

import {
  OrchestrationDirective,
  StateMachineDirective,
  SandboxOperation,
} from '../types/ce-mcp.js';

/**
 * Arguments for CE-MCP analyze project ecosystem
 */
export interface CEMCPAnalyzeProjectEcosystemArgs {
  projectPath: string;
  analysisDepth?: 'basic' | 'standard' | 'comprehensive';
  includeEnvironment?: boolean;
  knowledgeEnhancement?: boolean;
  learningEnabled?: boolean;
  technologyFocus?: string[];
  analysisScope?: string[];
}

/**
 * CE-MCP version of analyzeProjectEcosystem
 *
 * Returns an orchestration directive instead of executing the analysis directly.
 * This reduces token usage from ~12K to ~4K by:
 * - Deferring context assembly to sandbox operations
 * - Using lazy prompt loading
 * - Eliminating intermediate LLM calls
 *
 * Token Savings Breakdown:
 * - Knowledge generation: 3K → on-demand
 * - Memory retrieval: 2K → on-demand
 * - Environment analysis: 2.5K → on-demand
 * - Project structure: 2K → on-demand
 * - Reflexion context: 2K → on-demand
 */
export function createAnalyzeProjectEcosystemDirective(
  args: CEMCPAnalyzeProjectEcosystemArgs
): OrchestrationDirective {
  const {
    projectPath,
    analysisDepth = 'comprehensive',
    includeEnvironment = true,
    knowledgeEnhancement = true,
    // learningEnabled is used for future reflexion integration
    learningEnabled: _learningEnabled = true,
    technologyFocus = [],
    analysisScope = [],
  } = args;
  void _learningEnabled; // Mark as intentionally unused for now

  const operations: SandboxOperation[] = [
    // Phase 1: Load project structure
    {
      op: 'analyzeFiles',
      args: {
        patterns: ['**/*.ts', '**/*.js', '**/*.json', '**/*.yaml', '**/*.yml'],
        maxFiles: analysisDepth === 'basic' ? 50 : analysisDepth === 'standard' ? 100 : 200,
      },
      store: 'projectFiles',
    },

    // Phase 2: Scan environment configuration
    {
      op: 'scanEnvironment',
      store: 'environmentConfig',
    },

    // Phase 3: Load architectural knowledge (conditional on knowledgeEnhancement)
    ...(knowledgeEnhancement
      ? [
          {
            op: 'loadKnowledge' as const,
            args: {
              domain: 'architecture',
              scope: 'project',
              technologies: technologyFocus,
            },
            store: 'architecturalKnowledge',
          },
        ]
      : []),

    // Phase 4: Load analysis prompt (lazy loading)
    {
      op: 'loadPrompt',
      args: {
        name: 'analysis',
        section: 'project_analysis',
      },
      store: 'analysisPrompt',
    },

    // Phase 5: Generate combined context
    {
      op: 'generateContext',
      args: {
        type: 'ecosystem-analysis',
        depth: analysisDepth,
        includeEnvironment,
        technologyFocus,
        analysisScope,
      },
      inputs: ['projectFiles', 'environmentConfig', 'architecturalKnowledge', 'analysisPrompt'],
      store: 'analysisContext',
    },

    // Phase 6: Cache the context for potential reuse
    {
      op: 'cacheResult',
      args: {
        key: `ecosystem-analysis:${projectPath}:${analysisDepth}`,
        ttl: 3600, // 1 hour cache
      },
      input: 'analysisContext',
    },

    // Phase 7: Compose final result
    {
      op: 'composeResult',
      inputs: ['projectFiles', 'environmentConfig', 'architecturalKnowledge', 'analysisContext'],
      return: true,
    },
  ];

  return {
    type: 'orchestration_directive',
    version: '1.0',
    tool: 'analyze_project_ecosystem',
    description: `Comprehensive ecosystem analysis for ${projectPath} with ${analysisDepth} depth`,
    sandbox_operations: operations,
    compose: {
      sections: [
        { source: 'projectFiles', key: 'projectStructure', transform: 'summarize' },
        { source: 'environmentConfig', key: 'environment' },
        { source: 'architecturalKnowledge', key: 'knowledge', transform: 'extract' },
        { source: 'analysisContext', key: 'analysisContext' },
      ],
      template: 'ecosystem_analysis_report',
      format: 'markdown',
    },
    output_schema: {
      type: 'object',
      properties: {
        projectStructure: {
          type: 'object',
          description: 'Summary of project files and structure',
        },
        environment: {
          type: 'object',
          description: 'Environment configuration analysis',
        },
        knowledge: {
          type: 'object',
          description: 'Architectural knowledge context',
        },
        analysisContext: {
          type: 'object',
          description: 'Combined analysis context',
        },
      },
    },
    metadata: {
      estimated_tokens: 4000, // Down from ~12K
      complexity: 'high',
      cacheable: true,
      cache_key: `ecosystem-${projectPath}-${analysisDepth}`,
    },
  };
}

/**
 * Arguments for CE-MCP ADR suggestion
 */
export interface CEMCPSuggestAdrsArgs {
  projectPath: string;
  codeChanges?: string;
  focusAreas?: string[];
  maxSuggestions?: number;
}

/**
 * CE-MCP version of suggest_adrs
 *
 * Returns a state machine directive for multi-step ADR generation.
 * Reduces token usage from ~3.5K to ~1.5K by:
 * - Lazy loading ADR templates
 * - Deferring code analysis to sandbox
 * - Using state machine for sequential steps
 */
export function createSuggestAdrsDirective(args: CEMCPSuggestAdrsArgs): StateMachineDirective {
  const { projectPath, codeChanges, focusAreas = [], maxSuggestions = 5 } = args;

  return {
    type: 'state_machine_directive',
    version: '1.0',
    initial_state: {
      projectPath,
      codeChanges,
      focusAreas,
      maxSuggestions,
      suggestions: [],
    },
    transitions: [
      {
        name: 'load_adr_knowledge',
        from: 'initial',
        operation: {
          op: 'loadKnowledge',
          args: { domain: 'adr', scope: 'project' },
          store: 'adrKnowledge',
        },
        next_state: 'knowledge_loaded',
      },
      {
        name: 'analyze_codebase',
        from: 'knowledge_loaded',
        operation: {
          op: 'analyzeFiles',
          args: {
            patterns: ['**/*.ts', '**/*.js'],
            maxFiles: 100,
          },
          store: 'codeAnalysis',
        },
        next_state: 'code_analyzed',
      },
      {
        name: 'load_adr_template',
        from: 'code_analyzed',
        operation: {
          op: 'loadPrompt',
          args: {
            name: 'adr-suggestion',
            section: 'recommendation_template',
          },
          store: 'adrTemplate',
        },
        next_state: 'template_loaded',
      },
      {
        name: 'generate_suggestions',
        from: 'template_loaded',
        operation: {
          op: 'generateContext',
          args: {
            type: 'adr-suggestions',
            maxSuggestions,
            focusAreas,
          },
          inputs: ['adrKnowledge', 'codeAnalysis', 'adrTemplate'],
          store: 'suggestions',
        },
        next_state: 'suggestions_generated',
      },
      {
        name: 'validate_suggestions',
        from: 'suggestions_generated',
        operation: {
          op: 'validateOutput',
          args: {
            schema: {
              type: 'array',
              items: { type: 'object' },
            },
          },
          input: 'suggestions',
          store: 'validatedSuggestions',
        },
        next_state: 'done',
        on_error: 'skip',
      },
    ],
    final_state: 'done',
  };
}

/**
 * Arguments for CE-MCP rule generation
 */
export interface CEMCPGenerateRulesArgs {
  projectPath: string;
  ruleType: 'code-quality' | 'security' | 'architecture' | 'testing';
  targetFramework?: string;
  severity?: 'error' | 'warning' | 'info';
}

/**
 * CE-MCP version of generate_rules
 *
 * Returns an orchestration directive for rule generation.
 * Reduces token usage from ~4K to ~1.5K by:
 * - Lazy loading rule templates
 * - Deferring validation to sandbox
 * - Caching generated rules
 */
export function createGenerateRulesDirective(args: CEMCPGenerateRulesArgs): OrchestrationDirective {
  const { projectPath, ruleType, targetFramework, severity = 'warning' } = args;

  return {
    type: 'orchestration_directive',
    version: '1.0',
    tool: 'generate_rules',
    description: `Generate ${ruleType} rules for ${projectPath}`,
    sandbox_operations: [
      {
        op: 'loadKnowledge',
        args: {
          domain: ruleType,
          scope: 'rules',
        },
        store: 'ruleKnowledge',
      },
      {
        op: 'loadPrompt',
        args: {
          name: 'rule-generation',
          section: 'rule_template',
        },
        store: 'ruleTemplate',
      },
      {
        op: 'analyzeFiles',
        args: {
          patterns: targetFramework
            ? [`**/*.${targetFramework === 'typescript' ? 'ts' : 'js'}`]
            : ['**/*.ts', '**/*.js'],
          maxFiles: 50,
        },
        store: 'codePatterns',
      },
      {
        op: 'generateContext',
        args: {
          type: 'rule-generation',
          ruleType,
          severity,
          targetFramework,
        },
        inputs: ['ruleKnowledge', 'ruleTemplate', 'codePatterns'],
        store: 'rules',
      },
      {
        op: 'validateOutput',
        args: {
          schema: {
            type: 'object',
            properties: {
              rules: { type: 'array' },
            },
          },
        },
        input: 'rules',
        store: 'validatedRules',
      },
      {
        op: 'cacheResult',
        args: {
          key: `rules:${projectPath}:${ruleType}`,
          ttl: 7200, // 2 hour cache
        },
        input: 'validatedRules',
      },
      {
        op: 'composeResult',
        input: 'validatedRules',
        return: true,
      },
    ],
    metadata: {
      estimated_tokens: 1500,
      complexity: 'medium',
      cacheable: true,
      cache_key: `rules-${ruleType}-${projectPath}`,
    },
  };
}

/**
 * Arguments for CE-MCP environment analysis
 */
export interface CEMCPAnalyzeEnvironmentArgs {
  projectPath: string;
  analysisType?: 'quick' | 'standard' | 'comprehensive';
  includeInfrastructure?: boolean;
}

/**
 * CE-MCP version of analyze_environment
 *
 * Returns an orchestration directive for environment analysis.
 * Reduces token usage from ~2.5K to ~1K by:
 * - Deferring file scanning to sandbox
 * - Using cached environment patterns
 * - Lazy loading environment prompts
 */
export function createAnalyzeEnvironmentDirective(
  args: CEMCPAnalyzeEnvironmentArgs
): OrchestrationDirective {
  const { projectPath, analysisType = 'standard', includeInfrastructure = true } = args;

  return {
    type: 'orchestration_directive',
    version: '1.0',
    tool: 'analyze_environment',
    description: `Analyze environment for ${projectPath} (${analysisType})`,
    sandbox_operations: [
      {
        op: 'scanEnvironment',
        store: 'envConfig',
      },
      {
        op: 'analyzeFiles',
        args: {
          patterns: [
            'Dockerfile*',
            'docker-compose*.yml',
            '*.yaml',
            '.env*',
            'package.json',
            'tsconfig.json',
          ],
          maxFiles: 20,
        },
        store: 'configFiles',
      },
      // Only load infrastructure prompt if includeInfrastructure is true
      ...(includeInfrastructure
        ? [
            {
              op: 'loadPrompt' as const,
              args: {
                name: 'environment-analysis',
                section:
                  analysisType === 'comprehensive' ? 'infrastructure_review' : 'config_validation',
              },
              store: 'envPrompt',
            },
          ]
        : []),
      {
        op: 'generateContext',
        args: {
          type: 'environment-analysis',
          analysisType,
          includeInfrastructure,
        },
        inputs: ['envConfig', 'configFiles', 'envPrompt'],
        store: 'envAnalysis',
      },
      {
        op: 'composeResult',
        input: 'envAnalysis',
        return: true,
      },
    ],
    compose: {
      sections: [
        { source: 'envConfig', key: 'configuration' },
        { source: 'configFiles', key: 'configurationFiles' },
        { source: 'envAnalysis', key: 'analysis' },
      ],
      template: 'environment_report',
      format: 'markdown',
    },
    metadata: {
      estimated_tokens: 1000,
      complexity: 'low',
      cacheable: true,
      cache_key: `env-${projectPath}-${analysisType}`,
    },
  };
}

/**
 * Arguments for CE-MCP deployment readiness
 */
export interface CEMCPDeploymentReadinessArgs {
  projectPath: string;
  targetEnvironment: 'development' | 'staging' | 'production';
  checkTypes?: string[];
}

/**
 * CE-MCP version of deployment_readiness
 *
 * Returns a state machine directive for deployment checks.
 * Reduces token usage from ~2K to ~800 tokens by:
 * - Sequential check execution in state machine
 * - Lazy loading of deployment patterns
 * - Early termination on critical failures
 */
export function createDeploymentReadinessDirective(
  args: CEMCPDeploymentReadinessArgs
): StateMachineDirective {
  const {
    projectPath,
    targetEnvironment,
    checkTypes = ['dependencies', 'tests', 'security', 'configuration'],
  } = args;

  return {
    type: 'state_machine_directive',
    version: '1.0',
    initial_state: {
      projectPath,
      targetEnvironment,
      checkTypes,
      results: {},
      passed: true,
    },
    transitions: [
      {
        name: 'scan_environment',
        from: 'initial',
        operation: {
          op: 'scanEnvironment',
          store: 'envScan',
        },
        next_state: 'env_scanned',
      },
      {
        name: 'load_deployment_patterns',
        from: 'env_scanned',
        operation: {
          op: 'loadPrompt',
          args: {
            name: 'deployment-analysis',
            section: 'validation_criteria',
          },
          store: 'deploymentPatterns',
        },
        next_state: 'patterns_loaded',
      },
      {
        name: 'analyze_configuration',
        from: 'patterns_loaded',
        operation: {
          op: 'analyzeFiles',
          args: {
            patterns: ['package.json', 'tsconfig.json', '.env*', 'Dockerfile*'],
            maxFiles: 10,
          },
          store: 'configAnalysis',
        },
        next_state: 'config_analyzed',
      },
      {
        name: 'validate_readiness',
        from: 'config_analyzed',
        operation: {
          op: 'validateOutput',
          args: {
            schema: {
              type: 'object',
              required: ['ready', 'checks'],
            },
          },
          inputs: ['envScan', 'configAnalysis', 'deploymentPatterns'],
          store: 'readinessResult',
        },
        next_state: 'validated',
        on_error: 'abort',
      },
      {
        name: 'cache_result',
        from: 'validated',
        operation: {
          op: 'cacheResult',
          args: {
            key: `deployment-readiness:${projectPath}:${targetEnvironment}`,
            ttl: 1800, // 30 minute cache
          },
          input: 'readinessResult',
        },
        next_state: 'done',
        on_error: 'skip',
      },
    ],
    final_state: 'done',
  };
}

// ============================================================================
// PHASE 4.2: ADDITIONAL CE-MCP TOOL MIGRATIONS
// ============================================================================

/**
 * Arguments for CE-MCP smart score
 */
export interface CEMCPSmartScoreArgs {
  projectPath: string;
  includeDetails?: boolean;
  scoringAreas?: string[];
}

/**
 * CE-MCP version of smart_score
 *
 * Returns an orchestration directive for code quality scoring.
 * Reduces token usage from ~6K to ~2K by:
 * - Lazy loading scoring templates
 * - Deferring file analysis to sandbox
 * - Caching scoring results
 */
export function createSmartScoreDirective(args: CEMCPSmartScoreArgs): OrchestrationDirective {
  const { projectPath, includeDetails = true, scoringAreas = [] } = args;

  return {
    type: 'orchestration_directive',
    version: '1.0',
    tool: 'smart_score',
    description: `Calculate code quality scores for ${projectPath}`,
    sandbox_operations: [
      {
        op: 'analyzeFiles',
        args: {
          patterns: ['**/*.ts', '**/*.js', '**/*.json'],
          maxFiles: 100,
        },
        store: 'codeFiles',
      },
      {
        op: 'loadKnowledge',
        args: {
          domain: 'code-quality',
          scope: 'scoring',
        },
        store: 'scoringKnowledge',
      },
      {
        op: 'loadPrompt',
        args: {
          name: 'analysis',
          section: 'quality_metrics',
        },
        store: 'scoringPrompt',
      },
      {
        op: 'generateContext',
        args: {
          type: 'smart-score',
          includeDetails,
          scoringAreas,
        },
        inputs: ['codeFiles', 'scoringKnowledge', 'scoringPrompt'],
        store: 'scoreResults',
      },
      {
        op: 'cacheResult',
        args: {
          key: `smart-score:${projectPath}`,
          ttl: 3600,
        },
        input: 'scoreResults',
      },
      {
        op: 'composeResult',
        input: 'scoreResults',
        return: true,
      },
    ],
    compose: {
      sections: [
        { source: 'codeFiles', key: 'analyzedFiles', transform: 'summarize' },
        { source: 'scoreResults', key: 'scores' },
      ],
      template: 'quality_score_report',
      format: 'markdown',
    },
    metadata: {
      estimated_tokens: 2000,
      complexity: 'medium',
      cacheable: true,
      cache_key: `score-${projectPath}`,
    },
  };
}

/**
 * Arguments for CE-MCP perform research
 */
export interface CEMCPPerformResearchArgs {
  topic: string;
  depth?: 'quick' | 'standard' | 'deep';
  outputFormat?: 'summary' | 'detailed' | 'structured';
  sources?: string[];
}

/**
 * CE-MCP version of perform_research
 *
 * Returns a state machine directive for research workflows.
 * Reduces token usage from ~10K to ~3K by:
 * - Lazy loading research templates
 * - Sequential research phases in state machine
 * - Caching intermediate results
 */
export function createPerformResearchDirective(
  args: CEMCPPerformResearchArgs
): StateMachineDirective {
  const { topic, depth = 'standard', outputFormat = 'detailed', sources = [] } = args;

  return {
    type: 'state_machine_directive',
    version: '1.0',
    initial_state: {
      topic,
      depth,
      outputFormat,
      sources,
      findings: [],
    },
    transitions: [
      {
        name: 'load_research_template',
        from: 'initial',
        operation: {
          op: 'loadPrompt',
          args: {
            name: 'research-question',
            section: 'research_plan',
          },
          store: 'researchTemplate',
        },
        next_state: 'template_loaded',
      },
      {
        name: 'generate_research_questions',
        from: 'template_loaded',
        operation: {
          op: 'generateContext',
          args: {
            type: 'research-questions',
            topic,
            depth,
          },
          inputs: ['researchTemplate'],
          store: 'researchQuestions',
        },
        next_state: 'questions_generated',
      },
      {
        name: 'load_knowledge_base',
        from: 'questions_generated',
        operation: {
          op: 'loadKnowledge',
          args: {
            domain: 'research',
            scope: topic,
          },
          store: 'knowledgeBase',
        },
        next_state: 'knowledge_loaded',
      },
      {
        name: 'synthesize_findings',
        from: 'knowledge_loaded',
        operation: {
          op: 'generateContext',
          args: {
            type: 'research-synthesis',
            outputFormat,
          },
          inputs: ['researchQuestions', 'knowledgeBase'],
          store: 'findings',
        },
        next_state: 'synthesized',
      },
      {
        name: 'format_output',
        from: 'synthesized',
        operation: {
          op: 'composeResult',
          inputs: ['findings', 'researchQuestions'],
          return: true,
        },
        next_state: 'done',
      },
    ],
    final_state: 'done',
  };
}

/**
 * Arguments for CE-MCP generate ADRs from PRD
 */
export interface CEMCPGenerateAdrsFromPrdArgs {
  prdPath: string;
  outputDirectory?: string;
  maxAdrs?: number;
  focusAreas?: string[];
}

/**
 * CE-MCP version of generate_adrs_from_prd
 *
 * Returns a state machine directive for PRD-to-ADR generation.
 * Reduces token usage from ~8K to ~3K by:
 * - Lazy loading ADR templates
 * - Sequential PRD analysis phases
 * - Caching parsed PRD content
 */
export function createGenerateAdrsFromPrdDirective(
  args: CEMCPGenerateAdrsFromPrdArgs
): StateMachineDirective {
  const { prdPath, outputDirectory = 'docs/adrs', maxAdrs = 10, focusAreas = [] } = args;

  return {
    type: 'state_machine_directive',
    version: '1.0',
    initial_state: {
      prdPath,
      outputDirectory,
      maxAdrs,
      focusAreas,
      generatedAdrs: [],
    },
    transitions: [
      {
        name: 'read_prd',
        from: 'initial',
        operation: {
          op: 'analyzeFiles',
          args: {
            patterns: [prdPath],
            maxFiles: 1,
          },
          store: 'prdContent',
        },
        next_state: 'prd_loaded',
      },
      {
        name: 'load_adr_template',
        from: 'prd_loaded',
        operation: {
          op: 'loadPrompt',
          args: {
            name: 'adr-suggestion',
            section: 'recommendation_template',
          },
          store: 'adrTemplate',
        },
        next_state: 'template_loaded',
      },
      {
        name: 'extract_decisions',
        from: 'template_loaded',
        operation: {
          op: 'generateContext',
          args: {
            type: 'prd-decision-extraction',
            maxAdrs,
            focusAreas,
          },
          inputs: ['prdContent', 'adrTemplate'],
          store: 'extractedDecisions',
        },
        next_state: 'decisions_extracted',
      },
      {
        name: 'generate_adrs',
        from: 'decisions_extracted',
        operation: {
          op: 'generateContext',
          args: {
            type: 'adr-generation',
            outputDirectory,
          },
          inputs: ['extractedDecisions', 'adrTemplate'],
          store: 'generatedAdrs',
        },
        next_state: 'adrs_generated',
      },
      {
        name: 'validate_adrs',
        from: 'adrs_generated',
        operation: {
          op: 'validateOutput',
          args: {
            schema: {
              type: 'array',
              items: { type: 'object' },
            },
          },
          input: 'generatedAdrs',
          store: 'validatedAdrs',
        },
        next_state: 'done',
        on_error: 'skip',
      },
    ],
    final_state: 'done',
  };
}

/**
 * Arguments for CE-MCP interactive ADR planning
 */
export interface CEMCPInteractiveAdrPlanningArgs {
  projectPath: string;
  sessionMode?: 'guided' | 'free-form';
  existingAdrs?: string[];
}

/**
 * CE-MCP version of interactive_adr_planning
 *
 * Returns a state machine directive for interactive ADR sessions.
 * Reduces token usage from ~6K to ~2K by:
 * - Lazy loading planning templates
 * - Sequential planning phases
 * - Context-aware suggestions
 */
export function createInteractiveAdrPlanningDirective(
  args: CEMCPInteractiveAdrPlanningArgs
): StateMachineDirective {
  const { projectPath, sessionMode = 'guided', existingAdrs = [] } = args;

  return {
    type: 'state_machine_directive',
    version: '1.0',
    initial_state: {
      projectPath,
      sessionMode,
      existingAdrs,
      suggestions: [],
      priorities: [],
    },
    transitions: [
      {
        name: 'analyze_project',
        from: 'initial',
        operation: {
          op: 'analyzeFiles',
          args: {
            patterns: ['**/*.ts', '**/*.js', 'package.json', 'tsconfig.json'],
            maxFiles: 50,
          },
          store: 'projectAnalysis',
        },
        next_state: 'project_analyzed',
      },
      {
        name: 'load_existing_adrs',
        from: 'project_analyzed',
        operation: {
          op: 'loadKnowledge',
          args: {
            domain: 'adr',
            scope: 'existing',
          },
          store: 'existingAdrKnowledge',
        },
        next_state: 'adrs_loaded',
      },
      {
        name: 'load_planning_template',
        from: 'adrs_loaded',
        operation: {
          op: 'loadPrompt',
          args: {
            name: 'adr-suggestion',
            section: sessionMode === 'guided' ? 'implicit_decisions' : 'recommendation_template',
          },
          store: 'planningTemplate',
        },
        next_state: 'template_loaded',
      },
      {
        name: 'generate_suggestions',
        from: 'template_loaded',
        operation: {
          op: 'generateContext',
          args: {
            type: 'adr-planning',
            sessionMode,
          },
          inputs: ['projectAnalysis', 'existingAdrKnowledge', 'planningTemplate'],
          store: 'planningResults',
        },
        next_state: 'done',
      },
    ],
    final_state: 'done',
  };
}

/**
 * Arguments for CE-MCP MCP planning
 */
export interface CEMCPMcpPlanningArgs {
  goal: string;
  constraints?: string[];
  existingTools?: string[];
}

/**
 * CE-MCP version of mcp_planning
 *
 * Returns an orchestration directive for MCP server planning.
 * Reduces token usage from ~6K to ~2K by:
 * - Lazy loading MCP patterns
 * - Deferring analysis to sandbox
 * - Caching planning results
 */
export function createMcpPlanningDirective(args: CEMCPMcpPlanningArgs): OrchestrationDirective {
  const { goal, constraints = [], existingTools = [] } = args;

  return {
    type: 'orchestration_directive',
    version: '1.0',
    tool: 'mcp_planning',
    description: `Plan MCP implementation for: ${goal}`,
    sandbox_operations: [
      {
        op: 'loadKnowledge',
        args: {
          domain: 'mcp',
          scope: 'patterns',
        },
        store: 'mcpPatterns',
      },
      {
        op: 'loadPrompt',
        args: {
          name: 'analysis',
          section: 'architecture_assessment',
        },
        store: 'planningPrompt',
      },
      {
        op: 'generateContext',
        args: {
          type: 'mcp-planning',
          goal,
          constraints,
          existingTools,
        },
        inputs: ['mcpPatterns', 'planningPrompt'],
        store: 'planningContext',
      },
      {
        op: 'composeResult',
        input: 'planningContext',
        return: true,
      },
    ],
    compose: {
      sections: [
        { source: 'mcpPatterns', key: 'patterns' },
        { source: 'planningContext', key: 'plan' },
      ],
      template: 'mcp_planning_report',
      format: 'markdown',
    },
    metadata: {
      estimated_tokens: 2000,
      complexity: 'high',
      cacheable: true,
      cache_key: `mcp-plan-${goal.slice(0, 50)}`,
    },
  };
}

/**
 * Arguments for CE-MCP troubleshoot guided workflow
 */
export interface CEMCPTroubleshootGuidedWorkflowArgs {
  issue: string;
  context?: string;
  previousSteps?: string[];
}

/**
 * CE-MCP version of troubleshoot_guided_workflow
 *
 * Returns a state machine directive for troubleshooting workflows.
 * Reduces token usage from ~7K to ~2.5K by:
 * - Lazy loading troubleshooting guides
 * - Sequential diagnostic phases
 * - Context-aware remediation
 */
export function createTroubleshootGuidedWorkflowDirective(
  args: CEMCPTroubleshootGuidedWorkflowArgs
): StateMachineDirective {
  const { issue, context = '', previousSteps = [] } = args;

  return {
    type: 'state_machine_directive',
    version: '1.0',
    initial_state: {
      issue,
      context,
      previousSteps,
      diagnostics: [],
      remediation: null,
    },
    transitions: [
      {
        name: 'load_troubleshooting_guide',
        from: 'initial',
        operation: {
          op: 'loadPrompt',
          args: {
            name: 'deployment-analysis',
            section: 'validation_criteria',
          },
          store: 'troubleshootingGuide',
        },
        next_state: 'guide_loaded',
      },
      {
        name: 'scan_environment',
        from: 'guide_loaded',
        operation: {
          op: 'scanEnvironment',
          store: 'environmentState',
        },
        next_state: 'environment_scanned',
      },
      {
        name: 'analyze_issue',
        from: 'environment_scanned',
        operation: {
          op: 'generateContext',
          args: {
            type: 'issue-analysis',
            issue,
            context,
          },
          inputs: ['troubleshootingGuide', 'environmentState'],
          store: 'issueAnalysis',
        },
        next_state: 'issue_analyzed',
      },
      {
        name: 'generate_diagnostics',
        from: 'issue_analyzed',
        operation: {
          op: 'generateContext',
          args: {
            type: 'diagnostic-steps',
            previousSteps,
          },
          inputs: ['issueAnalysis'],
          store: 'diagnostics',
        },
        next_state: 'diagnostics_generated',
      },
      {
        name: 'suggest_remediation',
        from: 'diagnostics_generated',
        operation: {
          op: 'generateContext',
          args: {
            type: 'remediation-plan',
          },
          inputs: ['diagnostics', 'issueAnalysis'],
          store: 'remediation',
        },
        next_state: 'done',
      },
    ],
    final_state: 'done',
  };
}

// ============================================================================
// PHASE 5: OpenRouter Elimination - tool_chain_orchestrator
// ============================================================================

/**
 * Arguments for CE-MCP tool chain orchestrator
 */
export interface CEMCPToolChainOrchestratorArgs {
  operation:
    | 'generate_plan'
    | 'analyze_intent'
    | 'suggest_tools'
    | 'validate_plan'
    | 'reality_check'
    | 'session_guidance';
  userRequest: string;
  projectContext: {
    projectPath: string;
    adrDirectory?: string;
    todoPath?: string;
    hasADRs?: boolean;
    hasTODO?: boolean;
    projectType?: string;
  };
  constraints?: {
    maxSteps?: number;
    timeLimit?: string;
    excludeTools?: string[];
    prioritizeSpeed?: boolean;
  };
  customInstructions?: string;
  sessionContext?: {
    conversationLength?: number;
    previousActions?: string[];
    confusionIndicators?: string[];
    lastSuccessfulAction?: string;
    stuckOnTask?: string;
  };
}

/**
 * CE-MCP version of tool_chain_orchestrator
 *
 * Returns an orchestration directive for tool chain planning.
 * This eliminates the OpenRouter dependency by having the host LLM
 * (which already has full context) generate the tool execution plan directly.
 *
 * Key insight: The host LLM is better positioned to create plans because:
 * 1. It has the full conversation context
 * 2. It knows what tools it has already tried
 * 3. It can directly execute the plan without roundtrips
 *
 * Reduces token usage from ~8K to ~2K by:
 * - Eliminating OpenRouter API call overhead
 * - Providing structured directive format
 * - Enabling direct host LLM execution
 */
export function createToolChainOrchestratorDirective(
  args: CEMCPToolChainOrchestratorArgs
): OrchestrationDirective {
  const {
    operation,
    userRequest,
    projectContext,
    constraints = {},
    customInstructions = '',
    sessionContext = {},
  } = args;

  // Available tools for planning (subset of full catalog)
  const planningTools = [
    'analyze_project_ecosystem',
    'generate_adrs_from_prd',
    'suggest_adrs',
    'analyze_content_security',
    'generate_rules',
    'generate_adr_todo',
    'compare_adr_progress',
    'manage_todo',
    'generate_deployment_guidance',
    'smart_score',
    'troubleshoot_guided_workflow',
    'smart_git_push',
    'perform_research',
    'validate_rules',
  ];

  const sandbox_operations: SandboxOperation[] = [
    // Phase 1: Load tool catalog
    {
      op: 'loadKnowledge',
      args: {
        type: 'tool-catalog',
        filter: {
          names: planningTools,
        },
      },
      store: 'availableTools',
    },
    // Phase 2: Scan environment
    {
      op: 'scanEnvironment',
      store: 'environmentState',
    },
    // Phase 3: Generate execution plan context
    {
      op: 'generateContext',
      args: {
        type: 'tool-chain-plan',
        operation,
        userRequest,
        customInstructions,
        projectContext: {
          projectPath: projectContext.projectPath,
          adrDirectory: projectContext.adrDirectory || 'docs/adrs',
          todoPath: projectContext.todoPath || 'TODO.md',
          hasADRs: projectContext.hasADRs ?? false,
          hasTODO: projectContext.hasTODO ?? false,
          projectType: projectContext.projectType || 'unknown',
        },
        constraints: {
          maxSteps: constraints.maxSteps ?? 10,
          prioritizeSpeed: constraints.prioritizeSpeed ?? false,
          excludeTools: constraints.excludeTools || [],
        },
        sessionContext: {
          conversationLength: sessionContext.conversationLength ?? 0,
          previousActions: sessionContext.previousActions || [],
          confusionIndicators: sessionContext.confusionIndicators || [],
          lastSuccessfulAction: sessionContext.lastSuccessfulAction || '',
          stuckOnTask: sessionContext.stuckOnTask || '',
        },
      },
      inputs: ['availableTools', 'environmentState'],
      store: 'executionPlan',
    },
    // Phase 4: Compose final result
    {
      op: 'composeResult',
      inputs: ['availableTools', 'environmentState', 'executionPlan'],
      return: true,
    },
  ];

  return {
    type: 'orchestration_directive',
    version: '1.0',
    tool: 'tool_chain_orchestrator',
    description: `Generate tool execution plan for: "${userRequest}" (operation: ${operation})`,
    sandbox_operations,
    metadata: {
      estimated_tokens: 2000,
      complexity: 'medium',
      cacheable: false, // Plans are context-specific
    },
  };
}

// ============================================================================
// CE-MCP TOOL REGISTRY
// ============================================================================

/**
 * Check if a tool should use CE-MCP directive mode
 */
export function shouldUseCEMCPDirective(toolName: string, config: { mode: string }): boolean {
  const cemcpTools = [
    // Phase 2 tools
    'analyze_project_ecosystem',
    'suggest_adrs',
    'generate_rules',
    'analyze_environment',
    'deployment_readiness',
    // Phase 4.2 tools
    'smart_score',
    'perform_research',
    'generate_adrs_from_prd',
    'interactive_adr_planning',
    'mcp_planning',
    'troubleshoot_guided_workflow',
    // Phase 5: OpenRouter Elimination
    'tool_chain_orchestrator',
  ];

  return (
    (config.mode === 'ce-mcp' || config.mode === 'directive' || config.mode === 'hybrid') &&
    cemcpTools.includes(toolName)
  );
}

/**
 * Get CE-MCP directive for a tool
 */
export function getCEMCPDirective(
  toolName: string,
  args: Record<string, unknown>
): OrchestrationDirective | StateMachineDirective | null {
  switch (toolName) {
    // Phase 2 tools
    case 'analyze_project_ecosystem':
      return createAnalyzeProjectEcosystemDirective(
        args as unknown as CEMCPAnalyzeProjectEcosystemArgs
      );

    case 'suggest_adrs':
      return createSuggestAdrsDirective(args as unknown as CEMCPSuggestAdrsArgs);

    case 'generate_rules':
      return createGenerateRulesDirective(args as unknown as CEMCPGenerateRulesArgs);

    case 'analyze_environment':
      return createAnalyzeEnvironmentDirective(args as unknown as CEMCPAnalyzeEnvironmentArgs);

    case 'deployment_readiness':
      return createDeploymentReadinessDirective(args as unknown as CEMCPDeploymentReadinessArgs);

    // Phase 4.2 tools
    case 'smart_score':
      return createSmartScoreDirective(args as unknown as CEMCPSmartScoreArgs);

    case 'perform_research':
      return createPerformResearchDirective(args as unknown as CEMCPPerformResearchArgs);

    case 'generate_adrs_from_prd':
      return createGenerateAdrsFromPrdDirective(args as unknown as CEMCPGenerateAdrsFromPrdArgs);

    case 'interactive_adr_planning':
      return createInteractiveAdrPlanningDirective(
        args as unknown as CEMCPInteractiveAdrPlanningArgs
      );

    case 'mcp_planning':
      return createMcpPlanningDirective(args as unknown as CEMCPMcpPlanningArgs);

    case 'troubleshoot_guided_workflow':
      return createTroubleshootGuidedWorkflowDirective(
        args as unknown as CEMCPTroubleshootGuidedWorkflowArgs
      );

    // Phase 5: OpenRouter Elimination
    case 'tool_chain_orchestrator':
      return createToolChainOrchestratorDirective(
        args as unknown as CEMCPToolChainOrchestratorArgs
      );

    default:
      return null;
  }
}

/**
 * Format CE-MCP directive as MCP response
 */
export function formatDirectiveResponse(
  directive: OrchestrationDirective | StateMachineDirective
): { content: Array<{ type: 'text'; text: string }> } {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(directive, null, 2),
      },
    ],
  };
}
