/**
 * MCP Prompts for ADR Analysis Server
 * Pre-written templates that help users accomplish specific tasks
 */

export interface PromptTemplate {
  name: string;
  description: string;
  arguments: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
  template: string;
}

/**
 * Goal specification prompt for project analysis
 */
export const goalSpecificationPrompt: PromptTemplate = {
  name: 'goal_specification',
  description: 'Specify project goals and requirements for comprehensive analysis',
  arguments: [
    {
      name: 'project_type',
      description: 'Type of project (web, mobile, api, library, tool, etc.)',
      required: false,
    },
    {
      name: 'target_audience',
      description: 'Target audience or users of the project',
      required: false,
    },
    {
      name: 'scale_requirements',
      description: 'Expected scale and performance requirements',
      required: false,
    },
  ],
  template: `# Project Goal Specification Guide

**Note: Use this as guidance to help define clear goals and requirements for project analysis. Adapt the questions and approach based on what's most relevant to your specific project.**

## Project Context
{{#if project_type}}
**Project Type**: {{project_type}}
{{/if}}
{{#if target_audience}}
**Target Audience**: {{target_audience}}
{{/if}}
{{#if scale_requirements}}
**Scale Requirements**: {{scale_requirements}}
{{/if}}

## Questions to Consider

1. **Primary Purpose**: What is the main purpose of this project?
2. **Key Features**: What are the core features or capabilities?
3. **Technical Constraints**: Are there any specific technical requirements or constraints?
4. **Quality Attributes**: What quality attributes are most important (performance, security, maintainability, etc.)?
5. **Integration Requirements**: Does this project need to integrate with other systems?
6. **Deployment Environment**: Where will this project be deployed?

Consider providing detailed answers where relevant to help guide the architectural analysis and recommendations.`,
};

/**
 * Action confirmation prompt for file operations
 */
export const actionConfirmationPrompt: PromptTemplate = {
  name: 'action_confirmation',
  description: 'Confirm actions before writing files to disk',
  arguments: [
    {
      name: 'action',
      description: 'Description of the action to be performed',
      required: true,
    },
    {
      name: 'files',
      description: 'List of files that will be affected (JSON array)',
      required: true,
    },
    {
      name: 'preview',
      description: 'Preview of changes to be made',
      required: false,
    },
  ],
  template: `# Action Confirmation Required

## Proposed Action
{{action}}

## Files to be Modified/Created
{{#each files}}
- **{{this.path}}** ({{this.action}})
  {{#if this.description}}
  Description: {{this.description}}
  {{/if}}
{{/each}}

{{#if preview}}
## Preview of Changes
\`\`\`
{{preview}}
\`\`\`
{{/if}}

## Confirmation Required

⚠️ **Important**: This action will modify files on your local file system.

Please confirm:
- [ ] I have reviewed the proposed changes
- [ ] I understand which files will be modified
- [ ] I want to proceed with this action

**Type 'CONFIRM' to proceed or 'CANCEL' to abort.**`,
};

/**
 * Ambiguity resolution prompt for unclear requirements
 */
export const ambiguityResolutionPrompt: PromptTemplate = {
  name: 'ambiguity_resolution',
  description: 'Resolve ambiguities in project analysis or requirements',
  arguments: [
    {
      name: 'context',
      description: 'Context where ambiguity was detected',
      required: true,
    },
    {
      name: 'ambiguous_items',
      description: 'List of ambiguous items that need clarification',
      required: true,
    },
    {
      name: 'suggestions',
      description: 'Suggested interpretations or options',
      required: false,
    },
  ],
  template: `# Ambiguity Resolution Required

## Context
{{context}}

## Items Requiring Clarification

{{#each ambiguous_items}}
### {{@index}}. {{this.item}}
**Issue**: {{this.issue}}
{{#if this.impact}}
**Impact**: {{this.impact}}
{{/if}}

{{#if this.options}}
**Possible Interpretations**:
{{#each this.options}}
- {{this}}
{{/each}}
{{/if}}

{{/each}}

{{#if suggestions}}
## Suggested Resolutions
{{suggestions}}
{{/if}}

## Next Steps

Please provide clarification for the ambiguous items above. Your input will help ensure accurate analysis and appropriate architectural recommendations.

For each item, please specify:
1. Your preferred interpretation
2. Any additional context or constraints
3. Priority level (high/medium/low)`,
};

