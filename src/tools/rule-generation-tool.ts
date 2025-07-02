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
    outputFormat = 'json'
  } = args;
  
  try {
    const { 
      extractRulesFromAdrs,
      generateRulesFromPatterns
    } = await import('../utils/rule-generation.js');
    
    switch (source) {
      case 'adrs': {
        const result = await extractRulesFromAdrs(adrDirectory, existingRules as any);
        
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

## Expected Output

The AI will provide:
- **Extracted Rules**: Actionable architectural rules with validation patterns
- **Rule Categories**: Organization and prioritization of rules
- **Rule Dependencies**: Relationships between rules
- **Validation Strategies**: Approaches for automated rule checking
- **Implementation Guidance**: Prioritized rollout plan

## Rule Format

Rules will be provided in machine-readable format:
- **JSON**: Structured data for tool integration
- **YAML**: Human-readable format for documentation
- **Validation Patterns**: Regex or logic patterns for automated checking
- **Examples**: Valid and invalid code examples for each rule

## Integration Workflow

After rule generation, use the validation tools:
\`\`\`json
{
  "tool": "validate_rules",
  "args": {
    "filePath": "path/to/code/file.js",
    "rules": [extracted rules from AI response]
  }
}
\`\`\`
`
            }
          ]
        };
      }
      
      case 'patterns': {
        const existingRuleNames = existingRules?.map(r => r.name);
        const result = await generateRulesFromPatterns(projectPath, existingRuleNames);
        
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

## Expected Output

The AI will provide:
- **Generated Rules**: Rules based on observed code patterns
- **Pattern Analysis**: Analysis of code consistency and quality
- **Rule Metrics**: Statistics about generated rules (confidence, automatability)
- **Implementation Plan**: Phased approach for rule implementation

## Pattern-Based Benefits

Pattern-based rules offer:
- **Consistency Enforcement**: Based on actual project patterns
- **Team Alignment**: Reflects current team practices
- **Gradual Improvement**: Incremental quality improvements
- **Automated Detection**: High automatability for validation tools

## Quality Assurance

All generated rules include:
- **Confidence Scores**: AI assessment of rule validity
- **Evidence**: Specific code examples supporting the rule
- **Frequency Data**: How often patterns appear in codebase
- **Automation Feasibility**: Whether rule can be automatically validated
`
            }
          ]
        };
      }
      
      case 'both': {
        const adrResult = await extractRulesFromAdrs(adrDirectory, existingRules as any);
        const existingRuleNames = existingRules?.map(r => r.name);
        const patternResult = await generateRulesFromPatterns(projectPath, existingRuleNames);
        
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

### 4. **Rule Set Creation**
Use the rule format utilities to create machine-readable rule sets:
\`\`\`json
{
  "tool": "create_rule_set",
  "args": {
    "name": "Project Architectural Rules",
    "adrRules": [rules from step 1],
    "patternRules": [rules from step 2],
    "outputFormat": "${outputFormat}"
  }
}
\`\`\`

### 5. **Validation Implementation**
Apply the complete rule set for code validation and compliance checking

## Expected Outcomes

This comprehensive approach will provide:
- **Complete Rule Coverage**: Both explicit (ADR) and implicit (pattern) rules
- **Balanced Approach**: Combines intentional decisions with observed practices
- **High Confidence**: Rules backed by both documentation and code evidence
- **Practical Implementation**: Rules that can be validated and enforced
- **Team Alignment**: Rules that reflect both intentions and reality

## Quality Assurance

All rules will include:
- **Source Traceability**: Clear link to ADRs or code patterns
- **Validation Patterns**: Automated checking capabilities
- **Examples**: Valid and invalid implementations
- **Priority Levels**: Implementation priority based on impact
- **Confidence Scores**: AI assessment of rule validity and importance
`
            }
          ]
        };
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
    reportFormat = 'detailed'
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
      tags: []
    }));
    
    let result;
    if (filePath) {
      result = await validateCodeAgainstRules(filePath, architecturalRules, validationType);
    } else {
      // Handle fileContent case by creating a temporary validation
      const tempFileName = fileName || 'temp-file';
      result = {
        validationPrompt: `Validate the following code content against rules: ${fileContent?.slice(0, 100)}...`,
        instructions: `Validation for ${tempFileName} with ${rules.length} rules`
      };
    }
    
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

## Validation Details

- **File**: ${fileName || filePath || 'Content provided'}
- **Validation Type**: ${validationType}
- **Rules Applied**: ${rules.length} rules
- **Report Format**: ${reportFormat}

## Expected Output

The AI will provide:
- **Validation Results**: Overall compliance scores and metrics
- **Violations**: Specific rule violations with locations and suggestions
- **Compliance**: Rules that were successfully followed
- **Recommendations**: Prioritized improvement suggestions
- **Quality Metrics**: Code quality and maintainability scores

## Violation Severity Levels

- **Critical**: Must be fixed immediately (security, breaking changes)
- **Error**: Should be fixed before deployment (functionality issues)
- **Warning**: Should be addressed in next iteration (quality issues)
- **Info**: Consider for future improvements (style, optimization)

## Fix Priority Guidelines

1. **Critical violations**: Fix immediately
2. **High-impact errors**: Fix before next release
3. **Consistency warnings**: Address in batches
4. **Style info**: Include in regular refactoring

## Compliance Tracking

Use validation results to:
- Track compliance trends over time
- Identify problematic areas or patterns
- Measure improvement after fixes
- Generate compliance reports for stakeholders
`
        }
      ]
    };
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
    author = 'MCP ADR Analysis Server'
  } = args;
  
  try {
    const { 
      createRuleSet,
      serializeRuleSetToJson,
      serializeRuleSetToYaml
    } = await import('../utils/rule-format.js');
    
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

${outputFormat === 'json' || outputFormat === 'both' ? `
## JSON Format

\`\`\`json
${jsonOutput}
\`\`\`
` : ''}

${outputFormat === 'yaml' || outputFormat === 'both' ? `
## YAML Format

\`\`\`yaml
${yamlOutput}
\`\`\`
` : ''}

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
`
        }
      ]
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to create rule set: ${error instanceof Error ? error.message : String(error)}`,
      'RULE_SET_CREATION_ERROR'
    );
  }
}
