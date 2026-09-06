/**
 * MCP Tools for rule generation and validation
 * Implements prompt-driven architectural rule management
 * Enhanced with Generated Knowledge Prompting (GKP) for architectural governance expertise
 */

import { McpAdrError } from '../types/index.js';
import { findFiles, findRelatedCode } from '../utils/file-system.js';
import {
  getEnhancedModeDefault,
  getKnowledgeEnhancementDefault,
} from '../utils/test-aware-defaults.js';

/**
 * Generate architectural rules from ADRs and code patterns
 * Enhanced with Generated Knowledge Prompting for architectural governance expertise
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
  knowledgeEnhancement?: boolean; // Enable GKP for architectural governance knowledge
  enhancedMode?: boolean; // Enable advanced prompting features
}): Promise<any> {
  const {
    source = 'both',
    adrDirectory = 'docs/adrs',
    projectPath = process.cwd(),
    existingRules,
    outputFormat = 'json',
    knowledgeEnhancement = getKnowledgeEnhancementDefault(), // Environment-aware default
    enhancedMode = getEnhancedModeDefault(), // Environment-aware default
  } = args;

  try {
    const { extractRulesFromAdrs, generateRulesFromPatterns } =
      await import('../utils/rule-generation.js');

    switch (source) {
      case 'adrs': {
        let enhancedPrompt = '';
        let knowledgeContext = '';

        // Generate domain-specific knowledge for rule extraction if enabled
        if (enhancedMode && knowledgeEnhancement) {
          try {
            const { generateArchitecturalKnowledge } =
              await import('../utils/knowledge-generation.js');
            const knowledgeResult = await generateArchitecturalKnowledge(
              {
                projectPath,
                technologies: [],
                patterns: [],
                projectType: 'architectural-governance',
              },
              {
                domains: ['api-design', 'security-patterns'],
                depth: 'intermediate',
                cacheEnabled: true,
              }
            );

            knowledgeContext = `\n## Architectural Governance Knowledge Enhancement\n\n${knowledgeResult.prompt}\n\n---\n`;
          } catch (error) {
            console.error('[WARNING] GKP knowledge generation failed for rule extraction:', error);
            knowledgeContext = '<!-- Governance knowledge generation unavailable -->\n';
          }
        }

        const result = await extractRulesFromAdrs(adrDirectory, existingRules as any, projectPath);
        enhancedPrompt = knowledgeContext + result.extractionPrompt;

        // CE-MCP: return prompt text for the host LLM. The directive path in
        // mcp-adr-analysis-server.ts intercepts this tool before it reaches here
        // when CE-MCP mode is active; this return serves legacy/prompt-only mode.
        return {
          content: [
            {
              type: 'text',
              text: `# Rule Generation: ADR-Based Rules (GKP Enhanced)

## Enhancement Status
- **Generated Knowledge Prompting**: ${knowledgeEnhancement ? '✅ Applied' : '❌ Disabled'}
- **Enhanced Mode**: ${enhancedMode ? '✅ Applied' : '❌ Disabled'}

${
  knowledgeContext
    ? `## Governance Knowledge Context

${knowledgeContext}
`
    : ''
}

${result.instructions}

## Enhanced AI Analysis Prompt

${enhancedPrompt}

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

      case 'patterns': {
        let enhancedPrompt = '';
        let knowledgeContext = '';
        let patternImplementationContext = '';

        // Smart Code Linking - discover pattern implementations in the codebase
        try {
          // Find code files for pattern analysis
          const findResult = await findFiles(projectPath, [
            '**/*.{ts,js,jsx,tsx,py,java,cs,go,rs,rb,php,swift,kt,scala,c,cpp}',
            '!**/node_modules/**',
            '!**/dist/**',
            '!**/build/**',
            '!**/target/**',
          ]);

          if (findResult.files.length > 0) {
            // Use Smart Code Linking to find examples of architectural patterns
            const patternContext = [
              'architectural patterns',
              'design patterns',
              'factory pattern',
              'singleton pattern',
              'observer pattern',
              'repository pattern',
              'service layer',
              'dependency injection',
              'model view controller',
              'layered architecture',
              'microservices',
              'event driven',
              'command query separation',
            ].join(' ');

            const relatedCodeResult = await findRelatedCode(
              'pattern-implementation-analysis',
              patternContext,
              projectPath,
              {
                useAI: true,
                maxFiles: 20,
                includeContent: false,
              }
            );

            if (relatedCodeResult.relatedFiles.length > 0) {
              patternImplementationContext = [
                '',
                '## 🔗 Pattern Implementation Discovery',
                '',
                `Found **${relatedCodeResult.relatedFiles.length}** files with potential pattern implementations:`,
                '',
                ...relatedCodeResult.relatedFiles
                  .slice(0, 15)
                  .map((file, index) => `${index + 1}. **${file.path}**`),
                relatedCodeResult.relatedFiles.length > 15
                  ? `*Showing top 15 of ${relatedCodeResult.relatedFiles.length} pattern-related files*`
                  : '',
                '',
                `**Pattern Detection Confidence**: ${(relatedCodeResult.confidence * 100).toFixed(0)}%`,
                `**Pattern Keywords**: ${relatedCodeResult.keywords?.slice(0, 10).join(', ') || 'N/A'}`,
                '',
                '## File Type Distribution',
                ...Object.entries(
                  relatedCodeResult.relatedFiles.reduce(
                    (acc, file) => {
                      const ext = file.extension || 'unknown';
                      acc[ext] = (acc[ext] || 0) + 1;
                      return acc;
                    },
                    {} as Record<string, number>
                  )
                ).map(([ext, count]) => `- **${ext.toUpperCase()}**: ${count} files`),
                '',
              ]
                .filter(Boolean)
                .join('\n');
            }
          }
        } catch (error) {
          console.warn('Smart Code Linking failed for pattern analysis:', error);
        }

        // Generate domain-specific knowledge for pattern analysis if enabled
        if (enhancedMode && knowledgeEnhancement) {
          try {
            const { generateArchitecturalKnowledge } =
              await import('../utils/knowledge-generation.js');
            const knowledgeResult = await generateArchitecturalKnowledge(
              {
                projectPath,
                technologies: [],
                patterns: [],
                projectType: 'code-pattern-analysis',
              },
              {
                domains: ['api-design', 'performance-optimization'],
                depth: 'intermediate',
                cacheEnabled: true,
              }
            );

            knowledgeContext = `\n## Code Pattern Analysis Knowledge Enhancement\n\n${knowledgeResult.prompt}\n\n---\n`;
          } catch (error) {
            console.error('[WARNING] GKP knowledge generation failed for pattern analysis:', error);
            knowledgeContext = '<!-- Pattern analysis knowledge generation unavailable -->\n';
          }
        }

        const existingRuleNames = existingRules?.map(r => r.name);
        const result = await generateRulesFromPatterns(projectPath, existingRuleNames);
        enhancedPrompt = knowledgeContext + patternImplementationContext + result.generationPrompt;

        // CE-MCP: return prompt text directly; directive intercepts in CE-MCP mode.
        return {
          content: [
            {
              type: 'text',
              text: `# Rule Generation: Pattern-Based Rules (Enhanced with Smart Code Linking)

## Enhancement Status
- **Smart Code Linking**: ${patternImplementationContext ? '✅ Pattern implementations discovered' : '❌ No patterns found'}
- **Generated Knowledge Prompting**: ${knowledgeEnhancement ? '✅ Applied' : '❌ Disabled'}
- **Enhanced Mode**: ${enhancedMode ? '✅ Applied' : '❌ Disabled'}

${
  patternImplementationContext
    ? `${patternImplementationContext}

`
    : ''
}${
                knowledgeContext
                  ? `## Governance Knowledge Context

${knowledgeContext}
`
                  : ''
              }

${result.instructions}

## Enhanced AI Analysis Prompt

${enhancedPrompt}
`,
            },
          ],
        };
      }

      case 'both': {
        const adrResult = await extractRulesFromAdrs(
          adrDirectory,
          existingRules as any,
          projectPath
        );
        const existingRuleNames = existingRules?.map(r => r.name);
        const patternResult = await generateRulesFromPatterns(projectPath, existingRuleNames);

        // CE-MCP: return prompt text directly; directive intercepts in CE-MCP mode.
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
  projectPath?: string;
  findRelatedFiles?: boolean;
}): Promise<any> {
  const {
    filePath,
    fileContent,
    fileName,
    rules,
    validationType = 'file',
    reportFormat: _reportFormat = 'detailed',
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

    // CE-MCP: return prompt text directly; directive intercepts in CE-MCP mode.
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
    const { createRuleSet, serializeRuleSetToJson, serializeRuleSetToYaml } =
      await import('../utils/rule-format.js');

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
