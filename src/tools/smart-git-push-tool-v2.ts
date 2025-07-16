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
import { join, extname } from 'path';
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
    forceUnsafe = false
  } = args;

  try {
    // Step 1: Get staged files
    const stagedFiles = await getStagedFiles(projectPath);
    
    if (stagedFiles.length === 0) {
      const metricsText = await getDeploymentMetricsSummary(projectPath);
      return {
        content: [{
          type: 'text',
          text: createNoChangesResponse(metricsText)
        }]
      };
    }

    // Step 2: Security scan (unless skipped)
    let securityIssues: SecurityIssue[] = [];
    if (!skipSecurity) {
      securityIssues = await scanForSecurityIssues(stagedFiles, projectPath);
    }

    // Step 3: Check for irrelevant files
    const irrelevantFiles = await checkIrrelevantFiles(stagedFiles);

    // Step 4: Check blocking conditions
    const hasCriticalSecurity = securityIssues.some(issue => issue.severity === 'critical');
    const hasFailedTests = testResults && !testResults.success;
    const shouldBlock = (hasCriticalSecurity || hasFailedTests) && !forceUnsafe;

    if (shouldBlock) {
      return {
        content: [{
          type: 'text',
          text: generateBlockedResponse(securityIssues, irrelevantFiles, testResults)
        }]
      };
    }

    // Step 5: Execute push if not dry run
    if (!dryRun) {
      const pushResult = await executePush(projectPath, branch, message);
      
      // Update deployment history
      await updateDeploymentHistory(projectPath, {
        success: true,
        ...(testResults && { testResults }),
        filesChanged: stagedFiles.length
      });

      return {
        content: [{
          type: 'text',
          text: generateSuccessResponse(
            stagedFiles,
            securityIssues,
            irrelevantFiles,
            testResults,
            pushResult,
            branch
          )
        }]
      };
    } else {
      // Dry run response
      return {
        content: [{
          type: 'text',
          text: generateDryRunResponse(
            stagedFiles,
            securityIssues,
            irrelevantFiles,
            testResults,
            branch
          )
        }]
      };
    }

  } catch (error) {
    // Update deployment history with failure
    await updateDeploymentHistory(projectPath, {
      success: false,
      testResults: testResults || { success: false, testsRun: 0, testsPassed: 0, testsFailed: 0 },
      filesChanged: 0
    });

    throw new McpAdrError(
      'Smart git push failed: ' + jsonSafeError(error),
      'GIT_PUSH_ERROR'
    );
  }
}

/**
 * Get staged files
 */
