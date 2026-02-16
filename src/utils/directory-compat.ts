/**
 * Utility for getting current directory in Jest-compatible way
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

/**
 * Get current directory in a way that works in both Jest and normal execution.
 * When called with an explicit importMetaUrl, it resolves the directory of that URL.
 * When called without arguments, it falls back to test-aware heuristics.
 */
export function getCurrentDirCompat(importMetaUrl?: string): string {
  try {
    // If an explicit import.meta.url was provided, use it directly
    if (importMetaUrl) {
      return dirname(fileURLToPath(importMetaUrl));
    }

    // Check if we're in a Jest environment
    if (typeof process !== 'undefined' && process.env['NODE_ENV'] === 'test') {
      return process.cwd();
    }

    // Try import.meta.url for normal ESM execution
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      return dirname(fileURLToPath(import.meta.url));
    }
  } catch {
    // Fallback for any environment issues
  }

  // Final fallback
  return process.cwd();
}
