/**
 * Research integration utilities using prompt-driven AI analysis
 * Implements intelligent research findings incorporation into ADRs
 */

import { McpAdrError } from '../types/index.js';

export interface ResearchFile {
  filename: string;
  content: string;
  lastModified: string;
  size: number;
  path: string;
}

export interface ResearchTopic {
  id: string;
  title: string;
  category: string;
  description: string;
  sourceFiles: string[];
  keyFindings: string[];
  evidence: string[];
  confidence: number;
  relevanceScore: number;
  lastUpdated: string;
  tags: string[];
}

export interface ResearchInsight {
  insight: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  supportingTopics: string[];
  actionRequired: boolean;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface AdrImpactAnalysis {
  adrId: string;
  adrTitle: string;
  impactLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  impactType: string;
  affectedSections: string[];
  relatedTopics: string[];
  findings: string[];
  recommendedAction: 'no_action' | 'review' | 'update' | 'deprecate' | 'supersede';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  reasoning: string;
}

/**
 * Monitor research directory for files
 */
export async function monitorResearchDirectory(
  researchPath: string = 'docs/research'
): Promise<{ monitoringPrompt: string; instructions: string }> {
  try {
    const { findFiles } = await import('./file-system.js');

    // Find all research files
    const researchFiles = await findFiles(
      process.cwd(),
      [
        `${researchPath}/**/*.md`,
        `${researchPath}/**/*.txt`,
        `${researchPath}/**/*.pdf`,
        `${researchPath}/**/*.doc`,
        `${researchPath}/**/*.docx`,
      ],
      { includeContent: true }
    );

    const instructions = `
# Research Directory Monitoring

Monitoring research directory for architectural insights and findings.

## Directory Status
- **Research Path**: ${researchPath}
- **Files Found**: ${researchFiles.length} files
- **Total Size**: ${researchFiles.reduce((sum, f) => sum + (f.size || 0), 0)} bytes

## Discovered Files
${
  researchFiles.length === 0
    ? 'No research files found in the specified directory.'
    : researchFiles
        .map(
          (file, index) => `
### ${index + 1}. ${file.name}
- **Path**: ${file.path}
- **Size**: ${file.size} bytes
- **Last Modified**: ${(file as any).lastModified || 'Unknown'}
`
        )
        .join('')
}

## Next Steps
1. **Extract research topics** using the topic extraction tool
2. **Analyze impact on existing ADRs** using the impact evaluation tool
3. **Generate update suggestions** for affected ADRs
4. **Monitor for new research** files and changes

## Monitoring Recommendations
- Set up file system watchers for automatic detection
- Establish research file naming conventions
- Create research templates for consistent structure
- Schedule regular research integration reviews

${
  researchFiles.length === 0
    ? `
## Getting Started
To begin using research integration:
1. Create the research directory: \`mkdir -p ${researchPath}\`
2. Add research files (markdown, text, or documents)
3. Use the \`incorporate_research\` tool to analyze findings
4. Review suggested ADR updates and implementations
`
    : ''
}
`;

    return {
      monitoringPrompt: `Research directory monitoring complete. Found ${researchFiles.length} files in ${researchPath}.`,
      instructions,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to monitor research directory: ${error instanceof Error ? error.message : String(error)}`,
      'MONITORING_ERROR'
    );
  }
}

/**
 * Extract research topics from files
 */
