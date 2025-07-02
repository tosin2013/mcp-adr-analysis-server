/**
 * File system utilities for MCP ADR Analysis Server
 * Handles file discovery, reading, and analysis operations
 */

import { promises as fs } from 'fs';
import { extname, basename, dirname } from 'path';
import { glob } from 'fast-glob';
import { FileSystemError } from '../types/index.js';

export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  directory: string;
  content?: string;
}

export interface ProjectStructure {
  rootPath: string;
  files: FileInfo[];
  directories: string[];
  totalFiles: number;
  totalDirectories: number;
}

/**
 * Discover and analyze project structure
 */
export async function analyzeProjectStructure(projectPath: string): Promise<ProjectStructure> {
  try {
    // Verify project path exists
    const stats = await fs.stat(projectPath);
    if (!stats.isDirectory()) {
      throw new FileSystemError(`Path is not a directory: ${projectPath}`);
    }

    // Discover all files (excluding common ignore patterns)
    const filePatterns = [
      '**/*',
      '!node_modules/**',
      '!.git/**',
      '!dist/**',
      '!build/**',
      '!coverage/**',
      '!.mcp-adr-cache/**',
      '!*.log',
    ];

    const filePaths = await glob(filePatterns, {
      cwd: projectPath,
      absolute: true,
      onlyFiles: true,
    });

    const directoryPaths = await glob(['**/*'], {
      cwd: projectPath,
      absolute: true,
      onlyDirectories: true,
    });

    // Process file information
    const files: FileInfo[] = [];
    for (const filePath of filePaths) {
      try {
        const fileStats = await fs.stat(filePath);
        const relativePath = filePath.replace(projectPath + '/', '');

        files.push({
          path: relativePath,
          name: basename(filePath),
          extension: extname(filePath),
          size: fileStats.size,
          directory: dirname(relativePath),
        });
      } catch (error) {
        // Skip files that can't be accessed
        continue;
      }
    }

    return {
      rootPath: projectPath,
      files,
      directories: directoryPaths.map(dir => dir.replace(projectPath + '/', '')),
      totalFiles: files.length,
      totalDirectories: directoryPaths.length,
    };
  } catch (error) {
    throw new FileSystemError(
      `Failed to analyze project structure: ${error instanceof Error ? error.message : String(error)}`,
      { projectPath }
    );
  }
}

/**
 * Read file content safely
 */
export async function readFileContent(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new FileSystemError(
      `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
      { filePath }
    );
  }
}

/**
 * Find files matching specific patterns
 */
export async function findFiles(
  projectPath: string,
  patterns: string[],
  options: { includeContent?: boolean } = {}
): Promise<FileInfo[]> {
  try {
    const filePaths = await glob(patterns, {
      cwd: projectPath,
      absolute: true,
    });

    const files: FileInfo[] = [];
    for (const filePath of filePaths) {
      try {
        const fileStats = await fs.stat(filePath);
        const relativePath = filePath.replace(projectPath + '/', '');

        const fileInfo: FileInfo = {
          path: relativePath,
          name: basename(filePath),
          extension: extname(filePath),
          size: fileStats.size,
          directory: dirname(relativePath),
        };

        if (options.includeContent) {
          fileInfo.content = await readFileContent(filePath);
        }

        files.push(fileInfo);
      } catch (error) {
        // Skip files that can't be accessed
        continue;
      }
    }

    return files;
  } catch (error) {
    throw new FileSystemError(
      `Failed to find files: ${error instanceof Error ? error.message : String(error)}`,
      { projectPath, patterns }
    );
  }
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure directory exists
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new FileSystemError(
      `Failed to create directory: ${error instanceof Error ? error.message : String(error)}`,
      { dirPath }
    );
  }
}

/**
 * Write file with directory creation
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  try {
    await ensureDirectory(dirname(filePath));
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new FileSystemError(
      `Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
      { filePath }
    );
  }
}

/**
 * Get file extension patterns for different file types
 */
export const FILE_PATTERNS = {
  // Configuration files
  config: [
    'package.json',
    'tsconfig.json',
    '*.config.js',
    '*.config.ts',
    '.env*',
    'Dockerfile',
    'docker-compose.yml',
  ],

  // Source code
  typescript: ['**/*.ts', '**/*.tsx'],
  javascript: ['**/*.js', '**/*.jsx'],
  python: ['**/*.py'],
  java: ['**/*.java'],
  csharp: ['**/*.cs'],
  go: ['**/*.go'],
  rust: ['**/*.rs'],

  // Documentation
  documentation: ['**/*.md', '**/*.rst', '**/*.txt', '**/README*'],

  // ADRs specifically
  adrs: ['docs/adrs/**/*.md', 'adrs/**/*.md', 'decisions/**/*.md'],

  // Build and deployment
  build: ['Makefile', '*.mk', 'build.gradle', 'pom.xml', 'Cargo.toml'],
  ci: [
    '.github/workflows/**/*.yml',
    '.github/workflows/**/*.yaml',
    '.gitlab-ci.yml',
    'azure-pipelines.yml',
  ],
} as const;