/**
 * Custom rule definition prompt for architectural rules
 */
export const customRuleDefinitionPrompt: PromptTemplate = {
  name: 'custom_rule_definition',
  description: 'Define custom architectural rules and validation criteria',
  arguments: [
    {
      name: 'rule_category',
      description: 'Category of rule (architectural, coding, security, performance, documentation)',
      required: true,
    },
    {
      name: 'existing_rules',
      description: 'Existing rules in the project (JSON array)',
      required: false,
    },
  ],
  template: `# Custom Rule Definition

## Rule Category
{{rule_category}}

{{#if existing_rules}}
## Existing Rules
{{#each existing_rules}}
- **{{this.name}}**: {{this.description}}
  - Pattern: \`{{this.pattern}}\`
  - Severity: {{this.severity}}
{{/each}}
{{/if}}

## Rule Definition Template

Please define your custom rule using the following structure:

\`\`\`json
{
  "name": "Rule Name",
  "description": "Clear description of what this rule enforces",
  "type": "{{rule_category}}",
  "severity": "info|warning|error|critical",
  "pattern": "regex or glob pattern to match",
  "message": "Message to display when rule is violated",
  "examples": {
    "valid": ["example of valid code/structure"],
    "invalid": ["example of invalid code/structure"]
  }
}
\`\`\`

## Guidelines

1. **Be Specific**: Rules should be clear and unambiguous
2. **Provide Examples**: Include both valid and invalid examples
3. **Consider Impact**: Choose appropriate severity levels
4. **Test Patterns**: Ensure regex/glob patterns work correctly

## Common Rule Types

- **Naming Conventions**: File/function/variable naming patterns
- **Structure Rules**: Directory organization requirements
- **Dependency Rules**: Allowed/forbidden dependencies
- **Security Rules**: Security best practices enforcement
- **Performance Rules**: Performance-related constraints`,
};

/**
 * Baseline analysis prompt for existing projects
 */
export const baselineAnalysisPrompt: PromptTemplate = {
  name: 'baseline_analysis',
  description: 'Generate comprehensive baseline analysis for existing projects',
  arguments: [
    {
      name: 'project_path',
      description: 'Path to the project directory',
      required: true,
    },
    {
      name: 'focus_areas',
      description: 'Specific areas to focus on (comma-separated)',
      required: false,
    },
  ],
  template: `# Baseline Analysis Guide

**Note: Use this as guidance for conducting a comprehensive baseline analysis of existing projects. Focus on the areas most relevant to your specific project and requirements.**

## Project Information
**Project Path**: {{project_path}}
{{#if focus_areas}}
**Focus Areas**: {{focus_areas}}
{{/if}}

## Analysis Scope

This baseline analysis will examine your existing project to provide:

### 🔍 **Technology Stack Analysis**
- Programming languages and frameworks
- Databases and data storage
- Cloud services and infrastructure
- Development and deployment tools

### 🏗️ **Architectural Pattern Detection**
- Design patterns and architectural styles
- Code organization and structure
- Communication patterns
- Testing strategies

### 📊 **Quality Assessment**
- Code quality metrics
- Best practices adherence
- Technical debt identification
- Security considerations

### 📋 **ADR Discovery**
- Existing architectural decisions
- Implicit decisions in code
- Missing decision documentation

### ✅ **Action Items Generation**
- Priority improvements
- Missing components
- Recommended next steps

## Expected Outputs

1. **Comprehensive Analysis Report**
2. **Technology Inventory**
3. **Pattern Assessment**
4. **Generated/Updated todo.md**
5. **Architectural Recommendations**

Consider confirming to proceed with the baseline analysis if this scope meets your requirements.`,
};

