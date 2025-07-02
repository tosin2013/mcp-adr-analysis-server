/**
 * AI prompts for research question generation
 * Following prompt-driven development approach
 */

/**
 * AI prompt for correlating problems with knowledge graph
 */
export function generateProblemKnowledgeCorrelationPrompt(
  problems: Array<{
    id: string;
    description: string;
    category: string;
    severity: string;
    context: string;
  }>,
  knowledgeGraph: {
    technologies: any[];
    patterns: any[];
    adrs: any[];
    relationships: any[];
  }
): string {
  return `
# Problem-Knowledge Graph Correlation Analysis

Please analyze the following problems and correlate them with the architectural knowledge graph to identify research opportunities and knowledge gaps.

## Identified Problems
${problems.map((problem, index) => `
### Problem ${index + 1}: ${problem.description}
**ID**: ${problem.id}
**Category**: ${problem.category}
**Severity**: ${problem.severity}
**Context**: ${problem.context}
`).join('')}

## Architectural Knowledge Graph
### Technologies
${knowledgeGraph.technologies.map(tech => `- **${tech.name}**: ${tech.description || 'No description'}`).join('\n')}

### Patterns
${knowledgeGraph.patterns.map(pattern => `- **${pattern.name}**: ${pattern.description || 'No description'}`).join('\n')}

### ADRs
${knowledgeGraph.adrs.map(adr => `- **${adr.title}**: ${adr.status}`).join('\n')}

### Relationships
${knowledgeGraph.relationships.map(rel => `- ${rel.source} → ${rel.target} (${rel.type})`).join('\n')}

## Correlation Analysis Requirements

Please identify correlations and research opportunities:

### 🔍 **Problem-Knowledge Correlations**
- **Direct Correlations**: Problems directly related to known technologies/patterns
- **Indirect Correlations**: Problems that may be influenced by architectural decisions
- **Missing Knowledge**: Problems that reveal gaps in the knowledge graph
- **Pattern Conflicts**: Problems caused by conflicting architectural patterns
- **Technology Limitations**: Problems stemming from technology constraints

### 📊 **Knowledge Gap Analysis**
- **Unexplored Technologies**: Technologies mentioned in problems but not in knowledge graph
- **Missing Patterns**: Architectural patterns that could address problems
- **Incomplete ADRs**: Decisions that need more research or documentation
- **Relationship Gaps**: Missing connections between architectural elements
- **Context Deficiencies**: Areas where more contextual knowledge is needed

### 🎯 **Research Opportunity Identification**
- **High-Impact Research**: Research that could solve multiple problems
- **Quick Wins**: Research with immediate applicability
- **Strategic Research**: Long-term research for architectural evolution
- **Risk Mitigation**: Research to address high-severity problems
- **Innovation Opportunities**: Research for competitive advantage

## Output Format

Please provide your analysis in the following JSON format:

\`\`\`json
{
  "correlationAnalysis": {
    "totalProblems": ${problems.length},
    "correlatedProblems": 0,
    "uncorrelatedProblems": 0,
    "knowledgeGraphCoverage": 0.0-1.0,
    "analysisConfidence": 0.0-1.0
  },
  "problemCorrelations": [
    {
      "problemId": "problem-id",
      "problemDescription": "problem description",
      "correlationType": "direct|indirect|missing|conflict|limitation",
      "relatedKnowledge": [
        {
          "type": "technology|pattern|adr|relationship",
          "name": "knowledge element name",
          "relevance": 0.0-1.0,
          "relationship": "causes|affects|solves|relates_to"
        }
      ],
      "knowledgeGaps": [
        "specific knowledge gaps identified"
      ],
      "researchOpportunities": [
        "specific research opportunities"
      ]
    }
  ],
  "knowledgeGaps": [
    {
      "gapType": "technology|pattern|decision|relationship|context",
      "description": "detailed gap description",
      "impact": "low|medium|high|critical",
      "relatedProblems": ["problem-ids"],
      "suggestedResearch": "specific research suggestion",
      "priority": "low|medium|high|critical"
    }
  ],
  "researchOpportunities": [
    {
      "id": "research-opportunity-id",
      "title": "research opportunity title",
      "description": "detailed description",
      "category": "technology|architecture|performance|security|process",
      "impact": "low|medium|high|critical",
      "effort": "low|medium|high",
      "timeline": "short_term|medium_term|long_term",
      "addressedProblems": ["problem-ids"],
      "requiredKnowledge": ["knowledge areas needed"],
      "expectedOutcomes": ["expected research outcomes"],
      "priority": "low|medium|high|critical"
    }
  ],
  "recommendations": [
    {
      "type": "immediate|short_term|long_term",
      "recommendation": "specific recommendation",
      "rationale": "why this recommendation is important",
      "expectedBenefit": "expected benefit",
      "implementation": "how to implement"
    }
  ]
}
\`\`\`

## Analysis Guidelines

1. **Systematic Correlation**: Analyze each problem against all knowledge elements
2. **Gap Identification**: Clearly identify what knowledge is missing
3. **Priority Assessment**: Rank research opportunities by impact and feasibility
4. **Actionable Insights**: Provide specific, implementable research suggestions
5. **Evidence-Based**: Base correlations on clear evidence and reasoning

Please provide comprehensive problem-knowledge correlation analysis.
`;
}

