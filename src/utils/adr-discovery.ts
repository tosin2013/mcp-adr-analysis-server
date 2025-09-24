/**
 * ADR Discovery Utilities
 *
 * Utilities for discovering and analyzing existing ADRs in the project
 */

import { McpAdrError } from '../types/index.js';

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
  };
  /** Recommendations for improving ADR management */
  recommendations: string[];
}

/**
 * Discover ADRs in a directory using file system operations
 *
 * @param adrDirectory - Relative path to ADR directory
 * @param includeContent - Whether to include full content of ADR files
 * @param projectPath - Root path of the project
 * @returns Promise resolving to ADR discovery results
 * @throws McpAdrError if directory access fails or parsing errors occur
 */
export async function discoverAdrsInDirectory(
  adrDirectory: string,
  includeContent: boolean = false,
  projectPath: string
): Promise<AdrDiscoveryResult> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Resolve the ADR directory path
    const fullAdrPath = path.resolve(projectPath, adrDirectory);

    // Check if directory exists
    let dirExists = false;
    try {
      const stat = await fs.stat(fullAdrPath);
      dirExists = stat.isDirectory();
    } catch {
      // Directory doesn't exist
    }

    if (!dirExists) {
      return {
        directory: adrDirectory,
        totalAdrs: 0,
        adrs: [],
        summary: { byStatus: {}, byCategory: {} },
        recommendations: [
          `ADR directory '${adrDirectory}' does not exist`,
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

    return {
      directory: adrDirectory,
      totalAdrs: discoveredAdrs.length,
      adrs: discoveredAdrs,
      summary,
      recommendations,
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
 * Parse ADR metadata from content
 */
function parseAdrMetadata(content: string, filename: string, fullPath: string): DiscoveredAdr {
  // Extract title (usually first # heading)
  let title = filename.replace(/\.md$/, '');
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
  const numberMatch = filename.match(/(?:adr[-_]?)?(\d+)/i) || content.match(/adr[-_]?(\d+)/i);
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

  // Extract category/tags (if any)
  const tags: string[] = [];
  const tagMatch = content.match(/(?:tags?|categories?):\s*(.+?)(?:\n|$)/i);
  if (tagMatch && tagMatch[1]) {
    tags.push(...tagMatch[1].split(',').map(tag => tag.trim()));
  }

  const metadata: DiscoveredAdr['metadata'] = { tags };
  if (number) metadata.number = number;
  if (tags[0]) metadata.category = tags[0];

  const result: DiscoveredAdr = {
    filename,
    title,
    status,
    date,
    path: fullPath,
    metadata,
  };

  if (context) result.context = context;
  if (decision) result.decision = decision;
  if (consequences) result.consequences = consequences;

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