/**
 * Secret prevention guidance prompt
 */
export const secretPreventionPrompt: PromptTemplate = {
  name: 'secret_prevention_guidance',
  description: 'Proactive guidance to prevent secret exposure in code and documentation',
  arguments: [
    {
      name: 'content_type',
      description: 'Type of content being created (code, documentation, configuration)',
      required: true,
    },
    {
      name: 'target_location',
      description: 'Where the content will be stored/committed',
      required: false,
    },
  ],
  template: `# 🔒 Secret Prevention Guidance

## Content Type
{{content_type}}

{{#if target_location}}
## Target Location
{{target_location}}
{{/if}}

## ⚠️ Security Checklist

Before proceeding, please verify that your content does NOT contain:

### 🔑 **API Keys & Tokens**
- [ ] API keys (AWS, Google, GitHub, etc.)
- [ ] Access tokens or bearer tokens
- [ ] OAuth client secrets
- [ ] Service account keys

### 🔐 **Credentials**
- [ ] Passwords or passphrases
- [ ] Database connection strings with credentials
- [ ] Private keys or certificates
- [ ] SSH keys

### 🌐 **URLs & Endpoints**
- [ ] Internal URLs or IP addresses
- [ ] Database connection URLs with credentials
- [ ] Private service endpoints

### 📧 **Personal Information**
- [ ] Email addresses (unless public)
- [ ] Phone numbers
- [ ] Personal names in sensitive contexts

## 🛡️ Best Practices

1. **Use Environment Variables**: Store secrets in .env files (add to .gitignore)
2. **Use Secret Management**: Leverage tools like HashiCorp Vault, AWS Secrets Manager
3. **Use Placeholders**: Replace actual values with \`<YOUR_API_KEY>\` or \`\${API_KEY}\`
4. **Review Before Commit**: Always review changes before committing

## 🚨 If Secrets Are Detected

If you need to include sensitive information:
1. Use configuration templates with placeholders
2. Document required environment variables
3. Provide setup instructions without actual values
4. Consider using secret scanning tools

**Proceed only after confirming no secrets are present.**`,
};

/**
 * TODO task management prompt for generating development tasks from ADRs
 */
export const todoTaskGenerationPrompt: PromptTemplate = {
  name: 'todo_task_generation',
  description: 'Generate comprehensive development task list from ADRs with cloud/DevOps expertise',
  arguments: [
    {
      name: 'adrDirectory',
      description: 'Directory containing ADR files',
      required: false,
    },
    {
      name: 'scope',
      description: 'Task scope: all, pending, in_progress',
      required: false,
    },
    {
      name: 'phase',
      description: 'Development phase: both, test, production',
      required: false,
    },
    {
      name: 'projectPath',
      description: 'Path to the project directory',
      required: false,
    },
  ],
  template: `# Generate Development Tasks from ADRs

## Project Configuration
- **ADR Directory**: {{adrDirectory}}
- **Project Path**: {{projectPath}}
- **Task Scope**: {{scope}}
- **Development Phase**: {{phase}}

You are an expert task planner with deep expertise in cloud architecture, DevOps practices, and modern software development. Your specialty areas include:

- **Cloud Platforms**: AWS, GCP, Azure
- **Container Technologies**: Docker, Kubernetes
- **Infrastructure as Code**: Terraform, CloudFormation
- **DevOps Practices**: CI/CD, monitoring, observability
- **Security**: Cloud security, compliance, best practices

## Analysis Instructions

1. **Discover ADRs**: Analyze all ADR files in the specified directory
2. **Extract Requirements**: Identify implementation tasks from each ADR
3. **Apply Cloud Expertise**: Leverage cloud/DevOps knowledge for task creation
4. **Prioritize Tasks**: Use enterprise-grade prioritization framework
5. **Create Dependencies**: Map task relationships and critical path

## Deliverable

Provide a comprehensive task breakdown optimized for cloud-native, enterprise-grade implementation following modern DevOps practices.

Focus especially on:
- Infrastructure automation
- Container orchestration
- Security-first implementation
- Monitoring and observability
- Scalable architecture patterns`,
};

