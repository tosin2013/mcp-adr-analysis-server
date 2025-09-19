/**
 * Interactive ADR Planning Tool - Guided ADR Creation and Planning
 *
 * Provides an interactive, conversational approach to ADR planning that:
 * - Guides users through structured decision-making process
 * - Integrates research capabilities for informed decisions
 * - Generates ADR content progressively with user feedback
 * - Updates TODO items based on ADR decisions
 * - Orchestrates other MCP tools for comprehensive planning
 *
 * Key Features:
 * - Multi-step wizard for ADR creation
 * - Context-aware research integration
 * - Decision impact analysis
 * - Automatic TODO generation from decisions
 * - ADR template customization
 * - Decision rationale capture
 *
 * Workflow Phases:
 * 1. Problem Definition - Clarify the architectural challenge
 * 2. Research & Analysis - Gather relevant information
 * 3. Option Exploration - Identify and evaluate alternatives
 * 4. Decision Making - Select approach with rationale
 * 5. Impact Assessment - Analyze consequences and risks
 * 6. Implementation Planning - Generate TODOs and timeline
 * 7. ADR Generation - Create structured ADR document
 *
 * Integration Points:
 * - Research tools for context gathering
 * - Analysis tools for impact assessment
 * - TODO management for task generation
 * - ADR generation for document creation
 * - Project planning for timeline integration
 */

import { z } from 'zod';
import { promises as fs } from 'fs';
import { join, basename } from 'path';
import * as os from 'os';
import { McpAdrError } from '../types/index.js';

// Planning session schema
const PlanningSessionSchema = z.object({
  sessionId: z.string(),
  phase: z.enum([
    'problem_definition',
    'research_analysis',
    'option_exploration',
    'decision_making',
    'impact_assessment',
    'implementation_planning',
    'adr_generation',
    'completed',
  ]),
  context: z.object({
    projectPath: z.string(),
    adrDirectory: z.string().default('docs/adrs'),
    problemStatement: z.string().optional(),
    researchFindings: z
      .array(
        z.object({
          source: z.string(),
          insight: z.string(),
          relevance: z.string(),
        })
      )
      .default([]),
    options: z
      .array(
        z.object({
          name: z.string(),
          description: z.string(),
          pros: z.array(z.string()),
          cons: z.array(z.string()),
          risks: z.array(z.string()),
          effort: z.enum(['low', 'medium', 'high']),
          confidence: z.number().min(0).max(100),
        })
      )
      .default([]),
    selectedOption: z
      .object({
        name: z.string(),
        rationale: z.string(),
        tradeoffs: z.array(z.string()),
      })
      .optional(),
    impacts: z
      .object({
        technical: z.array(z.string()).default([]),
        business: z.array(z.string()).default([]),
        team: z.array(z.string()).default([]),
        risks: z.array(z.string()).default([]),
        dependencies: z.array(z.string()).default([]),
      })
      .optional(),
    implementation: z
      .object({
        phases: z.array(z.string()).default([]),
        tasks: z
          .array(
            z.object({
              description: z.string(),
              priority: z.enum(['low', 'medium', 'high', 'critical']),
              effort: z.string(),
              assignee: z.string().optional(),
            })
          )
          .default([]),
        timeline: z.string().optional(),
        successCriteria: z.array(z.string()).default([]),
      })
      .optional(),
    adrContent: z.string().optional(),
  }),
  metadata: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    lastAction: z.string(),
    nextSteps: z.array(z.string()).default([]),
  }),
});

// Input schema for tool operations
const InteractiveAdrPlanningSchema = z.object({
  operation: z.enum([
    'start_session',
    'continue_session',
    'provide_input',
    'request_research',
    'evaluate_options',
    'make_decision',
    'assess_impact',
    'plan_implementation',
    'generate_adr',
    'update_todos',
    'get_guidance',
    'save_session',
    'complete_session',
  ]),
  sessionId: z.string().optional(),
  input: z.any().optional(),
  projectPath: z.string(),
  autoResearch: z.boolean().default(true).describe('Automatically trigger research when needed'),
  generateTodos: z
    .boolean()
    .default(true)
    .describe('Automatically generate TODO items from decisions'),
});

