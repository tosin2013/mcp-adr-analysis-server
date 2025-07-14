/**
 * Smart Git Push MCP Tool
 * 
 * Intelligent git push with sensitive content and LLM artifact filtering
 * Leverages existing content security tools and git CLI integration
 */

import { McpAdrError } from '../types/index.js';
import { execSync } from 'child_process';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';

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
  content?: string;
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
 * Main smart git push function
 */
export async function smartGitPush(args: SmartGitPushArgs): Promise<any> {
  const {
    branch,
    message,
    skipValidation = false,
    allowedArtifacts = [],
    sensitivityLevel = 'moderate',
    interactiveMode = true,
    dryRun = false,
    projectPath = process.cwd(),
    checkReleaseReadiness = false,
    releaseType = 'minor'
  } = args;

  try {
    // Step 1: Check release readiness if requested
    let releaseReadinessResult = null;
    if (checkReleaseReadiness) {
      const { analyzeReleaseReadiness } = await import('../utils/release-readiness-detector.js');
      releaseReadinessResult = await analyzeReleaseReadiness({
        projectPath,
        releaseType,
        includeAnalysis: true
      });
    }

    // Step 2: Get staged files using git CLI
    const stagedFiles = await getStagedFiles(projectPath);
    
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
${releaseReadinessResult.summary}

### Recommendations
${releaseReadinessResult.recommendations.map(r => `- ${r}`).join('\n')}

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

    // Step 4: Handle interactive approval if needed
    const issues = validationResults.filter(r => r.issues.length > 0);
    
    // Check if release readiness should block push
    let releaseReadinessBlocked = false;
    if (releaseReadinessResult && !releaseReadinessResult.isReady) {
      const criticalBlockers = releaseReadinessResult.blockers.filter(b => b.severity === 'error');
      if (criticalBlockers.length > 0) {
        releaseReadinessBlocked = true;
      }
    }

    if ((issues.length > 0 || releaseReadinessBlocked) && interactiveMode) {
      const approvalResult = await handleInteractiveApproval(issues, dryRun);
      if (!approvalResult.proceed) {
        let cancelText = `# Smart Git Push - Cancelled
            
## User Decision
Push cancelled due to validation issues.

## Issues Found
${issues.map(issue => `
### ${issue.file}
${issue.issues.map(i => `- **${i.severity.toUpperCase()}**: ${i.message}`).join('\n')}

**Suggestions:**
${issue.suggestions.map(s => `- ${s}`).join('\n')}
`).join('\n')}
`;

        // Add release readiness info if checked and blocked
        if (releaseReadinessResult && releaseReadinessBlocked) {
          cancelText += `
## Release Readiness Issues
${releaseReadinessResult.summary}

### Critical Blockers
${releaseReadinessResult.blockers.filter(b => b.severity === 'error').map(b => `- **${b.type}**: ${b.message}`).join('\n')}

### Recommendations
${releaseReadinessResult.recommendations.map(r => `- ${r}`).join('\n')}
`;
        }

        return {
          content: [{
            type: 'text',
            text: cancelText
          }]
        };
      }
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
${stagedFiles.map(f => `- ${f.path} (${f.status})`).join('\n')}

${issues.length > 0 ? `
## Validation Issues (Approved)
${issues.map(issue => `
### ${issue.file}
${issue.issues.map(i => `- **${i.severity.toUpperCase()}**: ${i.message}`).join('\n')}
`).join('\n')}
` : ''}

${releaseReadinessResult ? `
## Release Readiness Analysis
${releaseReadinessResult.summary}

### Post-Push Recommendations
${releaseReadinessResult.recommendations.map(r => `- ${r}`).join('\n')}

${releaseReadinessResult.isReady ? 
  '🎉 **Congratulations!** This push completed a release-ready state. Consider creating a release tag.' : 
  '📋 **Next Steps**: Address remaining blockers to achieve release readiness.'
}
` : ''}

## Git Output
\`\`\`
${pushResult.output}
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
${stagedFiles.map(f => `- ${f.path} (${f.status}) - ${f.size} bytes`).join('\n')}

${issues.length > 0 ? `
## Validation Issues Found
${issues.map(issue => `
### ${issue.file}
${issue.issues.map(i => `- **${i.severity.toUpperCase()}**: ${i.message}`).join('\n')}

**Suggestions:**
${issue.suggestions.map(s => `- ${s}`).join('\n')}
`).join('\n')}
` : '## ✅ No Validation Issues Found'}

${releaseReadinessResult ? `
## Release Readiness Analysis
${releaseReadinessResult.summary}

### Pre-Push Recommendations
${releaseReadinessResult.recommendations.map(r => `- ${r}`).join('\n')}

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
      `Smart git push failed: ${error instanceof Error ? error.message : String(error)}`,
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
          console.error(`Warning: Could not read file ${path}:`, err);
        }
      }

      files.push({
        path,
        status: mapGitStatus(status),
        content,
        size
      });
    }

    return files;
  } catch (error) {
    throw new McpAdrError(
      `Failed to get staged files: ${error instanceof Error ? error.message : String(error)}`,
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
    const llmIssues = checkLLMArtifacts(file.path, file.content);
    issues.push(...llmIssues);

    // 3. Check location rules
    const locationIssues = checkLocationRules(file.path, options.allowedArtifacts);
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
    console.error('Sensitive content check failed:', error);
    return [];
  }
}

