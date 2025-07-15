/**
 * Smart Git Push MCP Tool
 * 
 * Intelligent git push with sensitive content and LLM artifact filtering
 * Leverages existing content security tools and git CLI integration
 * 
 * IMPORTANT FOR AI ASSISTANTS: This tool has significant side effects that happen
 * silently during execution. It not only performs git push operations but also:
 * 
 * Side Effects:
 * - Updates TODO task statuses based on file changes
 * - Recalculates project health scores
 * - Performs release readiness analysis
 * - Updates .mcp-adr-cache/todo-data.json
 * - Updates .mcp-adr-cache/project-health-scores.json
 * 
 * Cache Dependencies:
 * - May require: .mcp-adr-cache/todo-data.json (for task updates)
 * - May require: .mcp-adr-cache/project-health-scores.json (for health scoring)
 * 
 * Use this tool when you want both git push AND project state updates.
 */

import { McpAdrError } from '../types/index.js';
import { execSync } from 'child_process';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, basename } from 'path';
import { jsonSafeFilePath, jsonSafeMarkdownList, jsonSafeError, jsonSafeUserInput } from '../utils/json-safe.js';
import { validateMcpResponse } from '../utils/mcp-response-validator.js';
import type { TodoJsonManager } from '../utils/todo-json-manager.js';

interface SmartGitPushArgs {
  branch?: string;
  message?: string;
  skipValidation?: boolean;
  allowedArtifacts?: string[];
  sensitivityLevel?: 'strict' | 'moderate' | 'permissive';
  interactiveMode?: boolean;
  dryRun?: boolean;
  projectPath?: string;
  checkReleaseReadiness?: boolean;
  releaseType?: 'major' | 'minor' | 'patch';
}

interface GitFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  content: string;
  size: number;
}

interface ValidationResult {
  file: string;
  issues: ValidationIssue[];
  suggestions: string[];
  approved: boolean;
}

interface ValidationIssue {
  type: 'sensitive-content' | 'llm-artifact' | 'wrong-location' | 'temporary-file';
  severity: 'error' | 'warning' | 'info';
  message: string;
  pattern?: string;
  line?: number;
}

/**
 * Main smart git push function - MCP Safe Version with Response Validation
 */
