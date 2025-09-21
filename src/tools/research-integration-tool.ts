/**
 * MCP Tool for research integration and findings incorporation
 * Implements prompt-driven research analysis and ADR impact evaluation
 */

import { McpAdrError } from '../types/index.js';

/**
 * Incorporate research findings into architectural decisions
 */
export async function incorporateResearch(args: {
  researchPath?: string;
  adrDirectory?: string;
  analysisType?:
    | 'monitor'
    | 'extract_topics'
    | 'evaluate_impact'
    | 'generate_updates'
    | 'comprehensive';
  existingTopics?: string[];
  researchTopics?: Array<{
    id: string;
    title: string;
    category: string;
    keyFindings: string[];
    relevanceScore: number;
  }>;
  adrId?: string;
  updateType?: 'content' | 'status' | 'consequences' | 'alternatives' | 'deprecation';
  researchFindings?: Array<{
    finding: string;
    evidence: string[];
    impact: string;
  }>;
}): Promise<any> {
  const {
    researchPath = 'docs/research',
    adrDirectory = 'docs/adrs',
    analysisType = 'comprehensive',
    existingTopics,
    researchTopics,
    adrId,
    updateType,
    researchFindings,
  } = args;

  try {
    const {
      monitorResearchDirectory,
      extractResearchTopics,
      evaluateResearchImpact,
      generateAdrUpdateSuggestions,
    } = await import('../utils/research-integration.js');

    switch (analysisType) {
      case 'monitor': {
        const result = await monitorResearchDirectory(researchPath);

        return {
          content: [
            {
              type: 'text',
              text: `# Research Directory Monitoring

${result.instructions}

## Monitoring Status
${result.monitoringPrompt}

## Next Steps
1. **Extract research topics** using \`incorporate_research\` with \`analysisType: "extract_topics"\`
2. **Evaluate ADR impact** using \`analysisType: "evaluate_impact"\`
3. **Generate specific updates** using \`analysisType: "generate_updates"\`

## Automation Recommendations
- Set up file system watchers for real-time monitoring
- Schedule periodic research integration reviews
- Establish research file templates and conventions
- Create notification systems for new research findings
`,
            },
          ],
        };
      }

      case 'extract_topics': {
        const result = await extractResearchTopics(researchPath, existingTopics);

        return {
          content: [
            {
              type: 'text',
              text: `# Research Topic Extraction

${result.instructions}

## AI Analysis Prompt

${result.extractionPrompt}

## Next Steps

1. **Submit the prompt** to an AI agent for comprehensive topic extraction
2. **Review the extracted topics** for architectural relevance and quality
3. **Use the topics** with \`analysisType: "evaluate_impact"\` to assess ADR implications
4. **Store the topics** for future reference and tracking

## Expected Output

The AI will provide:
- **Extracted Topics**: Detailed research topics with findings and evidence
- **Research Summary**: Quality assessment and completeness evaluation
- **Key Insights**: Major findings that require immediate attention
- **Recommendations**: Specific actions for incorporating research
- **Gaps**: Areas needing additional research

## Integration Workflow

After topic extraction, proceed with impact evaluation:
\`\`\`json
{
  "tool": "incorporate_research",
  "args": {
    "analysisType": "evaluate_impact",
    "researchTopics": [extracted topics from AI response]
  }
}
\`\`\`
`,
            },
          ],
        };
      }

      case 'evaluate_impact': {
        if (!researchTopics || researchTopics.length === 0) {
          throw new McpAdrError(
            'Research topics are required for impact evaluation. Use extract_topics first.',
            'INVALID_INPUT'
          );
        }

        // Convert to full ResearchTopic format
        const fullResearchTopics = researchTopics.map(topic => ({
          ...topic,
          description: `Research topic: ${topic.title}`,
          sourceFiles: [],
          evidence: topic.keyFindings,
          confidence: topic.relevanceScore,
          lastUpdated: new Date().toISOString().split('T')[0] || '',
          tags: [topic.category],
        }));

        const result = await evaluateResearchImpact(fullResearchTopics, adrDirectory);

        return {
          content: [
            {
              type: 'text',
              text: `# Research Impact Evaluation

${result.instructions}

## AI Evaluation Prompt

${result.evaluationPrompt}

## Next Steps

1. **Submit the prompt** to an AI agent for comprehensive impact analysis
2. **Review the impact assessments** and prioritize based on urgency and impact level
3. **Generate specific updates** for high-impact ADRs using \`analysisType: "generate_updates"\`
4. **Plan implementation** of recommended changes

## Expected Output

The AI will provide:
- **Impact Analysis**: Detailed assessment of how research affects each ADR
- **Update Recommendations**: Specific suggestions for ADR modifications
- **New ADR Suggestions**: Recommendations for new ADRs based on research
- **Deprecation Suggestions**: ADRs that should be deprecated or superseded
- **Overall Assessment**: Summary and action priorities

## Implementation Workflow

For high-priority updates, use the update generation tool:
\`\`\`json
{
  "tool": "incorporate_research",
  "args": {
    "analysisType": "generate_updates",
    "adrId": "target-adr-id",
    "updateType": "content",
    "researchFindings": [relevant findings from analysis]
  }
}
\`\`\`
`,
            },
          ],
        };
      }

      case 'generate_updates': {
        if (!adrId || !updateType || !researchFindings) {
          throw new McpAdrError(
            'ADR ID, update type, and research findings are required for update generation',
            'INVALID_INPUT'
          );
        }

        const result = await generateAdrUpdateSuggestions(
          adrId,
          researchFindings,
          updateType,
          adrDirectory
        );

        return {
          content: [
            {
              type: 'text',
              text: `# ADR Update Generation

${result.instructions}

## AI Update Prompt

${result.updatePrompt}

## Next Steps

1. **Submit the prompt** to an AI agent for detailed update suggestions
2. **Review the proposed changes** for accuracy and completeness
3. **Request confirmation** using the action confirmation process
4. **Apply the updates** to the ADR file with proper version control
5. **Notify stakeholders** of the changes and implementation plan

## Expected Output

The AI will provide:
- **Update Suggestion**: Overall assessment and metadata
- **Proposed Changes**: Specific modifications to make
- **New Content**: Complete updated ADR content
- **Migration Guidance**: Implementation and rollback plans
- **Quality Checks**: Assessment of update quality
- **Review Recommendations**: Suggested approval process

## Implementation Checklist

Before applying updates:
- [ ] Review all proposed changes carefully
- [ ] Verify research evidence supports changes
- [ ] Check impact on dependent systems
- [ ] Ensure proper backup and version control
- [ ] Plan stakeholder communication
- [ ] Schedule implementation timeline
`,
            },
          ],
        };
      }

      case 'comprehensive': {
        const monitorResult = await monitorResearchDirectory(researchPath);
        const extractResult = await extractResearchTopics(researchPath, existingTopics);

        return {
          content: [
            {
              type: 'text',
              text: `# Comprehensive Research Integration

This comprehensive analysis will integrate research findings into your architectural decision-making process.

## Research Directory Status

${monitorResult.instructions}

## Topic Extraction Analysis

${extractResult.instructions}

## AI Analysis Prompt

${extractResult.extractionPrompt}

## Comprehensive Workflow

### 1. **Topic Extraction** (Current Step)
Submit the prompt above to extract research topics and insights

### 2. **Impact Evaluation**
Use the extracted topics to evaluate impact on existing ADRs:
\`\`\`json
{
  "tool": "incorporate_research",
  "args": {
    "analysisType": "evaluate_impact",
    "researchTopics": [topics from step 1]
  }
}
\`\`\`

### 3. **Update Generation**
Generate specific updates for affected ADRs:
\`\`\`json
{
  "tool": "incorporate_research",
  "args": {
    "analysisType": "generate_updates",
    "adrId": "target-adr-id",
    "updateType": "content",
    "researchFindings": [findings from step 2]
  }
}
\`\`\`

### 4. **Implementation**
- Review and approve proposed changes
- Apply updates with proper version control
- Communicate changes to stakeholders
- Monitor implementation results

## Expected Outcomes

This comprehensive integration will help you:
- **Identify research insights** that impact architectural decisions
- **Prioritize ADR updates** based on research findings
- **Generate high-quality updates** with proper justification
- **Maintain architectural consistency** with latest research
- **Improve decision quality** through evidence-based updates

## Quality Assurance

All research integration follows these principles:
- **Evidence-based**: All suggestions backed by solid research
- **Impact-assessed**: Changes prioritized by architectural impact
- **Stakeholder-aware**: Considers impact on all relevant parties
- **Version-controlled**: Maintains proper change tracking
- **Reversible**: Includes rollback plans for all changes
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
      `Failed to incorporate research: ${error instanceof Error ? error.message : String(error)}`,
      'RESEARCH_INTEGRATION_ERROR'
    );
  }
}

/**
 * Create research template file
 */
export async function createResearchTemplate(args: {
  title?: string;
  projectPath?: string;
  researchType?: string;
  category?: string;
  researchPath?: string;
  includeProjectAnalysis?: boolean;
}): Promise<any> {
  const {
    title = args.researchType || 'Research Template',
    projectPath: _projectPath = '/project',
    researchType = 'general',
    category = researchType || 'general',
    researchPath = 'docs/research',
    includeProjectAnalysis: _includeProjectAnalysis = false,
  } = args;

  try {
    // Validate title parameter
    if (!title || typeof title !== 'string') {
      throw new Error('Title is required and must be a string');
    }

    const { createResearchTemplate } = await import('../utils/research-integration.js');

    const template = createResearchTemplate(title, category);
    const filename = `${title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')}.md`;
    const fullPath = `${researchPath}/${filename}`;

    return {
      content: [
        {
          type: 'text',
          text: `# Research Template Created

## Template Details
- **Title**: ${title}
- **Category**: ${category}
- **Filename**: ${filename}
- **Full Path**: ${fullPath}

## Template Content

\`\`\`markdown
${template}
\`\`\`

## Next Steps

1. **Save the template** to the specified path: \`${fullPath}\`
2. **Fill in the research details** following the template structure
3. **Conduct your research** and document findings
4. **Use the research integration tool** to analyze impact on ADRs

## Template Sections

- **Research Question**: Define what you're investigating
- **Background**: Provide context and motivation
- **Methodology**: Describe your research approach
- **Key Findings**: Document specific discoveries with evidence
- **Implications**: Analyze architectural and technology impact
- **Recommendations**: Provide actionable suggestions
- **Related ADRs**: Link to potentially affected decisions
- **Next Steps**: Plan follow-up actions

## Research Best Practices

- Use clear, specific research questions
- Document evidence and sources thoroughly
- Assess confidence levels for findings
- Consider architectural implications early
- Link findings to existing ADRs when relevant
- Plan for regular research reviews and updates
`,
        },
      ],
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to create research template: ${error instanceof Error ? error.message : String(error)}`,
      'TEMPLATE_CREATION_ERROR'
    );
  }
}

/**
 * Request action confirmation for research-based changes
 */
export async function requestActionConfirmation(args: {
  action: string;
  details: string;
  impact?: 'low' | 'medium' | 'high' | 'critical';
}): Promise<any> {
  const { action, details, impact = 'medium' } = args;

  try {
    const { promptForActionConfirmation } = await import('../utils/research-integration.js');

    const result = promptForActionConfirmation(action, details, impact);

    return {
      content: [
        {
          type: 'text',
          text: `# Action Confirmation Request

${result.instructions}

## Confirmation Prompt

${result.confirmationPrompt}

## Response Required

Please provide your decision on this action:

### Response Format
\`\`\`
DECISION: [APPROVED|REJECTED|MODIFIED|DEFERRED]

REASONING: [Your reasoning for the decision]

MODIFICATIONS: [If MODIFIED, specify required changes]

TIMELINE: [If DEFERRED, specify when to reconsider]

ADDITIONAL_REQUIREMENTS: [Any additional requirements or conditions]
\`\`\`

### Decision Guidelines

- **APPROVED**: Action can proceed as proposed
- **REJECTED**: Action should not be implemented (provide reasoning)
- **MODIFIED**: Action needs changes before approval (specify modifications)
- **DEFERRED**: Action should be postponed (specify timeline)

## Impact Assessment

**Impact Level**: ${impact.toUpperCase()}

${
  impact === 'critical'
    ? '⚠️ **CRITICAL IMPACT**: This action requires careful review and may affect multiple systems or stakeholders.'
    : impact === 'high'
      ? '🔶 **HIGH IMPACT**: This action should be reviewed by senior stakeholders and may require coordination.'
      : impact === 'medium'
        ? '🔷 **MEDIUM IMPACT**: This action requires standard review and approval processes.'
        : '🔹 **LOW IMPACT**: This action has minimal risk but still requires confirmation.'
}

## Next Steps

After receiving confirmation:
1. **Document the decision** and reasoning
2. **Proceed with approved actions** following implementation guidelines
3. **Apply any required modifications** before implementation
4. **Schedule deferred actions** for future consideration
5. **Communicate decisions** to relevant stakeholders
`,
        },
      ],
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to request action confirmation: ${error instanceof Error ? error.message : String(error)}`,
      'CONFIRMATION_ERROR'
    );
  }
}
