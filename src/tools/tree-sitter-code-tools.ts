/**
 * Tree-Sitter Code Analysis Tools
 *
 * Provides deterministic code structure analysis tools for MCP.
 * These tools replace non-deterministic ripgrep-based search with
 * AST-based structural analysis.
 *
 * Design Philosophy (per ADR-016):
 * - Tools provide deterministic data
 * - LLM handles reasoning and semantic matching
 * - Same input always produces same output
 *
 * @see docs/adrs/adr-016-replace-ripgrep-with-tree-sitter.md
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, relative } from 'path';
import {
  TreeSitterAnalyzer,
  CodeAnalysisResult,
  type ImportAnalysis,
  type FunctionAnalysis,
} from '../utils/tree-sitter-analyzer.js';

// Singleton analyzer instance
let analyzerInstance: TreeSitterAnalyzer | null = null;

function getAnalyzer(): TreeSitterAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new TreeSitterAnalyzer();
  }
  return analyzerInstance;
}

/**
 * File structure entry
 */
export interface FileEntry {
  path: string;
  relativePath: string;
  type: 'file' | 'directory';
  extension?: string;
  language?: string;
  size?: number;
}

/**
 * Project structure result
 */
export interface ProjectStructureResult {
  root: string;
  totalFiles: number;
  totalDirectories: number;
  filesByLanguage: Record<string, number>;
  entries: FileEntry[];
}

/**
 * Import extraction result
 */
export interface ImportExtractionResult {
  file: string;
  language: string;
  imports: ImportAnalysis[];
  externalDependencies: string[];
  internalDependencies: string[];
}

/**
 * Function extraction result
 */
export interface FunctionExtractionResult {
  file: string;
  language: string;
  functions: FunctionAnalysis[];
  totalFunctions: number;
  securitySensitiveFunctions: string[];
}

/**
 * Class/Module definition
 */
export interface ClassDefinition {
  name: string;
  type: 'class' | 'interface' | 'type' | 'enum';
  methods: string[];
  properties: string[];
  location: { line: number; column: number };
  exported: boolean;
}

/**
 * Class extraction result
 */
export interface ClassExtractionResult {
  file: string;
  language: string;
  classes: ClassDefinition[];
  interfaces: ClassDefinition[];
  types: ClassDefinition[];
}

/**
 * Dependency from package.json or requirements.txt
 */
export interface DependencyInfo {
  name: string;
  version: string;
  type: 'production' | 'development' | 'peer' | 'optional';
  source: string; // package.json, requirements.txt, etc.
}

/**
 * Project dependencies result
 */
export interface DependenciesResult {
  projectPath: string;
  dependencies: DependencyInfo[];
  totalCount: number;
  byType: Record<string, number>;
}

/**
 * Export definition
 */
export interface ExportDefinition {
  name: string;
  type: 'function' | 'class' | 'const' | 'type' | 'interface' | 'default' | 'variable';
  location: { line: number; column: number };
  isDefault: boolean;
}

/**
 * Export extraction result
 */
export interface ExportExtractionResult {
  file: string;
  language: string;
  exports: ExportDefinition[];
  hasDefaultExport: boolean;
  namedExports: string[];
}

// Language detection by extension
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.py': 'python',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.json': 'json',
  '.sh': 'bash',
  '.bash': 'bash',
  '.tf': 'terraform',
  '.tfvars': 'terraform',
};

/**
 * Get deterministic file structure of a project
 *
 * Returns a complete file tree without any search or filtering.
 * The LLM can then decide which files are relevant.
 */
