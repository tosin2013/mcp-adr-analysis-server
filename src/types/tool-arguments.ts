/**
 * TypeScript interfaces for MCP tool arguments
 * Defines proper types for all tool methods to replace Record<string, unknown>
 */

// Workflow Guidance Tool Arguments
export interface GetWorkflowGuidanceArgs {
  goal: string;
  projectContext: string;
  availableAssets?: string[];
  timeframe?: string;
  primaryConcerns?: string[];
}

// Architectural Context Tool Arguments
export interface GetArchitecturalContextArgs {
  projectPath?: string;
  filePath?: string;
  includeCompliance?: boolean;
  analysisDepth?: string;
  recursiveDepth?: string;
  technologyFocus?: string[];
  analysisScope?: string[];
  includeEnvironment?: boolean;
}

// Implementation Guidance Tool Arguments
export interface GetImplementationGuidanceArgs {
  adrsToImplement: string[];
  technologyStack?: string[];
  teamContext?: string;
  focusAreas?: string[];
}

// Development Guidance Tool Arguments
export interface GetDevelopmentGuidanceArgs {
  developmentPhase?: string;
  adrsToImplement?: string[];
  technologyStack?: string[];
  currentProgress?: string;
  teamContext?: {
    size?: string;
    experienceLevel?: string;
  };
  timeline?: string;
  focusAreas?: string[];
}

// Decision Data for ADR Generation
export interface DecisionData {
  title: string;
  context: string;
  decision: string;
  consequences: string;
  alternatives?: string[];
  evidence?: string[];
}

// Generate ADR from Decision Arguments
export interface GenerateAdrFromDecisionArgs {
  decisionData: DecisionData;
  templateFormat?: 'custom' | 'nygard' | 'madr';
  existingAdrs?: string[];
  adrDirectory?: string;
}

// Action Arguments
export interface ActionArgs {
  action: string;
  details: string;
  impact?: 'low' | 'medium' | 'high' | 'critical';
}

// Rule Definition
export interface RuleDefinition {
  id: string;
  name: string;
  description: string;
  pattern: string;
  severity: string;
  message: string;
}

// Validate Rules Arguments
export interface ValidateRulesArgs {
  filePath?: string;
  fileContent?: string;
  fileName?: string;
  rules: RuleDefinition[];
  validationType?: 'file' | 'function' | 'component' | 'module';
  reportFormat?: 'detailed' | 'summary' | 'json';
  projectPath?: string;
  findingThreshold?: string;
}

// Create Rule Set Arguments
export interface CreateRuleSetArgs {
  name: string;
  description?: string;
  adrRules?: any[];
  patternRules?: any[];
  rules?: any[];
  outputFormat?: 'json' | 'yaml' | 'both';
  author?: string;
}

// Project Context for Todo Management
export interface ProjectContext {
  projectPath: string;
  adrDirectory: string;
  todoPath: string;
  projectType?: string;
  hasADRs?: boolean;
  hasTODO?: boolean;
}

// Failure Details for Todo Management
export interface FailureDetails {
  failureType:
    | 'build_failure'
    | 'test_failure'
    | 'deployment_failure'
    | 'runtime_error'
    | 'performance_issue'
    | 'security_issue'
    | 'other';
  failureDetails: {
    errorMessage: string;
    timestamp?: string;
    environment?: string;
    command?: string;
    exitCode?: number;
    stackTrace?: string;
    logOutput?: string;
    affectedFiles?: string[];
  };
  context?: {
    impact?: 'low' | 'medium' | 'high' | 'critical';
    frequency?: string;
    recentChanges?: string;
    reproducible?: boolean;
  };
}

// Todo Management V2 Arguments
export interface TodoManagementV2Args {
  adrDirectory: string;
  operation: 'full_workflow' | 'generate_test_plan' | 'analyze_failure';
  todoPath: string;
  projectPath?: string;
  failure?: FailureDetails;
}

// Constraints for Tool Chain Orchestrator
export interface Constraints {
  maxSteps?: number;
  timeLimit?: string;
  excludeTools?: string[];
  prioritizeSpeed?: boolean;
}

