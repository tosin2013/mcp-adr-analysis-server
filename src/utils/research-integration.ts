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
): Promise<{ monitoringPrompt: string; instructions: string; actualData?: any }> {
  try {
    // Use actual file operations to scan research directory
    const fs = await import('fs/promises');
    const path = await import('path');
    const projectPath = process.cwd();
    const fullResearchPath = path.resolve(projectPath, researchPath);

    const researchFiles: ResearchFile[] = [];

    try {
      // Check if research directory exists
      await fs.access(fullResearchPath);

      // Scan for research files
      const scanDirectory = async (dirPath: string): Promise<void> => {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            const supportedExts = ['.md', '.txt', '.pdf', '.doc', '.docx'];

            if (supportedExts.includes(ext)) {
              try {
                const stats = await fs.stat(fullPath);
                let content = '';

                // Only read text-based files
                if (['.md', '.txt'].includes(ext)) {
                  content = await fs.readFile(fullPath, 'utf-8');
                } else {
                  content = `[${ext.toUpperCase()} file - content not readable]`;
                }

                researchFiles.push({
                  filename: entry.name,
                  content,
                  lastModified: stats.mtime.toISOString(),
                  size: stats.size,
                  path: path.relative(projectPath, fullPath),
                });
              } catch {
                // Skip files that can't be read
              }
            }
          }
        }
      };

      await scanDirectory(fullResearchPath);
    } catch {
      // Research directory doesn't exist or is not accessible
    }

    const monitoringPrompt = `
# Research Directory Monitoring

Based on actual file system analysis, here are the research files found:

## Research Directory Status
- **Research Path**: ${researchPath}
- **Full Path**: ${fullResearchPath}
- **Files Found**: ${researchFiles.length} research files
- **Directory Exists**: ${researchFiles.length > 0 ? 'Yes' : 'No (may need to be created)'}

## Discovered Research Files

${
  researchFiles.length > 0
    ? researchFiles
        .map(
          (file, index) => `
### ${index + 1}. ${file.filename}
- **Path**: ${file.path}
- **Size**: ${file.size} bytes
- **Last Modified**: ${file.lastModified}

#### Content:
\`\`\`
${file.content.slice(0, 1000)}${file.content.length > 1000 ? '\n... (truncated)' : ''}
\`\`\`

---
`
        )
        .join('\n')
    : '**No research files found.** You may need to:\n- Create the research directory: `mkdir -p docs/research`\n- Add research files in supported formats (.md, .txt, .pdf, .doc, .docx)\n- Use the research template tool to create structured research documents'
}

## Analysis Requirements

For each research file discovered:
1. Extract key architectural insights and findings from **actual file content**
2. Identify potential impacts on existing ADRs
3. Assess relevance to current project decisions
4. Categorize research by topic and priority
5. Generate recommendations for ADR updates
6. Monitor for new research files and changes

## Required Output Format

Please provide research monitoring analysis in JSON format with:
- File inventory with metadata
- Key insights and findings extraction
- Impact assessment on existing ADRs
- Recommendations for integration
`;

    const instructions = `
# Research Directory Monitoring Instructions

This analysis provides **actual research file contents** for comprehensive architectural insights and findings.

## Monitoring Scope
- **Research Path**: ${researchPath}
- **Files Found**: ${researchFiles.length} research files
- **Readable Files**: ${researchFiles.filter(f => f.content && !f.content.includes('content not readable')).length} files
- **File Types**: Markdown, Text, PDF, Word documents
- **Analysis Focus**: Architectural insights, ADR impacts, integration opportunities

## Discovered Files Summary
${researchFiles.map(f => `- **${f.filename}** (${f.size} bytes, modified: ${f.lastModified.split('T')[0]})`).join('\n')}

## Next Steps
1. **Submit the monitoring prompt** to an AI agent for analysis of **actual file content**
2. **Extract research topics** using the topic extraction tool
3. **Analyze impact on existing ADRs** using the impact evaluation tool
4. **Generate update suggestions** for affected ADRs
5. **Monitor for new research** files and changes

## Monitoring Recommendations
- Set up file system watchers for automatic detection
- Establish research file naming conventions
- Create research templates for consistent structure
- Schedule regular research integration reviews

## Getting Started
${
  researchFiles.length === 0
    ? `To begin using research integration:
1. Create the research directory: \`mkdir -p ${researchPath}\`
2. Add research files (markdown, text, or documents)
3. Use the \`incorporate_research\` tool to analyze findings
4. Review suggested ADR updates and implementations`
    : `Research files are already available for analysis. Proceed with topic extraction and impact evaluation.`
}

