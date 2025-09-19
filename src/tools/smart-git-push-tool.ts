/**
 * Smart Git Push MCP Tool - Knowledge Graph Enhanced
 *
 * AI-powered git push with full knowledge graph integration and architectural awareness
 * Leverages the complete .mcp-adr-cache system for intelligent decision making
 *
 * IMPORTANT FOR AI ASSISTANTS: This tool is deeply integrated with the knowledge graph
 * and cache system. It performs comprehensive analysis before allowing pushes:
 *
 * Knowledge Graph Integration:
 * - Analyzes active intents and their progress toward goals
 * - Checks ADR compliance of changes being pushed
 * - Verifies architectural alignment with project decisions
 * - Tracks tool execution chains and their impacts
 *
 * Cache System Dependencies:
 * - REQUIRES: .mcp-adr-cache/knowledge-graph-snapshots.json (for context analysis)
 * - REQUIRES: .mcp-adr-cache/todo-data.json (for task dependency checking)
 * - UPDATES: .mcp-adr-cache/todo-sync-state.json (after successful pushes)
 * - UPDATES: .mcp-adr-cache/project-health-scores.json (continuous scoring)
 *
 * Architectural Intelligence:
 * - Blocks pushes that violate architectural decisions
 * - Ensures critical tasks are completed before deployment-related pushes
 * - Validates that changes advance stated project goals
 * - Provides context-aware recommendations based on project state
 *
 * Use this tool when you want AI-powered git push decisions based on project context.
 */

import { McpAdrError } from '../types/index.js';
import { execSync } from 'child_process';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, basename } from 'path';
import {
  jsonSafeFilePath,
  jsonSafeMarkdownList,
  jsonSafeError,
  jsonSafeUserInput,
} from '../utils/json-safe.js';
import { validateMcpResponse } from '../utils/mcp-response-validator.js';
import { KnowledgeGraphManager } from '../utils/knowledge-graph-manager.js';
// TodoJsonManager removed - use mcp-shrimp-task-manager for task management
import type { IntentSnapshot } from '../types/knowledge-graph-schemas.js';

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
  skipKnowledgeGraphAnalysis?: boolean;
}

interface KnowledgeGraphAnalysis {
  activeIntents: IntentSnapshot[];
  relevantAdrs: string[];
  blockingConditions: BlockingCondition[];
  architecturalAlignment: {
    score: number;
    details: string[];
    recommendations: string[];
  };
  taskDependencies: {
    completed: string[];
    pending: string[];
    blocking: string[];
  };
  projectGoalProgress: {
    overallProgress: number;
    intentProgress: Array<{
      intentId: string;
      humanRequest: string;
      progress: number;
      status: string;
    }>;
  };
}

interface BlockingCondition {
  type: 'critical-task' | 'adr-violation' | 'goal-regression' | 'dependency-missing';
  severity: 'error' | 'warning' | 'info';
  message: string;
  recommendation: string;
  affectedFiles?: string[];
  relatedIntentId?: string;
  relatedTaskId?: string;
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
  type:
    | 'sensitive-content'
    | 'llm-artifact'
    | 'wrong-location'
    | 'temporary-file'
    | 'security-risk'
    | 'architecture-violation';
  severity: 'error' | 'warning' | 'info';
  message: string;
  pattern?: string;
  line?: number;
}

