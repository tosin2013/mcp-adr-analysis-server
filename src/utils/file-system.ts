/**
 * File system utilities for MCP ADR Analysis Server
 * Uses fast-glob for efficient file discovery with .gitignore support
 * Enhanced with Smart Code Linking capabilities
 */

import fg from 'fast-glob';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileSystemError } from '../types/index.js';

/**
 * Information about a file in the project
 */
export interface FileInfo {
  /** Full path to the file */
  path: string;
  /** Filename with extension */
  name: string;
  /** File extension */
  extension: string;
  /** File size in bytes */
  size: number;
  /** Directory containing the file */
  directory: string;
  /** File content (optional) */
  content?: string;
}

/**
 * Complete project structure information
 */
export interface ProjectStructure {
  /** Root path of the project */
  rootPath: string;
  /** Array of files in the project */
  files: FileInfo[];
  /** Array of directory paths */
  directories: string[];
  /** Total number of files */
  totalFiles: number;
  /** Total number of directories */
  totalDirectories: number;
}

/**
 * Project analysis result with technologies and patterns
 */
export interface ProjectAnalysis {
  /** Root path of the project */
  rootPath: string;
  /** Array of files analyzed */
  files: FileInfo[];
  /** Detected technologies */
  technologies: string[];
  /** Detected architectural patterns */
  patterns: string[];
  /** Summary of the analysis */
  summary: string;
  /** Total files analyzed */
  totalFiles: number;
  /** Total directories scanned */
  totalDirectories: number;
}

/**
 * Result of finding related code for an ADR
 */
export interface RelatedCodeResult {
  /** Path to the ADR */
  adrPath: string;
  /** Related source code files */
  relatedFiles: FileInfo[];
  /** Keywords extracted from ADR */
  keywords: string[];
  /** Search patterns used */
  searchPatterns: string[];
  /** Confidence score */
  confidence: number;
}

/**
 * Find files using fast-glob with .gitignore support
 *
 * @param projectPath - Path to the project to search
 * @param patterns - Glob patterns to match files
 * @param options - Options for file discovery
 * @returns Promise resolving to file discovery results
 */
export async function findFiles(
  projectPath: string,
  patterns: string[],
  options: { includeContent?: boolean; limit?: number } = {}
): Promise<{
  files: FileInfo[];
  totalFiles: number;
  searchPatterns: string[];
  searchPath: string;
}> {
  try {
    const safeProjectPath = projectPath || '.';

    // Ensure patterns are properly formatted
    const normalizedPatterns = patterns.map(pattern => {
      // If pattern doesn't start with !, make it relative to the project path
      if (!pattern.startsWith('!') && !path.isAbsolute(pattern)) {
        return pattern;
      }
      return pattern;
    });

    // Use fast-glob to find files
    const entries = await fg(normalizedPatterns, {
      cwd: safeProjectPath,
      dot: true,
      absolute: false,
      stats: true,
      followSymbolicLinks: false,
      onlyFiles: true,
      // Exclude common non-source directories by default
      // fast-glob automatically respects .gitignore when these patterns are used
      ignore: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/.mcp-adr-cache/**',
        '**/*.log',
        '**/.DS_Store',
        '**/Thumbs.db',
      ],
    });

    // Apply limit if specified
    const limitedEntries = options.limit ? entries.slice(0, options.limit) : entries;

    // Convert glob results to FileInfo format
    const files: FileInfo[] = await Promise.all(
      limitedEntries.map(async entry => {
        const filePath = typeof entry === 'string' ? entry : entry.path;
        const fullPath = path.join(safeProjectPath, filePath);

        let stats;
        if (typeof entry === 'object' && entry.stats) {
          stats = entry.stats;
        } else {
          stats = await fs.stat(fullPath);
        }

        const fileInfo: FileInfo = {
          path: filePath,
          name: path.basename(filePath),
          extension: path.extname(filePath),
          size: stats.size,
          directory: path.dirname(filePath),
        };

        // Include content if requested
        if (options.includeContent) {
          try {
            fileInfo.content = await fs.readFile(fullPath, 'utf-8');
          } catch (error) {
            console.warn(`Could not read content of ${fullPath}:`, error);
          }
        }

        return fileInfo;
      })
    );

    return {
      files,
      totalFiles: files.length,
      searchPatterns: patterns,
      searchPath: safeProjectPath,
    };
  } catch (error) {
    throw new FileSystemError(
      `Failed to find files: ${error instanceof Error ? error.message : String(error)}`,
      { projectPath, patterns }
    );
  }
}

