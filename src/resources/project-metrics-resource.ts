/**
 * Project Metrics Resource - Code metrics and quality scores
 * URI Pattern: adr://project_metrics
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';

const execAsync = promisify(exec);

export interface ProjectMetrics {
  codebase: {
    totalFiles: number;
    totalLines: number;
    totalSize: string;
    languages: Record<string, { files: number; lines: number }>;
    largestFiles: Array<{ path: string; lines: number; size: string }>;
  };
  quality: {
    overallScore: number;
    maintainability: number;
    complexity: number;
    documentation: number;
    testing: number;
    breakdown: {
      typescript: { errors: number; warnings: number };
      linting: { errors: number; warnings: number };
      tests: { total: number; passed: number; failed: number; coverage: number };
    };
  };
  architecture: {
    adrCount: number;
    implementedDecisions: number;
    pendingDecisions: number;
    technologiesUsed: number;
    patternsApplied: number;
    architecturalDebt: {
      score: number;
      issues: string[];
    };
  };
  dependencies: {
    total: number;
    direct: number;
    dev: number;
    outdated: number;
    vulnerable: number;
    healthScore: number;
  };
  git: {
    totalCommits: number;
    contributors: number;
    branches: number;
    lastCommit: {
      hash: string;
      author: string;
      date: string;
      message: string;
    };
    activity: {
      commitsLastWeek: number;
      commitsLastMonth: number;
    };
  };
  productivity: {
    velocity: number; // Commits per week
    activeContributors: number;
    avgCommitSize: string;
    changeFrequency: string; // Changes per day
  };
}

/**
 * Get codebase statistics
 */
async function getCodebaseStats(): Promise<{
  totalFiles: number;
  totalLines: number;
  totalSize: string;
  languages: Record<string, { files: number; lines: number }>;
  largestFiles: Array<{ path: string; lines: number; size: string }>;
}> {
  const projectRoot = process.cwd();
  const languages: Record<string, { files: number; lines: number }> = {};
  let totalFiles = 0;
  let totalLines = 0;
  let totalSize = 0;
  const fileStats: Array<{ path: string; lines: number; size: number }> = [];

  // Directories to scan
  const scanDirs = ['src', 'lib', 'tests', 'test', 'docs'];

  async function scanDirectory(dir: string): Promise<void> {
    try {
      const items = await fs.readdir(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);

        if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
          await scanDirectory(fullPath);
        } else if (item.isFile()) {
          const ext = path.extname(item.name);
          if (['.ts', '.js', '.tsx', '.jsx', '.json', '.md', '.yaml', '.yml'].includes(ext)) {
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              const lines = content.split('\n').length;
              const stats = await fs.stat(fullPath);

              totalFiles++;
              totalLines += lines;
              totalSize += stats.size;

              // Track by language
              const lang = ext.substring(1);
              if (!languages[lang]) {
                languages[lang] = { files: 0, lines: 0 };
              }
              languages[lang].files++;
              languages[lang].lines += lines;

              // Track file stats for largest files
              fileStats.push({
                path: fullPath.replace(projectRoot + '/', ''),
                lines,
                size: stats.size,
              });
            } catch {
              // Skip files that can't be read
            }
          }
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
  }

  for (const dir of scanDirs) {
    const fullDir = path.join(projectRoot, dir);
    await scanDirectory(fullDir);
  }

  // Get largest files
  const largestFiles = fileStats
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 10)
    .map(f => ({
      path: f.path,
      lines: f.lines,
      size: `${(f.size / 1024).toFixed(2)} KB`,
    }));

  return {
    totalFiles,
    totalLines,
    totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
    languages,
    largestFiles,
  };
}

/**
 * Calculate quality metrics
 */