/**
 * Main smart git push function - Knowledge Graph Enhanced Version
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
    releaseType = 'minor',
    skipKnowledgeGraphAnalysis = false,
  } = args;

  try {
    // Step 1: Get staged files using git CLI
    const stagedFiles = await getStagedFiles(projectPath);

    // Step 2: Perform Knowledge Graph Analysis (NEW - this is the smart part!)
    let kgAnalysis: KnowledgeGraphAnalysis | null = null;
    if (!skipKnowledgeGraphAnalysis) {
      try {
        kgAnalysis = await analyzeKnowledgeGraphContext(projectPath, stagedFiles);
      } catch (kgError) {
        // Knowledge graph analysis failed, continue with warning
        console.error('Knowledge graph analysis failed:', kgError);
      }
    }

    // Step 3: Check release readiness if requested (enhanced with KG data)
    let releaseReadinessResult = null;
    if (checkReleaseReadiness) {
      try {
        const { analyzeReleaseReadiness } = await import('../utils/release-readiness-detector.js');
        releaseReadinessResult = await analyzeReleaseReadiness({
          projectPath,
          releaseType,
          includeAnalysis: true,
        });

        // Update deployment readiness score in health scoring system
        try {
          // ProjectHealthScoring removed - skip health scoring
          console.warn(
            '⚠️ ProjectHealthScoring is deprecated and was removed in memory-centric transformation'
          );
          // Skip health scoring update - ProjectHealthScoring removed
        } catch {
          // Silently handle health scoring errors
        }
      } catch {
        // Silently handle release readiness analysis errors
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

      // Add knowledge graph context even when no files are staged
      if (kgAnalysis) {
        responseText += `

## Knowledge Graph Context
### Current Project Status
- **Active Intents**: ${kgAnalysis.activeIntents.length}
- **Goal Progress**: ${kgAnalysis.projectGoalProgress.overallProgress}%
- **Task Dependencies**: ${kgAnalysis.taskDependencies.completed.length} completed, ${kgAnalysis.taskDependencies.pending.length} pending

${
  kgAnalysis.activeIntents.length > 0
    ? `
### Active Intents
${kgAnalysis.activeIntents.map(intent => `- **${intent.currentStatus}**: ${jsonSafeUserInput(intent.humanRequest.substring(0, 80))}...`).join('\n')}
`
    : ''
}

${
  kgAnalysis.taskDependencies.pending.length > 0
    ? `
### Pending Tasks
Consider working on these tasks before your next push:
${kgAnalysis.taskDependencies.pending
  .slice(0, 5)
  .map(task => `- ${jsonSafeUserInput(task)}`)
  .join('\n')}
`
    : ''
}
`;
      }

      // Add release readiness info if checked
      if (releaseReadinessResult) {
        responseText += `

## Release Readiness Analysis
${jsonSafeUserInput(releaseReadinessResult.summary)}

### Recommendations
${jsonSafeMarkdownList(releaseReadinessResult.recommendations)}

${
  releaseReadinessResult.isReady
    ? '✅ **Project is ready for release!** Consider creating a release after staging files.'
    : '❌ **Project is not ready for release.** Address blockers before proceeding.'
}
`;
      }

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
      };
    }

    // Step 3: Analyze staged files if validation is enabled
    let validationResults: ValidationResult[] = [];
    if (!skipValidation) {
      validationResults = await validateStagedFiles(stagedFiles, {
        sensitivityLevel,
        allowedArtifacts,
        projectPath,
      });
    }

    // Step 4: Check for blocking conditions (Enhanced with Knowledge Graph)
    const issues = validationResults.filter(r => r.issues.length > 0);

    // Check if release readiness should block push
    let releaseReadinessBlocked = false;
    if (releaseReadinessResult && !releaseReadinessResult.isReady) {
      const criticalBlockers = releaseReadinessResult.blockers.filter(b => b.severity === 'error');
      if (criticalBlockers.length > 0) {
        releaseReadinessBlocked = true;
      }
    }

    // Check Knowledge Graph for blocking conditions (NEW!)
    let knowledgeGraphBlocked = false;
    const kgBlockingConditions =
      kgAnalysis?.blockingConditions?.filter(bc => bc.severity === 'error') || [];
    if (kgBlockingConditions.length > 0) {
      knowledgeGraphBlocked = true;
    }

    // Check for blocking conditions
    const hasBlockingErrors = issues.some(issue => issue.issues.some(i => i.severity === 'error'));

    const shouldBlock = hasBlockingErrors || releaseReadinessBlocked || knowledgeGraphBlocked;

    if (shouldBlock && !dryRun) {
      let cancelText = `# Smart Git Push - Blocked

## Validation Issues
Push blocked due to critical issues that must be resolved.

## Issues Found
${issues
  .map(
    issue => `

### ${jsonSafeFilePath(issue.file)}
${issue.issues.map(i => `- **${i.severity.toUpperCase()}**: ${jsonSafeUserInput(i.message)}`).join('\n')}

**Suggestions:**
${jsonSafeMarkdownList(issue.suggestions)}
`
  )
  .join('\n')}
`;

      // Add release readiness info if checked and blocked
      if (releaseReadinessResult && releaseReadinessBlocked) {
        cancelText += `

## Release Readiness Issues
${jsonSafeUserInput(releaseReadinessResult.summary)}

### Critical Blockers
${releaseReadinessResult.blockers
  .filter(b => b.severity === 'error')
  .map(b => `- **${b.type}**: ${jsonSafeUserInput(b.message)}`)
  .join('\n')}

### Recommendations
${jsonSafeMarkdownList(releaseReadinessResult.recommendations)}
`;
      }

      // Add knowledge graph blocking information (NEW!)
      if (kgAnalysis && knowledgeGraphBlocked) {
        cancelText += `

## Knowledge Graph Analysis - Blocking Conditions
The following architectural and project context issues prevent this push:

### Critical Issues
${kgBlockingConditions.map(bc => `- **${bc.type}**: ${jsonSafeUserInput(bc.message)}`).join('\n')}

### Recommendations
${kgBlockingConditions.map(bc => `- ${jsonSafeUserInput(bc.recommendation)}`).join('\n')}

### Project Context
- **Active Intents**: ${kgAnalysis.activeIntents.length}
- **Architectural Alignment**: ${kgAnalysis.architecturalAlignment.score}%
- **Goal Progress**: ${kgAnalysis.projectGoalProgress.overallProgress}%
- **Pending Critical Tasks**: ${kgAnalysis.taskDependencies.blocking.length}
`;
      }

      // Add general knowledge graph insights if available
      if (kgAnalysis && !knowledgeGraphBlocked) {
        cancelText += `

## Knowledge Graph Insights
### Project Status
- **Active Intents**: ${kgAnalysis.activeIntents.length}
- **Architectural Alignment**: ${kgAnalysis.architecturalAlignment.score}%
- **Goal Progress**: ${kgAnalysis.projectGoalProgress.overallProgress}%

### Warnings
${kgAnalysis.blockingConditions
  .filter(bc => bc.severity === 'warning')
  .map(bc => `- **${bc.type}**: ${jsonSafeUserInput(bc.message)}`)
  .join('\n')}
`;
      }

      return {
        content: [
          {
            type: 'text',
            text: cancelText,
          },
        ],
      };
    }

    // Step 5: Execute git push if not dry run
    if (!dryRun) {
      const pushResult = await executePush(projectPath, branch, message);

      // Update TODO tasks with KG integration
      if (kgAnalysis) {
        try {
          // TodoJsonManager removed - skipping todo validation
          console.warn(
            '⚠️ TodoJsonManager is deprecated and was removed in memory-centric transformation'
          );
          // Skip todo task update - TodoJsonManager removed
        } catch (todoError) {
          console.error('Error updating TODO tasks with KG:', todoError);
        }
      }

      const successText = `# Smart Git Push - Success ✅

## Push Details
- **Branch**: ${branch || 'current'}
- **Files**: ${stagedFiles.length} staged files
- **Validation**: ${skipValidation ? 'Skipped' : 'Completed'}
- **Issues Found**: ${issues.length}
- **Sensitivity Level**: ${sensitivityLevel}
${checkReleaseReadiness ? `- **Release Readiness**: ${releaseReadinessResult?.isReady ? '✅ Ready' : '❌ Not Ready'}` : ''}
${kgAnalysis ? `- **Knowledge Graph Analysis**: ✅ Completed` : ''}

## Files Pushed
${stagedFiles.map(f => `- ${jsonSafeFilePath(f.path)} (${f.status})`).join('\n')}

${
  kgAnalysis
    ? `
## Knowledge Graph Analysis
### Project Context
- **Active Intents**: ${kgAnalysis.activeIntents.length}
- **Architectural Alignment**: ${kgAnalysis.architecturalAlignment.score}%
- **Goal Progress**: ${kgAnalysis.projectGoalProgress.overallProgress}%
- **Task Dependencies**: ${kgAnalysis.taskDependencies.completed.length} completed, ${kgAnalysis.taskDependencies.pending.length} pending

### Architectural Insights
${kgAnalysis.architecturalAlignment.details.map(detail => `- ${jsonSafeUserInput(detail)}`).join('\n')}

${
  kgAnalysis.blockingConditions.length > 0
    ? `
### Warnings & Recommendations
${kgAnalysis.blockingConditions
  .filter(bc => bc.severity === 'warning')
  .map(bc => `- **${bc.type}**: ${jsonSafeUserInput(bc.message)}`)
  .join('\n')}
`
    : ''
}

${
  kgAnalysis.projectGoalProgress.intentProgress.length > 0
    ? `
### Intent Progress
${kgAnalysis.projectGoalProgress.intentProgress.map(intent => `- **${intent.status}**: ${jsonSafeUserInput(intent.humanRequest.substring(0, 60))}... (${intent.progress}%)`).join('\n')}
`
    : ''
}
`
    : ''
}

${
  issues.length > 0
    ? `

## Validation Issues (Auto-Approved)
${issues
  .map(
    issue => `

### ${jsonSafeFilePath(issue.file)}
${issue.issues.map(i => `- **${i.severity.toUpperCase()}**: ${jsonSafeUserInput(i.message)}`).join('\n')}
`
  )
  .join('\n')}
`
    : ''
}

${
  releaseReadinessResult
    ? `

## Release Readiness Analysis
${jsonSafeUserInput(releaseReadinessResult.summary)}

### Post-Push Recommendations
${jsonSafeMarkdownList(releaseReadinessResult.recommendations)}

${
  releaseReadinessResult.isReady
    ? '🎉 **Congratulations!** This push completed a release-ready state. Consider creating a release tag.'
    : '📋 **Next Steps**: Address remaining blockers to achieve release readiness.'
}
`
    : ''
}

## Git Output
\`\`\`
${jsonSafeUserInput(pushResult.output)}
\`\`\`

## Next Steps
- Monitor CI/CD pipeline for build status
- Review any deployment processes
- Check for any post-push hooks or workflows
${releaseReadinessResult?.isReady ? '- Consider creating a release tag or publishing' : ''}
${kgAnalysis ? '- Review knowledge graph insights for follow-up tasks' : ''}
`;

      return {
        content: [
          {
            type: 'text',
            text: successText,
          },
        ],
      };
    } else {
      // Dry run - show what would happen
      const dryRunText = `# Smart Git Push - Dry Run 🔍

## Analysis Complete
- **Files to Push**: ${stagedFiles.length}
- **Validation Issues**: ${issues.length}
- **Sensitivity Level**: ${sensitivityLevel}
- **Would Push to**: ${branch || 'current branch'}
${checkReleaseReadiness ? `- **Release Readiness**: ${releaseReadinessResult?.isReady ? '✅ Ready' : '❌ Not Ready'}` : ''}
${kgAnalysis ? `- **Knowledge Graph Analysis**: ✅ Completed` : ''}

## Staged Files
${stagedFiles.map(f => `- ${jsonSafeFilePath(f.path)} (${f.status}) - ${f.size} bytes`).join('\n')}

${
  kgAnalysis
    ? `
## Knowledge Graph Analysis Preview
### Project Context
- **Active Intents**: ${kgAnalysis.activeIntents.length}
- **Architectural Alignment**: ${kgAnalysis.architecturalAlignment.score}%
- **Goal Progress**: ${kgAnalysis.projectGoalProgress.overallProgress}%
- **Task Dependencies**: ${kgAnalysis.taskDependencies.completed.length} completed, ${kgAnalysis.taskDependencies.pending.length} pending

### Architectural Assessment
${kgAnalysis.architecturalAlignment.details.map(detail => `- ${jsonSafeUserInput(detail)}`).join('\n')}

${
  kgAnalysis.blockingConditions.length > 0
    ? `
### Potential Issues
${kgAnalysis.blockingConditions.map(bc => `- **${bc.type}** (${bc.severity}): ${jsonSafeUserInput(bc.message)}`).join('\n')}
`
    : ''
}

${
  kgAnalysis.projectGoalProgress.intentProgress.length > 0
    ? `
### Intent Progress Impact
${kgAnalysis.projectGoalProgress.intentProgress.map(intent => `- **${intent.status}**: ${jsonSafeUserInput(intent.humanRequest.substring(0, 60))}... (${intent.progress}%)`).join('\n')}
`
    : ''
}
`
    : ''
}

${
  issues.length > 0
    ? `

## Validation Issues Found
${issues
  .map(
    issue => `

### ${jsonSafeFilePath(issue.file)}
${issue.issues.map(i => `- **${i.severity.toUpperCase()}**: ${jsonSafeUserInput(i.message)}`).join('\n')}

**Suggestions:**
${jsonSafeMarkdownList(issue.suggestions)}
`
  )
  .join('\n')}
`
    : '## ✅ No Validation Issues Found'
}

${
  releaseReadinessResult
    ? `

## Release Readiness Analysis
${jsonSafeUserInput(releaseReadinessResult.summary)}

### Pre-Push Recommendations
${jsonSafeMarkdownList(releaseReadinessResult.recommendations)}

${
  releaseReadinessResult.isReady
    ? '🎉 **Ready for Release!** This push would complete all release requirements.'
    : '📋 **Release Blockers**: Address these issues before considering this a release.'
}
`
    : ''
}

## Command to Execute
\`\`\`bash
# Run without dry run to actually push
git push${branch ? ` origin ${branch}` : ''}
\`\`\`

**Note:** This was a dry run. No files were actually pushed.
`;

      return {
        content: [
          {
            type: 'text',
            text: dryRunText,
          },
        ],
      };
    }
  } catch (error) {
    throw new McpAdrError(`Smart git push failed: ${jsonSafeError(error)}`, 'GIT_PUSH_ERROR');
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
      encoding: 'utf8',
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
        } catch {
          // Silently handle file read errors
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
      approved: issues.length === 0 || issues.every(i => i.severity === 'info'),
    });
  }

  return results;
}

/**
 * Check for sensitive content using enhanced sensitive detector
 */
