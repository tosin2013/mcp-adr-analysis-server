/**
 * MCP Tool for guided troubleshooting workflow
 * Provides systematic troubleshooting with ADR/TODO alignment
 * Integrates with other MCP tools for comprehensive analysis
 */

import { z } from 'zod';
import { McpAdrError } from '../types/index.js';

// Structured failure schema
const FailureInfoSchema = z.object({
  failureType: z.enum(['test_failure', 'deployment_failure', 'build_failure', 'runtime_error', 'performance_issue', 'security_issue', 'other']).describe('Type of failure'),
  failureDetails: z.object({
    command: z.string().optional().describe('Command that failed'),
    exitCode: z.number().optional().describe('Exit code of failed process'),
    errorMessage: z.string().describe('Primary error message'),
    stackTrace: z.string().optional().describe('Stack trace if available'),
    logOutput: z.string().optional().describe('Relevant log output'),
    environment: z.string().optional().describe('Environment where failure occurred'),
    timestamp: z.string().optional().describe('When the failure occurred'),
    affectedFiles: z.array(z.string()).optional().describe('Files involved in the failure')
  }).describe('Detailed failure information'),
  context: z.object({
    recentChanges: z.string().optional().describe('Recent changes that might be related'),
    reproducible: z.boolean().optional().describe('Whether the failure is reproducible'),
    frequency: z.string().optional().describe('How often this failure occurs'),
    impact: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Impact level of the failure')
  }).optional().describe('Additional context about the failure')
});

// Troubleshooting operation schema
const TroubleshootSchema = z.object({
  operation: z.enum(['analyze_failure', 'generate_test_plan', 'full_workflow']).describe('Type of troubleshooting operation'),
  failure: FailureInfoSchema.optional().describe('Structured failure information (required for analyze_failure and generate_test_plan)'),
  projectPath: z.string().optional().describe('Path to project directory'),
  adrDirectory: z.string().default('docs/adrs').describe('ADR directory path'),
  todoPath: z.string().default('TODO.md').describe('Path to TODO.md file')
});

type TroubleshootArgs = z.infer<typeof TroubleshootSchema>;
type FailureInfo = z.infer<typeof FailureInfoSchema>;

/**
 * Analyze structured failure information
 */
async function analyzeFailure(failure: FailureInfo): Promise<string> {
  const report = [
    '# 🚨 Failure Analysis',
    '',
    `## Failure Type: ${failure.failureType.toUpperCase()}`,
    '',
    '## Error Details',
    `**Primary Error**: ${failure.failureDetails.errorMessage}`,
    ''
  ];

  // Add command and exit code if available
  if (failure.failureDetails.command) {
    report.push(`**Failed Command**: \`${failure.failureDetails.command}\``);
  }
  if (failure.failureDetails.exitCode !== undefined) {
    report.push(`**Exit Code**: ${failure.failureDetails.exitCode}`);
  }
  if (failure.failureDetails.environment) {
    report.push(`**Environment**: ${failure.failureDetails.environment}`);
  }
  if (failure.failureDetails.timestamp) {
    report.push(`**Timestamp**: ${failure.failureDetails.timestamp}`);
  }
  report.push('');

  // Add stack trace if available
  if (failure.failureDetails.stackTrace) {
    report.push('## Stack Trace');
    report.push('```');
    report.push(failure.failureDetails.stackTrace);
    report.push('```');
    report.push('');
  }

  // Add log output if available
  if (failure.failureDetails.logOutput) {
    report.push('## Log Output');
    report.push('```');
    report.push(failure.failureDetails.logOutput);
    report.push('```');
    report.push('');
  }

  // Add affected files
  if (failure.failureDetails.affectedFiles && failure.failureDetails.affectedFiles.length > 0) {
    report.push('## Affected Files');
    report.push(...failure.failureDetails.affectedFiles.map(file => `- ${file}`));
    report.push('');
  }

  // Add context information
  if (failure.context) {
    if (failure.context.recentChanges) {
      report.push('## Recent Changes');
      report.push(failure.context.recentChanges);
      report.push('');
    }
    
    if (failure.context.impact) {
      report.push(`**Impact Level**: ${failure.context.impact.toUpperCase()}`);
    }
    if (failure.context.reproducible !== undefined) {
      report.push(`**Reproducible**: ${failure.context.reproducible ? 'Yes' : 'No'}`);
    }
    if (failure.context.frequency) {
      report.push(`**Frequency**: ${failure.context.frequency}`);
    }
    report.push('');
  }

  // Recommended next steps based on failure type
  report.push('## 🎯 Recommended Test Plan');
  report.push('');
  
  switch (failure.failureType) {
    case 'test_failure':
      report.push('1. **Run specific failing tests** to isolate the issue');
      report.push('2. **Check test dependencies** and setup requirements');
      report.push('3. **Verify test data and fixtures** are correctly configured');
      report.push('4. **Check for environmental differences** between local and CI');
      break;
      
    case 'deployment_failure':
      report.push('1. **Verify deployment configuration** and environment variables');
      report.push('2. **Check resource availability** (disk space, memory, CPU)');
      report.push('3. **Validate network connectivity** and service dependencies');
      report.push('4. **Review deployment logs** for detailed error information');
      break;
      
    case 'build_failure':
      report.push('1. **Check build dependencies** and toolchain versions');
      report.push('2. **Verify source code syntax** and compilation errors');
      report.push('3. **Clean build cache** and rebuild from scratch');
      report.push('4. **Check for missing or corrupted files**');
      break;
      
    case 'runtime_error':
      report.push('1. **Reproduce the error** in a controlled environment');
      report.push('2. **Check application logs** for detailed error traces');
      report.push('3. **Verify data integrity** and input validation');
      report.push('4. **Monitor system resources** during error occurrence');
      break;
      
    default:
      report.push('1. **Gather additional diagnostic information**');
      report.push('2. **Check system logs and monitoring**');
      report.push('3. **Verify configuration and dependencies**');
      report.push('4. **Test in isolated environment**');
  }

  report.push('');
  report.push('*Use `generate_test_plan` operation to get specific commands and validation steps.*');

  return report.join('\n');
}

