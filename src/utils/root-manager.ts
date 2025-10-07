/**
 * Root Manager for MCP File Access Control
 *
 * Implements MCP best practices for file system access control using "roots".
 * Roots are predefined directories that the server is allowed to access,
 * providing both security and autonomous file discovery for Claude.
 *
 * @see https://modelcontextprotocol.io/docs/concepts/roots
 */

import { resolve, relative } from 'path';

/**
 * A root is a directory that the MCP server is allowed to access
 */
export interface Root {
  /** Unique identifier for the root */
  name: string;
  /** Absolute path to the root directory */
  path: string;
  /** Human-readable description of what this root contains */
  description: string;
}

/**
 * Manages file system roots for MCP server access control
 *
 * @example
 * ```typescript
 * const rootManager = new RootManager('/path/to/project', '/path/to/project/docs/adrs');
 *
 * // Check if path is allowed
 * if (rootManager.isPathAllowed('/path/to/project/src/index.ts')) {
 *   // Access granted
 * }
 *
 * // List all roots for Claude
 * const roots = rootManager.listRoots();
 * ```
 */
export class RootManager {
  private roots: Map<string, Root> = new Map();

  /**
   * Initialize root manager with project and ADR paths
   *
   * @param projectPath - Path to the project root directory
   * @param adrDirectory - Path to the ADR directory
   */
  constructor(projectPath: string, adrDirectory: string) {
    // Root 1: Project directory (entire codebase)
    this.roots.set('project', {
      name: 'project',
      path: resolve(projectPath),
      description: 'Project source code, configuration, and documentation',
    });

    // Root 2: ADR directory (may be inside project, but worth explicit access)
    const resolvedAdrPath = resolve(adrDirectory);
    this.roots.set('adrs', {
      name: 'adrs',
      path: resolvedAdrPath,
      description: 'Architectural Decision Records',
    });
  }

  /**
   * Check if a path is within accessible roots
   *
   * @param targetPath - Path to check (can be relative or absolute)
   * @returns true if path is within any root, false otherwise
   *
   * @example
   * ```typescript
   * if (!rootManager.isPathAllowed(userPath)) {
   *   throw new Error('Access denied: Path is outside accessible roots');
   * }
   * ```
   */
  isPathAllowed(targetPath: string): boolean {
    const resolved = resolve(targetPath);
    for (const root of this.roots.values()) {
      if (resolved.startsWith(root.path)) {
        return true;
      }
    }
    return false;
  }

  /**
   * List all accessible roots
   *
   * @returns Array of root definitions
   *
   * @example
   * ```typescript
   * const roots = rootManager.listRoots();
   * roots.forEach(root => {
   *   console.log(`${root.name}: ${root.path}`);
   * });
   * ```
   */
  listRoots(): Root[] {
    return Array.from(this.roots.values());
  }

  /**
   * Get which root a path belongs to
   *
   * @param targetPath - Path to check
   * @returns Root that contains this path, or null if outside all roots
   *
   * @example
   * ```typescript
   * const root = rootManager.getRootForPath('/path/to/project/src/index.ts');
   * if (root) {
   *   console.log(`File is in ${root.name} root`);
   * }
   * ```
   */
  getRootForPath(targetPath: string): Root | null {
    const resolved = resolve(targetPath);
    for (const root of this.roots.values()) {
      if (resolved.startsWith(root.path)) {
        return root;
      }
    }
    return null;
  }

  /**
   * Get the relative path from root
   *
   * @param targetPath - Path to get relative path for
   * @returns Relative path from root, or null if outside all roots
   *
   * @example
   * ```typescript
   * const relPath = rootManager.getRelativePathFromRoot('/path/to/project/src/index.ts');
   * // Returns: 'src/index.ts'
   * ```
   */
  getRelativePathFromRoot(targetPath: string): string | null {
    const root = this.getRootForPath(targetPath);
    if (!root) {
      return null;
    }
    return relative(root.path, resolve(targetPath));
  }

  /**
   * Add a custom root (useful for testing or dynamic root management)
   *
   * @param name - Unique identifier for the root
   * @param path - Absolute path to the root directory
   * @param description - Human-readable description
   */
  addRoot(name: string, path: string, description: string): void {
    this.roots.set(name, {
      name,
      path: resolve(path),
      description,
    });
  }

  /**
   * Remove a root by name
   *
   * @param name - Name of the root to remove
   * @returns true if root was removed, false if not found
   */
  removeRoot(name: string): boolean {
    return this.roots.delete(name);
  }
}
