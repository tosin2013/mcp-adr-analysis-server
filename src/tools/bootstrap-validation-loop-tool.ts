/**
 * MCP Tool for Bootstrap Validation Loop with ADR Learning
 *
 * Implements a self-learning architecture validation system:
 * 1. Generate bootstrap scripts from ADRs
 * 2. Execute scripts in real environment with monitoring
 * 3. Capture learnings and failures
 * 4. Mask sensitive information
 * 5. Update ADRs with deployment experience
 * 6. Re-generate improved scripts
 * 7. Validate until success
 *
 * This creates a bidirectional feedback loop where ADRs evolve
 * based on real-world deployment experience.
 */

// NEW: Validated Patterns Integration
import { detectPlatforms } from '../utils/platform-detector.js';
import { getPattern } from '../utils/validated-pattern-definitions.js';

/**
 * Bootstrap execution result with environment context
 */
export interface BootstrapExecutionResult {
  executionId: string;
  timestamp: string;
  success: boolean;
  duration: number;
  exitCode: number;
  stdout: string;
  stderr: string;
  environmentSnapshot: {
    docker?: any;
    kubernetes?: any;
    openshift?: any;
    ansible?: any;
    systemInfo?: any;
  };
  validationResults?: ValidationResult[];
  learnings: BootstrapLearning[];
}

/**
 * Validation result for a specific check
 */
export interface ValidationResult {
  checkId: string;
  adrId: string;
  requirement: string;
  passed: boolean;
  actualState: string;
  expectedState: string;
  confidence: number;
  evidence: string[];
}

/**
 * Learning captured from bootstrap execution
 */
export interface BootstrapLearning {
  type: 'success' | 'failure' | 'unexpected' | 'performance' | 'prerequisite';
  category: 'infrastructure' | 'configuration' | 'dependency' | 'security' | 'performance';
  description: string;
  adrReference?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  recommendation: string;
  evidence: string[];
  environmentSpecific: boolean;
  timestamp: string;
}

/**
 * ADR update proposal based on learnings
 */
export interface AdrUpdateProposal {
  adrPath: string;
  adrTitle: string;
  updateType: 'append' | 'modify' | 'note';
  sectionToUpdate: string;
  proposedContent: string;
  learnings: BootstrapLearning[];
  confidence: number;
  requiresReview: boolean;
}

/**
 * Missing file detection result
 */
export interface MissingFileInfo {
  filePath: string;
  fileType: 'config' | 'env' | 'build' | 'secret' | 'dependency' | 'unknown';
  isIgnored: boolean;
  requiredBy: string[]; // ADRs or code that reference this file
  severity: 'critical' | 'error' | 'warning' | 'info';
  canCreateTemplate: boolean;
  templateContent: string | undefined;
  recommendation: string;
}

/**
 * Generate guided execution instructions for LLM
 * This function returns step-by-step commands for the LLM to execute
 */
