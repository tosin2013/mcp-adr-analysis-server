/**
 * MCP Tool for deployment completion analysis
 * Implements prompt-driven deployment progress tracking and completion verification
 */

import { McpAdrError } from '../types/index.js';
import { ResearchOrchestrator } from '../utils/research-orchestrator.js';

/**
 * Analyze deployment progress and verify completion
 */
export async function analyzeDeploymentProgress(args: {
  analysisType?: 'tasks' | 'cicd' | 'progress' | 'completion' | 'comprehensive';
  adrDirectory?: string;
  todoPath?: string;
  cicdLogs?: string;
  pipelineConfig?: string;
  deploymentTasks?: Array<{
    taskId: string;
    taskName: string;
    status: string;
    progress: number;
    category: string;
    priority: string;
    verificationCriteria: string[];
    expectedOutcome: string;
  }>;
  outcomeRules?: Array<{
    ruleId: string;
    description: string;
    criteria: string[];
    verificationMethod: string;
  }>;
  actualOutcomes?: Array<{
    taskId: string;
    outcome: string;
    evidence: string[];
    timestamp: string;
  }>;
  cicdStatus?: any;
  environmentStatus?: any;
}): Promise<any> {
  const {
    analysisType = 'comprehensive',
    adrDirectory = 'docs/adrs',
    todoPath,
    cicdLogs,
    pipelineConfig,
    deploymentTasks,
    outcomeRules,
    actualOutcomes,
    cicdStatus,
    environmentStatus,
  } = args;

  try {
    const {
      identifyDeploymentTasks,
      analyzeCiCdStatus,
      calculateDeploymentProgress,
      verifyDeploymentCompletion,
    } = await import('../utils/deployment-analysis.js');

    switch (analysisType) {
      case 'tasks': {
        const result = await identifyDeploymentTasks(adrDirectory, todoPath);

        // Execute the deployment task identification with AI if enabled, otherwise return prompt
        const { executePromptWithFallback, formatMCPResponse } = await import(
          '../utils/prompt-execution.js'
        );
        const executionResult = await executePromptWithFallback(
          result.identificationPrompt,
          result.instructions,
          {
            temperature: 0.1,
            maxTokens: 5000,
            systemPrompt: `You are a DevOps expert specializing in deployment task identification and management.
Analyze the provided ADRs and project context to identify comprehensive deployment tasks.
Focus on creating actionable tasks with clear verification criteria and proper sequencing.
Provide detailed risk assessment and practical implementation guidance.`,
            responseFormat: 'text',
          }
        );

        if (executionResult.isAIGenerated) {
          // AI execution successful - return actual deployment task identification results
          return formatMCPResponse({
            ...executionResult,
            content: `# Deployment Task Identification Results

## Analysis Information
- **ADR Directory**: ${adrDirectory}
- **Todo Path**: ${todoPath || 'Not specified'}

## AI Deployment Task Analysis Results

${executionResult.content}

## Next Steps

Based on the identified deployment tasks:

1. **Review Task List**: Examine each deployment task for completeness and accuracy
2. **Validate Dependencies**: Confirm task sequencing and dependency relationships
3. **Assign Responsibilities**: Determine who will execute each deployment task
4. **Create Timeline**: Establish deployment schedule with milestones
5. **Set Up Monitoring**: Implement progress tracking and verification systems

## Deployment Task Management

Use the identified tasks to:
- **Track Progress**: Monitor deployment progress across all categories
- **Manage Dependencies**: Ensure proper task sequencing and coordination
- **Assess Risks**: Identify and mitigate deployment risks
- **Verify Completion**: Use verification criteria for completion validation
- **Optimize Process**: Improve deployment efficiency and reliability

## Follow-up Analysis

For deeper deployment insights:
- **CI/CD Analysis**: \`analyze_deployment_progress\` with \`analysisType: "cicd"\`
- **Progress Tracking**: \`analyze_deployment_progress\` with \`analysisType: "progress"\`
- **Completion Verification**: \`analyze_deployment_progress\` with \`analysisType: "completion"\`
`,
          });
        } else {
          // Fallback to prompt-only mode
          return {
            content: [
              {
                type: 'text',
                text: `# Deployment Task Identification

${result.instructions}

## AI Task Identification Prompt

${result.identificationPrompt}

## Next Steps

1. **Submit the prompt** to an AI agent for comprehensive task identification
2. **Parse the JSON response** to get deployment tasks and phases
3. **Review task dependencies** and deployment sequencing
4. **Use tasks** for deployment progress tracking and management
`,
              },
            ],
          };
        }
      }

      case 'cicd': {
        if (!cicdLogs) {
          throw new McpAdrError('CI/CD logs are required for pipeline analysis', 'INVALID_INPUT');
        }

        const result = await analyzeCiCdStatus(cicdLogs, pipelineConfig, deploymentTasks as any);

        return {
          content: [
            {
              type: 'text',
              text: `# CI/CD Pipeline Analysis

${result.instructions}

## AI Pipeline Analysis Prompt

${result.analysisPrompt}

## Next Steps

1. **Submit the prompt** to an AI agent for comprehensive pipeline analysis
2. **Parse the JSON response** to get pipeline status and issues
3. **Review performance metrics** and optimization opportunities
4. **Use findings** for deployment progress calculation and issue resolution

## Expected Output

The AI will provide:
- **CI/CD Analysis**: Overall pipeline status and progress assessment
- **Pipeline Stages**: Detailed stage-by-stage analysis with timings
- **Test Results**: Comprehensive test result analysis and coverage
- **Quality Gates**: Quality gate status and compliance assessment
- **Deployment Status**: Environment deployment status and health
- **Issues**: Identified issues with severity and suggested fixes
- **Performance Metrics**: Pipeline performance and resource utilization
- **Recommendations**: Optimization and improvement recommendations

## Pipeline Optimization

Use the analysis results to:
- **Resolve Issues**: Address identified pipeline problems and failures
- **Improve Performance**: Optimize build times and resource usage
- **Enhance Quality**: Strengthen quality gates and testing coverage
- **Increase Reliability**: Improve pipeline stability and success rates
- **Automate Processes**: Identify automation opportunities
`,
            },
          ],
        };
      }

      case 'progress': {
        if (!deploymentTasks) {
          throw new McpAdrError(
            'Deployment tasks are required for progress calculation',
            'INVALID_INPUT'
          );
        }

        const result = await calculateDeploymentProgress(
          deploymentTasks as any,
          cicdStatus,
          environmentStatus
        );

        return {
          content: [
            {
              type: 'text',
              text: `# Deployment Progress Calculation

${result.instructions}

## AI Progress Calculation Prompt

${result.progressPrompt}

## Next Steps

1. **Submit the prompt** to an AI agent for comprehensive progress calculation
2. **Parse the JSON response** to get detailed progress analysis
3. **Review critical path** and bottlenecks
4. **Use progress data** for stakeholder reporting and decision making

## Expected Output

The AI will provide:
- **Deployment Progress**: Overall progress and completion estimates
- **Category Progress**: Progress breakdown by deployment category
- **Task Progress**: Individual task progress and contributions
- **Critical Path**: Critical path analysis and bottleneck identification
- **Milestones**: Milestone progress and status tracking
- **Quality Metrics**: Quality and compliance metric assessment
- **Risk Assessment**: Risk analysis and mitigation strategies
- **Recommendations**: Progress acceleration recommendations
- **Next Actions**: Immediate actions required for progress

## Progress Management

Use the progress calculation to:
- **Track Completion**: Monitor overall deployment completion status
- **Identify Bottlenecks**: Find and address critical path bottlenecks
- **Manage Risks**: Proactively address deployment risks
- **Report Status**: Provide accurate progress reports to stakeholders
- **Accelerate Delivery**: Implement recommendations for faster delivery
`,
            },
          ],
        };
      }

      case 'completion': {
        if (!deploymentTasks || !outcomeRules) {
          throw new McpAdrError(
            'Deployment tasks and outcome rules are required for completion verification',
            'INVALID_INPUT'
          );
        }

        const result = await verifyDeploymentCompletion(
          deploymentTasks as any,
          outcomeRules,
          actualOutcomes
        );

        return {
          content: [
            {
              type: 'text',
              text: `# Deployment Completion Verification

${result.instructions}

## AI Completion Verification Prompt

${result.verificationPrompt}

## Next Steps

1. **Submit the prompt** to an AI agent for comprehensive completion verification
2. **Parse the JSON response** to get verification results and compliance status
3. **Review completion gaps** and quality assessments
4. **Use verification results** for sign-off decisions and go-live recommendations

## Expected Output

The AI will provide:
- **Completion Verification**: Overall completion status and confidence
- **Task Verification**: Individual task verification results
- **Rule Compliance**: Outcome rule compliance assessment
- **Quality Assessment**: Quality and compliance metric evaluation
- **Success Metrics**: Success metric evaluation and variance analysis
- **Completion Gaps**: Identified gaps and remediation strategies
- **Recommendations**: Completion and quality improvement recommendations
- **Sign-Off Status**: Sign-off readiness and go-live recommendation

## Completion Management

Use the verification results to:
- **Validate Completion**: Ensure all deployment tasks are properly completed
- **Assess Quality**: Verify quality standards and acceptance criteria
- **Manage Sign-Off**: Make informed sign-off and go-live decisions
- **Address Gaps**: Remediate identified completion gaps
- **Ensure Compliance**: Verify compliance with outcome rules and standards
`,
            },
          ],
        };
      }

      case 'comprehensive': {
        // Step 0: Research environment state
        let environmentResearch = '';
        try {
          const orchestrator = new ResearchOrchestrator(process.cwd(), adrDirectory);
          const research = await orchestrator.answerResearchQuestion(
            `Analyze current deployment environment state:
1. What deployment tools and infrastructure are available?
2. What is the current deployment pipeline status?
3. Are there any deployment blockers or issues?
4. What deployment-related ADRs are documented?`
          );

          const envSource = research.sources.find(s => s.type === 'environment');
          const capabilities = envSource?.data?.capabilities || [];

          environmentResearch = `
## 🔍 Environment Research Analysis

**Research Confidence**: ${(research.confidence * 100).toFixed(1)}%

### Current Environment State
${research.answer || 'No environment data available'}

### Available Infrastructure
${capabilities.length > 0 ? capabilities.map((c: string) => `- ${c}`).join('\n') : '- No infrastructure tools detected'}

### Sources Consulted
${research.sources.map(s => `- ${s.type}: ✅ Available`).join('\n')}

${research.needsWebSearch ? '⚠️ **Note**: Local data may be insufficient - external verification recommended\n' : ''}
`;
        } catch (error) {
          environmentResearch = `\n## ⚠️ Environment Research\nFailed to analyze environment: ${error instanceof Error ? error.message : String(error)}\n`;
        }

        const taskResult = await identifyDeploymentTasks(adrDirectory, todoPath);

        return {
          content: [
            {
              type: 'text',
              text: `# Comprehensive Deployment Analysis

This comprehensive analysis will provide end-to-end deployment progress tracking and completion verification.

${environmentResearch}

## Deployment Analysis Workflow

### 1. **Task Identification** (First Step)
Identify deployment tasks from ADRs and todo content.

${taskResult.instructions}

#### Task Identification Prompt
${taskResult.identificationPrompt}

### 2. **CI/CD Analysis** (Second Step)
Analyze CI/CD pipeline status and performance:
\`\`\`json
{
  "tool": "analyze_deployment_progress",
  "args": {
    "analysisType": "cicd",
    "cicdLogs": "[CI/CD log content]",
    "pipelineConfig": "[pipeline configuration]",
    "deploymentTasks": [results from step 1]
  }
}
\`\`\`

### 3. **Progress Calculation** (Third Step)
Calculate comprehensive deployment progress:
\`\`\`json
{
  "tool": "analyze_deployment_progress",
  "args": {
    "analysisType": "progress",
    "deploymentTasks": [results from step 1],
    "cicdStatus": [results from step 2],
    "environmentStatus": "[environment status data]"
  }
}
\`\`\`

### 4. **Completion Verification** (Fourth Step)
Verify deployment completion with outcome rules:
\`\`\`json
{
  "tool": "analyze_deployment_progress",
  "args": {
    "analysisType": "completion",
    "deploymentTasks": [results from step 1],
    "outcomeRules": [defined outcome rules],
    "actualOutcomes": [actual deployment outcomes]
  }
}
\`\`\`

## Expected Outcomes

This comprehensive analysis will provide:
- **Complete Task Inventory**: All deployment tasks identified and categorized
- **Pipeline Health Assessment**: CI/CD pipeline status and performance analysis
- **Accurate Progress Tracking**: Real-time deployment progress calculation
- **Completion Verification**: Rigorous completion verification with outcome rules
- **Risk Management**: Comprehensive risk assessment and mitigation
- **Quality Assurance**: Quality metrics and compliance verification
- **Stakeholder Reporting**: Executive dashboards and progress reports

## Deployment Excellence

This analysis ensures:
- **Visibility**: Complete visibility into deployment status and progress
- **Quality**: High-quality deployments meeting all criteria
- **Reliability**: Reliable deployment processes with risk mitigation
- **Compliance**: Compliance with outcome rules and standards
- **Efficiency**: Optimized deployment processes and timelines
- **Accountability**: Clear accountability and sign-off processes

## Integration with AI Agents

The deployment analysis integrates with AI agents for:
- **Automated Monitoring**: Continuous monitoring of deployment progress
- **Intelligent Alerting**: Smart alerts for issues and bottlenecks
- **Predictive Analysis**: Predictive insights for deployment success
- **Automated Remediation**: Automated issue resolution and optimization
- **Continuous Improvement**: Learning from deployment patterns and outcomes
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
      `Failed to analyze deployment progress: ${error instanceof Error ? error.message : String(error)}`,
      'DEPLOYMENT_ANALYSIS_ERROR'
    );
  }
}