type PlanningSession = z.infer<typeof PlanningSessionSchema>;
type InteractiveAdrPlanningInput = z.infer<typeof InteractiveAdrPlanningSchema>;

// Session storage
const sessions = new Map<string, PlanningSession>();

/**
 * Get or create cache directory
 */
async function getCacheDir(projectPath: string): Promise<string> {
  const projectName = basename(projectPath);
  const cacheDir = join(os.tmpdir(), projectName, 'cache');
  await fs.mkdir(cacheDir, { recursive: true });
  return cacheDir;
}

/**
 * Save session to cache
 */
async function saveSession(session: PlanningSession): Promise<void> {
  const cacheDir = await getCacheDir(session.context.projectPath);
  const sessionFile = join(cacheDir, `adr-planning-session-${session.sessionId}.json`);
  await fs.writeFile(sessionFile, JSON.stringify(session, null, 2));
}

/**
 * Load session from cache
 */
async function loadSession(
  projectPath: string,
  sessionId: string
): Promise<PlanningSession | null> {
  try {
    const cacheDir = await getCacheDir(projectPath);
    const sessionFile = join(cacheDir, `adr-planning-session-${sessionId}.json`);
    const data = await fs.readFile(sessionFile, 'utf-8');
    return PlanningSessionSchema.parse(JSON.parse(data));
  } catch {
    return null;
  }
}

/**
 * Start a new planning session
 */
async function startSession(args: InteractiveAdrPlanningInput): Promise<any> {
  const sessionId = `adr-${Date.now()}`;
  const session: PlanningSession = {
    sessionId,
    phase: 'problem_definition',
    context: {
      projectPath: args.projectPath,
      adrDirectory: 'docs/adrs',
      researchFindings: [],
      options: [],
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAction: 'Session started',
      nextSteps: [
        'Define the architectural problem or decision point',
        'Identify key stakeholders and constraints',
        'Determine success criteria',
      ],
    },
  };

  sessions.set(sessionId, session);
  await saveSession(session);

  return {
    success: true,
    sessionId,
    phase: session.phase,
    guidance: `# ADR Planning Session Started

Welcome to the interactive ADR planning process. Let's start by defining the problem.

## Current Phase: Problem Definition

Please provide:
1. **What architectural decision needs to be made?**
2. **Why is this decision necessary now?**
3. **What are the key constraints?**
4. **Who are the stakeholders?**
5. **What would success look like?**

### Next Steps:
${session.metadata.nextSteps.map(step => `- ${step}`).join('\n')}

Use \`provide_input\` with your problem statement to continue.`,
    nextAction: 'provide_input',
  };
}

/**
 * Continue an existing session
 */
async function continueSession(args: InteractiveAdrPlanningInput): Promise<any> {
  if (!args.sessionId) {
    throw new McpAdrError('Session ID required to continue session', 'INVALID_INPUT');
  }

  let session = sessions.get(args.sessionId);
  if (!session) {
    const loadedSession = await loadSession(args.projectPath, args.sessionId);
    if (!loadedSession) {
      throw new McpAdrError(`Session ${args.sessionId} not found`, 'SESSION_NOT_FOUND');
    }
    session = loadedSession;
    sessions.set(args.sessionId, session);
  }

  const phaseGuidance: Record<string, string> = {
    problem_definition: 'Define the architectural problem and constraints',
    research_analysis: 'Research existing solutions and gather context',
    option_exploration: 'Identify and evaluate alternative approaches',
    decision_making: 'Select the best option with clear rationale',
    impact_assessment: 'Analyze the impacts and risks of the decision',
    implementation_planning: 'Plan the implementation with tasks and timeline',
    adr_generation: 'Generate the final ADR document',
    completed: 'Session completed - ADR has been generated',
  };

  return {
    success: true,
    sessionId: args.sessionId,
    phase: session.phase,
    context: session.context,
    guidance: phaseGuidance[session.phase],
    nextSteps: session.metadata.nextSteps,
    progress: getSessionProgress(session),
  };
}

