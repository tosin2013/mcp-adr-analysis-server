# Hybrid DAG Bootstrap Validation Loop Design

## Overview

This document outlines the design for a **hybrid approach** to the Bootstrap Validation Loop that combines:

- **Phase-based iteration** for human-in-the-loop workflow and learning
- **DAG-based parallel execution** within phases for infrastructure and application validation

## Problem Statement

The current bootstrap validation loop uses a sequential phase-based approach:

```typescript
// Current: Sequential iterations
Phase 0 (iteration 0): Environment Validation
Phase 1 (iteration 1): Bootstrap Script Generation
Phase 2 (iteration 2): Script Execution & Validation
...continue until success or maxIterations
```

**Limitations:**

1. **No parallelism**: Independent validation checks run sequentially
2. **Coarse-grained retry**: If one validation check fails, entire phase must retry
3. **Infrastructure/Application coupling**: Platform validation and app testing not clearly separated

## Proposed Solution: Hybrid DAG Architecture

### Key Principle: Separation of Concerns

**Infrastructure Layer** (platform setup and validation):

- Platform detection
- Prerequisites validation (kubectl, cluster connectivity, nodes, storage)
- Infrastructure deployment (namespaces, configs, services, ingress)
- Infrastructure readiness checks

**Application Layer** (application deployment and testing):

- Application deployment
- Unit tests, integration tests, E2E tests, performance tests
- Application validation checks

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│ OUTER LOOP: Phase-Based Iteration (Human-in-the-Loop)           │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Phase 0: Platform Detection                                      │
│    └─> [Human Approval Gate] ✋                                   │
│           ↓                                                        │
│  Phase 1: Infrastructure Layer (DAG Execution) ━━━━━━━━━━━━━━━  │
│    ┌─────────────────────────────────────────────────────┐      │
│    │ DAG: Infrastructure Prerequisites                    │      │
│    │   [kubectl] ──┐                                      │      │
│    │   [cluster]   ├──→ [Validation Gate]                │      │
│    │   [nodes]     │                                      │      │
│    │   [storage] ──┘                                      │      │
│    └─────────────────────────────────────────────────────┘      │
│           ↓                                                        │
│    ┌─────────────────────────────────────────────────────┐      │
│    │ DAG: Infrastructure Deployment                       │      │
│    │   [Namespace]   ──┐                                  │      │
│    │   [ConfigMaps]    ├──→ [Deployment Ready]           │      │
│    │   [Services]      │                                  │      │
│    │   [Ingress]     ──┘                                  │      │
│    └─────────────────────────────────────────────────────┘      │
│           ↓                                                        │
│    [Infrastructure Ready] ✅                                      │
│           ↓                                                        │
│  Phase 2: Application Layer (DAG Execution) ━━━━━━━━━━━━━━━━━  │
│    ┌─────────────────────────────────────────────────────┐      │
│    │ DAG: Application Deployment & Testing               │      │
│    │   [Deploy App] ──→ [Unit Tests]    ──┐             │      │
│    │                 └→ [API Tests]       ├→ [Validate]  │      │
│    │                 └→ [E2E Tests]       │              │      │
│    │                 └→ [Perf Tests]    ──┘             │      │
│    └─────────────────────────────────────────────────────┘      │
│           ↓                                                        │
│    [Application Ready] ✅                                         │
│           ↓                                                        │
│  Phase 3: Learning & ADR Update                                   │
│    └─> [Capture Learnings, Update ADRs]                          │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

## Implementation Design

### 1. Task Node Definition

```typescript
/**
 * A single executable task in the DAG
 */
interface TaskNode {
  id: string;
  name: string;
  description: string;

  // Execution
  command?: string;
  commandArgs?: string[];
  expectedExitCode?: number;
  timeout?: number;

  // Dependencies
  dependsOn: string[]; // Task IDs that must complete first
  canFailSafely?: boolean; // Can continue even if this fails

  // Platform-specific
  platforms?: string[]; // ['kubernetes', 'openshift']

  // Retry and error handling
  retryCount?: number;
  retryDelay?: number;

  // Validation
  validationCheck?: (output: string) => boolean;

  // Metadata
  category: 'infrastructure' | 'application';
  severity: 'critical' | 'error' | 'warning' | 'info';
}

/**
 * DAG execution result
 */
interface DAGExecutionResult {
  success: boolean;
  executedTasks: string[];
  failedTasks: string[];
  skippedTasks: string[];
  duration: number;
  taskResults: Map<string, TaskResult>;
}

interface TaskResult {
  taskId: string;
  success: boolean;
  exitCode?: number;
  stdout: string;
  stderr: string;
  duration: number;
  error?: Error;
}
```