async function generateGuidedExecutionInstructions(params: {
  projectPath: string;
  adrDirectory: string;
  targetEnvironment: string;
  maxIterations: number;
  autoFix: boolean;
  updateAdrsWithLearnings: boolean;
  currentIteration: number;
  previousExecutionOutput: string;
  previousExecutionSuccess: boolean;
  deploymentCleanupRequested: boolean;
  /**
   * Label selector scoping every destructive teardown command, e.g. `app=checkout-api`.
   * Supplied by the caller; never guessed. Without it no delete is emitted. (#1536)
   */
  appSelector?: string | undefined;
}): Promise<any> {
  const {
    projectPath,
    targetEnvironment,
    maxIterations,
    currentIteration,
    previousExecutionOutput,
    previousExecutionSuccess,
    appSelector,
  } = params;

  // PHASE 0: Environment Validation (Iteration 0)
  if (currentIteration === 0) {
    // Detect platform
    const platformDetection = await detectPlatforms(projectPath);
    const validatedPattern = platformDetection.primaryPlatform
      ? getPattern(platformDetection.primaryPlatform)
      : null;

    const connectionCommands: { [key: string]: string } = {
      openshift: 'oc status && oc whoami',
      kubernetes: 'kubectl cluster-info && kubectl get nodes',
      docker: 'docker ps && docker info',
      'docker-compose': 'docker-compose --version && docker ps',
      ansible: 'ansible --version && ansible localhost -m ping',
      nodejs: 'node --version && npm --version',
      python: 'python --version && pip --version',
    };

    const detectedPlatform = platformDetection.primaryPlatform || 'unknown';
    const connectionCommand = connectionCommands[detectedPlatform] || 'echo "Unknown platform"';

    return {
      content: [
        {
          type: 'text',
          text: `# 🔍 Bootstrap Validation Loop - Phase 0: Environment Validation

## Detected Platform
**Primary Platform**: ${detectedPlatform.toUpperCase()}
**Confidence**: ${(platformDetection.confidence * 100).toFixed(0)}%
**All Detected**: ${platformDetection.detectedPlatforms?.map(p => p.type).join(', ') || detectedPlatform}

${
  validatedPattern
    ? `
## 📚 Validated Pattern Available
**Pattern**: ${validatedPattern.name} v${validatedPattern.version}
**Base Repository**: ${validatedPattern.baseCodeRepository.url}
**Documentation**: ${validatedPattern.authoritativeSources.find(s => s.type === 'documentation')?.url || 'N/A'}
${detectedPlatform === 'openshift' ? '**OpenShift Framework Guide**: https://validatedpatterns.io/learn/vp_openshift_framework/' : ''}
`
    : ''
}

## ⚠️ ACTION REQUIRED: Validate Environment Connection

Before proceeding with deployment, you MUST:

### 1. Verify Target Environment Connection

Run the following command to validate your connection to **${detectedPlatform.toUpperCase()}**:

\`\`\`bash
${connectionCommand}
\`\`\`

### 2. Confirm Target Environment

**IMPORTANT**: Please confirm with the human user:

> "I've detected **${detectedPlatform}** as the target deployment platform (${(platformDetection.confidence * 100).toFixed(0)}% confidence).
>
> Is this correct? Should I proceed with ${detectedPlatform} deployment, or would you like to target a different platform?"

### 3. After Confirmation, Report Back

Once you've:
- ✅ Run the connection validation command
- ✅ Confirmed the command succeeded (exit code 0)
- ✅ Received human approval for the target environment

Call this tool again with:
\`\`\`json
{
  "currentIteration": 1,
  "previousExecutionOutput": "<paste the output from the connection command>",
  "previousExecutionSuccess": true,
  "targetEnvironment": "${targetEnvironment}"
}
\`\`\`

## Evidence Found

${platformDetection.evidence
  .slice(0, 5)
  .map(
    (e, i) => `${i + 1}. **${e.file}**: ${e.indicator} (weight: ${(e.weight * 100).toFixed(0)}%)`
  )
  .join('\n')}

---

**Current Iteration**: 0/${maxIterations}
**Phase**: Environment Validation
**Next Phase**: Bootstrap Script Generation
`,
        },
      ],
      isError: false,
    };
  }

  // Check if deployment cleanup requested (CI/CD workflow)
  if (params.deploymentCleanupRequested) {
    const platformDetection = await detectPlatforms(projectPath);
    const detectedPlatform = platformDetection.primaryPlatform || 'unknown';

    // Every command below is handed to a calling agent to run, so scope is the
    // whole safety property. Two rules, both learned the hard way (#1536):
    //
    //   1. A destructive selector is never guessed. The table used to hardcode
    //      `app=myapp`, which for almost every user matched nothing -- deleting
    //      nothing and reporting success, a false green in a validation tool --
    //      and for anyone who did use that label, destroyed their workload.
    //   2. Nothing reaches outside the project. `docker system prune -f` removed
    //      stopped containers, unused networks and dangling images belonging to
    //      every other project on the host.
    //
    // Without a selector the tool emits DISCOVERY steps instead of a delete. That
    // is the deterministic contract the rest of this server follows: the server
    // does not invent the input, it says how to obtain it.
    const kubeCleanup = (cli: 'kubectl' | 'oc') =>
      appSelector
        ? {
            teardown: `${cli} delete deployment,service,configmap,secret -l ${appSelector}`,
            verify: `${cli} get all -l ${appSelector}`,
            restart: './bootstrap.sh',
          }
        : {
            teardown: `${cli} get all --show-labels`,
            verify: `echo "No teardown run: re-invoke with appSelector once the label is known."`,
            restart: './bootstrap.sh',
          };

    const cleanupCommands: {
      [key: string]: { teardown: string; verify: string; restart: string };
    } = {
      openshift: kubeCleanup('oc'),
      kubernetes: kubeCleanup('kubectl'),
      // `down -v` is scoped to the compose project; a bare `prune` is not.
      docker: {
        teardown: 'docker-compose down -v',
        verify: 'docker ps -a',
        restart: 'docker-compose up -d',
      },
      'docker-compose': {
        teardown: 'docker-compose down -v',
        verify: 'docker ps -a && docker volume ls',
        restart: 'docker-compose up -d',
      },
    };

    const cleanup = cleanupCommands[detectedPlatform] || {
      teardown: 'echo "Manual cleanup required for ' + detectedPlatform + '"',
      verify: 'echo "Manual verification required"',
      restart: './bootstrap.sh',
    };

    const needsSelector = !appSelector && ['kubernetes', 'openshift'].includes(detectedPlatform);

    return {
      content: [
        {
          type: 'text',
          text: `# 🗑️ Deployment Cleanup & Restart (CI/CD Mode)

## Detected Platform
**Platform**: ${detectedPlatform.toUpperCase()}

## ⚠️ CI/CD Workflow: Teardown → Verify → Restart

This workflow is designed for CI/CD pipelines that need to completely tear down and restart deployments.

### Step 1: ${needsSelector ? 'Identify what to tear down' : 'Teardown Current Deployment'}

${
  needsSelector
    ? `**No teardown command is offered yet.** This tool was not told which workload it may
delete, and it will not guess a label selector: a guess either matches nothing and reports a
successful cleanup that removed nothing, or matches somebody else's workload and destroys it.

Run this to see what is deployed and how it is labelled:
\`\`\`bash
${cleanup.teardown}
\`\`\`

Then call this tool again with \`appSelector\` set, e.g. \`"appSelector": "app=checkout-api"\`,
and the scoped delete command will be provided.`
    : `**IMPORTANT**: This will DELETE all resources matching \`${appSelector}\`. Confirm with human before proceeding.

Run:
\`\`\`bash
${cleanup.teardown}
\`\`\`

**What this does**:
- Deletes deployments, services, configmaps and secrets matching \`${appSelector}\`
- Leaves everything outside that selector untouched`
}

### Step 2: Verify Cleanup

Confirm resources are deleted:
\`\`\`bash
${cleanup.verify}
\`\`\`

**Expected result**: No resources found (or minimal system resources only).

### Step 3: Restart Deployment

After cleanup verification, restart the deployment:
\`\`\`bash
${cleanup.restart}
\`\`\`

### Step 4: Report Back

After running teardown, verification, and restart, call this tool again with:
\`\`\`json
{
  "currentIteration": ${currentIteration + 1},
  "previousExecutionOutput": "<paste all command outputs>",
  "previousExecutionSuccess": true,
  "deploymentCleanupRequested": false
}
\`\`\`

---

**Current Iteration**: ${currentIteration}/${maxIterations}
**Phase**: Deployment Cleanup
**Next Phase**: Deployment Validation
`,
        },
      ],
      isError: false,
    };
  }

  // PHASE 1+: Bootstrap script generation and execution guidance
  if (currentIteration >= 1 && currentIteration < maxIterations) {
    const platformDetection = await detectPlatforms(projectPath);
    const detectedPlatform = platformDetection.primaryPlatform || 'unknown';

    // Analyze previous execution output for failures
    const hadFailures =
      !previousExecutionSuccess ||
      previousExecutionOutput.toLowerCase().includes('error') ||
      previousExecutionOutput.toLowerCase().includes('failed');

    if (hadFailures && currentIteration === 1) {
      // First iteration failed - provide troubleshooting guidance
      return {
        content: [
          {
            type: 'text',
            text: `# ⚠️ Bootstrap Validation Loop - Connection Failed

## Iteration ${currentIteration}/${maxIterations}

The environment connection validation failed. Let's troubleshoot:

## Previous Output Analysis
\`\`\`
${previousExecutionOutput.substring(0, 500)}
\`\`\`

## Troubleshooting Steps

### Common Issues for ${detectedPlatform}:

1. **Authentication**: Ensure you're logged in
2. **Permissions**: Verify you have sufficient privileges
3. **Network**: Check connectivity to the cluster/service
4. **Configuration**: Validate connection settings

### Recommended Actions:

1. Review the error message above
2. Fix the identified issue
3. Re-run the connection validation command
4. Call this tool again with updated output

---

**Current Iteration**: ${currentIteration}/${maxIterations}
**Phase**: Connection Troubleshooting
`,
          },
        ],
        isError: false,
      };
    }

    // Connection successful - proceed with bootstrap
    return {
      content: [
        {
          type: 'text',
          text: `# 🔄 Bootstrap Validation Loop - Iteration ${currentIteration}/${maxIterations}

Previous execution: ${previousExecutionSuccess ? '✅ Success' : '❌ Failed'}

${previousExecutionOutput ? `## Previous Output\n\n\`\`\`\n${previousExecutionOutput.substring(0, 1000)}\n\`\`\`` : ''}

## Next Steps

${previousExecutionSuccess ? '✅ Environment validated successfully!' : '⚠️ Previous step had issues'}

### Phase ${currentIteration}: Bootstrap Script Generation

The tool will now generate bootstrap and validation scripts. In the next iteration:

1. Call \`generate_adr_bootstrap\` to create deployment scripts
2. Run the generated \`bootstrap.sh\` script
3. Run \`validate_bootstrap.sh\` to check compliance
4. Report back with results

**Next Call**:
\`\`\`json
{
  "currentIteration": ${currentIteration + 1},
  "previousExecutionOutput": "<command outputs>",
  "previousExecutionSuccess": true/false
}
\`\`\`

---

**Current Iteration**: ${currentIteration}/${maxIterations}
**Phase**: Bootstrap Generation
**Next Phase**: Bootstrap Execution
`,
        },
      ],
      isError: false,
    };
  }

  // Iteration limit reached
  return {
    content: [
      {
        type: 'text',
        text: `# 🏁 Bootstrap Validation Loop - Complete

Maximum iterations (${maxIterations}) reached.

## Summary

- **Total Iterations**: ${currentIteration}
- **Final Status**: ${previousExecutionSuccess ? '✅ Success' : '⚠️ Issues Remain'}

## Final Output
\`\`\`
${previousExecutionOutput.substring(0, 1000)}
\`\`\`

## Next Steps

${previousExecutionSuccess ? '✅ Deployment validation complete!\n\nReview the results and update ADRs with deployment learnings.' : '⚠️ Deployment validation incomplete.\n\nReview errors, make necessary fixes, and restart the validation loop.'}

---

**Note**: To restart the validation loop, call this tool again with \`currentIteration: 0\`.
`,
      },
    ],
    isError: false,
  };
}

