/**
 * ADR Timeline Extractor
 *
 * Extracts timeline information from ADRs using git history,
 * content parsing, or filesystem metadata with smart conditional logic
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { stat } from 'fs/promises';
import type { BasicTimeline, TimelineExtractionOptions } from './adr-timeline-types.js';

const execAsync = promisify(exec);

/**
 * Simple in-memory cache for timeline data
 * Note: The main cache.ts system is designed for AI-driven prompt operations,
 * but we need synchronous in-memory caching for performance here.
 */
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

const timelineCache = new Map<string, CacheEntry>();

function getCachedTimeline(key: string): any | null {
  const entry = timelineCache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > entry.ttl * 1000) {
    timelineCache.delete(key);
    return null;
  }

  return entry.data;
}

function setCachedTimeline(key: string, data: any, ttl: number): void {
  timelineCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

/**
 * Extract basic timeline for an ADR with smart conditional logic
 *
 * Only extracts when necessary:
 * - No timestamp in content
 * - File modified recently
 * - Cache miss or stale
 */
export async function extractBasicTimeline(
  adrPath: string,
  adrContent: string,
  options: TimelineExtractionOptions = {}
): Promise<BasicTimeline> {
  const {
    useCache = true,
    cacheTTL = 3600, // 1 hour default
    forceExtract = false,
  } = options;

  // Check if extraction can be skipped (unless forced)
  if (!forceExtract) {
    const decision = await shouldExtractTimeline(adrPath, adrContent);

    if (!decision.shouldExtract && decision.useExisting) {
      // Use existing date from content
      return createTimelineFromContent(adrContent, decision.useExisting, decision.reason);
    }

    if (!decision.shouldExtract && !decision.useExisting) {
      // Use cached data
      const cached = getCachedTimeline(`timeline:${adrPath}`);
      if (cached) {
        return cached as BasicTimeline;
      }
    }

    // Log extraction reason for debugging
    if (decision.shouldExtract) {
      console.log(`[Timeline] Extracting for ${adrPath}: ${decision.reason}`);
    }
  }

  // Perform extraction using priority order: git → content → filesystem
  let timeline: Partial<BasicTimeline> | null = null;

  // Try git extraction first
  timeline = await tryGitExtraction(adrPath);

  // Fallback to content parsing
  if (!timeline || !timeline.created_at) {
    const contentDate = extractDateFromContent(adrContent);
    if (contentDate) {
      timeline = {
        created_at: contentDate,
        updated_at: contentDate,
        extraction_method: 'content',
      };
    }
  }

  // Final fallback to filesystem
  if (!timeline || !timeline.created_at) {
    timeline = await fallbackToFilesystem(adrPath);
  }

  // Calculate derived fields
  const stats = await stat(adrPath);
  const ageDays = calculateAgeDays(timeline.created_at!);
  const daysSinceUpdate = calculateAgeDays(timeline.updated_at!);

  const fullTimeline: BasicTimeline = {
    created_at: timeline.created_at!,
    updated_at: timeline.updated_at!,
    age_days: ageDays,
    days_since_update: daysSinceUpdate,
    staleness_warnings: generateBasicWarnings(ageDays, daysSinceUpdate),
    extraction_method: timeline.extraction_method as 'git' | 'content' | 'filesystem',
  };

  // Cache result with file modification time for future checks
  if (useCache) {
    setCachedTimeline(
      `timeline:${adrPath}`,
      {
        ...fullTimeline,
        _fileModifiedAt: stats.mtime.toISOString(),
        _cachedAt: new Date().toISOString(),
      },
      cacheTTL
    );
  }

  return fullTimeline;
}

/**
 * Determine if timeline extraction should run
 */
async function shouldExtractTimeline(
  adrPath: string,
  adrContent: string
): Promise<{
  shouldExtract: boolean;
  reason: string;
  useExisting?: string;
}> {
  // Check if ADR content has a date field
  const dateInContent = extractDateFromContent(adrContent);

  // Check file modification time
  const stats = await stat(adrPath);
  const fileModifiedAt = stats.mtime;

  // Check cache
  const cacheKey = `timeline:${adrPath}`;
  const cached = getCachedTimeline(cacheKey);

  // CONDITION 1: No date in content → MUST extract
  if (!dateInContent) {
    return {
      shouldExtract: true,
      reason: 'No timestamp found in ADR content',
    };
  }

  // CONDITION 2: Has date + cached + file unchanged → SKIP
  if (cached && cached._fileModifiedAt) {
    const cachedModTime = new Date(cached._fileModifiedAt);
    if (fileModifiedAt <= cachedModTime) {
      return {
        shouldExtract: false,
        reason: 'File unchanged since last extraction',
        useExisting: dateInContent,
      };
    }
  }

  // CONDITION 3: Has date + file modified recently → RE-EXTRACT
  const daysSinceModification = (Date.now() - fileModifiedAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceModification < 7) {
    // Modified within last week
    return {
      shouldExtract: true,
      reason: `File modified ${Math.floor(daysSinceModification)} days ago`,
    };
  }

  // CONDITION 4: Has date + old file → USE CONTENT DATE
  return {
    shouldExtract: false,
    reason: 'File has valid date and is stable (not recently modified)',
    useExisting: dateInContent,
  };
}

/**
 * Extract date from ADR content using regex
 */
function extractDateFromContent(content: string): string | null {
  const dateMatch = content.match(/(?:##?\s*date|date:|\*\*date\*\*:)\s*(.+?)(?:\n|$)/i);
  if (dateMatch && dateMatch[1]) {
    const dateStr = dateMatch[1].trim();
    try {
      // Validate it's a parseable date
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {
      // Invalid date format
    }
  }
  return null;
}

/**
 * Create timeline from ADR content date (no git extraction needed)
 */
function createTimelineFromContent(
  _content: string,
  dateStr: string,
  reason: string
): BasicTimeline {
  let decisionDate: Date;
  try {
    decisionDate = new Date(dateStr);
  } catch {
    // Fallback to current time if parsing fails
    decisionDate = new Date();
  }

  const isoDate = decisionDate.toISOString();
  const ageDays = calculateAgeDays(isoDate);

  return {
    created_at: isoDate,
    updated_at: isoDate, // Assume same as creation
    age_days: ageDays,
    days_since_update: ageDays,
    staleness_warnings: generateBasicWarnings(ageDays, ageDays),
    extraction_method: 'content',
    extraction_skipped: true,
    skip_reason: reason,
  };
}

/**
 * Try to extract timeline from git history
 */
async function tryGitExtraction(adrPath: string): Promise<Partial<BasicTimeline> | null> {
  try {
    // Creation date (first commit)
    const { stdout: created } = await execAsync(
      `git log --diff-filter=A --follow --format=%aI -- "${adrPath}" | tail -1`,
      { timeout: 5000 }
    );

    // Last modification date
    const { stdout: updated } = await execAsync(`git log -1 --format=%aI -- "${adrPath}"`, {
      timeout: 5000,
    });

    if (!created.trim() || !updated.trim()) {
      return null;
    }

    return {
      created_at: created.trim(),
      updated_at: updated.trim(),
      extraction_method: 'git',
    };
  } catch (error) {
    // Git not available, not a git repo, or command failed
    console.warn(`[Timeline] Git extraction failed for ${adrPath}:`, error);
    return null;
  }
}

/**
 * Fallback to filesystem timestamps
 */
async function fallbackToFilesystem(adrPath: string): Promise<Partial<BasicTimeline>> {
  try {
    const stats = await stat(adrPath);

    return {
      created_at: stats.birthtime.toISOString(),
      updated_at: stats.mtime.toISOString(),
      extraction_method: 'filesystem',
    };
  } catch {
    // Last resort: use current time
    const now = new Date().toISOString();
    return {
      created_at: now,
      updated_at: now,
      extraction_method: 'filesystem',
    };
  }
}

/**
 * Calculate age in days from ISO timestamp
 */
function calculateAgeDays(isoTimestamp: string): number {
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Generate basic staleness warnings
 */
function generateBasicWarnings(ageDays: number, daysSinceUpdate: number): string[] {
  const warnings: string[] = [];

  // Warning: Old ADR
  if (ageDays > 180) {
    warnings.push(`ADR is ${ageDays} days old (>6 months)`);
  }

  // Warning: No recent updates
  if (daysSinceUpdate > 365) {
    warnings.push(`No updates in ${daysSinceUpdate} days (>1 year)`);
  }

  // Warning: Very old dormant ADR
  if (daysSinceUpdate > 730) {
    warnings.push(`Dormant for ${Math.floor(daysSinceUpdate / 365)} years - may be obsolete`);
  }

  return warnings;
}

/**
 * Helper to extract keywords from ADR content for implementation tracking
 */
export function extractKeywordsFromAdr(title: string, decision?: string): string[] {
  const text = `${title} ${decision || ''}`.toLowerCase();
  const keywords: string[] = [];

  // Extract technology names
  const techPatterns = [
    /\b(redis|postgres|mongodb|mysql|kafka|rabbitmq|docker|kubernetes|aws|gcp|azure)\b/gi,
    /\b(react|vue|angular|node|express|fastapi|django|flask|spring)\b/gi,
    /\b(graphql|rest|grpc|websocket|oauth|jwt|saml)\b/gi,
  ];

  techPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      keywords.push(...matches.map(m => m.toLowerCase()));
    }
  });

  // Extract quoted terms (likely important concepts)
  const quoted = text.match(/"([^"]+)"/g);
  if (quoted) {
    keywords.push(...quoted.map(q => q.replace(/"/g, '').toLowerCase()));
  }

  // Remove duplicates
  return [...new Set(keywords)];
}
