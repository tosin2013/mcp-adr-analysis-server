/**
 * MCP Tool for guided troubleshooting workflow
 * Provides systematic troubleshooting with ADR/TODO alignment
 */

import { z } from 'zod';
import { McpAdrError } from '../types/index.js';

// Issue collection schema
const IssueDetailsSchema = z.object({
  description: z.string().describe('What is happening? Describe the issue in detail'),
  expectedBehavior: z.string().describe('What should be happening instead?'),
  symptoms: z.array(z.string()).describe('Observable symptoms, error messages, or behaviors'),
  context: z.object({
    environment: z.string().optional().describe('Environment where issue occurs (dev, staging, prod)'),
    recentChanges: z.string().optional().describe('What changed recently that might be related?'),
    affectedSystems: z.array(z.string()).optional().describe('Systems or components affected'),
    errorLogs: z.string().optional().describe('Relevant error logs or stack traces'),
    reproducibility: z.enum(['always', 'sometimes', 'once']).optional().describe('How reliably can this be reproduced?')
  }).describe('Additional context about the issue')
});

// Troubleshooting operation schema
const TroubleshootSchema = z.object({
  operation: z.enum(['collect_issue', 'full_workflow']).describe('Type of troubleshooting operation'),
  issue: IssueDetailsSchema.optional().describe('Issue details (required for collect_issue)'),
  projectPath: z.string().optional().describe('Path to project directory'),
  adrDirectory: z.string().default('docs/adrs').describe('ADR directory path'),
  todoPath: z.string().default('todo.md').describe('Path to TODO.md file'),
  skipSteps: z.array(z.enum(['baseline', 'todo_alignment', 'questions', 'adr_validation', 'recommendations'])).optional().describe('Steps to skip in full workflow')
});

type TroubleshootArgs = z.infer<typeof TroubleshootSchema>;
type IssueDetails = z.infer<typeof IssueDetailsSchema>;

/**
 * Collect and understand the issue details
 */
async function collectIssueDetails(issue: IssueDetails): Promise<string> {
  const report = [
    '# 🔍 Issue Collection & Understanding',
    '',
    '## Problem Description',
    issue.description,
    '',
    '## Expected Behavior',
    issue.expectedBehavior,
    '',
    '## Observed Symptoms',
    ...issue.symptoms.map(symptom => `- ${symptom}`),
    ''
  ];

  if (issue.context.environment) {
    report.push(`**Environment**: ${issue.context.environment}`);
  }

  if (issue.context.recentChanges) {
    report.push('## Recent Changes');
    report.push(issue.context.recentChanges);
    report.push('');
  }

  if (issue.context.affectedSystems && issue.context.affectedSystems.length > 0) {
    report.push('## Affected Systems');
    report.push(...issue.context.affectedSystems.map(system => `- ${system}`));
    report.push('');
  }

  if (issue.context.errorLogs) {
    report.push('## Error Logs');
    report.push('```');
    report.push(issue.context.errorLogs);
    report.push('```');
    report.push('');
  }

  if (issue.context.reproducibility) {
    report.push(`**Reproducibility**: ${issue.context.reproducibility}`);
    report.push('');
  }

  report.push('## Next Steps');
  report.push('1. ✅ Issue collected and understood');
  report.push('2. ⏳ Baseline reality check with ADRs');
  report.push('3. ⏳ TODO alignment analysis');
  report.push('4. ⏳ Generate targeted questions');
  report.push('5. ⏳ ADR validation');
  report.push('6. ⏳ Guided recommendations');

  return report.join('\n');
}

/**
 * Run the full troubleshooting workflow
 */
