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
    const { generateProblemKnowledgeCorrelationPrompt } = await import(
      '../prompts/research-question-prompts.js'
    );

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
      instructions,
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
    // Use actual ADR discovery instead of prompts
    const { discoverAdrsInDirectory } = await import('./adr-discovery.js');

    // Actually read ADR files
    let discoveryResult: any;
    try {
      discoveryResult = await discoverAdrsInDirectory(adrDirectory, true, process.cwd());
    } catch {
      // If ADR discovery fails, create empty result
      discoveryResult = {
        directory: adrDirectory,
        totalAdrs: 0,
        adrs: [],
        summary: { byStatus: {}, byCategory: {} },
        recommendations: [],
      };
    }

    // Handle case where discovery fails or returns undefined
    if (!discoveryResult) {
      discoveryResult = {
        directory: adrDirectory,
        totalAdrs: 0,
        adrs: [],
        summary: { byStatus: {}, byCategory: {} },
        recommendations: [],
      };
    }

    // Extract patterns from project (simplified for this implementation)
    const availablePatterns = extractArchitecturalPatterns();

    const relevancePrompt = `
# Relevant ADR Pattern Identification

Based on actual ADR file analysis, here are the discovered ADRs with their full content:

## Discovered ADRs (${discoveryResult.totalAdrs || 0} total)

${
  discoveryResult.adrs && discoveryResult.adrs.length > 0
    ? discoveryResult.adrs
        .map(
          (adr: any, index: number) => `
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

## Research Context Analysis

**Topic**: ${researchContext.topic}
**Category**: ${researchContext.category}  
**Scope**: ${researchContext.scope}
**Objectives**: ${researchContext.objectives.join(', ')}
**Constraints**: ${researchContext.constraints?.join(', ') || 'None specified'}
**Timeline**: ${researchContext.timeline || 'Not specified'}

## Available Architectural Patterns

${availablePatterns
  .map(
    (pattern, index) => `
### ${index + 1}. ${pattern.name}
- **Category**: ${pattern.category}
- **Description**: ${pattern.description}
- **Applications**: Various architectural applications
`
  )
  .join('')}

## Pattern Relevance Assessment

For each discovered ADR and available pattern:
1. Analyze relevance to the research context based on **actual ADR content**
2. Identify potential applications and benefits
3. Assess implementation complexity and trade-offs
4. Generate specific recommendations for adoption
5. Prioritize patterns by impact and feasibility
`;

    const instructions = `
# Relevant ADR and Pattern Discovery Instructions

This analysis provides **actual ADR content** to identify ADRs and patterns relevant to the research context.

## Discovery Scope
- **Research Topic**: ${researchContext.topic}
- **Research Category**: ${researchContext.category}
- **ADR Directory**: ${adrDirectory}
- **ADRs Found**: ${discoveryResult.totalAdrs || 0} files
- **ADRs with Content**: ${discoveryResult.adrs?.filter((adr: any) => adr.content).length || 0} ADRs
- **Available Patterns**: ${availablePatterns.length} patterns
- **Research Objectives**: ${researchContext.objectives.length} objectives

## Discovered ADR Summary
${discoveryResult.adrs?.map((adr: any) => `- **${adr.title}** (${adr.status})`).join('\n') || 'No ADRs discovered'}

## Next Steps
1. **Submit the relevance prompt** to an AI agent for analysis based on **actual ADR content**
2. **Parse the JSON response** to get relevant ADRs and patterns
3. **Review research implications** and constraints
4. **Use findings** to inform research question generation

