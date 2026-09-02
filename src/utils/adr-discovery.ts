/**
 * ADR Discovery Utilities
 *
 * Utilities for discovering and analyzing existing ADRs in the project
 */

import { McpAdrError } from '../types/index.js';
import { BasicTimeline, TimelineExtractionOptions, AdrWorkQueue } from './adr-timeline-types.js';

/**
 * Represents a discovered Architectural Decision Record
 */
export interface DiscoveredAdr {
  /** Filename of the ADR file */
  filename: string;
  /** Title extracted from the ADR */
  title: string;
  /** Status of the decision (proposed, accepted, deprecated, etc.) */
  status: string;
  /** Date when the decision was made */
  date: string | undefined;
  /** Full file path to the ADR */
  path: string;
  /** Full content of the ADR file (optional) */
  content?: string;
  /** Context section of the ADR */
  context?: string;
  /** Decision section of the ADR */
  decision?: string;
  /** Consequences section of the ADR */
  consequences?: string;
  /** Additional metadata about the ADR */
  metadata?: {
    /** ADR number or identifier */
    number?: string;
    /** Category or domain of the decision */
    category?: string;
    /** Tags for categorization */
    tags?: string[];
  };
  /** Timeline information (creation, updates, staleness) */
  timeline?: BasicTimeline;
}

/**
 * Options for ADR discovery
 */
export interface AdrDiscoveryOptions {
  /** Include full ADR content */
  includeContent?: boolean;
  /** Include timeline analysis */
  includeTimeline?: boolean;
  /** Timeline extraction options */
  timelineOptions?: TimelineExtractionOptions;
  /** Generate action items */
  generateActions?: boolean;
  /** Threshold profile for action generation */
  thresholdProfile?: string;
  /** Auto-detect project context */
  autoDetectContext?: boolean;
}

/**
 * Result of ADR discovery operation
 */
export interface AdrDiscoveryResult {
  /** Directory where ADRs were discovered */
  directory: string;
  /** Total number of ADRs found */
  totalAdrs: number;
  /** Array of discovered ADRs */
  adrs: DiscoveredAdr[];
  /** Summary statistics of discovered ADRs */
  summary: {
    /** Count of ADRs by status */
    byStatus: Record<string, number>;
    /** Count of ADRs by category */
    byCategory: Record<string, number>;
    /** Total actions required (if generateActions=true) */
    totalActionsRequired?: number;
    /** Critical actions (if generateActions=true) */
    criticalActions?: number;
  };
  /** Recommendations for improving ADR management */
  recommendations: string[];
  /** Action queue (if generateActions=true) */
  actionQueue?: AdrWorkQueue;
}

/**
 * Discover ADRs in a directory using file system operations
 *
 * @param adrDirectory - Relative path to ADR directory
 * @param projectPath - Root path of the project
 * @param options - Discovery options
 * @returns Promise resolving to ADR discovery results
 * @throws McpAdrError if directory access fails or parsing errors occur
 */
