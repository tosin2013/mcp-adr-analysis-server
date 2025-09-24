/**
 * ADR suggestion utilities using prompt-driven AI analysis
 * Implements intelligent ADR recommendations based on code analysis
 */

import { McpAdrError } from '../types/index.js';
import { ConversationContext, formatContextForPrompt } from '../types/conversation-context.js';

/**
 * Represents an implicit architectural decision detected in code
 */
export interface ImplicitDecision {
  /** Unique identifier for the decision */
  id: string;
  /** Human-readable title for the decision */
  title: string;
  /** Category of the architectural decision */
  category: string;
  /** Confidence score (0-1) in the detection */
  confidence: number;
  /** Evidence supporting the decision detection */
  evidence: string[];
  /** File paths where evidence was found */
  filePaths: string[];
  /** Detailed description of the decision */
  description: string;
  /** Context in which the decision was made */
  context: string;
  /** Potential consequences of the decision */
  consequences: string;
  /** Alternative approaches that were considered */
  alternatives: string[];
  /** Priority level for documenting this decision */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** Complexity level of the decision */
  complexity: 'low' | 'medium' | 'high';
  /** Risk level associated with the decision */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Suggested title for the ADR */
  suggestedAdrTitle: string;
  /** Related architectural patterns */
  relatedPatterns: string[];
}

/**
 * Represents a cluster of related architectural decisions
 */
export interface DecisionCluster {
  /** Common theme connecting the decisions */
  theme: string;
  /** Decision IDs that belong to this cluster */
  decisions: string[];
  /** Suggested title for a combined ADR */
  suggestedCombinedAdr: string;
}

/**
 * Result of implicit decision analysis
 */
export interface ImplicitDecisionAnalysis {
  /** List of detected implicit decisions */
  implicitDecisions: ImplicitDecision[];
  /** Clusters of related decisions */
  decisionClusters: DecisionCluster[];
  /** Recommendations for ADR creation */
  recommendations: string[];
  /** Identified gaps in architectural documentation */
  gaps: Array<{
    /** Area where gap was identified */
    area: string;
    /** Description of the gap */
    description: string;
    /** Suggested investigation approach */
    suggestedInvestigation: string;
  }>;
}

/**
 * Represents an architectural decision derived from code changes
 */
