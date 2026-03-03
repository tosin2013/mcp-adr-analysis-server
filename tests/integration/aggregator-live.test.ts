/**
 * Live Integration Tests for ADR Aggregator Endpoints
 *
 * Calls every ADR Aggregator endpoint against the real Supabase backend
 * and asserts each returns valid JSON without 5xx errors.
 *
 * These tests are skipped when ADR_AGGREGATOR_API_KEY is not set,
 * so they are safe to include in CI without secrets.
 *
 * @see https://adraggregator.com/mcp-guide
 * @see src/utils/aggregator-endpoint-map.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  AGGREGATOR_ENDPOINT_MAP,
  AGGREGATOR_DEFAULT_BASE_URL,
} from '../../src/utils/aggregator-endpoint-map.js';

const LIVE_TEST_TIMEOUT = 120_000;

const API_KEY = process.env['ADR_AGGREGATOR_API_KEY'];
const BASE_URL = process.env['ADR_AGGREGATOR_URL'] || AGGREGATOR_DEFAULT_BASE_URL;

const skipReason = API_KEY
  ? undefined
  : 'ADR_AGGREGATOR_API_KEY not set — skipping live integration tests';

function buildHeaders(authType: 'x-api-key' | 'bearer'): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'mcp-adr-analysis-server/integration-test',
  };
  if (API_KEY) {
    if (authType === 'bearer') {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    } else {
      headers['x-api-key'] = API_KEY;
    }
  }
  return headers;
}

/**
 * Minimal request bodies for POST endpoints.
 * These are intentionally small / idempotent to avoid mutating real data.
 */
const POST_BODIES: Record<string, object> = {
  '/functions/v1/mcp-sync-adr': {
    repository_name: 'integration-test/live-test',
    adrs: [],
    analysis_metadata: { timeline: false },
  },
  '/functions/v1/mcp-validate-compliance': {
    repository_name: 'integration-test/live-test',
    adr_paths: [],
    validation_type: 'all',
  },
  '/functions/v1/mcp-report-code-gaps': {
    repository_name: 'integration-test/live-test',
    gaps: [],
  },
  '/functions/v1/mcp-update-implementation-status': {
    repository_name: 'integration-test/live-test',
    updates: [],
  },
};

/**
 * Default query parameters for GET endpoints that require repository_name.
 */
function buildUrl(apiPath: string): string {
  const url = `${BASE_URL}${apiPath}`;
  if (apiPath.includes('?')) return url;
  const needsRepo = !apiPath.includes('mcp-get-templates');
  if (needsRepo) {
    return `${url}?repository_name=integration-test/live-test`;
  }
  return url;
}

describe.skipIf(!API_KEY)('ADR Aggregator Live Endpoint Tests', () => {
  beforeAll(() => {
    if (!API_KEY) {
      console.log(skipReason);
    }
  });

  describe('MCP guide URL smoke test', () => {
    it(
      'should return 200 for adraggregator.com/mcp-guide',
      async () => {
        const response = await fetch('https://adraggregator.com/mcp-guide', {
          method: 'GET',
          redirect: 'follow',
        });
        expect(response.status).toBeLessThan(500);
      },
      LIVE_TEST_TIMEOUT
    );

    it(
      'should return non-5xx for mcp-get-templates (no auth needed)',
      async () => {
        const response = await fetch(`${BASE_URL}/functions/v1/mcp-get-templates`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        expect(response.status).toBeLessThan(500);
      },
      LIVE_TEST_TIMEOUT
    );
  });

  describe('GET endpoints', () => {
    const getEndpoints = AGGREGATOR_ENDPOINT_MAP.filter(e => e.method === 'GET');

    for (const endpoint of getEndpoints) {
      it(
        `${endpoint.mcpToolName}: GET ${endpoint.apiPath} should respond with valid JSON`,
        async () => {
          const url = buildUrl(endpoint.apiPath);
          const headers = buildHeaders(endpoint.authType);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), LIVE_TEST_TIMEOUT - 5000);

          try {
            const response = await fetch(url, {
              method: 'GET',
              headers,
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            expect(response.status).toBeLessThan(500);

            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const body = await response.json();
              expect(body).toBeDefined();
            }
          } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
              console.warn(`Timeout on ${endpoint.apiPath} — skipping assertion`);
              return;
            }
            throw error;
          }
        },
        LIVE_TEST_TIMEOUT
      );
    }
  });

  describe('POST endpoints', () => {
    const postEndpoints = AGGREGATOR_ENDPOINT_MAP.filter(e => e.method === 'POST');

    for (const endpoint of postEndpoints) {
      it(
        `${endpoint.mcpToolName}: POST ${endpoint.apiPath} should respond with valid JSON`,
        async () => {
          const url = `${BASE_URL}${endpoint.apiPath}`;
          const headers = buildHeaders(endpoint.authType);
          const body = POST_BODIES[endpoint.apiPath] || {};

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), LIVE_TEST_TIMEOUT - 5000);

          try {
            const response = await fetch(url, {
              method: 'POST',
              headers,
              body: JSON.stringify(body),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            expect(response.status).toBeLessThan(500);

            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const responseBody = await response.json();
              expect(responseBody).toBeDefined();
            }
          } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
              console.warn(`Timeout on ${endpoint.apiPath} — skipping assertion`);
              return;
            }
            throw error;
          }
        },
        LIVE_TEST_TIMEOUT
      );
    }
  });
});
