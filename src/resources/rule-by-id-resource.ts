/**
 * Rule by ID Resource - Individual rule details
 * URI Pattern: adr://rule/{rule_id}
 */

import { URLSearchParams } from 'url';
import { McpAdrError } from '../types/index.js';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';
import { resourceRouter } from './resource-router.js';

// Reuse Rule interface from rule-catalog-resource
export interface Rule {
  id: string;
  name: string;
  description: string;
  type: 'architectural' | 'coding' | 'security' | 'performance' | 'documentation';
  severity: 'info' | 'warning' | 'error' | 'critical';
  pattern?: string;
  message: string;
  source: 'adr' | 'inferred' | 'user_defined';
  enabled: boolean;
  createdAt?: string;
}

export interface DetailedRule extends Rule {
  violations: Array<{
    file: string;
    line: number;
    message: string;
    severity: string;
  }>;
  relatedAdrs: string[];
  usage: {
    totalChecks: number;
    totalViolations: number;
    lastChecked: string;
    violationRate: number;
  };
}

/**
 * Load all rules from various sources
 */
async function loadAllRules(): Promise<Rule[]> {
  // Import rule extraction functions
  const { generateRuleCatalogResource } = await import('./rule-catalog-resource.js');

  // Get rule catalog
  const catalogResult = await generateRuleCatalogResource();
  const catalog = catalogResult.data;

  return catalog.rules || [];
}

/**
 * Find rule violations (placeholder - would require code analysis)
 */
async function findRuleViolations(rule: Rule): Promise<Array<{
  file: string;
  line: number;
  message: string;
  severity: string;
}>> {
  // TODO: Implement actual code analysis for rule violations
  // For now, return placeholder violations
  return [
    {
      file: 'src/example.ts',
      line: 42,
      message: `Violation of rule: ${rule.name}`,
      severity: rule.severity,
    },
  ];
}

/**
 * Find ADRs related to this rule
 */
async function findRelatedAdrsForRule(rule: Rule): Promise<string[]> {
  // If rule source is ADR, extract ADR reference
  if (rule.source === 'adr') {
    const adrReferences = rule.description.match(/ADR[-\s]?(\d+)/gi);
    if (adrReferences) {
      return adrReferences.map(ref => ref.trim());
    }
  }

  return [];
}

/**
 * Get rule usage statistics (placeholder - would require tracking)
 */
async function getRuleUsageStats(_ruleId: string): Promise<{
  totalChecks: number;
  totalViolations: number;
  lastChecked: string;
  violationRate: number;
}> {
  // TODO: Implement actual usage tracking
  // For now, return placeholder stats
  const totalChecks = 100;
  const totalViolations = 15;

  return {
    totalChecks,
    totalViolations,
    lastChecked: new Date().toISOString(),
    violationRate: totalViolations / totalChecks,
  };
}

/**
 * Generate rule by ID resource
 */
export async function generateRuleByIdResource(
  params: Record<string, string>,
  _searchParams: URLSearchParams
): Promise<ResourceGenerationResult> {
  const rule_id = params['rule_id'];

  if (!rule_id) {
    throw new McpAdrError('Missing required parameter: rule_id', 'INVALID_PARAMS');
  }

  const cacheKey = `rule:${rule_id}`;

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  // Load all rules
  const allRules = await loadAllRules();

  // Find rule by ID or name match
  const rule = allRules.find(
    r => r.id === rule_id || r.name.toLowerCase().includes(rule_id.toLowerCase())
  );

  if (!rule) {
    throw new McpAdrError(`Rule not found: ${rule_id}`, 'RESOURCE_NOT_FOUND');
  }

  // Build detailed rule data
  const detailedRule: DetailedRule = {
    ...rule,
    violations: await findRuleViolations(rule),
    relatedAdrs: await findRelatedAdrsForRule(rule),
    usage: await getRuleUsageStats(rule_id),
  };

  const result: ResourceGenerationResult = {
    data: detailedRule,
    contentType: 'application/json',
    lastModified: new Date().toISOString(),
    cacheKey,
    ttl: 300, // 5 minutes cache
    etag: generateETag(detailedRule),
  };

  // Cache result
  resourceCache.set(cacheKey, result, result.ttl);

  return result;
}

// Register route
resourceRouter.register(
  '/rule/{rule_id}',
  generateRuleByIdResource,
  'Individual rule details by ID or name match'
);
