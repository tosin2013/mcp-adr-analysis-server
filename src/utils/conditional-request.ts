/**
 * Conditional Request Support
 *
 * Implements HTTP conditional request headers (ETag, If-Modified-Since)
 * for efficient resource caching and bandwidth reduction.
 *
 * Features:
 * - ETag generation (strong and weak)
 * - If-None-Match validation
 * - If-Modified-Since validation
 * - 304 Not Modified support
 */

import crypto from 'crypto';

/**
 * Generate strong ETag from content
 * Format: "hash"
 */
export function generateStrongETag(content: string | object): string {
  const data = typeof content === 'string' ? content : JSON.stringify(content);
  const hash = crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  return `"${hash}"`;
}

/**
 * Generate weak ETag from metadata
 * Format: W/"timestamp-hash"
 * Useful when content hasn't changed but metadata has
 */
export function generateWeakETag(timestamp: string, identifier: string): string {
  const hash = crypto.createHash('md5').update(`${timestamp}:${identifier}`).digest('hex').substring(0, 8);
  return `W/"${timestamp.substring(0, 10)}-${hash}"`;
}

/**
 * Parse ETag from header
 * Handles both strong and weak ETags
 */
export function parseETag(etag: string): { value: string; isWeak: boolean } {
  const isWeak = etag.startsWith('W/');
  const value = isWeak ? etag.substring(3) : etag;
  return { value: value.replace(/"/g, ''), isWeak };
}

/**
 * Compare two ETags for equality
 * Supports both strong and weak comparison
 */
export function compareETags(etag1: string, etag2: string, weakComparison = false): boolean {
  const parsed1 = parseETag(etag1);
  const parsed2 = parseETag(etag2);

  // Strong comparison: both must be strong and equal
  if (!weakComparison) {
    if (parsed1.isWeak || parsed2.isWeak) {
      return false;
    }
    return parsed1.value === parsed2.value;
  }

  // Weak comparison: values must match (ignoring weak flag)
  return parsed1.value === parsed2.value;
}

/**
 * Parse If-None-Match header
 * Returns array of ETags to check
 */
export function parseIfNoneMatch(header: string): string[] {
  if (!header) {
    return [];
  }

  // Handle wildcard
  if (header.trim() === '*') {
    return ['*'];
  }

  // Split by comma and trim
  return header.split(',').map((etag) => etag.trim());
}

/**
 * Check if resource matches If-None-Match condition
 * Returns true if resource has NOT been modified
 */
export function checkIfNoneMatch(currentETag: string, ifNoneMatchHeader: string): boolean {
  if (!ifNoneMatchHeader) {
    return false;
  }

  const etags = parseIfNoneMatch(ifNoneMatchHeader);

  // Wildcard matches any resource
  if (etags.includes('*')) {
    return true;
  }

  // Check if current ETag matches any in the list
  return etags.some((etag) => compareETags(currentETag, etag, true));
}

/**
 * Parse If-Modified-Since header to Date
 */
export function parseIfModifiedSince(header: string): Date | null {
  if (!header) {
    return null;
  }

  try {
    const date = new Date(header);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Check if resource has been modified since given date
 * Returns true if resource has been modified
 */
export function checkIfModifiedSince(lastModified: string, ifModifiedSinceHeader: string): boolean {
  const ifModifiedSince = parseIfModifiedSince(ifModifiedSinceHeader);
  if (!ifModifiedSince) {
    return true; // No header, treat as modified
  }

  const lastModifiedDate = new Date(lastModified);
  if (isNaN(lastModifiedDate.getTime())) {
    return true; // Invalid date, treat as modified
  }

  // Resource is modified if lastModified > ifModifiedSince
  return lastModifiedDate > ifModifiedSince;
}

/**
 * Evaluate conditional request
 * Returns { notModified: boolean, reason?: string }
 */
export interface ConditionalRequestResult {
  notModified: boolean;
  reason?: string;
}

export function evaluateConditionalRequest(params: {
  currentETag: string;
  lastModified: string;
  ifNoneMatch?: string;
  ifModifiedSince?: string;
}): ConditionalRequestResult {
  const { currentETag, lastModified, ifNoneMatch, ifModifiedSince } = params;

  // If-None-Match has priority over If-Modified-Since
  if (ifNoneMatch) {
    const matches = checkIfNoneMatch(currentETag, ifNoneMatch);
    if (matches) {
      return { notModified: true, reason: 'ETag match' };
    }
    // If-None-Match present but doesn't match, resource is modified
    return { notModified: false, reason: 'ETag mismatch' };
  }

  // Check If-Modified-Since
  if (ifModifiedSince) {
    const modified = checkIfModifiedSince(lastModified, ifModifiedSince);
    if (!modified) {
      return { notModified: true, reason: 'Not modified since' };
    }
    return { notModified: false, reason: 'Modified since' };
  }

  // No conditional headers present
  return { notModified: false, reason: 'No conditional headers' };
}

/**
 * Generate HTTP cache headers for response
 */
export interface CacheHeaders {
  'ETag': string;
  'Last-Modified': string;
  'Cache-Control': string;
  'Vary'?: string;
}

export function generateCacheHeaders(params: {
  etag: string;
  lastModified: string;
  maxAge?: number; // seconds
  mustRevalidate?: boolean;
  vary?: string[];
}): CacheHeaders {
  const { etag, lastModified, maxAge = 300, mustRevalidate = true, vary } = params;

  const cacheControl = [
    `max-age=${maxAge}`,
    mustRevalidate ? 'must-revalidate' : '',
    'private', // Resources are user-specific
  ]
    .filter(Boolean)
    .join(', ');

  const headers: CacheHeaders = {
    ETag: etag,
    'Last-Modified': lastModified,
    'Cache-Control': cacheControl,
  };

  if (vary && vary.length > 0) {
    headers.Vary = vary.join(', ');
  }

  return headers;
}

/**
 * Create 304 Not Modified response metadata
 */
export interface NotModifiedResponse {
  status: 304;
  statusText: 'Not Modified';
  headers: CacheHeaders;
  body?: never;
}

export function createNotModifiedResponse(params: {
  etag: string;
  lastModified: string;
  maxAge?: number;
}): NotModifiedResponse {
  const { etag, lastModified, maxAge } = params;

  // Build headers params without undefined values
  const headersParams: {
    etag: string;
    lastModified: string;
    maxAge?: number;
  } = { etag, lastModified };

  if (maxAge !== undefined) {
    headersParams.maxAge = maxAge;
  }

  return {
    status: 304,
    statusText: 'Not Modified',
    headers: generateCacheHeaders(headersParams),
  };
}

/**
 * Calculate cache freshness
 * Returns true if cache is still fresh
 */
export function isCacheFresh(lastModified: string, maxAge: number): boolean {
  const lastModifiedDate = new Date(lastModified);
  if (isNaN(lastModifiedDate.getTime())) {
    return false;
  }

  const ageSeconds = (Date.now() - lastModifiedDate.getTime()) / 1000;
  return ageSeconds < maxAge;
}
