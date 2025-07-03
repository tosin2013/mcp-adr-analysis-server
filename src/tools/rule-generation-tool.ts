/**
 * MCP Tools for rule generation and validation
 * Implements prompt-driven architectural rule management
 */

import { McpAdrError } from '../types/index.js';

/**
 * Generate architectural rules from ADRs and code patterns
 */
export async function generateRules(args: {
  source?: 'adrs' | 'patterns' | 'both';
  adrDirectory?: string;
  projectPath?: string;
  existingRules?: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  outputFormat?: 'json' | 'yaml' | 'both';
}): Promise<any> {
  const {
    source = 'both',
    adrDirectory = 'docs/adrs',
    projectPath = process.cwd(),
    existingRules,
    outputFormat = 'json',
  } = args;

  try {
    const { extractRulesFromAdrs, generateRulesFromPatterns } = await import(
      '../utils/rule-generation.js'
    );

    switch (source) {
      case 'adrs': {
        const result = await extractRulesFromAdrs(adrDirectory, existingRules as any);

        // Execute the rule extraction with AI if enabled, otherwise return prompt
        const { executePromptWithFallback, formatMCPResponse } = await import('../utils/prompt-execution.js');
        const executionResult = await executePromptWithFallback(
          result.extractionPrompt,
          result.instructions,
          {
            temperature: 0.1,
            maxTokens: 6000,
            systemPrompt: `You are an expert software architect specializing in architectural rule extraction.
Analyze the provided ADRs to extract actionable architectural rules and governance policies.
Focus on creating specific, measurable rules that can be validated automatically.
Provide clear reasoning for each rule and practical implementation guidance.`,
            responseFormat: 'text'
          }
        );

        if (executionResult.isAIGenerated) {
          // AI execution successful - return actual rule extraction results
          return formatMCPResponse({
            ...executionResult,
            content: `# ADR-Based Rule Generation Results

## Analysis Information
- **ADR Directory**: ${adrDirectory}
- **Existing Rules**: ${existingRules?.length || 0} rules
- **Output Format**: ${outputFormat.toUpperCase()}

## AI Rule Extraction Results

${executionResult.content}

## Next Steps

Based on the extracted rules:

1. **Review Generated Rules**: Examine each rule for accuracy and completeness
2. **Save Rule Set**: Create ${outputFormat.toUpperCase()} files for the extracted rules
3. **Implement Validation**: Set up automated rule checking in your CI/CD pipeline
4. **Team Training**: Share rules with development team for adoption
5. **Monitor Compliance**: Track rule adherence and adjust as needed

## Integration Commands

To validate code against these rules, use:
\`\`\`json
{
  "tool": "validate_rules",
  "args": {
    "filePath": "path/to/code/file.js",
    "rules": [extracted rules from above]
  }
}
\`\`\`

To create a machine-readable rule set:
\`\`\`json
{
  "tool": "create_rule_set",
  "args": {
    "name": "ADR-Based Architectural Rules",
    "adrRules": [extracted rules from above],
    "outputFormat": "${outputFormat}"
  }
}
\`\`\`
`,
          });
        } else {
          // Fallback to prompt-only mode
          return {
            content: [
              {
                type: 'text',
                text: `# Rule Generation: ADR-Based Rules

${result.instructions}

## AI Analysis Prompt

${result.extractionPrompt}

## Next Steps

1. **Submit the prompt** to an AI agent for comprehensive rule extraction
2. **Parse the JSON response** to get extracted rules and metadata
3. **Review the rules** for accuracy and completeness
4. **Save rules** in ${outputFormat.toUpperCase()} format using the rule format utilities
5. **Integrate with validation tools** for automated compliance checking
`,
              },
            ],
          };
        }
      }

      case 'patterns': {
        const existingRuleNames = existingRules?.map(r => r.name);
        const result = await generateRulesFromPatterns(projectPath, existingRuleNames);

        // Execute the pattern-based rule generation with AI if enabled, otherwise return prompt
        const { executePromptWithFallback, formatMCPResponse } = await import('../utils/prompt-execution.js');
        const executionResult = await executePromptWithFallback(
          result.generationPrompt,
          result.instructions,
          {
            temperature: 0.1,
            maxTokens: 6000,
            systemPrompt: `You are an expert software architect specializing in code pattern analysis and rule generation.
Analyze the provided codebase to identify consistent patterns and generate actionable architectural rules.
Focus on creating rules that enforce consistency, quality, and maintainability based on observed patterns.
Provide confidence scores and practical implementation guidance for each rule.`,
            responseFormat: 'text'
          }
        );

        if (executionResult.isAIGenerated) {
          // AI execution successful - return actual pattern-based rule generation results
          return formatMCPResponse({
            ...executionResult,
            content: `# Pattern-Based Rule Generation Results

## Analysis Information
- **Project Path**: ${projectPath}
- **Existing Rules**: ${existingRules?.length || 0} rules
- **Output Format**: ${outputFormat.toUpperCase()}

## AI Pattern Analysis Results

${executionResult.content}

## Next Steps

Based on the pattern analysis:

1. **Review Generated Rules**: Examine each rule for relevance and accuracy
2. **Validate Patterns**: Confirm patterns are representative of desired practices
3. **Implement High-Confidence Rules**: Start with rules that have high confidence scores
4. **Combine with ADR Rules**: Merge with ADR-extracted rules for comprehensive coverage
5. **Set Up Validation**: Implement automated checking for pattern-based rules

## Pattern-Based Benefits

These rules offer:
- **Consistency Enforcement**: Based on actual project patterns
- **Team Alignment**: Reflects current team practices
- **Gradual Improvement**: Incremental quality improvements
- **Automated Detection**: High automatability for validation tools

## Integration Commands

To create a comprehensive rule set combining patterns and ADRs:
\`\`\`json
{
  "tool": "generate_rules",
  "args": {
    "source": "both",
    "projectPath": "${projectPath}",
    "adrDirectory": "${adrDirectory}",
    "outputFormat": "${outputFormat}"
  }
}
\`\`\`
`,
          });
        } else {
          // Fallback to prompt-only mode
          return {
            content: [
              {
                type: 'text',
                text: `# Rule Generation: Pattern-Based Rules

${result.instructions}

## AI Analysis Prompt

${result.generationPrompt}

## Next Steps

1. **Submit the prompt** to an AI agent for pattern analysis
2. **Parse the JSON response** to get generated rules and metrics
3. **Review pattern-based rules** for relevance and accuracy
4. **Combine with ADR-extracted rules** for comprehensive rule set
5. **Implement validation** for high-confidence rules
`,
              },
            ],
          };
        }
      }

      case 'both': {
        const adrResult = await extractRulesFromAdrs(adrDirectory, existingRules as any);
        const existingRuleNames = existingRules?.map(r => r.name);
        const patternResult = await generateRulesFromPatterns(projectPath, existingRuleNames);

        // Create comprehensive prompt combining both ADR and pattern analysis
        const comprehensivePrompt = `
# Comprehensive Architectural Rule Generation

Generate a complete set of architectural rules by analyzing both ADRs and code patterns.

## ADR-Based Rule Extraction

${adrResult.extractionPrompt}

## Pattern-Based Rule Generation

${patternResult.generationPrompt}

## Consolidation Requirements

After extracting rules from both sources:

1. **Merge and Deduplicate**: Combine rules from ADRs and patterns, removing duplicates
2. **Resolve Conflicts**: When ADR rules conflict with pattern rules, prioritize ADR rules (explicit decisions)
3. **Assign Priorities**: High priority for ADR rules, medium for consistent patterns, low for inconsistent patterns
4. **Create Dependencies**: Identify relationships between rules and create dependency chains
5. **Validate Completeness**: Ensure rules cover all major architectural concerns

## Output Requirements

Provide a unified rule set with:
- **Rule Source**: Whether from ADR, pattern, or both
- **Confidence Score**: 1-10 rating of rule validity
- **Priority Level**: High/Medium/Low implementation priority
- **Validation Pattern**: How to automatically check compliance
- **Examples**: Valid and invalid code examples
- **Dependencies**: Other rules this rule depends on
`;

        // Execute the comprehensive rule generation with AI if enabled, otherwise return prompt
        const { executePromptWithFallback, formatMCPResponse } = await import('../utils/prompt-execution.js');
        const executionResult = await executePromptWithFallback(
          comprehensivePrompt,
          `${adrResult.instructions}\n\n${patternResult.instructions}`,
          {
            temperature: 0.1,
            maxTokens: 8000,
            systemPrompt: `You are an expert software architect specializing in comprehensive architectural rule generation.
Analyze both ADRs and code patterns to create a unified, actionable rule set for the project.
Focus on creating rules that are specific, measurable, and can be validated automatically.
Prioritize explicit architectural decisions (ADRs) over implicit patterns when conflicts arise.`,
            responseFormat: 'text'
          }
        );

        if (executionResult.isAIGenerated) {
          // AI execution successful - return actual comprehensive rule generation results
          return formatMCPResponse({
            ...executionResult,
            content: `# Comprehensive Rule Generation Results

## Analysis Information
- **ADR Directory**: ${adrDirectory}
- **Project Path**: ${projectPath}
- **Existing Rules**: ${existingRules?.length || 0} rules
- **Output Format**: ${outputFormat.toUpperCase()}

## AI Comprehensive Analysis Results

${executionResult.content}

## Next Steps

Based on the comprehensive analysis:

1. **Review Unified Rule Set**: Examine the consolidated rules for completeness
2. **Validate Rule Priorities**: Confirm priority assignments align with project needs
3. **Implement High-Priority Rules**: Start with rules marked as high priority
4. **Set Up Automated Validation**: Configure CI/CD to check rule compliance
5. **Create Rule Documentation**: Document rules for team reference and training

## Comprehensive Benefits

This approach provides:
- **Complete Coverage**: Both explicit (ADR) and implicit (pattern) rules
- **Balanced Approach**: Combines intentional decisions with observed practices
- **High Confidence**: Rules backed by both documentation and code evidence
- **Practical Implementation**: Rules that can be validated and enforced
- **Team Alignment**: Rules that reflect both intentions and reality

## Integration Commands

To create the final rule set:
\`\`\`json
{
  "tool": "create_rule_set",
  "args": {
    "name": "Comprehensive Architectural Rules",
    "adrRules": [ADR rules from above],
    "patternRules": [pattern rules from above],
    "outputFormat": "${outputFormat}"
  }
}
\`\`\`

To validate code against the complete rule set:
\`\`\`json
{
  "tool": "validate_rules",
  "args": {
    "filePath": "path/to/code/file.js",
    "rules": [unified rules from above]
  }
}
\`\`\`
`,
          });
        } else {
          // Fallback to prompt-only mode
          return {
            content: [
              {
                type: 'text',
                text: `# Comprehensive Rule Generation

This comprehensive analysis will generate architectural rules from both ADRs and code patterns for complete coverage.

## ADR-Based Rule Extraction

${adrResult.instructions}

### ADR Analysis Prompt

${adrResult.extractionPrompt}

## Pattern-Based Rule Generation

${patternResult.instructions}

### Pattern Analysis Prompt

${patternResult.generationPrompt}

## Comprehensive Workflow

### 1. **ADR Rule Extraction** (First Step)
Submit the ADR analysis prompt to extract rules from architectural decisions

### 2. **Pattern Rule Generation** (Second Step)
Submit the pattern analysis prompt to generate rules from code patterns

### 3. **Rule Consolidation**
- Merge rules from both sources
- Remove duplicates and conflicts
- Prioritize based on confidence and impact
- Create unified rule set with dependencies
`,
              },
            ],
          };
        }
      }

      default:
        throw new McpAdrError(`Unknown rule generation source: ${source}`, 'INVALID_INPUT');
    }
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate rules: ${error instanceof Error ? error.message : String(error)}`,
      'RULE_GENERATION_ERROR'
    );
  }
}

/**
 * Validate code against architectural rules
 */
export async function validateRules(args: {
  filePath?: string;
  fileContent?: string;
  fileName?: string;
  rules: Array<{
    id: string;
    name: string;
    description: string;
    pattern: string;
    severity: string;
    message: string;
  }>;
  validationType?: 'file' | 'function' | 'component' | 'module';
  reportFormat?: 'summary' | 'detailed' | 'json';
}): Promise<any> {
  const {
    filePath,
    fileContent,
    fileName,
    rules,
    validationType = 'file',
    reportFormat = 'detailed',
  } = args;

  try {
    const { validateCodeAgainstRules } = await import('../utils/rule-generation.js');

    if (!filePath && !fileContent) {
      throw new McpAdrError('Either filePath or fileContent must be provided', 'INVALID_INPUT');
    }

    if (!rules || rules.length === 0) {
      throw new McpAdrError('Rules array is required and cannot be empty', 'INVALID_INPUT');
    }

    // Convert rules to ArchitecturalRule format
    const architecturalRules = rules.map(rule => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      category: 'coding' as const,
      type: 'should' as const,
      severity: rule.severity as 'info' | 'warning' | 'error' | 'critical',
      scope: 'file' as const,
      pattern: rule.pattern,
      message: rule.message,
      examples: { valid: [], invalid: [] },
      sourceAdrs: [],
      evidence: [],
      automatable: true,
      confidence: 0.8,
      tags: [],
    }));

    let result;
    if (filePath) {
      result = await validateCodeAgainstRules(filePath, architecturalRules, validationType);
    } else {
      // Handle fileContent case by creating a temporary validation
      const tempFileName = fileName || 'temp-file';
      result = {
        validationPrompt: `Validate the following code content against rules: ${fileContent?.slice(0, 100)}...`,
        instructions: `Validation for ${tempFileName} with ${rules.length} rules`,
      };
    }

    // Execute the rule validation with AI if enabled, otherwise return prompt
    const { executePromptWithFallback, formatMCPResponse } = await import('../utils/prompt-execution.js');
    const executionResult = await executePromptWithFallback(
      result.validationPrompt,
      result.instructions,
      {
        temperature: 0.1,
        maxTokens: 5000,
        systemPrompt: `You are a senior software architect specializing in code quality and architectural compliance.
Analyze the provided code against architectural rules to identify violations and provide improvement recommendations.
Focus on providing specific, actionable feedback with clear explanations and fix suggestions.
Prioritize violations by severity and impact on system architecture.`,
        responseFormat: 'text'
      }
    );

    if (executionResult.isAIGenerated) {
      // AI execution successful - return actual rule validation results
      return formatMCPResponse({
        ...executionResult,
        content: `# Code Validation Results

## Validation Information
- **File**: ${fileName || filePath || 'Content provided'}
- **Validation Type**: ${validationType}
- **Rules Applied**: ${rules.length} rules
- **Report Format**: ${reportFormat}

## AI Validation Results

${executionResult.content}

## Next Steps

Based on the validation results:

1. **Address Critical Issues**: Fix any critical violations immediately
2. **Plan Error Fixes**: Schedule error-level violations for next release
3. **Batch Warning Fixes**: Group warning-level issues for efficient resolution
4. **Track Compliance**: Monitor improvement trends over time
5. **Update Rules**: Refine rules based on validation experience

## Violation Severity Levels

- **Critical**: Must be fixed immediately (security, breaking changes)
- **Error**: Should be fixed before deployment (functionality issues)
- **Warning**: Should be addressed in next iteration (quality issues)
- **Info**: Consider for future improvements (style, optimization)

## Compliance Tracking

Use validation results to:
- Track compliance trends over time
- Identify problematic areas or patterns
- Measure improvement after fixes
- Generate compliance reports for stakeholders

## Re-validation Command

After applying fixes, re-validate with:
\`\`\`json
{
  "tool": "validate_rules",
  "args": {
    "filePath": "${filePath || 'updated-file-path'}",
    "rules": [same rules array],
    "reportFormat": "${reportFormat}"
  }
}
\`\`\`
`,
      });
    } else {
      // Fallback to prompt-only mode
      return {
        content: [
          {
            type: 'text',
            text: `# Code Validation Against Architectural Rules

${result.instructions}

## AI Validation Prompt

${result.validationPrompt}

## Next Steps

1. **Submit the validation prompt** to an AI agent for comprehensive analysis
2. **Parse the JSON response** to get validation results and violations
3. **Review violations** and prioritize fixes based on severity
4. **Apply suggested fixes** to improve compliance
5. **Re-validate** to confirm improvements
`,
          },
        ],
      };
    }
  } catch (error) {
    throw new McpAdrError(
      `Failed to validate rules: ${error instanceof Error ? error.message : String(error)}`,
      'RULE_VALIDATION_ERROR'
    );
  }
}

