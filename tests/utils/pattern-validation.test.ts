/**
 * Tests for pattern YAML validation against JSON schema
 */

import { describe, it, expect } from '@jest/globals';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as yaml from 'js-yaml';
import Ajv from 'ajv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Pattern YAML Validation', () => {
  let schema: any;
  let ajv: Ajv;

  beforeAll(async () => {
    // Load JSON schema
    const schemaPath = join(__dirname, '../../patterns/schema.json');
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');
    schema = JSON.parse(schemaContent);

    // Initialize AJV validator
    ajv = new Ajv({ allErrors: true, strict: false });
  });

  describe('Schema validation', () => {
    it('should have a valid JSON schema', () => {
      expect(schema).toBeDefined();
      expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
      expect(schema.title).toBe('Validated Pattern Definition');
      expect(schema.required).toContain('version');
      expect(schema.required).toContain('id');
      expect(schema.required).toContain('name');
      expect(schema.required).toContain('description');
      expect(schema.required).toContain('authoritativeSources');
      expect(schema.required).toContain('deploymentPhases');
    });
  });

  describe('OpenShift pattern validation', () => {
    let pattern: any;

    beforeAll(async () => {
      const patternPath = join(__dirname, '../../patterns/infrastructure/openshift.yaml');
      const patternContent = await fs.readFile(patternPath, 'utf-8');
      pattern = yaml.load(patternContent);
    });

    it('should be valid YAML', () => {
      expect(pattern).toBeDefined();
      expect(typeof pattern).toBe('object');
    });

    it('should conform to JSON schema', () => {
      const validate = ajv.compile(schema);
      const valid = validate(pattern);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid).toBe(true);
    });

    it('should have required fields', () => {
      expect(pattern.version).toBe('1.0');
      expect(pattern.id).toBe('openshift-v1');
      expect(pattern.name).toBe('OpenShift Container Platform');
      expect(pattern.description).toBeDefined();
      expect(pattern.authoritativeSources).toBeDefined();
      expect(pattern.deploymentPhases).toBeDefined();
    });

    it('should have valid authoritative sources', () => {
      expect(Array.isArray(pattern.authoritativeSources)).toBe(true);
      expect(pattern.authoritativeSources.length).toBeGreaterThan(0);

      const requiredSources = pattern.authoritativeSources.filter(
        (s: any) => s.requiredForDeployment
      );
      expect(requiredSources.length).toBeGreaterThan(0);
    });

    it('should have validated patterns URLs', () => {
      const urls = pattern.authoritativeSources.map((s: any) => s.url);

      expect(urls).toContain('https://validatedpatterns.io/');
      expect(urls).toContain('https://play.validatedpatterns.io/vp-workshop/main/index.html');
      expect(urls).toContain('https://github.com/validatedpatterns/common');
    });
  });

  describe('Kubernetes pattern validation', () => {
    let pattern: any;

    beforeAll(async () => {
      const patternPath = join(__dirname, '../../patterns/infrastructure/kubernetes.yaml');
      const patternContent = await fs.readFile(patternPath, 'utf-8');
      pattern = yaml.load(patternContent);
    });

    it('should be valid YAML', () => {
      expect(pattern).toBeDefined();
      expect(typeof pattern).toBe('object');
    });

    it('should conform to JSON schema', () => {
      const validate = ajv.compile(schema);
      const valid = validate(pattern);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid).toBe(true);
    });

    it('should have required fields', () => {
      expect(pattern.version).toBe('1.0');
      expect(pattern.id).toBe('kubernetes-v1');
      expect(pattern.name).toBe('Kubernetes');
      expect(pattern.composition.infrastructure).toBe('kubernetes');
    });

    it('should have Kubernetes official documentation', () => {
      const urls = pattern.authoritativeSources.map((s: any) => s.url);

      expect(urls).toContain('https://kubernetes.io/docs/');
      expect(urls).toContain('https://kubernetes.io/docs/tutorials/');
    });
  });

  describe('AWS pattern validation', () => {
    let pattern: any;

    beforeAll(async () => {
      const patternPath = join(__dirname, '../../patterns/infrastructure/aws.yaml');
      const patternContent = await fs.readFile(patternPath, 'utf-8');
      pattern = yaml.load(patternContent);
    });

    it('should be valid YAML', () => {
      expect(pattern).toBeDefined();
      expect(typeof pattern).toBe('object');
    });

    it('should conform to JSON schema', () => {
      const validate = ajv.compile(schema);
      const valid = validate(pattern);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid).toBe(true);
    });

    it('should have required fields', () => {
      expect(pattern.version).toBe('1.0');
      expect(pattern.id).toBe('aws-v1');
      expect(pattern.name).toBe('Amazon Web Services (AWS)');
      expect(pattern.composition.infrastructure).toBe('aws');
    });

    it('should have AWS official documentation', () => {
      const urls = pattern.authoritativeSources.map((s: any) => s.url);

      expect(urls).toContain('https://docs.aws.amazon.com/');
      expect(urls).toContain('https://aws.amazon.com/getting-started/');
      expect(urls).toContain('https://docs.aws.amazon.com/lambda/');
    });
  });

  describe('Firebase pattern validation', () => {
    let pattern: any;

    beforeAll(async () => {
      const patternPath = join(__dirname, '../../patterns/infrastructure/firebase.yaml');
      const patternContent = await fs.readFile(patternPath, 'utf-8');
      pattern = yaml.load(patternContent);
    });

    it('should be valid YAML', () => {
      expect(pattern).toBeDefined();
      expect(typeof pattern).toBe('object');
    });

    it('should conform to JSON schema', () => {
      const validate = ajv.compile(schema);
      const valid = validate(pattern);

      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }

      expect(valid).toBe(true);
    });

    it('should have required fields', () => {
      expect(pattern.version).toBe('1.0');
      expect(pattern.id).toBe('firebase-v1');
      expect(pattern.name).toBe('Firebase');
      expect(pattern.composition.infrastructure).toBe('firebase');
    });

    it('should have Firebase official documentation', () => {
      const urls = pattern.authoritativeSources.map((s: any) => s.url);

      expect(urls).toContain('https://firebase.google.com/docs');
      expect(urls).toContain('https://firebase.google.com/docs/functions');
      expect(urls).toContain('https://firebase.google.com/codelabs');
    });
  });

  describe('All patterns consistency', () => {
    let allPatterns: any[];

    beforeAll(async () => {
      const patternsDir = join(__dirname, '../../patterns/infrastructure');
      const files = await fs.readdir(patternsDir);
      const yamlFiles = files.filter(f => f.endsWith('.yaml'));

      allPatterns = await Promise.all(
        yamlFiles.map(async file => {
          const content = await fs.readFile(join(patternsDir, file), 'utf-8');
          return yaml.load(content);
        })
      );
    });

    it('should have unique pattern IDs', () => {
      const ids = allPatterns.map(p => p.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should all have version 1.0', () => {
      for (const pattern of allPatterns) {
        expect(pattern.version).toBe('1.0');
      }
    });

    it('should all have at least 3 authoritative sources', () => {
      for (const pattern of allPatterns) {
        expect(pattern.authoritativeSources.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should all have at least 3 deployment phases', () => {
      for (const pattern of allPatterns) {
        expect(pattern.deploymentPhases.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should all have priority 10 sources', () => {
      for (const pattern of allPatterns) {
        const priority10 = pattern.authoritativeSources.filter((s: any) => s.priority === 10);
        expect(priority10.length).toBeGreaterThan(0);
      }
    });

    it('should all have detection hints', () => {
      for (const pattern of allPatterns) {
        expect(pattern.detectionHints).toBeDefined();
        expect(pattern.detectionHints.requiredFiles).toBeDefined();
        expect(Array.isArray(pattern.detectionHints.requiredFiles)).toBe(true);
        expect(pattern.detectionHints.requiredFiles.length).toBeGreaterThan(0);
      }
    });

    it('should all have metadata with lastUpdated', () => {
      for (const pattern of allPatterns) {
        expect(pattern.metadata).toBeDefined();
        expect(pattern.metadata.lastUpdated).toBeDefined();
        expect(pattern.metadata.maintainer).toBeDefined();
        expect(Array.isArray(pattern.metadata.tags)).toBe(true);
      }
    });

    it('should all have valid URL formats in authoritative sources', () => {
      const urlRegex = /^https?:\/\/.+/;

      for (const pattern of allPatterns) {
        for (const source of pattern.authoritativeSources) {
          expect(source.url).toMatch(urlRegex);
        }
      }
    });

    it('should all have query instructions for authoritative sources', () => {
      for (const pattern of allPatterns) {
        for (const source of pattern.authoritativeSources) {
          expect(source.queryInstructions).toBeDefined();
          expect(source.queryInstructions.length).toBeGreaterThan(10);
        }
      }
    });

    it('should all have commands in deployment phases', () => {
      for (const pattern of allPatterns) {
        for (const phase of pattern.deploymentPhases) {
          expect(phase.commands).toBeDefined();
          expect(Array.isArray(phase.commands)).toBe(true);
          expect(phase.commands.length).toBeGreaterThan(0);

          for (const cmd of phase.commands) {
            expect(cmd.description).toBeDefined();
            expect(cmd.command).toBeDefined();
            expect(cmd.expectedExitCode).toBeDefined();
          }
        }
      }
    });
  });

  describe('Pattern URL accessibility (smoke test)', () => {
    it('should have URLs that follow best practices', async () => {
      const allPatternFiles = ['openshift.yaml', 'kubernetes.yaml', 'aws.yaml', 'firebase.yaml'];

      for (const file of allPatternFiles) {
        const patternPath = join(__dirname, '../../patterns/infrastructure', file);
        const content = await fs.readFile(patternPath, 'utf-8');
        const pattern = yaml.load(content) as any;

        for (const source of pattern.authoritativeSources) {
          // Check URL best practices
          expect(source.url).not.toContain('localhost');
          expect(source.url).not.toContain('127.0.0.1');
          expect(source.url).toMatch(/^https?:\/\//);

          // Check that high-priority sources are from official domains
          if (source.priority >= 9) {
            const officialDomains = [
              'validatedpatterns.io',
              'kubernetes.io',
              'docs.aws.amazon.com',
              'aws.amazon.com',
              'firebase.google.com',
              'docs.openshift.com',
              'github.com',
            ];

            const isOfficial = officialDomains.some(domain => source.url.includes(domain));
            expect(isOfficial).toBe(true);
          }
        }
      }
    });
  });
});