/**
 * Check for LLM artifacts using enhanced detector
 */
function checkLLMArtifacts(filePath: string, content?: string): ValidationIssue[] {
  try {
    // Use enhanced LLM artifact detector
    const { detectLLMArtifacts } = require('../utils/llm-artifact-detector.js');
    
    const result = detectLLMArtifacts(filePath, content || '');
    
    // Convert to ValidationIssue format
    const issues: ValidationIssue[] = [];
    
    for (const match of result.matches) {
      issues.push({
        type: 'llm-artifact',
        severity: match.pattern.severity === 'error' ? 'error' : 
                 match.pattern.severity === 'warning' ? 'warning' : 'info',
        message: `${match.pattern.description}: ${match.match}`,
        pattern: match.pattern.name,
        line: match.line
      });
    }

    return issues;
  } catch (error) {
    console.error('LLM artifact check failed:', error);
    return [];
  }
}

/**
 * Check location rules using enhanced location filter
 */
function checkLocationRules(filePath: string, allowedArtifacts: string[]): ValidationIssue[] {
  try {
    // Use enhanced location filter
    const { validateFileLocation } = require('../utils/location-filter.js');
    
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
    console.error('Location rule check failed:', error);
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
 * Handle interactive approval using enhanced approval system
 */
async function handleInteractiveApproval(
  issues: ValidationResult[],
  dryRun: boolean
): Promise<{ proceed: boolean; approved: string[] }> {
  try {
    // Use enhanced interactive approval
    const { handleInteractiveApproval } = await import('../utils/interactive-approval.js');
    
    // Convert ValidationResult to ApprovalItem format
    const approvalItems = issues.map(issue => ({
      filePath: issue.file,
      issues: issue.issues.map(i => ({
        type: i.type,
        message: i.message,
        severity: i.severity,
        pattern: i.pattern,
        line: i.line
      })),
      suggestions: issue.suggestions,
      severity: issue.issues.reduce((highest, i) => {
        const severityOrder = { error: 3, warning: 2, info: 1 };
        return severityOrder[i.severity] > severityOrder[highest] ? i.severity : highest;
      }, 'info' as 'error' | 'warning' | 'info'),
      allowedInLocation: true, // Simplified for now
      confidence: 0.8 // Default confidence
    }));
    
    const options = {
      interactiveMode: true,
      autoApproveInfo: false,
      autoRejectErrors: false,
      dryRun,
      batchMode: false
    };
    
    const result = await handleInteractiveApproval(approvalItems, options);
    
    return {
      proceed: result.proceed,
      approved: result.approved
    };
  } catch (error) {
    console.error('Interactive approval failed:', error);
    
    // Fallback to simple approval
    console.log('\n=== Smart Git Push - Validation Issues ===');
    console.log(`Found ${issues.length} files with issues:`);
    
    for (const issue of issues) {
      console.log(`\n${issue.file}:`);
      for (const i of issue.issues) {
        console.log(`  - ${i.severity.toUpperCase()}: ${i.message}`);
      }
    }
    
    if (dryRun) {
      return { proceed: true, approved: [] };
    }
    
    // Auto-approve info and warnings, block errors
    const hasErrors = issues.some(issue => 
      issue.issues.some(i => i.severity === 'error')
    );
    
    return {
      proceed: !hasErrors,
      approved: hasErrors ? [] : issues.map(i => i.file)
    };
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
      `Git push failed: ${error instanceof Error ? error.message : String(error)}`,
      'GIT_PUSH_FAILED'
    );
  }
}

/**
 * Get content type for file analysis
 */
function getContentType(filePath: string): 'code' | 'documentation' | 'configuration' | 'logs' | 'general' {
  const ext = extname(filePath).toLowerCase();
  
  if (['.js', '.ts', '.py', '.java', '.cpp', '.c', '.go', '.rs'].includes(ext)) {
    return 'code';
  }
  
  if (['.md', '.txt', '.rst', '.doc'].includes(ext)) {
    return 'documentation';
  }
  
  if (['.json', '.yaml', '.yml', '.ini', '.conf', '.config'].includes(ext)) {
    return 'configuration';
  }
  
  if (['.log', '.out', '.err'].includes(ext)) {
    return 'logs';
  }
  
  return 'general';
}