export async function discoverAdrsInDirectory(
  adrDirectory: string,
  projectPath: string,
  options: AdrDiscoveryOptions = {}
): Promise<AdrDiscoveryResult> {
  const {
    includeContent = false,
    includeTimeline = true, // Default to true for smart extraction
    timelineOptions = {},
    generateActions = false,
    thresholdProfile,
    autoDetectContext = true,
  } = options;
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Try multiple strategies to resolve the correct ADR directory path
    // This handles cases where:
    // 1. projectPath is already in a subdirectory (e.g., /project/docs)
    // 2. adrDirectory is relative (e.g., "docs/adrs")
    // 3. adrDirectory is already absolute
    let fullAdrPath: string;
    let dirExists = false;

    // Strategy 1: Try resolving as-is (standard behavior)
    fullAdrPath = path.resolve(projectPath, adrDirectory);
    try {
      const stat = await fs.stat(fullAdrPath);
      dirExists = stat.isDirectory();
    } catch {
      dirExists = false;
    }

    // Strategy 2: If that fails and adrDirectory contains the same path segment as projectPath,
    // the projectPath might be pointing to a subdirectory. Try stripping the common suffix.
    if (!dirExists && adrDirectory.includes(path.sep)) {
      const projectPathParts = projectPath.split(path.sep);
      const adrDirParts = adrDirectory.split(path.sep);

      // Check if projectPath ends with the first part of adrDirectory
      // e.g., projectPath ends with "docs" and adrDirectory starts with "docs/adrs"
      const lastProjectPart = projectPathParts[projectPathParts.length - 1];
      if (lastProjectPart && lastProjectPart === adrDirParts[0]) {
        // Remove the redundant first part from adrDirectory
        const adjustedAdrDir = adrDirParts.slice(1).join(path.sep);
        fullAdrPath = path.resolve(projectPath, adjustedAdrDir);
        try {
          const stat = await fs.stat(fullAdrPath);
          dirExists = stat.isDirectory();
        } catch {
          dirExists = false;
        }
      }
    }

    // Strategy 3: If still not found, try checking one level up from projectPath
    if (!dirExists) {
      const parentPath = path.dirname(projectPath);
      fullAdrPath = path.resolve(parentPath, adrDirectory);
      try {
        const stat = await fs.stat(fullAdrPath);
        dirExists = stat.isDirectory();
      } catch {
        dirExists = false;
      }
    }

    if (!dirExists) {
      return {
        directory: adrDirectory,
        totalAdrs: 0,
        adrs: [],
        summary: { byStatus: {}, byCategory: {} },
        recommendations: [
          `ADR directory '${adrDirectory}' does not exist (tried multiple path resolutions)`,
          `Attempted paths: ${path.resolve(projectPath, adrDirectory)}, ${path.resolve(path.dirname(projectPath), adrDirectory)}`,
          'Consider creating the directory and adding your first ADR',
          'Use the generate_adr_from_decision tool to create new ADRs',
        ],
      };
    }

    // Read directory contents
    const entries = await fs.readdir(fullAdrPath, { withFileTypes: true });
    const markdownFiles = entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
      .map(entry => entry.name);

    // Process each markdown file to check if it's an ADR
    const discoveredAdrs: DiscoveredAdr[] = [];

    for (const filename of markdownFiles) {
      const filePath = path.join(fullAdrPath, filename);

      try {
        // Read the file content to check if it's an ADR
        const content = await fs.readFile(filePath, 'utf-8');

        // Check if this looks like an ADR
        const isAdr = isLikelyAdr(content, filename);

        if (isAdr) {
          const adr = parseAdrMetadata(content, filename, path.join(adrDirectory, filename));
          if (includeContent) {
            adr.content = content;
          }

          // Extract timeline if requested
          if (includeTimeline) {
            try {
              const { extractBasicTimeline } = await import('./adr-timeline-extractor.js');
              adr.timeline = await extractBasicTimeline(filePath, content, timelineOptions);
            } catch (error) {
              console.warn(`[Timeline] Failed to extract timeline for ${filename}:`, error);
              // Continue without timeline data
            }
          }

          discoveredAdrs.push(adr);
        }
      } catch (error) {
        console.error(`[WARN] Failed to read file ${filename}:`, error);
      }
    }

    // Generate summary
    const summary = generateAdrSummary(discoveredAdrs);

    // Generate recommendations
    const recommendations = generateRecommendations(discoveredAdrs, adrDirectory);

    // Generate action items if requested
    let actionQueue: AdrWorkQueue | undefined;
    if (generateActions && discoveredAdrs.some(adr => adr.timeline)) {
      try {
        const { detectProjectContext, selectThresholdProfile } =
          await import('./adr-context-detector.js');
        const { generateActionItems } = await import('./adr-action-analyzer.js');

        // Detect project context or use manual profile
        let selectedProfile;
        if (autoDetectContext && !thresholdProfile) {
          const context = await detectProjectContext(projectPath, discoveredAdrs);
          selectedProfile = selectThresholdProfile(context);
        } else {
          const { THRESHOLD_PROFILES } = await import('./adr-context-detector.js');
          selectedProfile =
            THRESHOLD_PROFILES[thresholdProfile || 'mature'] || THRESHOLD_PROFILES['mature'];
        }

        // Generate action items
        actionQueue = await generateActionItems(discoveredAdrs, selectedProfile!, {
          useAdrTypeModifiers: true,
          projectPath,
        });

        // Add action summary to summary object
        (summary as any).totalActionsRequired = actionQueue.summary.totalActions;
        (summary as any).criticalActions = actionQueue.summary.criticalCount;
      } catch (error) {
        console.warn('[Actions] Failed to generate action items:', error);
        // Continue without action items
      }
    }

    return {
      directory: adrDirectory,
      totalAdrs: discoveredAdrs.length,
      adrs: discoveredAdrs,
      summary,
      recommendations,
      ...(actionQueue ? { actionQueue } : {}),
    };
  } catch (error) {
    throw new McpAdrError(
      `Failed to discover ADRs: ${error instanceof Error ? error.message : String(error)}`,
      'DISCOVERY_ERROR'
    );
  }
}

