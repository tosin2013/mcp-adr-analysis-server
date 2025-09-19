/**
 * Smart Git Push MCP Tool - Version 2.0 (Clean)
 *
 * A focused git push tool that ensures security and tracks deployment readiness
 *
 * IMPORTANT FOR AI ASSISTANTS: This tool focuses on:
 * 1. Security: Preventing credential leaks and sensitive data exposure
 * 2. Repository Hygiene: Blocking irrelevant files (temp, build artifacts)
 * 3. Deployment Readiness: Tracking real metrics (test failures, deploy success rate)
 *
 * Cache Dependencies:
 * - CREATES/UPDATES: .mcp-adr-cache/deploy-history.json (deployment metrics)
 * - USES: Enhanced sensitive detector for security scanning
 *
 * This tool does NOT:
 * - Analyze architectural compliance
 * - Update TODO tasks
 * - Check knowledge graph intents
 * - Make complex AI decisions
 *
 * Use this tool for safe, metric-driven git pushes.
 */

import { McpAdrError } from '../types/index.js';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'fs';
import { join, extname, basename } from 'path';
import * as os from 'os';
import { jsonSafeFilePath, jsonSafeError, jsonSafeUserInput } from '../utils/json-safe.js';
import { validateMcpResponse } from '../utils/mcp-response-validator.js';

interface SmartGitPushArgs {
  branch?: string;
  message?: string;
  testResults?: TestResults;
  skipSecurity?: boolean;
  dryRun?: boolean;
  projectPath?: string;
  forceUnsafe?: boolean;
  humanOverrides?: HumanOverride[];
  requestHumanConfirmation?: boolean;

  // Deployment Readiness Integration
  checkDeploymentReadiness?: boolean;
  targetEnvironment?: 'staging' | 'production' | 'integration';
  enforceDeploymentReadiness?: boolean;
  strictDeploymentMode?: boolean;
}

interface TestResults {
  success: boolean;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  duration?: number;
  command?: string;
  output?: string;
  failureDetails?: string[];
  testTypes?: Record<string, { passed: number; failed: number }>;
}

interface GitFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  content: string;
  size: number;
}

interface SecurityIssue {
  type: 'credential' | 'api-key' | 'private-key' | 'token' | 'password';
  severity: 'critical' | 'high' | 'medium';
  file: string;
  line?: number;
  pattern: string;
  recommendation: string;
}

interface IrrelevantFile {
  path: string;
  reason: 'temp-file' | 'build-artifact' | 'ide-config' | 'log-file' | 'cache-file';
  recommendation: string;
}

interface HumanOverride {
  path: string;
  purpose: string;
  userConfirmed: boolean;
  timestamp: string;
  overrideReason:
    | 'security-exception'
    | 'business-requirement'
    | 'deployment-necessity'
    | 'temporary-debug'
    | 'other';
  additionalContext?: string;
}

interface FileConfirmationRequest {
  path: string;
  detectedIssue: SecurityIssue | IrrelevantFile;
  suggestedPurpose: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  alternatives: string[];
}

interface DeployHistory {
  successful: number;
  failed: number;
  lastDeploy?: string;
  lastDeploySuccess?: boolean;
  testResults: {
    totalTestsRun: number;
    totalTestsPassed: number;
    totalTestsFailed: number;
    lastRun?: string;
    lastRunSuccess?: boolean;
    averageDuration: number;
    lastTestSuite?: string;
    testTypes: Record<string, { passed: number; failed: number }>;
  };
  successRate: number;
  testPassRate: number;
}

/**
 * Main smart git push function - Security and Metrics Focused
 */