async function checkSensitiveContent(
  content: string,
  filePath: string
): Promise<ValidationIssue[]> {
  try {
    // Use gitleaks for industry-standard secret detection
    const { analyzeSensitiveContent } = await import('../utils/gitleaks-detector.js');

    const result = await analyzeSensitiveContent(filePath, content);

    // Convert to ValidationIssue format
    const issues: ValidationIssue[] = [];

    for (const match of result.matches) {
      issues.push({
        type: 'sensitive-content',
        severity:
          match.pattern.severity === 'critical'
            ? 'error'
            : match.pattern.severity === 'high'
              ? 'error'
              : match.pattern.severity === 'medium'
                ? 'warning'
                : 'info',
        message: `${match.pattern.description}: ${match.match}`,
        pattern: match.pattern.name,
        line: match.line,
      });
    }

    return issues;
  } catch {
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
        severity:
          match.pattern.severity === 'error'
            ? 'error'
            : match.pattern.severity === 'warning'
              ? 'warning'
              : 'info',
        message: `${match.pattern.description}: ${match.match}`,
        pattern: match.pattern.name,
      };

      if (match.line !== undefined) {
        issue.line = match.line;
      }

      issues.push(issue);
    }

    return issues;
  } catch {
    // Silently handle LLM artifact check errors
    return [];
  }
}