/**
 * TODO task status management prompt
 */
export const todoStatusManagementPrompt: PromptTemplate = {
  name: 'todo_status_management',
  description: 'Manage task status, priorities, and progress tracking',
  arguments: [
    {
      name: 'action',
      description: 'Action to perform: list, update, complete, prioritize',
      required: true,
    },
    {
      name: 'taskId',
      description: 'Specific task ID (for update/complete actions)',
      required: false,
    },
    {
      name: 'newStatus',
      description: 'New status for update action',
      required: false,
    },
    {
      name: 'filters',
      description: 'Filters for list action (JSON array)',
      required: false,
    },
  ],
  template: `# Task Status Management

## Action Configuration
- **Action**: {{action}}
- **Task ID**: {{taskId}}
- **New Status**: {{newStatus}}
- **Filters**: {{filters}}

You are a technical project manager with expertise in software delivery and team coordination. You excel at:

- **Status Tracking**: Maintaining accurate task progress
- **Priority Management**: Balancing business and technical priorities
- **Risk Assessment**: Identifying blockers and dependencies
- **Resource Optimization**: Maximizing team productivity

## Management Framework

Apply enterprise project management principles with focus on:
- Clear status definitions and transitions
- Impact-driven prioritization
- Dependency-aware scheduling
- Quality gate validation
- Continuous improvement metrics

Provide actionable insights and recommendations for maintaining project velocity and quality.`,
};

/**
 * TODO dependency analysis prompt
 */
export const todoDependencyAnalysisPrompt: PromptTemplate = {
  name: 'todo_dependency_analysis',
  description: 'Analyze task dependencies and critical path optimization',
  arguments: [
    {
      name: 'taskId',
      description: 'Target task for dependency analysis',
      required: false,
    },
    {
      name: 'includeUpstream',
      description: 'Include upstream dependencies (true/false)',
      required: false,
    },
    {
      name: 'includeDownstream',
      description: 'Include downstream dependencies (true/false)',
      required: false,
    },
    {
      name: 'analysisDepth',
      description: 'Analysis depth: shallow, deep',
      required: false,
    },
  ],
  template: `# Task Dependency Analysis

## Analysis Configuration
- **Target Task**: {{taskId}}
- **Include Upstream**: {{includeUpstream}}
- **Include Downstream**: {{includeDownstream}}
- **Analysis Depth**: {{analysisDepth}}

You are a systems architect and project planning expert specializing in complex technical dependencies. Your expertise includes:

- **Critical Path Analysis**: Identifying bottlenecks and optimization opportunities
- **Risk Assessment**: Evaluating dependency risks and mitigation strategies
- **Resource Optimization**: Maximizing parallel execution and team efficiency
- **Technical Dependencies**: Understanding code, infrastructure, and integration dependencies

## Analysis Framework

Provide comprehensive dependency analysis focusing on:
- Critical path identification and optimization
- Bottleneck detection and resolution strategies
- Risk assessment and contingency planning
- Resource allocation recommendations
- Timeline optimization opportunities

Consider both technical and business impacts in your analysis.`,
};

/**
 * TODO estimation and planning prompt
 */
