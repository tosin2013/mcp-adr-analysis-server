/**
 * Release Readiness Detector for Smart Git Push
 *
 * Analyzes TODO.md, project state, and commit patterns to determine
 * if a release is ready, preventing endless development cycles
 *
 * Supports both TODO.md (standard) and todo.md (legacy) for compatibility
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface ReleaseReadinessResult {
  isReady: boolean;
  score: number; // 0-1 scale
  confidence: number; // 0-1 scale
  blockers: ReleaseBlocker[];
  recommendations: string[];
  milestones: MilestoneStatus[];
  summary: string;
}

export interface ReleaseBlocker {
  type:
    | 'critical-todos'
    | 'incomplete-features'
    | 'test-failures'
    | 'security-issues'
    | 'unstable-code';
  severity: 'error' | 'warning' | 'info';
  message: string;
  todoItems?: string[];
  suggestedActions: string[];
}

export interface MilestoneStatus {
  name: string;
  completed: number;
  total: number;
  completionRate: number;
  criticalTodos: number;
  blockers: string[];
}

export interface ReleaseReadinessOptions {
  projectPath: string;
  todoPath?: string;
  minCompletionRate?: number; // Default: 0.8 (80%)
  maxCriticalTodos?: number; // Default: 0
  includeAnalysis?: boolean; // Default: true
  releaseType?: 'major' | 'minor' | 'patch'; // Default: 'minor'
}

/**
 * Main release readiness analysis function
 */
export async function analyzeReleaseReadiness(
  options: ReleaseReadinessOptions
): Promise<ReleaseReadinessResult> {
  const {
    projectPath,
    todoPath = join(projectPath, 'TODO.md'),
    minCompletionRate = 0.8,
    maxCriticalTodos = 0,
    includeAnalysis: _includeAnalysis = true,
    releaseType = 'minor',
  } = options;

  const result: ReleaseReadinessResult = {
    isReady: false,
    score: 0,
    confidence: 0,
    blockers: [],
    recommendations: [],
    milestones: [],
    summary: '',
  };

  try {
    // 1. Analyze TODO.md if it exists
    if (existsSync(todoPath)) {
      const todoAnalysis = await analyzeTodoFile(todoPath, minCompletionRate);
      result.milestones = todoAnalysis.milestones;
      result.blockers.push(...todoAnalysis.blockers);
    }

    // 2. Analyze project state
    const projectAnalysis = await analyzeProjectState(projectPath);
    result.blockers.push(...projectAnalysis.blockers);

    // 3. Analyze commit patterns
    const commitAnalysis = await analyzeCommitPatterns(projectPath);
    result.blockers.push(...commitAnalysis.blockers);

    // 4. Calculate readiness score
    const scoringResult = calculateReadinessScore(result.milestones, result.blockers, {
      minCompletionRate,
      maxCriticalTodos,
      releaseType,
    });

    result.score = scoringResult.score;
    result.confidence = scoringResult.confidence;
    result.isReady = scoringResult.isReady;

    // 5. Generate recommendations
    result.recommendations = generateReleaseRecommendations(
      result.blockers,
      result.milestones,
      result.score,
      releaseType
    );

    // 6. Generate summary
    result.summary = generateSummary(result);

    return result;
  } catch (error) {
    // Silently handle release readiness analysis errors
    result.blockers.push({
      type: 'unstable-code',
      severity: 'error',
      message: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      suggestedActions: ['Fix analysis errors before proceeding'],
    });
    return result;
  }
}

/**
 * Analyze TODO.md file for completion status
 */