async function smartGitPushV2(args: SmartGitPushArgs): Promise<any> {
  const {
    branch,
    message,
    testResults,
    skipSecurity = false,
    dryRun = false,
    projectPath = process.cwd(),
    forceUnsafe = false,
    humanOverrides = [],
    requestHumanConfirmation = false,
    checkDeploymentReadiness = false,
    targetEnvironment = 'production',
    enforceDeploymentReadiness = false,
    strictDeploymentMode = true,
  } = args;

  try {
    // Step 1: Get staged files
    const stagedFiles = await getStagedFiles(projectPath);

    if (stagedFiles.length === 0) {
      const metricsText = await getDeploymentMetricsSummary(projectPath);
      return {
        content: [
          {
            type: 'text',
            text: createNoChangesResponse(metricsText),
          },
        ],
      };
    }

    // Step 2: Security scan (unless skipped)
    let securityIssues: SecurityIssue[] = [];
    if (!skipSecurity) {
      securityIssues = await scanForSecurityIssues(stagedFiles, projectPath);
    }

    // Step 3: Check for irrelevant files
    const irrelevantFiles = await checkIrrelevantFiles(stagedFiles);

    // Step 4: Apply human overrides to security issues and irrelevant files
    const { filteredSecurityIssues, filteredIrrelevantFiles, confirmationRequests } =
      await applyHumanOverrides(
        securityIssues,
        irrelevantFiles,
        humanOverrides,
        requestHumanConfirmation
      );

    // Step 5: Check for confirmation requests
    if (confirmationRequests.length > 0 && requestHumanConfirmation) {
      return {
        content: [
          {
            type: 'text',
            text: generateConfirmationRequestResponse(confirmationRequests, stagedFiles),
          },
        ],
      };
    }

    // Step 5.5: Deployment Readiness Check (NEW)
    if (checkDeploymentReadiness || enforceDeploymentReadiness) {
      const { deploymentReadiness } = await import('./deployment-readiness-tool.js');

      const readinessCheck = await deploymentReadiness({
        operation: 'full_audit',
        projectPath,
        targetEnvironment,
        strictMode: strictDeploymentMode,

        // Test Gates - Zero tolerance for failures
        maxTestFailures: 0,
        requireTestCoverage: 80,
        blockOnFailingTests: true,

        // Deployment History Gates
        maxRecentFailures: 2,
        deploymentSuccessThreshold: 80,
        blockOnRecentFailures: true,
        rollbackFrequencyThreshold: 20,

        // Integration with existing systems
        integrateTodoTasks: true,
        updateHealthScoring: true,
      });

      // Hard block if deployment is not ready and enforcement is enabled
      if (
        !readinessCheck.isDeploymentReady &&
        (enforceDeploymentReadiness || strictDeploymentMode)
      ) {
        return {
          content: [
            {
              type: 'text',
              text: generateDeploymentReadinessBlockResponse(
                readinessCheck,
                stagedFiles,
                targetEnvironment
              ),
            },
          ],
        };
      }

      // Soft warning if just checking but not enforcing
      if (
        !readinessCheck.isDeploymentReady &&
        checkDeploymentReadiness &&
        !enforceDeploymentReadiness
      ) {
        // Continue with push but include warning in success response
      }
    }

    // Step 6: Check blocking conditions (after overrides)
    const hasCriticalSecurity = filteredSecurityIssues.some(issue => issue.severity === 'critical');
    const hasFailedTests = testResults && !testResults.success;
    const shouldBlock = (hasCriticalSecurity || hasFailedTests) && !forceUnsafe;

    if (shouldBlock) {
      return {
        content: [
          {
            type: 'text',
            text: generateBlockedResponse(
              filteredSecurityIssues,
              filteredIrrelevantFiles,
              testResults,
              humanOverrides
            ),
          },
        ],
      };
    }

    // Step 5: Execute push if not dry run
    if (!dryRun) {
      const pushResult = await executePush(projectPath, branch, message);

      // Update deployment history
      await updateDeploymentHistory(projectPath, {
        success: true,
        ...(testResults && { testResults }),
        filesChanged: stagedFiles.length,
      });

      return {
        content: [
          {
            type: 'text',
            text: generateSuccessResponse(
              stagedFiles,
              filteredSecurityIssues,
              filteredIrrelevantFiles,
              testResults,
              pushResult,
              branch,
              humanOverrides
            ),
          },
        ],
      };
    } else {
      // Dry run response
      return {
        content: [
          {
            type: 'text',
            text: generateDryRunResponse(
              stagedFiles,
              filteredSecurityIssues,
              filteredIrrelevantFiles,
              testResults,
              branch
            ),
          },
        ],
      };
    }
  } catch (error) {
    // Update deployment history with failure
    await updateDeploymentHistory(projectPath, {
      success: false,
      testResults: testResults || { success: false, testsRun: 0, testsPassed: 0, testsFailed: 0 },
      filesChanged: 0,
    });

    throw new McpAdrError('Smart git push failed: ' + jsonSafeError(error), 'GIT_PUSH_ERROR');
  }
}

/**
 * Get staged files
 */
async function getStagedFiles(projectPath: string): Promise<GitFile[]> {
  try {
    const gitOutput = execSync('git diff --cached --name-status', {
      cwd: projectPath,
      encoding: 'utf8',
    });

    if (!gitOutput.trim()) {
      return [];
    }

    const files: GitFile[] = [];
    const lines = gitOutput.trim().split('\n');

    for (const line of lines) {
      const [status, ...pathParts] = line.split('\t');
      const path = pathParts.join('\t');

      const fullPath = join(projectPath, path);
      let content: string | undefined;
      let size = 0;

      if (status !== 'D' && existsSync(fullPath)) {
        try {
          const stats = statSync(fullPath);
          size = stats.size;

          // Only read content for small text files (< 100KB)
          if (size < 100 * 1024 && isTextFile(path)) {
            content = readFileSync(fullPath, 'utf8');
          }
        } catch {
          // Ignore read errors
        }
      }

      files.push({
        path,
        status: mapGitStatus(status || 'M'),
        content: content || '',
        size,
      });
    }

    return files;
  } catch (error) {
    throw new McpAdrError(
      'Failed to get staged files: ' + jsonSafeError(error),
      'GIT_STATUS_ERROR'
    );
  }
}

/**
 * Scan for security issues
 */
async function scanForSecurityIssues(
  files: GitFile[],
  _projectPath: string
): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = [];

  try {
    const { analyzeSensitiveContent } = await import('../utils/gitleaks-detector.js');

    for (const file of files) {
      if (file.status === 'deleted' || !file.content) continue;

      const result = await analyzeSensitiveContent(file.path, file.content);

      for (const match of result.matches) {
        // Map to our simplified security issue format
        const severity =
          match.pattern.severity === 'critical'
            ? 'critical'
            : match.pattern.severity === 'high'
              ? 'high'
              : 'medium';

        issues.push({
          type: mapPatternToType(match.pattern.name),
          severity,
          file: file.path,
          line: match.line,
          pattern: match.pattern.name,
          recommendation: getSecurityRecommendation(match.pattern.name),
        });
      }
    }
  } catch (error) {
    console.error('Security scan error:', error);
  }

  return issues;
}

/**
 * Check for irrelevant files
 */
