/**
 * Tool Chain Orchestrator - AI-Powered Dynamic Tool Sequencing
 * 
 * Uses OpenRouter.ai to intelligently analyze user requests and generate
 * structured tool execution plans for the calling LLM to execute.
 */

import { z } from 'zod';
import { McpAdrError } from '../types/index.js';
import { loadAIConfig, isAIExecutionEnabled, getRecommendedModel } from '../config/ai-config.js';
import { KnowledgeGraphManager } from '../utils/knowledge-graph-manager.js';

// Tool chain step schema
const ToolChainStepSchema = z.object({
  toolName: z.string().describe('MCP tool name to execute'),
  parameters: z.record(z.any()).describe('Parameters to pass to the tool'),
  description: z.string().describe('What this step accomplishes'),
  dependsOn: z.array(z.string()).optional().describe('Previous step IDs this depends on'),
  stepId: z.string().describe('Unique identifier for this step'),
  conditional: z.boolean().default(false).describe('Whether this step should only run if previous steps succeed'),
  retryable: z.boolean().default(true).describe('Whether this step can be retried on failure')
});

// Tool chain plan schema
const ToolChainPlanSchema = z.object({
  planId: z.string().describe('Unique plan identifier'),
  userIntent: z.string().describe('Interpreted user intent'),
  confidence: z.number().min(0).max(1).describe('Confidence in the plan (0-1)'),
  estimatedDuration: z.string().describe('Estimated execution time'),
  steps: z.array(ToolChainStepSchema).describe('Ordered sequence of tool executions'),
  fallbackSteps: z.array(ToolChainStepSchema).optional().describe('Alternative steps if main plan fails'),
  prerequisites: z.array(z.string()).optional().describe('Required conditions before execution'),
  expectedOutputs: z.array(z.string()).describe('What outputs the plan will generate')
});

// Available MCP tools registry
const AVAILABLE_TOOLS = [
  'analyze_project_ecosystem',
  'generate_adrs_from_prd',
  'suggest_adrs',
  'analyze_content_security',
  'generate_rules',
  'generate_adr_todo',
  'compare_adr_progress',
  'manage_todo',
  'generate_deployment_guidance',
  'smart_score',
  'troubleshoot_guided_workflow',
  'smart_git_push',
  'generate_research_questions',
  'validate_rules',
  'analyze_code_patterns',
  'suggest_improvements',
  'generate_test_scenarios',
  'create_documentation',
  'security_audit',
  'performance_analysis',
  'dependency_analysis',
  'refactoring_suggestions',
  'api_documentation',
  'deployment_checklist',
  'release_notes'
] as const;

// Tool capabilities mapping for AI context
const TOOL_CAPABILITIES = {
  'analyze_project_ecosystem': 'Analyze technology stack, dependencies, and architectural patterns',
  'generate_adrs_from_prd': 'Convert Product Requirements Documents to Architectural Decision Records',
  'suggest_adrs': 'Auto-suggest ADRs based on code analysis and project patterns',
  'analyze_content_security': 'Detect and mask sensitive information in project content',
  'generate_rules': 'Extract architectural rules and constraints from project analysis',
  'generate_adr_todo': 'Generate TODO.md from ADRs with comprehensive task breakdown',
  'compare_adr_progress': 'Validate TODO vs ADRs vs actual environment state',
  'manage_todo': 'Comprehensive TODO.md lifecycle management and progress tracking',
  'generate_deployment_guidance': 'AI-driven deployment procedures from architectural decisions',
  'smart_score': 'Project health scoring with cross-tool synchronization',
  'troubleshoot_guided_workflow': 'Systematic troubleshooting with ADR/TODO alignment',
  'smart_git_push': 'Intelligent release readiness analysis and git operations',
  'generate_research_questions': 'Generate targeted research questions for project analysis',
  'validate_rules': 'Validate architectural rule compliance across the project',
  'analyze_code_patterns': 'Identify code patterns and architectural consistency',
  'suggest_improvements': 'Provide targeted improvement recommendations',
  'generate_test_scenarios': 'Create comprehensive test scenarios and strategies',
  'create_documentation': 'Generate project documentation from code and ADRs',
  'security_audit': 'Comprehensive security analysis and vulnerability detection',
  'performance_analysis': 'Analyze performance bottlenecks and optimization opportunities',
  'dependency_analysis': 'Analyze project dependencies and potential issues',
  'refactoring_suggestions': 'Suggest code refactoring based on architectural principles',
  'api_documentation': 'Generate API documentation from code analysis',
  'deployment_checklist': 'Create deployment checklists based on ADRs and project state',
  'release_notes': 'Generate release notes from commits, ADRs, and TODO completion'
};