export const todoEstimationPrompt: PromptTemplate = {
  name: 'todo_estimation',
  description: 'Provide accurate task estimation and timeline planning',
  arguments: [
    {
      name: 'taskId',
      description: 'Task to estimate',
      required: false,
    },
    {
      name: 'estimationType',
      description: 'Type of estimation: effort, duration, resources',
      required: false,
    },
    {
      name: 'includeUncertainty',
      description: 'Include uncertainty analysis (true/false)',
      required: false,
    },
    {
      name: 'granularity',
      description: 'Estimation granularity: high, medium, low',
      required: false,
    },
  ],
  template: `# Task Estimation and Planning

## Estimation Configuration
- **Task**: {{taskId}}
- **Estimation Type**: {{estimationType}}
- **Include Uncertainty**: {{includeUncertainty}}
- **Granularity**: {{granularity}}

You are a senior engineering manager with extensive experience in software estimation and delivery planning. Your expertise includes:

- **Estimation Techniques**: Three-point estimation, historical data analysis, expert judgment
- **Uncertainty Management**: Risk assessment and buffer planning
- **Resource Planning**: Team capacity and skill assessment
- **Quality Assurance**: Ensuring estimates include proper validation and testing

## Estimation Framework

Provide professional-grade estimates considering:
- Historical data and team velocity
- Technical complexity and risk factors
- Resource availability and skill levels
- Quality requirements and validation needs
- Uncertainty factors and contingency planning

Use industry best practices for accurate and reliable estimation.`,
};

/**
 * Function-based prompts from individual modules
 */
import * as analysisPrompts from './analysis-prompts.js';
import * as adrSuggestionPrompts from './adr-suggestion-prompts.js';
import * as deploymentAnalysisPrompts from './deployment-analysis-prompts.js';
import * as environmentAnalysisPrompts from './environment-analysis-prompts.js';
import * as researchIntegrationPrompts from './research-integration-prompts.js';
import * as researchQuestionPrompts from './research-question-prompts.js';
import * as ruleGenerationPrompts from './rule-generation-prompts.js';
import * as securityPrompts from './security-prompts.js';
import * as todoPrompts from './todo-prompts.js';

/**
 * Convert function-based prompts to template format
 */
function createFunctionPromptTemplate(
  name: string,
  description: string,
  argumentsSchema: Array<{ name: string; description: string; required: boolean }>,
  fn: Function
): PromptTemplate {
  return {
    name,
    description,
    arguments: argumentsSchema,
    template: `This is a dynamic prompt. Call the function with the provided arguments to generate the actual prompt content.

Function: ${fn.name}
Arguments: ${JSON.stringify(argumentsSchema, null, 2)}

To use this prompt, provide the required arguments and the system will generate the appropriate prompt content.`,
  };
}

/**
 * Dynamic function-based prompts
 */