/**
 * Generate AI-powered test plan based on failure analysis
 */
async function generateTestPlan(failure: FailureInfo, args: TroubleshootArgs): Promise<string> {
  const { loadAIConfig, isAIExecutionEnabled, getRecommendedModel } = await import('../config/ai-config.js');
  const aiConfig = loadAIConfig();
  
  if (!isAIExecutionEnabled(aiConfig)) {
    return generateFallbackTestPlan(failure, args);
  }

  const systemPrompt = `You are an expert debugging assistant. Analyze the structured failure information and generate specific, actionable test commands.

Return a JSON response with this exact structure:
{
  "testPlan": {
    "summary": "Brief analysis of the failure",
    "priority": "high|medium|low",
    "testSections": [
      {
        "title": "Test section name",
        "description": "What this section accomplishes",
        "commands": [
          {
            "command": "actual command to run",
            "description": "what this command does",
            "expected": "what output indicates success"
          }
        ]
      }
    ],
    "followupInstructions": [
      "What to do after running tests",
      "How to report results back"
    ]
  }
}

Be specific and contextual based on the actual failure details provided.`;

  const failureContext = `Failure Analysis:
- Type: ${failure.failureType}
- Error: ${failure.failureDetails.errorMessage}
- Command: ${failure.failureDetails.command || 'N/A'}
- Exit Code: ${failure.failureDetails.exitCode || 'N/A'}
- Environment: ${failure.failureDetails.environment || 'N/A'}
- Project Path: ${args.projectPath || '.'}
${failure.failureDetails.stackTrace ? `- Stack Trace: ${failure.failureDetails.stackTrace.substring(0, 500)}...` : ''}
${failure.context?.recentChanges ? `- Recent Changes: ${failure.context.recentChanges}` : ''}

Generate specific test commands to diagnose and resolve this failure.`;

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
          { role: 'user', content: failureContext }
        ],
        temperature: 0.2,
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
      throw new Error('No test plan generated from AI');
    }

    const aiPlan = JSON.parse(planContent);
    return formatAITestPlan(aiPlan.testPlan, args.projectPath || '.');

  } catch (error) {
    // Fallback to hardcoded templates if AI fails
    return generateFallbackTestPlan(failure, args);
  }
}

/**
 * Format AI-generated test plan into readable markdown
 */