// Operation schema
const ToolChainOrchestratorSchema = z.object({
  operation: z.enum(['generate_plan', 'analyze_intent', 'suggest_tools', 'validate_plan', 'reality_check', 'session_guidance', 'human_override']).describe('Orchestrator operation'),
  userRequest: z.string().describe('Natural language user request'),
  projectContext: z.object({
    projectPath: z.string().describe('Path to project directory'),
    adrDirectory: z.string().default('docs/adrs').describe('ADR directory path'),
    todoPath: z.string().default('TODO.md').describe('TODO.md file path'),
    hasADRs: z.boolean().optional().describe('Whether project has existing ADRs'),
    hasTODO: z.boolean().optional().describe('Whether project has TODO.md'),
    projectType: z.string().optional().describe('Project type (e.g., web-app, library, api)')
  }).describe('Project context information'),
  constraints: z.object({
    maxSteps: z.number().default(10).describe('Maximum number of steps in plan'),
    timeLimit: z.string().optional().describe('Time limit for execution'),
    excludeTools: z.array(z.string()).optional().describe('Tools to exclude from plan'),
    prioritizeSpeed: z.boolean().default(false).describe('Prioritize fast execution over thoroughness')
  }).optional().describe('Execution constraints'),
  customInstructions: z.string().optional().describe('Additional context or specific requirements'),
  sessionContext: z.object({
    conversationLength: z.number().optional().describe('Number of messages in current session'),
    previousActions: z.array(z.string()).optional().describe('Tools/actions already executed this session'),
    confusionIndicators: z.array(z.string()).optional().describe('Signs that LLM might be confused or hallucinating'),
    lastSuccessfulAction: z.string().optional().describe('Last action that produced good results'),
    stuckOnTask: z.string().optional().describe('Task the LLM seems stuck on')
  }).optional().describe('Session context for hallucination prevention'),
  humanOverride: z.object({
    taskType: z.enum(['analyze_project', 'generate_docs', 'fix_security', 'deploy_ready', 'troubleshoot_issue', 'update_todos', 'custom']).describe('Predefined task type or custom'),
    forceExecution: z.boolean().default(true).describe('Skip all AI analysis and force direct execution'),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('high').describe('Task priority level'),
    deadline: z.string().optional().describe('When this must be completed'),
    specificRequirement: z.string().optional().describe('Exact requirement that must be fulfilled'),
    bypassSafety: z.boolean().default(false).describe('Bypass safety checks (use with caution)')
  }).optional().describe('Human override settings for forced execution')
});

type ToolChainOrchestratorArgs = z.infer<typeof ToolChainOrchestratorSchema>;
type ToolChainPlan = z.infer<typeof ToolChainPlanSchema>;
type ToolChainStep = z.infer<typeof ToolChainStepSchema>;

// Predefined task patterns for human override
const PREDEFINED_TASK_PATTERNS = {
  'analyze_project': {
    description: 'Complete project analysis including ecosystem, security, and health scoring',
    steps: [
      { tool: 'analyze_project_ecosystem', params: {} },
      { tool: 'analyze_content_security', params: {} },
      { tool: 'smart_score', params: { operation: 'recalculate_scores' } }
    ]
  },
  'generate_docs': {
    description: 'Generate comprehensive project documentation',
    steps: [
      { tool: 'suggest_adrs', params: {} },
      { tool: 'generate_adr_todo', params: {} },
      { tool: 'generate_deployment_guidance', params: {} }
    ]
  },
  'fix_security': {
    description: 'Security audit and remediation workflow',
    steps: [
      { tool: 'analyze_content_security', params: {} },
      { tool: 'security_audit', params: {} },
      { tool: 'suggest_improvements', params: { focusArea: 'security' } }
    ]
  },
  'deploy_ready': {
    description: 'Full deployment readiness check and preparation',
    steps: [
      { tool: 'compare_adr_progress', params: {} },
      { tool: 'smart_git_push', params: { checkReleaseReadiness: true } },
      { tool: 'generate_deployment_guidance', params: {} },
      { tool: 'deployment_checklist', params: {} }
    ]
  },
  'troubleshoot_issue': {
    description: 'Systematic troubleshooting workflow',
    steps: [
      { tool: 'troubleshoot_guided_workflow', params: { operation: 'analyze_with_tools' } },
      { tool: 'compare_adr_progress', params: {} },
      { tool: 'manage_todo', params: { operation: 'analyze_progress' } }
    ]
  },
  'update_todos': {
    description: 'Complete TODO management and synchronization',
    steps: [
      { tool: 'generate_adr_todo', params: {} },
      { tool: 'manage_todo', params: { operation: 'sync_progress' } },
      { tool: 'smart_score', params: { operation: 'sync_scores' } }
    ]
  }
} as const;

/**
 * Generate AI-powered tool execution plan
 */