const functionBasedPrompts: PromptTemplate[] = [
  // Analysis prompts
  createFunctionPromptTemplate(
    'technology_detection_prompt',
    'Generate technology detection analysis prompt',
    [
      {
        name: 'projectContext',
        description: 'Project context for technology detection',
        required: true,
      },
    ],
    analysisPrompts.generateTechnologyDetectionPrompt
  ),
  createFunctionPromptTemplate(
    'pattern_detection_prompt',
    'Generate architectural pattern detection prompt',
    [
      {
        name: 'projectContext',
        description: 'Project context for pattern detection',
        required: true,
      },
    ],
    analysisPrompts.generatePatternDetectionPrompt
  ),
  createFunctionPromptTemplate(
    'comprehensive_analysis_prompt',
    'Generate comprehensive project analysis prompt',
    [{ name: 'context', description: 'Analysis context and parameters', required: true }],
    analysisPrompts.generateComprehensiveAnalysisPrompt
  ),

  // ADR suggestion prompts
  createFunctionPromptTemplate(
    'implicit_decision_detection_prompt',
    'Generate prompt for detecting implicit architectural decisions in code',
    [
      {
        name: 'args',
        description: 'Analysis arguments including code patterns and context',
        required: true,
      },
    ],
    adrSuggestionPrompts.generateImplicitDecisionDetectionPrompt
  ),
  createFunctionPromptTemplate(
    'code_change_analysis_prompt',
    'Generate prompt for analyzing code changes for architectural decisions',
    [{ name: 'args', description: 'Code change analysis parameters', required: true }],
    adrSuggestionPrompts.generateCodeChangeAnalysisPrompt
  ),
  createFunctionPromptTemplate(
    'adr_template_prompt',
    'Generate ADR template prompt with specific format and context',
    [{ name: 'args', description: 'ADR template generation parameters', required: true }],
    adrSuggestionPrompts.generateAdrTemplatePrompt
  ),

  // Deployment analysis prompts
  createFunctionPromptTemplate(
    'deployment_task_identification_prompt',
    'Generate prompt for identifying deployment tasks',
    [{ name: 'args', description: 'Deployment context and requirements', required: true }],
    deploymentAnalysisPrompts.generateDeploymentTaskIdentificationPrompt
  ),
  createFunctionPromptTemplate(
    'cicd_analysis_prompt',
    'Generate CI/CD pipeline analysis prompt',
    [{ name: 'args', description: 'CI/CD analysis parameters', required: true }],
    deploymentAnalysisPrompts.generateCiCdAnalysisPrompt
  ),
  createFunctionPromptTemplate(
    'deployment_progress_calculation_prompt',
    'Generate deployment progress calculation prompt',
    [{ name: 'args', description: 'Progress calculation parameters', required: true }],
    deploymentAnalysisPrompts.generateDeploymentProgressCalculationPrompt
  ),
  createFunctionPromptTemplate(
    'completion_verification_prompt',
    'Generate completion verification prompt',
    [{ name: 'args', description: 'Verification parameters and criteria', required: true }],
    deploymentAnalysisPrompts.generateCompletionVerificationPrompt
  ),

  // Environment analysis prompts
  createFunctionPromptTemplate(
    'environment_spec_analysis_prompt',
    'Generate environment specification analysis prompt',
    [{ name: 'args', description: 'Environment analysis parameters', required: true }],
    environmentAnalysisPrompts.generateEnvironmentSpecAnalysisPrompt
  ),
  createFunctionPromptTemplate(
    'containerization_detection_prompt',
    'Generate containerization detection prompt',
    [{ name: 'args', description: 'Containerization analysis parameters', required: true }],
    environmentAnalysisPrompts.generateContainerizationDetectionPrompt
  ),
  createFunctionPromptTemplate(
    'adr_environment_requirements_prompt',
    'Generate ADR environment requirements prompt',
    [{ name: 'args', description: 'Environment requirements analysis parameters', required: true }],
    environmentAnalysisPrompts.generateAdrEnvironmentRequirementsPrompt
  ),
  createFunctionPromptTemplate(
    'environment_compliance_prompt',
    'Generate environment compliance analysis prompt',
    [{ name: 'args', description: 'Compliance analysis parameters', required: true }],
    environmentAnalysisPrompts.generateEnvironmentCompliancePrompt
  ),

  // Research integration prompts
  createFunctionPromptTemplate(
    'research_topic_extraction_prompt',
    'Generate research topic extraction prompt',
    [{ name: 'args', description: 'Research extraction parameters', required: true }],
    researchIntegrationPrompts.generateResearchTopicExtractionPrompt
  ),
  createFunctionPromptTemplate(
    'research_impact_evaluation_prompt',
    'Generate research impact evaluation prompt',
    [{ name: 'args', description: 'Impact evaluation parameters', required: true }],
    researchIntegrationPrompts.generateResearchImpactEvaluationPrompt
  ),
  createFunctionPromptTemplate(
    'adr_update_suggestion_prompt',
    'Generate ADR update suggestion prompt',
    [{ name: 'args', description: 'ADR update parameters', required: true }],
    researchIntegrationPrompts.generateAdrUpdateSuggestionPrompt
  ),

  // Research question prompts
  createFunctionPromptTemplate(
    'problem_knowledge_correlation_prompt',
    'Generate problem-knowledge correlation prompt',
    [{ name: 'args', description: 'Correlation analysis parameters', required: true }],
    researchQuestionPrompts.generateProblemKnowledgeCorrelationPrompt
  ),
  createFunctionPromptTemplate(
    'relevant_adr_pattern_prompt',
    'Generate relevant ADR pattern identification prompt',
    [{ name: 'args', description: 'Pattern identification parameters', required: true }],
    researchQuestionPrompts.generateRelevantAdrPatternPrompt
  ),
  createFunctionPromptTemplate(
    'context_aware_research_questions_prompt',
    'Generate context-aware research questions prompt',
    [{ name: 'args', description: 'Research question generation parameters', required: true }],
    researchQuestionPrompts.generateContextAwareResearchQuestionsPrompt
  ),
  createFunctionPromptTemplate(
    'research_task_tracking_prompt',
    'Generate research task tracking prompt',
    [{ name: 'args', description: 'Task tracking parameters', required: true }],
    researchQuestionPrompts.generateResearchTaskTrackingPrompt
  ),

  // Rule generation prompts
  createFunctionPromptTemplate(
    'rule_extraction_prompt',
    'Generate rule extraction prompt from code and ADRs',
    [{ name: 'args', description: 'Rule extraction parameters', required: true }],
    ruleGenerationPrompts.generateRuleExtractionPrompt
  ),
  createFunctionPromptTemplate(
    'pattern_based_rule_prompt',
    'Generate pattern-based rule creation prompt',
    [{ name: 'args', description: 'Pattern-based rule parameters', required: true }],
    ruleGenerationPrompts.generatePatternBasedRulePrompt
  ),
  createFunctionPromptTemplate(
    'code_validation_prompt',
    'Generate code validation prompt against rules',
    [{ name: 'args', description: 'Code validation parameters', required: true }],
    ruleGenerationPrompts.generateCodeValidationPrompt
  ),
  createFunctionPromptTemplate(
    'rule_deviation_report_prompt',
    'Generate rule deviation report prompt',
    [{ name: 'args', description: 'Deviation report parameters', required: true }],
    ruleGenerationPrompts.generateRuleDeviationReportPrompt
  ),

  // Security prompts
  createFunctionPromptTemplate(
    'sensitive_content_detection_prompt',
    'Generate sensitive content detection prompt',
    [{ name: 'args', description: 'Content security analysis parameters', required: true }],
    securityPrompts.generateSensitiveContentDetectionPrompt
  ),
  createFunctionPromptTemplate(
    'content_masking_prompt',
    'Generate content masking strategy prompt',
    [{ name: 'args', description: 'Content masking parameters', required: true }],
    securityPrompts.generateContentMaskingPrompt
  ),
  createFunctionPromptTemplate(
    'custom_pattern_configuration_prompt',
    'Generate custom security pattern configuration prompt',
    [{ name: 'args', description: 'Custom pattern configuration parameters', required: true }],
    securityPrompts.generateCustomPatternConfigurationPrompt
  ),

  // TODO prompts
  createFunctionPromptTemplate(
    'todo_creation_prompt',
    'Generate TODO task creation prompt',
    [{ name: 'args', description: 'TODO creation parameters', required: true }],
    todoPrompts.generateTodoCreationPrompt
  ),
  createFunctionPromptTemplate(
    'task_status_prompt',
    'Generate task status management prompt',
    [{ name: 'args', description: 'Task status management parameters', required: true }],
    todoPrompts.generateTaskStatusPrompt
  ),
  createFunctionPromptTemplate(
    'dependency_analysis_prompt',
    'Generate task dependency analysis prompt',
    [{ name: 'args', description: 'Dependency analysis parameters', required: true }],
    todoPrompts.generateDependencyAnalysisPrompt
  ),
  createFunctionPromptTemplate(
    'task_estimation_prompt',
    'Generate task estimation prompt',
    [{ name: 'args', description: 'Task estimation parameters', required: true }],
    todoPrompts.generateTaskEstimationPrompt
  ),
];

/**
 * All available prompts (static + dynamic)
 */
export const allPrompts: PromptTemplate[] = [
  // Static template-based prompts
  goalSpecificationPrompt,
  actionConfirmationPrompt,
  ambiguityResolutionPrompt,
  customRuleDefinitionPrompt,
  baselineAnalysisPrompt,
  secretPreventionPrompt,
  todoTaskGenerationPrompt,
  todoStatusManagementPrompt,
  todoDependencyAnalysisPrompt,
  todoEstimationPrompt,

  // Dynamic function-based prompts
  ...functionBasedPrompts,
];
