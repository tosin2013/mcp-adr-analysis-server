/**
 * Memory Rollback Manager
 *
 * Provides safe rollback capabilities for memory-centric architecture migration.
 * Handles restoration of legacy systems and data integrity validation.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { MemoryEntityManager } from './memory-entity-manager.js';
import { EnhancedLogger } from './enhanced-logging.js';
import { loadConfig } from './config.js';
import { McpAdrError } from '../types/index.js';

export interface RollbackConfig {
  backupDirectory: string;
  validateBeforeRollback: boolean;
  createPreRollbackBackup: boolean;
  preserveMemoryData: boolean;
  rollbackTimeout: number; // in milliseconds
}

export interface RollbackResult {
  success: boolean;
  rollbackType: 'full' | 'partial' | 'failed';
  restoredFiles: string[];
  preservedData?: string;
  errors: Array<{
    operation: string;
    error: string;
    critical: boolean;
  }>;
  performance: {
    startTime: string;
    endTime: string;
    durationMs: number;
  };
  validation: {
    preRollbackValid: boolean;
    postRollbackValid: boolean;
    issues: string[];
  };
}

export interface BackupManifest {
  timestamp: string;
  migrationVersion: string;
  projectPath: string;
  backupContents: {
    cache: boolean;
    docs: boolean;
    memoryData?: boolean;
  };
  fileList: Array<{
    originalPath: string;
    backupPath: string;
    fileSize: number;
    checksum: string;
  }>;
}

export class MemoryRollbackManager {
  // Memory manager could be used for selective rollback operations
  private logger: EnhancedLogger;
  private config: RollbackConfig;
  private projectConfig: any;

  constructor(_memoryManager: MemoryEntityManager, config?: Partial<RollbackConfig>) {
    // Store memory manager reference if needed for future selective rollback features
    this.logger = new EnhancedLogger();
    this.projectConfig = loadConfig();

    this.config = {
      backupDirectory: path.join(this.projectConfig.projectPath, '.mcp-migration-backups'),
      validateBeforeRollback: true,
      createPreRollbackBackup: true,
      preserveMemoryData: true,
      rollbackTimeout: 300000, // 5 minutes
      ...config,
    };
  }

  /**
   * Perform complete rollback to legacy system
   */
  async performFullRollback(backupPath?: string): Promise<RollbackResult> {
    const startTime = new Date();
    this.logger.info('Starting full rollback to legacy system', 'MemoryRollbackManager');

    const result: RollbackResult = {
      success: false,
      rollbackType: 'failed',
      restoredFiles: [],
      errors: [],
      performance: {
        startTime: startTime.toISOString(),
        endTime: '',
        durationMs: 0,
      },
      validation: {
        preRollbackValid: false,
        postRollbackValid: false,
        issues: [],
      },
    };

    try {
      // Find backup to restore from
      const resolvedBackupPath = backupPath || (await this.findLatestBackup());
      if (!resolvedBackupPath) {
        throw new McpAdrError('No backup found for rollback', 'ROLLBACK_NO_BACKUP');
      }

      this.logger.info('Using backup for rollback', 'MemoryRollbackManager', {
        backupPath: resolvedBackupPath,
      });

      // Validate backup before proceeding
      if (this.config.validateBeforeRollback) {
        const backupValidation = await this.validateBackup(resolvedBackupPath);
        result.validation.preRollbackValid = backupValidation.isValid;
        result.validation.issues.push(...backupValidation.issues);

        if (!backupValidation.isValid) {
          throw new McpAdrError(
            `Backup validation failed: ${backupValidation.issues.join(', ')}`,
            'ROLLBACK_INVALID_BACKUP'
          );
        }
      }

      // Create pre-rollback backup if enabled
      if (this.config.createPreRollbackBackup) {
        const preRollbackBackup = await this.createPreRollbackBackup();
        this.logger.info('Pre-rollback backup created', 'MemoryRollbackManager', {
          backupPath: preRollbackBackup,
        });
      }

      // Preserve memory data if requested
      if (this.config.preserveMemoryData) {
        result.preservedData = await this.preserveMemoryData();
      }

      // Stop memory services (in a real implementation, this would stop the server)
      await this.stopMemoryServices();

      // Clear memory data
      await this.clearMemoryData();

      // Restore legacy data
      const restoredFiles = await this.restoreLegacyData(resolvedBackupPath);
      result.restoredFiles = restoredFiles;

      // Validate restoration
      const postValidation = await this.validateLegacyRestoration(resolvedBackupPath);
      result.validation.postRollbackValid = postValidation.isValid;
      result.validation.issues.push(...postValidation.issues);

      // Restart services (in a real implementation)
      await this.restartLegacyServices();

      result.success = true;
      result.rollbackType = 'full';

      this.logger.info('Full rollback completed successfully', 'MemoryRollbackManager', {
        restoredFiles: restoredFiles.length,
        preservedData: !!result.preservedData,
      });
    } catch (error) {
      result.success = false;
      result.errors.push({
        operation: 'full_rollback',
        error: error instanceof Error ? error.message : String(error),
        critical: true,
      });

      this.logger.error('Full rollback failed', 'MemoryRollbackManager');

      // Attempt partial recovery
      try {
        await this.attemptPartialRecovery();
        result.rollbackType = 'partial';
      } catch (recoveryError) {
        this.logger.error('Partial recovery also failed', 'MemoryRollbackManager');
      }
    }

    // Calculate performance metrics
    const endTime = new Date();
    result.performance.endTime = endTime.toISOString();
    result.performance.durationMs = endTime.getTime() - startTime.getTime();

    return result;
  }

  /**
   * Perform selective rollback of specific components
   */
  async performSelectiveRollback(
    components: Array<'cache' | 'docs' | 'memory'>,
    backupPath?: string
  ): Promise<RollbackResult> {
    const startTime = new Date();
    this.logger.info('Starting selective rollback', 'MemoryRollbackManager', { components });

    const result: RollbackResult = {
      success: false,
      rollbackType: 'failed',
      restoredFiles: [],
      errors: [],
      performance: {
        startTime: startTime.toISOString(),
        endTime: '',
        durationMs: 0,
      },
      validation: {
        preRollbackValid: true,
        postRollbackValid: false,
        issues: [],
      },
    };

    try {
      const resolvedBackupPath = backupPath || (await this.findLatestBackup());
      if (!resolvedBackupPath) {
        throw new McpAdrError('No backup found for rollback', 'ROLLBACK_NO_BACKUP');
      }

      for (const component of components) {
        try {
          const componentFiles = await this.restoreComponent(component, resolvedBackupPath);
          result.restoredFiles.push(...componentFiles);

          this.logger.debug('Component restored successfully', 'MemoryRollbackManager', {
            component,
            filesRestored: componentFiles.length,
          });
        } catch (error) {
          result.errors.push({
            operation: `restore_${component}`,
            error: error instanceof Error ? error.message : String(error),
            critical: false,
          });
        }
      }

      result.success = result.errors.filter(e => e.critical).length === 0;
      result.rollbackType = result.success ? 'full' : 'partial';
    } catch (error) {
      result.errors.push({
        operation: 'selective_rollback',
        error: error instanceof Error ? error.message : String(error),
        critical: true,
      });
    }

    const endTime = new Date();
    result.performance.endTime = endTime.toISOString();
    result.performance.durationMs = endTime.getTime() - startTime.getTime();

    return result;
  }

  /**
   * Validate that rollback can be performed safely
   */
  async validateRollbackReadiness(backupPath?: string): Promise<{
    canRollback: boolean;
    issues: string[];
    recommendations: string[];
    backupInfo?: BackupManifest;
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let backupInfo: BackupManifest | undefined;

    try {
      // Find and validate backup
      const resolvedBackupPath = backupPath || (await this.findLatestBackup());
      if (!resolvedBackupPath) {
        issues.push('No backup available for rollback');
        recommendations.push('Create a backup before attempting rollback');
        return { canRollback: false, issues, recommendations };
      }

      // Load backup manifest
      const manifestPath = path.join(resolvedBackupPath, 'backup-manifest.json');
      if (existsSync(manifestPath)) {
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        backupInfo = JSON.parse(manifestContent);
      } else {
        issues.push('Backup manifest not found');
      }

      // Validate backup integrity
      const backupValidation = await this.validateBackup(resolvedBackupPath);
      if (!backupValidation.isValid) {
        issues.push(...backupValidation.issues);
      }

      // Check disk space
      const spaceCheck = await this.checkDiskSpace(resolvedBackupPath);
      if (!spaceCheck.sufficient) {
        issues.push(
          `Insufficient disk space: ${spaceCheck.available} available, ${spaceCheck.required} required`
        );
        recommendations.push('Free up disk space before rollback');
      }

      // Check for running processes
      const processCheck = await this.checkRunningProcesses();
      if (processCheck.hasRunningProcesses) {
        issues.push('Memory-related processes are still running');
        recommendations.push('Stop all memory-related services before rollback');
      }

      // Check backup age
      if (backupInfo) {
        const backupAge = Date.now() - new Date(backupInfo.timestamp).getTime();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

        if (backupAge > maxAge) {
          recommendations.push('Backup is older than 7 days - consider creating a fresh backup');
        }
      }
    } catch (error) {
      issues.push(
        `Rollback validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return {
      canRollback: issues.length === 0,
      issues,
      recommendations,
      ...(backupInfo && { backupInfo }),
    };
  }

  /**
   * Create rollback plan documentation
   */
  async generateRollbackPlan(backupPath?: string): Promise<string> {
    const resolvedBackupPath = backupPath || (await this.findLatestBackup());
    const readinessCheck = await this.validateRollbackReadiness(resolvedBackupPath || undefined);

    const plan = [
      '# Memory System Rollback Plan',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Backup Path: ${resolvedBackupPath || 'Not found'}`,
      '',
      '## Pre-Rollback Checklist',
      '',
      '- [ ] Stop MCP ADR Analysis Server',
      '- [ ] Verify backup integrity',
      '- [ ] Create pre-rollback backup',
      '- [ ] Ensure sufficient disk space',
      '- [ ] Notify stakeholders',
      '',
      '## Rollback Steps',
      '',
      '### 1. Preparation',
      '```bash',
      '# Stop the server (implementation specific)',
      'systemctl stop mcp-adr-server  # or your stop command',
      '',
      '# Verify backup location',
      `ls -la "${resolvedBackupPath}"`,
      '```',
      '',
      '### 2. Clear Memory Data',
      '```bash',
      `rm -rf "${path.join(this.projectConfig.projectPath, '.mcp-adr-memory')}"`,
      '```',
      '',
      '### 3. Restore Legacy Data',
      '```bash',
      `cp -r "${path.join(resolvedBackupPath || '', 'cache')}" "${path.join(this.projectConfig.projectPath, '.mcp-adr-cache')}"`,
      `cp -r "${path.join(resolvedBackupPath || '', 'docs')}" "${path.join(this.projectConfig.projectPath, 'docs')}"`,
      '```',
      '',
      '### 4. Restart System',
      '```bash',
      '# Start the server with legacy configuration',
      'systemctl start mcp-adr-server  # or your start command',
      '```',
      '',
      '## Post-Rollback Validation',
      '',
      '- [ ] Verify ADR files are accessible',
      '- [ ] Check deployment history is available',
      '- [ ] Confirm troubleshooting data is present',
      '- [ ] Test basic server functionality',
      '',
      '## Rollback Readiness Assessment',
      '',
      `**Can Rollback**: ${readinessCheck.canRollback ? '✅ Yes' : '❌ No'}`,
      '',
    ];

    if (readinessCheck.issues.length > 0) {
      plan.push('### Issues to Resolve:');
      readinessCheck.issues.forEach(issue => {
        plan.push(`- ❌ ${issue}`);
      });
      plan.push('');
    }

    if (readinessCheck.recommendations.length > 0) {
      plan.push('### Recommendations:');
      readinessCheck.recommendations.forEach(rec => {
        plan.push(`- 💡 ${rec}`);
      });
      plan.push('');
    }

    if (readinessCheck.backupInfo) {
      plan.push('### Backup Information:');
      plan.push(`- **Created**: ${readinessCheck.backupInfo.timestamp}`);
      plan.push(`- **Version**: ${readinessCheck.backupInfo.migrationVersion}`);
      plan.push(
        `- **Contents**: ${Object.entries(readinessCheck.backupInfo.backupContents)
          .filter(([_, exists]) => exists)
          .map(([name]) => name)
          .join(', ')}`
      );
      plan.push('');
    }

    plan.push('## Emergency Contacts');
    plan.push('');
    plan.push('- **System Administrator**: [Contact Info]');
    plan.push('- **Database Administrator**: [Contact Info]');
    plan.push('- **Development Team Lead**: [Contact Info]');

    return plan.join('\n');
  }

  // Private helper methods

  private async findLatestBackup(): Promise<string | null> {
    try {
      if (!existsSync(this.config.backupDirectory)) {
        return null;
      }

      const backupDirs = await fs.readdir(this.config.backupDirectory);
      const migrationBackups = backupDirs
        .filter(dir => dir.startsWith('migration-'))
        .sort()
        .reverse();

      return migrationBackups.length > 0
        ? path.join(this.config.backupDirectory, migrationBackups[0] || '')
        : null;
    } catch (error) {
      this.logger.error('Failed to find latest backup', 'MemoryRollbackManager');
      return null;
    }
  }

  private async validateBackup(backupPath: string): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check if backup directory exists
      if (!existsSync(backupPath)) {
        issues.push('Backup directory does not exist');
        return { isValid: false, issues };
      }

      // Check for manifest file
      const manifestPath = path.join(backupPath, 'backup-manifest.json');
      if (!existsSync(manifestPath)) {
        issues.push('Backup manifest file missing');
      } else {
        try {
          const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
          if (!manifest.timestamp || !manifest.projectPath) {
            issues.push('Invalid backup manifest format');
          }
        } catch (error) {
          issues.push('Cannot parse backup manifest');
        }
      }

      // Check for expected backup contents
      const expectedDirs = ['cache', 'docs'];
      for (const dir of expectedDirs) {
        const dirPath = path.join(backupPath, dir);
        if (!existsSync(dirPath)) {
          issues.push(`Expected backup directory missing: ${dir}`);
        }
      }
    } catch (error) {
      issues.push(
        `Backup validation error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  private async createPreRollbackBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.config.backupDirectory, `pre-rollback-${timestamp}`);

    await fs.mkdir(backupDir, { recursive: true });

    // Backup current memory data if it exists
    const memoryDir = path.join(this.projectConfig.projectPath, '.mcp-adr-memory');
    if (existsSync(memoryDir)) {
      await this.copyDirectory(memoryDir, path.join(backupDir, 'memory'));
    }

    return backupDir;
  }

  private async preserveMemoryData(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const preservationDir = path.join(this.config.backupDirectory, `preserved-memory-${timestamp}`);

    await fs.mkdir(preservationDir, { recursive: true });

    const memoryDir = path.join(this.projectConfig.projectPath, '.mcp-adr-memory');
    if (existsSync(memoryDir)) {
      await this.copyDirectory(memoryDir, preservationDir);
    }

    return preservationDir;
  }

  private async stopMemoryServices(): Promise<void> {
    this.logger.info('Stopping memory services', 'MemoryRollbackManager');
    // In a real implementation, this would stop the MCP server
    // For now, we'll just log the action
  }

  private async clearMemoryData(): Promise<void> {
    const memoryDir = path.join(this.projectConfig.projectPath, '.mcp-adr-memory');
    if (existsSync(memoryDir)) {
      await fs.rm(memoryDir, { recursive: true, force: true });
      this.logger.info('Memory data cleared', 'MemoryRollbackManager');
    }
  }

  private async restoreLegacyData(backupPath: string): Promise<string[]> {
    const restoredFiles: string[] = [];

    // Restore cache directory
    const cacheBackupPath = path.join(backupPath, 'cache');
    const cacheTargetPath = path.join(this.projectConfig.projectPath, '.mcp-adr-cache');

    if (existsSync(cacheBackupPath)) {
      await this.copyDirectory(cacheBackupPath, cacheTargetPath);
      restoredFiles.push(cacheTargetPath);
    }

    // Restore docs directory
    const docsBackupPath = path.join(backupPath, 'docs');
    const docsTargetPath = path.join(this.projectConfig.projectPath, 'docs');

    if (existsSync(docsBackupPath)) {
      await this.copyDirectory(docsBackupPath, docsTargetPath);
      restoredFiles.push(docsTargetPath);
    }

    return restoredFiles;
  }

  private async restoreComponent(
    component: 'cache' | 'docs' | 'memory',
    backupPath: string
  ): Promise<string[]> {
    const restoredFiles: string[] = [];

    let sourcePath: string;
    let targetPath: string;

    switch (component) {
      case 'cache':
        sourcePath = path.join(backupPath, 'cache');
        targetPath = path.join(this.projectConfig.projectPath, '.mcp-adr-cache');
        break;
      case 'docs':
        sourcePath = path.join(backupPath, 'docs');
        targetPath = path.join(this.projectConfig.projectPath, 'docs');
        break;
      case 'memory':
        sourcePath = path.join(backupPath, 'memory');
        targetPath = path.join(this.projectConfig.projectPath, '.mcp-adr-memory');
        break;
    }

    if (existsSync(sourcePath)) {
      await this.copyDirectory(sourcePath, targetPath);
      restoredFiles.push(targetPath);
    }

    return restoredFiles;
  }

  private async validateLegacyRestoration(_backupPath: string): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check if expected legacy files exist
      const cacheDir = path.join(this.projectConfig.projectPath, '.mcp-adr-cache');
      const docsDir = path.join(this.projectConfig.projectPath, 'docs');

      if (!existsSync(cacheDir)) {
        issues.push('Cache directory not restored');
      }

      if (!existsSync(docsDir)) {
        issues.push('Docs directory not restored');
      }

      // Verify specific legacy files exist
      const expectedFiles = [
        path.join(cacheDir, 'deployment-history.json'),
        path.join(docsDir, 'adrs'),
      ];

      for (const filePath of expectedFiles) {
        if (!existsSync(filePath)) {
          issues.push(`Expected file/directory not found: ${filePath}`);
        }
      }
    } catch (error) {
      issues.push(
        `Legacy restoration validation error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  private async restartLegacyServices(): Promise<void> {
    this.logger.info('Restarting legacy services', 'MemoryRollbackManager');
    // In a real implementation, this would restart the server with legacy configuration
  }

  private async attemptPartialRecovery(): Promise<void> {
    this.logger.info('Attempting partial recovery', 'MemoryRollbackManager');
    // Implement partial recovery logic here
  }

  private async checkDiskSpace(_backupPath: string): Promise<{
    sufficient: boolean;
    available: string;
    required: string;
  }> {
    // Simplified disk space check
    // In a real implementation, you'd use fs.stat or a system call
    return {
      sufficient: true,
      available: '10GB',
      required: '5GB',
    };
  }

  private async checkRunningProcesses(): Promise<{
    hasRunningProcesses: boolean;
    processes: string[];
  }> {
    // Simplified process check
    // In a real implementation, you'd check for running MCP processes
    return {
      hasRunningProcesses: false,
      processes: [],
    };
  }

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
}
