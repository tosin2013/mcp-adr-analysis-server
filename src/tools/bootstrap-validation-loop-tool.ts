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

import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { McpAdrError } from '../types/index.js';
import { EnhancedLogger } from '../utils/enhanced-logging.js';
import { ResearchOrchestrator } from '../utils/research-orchestrator.js';
import { MemoryEntityManager } from '../utils/memory-entity-manager.js';
import {
  DynamicDeploymentIntelligence,
  DynamicDeploymentPlan,
} from '../utils/dynamic-deployment-intelligence.js';
import generateAdrBootstrapScripts from './adr-bootstrap-validation-tool.js';

const execAsync = promisify(exec);

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
 * Bootstrap Validation Loop orchestrator
 */
export class BootstrapValidationLoop {
  private logger: EnhancedLogger;
  private projectPath: string;
  private adrDirectory: string;
  private researchOrchestrator: ResearchOrchestrator;
  private memoryManager: MemoryEntityManager;
  private deploymentIntelligence: DynamicDeploymentIntelligence;
  private executionHistory: BootstrapExecutionResult[] = [];
  private maxIterations: number;
  private currentIteration: number = 0;
  private deploymentPlan: DynamicDeploymentPlan | null = null;

  constructor(projectPath: string, adrDirectory: string, maxIterations: number = 5) {
    this.logger = new EnhancedLogger();
    this.projectPath = projectPath;
    this.adrDirectory = adrDirectory;
    this.maxIterations = maxIterations;
    this.researchOrchestrator = new ResearchOrchestrator(projectPath, adrDirectory);
    this.memoryManager = new MemoryEntityManager();
    this.deploymentIntelligence = new DynamicDeploymentIntelligence(projectPath, adrDirectory);
  }

  /**
   * Initialize the validation loop
   */
  async initialize(): Promise<void> {
    await this.memoryManager.initialize();
    this.logger.info('Bootstrap Validation Loop initialized', 'BootstrapValidationLoop', {
      projectPath: this.projectPath,
      adrDirectory: this.adrDirectory,
      maxIterations: this.maxIterations,
    });
  }

