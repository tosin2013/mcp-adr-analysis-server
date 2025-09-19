/**
 * Tree-sitter Integration for Enterprise DevOps Code Analysis
 *
 * Provides intelligent code analysis for multi-language DevOps stacks including:
 * - Ansible playbooks and roles
 * - Terraform/HCL infrastructure
 * - Python microservices
 * - Node.js applications
 * - Container configurations
 * - CI/CD pipelines
 *
 * Enterprise Features:
 * - Secret detection in code
 * - Architectural boundary validation
 * - Multi-language dependency analysis
 * - Security pattern recognition
 */

import { readFileSync } from 'fs';
import { extname, basename } from 'path';

// Tree-sitter imports with error handling for missing parsers
interface TreeSitterParser {
  parse(input: string): TreeSitterTree;
}

interface TreeSitterTree {
  rootNode: TreeSitterNode;
  edit(delta: any): void;
}

interface TreeSitterNode {
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  children: TreeSitterNode[];
  parent: TreeSitterNode | null;
  namedChildren: TreeSitterNode[];
  childForFieldName(fieldName: string): TreeSitterNode | null;
  descendantsOfType(type: string): TreeSitterNode[];
  walk(): TreeSitterTreeCursor;
}

interface TreeSitterTreeCursor {
  nodeType: string;
  nodeText: string;
  gotoFirstChild(): boolean;
  gotoNextSibling(): boolean;
  gotoParent(): boolean;
}

// Language-specific analysis interfaces
export interface CodeAnalysisResult {
  language: string;
  hasSecrets: boolean;
  secrets: SecretMatch[];
  imports: ImportAnalysis[];
  functions: FunctionAnalysis[];
  variables: VariableAnalysis[];
  infraStructure: InfrastructureAnalysis[];
  securityIssues: SecurityIssue[];
  architecturalViolations: ArchitecturalViolation[];
}

export interface SecretMatch {
  type: 'api_key' | 'password' | 'token' | 'private_key' | 'certificate' | 'credential';
  value: string;
  location: { line: number; column: number };
  confidence: number;
  context: string;
}

export interface ImportAnalysis {
  module: string;
  type: 'import' | 'require' | 'include' | 'role' | 'module_call';
  location: { line: number; column: number };
  isExternal: boolean;
  isDangerous: boolean;
  reason?: string;
}

export interface FunctionAnalysis {
  name: string;
  type: 'function' | 'method' | 'task' | 'resource' | 'service';
  parameters: string[];
  location: { line: number; column: number };
  complexity: number;
  securitySensitive: boolean;
}

export interface VariableAnalysis {
  name: string;
  type: 'var' | 'const' | 'let' | 'env' | 'secret' | 'config';
  value?: string;
  location: { line: number; column: number };
  isSensitive: boolean;
  scope: string;
}

export interface InfrastructureAnalysis {
  resourceType: string;
  name: string;
  provider: 'aws' | 'gcp' | 'azure' | 'kubernetes' | 'docker' | 'openshift';
  configuration: Record<string, any>;
  securityRisks: string[];
  location: { line: number; column: number };
}

export interface SecurityIssue {
  type: 'hardcoded_secret' | 'dangerous_function' | 'insecure_config' | 'privilege_escalation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  location: { line: number; column: number };
  suggestion: string;
}

export interface ArchitecturalViolation {
  type: 'layer_violation' | 'circular_dependency' | 'forbidden_import' | 'coupling_violation';
  message: string;
  location: { line: number; column: number };
  suggestion: string;
}

/**
 * Main Tree-sitter analyzer class for enterprise DevOps stacks
 */
export class TreeSitterAnalyzer {
  private parsers: Map<string, TreeSitterParser> = new Map();
  private initialized = false;

  constructor() {
    this.initializeParsers();
  }

