/**
 * MCP Tool for ADR suggestions and implicit decision detection
 * Enhanced with Knowledge Generation and Reflexion capabilities
 * Implements prompt-driven ADR recommendation system with learning
 */

import { McpAdrError } from '../types/index.js';
import { generateArchitecturalKnowledge } from '../utils/knowledge-generation.js';
import { executeWithReflexion, retrieveRelevantMemories, createToolReflexionConfig } from '../utils/reflexion.js';
import { executeADRSuggestionPrompt, formatMCPResponse } from '../utils/prompt-execution.js';

/**
 * Suggest ADRs based on project analysis with advanced prompting techniques
 * Enhanced with Knowledge Generation and Reflexion learning capabilities
 */
export async function suggestAdrs(args: {
  projectPath?: string;
  analysisType?: 'implicit_decisions' | 'code_changes' | 'comprehensive';
  beforeCode?: string;
  afterCode?: string;
  changeDescription?: string;
  commitMessages?: string[];
  existingAdrs?: string[];
  enhancedMode?: boolean; // Enable advanced prompting features
  learningEnabled?: boolean; // Enable Reflexion learning
  knowledgeEnhancement?: boolean; // Enable Knowledge Generation
}): Promise<any> {
  const {
    projectPath = process.cwd(),
    analysisType = 'comprehensive',
    beforeCode,
    afterCode,
    changeDescription,
    commitMessages,
    existingAdrs,
    enhancedMode = true, // Default to enhanced mode
    learningEnabled = true, // Default to learning enabled
    knowledgeEnhancement = true, // Default to knowledge enhancement
  } = args;

  try {
    const { analyzeImplicitDecisions, analyzeCodeChanges } = await import(
      '../utils/adr-suggestions.js'
    );

    switch (analysisType) {
      case 'implicit_decisions': {
        let enhancedPrompt = '';
        let enhancementInfo = '';

        // Apply enhancements if enabled
        if (enhancedMode && (knowledgeEnhancement || learningEnabled)) {
          let knowledgeContext = '';

          // Generate domain knowledge for implicit decision detection
          if (knowledgeEnhancement) {
            try {
              const knowledgeResult = await generateArchitecturalKnowledge({
                projectPath,
                technologies: [],
                patterns: [],
                projectType: 'implicit-decision-detection'
              }, {
                domains: ['api-design', 'database-design'],
                depth: 'basic',
                cacheEnabled: true
              });

              knowledgeContext = `\n## Knowledge Enhancement\n${knowledgeResult.prompt}\n`;
            } catch (error) {
              console.error('[WARNING] Knowledge generation failed:', error);
            }
          }

          // Apply learning if enabled
          if (learningEnabled) {
            try {
              const reflexionConfig = createToolReflexionConfig('suggest_adrs');
              const baseResult = await analyzeImplicitDecisions(projectPath, existingAdrs);

              const reflexionResult = await executeWithReflexion({
                prompt: baseResult.analysisPrompt + knowledgeContext,
                instructions: baseResult.instructions,
                context: { projectPath, analysisType: 'implicit_decisions', existingAdrs }
              }, reflexionConfig);

              enhancedPrompt = reflexionResult.prompt;
              enhancementInfo = `
## Enhancement Status
- **Knowledge Generation**: ${knowledgeEnhancement ? '✅ Applied' : '❌ Disabled'}
- **Reflexion Learning**: ✅ Applied
- **Learning from**: Past implicit decision detection tasks

`;
            } catch (error) {
              console.error('[WARNING] Reflexion enhancement failed:', error);
              const result = await analyzeImplicitDecisions(projectPath, existingAdrs);
              enhancedPrompt = result.analysisPrompt + knowledgeContext;
            }
          } else {
            const result = await analyzeImplicitDecisions(projectPath, existingAdrs);
            enhancedPrompt = result.analysisPrompt + knowledgeContext;
            enhancementInfo = `
## Enhancement Status
- **Knowledge Generation**: ${knowledgeEnhancement ? '✅ Applied' : '❌ Disabled'}
- **Reflexion Learning**: ❌ Disabled

`;
          }
        } else {
          const result = await analyzeImplicitDecisions(projectPath, existingAdrs);
          enhancedPrompt = result.analysisPrompt;
          enhancementInfo = `
## Enhancement Status
- **Enhanced Mode**: ❌ Disabled
- All advanced features are disabled for this analysis

`;
        }

        const baseResult = await analyzeImplicitDecisions(projectPath, existingAdrs);

        return {
          content: [
            {
              type: 'text',
              text: `# ADR Suggestions: Enhanced Implicit Decisions Analysis

${enhancementInfo}

${baseResult.instructions}

## Enhanced AI Analysis Prompt

${enhancedPrompt}

## Next Steps

1. **Submit the enhanced prompt** to an AI agent for comprehensive analysis
2. **Review the detected decisions** and prioritize based on impact and risk
3. **Use the \`generate_adr_from_decision\` tool** to create ADRs for high-priority decisions
4. **Integrate with existing ADR workflow** for review and approval

## Expected Output

The enhanced AI analysis will identify implicit architectural decisions and provide:
- Detailed decision analysis with evidence and domain knowledge
- Priority and risk assessments informed by past experiences
- Suggested ADR titles and content with improved quality
- Recommendations for documentation strategy based on learning
`,
            },
          ],
        };
      }

      case 'code_changes': {
        if (!beforeCode || !afterCode || !changeDescription) {
          throw new McpAdrError(
            'Code change analysis requires beforeCode, afterCode, and changeDescription',
            'INVALID_INPUT'
          );
        }

        let enhancedPrompt = '';
        let enhancementInfo = '';

        // Apply enhancements if enabled
        if (enhancedMode && (knowledgeEnhancement || learningEnabled)) {
          let knowledgeContext = '';

          // Generate domain knowledge for code change analysis
          if (knowledgeEnhancement) {
            try {
              const knowledgeResult = await generateArchitecturalKnowledge({
                projectPath: projectPath || process.cwd(),
                technologies: [],
                patterns: [],
                projectType: 'code-change-analysis'
              }, {
                domains: ['api-design', 'performance-optimization'],
                depth: 'basic',
                cacheEnabled: true
              });

              knowledgeContext = `\n## Knowledge Enhancement\n${knowledgeResult.prompt}\n`;
            } catch (error) {
              console.error('[WARNING] Knowledge generation failed:', error);
            }
          }

          // Apply learning if enabled
          if (learningEnabled) {
            try {
              const reflexionConfig = createToolReflexionConfig('suggest_adrs', {
                evaluationCriteria: ['task-success', 'accuracy', 'relevance']
              });

              const baseResult = await analyzeCodeChanges(
                beforeCode,
                afterCode,
                changeDescription,
                commitMessages
              );

              const reflexionResult = await executeWithReflexion({
                prompt: baseResult.analysisPrompt + knowledgeContext,
                instructions: baseResult.instructions,
                context: {
                  analysisType: 'code_changes',
                  changeDescription,
                  hasCommitMessages: !!commitMessages?.length
                }
              }, reflexionConfig);

              enhancedPrompt = reflexionResult.prompt;
              enhancementInfo = `
## Enhancement Status
- **Knowledge Generation**: ${knowledgeEnhancement ? '✅ Applied' : '❌ Disabled'}
- **Reflexion Learning**: ✅ Applied
- **Learning from**: Past code change analysis tasks

`;
            } catch (error) {
              console.error('[WARNING] Reflexion enhancement failed:', error);
              const result = await analyzeCodeChanges(
                beforeCode,
                afterCode,
                changeDescription,
                commitMessages
              );
              enhancedPrompt = result.analysisPrompt + knowledgeContext;
            }
          } else {
            const result = await analyzeCodeChanges(
              beforeCode,
              afterCode,
              changeDescription,
              commitMessages
            );
            enhancedPrompt = result.analysisPrompt + knowledgeContext;
            enhancementInfo = `
## Enhancement Status
- **Knowledge Generation**: ${knowledgeEnhancement ? '✅ Applied' : '❌ Disabled'}
- **Reflexion Learning**: ❌ Disabled

`;
          }
        } else {
          const result = await analyzeCodeChanges(
            beforeCode,
            afterCode,
            changeDescription,
            commitMessages
          );
          enhancedPrompt = result.analysisPrompt;
          enhancementInfo = `
## Enhancement Status
- **Enhanced Mode**: ❌ Disabled
- All advanced features are disabled for this analysis

`;
        }

        const baseResult = await analyzeCodeChanges(
          beforeCode,
          afterCode,
          changeDescription,
          commitMessages
        );

        return {
          content: [
            {
              type: 'text',
              text: `# ADR Suggestions: Enhanced Code Change Analysis

${enhancementInfo}

${baseResult.instructions}

## Enhanced AI Analysis Prompt

${enhancedPrompt}

## Next Steps

1. **Submit the enhanced prompt** to an AI agent for change analysis
2. **Review the identified decisions** reflected in the code changes
3. **Document significant decisions** as ADRs using the generation tool
4. **Follow up with development team** for any clarification questions

## Expected Output

The enhanced AI analysis will provide:
- Architectural decisions reflected in the changes with domain context
- Change motivation and context analysis informed by past experiences
- Impact and risk assessment with improved accuracy
- Recommendations for documentation based on learning patterns
`,
            },
          ],
        };
      }

      case 'comprehensive': {
        let enhancedPrompt = '';
        let knowledgeContext = '';
        let reflexionContext = '';

        // Step 1: Generate domain-specific knowledge if enabled
        if (knowledgeEnhancement) {
          try {
            const knowledgeResult = await generateArchitecturalKnowledge({
              projectPath,
              technologies: [], // Will be auto-detected from project
              patterns: [],
              projectType: 'software-architecture',
              existingAdrs: existingAdrs || []
            }, {
              domains: ['api-design', 'database-design', 'microservices'],
              depth: 'intermediate',
              cacheEnabled: true
            });

            knowledgeContext = `
## Domain-Specific Knowledge Enhancement

The following architectural knowledge has been generated to enhance ADR suggestions:

${knowledgeResult.prompt}

---
`;
          } catch (error) {
            console.error('[WARNING] Knowledge generation failed:', error);
            knowledgeContext = '<!-- Knowledge generation unavailable -->\n';
          }
        }

        // Step 2: Apply Reflexion learning if enabled
        if (learningEnabled) {
          try {
            // Retrieve relevant memories from past ADR suggestion tasks
            const memoryResult = await retrieveRelevantMemories(
              'adr-suggestion',
              { projectPath, analysisType: 'comprehensive', existingAdrs },
              { maxResults: 5, relevanceThreshold: 0.6 }
            );

            reflexionContext = `
## Learning from Past Experiences

The following insights from past ADR suggestion tasks will inform this analysis:

${memoryResult.prompt}

---
`;
          } catch (error) {
            console.error('[WARNING] Reflexion memory retrieval failed:', error);
            reflexionContext = '<!-- Learning context unavailable -->\n';
          }
        }

        // Step 3: Get the base analysis
        const implicitResult = await analyzeImplicitDecisions(projectPath, existingAdrs);

        // Step 4: Apply Reflexion execution if learning is enabled
        if (learningEnabled) {
          try {
            const reflexionConfig = createToolReflexionConfig('suggest_adrs', {
              reflectionDepth: 'detailed',
              evaluationCriteria: ['task-success', 'relevance', 'clarity'],
              learningRate: 0.7
            });

            const reflexionResult = await executeWithReflexion({
              prompt: implicitResult.analysisPrompt,
              instructions: implicitResult.instructions,
              context: {
                projectPath,
                analysisType: 'comprehensive',
                existingAdrs,
                knowledgeEnhanced: knowledgeEnhancement,
                learningEnabled: true
              }
            }, reflexionConfig);

            enhancedPrompt = `
## Enhanced Analysis with Learning

${reflexionResult.prompt}

---
`;
          } catch (error) {
            console.error('[WARNING] Reflexion execution failed:', error);
            enhancedPrompt = implicitResult.analysisPrompt;
          }
        } else {
          enhancedPrompt = implicitResult.analysisPrompt;
        }

        // Execute the analysis with AI if enabled, otherwise return prompt
        const executionResult = await executeADRSuggestionPrompt(
          enhancedPrompt,
          implicitResult.instructions,
          {
            temperature: 0.1,
            maxTokens: 4000,
          }
        );

        if (executionResult.isAIGenerated) {
          // AI execution successful - return actual analysis results
          return formatMCPResponse({
            ...executionResult,
            content: `# ADR Suggestions: AI Analysis Results

## Enhancement Features
- **Knowledge Generation**: ${knowledgeEnhancement ? '✅ Enabled' : '❌ Disabled'}
- **Reflexion Learning**: ${learningEnabled ? '✅ Enabled' : '❌ Disabled'}
- **Enhanced Mode**: ${enhancedMode ? '✅ Enabled' : '❌ Disabled'}

## Project Analysis
- **Project Path**: ${projectPath}
- **Existing ADRs**: ${existingAdrs?.length || 0} ADRs provided
- **Analysis Type**: Comprehensive (AI-driven with enhancements)

${knowledgeContext}

${reflexionContext}

## AI Analysis Results

${executionResult.content}

## Next Steps

Based on the analysis above:

1. **Review Suggested ADRs**: Examine each suggested architectural decision
2. **Prioritize by Impact**: Focus on high-impact decisions first
3. **Generate ADRs**: Use the \`generate_adr_from_decision\` tool for priority decisions
4. **Implement Changes**: Plan and execute the architectural changes
5. **Update Documentation**: Keep ADRs current as decisions evolve

## Integration Workflow

For each suggested decision, use:
\`\`\`json
{
  "tool": "generate_adr_from_decision",
  "args": {
    "decisionData": {
      "title": "Decision title from analysis",
      "context": "Context from analysis",
      "decision": "Decision description",
      "consequences": "Consequences from analysis"
    }
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
                text: `# ADR Suggestions: Enhanced Comprehensive Analysis

This enhanced analysis uses advanced prompting techniques to provide superior ADR suggestions.

## Enhancement Features
- **Knowledge Generation**: ${knowledgeEnhancement ? '✅ Enabled' : '❌ Disabled'}
- **Reflexion Learning**: ${learningEnabled ? '✅ Enabled' : '❌ Disabled'}
- **Enhanced Mode**: ${enhancedMode ? '✅ Enabled' : '❌ Disabled'}

## Project Analysis
- **Project Path**: ${projectPath}
- **Existing ADRs**: ${existingAdrs?.length || 0} ADRs provided
- **Analysis Type**: Comprehensive (AI-driven with enhancements)

${knowledgeContext}

${reflexionContext}

## AI Analysis Instructions

${implicitResult.instructions}

## Enhanced AI Analysis Prompt

${enhancedPrompt}

## Recommended Workflow

### 1. **Initial Analysis**
Submit the prompt above to get comprehensive decision detection

### 2. **Priority Review**
- Focus on **high** and **critical** priority decisions first
- Consider **risk level** and **complexity** for planning
- Group related decisions using suggested clusters

### 3. **ADR Generation**
Use \`generate_adr_from_decision\` tool for each prioritized decision

### 4. **Integration**
- Save generated ADRs to your ADR directory
- Update ADR index/catalog
- Schedule team review sessions
- Plan implementation tasks
`,
              },
            ],
          };
        }
      }

      default:
        throw new McpAdrError(`Unknown analysis type: ${analysisType}`, 'INVALID_INPUT');
    }
  } catch (error) {
    throw new McpAdrError(
      `Failed to suggest ADRs: ${error instanceof Error ? error.message : String(error)}`,
      'SUGGESTION_ERROR'
    );
  }
}