async function generateToolChainPlan(args: ToolChainOrchestratorArgs): Promise<ToolChainPlan> {
  const aiConfig = loadAIConfig();
  
  if (!isAIExecutionEnabled(aiConfig)) {
    throw new McpAdrError('AI execution not enabled. Set OPENROUTER_API_KEY and execution mode to "full"', 'AI_NOT_ENABLED');
  }

  // Build context for AI analysis
  const systemPrompt = `You are an expert software architect and MCP tool orchestrator. Your job is to analyze user requests and generate intelligent tool execution plans.

Available MCP Tools:
${Object.entries(TOOL_CAPABILITIES).map(([tool, desc]) => `- ${tool}: ${desc}`).join('\n')}

Project Context:
- Project Path: ${args.projectContext.projectPath}
- ADR Directory: ${args.projectContext.adrDirectory}
- TODO Path: ${args.projectContext.todoPath}
- Has ADRs: ${args.projectContext.hasADRs ? 'Yes' : 'No'}
- Has TODO: ${args.projectContext.hasTODO ? 'Yes' : 'No'}
- Project Type: ${args.projectContext.projectType || 'Unknown'}

Generate a structured tool execution plan that:
1. Interprets the user's intent accurately
2. Selects the optimal sequence of MCP tools
3. Provides clear parameters for each tool
4. Handles dependencies between steps
5. Includes fallback options for robustness

Return a JSON object matching this schema:
{
  "planId": "unique-plan-id",
  "userIntent": "interpreted intent",
  "confidence": 0.95,
  "estimatedDuration": "2-5 minutes",
  "steps": [
    {
      "stepId": "step1",
      "toolName": "tool_name",
      "parameters": { "param": "value" },
      "description": "what this accomplishes",
      "dependsOn": [],
      "conditional": false,
      "retryable": true
    }
  ],
  "fallbackSteps": [],
  "prerequisites": [],
  "expectedOutputs": ["output1", "output2"]
}`;

  const userPrompt = `User Request: "${args.userRequest}"

${args.customInstructions ? `Additional Instructions: ${args.customInstructions}` : ''}

${args.constraints ? `Constraints:
- Max Steps: ${args.constraints.maxSteps}
- Time Limit: ${args.constraints.timeLimit || 'None'}
- Exclude Tools: ${args.constraints.excludeTools?.join(', ') || 'None'}
- Prioritize Speed: ${args.constraints.prioritizeSpeed ? 'Yes' : 'No'}` : ''}

Generate the optimal tool execution plan.`;

  try {
    // Call OpenRouter.ai for intelligent planning
    const response = await fetch(aiConfig.baseURL + '/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiConfig.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': aiConfig.siteUrl || '',
        'X-Title': aiConfig.siteName || ''
      },
      body: JSON.stringify({
        model: getRecommendedModel('analysis'),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1, // Low temperature for consistent planning
        max_tokens: aiConfig.maxTokens,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const planContent = result.choices?.[0]?.message?.content;

    if (!planContent) {
      throw new Error('No plan generated from AI response');
    }

    // Parse and validate the AI-generated plan
    const rawPlan = JSON.parse(planContent);
    const validatedPlan = ToolChainPlanSchema.parse(rawPlan);

    // Add safety checks
    validatePlanSafety(validatedPlan, args.constraints);

    return validatedPlan;

  } catch (error) {
    throw new McpAdrError(
      `Tool chain planning failed: ${error instanceof Error ? error.message : String(error)}`,
      'PLANNING_FAILED'
    );
  }
}

/**
 * Validate plan safety and constraints
 */
function validatePlanSafety(plan: ToolChainPlan, constraints?: ToolChainOrchestratorArgs['constraints']): void {
  // Check step count
  if (constraints?.maxSteps && plan.steps.length > constraints.maxSteps) {
    throw new McpAdrError(`Plan exceeds maximum steps: ${plan.steps.length} > ${constraints.maxSteps}`, 'PLAN_TOO_COMPLEX');
  }

  // Check for excluded tools
  if (constraints?.excludeTools) {
    const usedExcludedTools = plan.steps.filter(step => 
      constraints.excludeTools!.includes(step.toolName)
    );
    if (usedExcludedTools.length > 0) {
      throw new McpAdrError(`Plan uses excluded tools: ${usedExcludedTools.map(s => s.toolName).join(', ')}`, 'EXCLUDED_TOOLS_USED');
    }
  }

  // Validate tool names
  const invalidTools = plan.steps.filter(step => 
    !AVAILABLE_TOOLS.includes(step.toolName as any)
  );
  if (invalidTools.length > 0) {
    throw new McpAdrError(`Plan uses unknown tools: ${invalidTools.map(s => s.toolName).join(', ')}`, 'UNKNOWN_TOOLS');
  }

  // Check for circular dependencies
  const stepIds = new Set(plan.steps.map(s => s.stepId));
  for (const step of plan.steps) {
    if (step.dependsOn) {
      for (const depId of step.dependsOn) {
        if (!stepIds.has(depId)) {
          throw new McpAdrError(`Step ${step.stepId} depends on non-existent step: ${depId}`, 'INVALID_DEPENDENCY');
        }
      }
    }
  }

  // Validate confidence threshold
  if (plan.confidence < 0.6) {
    throw new McpAdrError(`Plan confidence too low: ${plan.confidence}`, 'LOW_CONFIDENCE_PLAN');
  }
}

/**
 * Analyze user intent without generating full plan
 */
async function analyzeUserIntent(args: ToolChainOrchestratorArgs): Promise<{
  intent: string;
  category: string;
  complexity: 'simple' | 'moderate' | 'complex';
  suggestedTools: string[];
  confidence: number;
}> {
  const aiConfig = loadAIConfig();
  
  if (!isAIExecutionEnabled(aiConfig)) {
    // Fallback to basic keyword analysis
    return fallbackIntentAnalysis(args.userRequest);
  }

  const systemPrompt = `Analyze the user's intent and suggest relevant MCP tools.

Available Tools: ${AVAILABLE_TOOLS.join(', ')}

Return JSON with:
{
  "intent": "clear description of what user wants to accomplish",
  "category": "analysis|generation|management|troubleshooting|deployment",
  "complexity": "simple|moderate|complex",
  "suggestedTools": ["tool1", "tool2"],
  "confidence": 0.85
}`;

  try {
    const response = await fetch(aiConfig.baseURL + '/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiConfig.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': aiConfig.siteUrl || '',
        'X-Title': aiConfig.siteName || ''
      },
      body: JSON.stringify({
        model: getRecommendedModel('quick-analysis', true), // Use cost-effective model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this request: "${args.userRequest}"` }
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      })
    });

    const result = await response.json();
    const analysisContent = result.choices?.[0]?.message?.content;
    
    if (analysisContent) {
      return JSON.parse(analysisContent);
    }
  } catch (error) {
    // Fall back to keyword analysis
  }

  return fallbackIntentAnalysis(args.userRequest);
}