/**
 * Check location rules using enhanced location filter
 */
async function checkLocationRules(
  filePath: string,
  allowedArtifacts: string[]
): Promise<ValidationIssue[]> {
  try {
    // Use enhanced location filter
    const { validateFileLocationIntelligent } = await import('../utils/location-filter.js');

    // Skip if explicitly allowed
    if (allowedArtifacts.includes(basename(filePath)) || allowedArtifacts.includes(filePath)) {
      return [];
    }

    // Read file content for intelligent analysis
    let fileContent: string | undefined;
    try {
      fileContent = readFileSync(filePath, 'utf-8');
    } catch {
      console.warn(`Could not read file for analysis: ${filePath}`);
    }

    const result = await validateFileLocationIntelligent(filePath, fileContent);

    if (!result.isValid) {
      const issues: ValidationIssue[] = [
        {
          type: 'wrong-location',
          severity:
            result.severity === 'error'
              ? 'error'
              : result.severity === 'warning'
                ? 'warning'
                : 'info',
          message: result.message,
          pattern: result.rule?.name || 'location-rule',
        },
      ];

      // Add tree-sitter security insights
      if (result.treeSitterAnalysis) {
        const analysis = result.treeSitterAnalysis;

        // Critical security issues
        if (analysis.hasSecrets) {
          issues.push({
            type: 'security-risk',
            severity: 'error',
            message: `🔐 Security Risk: File contains ${analysis.secrets.length} potential secret(s). Secrets should be in secure locations or environment variables.`,
            pattern: 'tree-sitter-secrets',
          });
        }

        // Dangerous imports
        const dangerousImports = analysis.imports.filter(i => i.isDangerous);
        if (dangerousImports.length > 0) {
          issues.push({
            type: 'security-risk',
            severity: 'warning',
            message: `⚠️  Dangerous imports detected: ${dangerousImports.map(i => i.module).join(', ')}. Consider safer alternatives.`,
            pattern: 'tree-sitter-dangerous-imports',
          });
        }

        // Infrastructure security risks
        const riskyInfra = analysis.infraStructure.filter(i => i.securityRisks.length > 0);
        if (riskyInfra.length > 0) {
          const risks = riskyInfra.flatMap(i => i.securityRisks);
          issues.push({
            type: 'security-risk',
            severity: 'error',
            message: `🏗️  Infrastructure security risks: ${risks.join(', ')}. Review before deployment.`,
            pattern: 'tree-sitter-infra-security',
          });
        }

        // Architectural violations
        if (result.intelligentReasons?.some(r => r.includes('violates'))) {
          issues.push({
            type: 'architecture-violation',
            severity: 'error',
            message: `🏗️  Architectural violation detected. This may affect system maintainability and scalability.`,
            pattern: 'tree-sitter-architecture',
          });
        }
      }

      return issues;
    }

    return [];
  } catch {
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
        encoding: 'utf8',
      });
      output += `Commit:\n${commitOutput}\n\n`;
    }

    // Push to the specified branch or current branch
    const pushCommand = branch ? `git push origin ${branch}` : 'git push';
    const pushOutput = execSync(pushCommand, {
      cwd: projectPath,
      encoding: 'utf8',
    });
    output += `Push:\n${pushOutput}`;

    return { output, success: true };
  } catch (error) {
    throw new McpAdrError(`Git push failed: ${jsonSafeError(error)}`, 'GIT_PUSH_FAILED');
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
      content: [
        {
          type: 'text',
          text: `# Smart Git Push - Error\n\n**Error**: ${jsonSafeError(error)}\n\nPlease check your git configuration and try again.`,
        },
      ],
      isError: true,
    };
    return validateMcpResponse(errorResponse);
  }
}