/**
 * Main tool function for bootstrap validation loop
 */
export async function bootstrapValidationLoop(args: {
  projectPath?: string;
  adrDirectory?: string;
  targetEnvironment?: string;
  maxIterations?: number;
  autoFix?: boolean;
  updateAdrsWithLearnings?: boolean;
  currentIteration?: number;
  previousExecutionOutput?: string;
  previousExecutionSuccess?: boolean;
  deploymentCleanupRequested?: boolean;
  /**
   * Label selector scoping destructive teardown commands, e.g. `app=checkout-api`.
   * Required before any delete is offered; never inferred from the project. (#1536)
   */
  appSelector?: string;
}): Promise<any> {
  const {
    projectPath = process.cwd(),
    adrDirectory = 'docs/adrs',
    targetEnvironment = 'development',
    maxIterations = 5,
    autoFix = true,
    updateAdrsWithLearnings = true,
    currentIteration = 0,
    previousExecutionOutput = '',
    previousExecutionSuccess = false,
    deploymentCleanupRequested = false,
    appSelector,
  } = args;

  // GUIDED MODE: Return instructions for LLM to execute commands
  // This mode tells the LLM what to run and processes the output iteratively
  return await generateGuidedExecutionInstructions({
    projectPath,
    adrDirectory,
    targetEnvironment,
    maxIterations,
    autoFix,
    updateAdrsWithLearnings,
    currentIteration,
    previousExecutionOutput,
    previousExecutionSuccess,
    deploymentCleanupRequested,
    appSelector,
  });
}

export default bootstrapValidationLoop;