export interface CodeChangeDecision {
  /** Unique identifier for the decision */
  id: string;
  /** Human-readable title for the decision */
  title: string;
  /** Category of the architectural decision */
  category: string;
  /** Confidence score (0-1) in the decision detection */
  confidence: number;
  /** Evidence supporting the decision from code changes */
  evidence: string[];
  /** Context in which the decision was made */
  context: string;
  /** The actual decision that was made */
  decision: string;
  /** Consequences of the decision */
  consequences: string;
  /** Alternative approaches that were considered */
  alternatives: string[];
  /** Motivation behind the code change */
  changeMotivation: string;
  /** Future implications of the decision */
  futureImplications: string;
  /** Suggested title for the ADR */
  suggestedAdrTitle: string;
  /** Priority level for documenting this decision */
  priority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Represents a generated ADR document
 */
export interface GeneratedAdr {
  /** Unique identifier for the ADR */
  id: string;
  /** Title of the ADR */
  title: string;
  /** Status of the ADR (proposed, accepted, deprecated, etc.) */
  status: string;
  /** Date when the ADR was created */
  date: string;
  /** Format of the ADR (nygard, madr, custom) */
  format: string;
  /** Full content of the ADR */
  content: string;
  /** Suggested filename for the ADR */
  filename: string;
  /** Additional metadata about the ADR */
  metadata: {
    /** Category of the architectural decision */
    category: string;
    /** Tags for categorization */
    tags: string[];
    /** Complexity level of the decision */
    complexity: string;
    /** Impact level of the decision */
    impact: string;
    /** Stakeholders affected by the decision */
    stakeholders: string[];
  };
}

/**
 * Generate prompt for AI to analyze project for implicit architectural decisions
 *
 * @param projectPath - Path to the project to analyze
 * @param existingAdrs - Array of existing ADR summaries to avoid duplication
 * @param conversationContext - Conversation context for continuity
 * @returns Promise resolving to analysis prompt and instructions
 * @throws McpAdrError if prompt generation fails
 */
export async function analyzeImplicitDecisions(
  projectPath: string,
  existingAdrs?: string[],
  conversationContext?: ConversationContext
): Promise<{ analysisPrompt: string; instructions: string }> {
  try {
    const { generateImplicitDecisionDetectionPrompt } = await import(
      '../prompts/adr-suggestion-prompts.js'
    );

    let analysisPrompt = generateImplicitDecisionDetectionPrompt(projectPath, existingAdrs);

    // Enhance prompt with conversation context if available
    if (conversationContext) {
      const contextSection = formatContextForPrompt(conversationContext);
      analysisPrompt = contextSection + analysisPrompt;
    }

    const instructions = `
# Implicit Decision Analysis Instructions

This analysis will identify architectural decisions that are implicit in the codebase but not formally documented.

## Analysis Scope
- **Project Path**: ${projectPath}
- **Existing ADRs**: ${existingAdrs?.length || 0} ADRs provided

## Next Steps
1. **Submit the analysis prompt** to an AI agent for decision detection
2. **Parse the JSON response** as ImplicitDecisionAnalysis
3. **Review suggested decisions** and prioritize for documentation
4. **Generate ADRs** for high-priority decisions using the ADR generation tool

## Expected AI Response Format
The AI will return a JSON object with:
- \`implicitDecisions\`: Array of detected implicit decisions
- \`decisionClusters\`: Related decisions that could be combined
- \`recommendations\`: Specific recommendations for documentation
- \`gaps\`: Areas where more investigation is needed

## Usage Example
\`\`\`typescript
const result = await analyzeImplicitDecisions(projectPath, existingAdrs);
// Submit result.analysisPrompt to AI agent
// Parse AI response as ImplicitDecisionAnalysis
\`\`\`
`;

    return {
      analysisPrompt,
      instructions,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate analysis prompt: ${error instanceof Error ? error.message : String(error)}`,
      'ANALYSIS_ERROR'
    );
  }
}

/**
 * Analyze code changes for architectural decisions
 */
export async function analyzeCodeChanges(
  beforeCode: string,
  afterCode: string,
  changeDescription: string,
  commitMessages?: string[]
): Promise<{ analysisPrompt: string; instructions: string }> {
  try {
    const { generateCodeChangeAnalysisPrompt } = await import(
      '../prompts/adr-suggestion-prompts.js'
    );

    const analysisPrompt = generateCodeChangeAnalysisPrompt(
      beforeCode,
      afterCode,
      changeDescription,
      commitMessages
    );

    const instructions = `
# Code Change Analysis Instructions

This analysis will identify architectural decisions reflected in code changes.

## Change Analysis
- **Change Description**: ${changeDescription}
- **Before Code Length**: ${beforeCode.length} characters
- **After Code Length**: ${afterCode.length} characters
- **Commit Messages**: ${commitMessages?.length || 0} messages

## Next Steps
1. **Submit the analysis prompt** to an AI agent for decision detection
2. **Parse the JSON response** to get identified decisions
3. **Review change motivations** and architectural implications
4. **Document significant decisions** as ADRs

## Expected AI Response Format
The AI will return a JSON object with:
- \`changeAnalysis\`: Overall analysis of the change
- \`identifiedDecisions\`: Specific decisions reflected in changes
- \`recommendations\`: Documentation recommendations
- \`followUpQuestions\`: Questions for the development team

## Usage Example
\`\`\`typescript
const result = await analyzeCodeChanges(before, after, description, commits);
// Submit result.analysisPrompt to AI agent
// Parse AI response for architectural decisions
\`\`\`
`;

    return {
      analysisPrompt,
      instructions,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to analyze code changes: ${error instanceof Error ? error.message : String(error)}`,
      'ANALYSIS_ERROR'
    );
  }
}

/**
 * Generate ADR from decision data
 */
export async function generateAdrFromDecision(
  decisionData: {
    title: string;
    context: string;
    decision: string;
    consequences: string;
    alternatives?: string[];
    evidence?: string[];
  },
  templateFormat: 'nygard' | 'madr' | 'custom' = 'nygard',
  existingAdrs?: string[]
): Promise<{ generationPrompt: string; instructions: string }> {
  try {
    const { generateAdrTemplatePrompt } = await import('../prompts/adr-suggestion-prompts.js');

    const generationPrompt = generateAdrTemplatePrompt(decisionData, templateFormat, existingAdrs);

    const instructions = `
# ADR Generation Instructions

This will generate a complete Architectural Decision Record from the provided decision data.

## Decision Summary
- **Title**: ${decisionData.title}
- **Template Format**: ${templateFormat.toUpperCase()}
- **Alternatives**: ${decisionData.alternatives?.length || 0} considered
- **Evidence**: ${decisionData.evidence?.length || 0} pieces

## Next Steps
1. **Submit the generation prompt** to an AI agent for ADR creation
2. **Parse the JSON response** to get the complete ADR
3. **Review the generated content** for quality and completeness
4. **Save the ADR** to the appropriate location with suggested filename

## Expected AI Response Format
The AI will return a JSON object with:
- \`adr\`: Complete ADR with content, metadata, and filename
- \`suggestions\`: Placement, numbering, and review suggestions
- \`qualityChecks\`: Quality assessment and improvement suggestions

## Usage Example
\`\`\`typescript
const result = await generateAdrFromDecision(decisionData, 'nygard', existingAdrs);
// Submit result.generationPrompt to AI agent
// Parse AI response as GeneratedAdr
\`\`\`
`;

    return {
      generationPrompt,
      instructions,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate ADR: ${error instanceof Error ? error.message : String(error)}`,
      'GENERATION_ERROR'
    );
  }
}

/**
 * Generate next ADR number based on existing ADRs
 */
export function generateNextAdrNumber(existingAdrs: string[]): string {
  try {
    // Extract numbers from existing ADR filenames/titles
    const numbers = existingAdrs
      .map(adr => {
        const match = adr.match(/ADR[-_]?(\d+)/i) || adr.match(/(\d+)/);
        return match && match[1] ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num > 0);

    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = maxNumber + 1;

    return `ADR-${nextNumber.toString().padStart(4, '0')}`;
  } catch (error) {
    // Log to stderr to avoid corrupting MCP protocol
    console.error('[WARN] Failed to generate ADR number:', error);
    return 'ADR-0001';
  }
}

/**
 * Suggest ADR filename based on title and number
 */
export function suggestAdrFilename(title: string, adrNumber?: string): string {
  try {
    const number = adrNumber || 'XXXX';
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `${number.toLowerCase()}-${cleanTitle}.md`;
  } catch (error) {
    // Log to stderr to avoid corrupting MCP protocol
    console.error('[WARN] Failed to suggest filename:', error);
    return 'adr-new-decision.md';
  }
}
