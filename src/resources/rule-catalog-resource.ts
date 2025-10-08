/**
 * Rule Catalog Resource
 * Provides access to architectural and validation rules
 */

import { McpAdrError } from '../types/index.js';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';

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

/**
 * Extract rules from ADRs
 */
async function extractRulesFromAdrs(): Promise<Rule[]> {
  // TODO: Implement actual rule extraction from ADRs
  // For now, return example rules
  return [
    {
      id: 'adr-rule-001',
      name: 'MCP Best Practices',
      description: 'Follow MCP protocol best practices for resources vs tools',
      type: 'architectural',
      severity: 'warning',
      message: 'Read-only operations should use resources, not tools',
      source: 'adr',
      enabled: true,
    },
  ];
}

/**
 * Extract inferred rules from code patterns
 */
async function extractInferredRules(): Promise<Rule[]> {
  // TODO: Implement actual inference from code
  return [
    {
      id: 'inferred-rule-001',
      name: 'TypeScript Strict Mode',
      description: 'Project uses TypeScript strict mode',
      type: 'coding',
      severity: 'info',
      message: 'Maintain strict TypeScript compilation',
      source: 'inferred',
      enabled: true,
    },
  ];
}

/**
 * Load custom user-defined rules
 */
async function loadCustomRules(): Promise<Rule[]> {
  // TODO: Load from configuration file
  return [];
}

/**
 * Group rules by type
 */
function groupByType(rules: Rule[]): Record<string, number> {
  const grouped: Record<string, number> = {};

  for (const rule of rules) {
    grouped[rule.type] = (grouped[rule.type] || 0) + 1;
  }

  return grouped;
}

/**
 * Group rules by severity
 */
function groupBySeverity(rules: Rule[]): Record<string, number> {
  const grouped: Record<string, number> = {};

  for (const rule of rules) {
    grouped[rule.severity] = (grouped[rule.severity] || 0) + 1;
  }

  return grouped;
}

/**
 * Generate rule catalog resource
 */
export async function generateRuleCatalogResource(): Promise<ResourceGenerationResult> {
  try {
    const cacheKey = 'rule-catalog:current';

    // Check cache
    const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Extract rules from various sources
    const adrRules = await extractRulesFromAdrs();
    const inferredRules = await extractInferredRules();
    const customRules = await loadCustomRules();

    const allRules = [...adrRules, ...inferredRules, ...customRules];

    const ruleCatalogData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      summary: {
        total: allRules.length,
        byType: groupByType(allRules),
        bySeverity: groupBySeverity(allRules),
        bySource: {
          adr: adrRules.length,
          inferred: inferredRules.length,
          user_defined: customRules.length,
        },
        enabled: allRules.filter(r => r.enabled).length,
        disabled: allRules.filter(r => !r.enabled).length,
      },
      rules: allRules,
    };

    const result: ResourceGenerationResult = {
      data: ruleCatalogData,
      contentType: 'application/json',
      lastModified: new Date().toISOString(),
      cacheKey,
      ttl: 600, // 10 minutes cache
      etag: generateETag(ruleCatalogData),
    };

    // Cache result
    resourceCache.set(cacheKey, result, result.ttl);

    return result;
  } catch (error) {
    throw new McpAdrError(
      `Failed to generate rule catalog resource: ${error instanceof Error ? error.message : String(error)}`,
      'RESOURCE_GENERATION_ERROR'
    );
  }
}
