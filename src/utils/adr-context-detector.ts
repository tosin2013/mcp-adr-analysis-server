/**
 * ADR Context Detector
 *
 * Automatically detects project context (phase, activity level, velocity)
 * to select appropriate thresholds for timeline analysis
 */

import { exec } from 'node:child_process';
import { promisify } from 'util';
import type { ProjectContext, ThresholdProfile, AdrType } from './adr-timeline-types.js';
import type { DiscoveredAdr } from './adr-discovery.js';

const execAsync = promisify(exec);

/**
 * Predefined threshold profiles for different project contexts
 */
export const THRESHOLD_PROFILES: Record<string, ThresholdProfile> = {
  // 🚀 STARTUP MODE - Fast iteration, rapid decisions
  startup: {
    name: 'Startup / New Project',
    description: 'Fast-paced development with rapid decision cycles',
    staleProposedDays: 14, // 2 weeks max
    acceptedUnimplementedDays: 21, // 3 weeks max
    outdatedAdrDays: 60, // 2 months
    dormantAdrDays: 180, // 6 months
    rapidChangeDays: 3, // Flag if changed within 3 days
    implementationLagWarning: 14, // Warn if >2 weeks to implement
  },

  // 📈 GROWTH MODE - Active development, structured processes
  growth: {
    name: 'Growth / Active Development',
    description: 'Regular feature development with sprint cycles',
    staleProposedDays: 30, // 1 sprint cycle
    acceptedUnimplementedDays: 45, // ~2 sprint cycles
    outdatedAdrDays: 90, // 1 quarter
    dormantAdrDays: 365, // 1 year
    rapidChangeDays: 7, // Flag if changed within 1 week
    implementationLagWarning: 30, // Warn if >1 month
  },

  // 🏢 MATURE MODE - Deliberate decisions, stable architecture
  mature: {
    name: 'Mature / Enterprise',
    description: 'Established codebase with deliberate architectural changes',
    staleProposedDays: 90, // 1 quarter
    acceptedUnimplementedDays: 90, // 1 quarter
    outdatedAdrDays: 180, // 2 quarters
    dormantAdrDays: 730, // 2 years
    rapidChangeDays: 14, // Flag if changed within 2 weeks
    implementationLagWarning: 60, // Warn if >2 months
  },

  // 🔧 MAINTENANCE MODE - Minimal changes, long-term stability
  maintenance: {
    name: 'Maintenance / Legacy',
    description: 'Stable system with infrequent architectural changes',
    staleProposedDays: 180, // 6 months (decisions are rare)
    acceptedUnimplementedDays: 180, // 6 months
    outdatedAdrDays: 365, // 1 year
    dormantAdrDays: 1095, // 3 years
    rapidChangeDays: 30, // Flag if changed within 1 month
    implementationLagWarning: 120, // Warn if >4 months
  },

  // ⚡ FEATURE DEVELOPMENT - Time-boxed feature work
  feature_development: {
    name: 'Feature Development Sprint',
    description: 'Time-boxed feature development with aggressive timelines',
    staleProposedDays: 7, // 1 week (fast decisions needed)
    acceptedUnimplementedDays: 14, // 2 weeks (implement in sprint)
    outdatedAdrDays: 30, // 1 month
    dormantAdrDays: 90, // 3 months
    rapidChangeDays: 2, // Flag if changed within 2 days
    implementationLagWarning: 7, // Warn if >1 week
  },
};

/**
 * ADR type modifiers (multiply thresholds by these values)
 */
export const ADR_TYPE_MODIFIERS: Record<AdrType, number> = {
  infrastructure: 1.5, // Infrastructure takes 50% longer
  feature: 1.0, // Features use base timeline
  security: 0.8, // Security is urgent (20% faster)
  refactoring: 1.2, // Refactoring takes 20% longer
};

/**
 * Detect project context from git history and ADR patterns
 */