### 2. DAG Executor

```typescript
/**
 * Executes tasks in DAG with dependency resolution and parallel execution
 */
class DAGExecutor {
  private logger: EnhancedLogger;
  private maxParallelism: number;

  constructor(maxParallelism: number = 5) {
    this.logger = new EnhancedLogger();
    this.maxParallelism = maxParallelism;
  }

  /**
   * Execute DAG with topological sort and parallel execution
   */
  async execute(tasks: TaskNode[]): Promise<DAGExecutionResult> {
    // 1. Build dependency graph
    const graph = this.buildDependencyGraph(tasks);

    // 2. Topological sort
    const sortedLayers = this.topologicalSort(graph);

    // 3. Execute layer by layer (parallel within layer)
    const results = new Map<string, TaskResult>();
    const failedTasks: string[] = [];
    const skippedTasks: string[] = [];

    for (const layer of sortedLayers) {
      // Execute all tasks in this layer in parallel
      const layerResults = await this.executeLayer(layer, results);

      for (const [taskId, result] of layerResults) {
        results.set(taskId, result);

        if (!result.success) {
          failedTasks.push(taskId);

          // Mark dependent tasks as skipped
          const dependents = this.getDependentTasks(taskId, tasks);
          skippedTasks.push(...dependents);
        }
      }

      // Stop if critical task failed
      const criticalTaskFailed = layer.some(
        task => !results.get(task.id)?.success && task.severity === 'critical'
      );

      if (criticalTaskFailed) {
        this.logger.error('Critical task failed, stopping DAG execution');
        break;
      }
    }

    return {
      success: failedTasks.length === 0,
      executedTasks: Array.from(results.keys()),
      failedTasks,
      skippedTasks,
      duration: Array.from(results.values()).reduce((sum, r) => sum + r.duration, 0),
      taskResults: results,
    };
  }

  /**
   * Execute all tasks in a layer in parallel
   */
  private async executeLayer(
    layer: TaskNode[],
    previousResults: Map<string, TaskResult>
  ): Promise<Map<string, TaskResult>> {
    const results = new Map<string, TaskResult>();

    // Check dependencies before execution
    const executableTasks = layer.filter(task => {
      const dependenciesMet = task.dependsOn.every(depId => previousResults.get(depId)?.success);

      if (!dependenciesMet) {
        this.logger.warn(`Task ${task.id} dependencies not met, skipping`);
        results.set(task.id, {
          taskId: task.id,
          success: false,
          stdout: '',
          stderr: 'Dependencies not met',
          duration: 0,
          error: new Error('Dependencies not met'),
        });
      }

      return dependenciesMet;
    });

    // Execute in parallel with concurrency limit
    const taskPromises = executableTasks.map(task => this.executeTask(task));

    const taskResults = await Promise.allSettled(taskPromises);

    for (let i = 0; i < executableTasks.length; i++) {
      const task = executableTasks[i];
      const result = taskResults[i];

      if (result.status === 'fulfilled') {
        results.set(task.id, result.value);
      } else {
        results.set(task.id, {
          taskId: task.id,
          success: false,
          stdout: '',
          stderr: result.reason.message,
          duration: 0,
          error: result.reason,
        });
      }
    }

    return results;
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: TaskNode): Promise<TaskResult> {
    const startTime = Date.now();

    this.logger.info(`Executing task: ${task.name}`, 'DAGExecutor');

    try {
      if (!task.command) {
        throw new Error(`Task ${task.id} has no command defined`);
      }

      const { stdout, stderr, exitCode } = await this.runCommand(
        task.command,
        task.commandArgs || [],
        task.timeout || 30000
      );

      const duration = Date.now() - startTime;
      const success = exitCode === (task.expectedExitCode ?? 0);

      // Run validation check if defined
      if (success && task.validationCheck) {
        const validationPassed = task.validationCheck(stdout);
        if (!validationPassed) {
          return {
            taskId: task.id,
            success: false,
            exitCode,
            stdout,
            stderr: 'Validation check failed',
            duration,
            error: new Error('Validation check failed'),
          };
        }
      }

      return {
        taskId: task.id,
        success,
        exitCode,
        stdout,
        stderr,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Retry logic
      if (task.retryCount && task.retryCount > 0) {
        this.logger.warn(`Task ${task.id} failed, retrying...`, 'DAGExecutor');

        if (task.retryDelay) {
          await new Promise(resolve => setTimeout(resolve, task.retryDelay));
        }

        // Recursively retry
        const retryTask = { ...task, retryCount: task.retryCount - 1 };
        return this.executeTask(retryTask);
      }

      return {
        taskId: task.id,
        success: false,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        duration,
        error: error as Error,
      };
    }
  }

  /**
   * Run shell command with timeout
   */
  private async runCommand(
    command: string,
    args: string[],
    timeout: number
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    // Implementation using child_process.exec or similar
    // ...
  }

  /**
   * Build dependency graph from tasks
   */
  private buildDependencyGraph(tasks: TaskNode[]): Map<string, TaskNode> {
    const graph = new Map<string, TaskNode>();

    for (const task of tasks) {
      graph.set(task.id, task);
    }

    return graph;
  }

  /**
   * Topological sort to determine execution order
   */
  private topologicalSort(graph: Map<string, TaskNode>): TaskNode[][] {
    const layers: TaskNode[][] = [];
    const visited = new Set<string>();
    const inDegree = new Map<string, number>();

    // Calculate in-degrees
    for (const [id, task] of graph) {
      if (!inDegree.has(id)) {
        inDegree.set(id, 0);
      }

      for (const depId of task.dependsOn) {
        inDegree.set(depId, inDegree.get(depId) || 0);
        inDegree.set(id, (inDegree.get(id) || 0) + 1);
      }
    }

    // Process nodes layer by layer
    while (visited.size < graph.size) {
      const layer: TaskNode[] = [];

      for (const [id, task] of graph) {
        if (!visited.has(id) && (inDegree.get(id) || 0) === 0) {
          layer.push(task);
        }
      }

      if (layer.length === 0) {
        throw new Error('Circular dependency detected in DAG');
      }

      layers.push(layer);

      for (const task of layer) {
        visited.add(task.id);

        // Update in-degrees for dependent tasks
        for (const [id, t] of graph) {
          if (t.dependsOn.includes(task.id)) {
            inDegree.set(id, (inDegree.get(id) || 0) - 1);
          }
        }
      }
    }

    return layers;
  }

  /**
   * Get all tasks that depend on the given task
   */
  private getDependentTasks(taskId: string, allTasks: TaskNode[]): string[] {
    const dependents: string[] = [];
    const queue = [taskId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      for (const task of allTasks) {
        if (task.dependsOn.includes(current) && !visited.has(task.id)) {
          dependents.push(task.id);
          queue.push(task.id);
        }
      }
    }

    return dependents;
  }
}
```