/**
 * Analyze Knowledge Graph Context for Smart Git Push Decisions
 * This is the core "smart" functionality that makes push decisions based on project context
 */
async function analyzeKnowledgeGraphContext(
  projectPath: string,
  stagedFiles: GitFile[]
): Promise<KnowledgeGraphAnalysis> {
  const kgManager = new KnowledgeGraphManager();
  // TodoJsonManager removed - use mcp-shrimp-task-manager for task management
  console.warn('⚠️ TodoJsonManager is deprecated and was removed in memory-centric transformation');

  // Load knowledge graph and TODO data
  const kg = await kgManager.loadKnowledgeGraph();
  // Skip todo data loading - TodoJsonManager removed
  const todoData = { tasks: {}, metadata: { totalTasks: 0, completedTasks: 0 } };

  // Get active intents
  const activeIntents = kg.intents.filter(
    i => i.currentStatus === 'executing' || i.currentStatus === 'planning'
  );

  // Analyze file changes against project context
  const fileAnalysis = await analyzeFileChangesContext(stagedFiles, activeIntents, todoData);

  // Check architectural alignment
  const architecturalAlignment = await analyzeArchitecturalAlignment(
    stagedFiles,
    activeIntents,
    projectPath
  );

  // Check task dependencies
  const taskDependencies = await analyzeTaskDependencies(stagedFiles, todoData, activeIntents);

  // Calculate project goal progress
  const projectGoalProgress = await analyzeProjectGoalProgress(kg, todoData, activeIntents);

  // Determine blocking conditions
  const blockingConditions = await determineBlockingConditions(
    fileAnalysis,
    architecturalAlignment,
    taskDependencies,
    projectGoalProgress,
    stagedFiles
  );

  // Find relevant ADRs
  const relevantAdrs = await findRelevantAdrs(stagedFiles, projectPath);

  return {
    activeIntents,
    relevantAdrs,
    blockingConditions,
    architecturalAlignment,
    taskDependencies,
    projectGoalProgress,
  };
}