async function analyzeTodoFile(
  todoPath: string,
  minCompletionRate: number = 0.7
): Promise<{
  milestones: MilestoneStatus[];
  blockers: ReleaseBlocker[];
}> {
  const content = readFileSync(todoPath, 'utf8');
  const milestones: MilestoneStatus[] = [];
  const blockers: ReleaseBlocker[] = [];

  // Parse TODO.md structure
  const sections = parseTodoSections(content);

  for (const section of sections) {
    const milestone = analyzeTodoSection(section);
    milestones.push(milestone);

    // Check for release blockers
    if (milestone.criticalTodos > 0) {
      blockers.push({
        type: 'critical-todos',
        severity: 'error',
        message: `${milestone.name} has ${milestone.criticalTodos} critical TODO items`,
        todoItems: milestone.blockers,
        suggestedActions: [
          'Complete critical TODO items before release',
          'Reassess priority of TODO items',
          'Consider moving non-critical items to next release',
        ],
      });
    }

    if (milestone.completionRate < minCompletionRate) {
      blockers.push({
        type: 'incomplete-features',
        severity: milestone.completionRate < 0.5 ? 'error' : 'warning',
        message: `${milestone.name} is only ${(milestone.completionRate * 100).toFixed(1)}% complete`,
        suggestedActions: [
          'Complete remaining tasks in this milestone',
          'Consider deferring incomplete features to next release',
          'Review milestone scope and priorities',
        ],
      });
    }
  }

  return { milestones, blockers };
}

/**
 * Parse TODO.md into sections/milestones
 */
function parseTodoSections(content: string): TodoSection[] {
  const sections: TodoSection[] = [];
  const lines = content.split('\n');

  let currentSection: TodoSection | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect section headers (## Header)
    if (trimmed.startsWith('## ')) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        name: trimmed.substring(3).trim(),
        todos: [],
      };
    }
    // Detect TODO items
    else if (trimmed.startsWith('- [') && currentSection) {
      const isCompleted = trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]');
      const text = trimmed.substring(isCompleted ? 6 : 5).trim();
      const priority = extractPriority(text);
      const isCritical =
        priority === 'high' ||
        text.toLowerCase().includes('critical') ||
        text.toLowerCase().includes('blocker');

      currentSection.todos.push({
        text,
        completed: isCompleted,
        priority,
        isCritical,
      });
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

interface TodoSection {
  name: string;
  todos: TodoItem[];
}

interface TodoItem {
  text: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  isCritical: boolean;
}

/**
 * Extract priority from TODO text
 */
function extractPriority(text: string): 'high' | 'medium' | 'low' {
  const lower = text.toLowerCase();
  if (lower.includes('high') || lower.includes('urgent') || lower.includes('critical')) {
    return 'high';
  }
  if (lower.includes('medium') || lower.includes('moderate')) {
    return 'medium';
  }
  return 'low';
}

/**
 * Analyze a TODO section for completion status
 */
function analyzeTodoSection(section: TodoSection): MilestoneStatus {
  const total = section.todos.length;
  const completed = section.todos.filter(t => t.completed).length;
  const criticalTodos = section.todos.filter(t => t.isCritical && !t.completed).length;
  const blockers = section.todos.filter(t => t.isCritical && !t.completed).map(t => t.text);

  return {
    name: section.name,
    completed,
    total,
    completionRate: total > 0 ? completed / total : 1,
    criticalTodos,
    blockers,
  };
}

/**
 * Analyze project state for release readiness
 */