## Expected AI Response Format
The AI will return a JSON object with:
- \`relevanceAnalysis\`: Overall relevance statistics and confidence based on actual content
- \`relevantAdrs\`: ADRs relevant to the research context with specific reasoning
- \`relevantPatterns\`: Patterns applicable to the research with evidence from ADRs
- \`researchImplications\`: Constraints, opportunities, dependencies, conflicts derived from ADR content
- \`researchGuidance\`: Specific guidance for research approach based on existing decisions

## Usage Example
\`\`\`typescript
const result = await findRelevantAdrPatterns(researchContext, adrDirectory);
// Submit result.relevancePrompt to AI agent
// Parse AI response for relevant knowledge based on actual ADR content
\`\`\`
`;

    return {
      relevancePrompt,
      instructions,
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
    // Use actual file operations to scan project structure
    const { scanProjectStructure } = await import('./actual-file-operations.js');
    const { generateContextAwareResearchQuestionsPrompt } = await import(
      '../prompts/research-question-prompts.js'
    );

    // Actually scan project context
    const projectStructure = await scanProjectStructure(projectPath, { readContent: false });
    const projectContext = {
      technologies: extractTechnologiesFromStructure(projectStructure),
      architecture: inferArchitectureType(projectStructure),
      domain: inferDomainType(projectStructure),
      scale: inferProjectScale(projectStructure),
    };

    // Generate file creation prompts for research questions
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const researchFileName = `research-questions-${timestamp}.md`;
    const researchDir = `${projectPath}/docs/research`;
    const researchFilePath = `${researchDir}/${researchFileName}`;

    const questionPrompt = generateContextAwareResearchQuestionsPrompt(
      {
        ...researchContext,
        constraints: researchContext.constraints || [],
        timeline: researchContext.timeline || 'Not specified',
      },
      relevantKnowledge,
      projectContext
    );

    const instructions = `
# Context-Aware Research Question Generation Instructions

This analysis will generate specific, actionable research questions based on comprehensive context analysis and save them to the docs/research directory.

## Question Generation Context
- **Research Topic**: ${researchContext.topic}
- **Project Technologies**: ${projectContext.technologies.join(', ')}
- **Architecture Type**: ${projectContext.architecture}
- **Domain**: ${projectContext.domain}
- **Project Scale**: ${projectContext.scale}
- **Total Files**: ${projectStructure.totalFiles}
- **Directories**: ${projectStructure.directories.length}
- **Relevant ADRs**: ${relevantKnowledge.adrs.length}
- **Relevant Patterns**: ${relevantKnowledge.patterns.length}
- **Knowledge Gaps**: ${relevantKnowledge.gaps.length}
- **Research Opportunities**: ${relevantKnowledge.opportunities.length}

## File Creation Requirements

### Step 1: Create Research Directory
Ensure the research directory exists: ${researchDir}

### Step 2: Generate Research Questions
Execute the research question generation prompt below to create comprehensive research questions.

### Step 3: Save Research Questions to File
After generating the research questions, create a research questions file:

**File Path**: ${researchFilePath}
**File Name**: ${researchFileName}

The file should contain:
- Generated research questions in structured markdown format
- Research plan with timelines and priorities
- Methodology and approach details
- Quality assurance criteria
- Expected outcomes and impact

## Next Steps
1. **Ensure docs/research directory exists** before proceeding
2. **Submit the question prompt** to an AI agent for comprehensive question generation
3. **Parse the JSON response** to get structured research questions
4. **Create markdown file** with the research questions at ${researchFilePath}
5. **Review research plan** and prioritize questions
6. **Create research tasks** using the task tracking system

## Expected AI Response Format
The AI will return a JSON object with:
- \`researchQuestionGeneration\`: Generation metadata and quality metrics
- \`primaryQuestions\`: Core research questions with detailed specifications
- \`secondaryQuestions\`: Supporting questions for comprehensive coverage
- \`methodologicalQuestions\`: Questions about research approach and methodology
- \`researchPlan\`: Phased research plan with timelines and dependencies
- \`qualityAssurance\`: Quality assurance and validation approach
- \`expectedImpact\`: Expected impact and benefits of the research

## File Persistence
After generating the research questions, the AI agent must:
1. **Format the questions** into a structured markdown document
2. **Create the research file** at: ${researchFilePath}
3. **Include all generated content** in the file for future reference
4. **Confirm file creation** and provide file location

## Usage Example
\`\`\`typescript
const result = await generateContextAwareQuestions(context, knowledge, projectPath);
// 1. Execute directory creation prompt
// 2. Submit result.questionPrompt to AI agent
// 3. Parse AI response for research questions and plan
// 4. Create markdown file with research questions
\`\`\`
`;

    return {
      questionPrompt,
      instructions,
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
    const { generateResearchTaskTrackingPrompt } = await import(
      '../prompts/research-question-prompts.js'
    );

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
      instructions,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to create research task tracking: ${error instanceof Error ? error.message : String(error)}`,
      'TASK_TRACKING_ERROR'
    );
  }
}

/**
 * Extract technologies from project structure
 */
function extractTechnologiesFromStructure(projectStructure: any): string[] {
  const technologies: string[] = [];

  // Analyze package files for technologies
  if (projectStructure.packageFiles) {
    projectStructure.packageFiles.forEach((file: any) => {
      if (file.filename === 'package.json' && file.content) {
        try {
          const packageData = JSON.parse(file.content);
          if (packageData.dependencies) {
            Object.keys(packageData.dependencies).forEach(dep => {
              if (dep.includes('react')) technologies.push('React');
              if (dep.includes('vue')) technologies.push('Vue');
              if (dep.includes('angular')) technologies.push('Angular');
              if (dep.includes('express')) technologies.push('Express.js');
              if (dep.includes('typescript')) technologies.push('TypeScript');
            });
          }
        } catch {
          // Invalid JSON, skip
        }
      }
      if (file.filename === 'requirements.txt') technologies.push('Python');
      if (file.filename === 'Cargo.toml') technologies.push('Rust');
      if (file.filename === 'go.mod') technologies.push('Go');
      if (file.filename === 'pom.xml') technologies.push('Java/Maven');
    });
  }

  // Analyze config files
  if (projectStructure.configFiles) {
    projectStructure.configFiles.forEach((file: any) => {
      if (file.filename === 'tsconfig.json') technologies.push('TypeScript');
      if (file.filename.includes('webpack')) technologies.push('Webpack');
      if (file.filename.includes('vite')) technologies.push('Vite');
    });
  }

  // Analyze Docker files
  if (projectStructure.dockerFiles && projectStructure.dockerFiles.length > 0) {
    technologies.push('Docker');
  }

  // Analyze Kubernetes files
  if (projectStructure.kubernetesFiles && projectStructure.kubernetesFiles.length > 0) {
    technologies.push('Kubernetes');
  }

  // Analyze CI files
  if (projectStructure.ciFiles && projectStructure.ciFiles.length > 0) {
    technologies.push('CI/CD');
  }

  return [...new Set(technologies)]; // Remove duplicates
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
      category: 'architectural',
    },
    {
      name: 'Layered Architecture',
      description: 'Hierarchical organization of components',
      category: 'architectural',
    },
    {
      name: 'Event-Driven Architecture',
      description: 'Asynchronous communication through events',
      category: 'architectural',
    },
    {
      name: 'Repository Pattern',
      description: 'Data access abstraction pattern',
      category: 'design',
    },
    {
      name: 'Factory Pattern',
      description: 'Object creation abstraction pattern',
      category: 'design',
    },
  ];
}

/**
 * Infer architecture type from project structure
 */
function inferArchitectureType(projectStructure: any): string {
  const directories = projectStructure.directories || [];

  if (directories.some((dir: string) => dir.includes('service') || dir.includes('microservice'))) {
    return 'microservices';
  }
  if (directories.some((dir: string) => dir.includes('layer') || dir.includes('tier'))) {
    return 'layered';
  }
  if (projectStructure.kubernetesFiles?.length > 0 || projectStructure.dockerFiles?.length > 0) {
    return 'cloud-native';
  }
  if (directories.some((dir: string) => dir.includes('component') || dir.includes('module'))) {
    return 'modular';
  }
  return 'monolithic';
}

/**
 * Infer domain type from project structure
 */
function inferDomainType(projectStructure: any): string {
  const technologies = extractTechnologiesFromStructure(projectStructure);

  if (
    technologies.some(
      (tech: string) =>
        tech.toLowerCase().includes('react') ||
        tech.toLowerCase().includes('vue') ||
        tech.toLowerCase().includes('angular')
    )
  ) {
    return 'web-application';
  }
  if (
    technologies.some(
      (tech: string) => tech.toLowerCase().includes('express') || tech.toLowerCase().includes('api')
    )
  ) {
    return 'api-service';
  }
  if (
    technologies.some(
      (tech: string) =>
        tech.toLowerCase().includes('data') || tech.toLowerCase().includes('analytics')
    )
  ) {
    return 'data-platform';
  }
  if (projectStructure.dockerFiles?.length > 0 || projectStructure.kubernetesFiles?.length > 0) {
    return 'infrastructure-platform';
  }
  return 'general-software';
}

/**
 * Infer project scale from project structure
 */
function inferProjectScale(projectStructure: any): string {
  const fileCount = projectStructure.totalFiles || 0;
  const dirCount = projectStructure.directories?.length || 0;

  if (fileCount > 1000 || dirCount > 100) {
    return 'enterprise';
  }
  if (fileCount > 100 || dirCount > 20) {
    return 'medium';
  }
  return 'small';
}
