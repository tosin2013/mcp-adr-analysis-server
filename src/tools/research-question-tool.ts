/**
 * MCP Tool for research question generation
 * Implements prompt-driven research question generation and task tracking
 */

import { McpAdrError } from '../types/index.js';

/**
 * Generate research questions and create research tracking system
 */
export async function generateResearchQuestions(args: {
  analysisType?: 'correlation' | 'relevance' | 'questions' | 'tracking' | 'comprehensive';
  researchContext?: {
    topic: string;
    category: string;
    scope: string;
    objectives: string[];
    constraints?: string[];
    timeline?: string;
  };
  problems?: Array<{
    id: string;
    description: string;
    category: string;
    severity: string;
    context: string;
  }>;
  knowledgeGraph?: {
    technologies: any[];
    patterns: any[];
    adrs: any[];
    relationships: any[];
  };
  relevantKnowledge?: {
    adrs: any[];
    patterns: any[];
    gaps: any[];
    opportunities: any[];
  };
  researchQuestions?: Array<{
    id: string;
    question: string;
    type: string;
    priority: string;
    timeline: string;
    methodology: string;
  }>;
  currentProgress?: Array<{
    questionId: string;
    status: string;
    progress: number;
    findings: string[];
    blockers: string[];
  }>;
  projectPath?: string;
  adrDirectory?: string;
}): Promise<any> {
  const {
    analysisType = 'comprehensive',
    researchContext,
    problems,
    knowledgeGraph,
    relevantKnowledge,
    researchQuestions,
    currentProgress,
    projectPath = process.cwd(),
    adrDirectory = 'docs/adrs',
  } = args;

  try {
    const {
      correlateProblemKnowledge,
      findRelevantAdrPatterns,
      generateContextAwareQuestions,
      createResearchTaskTracking,
    } = await import('../utils/research-questions.js');

    switch (analysisType) {
      case 'correlation': {
        if (!problems || !knowledgeGraph) {
          throw new McpAdrError(
            'Problems and knowledge graph are required for correlation analysis',
            'INVALID_INPUT'
          );
        }

        const result = await correlateProblemKnowledge(problems, knowledgeGraph);

        return {
          content: [
            {
              type: 'text',
              text: `# Problem-Knowledge Correlation Analysis

${result.instructions}

## AI Correlation Prompt

${result.correlationPrompt}

## Next Steps

1. **Submit the prompt** to an AI agent for comprehensive correlation analysis
2. **Parse the JSON response** to get problem-knowledge correlations and research opportunities
3. **Review knowledge gaps** and prioritize research areas
4. **Use findings** to generate targeted research questions

## Expected Output

The AI will provide:
- **Correlation Analysis**: Statistical analysis of problem-knowledge relationships
- **Problem Correlations**: Detailed mapping of problems to knowledge elements
- **Knowledge Gaps**: Identified gaps in the architectural knowledge graph
- **Research Opportunities**: Prioritized opportunities for research investigation
- **Recommendations**: Actionable recommendations for research planning

## Research Planning Benefits

This correlation analysis enables:
- **Targeted Research**: Focus research on areas with highest impact
- **Gap Identification**: Discover missing knowledge areas
- **Priority Setting**: Rank research opportunities by importance
- **Resource Optimization**: Allocate research resources effectively
- **Risk Mitigation**: Address high-severity problems through research
`,
            },
          ],
        };
      }

      case 'relevance': {
        // Provide intelligent defaults if researchContext is missing
        const defaultResearchContext = {
          topic: 'Architectural Relevance Analysis',
          category: 'architecture',
          scope: 'project',
          objectives: ['Identify relevant architectural patterns and decisions'],
          constraints: [],
          timeline: 'Not specified'
        };

        const effectiveResearchContext = researchContext || defaultResearchContext;

        if (!researchContext) {
          console.warn('[WARN] No researchContext provided for relevance analysis. Using intelligent defaults.');
        }

        const result = await findRelevantAdrPatterns(
          {
            ...effectiveResearchContext,
            constraints: effectiveResearchContext.constraints || [],
            timeline: effectiveResearchContext.timeline || 'Not specified',
          },
          adrDirectory
        );

        return {
          content: [
            {
              type: 'text',
              text: `# Relevant ADR and Pattern Discovery

${result.instructions}

## AI Relevance Prompt

${result.relevancePrompt}

## Next Steps

1. **Submit the prompt** to an AI agent for relevance analysis
2. **Parse the JSON response** to get relevant ADRs and patterns
3. **Review research implications** and constraints
4. **Use findings** to inform research question generation

## Expected Output

The AI will provide:
- **Relevance Analysis**: Statistical analysis of ADR and pattern relevance
- **Relevant ADRs**: ADRs that directly or indirectly relate to research context
- **Relevant Patterns**: Architectural patterns applicable to the research
- **Research Implications**: Constraints, opportunities, dependencies, and conflicts
- **Research Guidance**: Specific guidance for research approach and methodology

## Research Context Benefits

This relevance analysis provides:
- **Informed Research**: Research grounded in existing architectural decisions
- **Constraint Awareness**: Understanding of limitations and boundaries
- **Opportunity Recognition**: Identification of improvement opportunities
- **Conflict Avoidance**: Early identification of potential conflicts
- **Knowledge Leverage**: Building on existing architectural knowledge
`,
            },
          ],
        };
      }

      case 'questions': {
        // Provide intelligent defaults if researchContext is missing
        const defaultResearchContext = {
          topic: 'Architectural Question Generation',
          category: 'architecture',
          scope: 'project',
          objectives: ['Generate relevant research questions for architectural analysis'],
          constraints: [],
          timeline: 'Not specified'
        };

        const effectiveResearchContext = researchContext || defaultResearchContext;

        if (!researchContext) {
          console.warn('[WARN] No researchContext provided for question generation. Using intelligent defaults.');
        }

        if (!relevantKnowledge) {
          throw new McpAdrError(
            'Relevant knowledge is required for question generation. Please run relevance analysis first.',
            'INVALID_INPUT'
          );
        }

        const result = await generateContextAwareQuestions(
          {
            ...effectiveResearchContext,
            constraints: effectiveResearchContext.constraints || [],
            timeline: effectiveResearchContext.timeline || 'Not specified',
          },
          relevantKnowledge,
          projectPath
        );

        return {
          content: [
            {
              type: 'text',
              text: `# Context-Aware Research Question Generation

${result.instructions}

## AI Question Generation Prompt

${result.questionPrompt}

## Next Steps

1. **Submit the prompt** to an AI agent for comprehensive question generation
2. **Parse the JSON response** to get structured research questions and plan
3. **Review research plan** and prioritize questions
4. **Create research tasks** using the task tracking system

## Expected Output

The AI will provide:
- **Research Question Generation**: Metadata and quality metrics for generated questions
- **Primary Questions**: Core research questions with detailed specifications
- **Secondary Questions**: Supporting questions for comprehensive coverage
- **Methodological Questions**: Questions about research approach and methodology
- **Research Plan**: Phased research plan with timelines and dependencies
- **Quality Assurance**: Quality control and validation approach
- **Expected Impact**: Anticipated benefits and outcomes of the research

## Research Excellence

This question generation ensures:
- **Comprehensive Coverage**: All aspects of research topic addressed
- **Actionable Questions**: Questions that can be answered through research
- **Context Awareness**: Questions tailored to project and architectural context
- **Priority Guidance**: Clear prioritization for research execution
- **Quality Standards**: Built-in quality assurance and validation
`,
            },
          ],
        };
      }

      case 'tracking': {
        if (!researchQuestions) {
          throw new McpAdrError(
            'Research questions are required for task tracking',
            'INVALID_INPUT'
          );
        }

        const result = await createResearchTaskTracking(
          researchQuestions.map(q => ({
            ...q,
            complexity: 'medium',
            expectedOutcome: 'Research findings and recommendations',
            successCriteria: ['Clear findings documented', 'Recommendations provided'],
            relatedKnowledge: [],
            resources: [],
            risks: [],
            dependencies: [],
          })),
          currentProgress
        );

        return {
          content: [
            {
              type: 'text',
              text: `# Research Task Tracking System

${result.instructions}

## AI Tracking Prompt

${result.trackingPrompt}

## Next Steps

1. **Submit the prompt** to an AI agent for tracking system creation
2. **Parse the JSON response** to get comprehensive tracking system
3. **Implement tracking** in project management tools
4. **Begin research execution** with regular progress updates

## Expected Output

The AI will provide:
- **Research Task Tracking**: Overall tracking metadata and configuration
- **Research Tasks**: Detailed tasks with progress tracking and dependencies
- **Milestones**: Key milestones and checkpoints for research phases
- **Risk Management**: Risk identification and mitigation strategies
- **Progress Metrics**: Quantitative progress measurements and KPIs
- **Communication Plan**: Stakeholder communication and reporting framework
- **Quality Assurance**: Quality control and validation processes
- **Recommendations**: Process and management improvement recommendations

## Research Management

This tracking system enables:
- **Progress Monitoring**: Real-time visibility into research progress
- **Risk Management**: Proactive identification and mitigation of risks
- **Resource Planning**: Effective allocation and utilization of resources
- **Quality Control**: Consistent quality standards and validation
- **Stakeholder Communication**: Regular updates and transparent reporting
`,
            },
          ],
        };
      }

      case 'comprehensive': {
        // Provide intelligent defaults if researchContext is missing
        const defaultResearchContext = {
          topic: 'General Architectural Research',
          category: 'architecture',
          scope: 'project',
          objectives: [
            'Identify architectural patterns and best practices',
            'Analyze current system design decisions',
            'Discover improvement opportunities',
            'Evaluate technology choices and alternatives'
          ],
          constraints: ['Time and resource limitations'],
          timeline: 'Not specified'
        };

        const effectiveResearchContext = researchContext || defaultResearchContext;

        // Log warning if using defaults
        if (!researchContext) {
          console.warn('[WARN] No researchContext provided for comprehensive analysis. Using intelligent defaults.');
        }

        // Generate all components for comprehensive research planning
        const relevanceResult = await findRelevantAdrPatterns(
          {
            ...effectiveResearchContext,
            constraints: effectiveResearchContext.constraints || [],
            timeline: effectiveResearchContext.timeline || 'Not specified',
          },
          adrDirectory
        );

        return {
          content: [
            {
              type: 'text',
              text: `# Comprehensive Research Question Generation

This comprehensive analysis will generate a complete research planning system with questions, tracking, and management.

## Research Context
**Topic**: ${effectiveResearchContext.topic}
**Category**: ${effectiveResearchContext.category}
**Scope**: ${effectiveResearchContext.scope}
**Objectives**: ${effectiveResearchContext.objectives.join(', ')}
**Timeline**: ${effectiveResearchContext.timeline || 'Not specified'}
${!researchContext ? '\n**Note**: Using intelligent defaults as no research context was provided.' : ''}

## Comprehensive Workflow

### 1. **Relevance Analysis** (First Step)
Identify relevant ADRs and patterns for the research context.

${relevanceResult.instructions}

#### Relevance Analysis Prompt
${relevanceResult.relevancePrompt}

### 2. **Research Question Generation** (Second Step)
Generate context-aware research questions based on relevance analysis:
\`\`\`json
{
  "tool": "generate_research_questions",
  "args": {
    "analysisType": "questions",
    "researchContext": ${JSON.stringify(effectiveResearchContext)},
    "relevantKnowledge": [results from step 1],
    "projectPath": "${projectPath}"
  }
}
\`\`\`

### 3. **Task Tracking System** (Third Step)
Create comprehensive task tracking for research execution:
\`\`\`json
{
  "tool": "generate_research_questions",
  "args": {
    "analysisType": "tracking",
    "researchQuestions": [results from step 2]
  }
}
\`\`\`

### 4. **Problem Correlation** (Optional Fourth Step)
If problems are identified, correlate them with knowledge graph:
\`\`\`json
{
  "tool": "generate_research_questions",
  "args": {
    "analysisType": "correlation",
    "problems": [identified problems],
    "knowledgeGraph": [project knowledge graph]
  }
}
\`\`\`

## Expected Outcomes

This comprehensive approach will provide:
- **Complete Research Framework**: End-to-end research planning and execution
- **Context-Aware Questions**: Questions tailored to project and architectural context
- **Systematic Tracking**: Comprehensive task and progress management
- **Quality Assurance**: Built-in quality control and validation
- **Risk Management**: Proactive risk identification and mitigation
- **Stakeholder Communication**: Clear reporting and communication framework

## Research Excellence Standards

All generated research components follow these principles:
- **Evidence-Based**: Grounded in architectural decisions and project context
- **Actionable**: Questions and tasks that can be executed effectively
- **Measurable**: Clear success criteria and progress metrics
- **Prioritized**: Ranked by impact, effort, and strategic importance
- **Quality-Focused**: Built-in quality assurance and validation processes

## Implementation Guidance

1. **Start with Relevance**: Understand existing architectural context
2. **Generate Questions**: Create comprehensive, actionable research questions
3. **Plan Execution**: Develop detailed task tracking and management
4. **Monitor Progress**: Use tracking system for regular progress updates
5. **Ensure Quality**: Apply quality assurance throughout research process
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
      `Failed to generate research questions: ${error instanceof Error ? error.message : String(error)}`,
      'RESEARCH_QUESTION_ERROR'
    );
  }
}