async function runFullWorkflow(args: TroubleshootArgs): Promise<string> {
  const report = [
    '# 🔧 Guided Troubleshooting Workflow',
    '',
    '## Workflow Overview',
    '1. ✅ Issue collected and understood',
    '2. 🔄 Baseline reality check with ADRs',
    '3. 🔄 TODO alignment analysis',
    '4. 🔄 Generate targeted questions',
    '5. 🔄 ADR validation',
    '6. 🔄 Guided recommendations',
    ''
  ];

  const skipSteps = args.skipSteps || [];

  // Step 2: Baseline Reality Check
  if (!skipSteps.includes('baseline')) {
    report.push('## Step 2: Baseline Reality Check');
    report.push('');
    report.push('### Tool Integration Required');
    report.push('- **Tool**: `compare_adr_progress`');
    report.push('- **Purpose**: Compare current environment state vs ADR expectations');
    report.push('- **Analysis**: Identify gaps between documented decisions and reality');
    report.push('');
    report.push('### Key Questions');
    report.push('- Are we running the architecture described in the ADRs?');
    report.push('- Have ADR decisions been properly implemented?');
    report.push('- Are there environment mismatches?');
    report.push('');
  }

  // Step 3: TODO Alignment
  if (!skipSteps.includes('todo_alignment')) {
    report.push('## Step 3: TODO Alignment Analysis');
    report.push('');
    report.push('### Tool Integration Required');
    report.push('- **Tool**: `manage_todo` (analyze_progress operation)');
    report.push('- **Purpose**: Identify incomplete tasks related to the issue');
    report.push('- **Analysis**: Check if issue is caused by incomplete implementation');
    report.push('');
    report.push('### Key Questions');
    report.push('- Are there pending TODO items related to this issue?');
    report.push('- Is this issue caused by incomplete work?');
    report.push('- What tasks need to be completed to resolve this?');
    report.push('');
  }

  // Step 4: Question Generation
  if (!skipSteps.includes('questions')) {
    report.push('## Step 4: Targeted Question Generation');
    report.push('');
    report.push('### Tool Integration Required');
    report.push('- **Tool**: `generate_adr_questions`');
    report.push('- **Purpose**: Generate specific questions about the troubleshooting scenario');
    report.push('- **Analysis**: Create structured inquiry process');
    report.push('');
    report.push('### Question Categories');
    report.push('- **Technical**: What specific technical decisions are involved?');
    report.push('- **Architectural**: How does this relate to system architecture?');
    report.push('- **Implementation**: Are there implementation gaps?');
    report.push('- **Environmental**: Are there environment-specific factors?');
    report.push('');
  }

  // Step 5: ADR Validation
  if (!skipSteps.includes('adr_validation')) {
    report.push('## Step 5: ADR Validation');
    report.push('');
    report.push('### Analysis Required');
    report.push('- **Check**: Does the issue conflict with existing ADR decisions?');
    report.push('- **Validate**: Are ADR assumptions still valid?');
    report.push('- **Identify**: Do we need new ADRs to address this issue?');
    report.push('');
    report.push('### Validation Areas');
    report.push('- Technology choices and compatibility');
    report.push('- Architectural patterns and constraints');
    report.push('- Performance and scalability assumptions');
    report.push('- Security and compliance requirements');
    report.push('');
  }

  // Step 6: Guided Recommendations
  if (!skipSteps.includes('recommendations')) {
    report.push('## Step 6: Guided Next Steps');
    report.push('');
    report.push('### Recommendation Framework');
    report.push('Based on the analysis above, provide:');
    report.push('');
    report.push('1. **Immediate Actions**');
    report.push('   - Quick fixes or workarounds');
    report.push('   - Verification steps');
    report.push('');
    report.push('2. **Short-term Solutions**');
    report.push('   - Code changes required');
    report.push('   - TODO items to complete');
    report.push('');
    report.push('3. **Long-term Improvements**');
    report.push('   - ADR updates needed');
    report.push('   - Architectural changes');
    report.push('');
    report.push('4. **Prevention Measures**');
    report.push('   - Monitoring improvements');
    report.push('   - Documentation updates');
    report.push('');
  }

  report.push('---');
  report.push('');
  report.push('## Integration Notes');
  report.push('');
  report.push('This workflow is designed to integrate with existing MCP tools:');
  report.push('- Use `compare_adr_progress` for baseline reality check');
  report.push('- Use `manage_todo` for TODO alignment analysis');
  report.push('- Use `generate_adr_questions` for targeted questioning');
  report.push('- Results guide structured troubleshooting process');
  report.push('');
  report.push('*This prevents AI from getting lost during troubleshooting by maintaining*');
  report.push('*alignment with documented architectural decisions and planned work.*');

  return report.join('\n');
}

/**
 * Main troubleshooting workflow function
 */
export async function troubleshootGuidedWorkflow(args: TroubleshootArgs): Promise<any> {
  try {
    const validatedArgs = TroubleshootSchema.parse(args);
    
    let result: string;
    
    switch (validatedArgs.operation) {
      case 'collect_issue':
        if (!validatedArgs.issue) {
          throw new McpAdrError('Issue details are required for collect_issue operation', 'INVALID_INPUT');
        }
        result = await collectIssueDetails(validatedArgs.issue);
        break;
        
      case 'full_workflow':
        result = await runFullWorkflow(validatedArgs);
        break;
        
      default:
        throw new McpAdrError(`Unknown operation: ${(validatedArgs as any).operation}`, 'INVALID_INPUT');
    }
    
    return {
      content: [{
        type: 'text',
        text: result
      }]
    };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpAdrError(`Invalid input: ${error.errors.map(e => e.message).join(', ')}`, 'INVALID_INPUT');
    }
    
    throw new McpAdrError(
      `Troubleshooting workflow failed: ${error instanceof Error ? error.message : String(error)}`,
      'TROUBLESHOOTING_ERROR'
    );
  }
}