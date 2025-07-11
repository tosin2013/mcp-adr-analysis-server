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
 * All available prompts
 */
export const allPrompts: PromptTemplate[] = [
  goalSpecificationPrompt,
  actionConfirmationPrompt,
  ambiguityResolutionPrompt,
  customRuleDefinitionPrompt,
  baselineAnalysisPrompt,
  secretPreventionPrompt,
];