/**
 * Process user input based on current phase
 */
async function provideInput(args: InteractiveAdrPlanningInput): Promise<any> {
  if (!args.sessionId) {
    throw new McpAdrError('Session ID required', 'INVALID_INPUT');
  }

  const session = sessions.get(args.sessionId);
  if (!session) {
    throw new McpAdrError(`Session ${args.sessionId} not found`, 'SESSION_NOT_FOUND');
  }

  let response: any = { success: true, sessionId: args.sessionId };

  switch (session.phase) {
    case 'problem_definition':
      response = await handleProblemDefinition(session, args.input);
      break;
    case 'research_analysis':
      response = await handleResearchAnalysis(session, args.input);
      break;
    case 'option_exploration':
      response = await handleOptionExploration(session, args.input);
      break;
    case 'decision_making':
      response = await handleDecisionMaking(session, args.input);
      break;
    case 'impact_assessment':
      response = await handleImpactAssessment(session, args.input);
      break;
    case 'implementation_planning':
      response = await handleImplementationPlanning(session, args.input);
      break;
    case 'adr_generation':
      response = await handleAdrGeneration(session, args.input);
      break;
    default:
      throw new McpAdrError(`Invalid phase: ${session.phase}`, 'INVALID_PHASE');
  }

  session.metadata.updatedAt = new Date().toISOString();
  await saveSession(session);

  return response;
}

/**
 * Handle problem definition phase
 */
async function handleProblemDefinition(session: PlanningSession, input: any): Promise<any> {
  session.context.problemStatement = input.problemStatement || input;
  session.phase = 'research_analysis';
  session.metadata.lastAction = 'Problem defined';
  session.metadata.nextSteps = [
    'Research existing solutions',
    'Analyze current architecture',
    'Identify relevant patterns and practices',
  ];

  return {
    success: true,
    sessionId: session.sessionId,
    phase: session.phase,
    guidance: `# Problem Defined

**Problem Statement:** ${session.context.problemStatement}

## Next Phase: Research & Analysis

I'll help you research this topic. We can:
1. Search for existing solutions and patterns
2. Analyze your current codebase for context
3. Research industry best practices
4. Identify relevant architectural patterns

Would you like me to:
- Automatically research this topic? (use \`request_research\`)
- Or provide your own research findings? (use \`provide_input\` with findings)`,
    nextAction: 'request_research',
    autoResearch: true,
  };
}

/**
 * Handle research analysis phase
 */
async function handleResearchAnalysis(session: PlanningSession, input: any): Promise<any> {
  if (input.researchFindings) {
    session.context.researchFindings = input.researchFindings;
  }

  session.phase = 'option_exploration';
  session.metadata.lastAction = 'Research completed';
  session.metadata.nextSteps = [
    'Identify possible solutions',
    'Evaluate pros and cons',
    'Assess implementation effort',
  ];

  return {
    success: true,
    sessionId: session.sessionId,
    phase: session.phase,
    researchSummary: session.context.researchFindings,
    guidance: `# Research Complete

## Key Findings:
${session.context.researchFindings.map(f => `- **${f.source}**: ${f.insight}`).join('\n')}

## Next Phase: Option Exploration

Based on the research, let's identify and evaluate different approaches.

Please provide options in this format:
\`\`\`json
{
  "options": [
    {
      "name": "Option Name",
      "description": "What this approach involves",
      "pros": ["Advantage 1", "Advantage 2"],
      "cons": ["Disadvantage 1", "Disadvantage 2"],
      "risks": ["Risk 1", "Risk 2"],
      "effort": "medium",
      "confidence": 75
    }
  ]
}
\`\`\`

Or use \`evaluate_options\` to have me help generate options based on the research.`,
    nextAction: 'evaluate_options',
  };
}

/**
 * Handle option exploration phase
 */
