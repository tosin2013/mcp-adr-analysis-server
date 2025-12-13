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
import { exec } from 'node:child_process';
import { promisify } from 'util';
import * as path from 'path';
import { createHash } from 'crypto';
import { McpAdrError } from '../types/index.js';
import { EnhancedLogger } from '../utils/enhanced-logging.js';
import { ResearchOrchestrator } from '../utils/research-orchestrator.js';
import { MemoryEntityManager } from '../utils/memory-entity-manager.js';
import {
  DynamicDeploymentIntelligence,
  DynamicDeploymentPlan,
} from '../utils/dynamic-deployment-intelligence.js';
import generateAdrBootstrapScripts from './adr-bootstrap-validation-tool.js';

// NEW: Validated Patterns Integration
import { detectPlatforms, PlatformDetectionResult } from '../utils/platform-detector.js';
import { getPattern, ValidatedPattern } from '../utils/validated-pattern-definitions.js';
import { generatePatternResearchReport } from '../utils/pattern-research-utility.js';

// NEW: Tool Context Documentation System
import { ToolContextManager, ToolContextDocument } from '../utils/context-document-manager.js';

// NEW: Hybrid DAG Architecture
import { DAGExecutor, DAGExecutionResult } from '../utils/dag-executor.js';
import { PatternToDAGConverter } from '../utils/pattern-to-dag-converter.js';
import { PatternContributionHelper } from '../utils/pattern-contribution-helper.js';
import { PatternLoader, DynamicPattern } from '../utils/pattern-loader.js';

