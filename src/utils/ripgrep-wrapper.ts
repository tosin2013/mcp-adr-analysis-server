/**
 * Ripgrep wrapper for efficient code searching
 * Provides a Node.js interface to the ripgrep command-line tool
 */

import { exec } from 'node:child_process';
import { promisify } from 'util';
import { FileSystemError } from '../types/index.js';

const execAsync = promisify(exec);

/**
 * Options for ripgrep search
 */
export interface RipgrepOptions {
  /** Pattern to search for */
  pattern: string;
  /** Path to search in */
  path: string;
  /** Respect .gitignore */
  gitignore?: boolean;
  /** Maximum number of matches */
  maxMatches?: number;
  /** File type to search */
  fileType?: string;
  /** Case insensitive search */
  caseInsensitive?: boolean;
  /** Include line numbers */
  includeLineNumbers?: boolean;
  /** Context lines before match */
  contextBefore?: number;
  /** Context lines after match */
  contextAfter?: number;
  /** File glob pattern */
  glob?: string;
  /** Exclude glob pattern */
  excludeGlob?: string;
}

/**
 * Result from ripgrep search
 */
export interface RipgrepResult {
  /** File path */
  file: string;
  /** Line number (if includeLineNumbers is true) */
  line?: number;
  /** Column number */
  column?: number;
  /** Matched text */
  match: string;
  /** Context before match */
  contextBefore?: string[];
  /** Context after match */
  contextAfter?: string[];
}

/**
 * Check if ripgrep is available on the system
 */
export async function isRipgrepAvailable(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('rg --version');
    return stdout.includes('ripgrep');
  } catch {
    return false;
  }
}

/**
 * Search for patterns using ripgrep
 *
 * @param options - Search options
 * @returns Promise resolving to array of file paths containing matches
 */
export async function searchWithRipgrep(options: RipgrepOptions): Promise<string[]> {
  const {
    pattern,
    path: searchPath,
    gitignore = true,
    maxMatches,
    fileType,
    caseInsensitive = false,
    glob,
    excludeGlob,
  } = options;

  try {
    // Check if ripgrep is available
    const available = await isRipgrepAvailable();
    if (!available) {
      console.warn('Ripgrep not available, falling back to basic search');
      return [];
    }

    // Build ripgrep command
    const args: string[] = [];

    // Add search pattern (escape special characters)
    const escapedPattern = escapeShellArg(pattern);
    args.push(escapedPattern);

    // Add search path
    args.push(searchPath);

    // Add flags
    args.push('--files-with-matches'); // Only return file paths
    args.push('--no-heading'); // Don't group matches by file

    if (!gitignore) {
      args.push('--no-ignore');
    }

    if (maxMatches) {
      args.push(`--max-count=${maxMatches}`);
    }

    if (fileType) {
      // Handle comma-separated file types (e.g., "ts,js,py" -> "--type=ts --type=js --type=py")
      const types = fileType
        .split(',')
        .map(t => t.trim())
        .filter(t => t);
      for (const type of types) {
        args.push(`--type=${type}`);
      }
    }

    if (caseInsensitive) {
      args.push('--ignore-case');
    }

    if (glob) {
      args.push(`--glob=${escapeShellArg(glob)}`);
    }

    if (excludeGlob) {
      args.push(`--glob=!${escapeShellArg(excludeGlob)}`);
    }

    // Execute ripgrep
    const command = `rg ${args.join(' ')}`;
    const { stdout } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    // Parse results (one file path per line)
    const files = stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.trim());

    return files;
  } catch (error: unknown) {
    // Exit code 1 means no matches found (not an error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 1) {
      return [];
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new FileSystemError(`Ripgrep search failed: ${errorMessage}`, {
      pattern,
      path: searchPath,
    });
  }
}

/**
 * Search for patterns with detailed results
 *
 * @param options - Search options
 * @returns Promise resolving to detailed search results
 */