/**
 * AI prompt for finding relevant ADRs and patterns
 */
export function generateRelevantAdrPatternPrompt(
  researchContext: {
    topic: string;
    category: string;
    scope: string;
    objectives: string[];
  },
  availableAdrs: Array<{
    id: string;
    title: string;
    content: string;
    status: string;
  }>,
  availablePatterns: Array<{
    name: string;
    description: string;
    category: string;
  }>
): string {
  return `
# Relevant ADR and Pattern Discovery

Please analyze the research context and identify relevant ADRs and patterns that should inform the research approach.

## Research Context
**Topic**: ${researchContext.topic}
**Category**: ${researchContext.category}
**Scope**: ${researchContext.scope}
**Objectives**: ${researchContext.objectives.join(', ')}

## Available ADRs
${availableAdrs.map((adr, index) => `
### ADR ${index + 1}: ${adr.title}
**ID**: ${adr.id}
**Status**: ${adr.status}
**Content Preview**:
\`\`\`
${adr.content.slice(0, 500)}${adr.content.length > 500 ? '...' : ''}
\`\`\`
`).join('')}

## Available Patterns
${availablePatterns.map((pattern, index) => `
### Pattern ${index + 1}: ${pattern.name}
**Category**: ${pattern.category}
**Description**: ${pattern.description}
`).join('')}

## Relevance Analysis Requirements

Please identify relevant elements for the research:

### 🎯 **ADR Relevance Analysis**
- **Direct Relevance**: ADRs that directly address the research topic
- **Contextual Relevance**: ADRs that provide important context
- **Constraint Relevance**: ADRs that impose constraints on research
- **Outcome Relevance**: ADRs that could be affected by research outcomes
- **Historical Relevance**: ADRs that show evolution of related decisions

### 🔍 **Pattern Relevance Analysis**
- **Applicable Patterns**: Patterns directly applicable to research topic
- **Related Patterns**: Patterns in similar domains or categories
- **Alternative Patterns**: Patterns that offer different approaches
- **Emerging Patterns**: New patterns that could be relevant
- **Anti-Patterns**: Patterns to avoid based on research topic

### 📊 **Research Implications**
- **Research Constraints**: Limitations imposed by existing ADRs/patterns
- **Research Opportunities**: Gaps or improvements identified
- **Research Dependencies**: Prerequisites from existing decisions/patterns
- **Research Conflicts**: Potential conflicts with existing architecture
- **Research Synergies**: Opportunities to leverage existing knowledge

## Output Format

Please provide your analysis in the following JSON format:

\`\`\`json
{
  "relevanceAnalysis": {
    "researchTopic": "${researchContext.topic}",
    "totalAdrsAnalyzed": ${availableAdrs.length},
    "totalPatternsAnalyzed": ${availablePatterns.length},
    "relevantAdrsFound": 0,
    "relevantPatternsFound": 0,
    "analysisConfidence": 0.0-1.0
  },
  "relevantAdrs": [
    {
      "adrId": "adr-id",
      "title": "ADR title",
      "relevanceType": "direct|contextual|constraint|outcome|historical",
      "relevanceScore": 0.0-1.0,
      "relevanceReason": "why this ADR is relevant",
      "researchImplications": [
        "specific implications for research"
      ],
      "keyInsights": [
        "key insights from this ADR"
      ],
      "constraints": [
        "constraints this ADR imposes"
      ],
      "opportunities": [
        "opportunities this ADR reveals"
      ]
    }
  ],
  "relevantPatterns": [
    {
      "patternName": "pattern name",
      "category": "pattern category",
      "relevanceType": "applicable|related|alternative|emerging|anti_pattern",
      "relevanceScore": 0.0-1.0,
      "relevanceReason": "why this pattern is relevant",
      "applicability": "how this pattern applies to research",
      "considerations": [
        "important considerations for this pattern"
      ],
      "adaptations": [
        "how pattern might need to be adapted"
      ]
    }
  ],
  "researchImplications": {
    "constraints": [
      {
        "type": "technical|business|regulatory|architectural",
        "description": "constraint description",
        "source": "ADR or pattern that imposes constraint",
        "impact": "how this affects research approach"
      }
    ],
    "opportunities": [
      {
        "type": "improvement|innovation|optimization|integration",
        "description": "opportunity description",
        "source": "ADR or pattern that reveals opportunity",
        "potential": "potential value of this opportunity"
      }
    ],
    "dependencies": [
      {
        "dependency": "what the research depends on",
        "source": "ADR or pattern that creates dependency",
        "criticality": "low|medium|high|critical"
      }
    ],
    "conflicts": [
      {
        "conflict": "potential conflict description",
        "source": "ADR or pattern that creates conflict",
        "resolution": "suggested conflict resolution approach"
      }
    ]
  },
  "researchGuidance": [
    {
      "guidanceType": "approach|methodology|focus|caution",
      "guidance": "specific guidance for research",
      "rationale": "reasoning behind this guidance",
      "priority": "low|medium|high|critical"
    }
  ]
}
\`\`\`

## Analysis Guidelines

1. **Comprehensive Review**: Analyze all ADRs and patterns for relevance
2. **Relevance Scoring**: Provide quantitative relevance assessments
3. **Implication Analysis**: Clearly identify research implications
4. **Practical Guidance**: Offer actionable research guidance
5. **Conflict Identification**: Identify potential conflicts early
6. **Opportunity Recognition**: Highlight research opportunities

Please provide thorough relevance analysis for informed research planning.
`;
}

/**
 * AI prompt for generating context-aware research questions
 */