## Expected AI Response Format
The AI will return a JSON object with:
- \`researchInventory\`: File inventory with metadata and analysis
- \`keyInsights\`: Major architectural insights from actual content
- \`impactAssessment\`: Potential impacts on existing ADRs
- \`integrationRecommendations\`: Specific recommendations for incorporating findings

## Usage Example
\`\`\`typescript
const result = await monitorResearchDirectory(researchPath);
// Submit result.monitoringPrompt to AI agent
// Parse AI response for research insights and recommendations
\`\`\`
`;

    return {
      monitoringPrompt,
      instructions,
      actualData: {
        researchFiles,
        summary: {
          totalFiles: researchFiles.length,
          readableFiles: researchFiles.filter(
            f => f.content && !f.content.includes('content not readable')
          ).length,
          directoryExists: researchFiles.length > 0,
          lastModified:
            researchFiles.length > 0
              ? Math.max(...researchFiles.map(f => new Date(f.lastModified).getTime()))
              : null,
        },
      },
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
): Promise<{ extractionPrompt: string; instructions: string; actualData?: any }> {
  try {
    // Reuse the actual file monitoring to get research files
    const monitoringResult = await monitorResearchDirectory(researchPath);
    const researchFiles = monitoringResult.actualData?.researchFiles || [];

    // Filter to only text-based files for topic extraction
    const textFiles = researchFiles.filter(
      (f: ResearchFile) => f.content && !f.content.includes('content not readable')
    );

    const extractionPrompt = `
# Research Topic Extraction

Based on actual research file analysis, here are the files with extractable content:

## Research Files for Topic Extraction

${
  textFiles.length > 0
    ? textFiles
        .map(
          (file: ResearchFile, index: number) => `
### ${index + 1}. ${file.filename}
- **Path**: ${file.path}
- **Size**: ${file.size} bytes
- **Last Modified**: ${file.lastModified.split('T')[0]}

#### Full Content:
\`\`\`markdown
${file.content}
\`\`\`

---
`
        )
        .join('\n')
    : '**No text-based research files found for topic extraction.**\n\nTo extract topics, you need:\n- Research files in .md or .txt format\n- Files with readable content\n- Research content that contains architectural insights'
}

## Existing Topics Context

${
  existingTopics
    ? `
### Current Topics (${existingTopics.length})
${existingTopics.map((topic, index) => `${index + 1}. ${topic}`).join('\n')}
`
    : 'No existing topics provided.'
}

## Topic Extraction Requirements

For each research file with **actual content** shown above:
1. Extract key architectural insights and findings from the **actual file content**
2. Identify potential impacts on existing decisions
3. Categorize topics by relevance and priority
4. Generate actionable recommendations
5. Assess integration opportunities with current ADRs
`;

    const instructions = `
# Research Topic Extraction Instructions

This analysis provides **actual research file contents** to extract key topics and findings that could impact architectural decisions.

## Research Analysis
- **Research Path**: ${researchPath}
- **Total Research Files**: ${researchFiles.length} files
- **Text-Based Files**: ${textFiles.length} files with extractable content
- **Existing Topics**: ${existingTopics?.length || 0} topics
- **Analysis Focus**: Topic extraction from actual content, impact assessment, integration opportunities

## Discovered Text Files
${textFiles.map((f: ResearchFile) => `- **${f.filename}** (${f.size} bytes)`).join('\n')}

## Next Steps
1. **Submit the extraction prompt** to an AI agent for topic analysis based on **actual file content**
2. **Parse the JSON response** to get extracted topics and insights
3. **Review the research findings** for architectural relevance
4. **Use the impact evaluation tool** to assess ADR implications