### 3. Integration with Bootstrap Validation Loop

```typescript
/**
 * Enhanced Bootstrap Validation Loop with Hybrid DAG support
 */
export class BootstrapValidationLoop {
  private dagExecutor: DAGExecutor;
  private patternLoader: PatternLoader;

  constructor(projectPath: string, adrDirectory: string, maxIterations: number = 5) {
    // ... existing initialization
    this.dagExecutor = new DAGExecutor(5); // Max 5 parallel tasks
    this.patternLoader = new PatternLoader();
  }

  /**
   * Execute Phase 1: Infrastructure Layer with DAG
   *
   * This method:
   * 1. Attempts to load validated pattern from YAML
   * 2. If pattern exists: Auto-generates DAG tasks from pattern definition
   * 3. If pattern doesn't exist: Works with user to create GitHub issue for validatedpatterns project
   */
  private async executeInfrastructurePhase(
    platformDetection: PlatformDetectionResult
  ): Promise<DAGExecutionResult> {
    const platform = platformDetection.primaryPlatform || 'unknown';

    // Try to load validated pattern from YAML
    let validatedPattern = await this.patternLoader.loadPattern(platform);

    // If no pattern exists, work with user to create GitHub issue
    if (!validatedPattern) {
      this.logger.warn(
        `No validated pattern found for platform: ${platform}`,
        'BootstrapValidationLoop'
      );

      const shouldCreateIssue = await this.promptUserForPatternContribution(
        platform,
        platformDetection
      );

      if (shouldCreateIssue) {
        await this.createValidatedPatternIssue(platform, platformDetection);
      }

      // Fall back to AI-generated deployment plan
      validatedPattern = await this.generateFallbackPattern(platformDetection);
    }

    // Auto-generate infrastructure DAG tasks from validated pattern
    const tasks = this.buildInfrastructureTasksFromPattern(validatedPattern, platform);

    // Execute infrastructure DAG
    this.logger.info('🏗️  Executing Infrastructure Layer (DAG)', 'BootstrapValidationLoop');
    const result = await this.dagExecutor.execute(tasks);

    return result;
  }

  /**
   * Auto-generate DAG tasks from validated pattern definition
   *
   * This is the KEY method that converts validated patterns (YAML) into executable DAG tasks
   */
  private buildInfrastructureTasksFromPattern(
    pattern: DynamicPattern,
    platform: string
  ): TaskNode[] {
    const tasks: TaskNode[] = [];

    // 1. Build tasks from deploymentPhases in validated pattern
    for (const phase of pattern.deploymentPhases) {
      // Only include infrastructure-related phases
      const isInfraPhase =
        phase.name.toLowerCase().includes('infrastructure') ||
        phase.name.toLowerCase().includes('prerequisite') ||
        phase.name.toLowerCase().includes('setup') ||
        phase.name.toLowerCase().includes('namespace') ||
        phase.name.toLowerCase().includes('validation') ||
        phase.order <= 2; // First 2 phases are typically infrastructure

      if (isInfraPhase) {
        // Convert each command in the phase to a task node
        for (const cmd of phase.commands) {
          const taskId = `${platform}-phase-${phase.order}-${this.sanitizeTaskId(cmd.description)}`;

          tasks.push({
            id: taskId,
            name: cmd.description,
            description: cmd.description,
            command: cmd.command.split(' ')[0],
            commandArgs: cmd.command.split(' ').slice(1),
            expectedExitCode: cmd.expectedExitCode ?? 0,

            // Map phase prerequisites to task dependencies
            dependsOn: this.mapPrerequisitesToDependencies(
              phase.prerequisites,
              pattern.deploymentPhases,
              platform
            ),

            category: 'infrastructure',
            severity: phase.order === 1 ? 'critical' : 'error',
            timeout: this.parseDuration(phase.estimatedDuration),
          });
        }
      }
    }

    // 2. Add validation checks as DAG tasks
    if (pattern.validationChecks) {
      for (const check of pattern.validationChecks) {
        // Only add infrastructure validation checks
        const isInfraCheck =
          check.id.includes('cluster') ||
          check.id.includes('node') ||
          check.id.includes('connection') ||
          check.severity === 'critical';

        if (isInfraCheck) {
          tasks.push({
            id: `validate-${check.id}`,
            name: check.name,
            description: check.description,
            command: check.command.split(' ')[0],
            commandArgs: check.command.split(' ').slice(1),
            expectedExitCode: check.expectedExitCode ?? 0,

            // Validation checks depend on deployment tasks
            dependsOn: tasks
              .filter(t => t.category === 'infrastructure' && !t.id.startsWith('validate-'))
              .map(t => t.id),

            category: 'infrastructure',
            severity: check.severity,
            validationCheck: this.createValidationCheckFunction(check),
          });
        }
      }
    }

    // 3. Add dependency installation tasks if defined
    if (pattern.dependencies) {
      for (const dep of pattern.dependencies) {
        if (dep.required && dep.installCommand) {
          tasks.unshift({
            // Add to beginning (prerequisites)
            id: `install-${dep.name}`,
            name: `Install ${dep.name}`,
            description: `Install required dependency: ${dep.name}`,
            command: dep.installCommand.split(' ')[0],
            commandArgs: dep.installCommand.split(' ').slice(1),
            expectedExitCode: 0,
            dependsOn: [],
            category: 'infrastructure',
            severity: 'critical',
          });

          // Add verification task
          if (dep.verificationCommand) {
            tasks.push({
              id: `verify-${dep.name}`,
              name: `Verify ${dep.name}`,
              description: `Verify ${dep.name} is properly installed`,
              command: dep.verificationCommand.split(' ')[0],
              commandArgs: dep.verificationCommand.split(' ').slice(1),
              expectedExitCode: 0,
              dependsOn: [`install-${dep.name}`],
              category: 'infrastructure',
              severity: 'critical',
            });
          }
        }
      }
    }

    return tasks;
  }

  /**
   * Prompt user to contribute missing pattern to validatedpatterns project
   */
  private async promptUserForPatternContribution(
    platform: string,
    detection: PlatformDetectionResult
  ): Promise<boolean> {
    const message = `