async function _smartGitPushInternal(args: SmartGitPushArgs): Promise<any> {
  const {
    branch,
    message,
    skipValidation = false,
    allowedArtifacts = [],
    sensitivityLevel = 'moderate',
    dryRun = false,
    projectPath = process.cwd(),
    checkReleaseReadiness = false,
    releaseType = 'minor'
  } = args;

  try {
    // Step 1: Get staged files using git CLI
    const stagedFiles = await getStagedFiles(projectPath);
    
    // Step 2: Check release readiness if requested
    let releaseReadinessResult = null;
    if (checkReleaseReadiness) {
      try {
        const { analyzeReleaseReadiness } = await import('../utils/release-readiness-detector.js');
        releaseReadinessResult = await analyzeReleaseReadiness({
          projectPath,
          releaseType,
          includeAnalysis: true
        });
        
        // Update deployment readiness score in health scoring system
        try {
          const { ProjectHealthScoring } = await import('../utils/project-health-scoring.js');
          const healthScoring = new ProjectHealthScoring(projectPath);
          
          await healthScoring.updateDeploymentReadinessScore({
            releaseScore: releaseReadinessResult.score,
            milestoneCompletion: releaseReadinessResult.milestones.length > 0 ? 
              releaseReadinessResult.milestones.reduce((sum: number, m: any) => sum + m.completionRate, 0) / releaseReadinessResult.milestones.length : 0.5,
            criticalBlockers: releaseReadinessResult.blockers.filter((b: any) => b.severity === 'error').length,
            warningBlockers: releaseReadinessResult.blockers.filter((b: any) => b.severity === 'warning').length,
            gitHealthScore: releaseReadinessResult.blockers.some((b: any) => b.type === 'unstable-code') ? 30 : 80
          });
        } catch (healthError) {
          // Silently handle health scoring errors
        }
      } catch (error) {
        // Silently handle release readiness analysis errors
      }
      
      // Update TODO tasks based on successful push
      try {
        const { TodoJsonManager } = await import('../utils/todo-json-manager.js');
        const todoManager = new TodoJsonManager(projectPath);
        
        await updateTodoTasksFromGitPush(todoManager, stagedFiles, releaseReadinessResult);
      } catch (todoError) {
        // Silently handle TODO update errors
      }
    }
    
    if (stagedFiles.length === 0) {
      let responseText = `# Smart Git Push - No Changes
          
## Status
No staged files found. Use \`git add\` to stage files before pushing.

## Available Commands
- \`git add .\` - Stage all changes
- \`git add <file>\` - Stage specific file
- \`git status\` - Check current status
`;

      // Add release readiness info if checked
      if (releaseReadinessResult) {
        responseText += `

## Release Readiness Analysis
${jsonSafeUserInput(releaseReadinessResult.summary)}

### Recommendations
${jsonSafeMarkdownList(releaseReadinessResult.recommendations)}

${releaseReadinessResult.isReady ? 
  '✅ **Project is ready for release!** Consider creating a release after staging files.' : 
  '❌ **Project is not ready for release.** Address blockers before proceeding.'
}
`;
      }

      return {
        content: [{
          type: 'text',
          text: responseText
        }]
      };
    }

    // Step 3: Analyze staged files if validation is enabled
    let validationResults: ValidationResult[] = [];
    if (!skipValidation) {
      validationResults = await validateStagedFiles(stagedFiles, {
        sensitivityLevel,
        allowedArtifacts,
        projectPath
      });
    }

    // Step 4: Check for blocking conditions (MCP Safe - No Interactive Mode)
    const issues = validationResults.filter(r => r.issues.length > 0);
    
    // Check if release readiness should block push
    let releaseReadinessBlocked = false;
    if (releaseReadinessResult && !releaseReadinessResult.isReady) {
      const criticalBlockers = releaseReadinessResult.blockers.filter(b => b.severity === 'error');
      if (criticalBlockers.length > 0) {
        releaseReadinessBlocked = true;
      }
    }
    
    // Check for blocking conditions
    const hasBlockingErrors = issues.some(issue => 
      issue.issues.some(i => i.severity === 'error')
    );
    
    const shouldBlock = hasBlockingErrors || releaseReadinessBlocked;
    
    if (shouldBlock && !dryRun) {
      let cancelText = `# Smart Git Push - Blocked

## Validation Issues
Push blocked due to critical issues that must be resolved.

## Issues Found
${issues.map(issue => `

### ${jsonSafeFilePath(issue.file)}
${issue.issues.map(i => `- **${i.severity.toUpperCase()}**: ${jsonSafeUserInput(i.message)}`).join('\n')}

**Suggestions:**
${jsonSafeMarkdownList(issue.suggestions)}
`).join('\n')}
`;

      // Add release readiness info if checked and blocked
      if (releaseReadinessResult && releaseReadinessBlocked) {
        cancelText += `

## Release Readiness Issues
${jsonSafeUserInput(releaseReadinessResult.summary)}

### Critical Blockers
${releaseReadinessResult.blockers.filter(b => b.severity === 'error').map(b => `- **${b.type}**: ${jsonSafeUserInput(b.message)}`).join('\n')}

### Recommendations
${jsonSafeMarkdownList(releaseReadinessResult.recommendations)}
`;
      }

      return {
        content: [{
          type: 'text',
          text: cancelText
        }]
      };
    }

    // Step 5: Execute git push if not dry run
    if (!dryRun) {
      const pushResult = await executePush(projectPath, branch, message);
      
      let successText = `# Smart Git Push - Success ✅

## Push Details
- **Branch**: ${branch || 'current'}
- **Files**: ${stagedFiles.length} staged files
- **Validation**: ${skipValidation ? 'Skipped' : 'Completed'}
- **Issues Found**: ${issues.length}
- **Sensitivity Level**: ${sensitivityLevel}
${checkReleaseReadiness ? `- **Release Readiness**: ${releaseReadinessResult?.isReady ? '✅ Ready' : '❌ Not Ready'}` : ''}

## Files Pushed
${stagedFiles.map(f => `- ${jsonSafeFilePath(f.path)} (${f.status})`).join('\n')}

${issues.length > 0 ? `

## Validation Issues (Auto-Approved)
${issues.map(issue => `

### ${jsonSafeFilePath(issue.file)}
${issue.issues.map(i => `- **${i.severity.toUpperCase()}**: ${jsonSafeUserInput(i.message)}`).join('\n')}
`).join('\n')}
` : ''}

${releaseReadinessResult ? `

## Release Readiness Analysis
${jsonSafeUserInput(releaseReadinessResult.summary)}

### Post-Push Recommendations
${jsonSafeMarkdownList(releaseReadinessResult.recommendations)}

${releaseReadinessResult.isReady ? 
  '🎉 **Congratulations!** This push completed a release-ready state. Consider creating a release tag.' : 
  '📋 **Next Steps**: Address remaining blockers to achieve release readiness.'
}
` : ''}

## Git Output
\`\`\`
${jsonSafeUserInput(pushResult.output)}
\`\`\`

## Next Steps
- Monitor CI/CD pipeline for build status
- Review any deployment processes
- Check for any post-push hooks or workflows
${releaseReadinessResult?.isReady ? '- Consider creating a release tag or publishing' : ''}
`;

      return {
        content: [{
          type: 'text',
          text: successText
        }]
      };
    } else {
      // Dry run - show what would happen
      let dryRunText = `# Smart Git Push - Dry Run 🔍

## Analysis Complete
- **Files to Push**: ${stagedFiles.length}
- **Validation Issues**: ${issues.length}
- **Sensitivity Level**: ${sensitivityLevel}
- **Would Push to**: ${branch || 'current branch'}
${checkReleaseReadiness ? `- **Release Readiness**: ${releaseReadinessResult?.isReady ? '✅ Ready' : '❌ Not Ready'}` : ''}

## Staged Files
${stagedFiles.map(f => `- ${jsonSafeFilePath(f.path)} (${f.status}) - ${f.size} bytes`).join('\n')}

${issues.length > 0 ? `

## Validation Issues Found
${issues.map(issue => `

### ${jsonSafeFilePath(issue.file)}
${issue.issues.map(i => `- **${i.severity.toUpperCase()}**: ${jsonSafeUserInput(i.message)}`).join('\n')}

**Suggestions:**
${jsonSafeMarkdownList(issue.suggestions)}
`).join('\n')}
` : '## ✅ No Validation Issues Found'}

${releaseReadinessResult ? `

## Release Readiness Analysis
${jsonSafeUserInput(releaseReadinessResult.summary)}

### Pre-Push Recommendations
${jsonSafeMarkdownList(releaseReadinessResult.recommendations)}

${releaseReadinessResult.isReady ? 
  '🎉 **Ready for Release!** This push would complete all release requirements.' : 
  '📋 **Release Blockers**: Address these issues before considering this a release.'
}
` : ''}

## Command to Execute
\`\`\`bash
# Run without dry run to actually push
git push${branch ? ` origin ${branch}` : ''}
\`\`\`

**Note:** This was a dry run. No files were actually pushed.
`;

      return {
        content: [{
          type: 'text',
          text: dryRunText
        }]
      };
    }

  } catch (error) {
    throw new McpAdrError(
      `Smart git push failed: ${jsonSafeError(error)}`,
      'GIT_PUSH_ERROR'
    );
  }
}