  /**
   * Execute the complete validation loop
   */
  async executeLoop(args: {
    targetEnvironment: string;
    autoFix: boolean;
    validateAfterFix: boolean;
    captureEnvironmentSnapshot: boolean;
    updateAdrsWithLearnings: boolean;
  }): Promise<{
    success: boolean;
    iterations: number;
    finalResult: BootstrapExecutionResult;
    adrUpdates: AdrUpdateProposal[];
    executionHistory: BootstrapExecutionResult[];
    deploymentPlan?: DynamicDeploymentPlan;
    bootstrapAdrPath?: string;
    requiresHumanApproval: boolean;
  }> {
    const { targetEnvironment, autoFix, captureEnvironmentSnapshot, updateAdrsWithLearnings } =
      args;

    this.logger.info('Starting Bootstrap Validation Loop', 'BootstrapValidationLoop', {
      targetEnvironment,
      autoFix,
      maxIterations: this.maxIterations,
    });

    // STEP 0: Generate AI-powered deployment plan using dynamic intelligence
    this.logger.info(
      '🤖 Generating dynamic deployment plan with AI + research...',
      'BootstrapValidationLoop'
    );
    this.deploymentPlan = await this.deploymentIntelligence.generateDeploymentPlan();

    this.logger.info(
      `📊 Deployment plan generated (confidence: ${this.deploymentPlan.confidence})`,
      'BootstrapValidationLoop',
      {
        platforms: this.deploymentPlan.detectedPlatforms,
        recommended: this.deploymentPlan.recommendedPlatform,
        source: this.deploymentPlan.source,
        requiredFiles: this.deploymentPlan.requiredFiles.length,
      }
    );

    // STEP 0.5: Create Bootstrap ADR for human review
    const bootstrapAdrPath = await this.createBootstrapAdr(this.deploymentPlan);

    this.logger.info(`📝 Bootstrap ADR created: ${bootstrapAdrPath}`, 'BootstrapValidationLoop');
    this.logger.info(
      '⏸️  WAITING FOR HUMAN APPROVAL - Review the bootstrap ADR before proceeding',
      'BootstrapValidationLoop'
    );

    let success = false;
    let finalResult: BootstrapExecutionResult | null = null;
    const adrUpdates: AdrUpdateProposal[] = [];

    for (let i = 0; i < this.maxIterations; i++) {
      this.currentIteration = i + 1;
      this.logger.info(
        `Iteration ${this.currentIteration}/${this.maxIterations}`,
        'BootstrapValidationLoop'
      );

      // Step 1: Generate bootstrap scripts from current ADRs
      const scriptsGenerated = await this.generateBootstrapScripts();
      if (!scriptsGenerated) {
        throw new McpAdrError('Failed to generate bootstrap scripts', 'SCRIPT_GENERATION_ERROR');
      }

      // Step 1.5: Detect and handle missing files
      this.logger.info('Detecting missing files referenced in ADRs...', 'BootstrapValidationLoop');
      const missingFiles = await this.detectMissingFiles();

      if (missingFiles.length > 0) {
        this.logger.warn(`Found ${missingFiles.length} missing files`, 'BootstrapValidationLoop', {
          critical: missingFiles.filter(f => f.severity === 'critical').length,
          errors: missingFiles.filter(f => f.severity === 'error').length,
        });

        // Handle missing files (create templates, add prerequisites)
        const missingFileLearnings = await this.handleMissingFiles(missingFiles);

        // Log missing file handling results
        this.logger.info(
          `Handled ${missingFileLearnings.length} missing file issues`,
          'BootstrapValidationLoop',
          {
            created: missingFileLearnings.filter(l => l.type === 'success').length,
            prerequisites: missingFileLearnings.filter(l => l.type === 'prerequisite').length,
          }
        );
      }

      // Step 2: Execute bootstrap.sh with monitoring
      const executionResult = await this.executeBootstrapWithMonitoring(
        targetEnvironment,
        captureEnvironmentSnapshot
      );
      this.executionHistory.push(executionResult);

      // Step 3: Run validation script and capture results
      const validationResult = await this.executeValidationScript(executionResult.executionId);
      executionResult.validationResults = validationResult.validationResults;

      // Step 4: Analyze results and extract learnings
      const learnings = await this.extractLearnings(executionResult, validationResult);
      executionResult.learnings = learnings;

      // Step 5: Store execution in memory system
      await this.storeExecutionInMemory(executionResult);

      // Check if validation passed
      if (validationResult.allPassed) {
        this.logger.info('✅ Validation passed!', 'BootstrapValidationLoop');
        success = true;
        finalResult = executionResult;

        // Update ADRs with successful learnings
        if (updateAdrsWithLearnings) {
          const updates = await this.generateAdrUpdates(learnings, 'success');
          adrUpdates.push(...updates);
        }
        break;
      }

      // Step 6: If auto-fix enabled, update scripts based on learnings
      if (autoFix) {
        this.logger.info(
          'Auto-fixing bootstrap scripts based on failures',
          'BootstrapValidationLoop'
        );
        const scriptsUpdated = await this.updateBootstrapScriptsFromLearnings(
          learnings,
          executionResult
        );

        if (!scriptsUpdated) {
          this.logger.warn('Failed to auto-fix scripts, stopping loop', 'BootstrapValidationLoop');
          finalResult = executionResult;
          break;
        }
      } else {
        // No auto-fix, stop after first iteration
        finalResult = executionResult;
        break;
      }

      finalResult = executionResult;
    }

    // Generate final ADR update proposals
    if (updateAdrsWithLearnings && finalResult) {
      const updates = await this.generateAdrUpdates(
        finalResult.learnings,
        success ? 'success' : 'failure'
      );
      adrUpdates.push(...updates);
    }

    const result = {
      success,
      iterations: this.currentIteration,
      finalResult: finalResult!,
      adrUpdates,
      executionHistory: this.executionHistory,
      requiresHumanApproval: true as const,
    } as {
      success: boolean;
      iterations: number;
      finalResult: BootstrapExecutionResult;
      adrUpdates: AdrUpdateProposal[];
      executionHistory: BootstrapExecutionResult[];
      deploymentPlan?: DynamicDeploymentPlan;
      bootstrapAdrPath?: string;
      requiresHumanApproval: boolean;
    };

    // Only add optional properties if they have values
    if (this.deploymentPlan) {
      result.deploymentPlan = this.deploymentPlan;
    }
    if (bootstrapAdrPath) {
      result.bootstrapAdrPath = bootstrapAdrPath;
    }

    return result;
  }

