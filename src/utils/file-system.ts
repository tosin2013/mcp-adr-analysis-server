/**
 * File system utilities for MCP ADR Analysis Server
 * Generates prompts for AI-driven file discovery, reading, and analysis operations
 * Enhanced with Chain-of-Thought prompting to reduce LLM confusion
 */

import { dirname } from 'path';
import { FileSystemError } from '../types/index.js';
import { enhancePromptWithCoT, COT_PATTERNS } from './chain-of-thought-template.js';

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

    // Pure prompt-driven approach - delegate all path resolution and validation to AI
    const safeProjectPath = projectPath || '.';
    console.error(`[DEBUG] Using prompt-driven analysis for path: ${safeProjectPath}`);

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
    console.error(`[DEBUG] Target directory: ${safeProjectPath}`);

    // Generate Chain-of-Thought enhanced analysis prompt
    const basePrompt = `
# Project Structure Analysis Request

Analyze the project structure at: **${safeProjectPath}**

## Analysis Requirements

**File Discovery**: Scan the directory using the following patterns:
${filePatterns.map(pattern => `   - ${pattern}`).join('\n')}

**Technology Stack Detection**: Identify:
- Programming languages (based on file extensions)
- Frameworks and libraries (from package.json, requirements.txt, etc.)
- Build tools and configuration files
- Testing frameworks and tools

**Architectural Patterns**: Analyze:
- Directory structure and organization
- Code organization patterns (MVC, microservices, etc.)
- Configuration management approaches
- Documentation patterns

**Project Ecosystem**: Examine:
- Dependencies and package management
- Development tools and workflows
- CI/CD configurations
- Documentation and README files

## Expected Output Format

\`\`\`json
{
  "rootPath": "<resolved-absolute-path>",
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
`;

    // Enhance the base prompt with Chain-of-Thought reasoning
    const prompt = enhancePromptWithCoT(basePrompt, COT_PATTERNS.PROJECT_ANALYSIS);

    const instructions = `
## Implementation Steps

1. **Directory Scanning**: Use appropriate file system tools to scan the resolved project path
2. **Pattern Filtering**: Apply exclusion patterns: ${filePatterns.filter(p => p.startsWith('!')).join(', ')}
3. **File Analysis**: Examine file extensions, names, and content (for config files)
4. **Technology Detection**: Look for package.json, requirements.txt, Cargo.toml, etc.
5. **Pattern Recognition**: Analyze directory structure and file organization
6. **Result Compilation**: Format findings according to the specified JSON structure

## Safety Checks

- ✅ Path resolution delegated to AI agent with security validation
- ✅ System directory protection enabled
- ✅ File patterns defined for efficient scanning
- ✅ Exclusion patterns prevent scanning large/unnecessary directories

## Context Information

- **Project Path**: ${safeProjectPath}
- **Analysis Type**: Comprehensive project ecosystem analysis
- **Output Format**: Structured JSON with technology stack and architectural patterns
`;

    return {
      prompt,
      instructions,
      context: {
        projectPath: safeProjectPath,
        absoluteProjectPath: 'resolved-by-ai-agent',
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
      { projectPath, absoluteProjectPath: 'resolved-by-ai-agent' }
    );
  }
}

/**
 * Generate prompt for AI-driven file content reading
 */