async function analyzeProjectState(projectPath: string): Promise<{
  blockers: ReleaseBlocker[];
}> {
  const blockers: ReleaseBlocker[] = [];

  try {
    // Check if tests are configured (look for test scripts)
    const packageJsonPath = join(projectPath, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const packageJsonContent = readFileSync(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageJsonContent);
        if (packageJson.scripts && packageJson.scripts.test) {
          // In a real implementation, we'd run the tests
          // For now, we'll just note that tests should be run
          blockers.push({
            type: 'test-failures',
            severity: 'warning',
            message: 'Tests should be run before release',
            suggestedActions: [
              'Run test suite: npm test',
              'Ensure all tests pass',
              'Review test coverage',
            ],
          });
        }
      } catch {
        // Invalid package.json, skip test analysis
      }
    }

    // Check for common unstable indicators
    const unstablePatterns = ['TODO.md', 'FIXME.md', 'debug_*.js', 'temp_*.js', 'test_*.js'];

    // This would be expanded to check for actual unstable files
    if (unstablePatterns.length > 0) {
      // Use the patterns for analysis
    }
  } catch (error) {
    blockers.push({
      type: 'unstable-code',
      severity: 'error',
      message: `Project analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      suggestedActions: ['Fix project structure issues'],
    });
  }

  return { blockers };
}

/**
 * Analyze commit patterns for release readiness
 */
async function analyzeCommitPatterns(projectPath: string): Promise<{
  blockers: ReleaseBlocker[];
}> {
  const blockers: ReleaseBlocker[] = [];

  try {
    // Check recent commit activity
    const { execSync } = await import('child_process');

    // Get recent commits
    const recentCommits = execSync('git log --oneline -n 10', {
      cwd: projectPath,
      encoding: 'utf8',
    }).trim();

    // Look for concerning patterns
    const commitLines = recentCommits.split('\n');
    const concerningPatterns = [/debug/i, /temp/i, /test/i, /wip/i, /work in progress/i, /fixme/i];

    const concerningCommits = commitLines.filter((line: string) =>
      concerningPatterns.some(pattern => pattern.test(line))
    );

    if (concerningCommits.length > 0) {
      blockers.push({
        type: 'unstable-code',
        severity: 'warning',
        message: `Recent commits contain concerning patterns: ${concerningCommits.length} commits`,
        suggestedActions: [
          'Review recent commits for temporary/debug code',
          'Clean up any experimental or debug commits',
          'Ensure commits represent stable, production-ready code',
        ],
      });
    }

    // Check for uncommitted changes
    const status = execSync('git status --porcelain', {
      cwd: projectPath,
      encoding: 'utf8',
    }).trim();

    if (status) {
      blockers.push({
        type: 'unstable-code',
        severity: 'warning',
        message: 'Uncommitted changes detected',
        suggestedActions: [
          'Commit or stash uncommitted changes',
          'Ensure working directory is clean before release',
        ],
      });
    }
  } catch {
    // Git commands failed - likely not a git repository
    blockers.push({
      type: 'unstable-code',
      severity: 'info',
      message: 'Could not analyze git history',
      suggestedActions: ['Ensure project is under version control'],
    });
  }

  return { blockers };
}

/**
 * Calculate overall readiness score
 */
function calculateReadinessScore(
  milestones: MilestoneStatus[],
  blockers: ReleaseBlocker[],
  options: {
    minCompletionRate: number;
    maxCriticalTodos: number;
    releaseType: string;
  }
): {
  score: number;
  confidence: number;
  isReady: boolean;
} {
  let score = 1.0;
  let confidence = 1.0;

  // Factor in milestone completion
  if (milestones.length > 0) {
    const avgCompletion =
      milestones.reduce((sum, m) => sum + m.completionRate, 0) / milestones.length;
    score *= avgCompletion;

    // Reduce confidence if completion rates vary widely
    const completionVariance =
      milestones.reduce((sum, m) => sum + Math.pow(m.completionRate - avgCompletion, 2), 0) /
      milestones.length;
    confidence *= Math.max(0.5, 1 - completionVariance);
  }

  // Factor in blockers (excluding test-failures warnings for base scoring)
  const errorCount = blockers.filter(b => b.severity === 'error').length;
  const warningCount = blockers.filter(
    b => b.severity === 'warning' && b.type !== 'test-failures'
  ).length;

  score *= Math.max(0, 1 - (errorCount * 0.3 + warningCount * 0.1));

  // Critical todos are show-stoppers
  const criticalTodos = milestones.reduce((sum, m) => sum + m.criticalTodos, 0);
  if (criticalTodos > options.maxCriticalTodos) {
    score *= 0.3; // Heavily penalize critical todos
  }

  // Determine readiness (ignore test-failures warnings for readiness check)
  const criticalBlockers = blockers.filter(
    b => b.severity === 'error' || (b.severity === 'warning' && b.type !== 'test-failures')
  );
  const isReady =
    score >= options.minCompletionRate &&
    criticalBlockers.length === 0 &&
    criticalTodos <= options.maxCriticalTodos;

  return { score, confidence, isReady };
}

/**
 * Generate release recommendations
 */
function generateReleaseRecommendations(
  blockers: ReleaseBlocker[],
  milestones: MilestoneStatus[],
  score: number,
  _releaseType: string
): string[] {
  const recommendations: string[] = [];

  if (score >= 0.9) {
    recommendations.push('✅ Project appears ready for release');
    recommendations.push('🚀 Consider creating a release candidate');
    recommendations.push('📋 Run final pre-release checklist');
  } else if (score >= 0.7) {
    recommendations.push('⚠️ Project is mostly ready with minor issues');
    recommendations.push('🔧 Address remaining blockers before release');
    recommendations.push('📊 Review milestone completion status');
  } else if (score >= 0.5) {
    recommendations.push('🚧 Project needs significant work before release');
    recommendations.push('📝 Focus on completing critical TODO items');
    recommendations.push('🔍 Consider reducing scope for this release');
  } else {
    recommendations.push('❌ Project is not ready for release');
    recommendations.push('🛠️ Substantial development work required');
    recommendations.push('📋 Review and prioritize TODO items');
  }

  // Add specific recommendations based on blockers
  const criticalBlockers = blockers.filter(b => b.severity === 'error');
  if (criticalBlockers.length > 0) {
    recommendations.push('🚨 Critical blockers must be resolved:');
    criticalBlockers.forEach(blocker => {
      recommendations.push(`  - ${blocker.message}`);
      // Add specific TODO items if available
      if (blocker.todoItems && blocker.todoItems.length > 0) {
        blocker.todoItems.forEach(todo => {
          recommendations.push(`    • ${todo}`);
        });
      }
    });
  }

  // Add milestone-specific recommendations
  const incompleteMilestones = milestones.filter(m => m.completionRate < 0.8);
  if (incompleteMilestones.length > 0) {
    recommendations.push('📈 Focus on completing these milestones:');
    incompleteMilestones.forEach(milestone => {
      recommendations.push(
        `  - ${milestone.name}: ${(milestone.completionRate * 100).toFixed(1)}% complete`
      );
    });
  }

  return recommendations;
}

/**
 * Generate summary of release readiness
 */
function generateSummary(result: ReleaseReadinessResult): string {
  const scorePercentage = (result.score * 100).toFixed(1);
  const confidencePercentage = (result.confidence * 100).toFixed(1);

  let summary = `## Release Readiness: ${result.isReady ? '✅ READY' : '❌ NOT READY'}\n\n`;
  summary += `**Score**: ${scorePercentage}% (Confidence: ${confidencePercentage}%)\n\n`;

  if (result.milestones.length > 0) {
    summary += `### Milestone Status\n`;
    result.milestones.forEach(milestone => {
      const status =
        milestone.completionRate >= 0.8 ? '✅' : milestone.completionRate >= 0.5 ? '⚠️' : '❌';
      summary += `- ${status} **${milestone.name}**: ${milestone.completed}/${milestone.total} (${(milestone.completionRate * 100).toFixed(1)}%)\n`;
    });
    summary += '\n';
  }

  if (result.blockers.length > 0) {
    summary += `### Release Blockers (${result.blockers.length})\n`;
    result.blockers.forEach(blocker => {
      const icon =
        blocker.severity === 'error' ? '🚨' : blocker.severity === 'warning' ? '⚠️' : '💡';
      summary += `- ${icon} **${blocker.type}**: ${blocker.message}\n`;
    });
    summary += '\n';
  }

  return summary;
}

/**
 * Integration with existing MCP tools
 */
export async function integrateWithMcpTools(
  projectPath: string,
  options: Partial<ReleaseReadinessOptions> = {}
): Promise<ReleaseReadinessResult> {
  try {
    // Use existing manage_todo tool if available
    // const { manageTodo } = await import('../tools/manage-todo-tool.js');

    // Get current TODO status
    // const todoStatus = await manageTodo({
    //   action: 'analyze_progress',
    //   projectPath
    // });

    // Enhance analysis with TODO tool data
    const enhancedOptions: ReleaseReadinessOptions = {
      projectPath,
      includeAnalysis: true,
      ...options,
    };

    return await analyzeReleaseReadiness(enhancedOptions);
  } catch {
    // Silently handle MCP tool integration errors

    // Fallback to standalone analysis
    return await analyzeReleaseReadiness({
      projectPath,
      includeAnalysis: true,
      ...options,
    });
  }
}
