/**
 * Actual File Operations Utilities
 * 
 * Utilities that perform real file system operations instead of returning prompts
 */

import { McpAdrError } from '../types/index.js';

export interface ProjectFileInfo {
  filename: string;
  content: string;
  path: string;
  relativePath: string;
  type: string;
  size: number;
  exists: boolean;
}

export interface ProjectStructure {
  rootPath: string;
  packageFiles: ProjectFileInfo[];
  configFiles: ProjectFileInfo[];
  environmentFiles: ProjectFileInfo[];
  buildFiles: ProjectFileInfo[];
  dockerFiles: ProjectFileInfo[];
  kubernetesFiles: ProjectFileInfo[];
  ciFiles: ProjectFileInfo[];
  scriptFiles: ProjectFileInfo[];
  totalFiles: number;
  directories: string[];
}

/**
 * Actually scan and analyze project structure using file system operations
 */
export async function scanProjectStructure(
  projectPath: string,
  options: {
    readContent?: boolean;
    maxFileSize?: number;
    includeHidden?: boolean;
  } = {}
): Promise<ProjectStructure> {
  const {
    readContent = true,
    maxFileSize = 100000, // 100KB max
    includeHidden = false
  } = options;

  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Initialize structure
    const structure: ProjectStructure = {
      rootPath: projectPath,
      packageFiles: [],
      configFiles: [],
      environmentFiles: [],
      buildFiles: [],
      dockerFiles: [],
      kubernetesFiles: [],
      ciFiles: [],
      scriptFiles: [],
      totalFiles: 0,
      directories: []
    };

    // Scan for specific file patterns
    const filesToScan = [
      // Package files
      { pattern: 'package.json', category: 'packageFiles' },
      { pattern: 'requirements.txt', category: 'packageFiles' },
      { pattern: 'Pipfile', category: 'packageFiles' },
      { pattern: 'poetry.lock', category: 'packageFiles' },
      { pattern: 'Cargo.toml', category: 'packageFiles' },
      { pattern: 'go.mod', category: 'packageFiles' },
      { pattern: 'pom.xml', category: 'packageFiles' },
      { pattern: 'build.gradle', category: 'packageFiles' },
      
      // Environment files
      { pattern: '.env', category: 'environmentFiles' },
      { pattern: '.env.local', category: 'environmentFiles' },
      { pattern: '.env.production', category: 'environmentFiles' },
      { pattern: '.env.development', category: 'environmentFiles' },
      { pattern: 'config.json', category: 'configFiles' },
      { pattern: 'config.yaml', category: 'configFiles' },
      { pattern: 'config.yml', category: 'configFiles' },
      
      // Docker files
      { pattern: 'Dockerfile', category: 'dockerFiles' },
      { pattern: 'docker-compose.yml', category: 'dockerFiles' },
      { pattern: 'docker-compose.yaml', category: 'dockerFiles' },
      { pattern: '.dockerignore', category: 'dockerFiles' },
      
      // Kubernetes files
      { pattern: '*.yaml', category: 'kubernetesFiles', isPattern: true },
      { pattern: '*.yml', category: 'kubernetesFiles', isPattern: true },
      
      // Build files
      { pattern: 'Makefile', category: 'buildFiles' },
      { pattern: 'webpack.config.js', category: 'buildFiles' },
      { pattern: 'vite.config.js', category: 'buildFiles' },
      { pattern: 'tsconfig.json', category: 'configFiles' },
      
      // CI files
      { pattern: '.github/workflows', category: 'ciFiles', isDirectory: true },
      { pattern: '.gitlab-ci.yml', category: 'ciFiles' },
      { pattern: 'Jenkinsfile', category: 'ciFiles' },
      { pattern: '.travis.yml', category: 'ciFiles' },
      
      // Shell scripts and automation
      { pattern: '*.sh', category: 'scriptFiles', isPattern: true },
      { pattern: '*.bash', category: 'scriptFiles', isPattern: true },
      { pattern: '*.zsh', category: 'scriptFiles', isPattern: true },
      { pattern: '*.fish', category: 'scriptFiles', isPattern: true },
      { pattern: '*.ps1', category: 'scriptFiles', isPattern: true },
      { pattern: '*.bat', category: 'scriptFiles', isPattern: true },
      { pattern: '*.cmd', category: 'scriptFiles', isPattern: true },
      { pattern: 'scripts', category: 'scriptFiles', isDirectory: true },
      { pattern: 'bin', category: 'scriptFiles', isDirectory: true }
    ];

    // Scan directories
    const directories = await scanDirectories(projectPath, includeHidden);
    structure.directories = directories;

    // Scan for specific files
    for (const fileSpec of filesToScan) {
      if (fileSpec.isDirectory) {
        // Handle directory scanning (like .github/workflows)
        const dirPath = path.join(projectPath, fileSpec.pattern);
        try {
          const stat = await fs.stat(dirPath);
          if (stat.isDirectory()) {
            const files = await fs.readdir(dirPath);
            for (const file of files) {
              const filePath = path.join(dirPath, file);
              const fileInfo = await readFileInfo(filePath, projectPath, readContent, maxFileSize);
              if (fileInfo) {
                fileInfo.type = fileSpec.category;
                (structure as any)[fileSpec.category].push(fileInfo);
                structure.totalFiles++;
              }
            }
          }
        } catch {
          // Directory doesn't exist, skip
        }
      } else if (fileSpec.isPattern) {
        // Handle glob patterns
        const files = await findFilesWithPattern(projectPath, fileSpec.pattern);
        for (const filePath of files) {
          let shouldInclude = false;
          
          // Special logic for different file types
          if (fileSpec.category === 'kubernetesFiles') {
            shouldInclude = await isKubernetesFile(filePath);
          } else if (fileSpec.category === 'scriptFiles') {
            shouldInclude = await isScriptFile(filePath);
          } else {
            shouldInclude = true; // Include all other pattern matches
          }
          
          if (shouldInclude) {
            const fileInfo = await readFileInfo(filePath, projectPath, readContent, maxFileSize);
            if (fileInfo) {
              fileInfo.type = fileSpec.category;
              (structure as any)[fileSpec.category].push(fileInfo);
              structure.totalFiles++;
            }
          }
        }
      } else {
        // Handle specific files
        const filePath = path.join(projectPath, fileSpec.pattern);
        const fileInfo = await readFileInfo(filePath, projectPath, readContent, maxFileSize);
        if (fileInfo) {
          fileInfo.type = fileSpec.category;
          (structure as any)[fileSpec.category].push(fileInfo);
          structure.totalFiles++;
        }
      }
    }

    return structure;

  } catch (error) {
    throw new McpAdrError(
      `Failed to scan project structure: ${error instanceof Error ? error.message : String(error)}`,
      'SCAN_ERROR'
    );
  }
}

