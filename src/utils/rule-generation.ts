/**
 * Rule generation and validation utilities using prompt-driven AI analysis
 * Implements intelligent architectural rule extraction and code validation
 */

import { McpAdrError } from '../types/index.js';

export interface ArchitecturalRule {
  id: string;
  name: string;
  description: string;
  category: 'architectural' | 'technology' | 'coding' | 'process' | 'security' | 'performance';
  type: 'must' | 'should' | 'may' | 'must_not' | 'should_not';
  severity: 'info' | 'warning' | 'error' | 'critical';
  scope: 'global' | 'module' | 'component' | 'function' | 'file';
  pattern: string;
  message: string;
  examples: {
    valid: string[];
    invalid: string[];
  };
  sourceAdrs: string[];
  evidence: string[];
  automatable: boolean;
  confidence: number;
  tags: string[];
}

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  location: {
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
  };
  codeSnippet: string;
  suggestion: string;
  effort: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}

export interface ValidationResult {
  fileName: string;
  validationType: string;
  overallCompliance: number;
  totalRulesChecked: number;
  rulesViolated: number;
  qualityScore: number;
  violations: RuleViolation[];
  compliance: Array<{
    ruleId: string;
    ruleName: string;
    status: string;
    evidence: string;
    location: string;
  }>;
}

/**
 * Extract architectural rules from ADRs
 */
export async function extractRulesFromAdrs(
  adrDirectory: string = 'docs/adrs',
  existingRules?: ArchitecturalRule[],
  projectPath: string = process.cwd()
): Promise<{ extractionPrompt: string; instructions: string; actualData?: any }> {
  try {
    // Use actual ADR discovery instead of prompts
    const { discoverAdrsInDirectory } = await import('./adr-discovery.js');

    // Actually read ADR files
    const discoveryResult = await discoverAdrsInDirectory(adrDirectory, true, projectPath);

    const extractionPrompt = `
# Architectural Rule Extraction

Based on actual ADR file analysis, here are the discovered ADRs with their full content:

## Discovered ADRs (${discoveryResult.totalAdrs} total)

${discoveryResult.adrs.length > 0 ? 
  discoveryResult.adrs.map((adr, index) => `
### ${index + 1}. ${adr.title}
- **File**: ${adr.filename}
- **Status**: ${adr.status}
- **Path**: ${adr.path}
${adr.metadata?.number ? `- **Number**: ${adr.metadata.number}` : ''}

#### ADR Content:
\`\`\`markdown
${adr.content || 'Content not available'}
\`\`\`

---
`).join('\n') : 'No ADRs found in the specified directory.'}

## Existing Rules Context

${existingRules && existingRules.length > 0 ? `
### Current Rules (${existingRules.length})
${existingRules.map((rule, index) => `
#### ${index + 1}. ${rule.name}
- **ID**: ${rule.id}
- **Description**: ${rule.description}
- **Category**: ${rule.category}
- **Severity**: ${rule.severity}
- **Type**: ${rule.type}
- **Scope**: ${rule.scope}
`).join('')}
` : 'No existing rules provided.'}

## Rule Extraction Requirements

For each ADR above, analyze the **actual content** to extract:

1. **Actionable architectural rules and constraints**
2. Identify technology-specific requirements and standards
3. Define coding standards and best practices
4. Establish process and workflow requirements
5. Capture security and compliance rules
6. Define performance and scalability constraints

## Rule Categories to Extract

- **Architectural**: Component structure, dependencies, patterns
- **Technology**: Framework choices, library usage, platform requirements
- **Coding**: Style guides, naming conventions, code organization
- **Process**: Development workflow, review requirements, deployment
- **Security**: Authentication, authorization, data protection
- **Performance**: Response times, resource limits, scalability targets
`;

    const instructions = `
# Rule Extraction Instructions

This analysis provides **actual ADR content** for comprehensive architectural rule extraction.

## Extraction Scope
- **ADR Directory**: ${adrDirectory}
- **ADRs Found**: ${discoveryResult.totalAdrs} files
- **Existing Rules**: ${existingRules?.length || 0} rules
- **Content Available**: ${discoveryResult.adrs.filter(adr => adr.content).length} ADRs with content
- **Rule Categories**: Architectural, Technology, Coding, Process, Security, Performance

## Discovered ADR Summary
${discoveryResult.adrs.map(adr => `- **${adr.title}** (${adr.status})`).join('\n')}

## Next Steps
1. **Analyze the actual ADR content** provided above to extract architectural rules
2. **Generate structured rules** with clear validation criteria
3. **Categorize rules** by type and priority
4. **Define validation strategies** for each rule
5. **Create implementation guidance** for rule enforcement