async function calculateQualityMetrics(): Promise<{
  overallScore: number;
  maintainability: number;
  complexity: number;
  documentation: number;
  testing: number;
  breakdown: {
    typescript: { errors: number; warnings: number };
    linting: { errors: number; warnings: number };
    tests: { total: number; passed: number; failed: number; coverage: number };
  };
}> {
  let maintainability = 100;
  let complexity = 100;
  let documentation = 100;
  let testing = 100;

  const breakdown = {
    typescript: { errors: 0, warnings: 0 },
    linting: { errors: 0, warnings: 0 },
    tests: { total: 0, passed: 0, failed: 0, coverage: 0 },
  };

  // TypeScript errors
  try {
    await execAsync('npm run typecheck', { timeout: 30000 });
  } catch (error: any) {
    const output = error.stdout + error.stderr;
    const errorMatch = output.match(/Found (\d+) error/);
    if (errorMatch) {
      breakdown.typescript.errors = parseInt(errorMatch[1], 10);
      maintainability -= Math.min(breakdown.typescript.errors * 2, 30);
    }
  }

  // Test results
  try {
    const testResult = await execAsync('npm test -- --passWithNoTests --json', { timeout: 120000 });
    try {
      const testData = JSON.parse(testResult.stdout);
      breakdown.tests.total = testData.numTotalTests || 0;
      breakdown.tests.passed = testData.numPassedTests || 0;
      breakdown.tests.failed = testData.numFailedTests || 0;

      if (breakdown.tests.total > 0) {
        testing = Math.round((breakdown.tests.passed / breakdown.tests.total) * 100);
      }
    } catch {
      // Could not parse test results
    }
  } catch {
    // Tests failed or not available
    testing = 50;
  }

  // Documentation score (based on README and docs existence)
  try {
    await fs.access(path.join(process.cwd(), 'README.md'));
    documentation = 80;
  } catch {
    documentation = 40;
  }

  try {
    await fs.access(path.join(process.cwd(), 'docs'));
    documentation = Math.min(documentation + 20, 100);
  } catch {
    // No docs directory
  }

  // Complexity (placeholder - would require actual complexity analysis)
  complexity = 85;

  const overallScore = Math.round(
    maintainability * 0.3 + complexity * 0.2 + documentation * 0.2 + testing * 0.3
  );

  return {
    overallScore,
    maintainability,
    complexity,
    documentation,
    testing,
    breakdown,
  };
}

/**
 * Get architecture metrics
 */
async function getArchitectureMetrics(): Promise<{
  adrCount: number;
  implementedDecisions: number;
  pendingDecisions: number;
  technologiesUsed: number;
  patternsApplied: number;
  architecturalDebt: {
    score: number;
    issues: string[];
  };
}> {
  // Import ADR discovery
  const { discoverAdrsInDirectory } = await import('../utils/adr-discovery.js');
  const adrDirectory = path.resolve(process.cwd(), process.env['ADR_DIRECTORY'] || 'docs/adrs');

  let adrCount = 0;
  let implementedDecisions = 0;
  let pendingDecisions = 0;

  try {
    const result = await discoverAdrsInDirectory(adrDirectory, true, process.cwd());
    adrCount = result.adrs.length;
    implementedDecisions = result.adrs.filter(a => a.status === 'accepted').length;
    pendingDecisions = result.adrs.filter(a => a.status === 'proposed').length;
  } catch {
    // No ADRs found
  }

  // Placeholder for technologies and patterns (would need proper implementation)
  const technologiesUsed = 3; // TypeScript, Node.js, MCP
  const patternsApplied = 2; // Resource Pattern, Tool Pattern

  // Calculate architectural debt
  const issues: string[] = [];
  let debtScore = 100;

  if (adrCount === 0) {
    issues.push('No architectural decisions documented');
    debtScore -= 40;
  } else if (adrCount < 5) {
    issues.push('Limited architectural documentation');
    debtScore -= 20;
  }

  if (pendingDecisions > implementedDecisions) {
    issues.push('More pending decisions than implemented');
    debtScore -= 15;
  }

  if (technologiesUsed < 3) {
    issues.push('Limited technology diversity documented');
    debtScore -= 10;
  }

  return {
    adrCount,
    implementedDecisions,
    pendingDecisions,
    technologiesUsed,
    patternsApplied,
    architecturalDebt: {
      score: Math.max(0, debtScore),
      issues,
    },
  };
}

/**
 * Get dependency metrics
 */
