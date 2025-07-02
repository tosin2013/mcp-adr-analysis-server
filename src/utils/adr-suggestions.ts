/**
 * ADR suggestion utilities using prompt-driven AI analysis
 * Implements intelligent ADR recommendations based on code analysis
 */

import { McpAdrError } from '../types/index.js';

export interface ImplicitDecision {
  id: string;
  title: string;
  category: string;
  confidence: number;
  evidence: string[];
  filePaths: string[];
  description: string;
  context: string;
  consequences: string;
  alternatives: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  complexity: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  suggestedAdrTitle: string;
  relatedPatterns: string[];
}

export interface DecisionCluster {
  theme: string;
  decisions: string[];
  suggestedCombinedAdr: string;
}

export interface ImplicitDecisionAnalysis {
  implicitDecisions: ImplicitDecision[];
  decisionClusters: DecisionCluster[];
  recommendations: string[];
  gaps: Array<{
    area: string;
    description: string;
    suggestedInvestigation: string;
  }>;
}

export interface CodeChangeDecision {
  id: string;
  title: string;
  category: string;
  confidence: number;
  evidence: string[];
  context: string;
  decision: string;
  consequences: string;
  alternatives: string[];
  changeMotivation: string;
  futureImplications: string;
  suggestedAdrTitle: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface GeneratedAdr {
  id: string;
  title: string;
  status: string;
  date: string;
  format: string;
  content: string;
  filename: string;
  metadata: {
    category: string;
    tags: string[];
    complexity: string;
    impact: string;
    stakeholders: string[];
  };
}

/**
 * Analyze project for implicit architectural decisions
 */
export async function analyzeImplicitDecisions(
  projectPath: string,
  existingAdrs?: string[]
): Promise<{ analysisPrompt: string; instructions: string }> {
  try {
    const { analyzeProjectStructure } = await import('./file-system.js');
    const { generateAnalysisContext } = await import('../prompts/analysis-prompts.js');
    const { generateImplicitDecisionDetectionPrompt } = await import(
      '../prompts/adr-suggestion-prompts.js'
    );

    // Analyze project structure
    const projectStructure = await analyzeProjectStructure(projectPath);
    const analysisContext = generateAnalysisContext(projectStructure);

    // Extract code patterns from project structure
    const codePatterns = extractCodePatterns(projectStructure);

    const analysisPrompt = generateImplicitDecisionDetectionPrompt(
      analysisContext,
      codePatterns,
      existingAdrs
    );

    const instructions = `
# Implicit Decision Analysis Instructions

This analysis will identify architectural decisions that are implicit in the codebase but not formally documented.

## Analysis Scope
- **Project Path**: ${projectPath}
- **Files Analyzed**: ${projectStructure.totalFiles} files
- **Directories**: ${projectStructure.totalDirectories} directories
- **Existing ADRs**: ${existingAdrs?.length || 0} ADRs

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
      `Failed to analyze implicit decisions: ${error instanceof Error ? error.message : String(error)}`,
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
 * Extract code patterns from project structure for analysis
 */
function extractCodePatterns(projectStructure: any): string[] {
  const patterns: string[] = [];

  try {
    // Extract patterns from file structure
    if (projectStructure.filesByType) {
      Object.entries(projectStructure.filesByType).forEach(([type, files]: [string, any]) => {
        if (Array.isArray(files) && files.length > 0) {
          patterns.push(
            `${type} files: ${files
              .slice(0, 5)
              .map((f: any) => f.name || f)
              .join(', ')}${files.length > 5 ? ` and ${files.length - 5} more` : ''}`
          );
        }
      });
    }

    // Extract patterns from directory structure
    if (projectStructure.directories) {
      const dirNames = projectStructure.directories.slice(0, 10).join(', ');
      patterns.push(
        `Directory structure: ${dirNames}${projectStructure.directories.length > 10 ? ` and ${projectStructure.directories.length - 10} more` : ''}`
      );
    }

    // Extract patterns from detected technologies
    if (projectStructure.detectedTechnologies) {
      patterns.push(`Technologies: ${projectStructure.detectedTechnologies.join(', ')}`);
    }

    // Add basic project metrics
    patterns.push(
      `Project metrics: ${projectStructure.totalFiles} files, ${projectStructure.totalDirectories} directories`
    );

    return patterns;
  } catch (error) {
    console.warn('Failed to extract code patterns:', error);
    return ['Unable to extract code patterns from project structure'];
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
    console.warn('Failed to generate ADR number:', error);
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
    console.warn('Failed to suggest filename:', error);
    return 'adr-new-decision.md';
  }
}