/**
 * Get staged files using git CLI
 */
async function getStagedFiles(projectPath: string): Promise<GitFile[]> {
  try {
    // Get staged files with status
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
      const path = pathParts.join('\t'); // Handle filenames with tabs
      
      const fullPath = join(projectPath, path);
      let content: string | undefined;
      let size = 0;

      // Read file content if it exists (not for deleted files)
      if (status !== 'D' && existsSync(fullPath)) {
        try {
          const stats = statSync(fullPath);
          size = stats.size;
          
          // Only read content for small files (< 100KB)
          if (size < 100 * 1024) {
            content = readFileSync(fullPath, 'utf8');
          }
        } catch (err) {
          // Silently handle file read errors
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
      `Failed to get staged files: ${jsonSafeError(error)}`,
      'GIT_STATUS_ERROR'
    );
  }
}

/**
 * Map git status codes to readable names
 */
function mapGitStatus(status: string): GitFile['status'] {
  switch (status) {
    case 'A': return 'added';
    case 'M': return 'modified';
    case 'D': return 'deleted';
    case 'R': return 'renamed';
    default: return 'modified';
  }
}

/**
 * Validate staged files for issues
 */
async function validateStagedFiles(
  files: GitFile[],
  options: {
    sensitivityLevel: string;
    allowedArtifacts: string[];
    projectPath: string;
  }
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  for (const file of files) {
    const issues: ValidationIssue[] = [];
    const suggestions: string[] = [];

    // Skip validation for deleted files
    if (file.status === 'deleted') {
      results.push({ file: file.path, issues, suggestions, approved: true });
      continue;
    }

    // 1. Check for sensitive content
    if (file.content) {
      const sensitiveIssues = await checkSensitiveContent(file.content, file.path);
      issues.push(...sensitiveIssues);
    }

    // 2. Check for LLM artifacts
    const llmIssues = await checkLLMArtifacts(file.path, file.content);
    issues.push(...llmIssues);

    // 3. Check location rules
    const locationIssues = await checkLocationRules(file.path, options.allowedArtifacts);
    issues.push(...locationIssues);

    // 4. Generate suggestions
    const fileSuggestions = generateSuggestions(file.path, issues);
    suggestions.push(...fileSuggestions);

    results.push({
      file: file.path,
      issues,
      suggestions,
      approved: issues.length === 0 || issues.every(i => i.severity === 'info')
    });
  }

  return results;
}

/**
 * Check for sensitive content using enhanced sensitive detector
 */
async function checkSensitiveContent(content: string, filePath: string): Promise<ValidationIssue[]> {
  try {
    // Use enhanced sensitive detector
    const { analyzeSensitiveContent } = await import('../utils/enhanced-sensitive-detector.js');
    
    const result = await analyzeSensitiveContent(filePath, content);
    
    // Convert to ValidationIssue format
    const issues: ValidationIssue[] = [];
    
    for (const match of result.matches) {
      issues.push({
        type: 'sensitive-content',
        severity: match.pattern.severity === 'critical' ? 'error' : 
                 match.pattern.severity === 'high' ? 'error' : 
                 match.pattern.severity === 'medium' ? 'warning' : 'info',
        message: `${match.pattern.description}: ${match.match}`,
        pattern: match.pattern.name,
        line: match.line
      });
    }

    return issues;
  } catch (error) {
    // Silently handle sensitive content check errors
    return [];
  }
}

/**
 * Check for LLM artifacts using enhanced detector
 */
async function checkLLMArtifacts(filePath: string, content?: string): Promise<ValidationIssue[]> {
  try {
    // Use enhanced LLM artifact detector
    const { detectLLMArtifacts } = await import('../utils/llm-artifact-detector.js');
    
    const result = detectLLMArtifacts(filePath, content || '');
    
    // Convert to ValidationIssue format
    const issues: ValidationIssue[] = [];
    
    for (const match of result.matches) {
      const issue: ValidationIssue = {
        type: 'llm-artifact',
        severity: match.pattern.severity === 'error' ? 'error' : 
                 match.pattern.severity === 'warning' ? 'warning' : 'info',
        message: `${match.pattern.description}: ${match.match}`,
        pattern: match.pattern.name
      };
      
      if (match.line !== undefined) {
        issue.line = match.line;
      }
      
      issues.push(issue);
    }

    return issues;
  } catch (error) {
    // Silently handle LLM artifact check errors
    return [];
  }
}

/**
 * Check location rules using enhanced location filter
 */
async function checkLocationRules(filePath: string, allowedArtifacts: string[]): Promise<ValidationIssue[]> {
  try {
    // Use enhanced location filter
    const { validateFileLocation } = await import('../utils/location-filter.js');
    
    // Skip if explicitly allowed
    if (allowedArtifacts.includes(basename(filePath)) || allowedArtifacts.includes(filePath)) {
      return [];
    }
    
    const result = validateFileLocation(filePath);
    
    if (!result.isValid) {
      return [{
        type: 'wrong-location',
        severity: result.severity === 'error' ? 'error' : 
                 result.severity === 'warning' ? 'warning' : 'info',
        message: result.message,
        pattern: result.rule?.name || 'location-rule'
      }];
    }

    return [];
  } catch (error) {
    // Silently handle location rule check errors
    return [];
  }
}

/**
 * Generate suggestions for issues
 */
function generateSuggestions(filePath: string, issues: ValidationIssue[]): string[] {
  const suggestions: string[] = [];
  const fileName = basename(filePath);

  for (const issue of issues) {
    switch (issue.type) {
      case 'sensitive-content':
        suggestions.push(`Use content masking tool: analyze_content_security`);
        suggestions.push(`Move sensitive data to environment variables`);
        suggestions.push(`Add ${filePath} to .gitignore if it's config`);
        break;
        
      case 'llm-artifact':
        suggestions.push(`Move ${fileName} to tests/ directory`);
        suggestions.push(`Move ${fileName} to scripts/ directory`);
        suggestions.push(`Add ${filePath} to .gitignore`);
        suggestions.push(`Remove file if it's temporary`);
        break;
        
      case 'wrong-location':
        suggestions.push(`Move ${fileName} to tests/ directory`);
        suggestions.push(`Move ${fileName} to scripts/ directory`);
        suggestions.push(`Move ${fileName} to tools/ directory`);
        break;
    }
  }

  return [...new Set(suggestions)]; // Remove duplicates
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
    
    // Commit if there are staged changes and a message is provided
    if (message) {
      const commitOutput = execSync(`git commit -m "${message}"`, {
        cwd: projectPath,
        encoding: 'utf8'
      });
      output += `Commit:\n${commitOutput}\n\n`;
    }
    
    // Push to the specified branch or current branch
    const pushCommand = branch ? `git push origin ${branch}` : 'git push';
    const pushOutput = execSync(pushCommand, {
      cwd: projectPath,
      encoding: 'utf8'
    });
    output += `Push:\n${pushOutput}`;
    
    return { output, success: true };
  } catch (error) {
    throw new McpAdrError(
      `Git push failed: ${jsonSafeError(error)}`,
      'GIT_PUSH_FAILED'
    );
  }
}