export function generateContextAwareResearchQuestionsPrompt(
  researchContext: {
    topic: string;
    category: string;
    objectives: string[];
    constraints: string[];
    timeline: string;
  },
  relevantKnowledge: {
    adrs: any[];
    patterns: any[];
    gaps: any[];
    opportunities: any[];
  },
  projectContext: {
    technologies: string[];
    architecture: string;
    domain: string;
    scale: string;
  }
): string {
  return `
# Context-Aware Research Question Generation

Please generate specific, actionable research questions based on the research context, relevant knowledge, and project context.

## Research Context
**Topic**: ${researchContext.topic}
**Category**: ${researchContext.category}
**Timeline**: ${researchContext.timeline}
**Objectives**: ${researchContext.objectives.join(', ')}
**Constraints**: ${researchContext.constraints.join(', ')}

## Relevant Knowledge
### Relevant ADRs
${relevantKnowledge.adrs.map(adr => `- **${adr.title}**: ${adr.relevanceReason}`).join('\n')}

### Relevant Patterns
${relevantKnowledge.patterns.map(pattern => `- **${pattern.patternName}**: ${pattern.relevanceReason}`).join('\n')}

### Knowledge Gaps
${relevantKnowledge.gaps.map(gap => `- **${gap.description}** (${gap.impact} impact)`).join('\n')}

### Research Opportunities
${relevantKnowledge.opportunities.map(opp => `- **${opp.title}**: ${opp.description}`).join('\n')}

## Project Context
**Technologies**: ${projectContext.technologies.join(', ')}
**Architecture**: ${projectContext.architecture}
**Domain**: ${projectContext.domain}
**Scale**: ${projectContext.scale}

## Research Question Generation Requirements

Please generate research questions in these categories:

### 🎯 **Primary Research Questions**
- **Core Questions**: Fundamental questions that address main objectives
- **Hypothesis Questions**: Questions that can be tested with specific hypotheses
- **Comparative Questions**: Questions comparing different approaches or solutions
- **Evaluation Questions**: Questions about effectiveness or performance
- **Implementation Questions**: Questions about practical implementation

### 🔍 **Secondary Research Questions**
- **Context Questions**: Questions about environmental or situational factors
- **Constraint Questions**: Questions about limitations and boundaries
- **Risk Questions**: Questions about potential risks and mitigation
- **Scalability Questions**: Questions about growth and adaptation
- **Integration Questions**: Questions about system integration

### 📊 **Methodological Questions**
- **Approach Questions**: Questions about research methodology
- **Measurement Questions**: Questions about metrics and evaluation criteria
- **Validation Questions**: Questions about result validation
- **Timeline Questions**: Questions about research phases and milestones
- **Resource Questions**: Questions about required resources and expertise

## Output Format

Please provide your research questions in the following JSON format:

\`\`\`json
{
  "researchQuestionGeneration": {
    "researchTopic": "${researchContext.topic}",
    "generatedAt": "ISO-8601-timestamp",
    "totalQuestions": 0,
    "questionCategories": 0,
    "contextAlignment": 0.0-1.0,
    "actionability": 0.0-1.0
  },
  "primaryQuestions": [
    {
      "id": "question-id",
      "question": "specific research question",
      "type": "core|hypothesis|comparative|evaluation|implementation",
      "priority": "critical|high|medium|low",
      "complexity": "low|medium|high",
      "timeline": "short_term|medium_term|long_term",
      "objectives": ["objectives this question addresses"],
      "hypothesis": "testable hypothesis (if applicable)",
      "expectedOutcome": "expected research outcome",
      "successCriteria": ["criteria for successful answer"],
      "relatedKnowledge": ["relevant ADRs, patterns, or gaps"],
      "methodology": "suggested research methodology",
      "resources": ["required resources or expertise"],
      "risks": ["potential research risks"],
      "dependencies": ["dependencies on other questions or research"]
    }
  ],
  "secondaryQuestions": [
    {
      "id": "question-id",
      "question": "specific research question",
      "type": "context|constraint|risk|scalability|integration",
      "priority": "high|medium|low",
      "complexity": "low|medium|high",
      "timeline": "short_term|medium_term|long_term",
      "relatedPrimary": ["primary question IDs this supports"],
      "context": "why this question is important",
      "approach": "suggested approach to answer",
      "deliverables": ["expected deliverables"]
    }
  ],
  "methodologicalQuestions": [
    {
      "id": "question-id",
      "question": "specific research question",
      "type": "approach|measurement|validation|timeline|resource",
      "importance": "critical|high|medium|low",
      "phase": "planning|execution|validation|reporting",
      "guidance": "guidance for addressing this question",
      "considerations": ["important considerations"]
    }
  ],
  "researchPlan": {
    "phases": [
      {
        "phase": "phase name",
        "duration": "estimated duration",
        "questions": ["question IDs for this phase"],
        "deliverables": ["expected deliverables"],
        "milestones": ["key milestones"],
        "dependencies": ["dependencies for this phase"]
      }
    ],
    "criticalPath": ["question IDs on critical path"],
    "parallelTracks": [
      {
        "track": "track name",
        "questions": ["question IDs that can be researched in parallel"]
      }
    ],
    "riskMitigation": [
      {
        "risk": "identified research risk",
        "mitigation": "mitigation strategy",
        "contingency": "contingency plan"
      }
    ]
  },
  "qualityAssurance": {
    "validationApproach": "how to validate research results",
    "peerReview": "peer review strategy",
    "documentation": "documentation requirements",
    "knowledgeSharing": "knowledge sharing plan"
  },
  "expectedImpact": {
    "immediateImpact": "immediate benefits from research",
    "longTermImpact": "long-term benefits",
    "architecturalImpact": "impact on architecture",
    "businessImpact": "business value created",
    "riskReduction": "risks mitigated by research"
  }
}
\`\`\`

## Question Generation Guidelines

1. **Specific and Actionable**: Questions should be specific enough to guide research
2. **Context-Aware**: Questions should reflect project and architectural context
3. **Testable**: Questions should be answerable through research methods
4. **Prioritized**: Questions should be ranked by importance and impact
5. **Interconnected**: Questions should build on each other logically
6. **Realistic**: Questions should be achievable within constraints

Please generate comprehensive, context-aware research questions.
`;
}