## Expected AI Response Format
The AI will return a JSON object with:
- \`extractedTopics\`: Array of research topics with findings and evidence based on actual content
- \`researchSummary\`: Overall assessment of research quality and completeness
- \`keyInsights\`: Major insights that require action derived from actual files
- \`recommendations\`: Specific recommendations for incorporating findings
- \`gaps\`: Areas where additional research is needed

## Usage Example
\`\`\`typescript
const result = await extractResearchTopics(researchPath, existingTopics);
// Submit result.extractionPrompt to AI agent
// Parse AI response for research topics and insights based on actual content
\`\`\`
`;

    return {
      extractionPrompt,
      instructions,
      actualData: {
        researchFiles,
        textFiles,
        summary: {
          totalFiles: researchFiles.length,
          textFiles: textFiles.length,
          existingTopics: existingTopics?.length || 0,
        },
      },
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
): Promise<{ evaluationPrompt: string; instructions: string; actualData?: any }> {
  try {
    // Use actual ADR discovery instead of prompts
    const { discoverAdrsInDirectory } = await import('./adr-discovery.js');

    // Actually read ADR files
    const discoveryResult = await discoverAdrsInDirectory(adrDirectory, process.cwd(), {
      includeContent: true,
      includeTimeline: false,
    });

    const evaluationPrompt = `
# Research Impact Evaluation

Based on actual ADR file analysis and research topics, analyze how research findings impact existing ADRs:

## Discovered ADRs (${discoveryResult.totalAdrs} total)

${
  discoveryResult.adrs.length > 0
    ? discoveryResult.adrs
        .map(
          (adr, index) => `
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
`
        )
        .join('\n')
    : 'No ADRs found in the specified directory.'
}

## Research Topics Analysis

Please evaluate the following research topics for their impact on the **actual ADR content** above:

${researchTopics
  .map(
    (topic, index) => `
### ${index + 1}. ${topic.title}
- **Category**: ${topic.category}
- **Relevance Score**: ${topic.relevanceScore}
- **Confidence**: ${topic.confidence}
- **Key Findings**: ${topic.keyFindings.join(', ')}
- **Evidence**: ${topic.evidence.join(', ')}
- **Source Files**: ${topic.sourceFiles.join(', ')}
- **Description**: ${topic.description}
- **Tags**: ${topic.tags.join(', ')}
`
  )
  .join('')}

## Impact Assessment Requirements

For each research topic and each ADR with **actual content**:
1. Identify affected ADRs based on actual content analysis
2. Assess the severity of impact (low, medium, high, critical)
3. Determine required updates or new decisions
4. Prioritize changes based on business impact and evidence strength
5. Generate specific update recommendations with references to actual ADR sections
`;

    const instructions = `
# Research Impact Evaluation Instructions

This analysis provides **actual ADR content and research topics** to evaluate how research findings impact existing ADRs.

## Impact Analysis
- **Research Topics**: ${researchTopics.length} topics
- **ADR Directory**: ${adrDirectory}
- **ADRs Found**: ${discoveryResult.totalAdrs} files
- **ADRs with Content**: ${discoveryResult.adrs.filter(adr => adr.content).length} ADRs
- **High Relevance Topics**: ${researchTopics.filter(t => t.relevanceScore > 0.7).length} topics

## Discovered ADR Summary
${discoveryResult.adrs.map(adr => `- **${adr.title}** (${adr.status})`).join('\n')}

## Research Topic Summary
${researchTopics.map(topic => `- **${topic.title}** (Relevance: ${topic.relevanceScore}, Confidence: ${topic.confidence})`).join('\n')}

## Next Steps
1. **Submit the evaluation prompt** to an AI agent for impact analysis based on **actual ADR content**
2. **Parse the JSON response** to get impact assessments and recommendations
3. **Review suggested updates** and prioritize based on impact level
4. **Use the update suggestion tool** for specific ADR modifications

## Expected AI Response Format
The AI will return a JSON object with:
- \`impactAnalysis\`: Detailed impact assessment for each ADR based on actual content
- \`updateRecommendations\`: Specific update suggestions with justifications and content references
- \`newAdrSuggestions\`: Recommendations for new ADRs based on research findings
- \`deprecationSuggestions\`: ADRs that should be deprecated based on research evidence
- \`overallAssessment\`: Summary of findings and action priorities

## Usage Example
\`\`\`typescript
const result = await evaluateResearchImpact(researchTopics, adrDirectory);
// Submit result.evaluationPrompt to AI agent
// Parse AI response for impact analysis based on actual ADR content
\`\`\`
`;

    return {
      evaluationPrompt,
      instructions,
      actualData: {
        discoveryResult,
        researchTopics,
        summary: {
          totalAdrs: discoveryResult.totalAdrs,
          adrsWithContent: discoveryResult.adrs.filter(adr => adr.content).length,
          totalTopics: researchTopics.length,
          highRelevanceTopics: researchTopics.filter(t => t.relevanceScore > 0.7).length,
        },
      },
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
): Promise<{ updatePrompt: string; instructions: string; actualData?: any }> {
  try {
    // Use actual ADR discovery instead of prompts
    const { discoverAdrsInDirectory } = await import('./adr-discovery.js');

    // Actually read ADR files
    const discoveryResult = await discoverAdrsInDirectory(adrDirectory, process.cwd(), {
      includeContent: true,
      includeTimeline: false,
    });

    // Try to find the target ADR by ID
    const targetAdr = discoveryResult.adrs.find(
      adr =>
        adr.filename.includes(adrId) ||
        adr.content?.includes(adrId) ||
        adr.path.includes(adrId) ||
        adr.metadata?.number?.toString() === adrId
    );

    const updatePrompt = `
# ADR Update Suggestion

Based on actual ADR file analysis, generate updates for the specified ADR based on research findings.

## All Discovered ADRs (${discoveryResult.totalAdrs} total)

${
  discoveryResult.adrs.length > 0
    ? discoveryResult.adrs
        .map(
          (adr, index) => `
### ${index + 1}. ${adr.title}
- **File**: ${adr.filename}
- **Status**: ${adr.status}
- **Path**: ${adr.path}
${adr.metadata?.number ? `- **Number**: ${adr.metadata.number}` : ''}
${adr === targetAdr ? '**⭐ TARGET ADR ⭐**' : ''}

#### ADR Content:
\`\`\`markdown
${adr.content || 'Content not available'}
\`\`\`

---
`
        )
        .join('\n')
    : 'No ADRs found in the specified directory.'
}

## Target ADR Identification

**Target ADR ID**: ${adrId}
${
  targetAdr
    ? `
**✅ FOUND TARGET ADR**: ${targetAdr.title}
- **File**: ${targetAdr.filename}
- **Status**: ${targetAdr.status}
- **Path**: ${targetAdr.path}
`
    : `
**❌ TARGET ADR NOT FOUND**
Please locate the ADR with ID: **${adrId}** by:
- Searching by filename containing the ID
- Searching by content containing the ID
- Searching by path containing the ID
- Searching by ADR number matching the ID
`
}

## Research Findings to Incorporate

${researchFindings
  .map(
    (finding, index) => `
### ${index + 1}. ${finding.finding}
- **Evidence**: ${finding.evidence.join(', ')}
- **Impact**: ${finding.impact}
`
  )
  .join('')}

## Update Requirements

- **Update Type**: ${updateType}
- **Focus Areas**: ${
      updateType === 'content'
        ? 'Decision content and rationale'
        : updateType === 'status'
          ? 'Decision status and lifecycle'
          : updateType === 'consequences'
            ? 'Consequences and outcomes'
            : updateType === 'alternatives'
              ? 'Alternative options and trade-offs'
              : 'Deprecation and superseding decisions'
    }

## Required Output Format

Please provide the updated ADR content with:
1. Clear indication of what was changed
2. Integration of research findings into the **actual ADR content** shown above
3. Updated metadata and timestamps
4. Preservation of ADR structure and format
`;

    const instructions = `
# ADR Update Suggestion Instructions

This analysis provides **actual ADR content** to generate specific update suggestions based on research findings.

## Update Details
- **ADR ID**: ${adrId}
- **Target ADR**: ${targetAdr ? `✅ Found - ${targetAdr.title}` : '❌ Not found - will need identification'}
- **ADRs Available**: ${discoveryResult.totalAdrs} total ADRs
- **Update Focus**: ${updateType}
- **Research Findings**: ${researchFindings.length} findings

## Target ADR Status
${
  targetAdr
    ? `
**Target Found**: ${targetAdr.title}
- **File**: ${targetAdr.filename}
- **Status**: ${targetAdr.status}
- **Path**: ${targetAdr.path}
- **Content Length**: ${targetAdr.content?.length || 0} characters
`
    : `
**Target Not Found**: ADR with ID "${adrId}" could not be automatically identified.
The AI agent will need to search through the ${discoveryResult.totalAdrs} available ADRs using the provided content.
`
}

## Next Steps
1. **Submit the update prompt** to an AI agent for suggestion generation based on **actual ADR content**
2. **Parse the JSON response** to get detailed update recommendations
3. **Review the proposed changes** for accuracy and completeness
4. **Apply the updates** to the ADR file with proper version control
5. **Notify stakeholders** of the changes and rationale

## Expected AI Response Format
The AI will return a JSON object with:
- \`updateSuggestion\`: Overall update metadata and assessment
- \`proposedChanges\`: Specific changes to make to the actual ADR content
- \`newContent\`: Complete updated ADR content based on actual current content
- \`migrationGuidance\`: Implementation and rollback guidance
- \`qualityChecks\`: Quality assessment of the proposed updates
- \`reviewRecommendations\`: Suggested review and approval process

## Usage Example
\`\`\`typescript
const result = await generateAdrUpdateSuggestions(adrId, findings, updateType);
// Submit result.updatePrompt to AI agent
// Parse AI response for update suggestions based on actual ADR content
\`\`\`
`;

    return {
      updatePrompt,
      instructions,
      actualData: {
        discoveryResult,
        targetAdr,
        researchFindings,
        summary: {
          totalAdrs: discoveryResult.totalAdrs,
          targetFound: !!targetAdr,
          updateType,
          findingsCount: researchFindings.length,
        },
      },
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate ADR update suggestions: ${error instanceof Error ? error.message : String(error)}`,
      'UPDATE_GENERATION_ERROR'
    );
  }
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