  /**
   * Initialize tree-sitter parsers with graceful fallback
   */
  private async initializeParsers(): Promise<void> {
    try {
      // Initialize core parsers for enterprise stack
      await this.loadParser('typescript', 'tree-sitter-typescript');
      await this.loadParser('javascript', 'tree-sitter-javascript');
      await this.loadParser('python', 'tree-sitter-python');
      await this.loadParser('yaml', 'tree-sitter-yaml');
      await this.loadParser('json', 'tree-sitter-json');
      await this.loadParser('bash', 'tree-sitter-bash');
      await this.loadParser('dockerfile', 'tree-sitter-dockerfile');
      await this.loadParser('hcl', '@tree-sitter-grammars/tree-sitter-hcl');

      this.initialized = true;
    } catch (error) {
      console.warn('Tree-sitter initialization failed, falling back to regex analysis:', error);
      this.initialized = false;
    }
  }

  private async loadParser(language: string, packageName: string): Promise<void> {
    try {
      const TreeSitter = (await import('tree-sitter')).default;

      let Parser: any;
      if (language === 'typescript') {
        Parser = (await import('tree-sitter-typescript')).typescript;
      } else if (language === 'hcl') {
        Parser = (await import('@tree-sitter-grammars/tree-sitter-hcl')).default;
      } else {
        const module = await import(packageName);
        Parser = module.default || module;
      }

      const parser = new TreeSitter();
      parser.setLanguage(Parser);
      this.parsers.set(language, parser);
    } catch (error) {
      console.warn(`Failed to load ${language} parser:`, error);
    }
  }

  /**
   * Analyze code file with tree-sitter intelligence
   */
  public async analyzeFile(filePath: string, content?: string): Promise<CodeAnalysisResult> {
    const fileContent = content || readFileSync(filePath, 'utf-8');
    const language = this.detectLanguage(filePath);

    if (!this.initialized || !this.parsers.has(language)) {
      return this.fallbackAnalysis(filePath, fileContent, language);
    }

    try {
      const parser = this.parsers.get(language)!;
      const tree = parser.parse(fileContent);

      return await this.performIntelligentAnalysis(tree, fileContent, language, filePath);
    } catch (error) {
      console.warn(`Tree-sitter analysis failed for ${filePath}, falling back to regex:`, error);
      return this.fallbackAnalysis(filePath, fileContent, language);
    }
  }

  /**
   * Detect programming language from file extension and content
   */
  private detectLanguage(filePath: string): string {
    const ext = extname(filePath).toLowerCase();
    const filename = basename(filePath).toLowerCase();

    // DevOps file detection
    if (filename === 'dockerfile' || filename.startsWith('dockerfile.')) return 'dockerfile';
    if (filename.endsWith('.tf') || filename.endsWith('.tfvars')) return 'hcl';
    if (filename.includes('docker-compose') && (ext === '.yml' || ext === '.yaml')) return 'yaml';
    if (filename.includes('ansible') || filename.includes('playbook')) return 'yaml';
    if (filename.includes('k8s') || filename.includes('kubernetes')) return 'yaml';

    // Standard language detection
    switch (ext) {
      case '.ts':
      case '.tsx':
        return 'typescript';
      case '.js':
      case '.jsx':
      case '.mjs':
        return 'javascript';
      case '.py':
      case '.pyi':
        return 'python';
      case '.yml':
      case '.yaml':
        return 'yaml';
      case '.json':
        return 'json';
      case '.sh':
      case '.bash':
        return 'bash';
      case '.tf':
      case '.tfvars':
        return 'hcl';
      default:
        return 'text';
    }
  }

  /**
   * Perform intelligent analysis using tree-sitter AST
   */
  private async performIntelligentAnalysis(
    tree: TreeSitterTree,
    content: string,
    language: string,
    filePath: string
  ): Promise<CodeAnalysisResult> {
    const lines = content.split('\n');
    const result: CodeAnalysisResult = {
      language,
      hasSecrets: false,
      secrets: [],
      imports: [],
      functions: [],
      variables: [],
      infraStructure: [],
      securityIssues: [],
      architecturalViolations: [],
    };

    // Language-specific analysis
    switch (language) {
      case 'python':
        await this.analyzePython(tree.rootNode, lines, result);
        break;
      case 'typescript':
      case 'javascript':
        await this.analyzeJavaScript(tree.rootNode, lines, result);
        break;
      case 'yaml':
        await this.analyzeYAML(tree.rootNode, lines, result, filePath);
        break;
      case 'hcl':
        await this.analyzeTerraform(tree.rootNode, lines, result);
        break;
      case 'dockerfile':
        await this.analyzeDockerfile(tree.rootNode, lines, result);
        break;
      case 'bash':
        await this.analyzeBash(tree.rootNode, lines, result);
        break;
      case 'json':
        await this.analyzeJSON(tree.rootNode, lines, result);
        break;
    }

    // Universal security analysis
    await this.analyzeSecrets(tree.rootNode, lines, result);

    result.hasSecrets = result.secrets.length > 0;
    return result;
  }