/**
 * Create machine-readable rule set
 */
export async function createRuleSet(args: {
  name: string;
  description?: string;
  adrRules?: any[];
  patternRules?: any[];
  rules?: any[];
  outputFormat?: 'json' | 'yaml' | 'both';
  author?: string;
}): Promise<any> {
  const {
    name,
    description = 'Generated architectural rule set',
    adrRules = [],
    patternRules = [],
    rules = [],
    outputFormat = 'json',
    author = 'MCP ADR Analysis Server',
  } = args;

  try {
    const { createRuleSet, serializeRuleSetToJson, serializeRuleSetToYaml } = await import(
      '../utils/rule-format.js'
    );

    // Combine all rules
    const allRules = [...adrRules, ...patternRules, ...rules];

    if (allRules.length === 0) {
      throw new McpAdrError('At least one rule must be provided', 'INVALID_INPUT');
    }

    // Create rule set
    const ruleSet = createRuleSet(name, description, allRules, author);

    // Serialize based on output format
    let jsonOutput = '';
    let yamlOutput = '';

    if (outputFormat === 'json' || outputFormat === 'both') {
      jsonOutput = serializeRuleSetToJson(ruleSet);
    }

    if (outputFormat === 'yaml' || outputFormat === 'both') {
      yamlOutput = serializeRuleSetToYaml(ruleSet);
    }

    return {
      content: [
        {
          type: 'text',
          text: `# Machine-Readable Rule Set Created

## Rule Set Details
- **Name**: ${name}
- **Description**: ${description}
- **Total Rules**: ${allRules.length}
- **Author**: ${author}
- **Format**: ${outputFormat.toUpperCase()}
- **Version**: ${ruleSet.metadata.version}

## Rule Categories
${ruleSet.categories.map(cat => `- **${cat.name}**: ${cat.ruleCount} rules (${cat.priority} priority)`).join('\n')}

## Rule Distribution
- **ADR-based Rules**: ${adrRules.length}
- **Pattern-based Rules**: ${patternRules.length}
- **Other Rules**: ${rules.length}

${
  outputFormat === 'json' || outputFormat === 'both'
    ? `
## JSON Format

\`\`\`json
${jsonOutput}
\`\`\`
`
    : ''
}

${
  outputFormat === 'yaml' || outputFormat === 'both'
    ? `
## YAML Format

\`\`\`yaml
${yamlOutput}
\`\`\`
`
    : ''
}

## Usage Instructions

### Save Rule Set
Save the rule set to your project:
- **JSON**: \`rules/architectural-rules.json\`
- **YAML**: \`rules/architectural-rules.yaml\`

### Integrate with Tools
Use the rule set with validation tools:
\`\`\`json
{
  "tool": "validate_rules",
  "args": {
    "filePath": "src/components/MyComponent.tsx",
    "rules": [rules from this rule set]
  }
}
\`\`\`

### Version Control
- Commit rule sets to version control
- Track changes to rules over time
- Use semantic versioning for rule set updates
- Document rule changes in release notes

### Team Adoption
- Share rule sets across team members
- Integrate with CI/CD pipelines
- Set up automated validation checks
- Provide training on rule compliance

## Quality Assurance

This rule set includes:
- **Validation Patterns**: Automated checking capabilities
- **Examples**: Valid and invalid code examples
- **Severity Levels**: Appropriate priority for each rule
- **Traceability**: Links to source ADRs and patterns
- **Metadata**: Complete rule set documentation
`,
        },
      ],
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to create rule set: ${error instanceof Error ? error.message : String(error)}`,
      'RULE_SET_CREATION_ERROR'
    );
  }
}
