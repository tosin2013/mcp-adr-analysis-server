/**
 * ADR Action Analyzer
 *
 * Generates actionable work items from timeline analysis
 * with priority scoring and effort estimation
 */

import type {
  AdrActionItem,
  AdrWorkQueue,
  ThresholdProfile,
} from './adr-timeline-types.js';
import type { DiscoveredAdr } from './adr-discovery.js';
import { detectAdrType, adjustThresholdsForAdrType } from './adr-context-detector.js';

/**
 * Generate action items from ADRs based on timeline analysis
 */
export async function generateActionItems(
  adrs: DiscoveredAdr[],
  baseThresholds: ThresholdProfile,
  options: {
    useAdrTypeModifiers?: boolean;
    projectPath?: string;
  } = {}
): Promise<AdrWorkQueue> {
  const { useAdrTypeModifiers = true } = options;

  const actionItems: AdrActionItem[] = [];

  for (const adr of adrs) {
    if (!adr.timeline) {
      continue; // Skip ADRs without timeline data
    }

    // Detect ADR type and adjust thresholds if enabled
    const adrType = useAdrTypeModifiers ? detectAdrType(adr) : 'feature';
    const thresholds = useAdrTypeModifiers
      ? adjustThresholdsForAdrType(baseThresholds, adrType)
      : baseThresholds;

    // Analyze this ADR for actions
    const actions = analyzeAdrActions(adr, thresholds);
    actionItems.push(...actions);
  }

  // Sort and categorize actions
  return categorizeActions(actionItems);
}

/**
 * Analyze a single ADR for required actions
 */