  /**
   * Python-specific analysis for microservices
   */
  private async analyzePython(
    node: TreeSitterNode,
    _lines: string[],
    result: CodeAnalysisResult
  ): Promise<void> {
    // Find imports
    const imports = node
      .descendantsOfType('import_statement')
      .concat(node.descendantsOfType('import_from_statement'));

    for (const importNode of imports) {
      const importText = importNode.text;
      const location = {
        line: importNode.startPosition.row + 1,
        column: importNode.startPosition.column,
      };

      // Check for dangerous imports
      const isDangerous = this.checkDangerousImport(importText, 'python');

      result.imports.push({
        module: importText,
        type: 'import',
        location,
        isExternal: !importText.includes('.'),
        isDangerous,
        ...(isDangerous && { reason: 'Potentially dangerous module' }),
      });
    }

    // Find functions
    const functions = node.descendantsOfType('function_definition');
    for (const funcNode of functions) {
      const nameNode = funcNode.childForFieldName('name');
      if (nameNode) {
        result.functions.push({
          name: nameNode.text,
          type: 'function',
          parameters: this.extractPythonParameters(funcNode),
          location: { line: funcNode.startPosition.row + 1, column: funcNode.startPosition.column },
          complexity: this.calculateComplexity(funcNode),
          securitySensitive: this.isSecuritySensitive(nameNode.text),
        });
      }
    }

    // Find variable assignments with potential secrets
    const assignments = node.descendantsOfType('assignment');
    for (const assignment of assignments) {
      const leftNode = assignment.children[0];
      const rightNode = assignment.children[2];

      if (leftNode && rightNode) {
        const varName = leftNode.text;
        const varValue = rightNode.text;

        result.variables.push({
          name: varName,
          type: 'var',
          value: varValue,
          location: {
            line: assignment.startPosition.row + 1,
            column: assignment.startPosition.column,
          },
          isSensitive: this.isSensitiveVariable(varName, varValue),
          scope: 'module',
        });
      }
    }
  }