export async function extractResearchTopics(
  researchPath: string = 'docs/research',
  existingTopics?: string[]
): Promise<{ extractionPrompt: string; instructions: string }> {
  try {
    const { findFiles } = await import('./file-system.js');
    const { generateResearchTopicExtractionPrompt } = await import(
      '../prompts/research-integration-prompts.js'
    );

    // Find and read research files
    const researchFiles = await findFiles(
      process.cwd(),
      [`${researchPath}/**/*.md`, `${researchPath}/**/*.txt`],
      { includeContent: true }
    );

    if (researchFiles.length === 0) {
      throw new McpAdrError(`No research files found in ${researchPath}`, 'NO_RESEARCH_FILES');
    }

    // Prepare research file data
    const fileData = researchFiles.map(file => ({
      filename: file.name,
      content: file.content || '',
      lastModified: (file as any).lastModified || new Date().toISOString(),
      size: file.size || 0,
    }));

    const extractionPrompt = generateResearchTopicExtractionPrompt(fileData, existingTopics);

    const instructions = `
# Research Topic Extraction Instructions

This analysis will extract key topics and findings from research files that could impact architectural decisions.

## Research Analysis
- **Research Path**: ${researchPath}
- **Files Analyzed**: ${researchFiles.length} files
- **Existing Topics**: ${existingTopics?.length || 0} topics
- **Total Content**: ${fileData.reduce((sum, f) => sum + f.content.length, 0)} characters

## Next Steps
1. **Submit the extraction prompt** to an AI agent for topic analysis
2. **Parse the JSON response** to get extracted topics and insights
3. **Review the research findings** for architectural relevance
4. **Use the impact evaluation tool** to assess ADR implications

## Expected AI Response Format
The AI will return a JSON object with:
- \`extractedTopics\`: Array of research topics with findings and evidence
- \`researchSummary\`: Overall assessment of research quality and completeness
- \`keyInsights\`: Major insights that require action
- \`recommendations\`: Specific recommendations for incorporating findings
- \`gaps\`: Areas where additional research is needed

## Usage Example
\`\`\`typescript
const result = await extractResearchTopics(researchPath, existingTopics);
// Submit result.extractionPrompt to AI agent
// Parse AI response for research topics and insights
\`\`\`
`;

    return {
      extractionPrompt,
      instructions,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to extract research topics: ${error instanceof Error ? error.message : String(error)}`,
      'EXTRACTION_ERROR'
    );
  }
}

/**
 * Evaluate research impact on existing ADRs
 */
export async function evaluateResearchImpact(
  researchTopics: ResearchTopic[],
  adrDirectory: string = 'docs/adrs'
): Promise<{ evaluationPrompt: string; instructions: string }> {
  try {
    const { findFiles } = await import('./file-system.js');
    const { generateResearchImpactEvaluationPrompt } = await import(
      '../prompts/research-integration-prompts.js'
    );

    // Find existing ADRs
    const adrFiles = await findFiles(process.cwd(), [`${adrDirectory}/**/*.md`], {
      includeContent: true,
    });

    if (adrFiles.length === 0) {
      throw new McpAdrError(`No ADR files found in ${adrDirectory}`, 'NO_ADRS_FOUND');
    }

    // Prepare ADR data
    const adrData = adrFiles.map(file => {
      const titleMatch = file.content?.match(/^#\s+(.+)$/m);
      const statusMatch = file.content?.match(/##\s+Status\s*\n\s*(.+)/i);

      return {
        id: file.name.replace(/\.md$/, ''),
        title: titleMatch?.[1] || file.name.replace(/\.md$/, ''),
        status: statusMatch?.[1] || 'Unknown',
        content: file.content || '',
        category: extractAdrCategory(file.content || ''),
      };
    });

    const evaluationPrompt = generateResearchImpactEvaluationPrompt(researchTopics, adrData);

    const instructions = `
# Research Impact Evaluation Instructions

This analysis will evaluate how research findings impact existing ADRs and suggest necessary updates.

## Impact Analysis
- **Research Topics**: ${researchTopics.length} topics
- **Existing ADRs**: ${adrFiles.length} ADRs
- **ADR Directory**: ${adrDirectory}
- **High Relevance Topics**: ${researchTopics.filter(t => t.relevanceScore > 0.7).length} topics

## Next Steps
1. **Submit the evaluation prompt** to an AI agent for impact analysis
2. **Parse the JSON response** to get impact assessments and recommendations
3. **Review suggested updates** and prioritize based on impact level
4. **Use the update suggestion tool** for specific ADR modifications

## Expected AI Response Format
The AI will return a JSON object with:
- \`impactAnalysis\`: Detailed impact assessment for each ADR
- \`updateRecommendations\`: Specific update suggestions with justifications
- \`newAdrSuggestions\`: Recommendations for new ADRs based on research
- \`deprecationSuggestions\`: ADRs that should be deprecated
- \`overallAssessment\`: Summary of findings and action priorities

## Usage Example
\`\`\`typescript
const result = await evaluateResearchImpact(researchTopics, adrDirectory);
// Submit result.evaluationPrompt to AI agent
// Parse AI response for impact analysis and recommendations
\`\`\`
`;

    return {
      evaluationPrompt,
      instructions,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to evaluate research impact: ${error instanceof Error ? error.message : String(error)}`,
      'EVALUATION_ERROR'
    );
  }
}

/**
 * Generate ADR update suggestions
 */
export async function generateAdrUpdateSuggestions(
  adrId: string,
  researchFindings: Array<{
    finding: string;
    evidence: string[];
    impact: string;
  }>,
  updateType: 'content' | 'status' | 'consequences' | 'alternatives' | 'deprecation',
  adrDirectory: string = 'docs/adrs'
): Promise<{ updatePrompt: string; instructions: string }> {
  try {
    const { findFiles } = await import('./file-system.js');
    const { generateAdrUpdateSuggestionPrompt } = await import(
      '../prompts/research-integration-prompts.js'
    );

    // Find the specific ADR
    const adrFiles = await findFiles(process.cwd(), [`${adrDirectory}/**/*.md`], {
      includeContent: true,
    });
    const targetAdr = adrFiles.find(
      file =>
        file.name.includes(adrId) || file.content?.includes(adrId) || file.path.includes(adrId)
    );

    if (!targetAdr) {
      throw new McpAdrError(`ADR not found: ${adrId}`, 'ADR_NOT_FOUND');
    }

    // Extract ADR metadata
    const titleMatch = targetAdr.content?.match(/^#\s+(.+)$/m);
    const statusMatch = targetAdr.content?.match(/##\s+Status\s*\n\s*(.+)/i);

    const adrData = {
      id: adrId,
      title: titleMatch?.[1] || targetAdr.name.replace(/\.md$/, ''),
      content: targetAdr.content || '',
      status: statusMatch?.[1] || 'Unknown',
    };

    const updatePrompt = generateAdrUpdateSuggestionPrompt(adrData, researchFindings, updateType);

    const instructions = `
# ADR Update Suggestion Instructions

This will generate specific update suggestions for an ADR based on research findings.

## Update Details
- **ADR ID**: ${adrId}
- **ADR Title**: ${adrData.title}
- **Current Status**: ${adrData.status}
- **Update Type**: ${updateType}
- **Research Findings**: ${researchFindings.length} findings

## Next Steps
1. **Submit the update prompt** to an AI agent for suggestion generation
2. **Parse the JSON response** to get detailed update recommendations
3. **Review the proposed changes** for accuracy and completeness
4. **Apply the updates** to the ADR file with proper version control
5. **Notify stakeholders** of the changes and rationale

## Expected AI Response Format
The AI will return a JSON object with:
- \`updateSuggestion\`: Overall update metadata and assessment
- \`proposedChanges\`: Specific changes to make to the ADR
- \`newContent\`: Complete updated ADR content
- \`migrationGuidance\`: Implementation and rollback guidance
- \`qualityChecks\`: Quality assessment of the proposed updates
- \`reviewRecommendations\`: Suggested review and approval process

## Usage Example
\`\`\`typescript
const result = await generateAdrUpdateSuggestions(adrId, findings, updateType);
// Submit result.updatePrompt to AI agent
// Parse AI response for update suggestions and implementation guidance
\`\`\`
`;

    return {
      updatePrompt,
      instructions,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate ADR update suggestions: ${error instanceof Error ? error.message : String(error)}`,
      'UPDATE_GENERATION_ERROR'
    );
  }
}

/**
 * Extract category from ADR content
 */
function extractAdrCategory(content: string): string {
  const categoryPatterns = [
    { pattern: /framework|library|dependency/i, category: 'technology' },
    { pattern: /database|storage|persistence/i, category: 'database' },
    { pattern: /api|rest|graphql|endpoint/i, category: 'api' },
    { pattern: /security|authentication|authorization/i, category: 'security' },
    { pattern: /deployment|infrastructure|cloud/i, category: 'deployment' },
    { pattern: /test|testing|quality/i, category: 'testing' },
    { pattern: /architecture|pattern|design/i, category: 'architecture' },
    { pattern: /process|workflow|methodology/i, category: 'process' },
  ];

  for (const { pattern, category } of categoryPatterns) {
    if (pattern.test(content)) {
      return category;
    }
  }

  return 'general';
}

/**
 * Create research file template
 */
export function createResearchTemplate(title: string, category: string = 'general'): string {
  const date = new Date().toISOString().split('T')[0];

  return `# ${title}

**Date**: ${date}
**Category**: ${category}
**Status**: In Progress

## Research Question

[What specific question or problem is this research addressing?]

## Background

[Provide context and background information]

## Methodology

[Describe how the research was conducted]

## Key Findings

### Finding 1
- **Description**: [Detailed description]
- **Evidence**: [Supporting evidence or data]
- **Confidence**: [High/Medium/Low]
- **Source**: [Source of information]

### Finding 2
- **Description**: [Detailed description]
- **Evidence**: [Supporting evidence or data]
- **Confidence**: [High/Medium/Low]
- **Source**: [Source of information]

## Implications

### Architectural Impact
[How do these findings impact architectural decisions?]

### Technology Choices
[What technology choices are affected?]

### Risk Assessment
[What risks are identified or mitigated?]

## Recommendations

1. [Specific recommendation 1]
2. [Specific recommendation 2]
3. [Specific recommendation 3]

## Related ADRs

- [List any ADRs that might be affected by this research]

## Next Steps

- [ ] [Action item 1]
- [ ] [Action item 2]
- [ ] [Action item 3]

## References

- [Reference 1]
- [Reference 2]
- [Reference 3]
`;
}

/**
 * Prompt for action confirmation before generating drafts
 */
export function promptForActionConfirmation(
  action: string,
  details: string,
  impact: 'low' | 'medium' | 'high' | 'critical'
): { confirmationPrompt: string; instructions: string } {
  const confirmationPrompt = `
# Action Confirmation Required

**Action**: ${action}
**Impact Level**: ${impact.toUpperCase()}

## Details
${details}

## Confirmation Required
Before proceeding with this action, please confirm:

1. **Understanding**: Do you understand the proposed action and its implications?
2. **Authorization**: Are you authorized to approve this type of change?
3. **Impact Assessment**: Have you reviewed the potential impact on existing systems?
4. **Timing**: Is this an appropriate time to implement this change?
5. **Resources**: Are the necessary resources available for implementation?

## Risk Assessment
${
  impact === 'critical'
    ? '🔴 **CRITICAL**: This action may have significant system-wide impact'
    : impact === 'high'
      ? '🟠 **HIGH**: This action may affect multiple components or stakeholders'
      : impact === 'medium'
        ? '🟡 **MEDIUM**: This action has moderate impact and should be reviewed'
        : '🟢 **LOW**: This action has minimal impact but still requires confirmation'
}

Please respond with:
- **APPROVED**: To proceed with the action
- **REJECTED**: To cancel the action
- **MODIFIED**: To request modifications to the proposed action
- **DEFERRED**: To postpone the action to a later time

Include any additional comments or requirements for the action.
`;

  const instructions = `
# Action Confirmation Instructions

This confirmation step ensures that significant changes are properly reviewed before implementation.

## Confirmation Process
1. **Review the proposed action** and its details carefully
2. **Assess the impact level** and potential consequences
3. **Consider timing and resources** required for implementation
4. **Provide clear approval or rejection** with reasoning
5. **Specify any modifications** needed if not approving as-is

## Response Options
- **APPROVED**: Action can proceed as proposed
- **REJECTED**: Action should not be implemented
- **MODIFIED**: Action needs changes before approval
- **DEFERRED**: Action should be postponed

## Best Practices
- Always review high and critical impact actions carefully
- Consider stakeholder impact and communication needs
- Ensure proper backup and rollback plans are in place
- Document the approval decision and reasoning
`;

  return {
    confirmationPrompt,
    instructions,
  };
}