# 📝 Missing Validated Pattern Detected

No validated pattern exists for platform: **${platform}**

## Detected Platform Evidence
${detection.evidence
  .slice(0, 5)
  .map(
    (e, i) => `${i + 1}. ${e.file}: ${e.indicator} (confidence: ${(e.weight * 100).toFixed(0)}%)`
  )
  .join('\n')}

## Contribute to validatedpatterns Community

Would you like to create a GitHub issue to request this pattern be added to the
[validatedpatterns repository](https://github.com/validatedpatterns)?

This will help the entire community benefit from ${platform} deployment patterns.

**Your contribution would include:**
- Platform detection evidence from your project
- Deployment requirements you've identified
- Authentication and infrastructure needs
- Suggested deployment phases and validation checks

**Options:**
1. ✅ Yes - Create GitHub issue (recommended)
2. ⏭️  Skip - Use AI-generated fallback pattern (less tested)

Please confirm: Create GitHub issue for ${platform} pattern?
    `.trim();

    this.logger.info(message, 'BootstrapValidationLoop');

    // In guided mode, return prompt asking user to confirm
    // In automated mode, this would integrate with GitHub API
    return false; // User decides
  }

  /**
   * Create GitHub issue for missing validated pattern
   */
  private async createValidatedPatternIssue(
    platform: string,
    detection: PlatformDetectionResult
  ): Promise<void> {
    const issueTitle = `[Pattern Request] Add ${platform} validated pattern`;

    const issueBody = `
## Platform Information

**Platform**: ${platform}
**Detection Confidence**: ${(detection.confidence * 100).toFixed(1)}%

## Detection Evidence

${detection.evidence
  .slice(0, 10)
  .map(
    (e, i) => `${i + 1}. **${e.file}**: ${e.indicator} (weight: ${(e.weight * 100).toFixed(0)}%)`
  )
  .join('\n')}

## Requested Pattern Components

### Deployment Phases
Please include deployment phases for:
- [ ] Prerequisites validation (CLI tools, cluster access)
- [ ] Infrastructure setup (namespaces, RBAC, storage)
- [ ] Resource deployment (services, ingress, configurations)
- [ ] Validation checks (health checks, connectivity tests)

### Authoritative Sources
Please include links to:
- [ ] Official ${platform} documentation
- [ ] ${platform} deployment best practices
- [ ] ${platform} example repositories
- [ ] ${platform} community resources

### Configuration Templates
Please include templates for:
- [ ] Deployment manifests
- [ ] Service definitions
- [ ] Ingress/routing configuration
- [ ] Secret management

## Use Case

This pattern was requested during an automated bootstrap validation loop for a project
that detected ${platform} as the target deployment platform.

## Additional Context

- All detected platforms: ${detection.detectedPlatforms?.map(p => p.type).join(', ') || platform}
- Project type: [Automatic detection from codebase]
- Deployment target: [Development/Staging/Production]

---

**Submitted by**: MCP ADR Analysis Server - Bootstrap Validation Loop
**Generated**: ${new Date().toISOString()}
**Repository**: [validatedpatterns project](https://github.com/validatedpatterns)
    `.trim();

    this.logger.info(
      `GitHub issue content prepared:\nTitle: ${issueTitle}\n\nBody:\n${issueBody}`,
      'BootstrapValidationLoop'
    );

    // In real implementation, this would use GitHub API:
    // const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    // await octokit.issues.create({
    //   owner: 'validatedpatterns',
    //   repo: 'patterns',
    //   title: issueTitle,
    //   body: issueBody,
    //   labels: ['pattern-request', platform, 'community-contribution'],
    // });

    this.logger.info(
      '✅ GitHub issue created for missing validated pattern',
      'BootstrapValidationLoop'
    );
  }

  /**
   * Generate fallback pattern using AI when validated pattern doesn't exist
   */
  private async generateFallbackPattern(
    detection: PlatformDetectionResult
  ): Promise<DynamicPattern> {
    this.logger.warn(
      'Generating fallback pattern using AI - less tested than validated patterns',
      'BootstrapValidationLoop'
    );

    // Use existing dynamic deployment intelligence as fallback
    const plan = await this.deploymentIntelligence.generatePlan();

    // Convert to DynamicPattern format
    return {
      version: '1.0-fallback',
      id: `${detection.primaryPlatform}-ai-generated`,
      name: `${detection.primaryPlatform} (AI-Generated)`,
      description: 'Auto-generated deployment pattern - not validated by community',
      authoritativeSources: [],
      deploymentPhases: plan.deploymentSteps.map((step, i) => ({
        order: i + 1,
        name: step.title,
        description: step.description,
        estimatedDuration: step.estimatedTime,
        canParallelize: false,
        prerequisites: i > 0 ? [plan.deploymentSteps[i - 1].title] : [],
        commands: [
          {
            description: step.description,
            command: step.command,
            expectedExitCode: 0,
          },
        ],
      })),
      validationChecks: plan.validationChecks.map((check, i) => ({
        id: `check-${i}`,
        name: check.name,
        description: check.name,
        command: check.command,
        expectedExitCode: 0,
        severity: check.severity,
        failureMessage: `Validation failed: ${check.name}`,
        remediationSteps: [],
      })),
      metadata: {
        source: 'AI-Generated (Fallback)',
        lastUpdated: new Date().toISOString(),
        tags: [detection.primaryPlatform || 'unknown', 'ai-generated', 'unvalidated'],
      },
    };
  }

  /**
   * Helper: Map phase prerequisites to task dependencies
   */
  private mapPrerequisitesToDependencies(
    prerequisites: string[],
    allPhases: DeploymentPhase[],
    platform: string
  ): string[] {
    const dependencies: string[] = [];

    for (const prereq of prerequisites) {
      // Find the phase with this name
      const phase = allPhases.find(p => p.name === prereq);

      if (phase) {
        // Add all tasks from that phase as dependencies
        for (const cmd of phase.commands) {
          const taskId = `${platform}-phase-${phase.order}-${this.sanitizeTaskId(cmd.description)}`;
          dependencies.push(taskId);
        }
      }
    }

    return dependencies;
  }

  /**
   * Helper: Sanitize task ID (remove special chars)
   */
  private sanitizeTaskId(description: string): string {
    return description
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Helper: Parse duration string to milliseconds
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/(\d+)\s*(minutes?|mins?|seconds?|secs?)/i);

    if (!match) {
      return 30000; // Default 30 seconds
    }

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    if (unit.startsWith('min')) {
      return value * 60 * 1000;
    } else {
      return value * 1000;
    }
  }

  /**
   * Helper: Create validation check function from validation check definition
   */
  private createValidationCheckFunction(check: ValidationCheck): (output: string) => boolean {
    return (output: string) => {
      // Simple validation: check if output doesn't contain failure keywords
      const failureKeywords = ['error', 'failed', 'not found', 'cannot', 'unable'];
      const outputLower = output.toLowerCase();

      return !failureKeywords.some(keyword => outputLower.includes(keyword));
    };
  }

  /**
   * Execute Phase 2: Application Layer with DAG
   */
  private async executeApplicationPhase(
    validatedPattern: ValidatedPattern
  ): Promise<DAGExecutionResult> {
    const tasks: TaskNode[] = [];

    // Application deployment
    tasks.push({
      id: 'deploy-application',
      name: 'Deploy Application',
      description: 'Deploy application to infrastructure',
      command: './deploy-app.sh',
      expectedExitCode: 0,
      dependsOn: [],
      category: 'application',
      severity: 'critical',
    });

    // Testing tasks (can run in parallel after deployment)
    tasks.push(
      {
        id: 'unit-tests',
        name: 'Unit Tests',
        description: 'Run unit tests',
        command: 'npm',
        commandArgs: ['run', 'test:unit'],
        expectedExitCode: 0,
        dependsOn: ['deploy-application'],
        category: 'application',
        severity: 'error',
      },
      {
        id: 'api-tests',
        name: 'API Tests',
        description: 'Run API integration tests',
        command: 'npm',
        commandArgs: ['run', 'test:api'],
        expectedExitCode: 0,
        dependsOn: ['deploy-application'],
        category: 'application',
        severity: 'error',
      },
      {
        id: 'e2e-tests',
        name: 'E2E Tests',
        description: 'Run end-to-end tests',
        command: 'npm',
        commandArgs: ['run', 'test:e2e'],
        expectedExitCode: 0,
        dependsOn: ['deploy-application'],
        category: 'application',
        severity: 'warning',
        canFailSafely: true,
      }
    );

    // Execute application DAG
    this.logger.info('🧪 Executing Application Layer (DAG)', 'BootstrapValidationLoop');
    const result = await this.dagExecutor.execute(tasks);

    return result;
  }
}
```

## Community Contribution Workflow

One of the most powerful aspects of this hybrid approach is the **automatic community contribution loop**:

### Pattern Discovery Flow

```
┌────────────────────────────────────────────────────────────┐
│ 1. Platform Detection                                      │
│    └─> Detect: kubernetes, openshift, docker, etc.        │
└────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────┐
│ 2. Load Validated Pattern                                 │
│    └─> Try: patterns/infrastructure/{platform}.yaml       │
└────────────────────────────────────────────────────────────┘
                         ↓
                    Pattern exists?
                    /            \
              YES /                \ NO
                 /                  \
                ↓                    ↓
┌──────────────────────────┐  ┌────────────────────────────┐
│ 3A. Use Community Pattern│  │ 3B. Community Contribution │
│                          │  │                            │
│ • Load YAML definition   │  │ • Prompt user              │
│ • Extract deployment     │  │ • Create GitHub issue      │
│   phases                 │  │ • Include detection        │
│ • Extract validation     │  │   evidence                 │
│   checks                 │  │ • Request pattern creation │
│ • Build DAG tasks        │  │                            │
│   automatically          │  │ Then: Fall back to AI      │
└──────────────────────────┘  └────────────────────────────┘
                ↓                            ↓
┌────────────────────────────────────────────────────────────┐
│ 4. Execute Infrastructure DAG                              │
│    └─> Run tasks in parallel where dependencies allow      │
└────────────────────────────────────────────────────────────┘
```

### Example: Missing AWS ECS Pattern

When a user's project is detected as **AWS ECS** but no validated pattern exists:

**Step 1: Detection**

```
Detected Platform: aws-ecs (75% confidence)
Evidence:
- task-definition.json: ECS task configuration (weight: 90%)
- ecs-service.yaml: ECS service definition (weight: 85%)
- Dockerfile: Container image (weight: 60%)
```

**Step 2: Pattern Not Found**

```
⚠️  No validated pattern found for: aws-ecs
```

**Step 3: User Prompt**

```markdown
# 📝 Missing Validated Pattern Detected

No validated pattern exists for platform: **aws-ecs**

## Contribute to validatedpatterns Community

Would you like to create a GitHub issue to request this pattern?

Your contribution would include:

- Platform detection evidence from your project
- Deployment requirements you've identified
- Suggested deployment phases

Options:

1. ✅ Yes - Create GitHub issue (recommended)
2. ⏭️ Skip - Use AI-generated fallback
```

**Step 4: GitHub Issue Created**

```markdown
Title: [Pattern Request] Add aws-ecs validated pattern

## Platform Information

Platform: aws-ecs
Detection Confidence: 75.0%

## Detection Evidence

1. **task-definition.json**: ECS task configuration (90%)
2. **ecs-service.yaml**: ECS service definition (85%)
3. **Dockerfile**: Container image (60%)

## Requested Pattern Components

- [ ] Prerequisites validation (AWS CLI, ECS CLI tools)
- [ ] Infrastructure setup (ECS cluster, task definitions)
- [ ] Resource deployment (services, load balancers)
- [ ] Validation checks (task running, health checks)

Submitted by: MCP ADR Analysis Server
```

**Step 5: Community Response**

- validatedpatterns maintainers see the issue
- Create `patterns/infrastructure/aws-ecs.yaml`
- Future users automatically benefit from the pattern

### Benefits of This Workflow

1. **Users get immediate value**: Either from existing patterns or AI fallback
2. **Community grows organically**: Missing patterns are reported automatically
3. **Quality improves over time**: More platforms get validated patterns
4. **Evidence-based contributions**: GitHub issues include real-world detection data
5. **Low friction**: Users just confirm "Yes" - system handles the rest

### Implementation Notes

**GitHub API Integration:**

```typescript
// In production, integrate with GitHub API
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

await octokit.issues.create({
  owner: 'validatedpatterns',
  repo: 'patterns', // or appropriate repo
  title: issueTitle,
  body: issueBody,
  labels: ['pattern-request', platform, 'community-contribution', 'auto-generated'],
});
```

**Fallback to AI:**

- When pattern doesn't exist AND user declines GitHub issue
- Use existing `DynamicDeploymentIntelligence` for AI-generated plan
- Clearly mark as "unvalidated" to set expectations
- Still functional, just less battle-tested than community patterns

## Benefits of Hybrid Approach

### 1. Clear Separation of Concerns ✅

**Infrastructure Layer:**

- Platform prerequisites
- Cluster connectivity
- Infrastructure deployment (namespaces, configs, services)
- Infrastructure validation

**Application Layer:**

- Application deployment
- Unit tests, API tests, E2E tests, performance tests
- Application validation

This separation allows:

- **Independent failure domains**: Infrastructure failures don't pollute application test results
- **Clear checkpoints**: Can validate infrastructure is ready before starting application tests
- **Better error messages**: "Infrastructure not ready" vs "Application tests failed"

### 2. Parallel Execution Where It Matters ✅

**Infrastructure Prerequisites** (parallel):

```
[kubectl check] ──┐
[cluster-info]    ├──→ [Namespace Setup]
[nodes check]     │
[storage check] ──┘
```

**Application Testing** (parallel):

```
[Deploy App] ──→ [Unit Tests]   ──┐
             └──→ [API Tests]      ├──→ [Validation]
             └──→ [E2E Tests]      │
             └──→ [Perf Tests]   ──┘
```

### 3. Fine-Grained Retry ✅

Current approach: If Phase 2 fails, retry entire iteration.
Hybrid approach: Retry only the failed task node (e.g., just `e2e-tests`), not the entire application phase.

### 4. Maintains Human-in-the-Loop ✅

The outer phase-based iteration still allows for human approval gates:

```typescript
// Phase 0: Platform Detection
await detectPlatform();
await waitForHumanApproval(); // ✋ Human confirms platform

// Phase 1: Infrastructure DAG
const infraResult = await executeInfrastructurePhase();
await waitForHumanApproval(); // ✋ Human confirms infrastructure ready

// Phase 2: Application DAG
const appResult = await executeApplicationPhase();
```

### 5. Leverages Validated Patterns ✅

The validated patterns (kubernetes.yaml) already define task dependencies:

```yaml
deploymentPhases:
  - order: 1
    name: 'Prerequisites Validation'
    prerequisites: []
    commands:
      - description: 'Verify kubectl'
        command: 'kubectl version --client'

  - order: 2
    name: 'Namespace Setup'
    prerequisites: ['Prerequisites Validation']
    commands:
      - description: 'Create namespace'
        command: 'kubectl create namespace <app-namespace>'
```

These map directly to DAG task nodes with `dependsOn` relationships.

## Implementation Roadmap

### Phase 1: Core DAG Executor (Week 1)

- [ ] Implement `TaskNode` interface
- [ ] Implement `DAGExecutor` class with topological sort
- [ ] Add parallel execution with concurrency limits
- [ ] Add retry logic and error handling
- [ ] Write comprehensive tests

### Phase 2: Infrastructure Layer Integration (Week 2)

- [ ] Extract infrastructure tasks from validated patterns
- [ ] Convert deployment phases to task nodes
- [ ] Implement `executeInfrastructurePhase()` method
- [ ] Add infrastructure validation checks
- [ ] Test with Kubernetes and OpenShift patterns

### Phase 3: Application Layer Integration (Week 3)

- [ ] Define application testing tasks
- [ ] Implement `executeApplicationPhase()` method
- [ ] Add application validation checks
- [ ] Test with real application deployments

### Phase 4: Human-in-the-Loop Integration (Week 4)

- [ ] Maintain phase-based iteration outer loop
- [ ] Add approval gates between infrastructure and application phases
- [ ] Update context documentation with DAG execution results
- [ ] Add learning/feedback capture for DAG execution

## Testing Strategy

### Unit Tests

- DAG topological sort correctness
- Parallel execution limits
- Dependency resolution
- Error handling and retries

### Integration Tests

- Infrastructure layer execution
- Application layer execution
- End-to-end bootstrap workflow
- Failure scenarios and recovery

### Performance Tests

- Parallel execution speedup
- Large DAG scalability
- Memory usage under load

## Success Metrics

- ⏱️ **Execution Time**: 30-50% faster due to parallelism
- 🎯 **Precision**: Fine-grained task-level retry instead of phase-level
- 📊 **Observability**: Clear separation of infrastructure vs application failures
- 🔄 **Maintainability**: Easier to add new validation checks as DAG nodes

## References

- [Validated Patterns: Kubernetes](../../patterns/infrastructure/kubernetes.yaml)
- [Bootstrap Validation Loop Implementation](../../src/tools/bootstrap-validation-loop-tool.ts)
- [Tool Context Documentation](../context/README.md)

---

**Status**: Design approved, ready for implementation
**Owner**: Bootstrap Validation Loop Team
**Last Updated**: 2025-10-20
