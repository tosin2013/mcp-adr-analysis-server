/**
 * Unit tests for conditional-request.ts
 * Tests ETag generation, validation, and conditional request evaluation
 */

import { describe, it, expect } from '@jest/globals';
import {
  generateStrongETag,
  generateWeakETag,
  parseETag,
  compareETags,
  parseIfNoneMatch,
  checkIfNoneMatch,
  parseIfModifiedSince,
  checkIfModifiedSince,
  evaluateConditionalRequest,
  generateCacheHeaders,
  createNotModifiedResponse,
  isCacheFresh,
} from '../../src/utils/conditional-request.js';

describe('Conditional Request Utilities', () => {
  describe('ETag Generation', () => {
    it('should generate strong ETag from string', () => {
      const content = 'test content';
      const etag = generateStrongETag(content);

      expect(etag).toMatch(/^"[a-f0-9]+"$/);
      expect(etag.startsWith('W/')).toBe(false);
    });

    it('should generate strong ETag from object', () => {
      const content = { key: 'value', nested: { data: 123 } };
      const etag = generateStrongETag(content);

      expect(etag).toMatch(/^"[a-f0-9]+"$/);
    });

    it('should generate same ETag for same content', () => {
      const content = 'test content';
      const etag1 = generateStrongETag(content);
      const etag2 = generateStrongETag(content);

      expect(etag1).toBe(etag2);
    });

    it('should generate different ETags for different content', () => {
      const etag1 = generateStrongETag('content 1');
      const etag2 = generateStrongETag('content 2');

      expect(etag1).not.toBe(etag2);
    });

    it('should generate weak ETag', () => {
      const timestamp = new Date().toISOString();
      const identifier = 'resource-123';
      const etag = generateWeakETag(timestamp, identifier);

      expect(etag).toMatch(/^W\/"\d{4}-\d{2}-\d{2}-[a-f0-9]+"$/);
      expect(etag.startsWith('W/')).toBe(true);
    });
  });

  describe('ETag Parsing', () => {
    it('should parse strong ETag', () => {
      const etag = '"abc123"';
      const result = parseETag(etag);

      expect(result.value).toBe('abc123');
      expect(result.isWeak).toBe(false);
    });

    it('should parse weak ETag', () => {
      const etag = 'W/"abc123"';
      const result = parseETag(etag);

      expect(result.value).toBe('abc123');
      expect(result.isWeak).toBe(true);
    });

    it('should handle ETags without quotes', () => {
      const etag = 'abc123';
      const result = parseETag(etag);

      expect(result.value).toBe('abc123');
    });
  });

  describe('ETag Comparison', () => {
    it('should compare strong ETags (strict)', () => {
      const etag1 = '"abc123"';
      const etag2 = '"abc123"';

      expect(compareETags(etag1, etag2, false)).toBe(true);
    });

    it('should reject weak ETags in strict comparison', () => {
      const etag1 = 'W/"abc123"';
      const etag2 = 'W/"abc123"';

      expect(compareETags(etag1, etag2, false)).toBe(false);
    });

    it('should compare weak ETags (weak comparison)', () => {
      const etag1 = 'W/"abc123"';
      const etag2 = 'W/"abc123"';

      expect(compareETags(etag1, etag2, true)).toBe(true);
    });

    it('should compare strong vs weak (weak comparison)', () => {
      const etag1 = '"abc123"';
      const etag2 = 'W/"abc123"';

      expect(compareETags(etag1, etag2, true)).toBe(true);
    });

    it('should reject mismatched values', () => {
      const etag1 = '"abc123"';
      const etag2 = '"def456"';

      expect(compareETags(etag1, etag2, true)).toBe(false);
    });
  });

  describe('If-None-Match Parsing', () => {
    it('should parse single ETag', () => {
      const header = '"abc123"';
      const result = parseIfNoneMatch(header);

      expect(result).toEqual(['"abc123"']);
    });

    it('should parse multiple ETags', () => {
      const header = '"abc123", "def456", W/"ghi789"';
      const result = parseIfNoneMatch(header);

      expect(result).toEqual(['"abc123"', '"def456"', 'W/"ghi789"']);
    });

    it('should parse wildcard', () => {
      const header = '*';
      const result = parseIfNoneMatch(header);

      expect(result).toEqual(['*']);
    });

    it('should handle empty header', () => {
      const result = parseIfNoneMatch('');

      expect(result).toEqual([]);
    });
  });

  describe('If-None-Match Checking', () => {
    it('should match when ETag is in list', () => {
      const currentETag = '"abc123"';
      const header = '"abc123", "def456"';

      expect(checkIfNoneMatch(currentETag, header)).toBe(true);
    });

    it('should not match when ETag is not in list', () => {
      const currentETag = '"abc123"';
      const header = '"def456", "ghi789"';

      expect(checkIfNoneMatch(currentETag, header)).toBe(false);
    });

    it('should match wildcard', () => {
      const currentETag = '"abc123"';
      const header = '*';

      expect(checkIfNoneMatch(currentETag, header)).toBe(true);
    });

    it('should return false for empty header', () => {
      const currentETag = '"abc123"';

      expect(checkIfNoneMatch(currentETag, '')).toBe(false);
    });
  });

  describe('If-Modified-Since Parsing', () => {
    it('should parse valid HTTP date', () => {
      const header = 'Wed, 21 Oct 2015 07:28:00 GMT';
      const result = parseIfModifiedSince(header);

      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe('2015-10-21T07:28:00.000Z');
    });

    it('should parse ISO 8601 date', () => {
      const header = '2025-01-08T10:00:00.000Z';
      const result = parseIfModifiedSince(header);

      expect(result).toBeInstanceOf(Date);
    });

    it('should return null for invalid date', () => {
      const header = 'invalid date';
      const result = parseIfModifiedSince(header);

      expect(result).toBeNull();
    });

    it('should return null for empty header', () => {
      const result = parseIfModifiedSince('');

      expect(result).toBeNull();
    });
  });

  describe('If-Modified-Since Checking', () => {
    it('should return true when modified after date', () => {
      const lastModified = '2025-01-08T12:00:00.000Z';
      const header = '2025-01-08T10:00:00.000Z';

      expect(checkIfModifiedSince(lastModified, header)).toBe(true);
    });

    it('should return false when not modified', () => {
      const lastModified = '2025-01-08T10:00:00.000Z';
      const header = '2025-01-08T12:00:00.000Z';

      expect(checkIfModifiedSince(lastModified, header)).toBe(false);
    });

    it('should return true for invalid header', () => {
      const lastModified = '2025-01-08T10:00:00.000Z';
      const header = 'invalid';

      expect(checkIfModifiedSince(lastModified, header)).toBe(true);
    });
  });

  describe('Conditional Request Evaluation', () => {
    it('should return not modified when ETag matches', () => {
      const result = evaluateConditionalRequest({
        currentETag: '"abc123"',
        lastModified: '2025-01-08T10:00:00.000Z',
        ifNoneMatch: '"abc123"',
      });

      expect(result.notModified).toBe(true);
      expect(result.reason).toBe('ETag match');
    });

    it('should return modified when ETag does not match', () => {
      const result = evaluateConditionalRequest({
        currentETag: '"abc123"',
        lastModified: '2025-01-08T10:00:00.000Z',
        ifNoneMatch: '"def456"',
      });

      expect(result.notModified).toBe(false);
      expect(result.reason).toBe('ETag mismatch');
    });

    it('should check If-Modified-Since when no If-None-Match', () => {
      const result = evaluateConditionalRequest({
        currentETag: '"abc123"',
        lastModified: '2025-01-08T10:00:00.000Z',
        ifModifiedSince: '2025-01-08T12:00:00.000Z',
      });

      expect(result.notModified).toBe(true);
      expect(result.reason).toBe('Not modified since');
    });

    it('should prioritize If-None-Match over If-Modified-Since', () => {
      const result = evaluateConditionalRequest({
        currentETag: '"abc123"',
        lastModified: '2025-01-08T10:00:00.000Z',
        ifNoneMatch: '"abc123"',
        ifModifiedSince: '2025-01-08T09:00:00.000Z',
      });

      expect(result.notModified).toBe(true);
      expect(result.reason).toBe('ETag match');
    });

    it('should return not modified when no conditional headers', () => {
      const result = evaluateConditionalRequest({
        currentETag: '"abc123"',
        lastModified: '2025-01-08T10:00:00.000Z',
      });

      expect(result.notModified).toBe(false);
      expect(result.reason).toBe('No conditional headers');
    });
  });

  describe('Cache Headers Generation', () => {
    it('should generate standard cache headers', () => {
      const headers = generateCacheHeaders({
        etag: '"abc123"',
        lastModified: '2025-01-08T10:00:00.000Z',
        maxAge: 300,
      });

      expect(headers).toHaveProperty('ETag', '"abc123"');
      expect(headers).toHaveProperty('Last-Modified', '2025-01-08T10:00:00.000Z');
      expect(headers).toHaveProperty('Cache-Control');
      expect(headers['Cache-Control']).toContain('max-age=300');
      expect(headers['Cache-Control']).toContain('must-revalidate');
      expect(headers['Cache-Control']).toContain('private');
    });

    it('should support custom max-age', () => {
      const headers = generateCacheHeaders({
        etag: '"abc123"',
        lastModified: '2025-01-08T10:00:00.000Z',
        maxAge: 600,
      });

      expect(headers['Cache-Control']).toContain('max-age=600');
    });

    it('should support Vary header', () => {
      const headers = generateCacheHeaders({
        etag: '"abc123"',
        lastModified: '2025-01-08T10:00:00.000Z',
        vary: ['Accept-Encoding', 'User-Agent'],
      });

      expect(headers).toHaveProperty('Vary', 'Accept-Encoding, User-Agent');
    });

    it('should allow disabling must-revalidate', () => {
      const headers = generateCacheHeaders({
        etag: '"abc123"',
        lastModified: '2025-01-08T10:00:00.000Z',
        mustRevalidate: false,
      });

      expect(headers['Cache-Control']).not.toContain('must-revalidate');
    });
  });

  describe('304 Not Modified Response', () => {
    it('should create 304 response', () => {
      const response = createNotModifiedResponse({
        etag: '"abc123"',
        lastModified: '2025-01-08T10:00:00.000Z',
      });

      expect(response.status).toBe(304);
      expect(response.statusText).toBe('Not Modified');
      expect(response.headers).toHaveProperty('ETag', '"abc123"');
      expect(response.headers).toHaveProperty('Last-Modified');
      expect(response).not.toHaveProperty('body');
    });
  });

  describe('Cache Freshness', () => {
    it('should return true for fresh cache', () => {
      const lastModified = new Date(Date.now() - 60 * 1000).toISOString(); // 60 seconds ago
      const maxAge = 300; // 5 minutes

      expect(isCacheFresh(lastModified, maxAge)).toBe(true);
    });

    it('should return false for stale cache', () => {
      const lastModified = new Date(Date.now() - 400 * 1000).toISOString(); // 400 seconds ago
      const maxAge = 300; // 5 minutes

      expect(isCacheFresh(lastModified, maxAge)).toBe(false);
    });

    it('should return false for invalid date', () => {
      const lastModified = 'invalid';
      const maxAge = 300;

      expect(isCacheFresh(lastModified, maxAge)).toBe(false);
    });
  });
});