/**
 * Analyze project structure to detect technologies and patterns
 * Uses direct file analysis instead of AI prompts
 *
 * @param projectPath - Path to the project to analyze
 * @returns Promise resolving to project analysis results
 */
export async function analyzeProjectStructure(projectPath: string): Promise<ProjectAnalysis> {
  try {
    const safeProjectPath = path.resolve(projectPath || '.');

    // Define patterns for different file types
    const filePatterns = [
      '**/*.{js,jsx,ts,tsx,py,java,cs,go,rs,rb,php,swift,kt,scala,c,cpp,h,hpp}',
      '**/package.json',
      '**/requirements.txt',
      '**/Gemfile',
      '**/Cargo.toml',
      '**/go.mod',
      '**/pom.xml',
      '**/*.{yml,yaml}',
      '**/Dockerfile',
      '**/*.tf',
      '**/.env*',
      '**/README*',
    ];

    // Find all relevant files
    const { files } = await findFiles(safeProjectPath, filePatterns, {
      includeContent: false,
      limit: 1000, // Limit for performance
    });

    // Analyze technologies based on files found
    const technologies = await detectTechnologies(safeProjectPath, files);

    // Detect architectural patterns
    const patterns = detectArchitecturalPatterns(files);

    // Count directories
    const directories = [...new Set(files.map(f => f.directory))];

    // Generate summary
    const summary = generateProjectSummary(files, technologies, patterns);

    return {
      rootPath: safeProjectPath,
      files,
      technologies,
      patterns,
      summary,
      totalFiles: files.length,
      totalDirectories: directories.length,
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
 *
 * @param filePath - Path to the file to read
 * @returns Promise resolving to file content and metadata
 */
export async function readFileContent(filePath: string): Promise<{
  success: boolean;
  filePath: string;
  content?: string;
  error?: string;
  metadata?: {
    size: number;
    encoding: string;
    lastModified: string;
  };
}> {
  try {
    const resolvedPath = path.resolve(filePath);

    // Check if file exists
    try {
      await fs.access(resolvedPath);
    } catch {
      return {
        success: false,
        filePath,
        error: 'File not found',
      };
    }

    // Read file content
    const content = await fs.readFile(resolvedPath, 'utf-8');
    const stats = await fs.stat(resolvedPath);

    return {
      success: true,
      filePath,
      content,
      metadata: {
        size: stats.size,
        encoding: 'utf-8',
        lastModified: stats.mtime.toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      filePath,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if a file exists
 *
 * @param filePath - Path to check
 * @returns Promise resolving to existence check result
 */
export async function fileExists(filePath: string): Promise<{
  success: boolean;
  filePath: string;
  exists: boolean;
  metadata?: {
    type: 'file' | 'directory' | 'symlink' | null;
    accessible: boolean;
    lastChecked: string;
  };
}> {
  try {
    const resolvedPath = path.resolve(filePath);

    try {
      const stats = await fs.stat(resolvedPath);

      let type: 'file' | 'directory' | 'symlink' = 'file';
      if (stats.isDirectory()) type = 'directory';
      else if (stats.isSymbolicLink()) type = 'symlink';

      return {
        success: true,
        filePath,
        exists: true,
        metadata: {
          type,
          accessible: true,
          lastChecked: new Date().toISOString(),
        },
      };
    } catch {
      return {
        success: true,
        filePath,
        exists: false,
        metadata: {
          type: null,
          accessible: false,
          lastChecked: new Date().toISOString(),
        },
      };
    }
  } catch (error) {
    throw new FileSystemError(
      `Failed to check file existence: ${error instanceof Error ? error.message : String(error)}`,
      { filePath }
    );
  }
}

/**
 * Ensure a directory exists, creating it if necessary
 *
 * @param dirPath - Path to the directory
 * @returns Promise resolving when directory is ensured
 */
export async function ensureDirectory(dirPath: string): Promise<{
  success: boolean;
  dirPath: string;
  created: boolean;
  error?: string;
}> {
  try {
    const resolvedPath = path.resolve(dirPath);

    try {
      await fs.access(resolvedPath);
      return {
        success: true,
        dirPath,
        created: false,
      };
    } catch {
      // Directory doesn't exist, create it
      await fs.mkdir(resolvedPath, { recursive: true });
      return {
        success: true,
        dirPath,
        created: true,
      };
    }
  } catch (error) {
    return {
      success: false,
      dirPath,
      created: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Write content to a file, creating directories as needed
 *
 * @param filePath - Path to the file
 * @param content - Content to write
 * @returns Promise resolving when file is written
 */
export async function writeFile(
  filePath: string,
  content: string
): Promise<{
  success: boolean;
  filePath: string;
  written: boolean;
  error?: string;
  metadata?: {
    size: number;
    directoryCreated: boolean;
  };
}> {
  try {
    const resolvedPath = path.resolve(filePath);
    const dir = path.dirname(resolvedPath);

    // Ensure directory exists
    const dirResult = await ensureDirectory(dir);

    // Write file
    await fs.writeFile(resolvedPath, content, 'utf-8');

    return {
      success: true,
      filePath,
      written: true,
      metadata: {
        size: Buffer.byteLength(content, 'utf-8'),
        directoryCreated: dirResult.created,
      },
    };
  } catch (error) {
    return {
      success: false,
      filePath,
      written: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Find related code files for an ADR using Smart Code Linking
 * Uses AI for keyword extraction and ripgrep for efficient searching
 *
 * @param adrPath - Path to the ADR file
 * @param adrContent - Content of the ADR
 * @param projectPath - Root path of the project
 * @param options - Additional options for search customization
 * @returns Promise resolving to related code files
 */
export async function findRelatedCode(
  adrPath: string,
  adrContent: string,
  projectPath: string,
  options: {
    useAI?: boolean;
    useRipgrep?: boolean;
    maxFiles?: number;
    includeContent?: boolean;
  } = {}
): Promise<RelatedCodeResult> {
  const { useAI = true, useRipgrep = true, maxFiles = 50, includeContent = false } = options;

  try {
    let keywords: string[] = [];
    let confidence = 0.5;

    // Step 1: Extract keywords using AI if available
    if (useAI) {
      try {
        keywords = await extractKeywordsWithAI(adrContent);
        confidence = 0.9; // Higher confidence with AI
      } catch (error) {
        console.warn('AI keyword extraction failed, falling back to regex:', error);
        keywords = extractKeywordsFromContent(adrContent);
        confidence = 0.6;
      }
    } else {
      keywords = extractKeywordsFromContent(adrContent);
      confidence = 0.6;
    }

    // Step 2: Search for files using ripgrep or fast-glob
    let relatedFiles: FileInfo[] = [];

    if (useRipgrep) {
      try {
        const ripgrepModule = await import('./ripgrep-wrapper.js');
        const { searchMultiplePatterns, isRipgrepAvailable } = ripgrepModule;

        if (await isRipgrepAvailable()) {
          // Use ripgrep for efficient searching
          const searchResults = await searchMultiplePatterns(
            keywords.slice(0, 10), // Limit keywords for performance
            projectPath,
            {
              fileType: 'ts,js,py,java,go,rs,cs',
              maxMatches: 5,
              caseInsensitive: true,
            }
          );

          // Collect unique files from all pattern matches
          const uniqueFiles = new Set<string>();
          searchResults.forEach(files => {
            files.forEach(file => uniqueFiles.add(file));
          });

          // Convert file paths to FileInfo objects
          const filePromises = Array.from(uniqueFiles)
            .slice(0, maxFiles)
            .map(async filePath => {
              const fullPath = path.resolve(projectPath, filePath);
              const stats = await fs.stat(fullPath);
              const fileInfo: FileInfo = {
                path: filePath,
                name: path.basename(filePath),
                extension: path.extname(filePath),
                size: stats.size,
                directory: path.dirname(filePath),
              };

              if (includeContent) {
                try {
                  fileInfo.content = await fs.readFile(fullPath, 'utf-8');
                } catch {
                  // Ignore read errors
                }
              }

              return fileInfo;
            });

          relatedFiles = await Promise.all(filePromises);
          confidence = Math.min(0.95, confidence + 0.1); // Boost confidence with ripgrep
        } else {
          throw new Error('Ripgrep not available');
        }
      } catch (error) {
        console.warn('Ripgrep search failed, falling back to fast-glob:', error);
        // Fall through to fast-glob search
      }
    }

    // Fallback to fast-glob if ripgrep didn't work or wasn't used
    if (relatedFiles.length === 0) {
      // Build search patterns based on keywords
      const searchPatterns = keywords.slice(0, 10).map(keyword => `**/*${keyword}*`);

      // Find files matching the patterns
      const { files } = await findFiles(projectPath, searchPatterns, {
        includeContent,
        limit: maxFiles,
      });

      // Filter to source code files only
      const sourceExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cs', '.go', '.rs'];
      relatedFiles = files.filter(file => sourceExtensions.includes(file.extension));
    }

    // Step 3: Score and rank files by relevance
    const scoredFiles = relatedFiles.map(file => {
      let score = 0;
      const fileName = file.name.toLowerCase();
      const filePath = file.path.toLowerCase();

      // Score based on keyword matches in file name/path
      keywords.forEach(keyword => {
        const lowerKeyword = keyword.toLowerCase();
        if (fileName.includes(lowerKeyword)) score += 3;
        if (filePath.includes(lowerKeyword)) score += 1;
      });

      return { file, score };
    });

    // Sort by score and take top results
    scoredFiles.sort((a, b) => b.score - a.score);
    const topFiles = scoredFiles.slice(0, maxFiles).map(item => item.file);

    // Adjust confidence based on results
    if (topFiles.length === 0) {
      confidence = 0.2;
    } else if (topFiles.length < 5) {
      confidence = Math.min(confidence, 0.5);
    }

    return {
      adrPath,
      relatedFiles: topFiles,
      keywords,
      searchPatterns: keywords.map(k => `**/*${k}*`),
      confidence,
    };
  } catch (error) {
    throw new FileSystemError(
      `Failed to find related code: ${error instanceof Error ? error.message : String(error)}`,
      { adrPath }
    );
  }
}

/**
 * Extract keywords from ADR content using AI
 */
async function extractKeywordsWithAI(content: string): Promise<string[]> {
  try {
    // Dynamic import to avoid circular dependencies
    const aiModule = await import('./ai-executor.js');
    const { AIExecutor } = aiModule;

    const executor = new AIExecutor();

    if (!executor.isAvailable()) {
      throw new Error('AI executor not available');
    }

    const prompt = `Extract the most important technical keywords, class names, function names, and architectural terms from this ADR content. Return only a JSON array of strings with the top 20 most relevant keywords for code searching.

ADR Content:
${content.substring(0, 3000)} // Limit content length

Example output format:
["UserService", "authentication", "JWT", "PostgreSQL", "REST_API", "validate_token", "user_repository"]

Return ONLY the JSON array, no other text.`;

    const result = await executor.executePrompt(prompt, {
      temperature: 0.3,
      maxTokens: 500,
    });

    // Parse the AI response
    const cleanedResponse = result.content.trim();
    const jsonMatch = cleanedResponse.match(/\[.*\]/s);
    if (jsonMatch) {
      const keywords = JSON.parse(jsonMatch[0]);
      if (Array.isArray(keywords)) {
        return keywords.filter(k => typeof k === 'string').slice(0, 20);
      }
    }

    throw new Error('Invalid AI response format');
  } catch (error) {
    console.error('AI keyword extraction failed:', error);
    throw error;
  }
}

// Helper functions

/**
 * Detect technologies from project files
 */
async function detectTechnologies(projectPath: string, files: FileInfo[]): Promise<string[]> {
  const technologies = new Set<string>();

  // Check for package.json
  const packageJsonFile = files.find(f => f.name === 'package.json');
  if (packageJsonFile) {
    technologies.add('Node.js');
    try {
      const content = await fs.readFile(path.join(projectPath, packageJsonFile.path), 'utf-8');
      const packageJson = JSON.parse(content);

      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (deps.react) technologies.add('React');
      if (deps.vue) technologies.add('Vue');
      if (deps.angular) technologies.add('Angular');
      if (deps.express) technologies.add('Express');
      if (deps.fastify) technologies.add('Fastify');
      if (deps['@aws-sdk'] || deps['aws-sdk']) technologies.add('AWS SDK');
      if (deps['@google-cloud']) technologies.add('GCP SDK');
      if (deps['@azure']) technologies.add('Azure SDK');
    } catch {
      // Ignore parsing errors
    }
  }

  // Check for other technology indicators
  if (files.some(f => f.name === 'requirements.txt')) technologies.add('Python');
  if (files.some(f => f.name === 'Gemfile')) technologies.add('Ruby');
  if (files.some(f => f.name === 'pom.xml')) technologies.add('Maven/Java');
  if (files.some(f => f.name === 'Cargo.toml')) technologies.add('Rust');
  if (files.some(f => f.name === 'go.mod')) technologies.add('Go');
  if (files.some(f => f.name === 'Dockerfile')) technologies.add('Docker');
  if (files.some(f => f.name === 'docker-compose.yml')) technologies.add('Docker Compose');
  if (files.some(f => f.extension === '.tf')) technologies.add('Terraform');

  // Check for Kubernetes files
  const k8sFiles = files.filter(f => f.extension === '.yaml' || f.extension === '.yml');

  if (k8sFiles.length > 0) {
    for (const file of k8sFiles.slice(0, 5)) {
      // Check first 5 YAML files
      try {
        const content = await fs.readFile(path.join(projectPath, file.path), 'utf-8');
        if (content.includes('apiVersion:') && content.includes('kind:')) {
          technologies.add('Kubernetes');
          break;
        }
      } catch {
        // Ignore read errors
      }
    }
  }

  return Array.from(technologies);
}

/**
 * Detect architectural patterns from file structure
 */
function detectArchitecturalPatterns(files: FileInfo[]): string[] {
  const patterns = new Set<string>();
  const fileNames = files.map(f => f.name.toLowerCase());
  const filePaths = files.map(f => f.path.toLowerCase());

  // Common architectural patterns
  if (fileNames.some(name => name.includes('controller'))) patterns.add('MVC');
  if (fileNames.some(name => name.includes('service'))) patterns.add('Service Layer');
  if (fileNames.some(name => name.includes('repository'))) patterns.add('Repository Pattern');
  if (fileNames.some(name => name.includes('factory'))) patterns.add('Factory Pattern');

  // Microservices patterns
  if (filePaths.some(path => path.includes('microservice'))) patterns.add('Microservices');

  // Container patterns
  if (fileNames.some(name => name === 'dockerfile')) patterns.add('Containerization');

  // Infrastructure as Code
  if (files.some(f => f.extension === '.tf')) patterns.add('Infrastructure as Code');

  // CI/CD patterns
  if (filePaths.some(path => path.includes('.github/workflows'))) patterns.add('CI/CD Pipeline');

  return Array.from(patterns);
}

/**
 * Generate a summary of the project analysis
 */
function generateProjectSummary(
  files: FileInfo[],
  technologies: string[],
  patterns: string[]
): string {
  const extensions = [...new Set(files.map(f => f.extension))].filter(ext => ext);
  const summary =
    `Project with ${files.length} files. ` +
    `Technologies: ${technologies.join(', ') || 'Not detected'}. ` +
    `Patterns: ${patterns.join(', ') || 'Not detected'}. ` +
    `Main file types: ${extensions.slice(0, 5).join(', ')}.`;

  return summary;
}

/**
 * Simple keyword extraction from content
 * This will be enhanced with LLM integration later
 */
function extractKeywordsFromContent(content: string): string[] {
  const keywords: string[] = [];

  // Extract technology names
  const techPatterns = [
    /\b(React|Vue|Angular|Node\.js|Express|FastAPI|Django|Spring|Rails)\b/gi,
    /\b(PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch)\b/gi,
    /\b(Docker|Kubernetes|AWS|Azure|GCP)\b/gi,
  ];

  techPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      keywords.push(...matches.map(m => m.toLowerCase()));
    }
  });

  // Extract potential class/function names (CamelCase or snake_case)
  const codePatterns = /\b[A-Z][a-zA-Z]+(?:[A-Z][a-z]+)*\b|\b[a-z]+_[a-z_]+\b/g;
  const codeMatches = content.match(codePatterns);
  if (codeMatches) {
    keywords.push(...codeMatches.slice(0, 10)); // Limit to 10 code patterns
  }

  return [...new Set(keywords)]; // Remove duplicates
}

/**
 * BACKWARD COMPATIBILITY SECTION
 * These functions and types provide compatibility with the old prompt-based API
 * They can be removed once all tools are updated to use the new direct API
 */

/**
 * AI prompt for project analysis (backward compatibility)
 */
export interface ProjectAnalysisPrompt {
  /** Generated prompt for AI analysis */
  prompt: string;
  /** Instructions for the AI agent */
  instructions: string;
  /** Context information for the analysis */
  context: {
    /** Original project path */
    projectPath: string;
    /** Absolute project path */
    absoluteProjectPath: string;
    /** File patterns to analyze */
    filePatterns: string[];
  };
}

/**
 * Generate backward-compatible prompt response for project analysis
 * This wraps the new analyzeProjectStructure to provide the old interface
 * @deprecated Use analyzeProjectStructure directly
 */
export async function analyzeProjectStructureCompat(
  projectPath: string
): Promise<ProjectAnalysisPrompt> {
  const analysis = await analyzeProjectStructure(projectPath);

  // Generate a descriptive prompt from the actual analysis
  const prompt = `Project Analysis Results:
Root Path: ${analysis.rootPath}
Total Files: ${analysis.totalFiles}
Total Directories: ${analysis.totalDirectories}
Technologies: ${analysis.technologies.join(', ')}
Patterns: ${analysis.patterns.join(', ')}
Summary: ${analysis.summary}`;

  const instructions = `This analysis was performed using fast-glob file discovery.
Technologies were detected by examining configuration files and dependencies.
Architectural patterns were identified from file structure and naming conventions.`;

  return {
    prompt,
    instructions,
    context: {
      projectPath: analysis.rootPath,
      absoluteProjectPath: analysis.rootPath,
      filePatterns: ['**/*'],
    },
  };
}

/**
 * Backward-compatible file exists wrapper
 * @deprecated Use fileExists directly
 */
export async function fileExistsCompat(filePath: string): Promise<any> {
  const result = await fileExists(filePath);
  const prompt = `File existence check: ${filePath}
Result: ${result.exists ? 'File exists' : 'File does not exist'}
Type: ${result.metadata?.type || 'unknown'}`;

  const instructions = 'File existence was checked using Node.js fs.stat';

  return {
    ...result,
    prompt,
    instructions,
    context: { filePath },
  };
}

/**
 * Backward-compatible ensure directory wrapper
 * @deprecated Use ensureDirectory directly
 */
export async function ensureDirectoryCompat(dirPath: string): Promise<any> {
  const result = await ensureDirectory(dirPath);
  const prompt = `Directory operation: ${dirPath}
Result: ${result.created ? 'Directory created' : 'Directory already exists'}
Success: ${result.success}`;

  const instructions = 'Directory was ensured using Node.js fs.mkdir with recursive option';

  return {
    ...result,
    prompt,
    instructions,
    context: { dirPath },
  };
}

/**
 * Backward-compatible write file wrapper
 * @deprecated Use writeFile directly
 */
export async function writeFileCompat(filePath: string, content: string): Promise<any> {
  const result = await writeFile(filePath, content);
  const prompt = `File write operation: ${filePath}
Result: ${result.written ? 'File written successfully' : 'File write failed'}
Size: ${result.metadata?.size || 0} bytes`;

  const instructions = 'File was written using Node.js fs.writeFile';

  return {
    ...result,
    prompt,
    instructions,
    context: { filePath, contentSize: content.length },
  };
}

/**
 * Backward-compatible read file wrapper
 * @deprecated Use readFileContent directly
 */
export async function readFileContentCompat(filePath: string): Promise<any> {
  const result = await readFileContent(filePath);
  const prompt = `File read operation: ${filePath}
Result: ${result.success ? 'File read successfully' : 'File read failed'}
Size: ${result.metadata?.size || 0} bytes`;

  const instructions = 'File was read using Node.js fs.readFile';

  return {
    ...result,
    prompt,
    instructions,
    context: { filePath },
  };
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
