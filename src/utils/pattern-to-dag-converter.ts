/**
 * Pattern to DAG Converter
 *
 * Converts validated patterns (YAML definitions) into executable DAG task nodes
 * for the bootstrap validation loop's infrastructure layer.
 */

import type { TaskNode } from './dag-executor.js';
import type { DynamicPattern, DeploymentPhase, ValidationCheck } from './pattern-loader.js';
import { EnhancedLogger } from './enhanced-logging.js';

/**
 * Convert validated pattern to infrastructure DAG tasks
 */
export class PatternToDAGConverter {
  private logger: EnhancedLogger;

  constructor() {
    this.logger = new EnhancedLogger();
  }

  /**
   * Build infrastructure DAG tasks from validated pattern
   *
   * This is the KEY method that auto-generates DAG tasks from pattern YAML
   */
  buildInfrastructureTasksFromPattern(pattern: DynamicPattern, platform: string): TaskNode[] {
    const tasks: TaskNode[] = [];

    this.logger.info(
      `🔨 Building infrastructure DAG tasks for platform: ${platform}`,
      'PatternToDAGConverter'
    );

    // 1. Add dependency installation tasks (highest priority)
    if (pattern.dependencies) {
      this.logger.info(
        `📦 Adding ${pattern.dependencies.length} dependency installation tasks`,
        'PatternToDAGConverter'
      );

      for (const dep of pattern.dependencies) {
        if (dep.required) {
          // Install task
          if (dep.installCommand) {
            const installTask = this.createDependencyInstallTask(dep, platform);
            tasks.push(installTask);
          }

          // Verification task
          if (dep.verificationCommand) {
            const verifyTask = this.createDependencyVerificationTask(dep, platform);
            tasks.push(verifyTask);
          }
        }
      }
    }

    // 2. Build tasks from deploymentPhases (core infrastructure setup)
    if (pattern.deploymentPhases) {
      this.logger.info(
        `🏗️  Processing ${pattern.deploymentPhases.length} deployment phases`,
        'PatternToDAGConverter'
      );

      for (const phase of pattern.deploymentPhases) {
        const isInfraPhase = this.isInfrastructurePhase(phase);

        if (isInfraPhase) {
          const phaseTasks = this.createTasksFromPhase(phase, pattern, platform);
          tasks.push(...phaseTasks);
        }
      }
    }

    // 3. Add validation checks as DAG tasks
    if (pattern.validationChecks) {
      this.logger.info(
        `✅ Adding ${pattern.validationChecks.length} validation check tasks`,
        'PatternToDAGConverter'
      );

      for (const check of pattern.validationChecks) {
        const isInfraCheck = this.isInfrastructureValidationCheck(check);

        if (isInfraCheck) {
          const checkTask = this.createValidationCheckTask(check, tasks, platform);
          tasks.push(checkTask);
        }
      }
    }

    this.logger.info(
      `✅ Generated ${tasks.length} infrastructure DAG tasks from pattern`,
      'PatternToDAGConverter'
    );

    return tasks;
  }

  /**
   * Create dependency installation task
   */
  private createDependencyInstallTask(
    dependency: {
      name: string;
      installCommand?: string;
      type: 'buildtime' | 'runtime';
    },
    platform: string
  ): TaskNode {
    const cmd = dependency.installCommand!;
    const parts = cmd.split(' ').filter(p => p.trim());

    const task: TaskNode = {
      id: `${platform}-install-${this.sanitizeTaskId(dependency.name)}`,
      name: `Install ${dependency.name}`,
      description: `Install required dependency: ${dependency.name}`,
      commandArgs: parts.slice(1),
      expectedExitCode: 0,
      dependsOn: [],
      category: 'infrastructure',
      severity: 'critical',
      timeout: 120000, // 2 minutes for installations
    };

    if (parts[0]) {
      task.command = parts[0];
    }

    return task;
  }

  /**
   * Create dependency verification task
   */
  private createDependencyVerificationTask(
    dependency: {
      name: string;
      verificationCommand?: string;
      type: 'buildtime' | 'runtime';
    },
    platform: string
  ): TaskNode {
    const cmd = dependency.verificationCommand!;
    const parts = cmd.split(' ').filter(p => p.trim());

    const task: TaskNode = {
      id: `${platform}-verify-${this.sanitizeTaskId(dependency.name)}`,
      name: `Verify ${dependency.name}`,
      description: `Verify ${dependency.name} is properly installed`,
      commandArgs: parts.slice(1),
      expectedExitCode: 0,
      dependsOn: [`${platform}-install-${this.sanitizeTaskId(dependency.name)}`],
      category: 'infrastructure',
      severity: 'critical',
      timeout: 30000,
    };

    if (parts[0]) {
      task.command = parts[0];
    }

    return task;
  }

