/**
 * Simple Human Override Tool
 * 
 * Forces AI-powered planning through OpenRouter.ai when humans need
 * to cut through LLM confusion and get specific tasks done.
 */

import { z } from 'zod';
import { McpAdrError } from '../types/index.js';
import { loadAIConfig, isAIExecutionEnabled, getRecommendedModel } from '../config/ai-config.js';
import { KnowledgeGraphManager } from '../utils/knowledge-graph-manager.js';

// Simple human override schema
const HumanOverrideSchema = z.object({
  taskDescription: z.string().describe('What the human wants accomplished (in plain English)'),
  projectPath: z.string().describe('Path to project directory'),
  adrDirectory: z.string().default('docs/adrs').describe('ADR directory path'),
  todoPath: z.string().default('TODO.md').describe('Path to TODO.md file'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('high').describe('Task priority'),
  forceExecution: z.boolean().default(true).describe('Force immediate execution planning'),
  deadline: z.string().optional().describe('When this must be completed'),
  additionalContext: z.string().optional().describe('Any additional context or constraints')
});

type HumanOverrideArgs = z.infer<typeof HumanOverrideSchema>;

/**
 * Generate execution plan using AI (forced override mode)
 */
async function generateForcedAIPlan(args: HumanOverrideArgs): Promise<{
  planId: string;
  toolChain: Array<{ tool: string; params: Record<string, any>; description: string }>;
  executionNotes: string[];
  confidence: number;
}> {
  const aiConfig = loadAIConfig();
  
  if (!isAIExecutionEnabled(aiConfig)) {
    // Fallback to basic analysis if AI not available
    return generateFallbackPlan(args);
  }

  // Available MCP tools for AI to choose from
  const availableTools = [
    'analyze_project_ecosystem - Analyze technology stack and architectural patterns',
    'generate_adrs_from_prd - Convert requirements to Architectural Decision Records',
    'suggest_adrs - Auto-suggest ADRs based on code analysis',
    'analyze_content_security - Detect and mask sensitive information',
    'generate_rules - Extract architectural rules from project',
    'generate_adr_todo - Generate TODO.md from ADRs with task breakdown',
    'compare_adr_progress - Validate TODO vs ADRs vs environment state',
    'manage_todo - TODO.md lifecycle management and progress tracking',
    'generate_deployment_guidance - AI-driven deployment procedures',
    'smart_score - Project health scoring with cross-tool sync',
    'troubleshoot_guided_workflow - Systematic troubleshooting workflow',
    'smart_git_push - Release readiness analysis and git operations',
    'generate_research_questions - Generate targeted research questions',
    'validate_rules - Validate architectural rule compliance',
    'analyze_deployment_progress - Analyze deployment progress and completion'
  ];

  const systemPrompt = `You are an expert MCP tool orchestrator. A human has issued an override command to force completion of a specific task.

CRITICAL: The human wants this task completed efficiently and correctly. Generate a focused tool execution plan.

Available MCP Tools:
${availableTools.join('\n')}

Project Context:
- Project Path: ${args.projectPath}
- ADR Directory: ${args.adrDirectory}  
- TODO Path: ${args.todoPath}
- Priority: ${args.priority}
- Force Execution: ${args.forceExecution}

Return a JSON plan with this exact structure:
{
  "planId": "override-TIMESTAMP",
  "toolChain": [
    {
      "tool": "tool_name",
      "params": {
        "projectPath": "${args.projectPath}",
        "adrDirectory": "${args.adrDirectory}",
        "todoPath": "${args.todoPath}"
      },
      "description": "what this step accomplishes"
    }
  ],
  "executionNotes": [
    "Step-by-step execution guidance",
    "Important considerations"
  ],
  "confidence": 0.95
}

Keep the plan focused and executable. Maximum 5 tools unless the task is very complex.`;

  const userPrompt = `HUMAN OVERRIDE TASK: "${args.taskDescription}"

${args.additionalContext ? `Additional Context: ${args.additionalContext}` : ''}
${args.deadline ? `Deadline: ${args.deadline}` : ''}

Priority: ${args.priority.toUpperCase()}

Generate an optimal tool execution plan to complete this task efficiently.`;

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
        model: getRecommendedModel('analysis'),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1, // Low for consistent planning
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const result = await response.json();
    const planContent = result.choices?.[0]?.message?.content;

    if (!planContent) {
      throw new Error('No plan generated from AI');
    }

    const aiPlan = JSON.parse(planContent);
    
    // Validate and ensure required structure
    return {
      planId: aiPlan.planId || `override-${Date.now()}`,
      toolChain: aiPlan.toolChain || [],
      executionNotes: aiPlan.executionNotes || ['Execute tools in sequence', 'Report results after each step'],
      confidence: aiPlan.confidence || 0.8
    };

  } catch (error) {
    // Fallback to basic planning
    return generateFallbackPlan(args);
  }
}

/**
 * Extract goals from task description using simple keyword analysis
 */
