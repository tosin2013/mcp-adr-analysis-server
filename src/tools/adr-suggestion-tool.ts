/**
 * MCP Tool for ADR suggestions and implicit decision detection
 * Implements prompt-driven ADR recommendation system
 */

import { McpAdrError } from '../types/index.js';

/**
 * Suggest ADRs based on project analysis
 */
export async function suggestAdrs(args: {
  projectPath?: string;
  analysisType?: 'implicit_decisions' | 'code_changes' | 'comprehensive';
  beforeCode?: string;
  afterCode?: string;
  changeDescription?: string;
  commitMessages?: string[];
  existingAdrs?: string[];
}): Promise<any> {
  const {
    projectPath = process.cwd(),
    analysisType = 'comprehensive',
    beforeCode,
    afterCode,
    changeDescription,
    commitMessages,
    existingAdrs,
  } = args;

  try {
    const { analyzeImplicitDecisions, analyzeCodeChanges } = await import(
      '../utils/adr-suggestions.js'
    );

    switch (analysisType) {
      case 'implicit_decisions': {
        const result = await analyzeImplicitDecisions(projectPath, existingAdrs);

        return {
          content: [
            {
              type: 'text',
              text: `# ADR Suggestions: Implicit Decisions Analysis

${result.instructions}

## AI Analysis Prompt

${result.analysisPrompt}

## Next Steps

1. **Submit the prompt** to an AI agent for comprehensive analysis
2. **Review the detected decisions** and prioritize based on impact and risk
3. **Use the \`generate_adr_from_decision\` tool** to create ADRs for high-priority decisions
4. **Integrate with existing ADR workflow** for review and approval

## Expected Output

The AI will identify implicit architectural decisions in your codebase and provide:
- Detailed decision analysis with evidence
- Priority and risk assessments
- Suggested ADR titles and content
- Recommendations for documentation strategy
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

        const result = await analyzeCodeChanges(
          beforeCode,
          afterCode,
          changeDescription,
          commitMessages
        );

        return {
          content: [
            {
              type: 'text',
              text: `# ADR Suggestions: Code Change Analysis

${result.instructions}

## AI Analysis Prompt

${result.analysisPrompt}

## Next Steps

1. **Submit the prompt** to an AI agent for change analysis
2. **Review the identified decisions** reflected in the code changes
3. **Document significant decisions** as ADRs using the generation tool
4. **Follow up with development team** for any clarification questions

## Expected Output

The AI will analyze the code changes and provide:
- Architectural decisions reflected in the changes
- Change motivation and context analysis
- Impact and risk assessment
- Recommendations for documentation
`,
            },
          ],
        };
      }

      case 'comprehensive': {
        const implicitResult = await analyzeImplicitDecisions(projectPath, existingAdrs);

        return {
          content: [
            {
              type: 'text',
              text: `# ADR Suggestions: Comprehensive Analysis

This comprehensive analysis will identify all potential ADRs for your project.

## Project Analysis
- **Project Path**: ${projectPath}
- **Existing ADRs**: ${existingAdrs?.length || 0} ADRs provided
- **Analysis Type**: Comprehensive (AI-driven file scanning)

## AI Analysis Instructions

${implicitResult.instructions}

## AI Analysis Prompt

${implicitResult.analysisPrompt}

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

## AI Generation Prompt

${result.generationPrompt}

## Next Steps

1. **Submit the generation prompt** to an AI agent for ADR creation
2. **Review the generated ADR** for completeness and accuracy
3. **Save the ADR** to the suggested location: \`${fullPath}\`
4. **Update ADR index** and notify relevant stakeholders
5. **Schedule review** with architecture team

## Quality Checklist

Before finalizing the ADR, ensure:
- [ ] **Title** is clear and descriptive
- [ ] **Context** explains the problem and constraints
- [ ] **Decision** is specific and actionable
- [ ] **Consequences** cover both positive and negative impacts
- [ ] **Alternatives** are documented (if applicable)
- [ ] **Evidence** supports the decision (if applicable)
- [ ] **Format** follows team standards
- [ ] **Numbering** is correct and sequential

## Integration Tips

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