export async function searchWithRipgrepDetailed(options: RipgrepOptions): Promise<RipgrepResult[]> {
  const {
    pattern,
    path: searchPath,
    gitignore = true,
    maxMatches,
    fileType,
    caseInsensitive = false,
    includeLineNumbers = true,
    contextBefore = 0,
    contextAfter = 0,
    glob,
    excludeGlob,
  } = options;

  try {
    // Check if ripgrep is available
    const available = await isRipgrepAvailable();
    if (!available) {
      console.warn('Ripgrep not available, falling back to basic search');
      return [];
    }

    // Build ripgrep command
    const args: string[] = [];

    // Add search pattern
    const escapedPattern = escapeShellArg(pattern);
    args.push(escapedPattern);

    // Add search path
    args.push(searchPath);

    // Add flags for detailed output
    args.push('--json'); // JSON output for easy parsing
    args.push('--no-heading');

    if (!gitignore) {
      args.push('--no-ignore');
    }

    if (maxMatches) {
      args.push(`--max-count=${maxMatches}`);
    }

    if (fileType) {
      // Handle comma-separated file types (e.g., "ts,js,py" -> "--type=ts --type=js --type=py")
      const types = fileType
        .split(',')
        .map(t => t.trim())
        .filter(t => t);
      for (const type of types) {
        args.push(`--type=${type}`);
      }
    }

    if (caseInsensitive) {
      args.push('--ignore-case');
    }

    if (includeLineNumbers) {
      args.push('--line-number');
      args.push('--column');
    }

    if (contextBefore > 0) {
      args.push(`--before-context=${contextBefore}`);
    }

    if (contextAfter > 0) {
      args.push(`--after-context=${contextAfter}`);
    }

    if (glob) {
      args.push(`--glob=${escapeShellArg(glob)}`);
    }

    if (excludeGlob) {
      args.push(`--glob=!${escapeShellArg(excludeGlob)}`);
    }

    // Execute ripgrep
    const command = `rg ${args.join(' ')}`;
    const { stdout } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    // Parse JSON results
    const results: RipgrepResult[] = [];
    const lines = stdout.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const data = JSON.parse(line);

        if (data.type === 'match') {
          const result: RipgrepResult = {
            file: data.data.path.text,
            match: data.data.lines.text,
          };

          if (includeLineNumbers) {
            result.line = data.data.line_number;
            result.column = data.data.absolute_offset;
          }

          results.push(result);
        }
      } catch {
        // Skip lines that aren't valid JSON
      }
    }

    return results;
  } catch (error: unknown) {
    // Exit code 1 means no matches found (not an error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 1) {
      return [];
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new FileSystemError(`Ripgrep detailed search failed: ${errorMessage}`, {
      pattern,
      path: searchPath,
    });
  }
}

/**
 * Search for multiple patterns in parallel
 *
 * @param patterns - Array of patterns to search for
 * @param searchPath - Path to search in
 * @param options - Additional search options
 * @returns Promise resolving to map of pattern to files
 */
export async function searchMultiplePatterns(
  patterns: string[],
  searchPath: string,
  options: Partial<RipgrepOptions> = {}
): Promise<Map<string, string[]>> {
  const results = new Map<string, string[]>();

  // Check if ripgrep is available
  const available = await isRipgrepAvailable();
  if (!available) {
    console.warn('Ripgrep not available, returning empty results');
    patterns.forEach(pattern => results.set(pattern, []));
    return results;
  }

  // Search for each pattern in parallel
  const searchPromises = patterns.map(async pattern => {
    const files = await searchWithRipgrep({
      ...options,
      pattern,
      path: searchPath,
    });
    return { pattern, files };
  });

  const searchResults = await Promise.all(searchPromises);

  // Build the results map
  for (const { pattern, files } of searchResults) {
    results.set(pattern, files);
  }

  return results;
}

/**
 * Escape shell arguments to prevent command injection
 */
function escapeShellArg(arg: string): string {
  // Escape single quotes and wrap in single quotes
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Get ripgrep version information
 */
export async function getRipgrepVersion(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('rg --version');
    const match = stdout.match(/ripgrep (\d+\.\d+\.\d+)/);
    return match && match[1] ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Fallback search using simple file reading (when ripgrep is not available)
 */
export async function fallbackSearch(
  pattern: string,
  searchPath: string,
  options: Partial<RipgrepOptions> = {}
): Promise<string[]> {
  // Import file-system utilities
  const { findFiles } = await import('./file-system.js');

  // Convert pattern to glob pattern
  const globPattern = options.glob || '**/*';

  // Find files
  const { files } = await findFiles(searchPath, [globPattern], {
    includeContent: true,
    limit: 100, // Limit for performance
  });

  // Filter files that contain the pattern
  const regex = new RegExp(pattern, options.caseInsensitive ? 'i' : '');
  const matchingFiles = files
    .filter(file => file.content && regex.test(file.content))
    .map(file => file.path);

  return matchingFiles;
}