function extractGoalsFromDescription(description: string): string[] {
  const goals: string[] = [];
  const lowerDesc = description.toLowerCase();
  
  // Goal detection patterns
  const goalPatterns = [
    { pattern: /analyze|analysis/, goal: 'Analyze project or codebase' },
    { pattern: /generate|create/, goal: 'Generate or create artifacts' },
    { pattern: /deploy|deployment/, goal: 'Handle deployment tasks' },
    { pattern: /todo|task/, goal: 'Manage TODO and task tracking' },
    { pattern: /adr|decision/, goal: 'Work with architectural decisions' },
    { pattern: /test|testing/, goal: 'Handle testing and validation' },
    { pattern: /fix|repair|solve/, goal: 'Fix or resolve issues' },
    { pattern: /document|documentation/, goal: 'Create or update documentation' },
    { pattern: /score|health|metrics/, goal: 'Evaluate project health and metrics' },
    { pattern: /integrate|integration/, goal: 'Integrate systems or components' }
  ];

  for (const { pattern, goal } of goalPatterns) {
    if (pattern.test(lowerDesc)) {
      goals.push(goal);
    }
  }

  // Default goal if no patterns match
  if (goals.length === 0) {
    goals.push('Complete requested task');
  }

  return goals;
}

/**
 * Fallback plan generation when AI is not available
 */
function generateFallbackPlan(args: HumanOverrideArgs): {
  planId: string;
  toolChain: Array<{ tool: string; params: Record<string, any>; description: string }>;
  executionNotes: string[];
  confidence: number;
} {
  const task = args.taskDescription.toLowerCase();
  const toolChain: Array<{ tool: string; params: Record<string, any>; description: string }> = [];
  
  const baseParams = {
    projectPath: args.projectPath,
    adrDirectory: args.adrDirectory,
    todoPath: args.todoPath
  };

  // Basic keyword matching for fallback
  if (task.includes('analyze') || task.includes('analysis')) {
    toolChain.push({
      tool: 'analyze_project_ecosystem',
      params: baseParams,
      description: 'Analyze project ecosystem and technology stack'
    });
  }
  
  if (task.includes('todo') || task.includes('task')) {
    toolChain.push({
      tool: 'manage_todo',
      params: { ...baseParams, operation: 'analyze_progress' },
      description: 'Analyze TODO.md progress and task status'
    });
  }
  
  if (task.includes('deploy') || task.includes('release')) {
    toolChain.push({
      tool: 'smart_git_push',
      params: { ...baseParams, checkReleaseReadiness: true },
      description: 'Check deployment and release readiness'
    });
  }

  if (task.includes('adr') || task.includes('decision')) {
    toolChain.push({
      tool: 'suggest_adrs',
      params: baseParams,
      description: 'Analyze and suggest architectural decisions'
    });
  }

  if (task.includes('score') || task.includes('health')) {
    toolChain.push({
      tool: 'smart_score',
      params: { ...baseParams, operation: 'recalculate_scores' },
      description: 'Calculate project health scores'
    });
  }

  // Default fallback if no keywords match
  if (toolChain.length === 0) {
    toolChain.push({
      tool: 'analyze_project_ecosystem',
      params: baseParams,
      description: 'General project analysis as requested'
    });
  }

  return {
    planId: `fallback-override-${Date.now()}`,
    toolChain,
    executionNotes: [
      'Fallback plan generated (AI not available)',
      'Execute tools in sequence',
      'Verify results manually'
    ],
    confidence: 0.6
  };
}

/**
 * Main human override function
 */
