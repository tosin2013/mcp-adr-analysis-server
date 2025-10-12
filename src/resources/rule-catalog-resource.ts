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
 * Generate comprehensive rule catalog resource with compliance tracking and rule management.
 *
 * Aggregates architectural rules from multiple sources including ADRs, inferred patterns,
 * and custom user-defined rules. Provides categorization by type, severity, and source for
 * effective governance and compliance monitoring.
 *
 * **Rule Sources:**
 * - ADR-based rules: Extracted from architectural decision records
 * - Inferred rules: Derived from codebase patterns and best practices
 * - Custom rules: User-defined via configuration files
 *
 * **Rule Types:**
 * - architecture: Architectural patterns and structures
 * - security: Security policies and practices
 * - performance: Performance optimization guidelines
 * - testing: Test coverage and quality requirements
 * - documentation: Documentation standards
 *
 * **Severity Levels:**
 * - critical: Violations block deployment
 * - high: Must fix before release
 * - medium: Should fix soon
 * - low: Nice to fix
 *
 * @returns Promise resolving to resource generation result containing:
 *   - data: Complete rule catalog with rules array and summary statistics
 *   - contentType: "application/json"
 *   - lastModified: ISO timestamp of generation
 *   - cacheKey: "rule-catalog:current"
 *   - ttl: Cache duration (300 seconds / 5 minutes)
 *   - etag: Entity tag for cache validation
 *
 * @throws {McpAdrError} When rule catalog generation fails due to:
 *   - RESOURCE_GENERATION_ERROR: ADR parsing errors or rule extraction failures
 *   - Cache operation failures
 *
 * @example
 * ```typescript
 * const ruleCatalog = await generateRuleCatalogResource();
 *
 * console.log(`Total rules: ${ruleCatalog.data.summary.total}`);
 * console.log(`Enabled: ${ruleCatalog.data.summary.enabled}`);
 * console.log(`Disabled: ${ruleCatalog.data.summary.disabled}`);
 *
 * // Get critical security rules
 * const criticalSecurityRules = ruleCatalog.data.rules.filter(
 *   r => r.type === 'security' && r.severity === 'critical' && r.enabled
 * );
 * console.log(`Critical security rules: ${criticalSecurityRules.length}`);
 *
 * // Group rules by source
 * console.log(`ADR rules: ${ruleCatalog.data.summary.bySource.adr}`);
 * console.log(`Inferred rules: ${ruleCatalog.data.summary.bySource.inferred}`);
 * console.log(`Custom rules: ${ruleCatalog.data.summary.bySource.user_defined}`);
 *
 * // Expected output structure:
 * {
 *   data: {
 *     version: "1.0.0",
 *     timestamp: "2025-10-12T17:00:00.000Z",
 *     summary: {
 *       total: 45,
 *       byType: {
 *         architecture: 12,
 *         security: 10,
 *         performance: 8,
 *         testing: 10,
 *         documentation: 5
 *       },
 *       bySeverity: {
 *         critical: 5,
 *         high: 15,
 *         medium: 20,
 *         low: 5
 *       },
 *       bySource: {
 *         adr: 20,
 *         inferred: 15,
 *         user_defined: 10
 *       },
 *       enabled: 40,
 *       disabled: 5
 *     },
 *     rules: [
 *       {
 *         id: "rule-001",
 *         name: "Use PostgreSQL for primary database",
 *         type: "architecture",
 *         severity: "critical",
 *         source: "adr",
 *         enabled: true,
 *         adrReference: "ADR-001"
 *       }
 *     ]
 *   },
 *   contentType: "application/json",
 *   cacheKey: "rule-catalog:current",
 *   ttl: 300
 * }
 * ```
 *
 * @since v2.0.0
 * @see {@link extractRulesFromAdrs} for ADR rule extraction
 * @see {@link extractInferredRules} for pattern-based rule inference
 * @see {@link loadCustomRules} for user-defined rule loading
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