/**
 * Check if a file is likely an ADR based on content and filename
 */
function isLikelyAdr(content: string, filename: string): boolean {
  const contentLower = content.toLowerCase();
  const filenameLower = filename.toLowerCase();

  // Check filename patterns
  const filenamePatterns = [
    /^adr[-_]?\d+/i, // ADR-001, ADR_001, adr-001
    /^\d+[-_]/i, // 001-, 0001_
    /architectural[-_]?decision/i, // architectural-decision
    /decision[-_]?record/i, // decision-record
  ];

  const hasAdrFilename = filenamePatterns.some(pattern => pattern.test(filenameLower));

  // Check content patterns
  const contentPatterns = [
    /# .*decision/i,
    /## status/i,
    /## context/i,
    /## decision/i,
    /## consequences/i,
    /architectural decision record/i,
    /decision record/i,
    /adr[-_]?\d+/i,
  ];

  const hasAdrContent = contentPatterns.some(pattern => pattern.test(contentLower));

  // Must have either ADR filename pattern OR ADR content patterns
  return hasAdrFilename || hasAdrContent;
}

/**
 * Structured fields extracted from an ADR document body.
 *
 * This is the single source of truth for the field-level regexes ADR tooling relies on
 * (title, status, date, number, the Nygard Context/Decision/Consequences sections, and
 * front-matter tags). `parseAdrMetadata` here and the format reader/converter in
 * `adr-format.ts` both read through this helper rather than each keeping a private copy
 * of the regexes.
 */
export interface ExtractedAdrFields {
  title?: string;
  status: string;
  date?: string;
  number?: string;
  context?: string;
  decision?: string;
  consequences?: string;
  tags: string[];
}

/**
 * Extract ADR fields from raw markdown content.
 *
 * `filename` is optional: when supplied it seeds the title fallback and the ADR-number
 * lookup (callers that only have content, such as the format converter, omit it).
 */