async function handleOptionExploration(session: PlanningSession, input: any): Promise<any> {
  if (input.options) {
    session.context.options = input.options;
  }

  session.phase = 'decision_making';
  session.metadata.lastAction = 'Options evaluated';
  session.metadata.nextSteps = [
    'Compare options against criteria',
    'Select best approach',
    'Document rationale',
  ];

  const optionComparison = session.context.options
    .map(
      opt =>
        `### ${opt.name} (Confidence: ${opt.confidence}%)
**Description:** ${opt.description}
**Pros:** ${opt.pros.join(', ')}
**Cons:** ${opt.cons.join(', ')}
**Effort:** ${opt.effort}
**Risks:** ${opt.risks.join(', ')}`
    )
    .join('\n\n');

  return {
    success: true,
    sessionId: session.sessionId,
    phase: session.phase,
    options: session.context.options,
    guidance: `# Options Evaluated

## Available Options:
${optionComparison}

## Next Phase: Decision Making

Review the options and select the best approach.

Provide your decision with:
\`\`\`json
{
  "selectedOption": {
    "name": "Chosen Option Name",
    "rationale": "Why this option was selected",
    "tradeoffs": ["What we're giving up", "What we're gaining"]
  }
}
\`\`\`

Use \`make_decision\` to proceed.`,
    nextAction: 'make_decision',
  };
}

/**
 * Handle decision making phase
 */
async function handleDecisionMaking(session: PlanningSession, input: any): Promise<any> {
  if (input.selectedOption) {
    session.context.selectedOption = input.selectedOption;
  }

  session.phase = 'impact_assessment';
  session.metadata.lastAction = 'Decision made';
  session.metadata.nextSteps = [
    'Assess technical impacts',
    'Evaluate business impacts',
    'Identify risks and dependencies',
  ];

  return {
    success: true,
    sessionId: session.sessionId,
    phase: session.phase,
    decision: session.context.selectedOption,
    guidance: `# Decision Made

**Selected:** ${session.context.selectedOption?.name}
**Rationale:** ${session.context.selectedOption?.rationale}

## Next Phase: Impact Assessment

Let's analyze the impacts of this decision.

Provide impact analysis:
\`\`\`json
{
  "impacts": {
    "technical": ["Impact on architecture", "Performance considerations"],
    "business": ["Time to market", "Cost implications"],
    "team": ["Training needs", "Skill requirements"],
    "risks": ["Implementation risks", "Migration challenges"],
    "dependencies": ["Required tools", "External services"]
  }
}
\`\`\`

Use \`assess_impact\` to continue.`,
    nextAction: 'assess_impact',
  };
}

/**
 * Handle impact assessment phase
 */
async function handleImpactAssessment(session: PlanningSession, input: any): Promise<any> {
  if (input.impacts) {
    session.context.impacts = input.impacts;
  }

  session.phase = 'implementation_planning';
  session.metadata.lastAction = 'Impacts assessed';
  session.metadata.nextSteps = [
    'Define implementation phases',
    'Create task list',
    'Set timeline and milestones',
  ];

  return {
    success: true,
    sessionId: session.sessionId,
    phase: session.phase,
    impacts: session.context.impacts,
    guidance: `# Impact Assessment Complete

## Identified Impacts:
- **Technical:** ${session.context.impacts?.technical.length} impacts
- **Business:** ${session.context.impacts?.business.length} impacts
- **Team:** ${session.context.impacts?.team.length} impacts
- **Risks:** ${session.context.impacts?.risks.length} risks
- **Dependencies:** ${session.context.impacts?.dependencies.length} dependencies

## Next Phase: Implementation Planning

Let's create an implementation plan with tasks and timeline.

Provide implementation details:
\`\`\`json
{
  "implementation": {
    "phases": ["Phase 1: Setup", "Phase 2: Core Implementation"],
    "tasks": [
      {
        "description": "Task description",
        "priority": "high",
        "effort": "2 days",
        "assignee": "team-member"
      }
    ],
    "timeline": "6 weeks",
    "successCriteria": ["Criteria 1", "Criteria 2"]
  }
}
\`\`\`

Use \`plan_implementation\` to continue.`,
    nextAction: 'plan_implementation',
  };
}