// Tool Chain Orchestrator Arguments
export interface ToolChainOrchestratorArgs {
  projectContext: ProjectContext;
  operation:
    | 'generate_plan'
    | 'analyze_intent'
    | 'suggest_tools'
    | 'validate_plan'
    | 'reality_check'
    | 'session_guidance';
  userRequest: string;
  constraints?: Constraints;
  customInstructions?: string[];
}

// File Operations Arguments
export interface ReadFileArgs {
  filePath: string;
  encoding?: string;
}

export interface WriteFileArgs {
  filePath: string;
  content: string;
  encoding?: string;
}

export interface ListDirectoryArgs {
  directoryPath: string;
  recursive?: boolean;
}

// Deployment and Git Arguments
export interface SmartGitPushArgs {
  commitMessage?: string;
  branch?: string;
  force?: boolean;
}

export interface DeploymentReadinessArgs {
  environment?: string;
  checkType?: 'basic' | 'full' | 'security';
}

// General Arguments (for methods that don't need specific args)
export interface EmptyArgs {
  // For methods that take no meaningful arguments
}

// Content Masking Tool Arguments
export interface AnalyzeContentSecurityArgs {
  content: string;
  contentType?: 'code' | 'documentation' | 'configuration' | 'logs' | 'general';
  userDefinedPatterns?: string[];
  knowledgeEnhancement?: boolean;
  enhancedMode?: boolean;
  enableMemoryIntegration?: boolean;
  enableTreeSitterAnalysis?: boolean;
}

export interface DetectedItem {
  type: string;
  category?: string;
  content: string;
  startPosition: number;
  endPosition: number;
  confidence?: number;
  reasoning?: string;
  severity: string;
  suggestedMask?: string;
}

export interface GenerateContentMaskingArgs {
  content: string;
  detectedItems: DetectedItem[];
  contentType?: 'code' | 'documentation' | 'configuration' | 'general';
}

export interface ConfigureCustomPatternsArgs {
  projectPath: string;
  existingPatterns?: string[];
}

export interface ApplyBasicContentMaskingArgs {
  content: string;
  maskingStrategy?: 'full' | 'partial' | 'placeholder';
}

export interface ValidateContentMaskingArgs {
  originalContent: string;
  maskedContent: string;
}

// Analyze Project Ecosystem Arguments
export interface AnalyzeProjectEcosystemArgs {
  projectPath?: string;
  includePatterns?: string[];
  enhancedMode?: boolean;
  knowledgeEnhancement?: boolean;
  learningEnabled?: boolean;
  technologyFocus?: string[];
  analysisDepth?: string;
  includeEnvironment?: boolean;
  recursiveDepth?: string;
  analysisScope?: string[];
}

// Import existing types from specialized modules
export type {
  ArchitecturalContext,
  ArchitecturalDomain,
  KnowledgeGenerationConfig,
  PromptObject,
} from './knowledge-generation.js';

export type { ReflexionConfig, MemoryQuery } from './reflexion-framework.js';

// Function Type Definitions for Dynamic Imports
export type GenerateArchitecturalKnowledgeFunction = (
  context: import('./knowledge-generation.js').ArchitecturalContext,
  config?: import('./knowledge-generation.js').KnowledgeGenerationConfig
) => Promise<{ prompt: string; instructions: string; context: any }>;

export type ExecuteWithReflexionFunction = (
  basePrompt: import('./knowledge-generation.js').PromptObject,
  config?: Partial<import('./reflexion-framework.js').ReflexionConfig>
) => Promise<{ prompt: string; instructions: string; context: any }>;

export type RetrieveRelevantMemoriesFunction = (
  taskType: string,
  context: any,
  query?: Partial<import('./reflexion-framework.js').MemoryQuery>
) => Promise<{ prompt: string; instructions: string; context: any }>;

export type CreateToolReflexionConfigFunction = (
  toolName: string,
  customConfig?: Partial<import('./reflexion-framework.js').ReflexionConfig>
) => import('./reflexion-framework.js').ReflexionConfig;