/**
 * Scan directories in project
 */
async function scanDirectories(projectPath: string, includeHidden: boolean): Promise<string[]> {
  const fs = await import('fs/promises');
  const directories: string[] = [];

  try {
    const entries = await fs.readdir(projectPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!includeHidden && entry.name.startsWith('.')) {
          continue;
        }
        directories.push(entry.name);
      }
    }
  } catch {
    // Error reading directory
  }

  return directories;
}

/**
 * Read file information and optionally content
 */
async function readFileInfo(
  filePath: string,
  projectPath: string,
  readContent: boolean,
  maxFileSize: number
): Promise<ProjectFileInfo | null> {
  const fs = await import('fs/promises');
  const path = await import('path');

  try {
    const stat = await fs.stat(filePath);
    
    if (!stat.isFile()) {
      return null;
    }

    let content = '';
    if (readContent && stat.size <= maxFileSize) {
      try {
        content = await fs.readFile(filePath, 'utf-8');
      } catch {
        // Binary file or encoding issue, leave content empty
        content = '[Binary or unreadable file]';
      }
    }

    return {
      filename: path.basename(filePath),
      content,
      path: filePath,
      relativePath: path.relative(projectPath, filePath),
      type: 'unknown',
      size: stat.size,
      exists: true
    };

  } catch {
    return null; // File doesn't exist or can't be read
  }
}

/**
 * Find files matching a pattern (simplified glob)
 */
async function findFilesWithPattern(projectPath: string, pattern: string): Promise<string[]> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const files: string[] = [];

  const extension = pattern.replace('*.', '.');

  try {
    const scan = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await scan(fullPath); // Recursive scan
        } else if (entry.isFile() && entry.name.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    };

    await scan(projectPath);
  } catch {
    // Error scanning
  }

  return files;
}

/**
 * Check if a YAML/YML file is likely a Kubernetes manifest
 */
async function isKubernetesFile(filePath: string): Promise<boolean> {
  const fs = await import('fs/promises');
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lowerContent = content.toLowerCase();
    
    // Look for Kubernetes-specific keywords
    const k8sKeywords = [
      'apiversion',
      'kind:',
      'metadata:',
      'spec:',
      'deployment',
      'service',
      'configmap',
      'secret',
      'ingress',
      'namespace',
      'pod',
      'replicaset'
    ];

    return k8sKeywords.some(keyword => lowerContent.includes(keyword));
  } catch {
    return false;
  }
}

/**
 * Check if a file is a script file
 */
async function isScriptFile(filePath: string): Promise<boolean> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  try {
    const filename = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();
    
    // Check by file extension
    const scriptExtensions = ['.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd'];
    if (scriptExtensions.includes(extension)) {
      return true;
    }
    
    // Check for shebang in files without extension or common script names
    if (!extension || ['run', 'start', 'stop', 'deploy', 'build', 'test', 'setup'].some(name => filename.includes(name))) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const firstLine = content.split('\n')[0];
        
        // Look for shebang lines
        if (firstLine && firstLine.startsWith('#!')) {
          const shebangs = ['/bin/sh', '/bin/bash', '/usr/bin/env', '/bin/zsh', '/bin/fish'];
          return shebangs.some(shebang => firstLine.includes(shebang));
        }
      } catch {
        // Can't read file content, rely on extension/filename
      }
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Find and read environment files specifically
 */
export async function findActualEnvironmentFiles(projectPath: string): Promise<ProjectFileInfo[]> {
  const structure = await scanProjectStructure(projectPath, { readContent: true });
  
  return [
    ...structure.environmentFiles,
    ...structure.dockerFiles,
    ...structure.configFiles,
    ...structure.kubernetesFiles,
    ...structure.scriptFiles
  ];
}