  /**
   * JavaScript/TypeScript analysis for Node.js applications
   */
  private async analyzeJavaScript(
    node: TreeSitterNode,
    _lines: string[],
    result: CodeAnalysisResult
  ): Promise<void> {
    // Find imports and requires
    const imports = node
      .descendantsOfType('import_statement')
      .concat(node.descendantsOfType('call_expression'));

    for (const importNode of imports) {
      if (importNode.type === 'call_expression') {
        const funcName = importNode.children[0]?.text;
        if (funcName === 'require' && importNode.children[1]) {
          const moduleNode = importNode.children[1].children[1]; // Get string content
          if (moduleNode) {
            result.imports.push({
              module: moduleNode.text.replace(/['"]/g, ''),
              type: 'require',
              location: {
                line: importNode.startPosition.row + 1,
                column: importNode.startPosition.column,
              },
              isExternal: !moduleNode.text.includes('./'),
              isDangerous: this.checkDangerousImport(moduleNode.text, 'javascript'),
            });
          }
        }
      } else {
        // ES6 import
        const moduleNode = importNode.childForFieldName('source');
        if (moduleNode) {
          result.imports.push({
            module: moduleNode.text.replace(/['"]/g, ''),
            type: 'import',
            location: {
              line: importNode.startPosition.row + 1,
              column: importNode.startPosition.column,
            },
            isExternal: !moduleNode.text.includes('./'),
            isDangerous: this.checkDangerousImport(moduleNode.text, 'javascript'),
          });
        }
      }
    }

    // Find functions and methods
    const functions = node
      .descendantsOfType('function_declaration')
      .concat(
        node.descendantsOfType('method_definition'),
        node.descendantsOfType('arrow_function')
      );

    for (const funcNode of functions) {
      const nameNode = funcNode.childForFieldName('name');
      const name = nameNode?.text || 'anonymous';

      result.functions.push({
        name,
        type: funcNode.type === 'method_definition' ? 'method' : 'function',
        parameters: this.extractJSParameters(funcNode),
        location: { line: funcNode.startPosition.row + 1, column: funcNode.startPosition.column },
        complexity: this.calculateComplexity(funcNode),
        securitySensitive: this.isSecuritySensitive(name),
      });
    }
  }

  /**
   * YAML analysis for Ansible, Kubernetes, Docker Compose
   */
  private async analyzeYAML(
    node: TreeSitterNode,
    _lines: string[],
    result: CodeAnalysisResult,
    filePath: string
  ): Promise<void> {
    // Detect YAML type based on content and filename
    const content = _lines.join('\n');
    const filename = basename(filePath).toLowerCase();

    if (this.isAnsibleFile(filename, content)) {
      await this.analyzeAnsibleYAML(node, _lines, result);
    } else if (this.isKubernetesFile(filename, content)) {
      await this.analyzeKubernetesYAML(node, _lines, result);
    } else if (this.isDockerComposeFile(filename, content)) {
      await this.analyzeDockerComposeYAML(node, _lines, result);
    }
  }

  /**
   * Terraform/HCL analysis for infrastructure
   */
  private async analyzeTerraform(
    node: TreeSitterNode,
    _lines: string[],
    result: CodeAnalysisResult
  ): Promise<void> {
    // Find resource blocks
    const resources = node.descendantsOfType('block');

    for (const resource of resources) {
      const labels = resource.children.filter(child => child.type === 'identifier');
      if (labels.length >= 2) {
        const resourceType = labels[0]?.text || 'unknown';
        const resourceName = labels[1]?.text || 'unnamed';

        // Determine provider
        let provider: 'docker' | 'kubernetes' | 'aws' | 'gcp' | 'azure' | 'openshift' = 'aws';
        if (resourceType.startsWith('google_')) provider = 'gcp';
        else if (resourceType.startsWith('azurerm_')) provider = 'azure';
        else if (resourceType.startsWith('kubernetes_')) provider = 'kubernetes';

        const securityRisks = this.analyzeTerraformSecurity(resource);

        result.infraStructure.push({
          resourceType,
          name: resourceName,
          provider,
          configuration: {},
          securityRisks,
          location: { line: resource.startPosition.row + 1, column: resource.startPosition.column },
        });
      }
    }
  }

  /**
   * Dockerfile analysis for container security
   */
  private async analyzeDockerfile(
    _node: TreeSitterNode,
    lines: string[],
    result: CodeAnalysisResult
  ): Promise<void> {
    // Analyze each instruction
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('USER ')) {
        const user = trimmed.substring(5).trim();
        if (user === 'root') {
          result.securityIssues.push({
            type: 'privilege_escalation',
            severity: 'high',
            message: 'Running as root user in container',
            location: { line: lines.indexOf(line) + 1, column: 0 },
            suggestion: 'Create and use a non-root user',
          });
        }
      }
    }
  }

  /**
   * Bash script analysis
   */
  private async analyzeBash(
    node: TreeSitterNode,
    _lines: string[],
    result: CodeAnalysisResult
  ): Promise<void> {
    // Find variable assignments and command substitutions
    const assignments = node.descendantsOfType('variable_assignment');

    for (const assignment of assignments) {
      const nameNode = assignment.childForFieldName('name');
      const valueNode = assignment.childForFieldName('value');

      if (nameNode && valueNode) {
        result.variables.push({
          name: nameNode.text,
          type: 'var',
          value: valueNode.text,
          location: {
            line: assignment.startPosition.row + 1,
            column: assignment.startPosition.column,
          },
          isSensitive: this.isSensitiveVariable(nameNode.text, valueNode.text),
          scope: 'script',
        });
      }
    }
  }

  /**
   * JSON analysis for configuration files
   */
  private async analyzeJSON(
    node: TreeSitterNode,
    _lines: string[],
    result: CodeAnalysisResult
  ): Promise<void> {
    // Analyze JSON objects for secrets
    const pairs = node.descendantsOfType('pair');

    for (const pair of pairs) {
      const keyNode = pair.children[0];
      const valueNode = pair.children[2];

      if (keyNode && valueNode && valueNode.type === 'string') {
        const key = keyNode.text.replace(/['"]/g, '');
        const value = valueNode.text.replace(/['"]/g, '');

        if (this.isSensitiveVariable(key, value)) {
          result.secrets.push({
            type: this.classifySecret(key, value),
            value: value,
            location: { line: pair.startPosition.row + 1, column: pair.startPosition.column },
            confidence: 0.8,
            context: `JSON key: ${key}`,
          });
        }
      }
    }
  }

  /**
   * Universal secret detection across all languages
   */
  private async analyzeSecrets(
    node: TreeSitterNode,
    _lines: string[],
    result: CodeAnalysisResult
  ): Promise<void> {
    // Find all string literals and analyze them
    const strings = node
      .descendantsOfType('string')
      .concat(node.descendantsOfType('string_literal'));

    for (const stringNode of strings) {
      const text = stringNode.text.replace(/['"]/g, '');
      const secretType = this.detectSecretPattern(text);

      if (secretType) {
        result.secrets.push({
          type: secretType,
          value: text,
          location: {
            line: stringNode.startPosition.row + 1,
            column: stringNode.startPosition.column,
          },
          confidence: 0.7,
          context: 'String literal',
        });
      }
    }
  }

  /**
   * Fallback analysis using regex when tree-sitter fails
   */
  private fallbackAnalysis(
    _filePath: string,
    content: string,
    language: string
  ): CodeAnalysisResult {
    const lines = content.split('\n');
    const result: CodeAnalysisResult = {
      language,
      hasSecrets: false,
      secrets: [],
      imports: [],
      functions: [],
      variables: [],
      infraStructure: [],
      securityIssues: [],
      architecturalViolations: [],
    };

    // Basic regex-based secret detection
    const secretPatterns = [
      { pattern: /(?:api[_-]?key|apikey)[:=]\s*['""]([^'""]+)['""]?/i, type: 'api_key' as const },
      { pattern: /(?:password|pwd|pass)[:=]\s*['""]([^'""]+)['""]?/i, type: 'password' as const },
      { pattern: /(?:token|auth)[:=]\s*['""]([^'""]+)['""]?/i, type: 'token' as const },
      {
        pattern: /(?:secret|private[_-]?key)[:=]\s*['""]([^'""]+)['""]?/i,
        type: 'private_key' as const,
      },
    ];

    lines.forEach((line, index) => {
      secretPatterns.forEach(({ pattern, type }) => {
        const match = line.match(pattern);
        if (match && match[1] && match[1].length > 8) {
          result.secrets.push({
            type,
            value: match[1],
            location: { line: index + 1, column: match.index || 0 },
            confidence: 0.6,
            context: line.trim(),
          });
        }
      });
    });

    result.hasSecrets = result.secrets.length > 0;
    return result;
  }

  // Helper methods
  private checkDangerousImport(importText: string, language: string): boolean {
    const dangerousModules = {
      python: ['eval', 'exec', 'subprocess', 'os.system'],
      javascript: ['eval', 'child_process', 'vm'],
    };

    const dangerous = dangerousModules[language as keyof typeof dangerousModules] || [];
    return dangerous.some(module => importText.includes(module));
  }

  private extractPythonParameters(funcNode: TreeSitterNode): string[] {
    const paramsNode = funcNode.childForFieldName('parameters');
    if (!paramsNode) return [];

    return paramsNode.namedChildren
      .filter(child => child.type === 'identifier')
      .map(child => child.text);
  }

  private extractJSParameters(funcNode: TreeSitterNode): string[] {
    const paramsNode = funcNode.childForFieldName('parameters');
    if (!paramsNode) return [];

    return paramsNode.namedChildren
      .filter(child => child.type === 'identifier')
      .map(child => child.text);
  }

  private calculateComplexity(node: TreeSitterNode): number {
    // Simple cyclomatic complexity calculation
    const complexityNodes = ['if_statement', 'while_statement', 'for_statement', 'try_statement'];
    let complexity = 1;

    const walk = (n: TreeSitterNode) => {
      if (complexityNodes.includes(n.type)) {
        complexity++;
      }
      n.children.forEach(child => walk(child));
    };

    walk(node);
    return complexity;
  }

  private isSecuritySensitive(name: string): boolean {
    const sensitiveNames = [
      'auth',
      'login',
      'password',
      'token',
      'key',
      'secret',
      'decrypt',
      'hash',
    ];
    return sensitiveNames.some(sensitive => name.toLowerCase().includes(sensitive));
  }

  private isSensitiveVariable(name: string, value: string): boolean {
    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'auth', 'private', 'credential'];
    const nameCheck = sensitiveKeys.some(key => name.toLowerCase().includes(key));
    const valueCheck = Boolean(value && value.length > 16 && /^[A-Za-z0-9+/=]+$/.test(value));

    return nameCheck || valueCheck;
  }

  private classifySecret(key: string, _value: string): SecretMatch['type'] {
    if (key.toLowerCase().includes('password')) return 'password';
    if (key.toLowerCase().includes('token')) return 'token';
    if (key.toLowerCase().includes('key')) return 'api_key';
    if (key.toLowerCase().includes('private')) return 'private_key';
    return 'credential';
  }

  private detectSecretPattern(text: string): SecretMatch['type'] | null {
    // AWS Access Key
    if (/^AKIA[0-9A-Z]{16}$/.test(text)) return 'api_key';

    // Generic API key patterns
    if (/^[A-Za-z0-9]{32,}$/.test(text) && text.length >= 32) return 'api_key';

    // JWT Token
    if (/^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/]*$/.test(text)) return 'token';

    return null;
  }

  private isAnsibleFile(filename: string, content: string): boolean {
    return (
      filename.includes('playbook') ||
      filename.includes('ansible') ||
      content.includes('hosts:') ||
      content.includes('tasks:') ||
      content.includes('roles:')
    );
  }

  private isKubernetesFile(filename: string, content: string): boolean {
    return (
      filename.includes('k8s') ||
      filename.includes('kubernetes') ||
      content.includes('apiVersion:') ||
      content.includes('kind:')
    );
  }

  private isDockerComposeFile(filename: string, content: string): boolean {
    return (
      filename.includes('docker-compose') ||
      (content.includes('version:') && content.includes('services:'))
    );
  }

  private async analyzeAnsibleYAML(
    _node: TreeSitterNode,
    _lines: string[],
    _result: CodeAnalysisResult
  ): Promise<void> {
    // Ansible-specific analysis would go here
    // For now, basic implementation
  }

  private async analyzeKubernetesYAML(
    _node: TreeSitterNode,
    _lines: string[],
    _result: CodeAnalysisResult
  ): Promise<void> {
    // Kubernetes-specific analysis would go here
  }

  private async analyzeDockerComposeYAML(
    _node: TreeSitterNode,
    _lines: string[],
    _result: CodeAnalysisResult
  ): Promise<void> {
    // Docker Compose-specific analysis would go here
  }

  private analyzeTerraformSecurity(resource: TreeSitterNode): string[] {
    const risks: string[] = [];

    // Check for common security issues in Terraform
    const resourceText = resource.text.toLowerCase();

    if (resourceText.includes('0.0.0.0/0')) {
      risks.push('Open to all IP addresses');
    }

    if (resourceText.includes('port = 22') && resourceText.includes('0.0.0.0/0')) {
      risks.push('SSH port open to internet');
    }

    return risks;
  }
}

// Factory function for easy usage
export function createTreeSitterAnalyzer(): TreeSitterAnalyzer {
  return new TreeSitterAnalyzer();
}

// Export default analyzer instance
export const analyzer = new TreeSitterAnalyzer();