export async function detectProjectContext(
  projectPath: string,
  adrs: DiscoveredAdr[]
): Promise<ProjectContext> {
  // Analyze git activity (last 90 days)
  const gitActivity = await analyzeGitActivity(projectPath, 90);

  // Analyze ADR patterns
  const adrPatterns = analyzeAdrPatterns(adrs);

  // Determine project phase
  const phase = determineProjectPhase(gitActivity, adrPatterns);

  // Determine activity level
  const activityLevel = determineActivityLevel(gitActivity);

  // Detect deployment cadence
  const deploymentCadence = await detectDeploymentCadence(projectPath);

  return {
    phase,
    activityLevel,
    teamVelocity: {
      avgCommitsPerWeek: gitActivity.commitsPerWeek,
      avgAdrCreationRate: adrPatterns.adrsPerMonth,
      avgTimeToImplement: adrPatterns.avgImplementationDays,
    },
    deploymentCadence,
    adrCharacteristics: {
      avgAdrAge: adrPatterns.avgAdrAge,
      proposedToAcceptedAvg: adrPatterns.proposedToAcceptedAvg,
      acceptedToImplementedAvg: adrPatterns.avgImplementationDays,
    },
  };
}

/**
 * Analyze git activity metrics
 */
async function analyzeGitActivity(
  projectPath: string,
  days: number
): Promise<{
  commitsPerWeek: number;
  activeContributors: number;
  linesChangedPerWeek: number;
}> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get commit count
    const { stdout: commits } = await execAsync(`git log --since="${since}" --oneline | wc -l`, {
      cwd: projectPath,
      timeout: 5000,
    });

    const totalCommits = parseInt(commits.trim()) || 0;
    const weeks = days / 7;
    const commitsPerWeek = totalCommits / weeks;

    // Get unique contributors
    const { stdout: contributors } = await execAsync(
      `git log --since="${since}" --format="%an" | sort -u | wc -l`,
      { cwd: projectPath, timeout: 5000 }
    );

    const activeContributors = parseInt(contributors.trim()) || 0;

    // Rough estimate of lines changed
    const linesChangedPerWeek = commitsPerWeek * 100; // Rough heuristic

    return {
      commitsPerWeek,
      activeContributors,
      linesChangedPerWeek,
    };
  } catch (error) {
    // Git not available or not a git repo
    console.warn('[Context] Git activity analysis failed:', error);
    return {
      commitsPerWeek: 0,
      activeContributors: 0,
      linesChangedPerWeek: 0,
    };
  }
}

/**
 * Analyze ADR patterns
 */
function analyzeAdrPatterns(adrs: DiscoveredAdr[]): {
  adrsPerMonth: number;
  avgAdrAge: number;
  proposedToAcceptedAvg: number;
  avgImplementationDays: number;
} {
  if (adrs.length === 0) {
    return {
      adrsPerMonth: 0,
      avgAdrAge: 0,
      proposedToAcceptedAvg: 0,
      avgImplementationDays: 0,
    };
  }

  // Calculate ADR creation rate
  const now = Date.now();
  const adrAges = adrs
    .filter(adr => adr.timeline?.created_at)
    .map(adr => {
      const created = new Date(adr.timeline!.created_at).getTime();
      return (now - created) / (1000 * 60 * 60 * 24); // days
    });

  const avgAdrAge = adrAges.length > 0 ? adrAges.reduce((a, b) => a + b, 0) / adrAges.length : 0;

  // Estimate ADRs per month based on oldest ADR
  const oldestAdr = Math.max(...adrAges);
  const adrsPerMonth = oldestAdr > 0 ? (adrs.length / oldestAdr) * 30 : 0;

  // Rough estimates for other metrics (would need more data to calculate accurately)
  const proposedToAcceptedAvg = 30; // Default estimate
  const avgImplementationDays = 45; // Default estimate

  return {
    adrsPerMonth,
    avgAdrAge,
    proposedToAcceptedAvg,
    avgImplementationDays,
  };
}

/**
 * Determine project phase
 */
