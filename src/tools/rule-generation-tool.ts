/**
 * MCP Tools for rule generation and validation
 * Implements prompt-driven architectural rule management
 * Enhanced with Generated Knowledge Prompting (GKP) for architectural governance expertise
 */

import { McpAdrError } from '../types/index.js';
import { findFiles, findRelatedCode } from '../utils/file-system.js';

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
    knowledgeEnhancement = true, // Default to GKP enabled
    enhancedMode = true, // Default to enhanced mode
  } = args;

  try {
    const { extractRulesFromAdrs, generateRulesFromPatterns } = await import(
      '../utils/rule-generation.js'
    );

    switch (source) {
      case 'adrs': {
        let enhancedPrompt = '';
        let knowledgeContext = '';

        // Generate domain-specific knowledge for rule extraction if enabled
        if (enhancedMode && knowledgeEnhancement) {
          try {
            const { generateArchitecturalKnowledge } = await import(
              '../utils/knowledge-generation.js'
            );
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

        // Execute the rule extraction with AI if enabled, otherwise return prompt
        const { executePromptWithFallback, formatMCPResponse } = await import(
          '../utils/prompt-execution.js'
        );
        const executionResult = await executePromptWithFallback(
          enhancedPrompt,
          result.instructions,
          {
            temperature: 0.1,
            maxTokens: 6000,
            systemPrompt: `You are an expert software architect specializing in architectural rule extraction and governance.
Analyze the provided ADRs to extract actionable architectural rules and governance policies.
Leverage the provided architectural governance knowledge to create comprehensive, industry-standard rules.
Focus on creating specific, measurable rules that can be validated automatically.
Provide clear reasoning for each rule and practical implementation guidance.
Consider compliance standards, governance frameworks, and architectural best practices.`,
            responseFormat: 'text',
          }
        );

        if (executionResult.isAIGenerated) {
          // AI execution successful - return actual rule extraction results
          return formatMCPResponse({
            ...executionResult,
            content: `# ADR-Based Rule Generation Results (GKP Enhanced)

## Enhancement Features
- **Generated Knowledge Prompting**: ${knowledgeEnhancement ? '✅ Enabled' : '❌ Disabled'}
- **Enhanced Mode**: ${enhancedMode ? '✅ Enabled' : '❌ Disabled'}
- **Knowledge Domains**: Governance frameworks, software architecture, compliance standards

## Analysis Information
- **ADR Directory**: ${adrDirectory}
- **Existing Rules**: ${existingRules?.length || 0} rules
- **Output Format**: ${outputFormat.toUpperCase()}

${
  knowledgeContext
    ? `## Applied Governance Knowledge

${knowledgeContext}
`
    : ''
}

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
                useRipgrep: true,
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
            const { generateArchitecturalKnowledge } = await import(
              '../utils/knowledge-generation.js'
            );
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

        // Execute the pattern-based rule generation with AI if enabled, otherwise return prompt
        const { executePromptWithFallback, formatMCPResponse } = await import(
          '../utils/prompt-execution.js'
        );
        const executionResult = await executePromptWithFallback(
          enhancedPrompt,
          result.instructions,
          {
            temperature: 0.1,
            maxTokens: 6000,
            systemPrompt: `You are an expert software architect specializing in code pattern analysis and rule generation.
Analyze the provided codebase to identify consistent patterns and generate actionable architectural rules.
Leverage the provided design pattern and code quality knowledge to create comprehensive, industry-standard rules.
Focus on creating rules that enforce consistency, quality, and maintainability based on observed patterns.
Consider established design patterns, code quality metrics, and architectural best practices.
Provide confidence scores and practical implementation guidance for each rule.`,
            responseFormat: 'text',
          }
        );

        if (executionResult.isAIGenerated) {
          // AI execution successful - return actual pattern-based rule generation results
          return formatMCPResponse({
            ...executionResult,
            content: `# Pattern-Based Rule Generation Results (Enhanced with Smart Code Linking)

## Enhancement Features
- **Smart Code Linking**: ${patternImplementationContext ? '✅ Active' : '❌ No patterns found'}
- **Generated Knowledge Prompting**: ${knowledgeEnhancement ? '✅ Enabled' : '❌ Disabled'}
- **Enhanced Mode**: ${enhancedMode ? '✅ Enabled' : '❌ Disabled'}
- **Knowledge Domains**: Design patterns, code quality, software architecture

## Analysis Information
- **Project Path**: ${projectPath}
- **Existing Rules**: ${existingRules?.length || 0} rules
- **Output Format**: ${outputFormat.toUpperCase()}

${patternImplementationContext ? `${patternImplementationContext}` : ''}

${
  knowledgeContext
    ? `## Applied Pattern Knowledge

${knowledgeContext}
`
    : ''
}

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

## Next Steps

1. **Submit the enhanced prompt** to an AI agent for comprehensive pattern analysis
2. **Parse the JSON response** to get generated rules and pattern metrics
3. **Review pattern-based rules** using the discovered implementation context
4. **Combine with ADR-extracted rules** for comprehensive rule set
5. **Implement validation** for high-confidence pattern rules

## Pattern Implementation Benefits

The Smart Code Linking enhancement provides:
- **Real Examples**: Rules based on actual pattern implementations found in your codebase
- **Context-Aware**: Better understanding of how patterns are actually used
- **Higher Confidence**: Rules validated against existing code patterns
- **Team Alignment**: Rules that reflect current team practices and implementations
`,
              },
            ],
          };
        }
      }

      case 'both': {
        let comprehensiveKnowledgeContext = '';
        let comprehensivePatternContext = '';

        // Smart Code Linking - comprehensive pattern and ADR implementation discovery
        try {
          // Find all code and documentation files
          const findResult = await findFiles(projectPath, [
            '**/*.{ts,js,jsx,tsx,py,java,cs,go,rs,rb,php,swift,kt,scala,c,cpp}',
            '**/*.{md,adoc,rst}',
            '!**/node_modules/**',
            '!**/dist/**',
            '!**/build/**',
            '!**/target/**',
          ]);

          if (findResult.files.length > 0) {
            // Use Smart Code Linking to find comprehensive architectural patterns and ADR implementations
            const comprehensiveContext = [
              'architectural decisions',
              'design patterns',
              'architectural patterns',
              'software architecture',
              'architectural governance',
              'code standards',
              'best practices',
              'quality attributes',
              'security patterns',
              'performance patterns',
              'scalability patterns',
              'maintainability',
              'testability',
              'deployment patterns',
              'integration patterns',
            ].join(' ');

            const relatedCodeResult = await findRelatedCode(
              'comprehensive-architecture-analysis',
              comprehensiveContext,
              projectPath,
              {
                useAI: true,
                useRipgrep: true,
                maxFiles: 30,
                includeContent: false,
              }
            );

            if (relatedCodeResult.relatedFiles.length > 0) {
              // Categorize files by type for better analysis
              const codeFiles = relatedCodeResult.relatedFiles.filter(f =>
                f.extension?.match(
                  /\.(ts|js|jsx|tsx|py|java|cs|go|rs|rb|php|swift|kt|scala|c|cpp)$/
                )
              );
              const docFiles = relatedCodeResult.relatedFiles.filter(f =>
                f.extension?.match(/\.(md|adoc|rst)$/)
              );

              comprehensivePatternContext = [
                '',
                '## 🔗 Comprehensive Architecture Discovery',
                '',
                `Found **${relatedCodeResult.relatedFiles.length}** files relevant to architectural rule generation:`,
                '',
                `### Code Implementation Files (${codeFiles.length})`,
                ...codeFiles.slice(0, 12).map((file, index) => `${index + 1}. **${file.path}**`),
                codeFiles.length > 12 ? `*Showing top 12 of ${codeFiles.length} code files*` : '',
                '',
                docFiles.length > 0
                  ? [
                      `### Documentation Files (${docFiles.length})`,
                      ...docFiles
                        .slice(0, 8)
                        .map((file, index) => `${index + 1}. **${file.path}**`),
                      docFiles.length > 8
                        ? `*Showing top 8 of ${docFiles.length} documentation files*`
                        : '',
                      '',
                    ].join('\n')
                  : '',
                `**Overall Analysis Confidence**: ${(relatedCodeResult.confidence * 100).toFixed(0)}%`,
                `**Architectural Keywords**: ${relatedCodeResult.keywords?.slice(0, 12).join(', ') || 'N/A'}`,
                '',
                '## Technology Stack Analysis',
                ...Object.entries(
                  relatedCodeResult.relatedFiles.reduce(
                    (acc, file) => {
                      const ext = file.extension || 'unknown';
                      acc[ext] = (acc[ext] || 0) + 1;
                      return acc;
                    },
                    {} as Record<string, number>
                  )
                )
                  .slice(0, 8)
                  .map(([ext, count]) => `- **${ext.toUpperCase()}**: ${count} files`),
                '',
              ]
                .filter(Boolean)
                .join('\n');
            }
          }
        } catch (error) {
          console.warn('Smart Code Linking failed for comprehensive analysis:', error);
        }

        // Generate comprehensive domain knowledge if enabled
        if (enhancedMode && knowledgeEnhancement) {
          try {
            const { generateArchitecturalKnowledge } = await import(
              '../utils/knowledge-generation.js'
            );
            const knowledgeResult = await generateArchitecturalKnowledge(
              {
                projectPath,
                technologies: [],
                patterns: [],
                projectType: 'comprehensive-rule-generation',
              },
              {
                domains: ['api-design', 'security-patterns', 'performance-optimization'],
                depth: 'advanced',
                cacheEnabled: true,
              }
            );

            comprehensiveKnowledgeContext = `\n## Comprehensive Architectural Knowledge Enhancement\n\n${knowledgeResult.prompt}\n\n---\n`;
          } catch (error) {
            console.error(
              '[WARNING] GKP knowledge generation failed for comprehensive analysis:',
              error
            );
            comprehensiveKnowledgeContext =
              '<!-- Comprehensive knowledge generation unavailable -->\n';
          }
        }

        const adrResult = await extractRulesFromAdrs(
          adrDirectory,
          existingRules as any,
          projectPath
        );
        const existingRuleNames = existingRules?.map(r => r.name);
        const patternResult = await generateRulesFromPatterns(projectPath, existingRuleNames);

        // Create comprehensive prompt combining both ADR and pattern analysis with knowledge enhancement
        const comprehensivePrompt = `${comprehensiveKnowledgeContext}${comprehensivePatternContext}
# Comprehensive Architectural Rule Generation

Generate a complete set of architectural rules by analyzing both ADRs and code patterns with Smart Code Linking context.

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
        const { executePromptWithFallback, formatMCPResponse } = await import(
          '../utils/prompt-execution.js'
        );
        const executionResult = await executePromptWithFallback(
          comprehensivePrompt,
          `${adrResult.instructions}\n\n${patternResult.instructions}`,
          {
            temperature: 0.1,
            maxTokens: 8000,
            systemPrompt: `You are an expert software architect specializing in comprehensive architectural rule generation.
Analyze both ADRs and code patterns to create a unified, actionable rule set for the project.
Leverage the provided comprehensive architectural knowledge including governance frameworks, design patterns, and compliance standards.
Focus on creating rules that are specific, measurable, and can be validated automatically.
Prioritize explicit architectural decisions (ADRs) over implicit patterns when conflicts arise.
Consider industry best practices, compliance requirements, and established architectural principles.`,
            responseFormat: 'text',
          }
        );

        if (executionResult.isAIGenerated) {
          // AI execution successful - return actual comprehensive rule generation results
          return formatMCPResponse({
            ...executionResult,
            content: `# Comprehensive Rule Generation Results (Enhanced with Smart Code Linking & GKP)

## Enhancement Features
- **Smart Code Linking**: ${comprehensivePatternContext ? '✅ Active' : '❌ No patterns found'}
- **Generated Knowledge Prompting**: ${knowledgeEnhancement ? '✅ Enabled' : '❌ Disabled'}
- **Enhanced Mode**: ${enhancedMode ? '✅ Enabled' : '❌ Disabled'}
- **Knowledge Domains**: Governance frameworks, software architecture, design patterns, compliance standards, code quality
- **Knowledge Depth**: Advanced (comprehensive coverage)

## Analysis Information
- **ADR Directory**: ${adrDirectory}
- **Project Path**: ${projectPath}
- **Existing Rules**: ${existingRules?.length || 0} rules
- **Output Format**: ${outputFormat.toUpperCase()}

${comprehensivePatternContext ? `${comprehensivePatternContext}` : ''}

${
  comprehensiveKnowledgeContext
    ? `## Applied Comprehensive Knowledge

${comprehensiveKnowledgeContext}
`
    : ''
}

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
  projectPath?: string;
  findRelatedFiles?: boolean;
}): Promise<any> {
  const {
    filePath,
    fileContent,
    fileName,
    rules,
    validationType = 'file',
    reportFormat = 'detailed',
    projectPath = process.cwd(),
    findRelatedFiles = false,
  } = args;

  try {
    const { validateCodeAgainstRules } = await import('../utils/rule-generation.js');

    if (!filePath && !fileContent) {
      throw new McpAdrError('Either filePath or fileContent must be provided', 'INVALID_INPUT');
    }

    if (!rules || rules.length === 0) {
      throw new McpAdrError('Rules array is required and cannot be empty', 'INVALID_INPUT');
    }

    // Smart Code Linking - find related files for comprehensive validation context
    let relatedFilesContext = '';
    if (findRelatedFiles && filePath) {
      try {
        // Create context from the file being validated and the rules
        const validationContext = [
          `File being validated: ${filePath}`,
          'Architectural rules validation',
          ...rules.slice(0, 5).map(rule => `Rule: ${rule.name} - ${rule.description}`),
        ].join('\n');

        const relatedCodeResult = await findRelatedCode(
          'rule-validation-context',
          validationContext,
          projectPath,
          {
            useAI: true,
            useRipgrep: true,
            maxFiles: 12,
            includeContent: false,
          }
        );

        if (relatedCodeResult.relatedFiles.length > 0) {
          // Filter out the file being validated itself
          const otherRelatedFiles = relatedCodeResult.relatedFiles.filter(
            f => f.path !== filePath && !filePath.endsWith(f.path)
          );

          if (otherRelatedFiles.length > 0) {
            relatedFilesContext = [
              '',
              '## 🔗 Related Files for Validation Context',
              '',
              `Found **${otherRelatedFiles.length}** related files that may need similar validation:`,
              '',
              ...otherRelatedFiles
                .slice(0, 8)
                .map((file, index) => `${index + 1}. **${file.path}**`),
              otherRelatedFiles.length > 8
                ? `*Showing top 8 of ${otherRelatedFiles.length} related files*`
                : '',
              '',
              `**Context Confidence**: ${(relatedCodeResult.confidence * 100).toFixed(0)}%`,
              '',
              '💡 **Recommendation**: Consider validating these related files against the same rules for comprehensive compliance.',
              '',
            ]
              .filter(Boolean)
              .join('\n');
          }
        }
      } catch (error) {
        console.warn('Smart Code Linking failed for validation context:', error);
      }
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
    const { executePromptWithFallback, formatMCPResponse } = await import(
      '../utils/prompt-execution.js'
    );
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
        responseFormat: 'text',
      }
    );

    if (executionResult.isAIGenerated) {
      // AI execution successful - return actual rule validation results
      return formatMCPResponse({
        ...executionResult,
        content: `# Code Validation Results (Enhanced with Smart Code Linking)

## Validation Information
- **File**: ${fileName || filePath || 'Content provided'}
- **Validation Type**: ${validationType}
- **Rules Applied**: ${rules.length} rules
- **Report Format**: ${reportFormat}
- **Smart Code Linking**: ${relatedFilesContext ? '✅ Related files discovered' : findRelatedFiles ? '❌ No related files found' : '⚪ Not requested'}

${relatedFilesContext ? `${relatedFilesContext}` : ''}

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
