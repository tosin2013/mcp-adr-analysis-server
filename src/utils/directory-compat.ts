/**
 * Utility for getting current directory in Jest-compatible way
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

/**
 * Get current directory in a way that works in both Jest and normal execution
 */
export function getCurrentDirCompat(): string {
  try {
    // Check if we're in a Jest environment
    if (typeof process !== 'undefined' && process.env['NODE_ENV'] === 'test') {
      return process.cwd();
    }
    
    // Try import.meta.url for normal ESM execution
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      const __filename = fileURLToPath(import.meta.url);
      return dirname(__filename);
    }
  } catch (error) {
    // Fallback for any environment issues
  }
  
  // Final fallback
  return process.cwd();
}