function determineProjectPhase(
  gitActivity: { commitsPerWeek: number },
  adrPatterns: { adrsPerMonth: number; avgAdrAge: number }
): 'startup' | 'growth' | 'mature' | 'maintenance' {
  const { commitsPerWeek } = gitActivity;
  const { adrsPerMonth, avgAdrAge } = adrPatterns;

  // Startup: High activity, new ADRs frequently, rapid changes
  if (commitsPerWeek > 50 && adrsPerMonth > 3 && avgAdrAge < 90) {
    return 'startup';
  }

  // Growth: Moderate-high activity, regular ADRs, structured development
  if (commitsPerWeek > 20 && adrsPerMonth > 1 && avgAdrAge < 180) {
    return 'growth';
  }

  // Maintenance: Low activity, few new ADRs, mostly bug fixes
  if (commitsPerWeek < 5 && adrsPerMonth < 0.5) {
    return 'maintenance';
  }

  // Mature: Moderate activity, occasional ADRs, stable architecture
  return 'mature';
}

/**
 * Determine activity level
 */
function determineActivityLevel(gitActivity: {
  commitsPerWeek: number;
}): 'very_active' | 'active' | 'moderate' | 'low' {
  const { commitsPerWeek } = gitActivity;

  if (commitsPerWeek > 50) return 'very_active'; // Multiple commits per day
  if (commitsPerWeek > 20) return 'active'; // 3-4 commits per day
  if (commitsPerWeek > 5) return 'moderate'; // ~1 commit per day
  return 'low'; // Few commits per week
}

/**
 * Detect deployment cadence from git tags/releases
 */
async function detectDeploymentCadence(
  projectPath: string
): Promise<'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly'> {
  try {
    // Get recent tags (last 90 days)
    const { stdout } = await execAsync(
      `git log --tags --simplify-by-decoration --pretty="format:%ai %d" --since="90 days ago"`,
      { cwd: projectPath, timeout: 5000 }
    );

    const tags = stdout
      .trim()
      .split('\n')
      .filter(line => line.includes('tag:'));

    if (tags.length === 0) return 'monthly'; // Default

    const tagCount = tags.length;

    if (tagCount > 60) return 'daily'; // Multiple tags per day
    if (tagCount > 12) return 'weekly'; // ~1-2 tags per week
    if (tagCount > 6) return 'biweekly'; // ~1 tag every 2 weeks
    if (tagCount > 3) return 'monthly'; // ~1 tag per month
    return 'quarterly';
  } catch {
    return 'monthly'; // Default fallback
  }
}

/**
 * Select appropriate threshold profile
 */
export function selectThresholdProfile(
  context: ProjectContext,
  override?: string
): ThresholdProfile {
  // Manual override takes precedence
  if (override && THRESHOLD_PROFILES[override]) {
    return THRESHOLD_PROFILES[override];
  }

  // Auto-select based on detected context
  const profileKey = context.phase;
  return THRESHOLD_PROFILES[profileKey] || THRESHOLD_PROFILES['mature']!;
}

/**
 * Detect ADR type from content
 */
export function detectAdrType(adr: DiscoveredAdr): AdrType {
  const content = (adr.title + ' ' + (adr.content || '')).toLowerCase();

  if (/infrastructure|deployment|hosting|database migration|ci\/cd/i.test(content)) {
    return 'infrastructure';
  }

  if (/security|authentication|authorization|encryption|vulnerability/i.test(content)) {
    return 'security';
  }

  if (/refactor|technical debt|clean up|modernize/i.test(content)) {
    return 'refactoring';
  }

  return 'feature';
}

/**
 * Apply ADR-type specific adjustments to thresholds
 */
export function adjustThresholdsForAdrType(
  baseThresholds: ThresholdProfile,
  adrType: AdrType
): ThresholdProfile {
  const multiplier = ADR_TYPE_MODIFIERS[adrType];

  return {
    ...baseThresholds,
    acceptedUnimplementedDays: Math.round(baseThresholds.acceptedUnimplementedDays * multiplier),
    implementationLagWarning: Math.round(baseThresholds.implementationLagWarning * multiplier),
  };
}
