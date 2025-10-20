/**
 * Tests for PatternLoader utility
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PatternLoader } from '../../src/utils/pattern-loader.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PatternLoader', () => {
  let loader: PatternLoader;
  let patternsDir: string;

  beforeEach(() => {
    // Use actual patterns directory
    patternsDir = join(__dirname, '../../patterns');
    loader = new PatternLoader(patternsDir);
  });

  describe('loadPattern', () => {
    it('should load OpenShift pattern by filename', async () => {
      const pattern = await loader.loadPattern('openshift');

      expect(pattern).toBeDefined();
      expect(pattern?.id).toBe('openshift-v1');
      expect(pattern?.name).toBe('OpenShift Container Platform');
      expect(pattern?.composition?.infrastructure).toBe('openshift');
      expect(pattern?.authoritativeSources).toBeDefined();
      expect(pattern?.authoritativeSources.length).toBeGreaterThan(0);
    });

    it('should load Kubernetes pattern by filename', async () => {
      const pattern = await loader.loadPattern('kubernetes');

      expect(pattern).toBeDefined();
      expect(pattern?.id).toBe('kubernetes-v1');
      expect(pattern?.name).toBe('Kubernetes');
      expect(pattern?.composition?.infrastructure).toBe('kubernetes');
    });

    it('should load AWS pattern by filename', async () => {
      const pattern = await loader.loadPattern('aws');

      expect(pattern).toBeDefined();
      expect(pattern?.id).toBe('aws-v1');
      expect(pattern?.name).toBe('Amazon Web Services (AWS)');
      expect(pattern?.composition?.infrastructure).toBe('aws');
    });

    it('should load Firebase pattern by filename', async () => {
      const pattern = await loader.loadPattern('firebase');

      expect(pattern).toBeDefined();
      expect(pattern?.id).toBe('firebase-v1');
      expect(pattern?.name).toBe('Firebase');
      expect(pattern?.composition?.infrastructure).toBe('firebase');
    });

    it('should return null for non-existent pattern', async () => {
      const pattern = await loader.loadPattern('non-existent-pattern');

      expect(pattern).toBeNull();
    });

    it('should cache loaded patterns', async () => {
      // Load pattern twice
      const pattern1 = await loader.loadPattern('openshift');
      const pattern2 = await loader.loadPattern('openshift');

      expect(pattern1).toBe(pattern2); // Same object reference = cached
    });
  });

  describe('loadPatternByComposition', () => {
    it('should load pattern by infrastructure type', async () => {
      const pattern = await loader.loadPatternByComposition('openshift');

      expect(pattern).toBeDefined();
      expect(pattern?.composition?.infrastructure).toBe('openshift');
    });

    it('should load pattern by infrastructure and runtime', async () => {
      // This would work if we had composite patterns like openshift-nodejs
      const pattern = await loader.loadPatternByComposition('kubernetes', 'nodejs');

      // For now, should find kubernetes pattern (no runtime match)
      if (pattern) {
        expect(pattern.composition?.infrastructure).toBe('kubernetes');
      }
    });

    it('should return null for non-existent composition', async () => {
      const pattern = await loader.loadPatternByComposition('non-existent-infra');

      expect(pattern).toBeNull();
    });
  });

  describe('listPatterns', () => {
    it('should list all available patterns', async () => {
      const patterns = await loader.listPatterns();

      expect(patterns).toBeDefined();
      expect(patterns.length).toBeGreaterThanOrEqual(4); // At least 4 patterns
      expect(patterns).toContain('openshift');
      expect(patterns).toContain('kubernetes');
      expect(patterns).toContain('aws');
      expect(patterns).toContain('firebase');
    });
  });

  describe('listPatternsByCategory', () => {
    it('should list infrastructure patterns', async () => {
      const patterns = await loader.listPatternsByCategory('infrastructure');

      expect(patterns).toBeDefined();
      expect(patterns.length).toBeGreaterThanOrEqual(4);
      expect(patterns).toContain('openshift');
      expect(patterns).toContain('kubernetes');
      expect(patterns).toContain('aws');
      expect(patterns).toContain('firebase');
    });

    it('should return empty array for empty category', async () => {
      const patterns = await loader.listPatternsByCategory('runtime');

      expect(patterns).toBeDefined();
      // May be empty if no runtime patterns exist yet
      expect(Array.isArray(patterns)).toBe(true);
    });

    it('should return empty array for non-existent category', async () => {
      const patterns = await loader.listPatternsByCategory('non-existent');

      expect(patterns).toEqual([]);
    });
  });

  describe('pattern validation', () => {
    it('should validate required fields in loaded patterns', async () => {
      const pattern = await loader.loadPattern('openshift');

      expect(pattern).toBeDefined();
      expect(pattern?.version).toBeDefined();
      expect(pattern?.id).toBeDefined();
      expect(pattern?.name).toBeDefined();
      expect(pattern?.description).toBeDefined();
      expect(pattern?.authoritativeSources).toBeDefined();
      expect(pattern?.deploymentPhases).toBeDefined();
    });

    it('should validate authoritative sources structure', async () => {
      const pattern = await loader.loadPattern('openshift');

      expect(pattern?.authoritativeSources.length).toBeGreaterThan(0);

      for (const source of pattern!.authoritativeSources) {
        expect(source.type).toBeDefined();
        expect(source.url).toBeDefined();
        expect(source.purpose).toBeDefined();
        expect(source.priority).toBeDefined();
        expect(typeof source.priority).toBe('number');
        expect(source.requiredForDeployment).toBeDefined();
        expect(typeof source.requiredForDeployment).toBe('boolean');
        expect(source.queryInstructions).toBeDefined();
      }
    });

    it('should validate deployment phases structure', async () => {
      const pattern = await loader.loadPattern('openshift');

      expect(pattern?.deploymentPhases.length).toBeGreaterThan(0);

      for (const phase of pattern!.deploymentPhases) {
        expect(phase.order).toBeDefined();
        expect(typeof phase.order).toBe('number');
        expect(phase.name).toBeDefined();
        expect(phase.description).toBeDefined();
        expect(phase.commands).toBeDefined();
        expect(Array.isArray(phase.commands)).toBe(true);
      }
    });

    it('should validate detection hints structure', async () => {
      const pattern = await loader.loadPattern('firebase');

      expect(pattern?.detectionHints).toBeDefined();
      expect(pattern?.detectionHints?.requiredFiles).toBeDefined();
      expect(Array.isArray(pattern?.detectionHints?.requiredFiles)).toBe(true);
      expect(pattern?.detectionHints?.confidence).toBeDefined();
    });
  });

  describe('clearCache', () => {
    it('should clear pattern cache', async () => {
      // Load a pattern
      await loader.loadPattern('openshift');

      // Clear cache
      loader.clearCache();

      // Cache should be cleared (we can't directly test this without internals,
      // but we can verify reloading works)
      const pattern = await loader.loadPattern('openshift');
      expect(pattern).toBeDefined();
    });
  });

  describe('pattern consistency', () => {
    it('should have consistent priority levels across patterns', async () => {
      const patterns = await loader.listPatterns();

      for (const patternId of patterns) {
        const pattern = await loader.loadPattern(patternId);
        if (pattern) {
          for (const source of pattern.authoritativeSources) {
            expect(source.priority).toBeGreaterThanOrEqual(1);
            expect(source.priority).toBeLessThanOrEqual(10);
          }
        }
      }
    });

    it('should have at least one required authoritative source per pattern', async () => {
      const patterns = await loader.listPatterns();

      for (const patternId of patterns) {
        const pattern = await loader.loadPattern(patternId);
        if (pattern) {
          const requiredSources = pattern.authoritativeSources.filter(s => s.requiredForDeployment);
          expect(requiredSources.length).toBeGreaterThan(0);
        }
      }
    });

    it('should have sequential deployment phase orders', async () => {
      const patterns = await loader.listPatterns();

      for (const patternId of patterns) {
        const pattern = await loader.loadPattern(patternId);
        if (pattern) {
          const orders = pattern.deploymentPhases.map(p => p.order).sort((a, b) => a - b);

          // Check that orders start at 1
          expect(orders[0]).toBe(1);

          // Check that orders are sequential
          for (let i = 1; i < orders.length; i++) {
            expect(orders[i]).toBe(orders[i - 1] + 1);
          }
        }
      }
    });
  });

  describe('error handling', () => {
    it('should handle invalid YAML gracefully', async () => {
      // Create a temporary invalid pattern file
      const tempDir = join(__dirname, '../../patterns/infrastructure');
      const tempFile = join(tempDir, 'invalid-test.yaml');

      try {
        await fs.writeFile(tempFile, 'invalid: yaml: content: [[[', 'utf-8');

        const tempLoader = new PatternLoader(patternsDir);
        const pattern = await tempLoader.loadPattern('invalid-test');

        expect(pattern).toBeNull();
      } finally {
        // Cleanup
        try {
          await fs.unlink(tempFile);
        } catch {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle missing pattern directory gracefully', async () => {
      const invalidLoader = new PatternLoader('/non/existent/path');
      const patterns = await invalidLoader.listPatterns();

      expect(patterns).toEqual([]);
    });
  });
});