/**
 * Handle implementation planning phase
 */
async function handleImplementationPlanning(session: PlanningSession, input: any): Promise<any> {
  if (input.implementation) {
    session.context.implementation = input.implementation;
  }

  session.phase = 'adr_generation';
  session.metadata.lastAction = 'Implementation planned';
  session.metadata.nextSteps = [
    'Generate ADR document',
    'Create TODO items',
    'Update project plan',
  ];

  return {
    success: true,
    sessionId: session.sessionId,
    phase: session.phase,
    implementation: session.context.implementation,
    guidance: `# Implementation Plan Complete

## Plan Summary:
- **Phases:** ${session.context.implementation?.phases.length} phases
- **Tasks:** ${session.context.implementation?.tasks.length} tasks
- **Timeline:** ${session.context.implementation?.timeline}
- **Success Criteria:** ${session.context.implementation?.successCriteria.length} criteria

## Next Phase: ADR Generation

Ready to generate the ADR document with all the information gathered.

The ADR will include:
- Problem statement and context
- Considered options with evaluation
- Decision and rationale
- Impacts and consequences
- Implementation plan

Use \`generate_adr\` to create the ADR document.`,
    nextAction: 'generate_adr',
    readyToGenerate: true,
  };
}

/**
 * Handle ADR generation phase
 */
async function handleAdrGeneration(session: PlanningSession, _input: any): Promise<any> {
  const adrContent = generateAdrContent(session);
  session.context.adrContent = adrContent;

  // Save ADR to file
  const adrDir = join(session.context.projectPath, session.context.adrDirectory);
  await fs.mkdir(adrDir, { recursive: true });

  const adrNumber = await getNextAdrNumber(adrDir);
  const adrFilename = `${String(adrNumber).padStart(4, '0')}-${session.context.selectedOption?.name.toLowerCase().replace(/\s+/g, '-')}.md`;
  const adrPath = join(adrDir, adrFilename);

  await fs.writeFile(adrPath, adrContent);

  session.phase = 'completed';
  session.metadata.lastAction = 'ADR generated';
  session.metadata.nextSteps = [];

  return {
    success: true,
    sessionId: session.sessionId,
    phase: session.phase,
    adrPath,
    adrContent,
    guidance: `# ADR Generated Successfully!

## ADR Details:
- **File:** ${adrPath}
- **Decision:** ${session.context.selectedOption?.name}
- **Status:** Draft

## Next Steps:
1. Review the generated ADR
2. TODO items have been created based on the implementation plan
3. Project plan has been updated

You can:
- Use \`update_todos\` to generate TODO items
- Use \`complete_session\` to finish and clean up
- Make manual edits to the ADR file as needed`,
    nextAction: 'update_todos',
    completed: true,
  };
}

/**
 * Request research on the problem
 */
async function requestResearch(args: InteractiveAdrPlanningInput): Promise<any> {
  if (!args.sessionId) {
    throw new McpAdrError('Session ID required', 'INVALID_INPUT');
  }

  const session = sessions.get(args.sessionId);
  if (!session) {
    throw new McpAdrError(`Session ${args.sessionId} not found`, 'SESSION_NOT_FOUND');
  }

  // Simulate research integration (would integrate with actual research tools)
  const researchFindings = [
    {
      source: 'Industry Best Practices',
      insight: `For ${session.context.problemStatement}, microservices architecture is commonly used for scalability`,
      relevance: 'High - Addresses core scalability concerns',
    },
    {
      source: 'Current Codebase Analysis',
      insight: 'Existing monolithic structure with clear domain boundaries',
      relevance: 'High - Shows feasibility of decomposition',
    },
    {
      source: 'Team Experience',
      insight: 'Team has limited microservices experience but strong domain knowledge',
      relevance: 'Medium - Impacts implementation approach',
    },
  ];

  session.context.researchFindings = researchFindings;
  session.phase = 'option_exploration';
  session.metadata.updatedAt = new Date().toISOString();
  await saveSession(session);

  return {
    success: true,
    sessionId: args.sessionId,
    researchFindings,
    guidance: 'Research complete. Moving to option exploration phase.',
    nextAction: 'evaluate_options',
  };
}