export function extractAdrFields(content: string, filename = ''): ExtractedAdrFields {
  // Extract title (usually first # heading)
  let title: string | undefined = filename ? filename.replace(/\.md$/, '') : undefined;
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  }

  // Extract status
  let status = 'unknown';
  const statusMatch = content.match(/(?:##?\s*status|status:)\s*(.+?)(?:\n|$)/i);
  if (statusMatch && statusMatch[1]) {
    status = statusMatch[1].trim().toLowerCase();
  }

  // Extract date
  let date: string | undefined;
  const dateMatch = content.match(/(?:##?\s*date|date:)\s*(.+?)(?:\n|$)/i);
  if (dateMatch && dateMatch[1]) {
    date = dateMatch[1].trim();
  }

  // Extract ADR number from filename or content
  let number: string | undefined;
  const numberMatch =
    (filename ? filename.match(/(?:adr[-_]?)?(\d+)/i) : null) || content.match(/adr[-_]?(\d+)/i);
  if (numberMatch && numberMatch[1]) {
    number = numberMatch[1];
  }

  // Extract context
  let context: string | undefined;
  const contextMatch = content.match(/##?\s*context\s*\n([\s\S]*?)(?=\n##|\n#|$)/i);
  if (contextMatch && contextMatch[1]) {
    context = contextMatch[1].trim();
  }

  // Extract decision
  let decision: string | undefined;
  const decisionMatch = content.match(/##?\s*decision\s*\n([\s\S]*?)(?=\n##|\n#|$)/i);
  if (decisionMatch && decisionMatch[1]) {
    decision = decisionMatch[1].trim();
  }

  // Extract consequences
  let consequences: string | undefined;
  const consequencesMatch = content.match(/##?\s*consequences\s*\n([\s\S]*?)(?=\n##|\n#|$)/i);
  if (consequencesMatch && consequencesMatch[1]) {
    consequences = consequencesMatch[1].trim();
  }

  // Extract category/tags (if any).
  //
  // Three forms occur in the wild, and the idiomatic MADR one used to be the only one
  // that did NOT work -- a YAML block list returned ["- architecture"], capturing the
  // dash and dropping every entry after the first. ADR-022 adopted MADR, whose template
  // uses block lists, so that was the form this needed most.
  //
  //   tags:               tags: a, b        tags: [a, b]
  //     - a
  //     - b
  //
  // Scoped to the leading `---` front-matter block when one is present, so a `tags:`
  // mention in prose cannot be picked up -- the same discipline scripts/check-adr-drift.sh
  // and repo-governor's adapters/adr both use after that exact false positive.
  const tags: string[] = [];
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const tagScope = fmMatch?.[1] ?? content;

  const blockMatch = tagScope.match(
    /^[ \t]*(?:tags?|categories?):[ \t]*\r?\n((?:[ \t]*-[ \t]*\S.*\r?\n?)+)/im
  );
  if (blockMatch?.[1]) {
    tags.push(
      ...blockMatch[1]
        .split(/\r?\n/)
        .map(line => line.replace(/^[ \t]*-[ \t]*/, '').trim())
        .filter(Boolean)
    );
  } else {
    const inlineMatch = tagScope.match(/^[ \t]*(?:tags?|categories?):[ \t]*(.+?)[ \t]*\r?$/im);
    if (inlineMatch?.[1]) {
      tags.push(
        ...inlineMatch[1]
          .replace(/^\[|\]$/g, '') // tolerate the bracket form, which used to keep its brackets
          .split(',')
          .map(tag => tag.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean)
      );
    }
  }

  const fields: ExtractedAdrFields = { status, tags };
  if (title !== undefined) fields.title = title;
  if (date) fields.date = date;
  if (number) fields.number = number;
  if (context) fields.context = context;
  if (decision) fields.decision = decision;
  if (consequences) fields.consequences = consequences;
  return fields;
}

/**
 * Parse ADR metadata from content
 */
function parseAdrMetadata(content: string, filename: string, fullPath: string): DiscoveredAdr {
  const fields = extractAdrFields(content, filename);
  const tags = fields.tags;

  const metadata: DiscoveredAdr['metadata'] = { tags };
  if (fields.number) metadata.number = fields.number;
  if (tags[0]) metadata.category = tags[0];

  const result: DiscoveredAdr = {
    filename,
    title: fields.title ?? filename.replace(/\.md$/, ''),
    status: fields.status,
    date: fields.date,
    path: fullPath,
    metadata,
  };

  if (fields.context) result.context = fields.context;
  if (fields.decision) result.decision = fields.decision;
  if (fields.consequences) result.consequences = fields.consequences;

  return result;
}

/**
 * Generate summary statistics
 */
function generateAdrSummary(adrs: DiscoveredAdr[]) {
  const byStatus: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const adr of adrs) {
    // Count by status
    byStatus[adr.status] = (byStatus[adr.status] || 0) + 1;

    // Count by category
    const category = adr.metadata?.category || 'uncategorized';
    byCategory[category] = (byCategory[category] || 0) + 1;
  }

  return { byStatus, byCategory };
}

/**
 * Generate recommendations based on discovered ADRs
 */
function generateRecommendations(adrs: DiscoveredAdr[], adrDirectory: string): string[] {
  const recommendations: string[] = [];

  if (adrs.length === 0) {
    recommendations.push(
      `No ADRs found in ${adrDirectory}`,
      'Consider creating your first ADR using the generate_adr_from_decision tool',
      'Use suggest_adrs tool to identify architectural decisions that need documentation'
    );
  } else {
    recommendations.push(`Found ${adrs.length} ADRs in ${adrDirectory}`);

    // Check for status distribution
    const statuses = [...new Set(adrs.map(adr => adr.status))];
    if (statuses.includes('proposed') || statuses.includes('draft')) {
      recommendations.push('Consider reviewing and updating proposed/draft ADRs');
    }

    // Check for numbering gaps
    const numbers = adrs
      .map(adr => adr.metadata?.number)
      .filter((n): n is string => n !== undefined)
      .map(n => parseInt(n, 10))
      .sort((a, b) => a - b);

    if (numbers.length > 1) {
      const gaps = [];
      for (let i = 1; i < numbers.length; i++) {
        const prev = numbers[i - 1];
        const curr = numbers[i];
        if (prev !== undefined && curr !== undefined && curr - prev > 1) {
          gaps.push(`${prev + 1}-${curr - 1}`);
        }
      }
      if (gaps.length > 0) {
        recommendations.push(`Consider filling ADR numbering gaps: ${gaps.join(', ')}`);
      }
    }

    // Suggest using discovered ADRs for analysis
    recommendations.push(
      'Use suggest_adrs tool with existingAdrs parameter to find missing decisions',
      'Use generate_adr_todo tool to create implementation tasks from these ADRs'
    );
  }

  return recommendations;
}