export async function humanOverride(args: HumanOverrideArgs): Promise<any> {
  try {
    const validatedArgs = HumanOverrideSchema.parse(args);
    
    // Initialize knowledge graph manager
    const kgManager = new KnowledgeGraphManager();
    
    // Parse goals from task description
    const parsedGoals = extractGoalsFromDescription(validatedArgs.taskDescription);
    
    // Create intent snapshot in knowledge graph
    const intentId = await kgManager.createIntent(
      validatedArgs.taskDescription,
      parsedGoals,
      validatedArgs.priority === 'critical' ? 'high' : validatedArgs.priority
    );
    
    // Generate AI-powered execution plan
    const plan = await generateForcedAIPlan(validatedArgs);
    
    // Store initial plan in knowledge graph
    await kgManager.addToolExecution(
      intentId,
      'human_override_planning',
      validatedArgs,
      { plan },
      true,
      [],
      [],
      undefined
    );
    
    // Generate structured LLM command schema
    const llmCommandSchema = {
      type: "object",
      properties: {
        humanOverrideRequest: {
          type: "object",
          properties: {
            taskDescription: {
              type: "string",
              description: validatedArgs.taskDescription
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
              default: validatedArgs.priority
            },
            executionPlan: {
              type: "object",
              properties: {
                planId: { type: "string", default: plan.planId },
                confidence: { type: "number", default: plan.confidence },
                toolChain: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      stepId: { type: "string" },
                      tool: { type: "string" },
                      params: { type: "object" },
                      description: { type: "string" },
                      conditional: { type: "boolean", default: false },
                      retryable: { type: "boolean", default: true }
                    },
                    required: ["tool", "params", "description"]
                  }
                }
              },
              required: ["planId", "toolChain"]
            },
            executionInstructions: {
              type: "array",
              items: { type: "string" },
              default: [
                "Execute each tool in the exact sequence provided",
                "Use the exact parameters shown in the toolChain",
                "Report results after each step before proceeding",
                "Do not deviate from the plan unless critical errors occur",
                "If any step fails, stop execution and report the failure immediately"
              ]
            }
          },
          required: ["taskDescription", "priority", "executionPlan"]
        }
      },
      required: ["humanOverrideRequest"]
    };

    return {
      content: [{
        type: 'text',
        text: `# 🚨 HUMAN OVERRIDE ACTIVATED

## Task Request
**Description**: ${validatedArgs.taskDescription}
**Priority**: ${validatedArgs.priority.toUpperCase()}
**Force Execution**: ${validatedArgs.forceExecution ? 'YES' : 'NO'}
${validatedArgs.deadline ? `**Deadline**: ${validatedArgs.deadline}` : ''}

## AI-Generated Execution Plan
**Plan ID**: \`${plan.planId}\`
**Confidence**: ${(plan.confidence * 100).toFixed(0)}%

## Tool Execution Chain

${plan.toolChain.map((step, i) => `### Step ${i + 1}: ${step.description}

**Tool**: \`${step.tool}\`

**Parameters**:
\`\`\`json
${JSON.stringify(step.params, null, 2)}
\`\`\`

`).join('')}

## Execution Notes
${plan.executionNotes.map(note => `• ${note}`).join('\n')}

## ⚠️ HUMAN OVERRIDE INSTRUCTIONS

1. **Execute each tool in the exact sequence shown above**
2. **Use the exact parameters provided**
3. **Report results after each step before proceeding**
4. **Do not deviate from the plan unless critical errors occur**
5. **If any step fails, stop and report the failure**

${validatedArgs.deadline ? `**DEADLINE**: ${validatedArgs.deadline} - Execute promptly!` : ''}

## 📋 Structured Command Schema for LLM

The LLM should use this JSON schema structure to understand and execute the human override request:

\`\`\`json
${JSON.stringify(llmCommandSchema, null, 2)}
\`\`\`

## 🤖 LLM Execution Data

When executing this human override, use the following structured data:

\`\`\`json
{
  "humanOverrideRequest": {
    "taskDescription": "${validatedArgs.taskDescription}",
    "priority": "${validatedArgs.priority}",
    "executionPlan": {
      "planId": "${plan.planId}",
      "confidence": ${plan.confidence},
      "toolChain": ${JSON.stringify(plan.toolChain.map((step, i) => ({
        stepId: `step_${i + 1}`,
        tool: step.tool,
        params: step.params,
        description: step.description,
        conditional: false,
        retryable: true
      })), null, 6)}
    },
    "executionInstructions": [
      "Execute each tool in the exact sequence provided",
      "Use the exact parameters shown in the toolChain",
      "Report results after each step before proceeding",
      "Do not deviate from the plan unless critical errors occur",
      "If any step fails, stop execution and report the failure immediately"
    ]
  }
}
\`\`\`

*This plan was generated by AI to fulfill your specific request. The structured schema ensures precise LLM understanding and execution.*`
      }],
      metadata: {
        intentId,
        planId: plan.planId,
        isHumanOverride: true,
        toolCount: plan.toolChain.length,
        confidence: plan.confidence,
        priority: validatedArgs.priority,
        forceExecution: validatedArgs.forceExecution,
        parsedGoals,
        llmCommandSchema,
        structuredExecutionData: {
          humanOverrideRequest: {
            taskDescription: validatedArgs.taskDescription,
            priority: validatedArgs.priority,
            executionPlan: {
              planId: plan.planId,
              confidence: plan.confidence,
              toolChain: plan.toolChain.map((step, i) => ({
                stepId: `step_${i + 1}`,
                tool: step.tool,
                params: step.params,
                description: step.description,
                conditional: false,
                retryable: true
              }))
            },
            executionInstructions: [
              "Execute each tool in the exact sequence provided",
              "Use the exact parameters shown in the toolChain",
              "Report results after each step before proceeding",
              "Do not deviate from the plan unless critical errors occur",
              "If any step fails, stop execution and report the failure immediately"
            ]
          }
        }
      }
    };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpAdrError(`Invalid input: ${error.errors.map(e => e.message).join(', ')}`, 'INVALID_INPUT');
    }
    
    throw new McpAdrError(
      `Human override failed: ${error instanceof Error ? error.message : String(error)}`,
      'OVERRIDE_ERROR'
    );
  }
}