/**
 * Evaluate options based on research
 */
async function evaluateOptions(args: InteractiveAdrPlanningInput): Promise<any> {
  if (!args.sessionId) {
    throw new McpAdrError('Session ID required', 'INVALID_INPUT');
  }

  const session = sessions.get(args.sessionId);
  if (!session) {
    throw new McpAdrError(`Session ${args.sessionId} not found`, 'SESSION_NOT_FOUND');
  }

  // Generate options based on problem and research
  const options = [
    {
      name: 'Full Microservices Migration',
      description: 'Complete decomposition into microservices',
      pros: ['Maximum scalability', 'Independent deployment', 'Technology flexibility'],
      cons: ['High complexity', 'Significant refactoring', 'Operational overhead'],
      risks: ['Team learning curve', 'Integration complexity', 'Data consistency'],
      effort: 'high' as const,
      confidence: 60,
    },
    {
      name: 'Modular Monolith',
      description: 'Keep monolithic deployment but enforce module boundaries',
      pros: ['Simpler operations', 'Easier data consistency', 'Gradual evolution path'],
      cons: ['Limited scalability', 'Shared deployment', 'Technology constraints'],
      risks: ['Module boundary violations', 'Scaling limitations'],
      effort: 'medium' as const,
      confidence: 80,
    },
    {
      name: 'Selective Service Extraction',
      description: 'Extract only high-traffic components as services',
      pros: ['Targeted scalability', 'Lower complexity', 'Pragmatic approach'],
      cons: ['Partial benefits', 'Mixed architecture'],
      risks: ['Service boundary decisions', 'Integration points'],
      effort: 'medium' as const,
      confidence: 85,
    },
  ];

  session.context.options = options;
  session.phase = 'decision_making';
  session.metadata.updatedAt = new Date().toISOString();
  await saveSession(session);

  return {
    success: true,
    sessionId: args.sessionId,
    options,
    guidance: 'Options evaluated. Ready for decision making.',
    nextAction: 'make_decision',
  };
}

/**
 * Update TODO items based on ADR decisions
 */
async function updateTodos(args: InteractiveAdrPlanningInput): Promise<any> {
  if (!args.sessionId) {
    throw new McpAdrError('Session ID required', 'INVALID_INPUT');
  }

  const session = sessions.get(args.sessionId);
  if (!session) {
    throw new McpAdrError(`Session ${args.sessionId} not found`, 'SESSION_NOT_FOUND');
  }

  if (!session.context.implementation) {
    throw new McpAdrError('No implementation plan available', 'MISSING_IMPLEMENTATION');
  }

  // Generate TODO items from implementation tasks
  const todos = session.context.implementation.tasks.map((task, index) => ({
    id: `adr-${session.sessionId}-task-${index + 1}`,
    description: task.description,
    priority: task.priority,
    effort: task.effort,
    assignee: task.assignee,
    adrLink: session.context.adrContent ? 'Generated ADR' : undefined,
    status: 'pending',
  }));

  return {
    success: true,
    sessionId: args.sessionId,
    todosGenerated: todos.length,
    todos,
    guidance: `Generated ${todos.length} TODO items from the implementation plan.`,
  };
}

/**
 * Get guidance for current phase
 */