## Expected Output Format
Generate a JSON response with extracted rules including:
- Rule ID, name, description, and category
- Validation criteria and implementation methods
- Severity levels and enforcement priorities
- Dependencies and relationships between rules

## Rule Quality Standards
Each extracted rule should be:
- **Specific**: Clearly defined and unambiguous
- **Measurable**: Can be validated automatically or through review
- **Actionable**: Provides clear guidance for implementation
- **Relevant**: Derived from actual ADR decisions
- **Time-bound**: Includes context about when rule applies
`;

    return {
      extractionPrompt,
      instructions,
      actualData: {
        discoveryResult,
        adrCount: discoveryResult.totalAdrs,
        adrWithContent: discoveryResult.adrs.filter(adr => adr.content).length,
        existingRulesCount: existingRules?.length || 0,
        summary: {
          totalAdrs: discoveryResult.totalAdrs,
          byStatus: discoveryResult.summary.byStatus,
          byCategory: discoveryResult.summary.byCategory
        }
      }
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to extract rules from ADRs: ${error instanceof Error ? error.message : String(error)}`,
      'RULE_EXTRACTION_ERROR'
    );
  }
}

/**
 * Generate rules from code patterns
 */
export async function generateRulesFromPatterns(
  projectPath: string,
  existingRules?: string[]
): Promise<{ generationPrompt: string; instructions: string }> {
  try {
    const { analyzeProjectStructure } = await import('./file-system.js');

    // Generate project analysis prompt for AI delegation
    const projectAnalysisPrompt = await analyzeProjectStructure(projectPath);

    const generationPrompt = `
# Pattern-Based Rule Generation

Please analyze project patterns and generate architectural rules for code validation.

## Project Analysis Instructions

${projectAnalysisPrompt.prompt}

## Implementation Steps

${projectAnalysisPrompt.instructions}

## Existing Rules Context

${existingRules ? `
### Current Rules (${existingRules.length})
${existingRules.map((rule, index) => `
#### ${index + 1}. ${rule}
`).join('')}
` : 'No existing rules provided.'}

## Pattern Analysis Requirements

1. **Code Structure Analysis**: Examine project organization and module structure
2. **Dependency Pattern Detection**: Identify import/export patterns and dependencies
3. **Naming Convention Analysis**: Extract naming patterns for files, functions, classes
4. **Architecture Pattern Recognition**: Identify architectural patterns in use
5. **Technology Stack Analysis**: Determine technology choices and configurations
6. **Quality Pattern Assessment**: Analyze code quality and testing patterns

## Rule Generation Focus

Generate rules that enforce:
- Consistent code organization and structure
- Proper dependency management
- Naming convention compliance
- Architectural pattern adherence
- Technology stack consistency
- Code quality standards
`;

    const instructions = `
# Pattern-Based Rule Generation Instructions

This analysis will generate architectural rules based on observed code patterns to enforce consistency and best practices.

## Pattern Analysis
- **Project Path**: ${projectPath}
- **Analysis Focus**: Code structure, dependencies, naming conventions, architecture patterns
- **Existing Rules**: ${existingRules?.length || 0} rules

## Next Steps
1. **Submit the generation prompt** to an AI agent for pattern analysis
2. **Parse the JSON response** to get generated rules and metrics
3. **Review pattern-based rules** for relevance and accuracy
4. **Combine with ADR-extracted rules** for comprehensive rule set
5. **Implement validation** for high-confidence rules

## Expected AI Response Format
The AI will return a JSON object with:
- \`generatedRules\`: Rules based on observed code patterns
- \`patternAnalysis\`: Analysis of code consistency and quality
- \`ruleMetrics\`: Statistics about generated rules
- \`implementationPlan\`: Phased approach for rule implementation

## Usage Example
\`\`\`typescript
const result = await generateRulesFromPatterns(projectPath, existingRules);
// Submit result.generationPrompt to AI agent
// Parse AI response for pattern-based rules
\`\`\`
`;

    return {
      generationPrompt,
      instructions,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate rules from patterns: ${error instanceof Error ? error.message : String(error)}`,
      'PATTERN_RULE_GENERATION_ERROR'
    );
  }
}

/**
 * Validate code against architectural rules
 */
export async function validateCodeAgainstRules(
  filePath: string,
  rules: ArchitecturalRule[],
  validationType: 'file' | 'function' | 'component' | 'module' = 'file'
): Promise<{ validationPrompt: string; instructions: string }> {
  try {
    const { promises: fs } = await import('fs');
    const { generateCodeValidationPrompt } = await import('../prompts/rule-generation-prompts.js');

    // Read the file to validate
    const codeContent = await fs.readFile(filePath, 'utf-8');
    const fileName = filePath.split('/').pop() || filePath;

    // Prepare rules data for validation
    const rulesData = rules.map(rule => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      pattern: rule.pattern,
      severity: rule.severity,
      message: rule.message,
    }));

    const validationPrompt = generateCodeValidationPrompt(
      codeContent,
      fileName,
      rulesData,
      validationType
    );

    const instructions = `
# Code Validation Instructions

This analysis will validate code against architectural rules and report violations with specific remediation suggestions.

## Validation Details
- **File**: ${fileName}
- **File Path**: ${filePath}
- **Validation Type**: ${validationType}
- **Rules Applied**: ${rules.length} rules
- **Code Length**: ${codeContent.length} characters

## Next Steps
1. **Submit the validation prompt** to an AI agent for comprehensive analysis
2. **Parse the JSON response** to get validation results and violations
3. **Review violations** and prioritize fixes based on severity
4. **Apply suggested fixes** to improve compliance
5. **Re-validate** to confirm improvements

## Expected AI Response Format
The AI will return a JSON object with:
- \`validationResults\`: Overall validation metadata and scores
- \`violations\`: Specific rule violations with locations and suggestions
- \`compliance\`: Rules that were successfully followed
- \`metrics\`: Quality and compliance metrics
- \`recommendations\`: Prioritized improvement recommendations
- \`summary\`: Executive summary of validation results

## Usage Example
\`\`\`typescript
const result = await validateCodeAgainstRules(filePath, rules, validationType);
// Submit result.validationPrompt to AI agent
// Parse AI response as ValidationResult
\`\`\`
`;

    return {
      validationPrompt,
      instructions,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to validate code against rules: ${error instanceof Error ? error.message : String(error)}`,
      'CODE_VALIDATION_ERROR'
    );
  }
}

/**
 * Generate rule deviation report
 */
export async function generateRuleDeviationReport(
  validationResults: ValidationResult[],
  rules: ArchitecturalRule[],
  reportType: 'summary' | 'detailed' | 'trend' | 'compliance' = 'summary'
): Promise<{ reportPrompt: string; instructions: string }> {
  try {
    const { generateRuleDeviationReportPrompt } = await import(
      '../prompts/rule-generation-prompts.js'
    );

    // Prepare rules data for reporting
    const rulesData = rules.map(rule => ({
      id: rule.id,
      name: rule.name,
      category: rule.category,
      severity: rule.severity,
    }));

    const reportPrompt = generateRuleDeviationReportPrompt(
      validationResults,
      rulesData,
      reportType
    );

    const instructions = `
# Rule Deviation Report Instructions

This analysis will generate a comprehensive compliance report with actionable insights and improvement recommendations.

## Report Details
- **Report Type**: ${reportType.toUpperCase()}
- **Files Analyzed**: ${validationResults.length} files
- **Rules Evaluated**: ${rules.length} rules
- **Total Violations**: ${validationResults.reduce((sum, r) => sum + r.violations.length, 0)}
- **Average Compliance**: ${((validationResults.reduce((sum, r) => sum + r.overallCompliance, 0) / validationResults.length) * 100).toFixed(1)}%

## Next Steps
1. **Submit the report prompt** to an AI agent for comprehensive analysis
2. **Parse the JSON response** to get detailed compliance report
3. **Review executive summary** for key findings and recommendations
4. **Implement priority fixes** based on actionable insights
5. **Track progress** using suggested success metrics

## Expected AI Response Format
The AI will return a JSON object with:
- \`reportMetadata\`: Report generation details and scope
- \`executiveSummary\`: High-level findings and recommendations
- \`detailedAnalysis\`: Rule-by-rule and file-by-file breakdown
- \`actionableInsights\`: Priority fixes, quick wins, and systemic issues
- \`implementationRoadmap\`: Phased improvement plan with timelines
- \`successMetrics\`: Measurable targets for improvement tracking

## Usage Example
\`\`\`typescript
const result = await generateRuleDeviationReport(validationResults, rules, reportType);
// Submit result.reportPrompt to AI agent
// Parse AI response for comprehensive compliance report
\`\`\`
`;

    return {
      reportPrompt,
      instructions,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate rule deviation report: ${error instanceof Error ? error.message : String(error)}`,
      'REPORT_GENERATION_ERROR'
    );
  }
}

// Removed unused function extractCodePatterns

// Removed unused function extractAdrCategory