async function checkIrrelevantFiles(files: GitFile[]): Promise<IrrelevantFile[]> {
  const irrelevant: IrrelevantFile[] = [];

  const patterns = {
    'temp-file': /\.(tmp|temp|cache|swp|swo|swn|bak|backup)$/i,
    'build-artifact': /^(dist|build|out|target|bin|obj)\//,
    'ide-config': /^\.(vscode|idea|eclipse|sublime-|atom|brackets)\//,
    'log-file': /\.(log|logs)$/i,
    'cache-file': /^(\.(cache|npm|yarn|pnpm)|node_modules|__pycache__|\.pytest_cache)\//,
  };

  for (const file of files) {
    if (file.status === 'deleted') continue;

    for (const [reason, pattern] of Object.entries(patterns)) {
      if (pattern.test(file.path)) {
        irrelevant.push({
          path: file.path,
          reason: reason as IrrelevantFile['reason'],
          recommendation: getIrrelevantFileRecommendation(reason),
        });
        break;
      }
    }

    // Check for large files (> 10MB)
    if (file.size > 10 * 1024 * 1024) {
      irrelevant.push({
        path: file.path,
        reason: 'build-artifact',
        recommendation:
          'Large file (' + Math.round(file.size / 1024 / 1024) + 'MB) - consider using Git LFS',
      });
    }
  }

  return irrelevant;
}

/**
 * Update deployment history
 */
async function updateDeploymentHistory(
  projectPath: string,
  result: {
    success: boolean;
    testResults?: TestResults;
    filesChanged: number;
  }
): Promise<void> {
  const projectName = basename(projectPath);
  const cacheDir = join(os.tmpdir(), projectName, 'cache');
  const historyFile = join(cacheDir, 'deploy-history.json');

  // Ensure cache directory exists
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }

  // Load existing history
  let history: DeployHistory = {
    successful: 0,
    failed: 0,
    testResults: {
      totalTestsRun: 0,
      totalTestsPassed: 0,
      totalTestsFailed: 0,
      averageDuration: 0,
      testTypes: {},
    },
    successRate: 0,
    testPassRate: 0,
  };

  if (existsSync(historyFile)) {
    try {
      history = JSON.parse(readFileSync(historyFile, 'utf8'));
    } catch {
      // Ignore parse errors
    }
  }

  // Update history
  if (result.success) {
    history.successful++;
    history.lastDeploy = new Date().toISOString();
    history.lastDeploySuccess = true;
  } else {
    history.failed++;
    history.lastDeploy = new Date().toISOString();
    history.lastDeploySuccess = false;
  }

  // Update test results from AI-provided data
  if (result.testResults) {
    history.testResults.totalTestsRun += result.testResults.testsRun;
    history.testResults.totalTestsPassed += result.testResults.testsPassed;
    history.testResults.totalTestsFailed += result.testResults.testsFailed;
    history.testResults.lastRun = new Date().toISOString();
    history.testResults.lastRunSuccess = result.testResults.success;

    // Update test types tracking
    if (result.testResults.testTypes) {
      for (const [testType, results] of Object.entries(result.testResults.testTypes)) {
        if (!history.testResults.testTypes[testType]) {
          history.testResults.testTypes[testType] = { passed: 0, failed: 0 };
        }
        history.testResults.testTypes[testType].passed += results.passed;
        history.testResults.testTypes[testType].failed += results.failed;
      }
    }

    // Update average duration
    if (result.testResults.duration) {
      const currentAvg = history.testResults.averageDuration || 0;
      const totalRuns = history.successful + history.failed;
      history.testResults.averageDuration =
        totalRuns > 1
          ? (currentAvg * (totalRuns - 1) + result.testResults.duration) / totalRuns
          : result.testResults.duration;
    }

    // Set last test suite if command provided
    if (result.testResults.command) {
      history.testResults.lastTestSuite = result.testResults.command;
    }
  }

  // Calculate rates
  const totalDeploys = history.successful + history.failed;
  history.successRate =
    totalDeploys > 0 ? Math.round((history.successful / totalDeploys) * 100) : 0;

  const totalTests = history.testResults.totalTestsPassed + history.testResults.totalTestsFailed;
  history.testPassRate =
    totalTests > 0 ? Math.round((history.testResults.totalTestsPassed / totalTests) * 100) : 0;

  // Save updated history
  writeFileSync(historyFile, JSON.stringify(history, null, 2));
}

/**
 * Get deployment metrics summary
 */
async function getDeploymentMetricsSummary(projectPath: string): Promise<string> {
  const projectName = basename(projectPath);
  const cacheDir = join(os.tmpdir(), projectName, 'cache');
  const historyFile = join(cacheDir, 'deploy-history.json');

  if (!existsSync(historyFile)) {
    return '- No deployment history available';
  }

  try {
    const history: DeployHistory = JSON.parse(readFileSync(historyFile, 'utf8'));

    const lines = [
      '- **Deploy Success Rate**: ' +
        history.successRate +
        '% (' +
        history.successful +
        '/' +
        (history.successful + history.failed) +
        ')',
      '- **Test Pass Rate**: ' +
        history.testPassRate +
        '% (' +
        history.testResults.totalTestsPassed +
        '/' +
        (history.testResults.totalTestsPassed + history.testResults.totalTestsFailed) +
        ')',
      '- **Last Deploy**: ' +
        (history.lastDeploy ? new Date(history.lastDeploy).toLocaleString() : 'Never') +
        ' ' +
        (history.lastDeploySuccess ? '✅' : '❌'),
      '- **Last Test Run**: ' +
        (history.testResults.lastRun
          ? new Date(history.testResults.lastRun).toLocaleString()
          : 'Never') +
        ' ' +
        (history.testResults.lastRunSuccess ? '✅' : '❌'),
      '- **Total Tests Executed**: ' + history.testResults.totalTestsRun,
      '- **Avg Test Duration**: ' +
        (history.testResults.averageDuration
          ? Math.round(history.testResults.averageDuration) + 's'
          : 'N/A'),
    ];

    return lines.join('\n');
  } catch {
    return '- Error reading deployment history';
  }
}

