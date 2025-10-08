/**
 * Resource Versioning and Metadata Tracking
 *
 * Provides version control for MCP resources, enabling:
 * - Semantic versioning (MAJOR.MINOR.PATCH)
 * - Backward compatibility checking
 * - Version migration support
 * - Metadata tracking (creation, updates, changelog)
 */

import { URLSearchParams } from 'url';

/**
 * Semantic version structure
 */
export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
}

/**
 * Resource metadata for tracking changes
 */
export interface ResourceMetadata {
  version: string; // Semantic version string (e.g., "1.2.3")
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
  schemaVersion: string; // Schema compatibility version
  changelog?: ChangelogEntry[]; // Optional change history
  deprecationNotice?: DeprecationNotice; // Optional deprecation info
}

/**
 * Changelog entry for tracking changes
 */
export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
  breakingChanges?: string[];
  author?: string;
}

/**
 * Deprecation notice for resources
 */
export interface DeprecationNotice {
  deprecatedIn: string; // Version when deprecated
  removedIn?: string; // Version when removed (if known)
  reason: string;
  migration: string; // Migration guide
}

/**
 * Version comparison result
 */
export enum VersionComparisonResult {
  MAJOR_BREAKING = 'major_breaking',
  MINOR_COMPATIBLE = 'minor_compatible',
  PATCH_COMPATIBLE = 'patch_compatible',
  EQUAL = 'equal',
  OLDER = 'older',
}

/**
 * Parse semantic version string to object
 */