export async function getFileStructure(
  projectPath: string,
  options: {
    maxDepth?: number;
    includeHidden?: boolean;
    excludePatterns?: string[];
  } = {}
): Promise<ProjectStructureResult> {
  const {
    maxDepth = 10,
    includeHidden = false,
    excludePatterns = ['node_modules', 'dist', '.git', '__pycache__', '.pytest_cache', 'coverage'],
  } = options;

  const entries: FileEntry[] = [];
  const filesByLanguage: Record<string, number> = {};
  let totalDirectories = 0;

  function shouldExclude(name: string): boolean {
    if (!includeHidden && name.startsWith('.')) return true;
    // Use exact matching only to avoid excluding directories like "distribution" when "dist" is excluded
    return excludePatterns.some(pattern => name === pattern);
  }

  function walkDirectory(dirPath: string, depth: number): void {
    if (depth > maxDepth) return;

    try {
      const items = readdirSync(dirPath);

      for (const item of items.sort()) {
        if (shouldExclude(item)) continue;

        const fullPath = join(dirPath, item);
        const relativePath = relative(projectPath, fullPath);

        try {
          const stats = statSync(fullPath);

          if (stats.isDirectory()) {
            totalDirectories++;
            entries.push({
              path: fullPath,
              relativePath,
              type: 'directory',
            });
            walkDirectory(fullPath, depth + 1);
          } else if (stats.isFile()) {
            const ext = extname(item).toLowerCase();
            const language = EXTENSION_TO_LANGUAGE[ext] || 'other';

            filesByLanguage[language] = (filesByLanguage[language] || 0) + 1;

            entries.push({
              path: fullPath,
              relativePath,
              type: 'file',
              extension: ext,
              language,
              size: stats.size,
            });
          }
        } catch {
          // Skip files we can't stat
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  walkDirectory(projectPath, 0);

  return {
    root: projectPath,
    totalFiles: entries.filter(e => e.type === 'file').length,
    totalDirectories,
    filesByLanguage,
    entries,
  };
}

/**
 * Get AST-extracted imports from a file
 *
 * Returns deterministic list of all imports/requires in a file.
 */
export async function getImports(filePath: string): Promise<ImportExtractionResult> {
  const analyzer = getAnalyzer();
  const analysis = await analyzer.analyzeFile(filePath);

  const externalDependencies = analysis.imports
    .filter(imp => imp.isExternal)
    .map(imp => imp.module);

  const internalDependencies = analysis.imports
    .filter(imp => !imp.isExternal)
    .map(imp => imp.module);

  return {
    file: filePath,
    language: analysis.language,
    imports: analysis.imports,
    externalDependencies: [...new Set(externalDependencies)],
    internalDependencies: [...new Set(internalDependencies)],
  };
}

/**
 * Get AST-extracted exports from a file
 *
 * Returns deterministic list of all exports in a file.
 */
export async function getExports(filePath: string): Promise<ExportExtractionResult> {
  const content = readFileSync(filePath, 'utf-8');
  const ext = extname(filePath).toLowerCase();
  const language = EXTENSION_TO_LANGUAGE[ext] || 'other';

  const exports: ExportDefinition[] = [];
  let hasDefaultExport = false;

  // Parse exports based on language
  if (language === 'typescript' || language === 'javascript') {
    // ES6 named exports: export const/function/class/type/interface
    const namedExportRegex = /export\s+(const|let|var|function|class|type|interface|enum)\s+(\w+)/g;
    let match;

    while ((match = namedExportRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const name = match[2] ?? '';
      const type = match[1] ?? 'variable';
      if (name) {
        exports.push({
          name,
          type: type as ExportDefinition['type'],
          location: { line: lineNum, column: 0 },
          isDefault: false,
        });
      }
    }

    // Default exports: export default
    const defaultExportRegex = /export\s+default\s+(?:(class|function)\s+)?(\w+)?/g;
    while ((match = defaultExportRegex.exec(content)) !== null) {
      hasDefaultExport = true;
      const lineNum = content.substring(0, match.index).split('\n').length;
      const name = match[2] || 'default';
      const type = match[1] || 'default';
      exports.push({
        name,
        type: type as ExportDefinition['type'],
        location: { line: lineNum, column: 0 },
        isDefault: true,
      });
    }

    // Re-exports: export { ... } from '...'
    const reExportRegex = /export\s+\{([^}]+)\}/g;
    while ((match = reExportRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const namesStr = match[1] ?? '';
      const parsedNames = namesStr.split(',').map(n => {
        const parts = n.trim().split(' as ');
        return (parts[0] ?? '').trim();
      });
      for (const name of parsedNames) {
        if (name && !exports.some(e => e.name === name)) {
          exports.push({
            name,
            type: 'variable',
            location: { line: lineNum, column: 0 },
            isDefault: false,
          });
        }
      }
    }
  } else if (language === 'python') {
    // Python module-level definitions (implicitly exported)
    const defRegex = /^(def|class)\s+(\w+)/gm;
    let match;
    while ((match = defRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const name = match[2] ?? '';
      const defType = match[1] ?? 'def';
      if (name) {
        exports.push({
          name,
          type: defType === 'def' ? 'function' : 'class',
          location: { line: lineNum, column: 0 },
          isDefault: false,
        });
      }
    }

    // __all__ definition - check for explicit exports
    const allRegex = /__all__\s*=\s*\[([^\]]+)\]/;
    const allMatch = content.match(allRegex);
    if (allMatch && allMatch[1]) {
      // Mark only __all__ items as explicitly exported (future enhancement)
      // Currently just acknowledging existence
    }
  }

  return {
    file: filePath,
    language,
    exports,
    hasDefaultExport,
    namedExports: exports.filter(e => !e.isDefault).map(e => e.name),
  };
}

/**
 * Get AST-extracted functions from a file
 *
 * Returns deterministic list of all functions with signatures.
 */
export async function getFunctions(filePath: string): Promise<FunctionExtractionResult> {
  const analyzer = getAnalyzer();
  const analysis = await analyzer.analyzeFile(filePath);

  const securitySensitiveFunctions = analysis.functions
    .filter(fn => fn.securitySensitive)
    .map(fn => fn.name);

  return {
    file: filePath,
    language: analysis.language,
    functions: analysis.functions,
    totalFunctions: analysis.functions.length,
    securitySensitiveFunctions,
  };
}

/**
 * Get classes, interfaces, and types from a file
 *
 * Returns deterministic list of class/interface/type definitions.
 */
export async function getClasses(filePath: string): Promise<ClassExtractionResult> {
  const content = readFileSync(filePath, 'utf-8');
  const ext = extname(filePath).toLowerCase();
  const language = EXTENSION_TO_LANGUAGE[ext] || 'other';

  const classes: ClassDefinition[] = [];
  const interfaces: ClassDefinition[] = [];
  const types: ClassDefinition[] = [];

  if (language === 'typescript' || language === 'javascript') {
    // Parse classes
    const classRegex =
      /(export\s+)?(class)\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[\w,\s]+)?\s*\{/g;
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const className = match[3] ?? '';
      const isExported = !!match[1];

      if (className) {
        // Extract methods (simplified)
        const classBody = extractBraceBlock(content, match.index + match[0].length - 1);
        const methods = extractMethods(classBody);
        const properties = extractProperties(classBody);

        classes.push({
          name: className,
          type: 'class',
          methods,
          properties,
          location: { line: lineNum, column: 0 },
          exported: isExported,
        });
      }
    }

    // Parse interfaces (TypeScript)
    const interfaceRegex =
      /(export\s+)?(interface)\s+(\w+)(?:<[^>]+>)?\s*(?:extends\s+[\w,\s<>]+)?\s*\{/g;
    while ((match = interfaceRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const interfaceName = match[3] ?? '';
      const isExported = !!match[1];

      if (interfaceName) {
        const interfaceBody = extractBraceBlock(content, match.index + match[0].length - 1);
        const methods = extractInterfaceMethods(interfaceBody);
        const properties = extractInterfaceProperties(interfaceBody);

        interfaces.push({
          name: interfaceName,
          type: 'interface',
          methods,
          properties,
          location: { line: lineNum, column: 0 },
          exported: isExported,
        });
      }
    }

    // Parse type aliases
    const typeRegex = /(export\s+)?type\s+(\w+)(?:<[^>]+>)?\s*=/g;
    while ((match = typeRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const typeName = match[2] ?? '';
      const isExported = !!match[1];

      if (typeName) {
        types.push({
          name: typeName,
          type: 'type',
          methods: [],
          properties: [],
          location: { line: lineNum, column: 0 },
          exported: isExported,
        });
      }
    }
  } else if (language === 'python') {
    // Parse Python classes (including nested classes with indentation)
    const classRegex = /^(\s*)class\s+(\w+)(?:\([^)]*\))?:/gm;
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const classIndent = match[1]?.length ?? 0;
      const className = match[2] ?? '';

      if (className) {
        // Extract methods from class body, passing the class indentation level
        const classBodyStart = match.index + match[0].length;
        const methods = extractPythonMethods(content, classBodyStart, classIndent);

        classes.push({
          name: className,
          type: 'class',
          methods,
          properties: [],
          location: { line: lineNum, column: classIndent },
          exported: !className.startsWith('_'),
        });
      }
    }
  }

  return {
    file: filePath,
    language,
    classes,
    interfaces,
    types,
  };
}

/**
 * Get project dependencies from manifest files
 *
 * Parses package.json, requirements.txt, etc. for dependencies.
 */
export async function getDependencies(projectPath: string): Promise<DependenciesResult> {
  const dependencies: DependencyInfo[] = [];

  // Check package.json
  const packageJsonPath = join(projectPath, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      // Production dependencies
      if (packageJson.dependencies) {
        for (const [name, version] of Object.entries(packageJson.dependencies)) {
          dependencies.push({
            name,
            version: String(version),
            type: 'production',
            source: 'package.json',
          });
        }
      }

      // Development dependencies
      if (packageJson.devDependencies) {
        for (const [name, version] of Object.entries(packageJson.devDependencies)) {
          dependencies.push({
            name,
            version: String(version),
            type: 'development',
            source: 'package.json',
          });
        }
      }

      // Peer dependencies
      if (packageJson.peerDependencies) {
        for (const [name, version] of Object.entries(packageJson.peerDependencies)) {
          dependencies.push({
            name,
            version: String(version),
            type: 'peer',
            source: 'package.json',
          });
        }
      }

      // Optional dependencies
      if (packageJson.optionalDependencies) {
        for (const [name, version] of Object.entries(packageJson.optionalDependencies)) {
          dependencies.push({
            name,
            version: String(version),
            type: 'optional',
            source: 'package.json',
          });
        }
      }
    } catch {
      // Invalid package.json
    }
  }

  // Check requirements.txt
  const requirementsPath = join(projectPath, 'requirements.txt');
  if (existsSync(requirementsPath)) {
    try {
      const content = readFileSync(requirementsPath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;

        // Parse requirement: name==version, name>=version, name, etc.
        const match = trimmed.match(/^([a-zA-Z0-9_-]+)(?:[=<>!~]+(.+))?/);
        if (match && match[1]) {
          dependencies.push({
            name: match[1],
            version: match[2] ?? '*',
            type: 'production',
            source: 'requirements.txt',
          });
        }
      }
    } catch {
      // Invalid requirements.txt
    }
  }

  // Check pyproject.toml (Poetry/PEP 621)
  const pyprojectPath = join(projectPath, 'pyproject.toml');
  if (existsSync(pyprojectPath)) {
    try {
      const content = readFileSync(pyprojectPath, 'utf-8');

      // Simple TOML parsing for dependencies
      const depsMatch = content.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(?=\[|$)/);
      if (depsMatch && depsMatch[1]) {
        const depsSection = depsMatch[1];
        const depLines = depsSection.match(/^(\w+)\s*=\s*["']?([^"'\n]+)["']?/gm) ?? [];

        for (const line of depLines) {
          const [name, version] = line.split('=').map(s => s.trim().replace(/['"]/g, ''));
          if (name && name !== 'python') {
            dependencies.push({
              name,
              version: version || '*',
              type: 'production',
              source: 'pyproject.toml',
            });
          }
        }
      }
    } catch {
      // Invalid pyproject.toml
    }
  }

  // Calculate by type
  const byType: Record<string, number> = {};
  for (const dep of dependencies) {
    byType[dep.type] = (byType[dep.type] || 0) + 1;
  }

  return {
    projectPath,
    dependencies,
    totalCount: dependencies.length,
    byType,
  };
}

/**
 * Perform full tree-sitter analysis on a file
 *
 * Returns complete AST analysis result.
 */
export async function analyzeFile(filePath: string): Promise<CodeAnalysisResult> {
  const analyzer = getAnalyzer();
  return analyzer.analyzeFile(filePath);
}

/**
 * Analyze multiple files in a directory
 *
 * Returns analysis results for all code files.
 */
export async function analyzeDirectory(
  dirPath: string,
  options: {
    extensions?: string[];
    maxFiles?: number;
    recursive?: boolean;
  } = {}
): Promise<{ files: Array<{ path: string; analysis: CodeAnalysisResult }>; errors: string[] }> {
  const {
    extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.yaml', '.yml', '.json', '.sh', '.tf'],
    maxFiles = 100,
    recursive = true,
  } = options;

  const results: Array<{ path: string; analysis: CodeAnalysisResult }> = [];
  const errors: string[] = [];
  let fileCount = 0;

  async function processDirectory(currentPath: string): Promise<void> {
    if (fileCount >= maxFiles) return;

    try {
      const items = readdirSync(currentPath);

      for (const item of items) {
        if (fileCount >= maxFiles) break;

        const fullPath = join(currentPath, item);

        // Skip common non-code directories
        if (['node_modules', 'dist', '.git', '__pycache__', 'coverage'].includes(item)) {
          continue;
        }

        try {
          const stats = statSync(fullPath);

          if (stats.isDirectory() && recursive) {
            await processDirectory(fullPath);
          } else if (stats.isFile()) {
            const ext = extname(item).toLowerCase();
            if (extensions.includes(ext)) {
              try {
                const analysis = await analyzeFile(fullPath);
                results.push({ path: fullPath, analysis });
                fileCount++;
              } catch (err) {
                errors.push(`Failed to analyze ${fullPath}: ${err}`);
              }
            }
          }
        } catch {
          // Skip files we can't access
        }
      }
    } catch (err) {
      errors.push(`Failed to read directory ${currentPath}: ${err}`);
    }
  }

  await processDirectory(dirPath);

  return { files: results, errors };
}

// Helper functions for parsing

function extractBraceBlock(content: string, startIndex: number): string {
  let depth = 1;
  let i = startIndex + 1;

  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') depth--;
    i++;
  }

  return content.substring(startIndex + 1, i - 1);
}

function extractMethods(classBody: string): string[] {
  const methods: string[] = [];
  const methodRegex = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g;
  let match;

  while ((match = methodRegex.exec(classBody)) !== null) {
    const methodName = match[1];
    if (methodName && !['constructor', 'if', 'while', 'for', 'switch'].includes(methodName)) {
      methods.push(methodName);
    }
  }

  return [...new Set(methods)];
}

function extractProperties(classBody: string): string[] {
  const properties: string[] = [];
  const propRegex = /(?:private|public|protected|readonly)?\s*(\w+)\s*(?::\s*[^;=]+)?(?:=|;)/g;
  let match;

  while ((match = propRegex.exec(classBody)) !== null) {
    const propName = match[1];
    if (propName && !['constructor', 'return', 'const', 'let', 'var'].includes(propName)) {
      properties.push(propName);
    }
  }

  return [...new Set(properties)];
}

function extractInterfaceMethods(interfaceBody: string): string[] {
  const methods: string[] = [];
  const methodRegex = /(\w+)\s*\([^)]*\)\s*:/g;
  let match;

  while ((match = methodRegex.exec(interfaceBody)) !== null) {
    const methodName = match[1];
    if (methodName) {
      methods.push(methodName);
    }
  }

  return [...new Set(methods)];
}

function extractInterfaceProperties(interfaceBody: string): string[] {
  const properties: string[] = [];
  const propRegex = /(\w+)\s*\??\s*:/g;
  let match;

  while ((match = propRegex.exec(interfaceBody)) !== null) {
    const propName = match[1];
    if (propName && !properties.includes(propName)) {
      properties.push(propName);
    }
  }

  return [...new Set(properties)];
}

function extractPythonMethods(
  content: string,
  startIndex: number,
  classIndent: number = 0
): string[] {
  const methods: string[] = [];
  // Expected method indentation is one level deeper than class (typically 4 spaces)
  const expectedMethodIndent = classIndent + 4;

  // Split content from startIndex into lines for line-by-line analysis
  const remainingContent = content.substring(startIndex);
  const lines = remainingContent.split('\n');

  for (const line of lines) {
    // Skip empty lines and comments
    if (line.trim() === '' || line.trim().startsWith('#')) {
      continue;
    }

    // Calculate line indentation (count leading spaces)
    const lineIndent = line.length - line.trimStart().length;

    // If we hit something at class level or less indentation (except empty/comment), class body ends
    if (lineIndent <= classIndent && line.trim() !== '') {
      break;
    }

    // Check for nested class at method level - skip it and its contents
    const nestedClassMatch = line.match(/^(\s*)class\s+(\w+)/);
    if (nestedClassMatch) {
      // Nested class detected - don't include its methods in outer class
      continue;
    }

    // Only match methods at exactly one indentation level deeper than the class
    // This prevents capturing nested class methods
    const methodMatch = line.match(/^(\s*)def\s+(\w+)\s*\(/);
    if (methodMatch) {
      const methodIndent = methodMatch[1]?.length ?? 0;
      const methodName = methodMatch[2];

      // Only capture methods at the expected indentation level
      if (methodName && methodIndent === expectedMethodIndent) {
        methods.push(methodName);
      }
    }
  }

  return methods;
}