function analyzeAdrActions(adr: DiscoveredAdr, thresholds: ThresholdProfile): AdrActionItem[] {
  const actions: AdrActionItem[] = [];
  const timeline = adr.timeline!;
  const status = adr.status.toLowerCase();

  // RULE 1: Stale Proposed ADRs (CRITICAL)
  if (status === 'proposed' && timeline.age_days > thresholds.staleProposedDays) {
    const urgency = calculateUrgencyScore(
      timeline.age_days,
      thresholds.staleProposedDays,
      thresholds.staleProposedDays * 2
    );

    actions.push({
      adrFilename: adr.filename,
      adrTitle: adr.title,
      adrStatus: adr.status,
      priority: urgency > 80 ? 'critical' : 'high',
      urgencyScore: urgency,
      actionType: 'review',
      actionDescription: 'Review and make final decision',
      rationale:
        `ADR has been in "Proposed" status for ${timeline.age_days} days ` +
        `(>${thresholds.staleProposedDays} days threshold). ` +
        `Prolonged proposed status creates uncertainty and blocks related work.`,
      estimatedEffort: 'medium',
      dueDate: addDays(new Date(), 14).toISOString(),
      blockers: [
        'May need stakeholder alignment',
        'May require additional research',
        'Team may need to evaluate alternatives',
      ],
      timeline,
    });
  }

  // RULE 2: Accepted but Not Implemented (HIGH)
  // Note: Full implementation detection requires expensive analysis
  // For now, we flag based on age alone
  if (status === 'accepted' && timeline.age_days > thresholds.acceptedUnimplementedDays) {
    const urgency = calculateUrgencyScore(
      timeline.age_days,
      thresholds.acceptedUnimplementedDays,
      thresholds.acceptedUnimplementedDays * 2
    );

    actions.push({
      adrFilename: adr.filename,
      adrTitle: adr.title,
      adrStatus: adr.status,
      priority: urgency > 70 ? 'high' : 'medium',
      urgencyScore: urgency,
      actionType: 'implement',
      actionDescription: 'Begin implementation of accepted decision',
      rationale:
        `ADR was accepted ${timeline.age_days} days ago ` +
        `(>${thresholds.acceptedUnimplementedDays} days threshold). ` +
        `Accepted decisions should be implemented promptly to maintain architectural integrity.`,
      estimatedEffort: estimateImplementationEffort(adr),
      dueDate: addDays(new Date(), 30).toISOString(),
      blockers: [
        'May need team capacity allocation',
        'May have dependencies on other work',
        'May require infrastructure changes',
      ],
      timeline,
    });
  }

  // RULE 3: Outdated ADR Documentation (MEDIUM)
  if (
    (status === 'accepted' || status === 'implemented') &&
    timeline.days_since_update > thresholds.outdatedAdrDays
  ) {
    const urgency = calculateUrgencyScore(
      timeline.days_since_update,
      thresholds.outdatedAdrDays,
      thresholds.outdatedAdrDays * 2
    );

    actions.push({
      adrFilename: adr.filename,
      adrTitle: adr.title,
      adrStatus: adr.status,
      priority: 'medium',
      urgencyScore: urgency,
      actionType: 'update',
      actionDescription: 'Update ADR to reflect current state',
      rationale:
        `ADR hasn't been updated in ${timeline.days_since_update} days ` +
        `(>${thresholds.outdatedAdrDays} days threshold). ` +
        `Documentation may have drifted from actual implementation.`,
      estimatedEffort: 'low',
      dueDate: addDays(new Date(), 60).toISOString(),
      blockers: [
        'May need to document implementation details',
        'May need to update consequences section',
      ],
      timeline,
    });
  }

  // RULE 4: Deprecated without Superseding ADR (MEDIUM)
  if (status === 'deprecated' && timeline.age_days > thresholds.outdatedAdrDays) {
    const urgency = calculateUrgencyScore(
      timeline.age_days,
      thresholds.outdatedAdrDays,
      thresholds.outdatedAdrDays * 2
    );

    actions.push({
      adrFilename: adr.filename,
      adrTitle: adr.title,
      adrStatus: adr.status,
      priority: 'medium',
      urgencyScore: urgency,
      actionType: 'close',
      actionDescription: 'Document superseding decision or archive',
      rationale:
        `ADR deprecated ${timeline.age_days} days ago ` +
        `(>${thresholds.outdatedAdrDays} days threshold). ` +
        `Should either document the new decision or archive if no longer relevant.`,
      estimatedEffort: 'low',
      dueDate: addDays(new Date(), 30).toISOString(),
      blockers: [
        'May need to create superseding ADR',
        'May need to verify deprecated decision is fully replaced',
      ],
      timeline,
    });
  }

  // RULE 5: Long-Dormant ADRs (LOW)
  if (timeline.days_since_update > thresholds.dormantAdrDays) {
    const urgency = calculateUrgencyScore(
      timeline.days_since_update,
      thresholds.dormantAdrDays,
      thresholds.dormantAdrDays * 1.5
    );

    actions.push({
      adrFilename: adr.filename,
      adrTitle: adr.title,
      adrStatus: adr.status,
      priority: 'low',
      urgencyScore: urgency,
      actionType: 'review',
      actionDescription: 'Verify ADR is still relevant',
      rationale:
        `ADR hasn't been updated in ${Math.floor(timeline.days_since_update / 365)} years ` +
        `(>${Math.floor(thresholds.dormantAdrDays / 365)} years threshold). ` +
        `May be obsolete or need archival.`,
      estimatedEffort: 'low',
      dueDate: addDays(new Date(), 90).toISOString(),
      blockers: [],
      timeline,
    });
  }

  // RULE 6: Rapid Status Changes (MEDIUM - may indicate instability)
  if (timeline.age_days < 30 && timeline.days_since_update < thresholds.rapidChangeDays) {
    actions.push({
      adrFilename: adr.filename,
      adrTitle: adr.title,
      adrStatus: adr.status,
      priority: 'medium',
      urgencyScore: 70,
      actionType: 'review',
      actionDescription: 'Review recent decision changes for stability',
      rationale:
        `ADR is new (${timeline.age_days} days) and was recently modified ` +
        `(${timeline.days_since_update} days ago). ` +
        `Rapid changes may indicate unstable requirements or unclear context.`,
      estimatedEffort: 'low',
      dueDate: addDays(new Date(), 7).toISOString(),
      blockers: [
        'May need to stabilize requirements',
        'May need additional stakeholder input',
      ],
      timeline,
    });
  }

  return actions;
}

/**
 * Calculate urgency score (0-100) based on age thresholds
 */
function calculateUrgencyScore(
  actualDays: number,
  warningThreshold: number,
  criticalThreshold: number
): number {
  if (actualDays < warningThreshold) return 0;
  if (actualDays >= criticalThreshold) return 100;

  // Linear interpolation between warning and critical
  const range = criticalThreshold - warningThreshold;
  const over = actualDays - warningThreshold;
  return Math.min(100, Math.floor((over / range) * 100));
}

/**
 * Estimate implementation effort based on ADR content
 */