/**
 * Execute git push
 */
async function executePush(
  projectPath: string,
  branch?: string,
  message?: string
): Promise<{ output: string; success: boolean }> {
  try {
    let output = '';

    if (message) {
      const commitOutput = execSync('git commit -m "' + message + '"', {
        cwd: projectPath,
        encoding: 'utf8',
      });
      output += 'Commit:\n' + commitOutput + '\n\n';
    }

    const pushCommand = branch ? 'git push origin ' + branch : 'git push';
    const pushOutput = execSync(pushCommand, {
      cwd: projectPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    output += 'Push:\n' + pushOutput;

    return { output, success: true };
  } catch (error) {
    throw new McpAdrError('Git push failed: ' + jsonSafeError(error), 'GIT_PUSH_FAILED');
  }
}

// Helper functions

function mapGitStatus(status: string): GitFile['status'] {
  switch (status) {
    case 'A':
      return 'added';
    case 'M':
      return 'modified';
    case 'D':
      return 'deleted';
    case 'R':
      return 'renamed';
    default:
      return 'modified';
  }
}

function isTextFile(path: string): boolean {
  const textExtensions = [
    '.js',
    '.ts',
    '.jsx',
    '.tsx',
    '.json',
    '.md',
    '.txt',
    '.yml',
    '.yaml',
    '.py',
    '.rb',
    '.java',
    '.cs',
    '.go',
    '.rs',
    '.cpp',
    '.c',
    '.h',
    '.hpp',
    '.php',
    '.html',
    '.css',
    '.scss',
    '.sass',
    '.less',
    '.vue',
    '.svelte',
  ];
  return textExtensions.includes(extname(path).toLowerCase());
}

function mapPatternToType(patternName: string): SecurityIssue['type'] {
  if (patternName.includes('api') || patternName.includes('key')) return 'api-key';
  if (patternName.includes('private') || patternName.includes('rsa')) return 'private-key';
  if (patternName.includes('token')) return 'token';
  if (patternName.includes('password') || patternName.includes('pwd')) return 'password';
  return 'credential';
}

function getSecurityRecommendation(pattern: string): string {
  if (pattern.includes('api')) return 'Move API keys to environment variables';
  if (pattern.includes('private')) return 'Never commit private keys - use key management service';
  if (pattern.includes('token')) return 'Use environment variables or secure token storage';
  if (pattern.includes('password'))
    return 'Never hardcode passwords - use secure credential storage';
  return 'Remove sensitive data and use environment variables';
}

function getIrrelevantFileRecommendation(reason: string): string {
  switch (reason) {
    case 'temp-file':
      return 'Add to .gitignore - temporary files should not be committed';
    case 'build-artifact':
      return 'Add to .gitignore - build outputs should not be in source control';
    case 'ide-config':
      return 'Add to .gitignore - IDE configurations are user-specific';
    case 'log-file':
      return 'Add to .gitignore - log files should not be committed';
    case 'cache-file':
      return 'Add to .gitignore - cache files are generated';
    default:
      return 'Consider adding to .gitignore';
  }
}

// Human Override Functions

/**
 * Apply human overrides to security issues and irrelevant files
 */
async function applyHumanOverrides(
  securityIssues: SecurityIssue[],
  irrelevantFiles: IrrelevantFile[],
  humanOverrides: HumanOverride[],
  requestConfirmation: boolean
): Promise<{
  filteredSecurityIssues: SecurityIssue[];
  filteredIrrelevantFiles: IrrelevantFile[];
  confirmationRequests: FileConfirmationRequest[];
}> {
  const confirmationRequests: FileConfirmationRequest[] = [];

  // Filter security issues based on human overrides
  const filteredSecurityIssues = securityIssues.filter(issue => {
    const override = humanOverrides.find(o => o.path === issue.file && o.userConfirmed);
    if (override) {
      return false; // Remove from blocking issues
    }

    // If requesting confirmation and no override exists, create confirmation request
    if (requestConfirmation && !humanOverrides.find(o => o.path === issue.file)) {
      confirmationRequests.push({
        path: issue.file,
        detectedIssue: issue,
        suggestedPurpose: analyzeFilePurpose(issue.file),
        riskLevel: issue.severity as any,
        alternatives: generateAlternatives(issue),
      });
    }

    return true; // Keep issue if no override
  });

  // Filter irrelevant files based on human overrides
  const filteredIrrelevantFiles = irrelevantFiles.filter(file => {
    const override = humanOverrides.find(o => o.path === file.path && o.userConfirmed);
    if (override) {
      return false; // Remove from irrelevant files
    }

    // If requesting confirmation and no override exists, create confirmation request
    if (requestConfirmation && !humanOverrides.find(o => o.path === file.path)) {
      confirmationRequests.push({
        path: file.path,
        detectedIssue: file,
        suggestedPurpose: analyzeFilePurpose(file.path),
        riskLevel: 'medium',
        alternatives: generateAlternatives(file),
      });
    }

    return true; // Keep file if no override
  });

  return {
    filteredSecurityIssues,
    filteredIrrelevantFiles,
    confirmationRequests,
  };
}

/**
 * Analyze file purpose using LLM-style heuristics
 */
function analyzeFilePurpose(filePath: string): string {
  const fileName = filePath.toLowerCase();

  // Configuration files
  if (
    fileName.includes('config') ||
    fileName.endsWith('.config.js') ||
    fileName.endsWith('.config.ts')
  ) {
    return 'Configuration file - may contain environment-specific settings';
  }

  // Build/deployment files
  if (fileName.includes('build') || fileName.includes('dist') || fileName.includes('deploy')) {
    return 'Build or deployment artifact - usually not committed to source control';
  }

  // Development/debug files
  if (fileName.includes('debug') || fileName.includes('test') || fileName.includes('temp')) {
    return 'Development or debugging file - may be temporary';
  }

  // IDE/editor files
  if (
    fileName.includes('.vscode') ||
    fileName.includes('.idea') ||
    fileName.includes('.settings')
  ) {
    return 'IDE/editor configuration - user-specific preferences';
  }

  // Log files
  if (fileName.includes('log') || fileName.endsWith('.log')) {
    return 'Log file - runtime data that changes frequently';
  }

  // Security-related
  if (fileName.includes('key') || fileName.includes('secret') || fileName.includes('credential')) {
    return 'Security-sensitive file - may contain credentials or keys';
  }

  // Cache/temporary
  if (
    fileName.includes('cache') ||
    fileName.includes('node_modules') ||
    fileName.includes('.cache')
  ) {
    return 'Cache or temporary data - generated content';
  }

  return 'Unknown purpose - manual review recommended';
}

/**
 * Generate alternatives for problematic files
 */
function generateAlternatives(issue: SecurityIssue | IrrelevantFile): string[] {
  const alternatives: string[] = [];

  if ('severity' in issue) {
    // Security issue alternatives
    switch (issue.type) {
      case 'api-key':
        alternatives.push('Move to environment variables (.env file)');
        alternatives.push('Use secure credential management service');
        alternatives.push('Store in CI/CD pipeline secrets');
        break;
      case 'private-key':
        alternatives.push('Use key management service (AWS KMS, Azure Key Vault)');
        alternatives.push('Store locally and reference by path');
        alternatives.push('Use certificate-based authentication');
        break;
      case 'token':
        alternatives.push('Generate token at runtime');
        alternatives.push('Use OAuth flow instead of static tokens');
        alternatives.push('Store in secure credential store');
        break;
      default:
        alternatives.push('Use environment variables');
        alternatives.push('External configuration management');
    }
  } else {
    // Irrelevant file alternatives
    switch (issue.reason) {
      case 'build-artifact':
        alternatives.push('Add to .gitignore and rebuild on deployment');
        alternatives.push('Use CI/CD pipeline to generate artifacts');
        alternatives.push('Store in artifact repository (npm, Docker registry)');
        break;
      case 'temp-file':
        alternatives.push('Delete file after use');
        alternatives.push('Add to .gitignore');
        alternatives.push('Use system temp directory');
        break;
      case 'ide-config':
        alternatives.push('Add to .gitignore');
        alternatives.push('Create shared .vscode/settings.json for team settings');
        alternatives.push('Document setup instructions in README');
        break;
      default:
        alternatives.push('Add to .gitignore');
        alternatives.push('Review if file is necessary');
    }
  }

  return alternatives;
}

// Response generators

function createNoChangesResponse(metricsText: string): string {
  return (
    '# Smart Git Push - No Changes\n\n' +
    '## Status\n' +
    'No staged files found. Use git add to stage files before pushing.\n\n' +
    '## Deployment Metrics\n' +
    metricsText +
    '\n\n' +
    '## ⚠️ IMPORTANT: Selective File Staging\n' +
    '**DO NOT USE:** `git add .` or `git add -A` (stages everything including unintended files)\n\n' +
    '**RECOMMENDED APPROACH:**\n' +
    '1. Review changes: `git status` and `git diff`\n' +
    '2. Stage specific files: `git add <specific-file>`\n' +
    '3. Verify staged files: `git diff --cached`\n' +
    '4. Only then commit and push\n\n' +
    '## Safe Commands\n' +
    '- `git status` - Check current status\n' +
    '- `git diff` - See unstaged changes\n' +
    '- `git add <specific-file>` - Stage specific file only\n' +
    '- `git diff --cached` - Review staged changes\n\n' +
    '## 🚀 Deployment Readiness Checklist\n' +
    '- [ ] All tests passing locally\n' +
    '- [ ] Code reviewed and approved\n' +
    '- [ ] No sensitive data in changes\n' +
    '- [ ] Documentation updated if needed\n' +
    '- [ ] Deployment strategy confirmed'
  );
}

/**
 * Generate confirmation request response for human override
 */
function generateConfirmationRequestResponse(
  confirmationRequests: FileConfirmationRequest[],
  stagedFiles: GitFile[]
): string {
  let response =
    '# Smart Git Push - Human Confirmation Required 🤔\n\n' +
    '## Files Requiring Manual Review\n\n' +
    `The LLM has detected ${confirmationRequests.length} files that need your confirmation before proceeding.\n\n`;

  confirmationRequests.forEach((request, index) => {
    const isSecurityIssue = 'severity' in request.detectedIssue;
    const riskEmoji =
      request.riskLevel === 'critical'
        ? '🔴'
        : request.riskLevel === 'high'
          ? '🟠'
          : request.riskLevel === 'medium'
            ? '🟡'
            : '🟢';

    response +=
      `### ${index + 1}. ${jsonSafeFilePath(request.path)} ${riskEmoji}\n\n` +
      `**Detected Issue**: ${isSecurityIssue ? 'Security Risk' : 'Irrelevant File'}\n` +
      `**Risk Level**: ${request.riskLevel.toUpperCase()}\n` +
      `**LLM Analysis**: ${request.suggestedPurpose}\n\n` +
      `**Recommended Alternatives**:\n${request.alternatives.map(alt => `- ${alt}`).join('\n')}\n\n` +
      `**To Override**: Confirm this file's purpose and business justification.\n\n`;
  });

  response +=
    '## Override Instructions\n\n' +
    'To proceed with these files, rerun the command with human overrides:\n\n' +
    '```json\n' +
    '{\n' +
    '  "operation": "smart_git_push",\n' +
    '  "humanOverrides": [\n' +
    confirmationRequests
      .map(
        req =>
          '    {\n' +
          `      "path": "${req.path}",\n` +
          `      "purpose": "YOUR_BUSINESS_JUSTIFICATION_HERE",\n` +
          '      "userConfirmed": true,\n' +
          `      "timestamp": "${new Date().toISOString()}",\n` +
          '      "overrideReason": "business-requirement", // or security-exception, deployment-necessity, etc.\n' +
          '      "additionalContext": "EXPLAIN_WHY_THIS_IS_NECESSARY"\n' +
          '    }'
      )
      .join(',\n') +
    '\n' +
    '  ]\n' +
    '}\n' +
    '```\n\n' +
    '## ⚠️ Important Reminders\n' +
    '- **Only override if you understand the business need**\n' +
    '- **Document the purpose clearly**\n' +
    '- **Consider the security implications**\n' +
    '- **Review alternatives before overriding**\n\n' +
    `**Total staged files**: ${stagedFiles.length} | **Files needing confirmation**: ${confirmationRequests.length}`;

  return response;
}

function generateBlockedResponse(
  securityIssues: SecurityIssue[],
  _irrelevantFiles: IrrelevantFile[],
  testResults: any,
  humanOverrides?: HumanOverride[]
): string {
  let response = '# Smart Git Push - Blocked 🚫\n\n## Push Blocked Due to Critical Issues\n\n';

  if (securityIssues.some(i => i.severity === 'critical')) {
    const criticalIssues = securityIssues
      .filter(i => i.severity === 'critical')
      .map(
        issue =>
          '- **' +
          issue.type +
          '** in ' +
          jsonSafeFilePath(issue.file) +
          (issue.line ? ' (line ' + issue.line + ')' : '') +
          '\n' +
          '  Pattern: ' +
          issue.pattern +
          '\n' +
          '  Fix: ' +
          issue.recommendation
      )
      .join('\n\n');

    response += '### 🔐 Critical Security Issues Found\n' + criticalIssues + '\n\n';
  }

  if (testResults && !testResults.success) {
    response +=
      '### 🧪 Tests Failed\n' +
      '- **Command**: ' +
      testResults.command +
      '\n' +
      '- **Output**:\n' +
      '-------\n' +
      jsonSafeUserInput(testResults.output) +
      '\n' +
      '-------\n\n';
  }

  // Show human override status if provided
  if (humanOverrides && humanOverrides.length > 0) {
    response += '## Human Overrides Applied\n';
    humanOverrides.forEach(override => {
      response +=
        `- **${jsonSafeFilePath(override.path)}**: ${override.purpose}\n` +
        `  Reason: ${override.overrideReason} | Confirmed: ${override.userConfirmed ? '✅' : '❌'}\n`;
    });
    response += '\n';
  }

  response +=
    '## Required Actions\n' +
    '1. Fix all critical security issues\n' +
    '2. Ensure all tests pass\n' +
    '3. Review and fix any warnings\n' +
    '4. OR use human overrides with proper justification\n\n' +
    '## ⚠️ IMPORTANT: File Staging Best Practices\n' +
    '**NEVER USE:** `git add .` or `git add -A` when fixing issues\n' +
    '**RECOMMENDED:**\n' +
    '1. Fix specific issues in specific files\n' +
    '2. Stage only the fixed files: `git add <fixed-file>`\n' +
    '3. Verify changes: `git diff --cached`\n' +
    '4. Re-run smart git push\n\n' +
    '## Human Override Option\n' +
    'If these issues are expected and have business justification:\n' +
    '1. Use `requestHumanConfirmation: true` to get guided override instructions\n' +
    '2. Provide detailed justification for each file\n' +
    '3. Consider security implications carefully\n\n' +
    '🚫 Use --forceUnsafe to override (NOT RECOMMENDED)';

  return response;
}

function generateSuccessResponse(
  stagedFiles: GitFile[],
  securityIssues: SecurityIssue[],
  irrelevantFiles: IrrelevantFile[],
  testResults: any,
  pushResult: any,
  branch?: string,
  humanOverrides?: HumanOverride[]
): string {
  let response =
    '# Smart Git Push - Success ✅\n\n' +
    '## Push Summary\n' +
    '- **Branch**: ' +
    (branch || 'current') +
    '\n' +
    '- **Files**: ' +
    stagedFiles.length +
    ' staged files\n' +
    '- **Security Issues**: ' +
    securityIssues.length +
    ' (' +
    securityIssues.filter(i => i.severity === 'critical').length +
    ' critical)\n' +
    '- **Irrelevant Files**: ' +
    irrelevantFiles.length +
    '\n' +
    '- **Tests**: ' +
    (testResults ? (testResults.success ? '✅ Passed' : '❌ Failed') : 'Skipped') +
    '\n\n' +
    '## Deployment Metrics Updated\n' +
    getDeploymentMetricsUpdate() +
    '\n\n' +
    '## Files Pushed\n' +
    stagedFiles.map(f => '- ' + jsonSafeFilePath(f.path) + ' (' + f.status + ')').join('\n');

  if (securityIssues.length > 0) {
    const nonCriticalIssues = securityIssues.filter(i => i.severity !== 'critical');
    if (nonCriticalIssues.length > 0) {
      response +=
        '\n\n## Security Warnings (Non-Critical)\n' +
        nonCriticalIssues
          .map(
            issue =>
              '- **' +
              issue.type +
              '** in ' +
              jsonSafeFilePath(issue.file) +
              ': ' +
              issue.recommendation
          )
          .join('\n');
    }
  }

  if (irrelevantFiles.length > 0) {
    response +=
      '\n\n## Irrelevant Files (Consider .gitignore)\n' +
      irrelevantFiles
        .map(f => '- ' + jsonSafeFilePath(f.path) + ' (' + f.reason + '): ' + f.recommendation)
        .join('\n');
  }

  // Show human overrides if any were applied
  if (humanOverrides && humanOverrides.length > 0) {
    response +=
      '\n\n## ✅ Human Overrides Applied\n' +
      'The following files were explicitly approved by human override:\n' +
      humanOverrides
        .filter(o => o.userConfirmed)
        .map(
          override =>
            `- **${jsonSafeFilePath(override.path)}**: ${override.purpose}\n` +
            `  Justification: ${override.additionalContext || 'No additional context'}\n` +
            `  Override Reason: ${override.overrideReason}\n` +
            `  Timestamp: ${new Date(override.timestamp).toLocaleString()}`
        )
        .join('\n\n') +
      '\n\n' +
      '📝 **Note**: These overrides have been logged for audit purposes.';
  }

  response +=
    '\n\n## Git Output\n' +
    '-------\n' +
    jsonSafeUserInput(pushResult.output) +
    '\n' +
    '-------\n\n' +
    '## 🚀 Post-Push Deployment Checklist\n' +
    '### Immediate Actions (Next 5 minutes)\n' +
    '- [ ] Monitor CI/CD pipeline status\n' +
    '- [ ] Check automated test results\n' +
    '- [ ] Verify build completion\n' +
    '- [ ] Review any deployment warnings\n\n' +
    '### Deployment Completion (Next 15 minutes)\n' +
    '- [ ] Confirm deployment to staging/production\n' +
    '- [ ] Verify application health checks\n' +
    '- [ ] Test key functionality post-deployment\n' +
    '- [ ] Monitor error rates and performance metrics\n' +
    '- [ ] Update TODO list with deployment status\n\n' +
    '### Documentation & Communication\n' +
    '- [ ] Update deployment notes\n' +
    '- [ ] Notify team of successful deployment\n' +
    '- [ ] Close related tickets/issues\n' +
    '- [ ] Schedule post-deployment review if needed\n\n' +
    '💡 **Tip**: Use the TODO management tool to track deployment completion tasks!';

  return response;
}

function generateDryRunResponse(
  stagedFiles: GitFile[],
  securityIssues: SecurityIssue[],
  irrelevantFiles: IrrelevantFile[],
  testResults: any,
  branch?: string
): string {
  const hasCritical = securityIssues.some(i => i.severity === 'critical');
  const wouldBlock = hasCritical || (testResults && !testResults.success);

  let response =
    '# Smart Git Push - Dry Run 🔍\n\n' +
    '## Analysis Results\n' +
    '- **Files to Push**: ' +
    stagedFiles.length +
    '\n' +
    '- **Security Issues**: ' +
    securityIssues.length +
    ' (' +
    securityIssues.filter(i => i.severity === 'critical').length +
    ' critical)\n' +
    '- **Irrelevant Files**: ' +
    irrelevantFiles.length +
    '\n' +
    '- **Would Block**: ' +
    (wouldBlock ? '❌ Yes' : '✅ No') +
    '\n\n' +
    '## Staged Files\n' +
    stagedFiles
      .map(f => '- ' + jsonSafeFilePath(f.path) + ' (' + f.status + ') - ' + f.size + ' bytes')
      .join('\n');

  if (securityIssues.length > 0) {
    response +=
      '\n\n## Security Issues Found\n' +
      securityIssues
        .map(
          issue =>
            '- **' +
            issue.severity.toUpperCase() +
            '** ' +
            issue.type +
            ' in ' +
            jsonSafeFilePath(issue.file) +
            (issue.line ? ' (line ' + issue.line + ')' : '') +
            '\n' +
            '  Fix: ' +
            issue.recommendation
        )
        .join('\n');
  } else {
    response += '\n\n## ✅ No Security Issues Found';
  }

  if (irrelevantFiles.length > 0) {
    response +=
      '\n\n## Irrelevant Files Detected\n' +
      irrelevantFiles
        .map(
          f => '- ' + jsonSafeFilePath(f.path) + ' (' + f.reason + ')\n' + '  ' + f.recommendation
        )
        .join('\n');
  }

  response +=
    '\n\n## ⚠️ IMPORTANT: Pre-Push Staging Review\n' +
    '**AVOID:** `git add .` or `git add -A` before this tool\n' +
    '**RECOMMENDED:**\n' +
    '1. Review each staged file individually\n' +
    '2. Verify changes: `git diff --cached`\n' +
    '3. Ensure only intended files are staged\n\n' +
    '## Command to Execute\n' +
    '-------\n' +
    '# Run without dry run to actually push\n' +
    'git push' +
    (branch ? ' origin ' + branch : '') +
    '\n' +
    '-------\n\n' +
    '**Note:** This was a dry run. No files were pushed.' +
    (wouldBlock ? '\n⚠️ **Warning**: This push would be BLOCKED due to critical issues.' : '') +
    '\n\n' +
    '## 🚀 Deployment Readiness Assessment\n' +
    (wouldBlock
      ? '❌ **NOT READY** - Fix issues above before deployment'
      : '✅ **READY** - This push appears safe for deployment\n\n' +
        '### Post-Push Checklist\n' +
        '- [ ] Monitor CI/CD pipeline\n' +
        '- [ ] Verify deployment health\n' +
        '- [ ] Update TODO tasks\n' +
        '- [ ] Document deployment notes');

  return response;
}

function getDeploymentMetricsUpdate(): string {
  return (
    '- Deploy success rate updated\n' +
    '- Test results recorded\n' +
    '- Metrics available in .mcp-adr-cache/deploy-history.json'
  );
}

/**
 * Generate deployment readiness block response
 */
function generateDeploymentReadinessBlockResponse(
  readinessResult: any,
  stagedFiles: GitFile[],
  targetEnvironment: string
): string {
  return `🚨 **DEPLOYMENT BLOCKED - Critical Readiness Issues**

## 🎯 Deployment Readiness Assessment
- **Target Environment**: ${targetEnvironment}
- **Deployment Ready**: ❌ **NO**
- **Readiness Score**: ${readinessResult.overallScore || 0}%
- **Confidence Level**: ${readinessResult.confidence || 0}%

## 🧪 Test Validation Issues
${
  readinessResult.testFailureBlockers?.length > 0
    ? `
**Test Failures**: ${readinessResult.testValidationResult?.failureCount || 0} failures detected
**Test Coverage**: ${readinessResult.testValidationResult?.coveragePercentage || 0}% (Required: 80%)

### Critical Test Failures:
${
  readinessResult.testValidationResult?.criticalTestFailures
    ?.map((f: any) => `- ❌ ${f.testSuite}: ${f.testName}`)
    .join('\n') || 'No critical test failures'
}
`
    : '✅ All tests passing'
}

## 📊 Deployment History Issues
${
  readinessResult.deploymentHistoryBlockers?.length > 0
    ? `
**Success Rate**: ${readinessResult.deploymentHistoryAnalysis?.successRate || 0}% (Required: 80%)
**Rollback Rate**: ${readinessResult.deploymentHistoryAnalysis?.rollbackRate || 0}% (Threshold: 20%)

### Recent Failure Patterns:
${
  readinessResult.deploymentHistoryAnalysis?.failurePatterns
    ?.map((p: any) => `- **${p.pattern}**: ${p.frequency} occurrences`)
    .join('\n') || 'No failure patterns detected'
}
`
    : '✅ Deployment history stable'
}

## 🚨 Critical Blockers (Must Fix Before Push)
${
  readinessResult.criticalBlockers
    ?.map(
      (blocker: any) => `
### ${blocker.category.toUpperCase()}: ${blocker.title}
- **Impact**: ${blocker.impact}
- **Resolution Steps**: ${blocker.resolutionSteps?.join(' → ') || 'See deployment readiness tool for details'}
- **Estimated Time**: ${blocker.estimatedResolutionTime || 'Unknown'}
`
    )
    .join('\n') || 'No critical blockers found'
}

## 📁 Staged Files (${stagedFiles.length} files ready to push)
${stagedFiles
  .slice(0, 10)
  .map(file => `- ${file.status}: ${file.path}`)
  .join('\n')}
${stagedFiles.length > 10 ? `\n... and ${stagedFiles.length - 10} more files` : ''}

## 🛠️ Required Actions Before Git Push

### 1. Fix Test Issues
\`\`\`bash
# Run tests and identify failures
npm test

# Check detailed test coverage
npm run test:coverage

# Fix failing tests one by one
\`\`\`

### 2. Address Deployment History
\`\`\`bash
# Review recent deployment failures
# Fix underlying infrastructure issues
# Improve deployment reliability
\`\`\`

### 3. Re-validate Deployment Readiness
\`\`\`bash
# Run comprehensive deployment readiness check
deployment_readiness --operation full_audit --target-environment ${targetEnvironment}
\`\`\`

### 4. Retry Git Push When Ready
\`\`\`bash
# Only retry when all blockers are resolved
smart_git_push --enforce-deployment-readiness --target-environment ${targetEnvironment}
\`\`\`

## ⚠️ Emergency Override (Critical Fixes Only)
If this is a critical security fix or emergency:
\`\`\`bash
# Emergency bypass (requires business justification)
deployment_readiness --operation emergency_override --business-justification "Critical security patch"

# Then retry push with force override
smart_git_push --force-unsafe
\`\`\`

## 📋 Deployment Checklist Integration
${
  readinessResult.todoTasksCreated?.length > 0
    ? `
**Auto-Generated Tasks**: ${readinessResult.todoTasksCreated.length} tasks created
Use \`manage_todo_v2 --operation get_tasks\` to view blocking tasks.
`
    : 'No automatic tasks created'
}

**❌ GIT PUSH BLOCKED UNTIL ALL CRITICAL ISSUES ARE RESOLVED**

This blocking is enforced to prevent failed deployments and protect ${targetEnvironment} environment stability.`;
}

/**
 * Exported smart git push function
 */
export async function smartGitPush(args: SmartGitPushArgs): Promise<any> {
  const result = await smartGitPushV2(args);
  return validateMcpResponse(result);
}

/**
 * MCP-safe wrapper
 */
export async function smartGitPushMcpSafe(args: SmartGitPushArgs): Promise<any> {
  try {
    return await smartGitPush(args);
  } catch (error) {
    const errorResponse = {
      content: [
        {
          type: 'text',
          text:
            '# Smart Git Push - Error\n\n**Error**: ' +
            jsonSafeError(error) +
            '\n\nPlease check your git configuration and try again.',
        },
      ],
      isError: true,
    };
    return validateMcpResponse(errorResponse);
  }
}