  /**
   * Create Bootstrap ADR with deployment plan and architecture diagrams
   */
  private async createBootstrapAdr(plan: DynamicDeploymentPlan): Promise<string> {
    try {
      const adrContent = `# Bootstrap Deployment Plan

## Status
PROPOSED - Awaiting human approval

## Context
This ADR documents the automated deployment plan generated for this project.

**Detected Platforms**: ${plan.detectedPlatforms.join(', ')}
**Recommended Platform**: ${plan.recommendedPlatform}
**Confidence**: ${(plan.confidence * 100).toFixed(1)}%
**Source**: ${plan.source}
**Generated**: ${plan.timestamp}

## Architecture Diagram

${plan.architectureDiagram}

## Required Files

${plan.requiredFiles
  .map(
    f => `
### ${f.path}
- **Purpose**: ${f.purpose}
- **Required**: ${f.required ? 'Yes' : 'No'}
- **Secret**: ${f.isSecret ? 'Yes' : 'No'}
- **Can Auto-Generate**: ${f.canAutoGenerate ? 'Yes' : 'No'}
- **Best Practice**: ${f.currentBestPractice}
${f.validationCommand ? `- **Validation**: \`${f.validationCommand}\`` : ''}
`
  )
  .join('\n')}

## Environment Variables

${plan.environmentVariables
  .map(
    e => `
- **${e.name}** (${e.required ? 'Required' : 'Optional'})${e.isSecret ? ' 🔒' : ''}
  - ${e.purpose}
  ${e.defaultValue ? `- Default: \`${e.defaultValue}\`` : ''}
`
  )
  .join('\n')}

## Deployment Steps

${plan.deploymentSteps
  .map(
    s => `
### Step ${s.order}: ${s.title}
**Command**: \`${s.command}\`
**Description**: ${s.description}
**Expected Output**: ${s.expectedOutput}
**Estimated Time**: ${s.estimatedTime}

**Troubleshooting**:
${s.troubleshooting.map(t => `- ${t}`).join('\n')}
`
  )
  .join('\n')}

## Validation Checks

${plan.validationChecks
  .map(
    c => `
- **${c.name}** (${c.severity})
  - Command: \`${c.command}\`
  - Expected: ${c.expectedResult}
`
  )
  .join('\n')}

## Risks

${plan.risks
  .map(
    r => `
### ${r.risk} (${r.severity})
- **Likelihood**: ${r.likelihood}
- **Mitigation**: ${r.mitigation}
`
  )
  .join('\n')}

## Prerequisites

${plan.prerequisites.map(p => `- ${p}`).join('\n')}

## Estimated Duration
${plan.estimatedDuration}

## Research Sources

${plan.researchSources.map(s => `- ${s}`).join('\n')}

## Decision

**Status**: ⏸️ **AWAITING HUMAN APPROVAL**

Please review this deployment plan and:
1. Verify the recommended platform is appropriate
2. Check that all required files are identified
3. Review security considerations (environment variables, secrets)
4. Validate deployment steps make sense for your environment
5. Approve or provide feedback for modifications

## Consequences

### Positive
- Automated deployment infrastructure
- Environment-aware configuration
- Validated deployment process

### Negative
- Initial setup overhead
- Platform-specific complexity
- Maintenance requirements

---
*This ADR was auto-generated by the Bootstrap Validation Loop system using AI-powered deployment intelligence.*
`;

      const adrPath = path.join(this.adrDirectory, `bootstrap-deployment-${Date.now()}.md`);

      await fs.writeFile(adrPath, adrContent, 'utf-8');

      return adrPath;
    } catch (error) {
      this.logger.error(
        'Failed to create bootstrap ADR',
        'BootstrapValidationLoop',
        error as Error
      );
      throw error;
    }
  }

  /**
   * Generate bootstrap scripts from current ADRs
   */
  private async generateBootstrapScripts(): Promise<boolean> {
    try {
      this.logger.info('Generating bootstrap scripts from ADRs', 'BootstrapValidationLoop');

      const result = await generateAdrBootstrapScripts({
        projectPath: this.projectPath,
        adrDirectory: this.adrDirectory,
        outputPath: this.projectPath,
        scriptType: 'both',
        includeTests: true,
        includeDeployment: true,
        enableTreeSitterAnalysis: true,
      });

      // Extract scripts from result
      const response = JSON.parse(result.content[0].text);

      // Write bootstrap.sh
      const bootstrapPath = path.join(this.projectPath, 'bootstrap.sh');
      await fs.writeFile(bootstrapPath, response.scripts.bootstrap, { mode: 0o755 });

      // Write validate_bootstrap.sh
      const validationPath = path.join(this.projectPath, 'validate_bootstrap.sh');
      await fs.writeFile(validationPath, response.scripts.validation, { mode: 0o755 });

      this.logger.info('Bootstrap scripts generated successfully', 'BootstrapValidationLoop', {
        bootstrapPath,
        validationPath,
      });

      return true;
    } catch (error) {
      this.logger.error(
        'Failed to generate bootstrap scripts',
        'BootstrapValidationLoop',
        error as Error
      );
      return false;
    }
  }

  /**
   * Execute bootstrap.sh with environment monitoring
   */
  private async executeBootstrapWithMonitoring(
    targetEnvironment: string,
    captureSnapshot: boolean
  ): Promise<BootstrapExecutionResult> {
    const executionId = `bootstrap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    const startTime = Date.now();

    this.logger.info('Executing bootstrap.sh with monitoring', 'BootstrapValidationLoop', {
      executionId,
      targetEnvironment,
    });

    let environmentSnapshot = {};

    // Capture pre-execution environment snapshot
    if (captureSnapshot) {
      environmentSnapshot = await this.captureEnvironmentSnapshot();
    }

    // Execute bootstrap.sh
    const bootstrapPath = path.join(this.projectPath, 'bootstrap.sh');
    let exitCode = 0;
    let stdout = '';
    let stderr = '';