function formatAITestPlan(testPlan: any, projectPath: string): string {
  const report = [
    '# 🧪 AI-Generated Test Plan',
    '',
    `## Analysis Summary`,
    testPlan.summary || 'AI analysis of the failure',
    '',
    `**Priority**: ${testPlan.priority?.toUpperCase() || 'MEDIUM'}`,
    ''
  ];

  if (testPlan.testSections && Array.isArray(testPlan.testSections)) {
    testPlan.testSections.forEach((section: any, index: number) => {
      report.push(`### ${index + 1}. ${section.title}`);
      if (section.description) {
        report.push(section.description);
      }
      report.push('');

      if (section.commands && Array.isArray(section.commands)) {
        report.push('```bash');
        section.commands.forEach((cmd: any) => {
          if (cmd.description) {
            report.push(`# ${cmd.description}`);
          }
          report.push(cmd.command);
          if (cmd.expected) {
            report.push(`# Expected: ${cmd.expected}`);
          }
          report.push('');
        });
        report.push('```');
        report.push('');
      }
    });
  }

  report.push('## 📋 After Running Tests');
  report.push('');
  if (testPlan.followupInstructions && Array.isArray(testPlan.followupInstructions)) {
    testPlan.followupInstructions.forEach((instruction: string) => {
      report.push(`- ${instruction}`);
    });
  } else {
    report.push('- Execute each command in sequence');
    report.push('- Note any errors or unexpected output');
    report.push('- Report results back to the MCP server');
  }
  
  report.push('');
  report.push('**Return results using this JSON format:**');
  report.push('```json');
  report.push('{');
  report.push('  "operation": "process_test_results",');
  report.push('  "testResults": {');
  report.push('    "testCommand": "command that was executed",');
  report.push('    "exitCode": 0,');
  report.push('    "stdout": "standard output from command",');
  report.push('    "stderr": "any error output",');
  report.push('    "executionTime": 1234');
  report.push('  },');
  report.push('  "projectPath": "' + projectPath + '"');
  report.push('}');
  report.push('```');
  
  report.push('');
  report.push('*This test plan was generated by AI based on your specific failure details.*');

  return report.join('\n');
}

/**
 * Fallback test plan generation when AI is not available
 */
function generateFallbackTestPlan(failure: FailureInfo, args: TroubleshootArgs): string {
  const report = [
    '# 🧪 Test Plan Generation (Fallback)',
    '',
    `## For Failure Type: ${failure.failureType.toUpperCase()}`,
    '',
    '## Specific Commands to Execute',
    ''
  ];

  const projectPath = args.projectPath || '.';
  
  switch (failure.failureType) {
    case 'test_failure':
      report.push('### 1. Run Failing Tests');
      if (failure.failureDetails.command) {
        report.push(`\`\`\`bash`);
        report.push(`# Re-run the original failing command`);
        report.push(failure.failureDetails.command);
        report.push(`\`\`\``);
      } else {
        report.push(`\`\`\`bash`);
        report.push(`# Run tests with verbose output`);
        report.push(`npm test -- --verbose`);
        report.push(`# Or for specific test file`);
        report.push(`npm test -- path/to/failing/test.js`);
        report.push(`\`\`\``);
      }
      
      report.push('');
      report.push('### 2. Check Test Environment');
      report.push(`\`\`\`bash`);
      report.push(`# Check Node.js version`);
      report.push(`node --version`);
      report.push(`# Check npm version`);
      report.push(`npm --version`);
      report.push(`# Verify dependencies`);
      report.push(`npm ls --depth=0`);
      report.push(`\`\`\``);
      break;
      
    case 'deployment_failure':
      report.push('### 1. Verify Deployment Environment');
      report.push(`\`\`\`bash`);
      report.push(`# Check available resources`);
      report.push(`df -h  # Disk space`);
      report.push(`free -m  # Memory`);
      report.push(`# Check environment variables`);
      report.push(`env | grep -E "(NODE_ENV|PORT|DATABASE)"  # Common vars`);
      report.push(`\`\`\``);
      
      report.push('');
      report.push('### 2. Test Deployment Components');
      if (failure.failureDetails.command) {
        report.push(`\`\`\`bash`);
        report.push(`# Re-run deployment command with debug`);
        report.push(`${failure.failureDetails.command} --verbose`);
        report.push(`\`\`\``);
      } else {
        report.push(`\`\`\`bash`);
        report.push(`# Test basic deployment steps`);
        report.push(`npm run build`);
        report.push(`npm start --dry-run`);
        report.push(`\`\`\``);
      }
      break;
      
    case 'build_failure':
      report.push('### 1. Clean and Rebuild');
      report.push(`\`\`\`bash`);
      report.push(`# Clean build artifacts`);
      report.push(`npm run clean  # or rm -rf dist build`);
      report.push(`# Clear npm cache`);
      report.push(`npm cache clean --force`);
      report.push(`# Reinstall dependencies`);
      report.push(`rm -rf node_modules package-lock.json`);
      report.push(`npm install`);
      report.push(`\`\`\``);
      
      report.push('');
      report.push('### 2. Build with Verbose Output');
      if (failure.failureDetails.command) {
        report.push(`\`\`\`bash`);
        report.push(`# Re-run build with debug info`);
        report.push(`${failure.failureDetails.command} --verbose`);
        report.push(`\`\`\``);
      } else {
        report.push(`\`\`\`bash`);
        report.push(`# Standard build with verbose output`);
        report.push(`npm run build -- --verbose`);
        report.push(`\`\`\``);
      }
      break;
      
    case 'runtime_error':
      report.push('### 1. Reproduce in Debug Mode');
      report.push(`\`\`\`bash`);
      report.push(`# Start application in debug mode`);
      report.push(`NODE_ENV=development npm start`);
      report.push(`# Or with debug logging`);
      report.push(`DEBUG=* npm start`);
      report.push(`\`\`\``);
      
      report.push('');
      report.push('### 2. Check Application Health');
      report.push(`\`\`\`bash`);
      report.push(`# Check if app starts successfully`);
      report.push(`npm start &`);
      report.push(`sleep 5`);
      report.push(`curl -I http://localhost:3000/health  # Health check`);
      report.push(`\`\`\``);
      break;
      
    default:
      report.push('### 1. General Diagnostic Commands');
      report.push(`\`\`\`bash`);
      report.push(`# Check project structure`);
      report.push(`ls -la ${projectPath}`);
      report.push(`# Check package.json scripts`);
      report.push(`cat package.json | jq .scripts`);
      report.push(`# Run basic health checks`);
      report.push(`npm run lint || echo "No lint script"`);
      report.push(`npm run typecheck || echo "No typecheck script"`);
      report.push(`\`\`\``);
  }

  report.push('');
  report.push('## 📋 After Running Tests');
  report.push('');
  report.push('**Return the following to the MCP server:**');
  report.push('');
  report.push('```json');
  report.push('{');
  report.push('  "operation": "process_test_results",');
  report.push('  "testResults": {');
  report.push('    "testCommand": "command that was executed",');
  report.push('    "exitCode": 0,');
  report.push('    "stdout": "standard output from command",');
  report.push('    "stderr": "any error output",');
  report.push('    "executionTime": 1234');
  report.push('  },');
  report.push('  "projectPath": "' + projectPath + '"');
  report.push('}');
  report.push('```');
  
  report.push('');
  report.push('*AI-powered analysis unavailable - using fallback templates.*');

  return report.join('\n');
}

