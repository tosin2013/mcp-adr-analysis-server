/**
 * Deployment analysis utilities using prompt-driven AI analysis
 * Implements intelligent deployment progress tracking and completion verification
 */

import { McpAdrError } from '../types/index.js';

export interface DeploymentTask {
  taskId: string;
  taskName: string;
  description: string;
  category: 'infrastructure' | 'application' | 'cicd' | 'operational';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'failed';
  progress: number;
  verificationCriteria: string[];
  expectedOutcome: string;
  sourceAdr?: string;
}

export interface OutcomeRule {
  ruleId: string;
  description: string;
  criteria: string[];
  verificationMethod: string;
}

export interface DeploymentProgress {
  overallProgress: number;
  categoryProgress: Record<string, number>;
  criticalPath: {
    tasks: string[];
    progress: number;
    bottlenecks: string[];
  };
  estimatedCompletion: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Identify deployment tasks from ADRs and todo content
 */
export async function identifyDeploymentTasks(
  adrDirectory: string = 'docs/adrs',
  todoPath?: string
): Promise<{ identificationPrompt: string; instructions: string; actualData?: any }> {
  try {
    // Use actual ADR discovery instead of prompts
    const { discoverAdrsInDirectory } = await import('./adr-discovery.js');

    // Actually read ADR files
    const discoveryResult = await discoverAdrsInDirectory(adrDirectory, process.cwd(), {
      includeContent: true,
      includeTimeline: false,
    });

    // Read TODO file if provided
    let todoContent = '';
    if (todoPath) {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const fullTodoPath = path.resolve(process.cwd(), todoPath);
        todoContent = await fs.readFile(fullTodoPath, 'utf-8');
      } catch (error) {
        console.warn(`Could not read TODO file at ${todoPath}: ${error}`);
        todoContent = `[TODO file at ${todoPath} could not be read]`;
      }
    }

    // Create comprehensive deployment task identification prompt
    const deploymentAnalysisPrompt = `
# Deployment Task Identification

Based on actual ADR file analysis and TODO content, identify deployment-related tasks:

## Discovered ADRs (${discoveryResult.totalAdrs} total)

${
  discoveryResult.adrs.length > 0
    ? discoveryResult.adrs
        .map(
          (adr, index) => `
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

## TODO Content Analysis

${
  todoPath
    ? `
### TODO File: ${todoPath}
\`\`\`
${todoContent}
\`\`\`

Extract any deployment-related tasks, infrastructure requirements, or operational concerns from the actual TODO content above.
`
    : '**No TODO file provided.** Only ADR content will be analyzed for deployment tasks.'
}

## Task Identification Criteria

For each ADR with **actual content** and TODO content shown above:
1. Extract deployment-related decisions and requirements from **actual ADR content**
2. Identify infrastructure components mentioned
3. Find CI/CD pipeline requirements
4. Detect operational concerns and monitoring needs
5. Categorize tasks by type: Infrastructure, Application, CI/CD, Operational

## Required Output Format

Please provide deployment task analysis in JSON format with:
- Task identification and categorization based on actual content
- Priority and complexity assessment
- Dependencies between tasks derived from actual ADR content
- Implementation timeline recommendations

## Expected AI Response Format
The AI will return a JSON object with:
- \`deploymentTaskAnalysis\`: Overall analysis metadata and confidence
- \`identifiedTasks\`: Detailed deployment tasks with verification criteria based on actual content
- \`deploymentPhases\`: Organized deployment phases and sequencing
- \`deploymentDependencies\`: Task dependencies and constraints from actual ADRs
- \`riskAssessment\`: Deployment risks and mitigation strategies
- \`recommendations\`: Process and tooling recommendations
`;

    const instructions = `
# Deployment Task Identification Instructions

This analysis provides **actual ADR content and TODO content** to identify deployment-related tasks for comprehensive deployment tracking.

## Analysis Scope
- **ADR Directory**: ${adrDirectory}
- **ADRs Found**: ${discoveryResult.totalAdrs} files
- **ADRs with Content**: ${discoveryResult.adrs.filter(adr => adr.content).length} ADRs
- **Todo Content**: ${todoPath ? `✅ Included (${todoContent.length} characters)` : '❌ Not provided'}
- **Task Categories**: Infrastructure, Application, CI/CD, Operational

## Discovered ADR Summary
${discoveryResult.adrs.map(adr => `- **${adr.title}** (${adr.status})`).join('\n')}

## Next Steps
1. **Submit the analysis prompt** to an AI agent for deployment task identification based on **actual content**
2. **Parse the JSON response** to get categorized deployment tasks
3. **Review task priorities** and dependencies derived from actual ADR content
4. **Use findings** for deployment planning and execution

## Expected AI Response Format
The AI will return a JSON object with:
- \`deploymentTaskAnalysis\`: Overall analysis metadata and confidence
- \`identifiedTasks\`: Detailed deployment tasks with verification criteria based on actual ADR content
- \`deploymentPhases\`: Organized deployment phases and sequencing
- \`deploymentDependencies\`: Task dependencies and constraints from actual ADRs
- \`riskAssessment\`: Deployment risks and mitigation strategies
- \`recommendations\`: Process and tooling recommendations

## Usage Example
\`\`\`typescript
const result = await identifyDeploymentTasks(adrDirectory, todoPath);
// Submit result.identificationPrompt to AI agent
// Parse AI response for deployment tasks based on actual ADR and TODO content
\`\`\`
`;

    return {
      identificationPrompt: deploymentAnalysisPrompt,
      instructions,
      actualData: {
        discoveryResult,
        todoContent,
        todoPath,
        summary: {
          totalAdrs: discoveryResult.totalAdrs,
          adrsWithContent: discoveryResult.adrs.filter(adr => adr.content).length,
          todoProvided: !!todoPath,
          todoLength: todoContent.length,
        },
      },
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to identify deployment tasks: ${error instanceof Error ? error.message : String(error)}`,
      'DEPLOYMENT_TASK_IDENTIFICATION_ERROR'
    );
  }
}

/**
 * Analyze CI/CD logs and pipeline status
 */
export async function analyzeCiCdStatus(
  cicdLogs: string,
  pipelineConfig?: string,
  deploymentTasks?: DeploymentTask[]
): Promise<{ analysisPrompt: string; instructions: string }> {
  try {
    const { generateCiCdAnalysisPrompt } = await import(
      '../prompts/deployment-analysis-prompts.js'
    );

    // Prepare deployment tasks context
    const tasksContext = deploymentTasks?.map(task => ({
      taskId: task.taskId,
      taskName: task.taskName,
      category: task.category,
      verificationCriteria: task.verificationCriteria,
    }));

    const analysisPrompt = generateCiCdAnalysisPrompt(cicdLogs, pipelineConfig, tasksContext);

    const instructions = `
# CI/CD Pipeline Analysis Instructions

This analysis will examine CI/CD logs and pipeline configuration to assess deployment progress and identify issues.

## Analysis Scope
- **CI/CD Logs**: ${cicdLogs.length} characters of log data
- **Pipeline Config**: ${pipelineConfig ? 'Included' : 'Not provided'}
- **Deployment Tasks**: ${deploymentTasks?.length || 0} tasks for context
- **Analysis Areas**: Build status, test results, quality gates, deployment status

## Next Steps
1. **Submit the analysis prompt** to an AI agent for comprehensive CI/CD analysis
2. **Parse the JSON response** to get pipeline status and issues
3. **Review performance metrics** and optimization opportunities
4. **Use findings** for deployment progress calculation and issue resolution

## Expected AI Response Format
The AI will return a JSON object with:
- \`cicdAnalysis\`: Overall pipeline status and progress
- \`pipelineStages\`: Detailed stage-by-stage analysis
- \`testResults\`: Comprehensive test result analysis
- \`qualityGates\`: Quality gate status and compliance
- \`deploymentStatus\`: Environment deployment status
- \`issues\`: Identified issues with suggested fixes
- \`performanceMetrics\`: Pipeline performance and resource usage
- \`recommendations\`: Optimization and improvement recommendations

## Usage Example
\`\`\`typescript
const result = await analyzeCiCdStatus(logs, config, tasks);
// Submit result.analysisPrompt to AI agent
// Parse AI response for CI/CD analysis
\`\`\`
`;

    return {
      analysisPrompt,
      instructions,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to analyze CI/CD status: ${error instanceof Error ? error.message : String(error)}`,
      'CICD_ANALYSIS_ERROR'
    );
  }
}

/**
 * Calculate deployment progress
 */
export async function calculateDeploymentProgress(
  deploymentTasks: DeploymentTask[],
  cicdStatus?: any,
  environmentStatus?: any
): Promise<{ progressPrompt: string; instructions: string }> {
  try {
    const { generateDeploymentProgressCalculationPrompt } = await import(
      '../prompts/deployment-analysis-prompts.js'
    );

    // Prepare task data for progress calculation
    const taskData = deploymentTasks.map(task => ({
      taskId: task.taskId,
      taskName: task.taskName,
      status: task.status,
      progress: task.progress,
      category: task.category,
      priority: task.priority,
    }));

    const progressPrompt = generateDeploymentProgressCalculationPrompt(
      taskData,
      cicdStatus,
      environmentStatus
    );

    const instructions = `
# Deployment Progress Calculation Instructions

This analysis will calculate comprehensive deployment progress based on tasks, CI/CD status, and environment status.

## Progress Calculation
- **Deployment Tasks**: ${deploymentTasks.length} tasks
- **Task Categories**: ${Array.from(new Set(deploymentTasks.map(t => t.category))).join(', ')}
- **CI/CD Status**: ${cicdStatus ? 'Included' : 'Not provided'}
- **Environment Status**: ${environmentStatus ? 'Included' : 'Not provided'}

## Next Steps
1. **Submit the progress prompt** to an AI agent for comprehensive calculation
2. **Parse the JSON response** to get detailed progress analysis
3. **Review critical path** and bottlenecks
4. **Use progress data** for stakeholder reporting and decision making

## Expected AI Response Format
The AI will return a JSON object with:
- \`deploymentProgress\`: Overall progress and completion estimates
- \`categoryProgress\`: Progress by deployment category
- \`taskProgress\`: Individual task progress and contributions
- \`criticalPath\`: Critical path analysis and bottlenecks
- \`milestones\`: Milestone progress and status
- \`qualityMetrics\`: Quality and compliance metrics
- \`riskAssessment\`: Risk analysis and mitigation
- \`recommendations\`: Progress acceleration recommendations
- \`nextActions\`: Immediate actions required

## Usage Example
\`\`\`typescript
const result = await calculateDeploymentProgress(tasks, cicdStatus, envStatus);
// Submit result.progressPrompt to AI agent
// Parse AI response for progress calculation
\`\`\`
`;

    return {
      progressPrompt,
      instructions,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to calculate deployment progress: ${error instanceof Error ? error.message : String(error)}`,
      'PROGRESS_CALCULATION_ERROR'
    );
  }
}

/**
 * Verify deployment completion with outcome rules
 */
export async function verifyDeploymentCompletion(
  deploymentTasks: DeploymentTask[],
  outcomeRules: OutcomeRule[],
  actualOutcomes?: Array<{
    taskId: string;
    outcome: string;
    evidence: string[];
    timestamp: string;
  }>
): Promise<{ verificationPrompt: string; instructions: string }> {
  try {
    const { generateCompletionVerificationPrompt } = await import(
      '../prompts/deployment-analysis-prompts.js'
    );

    // Prepare task data for verification
    const taskData = deploymentTasks.map(task => ({
      taskId: task.taskId,
      taskName: task.taskName,
      verificationCriteria: task.verificationCriteria,
      expectedOutcome: task.expectedOutcome,
      status: task.status,
    }));

    const verificationPrompt = generateCompletionVerificationPrompt(
      taskData,
      outcomeRules,
      actualOutcomes
    );

    const instructions = `
# Deployment Completion Verification Instructions

This analysis will verify deployment completion by comparing actual outcomes against expected outcome rules.

## Verification Scope
- **Deployment Tasks**: ${deploymentTasks.length} tasks to verify
- **Outcome Rules**: ${outcomeRules.length} rules to validate
- **Actual Outcomes**: ${actualOutcomes?.length || 0} outcomes provided
- **Verification Areas**: Criteria compliance, outcome validation, quality assessment

## Next Steps
1. **Submit the verification prompt** to an AI agent for comprehensive verification
2. **Parse the JSON response** to get completion verification results
3. **Review compliance gaps** and quality assessments
4. **Use verification results** for sign-off decisions and go-live recommendations

## Expected AI Response Format
The AI will return a JSON object with:
- \`completionVerification\`: Overall completion status and confidence
- \`taskVerification\`: Individual task verification results
- \`ruleCompliance\`: Outcome rule compliance assessment
- \`qualityAssessment\`: Quality and compliance metrics
- \`successMetrics\`: Success metric evaluation
- \`completionGaps\`: Identified gaps and remediation
- \`recommendations\`: Completion and quality recommendations
- \`signOffStatus\`: Sign-off readiness and go-live recommendation

## Usage Example
\`\`\`typescript
const result = await verifyDeploymentCompletion(tasks, rules, outcomes);
// Submit result.verificationPrompt to AI agent
// Parse AI response for completion verification
\`\`\`
`;

    return {
      verificationPrompt,
      instructions,
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to verify deployment completion: ${error instanceof Error ? error.message : String(error)}`,
      'COMPLETION_VERIFICATION_ERROR'
    );
  }
}