    try {
      const result = await execAsync(`bash "${bootstrapPath}"`, {
        cwd: this.projectPath,
        timeout: 300000, // 5 minute timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error: any) {
      exitCode = error.code || 1;
      stdout = error.stdout || '';
      stderr = error.stderr || error.message || '';
      this.logger.warn('Bootstrap execution failed', 'BootstrapValidationLoop', {
        exitCode,
        stderr: stderr.substring(0, 500),
      });
    }

    const duration = Date.now() - startTime;

    return {
      executionId,
      timestamp,
      success: exitCode === 0,
      duration,
      exitCode,
      stdout,
      stderr,
      environmentSnapshot,
      learnings: [], // Will be populated later
    };
  }

  /**
   * Execute validate_bootstrap.sh and analyze results
   */
  private async executeValidationScript(
    executionId: string
  ): Promise<{ allPassed: boolean; validationResults: ValidationResult[] }> {
    this.logger.info('Executing validate_bootstrap.sh', 'BootstrapValidationLoop', { executionId });

    const validationPath = path.join(this.projectPath, 'validate_bootstrap.sh');
    const validationResults: ValidationResult[] = [];
    let allPassed = true;

    try {
      const result = await execAsync(`bash "${validationPath}"`, {
        cwd: this.projectPath,
        timeout: 180000, // 3 minute timeout
      });

      // Parse validation output
      // This is a simplified parser - actual implementation would be more sophisticated
      const lines = result.stdout.split('\n');

      for (const line of lines) {
        if (line.includes('PASSED') || line.includes('FAILED')) {
          const passed = line.includes('PASSED');
          if (!passed) allPassed = false;

          validationResults.push({
            checkId: `validation_${validationResults.length}`,
            adrId: 'unknown', // Would be parsed from output
            requirement: line.trim(),
            passed,
            actualState: passed ? 'compliant' : 'non-compliant',
            expectedState: 'compliant',
            confidence: 0.9,
            evidence: [line],
          });
        }
      }
    } catch (error: any) {
      allPassed = false;
      this.logger.error('Validation script failed', 'BootstrapValidationLoop', error);

      // Record the failure
      validationResults.push({
        checkId: 'validation_execution',
        adrId: 'system',
        requirement: 'Execute validation script',
        passed: false,
        actualState: 'failed',
        expectedState: 'success',
        confidence: 1.0,
        evidence: [error.message],
      });
    }

    return { allPassed, validationResults };
  }

  /**
   * Extract learnings from execution results
   */
  private async extractLearnings(
    executionResult: BootstrapExecutionResult,
    validationResult: { allPassed: boolean; validationResults: ValidationResult[] }
  ): Promise<BootstrapLearning[]> {
    const learnings: BootstrapLearning[] = [];

    // Analyze failures
    for (const validation of validationResult.validationResults) {
      if (!validation.passed) {
        learnings.push({
          type: 'failure',
          category: 'infrastructure',
          description: `Validation failed: ${validation.requirement}`,
          adrReference: validation.adrId,
          severity: 'error',
          recommendation: await this.generateRecommendation(validation, executionResult),
          evidence: validation.evidence,
          environmentSpecific: true,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Analyze stderr for issues
    if (executionResult.stderr) {
      const errorLines = executionResult.stderr.split('\n').filter(line => line.trim());
      for (const errorLine of errorLines) {
        if (
          errorLine.toLowerCase().includes('error') ||
          errorLine.toLowerCase().includes('failed')
        ) {
          learnings.push({
            type: 'failure',
            category: 'configuration',
            description: errorLine.substring(0, 200),
            severity: 'error',
            recommendation: 'Review error message and adjust bootstrap script',
            evidence: [errorLine],
            environmentSpecific: true,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // Use ResearchOrchestrator to understand environment state
    try {
      const envCheck = await this.researchOrchestrator.answerResearchQuestion(
        'What is the current state of the deployment environment? List all running services.'
      );

      if (envCheck.confidence > 0.7) {
        learnings.push({
          type: 'success',
          category: 'infrastructure',
          description: `Environment state verified: ${envCheck.answer?.substring(0, 200)}`,
          severity: 'info',
          recommendation: 'Document current environment state in ADRs',
          evidence: [envCheck.answer || 'Environment check completed'],
          environmentSpecific: true,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.warn(
        'Failed to check environment state',
        'BootstrapValidationLoop',
        error as Error
      );
    }

    return learnings;
  }

  /**
   * Generate recommendation for a failed validation
   */
  private async generateRecommendation(
    validation: ValidationResult,
    _executionResult: BootstrapExecutionResult
  ): Promise<string> {
    // Use ResearchOrchestrator to generate context-aware recommendation
    try {
      const question = `How can we fix this deployment issue: ${validation.requirement}?
        Current state: ${validation.actualState}
        Expected state: ${validation.expectedState}
        Evidence: ${validation.evidence.join(', ')}`;

      const answer = await this.researchOrchestrator.answerResearchQuestion(question);

      if (answer.confidence > 0.6 && answer.answer) {
        return answer.answer.substring(0, 500);
      }
    } catch (error) {
      this.logger.warn(
        'Failed to generate AI recommendation',
        'BootstrapValidationLoop',
        error as Error
      );
    }

    return 'Review validation failure and adjust bootstrap script accordingly';
  }

  /**
   * Update bootstrap scripts based on learnings
   */
  private async updateBootstrapScriptsFromLearnings(
    learnings: BootstrapLearning[],
    _executionResult: BootstrapExecutionResult
  ): Promise<boolean> {
    try {
      const bootstrapPath = path.join(this.projectPath, 'bootstrap.sh');
      let bootstrapContent = await fs.readFile(bootstrapPath, 'utf-8');

      // Apply fixes based on learnings
      for (const learning of learnings) {
        if (learning.type === 'failure' && learning.category === 'infrastructure') {
          // Add prerequisite checks
          if (learning.description.toLowerCase().includes('postgres')) {
            const postgresCheck = `
# Auto-fix: Added PostgreSQL startup check
if ! pgrep -x "postgres" > /dev/null; then
    echo "Starting PostgreSQL..."
    systemctl start postgresql || brew services start postgresql
    sleep 3
fi
`;
            bootstrapContent = bootstrapContent.replace(
              '# Phase 2: Build and Prepare',
              postgresCheck + '\n# Phase 2: Build and Prepare'
            );
          }

          // Add Docker checks
          if (learning.description.toLowerCase().includes('docker')) {
            const dockerCheck = `
# Auto-fix: Added Docker check
if ! docker ps > /dev/null 2>&1; then
    echo "Docker is not running. Please start Docker and retry."
    exit 1
fi
`;
            bootstrapContent = dockerCheck + '\n' + bootstrapContent;
          }
        }
      }

      // Write updated script
      await fs.writeFile(bootstrapPath, bootstrapContent, { mode: 0o755 });

      this.logger.info('Bootstrap script updated with auto-fixes', 'BootstrapValidationLoop', {
        fixesApplied: learnings.filter(l => l.type === 'failure').length,
      });

      return true;
    } catch (error) {
      this.logger.error(
        'Failed to update bootstrap scripts',
        'BootstrapValidationLoop',
        error as Error
      );
      return false;
    }
  }

  /**
   * Generate ADR update proposals based on learnings
   */
  private async generateAdrUpdates(
    learnings: BootstrapLearning[],
    outcome: 'success' | 'failure'
  ): Promise<AdrUpdateProposal[]> {
    const proposals: AdrUpdateProposal[] = [];
    const { discoverAdrsInDirectory } = await import('../utils/adr-discovery.js');
    const adrs = await discoverAdrsInDirectory(this.adrDirectory, true, this.projectPath);

    for (const adr of adrs.adrs) {
      // Find learnings related to this ADR
      const relatedLearnings = learnings.filter(
        l =>
          l.adrReference === adr.filename || adr.content?.includes(l.description.substring(0, 50))
      );

      if (relatedLearnings.length === 0) continue;

      // Generate update content
      const updateContent = this.generateDeploymentExperienceSection(relatedLearnings, outcome);

      proposals.push({
        adrPath: path.join(this.adrDirectory, adr.filename || 'unknown.md'),
        adrTitle: adr.title || 'Unknown ADR',
        updateType: 'append',
        sectionToUpdate: 'Deployment Experience',
        proposedContent: updateContent,
        learnings: relatedLearnings,
        confidence: 0.85,
        requiresReview:
          outcome === 'failure' && relatedLearnings.some(l => l.severity === 'critical'),
      });
    }

    return proposals;
  }

  /**
   * Generate deployment experience section content
   */
  private generateDeploymentExperienceSection(
    learnings: BootstrapLearning[],
    outcome: 'success' | 'failure'
  ): string {
    const timestamp = new Date().toISOString().split('T')[0];

    let content = `\n## Deployment Experience\n\n`;
    content += `**Last Updated**: ${timestamp}\n`;
    content += `**Deployment Outcome**: ${outcome === 'success' ? '✅ Successful' : '⚠️ Issues Encountered'}\n\n`;

    // Group learnings by category
    const byCategory: Record<string, BootstrapLearning[]> = {};
    for (const learning of learnings) {
      if (!byCategory[learning.category]) {
        byCategory[learning.category] = [];
      }
      byCategory[learning.category]!.push(learning);
    }

    for (const [category, categoryLearnings] of Object.entries(byCategory)) {
      content += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;

      for (const learning of categoryLearnings) {
        const icon = learning.type === 'success' ? '✅' : learning.type === 'failure' ? '❌' : 'ℹ️';
        content += `${icon} **${learning.description}**\n`;
        content += `   - Severity: ${learning.severity}\n`;
        content += `   - Recommendation: ${learning.recommendation}\n`;
        if (learning.environmentSpecific) {
          content += `   - *Environment-specific consideration*\n`;
        }
        content += `\n`;
      }
    }

    return content;
  }

  /**
   * Detect missing files that might break bootstrap
   */
  private async detectMissingFiles(): Promise<MissingFileInfo[]> {
    const missingFiles: MissingFileInfo[] = [];

    try {
      // Parse .gitignore patterns
      const gitignorePatterns = await this.parseGitignore();

      // Extract file references from ADRs
      const { discoverAdrsInDirectory } = await import('../utils/adr-discovery.js');
      const adrs = await discoverAdrsInDirectory(this.adrDirectory, true, this.projectPath);

      const fileReferences = await this.extractFileReferencesFromAdrs(adrs.adrs);

      // Check each referenced file
      for (const [filePath, referencedBy] of fileReferences.entries()) {
        const fullPath = path.join(this.projectPath, filePath);

        try {
          await fs.access(fullPath);
          // File exists, continue
        } catch {
          // File is missing
          const isIgnored = this.isFileIgnored(filePath, gitignorePatterns);
          const fileInfo = this.analyzeMissingFile(filePath, referencedBy, isIgnored);

          missingFiles.push(fileInfo);
        }
      }

      // Check for common missing files
      const commonFiles = [
        { path: '.env', type: 'env' as const, critical: true },
        { path: '.env.example', type: 'env' as const, critical: false },
        { path: 'config/database.yml', type: 'config' as const, critical: true },
        { path: 'config/secrets.yml', type: 'secret' as const, critical: true },
        { path: '.npmrc', type: 'config' as const, critical: false },
        { path: 'tsconfig.json', type: 'build' as const, critical: false },
      ];

      for (const common of commonFiles) {
        const fullPath = path.join(this.projectPath, common.path);

        try {
          await fs.access(fullPath);
        } catch {
          const isIgnored = this.isFileIgnored(common.path, gitignorePatterns);

          if (isIgnored || common.critical) {
            missingFiles.push({
              filePath: common.path,
              fileType: common.type,
              isIgnored,
              requiredBy: ['bootstrap-process'],
              severity: common.critical ? 'critical' : 'warning',
              canCreateTemplate: true,
              templateContent: this.generateTemplateContent(common.path, common.type),
              recommendation: isIgnored
                ? `Create ${common.path} from template (file is gitignored)`
                : `Consider creating ${common.path} for better configuration`,
            });
          }
        }
      }
    } catch (error) {
      this.logger.warn('Failed to detect missing files', 'BootstrapValidationLoop', error as Error);
    }

    return missingFiles;
  }

  /**
   * Parse .gitignore file patterns
   */
  private async parseGitignore(): Promise<string[]> {
    const gitignorePath = path.join(this.projectPath, '.gitignore');
    const patterns: string[] = [];

    try {
      const content = await fs.readFile(gitignorePath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        // Skip comments and empty lines
        if (trimmed && !trimmed.startsWith('#')) {
          patterns.push(trimmed);
        }
      }
    } catch {
      // .gitignore doesn't exist or can't be read
      this.logger.info('No .gitignore file found', 'BootstrapValidationLoop');
    }

    return patterns;
  }

  /**
   * Check if a file path matches gitignore patterns
   */
  private isFileIgnored(filePath: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      // Simple pattern matching (could be enhanced with minimatch)
      if (pattern.includes('*')) {
        // Wildcard pattern
        const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
        if (regex.test(filePath)) return true;
      } else {
        // Exact match or directory match
        if (filePath === pattern || filePath.startsWith(pattern + '/')) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Extract file references from ADR content
   */
  private async extractFileReferencesFromAdrs(adrs: any[]): Promise<Map<string, string[]>> {
    const references = new Map<string, string[]>();

    // Common file path patterns
    const filePatterns = [
      /(?:config|src|lib|dist)\/[a-zA-Z0-9_\-/.]+\.[a-zA-Z0-9]+/g,
      /\.[a-zA-Z0-9_-]+(?:\.example)?\.(?:json|yml|yaml|env|conf|config)/g,
      /`([^`]+\.[a-zA-Z0-9]+)`/g, // Files in backticks
    ];

    for (const adr of adrs) {
      if (!adr.content) continue;

      for (const pattern of filePatterns) {
        const matches = adr.content.matchAll(pattern);

        for (const match of matches) {
          const filePath = match[1] || match[0];

          if (!references.has(filePath)) {
            references.set(filePath, []);
          }
          references.get(filePath)!.push(adr.title || adr.filename || 'Unknown ADR');
        }
      }
    }

    return references;
  }

  /**
   * Analyze a missing file and provide recommendations
   */
  private analyzeMissingFile(
    filePath: string,
    referencedBy: string[],
    isIgnored: boolean
  ): MissingFileInfo {
    const ext = path.extname(filePath).toLowerCase();
    let fileType: MissingFileInfo['fileType'] = 'unknown';
    let severity: MissingFileInfo['severity'] = 'warning';
    let canCreateTemplate = false;

    // Determine file type and severity
    if (filePath.includes('.env') || ext === '.env') {
      fileType = 'env';
      severity = isIgnored ? 'critical' : 'error';
      canCreateTemplate = true;
    } else if (['.json', '.yml', '.yaml', '.conf'].includes(ext)) {
      fileType = 'config';
      severity = 'error';
      canCreateTemplate = true;
    } else if (
      ['tsconfig.json', 'webpack.config.js', 'vite.config.ts'].includes(path.basename(filePath))
    ) {
      fileType = 'build';
      severity = 'warning';
      canCreateTemplate = true;
    } else if (filePath.includes('secret') || filePath.includes('credential')) {
      fileType = 'secret';
      severity = 'critical';
      canCreateTemplate = false; // Never create secrets automatically
    }

    const templateContent = canCreateTemplate
      ? this.generateTemplateContent(filePath, fileType)
      : undefined;

    return {
      filePath,
      fileType,
      isIgnored,
      requiredBy: referencedBy,
      severity,
      canCreateTemplate,
      templateContent,
      recommendation: this.generateMissingFileRecommendation(
        filePath,
        fileType,
        isIgnored,
        referencedBy
      ),
    };
  }

  /**
   * Generate template content for missing files
   */
  private generateTemplateContent(filePath: string, _fileType: string): string {
    const fileName = path.basename(filePath);

    if (fileName === '.env' || fileName === '.env.example') {
      return `# Environment Configuration
# Generated by Bootstrap Validation Loop
# IMPORTANT: Update these values before deployment

# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://localhost:5432/myapp
DATABASE_POOL_SIZE=10

# Security
JWT_SECRET=CHANGE_ME_IN_PRODUCTION
SESSION_SECRET=CHANGE_ME_IN_PRODUCTION

# External Services
API_KEY=your_api_key_here

# Logging
LOG_LEVEL=info
`;
    }

    if (fileName.endsWith('.json')) {
      return `{
  "// NOTE": "Generated template - customize for your project",
  "name": "project-config",
  "version": "1.0.0",
  "description": "Generated configuration file"
}
`;
    }

    if (fileName.endsWith('.yml') || fileName.endsWith('.yaml')) {
      return `# Generated template - customize for your project
# YAML Configuration

default:
  setting: value
  enabled: false

development:
  debug: true

production:
  debug: false
`;
    }

    return `# Generated template for ${fileName}
# Please customize this file for your project
`;
  }

  /**
   * Generate recommendation for missing file
   */
  private generateMissingFileRecommendation(
    filePath: string,
    fileType: string,
    isIgnored: boolean,
    referencedBy: string[]
  ): string {
    let recommendation = `Missing file: ${filePath}\n`;
    recommendation += `Referenced by: ${referencedBy.join(', ')}\n`;

    if (isIgnored) {
      recommendation += `⚠️ File is gitignored - this is intentional for security\n`;
    }

    switch (fileType) {
      case 'env':
        recommendation += isIgnored
          ? `ACTION: Create ${filePath} from template or .env.example\n`
          : `ACTION: Add ${filePath} to .gitignore and create from template\n`;
        break;
      case 'secret':
        recommendation += `⛔ CRITICAL: Never commit secrets to version control\n`;
        recommendation += `ACTION: Create ${filePath} manually with secure values\n`;
        break;
      case 'config':
        recommendation += `ACTION: Create configuration file from template\n`;
        break;
      case 'build':
        recommendation += `ACTION: Generate build configuration or copy from similar project\n`;
        break;
      default:
        recommendation += `ACTION: Create file or update ADRs to remove reference\n`;
    }

    return recommendation;
  }

  /**
   * Handle missing files - create templates or add to bootstrap prerequisites
   */
  private async handleMissingFiles(missingFiles: MissingFileInfo[]): Promise<BootstrapLearning[]> {
    const learnings: BootstrapLearning[] = [];

    for (const missing of missingFiles) {
      // Create template files if safe to do so
      if (missing.canCreateTemplate && missing.templateContent && missing.fileType !== 'secret') {
        try {
          const fullPath = path.join(this.projectPath, missing.filePath);
          const dir = path.dirname(fullPath);

          // Ensure directory exists
          await fs.mkdir(dir, { recursive: true });

          // Create template file
          await fs.writeFile(fullPath, missing.templateContent, 'utf-8');

          learnings.push({
            type: 'success',
            category: 'configuration',
            description: `Created template file: ${missing.filePath}`,
            severity: 'info',
            recommendation: `Review and customize ${missing.filePath} before deployment`,
            evidence: [`File created with template content`],
            environmentSpecific: false,
            timestamp: new Date().toISOString(),
          });

          this.logger.info(`Created template file: ${missing.filePath}`, 'BootstrapValidationLoop');
        } catch (error) {
          learnings.push({
            type: 'failure',
            category: 'configuration',
            description: `Failed to create template: ${missing.filePath}`,
            severity: missing.severity,
            recommendation: missing.recommendation,
            evidence: [(error as Error).message],
            environmentSpecific: true,
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        // File cannot be auto-created, add as prerequisite
        learnings.push({
          type: 'prerequisite',
          category: missing.fileType === 'secret' ? 'security' : 'configuration',
          description: `Missing required file: ${missing.filePath}`,
          severity: missing.severity,
          recommendation: missing.recommendation,
          evidence: missing.requiredBy,
          environmentSpecific: missing.isIgnored,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return learnings;
  }

  /**
   * Capture environment snapshot
   */
  private async captureEnvironmentSnapshot(): Promise<any> {
    const snapshot: any = {};

    try {
      // Docker check
      try {
        const docker = await execAsync('docker ps --format "{{json .}}"', { timeout: 5000 });
        snapshot.docker = {
          available: true,
          containers: docker.stdout.split('\n').filter(Boolean),
        };
      } catch {
        snapshot.docker = { available: false };
      }

      // Kubernetes check
      try {
        const k8s = await execAsync('kubectl get all --all-namespaces -o json', { timeout: 10000 });
        snapshot.kubernetes = { available: true, resources: JSON.parse(k8s.stdout) };
      } catch {
        snapshot.kubernetes = { available: false };
      }

      // OpenShift check
      try {
        const oc = await execAsync('oc status', { timeout: 5000 });
        snapshot.openshift = { available: true, status: oc.stdout };
      } catch {
        snapshot.openshift = { available: false };
      }

      // System info
      snapshot.systemInfo = {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.warn(
        'Failed to capture complete environment snapshot',
        'BootstrapValidationLoop',
        error as Error
      );
    }

    return snapshot;
  }

  /**
   * Store execution result in memory system
   */
  private async storeExecutionInMemory(result: BootstrapExecutionResult): Promise<void> {
    try {
      await this.memoryManager.upsertEntity({
        type: 'bootstrap_execution' as any,
        title: `Bootstrap Execution ${result.executionId} - ${result.success ? 'Success' : 'Failed'}`,
        description: `Bootstrap execution on ${result.timestamp} with ${result.learnings.length} learnings captured`,
        tags: [
          'bootstrap',
          'deployment',
          result.success ? 'success' : 'failure',
          `iteration-${this.currentIteration}`,
          `learnings-${result.learnings.length}`,
          `execution-${result.executionId}`,
        ],
        relationships: [],
        context: {
          projectPhase: 'deployment',
          technicalStack: ['bootstrap', 'validation'],
          environmentalFactors: [result.success ? 'success' : 'failure'],
          stakeholders: ['deployment-team', 'infrastructure-team'],
        },
      });
    } catch (error) {
      this.logger.warn(
        'Failed to store execution in memory',
        'BootstrapValidationLoop',
        error as Error
      );
    }
  }
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
  validateAfterFix?: boolean;
  captureEnvironmentSnapshot?: boolean;
  updateAdrsWithLearnings?: boolean;
}): Promise<any> {
  const {
    projectPath = process.cwd(),
    adrDirectory = 'docs/adrs',
    targetEnvironment = 'development',
    maxIterations = 5,
    autoFix = true,
    validateAfterFix = true,
    captureEnvironmentSnapshot = true,
    updateAdrsWithLearnings = true,
  } = args;

  const loop = new BootstrapValidationLoop(projectPath, adrDirectory, maxIterations);
  await loop.initialize();

  const result = await loop.executeLoop({
    targetEnvironment,
    autoFix,
    validateAfterFix,
    captureEnvironmentSnapshot,
    updateAdrsWithLearnings,
  });

  // Generate response
  const response = `
# 🔄 Bootstrap Validation Loop - Complete

## Execution Summary
- **Status**: ${result.success ? '✅ Success' : '⚠️ Failed'}
- **Iterations**: ${result.iterations}/${maxIterations}
- **Duration**: ${result.finalResult.duration}ms
- **Learnings Captured**: ${result.finalResult.learnings.length}
- **ADR Updates Proposed**: ${result.adrUpdates.length}

## Final Execution Result

**Exit Code**: ${result.finalResult.exitCode}
**Validation Results**: ${result.finalResult.validationResults?.length || 0} checks

${
  result.finalResult.validationResults?.filter(v => !v.passed).length
    ? `
### Failed Validations
${result.finalResult.validationResults
  .filter(v => !v.passed)
  .map(v => `- ${v.requirement}`)
  .join('\n')}
`
    : ''
}

## Learnings Captured

${result.finalResult.learnings
  .slice(0, 10)
  .map(
    (l, i) => `
### ${i + 1}. ${l.type.toUpperCase()}: ${l.category}
- **Description**: ${l.description}
- **Severity**: ${l.severity}
- **Recommendation**: ${l.recommendation}
${l.environmentSpecific ? '- *Environment-specific*' : ''}
`
  )
  .join('\n')}

${result.finalResult.learnings.length > 10 ? `\n... and ${result.finalResult.learnings.length - 10} more learnings\n` : ''}

## ADR Update Proposals

${result.adrUpdates.length === 0 ? 'No ADR updates proposed.' : ''}
${result.adrUpdates
  .map(
    (update, i) => `
### ${i + 1}. ${update.adrTitle}
- **Update Type**: ${update.updateType}
- **Section**: ${update.sectionToUpdate}
- **Confidence**: ${(update.confidence * 100).toFixed(0)}%
- **Requires Review**: ${update.requiresReview ? 'Yes' : 'No'}
- **Related Learnings**: ${update.learnings.length}

**Proposed Content**:
\`\`\`markdown
${update.proposedContent.substring(0, 500)}${update.proposedContent.length > 500 ? '...' : ''}
\`\`\`
`
  )
  .join('\n')}

## Environment Snapshot

${JSON.stringify(result.finalResult.environmentSnapshot, null, 2).substring(0, 1000)}

## Next Steps

${
  result.success
    ? `
✅ **Bootstrap validation successful!**

1. Review ADR update proposals above
2. Apply ADR updates if they look correct
3. Commit updated ADRs to version control
4. Re-run bootstrap on other environments (staging, production)
`
    : `
⚠️ **Bootstrap validation failed after ${result.iterations} iterations**

1. Review failed validations above
2. Check learnings for specific issues
3. ${autoFix ? 'Auto-fix attempted but issues remain' : 'Enable auto-fix to attempt automatic resolution'}
4. Consider manual intervention for complex issues
5. Review ADR update proposals for documentation improvements
`
}

---

**Execution ID**: ${result.finalResult.executionId}
**Timestamp**: ${result.finalResult.timestamp}
`;

  return {
    content: [
      {
        type: 'text',
        text: response,
      },
    ],
    executionResult: result,
  };
}

export default bootstrapValidationLoop;