export async function readFileContent(filePath: string): Promise<{ prompt: string; instructions: string; context: any }> {
  try {
    console.error(`[DEBUG] Generating file read prompt for: ${filePath}`);

    // Pure prompt-driven approach - delegate file reading to AI agent
    const safeFilePath = filePath || '';

    const prompt = `
# File Content Reading Request

Please read the content of the file: **${safeFilePath}**

## Path Security Validation

The AI agent must:
1. **Validate file path security**: Ensure the path is not a system directory (/, /usr, /bin, /etc, /var, /tmp, etc.)
2. **Resolve relative paths safely**: Handle relative paths from the current working directory
3. **Prevent unauthorized access**: Reject attempts to read sensitive system files or directories outside the project scope
4. **Validate file existence**: Check if the file exists before attempting to read

## File Reading Requirements

1. **Safe File Access**: Read the file content using appropriate file system tools
2. **Encoding Handling**: Read the file as UTF-8 text content
3. **Error Handling**: Provide clear error messages for:
   - File not found
   - Permission denied
   - Invalid file path
   - Binary files or unsupported formats

## Expected Output Format

\`\`\`json
{
  "success": true,
  "filePath": "${safeFilePath}",
  "content": "file content as string",
  "metadata": {
    "size": <file_size_in_bytes>,
    "encoding": "utf-8",
    "lastModified": "ISO_timestamp"
  },
  "security": {
    "pathValidated": true,
    "accessAuthorized": true,
    "systemDirectoryCheck": "passed"
  }
}
\`\`\`

## Error Response Format (if file cannot be read)

\`\`\`json
{
  "success": false,
  "filePath": "${safeFilePath}",
  "error": "detailed error message",
  "errorType": "FILE_NOT_FOUND|PERMISSION_DENIED|INVALID_PATH|SECURITY_VIOLATION",
  "security": {
    "pathValidated": boolean,
    "accessAuthorized": boolean,
    "systemDirectoryCheck": "passed|failed",
    "rejectionReason": "specific reason if access denied"
  }
}
\`\`\`
`;

    const instructions = `
## Implementation Steps

1. **Security Validation**:
   - Validate the file path: ${safeFilePath}
   - Ensure it's not a system directory or sensitive location
   - Check for path traversal attempts (../, .\\, etc.)

2. **File Access**:
   - Check if the file exists and is readable
   - Verify file permissions allow reading
   - Handle symbolic links safely

3. **Content Reading**:
   - Read file content as UTF-8 text
   - Handle large files appropriately
   - Detect and handle binary files

4. **Response Generation**:
   - Format response according to the specified JSON structure
   - Include comprehensive metadata and security validation results
   - Provide detailed error information if reading fails

## Safety Checks

- ✅ Path security validation delegated to AI agent
- ✅ System directory protection enabled
- ✅ File access permission validation required
- ✅ Comprehensive error handling specified

## Context Information

- **File Path**: ${safeFilePath}
- **Operation**: Safe file content reading
- **Security Level**: High (with path validation and access control)
`;

    return {
      prompt,
      instructions,
      context: {
        filePath: safeFilePath,
        operation: 'file_read',
        securityLevel: 'high',
        expectedFormat: 'json'
      }
    };

  } catch (error) {
    throw new FileSystemError(
      `Failed to generate file read prompt: ${error instanceof Error ? error.message : String(error)}`,
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
    // Pure prompt-driven approach - delegate all path resolution and validation to AI
    const safeProjectPath = projectPath || '.';

    const prompt = `
# File Discovery Request

Please find files matching the specified patterns in: **${safeProjectPath}**

## Path Resolution Instructions
1. **Safely resolve the project path**: If path is "." or "./", use the current working directory
2. **Validate path security**: Ensure the path is not a system directory (/, /usr, /bin, etc.)
3. **Handle relative paths**: Resolve relative paths from the current working directory

## Search Patterns
${patterns.map(pattern => `- ${pattern}`).join('\n')}

## Requirements
- Search in the resolved directory (safely resolve ${safeProjectPath})
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
  "searchPath": "<resolved-absolute-path>"
}
\`\`\`
`;

    const instructions = `
## Implementation Steps
1. Scan the resolved directory (safely resolve ${safeProjectPath})
2. Apply patterns: ${patterns.join(', ')}
3. Collect file metadata (name, size, extension, path)
${options.includeContent ? '4. Read and include file content' : '4. Skip file content reading'}
5. Format results as JSON

## Context
- Base directory: ${safeProjectPath}
- Include content: ${options.includeContent || false}
- Pattern count: ${patterns.length}
`;

    return {
      prompt,
      instructions,
      context: {
        projectPath: safeProjectPath,
        absoluteProjectPath: 'resolved-by-ai-agent',
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
 * Generate prompt for AI-driven file existence check
 */
export async function fileExists(filePath: string): Promise<{ prompt: string; instructions: string; context: any }> {
  try {
    console.error(`[DEBUG] Generating file existence check prompt for: ${filePath}`);

    // Pure prompt-driven approach - delegate file existence check to AI agent
    const safeFilePath = filePath || '';

    const prompt = `
# File Existence Check Request

Please check if the file exists: **${safeFilePath}**

## Path Security Validation

The AI agent must:
1. **Validate file path security**: Ensure the path is not a system directory (/, /usr, /bin, /etc, /var, /tmp, etc.)
2. **Resolve relative paths safely**: Handle relative paths from the current working directory
3. **Prevent unauthorized access**: Reject attempts to check sensitive system files or directories outside the project scope
4. **Validate path format**: Check for valid file path format and reject malicious patterns

## File Existence Check Requirements

1. **Safe Path Resolution**: Resolve the file path using appropriate file system tools
2. **Access Validation**: Check if the file exists and is accessible
3. **Security Compliance**: Ensure the check doesn't expose sensitive information
4. **Error Handling**: Handle various scenarios:
   - File exists and is accessible
   - File does not exist
   - Path is invalid or malformed
   - Permission denied
   - Path points to a directory instead of a file

## Expected Output Format

\`\`\`json
{
  "success": true,
  "filePath": "${safeFilePath}",
  "exists": true,
  "metadata": {
    "type": "file|directory|symlink",
    "accessible": true,
    "lastChecked": "ISO_timestamp"
  },
  "security": {
    "pathValidated": true,
    "accessAuthorized": true,
    "systemDirectoryCheck": "passed"
  }
}
\`\`\`

## Response Format for Non-Existent File

\`\`\`json
{
  "success": true,
  "filePath": "${safeFilePath}",
  "exists": false,
  "metadata": {
    "type": null,
    "accessible": false,
    "lastChecked": "ISO_timestamp"
  },
  "security": {
    "pathValidated": true,
    "accessAuthorized": true,
    "systemDirectoryCheck": "passed"
  }
}
\`\`\`

## Error Response Format (for security violations or invalid paths)

\`\`\`json
{
  "success": false,
  "filePath": "${safeFilePath}",
  "exists": false,
  "error": "detailed error message",
  "errorType": "INVALID_PATH|SECURITY_VIOLATION|PERMISSION_DENIED|MALFORMED_PATH",
  "security": {
    "pathValidated": boolean,
    "accessAuthorized": boolean,
    "systemDirectoryCheck": "passed|failed",
    "rejectionReason": "specific reason if access denied"
  }
}
\`\`\`
`;

    const instructions = `
## Implementation Steps

1. **Security Validation**:
   - Validate the file path: ${safeFilePath}
   - Ensure it's not a system directory or sensitive location
   - Check for path traversal attempts (../, .\\, etc.)
   - Validate path format and reject malicious patterns

2. **Path Resolution**:
   - Resolve relative paths from the current working directory
   - Handle symbolic links appropriately
   - Normalize path separators for the operating system

3. **Existence Check**:
   - Check if the file exists at the resolved path
   - Determine if it's a file, directory, or symbolic link
   - Verify accessibility without reading content

4. **Response Generation**:
   - Format response according to the specified JSON structure
   - Include comprehensive metadata and security validation results
   - Provide clear boolean result in the "exists" field
   - Include detailed error information if check fails

## Safety Checks

- ✅ Path security validation delegated to AI agent
- ✅ System directory protection enabled
- ✅ File access permission validation required
- ✅ Comprehensive error handling specified
- ✅ Boolean result format clearly defined

## Context Information

- **File Path**: ${safeFilePath}
- **Operation**: Safe file existence check
- **Security Level**: High (with path validation and access control)
- **Expected Result**: Boolean existence status with metadata
`;

    return {
      prompt,
      instructions,
      context: {
        filePath: safeFilePath,
        operation: 'file_exists_check',
        securityLevel: 'high',
        expectedFormat: 'json',
        resultType: 'boolean'
      }
    };

  } catch (error) {
    throw new FileSystemError(
      `Failed to generate file existence check prompt: ${error instanceof Error ? error.message : String(error)}`,
      { filePath }
    );
  }
}

/**
 * Generate prompt for AI-driven directory creation
 */
export async function ensureDirectory(dirPath: string): Promise<{ prompt: string; instructions: string; context: any }> {
  try {
    console.error(`[DEBUG] Generating directory creation prompt for: ${dirPath}`);

    // Pure prompt-driven approach - delegate directory creation to AI agent
    const safeDirPath = dirPath || '';

    const prompt = `
# Directory Creation Request

Please ensure the directory exists: **${safeDirPath}**

## Path Security Validation

The AI agent must:
1. **Validate directory path security**: Ensure the path is not a system directory (/, /usr, /bin, /etc, /var, /tmp, etc.)
2. **Resolve relative paths safely**: Handle relative paths from the current working directory
3. **Prevent unauthorized access**: Reject attempts to create directories in sensitive system locations
4. **Validate path format**: Check for valid directory path format and reject malicious patterns

## Directory Creation Requirements

1. **Safe Path Resolution**: Resolve the directory path using appropriate file system tools
2. **Recursive Creation**: Create parent directories if they don't exist (recursive: true)
3. **Permission Handling**: Ensure appropriate permissions for directory creation
4. **Error Handling**: Handle various scenarios:
   - Directory already exists (success)
   - Parent directories don't exist (create them)
   - Permission denied
   - Invalid path or malformed directory name
   - Disk space issues

## Action Confirmation Required

Before creating any directories, confirm the action with the user:

**Action**: Create directory structure
**Target**: ${safeDirPath}
**Type**: Directory creation (recursive)
**Impact**: Creates directory and any missing parent directories

## Expected Output Format

\`\`\`json
{
  "success": true,
  "dirPath": "${safeDirPath}",
  "created": true,
  "metadata": {
    "type": "directory",
    "recursive": true,
    "permissions": "755",
    "createdAt": "ISO_timestamp"
  },
  "security": {
    "pathValidated": true,
    "accessAuthorized": true,
    "systemDirectoryCheck": "passed"
  },
  "confirmation": {
    "actionConfirmed": true,
    "userApproved": true
  }
}
\`\`\`

## Response Format for Existing Directory

\`\`\`json
{
  "success": true,
  "dirPath": "${safeDirPath}",
  "created": false,
  "metadata": {
    "type": "directory",
    "alreadyExists": true,
    "permissions": "existing_permissions",
    "lastModified": "ISO_timestamp"
  },
  "security": {
    "pathValidated": true,
    "accessAuthorized": true,
    "systemDirectoryCheck": "passed"
  }
}
\`\`\`

## Error Response Format

\`\`\`json
{
  "success": false,
  "dirPath": "${safeDirPath}",
  "created": false,
  "error": "detailed error message",
  "errorType": "PERMISSION_DENIED|INVALID_PATH|SECURITY_VIOLATION|DISK_FULL",
  "security": {
    "pathValidated": boolean,
    "accessAuthorized": boolean,
    "systemDirectoryCheck": "passed|failed",
    "rejectionReason": "specific reason if access denied"
  }
}
\`\`\`
`;

    const instructions = `
## Implementation Steps

1. **Security Validation**:
   - Validate the directory path: ${safeDirPath}
   - Ensure it's not a system directory or sensitive location
   - Check for path traversal attempts (../, .\\, etc.)
   - Validate path format and reject malicious patterns

2. **Action Confirmation**:
   - Present the directory creation action to the user for confirmation
   - Include details about what directories will be created
   - Wait for user approval before proceeding

3. **Directory Creation**:
   - Check if the directory already exists
   - Create parent directories recursively if needed
   - Set appropriate permissions (755 or system default)
   - Handle symbolic links appropriately

4. **Response Generation**:
   - Format response according to the specified JSON structure
   - Include comprehensive metadata and security validation results
   - Provide detailed error information if creation fails
   - Include confirmation status

## Safety Checks

- ✅ Path security validation delegated to AI agent
- ✅ System directory protection enabled
- ✅ Action confirmation required before directory creation
- ✅ Recursive directory creation with permission handling
- ✅ Comprehensive error handling specified

## Context Information

- **Directory Path**: ${safeDirPath}
- **Operation**: Safe directory creation (recursive)
- **Security Level**: High (with path validation and access control)
- **Confirmation Required**: Yes (action confirmation pattern)
`;

    return {
      prompt,
      instructions,
      context: {
        dirPath: safeDirPath,
        operation: 'directory_creation',
        securityLevel: 'high',
        expectedFormat: 'json',
        confirmationRequired: true,
        recursive: true
      }
    };

  } catch (error) {
    throw new FileSystemError(
      `Failed to generate directory creation prompt: ${error instanceof Error ? error.message : String(error)}`,
      { dirPath }
    );
  }
}

/**
 * Generate prompt for AI-driven file writing with directory creation
 */
export async function writeFile(filePath: string, content: string): Promise<{ prompt: string; instructions: string; context: any }> {
  try {
    console.error(`[DEBUG] Generating file write prompt for: ${filePath}`);

    // Pure prompt-driven approach - delegate file writing to AI agent
    const safeFilePath = filePath || '';
    const safeContent = content || '';
    const contentPreview = safeContent.length > 200 ? safeContent.substring(0, 200) + '...' : safeContent;

    const prompt = `
# File Writing Request

Please write content to the file: **${safeFilePath}**

## Path Security Validation

The AI agent must:
1. **Validate file path security**: Ensure the path is not a system directory (/, /usr, /bin, /etc, /var, /tmp, etc.)
2. **Resolve relative paths safely**: Handle relative paths from the current working directory
3. **Prevent unauthorized access**: Reject attempts to write to sensitive system files or directories
4. **Validate path format**: Check for valid file path format and reject malicious patterns

## Content Security Validation

The AI agent must:
1. **Content sanitization**: Validate content for security issues (no malicious scripts, etc.)
2. **Encoding validation**: Ensure content is properly encoded as UTF-8
3. **Size validation**: Check content size is reasonable
4. **Format validation**: Verify content format matches file extension expectations

## File Writing Requirements

1. **Directory Creation**: Ensure parent directory exists (create if needed)
2. **Safe File Writing**: Write content using appropriate file system tools
3. **Encoding Handling**: Write the file as UTF-8 text content
4. **Atomic Operations**: Use atomic write operations when possible
5. **Permission Handling**: Set appropriate file permissions
6. **Backup Consideration**: Consider backing up existing files if they exist

## Action Confirmation Required

Before writing any files, confirm the action with the user:

**Action**: Write file content
**Target**: ${safeFilePath}
**Content Size**: ${safeContent.length} characters
**Content Preview**: ${contentPreview}
**Type**: File creation/modification
**Impact**: Creates file and any missing parent directories

## Expected Output Format

\`\`\`json
{
  "success": true,
  "filePath": "${safeFilePath}",
  "written": true,
  "metadata": {
    "type": "file",
    "size": ${safeContent.length},
    "encoding": "utf-8",
    "permissions": "644",
    "createdAt": "ISO_timestamp",
    "directoryCreated": boolean
  },
  "security": {
    "pathValidated": true,
    "contentValidated": true,
    "accessAuthorized": true,
    "systemDirectoryCheck": "passed"
  },
  "confirmation": {
    "actionConfirmed": true,
    "userApproved": true
  }
}
\`\`\`

## Response Format for File Update

\`\`\`json
{
  "success": true,
  "filePath": "${safeFilePath}",
  "written": true,
  "metadata": {
    "type": "file",
    "size": ${safeContent.length},
    "encoding": "utf-8",
    "permissions": "644",
    "updatedAt": "ISO_timestamp",
    "previousSize": <previous_file_size>,
    "directoryCreated": false
  },
  "security": {
    "pathValidated": true,
    "contentValidated": true,
    "accessAuthorized": true,
    "systemDirectoryCheck": "passed"
  },
  "confirmation": {
    "actionConfirmed": true,
    "userApproved": true
  }
}
\`\`\`

## Error Response Format

\`\`\`json
{
  "success": false,
  "filePath": "${safeFilePath}",
  "written": false,
  "error": "detailed error message",
  "errorType": "PERMISSION_DENIED|INVALID_PATH|SECURITY_VIOLATION|CONTENT_INVALID|DISK_FULL",
  "security": {
    "pathValidated": boolean,
    "contentValidated": boolean,
    "accessAuthorized": boolean,
    "systemDirectoryCheck": "passed|failed",
    "rejectionReason": "specific reason if access denied"
  }
}
\`\`\`
`;

    const instructions = `
## Implementation Steps

1. **Security Validation**:
   - Validate the file path: ${safeFilePath}
   - Ensure it's not a system directory or sensitive location
   - Check for path traversal attempts (../, .\\, etc.)
   - Validate content for security issues

2. **Action Confirmation**:
   - Present the file writing action to the user for confirmation
   - Include details about the file path and content preview
   - Show content size and any directories that will be created
   - Wait for user approval before proceeding

3. **Directory Preparation**:
   - Extract directory path from file path: ${dirname(safeFilePath)}
   - Ensure parent directory exists (create recursively if needed)
   - Validate directory permissions

4. **File Writing**:
   - Check if file already exists (for backup consideration)
   - Write content to file using UTF-8 encoding
   - Set appropriate file permissions (644 or system default)
   - Use atomic write operations when possible

5. **Response Generation**:
   - Format response according to the specified JSON structure
   - Include comprehensive metadata and security validation results
   - Provide detailed error information if writing fails
   - Include confirmation status and directory creation details

## Safety Checks

- ✅ Path security validation delegated to AI agent
- ✅ Content security validation required
- ✅ System directory protection enabled
- ✅ Action confirmation required before file writing
- ✅ Directory creation with permission handling
- ✅ Comprehensive error handling specified

## Context Information

- **File Path**: ${safeFilePath}
- **Content Size**: ${safeContent.length} characters
- **Operation**: Safe file writing with directory creation
- **Security Level**: High (with path and content validation)
- **Confirmation Required**: Yes (action confirmation pattern)
`;

    return {
      prompt,
      instructions,
      context: {
        filePath: safeFilePath,
        contentSize: safeContent.length,
        operation: 'file_write',
        securityLevel: 'high',
        expectedFormat: 'json',
        confirmationRequired: true,
        directoryCreation: true
      }
    };

  } catch (error) {
    throw new FileSystemError(
      `Failed to generate file write prompt: ${error instanceof Error ? error.message : String(error)}`,
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