  /**
   * Create tasks from a deployment phase
   */
  private createTasksFromPhase(
    phase: DeploymentPhase,
    pattern: DynamicPattern,
    platform: string
  ): TaskNode[] {
    const tasks: TaskNode[] = [];

    for (const cmd of phase.commands) {
      const taskId = `${platform}-phase-${phase.order}-${this.sanitizeTaskId(cmd.description)}`;
      const parts = cmd.command.split(' ').filter(p => p.trim());

      // Map phase prerequisites to task dependencies
      const dependencies = this.mapPrerequisitesToDependencies(
        phase.prerequisites,
        pattern.deploymentPhases,
        platform
      );

      const task: TaskNode = {
        id: taskId,
        name: cmd.description,
        description: cmd.description,
        commandArgs: parts.slice(1),
        expectedExitCode: cmd.expectedExitCode ?? 0,
        dependsOn: dependencies,
        category: 'infrastructure',
        severity: phase.order === 1 ? 'critical' : 'error',
        timeout: this.parseDuration(phase.estimatedDuration),
        canFailSafely: phase.order > 2, // Later phases can fail without stopping
      };

      if (parts[0]) {
        task.command = parts[0];
      }

      tasks.push(task);
    }

    return tasks;
  }

  /**
   * Create validation check task
   */
  private createValidationCheckTask(
    check: ValidationCheck,
    existingTasks: TaskNode[],
    platform: string
  ): TaskNode {
    const parts = check.command.split(' ').filter(p => p.trim());

    // Validation checks depend on all deployment tasks
    const deploymentTaskIds = existingTasks
      .filter(t => t.category === 'infrastructure' && !t.id.startsWith(`${platform}-validate-`))
      .map(t => t.id);

    const task: TaskNode = {
      id: `${platform}-validate-${check.id}`,
      name: check.name,
      description: check.description,
      commandArgs: parts.slice(1),
      expectedExitCode: check.expectedExitCode ?? 0,
      dependsOn: deploymentTaskIds,
      category: 'infrastructure',
      severity: check.severity,
      timeout: 30000,
      validationCheck: this.createValidationCheckFunction(check),
    };

    if (parts[0]) {
      task.command = parts[0];
    }

    return task;
  }

  /**
   * Determine if a deployment phase is infrastructure-related
   */
  private isInfrastructurePhase(phase: DeploymentPhase): boolean {
    const name = phase.name.toLowerCase();

    return (
      name.includes('infrastructure') ||
      name.includes('prerequisite') ||
      name.includes('setup') ||
      name.includes('namespace') ||
      name.includes('validation') ||
      name.includes('cluster') ||
      name.includes('environment') ||
      phase.order <= 2 // First 2 phases are typically infrastructure
    );
  }

  /**
   * Determine if a validation check is infrastructure-related
   */
  private isInfrastructureValidationCheck(check: ValidationCheck): boolean {
    const id = check.id.toLowerCase();
    const name = check.name.toLowerCase();

    return (
      id.includes('cluster') ||
      id.includes('node') ||
      id.includes('connection') ||
      id.includes('infrastructure') ||
      name.includes('cluster') ||
      name.includes('node') ||
      name.includes('connectivity') ||
      check.severity === 'critical'
    );
  }

  /**
   * Map phase prerequisites to task dependencies
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
   * Create validation check function from validation check definition
   */
  private createValidationCheckFunction(check: ValidationCheck): (output: string) => boolean {
    return (output: string) => {
      const outputLower = output.toLowerCase();

      // Check for explicit failure keywords
      const failureKeywords = ['error', 'failed', 'not found', 'cannot', 'unable', 'denied'];
      const hasFailure = failureKeywords.some(keyword => outputLower.includes(keyword));

      if (hasFailure) {
        return false;
      }

      // Check for success indicators based on check type
      if (check.id.includes('deployment') || check.id.includes('ready')) {
        return outputLower.includes('ready') || outputLower.includes('running');
      }

      if (check.id.includes('endpoint') || check.id.includes('service')) {
        // Service endpoints should have IP addresses
        return /\d+\.\d+\.\d+\.\d+/.test(output);
      }

      // Default: no failure keywords = success
      return true;
    };
  }

  /**
   * Parse duration string to milliseconds
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/(\d+)\s*(minutes?|mins?|seconds?|secs?)/i);

    if (!match || !match[1] || !match[2]) {
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
   * Sanitize task ID (remove special characters)
   */
  private sanitizeTaskId(description: string): string {
    return description
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