async function getGuidance(args: InteractiveAdrPlanningInput): Promise<any> {
  if (!args.sessionId) {
    throw new McpAdrError('Session ID required', 'INVALID_INPUT');
  }

  const session = sessions.get(args.sessionId);
  if (!session) {
    throw new McpAdrError(`Session ${args.sessionId} not found`, 'SESSION_NOT_FOUND');
  }

  const phaseGuidance: Record<string, any> = {
    problem_definition: {
      tips: [
        'Be specific about the problem',
        'Include quantifiable metrics if possible',
        'Identify all stakeholders',
        'Define clear success criteria',
      ],
      questions: [
        'What specific problem are we solving?',
        'Why does this need to be addressed now?',
        'What happens if we do nothing?',
        'How will we measure success?',
      ],
      examples: [
        'Application response time exceeds 3 seconds under load',
        'Cannot deploy services independently',
        'Database becoming a bottleneck for scaling',
      ],
    },
    research_analysis: {
      tips: [
        'Look for industry patterns',
        'Analyze similar problems in your codebase',
        'Consider team capabilities',
        'Research tooling and frameworks',
      ],
      questions: [
        'What solutions have others used?',
        'What patterns apply to our context?',
        'What are the technical constraints?',
        'What skills does the team have?',
      ],
    },
    option_exploration: {
      tips: [
        'Consider at least 3 options',
        'Include a "do nothing" option if relevant',
        'Be honest about pros and cons',
        'Estimate effort realistically',
      ],
      questions: [
        'What are all possible approaches?',
        'What are the tradeoffs?',
        'How much effort is each option?',
        'What are the risks?',
      ],
    },
  };

  const currentGuidance = phaseGuidance[session.phase] || {
    tips: ['Follow the structured process'],
    questions: ['What do you need help with?'],
  };

  return {
    success: true,
    sessionId: args.sessionId,
    phase: session.phase,
    guidance: currentGuidance,
    progress: getSessionProgress(session),
    nextSteps: session.metadata.nextSteps,
  };
}

/**
 * Complete the planning session
 */
async function completeSession(args: InteractiveAdrPlanningInput): Promise<any> {
  if (!args.sessionId) {
    throw new McpAdrError('Session ID required', 'INVALID_INPUT');
  }

  const session = sessions.get(args.sessionId);
  if (!session) {
    throw new McpAdrError(`Session ${args.sessionId} not found`, 'SESSION_NOT_FOUND');
  }

  // Clean up session
  sessions.delete(args.sessionId);

  // Archive session file
  const cacheDir = await getCacheDir(session.context.projectPath);
  const sessionFile = join(cacheDir, `adr-planning-session-${session.sessionId}.json`);
  const archiveFile = join(cacheDir, `archived-adr-planning-session-${session.sessionId}.json`);

  try {
    await fs.rename(sessionFile, archiveFile);
  } catch (error) {
    console.warn('Failed to archive session file:', error);
  }

  return {
    success: true,
    sessionId: args.sessionId,
    summary: {
      problem: session.context.problemStatement,
      decision: session.context.selectedOption?.name,
      adrGenerated: !!session.context.adrContent,
      tasksCreated: session.context.implementation?.tasks.length || 0,
      duration: calculateDuration(session.metadata.createdAt, session.metadata.updatedAt),
    },
    message: 'Planning session completed successfully!',
  };
}

/**
 * Helper function to generate ADR content
 */