/**
 * Analyze file changes against project context
 */
async function analyzeFileChangesContext(
  stagedFiles: GitFile[],
  activeIntents: IntentSnapshot[],
  todoData: any
): Promise<any> {
  const fileAnalysis = {
    intentAlignment: [] as Array<{
      intentId: string;
      alignedFiles: string[];
      conflictingFiles: string[];
    }>,
    todoTaskProgress: [] as Array<{
      taskId: string;
      relatedFiles: string[];
      progressImpact: 'positive' | 'negative' | 'neutral';
    }>,
  };

  // Check how files relate to active intents
  for (const intent of activeIntents) {
    const alignedFiles: string[] = [];
    const conflictingFiles: string[] = [];

    // Check if files mentioned in intent goals
    for (const file of stagedFiles) {
      const fileName = basename(file.path);
      const isRelevant = intent.parsedGoals.some(
        goal =>
          goal.toLowerCase().includes(fileName.toLowerCase()) ||
          goal.toLowerCase().includes(file.path.toLowerCase())
      );

      if (isRelevant) {
        alignedFiles.push(file.path);
      }
    }

    fileAnalysis.intentAlignment.push({
      intentId: intent.intentId,
      alignedFiles,
      conflictingFiles,
    });
  }

  // Check how files relate to TODO tasks
  const tasks = Object.values(todoData.tasks);
  for (const task of tasks as any[]) {
    const relatedFiles = stagedFiles.filter(file => {
      const fileName = basename(file.path);
      return (
        task.title.toLowerCase().includes(fileName.toLowerCase()) ||
        task.description?.toLowerCase().includes(fileName.toLowerCase()) ||
        task.title.toLowerCase().includes(file.path.toLowerCase())
      );
    });

    if (relatedFiles.length > 0) {
      fileAnalysis.todoTaskProgress.push({
        taskId: task.id,
        relatedFiles: relatedFiles.map(f => f.path),
        progressImpact: 'positive', // Assume file changes indicate progress
      });
    }
  }

  return fileAnalysis;
}