/**
 * Exported smart git push function with JSON-safe content escaping
 */
export async function smartGitPush(args: SmartGitPushArgs): Promise<any> {
  const result = await _smartGitPushInternal(args);
  return validateMcpResponse(result);
}

/**
 * MCP-safe wrapper for smart git push that never throws
 */
export async function smartGitPushMcpSafe(args: SmartGitPushArgs): Promise<any> {
  try {
    const result = await _smartGitPushInternal(args);
    return validateMcpResponse(result);
  } catch (error) {
    // Always return a safe MCP response, never throw
    const errorResponse = {
      content: [{
        type: 'text',
        text: `# Smart Git Push - Error\n\n**Error**: ${jsonSafeError(error)}\n\nPlease check your git configuration and try again.`
      }],
      isError: true
    };
    return validateMcpResponse(errorResponse);
  }
}

/**
 * Update TODO tasks based on successful git push
 */
async function updateTodoTasksFromGitPush(
  todoManager: TodoJsonManager,
  stagedFiles: GitFile[],
  releaseReadinessResult?: any
): Promise<void> {
  try {
    const data = await todoManager.loadTodoData();
    const tasks = Object.values(data.tasks);
    
    // 1. Auto-update tasks based on file changes
    for (const file of stagedFiles) {
      // Look for tasks that mention this file in their title or description
      const relatedTasks = tasks.filter(task => 
        task.title.toLowerCase().includes(basename(file.path).toLowerCase()) ||
        task.description?.toLowerCase().includes(basename(file.path).toLowerCase()) ||
        task.title.toLowerCase().includes(file.path.toLowerCase())
      );
      
      for (const task of relatedTasks) {
        if (task.status === 'pending' || task.status === 'in_progress') {
          // Update to in_progress if pending, or completed if already in_progress
          const newStatus = task.status === 'pending' ? 'in_progress' : 'completed';
          
          await todoManager.updateTask({
            taskId: task.id,
            updates: { 
              status: newStatus,
              notes: `Auto-updated: ${file.path} was ${file.status} in git push`
            },
            reason: `Git push: ${file.path} ${file.status}`,
            triggeredBy: 'tool'
          });
        }
      }
    }
    
    // 2. Create follow-up tasks based on what was pushed
    const followUpTasks = [];
    
    // If documentation files were changed, create review tasks
    const docFiles = stagedFiles.filter(f => 
      f.path.match(/\.(md|txt|rst)$/i) && 
      !f.path.includes('TODO.md')
    );
    
    if (docFiles.length > 0) {
      followUpTasks.push({
        title: `Review updated documentation`,
        description: `Review changes to: ${docFiles.map(f => f.path).join(', ')}`,
        priority: 'medium' as const,
        category: 'documentation',
        tags: ['review', 'documentation']
      });
    }
    
    // If source code was changed, create testing tasks
    const codeFiles = stagedFiles.filter(f => 
      f.path.match(/\.(ts|js|py|java|cs|go|rb|php|swift|kt|rs|cpp|c|h)$/i)
    );
    
    if (codeFiles.length > 0) {
      followUpTasks.push({
        title: `Test changes in ${codeFiles.length} code files`,
        description: `Verify functionality of: ${codeFiles.map(f => f.path).join(', ')}`,
        priority: 'high' as const,
        category: 'testing',
        tags: ['testing', 'verification']
      });
    }
    
    // If release readiness improved, create release tasks
    if (releaseReadinessResult?.isReady) {
      const existingReleaseTasks = tasks.filter(task => 
        task.title.toLowerCase().includes('release') ||
        task.tags?.includes('release')
      );
      
      if (existingReleaseTasks.length === 0) {
        followUpTasks.push({
          title: `Prepare release - all requirements met`,
          description: `Project is now release-ready. Create release tag and publish.`,
          priority: 'critical' as const,
          category: 'release',
          tags: ['release', 'deployment']
        });
      }
    }
    
    // Create follow-up tasks
    for (const taskData of followUpTasks) {
      await todoManager.createTask(taskData);
    }
    
    // 3. Update task metadata with git information
    const now = new Date().toISOString();
    data.metadata.lastGitPush = now;
    data.metadata.lastPushFiles = stagedFiles.map(f => f.path);
    
    await todoManager.saveTodoData(data);
    
  } catch (error) {
    // Silently handle errors to avoid breaking git push
    console.error('Error updating TODO tasks from git push:', error);
  }
}