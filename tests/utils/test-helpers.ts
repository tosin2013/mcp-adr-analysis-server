/**
 * Test helper utilities for Jest compatibility
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Get current directory in a Jest-compatible way
 * @returns Current directory path
 */
export function getCurrentDir(): string {
  // For Jest tests, we need to resolve relative to the project root
  // Since Jest runs from the project root, we can use process.cwd()
  const projectRoot = process.cwd();
  
  // If we're in a test context, return the tests directory
  if (process.env.NODE_ENV === 'test' || process.argv[1]?.includes('jest')) {
    return join(projectRoot, 'tests');
  }
  
  // Try to use import.meta.url for normal execution
  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      return dirname(fileURLToPath(import.meta.url));
    }
  } catch (error) {
    // Fallback: use process.cwd() if import.meta fails
  }
  
  // Final fallback to project root
  return projectRoot;
}

/**
 * Get test directory path
 * @returns Path to tests directory
 */
export function getTestDir(): string {
  return getCurrentDir();
}