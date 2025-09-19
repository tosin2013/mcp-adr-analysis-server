/**
 * Memory Migration Manager
 *
 * Comprehensive migration strategy for transitioning existing data to memory entities.
 * Handles deployment history, troubleshooting data, knowledge graphs, and other legacy
 * systems with zero data loss and rollback capabilities.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { existsSync } from 'fs';
import crypto from 'crypto';

import { MemoryEntityManager } from './memory-entity-manager.js';
import { EnhancedLogger } from './enhanced-logging.js';
import { loadConfig } from './config.js';
import {
  DeploymentAssessmentMemory,
  TroubleshootingSessionMemory,
  ArchitecturalDecisionMemory,
} from '../types/memory-entities.js';
import { McpAdrError } from '../types/index.js';

export interface MigrationConfig {
  enableBackup: boolean;
  backupDirectory: string;
  migrationBatchSize: number;
  validateIntegrity: boolean;
  enableRollback: boolean;
  logLevel: 'verbose' | 'standard' | 'minimal';
}

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  failedCount: number;
  backupPath?: string;
  rollbackPlan?: string;
  errors: Array<{
    source: string;
    error: string;
    data?: any;
  }>;
  performance: {
    startTime: string;
    endTime: string;
    durationMs: number;
    throughputPerSecond: number;
  };
}

export interface DataSourceConfig {
  path: string;
  type:
    | 'deployment_history'
    | 'troubleshooting_sessions'
    | 'knowledge_graph'
    | 'adr_collection'
    | 'environment_snapshots';
  format: 'json' | 'markdown' | 'yaml';
  migrationStrategy: 'full' | 'incremental' | 'selective';
}

export class MemoryMigrationManager {
  private memoryManager: MemoryEntityManager;
  private logger: EnhancedLogger;
  private config: MigrationConfig;
  private projectConfig: any;
  private migrationBackupDir: string;

  constructor(memoryManager: MemoryEntityManager, config?: Partial<MigrationConfig>) {
    this.memoryManager = memoryManager;
    this.logger = new EnhancedLogger();
    this.projectConfig = loadConfig();

    this.config = {
      enableBackup: true,
      backupDirectory: path.join(this.projectConfig.projectPath, '.mcp-migration-backups'),
      migrationBatchSize: 50,
      validateIntegrity: true,
      enableRollback: true,
      logLevel: 'standard',
      ...config,
    };

    this.migrationBackupDir = path.join(
      this.config.backupDirectory,
      `migration-${new Date().toISOString().replace(/[:.]/g, '-')}`
    );
  }

  /**
   * Migrate all existing data to memory entities
   */
  async migrateAllExistingData(): Promise<MigrationResult> {
    const startTime = new Date();
    this.logger.info(
      'Starting comprehensive data migration to memory entities',
      'MemoryMigrationManager'
    );

    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      failedCount: 0,
      errors: [],
      performance: {
        startTime: startTime.toISOString(),
        endTime: '',
        durationMs: 0,
        throughputPerSecond: 0,
      },
    };

    try {
      // Create backup if enabled
      if (this.config.enableBackup) {
        result.backupPath = await this.createMigrationBackup();
        this.logger.info('Migration backup created', 'MemoryMigrationManager', {
          backupPath: result.backupPath,
        });
      }

      // Define migration sources
      // Use proper temp directory for cache
      const projectName = path.basename(this.projectConfig.projectPath);
      const cacheDir = path.join(os.tmpdir(), projectName, 'cache');
      const deploymentHistoryPath = path.join(cacheDir, 'deployment-history.json');

      const migrationSources: DataSourceConfig[] = [
        {
          path: deploymentHistoryPath,
          type: 'deployment_history',
          format: 'json',
          migrationStrategy: 'full',
        },
        {
          path: path.join(cacheDir, 'knowledge-graph-snapshots.json'),
          type: 'knowledge_graph',
          format: 'json',
          migrationStrategy: 'selective',
        },
        {
          path: path.join(this.projectConfig.projectPath, 'docs', 'adrs'),
          type: 'adr_collection',
          format: 'markdown',
          migrationStrategy: 'full',
        },
        {
          path: cacheDir,
          type: 'troubleshooting_sessions',
          format: 'json',
          migrationStrategy: 'incremental',
        },
      ];

      // Migrate each data source
      for (const source of migrationSources) {
        try {
          const sourceResult = await this.migrateDataSource(source);
          result.migratedCount += sourceResult.migratedCount;
          result.failedCount += sourceResult.failedCount;
          result.errors.push(...sourceResult.errors);
        } catch (error) {
          result.failedCount++;
          result.errors.push({
            source: source.path,
            error: error instanceof Error ? error.message : String(error),
            data: undefined,
          });
          this.logger.error('Failed to migrate data source', 'MemoryMigrationManager');
        }
      }

      // Create cross-tool relationships after migration
      if (result.migratedCount > 0) {
        try {
          const relationshipResult = await this.memoryManager.createCrossToolRelationships();
          this.logger.info(
            'Cross-tool relationships created post-migration',
            'MemoryMigrationManager',
            {
              suggestedRelationships: relationshipResult.suggestedRelationships.length,
              autoCreated: relationshipResult.autoCreatedCount,
            }
          );
        } catch (error) {
          this.logger.warn('Failed to create cross-tool relationships', 'MemoryMigrationManager', {
            error,
          });
        }
      }

      // Validate migration if enabled
      if (this.config.validateIntegrity) {
        const validationResult = await this.validateMigrationIntegrity(result.migratedCount);
        if (!validationResult.isValid) {
          result.success = false;
          result.errors.push({
            source: 'validation',
            error: 'Migration integrity validation failed',
            data: validationResult,
          });
        }
      }

      // Generate rollback plan if enabled
      if (this.config.enableRollback) {
        result.rollbackPlan = await this.generateRollbackPlan(result);
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        source: 'migration_manager',
        error: error instanceof Error ? error.message : String(error),
      });
      this.logger.error('Migration failed with critical error', 'MemoryMigrationManager');
    }

    // Calculate performance metrics
    const endTime = new Date();
    result.performance.endTime = endTime.toISOString();
    result.performance.durationMs = endTime.getTime() - startTime.getTime();
    result.performance.throughputPerSecond =
      result.migratedCount / (result.performance.durationMs / 1000);

    // Log final results
    this.logger.info('Migration completed', 'MemoryMigrationManager', {
      success: result.success,
      migratedCount: result.migratedCount,
      failedCount: result.failedCount,
      durationMs: result.performance.durationMs,
      throughputPerSecond: result.performance.throughputPerSecond.toFixed(2),
    });

    return result;
  }

  /**
   * Migrate a specific data source to memory entities
   */
  private async migrateDataSource(source: DataSourceConfig): Promise<MigrationResult> {
    this.logger.info('Starting data source migration', 'MemoryMigrationManager', {
      path: source.path,
      type: source.type,
    });

    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      failedCount: 0,
      errors: [],
      performance: {
        startTime: new Date().toISOString(),
        endTime: '',
        durationMs: 0,
        throughputPerSecond: 0,
      },
    };

    if (!existsSync(source.path)) {
      this.logger.info('Data source does not exist, skipping', 'MemoryMigrationManager', {
        path: source.path,
      });
      return result;
    }

    try {
      switch (source.type) {
        case 'deployment_history':
          const deploymentResult = await this.migrateDeploymentHistory(source.path);
          Object.assign(result, deploymentResult);
          break;

        case 'knowledge_graph':
          const knowledgeResult = await this.migrateKnowledgeGraph(source.path);
          Object.assign(result, knowledgeResult);
          break;

        case 'adr_collection':
          const adrResult = await this.migrateAdrCollection(source.path);
          Object.assign(result, adrResult);
          break;

        case 'troubleshooting_sessions':
          const troubleshootingResult = await this.migrateTroubleshootingSessions(source.path);
          Object.assign(result, troubleshootingResult);
          break;

        default:
          this.logger.warn('Unknown data source type', 'MemoryMigrationManager', {
            type: source.type,
          });
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        source: source.path,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return result;
  }

  /**
   * Migrate deployment history JSON files to deployment assessment memory entities
   */
  private async migrateDeploymentHistory(historyPath: string): Promise<Partial<MigrationResult>> {
    try {
      const historyData = JSON.parse(await fs.readFile(historyPath, 'utf-8'));
      const deployments = Array.isArray(historyData) ? historyData : historyData.deployments || [];

      let migratedCount = 0;
      const errors: MigrationResult['errors'] = [];

      for (const deployment of deployments) {
        try {
          const memoryEntity: DeploymentAssessmentMemory = {
            id: crypto.randomUUID(),
            type: 'deployment_assessment',
            title: `Migrated Deployment Assessment - ${deployment.environment || 'Unknown'}`,
            description: `Deployment assessment migrated from legacy JSON data: ${deployment.timestamp || 'Unknown date'}`,
            confidence: 0.8,
            relevance: 0.7,
            tags: ['migrated', 'deployment', deployment.environment || 'unknown'],
            created: deployment.timestamp || new Date().toISOString(),
            lastModified: new Date().toISOString(),
            version: 1,
            context: {
              technicalStack: deployment.technicalStack || [],
              environmentalFactors: [deployment.environment || 'unknown'],
              stakeholders: ['migration-tool'],
            },
            relationships: [],
            accessPattern: {
              accessCount: 1,
              lastAccessed: new Date().toISOString(),
              accessContext: ['migration'],
            },
            evolution: {
              origin: 'imported',
              transformations: [
                {
                  timestamp: new Date().toISOString(),
                  type: 'migration',
                  description: `Migrated from deployment-history.json`,
                  agent: 'MemoryMigrationManager',
                },
              ],
            },
            validation: {
              isVerified: false,
              verificationMethod: 'automatic-migration',
              verificationTimestamp: new Date().toISOString(),
            },
            assessmentData: {
              environment: this.mapEnvironmentType(deployment.environment),
              readinessScore: deployment.readinessScore || 0.5,
              validationResults: {
                testResults: {
                  passed: deployment.testsPassed || 0,
                  failed: deployment.testsFailed || 0,
                  coverage: deployment.testCoverage || 0.0,
                  criticalFailures: deployment.criticalFailures || [],
                },
                securityValidation: {
                  vulnerabilities: deployment.securityIssues || 0,
                  securityScore: deployment.securityScore || 0.5,
                  criticalIssues: deployment.securityCriticalIssues || [],
                },
                performanceValidation: {
                  performanceScore: deployment.performanceScore || 0.5,
                  bottlenecks: deployment.performanceBottlenecks || [],
                  resourceUtilization: deployment.resourceUtilization || {},
                },
              },
              blockingIssues: (deployment.blockers || []).map((blocker: any) => ({
                issue: blocker.issue || blocker,
                severity: blocker.severity || 'medium',
                category: blocker.category || 'configuration',
                resolution: blocker.resolution,
                estimatedEffort: blocker.effort,
              })),
              deploymentStrategy: {
                type: deployment.strategy || 'rolling',
                rollbackPlan: deployment.rollbackPlan || 'Standard rollback procedure',
                monitoringPlan: deployment.monitoringPlan || 'Standard monitoring',
                estimatedDowntime: deployment.estimatedDowntime,
              },
              complianceChecks: {
                adrCompliance: deployment.adrCompliance || 0.5,
                regulatoryCompliance: deployment.complianceChecks || [],
                auditTrail: deployment.auditTrail || [`Migrated from ${historyPath}`],
              },
            },
          };

          await this.memoryManager.upsertEntity(memoryEntity);
          migratedCount++;
        } catch (error) {
          this.logger.error(
            'Failed to migrate deployment',
            'MemoryMigrationManager',
            error instanceof Error ? error : new Error(String(error))
          );
          errors.push({
            source: 'deployment',
            error: error instanceof Error ? error.message : String(error),
            data: deployment,
          });
        }
      }

      return { migratedCount, failedCount: errors.length, errors };
    } catch (error) {
      this.logger.error(
        'Critical error in deployment history migration',
        'MemoryMigrationManager',
        error instanceof Error ? error : new Error(String(error))
      );
      throw new McpAdrError(
        `Failed to migrate deployment history: ${error instanceof Error ? error.message : String(error)}`,
        'MIGRATION_ERROR'
      );
    }
  }

  /**
   * Migrate knowledge graph snapshots to architectural decision memory entities
   */
  private async migrateKnowledgeGraph(snapshotsPath: string): Promise<Partial<MigrationResult>> {
    try {
      const snapshotsData = JSON.parse(await fs.readFile(snapshotsPath, 'utf-8'));
      const snapshots = Array.isArray(snapshotsData) ? snapshotsData : [snapshotsData];

      let migratedCount = 0;
      const errors: MigrationResult['errors'] = [];

      for (const snapshot of snapshots) {
        if (snapshot.adrs) {
          for (const adr of snapshot.adrs) {
            try {
              const memoryEntity: ArchitecturalDecisionMemory = {
                id: crypto.randomUUID(),
                type: 'architectural_decision',
                title: adr.title || `Migrated ADR - ${adr.number || 'Unknown'}`,
                description: adr.content || 'Architectural decision migrated from knowledge graph',
                confidence: 0.9,
                relevance: adr.importance || 0.8,
                tags: ['migrated', 'adr', ...(adr.tags || [])],
                created: adr.created || new Date().toISOString(),
                lastModified: adr.lastModified || new Date().toISOString(),
                version: adr.version || 1,
                context: {
                  technicalStack: adr.technicalStack || [],
                  environmentalFactors: adr.environmentalFactors || [],
                  stakeholders: adr.stakeholders || ['migration-tool'],
                },
                relationships: [],
                accessPattern: {
                  accessCount: 1,
                  lastAccessed: new Date().toISOString(),
                  accessContext: ['migration'],
                },
                evolution: {
                  origin: 'imported',
                  transformations: [
                    {
                      timestamp: new Date().toISOString(),
                      type: 'migration',
                      description: `Migrated from knowledge graph snapshot`,
                      agent: 'MemoryMigrationManager',
                    },
                  ],
                },
                validation: {
                  isVerified: true,
                  verificationMethod: 'knowledge-graph-import',
                  verificationTimestamp: new Date().toISOString(),
                },
                decisionData: {
                  status: adr.status || 'accepted',
                  context: adr.context || 'Migrated from knowledge graph',
                  decision: adr.decision || adr.title || 'Decision details not available',
                  consequences: {
                    positive: adr.positiveConsequences || [],
                    negative: adr.negativeConsequences || [],
                    risks: adr.risks || [],
                  },
                  alternatives: (adr.alternatives || []).map((alt: any) => ({
                    name: alt.name || alt,
                    description: alt.description || '',
                    tradeoffs: alt.tradeoffs || '',
                  })),
                  implementationStatus: adr.implementationStatus || 'unknown',
                  implementationTasks: adr.implementationTasks || [],
                  reviewHistory: adr.reviewHistory || [],
                },
              };

              await this.memoryManager.upsertEntity(memoryEntity);
              migratedCount++;

              if (this.config.logLevel === 'verbose') {
                this.logger.debug('Migrated ADR from knowledge graph', 'MemoryMigrationManager', {
                  id: memoryEntity.id,
                  title: adr.title,
                });
              }
            } catch (error) {
              errors.push({
                source: 'knowledge_graph_adr',
                error: error instanceof Error ? error.message : String(error),
                data: adr,
              });
            }
          }
        }
      }

      return { migratedCount, failedCount: errors.length, errors };
    } catch (error) {
      throw new McpAdrError(
        `Failed to migrate knowledge graph: ${error instanceof Error ? error.message : String(error)}`,
        'MIGRATION_ERROR'
      );
    }
  }

  /**
   * Migrate ADR markdown files to architectural decision memory entities
   */
  private async migrateAdrCollection(adrDirectory: string): Promise<Partial<MigrationResult>> {
    try {
      const files = await fs.readdir(adrDirectory);
      const adrFiles = files.filter(file => file.endsWith('.md') && file.match(/^\d+/));

      let migratedCount = 0;
      const errors: MigrationResult['errors'] = [];

      for (const file of adrFiles) {
        try {
          const filePath = path.join(adrDirectory, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const adrData = this.parseAdrMarkdown(content, file);

          const memoryEntity: ArchitecturalDecisionMemory = {
            id: crypto.randomUUID(),
            type: 'architectural_decision',
            title: adrData.title,
            description: adrData.description,
            confidence: 0.95, // High confidence for formal ADR documents
            relevance: 0.9,
            tags: ['migrated', 'adr', 'formal', ...adrData.tags],
            created: adrData.created || new Date().toISOString(),
            lastModified: new Date().toISOString(),
            version: 1,
            context: {
              technicalStack: adrData.technicalStack || [],
              environmentalFactors: adrData.environmentalFactors || [],
              stakeholders: adrData.stakeholders || ['architecture-team'],
            },
            relationships: [],
            accessPattern: {
              accessCount: 1,
              lastAccessed: new Date().toISOString(),
              accessContext: ['migration'],
            },
            evolution: {
              origin: 'imported',
              transformations: [
                {
                  timestamp: new Date().toISOString(),
                  type: 'migration',
                  description: `Migrated from ADR markdown file: ${file}`,
                  agent: 'MemoryMigrationManager',
                },
              ],
            },
            validation: {
              isVerified: true,
              verificationMethod: 'adr-markdown-import',
              verificationTimestamp: new Date().toISOString(),
            },
            decisionData: {
              status: adrData.status,
              context: adrData.context,
              decision: adrData.decision,
              consequences: adrData.consequences,
              alternatives: adrData.alternatives,
              implementationStatus: adrData.implementationStatus || 'unknown',
              implementationTasks: adrData.implementationTasks || [],
              reviewHistory: [],
            },
          };

          await this.memoryManager.upsertEntity(memoryEntity);
          migratedCount++;

          if (this.config.logLevel === 'verbose') {
            this.logger.debug('Migrated ADR markdown file', 'MemoryMigrationManager', {
              id: memoryEntity.id,
              file,
              title: adrData.title,
            });
          }
        } catch (error) {
          errors.push({
            source: file,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return { migratedCount, failedCount: errors.length, errors };
    } catch (error) {
      throw new McpAdrError(
        `Failed to migrate ADR collection: ${error instanceof Error ? error.message : String(error)}`,
        'MIGRATION_ERROR'
      );
    }
  }

  /**
   * Migrate troubleshooting session data
   */
  private async migrateTroubleshootingSessions(
    cacheDirectory: string
  ): Promise<Partial<MigrationResult>> {
    try {
      const files = await fs.readdir(cacheDirectory);
      const sessionFiles = files.filter(
        file => file.includes('troubleshoot') || file.includes('session') || file.includes('debug')
      );

      let migratedCount = 0;
      const errors: MigrationResult['errors'] = [];

      for (const file of sessionFiles) {
        try {
          if (file.endsWith('.json')) {
            const filePath = path.join(cacheDirectory, file);
            const sessionData = JSON.parse(await fs.readFile(filePath, 'utf-8'));

            const memoryEntity: TroubleshootingSessionMemory = {
              id: crypto.randomUUID(),
              type: 'troubleshooting_session',
              title: `Migrated Troubleshooting Session - ${file}`,
              description: sessionData.description || 'Troubleshooting session migrated from cache',
              confidence: 0.7,
              relevance: 0.8,
              tags: ['migrated', 'troubleshooting', ...((sessionData.tags as string[]) || [])],
              created: sessionData.timestamp || new Date().toISOString(),
              lastModified: new Date().toISOString(),
              version: 1,
              context: {
                technicalStack: sessionData.technicalStack || [],
                environmentalFactors: sessionData.environment ? [sessionData.environment] : [],
                stakeholders: ['migration-tool'],
              },
              relationships: [],
              accessPattern: {
                accessCount: 1,
                lastAccessed: new Date().toISOString(),
                accessContext: ['migration'],
              },
              evolution: {
                origin: 'imported',
                transformations: [
                  {
                    timestamp: new Date().toISOString(),
                    type: 'migration',
                    description: `Migrated from troubleshooting cache file: ${file}`,
                    agent: 'MemoryMigrationManager',
                  },
                ],
              },
              validation: {
                isVerified: false,
                verificationMethod: 'cache-import',
                verificationTimestamp: new Date().toISOString(),
              },
              sessionData: {
                failurePattern: {
                  failureType: sessionData.failureType || 'unknown',
                  errorSignature:
                    sessionData.errorSignature || sessionData.error || 'Unknown error',
                  frequency: sessionData.frequency || 1,
                  environments: sessionData.environments || [sessionData.environment || 'unknown'],
                },
                failureDetails: {
                  errorMessage:
                    sessionData.errorMessage || sessionData.error || 'No error message available',
                  environment: sessionData.environment || 'unknown',
                },
                analysisSteps: sessionData.steps || sessionData.analysisSteps || [],
                solutionEffectiveness: sessionData.effectiveness || 0.5,
                preventionMeasures: sessionData.prevention || [],
                relatedADRs: sessionData.relatedADRs || [],
                environmentContext: {
                  environment: sessionData.environment || 'unknown',
                },
                followUpActions: sessionData.followUpActions || [],
              },
            };

            await this.memoryManager.upsertEntity(memoryEntity);
            migratedCount++;
          }
        } catch (error) {
          errors.push({
            source: file,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return { migratedCount, failedCount: errors.length, errors };
    } catch (error) {
      throw new McpAdrError(
        `Failed to migrate troubleshooting sessions: ${error instanceof Error ? error.message : String(error)}`,
        'MIGRATION_ERROR'
      );
    }
  }

  /**
   * Create backup of existing data before migration
   */
  private async createMigrationBackup(): Promise<string> {
    await fs.mkdir(this.migrationBackupDir, { recursive: true });

    const cacheDir = path.join(this.projectConfig.projectPath, '.mcp-adr-cache');
    const docsDir = path.join(this.projectConfig.projectPath, 'docs');

    // Backup cache directory
    if (existsSync(cacheDir)) {
      await this.copyDirectory(cacheDir, path.join(this.migrationBackupDir, 'cache'));
    }

    // Backup docs directory
    if (existsSync(docsDir)) {
      await this.copyDirectory(docsDir, path.join(this.migrationBackupDir, 'docs'));
    }

    // Create backup manifest
    const manifest = {
      timestamp: new Date().toISOString(),
      migrationVersion: '1.0.0',
      projectPath: this.projectConfig.projectPath,
      backupContents: {
        cache: existsSync(cacheDir),
        docs: existsSync(docsDir),
      },
    };

    await fs.writeFile(
      path.join(this.migrationBackupDir, 'backup-manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    return this.migrationBackupDir;
  }

  /**
   * Validate migration integrity
   */
  private async validateMigrationIntegrity(expectedCount: number): Promise<{
    isValid: boolean;
    actualCount: number;
    issues: string[];
  }> {
    const queryResult = await this.memoryManager.queryEntities({});

    const issues: string[] = [];
    const actualCount = queryResult.entities.length;

    // Check entity count expectations
    if (actualCount === 0 && expectedCount > 0) {
      issues.push('No entities found after migration');
    }

    // Validate entity structure
    for (const entity of queryResult.entities.slice(0, 10)) {
      // Sample first 10
      if (!entity.id || !entity.type || !entity.title) {
        issues.push(`Invalid entity structure: ${entity.id}`);
      }
    }

    return {
      isValid: issues.length === 0,
      actualCount,
      issues,
    };
  }

  /**
   * Generate rollback plan
   */
  private async generateRollbackPlan(migrationResult: MigrationResult): Promise<string> {
    const rollbackSteps = [
      '# Migration Rollback Plan',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Migration ID: ${path.basename(this.migrationBackupDir)}`,
      '',
      '## Steps to Rollback:',
      '',
      '1. Stop the MCP ADR Analysis Server',
      '2. Clear memory entities:',
      '   ```bash',
      `   rm -rf "${path.join(this.projectConfig.projectPath, '.mcp-adr-memory')}"`,
      '   ```',
      '',
      '3. Restore backup data:',
      '   ```bash',
    ];

    if (migrationResult.backupPath) {
      rollbackSteps.push(
        `   cp -r "${path.join(migrationResult.backupPath, 'cache')}" "${path.join(this.projectConfig.projectPath, '.mcp-adr-cache')}"`,
        `   cp -r "${path.join(migrationResult.backupPath, 'docs')}" "${path.join(this.projectConfig.projectPath, 'docs')}"`
      );
    }

    rollbackSteps.push(
      '   ```',
      '',
      '4. Restart the server',
      '',
      '## Verification:',
      '- Check that legacy cache files are restored',
      '- Verify ADR documents are accessible',
      '- Confirm troubleshooting history is available'
    );

    const rollbackContent = rollbackSteps.join('\n');

    // Save rollback plan
    const rollbackPath = path.join(this.migrationBackupDir, 'rollback-plan.md');
    await fs.writeFile(rollbackPath, rollbackContent);

    return rollbackPath;
  }

  /**
   * Helper methods
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  private mapEnvironmentType(env: string): 'development' | 'staging' | 'production' | 'testing' {
    const envLower = (env || '').toLowerCase();
    if (envLower.includes('prod')) return 'production';
    if (envLower.includes('stag')) return 'staging';
    if (envLower.includes('test')) return 'testing';
    return 'development';
  }

  private parseAdrMarkdown(content: string, filename: string): any {
    const lines = content.split('\n');
    const result: any = {
      title: filename.replace(/^\d+[-_]/, '').replace(/\.md$/, ''),
      status: 'accepted',
      context: '',
      decision: '',
      consequences: { positive: [], negative: [], risks: [] },
      alternatives: [],
      tags: [],
      technicalStack: [],
      environmentalFactors: [],
      stakeholders: [],
    };

    let currentSection = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Extract title
      if (trimmed.startsWith('# ')) {
        result.title = trimmed.substring(2);
        continue;
      }

      // Extract status
      if (trimmed.toLowerCase().includes('status')) {
        const statusMatch = trimmed.match(/status[:\s]*(\w+)/i);
        if (statusMatch && statusMatch[1]) {
          result.status = statusMatch[1].toLowerCase() as
            | 'accepted'
            | 'proposed'
            | 'superseded'
            | 'deprecated';
        }
        continue;
      }

      // Extract sections
      if (trimmed.startsWith('## ')) {
        // Process previous section
        if (currentSection && currentContent.length > 0) {
          const sectionContent = currentContent.join('\n').trim();
          switch (currentSection.toLowerCase()) {
            case 'context':
              result.context = sectionContent;
              break;
            case 'decision':
              result.decision = sectionContent;
              break;
            case 'consequences':
              result.consequences = this.parseConsequences(sectionContent);
              break;
            case 'alternatives':
              result.alternatives = this.parseAlternatives(sectionContent);
              break;
          }
        }

        currentSection = trimmed.substring(3);
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Process last section
    if (currentSection && currentContent.length > 0) {
      const sectionContent = currentContent.join('\n').trim();
      switch (currentSection.toLowerCase()) {
        case 'context':
          result.context = sectionContent;
          break;
        case 'decision':
          result.decision = sectionContent;
          break;
        case 'consequences':
          result.consequences = this.parseConsequences(sectionContent);
          break;
        case 'alternatives':
          result.alternatives = this.parseAlternatives(sectionContent);
          break;
      }
    }

    return result;
  }

  private parseConsequences(content: string): any {
    const result = { positive: [], negative: [], risks: [] };
    const lines = content.split('\n');

    let currentType = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().includes('positive')) {
        currentType = 'positive';
      } else if (trimmed.toLowerCase().includes('negative')) {
        currentType = 'negative';
      } else if (trimmed.toLowerCase().includes('risk')) {
        currentType = 'risks';
      } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const item = trimmed.substring(1).trim();
        if (currentType && item) {
          (result as any)[currentType].push(item);
        }
      }
    }

    return result;
  }

  private parseAlternatives(content: string): any[] {
    const alternatives: any[] = [];
    const sections = content.split(/(?=^[#]+\s)/m);

    for (const section of sections) {
      const lines = section.split('\n');
      const titleLine = lines.find(line => line.trim().startsWith('#'));

      if (titleLine) {
        const name = titleLine.replace(/^#+\s*/, '');
        const description = lines.slice(1).join('\n').trim();

        alternatives.push({
          name,
          description,
          tradeoffs: '', // Extract if pattern found
        });
      }
    }

    return alternatives;
  }
}