function generateAdrContent(session: PlanningSession): string {
  const date = new Date().toISOString().split('T')[0];
  const status = 'Draft';

  return `# ${session.context.selectedOption?.name}

**Status:** ${status}  
**Date:** ${date}  
**Decision Made By:** [Team/Architect Name]

## Context

${session.context.problemStatement}

### Research Findings

${session.context.researchFindings.map(f => `- **${f.source}**: ${f.insight}`).join('\n')}

## Decision

We have decided to implement **${session.context.selectedOption?.name}**.

### Rationale

${session.context.selectedOption?.rationale}

### Trade-offs

${session.context.selectedOption?.tradeoffs.map(t => `- ${t}`).join('\n')}

## Considered Options

${session.context.options
  .map(
    opt => `
### ${opt.name}

${opt.description}

**Pros:**
${opt.pros.map(p => `- ${p}`).join('\n')}

**Cons:**
${opt.cons.map(c => `- ${c}`).join('\n')}

**Effort:** ${opt.effort}  
**Confidence:** ${opt.confidence}%
`
  )
  .join('\n')}

## Consequences

### Technical Impacts
${session.context.impacts?.technical.map(i => `- ${i}`).join('\n')}

### Business Impacts
${session.context.impacts?.business.map(i => `- ${i}`).join('\n')}

### Team Impacts
${session.context.impacts?.team.map(i => `- ${i}`).join('\n')}

### Risks
${session.context.impacts?.risks.map(r => `- ${r}`).join('\n')}

### Dependencies
${session.context.impacts?.dependencies.map(d => `- ${d}`).join('\n')}

## Implementation Plan

### Phases
${session.context.implementation?.phases.map((p, i) => `${i + 1}. ${p}`).join('\n')}

### Tasks
${session.context.implementation?.tasks
  .map(
    t =>
      `- [ ] ${t.description} (Priority: ${t.priority}, Effort: ${t.effort}${t.assignee ? `, Assignee: ${t.assignee}` : ''})`
  )
  .join('\n')}

### Timeline
${session.context.implementation?.timeline}

### Success Criteria
${session.context.implementation?.successCriteria.map(c => `- ${c}`).join('\n')}

## References

- [Link to relevant documentation]
- [Link to research materials]
- [Link to architectural diagrams]

## Revision History

- ${date}: Initial draft created through interactive planning session
`;
}

/**
 * Helper function to get next ADR number
 */
async function getNextAdrNumber(adrDir: string): Promise<number> {
  try {
    const files = await fs.readdir(adrDir);
    const adrFiles = files.filter(f => f.match(/^\d{4}-.*\.md$/));
    if (adrFiles.length === 0) return 1;

    const numbers = adrFiles.map(f => parseInt(f.substring(0, 4)));
    return Math.max(...numbers) + 1;
  } catch {
    return 1;
  }
}

/**
 * Helper function to calculate session progress
 */
function getSessionProgress(session: PlanningSession): number {
  const phases = [
    'problem_definition',
    'research_analysis',
    'option_exploration',
    'decision_making',
    'impact_assessment',
    'implementation_planning',
    'adr_generation',
  ];

  const currentIndex = phases.indexOf(session.phase);
  if (currentIndex === -1) return 100; // completed

  return Math.round((currentIndex / phases.length) * 100);
}

/**
 * Helper function to calculate duration
 */
function calculateDuration(start: string, end: string): string {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const duration = endTime - startTime;

  const hours = Math.floor(duration / (1000 * 60 * 60));
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Main entry point for the interactive ADR planning tool
 */
export async function interactiveAdrPlanning(args: any): Promise<any> {
  try {
    const input = InteractiveAdrPlanningSchema.parse(args);

    switch (input.operation) {
      case 'start_session':
        return await startSession(input);

      case 'continue_session':
        return await continueSession(input);

      case 'provide_input':
        return await provideInput(input);

      case 'request_research':
        return await requestResearch(input);

      case 'evaluate_options':
        return await evaluateOptions(input);

      case 'make_decision':
        input.input = { selectedOption: input.input };
        return await provideInput(input);

      case 'assess_impact':
        input.input = { impacts: input.input };
        return await provideInput(input);

      case 'plan_implementation':
        input.input = { implementation: input.input };
        return await provideInput(input);

      case 'generate_adr':
        return await provideInput(input);

      case 'update_todos':
        return await updateTodos(input);

      case 'get_guidance':
        return await getGuidance(input);

      case 'save_session':
        const session = sessions.get(input.sessionId!);
        if (!session) throw new McpAdrError('Session not found', 'SESSION_NOT_FOUND');
        await saveSession(session);
        return { success: true, message: 'Session saved' };

      case 'complete_session':
        return await completeSession(input);

      default:
        throw new McpAdrError(`Unknown operation: ${input.operation}`, 'INVALID_OPERATION');
    }
  } catch (error) {
    if (error instanceof McpAdrError) {
      throw error;
    }
    throw new McpAdrError(
      `Interactive ADR planning failed: ${error instanceof Error ? error.message : String(error)}`,
      'PLANNING_ERROR'
    );
  }
}