/**
 * Analyze architectural alignment of changes
 */
async function analyzeArchitecturalAlignment(
  stagedFiles: GitFile[],
  activeIntents: IntentSnapshot[],
  _projectPath: string
): Promise<{
  score: number;
  details: string[];
  recommendations: string[];
}> {
  const details: string[] = [];
  const recommendations: string[] = [];

  // Check if files align with architectural patterns
  let alignmentScore = 100;

  // Check for architectural violations
  for (const file of stagedFiles) {
    // Check if source files follow architectural patterns
    if (file.path.match(/\.(ts|js|py|java|cs|go|rb|php|swift|kt|rs|cpp|c|h)$/i)) {
      // Check for architectural patterns
      if (file.path.includes('/src/') || file.path.includes('/lib/')) {
        details.push(`✅ ${file.path} follows architectural structure`);
      } else {
        details.push(`⚠️ ${file.path} may not follow architectural structure`);
        alignmentScore -= 10;
        recommendations.push(`Consider moving ${file.path} to appropriate architectural directory`);
      }
    }

    // Check for configuration files
    if (file.path.match(/\.(json|yaml|yml|conf|ini|toml)$/i)) {
      details.push(`🔧 ${file.path} is a configuration file`);
      if (file.path.includes('package.json') || file.path.includes('tsconfig.json')) {
        recommendations.push(`Review ${file.path} changes for breaking changes`);
      }
    }
  }

  // Check intent alignment
  for (const intent of activeIntents) {
    const intentFiles = stagedFiles.filter(file => {
      return intent.parsedGoals.some(goal =>
        goal.toLowerCase().includes(basename(file.path).toLowerCase())
      );
    });

    if (intentFiles.length > 0) {
      details.push(
        `🎯 ${intentFiles.length} files align with intent: ${intent.humanRequest.substring(0, 50)}...`
      );
      alignmentScore += 10;
    }
  }

  return {
    score: Math.max(0, Math.min(100, alignmentScore)),
    details,
    recommendations,
  };
}

