/**
 * MCP Tool for ADR suggestions and implicit decision detection
 * Enhanced with Knowledge Generation and Reflexion capabilities
 * Implements prompt-driven ADR recommendation system with learning
 */

import { McpAdrError } from '../types/index.js';
import { generateArchitecturalKnowledge } from '../utils/knowledge-generation.js';
import { executeWithReflexion, retrieveRelevantMemories, createToolReflexionConfig } from '../utils/reflexion.js';

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
Use \`generate_adr_from_decision\` tool for each prioritized decision:
\`\`\`
{
  "tool": "generate_adr_from_decision",
  "args": {
    "decisionData": {
      "title": "Decision title from analysis",
      "context": "Context from analysis",
      "decision": "Decision description",
      "consequences": "Consequences from analysis"
    },
    "templateFormat": "nygard",
    "existingAdrs": ["list of existing ADRs"]
  }
}
\`\`\`

### 4. **Integration**
- Save generated ADRs to your ADR directory
- Update ADR index/catalog
- Schedule team review sessions
- Plan implementation tasks

## Expected Outcomes

This analysis will help you:
- **Identify undocumented decisions** in your architecture
- **Prioritize documentation efforts** based on impact and risk
- **Generate high-quality ADRs** using AI assistance
- **Improve architectural governance** and decision tracking
`,
            },
          ],
        };
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
    const { ensureDirectory, writeFile } = await import('../utils/file-system.js');

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

    // Generate file creation prompts
    const ensureDirPrompt = await ensureDirectory(adrDirectory);
    const writeFilePrompt = await writeFile(fullPath, '[ADR_CONTENT_PLACEHOLDER]');

    return {
      content: [
        {
          type: 'text',
          text: `# ADR Generation with File Creation: ${decisionData.title}

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

## File Creation Instructions

The AI agent must:
1. **Execute directory creation** from Step 1 to ensure ${adrDirectory} exists
2. **Generate ADR content** using the prompt from Step 2
3. **Create the ADR file** at: ${fullPath}
4. **Include all generated content** in the file (title, context, decision, consequences, etc.)
5. **Confirm file creation** and provide the file location

## Next Steps After File Creation

1. **Verify ADR file** was created successfully at: \`${fullPath}\`
2. **Update ADR index** and notify relevant stakeholders
3. **Schedule review** with architecture team
4. **Link to related ADRs** and documentation

## Quality Checklist

Before finalizing the ADR, ensure:
- [ ] **Directory Created**: ${adrDirectory} directory exists
- [ ] **File Created**: ADR file saved at ${fullPath}
- [ ] **Title** is clear and descriptive
- [ ] **Context** explains the problem and constraints
- [ ] **Decision** is specific and actionable
- [ ] **Consequences** cover both positive and negative impacts
- [ ] **Alternatives** are documented (if applicable)
- [ ] **Evidence** supports the decision (if applicable)
- [ ] **Format** follows team standards
- [ ] **Numbering** is correct and sequential
- [ ] **File Permissions** are appropriate for team access

## Security and Validation

The file creation process includes:
- **Path Validation**: Ensures ${fullPath} is within project scope
- **Directory Security**: Validates ${adrDirectory} is safe for file creation
- **Content Validation**: Verifies ADR content is properly formatted
- **User Confirmation**: Requires approval before file creation

## Integration Tips

- Verify the ADR file was created successfully
- Add the ADR to your project's ADR index
- Link to related ADRs and documentation
- Include implementation tasks in project planning
- Schedule follow-up reviews for complex decisions
`,
        },
      ],
    };
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

  return {
    content: [
      {
        type: 'text',
        text: `# ADR Discovery: AI-Driven Scan

## Instructions for AI Agent

Please scan the project directory **${adrDirectory}** to discover existing ADRs.

### Your Discovery Tasks

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

### Expected Output Format

Please provide your findings in this JSON format:

\`\`\`json
{
  "discoveryResults": {
    "directory": "${adrDirectory}",
    "totalAdrs": 0,
    "adrs": [
      {
        "filename": "adr-001-example.md",
        "path": "full/path/to/file",
        "title": "Example Decision",
        "status": "Accepted",
        "date": "2024-01-01",
        "size": 1234${includeContent ? ',\n        "content": "full ADR content"' : ''}
      }
    ]
  },
  "summary": {
    "byStatus": {
      "accepted": 5,
      "proposed": 2,
      "deprecated": 1
    },
    "byCategory": {
      "architecture": 3,
      "technology": 2,
      "process": 3
    }
  },
  "recommendations": [
    "Next steps based on discovered ADRs"
  ]
}
\`\`\`

### Search Patterns

Look for files matching these patterns:
- \`${adrDirectory}/**/*.md\`
- Files starting with numbers (e.g., \`001-\`, \`0001-\`)
- Files containing "ADR" in the name
- Files with architectural decision keywords

### Alternative Locations

If no ADRs are found in \`${adrDirectory}\`, also check:
- \`docs/\` directory
- \`documentation/\` directory
- \`decisions/\` directory
- Root directory for isolated ADR files

## Next Steps

After discovery, use the results with:
\`\`\`
{
  "tool": "suggest_adrs",
  "args": {
    "existingAdrs": ["list of discovered ADR titles"]
  }
}
\`\`\`
`,
      },
    ],
  };
}