/**
 * Human override - Generate tool chain based on predefined patterns
 */
function generateHumanOverridePlan(args: ToolChainOrchestratorArgs): ToolChainPlan {
  if (!args.humanOverride) {
    throw new McpAdrError('Human override settings required for this operation', 'MISSING_OVERRIDE');
  }

  const override = args.humanOverride;
  const planId = `human-override-${Date.now()}`;

  // Handle predefined task types
  if (override.taskType !== 'custom' && PREDEFINED_TASK_PATTERNS[override.taskType]) {
    const pattern = PREDEFINED_TASK_PATTERNS[override.taskType];
    
    const steps: ToolChainStep[] = pattern.steps.map((step, index) => ({
      stepId: `override-step-${index + 1}`,
      toolName: step.tool,
      parameters: {
        ...step.params,
        projectPath: args.projectContext.projectPath,
        adrDirectory: args.projectContext.adrDirectory,
        todoPath: args.projectContext.todoPath
      },
      description: `Execute ${step.tool} as part of ${override.taskType} workflow`,
      dependsOn: index > 0 ? [`override-step-${index}`] : [],
      conditional: false,
      retryable: !override.bypassSafety
    }));

    return {
      planId,
      userIntent: `HUMAN OVERRIDE: ${pattern.description}${override.specificRequirement ? ` - ${override.specificRequirement}` : ''}`,
      confidence: 1.0, // Human override = 100% confidence
      estimatedDuration: override.priority === 'critical' ? '1-3 minutes' : '3-10 minutes',
      steps,
      fallbackSteps: override.bypassSafety ? [] : [{
        stepId: 'fallback-manual',
        toolName: 'troubleshoot_guided_workflow',
        parameters: { operation: 'full_workflow' },
        description: 'Manual troubleshooting if automated workflow fails',
        dependsOn: [],
        conditional: true,
        retryable: true
      }],
      prerequisites: override.bypassSafety ? [] : ['Human has confirmed this action is necessary'],
      expectedOutputs: [
        `${pattern.description} completed`,
        'Structured results for each tool execution',
        override.deadline ? `Completion by ${override.deadline}` : 'Task completion confirmation'
      ]
    };
  }

  // Handle custom task type
  if (override.taskType === 'custom') {
    if (!override.specificRequirement) {
      throw new McpAdrError('Specific requirement must be provided for custom human override', 'MISSING_REQUIREMENT');
    }

    // Use simple keyword matching for custom tasks
    const request = override.specificRequirement.toLowerCase();
    const suggestedTools: string[] = [];

    // Map common keywords to tools
    if (request.includes('analyze') || request.includes('analysis')) {
      suggestedTools.push('analyze_project_ecosystem', 'analyze_content_security');
    }
    if (request.includes('todo') || request.includes('task')) {
      suggestedTools.push('manage_todo', 'generate_adr_todo');
    }
    if (request.includes('adr') || request.includes('decision')) {
      suggestedTools.push('suggest_adrs', 'compare_adr_progress');
    }
    if (request.includes('deploy') || request.includes('release')) {
      suggestedTools.push('smart_git_push', 'generate_deployment_guidance');
    }
    if (request.includes('score') || request.includes('health')) {
      suggestedTools.push('smart_score');
    }

    // If no tools matched, default to analysis
    if (suggestedTools.length === 0) {
      suggestedTools.push('analyze_project_ecosystem', 'troubleshoot_guided_workflow');
    }

    const steps: ToolChainStep[] = suggestedTools.map((tool, index) => ({
      stepId: `custom-step-${index + 1}`,
      toolName: tool,
      parameters: {
        projectPath: args.projectContext.projectPath,
        adrDirectory: args.projectContext.adrDirectory,
        todoPath: args.projectContext.todoPath
      },
      description: `Execute ${tool} for custom requirement: ${override.specificRequirement}`,
      dependsOn: index > 0 ? [`custom-step-${index}`] : [],
      conditional: false,
      retryable: !override.bypassSafety
    }));

    return {
      planId,
      userIntent: `HUMAN OVERRIDE (CUSTOM): ${override.specificRequirement}`,
      confidence: 0.8, // Slightly lower for custom tasks
      estimatedDuration: override.priority === 'critical' ? '2-5 minutes' : '5-15 minutes',
      steps,
      fallbackSteps: [],
      prerequisites: override.bypassSafety ? [] : ['Human has specified exact requirement'],
      expectedOutputs: [
        'Custom requirement fulfilled',
        'Tool execution results',
        'Confirmation of task completion'
      ]
    };
  }

  throw new McpAdrError(`Unknown task type: ${override.taskType}`, 'UNKNOWN_TASK_TYPE');
}