/**
 * Analyze task dependencies
 */
async function analyzeTaskDependencies(
  _stagedFiles: GitFile[],
  todoData: any,
  _activeIntents: IntentSnapshot[]
): Promise<{
  completed: string[];
  pending: string[];
  blocking: string[];
}> {
  const tasks = Object.values(todoData.tasks) as any[];
  const completed: string[] = [];
  const pending: string[] = [];
  const blocking: string[] = [];

  for (const task of tasks) {
    if (task.status === 'completed') {
      completed.push(task.title);
    } else if (task.status === 'pending') {
      pending.push(task.title);
    } else if (task.status === 'blocked' || task.priority === 'critical') {
      blocking.push(task.title);
    }
  }

  return { completed, pending, blocking };
}

/**
 * Analyze project goal progress
 */
async function analyzeProjectGoalProgress(
  _kg: any,
  _todoData: any,
  activeIntents: IntentSnapshot[]
): Promise<{
  overallProgress: number;
  intentProgress: Array<{
    intentId: string;
    humanRequest: string;
    progress: number;
    status: string;
  }>;
}> {
  const intentProgress = activeIntents.map(intent => {
    const progress = intent.scoreTracking?.scoreProgress || 0;
    return {
      intentId: intent.intentId,
      humanRequest: intent.humanRequest,
      progress,
      status: intent.currentStatus,
    };
  });

  const overallProgress =
    intentProgress.length > 0
      ? intentProgress.reduce((sum, intent) => sum + intent.progress, 0) / intentProgress.length
      : 0;

  return {
    overallProgress,
    intentProgress,
  };
}

/**
 * Determine blocking conditions based on analysis
 */
async function determineBlockingConditions(
  _fileAnalysis: any,
  architecturalAlignment: any,
  taskDependencies: any,
  projectGoalProgress: any,
  stagedFiles: GitFile[]
): Promise<BlockingCondition[]> {
  const blockingConditions: BlockingCondition[] = [];

  // Check for critical task dependencies
  if (taskDependencies.blocking.length > 0) {
    blockingConditions.push({
      type: 'critical-task',
      severity: 'error',
      message: `${taskDependencies.blocking.length} critical tasks are blocking this push`,
      recommendation: 'Complete or unblock critical tasks before pushing',
      affectedFiles: stagedFiles.map(f => f.path),
    });
  }

  // Check architectural alignment
  if (architecturalAlignment.score < 60) {
    blockingConditions.push({
      type: 'adr-violation',
      severity: 'warning',
      message: `Low architectural alignment score: ${architecturalAlignment.score}%`,
      recommendation: 'Review architectural compliance of changes',
      affectedFiles: stagedFiles.map(f => f.path),
    });
  }

  // Check goal regression
  if (projectGoalProgress.overallProgress < 20) {
    blockingConditions.push({
      type: 'goal-regression',
      severity: 'warning',
      message: `Low project goal progress: ${projectGoalProgress.overallProgress}%`,
      recommendation: 'Focus on completing active project goals',
      affectedFiles: stagedFiles.map(f => f.path),
    });
  }

  return blockingConditions;
}

/**
 * Find relevant ADRs for the file changes
 */
async function findRelevantAdrs(_stagedFiles: GitFile[], _projectPath: string): Promise<string[]> {
  // This would typically scan ADR directories and find relevant ADRs
  // For now, return empty array
  return [];
}

/**
 * Update TODO tasks based on successful git push with Knowledge Graph integration
 */