function estimateImplementationEffort(adr: DiscoveredAdr): 'low' | 'medium' | 'high' {
  const content = (adr.content || '').toLowerCase();

  // Simple heuristics
  const hasInfrastructure = /infrastructure|deployment|database|migration/i.test(content);
  const hasMultipleServices =
    /service|microservice|api/gi.test(content) && (content.match(/service/gi) || []).length > 3;
  const hasBreakingChanges = /breaking|migration|backward/i.test(content);

  if (hasInfrastructure || hasBreakingChanges) return 'high';
  if (hasMultipleServices) return 'medium';
  return 'low';
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Categorize actions into priority buckets
 */
function categorizeActions(actions: AdrActionItem[]): AdrWorkQueue {
  // Sort by urgency score (highest first)
  actions.sort((a, b) => b.urgencyScore - a.urgencyScore);

  const critical = actions.filter((a) => a.priority === 'critical');
  const high = actions.filter((a) => a.priority === 'high');
  const medium = actions.filter((a) => a.priority === 'medium');
  const low = actions.filter((a) => a.priority === 'low');

  // Estimate total hours based on effort
  const effortHours = {
    low: 1,
    medium: 3,
    high: 6,
  };

  const estimatedHours = actions.reduce((total, action) => {
    return total + effortHours[action.estimatedEffort];
  }, 0);

  return {
    critical,
    high,
    medium,
    low,
    summary: {
      totalActions: actions.length,
      criticalCount: critical.length,
      estimatedHours,
    },
  };
}

/**
 * Format action items into a readable report
 */
export function formatActionReport(
  workQueue: AdrWorkQueue,
  context?: {
    projectPath: string;
    thresholdProfile: string;
  }
): string {
  const { critical, high, medium, low, summary } = workQueue;

  let report = '# ADR Timeline Analysis - Action Queue\n\n';

  if (context) {
    report += `**Project:** ${context.projectPath}\n`;
    report += `**Threshold Profile:** ${context.thresholdProfile}\n`;
  }

  report += `**Analysis Date:** ${new Date().toISOString().split('T')[0]}\n\n`;

  report += '## Summary\n\n';
  report += `- **Total Actions Required:** ${summary.totalActions}\n`;
  report += `- **Critical Priority:** ${summary.criticalCount}\n`;
  report += `- **Estimated Total Effort:** ${summary.estimatedHours} hours\n\n`;

  report += '---\n\n';

  // Critical actions
  if (critical.length > 0) {
    report += `## 🚨 CRITICAL PRIORITY (${critical.length} actions)\n\n`;
    critical.forEach((action, idx) => {
      report += formatActionItem(action, idx + 1);
    });
  }

  // High priority actions
  if (high.length > 0) {
    report += `## ⚠️ HIGH PRIORITY (${high.length} actions)\n\n`;
    high.forEach((action, idx) => {
      report += formatActionItem(action, idx + 1);
    });
  }

  // Medium priority actions
  if (medium.length > 0) {
    report += `## 📋 MEDIUM PRIORITY (${medium.length} actions)\n\n`;
    medium.forEach((action, idx) => {
      report += formatActionItem(action, idx + 1);
    });
  }

  // Low priority actions
  if (low.length > 0) {
    report += `## ℹ️ LOW PRIORITY (${low.length} actions)\n\n`;
    low.forEach((action, idx) => {
      report += formatActionItem(action, idx + 1);
    });
  }

  // No actions
  if (summary.totalActions === 0) {
    report += '## ✅ No Actions Required\n\n';
    report += 'All ADRs are up to date and within acceptable thresholds.\n\n';
  }

  return report;
}

/**
 * Format a single action item
 */
function formatActionItem(action: AdrActionItem, index: number): string {
  let item = `### ${index}. ${action.adrTitle}\n\n`;
  item += `**File:** \`${action.adrFilename}\`  \n`;
  item += `**Status:** ${action.adrStatus}  \n`;
  item += `**Age:** ${action.timeline.age_days} days  \n`;
  item += `**Last Updated:** ${action.timeline.days_since_update} days ago  \n\n`;

  item += `**Action Required:** ${action.actionDescription}  \n`;
  item += `**Urgency Score:** ${action.urgencyScore}/100  \n`;
  item += `**Estimated Effort:** ${action.estimatedEffort.toUpperCase()}  \n`;
  if (action.dueDate) {
    item += `**Suggested Due Date:** ${action.dueDate.split('T')[0]}  \n`;
  }
  item += '\n';

  item += `**Why This Matters:**  \n${action.rationale}\n\n`;

  if (action.blockers.length > 0) {
    item += `**Potential Blockers:**\n`;
    action.blockers.forEach((blocker) => {
      item += `- ${blocker}\n`;
    });
    item += '\n';
  }

  item += '---\n\n';

  return item;
}
