/**
 * Unit tests for resource-versioning.ts
 * Tests semantic versioning, metadata tracking, and version comparison
 */

import { URLSearchParams } from 'url';
import { describe, it, expect } from '@jest/globals';
import {
  parseVersion,
  versionToString,
  compareVersions,
  isCompatible,
  incrementVersion,
  createResourceMetadata,
  updateResourceMetadata,
  deprecateResource,
  isDeprecated,
  extractVersionFromParams,
  validateVersionRequest,
  generateCompatibilityMatrix,
  getChangelogForRange,
  getBreakingChanges,
  formatMetadata,
  VersionComparisonResult,
  type SemanticVersion,
  type ResourceMetadata,
} from '../../src/utils/resource-versioning.js';

describe('Resource Versioning Utilities', () => {
  describe('Version Parsing', () => {
    it('should parse valid semantic version', () => {
      const version = parseVersion('1.2.3');
      expect(version).toEqual({ major: 1, minor: 2, patch: 3 });
    });

    it('should parse version with zeros', () => {
      const version = parseVersion('0.0.1');
      expect(version).toEqual({ major: 0, minor: 0, patch: 1 });
    });

    it('should parse large version numbers', () => {
      const version = parseVersion('10.20.30');
      expect(version).toEqual({ major: 10, minor: 20, patch: 30 });
    });

    it('should throw error for invalid version', () => {
      expect(() => parseVersion('1.2')).toThrow('Invalid semantic version');
      expect(() => parseVersion('v1.2.3')).toThrow('Invalid semantic version');
      expect(() => parseVersion('1.2.3-beta')).toThrow('Invalid semantic version');
    });
  });

  describe('Version String Conversion', () => {
    it('should convert version object to string', () => {
      const version: SemanticVersion = { major: 1, minor: 2, patch: 3 };
      expect(versionToString(version)).toBe('1.2.3');
    });

    it('should handle zeros in version', () => {
      const version: SemanticVersion = { major: 0, minor: 0, patch: 1 };
      expect(versionToString(version)).toBe('0.0.1');
    });

    it('should be reversible with parseVersion', () => {
      const original = '5.10.15';
      const parsed = parseVersion(original);
      const stringified = versionToString(parsed);
      expect(stringified).toBe(original);
    });
  });

  describe('Version Comparison', () => {
    it('should identify equal versions', () => {
      const result = compareVersions('1.2.3', '1.2.3');
      expect(result).toBe(VersionComparisonResult.EQUAL);
    });

    it('should identify older version', () => {
      const result = compareVersions('1.2.3', '2.0.0');
      expect(result).toBe(VersionComparisonResult.OLDER);
    });

    it('should identify major breaking change', () => {
      const result = compareVersions('2.0.0', '1.5.0');
      expect(result).toBe(VersionComparisonResult.MAJOR_BREAKING);
    });

    it('should identify minor compatible change', () => {
      const result = compareVersions('1.3.0', '1.2.0');
      expect(result).toBe(VersionComparisonResult.MINOR_COMPATIBLE);
    });

    it('should identify patch compatible change', () => {
      const result = compareVersions('1.2.4', '1.2.3');
      expect(result).toBe(VersionComparisonResult.PATCH_COMPATIBLE);
    });

    it('should handle version with zeros', () => {
      const result = compareVersions('0.1.0', '0.0.9');
      expect(result).toBe(VersionComparisonResult.MINOR_COMPATIBLE);
    });
  });

  describe('Version Compatibility', () => {
    it('should identify compatible versions (same major)', () => {
      expect(isCompatible('1.2.3', '1.5.0')).toBe(true);
      expect(isCompatible('1.0.0', '1.9.9')).toBe(true);
    });

    it('should identify incompatible versions (different major)', () => {
      expect(isCompatible('1.2.3', '2.0.0')).toBe(false);
      expect(isCompatible('2.0.0', '1.9.9')).toBe(false);
    });

    it('should handle major version 0', () => {
      expect(isCompatible('0.1.0', '0.2.0')).toBe(true);
    });
  });

  describe('Version Incrementing', () => {
    it('should increment major version', () => {
      expect(incrementVersion('1.2.3', 'major')).toBe('2.0.0');
      expect(incrementVersion('0.9.9', 'major')).toBe('1.0.0');
    });

    it('should increment minor version', () => {
      expect(incrementVersion('1.2.3', 'minor')).toBe('1.3.0');
      expect(incrementVersion('1.0.9', 'minor')).toBe('1.1.0');
    });

    it('should increment patch version', () => {
      expect(incrementVersion('1.2.3', 'patch')).toBe('1.2.4');
      expect(incrementVersion('1.2.0', 'patch')).toBe('1.2.1');
    });

    it('should throw error for invalid change type', () => {
      expect(() => incrementVersion('1.2.3', 'invalid' as any)).toThrow();
    });
  });

  describe('Resource Metadata Creation', () => {
    it('should create initial metadata with default version', () => {
      const metadata = createResourceMetadata();
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.schemaVersion).toBe('1.0.0');
      expect(metadata.createdAt).toBeDefined();
      expect(metadata.updatedAt).toBeDefined();
      expect(metadata.createdAt).toBe(metadata.updatedAt);
    });

    it('should create metadata with custom version', () => {
      const metadata = createResourceMetadata('2.5.0');
      expect(metadata.version).toBe('2.5.0');
      expect(metadata.schemaVersion).toBe('2.5.0');
    });

    it('should use ISO 8601 timestamps', () => {
      const metadata = createResourceMetadata();
      expect(new Date(metadata.createdAt).toISOString()).toBe(metadata.createdAt);
    });
  });

  describe('Resource Metadata Updates', () => {
    it('should update metadata with new version', () => {
      const initial = createResourceMetadata('1.0.0');
      const updated = updateResourceMetadata(
        initial,
        '1.1.0',
        ['Added new feature'],
      );

      expect(updated.version).toBe('1.1.0');
      expect(updated.changelog).toHaveLength(1);
      expect(updated.changelog![0].version).toBe('1.1.0');
      expect(updated.changelog![0].changes).toEqual(['Added new feature']);
    });

    it('should track breaking changes', () => {
      const initial = createResourceMetadata('1.0.0');
      const updated = updateResourceMetadata(
        initial,
        '2.0.0',
        ['Major refactor'],
        ['Removed old API'],
      );

      expect(updated.version).toBe('2.0.0');
      expect(updated.changelog![0].breakingChanges).toEqual(['Removed old API']);
    });

    it('should preserve existing changelog', () => {
      let metadata = createResourceMetadata('1.0.0');
      metadata = updateResourceMetadata(metadata, '1.1.0', ['Feature 1']);
      metadata = updateResourceMetadata(metadata, '1.2.0', ['Feature 2']);

      expect(metadata.changelog).toHaveLength(2);
      expect(metadata.changelog![0].version).toBe('1.1.0');
      expect(metadata.changelog![1].version).toBe('1.2.0');
    });

    it('should update updatedAt timestamp', async () => {
      const initial = createResourceMetadata('1.0.0');
      const initialTime = initial.updatedAt;

      // Wait 1ms to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 1));
      const updated = updateResourceMetadata(initial, '1.1.0', ['Update']);
      expect(updated.updatedAt).not.toBe(initialTime);
    });
  });

  describe('Resource Deprecation', () => {
    it('should mark resource as deprecated', () => {
      const metadata = createResourceMetadata('1.5.0');
      const deprecated = deprecateResource(
        metadata,
        'Outdated architecture',
        'Use new-resource instead',
      );

      expect(deprecated.deprecationNotice).toBeDefined();
      expect(deprecated.deprecationNotice!.deprecatedIn).toBe('1.5.0');
      expect(deprecated.deprecationNotice!.reason).toBe('Outdated architecture');
      expect(deprecated.deprecationNotice!.migration).toBe('Use new-resource instead');
    });

    it('should include removal version if provided', () => {
      const metadata = createResourceMetadata('1.5.0');
      const deprecated = deprecateResource(
        metadata,
        'Replaced by better alternative',
        'Migrate to v2',
        '3.0.0',
      );

      expect(deprecated.deprecationNotice!.removedIn).toBe('3.0.0');
    });

    it('should detect deprecated resources', () => {
      const metadata = createResourceMetadata('1.0.0');
      expect(isDeprecated(metadata)).toBe(false);

      const deprecated = deprecateResource(metadata, 'Old', 'Use new');
      expect(isDeprecated(deprecated)).toBe(true);
    });
  });

  describe('Version Extraction from Params', () => {
    it('should extract version from search params', () => {
      const params = new URLSearchParams({ version: '1.2.3' });
      expect(extractVersionFromParams(params)).toBe('1.2.3');
    });

    it('should return null when no version param', () => {
      const params = new URLSearchParams({ other: 'value' });
      expect(extractVersionFromParams(params)).toBeNull();
    });

    it('should return null when no params', () => {
      expect(extractVersionFromParams(undefined)).toBeNull();
    });

    it('should handle empty search params', () => {
      const params = new URLSearchParams();
      expect(extractVersionFromParams(params)).toBeNull();
    });
  });

  describe('Version Request Validation', () => {
    const supportedVersions = ['1.0.0', '1.1.0', '1.2.0', '2.0.0'];

    it('should use current version when no version requested', () => {
      const result = validateVersionRequest(null, '2.0.0', supportedVersions);
      expect(result.valid).toBe(true);
      expect(result.version).toBe('2.0.0');
      expect(result.warning).toBeUndefined();
    });

    it('should accept supported version', () => {
      const result = validateVersionRequest('1.1.0', '2.0.0', supportedVersions);
      expect(result.valid).toBe(true);
      expect(result.version).toBe('1.1.0');
    });

    it('should reject unsupported version', () => {
      const result = validateVersionRequest('0.9.0', '2.0.0', supportedVersions);
      expect(result.valid).toBe(false);
      expect(result.version).toBe('2.0.0'); // Falls back to current
      expect(result.warning).toContain('not supported');
    });

    it('should warn about major breaking changes', () => {
      const result = validateVersionRequest('1.0.0', '2.0.0', supportedVersions);
      expect(result.valid).toBe(true);
      expect(result.version).toBe('1.0.0');
      expect(result.warning).toContain('breaking changes');
    });

    it('should not warn for compatible versions', () => {
      const result = validateVersionRequest('1.1.0', '1.2.0', supportedVersions);
      expect(result.valid).toBe(true);
      expect(result.version).toBe('1.1.0');
      expect(result.warning).toBeUndefined();
    });
  });

  describe('Compatibility Matrix', () => {
    it('should generate compatibility matrix', () => {
      const versions = ['1.0.0', '1.1.0', '1.2.0', '2.0.0', '2.1.0'];
      const matrix = generateCompatibilityMatrix(versions);

      expect(matrix.get('1.0.0')).toEqual(['1.0.0', '1.1.0', '1.2.0']);
      expect(matrix.get('2.0.0')).toEqual(['2.0.0', '2.1.0']);
    });

    it('should handle single version', () => {
      const versions = ['1.0.0'];
      const matrix = generateCompatibilityMatrix(versions);

      expect(matrix.get('1.0.0')).toEqual(['1.0.0']);
    });

    it('should handle version 0.x.x correctly', () => {
      const versions = ['0.1.0', '0.2.0', '1.0.0'];
      const matrix = generateCompatibilityMatrix(versions);

      expect(matrix.get('0.1.0')).toEqual(['0.1.0', '0.2.0']);
      expect(matrix.get('1.0.0')).toEqual(['1.0.0']);
    });
  });

  describe('Changelog Filtering', () => {
    let metadata: ResourceMetadata;

    beforeEach(() => {
      metadata = createResourceMetadata('1.0.0');
      metadata = updateResourceMetadata(metadata, '1.1.0', ['Feature A']);
      metadata = updateResourceMetadata(metadata, '1.2.0', ['Feature B']);
      metadata = updateResourceMetadata(metadata, '2.0.0', ['Breaking change'], ['API v1 removed']);
      metadata = updateResourceMetadata(metadata, '2.1.0', ['Feature C']);
    });

    it('should get changelog for version range', () => {
      const changelog = getChangelogForRange(metadata, '1.0.0', '2.0.0');
      expect(changelog).toHaveLength(3);
      expect(changelog[0].version).toBe('1.1.0');
      expect(changelog[1].version).toBe('1.2.0');
      expect(changelog[2].version).toBe('2.0.0');
    });

    it('should exclude fromVersion (exclusive)', () => {
      const changelog = getChangelogForRange(metadata, '1.1.0', '2.1.0');
      expect(changelog.find(e => e.version === '1.1.0')).toBeUndefined();
    });

    it('should include toVersion (inclusive)', () => {
      const changelog = getChangelogForRange(metadata, '1.0.0', '2.1.0');
      const last = changelog[changelog.length - 1];
      expect(last.version).toBe('2.1.0');
    });

    it('should handle empty range', () => {
      const changelog = getChangelogForRange(metadata, '2.0.0', '2.0.0');
      // Range is exclusive of fromVersion, so (2.0.0, 2.0.0] is empty
      expect(changelog).toHaveLength(0);
    });
  });

  describe('Breaking Changes Extraction', () => {
    it('should extract entries with breaking changes', () => {
      let metadata = createResourceMetadata('1.0.0');
      metadata = updateResourceMetadata(metadata, '1.1.0', ['Feature']);
      metadata = updateResourceMetadata(metadata, '2.0.0', ['Refactor'], ['API changed']);
      metadata = updateResourceMetadata(metadata, '2.1.0', ['Update'], ['Removed method']);

      const breaking = getBreakingChanges(metadata);
      expect(breaking).toHaveLength(2);
      expect(breaking[0].version).toBe('2.0.0');
      expect(breaking[1].version).toBe('2.1.0');
    });

    it('should return empty array when no changelog', () => {
      const metadata = createResourceMetadata('1.0.0');
      const breaking = getBreakingChanges(metadata);
      expect(breaking).toEqual([]);
    });

    it('should return empty array when no breaking changes', () => {
      let metadata = createResourceMetadata('1.0.0');
      metadata = updateResourceMetadata(metadata, '1.1.0', ['Feature A']);
      metadata = updateResourceMetadata(metadata, '1.2.0', ['Feature B']);

      const breaking = getBreakingChanges(metadata);
      expect(breaking).toEqual([]);
    });
  });

  describe('Metadata Formatting', () => {
    it('should format basic metadata', () => {
      const metadata = createResourceMetadata('1.0.0');
      const formatted = formatMetadata(metadata);

      expect(formatted).toContain('Version: 1.0.0');
      expect(formatted).toContain('Schema: 1.0.0');
      expect(formatted).toContain('Created:');
      expect(formatted).toContain('Updated:');
    });

    it('should format deprecation notice', () => {
      let metadata = createResourceMetadata('1.5.0');
      metadata = deprecateResource(
        metadata,
        'Old architecture',
        'Use v2 API',
        '3.0.0',
      );

      const formatted = formatMetadata(metadata);
      expect(formatted).toContain('DEPRECATED');
      expect(formatted).toContain('Deprecated in: 1.5.0');
      expect(formatted).toContain('Will be removed in: 3.0.0');
      expect(formatted).toContain('Reason: Old architecture');
      expect(formatted).toContain('Migration: Use v2 API');
    });

    it('should format recent changelog entries', () => {
      let metadata = createResourceMetadata('1.0.0');
      metadata = updateResourceMetadata(metadata, '1.1.0', ['Feature A', 'Feature B']);
      metadata = updateResourceMetadata(metadata, '1.2.0', ['Feature C']);

      const formatted = formatMetadata(metadata);
      expect(formatted).toContain('Recent Changes:');
      expect(formatted).toContain('v1.2.0');
      expect(formatted).toContain('v1.1.0');
      expect(formatted).toContain('Feature A');
      expect(formatted).toContain('Feature C');
    });

    it('should format breaking changes in changelog', () => {
      let metadata = createResourceMetadata('1.0.0');
      metadata = updateResourceMetadata(
        metadata,
        '2.0.0',
        ['Major update'],
        ['API v1 removed', 'New authentication'],
      );

      const formatted = formatMetadata(metadata);
      expect(formatted).toContain('Breaking Changes:');
      expect(formatted).toContain('API v1 removed');
      expect(formatted).toContain('New authentication');
    });

    it('should limit to 3 most recent changelog entries', () => {
      let metadata = createResourceMetadata('1.0.0');
      metadata = updateResourceMetadata(metadata, '1.1.0', ['A']);
      metadata = updateResourceMetadata(metadata, '1.2.0', ['B']);
      metadata = updateResourceMetadata(metadata, '1.3.0', ['C']);
      metadata = updateResourceMetadata(metadata, '1.4.0', ['D']);

      const formatted = formatMetadata(metadata);
      expect(formatted).toContain('v1.4.0');
      expect(formatted).toContain('v1.3.0');
      expect(formatted).toContain('v1.2.0');
      expect(formatted).not.toContain('v1.1.0'); // Oldest should be excluded
    });
  });
});