async function getStagedFiles(projectPath: string): Promise<GitFile[]> {
  try {
    const gitOutput = execSync('git diff --cached --name-status', {
      cwd: projectPath,
      encoding: 'utf8'
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
        } catch (err) {
          // Ignore read errors
        }
      }

      files.push({
        path,
        status: mapGitStatus(status || 'M'),
        content: content || '',
        size
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
    const { analyzeSensitiveContent } = await import('../utils/enhanced-sensitive-detector.js');

    for (const file of files) {
      if (file.status === 'deleted' || !file.content) continue;

      const result = await analyzeSensitiveContent(file.path, file.content);
      
      for (const match of result.matches) {
        // Map to our simplified security issue format
        const severity = match.pattern.severity === 'critical' ? 'critical' :
                        match.pattern.severity === 'high' ? 'high' : 'medium';

        issues.push({
          type: mapPatternToType(match.pattern.name),
          severity,
          file: file.path,
          line: match.line,
          pattern: match.pattern.name,
          recommendation: getSecurityRecommendation(match.pattern.name)
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
    'cache-file': /^(\.(cache|npm|yarn|pnpm)|node_modules|__pycache__|\.pytest_cache)\//
  };

  for (const file of files) {
    if (file.status === 'deleted') continue;

    for (const [reason, pattern] of Object.entries(patterns)) {
      if (pattern.test(file.path)) {
        irrelevant.push({
          path: file.path,
          reason: reason as IrrelevantFile['reason'],
          recommendation: getIrrelevantFileRecommendation(reason)
        });
        break;
      }
    }

    // Check for large files (> 10MB)
    if (file.size > 10 * 1024 * 1024) {
      irrelevant.push({
        path: file.path,
        reason: 'build-artifact',
        recommendation: 'Large file (' + Math.round(file.size / 1024 / 1024) + 'MB) - consider using Git LFS'
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
  const cacheDir = join(projectPath, '.mcp-adr-cache');
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
      testTypes: {}
    },
    successRate: 0,
    testPassRate: 0
  };

  if (existsSync(historyFile)) {
    try {
      history = JSON.parse(readFileSync(historyFile, 'utf8'));
    } catch (error) {
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
        totalRuns > 1 ? (currentAvg * (totalRuns - 1) + result.testResults.duration) / totalRuns : result.testResults.duration;
    }
    
    // Set last test suite if command provided
    if (result.testResults.command) {
      history.testResults.lastTestSuite = result.testResults.command;
    }
  }

  // Calculate rates
  const totalDeploys = history.successful + history.failed;
  history.successRate = totalDeploys > 0 ? 
    Math.round((history.successful / totalDeploys) * 100) : 0;

  const totalTests = history.testResults.totalTestsPassed + history.testResults.totalTestsFailed;
  history.testPassRate = totalTests > 0 ?
    Math.round((history.testResults.totalTestsPassed / totalTests) * 100) : 0;

  // Save updated history
  writeFileSync(historyFile, JSON.stringify(history, null, 2));
}

/**
 * Get deployment metrics summary
 */
async function getDeploymentMetricsSummary(projectPath: string): Promise<string> {
  const historyFile = join(projectPath, '.mcp-adr-cache', 'deploy-history.json');
  
  if (!existsSync(historyFile)) {
    return '- No deployment history available';
  }

  try {
    const history: DeployHistory = JSON.parse(readFileSync(historyFile, 'utf8'));
    
    const lines = [
      '- **Deploy Success Rate**: ' + history.successRate + '% (' + history.successful + '/' + (history.successful + history.failed) + ')',
      '- **Test Pass Rate**: ' + history.testPassRate + '% (' + history.testResults.totalTestsPassed + '/' + (history.testResults.totalTestsPassed + history.testResults.totalTestsFailed) + ')',
      '- **Last Deploy**: ' + (history.lastDeploy ? new Date(history.lastDeploy).toLocaleString() : 'Never') + ' ' + (history.lastDeploySuccess ? '✅' : '❌'),
      '- **Last Test Run**: ' + (history.testResults.lastRun ? new Date(history.testResults.lastRun).toLocaleString() : 'Never') + ' ' + (history.testResults.lastRunSuccess ? '✅' : '❌'),
      '- **Total Tests Executed**: ' + history.testResults.totalTestsRun,
      '- **Avg Test Duration**: ' + (history.testResults.averageDuration ? Math.round(history.testResults.averageDuration) + 's' : 'N/A')
    ];
    
    return lines.join('\n');
  } catch (error) {
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
        encoding: 'utf8'
      });
      output += 'Commit:\n' + commitOutput + '\n\n';
    }
    
    const pushCommand = branch ? 'git push origin ' + branch : 'git push';
    const pushOutput = execSync(pushCommand, {
      cwd: projectPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    output += 'Push:\n' + pushOutput;
    
    return { output, success: true };
  } catch (error) {
    throw new McpAdrError(
      'Git push failed: ' + jsonSafeError(error),
      'GIT_PUSH_FAILED'
    );
  }
}

// Helper functions

function mapGitStatus(status: string): GitFile['status'] {
  switch (status) {
    case 'A': return 'added';
    case 'M': return 'modified';
    case 'D': return 'deleted';
    case 'R': return 'renamed';
    default: return 'modified';
  }
}

function isTextFile(path: string): boolean {
  const textExtensions = [
    '.js', '.ts', '.jsx', '.tsx', '.json', '.md', '.txt', '.yml', '.yaml',
    '.py', '.rb', '.java', '.cs', '.go', '.rs', '.cpp', '.c', '.h', '.hpp',
    '.php', '.html', '.css', '.scss', '.sass', '.less', '.vue', '.svelte'
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
  if (pattern.includes('password')) return 'Never hardcode passwords - use secure credential storage';
  return 'Remove sensitive data and use environment variables';
}

function getIrrelevantFileRecommendation(reason: string): string {
  switch (reason) {
    case 'temp-file': return 'Add to .gitignore - temporary files should not be committed';
    case 'build-artifact': return 'Add to .gitignore - build outputs should not be in source control';
    case 'ide-config': return 'Add to .gitignore - IDE configurations are user-specific';
    case 'log-file': return 'Add to .gitignore - log files should not be committed';
    case 'cache-file': return 'Add to .gitignore - cache files are generated';
    default: return 'Consider adding to .gitignore';
  }
}

// Response generators

function createNoChangesResponse(metricsText: string): string {
  return '# Smart Git Push - No Changes\n\n' +
    '## Status\n' +
    'No staged files found. Use git add to stage files before pushing.\n\n' +
    '## Deployment Metrics\n' +
    metricsText + '\n\n' +
    '## Available Commands\n' +
    '- git add . - Stage all changes\n' +
    '- git add <file> - Stage specific file\n' +
    '- git status - Check current status';
}

function generateBlockedResponse(
  securityIssues: SecurityIssue[],
  _irrelevantFiles: IrrelevantFile[],
  testResults: any
): string {
  let response = '# Smart Git Push - Blocked 🚫\n\n## Push Blocked Due to Critical Issues\n\n';

  if (securityIssues.some(i => i.severity === 'critical')) {
    const criticalIssues = securityIssues.filter(i => i.severity === 'critical').map(issue => 
      '- **' + issue.type + '** in ' + jsonSafeFilePath(issue.file) + (issue.line ? ' (line ' + issue.line + ')' : '') + '\n' +
      '  Pattern: ' + issue.pattern + '\n' +
      '  Fix: ' + issue.recommendation
    ).join('\n\n');
    
    response += '### 🔐 Critical Security Issues Found\n' + criticalIssues + '\n\n';
  }

  if (testResults && !testResults.success) {
    response += '### 🧪 Tests Failed\n' +
      '- **Command**: ' + testResults.command + '\n' +
      '- **Output**:\n' +
      '-------\n' +
      jsonSafeUserInput(testResults.output) + '\n' +
      '-------\n\n';
  }

  response += '## Required Actions\n' +
    '1. Fix all critical security issues\n' +
    '2. Ensure all tests pass\n' +
    '3. Review and fix any warnings\n\n' +
    'Use --forceUnsafe to override (NOT RECOMMENDED)';

  return response;
}

function generateSuccessResponse(
  stagedFiles: GitFile[],
  securityIssues: SecurityIssue[],
  irrelevantFiles: IrrelevantFile[],
  testResults: any,
  pushResult: any,
  branch?: string
): string {
  let response = '# Smart Git Push - Success ✅\n\n' +
    '## Push Summary\n' +
    '- **Branch**: ' + (branch || 'current') + '\n' +
    '- **Files**: ' + stagedFiles.length + ' staged files\n' +
    '- **Security Issues**: ' + securityIssues.length + ' (' + securityIssues.filter(i => i.severity === 'critical').length + ' critical)\n' +
    '- **Irrelevant Files**: ' + irrelevantFiles.length + '\n' +
    '- **Tests**: ' + (testResults ? (testResults.success ? '✅ Passed' : '❌ Failed') : 'Skipped') + '\n\n' +
    '## Deployment Metrics Updated\n' +
    getDeploymentMetricsUpdate() + '\n\n' +
    '## Files Pushed\n' +
    stagedFiles.map(f => '- ' + jsonSafeFilePath(f.path) + ' (' + f.status + ')').join('\n');

  if (securityIssues.length > 0) {
    const nonCriticalIssues = securityIssues.filter(i => i.severity !== 'critical');
    if (nonCriticalIssues.length > 0) {
      response += '\n\n## Security Warnings (Non-Critical)\n' +
        nonCriticalIssues.map(issue => 
          '- **' + issue.type + '** in ' + jsonSafeFilePath(issue.file) + ': ' + issue.recommendation
        ).join('\n');
    }
  }

  if (irrelevantFiles.length > 0) {
    response += '\n\n## Irrelevant Files (Consider .gitignore)\n' +
      irrelevantFiles.map(f => 
        '- ' + jsonSafeFilePath(f.path) + ' (' + f.reason + '): ' + f.recommendation
      ).join('\n');
  }

  response += '\n\n## Git Output\n' +
    '-------\n' +
    jsonSafeUserInput(pushResult.output) + '\n' +
    '-------\n\n' +
    '## Next Steps\n' +
    '- Monitor CI/CD pipeline\n' +
    '- Check deployment status\n' +
    '- Review any warnings above';

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

  let response = '# Smart Git Push - Dry Run 🔍\n\n' +
    '## Analysis Results\n' +
    '- **Files to Push**: ' + stagedFiles.length + '\n' +
    '- **Security Issues**: ' + securityIssues.length + ' (' + securityIssues.filter(i => i.severity === 'critical').length + ' critical)\n' +
    '- **Irrelevant Files**: ' + irrelevantFiles.length + '\n' +
    '- **Would Block**: ' + (wouldBlock ? '❌ Yes' : '✅ No') + '\n\n' +
    '## Staged Files\n' +
    stagedFiles.map(f => '- ' + jsonSafeFilePath(f.path) + ' (' + f.status + ') - ' + f.size + ' bytes').join('\n');

  if (securityIssues.length > 0) {
    response += '\n\n## Security Issues Found\n' +
      securityIssues.map(issue => 
        '- **' + issue.severity.toUpperCase() + '** ' + issue.type + ' in ' + jsonSafeFilePath(issue.file) + (issue.line ? ' (line ' + issue.line + ')' : '') + '\n' +
        '  Fix: ' + issue.recommendation
      ).join('\n');
  } else {
    response += '\n\n## ✅ No Security Issues Found';
  }

  if (irrelevantFiles.length > 0) {
    response += '\n\n## Irrelevant Files Detected\n' +
      irrelevantFiles.map(f => 
        '- ' + jsonSafeFilePath(f.path) + ' (' + f.reason + ')\n' +
        '  ' + f.recommendation
      ).join('\n');
  }

  response += '\n\n## Command to Execute\n' +
    '-------\n' +
    '# Run without dry run to actually push\n' +
    'git push' + (branch ? ' origin ' + branch : '') + '\n' +
    '-------\n\n' +
    '**Note:** This was a dry run. No files were pushed.' +
    (wouldBlock ? '\n⚠️ **Warning**: This push would be BLOCKED due to critical issues.' : '');

  return response;
}

function getDeploymentMetricsUpdate(): string {
  return '- Deploy success rate updated\n' +
    '- Test results recorded\n' +
    '- Metrics available in .mcp-adr-cache/deploy-history.json';
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
      content: [{
        type: 'text',
        text: '# Smart Git Push - Error\n\n**Error**: ' + jsonSafeError(error) + '\n\nPlease check your git configuration and try again.'
      }],
      isError: true
    };
    return validateMcpResponse(errorResponse);
  }
}