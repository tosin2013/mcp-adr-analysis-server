/**
 * File system utilities for MCP ADR Analysis Server
 * Generates prompts for AI-driven file discovery, reading, and analysis operations
 */

import { promises as fs } from 'fs';
import { dirname, resolve } from 'path';
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

export interface ProjectAnalysisPrompt {
  prompt: string;
  instructions: string;
  context: {
    projectPath: string;
    absoluteProjectPath: string;
    filePatterns: string[];
  };
}

/**
 * Generate prompt for AI-driven project structure analysis
 */
export async function analyzeProjectStructure(projectPath: string): Promise<ProjectAnalysisPrompt> {
  try {
    console.error(`[DEBUG] Starting prompt generation for project path: ${projectPath}`);

    // Resolve to absolute path to prevent relative path issues
    const absoluteProjectPath = resolve(projectPath);
    console.error(`[DEBUG] Resolved absolute path: ${absoluteProjectPath}`);

    // Validate against system directories to prevent unauthorized scanning
    const systemPaths = ['/', '/System', '/Library', '/usr', '/bin', '/sbin', '/etc', '/var', '/tmp'];
    if (systemPaths.some(sysPath => absoluteProjectPath === sysPath || absoluteProjectPath.startsWith(sysPath + '/'))) {
      throw new FileSystemError(
        `Cannot scan system directories: ${absoluteProjectPath}`,
        { projectPath, absoluteProjectPath, rejectedPath: absoluteProjectPath }
      );
    }

    // Note: Path validation is delegated to the AI agent that will perform the actual scanning

    // Define file patterns for analysis
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

    console.error(`[DEBUG] Generated prompt for file patterns:`, filePatterns);
    console.error(`[DEBUG] Target directory: ${absoluteProjectPath}`);

    // Generate comprehensive analysis prompt
    const prompt = `
# Project Structure Analysis Request

Please analyze the project structure at: **${absoluteProjectPath}**

## Prerequisites

1. **Path Validation**: First verify the path exists and is accessible
   - Check if the path exists and is a directory
   - Report any access issues or invalid paths
   - Proceed with analysis only if the path is valid

## Analysis Requirements

2. **File Discovery**: Scan the directory using the following patterns:
   ${filePatterns.map(pattern => `   - ${pattern}`).join('\n')}

3. **Technology Stack Detection**: Identify:
   - Programming languages (based on file extensions)
   - Frameworks and libraries (from package.json, requirements.txt, etc.)
   - Build tools and configuration files
   - Testing frameworks and tools

4. **Architectural Patterns**: Analyze:
   - Directory structure and organization
   - Code organization patterns (MVC, microservices, etc.)
   - Configuration management approaches
   - Documentation patterns

5. **Project Ecosystem**: Examine:
   - Dependencies and package management
   - Development tools and workflows
   - CI/CD configurations
   - Documentation and README files

## Expected Output Format

Please provide a structured analysis including:

\`\`\`json
{
  "rootPath": "${absoluteProjectPath}",
  "totalFiles": <number>,
  "totalDirectories": <number>,
  "technologies": [
    {
      "name": "technology_name",
      "type": "language|framework|tool",
      "confidence": 0.95,
      "evidence": ["file1.ext", "config.json"]
    }
  ],
  "patterns": [
    {
      "name": "pattern_name",
      "type": "architectural|organizational",
      "description": "pattern description",
      "evidence": ["directory_structure", "file_patterns"]
    }
  ],
  "files": [
    {
      "path": "relative/path/to/file",
      "name": "filename.ext",
      "extension": ".ext",
      "directory": "relative/path/to",
      "category": "source|config|documentation|test"
    }
  ],
  "directories": ["dir1", "dir2/subdir"],
  "summary": "Brief project description and key findings"
}
\`\`\`

## Analysis Instructions

1. Start by scanning the root directory: ${absoluteProjectPath}
2. Apply the file patterns to exclude unnecessary files
3. Categorize files by type and purpose
4. Identify technology stack from file extensions and configuration files
5. Analyze directory structure for architectural patterns
6. Provide confidence scores for technology detection
7. Include evidence for all findings
`;

    const instructions = `
## Implementation Steps

1. **Directory Scanning**: Use appropriate file system tools to scan ${absoluteProjectPath}
2. **Pattern Filtering**: Apply exclusion patterns: ${filePatterns.filter(p => p.startsWith('!')).join(', ')}
3. **File Analysis**: Examine file extensions, names, and content (for config files)
4. **Technology Detection**: Look for package.json, requirements.txt, Cargo.toml, etc.
5. **Pattern Recognition**: Analyze directory structure and file organization
6. **Result Compilation**: Format findings according to the specified JSON structure

## Safety Checks

- ✅ Path validated: ${absoluteProjectPath}
- ✅ System directory protection enabled
- ✅ File patterns defined for efficient scanning
- ✅ Exclusion patterns prevent scanning large/unnecessary directories

## Context Information

- **Project Path**: ${projectPath} → ${absoluteProjectPath}
- **Analysis Type**: Comprehensive project ecosystem analysis
- **Output Format**: Structured JSON with technology stack and architectural patterns
`;

    return {
      prompt,
      instructions,
      context: {
        projectPath,
        absoluteProjectPath,
        filePatterns
      }
    };

  } catch (error) {
    // If it's already a FileSystemError, re-throw it to preserve the specific error message
    if (error instanceof FileSystemError) {
      throw error;
    }

    throw new FileSystemError(
      `Failed to generate project analysis prompt: ${error instanceof Error ? error.message : String(error)}`,
      { projectPath, absoluteProjectPath: resolve(projectPath) }
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
 * Generate prompt for AI-driven file discovery
 */
export async function findFiles(
  projectPath: string,
  patterns: string[],
  options: { includeContent?: boolean } = {}
): Promise<{ prompt: string; instructions: string; context: any }> {
  try {
    // Resolve to absolute path
    const absoluteProjectPath = resolve(projectPath);

    // Validate path
    const stats = await fs.stat(absoluteProjectPath);
    if (!stats.isDirectory()) {
      throw new FileSystemError(`Path is not a directory: ${absoluteProjectPath}`, { projectPath, absoluteProjectPath });
    }

    const prompt = `
# File Discovery Request

Please find files matching the specified patterns in: **${absoluteProjectPath}**

## Search Patterns
${patterns.map(pattern => `- ${pattern}`).join('\n')}

## Requirements
- Search in directory: ${absoluteProjectPath}
- Apply patterns to filter files
- ${options.includeContent ? 'Include file content in results' : 'Return file metadata only'}

## Expected Output Format

\`\`\`json
{
  "files": [
    {
      "path": "relative/path/to/file",
      "name": "filename.ext",
      "extension": ".ext",
      "size": 1234,
      "directory": "relative/path/to"${options.includeContent ? ',\n      "content": "file content here"' : ''}
    }
  ],
  "totalFiles": <number>,
  "searchPatterns": ${JSON.stringify(patterns)},
  "searchPath": "${absoluteProjectPath}"
}
\`\`\`
`;

    const instructions = `
## Implementation Steps
1. Scan directory: ${absoluteProjectPath}
2. Apply patterns: ${patterns.join(', ')}
3. Collect file metadata (name, size, extension, path)
${options.includeContent ? '4. Read and include file content' : '4. Skip file content reading'}
5. Format results as JSON

## Context
- Base directory: ${absoluteProjectPath}
- Include content: ${options.includeContent || false}
- Pattern count: ${patterns.length}
`;

    return {
      prompt,
      instructions,
      context: {
        projectPath,
        absoluteProjectPath,
        patterns,
        includeContent: options.includeContent || false
      }
    };
  } catch (error) {
    throw new FileSystemError(
      `Failed to generate file discovery prompt: ${error instanceof Error ? error.message : String(error)}`,
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