/**
 * Generate ADR from decision data
 */
export async function generateAdrFromDecision(args: {
  decisionData: {
    title: string;
    context: string;
    decision: string;
    consequences: string;
    alternatives?: string[];
    evidence?: string[];
  };
  templateFormat?: 'nygard' | 'madr' | 'custom';
  existingAdrs?: string[];
  adrDirectory?: string;
}): Promise<any> {
  const {
    decisionData,
    templateFormat = 'nygard',
    existingAdrs = [],
    adrDirectory = 'docs/adrs',
  } = args;

  try {
    const { generateAdrFromDecision, generateNextAdrNumber, suggestAdrFilename } = await import(
      '../utils/adr-suggestions.js'
    );

    if (
      !decisionData.title ||
      !decisionData.context ||
      !decisionData.decision ||
      !decisionData.consequences
    ) {
      throw new McpAdrError(
        'Decision data must include title, context, decision, and consequences',
        'INVALID_INPUT'
      );
    }

    const result = await generateAdrFromDecision(decisionData, templateFormat, existingAdrs);

    // Generate suggested metadata
    const adrNumber = generateNextAdrNumber(existingAdrs);
    const filename = suggestAdrFilename(decisionData.title, adrNumber);
    const fullPath = `${adrDirectory}/${filename}`;

    // Execute ADR generation with AI if enabled
    const { executeADRGenerationPrompt } = await import('../utils/prompt-execution.js');
    const executionResult = await executeADRGenerationPrompt(
      result.generationPrompt,
      result.instructions,
      {
        temperature: 0.1,
        maxTokens: 6000,
        responseFormat: 'text',
      }
    );

    if (executionResult.isAIGenerated) {
      // AI execution successful - return actual ADR content
      return formatMCPResponse({
        ...executionResult,
        content: `# Generated ADR: ${decisionData.title}

## ADR Metadata
- **ADR Number**: ${adrNumber}
- **Filename**: ${filename}
- **Full Path**: ${fullPath}
- **Template Format**: ${templateFormat.toUpperCase()}

## Generated ADR Content

${executionResult.content}

## File Creation Instructions

To save this ADR to your project:

1. **Create the ADR directory** (if it doesn't exist):
   \`\`\`bash
   mkdir -p ${adrDirectory}
   \`\`\`

2. **Save the ADR content** to the file:
   \`\`\`bash
   cat > "${fullPath}" << 'EOF'
   ${executionResult.content}
   EOF
   \`\`\`

3. **Verify the file** was created successfully:
   \`\`\`bash
   ls -la "${fullPath}"
   \`\`\`

## Next Steps

1. **Review the generated ADR** for accuracy and completeness
2. **Save the file** using the instructions above
3. **Update your ADR index** or catalog
4. **Share with stakeholders** for review and approval
5. **Plan implementation** of the architectural decision

## Quality Checklist

- ✅ **Title** is clear and descriptive
- ✅ **Context** explains the problem and constraints
- ✅ **Decision** is specific and actionable
- ✅ **Consequences** cover both positive and negative impacts
- ✅ **Format** follows ${templateFormat.toUpperCase()} template standards
- ✅ **Numbering** is sequential (${adrNumber})
`,
      });
    } else {
      // Fallback to prompt-only mode
      const { ensureDirectory, writeFile } = await import('../utils/file-system.js');
      const ensureDirPrompt = await ensureDirectory(adrDirectory);
      const writeFilePrompt = await writeFile(fullPath, '[ADR_CONTENT_PLACEHOLDER]');

      return {
        content: [
          {
            type: 'text',
            text: `# ADR Generation: ${decisionData.title}

${result.instructions}

## Suggested ADR Metadata
- **ADR Number**: ${adrNumber}
- **Filename**: ${filename}
- **Full Path**: ${fullPath}
- **Template Format**: ${templateFormat.toUpperCase()}

## Step 1: Create ADR Directory
${ensureDirPrompt.prompt}

## Step 2: Generate ADR Content

${result.generationPrompt}

## Step 3: Save ADR to File

After generating the ADR content from Step 2, create the ADR file:

${writeFilePrompt.prompt}

**Important**: Replace \`[ADR_CONTENT_PLACEHOLDER]\` with the actual generated ADR content from Step 2.
`,
          },
        ],
      };
    }
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate ADR: ${error instanceof Error ? error.message : String(error)}`,
      'GENERATION_ERROR'
    );
  }
}

/**
 * Generate prompt for AI to discover existing ADRs in the project
 */
export async function discoverExistingAdrs(args: {
  adrDirectory?: string;
  includeContent?: boolean;
}): Promise<any> {
  const { adrDirectory = 'docs/adrs', includeContent = false } = args;

  // Create the discovery prompt
  const discoveryPrompt = `
# ADR Discovery Request

Please scan the project directory **${adrDirectory}** to discover existing ADRs.

## Discovery Tasks

1. **Directory Scanning**
   - Use file system tools to list all files in \`${adrDirectory}\`
   - Look for files with \`.md\` extension
   - Check for common ADR naming patterns (e.g., \`ADR-001-\`, \`001-\`, etc.)

2. **Content Analysis** ${includeContent ? '(with content)' : '(metadata only)'}
   - Read each ADR file to extract metadata
   - Identify title, status, date, and key information
   - ${includeContent ? 'Extract full content for analysis' : 'Focus on headers and metadata'}

3. **ADR Inventory Generation**
   - Create a list of all discovered ADRs
   - Extract titles, statuses, and dates
   - Generate a summary of the ADR collection

## Search Patterns

Look for files matching these patterns:
- \`${adrDirectory}/**/*.md\`
- Files starting with numbers (e.g., \`001-\`, \`0001-\`)
- Files containing "ADR" in the name
- Files with architectural decision keywords

## Alternative Locations

If no ADRs are found in \`${adrDirectory}\`, also check:
- \`docs/\` directory
- \`documentation/\` directory
- \`decisions/\` directory
- Root directory for isolated ADR files

## Output Format

Provide findings in JSON format with:
- discoveryResults: directory, totalAdrs, adrs array
- summary: byStatus and byCategory breakdowns
- recommendations: next steps based on discovered ADRs
`;

  const instructions = `
# ADR Discovery Instructions

1. **Scan Directory**: Use file system tools to scan ${adrDirectory}
2. **Identify ADRs**: Look for markdown files with ADR patterns
3. **Extract Metadata**: Get title, status, date from each ADR
4. **Generate Summary**: Create categorized summary of findings
5. **Provide Recommendations**: Suggest next steps based on discovery

## Expected Output

Return a comprehensive JSON object with discovery results, summary statistics, and actionable recommendations.
`;

  // Execute the ADR discovery with AI if enabled, otherwise return prompt
  const { executePromptWithFallback, formatMCPResponse } = await import('../utils/prompt-execution.js');
  const executionResult = await executePromptWithFallback(
    discoveryPrompt,
    instructions,
    {
      temperature: 0.1,
      maxTokens: 4000,
      systemPrompt: `You are an expert in architectural documentation analysis and file system operations.
Scan the specified directory to discover existing ADRs and provide comprehensive analysis.
Focus on extracting accurate metadata and providing actionable insights about the ADR collection.
Use appropriate file system tools to scan directories and read file contents.`,
      responseFormat: 'text'
    }
  );

  if (executionResult.isAIGenerated) {
    // AI execution successful - return actual ADR discovery results
    return formatMCPResponse({
      ...executionResult,
      content: `# ADR Discovery Results

## Discovery Information
- **ADR Directory**: ${adrDirectory}
- **Include Content**: ${includeContent ? 'Yes' : 'No (metadata only)'}

## AI Discovery Results

${executionResult.content}

## Next Steps

Based on the discovered ADRs:

1. **Review ADR Collection**: Examine the discovered ADRs for completeness
2. **Identify Gaps**: Look for missing architectural decisions
3. **Update Outdated ADRs**: Review and update deprecated or outdated decisions
4. **Generate New ADRs**: Use discovered patterns to suggest new ADRs
5. **Create ADR Index**: Maintain an up-to-date catalog of all ADRs

## Integration Commands

To suggest new ADRs based on discovered ones:
\`\`\`json
{
  "tool": "suggest_adrs",
  "args": {
    "existingAdrs": ["list of discovered ADR titles"],
    "analysisType": "comprehensive"
  }
}
\`\`\`

To generate a todo list from discovered ADRs:
\`\`\`json
{
  "tool": "generate_adr_todo",
  "args": {
    "adrDirectory": "${adrDirectory}",
    "scope": "all"
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
          text: `# ADR Discovery: AI-Driven Scan

## Instructions for AI Agent

Please scan the project directory **${adrDirectory}** to discover existing ADRs.

${discoveryPrompt}

${instructions}

## Next Steps

After discovery, use the results with other ADR tools for comprehensive analysis.
`,
        },
      ],
    };
  }
}
