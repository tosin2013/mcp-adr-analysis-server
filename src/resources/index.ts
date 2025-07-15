/**
 * MCP Resource implementations using prompt-driven approach
 * Generates structured data resources for architectural analysis
 */

import { McpAdrError } from '../types/index.js';
import { KnowledgeGraphManager } from '../utils/knowledge-graph-manager.js';

export interface ResourceGenerationResult {
  data: any;
  contentType: string;
  lastModified: string;
  cacheKey: string;
  ttl: number; // Time to live in seconds
}

/**
 * Generate architectural knowledge graph resource
 */
export async function generateArchitecturalKnowledgeGraph(
  projectPath: string
): Promise<ResourceGenerationResult> {
  try {
    const { analyzeProjectStructure } = await import('../utils/file-system.js');
    
    // Load knowledge graph data
    const kgManager = new KnowledgeGraphManager();
    const knowledgeGraphSnapshot = await kgManager.loadKnowledgeGraph();

    // Generate project analysis prompt for AI delegation
    const projectAnalysisPrompt = await analyzeProjectStructure(projectPath);

    // Create comprehensive knowledge graph generation prompt
    const knowledgeGraphPrompt = `
# Architectural Knowledge Graph Generation

Please perform a comprehensive project analysis and generate a complete architectural knowledge graph.

## Project Analysis Instructions

${projectAnalysisPrompt.prompt}

## Implementation Steps

${projectAnalysisPrompt.instructions}

## Required Output Format

Please provide the architectural knowledge graph in the following JSON structure:

\`\`\`json
{
  "projectId": "unique-project-identifier",
  "timestamp": "ISO-8601-timestamp",
  "metadata": {
    "name": "project-name",
    "description": "project-description",
    "version": "detected-version",
    "lastAnalyzed": "ISO-8601-timestamp",
    "analysisVersion": "1.0.0",
    "fileCount": "total-files-discovered",
    "directoryCount": "total-directories-discovered"
  },
  "technologies": [
    {
      "name": "Technology Name",
      "category": "framework|library|database|cloud|devops|language|tool",
      "version": "version-if-detectable",
      "confidence": 0.0-1.0,
      "evidence": ["specific-evidence"],
      "filePaths": ["relevant-file-paths"],
      "description": "brief-description"
    }
  ],
  "patterns": [
    {
      "name": "Pattern Name",
      "type": "architectural|structural|organizational|communication|testing|data",
      "confidence": 0.0-1.0,
      "description": "pattern-description",
      "evidence": ["specific-evidence"],
      "filePaths": ["relevant-file-paths"],
      "suboptimal": false,
      "recommendations": ["improvement-suggestions"]
    }
  ],
  "adrs": [
    {
      "id": "adr-id",
      "title": "ADR Title",
      "status": "proposed|accepted|deprecated|superseded",
      "date": "YYYY-MM-DD",
      "context": "decision-context",
      "decision": "architectural-decision",
      "consequences": "decision-consequences",
      "filePath": "path-to-adr-file",
      "tags": ["relevant-tags"],
      "relatedAdrs": ["related-adr-ids"]
    }
  ],
  "rules": [
    {
      "id": "rule-id",
      "name": "Rule Name",
      "description": "rule-description",
      "type": "architectural|coding|security|performance|documentation",
      "severity": "info|warning|error|critical",
      "pattern": "detection-pattern",
      "message": "violation-message",
      "source": "adr|inferred|user_defined",
      "enabled": true
    }
  ],
  "relationships": [
    {
      "source": "source-entity-id",
      "target": "target-entity-id",
      "type": "implements|depends_on|conflicts_with|supersedes|relates_to",
      "strength": 0.0-1.0,
      "description": "relationship-description"
    }
  ],
  "intentSnapshots": [
    {
      "intentId": "intent-id",
      "humanRequest": "original-user-request",
      "parsedGoals": ["goal1", "goal2"],
      "priority": "high|medium|low",
      "timestamp": "ISO-8601-timestamp",
      "currentStatus": "planning|executing|completed|failed",
      "toolChain": [
        {
          "toolName": "tool-name",
          "parameters": {},
          "result": {},
          "todoTasksCreated": ["task-id"],
          "todoTasksModified": ["task-id"],
          "executionTime": "ISO-8601-timestamp",
          "success": true
        }
      ],
      "todoMdSnapshot": "snapshot-content",
      "goalProgression": 0.0-1.0
    }
  ],
  "analytics": {
    "totalIntents": 0,
    "completedIntents": 0,
    "activeIntents": 0,
    "averageGoalCompletion": 0.0-1.0,
    "mostUsedTools": [
      {
        "toolName": "tool-name",
        "usageCount": 0
      }
    ],
    "successfulPatterns": [
      {
        "pattern": "pattern-description",
        "successRate": 0.0-1.0,
        "examples": ["example-intent-ids"]
      }
    ]
  }
}
\`\`\`

## Analysis Guidelines

1. **Comprehensive Detection**: Identify all technologies, patterns, and architectural decisions
2. **Evidence-Based**: Provide specific evidence for all detections
3. **Relationship Mapping**: Identify relationships between components
4. **Quality Assessment**: Evaluate implementation quality and provide recommendations
5. **Future-Focused**: Consider scalability and maintainability implications

Please generate a complete, accurate architectural knowledge graph.
`;

    const cacheKey = `knowledge-graph:${Buffer.from(projectPath).toString('base64')}`;

    return {
      data: {
        prompt: knowledgeGraphPrompt,
        instructions: `
# Architectural Knowledge Graph Resource

This resource provides a comprehensive view of the project's architectural landscape.

## Usage Instructions

1. **Submit the generated prompt** to an AI agent for analysis
2. **Parse the JSON response** as an ArchitecturalKnowledgeGraph
3. **Cache the result** for performance optimization
4. **Use the data** for architectural decision making and analysis

## Resource Content

The knowledge graph includes:
- **Technologies**: All detected frameworks, libraries, tools, and platforms
- **Patterns**: Architectural and design patterns in use
- **ADRs**: Existing architectural decision records
- **Rules**: Extracted and inferred architectural rules
- **Relationships**: Connections between architectural components

## Next Steps

Submit the prompt to generate the actual knowledge graph data.
        `,
        projectPath,
        promptInstructions: projectAnalysisPrompt.instructions,
        context: projectAnalysisPrompt.context,
        // Include actual knowledge graph snapshot data
        knowledgeGraphSnapshot: {
          version: knowledgeGraphSnapshot.version,
          timestamp: knowledgeGraphSnapshot.timestamp,
          intents: knowledgeGraphSnapshot.intents.map(intent => ({
            intentId: intent.intentId,
            humanRequest: intent.humanRequest,
            parsedGoals: intent.parsedGoals,
            priority: intent.priority,
            timestamp: intent.timestamp,
            currentStatus: intent.currentStatus,
            toolChainSummary: {
              totalTools: intent.toolChain.length,
              completedTools: intent.toolChain.filter(t => t.success).length,
              failedTools: intent.toolChain.filter(t => !t.success).length,
              lastExecution: intent.toolChain.length > 0 ? intent.toolChain[intent.toolChain.length - 1]?.executionTime || null : null
            },
            todoTasksCreated: intent.toolChain.flatMap(t => t.todoTasksCreated),
            todoTasksModified: intent.toolChain.flatMap(t => t.todoTasksModified),
            hasSnapshots: !!intent.todoMdSnapshot
          })),
          todoSyncState: knowledgeGraphSnapshot.todoSyncState,
          analytics: knowledgeGraphSnapshot.analytics
        }
      },
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 3600, // 1 hour cache
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate architectural knowledge graph: ${error instanceof Error ? error.message : String(error)}`,
      'RESOURCE_GENERATION_ERROR'
    );
  }
}

/**
 * Generate analysis report resource
 */
export async function generateAnalysisReport(
  projectPath: string,
  focusAreas?: string[]
): Promise<ResourceGenerationResult> {
  try {
    const { analyzeProjectStructure } = await import('../utils/file-system.js');

    // Generate project analysis prompt for AI delegation
    const projectAnalysisPrompt = await analyzeProjectStructure(projectPath);

    const reportPrompt = `
# Project Analysis Report Generation

Please perform a comprehensive project analysis and generate a detailed analysis report.

## Project Analysis Instructions

${projectAnalysisPrompt.prompt}

## Implementation Steps

${projectAnalysisPrompt.instructions}

${
  focusAreas
    ? `## Focus Areas
Please pay special attention to the following areas: ${focusAreas.join(', ')}`
    : ''
}

## Required Report Format

Please provide the analysis report in the following JSON structure:

\`\`\`json
{
  "reportId": "unique-report-id",
  "timestamp": "ISO-8601-timestamp",
  "projectSummary": {
    "name": "project-name",
    "type": "web|mobile|api|library|tool|other",
    "description": "project-description",
    "maturityLevel": "prototype|development|production|mature",
    "primaryLanguages": ["detected-languages"],
    "estimatedSize": "small|medium|large|enterprise"
  },
  "executiveSummary": {
    "overallHealth": "excellent|good|fair|poor",
    "keyStrengths": ["identified-strengths"],
    "criticalIssues": ["critical-issues"],
    "recommendedActions": ["priority-actions"],
    "riskLevel": "low|medium|high|critical"
  },
  "technicalAnalysis": {
    "technologyStack": {
      "score": 0.0-1.0,
      "assessment": "technology-stack-assessment",
      "recommendations": ["technology-recommendations"]
    },
    "architecturalPatterns": {
      "score": 0.0-1.0,
      "assessment": "pattern-implementation-assessment",
      "recommendations": ["pattern-recommendations"]
    },
    "codeQuality": {
      "score": 0.0-1.0,
      "assessment": "code-quality-assessment",
      "recommendations": ["quality-recommendations"]
    },
    "security": {
      "score": 0.0-1.0,
      "assessment": "security-posture-assessment",
      "recommendations": ["security-recommendations"]
    }
  },
  "detailedFindings": [
    {
      "category": "technology|architecture|security|performance|maintainability",
      "title": "finding-title",
      "severity": "low|medium|high|critical",
      "description": "detailed-description",
      "impact": "potential-impact",
      "recommendation": "specific-recommendation",
      "effort": "low|medium|high",
      "priority": "low|medium|high|critical"
    }
  ],
  "metrics": {
    "technologiesDetected": 0,
    "patternsIdentified": 0,
    "adrsFound": 0,
    "rulesExtracted": 0,
    "overallScore": 0.0-1.0
  },
  "actionPlan": {
    "immediate": ["urgent-actions"],
    "shortTerm": ["1-3-month-actions"],
    "longTerm": ["6-12-month-actions"],
    "strategic": ["long-term-strategic-actions"]
  }
}
\`\`\`

## Analysis Guidelines

1. **Holistic Assessment**: Consider all aspects of the project
2. **Actionable Insights**: Provide specific, implementable recommendations
3. **Risk Assessment**: Identify and prioritize risks
4. **Business Impact**: Consider business implications of technical decisions
5. **Roadmap Planning**: Provide clear action plans with timelines

Please generate a comprehensive, actionable analysis report.
`;

    const cacheKey = `analysis-report:${Buffer.from(projectPath + (focusAreas?.join(',') || '')).toString('base64')}`;

    return {
      data: {
        prompt: reportPrompt,
        instructions: `
# Analysis Report Resource

This resource provides a comprehensive analysis report of the project's current state and recommendations.

## Usage Instructions

1. **Submit the generated prompt** to an AI agent for analysis
2. **Parse the JSON response** as an analysis report
3. **Use the findings** for decision making and planning
4. **Track progress** against recommended actions

## Report Content

The analysis report includes:
- **Executive Summary**: High-level assessment and key findings
- **Technical Analysis**: Detailed technical evaluation with scores
- **Detailed Findings**: Specific issues and recommendations
- **Metrics**: Quantitative assessment data
- **Action Plan**: Prioritized roadmap for improvements

## Next Steps

Submit the prompt to generate the actual analysis report.
        `,
        projectPath,
        focusAreas,
        promptInstructions: projectAnalysisPrompt.instructions,
        context: projectAnalysisPrompt.context,
      },
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 1800, // 30 minutes cache
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate analysis report: ${error instanceof Error ? error.message : String(error)}`,
      'RESOURCE_GENERATION_ERROR'
    );
  }
}

/**
 * Generate ADR list resource
 */
export async function generateAdrList(
  adrDirectory: string = 'docs/adrs',
  projectPath?: string
): Promise<ResourceGenerationResult> {
  try {
    const { discoverAdrsInDirectory } = await import('../utils/adr-discovery.js');
    const path = await import('path');

    // Use provided project path or fall back to current working directory
    const basePath = projectPath || process.cwd();

    // Use absolute path for ADR directory
    const absoluteAdrPath = path.isAbsolute(adrDirectory) 
      ? adrDirectory 
      : path.resolve(basePath, adrDirectory);

    // Use actual ADR discovery
    const discoveryResult = await discoverAdrsInDirectory(absoluteAdrPath, true, basePath);

    let adrListContent = '';
    if (discoveryResult.adrs.length > 0) {
      adrListContent = `Found ${discoveryResult.adrs.length} ADRs in ${adrDirectory}:\n\n`;
      discoveryResult.adrs.forEach(adr => {
        adrListContent += `### ${adr.title}\n`;
        adrListContent += `- **File**: ${adr.filename}\n`;
        adrListContent += `- **Status**: ${adr.status}\n`;
        adrListContent += `- **Context**: ${adr.context}\n`;
        adrListContent += `- **Decision**: ${adr.decision}\n`;
        adrListContent += `- **Consequences**: ${adr.consequences}\n\n`;
      });
    } else {
      adrListContent = `No ADRs found in ${adrDirectory}.\n\n`;
    }

    const adrListPrompt = `
# ADR List Resource Generation

## ADR Discovery Results

${adrListContent}

## Analysis Requirements

For each ADR file discovered:
1. Extract the file name, path, and size
2. Read and analyze the content
3. Identify the ADR status (proposed, accepted, deprecated, superseded)
4. Extract key metadata (title, date, decision, consequences)
5. Determine implementation status and coverage

## Required Output Format

Please provide the ADR list in the following JSON structure:

\`\`\`json
{
  "listId": "unique-list-id",
  "timestamp": "ISO-8601-timestamp",
  "directory": "${adrDirectory}",
  "summary": {
    "totalAdrs": "count-of-discovered-adrs",
    "statusBreakdown": {
      "proposed": 0,
      "accepted": 0,
      "deprecated": 0,
      "superseded": 0
    },
    "lastModified": "ISO-8601-timestamp",
    "coverage": {
      "hasImplementationPlans": 0,
      "hasConsequences": 0,
      "hasRelatedAdrs": 0
    }
  },
  "adrs": [
    {
      "id": "extracted-or-generated-id",
      "title": "ADR Title",
      "status": "proposed|accepted|deprecated|superseded",
      "date": "YYYY-MM-DD",
      "context": "decision-context-summary",
      "decision": "architectural-decision-summary",
      "consequences": "decision-consequences-summary",
      "implementationPlan": "implementation-plan-if-present",
      "filePath": "relative-file-path",
      "fileName": "file-name",
      "fileSize": file-size-bytes,
      "tags": ["extracted-tags"],
      "relatedAdrs": ["related-adr-ids"],
      "priority": "low|medium|high|critical",
      "complexity": "low|medium|high",
      "implementationStatus": "not-started|in-progress|completed|blocked"
    }
  ],
  "relationships": [
    {
      "sourceAdr": "source-adr-id",
      "targetAdr": "target-adr-id",
      "relationshipType": "supersedes|relates-to|depends-on|conflicts-with",
      "description": "relationship-description"
    }
  ],
  "gaps": [
    {
      "area": "missing-decision-area",
      "description": "gap-description",
      "suggestedAdr": "suggested-adr-title",
      "priority": "low|medium|high|critical"
    }
  ],
  "recommendations": [
    "specific-recommendations-for-adr-management"
  ]
}
\`\`\`

## Analysis Guidelines

1. **Extract Metadata**: Parse ADR structure to extract titles, statuses, dates
2. **Identify Relationships**: Find connections between ADRs
3. **Assess Completeness**: Evaluate ADR quality and completeness
4. **Find Gaps**: Identify missing architectural decisions
5. **Provide Insights**: Offer recommendations for ADR management

Please generate a comprehensive, structured ADR list resource.
`;

    const cacheKey = `adr-list:${Buffer.from(adrDirectory).toString('base64')}`;

    return {
      data: {
        prompt: adrListPrompt,
        instructions: `
# ADR List Resource

This resource provides a structured view of all Architectural Decision Records in the project.

## Usage Instructions

1. **Submit the generated prompt** to an AI agent for analysis
2. **Parse the JSON response** as an ADR list
3. **Use the data** for ADR management and tracking
4. **Monitor gaps** and implement missing ADRs

## Resource Content

The ADR list includes:
- **Summary**: Overview of ADR status and coverage
- **Individual ADRs**: Detailed information for each ADR
- **Relationships**: Connections between ADRs
- **Gaps**: Missing architectural decisions
- **Recommendations**: ADR management suggestions

## Next Steps

Submit the prompt to generate the actual ADR list data.
        `,
        adrDirectory,
        adrCount: discoveryResult.adrs.length,
        discoveredAdrs: discoveryResult.adrs.map(adr => ({
          title: adr.title,
          filename: adr.filename,
          status: adr.status
        })),
      },
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 900, // 15 minutes cache
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate ADR list: ${error instanceof Error ? error.message : String(error)}`,
      'RESOURCE_GENERATION_ERROR'
    );
  }
}
