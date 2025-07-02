/**
 * Research question generation utilities using prompt-driven AI analysis
 * Implements intelligent research question generation and task tracking
 */

import { McpAdrError } from '../types/index.js';

export interface ResearchProblem {
  id: string;
  description: string;
  category: string;
  severity: string;
  context: string;
}

export interface KnowledgeGraph {
  technologies: Array<{
    name: string;
    description?: string;
    category?: string;
  }>;
  patterns: Array<{
    name: string;
    description?: string;
    category?: string;
  }>;
  adrs: Array<{
    id: string;
    title: string;
    status: string;
    content?: string;
  }>;
  relationships: Array<{
    source: string;
    target: string;
    type: string;
  }>;
}

export interface ResearchContext {
  topic: string;
  category: string;
  scope: string;
  objectives: string[];
  constraints?: string[];
  timeline?: string;
}

export interface ResearchQuestion {
  id: string;
  question: string;
  type: string;
  priority: string;
  complexity: string;
  timeline: string;
  methodology: string;
  expectedOutcome: string;
  successCriteria: string[];
  relatedKnowledge: string[];
  resources: string[];
  risks: string[];
  dependencies: string[];
}

/**
 * Correlate problems with knowledge graph
 */
export async function correlateProblemKnowledge(
  problems: ResearchProblem[],
  knowledgeGraph: KnowledgeGraph
): Promise<{ correlationPrompt: string; instructions: string }> {
  try {
    const { generateProblemKnowledgeCorrelationPrompt } = await import('../prompts/research-question-prompts.js');
    
    const correlationPrompt = generateProblemKnowledgeCorrelationPrompt(problems, knowledgeGraph);
    
    const instructions = `
# Problem-Knowledge Correlation Instructions

This analysis will correlate identified problems with the architectural knowledge graph to identify research opportunities.

## Correlation Analysis
- **Problems**: ${problems.length} problems identified
- **Technologies**: ${knowledgeGraph.technologies.length} technologies in knowledge graph
- **Patterns**: ${knowledgeGraph.patterns.length} patterns in knowledge graph
- **ADRs**: ${knowledgeGraph.adrs.length} ADRs in knowledge graph
- **Relationships**: ${knowledgeGraph.relationships.length} relationships mapped

## Next Steps
1. **Submit the correlation prompt** to an AI agent for comprehensive analysis
2. **Parse the JSON response** to get correlation analysis and research opportunities
3. **Review knowledge gaps** and prioritize research areas
4. **Use findings** to generate targeted research questions

## Expected AI Response Format
The AI will return a JSON object with:
- \`correlationAnalysis\`: Overall correlation statistics and confidence
- \`problemCorrelations\`: Detailed problem-knowledge correlations
- \`knowledgeGaps\`: Identified gaps in the knowledge graph
- \`researchOpportunities\`: Prioritized research opportunities
- \`recommendations\`: Actionable recommendations for research planning

## Usage Example
\`\`\`typescript
const result = await correlateProblemKnowledge(problems, knowledgeGraph);
// Submit result.correlationPrompt to AI agent
// Parse AI response for correlation analysis
\`\`\`
`;
    
    return {
      correlationPrompt,
      instructions
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to correlate problems with knowledge: ${error instanceof Error ? error.message : String(error)}`,
      'CORRELATION_ERROR'
    );
  }
}

/**
 * Find relevant ADRs and patterns for research context
 */
export async function findRelevantAdrPatterns(
  researchContext: ResearchContext,
  adrDirectory: string = 'docs/adrs'
): Promise<{ relevancePrompt: string; instructions: string }> {
  try {
    const { findFiles } = await import('./file-system.js');
    const { generateRelevantAdrPatternPrompt } = await import('../prompts/research-question-prompts.js');
    
    // Find all ADR files
    const adrFiles = await findFiles(process.cwd(), [`${adrDirectory}/**/*.md`], { includeContent: true });
    
    // Prepare ADR data
    const availableAdrs = adrFiles.map(file => {
      const titleMatch = file.content?.match(/^#\s+(.+)$/m);
      const statusMatch = file.content?.match(/##\s+Status\s*\n\s*(.+)/i);
      
      return {
        id: file.name.replace(/\.md$/, ''),
        title: titleMatch?.[1] || file.name.replace(/\.md$/, ''),
        content: file.content || '',
        status: statusMatch?.[1] || 'Unknown'
      };
    });
    
    // Extract patterns from project (simplified for this implementation)
    const availablePatterns = extractArchitecturalPatterns();
    
    const relevancePrompt = generateRelevantAdrPatternPrompt(
      researchContext,
      availableAdrs,
      availablePatterns
    );
    
    const instructions = `
# Relevant ADR and Pattern Discovery Instructions

This analysis will identify ADRs and patterns relevant to the research context.

## Discovery Scope
- **Research Topic**: ${researchContext.topic}
- **Research Category**: ${researchContext.category}
- **Available ADRs**: ${availableAdrs.length} ADRs
- **Available Patterns**: ${availablePatterns.length} patterns
- **Research Objectives**: ${researchContext.objectives.length} objectives

## Next Steps
1. **Submit the relevance prompt** to an AI agent for analysis
2. **Parse the JSON response** to get relevant ADRs and patterns
3. **Review research implications** and constraints
4. **Use findings** to inform research question generation

## Expected AI Response Format
The AI will return a JSON object with:
- \`relevanceAnalysis\`: Overall relevance statistics and confidence
- \`relevantAdrs\`: ADRs relevant to the research context
- \`relevantPatterns\`: Patterns applicable to the research
- \`researchImplications\`: Constraints, opportunities, dependencies, conflicts
- \`researchGuidance\`: Specific guidance for research approach

## Usage Example
\`\`\`typescript
const result = await findRelevantAdrPatterns(researchContext, adrDirectory);
// Submit result.relevancePrompt to AI agent
// Parse AI response for relevant knowledge
\`\`\`
`;
    
    return {
      relevancePrompt,
      instructions
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to find relevant ADRs and patterns: ${error instanceof Error ? error.message : String(error)}`,
      'RELEVANCE_ANALYSIS_ERROR'
    );
  }
}

/**
 * Generate context-aware research questions
 */
export async function generateContextAwareQuestions(
  researchContext: ResearchContext,
  relevantKnowledge: {
    adrs: any[];
    patterns: any[];
    gaps: any[];
    opportunities: any[];
  },
  projectPath: string = process.cwd()
): Promise<{ questionPrompt: string; instructions: string }> {
  try {
    const { analyzeProjectStructure } = await import('./file-system.js');
    const { generateContextAwareResearchQuestionsPrompt } = await import('../prompts/research-question-prompts.js');
    
    // Analyze project context
    const projectStructure = await analyzeProjectStructure(projectPath);
    const projectContext = {
      technologies: (projectStructure as any).detectedTechnologies || [],
      architecture: inferArchitectureType(projectStructure),
      domain: inferDomainType(projectStructure),
      scale: inferProjectScale(projectStructure)
    };
    
    const questionPrompt = generateContextAwareResearchQuestionsPrompt(
      {
        ...researchContext,
        constraints: researchContext.constraints || [],
        timeline: researchContext.timeline || 'Not specified'
      },
      relevantKnowledge,
      projectContext
    );
    
    const instructions = `
# Context-Aware Research Question Generation Instructions

This analysis will generate specific, actionable research questions based on comprehensive context analysis.

## Question Generation Context
- **Research Topic**: ${researchContext.topic}
- **Project Technologies**: ${projectContext.technologies.join(', ')}
- **Architecture Type**: ${projectContext.architecture}
- **Domain**: ${projectContext.domain}
- **Project Scale**: ${projectContext.scale}
- **Relevant ADRs**: ${relevantKnowledge.adrs.length}
- **Relevant Patterns**: ${relevantKnowledge.patterns.length}
- **Knowledge Gaps**: ${relevantKnowledge.gaps.length}
- **Research Opportunities**: ${relevantKnowledge.opportunities.length}

## Next Steps
1. **Submit the question prompt** to an AI agent for comprehensive question generation
2. **Parse the JSON response** to get structured research questions
3. **Review research plan** and prioritize questions
4. **Create research tasks** using the task tracking system

## Expected AI Response Format
The AI will return a JSON object with:
- \`researchQuestionGeneration\`: Generation metadata and quality metrics
- \`primaryQuestions\`: Core research questions with detailed specifications
- \`secondaryQuestions\`: Supporting questions for comprehensive coverage
- \`methodologicalQuestions\`: Questions about research approach and methodology
- \`researchPlan\`: Phased research plan with timelines and dependencies
- \`qualityAssurance\`: Quality assurance and validation approach
- \`expectedImpact\`: Expected impact and benefits of the research

## Usage Example
\`\`\`typescript
const result = await generateContextAwareQuestions(context, knowledge, projectPath);
// Submit result.questionPrompt to AI agent
// Parse AI response for research questions and plan
\`\`\`
`;
    
    return {
      questionPrompt,
      instructions
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate context-aware questions: ${error instanceof Error ? error.message : String(error)}`,
      'QUESTION_GENERATION_ERROR'
    );
  }
}

/**
 * Create research task tracking system
 */
export async function createResearchTaskTracking(
  researchQuestions: ResearchQuestion[],
  currentProgress?: Array<{
    questionId: string;
    status: string;
    progress: number;
    findings: string[];
    blockers: string[];
  }>
): Promise<{ trackingPrompt: string; instructions: string }> {
  try {
    const { generateResearchTaskTrackingPrompt } = await import('../prompts/research-question-prompts.js');
    
    const trackingPrompt = generateResearchTaskTrackingPrompt(researchQuestions, currentProgress);
    
    const instructions = `
# Research Task Tracking Instructions

This analysis will create a comprehensive task tracking and management system for research execution.

## Tracking Scope
- **Research Questions**: ${researchQuestions.length} questions to track
- **Current Progress**: ${currentProgress?.length || 0} progress entries
- **Question Types**: ${Array.from(new Set(researchQuestions.map(q => q.type))).join(', ')}
- **Priority Levels**: ${Array.from(new Set(researchQuestions.map(q => q.priority))).join(', ')}

## Next Steps
1. **Submit the tracking prompt** to an AI agent for system creation
2. **Parse the JSON response** to get comprehensive tracking system
3. **Implement tracking** in project management tools
4. **Begin research execution** with regular progress updates

## Expected AI Response Format
The AI will return a JSON object with:
- \`researchTaskTracking\`: Overall tracking metadata and configuration
- \`researchTasks\`: Detailed tasks with progress tracking and dependencies
- \`milestones\`: Key milestones and checkpoints
- \`riskManagement\`: Risk identification and mitigation strategies
- \`progressMetrics\`: Quantitative progress measurements
- \`communicationPlan\`: Stakeholder communication and reporting
- \`qualityAssurance\`: Quality control and validation processes
- \`recommendations\`: Process and management recommendations

## Usage Example
\`\`\`typescript
const result = await createResearchTaskTracking(questions, progress);
// Submit result.trackingPrompt to AI agent
// Parse AI response for task tracking system
\`\`\`
`;
    
    return {
      trackingPrompt,
      instructions
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to create research task tracking: ${error instanceof Error ? error.message : String(error)}`,
      'TASK_TRACKING_ERROR'
    );
  }
}

/**
 * Extract architectural patterns from project structure
 */
function extractArchitecturalPatterns(): Array<{
  name: string;
  description: string;
  category: string;
}> {
  // Simplified pattern extraction - in a real implementation, this would be more sophisticated
  return [
    {
      name: 'Microservices Architecture',
      description: 'Distributed architecture with independent services',
      category: 'architectural'
    },
    {
      name: 'Layered Architecture',
      description: 'Hierarchical organization of components',
      category: 'architectural'
    },
    {
      name: 'Event-Driven Architecture',
      description: 'Asynchronous communication through events',
      category: 'architectural'
    },
    {
      name: 'Repository Pattern',
      description: 'Data access abstraction pattern',
      category: 'design'
    },
    {
      name: 'Factory Pattern',
      description: 'Object creation abstraction pattern',
      category: 'design'
    }
  ];
}

/**
 * Infer architecture type from project structure
 */
function inferArchitectureType(projectStructure: any): string {
  if (projectStructure.directories?.some((dir: string) => dir.includes('service'))) {
    return 'microservices';
  }
  if (projectStructure.directories?.some((dir: string) => dir.includes('layer'))) {
    return 'layered';
  }
  if (projectStructure.detectedTechnologies?.includes('kubernetes')) {
    return 'cloud-native';
  }
  return 'monolithic';
}

/**
 * Infer domain type from project structure
 */
function inferDomainType(projectStructure: any): string {
  const technologies = projectStructure.detectedTechnologies || [];
  
  if (technologies.some((tech: string) => tech.includes('react') || tech.includes('vue') || tech.includes('angular'))) {
    return 'web-application';
  }
  if (technologies.some((tech: string) => tech.includes('api') || tech.includes('rest'))) {
    return 'api-service';
  }
  if (technologies.some((tech: string) => tech.includes('data') || tech.includes('analytics'))) {
    return 'data-platform';
  }
  return 'general-software';
}

/**
 * Infer project scale from project structure
 */
function inferProjectScale(projectStructure: any): string {
  const fileCount = projectStructure.totalFiles || 0;
  const dirCount = projectStructure.totalDirectories || 0;
  
  if (fileCount > 1000 || dirCount > 100) {
    return 'enterprise';
  }
  if (fileCount > 100 || dirCount > 20) {
    return 'medium';
  }
  return 'small';
}