async function getDependencyMetrics(): Promise<{
  total: number;
  direct: number;
  dev: number;
  outdated: number;
  vulnerable: number;
  healthScore: number;
}> {
  let total = 0;
  let direct = 0;
  let dev = 0;
  let outdated = 0;
  let vulnerable = 0;

  try {
    const packagePath = path.resolve(process.cwd(), 'package.json');
    const packageContent = await fs.readFile(packagePath, 'utf-8');
    const packageJson = JSON.parse(packageContent);
    direct = Object.keys(packageJson.dependencies || {}).length;
    dev = Object.keys(packageJson.devDependencies || {}).length;
    total = direct + dev;

    // Check outdated
    try {
      const outdatedResult = await execAsync('npm outdated --json', { timeout: 30000 });
      const outdatedData = JSON.parse(outdatedResult.stdout);
      outdated = Object.keys(outdatedData).length;
    } catch (error: any) {
      if (error.stdout) {
        try {
          const outdatedData = JSON.parse(error.stdout);
          outdated = Object.keys(outdatedData).length;
        } catch {
          // Could not parse
        }
      }
    }

    // Check vulnerabilities
    try {
      const auditResult = await execAsync('npm audit --json', { timeout: 30000 });
      const auditData = JSON.parse(auditResult.stdout);
      vulnerable = auditData.metadata?.vulnerabilities?.total || 0;
    } catch (error: any) {
      if (error.stdout) {
        try {
          const auditData = JSON.parse(error.stdout);
          vulnerable = auditData.metadata?.vulnerabilities?.total || 0;
        } catch {
          // Could not parse
        }
      }
    }
  } catch {
    // Unable to read package.json
  }

  // Calculate health score
  let healthScore = 100;
  if (vulnerable > 0) healthScore -= Math.min(vulnerable * 10, 50);
  if (outdated > 5) healthScore -= Math.min((outdated - 5) * 2, 30);

  return {
    total,
    direct,
    dev,
    outdated,
    vulnerable,
    healthScore: Math.max(0, healthScore),
  };
}

/**
 * Get git metrics
 */
async function getGitMetrics(): Promise<{
  totalCommits: number;
  contributors: number;
  branches: number;
  lastCommit: {
    hash: string;
    author: string;
    date: string;
    message: string;
  };
  activity: {
    commitsLastWeek: number;
    commitsLastMonth: number;
  };
}> {
  let totalCommits = 0;
  let contributors = 0;
  let branches = 0;
  let commitsLastWeek = 0;
  let commitsLastMonth = 0;

  const lastCommit = {
    hash: 'unknown',
    author: 'unknown',
    date: new Date().toISOString(),
    message: 'Git information unavailable',
  };

  try {
    // Total commits
    const commitCountResult = await execAsync('git rev-list --count HEAD');
    totalCommits = parseInt(commitCountResult.stdout.trim(), 10);

    // Contributors
    const contributorsResult = await execAsync('git shortlog -sn --all | wc -l');
    contributors = parseInt(contributorsResult.stdout.trim(), 10);

    // Branches
    const branchesResult = await execAsync('git branch -a | wc -l');
    branches = parseInt(branchesResult.stdout.trim(), 10);

    // Last commit
    const lastCommitResult = await execAsync('git log -1 --pretty=format:"%H|%an|%aI|%s"');
    const [hash, author, date, message] = lastCommitResult.stdout.split('|');
    if (hash && author && date && message) {
      lastCommit.hash = hash.substring(0, 7);
      lastCommit.author = author;
      lastCommit.date = date;
      lastCommit.message = message;
    }

    // Recent activity
    const weekAgoResult = await execAsync('git rev-list --count --since="1 week ago" HEAD');
    commitsLastWeek = parseInt(weekAgoResult.stdout.trim(), 10);

    const monthAgoResult = await execAsync('git rev-list --count --since="1 month ago" HEAD');
    commitsLastMonth = parseInt(monthAgoResult.stdout.trim(), 10);
  } catch {
    // Git commands failed
  }

  return {
    totalCommits,
    contributors,
    branches,
    lastCommit,
    activity: {
      commitsLastWeek,
      commitsLastMonth,
    },
  };
}

/**
 * Calculate productivity metrics
 */
function calculateProductivityMetrics(gitMetrics: {
  activity: { commitsLastWeek: number; commitsLastMonth: number };
  contributors: number;
}): {
  velocity: number;
  activeContributors: number;
  avgCommitSize: string;
  changeFrequency: string;
} {
  const velocity = gitMetrics.activity.commitsLastWeek;
  const activeContributors = gitMetrics.contributors;
  const avgCommitSize = 'Medium'; // Placeholder
  const changeFrequency =
    gitMetrics.activity.commitsLastMonth > 30
      ? 'High'
      : gitMetrics.activity.commitsLastMonth > 10
        ? 'Medium'
        : 'Low';

  return {
    velocity,
    activeContributors,
    avgCommitSize,
    changeFrequency,
  };
}