/**
 * AI prompt for research task tracking and management
 */
export function generateResearchTaskTrackingPrompt(
  researchQuestions: Array<{
    id: string;
    question: string;
    type: string;
    priority: string;
    timeline: string;
    methodology: string;
  }>,
  currentProgress?: Array<{
    questionId: string;
    status: string;
    progress: number;
    findings: string[];
    blockers: string[];
  }>
): string {
  return `
# Research Task Tracking and Management

Please analyze the research questions and current progress to create a comprehensive research task tracking system.

## Research Questions
${researchQuestions.map((q, index) => `
### Question ${index + 1}: ${q.question}
**ID**: ${q.id}
**Type**: ${q.type}
**Priority**: ${q.priority}
**Timeline**: ${q.timeline}
**Methodology**: ${q.methodology}
`).join('')}

${currentProgress ? `## Current Progress
${currentProgress.map((p, index) => `
### Progress ${index + 1}: ${p.questionId}
**Status**: ${p.status}
**Progress**: ${p.progress}%
**Findings**: ${p.findings.join(', ')}
**Blockers**: ${p.blockers.join(', ')}
`).join('')}` : ''}

## Task Tracking Requirements

Please create a comprehensive tracking system:

### 📋 **Task Breakdown**
- **Research Tasks**: Specific tasks for each research question
- **Subtasks**: Detailed subtasks with clear deliverables
- **Dependencies**: Task dependencies and sequencing
- **Milestones**: Key milestones and checkpoints
- **Deliverables**: Expected outputs for each task

### 📊 **Progress Tracking**
- **Status Tracking**: Current status of each task
- **Progress Metrics**: Quantitative progress measurements
- **Timeline Tracking**: Actual vs. planned timelines
- **Resource Utilization**: Resource allocation and usage
- **Quality Metrics**: Quality indicators and assessments

### 🎯 **Management Framework**
- **Priority Management**: Dynamic priority adjustment
- **Risk Management**: Risk identification and mitigation
- **Blocker Resolution**: Blocker identification and resolution
- **Communication Plan**: Progress reporting and updates
- **Decision Points**: Key decision points and criteria

## Output Format

Please provide your tracking system in the following JSON format:

\`\`\`json
{
  "researchTaskTracking": {
    "projectName": "Research Task Tracking",
    "createdAt": "ISO-8601-timestamp",
    "totalQuestions": ${researchQuestions.length},
    "totalTasks": 0,
    "estimatedDuration": "estimated total duration",
    "trackingVersion": "1.0"
  },
  "researchTasks": [
    {
      "taskId": "task-id",
      "questionId": "related question ID",
      "taskName": "specific task name",
      "description": "detailed task description",
      "type": "literature_review|experiment|analysis|prototype|validation",
      "priority": "critical|high|medium|low",
      "status": "not_started|in_progress|blocked|completed|cancelled",
      "progress": 0-100,
      "estimatedEffort": "estimated effort in hours/days",
      "actualEffort": "actual effort spent",
      "startDate": "planned start date",
      "endDate": "planned end date",
      "actualStartDate": "actual start date",
      "actualEndDate": "actual end date",
      "assignee": "responsible person",
      "dependencies": ["task IDs this depends on"],
      "blockers": [
        {
          "blocker": "blocker description",
          "severity": "low|medium|high|critical",
          "resolution": "resolution approach",
          "owner": "responsible for resolution"
        }
      ],
      "deliverables": [
        {
          "deliverable": "deliverable name",
          "type": "document|prototype|analysis|presentation",
          "status": "not_started|in_progress|completed",
          "dueDate": "deliverable due date"
        }
      ],
      "resources": [
        {
          "resource": "required resource",
          "type": "person|tool|data|access",
          "status": "available|requested|unavailable"
        }
      ],
      "findings": [
        {
          "finding": "research finding",
          "confidence": 0.0-1.0,
          "impact": "low|medium|high|critical",
          "date": "finding date"
        }
      ],
      "notes": [
        {
          "note": "progress note",
          "date": "note date",
          "author": "note author"
        }
      ]
    }
  ],
  "milestones": [
    {
      "milestoneId": "milestone-id",
      "name": "milestone name",
      "description": "milestone description",
      "targetDate": "target completion date",
      "actualDate": "actual completion date",
      "status": "upcoming|in_progress|completed|delayed",
      "criteria": ["completion criteria"],
      "relatedTasks": ["task IDs"],
      "deliverables": ["milestone deliverables"]
    }
  ],
  "riskManagement": [
    {
      "riskId": "risk-id",
      "risk": "risk description",
      "category": "technical|resource|timeline|quality|external",
      "probability": "low|medium|high",
      "impact": "low|medium|high|critical",
      "mitigation": "mitigation strategy",
      "contingency": "contingency plan",
      "owner": "risk owner",
      "status": "identified|mitigating|resolved|realized"
    }
  ],
  "progressMetrics": {
    "overallProgress": 0-100,
    "completedTasks": 0,
    "inProgressTasks": 0,
    "blockedTasks": 0,
    "onTrackTasks": 0,
    "delayedTasks": 0,
    "budgetUtilization": 0.0-1.0,
    "qualityScore": 0.0-1.0
  },
  "communicationPlan": {
    "reportingFrequency": "daily|weekly|biweekly|monthly",
    "stakeholders": [
      {
        "stakeholder": "stakeholder name",
        "role": "stakeholder role",
        "reportingLevel": "summary|detailed|full"
      }
    ],
    "reportingFormat": "dashboard|document|presentation|meeting",
    "escalationCriteria": ["criteria for escalation"],
    "communicationChannels": ["communication methods"]
  },
  "qualityAssurance": {
    "reviewProcess": "peer review process",
    "validationCriteria": ["validation criteria"],
    "documentationStandards": "documentation requirements",
    "knowledgeCapture": "knowledge capture approach"
  },
  "recommendations": [
    {
      "type": "process|resource|timeline|quality",
      "recommendation": "specific recommendation",
      "rationale": "reasoning behind recommendation",
      "implementation": "how to implement",
      "priority": "critical|high|medium|low"
    }
  ]
}
\`\`\`

## Tracking Guidelines

1. **Comprehensive Coverage**: Track all aspects of research progress
2. **Actionable Metrics**: Use metrics that drive action and decisions
3. **Regular Updates**: Design for frequent progress updates
4. **Risk Awareness**: Proactively identify and manage risks
5. **Quality Focus**: Maintain quality standards throughout research
6. **Communication**: Ensure effective stakeholder communication

Please create a comprehensive research task tracking and management system.
`;
}