/**
 * Run the full troubleshooting workflow with actual tool integration
 */
async function runFullWorkflow(_args: TroubleshootArgs): Promise<string> {
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

  // Legacy workflow - simplified for backwards compatibility

  // Legacy full workflow - provides overview of troubleshooting approach
  report.push('## Step 2: Baseline Reality Check');
  report.push('- Use `compare_adr_progress` to check environment vs ADR expectations');
  report.push('');
  
  report.push('## Step 3: TODO Alignment Analysis');
  report.push('- Use `manage_todo` to identify incomplete tasks related to issues');
  report.push('');
  
  report.push('## Step 4: Targeted Analysis');
  report.push('- Use `generate_research_questions` for structured investigation');
  report.push('');
  
  report.push('## Step 5: Resolution Planning');
  report.push('- Analyze ADR compliance and generate targeted solutions');
  report.push('');

  report.push('---');
  report.push('');
  report.push('## Integration Notes');
  report.push('');
  report.push('This workflow is designed to integrate with existing MCP tools:');
  report.push('- Use `compare_adr_progress` for baseline reality check');
  report.push('- Use `manage_todo` for TODO alignment analysis');
  report.push('- Use `generate_research_questions` for targeted questioning');
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
      case 'analyze_failure':
        if (!validatedArgs.failure) {
          throw new McpAdrError('Failure information is required for analyze_failure operation', 'INVALID_INPUT');
        }
        result = await analyzeFailure(validatedArgs.failure);
        break;
        
      case 'generate_test_plan':
        if (!validatedArgs.failure) {
          throw new McpAdrError('Failure information is required for generate_test_plan operation', 'INVALID_INPUT');
        }
        result = await generateTestPlan(validatedArgs.failure, validatedArgs);
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
      throw new McpAdrError(`Invalid input: ${error.issues.map(e => e.message).join(', ')}`, 'INVALID_INPUT');
    }
    
    throw new McpAdrError(
      `Troubleshooting workflow failed: ${error instanceof Error ? error.message : String(error)}`,
      'TROUBLESHOOTING_ERROR'
    );
  }
}