/**
 * Reality check - Detect if LLM is hallucinating or confused
 */
function performRealityCheck(args: ToolChainOrchestratorArgs): {
  hallucinationRisk: 'low' | 'medium' | 'high';
  confusionIndicators: string[];
  recommendations: string[];
  suggestedActions: string[];
} {
  const confusionIndicators: string[] = [];
  const recommendations: string[] = [];
  const suggestedActions: string[] = [];

  const sessionCtx = args.sessionContext;
  const request = args.userRequest.toLowerCase();

  // Check for hallucination indicators
  let riskScore = 0;

  // Long conversation without progress
  if (sessionCtx?.conversationLength && sessionCtx.conversationLength > 20) {
    riskScore += 2;
    confusionIndicators.push('Very long conversation - potential confusion accumulation');
    recommendations.push('Consider starting fresh with human override');
  }

  // Repetitive tool usage
  if (sessionCtx?.previousActions) {
    const toolCounts = sessionCtx.previousActions.reduce((acc, tool) => {
      acc[tool] = (acc[tool] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const repeatedTools = Object.entries(toolCounts).filter(([_, count]) => count > 3);
    if (repeatedTools.length > 0) {
      riskScore += repeatedTools.length;
      confusionIndicators.push(`Excessive repetition of tools: ${repeatedTools.map(([tool, count]) => `${tool}(${count}x)`).join(', ')}`);
      recommendations.push('Break the repetition cycle with human override or different approach');
    }
  }

  // Confusion indicators in the request
  const confusionKeywords = ['confused', 'not working', 'stuck', 'help', 'what should', 'don\'t know', 'error', 'failed'];
  const foundKeywords = confusionKeywords.filter(keyword => request.includes(keyword));
  if (foundKeywords.length > 0) {
    riskScore += foundKeywords.length;
    confusionIndicators.push(`Confusion keywords detected: ${foundKeywords.join(', ')}`);
    recommendations.push('LLM expressing uncertainty - human override recommended');
  }

  // Stuck on same task
  if (sessionCtx?.stuckOnTask) {
    riskScore += 3;
    confusionIndicators.push(`Stuck on task: ${sessionCtx.stuckOnTask}`);
    recommendations.push('Use human override to force progress on stuck task');
  }

  // Suggest actions based on risk level
  const hallucinationRisk: 'low' | 'medium' | 'high' = 
    riskScore >= 5 ? 'high' : 
    riskScore >= 2 ? 'medium' : 'low';

  if (hallucinationRisk === 'high') {
    suggestedActions.push(
      'IMMEDIATE: Use human_override operation to force structured execution',
      'Avoid further AI planning - use predefined task patterns',
      'Consider resetting the conversation context'
    );
  } else if (hallucinationRisk === 'medium') {
    suggestedActions.push(
      'Use human_override for critical tasks',
      'Limit AI planning to simple operations',
      'Monitor for increasing confusion indicators'
    );
  } else {
    suggestedActions.push(
      'Continue with AI-assisted planning',
      'Monitor session for confusion indicators',
      'Keep human override available as backup'
    );
  }

  return {
    hallucinationRisk,
    confusionIndicators,
    recommendations,
    suggestedActions
  };
}

/**
 * Session guidance - Provide structured guidance for long sessions
 */
function generateSessionGuidance(args: ToolChainOrchestratorArgs): {
  sessionStatus: 'healthy' | 'concerning' | 'critical';
  guidance: string[];
  recommendedNextStep: string;
  humanInterventionNeeded: boolean;
} {
  const realityCheck = performRealityCheck(args);
  const sessionCtx = args.sessionContext;

  const guidance: string[] = [];
  let sessionStatus: 'healthy' | 'concerning' | 'critical' = 'healthy';
  let humanInterventionNeeded = false;
  let recommendedNextStep = 'Continue with current approach';

  // Assess session health
  if (realityCheck.hallucinationRisk === 'high') {
    sessionStatus = 'critical';
    humanInterventionNeeded = true;
    recommendedNextStep = 'Use human_override immediately';
    guidance.push('🚨 CRITICAL: High hallucination risk detected');
    guidance.push('LLM appears confused or stuck in loops');
    guidance.push('Human override strongly recommended to restore focus');
  } else if (realityCheck.hallucinationRisk === 'medium') {
    sessionStatus = 'concerning';
    recommendedNextStep = 'Consider human_override for next critical task';
    guidance.push('⚠️ WARNING: Session showing signs of confusion');
    guidance.push('Monitor closely and be ready to intervene');
  } else {
    guidance.push('✅ Session appears healthy');
    guidance.push('AI planning can continue safely');
  }

  // Add specific guidance based on context
  if (sessionCtx?.conversationLength && sessionCtx.conversationLength > 15) {
    guidance.push(`📏 Long session (${sessionCtx.conversationLength} messages) - consider summarizing progress`);
  }

  if (sessionCtx?.lastSuccessfulAction) {
    guidance.push(`✅ Last successful action: ${sessionCtx.lastSuccessfulAction}`);
    guidance.push('Consider building on this success rather than trying new approaches');
  }

  // Add actionable next steps
  guidance.push('', '🎯 Recommended Actions:');
  guidance.push(...realityCheck.suggestedActions.map(action => `• ${action}`));

  return {
    sessionStatus,
    guidance,
    recommendedNextStep,
    humanInterventionNeeded
  };
}

/**
 * Fallback intent analysis using keywords
 */
function fallbackIntentAnalysis(userRequest: string): {
  intent: string;
  category: string;
  complexity: 'simple' | 'moderate' | 'complex';
  suggestedTools: string[];
  confidence: number;
} {
  const request = userRequest.toLowerCase();
  
  // Simple keyword matching
  const keywordMap = {
    'analyze': ['analyze_project_ecosystem', 'analyze_content_security'],
    'generate': ['generate_adrs_from_prd', 'generate_adr_todo', 'generate_deployment_guidance'],
    'todo': ['manage_todo', 'generate_adr_todo'],
    'adr': ['suggest_adrs', 'generate_adrs_from_prd', 'compare_adr_progress'],
    'deploy': ['generate_deployment_guidance', 'smart_git_push'],
    'score': ['smart_score'],
    'troubleshoot': ['troubleshoot_guided_workflow'],
    'security': ['analyze_content_security', 'security_audit']
  };

  const suggestedTools: string[] = [];
  let category = 'analysis';
  let complexity: 'simple' | 'moderate' | 'complex' = 'simple';

  for (const [keyword, tools] of Object.entries(keywordMap)) {
    if (request.includes(keyword)) {
      suggestedTools.push(...tools);
    }
  }

  // Determine category and complexity
  if (request.includes('generate') || request.includes('create')) {
    category = 'generation';
    complexity = 'moderate';
  } else if (request.includes('troubleshoot') || request.includes('debug')) {
    category = 'troubleshooting';
    complexity = 'complex';
  } else if (request.includes('deploy') || request.includes('release')) {
    category = 'deployment';
    complexity = 'complex';
  }

  return {
    intent: `User wants to ${request.includes('analyze') ? 'analyze' : request.includes('generate') ? 'generate' : 'manage'} project elements`,
    category,
    complexity,
    suggestedTools: [...new Set(suggestedTools)].slice(0, 5),
    confidence: suggestedTools.length > 0 ? 0.7 : 0.3
  };
}

/**
 * Main orchestrator function
 */
export async function toolChainOrchestrator(args: ToolChainOrchestratorArgs): Promise<any> {
  try {
    const validatedArgs = ToolChainOrchestratorSchema.parse(args);
    
    // Initialize knowledge graph manager
    const kgManager = new KnowledgeGraphManager();
    let intentId: string | undefined;

    switch (validatedArgs.operation) {
      case 'generate_plan': {
        // Create intent for plan generation
        intentId = await kgManager.createIntent(
          validatedArgs.userRequest,
          ['Generate tool execution plan', 'Plan tool chain sequence'],
          'medium'
        );
        
        const plan = await generateToolChainPlan(validatedArgs);
        
        // Store plan generation in knowledge graph
        await kgManager.addToolExecution(
          intentId,
          'tool_chain_orchestrator_generate_plan',
          validatedArgs,
          { plan },
          true,
          [],
          [],
          undefined
        );
        
        return {
          content: [{
            type: 'text',
            text: `# 🎯 AI-Generated Tool Execution Plan\n\n## Intent Analysis\n**User Intent**: ${plan.userIntent}\n**Confidence**: ${(plan.confidence * 100).toFixed(1)}%\n**Estimated Duration**: ${plan.estimatedDuration}\n\n## Execution Steps\n\n${plan.steps.map((step, i) => `### Step ${i + 1}: ${step.description}\n- **Tool**: \`${step.toolName}\`\n- **Step ID**: \`${step.stepId}\`\n${step.dependsOn && step.dependsOn.length > 0 ? `- **Depends On**: ${step.dependsOn.join(', ')}\n` : ''}- **Parameters**: \`\`\`json\n${JSON.stringify(step.parameters, null, 2)}\n\`\`\`\n${step.conditional ? '- **Conditional**: Only runs if previous steps succeed\n' : ''}${step.retryable ? '- **Retryable**: Can be retried on failure\n' : ''}`).join('\n\n')}\n\n## Expected Outputs\n${plan.expectedOutputs.map(output => `- ${output}`).join('\n')}\n\n${plan.fallbackSteps && plan.fallbackSteps.length > 0 ? `## Fallback Steps\n${plan.fallbackSteps.map(step => `- **${step.toolName}**: ${step.description}`).join('\n')}\n\n` : ''}${plan.prerequisites && plan.prerequisites.length > 0 ? `## Prerequisites\n${plan.prerequisites.map(req => `- ${req}`).join('\n')}\n\n` : ''}## Usage Instructions\n\n1. Execute steps in order, respecting dependencies\n2. Pass the provided parameters to each tool\n3. Handle conditional steps based on previous results\n4. Use fallback steps if main plan encounters issues\n\n*This plan was generated by AI analysis of your request and project context.*`
          }],
          metadata: {
            intentId,
            planId: plan.planId,
            confidence: plan.confidence,
            stepCount: plan.steps.length,
            toolChain: plan.steps.map(s => s.toolName)
          }
        };
      }

      case 'analyze_intent': {
        const analysis = await analyzeUserIntent(validatedArgs);
        return {
          content: [{
            type: 'text',
            text: `# 🎯 Intent Analysis\n\n**Intent**: ${analysis.intent}\n**Category**: ${analysis.category}\n**Complexity**: ${analysis.complexity}\n**Confidence**: ${(analysis.confidence * 100).toFixed(1)}%\n\n## Suggested Tools\n${analysis.suggestedTools.map(tool => `- **${tool}**: ${TOOL_CAPABILITIES[tool as keyof typeof TOOL_CAPABILITIES] || 'Tool capability description'}`).join('\n')}\n\n*Use 'generate_plan' operation to create a full execution plan.*`
          }]
        };
      }

      case 'suggest_tools': {
        const analysis = await analyzeUserIntent(validatedArgs);
        return {
          content: [{
            type: 'text',
            text: `# 🛠️ Tool Suggestions\n\n${analysis.suggestedTools.map(tool => `## ${tool}\n${TOOL_CAPABILITIES[tool as keyof typeof TOOL_CAPABILITIES] || 'Tool capability description'}\n`).join('\n')}`
          }]
        };
      }

      case 'validate_plan': {
        // This would validate a provided plan structure
        return {
          content: [{
            type: 'text',
            text: `# ✅ Plan Validation\n\nPlan validation functionality would analyze a provided plan structure for safety, dependencies, and feasibility.`
          }]
        };
      }

      case 'human_override': {
        // Create intent for human override
        intentId = await kgManager.createIntent(
          validatedArgs.userRequest,
          ['Execute human override plan', 'Force structured execution'],
          validatedArgs.humanOverride?.priority === 'critical' ? 'high' : (validatedArgs.humanOverride?.priority || 'high')
        );
        
        const plan = generateHumanOverridePlan(validatedArgs);
        
        // Store human override plan in knowledge graph
        await kgManager.addToolExecution(
          intentId,
          'tool_chain_orchestrator_human_override',
          validatedArgs,
          { plan },
          true,
          [],
          [],
          undefined
        );
        
        return {
          content: [{
            type: 'text',
            text: `# 🚨 HUMAN OVERRIDE ACTIVATED\n\n## Override Details\n**Task Type**: ${validatedArgs.humanOverride?.taskType}\n**Priority**: ${validatedArgs.humanOverride?.priority}\n**Force Execution**: ${validatedArgs.humanOverride?.forceExecution ? 'YES' : 'NO'}\n**Bypass Safety**: ${validatedArgs.humanOverride?.bypassSafety ? 'YES - USE CAUTION' : 'NO'}\n\n## Generated Plan\n**Intent**: ${plan.userIntent}\n**Confidence**: ${(plan.confidence * 100).toFixed(0)}% (Human Override)\n**Estimated Duration**: ${plan.estimatedDuration}\n\n## Execution Steps (MANDATORY)\n\n${plan.steps.map((step, i) => `### Step ${i + 1}: ${step.description}\n\`\`\`\nTool: ${step.toolName}\nParameters: ${JSON.stringify(step.parameters, null, 2)}\n\`\`\`\n${step.dependsOn && step.dependsOn.length > 0 ? `**Depends On**: ${step.dependsOn.join(', ')}\n` : ''}**Retryable**: ${step.retryable ? 'Yes' : 'No'}\n`).join('\n')}\n\n## Expected Outputs\n${plan.expectedOutputs.map(output => `✅ ${output}`).join('\n')}\n\n${plan.prerequisites && plan.prerequisites.length > 0 ? `## Prerequisites\n${plan.prerequisites.map(req => `⚠️ ${req}`).join('\n')}\n\n` : ''}## ⚠️ IMPORTANT NOTES\n\n- **This is a HUMAN OVERRIDE** - execute all steps as specified\n- **No deviation** from the plan unless critical errors occur\n- **Report results** for each step before proceeding\n- ${validatedArgs.humanOverride?.deadline ? `**DEADLINE**: ${validatedArgs.humanOverride.deadline}` : 'Execute promptly'}\n\n*Human override bypasses AI planning to ensure task completion.*`
          }],
          metadata: {
            intentId,
            planId: plan.planId,
            isHumanOverride: true,
            bypassSafety: validatedArgs.humanOverride?.bypassSafety || false,
            priority: validatedArgs.humanOverride?.priority,
            stepCount: plan.steps.length
          }
        };
      }

      case 'reality_check': {
        const realityCheck = performRealityCheck(validatedArgs);
        return {
          content: [{
            type: 'text',
            text: `# 🔍 Reality Check Results\n\n## Hallucination Risk Assessment\n**Risk Level**: ${realityCheck.hallucinationRisk.toUpperCase()} ${realityCheck.hallucinationRisk === 'high' ? '🚨' : realityCheck.hallucinationRisk === 'medium' ? '⚠️' : '✅'}\n\n## Confusion Indicators\n${realityCheck.confusionIndicators.length > 0 ? realityCheck.confusionIndicators.map(indicator => `⚠️ ${indicator}`).join('\n') : '✅ No confusion indicators detected'}\n\n## Recommendations\n${realityCheck.recommendations.map(rec => `💡 ${rec}`).join('\n')}\n\n## Suggested Actions\n${realityCheck.suggestedActions.map(action => `🎯 ${action}`).join('\n')}\n\n${realityCheck.hallucinationRisk === 'high' ? '## 🚨 IMMEDIATE ACTION REQUIRED\n\nHigh hallucination risk detected. Use `human_override` operation immediately to restore control and prevent further confusion.\n\n' : ''}*Reality check helps maintain accuracy during long LLM sessions.*`
          }]
        };
      }

      case 'session_guidance': {
        const guidance = generateSessionGuidance(validatedArgs);
        return {
          content: [{
            type: 'text',
            text: `# 🧭 Session Guidance\n\n## Session Status: ${guidance.sessionStatus.toUpperCase()} ${guidance.sessionStatus === 'critical' ? '🚨' : guidance.sessionStatus === 'concerning' ? '⚠️' : '✅'}\n\n## Guidance\n${guidance.guidance.join('\n')}\n\n## Recommended Next Step\n🎯 **${guidance.recommendedNextStep}**\n\n${guidance.humanInterventionNeeded ? '## 🚨 HUMAN INTERVENTION NEEDED\n\nThe session has reached a state where human override is strongly recommended to maintain progress and accuracy.\n\n**Use the `human_override` operation to:**\n- Force structured execution\n- Break confusion cycles\n- Ensure task completion\n\n' : ''}*Session guidance helps maintain productive long conversations.*`
          }],
          metadata: {
            sessionStatus: guidance.sessionStatus,
            humanInterventionNeeded: guidance.humanInterventionNeeded,
            recommendedNextStep: guidance.recommendedNextStep
          }
        };
      }

      default:
        throw new McpAdrError(`Unknown operation: ${(validatedArgs as any).operation}`, 'INVALID_OPERATION');
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpAdrError(`Invalid input: ${error.errors.map(e => e.message).join(', ')}`, 'INVALID_INPUT');
    }

    throw new McpAdrError(
      `Tool chain orchestration failed: ${error instanceof Error ? error.message : String(error)}`,
      'ORCHESTRATION_ERROR'
    );
  }
}