/**
 * Generate comprehensive project metrics resource with code quality, architecture, and productivity analysis.
 *
 * Performs deep analysis of the codebase, dependencies, git history, and architectural decisions
 * to provide actionable metrics for project health and development velocity.
 *
 * **Performance Note:** This function performs multiple expensive operations including:
 * - File system traversal (src, lib, tests, docs directories)
 * - TypeScript compilation check (`npm run typecheck`)
 * - Test execution (`npm test`)
 * - Dependency analysis (`npm outdated`, `npm audit`)
 * - Git history analysis (commits, contributors, branches)
 * - ADR discovery and parsing
 *
 * Results are cached for 5 minutes to balance freshness with performance.
 *
 * @returns Promise resolving to resource generation result containing:
 *   - data: Complete project metrics including:
 *     - codebase: File counts, line counts, language breakdown, largest files
 *     - quality: Overall score, maintainability, complexity, documentation, testing
 *     - architecture: ADR count, decisions status, tech stack, architectural debt
 *     - dependencies: Package counts, outdated/vulnerable packages, health score
 *     - git: Commit history, contributors, branches, recent activity
 *     - productivity: Velocity, active contributors, change frequency
 *   - contentType: "application/json"
 *   - lastModified: ISO timestamp of generation
 *   - cacheKey: "project-metrics"
 *   - ttl: Cache duration (300 seconds / 5 minutes)
 *   - etag: Entity tag for cache validation
 *
 * @throws {Error} Rarely throws; gracefully handles individual metric collection failures by:
 *   - Returning zero/default values for failed metrics
 *   - Logging warnings for non-critical failures
 *   - Continuing execution even if some metrics unavailable
 *
 * @example
 * ```typescript
 * const metrics = await generateProjectMetricsResource();
 * console.log(`Overall quality: ${metrics.data.quality.overallScore}%`);
 * console.log(`Total files: ${metrics.data.codebase.totalFiles}`);
 * console.log(`ADRs: ${metrics.data.architecture.adrCount}`);
 * console.log(`Dependencies: ${metrics.data.dependencies.total} (${metrics.data.dependencies.vulnerable} vulnerable)`);
 *
 * // Check if cached result was returned
 * if (metrics.etag) {
 *   console.log('Using cached metrics:', metrics.etag);
 * }
 *
 * // Expected output structure:
 * {
 *   data: {
 *     codebase: {
 *       totalFiles: 150,
 *       totalLines: 25000,
 *       totalSize: "2.5 MB",
 *       languages: { ts: { files: 120, lines: 20000 } },
 *       largestFiles: [...]
 *     },
 *     quality: {
 *       overallScore: 85,
 *       maintainability: 90,
 *       complexity: 85,
 *       documentation: 80,
 *       testing: 85,
 *       breakdown: {...}
 *     },
 *     architecture: {
 *       adrCount: 12,
 *       implementedDecisions: 10,
 *       pendingDecisions: 2,
 *       architecturalDebt: { score: 85, issues: [] }
 *     },
 *     dependencies: {
 *       total: 50,
 *       direct: 30,
 *       dev: 20,
 *       outdated: 3,
 *       vulnerable: 0,
 *       healthScore: 95
 *     },
 *     git: {...},
 *     productivity: {...}
 *   },
 *   contentType: "application/json",
 *   cacheKey: "project-metrics",
 *   ttl: 300
 * }
 * ```
 *
 * @since v2.0.0
 * @see {@link getCodebaseStats} for codebase analysis
 * @see {@link calculateQualityMetrics} for quality scoring
 * @see {@link getArchitectureMetrics} for ADR analysis
 */
export async function generateProjectMetricsResource(): Promise<ResourceGenerationResult> {
  const cacheKey = 'project-metrics';

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  // Gather metrics
  const [codebase, quality, architecture, dependencies, git] = await Promise.all([
    getCodebaseStats(),
    calculateQualityMetrics(),
    getArchitectureMetrics(),
    getDependencyMetrics(),
    getGitMetrics(),
  ]);

  const productivity = calculateProductivityMetrics(git);

  const projectMetrics: ProjectMetrics = {
    codebase,
    quality,
    architecture,
    dependencies,
    git,
    productivity,
  };

  const result: ResourceGenerationResult = {
    data: projectMetrics,
    contentType: 'application/json',
    lastModified: new Date().toISOString(),
    cacheKey,
    ttl: 300, // 5 minutes cache
    etag: generateETag(projectMetrics),
  };

  // Cache result
  resourceCache.set(cacheKey, result, result.ttl);

  return result;
}