// NEW: SystemCard for Resource Tracking
import { SystemCardManager } from '../utils/system-card-manager.js';

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

  // NEW: Validated Patterns fields
  private platformDetection: PlatformDetectionResult | null = null;
  private validatedPattern: ValidatedPattern | null = null;
  private patternResearchReport: string | null = null;

  // NEW: Tool Context Documentation
  private contextManager: ToolContextManager;

  // NEW: Hybrid DAG Architecture
  private dagExecutor: DAGExecutor;
  private patternLoader: PatternLoader;
  private patternConverter: PatternToDAGConverter;
  private contributionHelper: PatternContributionHelper;

  // NEW: SystemCard Resource Tracking
  private systemCardManager: SystemCardManager;

  constructor(projectPath: string, adrDirectory: string, maxIterations: number = 5) {
    this.logger = new EnhancedLogger();
    this.projectPath = projectPath;
    this.adrDirectory = adrDirectory;
    this.maxIterations = maxIterations;
    this.researchOrchestrator = new ResearchOrchestrator(projectPath, adrDirectory);
    this.memoryManager = new MemoryEntityManager();
    this.deploymentIntelligence = new DynamicDeploymentIntelligence(projectPath, adrDirectory);
    this.contextManager = new ToolContextManager(projectPath);

    // Initialize SystemCard for resource tracking (must be before DAGExecutor)
    this.systemCardManager = new SystemCardManager(projectPath);

    // Initialize DAG architecture components
    this.dagExecutor = new DAGExecutor(5, this.systemCardManager); // Max 5 parallel tasks, with resource tracking
    this.patternLoader = new PatternLoader();
    this.patternConverter = new PatternToDAGConverter();
    this.contributionHelper = new PatternContributionHelper();
  }

  /**
   * Initialize the validation loop
   */
  async initialize(): Promise<void> {
    await this.memoryManager.initialize();
    await this.contextManager.initialize();
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
    contextDocumentPath?: string;
    requiresHumanApproval: boolean;
  }> {
    const { targetEnvironment, autoFix, captureEnvironmentSnapshot, updateAdrsWithLearnings } =
      args;

    this.logger.info('Starting Bootstrap Validation Loop', 'BootstrapValidationLoop', {
      targetEnvironment,
      autoFix,
      maxIterations: this.maxIterations,
    });

    // STEP 0: Detect platform using Validated Patterns framework
    this.logger.info(
      '🔍 Detecting platform type using Validated Patterns...',
      'BootstrapValidationLoop'
    );
    this.platformDetection = await detectPlatforms(this.projectPath);

    this.logger.info(
      `📋 Platform detection complete (confidence: ${(this.platformDetection.confidence * 100).toFixed(0)}%)`,
      'BootstrapValidationLoop',
      {
        primaryPlatform: this.platformDetection.primaryPlatform,
        detectedPlatforms: this.platformDetection.detectedPlatforms.map(p => p.type),
        evidence: this.platformDetection.evidence.length,
      }
    );

    // STEP 0.1: Get validated pattern for detected platform
    if (this.platformDetection.primaryPlatform) {
      this.validatedPattern = getPattern(this.platformDetection.primaryPlatform);

      if (this.validatedPattern) {
        this.logger.info(
          `✅ Loaded validated pattern: ${this.validatedPattern.name}`,
          'BootstrapValidationLoop',
          {
            version: this.validatedPattern.version,
            lastUpdated: this.validatedPattern.metadata.lastUpdated,
            authoritativeSources: this.validatedPattern.authoritativeSources.length,
            requiredSources: this.validatedPattern.authoritativeSources.filter(
              s => s.requiredForDeployment
            ).length,
          }
        );

        // STEP 0.2: Generate research report for authoritative sources
        this.patternResearchReport = generatePatternResearchReport(
          this.platformDetection.primaryPlatform
        );

        this.logger.info(
          '📚 Generated research report with authoritative source instructions',
          'BootstrapValidationLoop'
        );
        this.logger.info(
          `⚠️  IMPORTANT: LLM should query ${this.validatedPattern.authoritativeSources.filter(s => s.requiredForDeployment).length} REQUIRED authoritative sources before deployment`,
          'BootstrapValidationLoop'
        );

        // Log the research report for LLM to see
        this.logger.info(
          '📖 Research Report:\n' + this.patternResearchReport,
          'BootstrapValidationLoop'
        );
      } else {
        this.logger.warn(
          `No validated pattern found for ${this.platformDetection.primaryPlatform}, falling back to dynamic intelligence`,
          'BootstrapValidationLoop'
        );
      }
    }

    // STEP 0.3: Generate AI-powered deployment plan (fallback or hybrid approach)
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

    // STEP 0.6: Save context document for future sessions
    const contextDocumentPath = await this.saveBootstrapContext(
      this.platformDetection!,
      this.validatedPattern,
      this.deploymentPlan,
      bootstrapAdrPath
    );

    this.logger.info(
      `📄 Context document saved: ${contextDocumentPath}`,
      'BootstrapValidationLoop'
    );
    this.logger.info(
      '⏸️  WAITING FOR HUMAN APPROVAL - Review the bootstrap ADR before proceeding',
      'BootstrapValidationLoop'
    );

    // ═══════════════════════════════════════════════════════════════════
    // INFRASTRUCTURE LAYER (Hybrid DAG Architecture)
    // ═══════════════════════════════════════════════════════════════════
    // Execute infrastructure DAG before application deployment iterations
    // This runs ONCE and sets up the platform infrastructure
    this.logger.info(
      '🏗️  Starting Infrastructure Layer (DAG-based execution)...',
      'BootstrapValidationLoop'
    );

    const infrastructureResult = await this.executeInfrastructureDAG(this.platformDetection!);

    if (!infrastructureResult.success) {
      const failedTasksList = infrastructureResult.failedTasks.join(', ');
      this.logger.error(
        `❌ Infrastructure Layer failed: ${infrastructureResult.failedTasks.length} tasks failed`,
        'BootstrapValidationLoop',
        undefined,
        {
          failedTasks: infrastructureResult.failedTasks,
          skippedTasks: infrastructureResult.skippedTasks,
        }
      );

      // Infrastructure failure is critical - cannot proceed to application layer
      throw new McpAdrError(
        `Infrastructure deployment failed. Failed tasks: ${failedTasksList}`,
        'INFRASTRUCTURE_DEPLOYMENT_ERROR'
      );
    }

    this.logger.info(
      `✅ Infrastructure Layer complete (${infrastructureResult.duration}ms)`,
      'BootstrapValidationLoop',
      {
        executedTasks: infrastructureResult.executedTasks.length,
        duration: infrastructureResult.duration,
      }
    );

    // ═══════════════════════════════════════════════════════════════════
    // APPLICATION LAYER (Phase-based iteration with auto-fix)
    // ═══════════════════════════════════════════════════════════════════
    this.logger.info(
      '🚀 Starting Application Layer (iterative deployment with auto-fix)...',
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

    // Ensure finalResult exists before proceeding
    if (!finalResult) {
      throw new McpAdrError(
        'No execution result available - bootstrap validation loop failed to execute',
        'EXECUTION_ERROR'
      );
    }

    const result = {
      success,
      iterations: this.currentIteration,
      finalResult,
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
      contextDocumentPath?: string;
      requiresHumanApproval: boolean;
    };

    // Only add optional properties if they have values
    if (this.deploymentPlan) {
      result.deploymentPlan = this.deploymentPlan;
    }
    if (bootstrapAdrPath) {
      result.bootstrapAdrPath = bootstrapAdrPath;
    }
    if (contextDocumentPath) {
      result.contextDocumentPath = contextDocumentPath;
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

      // Ensure ADR directory exists
      const adrDir = path.isAbsolute(this.adrDirectory)
        ? this.adrDirectory
        : path.join(this.projectPath, this.adrDirectory);

      await fs.mkdir(adrDir, { recursive: true });

      // Create absolute path for ADR file
      const adrPath = path.join(adrDir, `bootstrap-deployment-${Date.now()}.md`);

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
   * Save bootstrap context document for future sessions
   */
  private async saveBootstrapContext(
    platformDetection: PlatformDetectionResult,
    validatedPattern: ValidatedPattern | null,
    deploymentPlan: DynamicDeploymentPlan,
    bootstrapAdrPath: string
  ): Promise<string> {
    try {
      const contextDoc: ToolContextDocument = {
        metadata: {
          toolName: 'bootstrap_validation_loop',
          toolVersion: '1.0.0',
          generated: new Date().toISOString(),
          projectPath: this.projectPath,
          projectName: path.basename(this.projectPath),
          status: 'success',
          confidence: platformDetection.confidence * 100,
        },
        quickReference: `
Detected ${platformDetection.primaryPlatform} (${(platformDetection.confidence * 100).toFixed(0)}% confidence).
${validatedPattern ? `Using validated pattern: ${validatedPattern.name} v${validatedPattern.version}.` : 'Using dynamic AI analysis.'}
Bootstrap ADR: ${bootstrapAdrPath}
        `.trim(),
        executionSummary: {
          status: 'Platform detected and deployment plan generated',
          confidence: platformDetection.confidence * 100,
          keyFindings: [
            `Primary platform: ${platformDetection.primaryPlatform}`,
            validatedPattern
              ? `Validated pattern: ${validatedPattern.name}`
              : 'Dynamic AI deployment plan',
            `Required files: ${deploymentPlan.requiredFiles.length}`,
            `Deployment steps: ${deploymentPlan.deploymentSteps.length}`,
            `Environment variables: ${deploymentPlan.environmentVariables.length}`,
          ],
        },
        detectedContext: {
          platform: {
            primary: platformDetection.primaryPlatform,
            all: platformDetection.detectedPlatforms.map(p => p.type),
            confidence: platformDetection.confidence,
            evidence: platformDetection.evidence.slice(0, 10).map(e => ({
              file: e.file,
              indicator: e.indicator,
              weight: e.weight,
            })),
          },
          validatedPattern: validatedPattern
            ? {
                name: validatedPattern.name,
                version: validatedPattern.version,
                platformType: validatedPattern.platformType,
                source: 'typescript-builtin', // Could be enhanced to detect YAML vs TS
                sourceHash: this.computePatternHash(validatedPattern),
                loadedAt: new Date().toISOString(),
                baseRepository: validatedPattern.baseCodeRepository.url,
                authoritativeSources: validatedPattern.authoritativeSources.map(s => ({
                  type: s.type,
                  url: s.url,
                  required: s.requiredForDeployment,
                  purpose: s.purpose,
                })),
                deploymentPhases: validatedPattern.deploymentPhases.length,
                validationChecks: validatedPattern.validationChecks.length,
              }
            : null,
          deploymentPlan: {
            recommendedPlatform: deploymentPlan.recommendedPlatform,
            confidence: deploymentPlan.confidence,
            source: deploymentPlan.source,
            requiredFiles: deploymentPlan.requiredFiles.map(f => ({
              path: f.path,
              purpose: f.purpose,
              required: f.required,
            })),
            environmentVariables: deploymentPlan.environmentVariables.map(e => ({
              name: e.name,
              required: e.required,
              isSecret: e.isSecret,
            })),
            deploymentSteps: deploymentPlan.deploymentSteps.length,
            estimatedDuration: deploymentPlan.estimatedDuration,
          },
        },
        generatedArtifacts: [bootstrapAdrPath, 'bootstrap.sh', 'validate_bootstrap.sh'],
        keyDecisions: [
          {
            decision: `Use ${platformDetection.primaryPlatform} as deployment platform`,
            rationale: `Detected with ${(platformDetection.confidence * 100).toFixed(0)}% confidence based on project structure and configuration files`,
            alternatives: platformDetection.detectedPlatforms
              .filter(p => p.type !== platformDetection.primaryPlatform)
              .map(p => `${p.type} (${(p.confidence * 100).toFixed(0)}% confidence)`)
              .slice(0, 3),
          },
        ],
        learnings: {
          successes: ['Platform detection completed successfully'],
          failures: [],
          recommendations: [
            'Review bootstrap ADR before proceeding with deployment',
            validatedPattern
              ? `Consult authoritative sources for ${validatedPattern.name}`
              : 'Validate deployment plan with team',
          ],
          environmentSpecific: [],
        },
        relatedDocuments: {
          adrs: [bootstrapAdrPath],
          configs: deploymentPlan.requiredFiles.map(f => f.path),
          otherContexts: [],
        },
        rawData: {
          // Full validated pattern snapshot for reproducibility
          validatedPatternSnapshot: validatedPattern
            ? {
                source: 'typescript-builtin', // Could be enhanced to detect YAML vs TS
                hash: this.computePatternHash(validatedPattern),
                timestamp: new Date().toISOString(),
                definition: validatedPattern, // FULL pattern object with all commands, checks, templates
              }
            : null,
          // Deployment plan details
          deploymentPlan: {
            recommendedPlatform: deploymentPlan.recommendedPlatform,
            confidence: deploymentPlan.confidence,
            source: deploymentPlan.source,
            requiredFiles: deploymentPlan.requiredFiles,
            environmentVariables: deploymentPlan.environmentVariables,
            deploymentSteps: deploymentPlan.deploymentSteps,
            estimatedDuration: deploymentPlan.estimatedDuration,
          },
        },
      };

      // Add validated pattern details if available
      if (validatedPattern) {
        contextDoc.keyDecisions!.push({
          decision: `Use ${validatedPattern.name} validated pattern`,
          rationale: `Best practice pattern for ${platformDetection.primaryPlatform} deployments. Provides proven deployment workflow and authoritative sources.`,
          alternatives: ['Custom deployment plan', 'Dynamic AI-generated plan'],
        });
      }

      const contextPath = await this.contextManager.saveContext('bootstrap', contextDoc);
      return contextPath;
    } catch (error) {
      this.logger.error(
        'Failed to save bootstrap context',
        'BootstrapValidationLoop',
        error as Error
      );
      throw error;
    }
  }

  /**
   * Generate bootstrap scripts from validated pattern (NEW)
   */
  private async generateBootstrapScriptsFromPattern(): Promise<boolean> {
    if (!this.validatedPattern) {
      return false;
    }

    try {
      this.logger.info(
        `Generating bootstrap scripts from validated pattern: ${this.validatedPattern.name}`,
        'BootstrapValidationLoop'
      );

      // Generate bootstrap.sh from pattern's deployment phases
      let bootstrapScript = `#!/bin/bash
# Bootstrap script generated from ${this.validatedPattern.name} v${this.validatedPattern.version}
# Pattern source: ${this.validatedPattern.metadata.source}
# Last updated: ${this.validatedPattern.metadata.lastUpdated}
# Generated: ${new Date().toISOString()}

set -e  # Exit on error
set -u  # Exit on undefined variable

echo "========================================"
echo "Bootstrap Deployment - ${this.validatedPattern.platformType}"
echo "Pattern: ${this.validatedPattern.name}"
echo "========================================"
echo ""

`;

      // Add each deployment phase
      for (const phase of this.validatedPattern.deploymentPhases) {
        bootstrapScript += `
# ============================================================================
# Phase ${phase.order}: ${phase.name}
# ${phase.description}
# Estimated duration: ${phase.estimatedDuration}
# ============================================================================

echo "Starting Phase ${phase.order}: ${phase.name}"

`;

        // Add commands for this phase
        for (const command of phase.commands) {
          bootstrapScript += `# ${command.description}\n`;
          bootstrapScript += `echo "  → ${command.description}"\n`;
          bootstrapScript += `${command.command}\n\n`;
        }

        bootstrapScript += `echo "✓ Phase ${phase.order} complete"\necho ""\n`;
      }

      bootstrapScript += `
echo "========================================"
echo "✅ Bootstrap deployment complete!"
echo "========================================"
`;

      // Generate validate_bootstrap.sh from pattern's validation checks
      let validationScript = `#!/bin/bash
# Validation script generated from ${this.validatedPattern.name}
# Generated: ${new Date().toISOString()}

set -e

echo "========================================"
echo "Bootstrap Validation"
echo "========================================"
echo ""

FAILED_CHECKS=0

`;

      for (const check of this.validatedPattern.validationChecks) {
        validationScript += `
# ${check.name} (${check.severity})
echo "Checking: ${check.name}"
if ${check.command}; then
  echo "  ✅ PASSED: ${check.name}"
else
  echo "  ❌ FAILED: ${check.name}"
  echo "     ${check.failureMessage}"
  echo "     Remediation steps:"
${check.remediationSteps.map(step => `  echo "       - ${step}"`).join('\n')}
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
echo ""

`;
      }

      validationScript += `
if [ $FAILED_CHECKS -eq 0 ]; then
  echo "========================================"
  echo "✅ All validation checks passed!"
  echo "========================================"
  exit 0
else
  echo "========================================"
  echo "❌ $FAILED_CHECKS validation check(s) failed"
  echo "========================================"
  exit 1
fi
`;

      // Write scripts
      const bootstrapPath = path.join(this.projectPath, 'bootstrap.sh');
      await fs.writeFile(bootstrapPath, bootstrapScript, { mode: 0o755 });

      const validationPath = path.join(this.projectPath, 'validate_bootstrap.sh');
      await fs.writeFile(validationPath, validationScript, { mode: 0o755 });

      this.logger.info(
        'Bootstrap scripts generated from validated pattern',
        'BootstrapValidationLoop',
        {
          bootstrapPath,
          validationPath,
          phases: this.validatedPattern.deploymentPhases.length,
          validationChecks: this.validatedPattern.validationChecks.length,
        }
      );

      return true;
    } catch (error) {
      this.logger.error(
        'Failed to generate scripts from validated pattern',
        'BootstrapValidationLoop',
        error as Error
      );
      return false;
    }
  }

  /**
   * Generate bootstrap scripts from current ADRs (FALLBACK)
   */
  private async generateBootstrapScripts(): Promise<boolean> {
    // NEW: Try validated pattern first if available
    if (this.validatedPattern) {
      this.logger.info(
        '🎯 Using validated pattern to generate bootstrap scripts',
        'BootstrapValidationLoop'
      );
      const patternSuccess = await this.generateBootstrapScriptsFromPattern();
      if (patternSuccess) {
        return true;
      }
      this.logger.warn(
        'Failed to generate from validated pattern, falling back to ADR-based generation',
        'BootstrapValidationLoop'
      );
    }

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

      // Validate result structure
      if (!result?.content?.[0]?.text) {
        throw new McpAdrError(
          'Invalid response from bootstrap script generator - missing content',
          'INVALID_RESPONSE'
        );
      }

      // Extract and validate scripts from result
      let response: any;
      try {
        response = JSON.parse(result.content[0].text);
      } catch (parseError) {
        this.logger.error(
          'Failed to parse bootstrap script response as JSON',
          'BootstrapValidationLoop',
          parseError as Error
        );
        throw new McpAdrError('Malformed JSON response from script generator', 'PARSE_ERROR');
      }

      // Validate response structure and required properties
      if (!response?.scripts) {
        throw new McpAdrError(
          'Invalid response structure - missing scripts property',
          'INVALID_RESPONSE'
        );
      }

      if (typeof response.scripts.bootstrap !== 'string' || !response.scripts.bootstrap.trim()) {
        throw new McpAdrError('Invalid or empty bootstrap script in response', 'INVALID_SCRIPT');
      }

      if (typeof response.scripts.validation !== 'string' || !response.scripts.validation.trim()) {
        throw new McpAdrError('Invalid or empty validation script in response', 'INVALID_SCRIPT');
      }

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
    const executionId = `bootstrap_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
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
    const adrs = await discoverAdrsInDirectory(this.adrDirectory, this.projectPath, {
      includeContent: true,
      includeTimeline: false,
    });

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
      const adrs = await discoverAdrsInDirectory(this.adrDirectory, this.projectPath, {
        includeContent: true,
        includeTimeline: false,
      });

      const fileReferences = await this.extractFileReferencesFromAdrs(adrs.adrs);

      // Check each referenced file
      for (const [filePath, referencedBy] of fileReferences.entries()) {
        const fullPath = path.join(this.projectPath, filePath);

        try {
          await fs.access(fullPath);
          // File exists, continue
        } catch (error: any) {
          // Only treat as missing if it's a "file not found" error
          // Other errors (permissions, etc.) should be logged but not treated as missing
          if (error.code === 'ENOENT') {
            const isIgnored = this.isFileIgnored(filePath, gitignorePatterns);
            const fileInfo = this.analyzeMissingFile(filePath, referencedBy, isIgnored);
            missingFiles.push(fileInfo);
          } else {
            this.logger.warn(
              `Error accessing file ${filePath}: ${error.message}`,
              'BootstrapValidationLoop'
            );
          }
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
        } catch (error: any) {
          // Only treat as missing if it's a "file not found" error
          if (error.code === 'ENOENT') {
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
          } else {
            this.logger.warn(
              `Error accessing common file ${common.path}: ${error.message}`,
              'BootstrapValidationLoop'
            );
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

  /**
   * Compute SHA-256 hash of validated pattern for change detection
   * @param pattern - Validated pattern to hash
   * @returns Hex-encoded SHA-256 hash
   */
  /**
   * Execute Infrastructure Layer using DAG with validated pattern
   *
   * This method:
   * 1. Attempts to load validated pattern from YAML
   * 2. If pattern exists: Auto-generates DAG tasks from pattern definition
   * 3. If pattern doesn't exist: Works with user to create GitHub issue
   * 4. Executes infrastructure DAG with parallel execution where possible
   */
  async executeInfrastructureDAG(
    platformDetection: PlatformDetectionResult
  ): Promise<DAGExecutionResult> {
    const platform = platformDetection.primaryPlatform || 'unknown';

    this.logger.info(
      `🏗️  Starting Infrastructure Layer DAG execution for ${platform}`,
      'BootstrapValidationLoop'
    );

    // Try to load validated pattern from YAML
    let dynamicPattern = await this.patternLoader.loadPattern(platform);

    // If no pattern exists, work with user to create GitHub issue
    if (!dynamicPattern) {
      this.logger.warn(
        `⚠️  No validated pattern found for platform: ${platform}`,
        'BootstrapValidationLoop'
      );

      // Prompt user for contribution
      const prompt = this.contributionHelper.promptUserForContribution(platform, platformDetection);

      this.logger.info(prompt, 'BootstrapValidationLoop');

      // Create GitHub issue (in production, this would use GitHub API)
      const issueResult = await this.contributionHelper.createGitHubIssue(
        platform,
        platformDetection
      );

      const successMessage = this.contributionHelper.generateSuccessMessage(issueResult, platform);

      this.logger.info(successMessage, 'BootstrapValidationLoop');

      // Fall back to AI-generated pattern
      this.logger.info('🤖 Generating fallback pattern using AI...', 'BootstrapValidationLoop');

      dynamicPattern = await this.generateFallbackPattern(platformDetection);
    }

    // Auto-generate infrastructure DAG tasks from validated pattern
    const tasks = this.patternConverter.buildInfrastructureTasksFromPattern(
      dynamicPattern,
      platform
    );

    this.logger.info(
      `📊 Generated ${tasks.length} infrastructure DAG tasks`,
      'BootstrapValidationLoop'
    );

    // Initialize SystemCard before execution
    const bootstrapId = `${platform}-bootstrap-${Date.now()}`;
    const detectedPlatform = platformDetection.detectedPlatforms.find(p => p.type === platform);
    await this.systemCardManager.initialize({
      systemId: bootstrapId,
      created: new Date().toISOString(),
      platform: {
        type: platform as any,
        ...(detectedPlatform?.version && { version: detectedPlatform.version }),
        detectionConfidence: platformDetection.confidence,
      },
      bootstrapContext: {
        bootstrapId,
        validatedPatternId: dynamicPattern.id,
        // These will be updated after bootstrap completion
      },
      metadata: {
        tags: ['bootstrap', platform, 'infrastructure'],
        description: `Bootstrap deployment for ${platform}`,
      },
    });

    this.logger.info('📝 SystemCard initialized for resource tracking', 'BootstrapValidationLoop');

    // Execute infrastructure DAG
    const result = await this.dagExecutor.execute(tasks);

    // Log results
    if (result.success) {
      this.logger.info(
        `✅ Infrastructure Layer complete: ${result.executedTasks.length} tasks executed in ${result.duration}ms`,
        'BootstrapValidationLoop'
      );

      // Extract resources from task results and update SystemCard
      // Note: Resource extraction will be implemented in next phase
      // For now, we'll generate cleanup phases based on what was executed
      const cleanupPhases = await this.systemCardManager.generateCleanupPhases();

      this.logger.info(
        `🧹 Generated ${cleanupPhases.length} cleanup phases with ${this.systemCardManager.getResourceCount()} tracked resources`,
        'BootstrapValidationLoop'
      );
    } else {
      this.logger.error(
        `❌ Infrastructure Layer failed: ${result.failedTasks.length} tasks failed, ${result.skippedTasks.length} skipped`,
        'BootstrapValidationLoop'
      );

      // Log failed tasks
      for (const taskId of result.failedTasks) {
        const taskResult = result.taskResults.get(taskId);
        if (taskResult) {
          this.logger.error(
            `  ❌ ${taskId}: ${taskResult.stderr || taskResult.error?.message}`,
            'BootstrapValidationLoop'
          );
        }
      }
    }

    return result;
  }

  /**
   * Generate fallback pattern using AI when validated pattern doesn't exist
   */
  private async generateFallbackPattern(
    detection: PlatformDetectionResult
  ): Promise<DynamicPattern> {
    this.logger.warn(
      '⚠️  Generating fallback pattern using AI - less tested than validated patterns',
      'BootstrapValidationLoop'
    );

    // Use existing dynamic deployment intelligence as fallback
    const plan = await this.deploymentIntelligence.generateDeploymentPlan();

    // Convert to DynamicPattern format
    return {
      version: '1.0-fallback',
      id: `${detection.primaryPlatform}-ai-generated`,
      name: `${detection.primaryPlatform} (AI-Generated)`,
      description: 'Auto-generated deployment pattern - not validated by community',
      authoritativeSources: [],
      deploymentPhases: plan.deploymentSteps.map((step: any, i: number) => {
        const prevStep = i > 0 ? plan.deploymentSteps[i - 1] : undefined;
        return {
          order: i + 1,
          name: step.title,
          description: step.description,
          estimatedDuration: step.estimatedTime,
          canParallelize: false,
          prerequisites: prevStep ? [prevStep.title] : [],
          commands: [
            {
              description: step.description,
              command: step.command,
              expectedExitCode: 0,
            },
          ],
        };
      }),
      validationChecks: plan.validationChecks.map((check: any, i: number) => ({
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

  private computePatternHash(pattern: ValidatedPattern): string {
    try {
      // Create a deterministic string representation of the pattern
      const patternString = JSON.stringify(
        {
          id: pattern.id,
          name: pattern.name,
          version: pattern.version,
          platformType: pattern.platformType,
          deploymentPhases: pattern.deploymentPhases,
          validationChecks: pattern.validationChecks,
          authoritativeSources: pattern.authoritativeSources,
          baseCodeRepository: pattern.baseCodeRepository,
        },
        null,
        2
      );

      // Compute SHA-256 hash
      return createHash('sha256').update(patternString).digest('hex');
    } catch (error) {
      this.logger.warn('Failed to compute pattern hash', 'BootstrapValidationLoop', error as Error);
      return 'hash-computation-failed';
    }
  }
}

/**
 * Generate guided execution instructions for LLM
 * This function returns step-by-step commands for the LLM to execute
 */
async function generateGuidedExecutionInstructions(params: {
  loop: BootstrapValidationLoop;
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
}): Promise<any> {
  const {
    projectPath,
    targetEnvironment,
    maxIterations,
    currentIteration,
    previousExecutionOutput,
    previousExecutionSuccess,
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

    const cleanupCommands: {
      [key: string]: { teardown: string; verify: string; restart: string };
    } = {
      openshift: {
        teardown:
          'oc delete all --selector app=myapp && oc delete configmap --selector app=myapp && oc delete secret --selector app=myapp',
        verify: 'oc get all --selector app=myapp',
        restart: './bootstrap.sh',
      },
      kubernetes: {
        teardown: 'kubectl delete deployment,service,configmap,secret -l app=myapp',
        verify: 'kubectl get all -l app=myapp',
        restart: './bootstrap.sh',
      },
      docker: {
        teardown: 'docker-compose down -v && docker system prune -f',
        verify: 'docker ps -a',
        restart: 'docker-compose up -d',
      },
      'docker-compose': {
        teardown: 'docker-compose down -v && docker system prune -f',
        verify: 'docker ps -a && docker volume ls',
        restart: 'docker-compose up -d',
      },
    };

    const cleanup = cleanupCommands[detectedPlatform] || {
      teardown: 'echo "Manual cleanup required for ' + detectedPlatform + '"',
      verify: 'echo "Manual verification required"',
      restart: './bootstrap.sh',
    };

    return {
      content: [
        {
          type: 'text',
          text: `# 🗑️ Deployment Cleanup & Restart (CI/CD Mode)

## Detected Platform
**Platform**: ${detectedPlatform.toUpperCase()}

## ⚠️ CI/CD Workflow: Teardown → Verify → Restart

This workflow is designed for CI/CD pipelines that need to completely tear down and restart deployments.

### Step 1: Teardown Current Deployment

**IMPORTANT**: This will DELETE all resources. Confirm with human before proceeding.

Run:
\`\`\`bash
${cleanup.teardown}
\`\`\`

**What this does**:
- Deletes all deployments, services, and resources
- Removes configuration and secrets
- Cleans up volumes and persistent data

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
  } = args;

  const loop = new BootstrapValidationLoop(projectPath, adrDirectory, maxIterations);
  await loop.initialize();

  // GUIDED MODE: Return instructions for LLM to execute commands
  // This mode tells the LLM what to run and processes the output iteratively
  return await generateGuidedExecutionInstructions({
    loop,
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
  });
}

export default bootstrapValidationLoop;