export function parseVersion(versionString: string): SemanticVersion {
  const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid semantic version: ${versionString}`);
  }

  return {
    major: parseInt(match[1]!, 10),
    minor: parseInt(match[2]!, 10),
    patch: parseInt(match[3]!, 10),
  };
}

/**
 * Convert semantic version object to string
 */
export function versionToString(version: SemanticVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

/**
 * Compare two semantic versions
 * @returns VersionComparisonResult indicating relationship
 */
export function compareVersions(
  current: string,
  requested: string
): VersionComparisonResult {
  const currentV = parseVersion(current);
  const requestedV = parseVersion(requested);

  // Equal versions
  if (
    currentV.major === requestedV.major &&
    currentV.minor === requestedV.minor &&
    currentV.patch === requestedV.patch
  ) {
    return VersionComparisonResult.EQUAL;
  }

  // Current is older than requested
  if (
    currentV.major < requestedV.major ||
    (currentV.major === requestedV.major && currentV.minor < requestedV.minor) ||
    (currentV.major === requestedV.major &&
      currentV.minor === requestedV.minor &&
      currentV.patch < requestedV.patch)
  ) {
    return VersionComparisonResult.OLDER;
  }

  // Current is newer - check compatibility
  if (currentV.major > requestedV.major) {
    return VersionComparisonResult.MAJOR_BREAKING;
  }

  if (currentV.minor > requestedV.minor) {
    return VersionComparisonResult.MINOR_COMPATIBLE;
  }

  return VersionComparisonResult.PATCH_COMPATIBLE;
}

/**
 * Check if two versions are compatible (same major version)
 */
export function isCompatible(version1: string, version2: string): boolean {
  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);
  return v1.major === v2.major;
}

/**
 * Increment version based on change type
 */
export function incrementVersion(
  current: string,
  changeType: 'major' | 'minor' | 'patch'
): string {
  const version = parseVersion(current);

  switch (changeType) {
    case 'major':
      return versionToString({ major: version.major + 1, minor: 0, patch: 0 });
    case 'minor':
      return versionToString({ major: version.major, minor: version.minor + 1, patch: 0 });
    case 'patch':
      return versionToString({ major: version.major, minor: version.minor, patch: version.patch + 1 });
    default:
      throw new Error(`Invalid change type: ${changeType}`);
  }
}

/**
 * Create initial resource metadata
 */
export function createResourceMetadata(version: string = '1.0.0'): ResourceMetadata {
  const now = new Date().toISOString();
  return {
    version,
    createdAt: now,
    updatedAt: now,
    schemaVersion: version,
  };
}

/**
 * Update resource metadata with new version
 */
export function updateResourceMetadata(
  current: ResourceMetadata,
  newVersion: string,
  changes: string[],
  breakingChanges?: string[]
): ResourceMetadata {
  const now = new Date().toISOString();

  const changelogEntry: ChangelogEntry = {
    version: newVersion,
    date: now,
    changes,
  };

  // Only add breakingChanges if provided
  if (breakingChanges) {
    changelogEntry.breakingChanges = breakingChanges;
  }

  return {
    ...current,
    version: newVersion,
    updatedAt: now,
    changelog: [...(current.changelog || []), changelogEntry],
  };
}

/**
 * Mark resource as deprecated
 */
export function deprecateResource(
  metadata: ResourceMetadata,
  reason: string,
  migration: string,
  removedIn?: string
): ResourceMetadata {
  const deprecationNotice: DeprecationNotice = {
    deprecatedIn: metadata.version,
    reason,
    migration,
  };

  // Only add removedIn if provided
  if (removedIn) {
    deprecationNotice.removedIn = removedIn;
  }

  return {
    ...metadata,
    deprecationNotice,
  };
}

/**
 * Check if resource is deprecated
 */
export function isDeprecated(metadata: ResourceMetadata): boolean {
  return metadata.deprecationNotice !== undefined;
}

/**
 * Extract version from URI search parameters
 */
export function extractVersionFromParams(searchParams?: URLSearchParams): string | null {
  if (!searchParams) {
    return null;
  }
  return searchParams.get('version');
}

/**
 * Validate requested version against available versions
 */
export function validateVersionRequest(
  requested: string | null,
  current: string,
  supportedVersions: string[]
): {
  valid: boolean;
  version: string;
  warning?: string;
} {
  // No version requested - use current
  if (!requested) {
    return { valid: true, version: current };
  }

  // Check if requested version is supported
  if (!supportedVersions.includes(requested)) {
    return {
      valid: false,
      version: current,
      warning: `Version ${requested} not supported. Using current version ${current}. Supported: ${supportedVersions.join(', ')}`,
    };
  }

  // Check compatibility
  const comparison = compareVersions(current, requested);

  if (comparison === VersionComparisonResult.MAJOR_BREAKING) {
    return {
      valid: true,
      version: requested,
      warning: `Warning: Version ${requested} has breaking changes from current ${current}`,
    };
  }

  return { valid: true, version: requested };
}

/**
 * Generate version compatibility matrix
 */
export function generateCompatibilityMatrix(versions: string[]): Map<string, string[]> {
  const matrix = new Map<string, string[]>();

  for (const version of versions) {
    const compatible = versions.filter((v) => isCompatible(version, v));
    matrix.set(version, compatible);
  }

  return matrix;
}

/**
 * Get changelog for specific version range
 */
export function getChangelogForRange(
  metadata: ResourceMetadata,
  fromVersion: string,
  toVersion: string
): ChangelogEntry[] {
  if (!metadata.changelog) {
    return [];
  }

  const from = parseVersion(fromVersion);
  const to = parseVersion(toVersion);

  return metadata.changelog.filter((entry) => {
    const entryVersion = parseVersion(entry.version);

    // Version is within range (exclusive of fromVersion, inclusive of toVersion)
    const isAfterFrom =
      entryVersion.major > from.major ||
      (entryVersion.major === from.major && entryVersion.minor > from.minor) ||
      (entryVersion.major === from.major &&
        entryVersion.minor === from.minor &&
        entryVersion.patch > from.patch);

    const isBeforeOrEqualTo =
      entryVersion.major < to.major ||
      (entryVersion.major === to.major && entryVersion.minor < to.minor) ||
      (entryVersion.major === to.major &&
        entryVersion.minor === to.minor &&
        entryVersion.patch <= to.patch);

    return isAfterFrom && isBeforeOrEqualTo;
  });
}

/**
 * Extract breaking changes from changelog
 */
export function getBreakingChanges(metadata: ResourceMetadata): ChangelogEntry[] {
  if (!metadata.changelog) {
    return [];
  }

  return metadata.changelog.filter(
    (entry) => entry.breakingChanges && entry.breakingChanges.length > 0
  );
}

/**
 * Format metadata for display
 */
export function formatMetadata(metadata: ResourceMetadata): string {
  const lines = [
    `Version: ${metadata.version}`,
    `Schema: ${metadata.schemaVersion}`,
    `Created: ${metadata.createdAt}`,
    `Updated: ${metadata.updatedAt}`,
  ];

  if (metadata.deprecationNotice) {
    lines.push('');
    lines.push('⚠️  DEPRECATED');
    lines.push(`Deprecated in: ${metadata.deprecationNotice.deprecatedIn}`);
    if (metadata.deprecationNotice.removedIn) {
      lines.push(`Will be removed in: ${metadata.deprecationNotice.removedIn}`);
    }
    lines.push(`Reason: ${metadata.deprecationNotice.reason}`);
    lines.push(`Migration: ${metadata.deprecationNotice.migration}`);
  }

  if (metadata.changelog && metadata.changelog.length > 0) {
    lines.push('');
    lines.push('Recent Changes:');
    const recentChanges = metadata.changelog.slice(-3).reverse();
    for (const entry of recentChanges) {
      lines.push(`  v${entry.version} (${entry.date})`);
      for (const change of entry.changes) {
        lines.push(`    - ${change}`);
      }
      if (entry.breakingChanges && entry.breakingChanges.length > 0) {
        lines.push('    ⚠️  Breaking Changes:');
        for (const breaking of entry.breakingChanges) {
          lines.push(`      - ${breaking}`);
        }
      }
    }
  }

  return lines.join('\n');
}
