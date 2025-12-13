/**
 * Tree-sitter Integration for Enterprise DevOps Code Analysis
 *
 * Provides intelligent code analysis for multi-language DevOps stacks including:
 * - TypeScript/JavaScript applications
 * - Python microservices
 * - Java/Quarkus applications
 * - Go cloud-native services
 * - Rust system components
 * - C/C++ native code
 * - Ruby scripts and Rails apps
 * - Ansible playbooks and roles
 * - Kubernetes/Docker configurations
 * - CI/CD pipelines
 *
 * Enterprise Features:
 * - Secret detection in code
 * - Architectural boundary validation
 * - Multi-language dependency analysis
 * - Security pattern recognition
 *
 * Note: Uses tree-sitter 0.21.x for maximum language compatibility.
 * See ADR-017 for version strategy details.
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
    // Skip tree-sitter initialization in test environment
    if (process.env['NODE_ENV'] === 'test' || process.env['JEST_WORKER_ID'] !== undefined) {
      this.initialized = false;
      return;
    }

    try {
      // Initialize core parsers for enterprise stack (tree-sitter 0.21.x compatible)
      // See ADR-017 for version strategy details
      await this.loadParser('typescript', 'tree-sitter-typescript');
      await this.loadParser('javascript', 'tree-sitter-javascript');
      await this.loadParser('python', 'tree-sitter-python');
      await this.loadParser('java', 'tree-sitter-java');
      await this.loadParser('go', 'tree-sitter-go');
      await this.loadParser('rust', 'tree-sitter-rust');
      await this.loadParser('c', 'tree-sitter-c');
      await this.loadParser('cpp', 'tree-sitter-cpp');
      await this.loadParser('ruby', 'tree-sitter-ruby');
      await this.loadParser('yaml', 'tree-sitter-yaml');
      await this.loadParser('json', 'tree-sitter-json');
      await this.loadParser('bash', 'tree-sitter-bash');
      await this.loadParser('css', 'tree-sitter-css');

      this.initialized = true;
    } catch (error) {
      console.warn('Tree-sitter initialization failed, falling back to regex analysis:', error);
      this.initialized = false;
    }
  }

  private async loadParser(language: string, packageName: string): Promise<void> {
    // Skip loading parsers in test environment
    if (process.env['NODE_ENV'] === 'test' || process.env['JEST_WORKER_ID'] !== undefined) {
      return;
    }

    try {
      const TreeSitterModule = await import('tree-sitter');
      const TreeSitter = (TreeSitterModule as any).default || TreeSitterModule;

      let Parser: any;
      if (language === 'typescript') {
        // TypeScript parser exports { typescript, tsx } objects
        const tsModule = await import('tree-sitter-typescript');
        Parser = (tsModule as any).typescript || (tsModule as any).default?.typescript;
      } else {
        const module = await import(packageName);
        Parser = (module as any).default || module;
      }

      const parser = new TreeSitter();
      parser.setLanguage(Parser);
      this.parsers.set(language, parser);
    } catch (error) {
      // Silently skip parser loading errors in test environment
      if (process.env['NODE_ENV'] !== 'test' && process.env['JEST_WORKER_ID'] === undefined) {
        console.warn(`Failed to load ${language} parser:`, error);
      }
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
      case '.java':
        return 'java';
      case '.go':
        return 'go';
      case '.rs':
        return 'rust';
      case '.c':
      case '.h':
        return 'c';
      case '.cpp':
      case '.cc':
      case '.cxx':
      case '.hpp':
      case '.hxx':
        return 'cpp';
      case '.rb':
      case '.rake':
      case '.gemspec':
        return 'ruby';
      case '.css':
        return 'css';
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
        // HCL support removed in 0.21.x downgrade - see ADR-017
        // Falls back to text-based analysis
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
      case 'java':
        await this.analyzeJava(tree.rootNode, lines, result);
        break;
      case 'go':
        await this.analyzeGo(tree.rootNode, lines, result);
        break;
      case 'rust':
        await this.analyzeRust(tree.rootNode, lines, result);
        break;
      case 'c':
      case 'cpp':
        await this.analyzeCCpp(tree.rootNode, lines, result);
        break;
      case 'ruby':
        await this.analyzeRuby(tree.rootNode, lines, result);
        break;
      case 'css':
        await this.analyzeCSS(tree.rootNode, lines, result);
        break;
      case 'yaml':
        await this.analyzeYAML(tree.rootNode, lines, result, filePath);
        break;
      case 'hcl':
        // HCL parser removed in 0.21.x - use fallback regex analysis
        // See ADR-017 for details
        return this.fallbackAnalysis(filePath, content, language);
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
   * Note: HCL parser removed in 0.21.x downgrade - see ADR-017
   * Kept for potential future use when tree-sitter-hcl becomes 0.21.x compatible
   */
  // @ts-expect-error Intentionally unused - kept for future HCL support
  private async _analyzeTerraform(
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
   * Java analysis for enterprise applications (Quarkus, Spring)
   */
  private async analyzeJava(
    node: TreeSitterNode,
    _lines: string[],
    result: CodeAnalysisResult
  ): Promise<void> {
    // Find imports
    const imports = node.descendantsOfType('import_declaration');
    for (const importNode of imports) {
      const moduleNode = importNode.childForFieldName('name');
      if (moduleNode) {
        result.imports.push({
          module: moduleNode.text,
          type: 'import',
          location: {
            line: importNode.startPosition.row + 1,
            column: importNode.startPosition.column,
          },
          isExternal: true,
          isDangerous: this.checkDangerousImport(moduleNode.text, 'java'),
        });
      }
    }

    // Find method declarations
    const methods = node.descendantsOfType('method_declaration');
    for (const methodNode of methods) {
      const nameNode = methodNode.childForFieldName('name');
      if (nameNode) {
        result.functions.push({
          name: nameNode.text,
          type: 'method',
          parameters: this.extractJavaParameters(methodNode),
          location: {
            line: methodNode.startPosition.row + 1,
            column: methodNode.startPosition.column,
          },
          complexity: this.calculateComplexity(methodNode),
          securitySensitive: this.isSecuritySensitive(nameNode.text),
        });
      }
    }

    // Find field declarations (potential secrets)
    const fields = node.descendantsOfType('field_declaration');
    for (const field of fields) {
      const declarator = field.descendantsOfType('variable_declarator')[0];
      if (declarator) {
        const nameNode = declarator.childForFieldName('name');
        const valueNode = declarator.childForFieldName('value');
        if (nameNode) {
          const varValue = valueNode?.text || '';
          result.variables.push({
            name: nameNode.text,
            type: 'var',
            ...(varValue && { value: varValue }),
            location: {
              line: field.startPosition.row + 1,
              column: field.startPosition.column,
            },
            isSensitive: this.isSensitiveVariable(nameNode.text, varValue),
            scope: 'class',
          });
        }
      }
    }
  }

  private extractJavaParameters(methodNode: TreeSitterNode): string[] {
    const paramsNode = methodNode.childForFieldName('parameters');
    if (!paramsNode) return [];
    return paramsNode.namedChildren
      .filter(child => child.type === 'formal_parameter')
      .map(child => {
        const nameNode = child.childForFieldName('name');
        return nameNode?.text || '';
      })
      .filter(name => name !== '');
  }

  /**
   * Go analysis for cloud-native services
   */
  private async analyzeGo(
    node: TreeSitterNode,
    _lines: string[],
    result: CodeAnalysisResult
  ): Promise<void> {
    // Find imports
    const importDecls = node.descendantsOfType('import_declaration');
    for (const importDecl of importDecls) {
      const specs = importDecl.descendantsOfType('import_spec');
      for (const spec of specs) {
        const pathNode = spec.childForFieldName('path');
        if (pathNode) {
          const module = pathNode.text.replace(/"/g, '');
          result.imports.push({
            module,
            type: 'import',
            location: {
              line: spec.startPosition.row + 1,
              column: spec.startPosition.column,
            },
            isExternal: !module.startsWith('./') && !module.startsWith('../'),
            isDangerous: this.checkDangerousImport(module, 'go'),
          });
        }
      }
    }

    // Find function declarations
    const functions = node.descendantsOfType('function_declaration');
    for (const funcNode of functions) {
      const nameNode = funcNode.childForFieldName('name');
      if (nameNode) {
        result.functions.push({
          name: nameNode.text,
          type: 'function',
          parameters: this.extractGoParameters(funcNode),
          location: {
            line: funcNode.startPosition.row + 1,
            column: funcNode.startPosition.column,
          },
          complexity: this.calculateComplexity(funcNode),
          securitySensitive: this.isSecuritySensitive(nameNode.text),
        });
      }
    }

    // Find variable declarations
    const varDecls = node.descendantsOfType('var_declaration');
    for (const varDecl of varDecls) {
      const specs = varDecl.descendantsOfType('var_spec');
      for (const spec of specs) {
        const nameNode = spec.childForFieldName('name');
        const valueNode = spec.childForFieldName('value');
        if (nameNode) {
          const varValue = valueNode?.text || '';
          result.variables.push({
            name: nameNode.text,
            type: 'var',
            ...(varValue && { value: varValue }),
            location: {
              line: spec.startPosition.row + 1,
              column: spec.startPosition.column,
            },
            isSensitive: this.isSensitiveVariable(nameNode.text, varValue),
            scope: 'package',
          });
        }
      }
    }
  }

  private extractGoParameters(funcNode: TreeSitterNode): string[] {
    const paramsNode = funcNode.childForFieldName('parameters');
    if (!paramsNode) return [];
    return paramsNode.namedChildren
      .filter(child => child.type === 'parameter_declaration')
      .map(child => {
        const nameNode = child.childForFieldName('name');
        return nameNode?.text || '';
      })
      .filter(name => name !== '');
  }

  /**
   * Rust analysis for system components
   */
  private async analyzeRust(
    node: TreeSitterNode,
    _lines: string[],
    result: CodeAnalysisResult
  ): Promise<void> {
    // Find use declarations (imports)
    const useDecls = node.descendantsOfType('use_declaration');
    for (const useDecl of useDecls) {
      result.imports.push({
        module: useDecl.text.replace(/^use\s+/, '').replace(/;$/, ''),
        type: 'import',
        location: {
          line: useDecl.startPosition.row + 1,
          column: useDecl.startPosition.column,
        },
        isExternal: !useDecl.text.includes('crate::'),
        isDangerous: this.checkDangerousImport(useDecl.text, 'rust'),
      });
    }

    // Find function declarations
    const functions = node.descendantsOfType('function_item');
    for (const funcNode of functions) {
      const nameNode = funcNode.childForFieldName('name');
      if (nameNode) {
        result.functions.push({
          name: nameNode.text,
          type: 'function',
          parameters: this.extractRustParameters(funcNode),
          location: {
            line: funcNode.startPosition.row + 1,
            column: funcNode.startPosition.column,
          },
          complexity: this.calculateComplexity(funcNode),
          securitySensitive:
            this.isSecuritySensitive(nameNode.text) || funcNode.text.includes('unsafe'),
        });
      }
    }

    // Check for unsafe blocks
    const unsafeBlocks = node.descendantsOfType('unsafe_block');
    for (const block of unsafeBlocks) {
      result.securityIssues.push({
        type: 'dangerous_function',
        severity: 'medium',
        message: 'Unsafe block detected',
        location: {
          line: block.startPosition.row + 1,
          column: block.startPosition.column,
        },
        suggestion: 'Review unsafe code for memory safety issues',
      });
    }
  }

  private extractRustParameters(funcNode: TreeSitterNode): string[] {
    const paramsNode = funcNode.childForFieldName('parameters');
    if (!paramsNode) return [];
    return paramsNode.namedChildren
      .filter(child => child.type === 'parameter')
      .map(child => {
        const patternNode = child.childForFieldName('pattern');
        return patternNode?.text || '';
      })
      .filter(name => name !== '');
  }

  /**
   * C/C++ analysis for native code
   */
  private async analyzeCCpp(
    node: TreeSitterNode,
    _lines: string[],
    result: CodeAnalysisResult
  ): Promise<void> {
    // Find includes
    const includes = node.descendantsOfType('preproc_include');
    for (const includeNode of includes) {
      const pathNode =
        includeNode.descendantsOfType('string_literal')[0] ||
        includeNode.descendantsOfType('system_lib_string')[0];
      if (pathNode) {
        result.imports.push({
          module: pathNode.text.replace(/[<>"]/g, ''),
          type: 'include',
          location: {
            line: includeNode.startPosition.row + 1,
            column: includeNode.startPosition.column,
          },
          isExternal: pathNode.type === 'system_lib_string',
          isDangerous: this.checkDangerousImport(pathNode.text, 'c'),
        });
      }
    }

    // Find function definitions
    const functions = node.descendantsOfType('function_definition');
    for (const funcNode of functions) {
      const declaratorNode = funcNode.childForFieldName('declarator');
      if (declaratorNode) {
        const nameNode = declaratorNode.childForFieldName('declarator');
        const name = nameNode?.text || declaratorNode.text.split('(')[0] || 'unknown';
        result.functions.push({
          name,
          type: 'function',
          parameters: [],
          location: {
            line: funcNode.startPosition.row + 1,
            column: funcNode.startPosition.column,
          },
          complexity: this.calculateComplexity(funcNode),
          securitySensitive: this.isSecuritySensitive(name),
        });
      }
    }

    // Check for dangerous functions
    const dangerousFunctions = ['strcpy', 'strcat', 'sprintf', 'gets', 'scanf'];
    const calls = node.descendantsOfType('call_expression');
    for (const call of calls) {
      const funcName = call.children[0]?.text;
      if (funcName && dangerousFunctions.includes(funcName)) {
        result.securityIssues.push({
          type: 'dangerous_function',
          severity: 'high',
          message: `Dangerous function ${funcName} detected`,
          location: {
            line: call.startPosition.row + 1,
            column: call.startPosition.column,
          },
          suggestion: `Use safe alternatives (${funcName}_s or snprintf)`,
        });
      }
    }
  }

  /**
   * Ruby analysis for scripts and Rails apps
   */
  private async analyzeRuby(
    node: TreeSitterNode,
    _lines: string[],
    result: CodeAnalysisResult
  ): Promise<void> {
    // Find requires
    const calls = node.descendantsOfType('call');
    for (const call of calls) {
      const methodNode = call.childForFieldName('method');
      if (methodNode && (methodNode.text === 'require' || methodNode.text === 'require_relative')) {
        const argsNode = call.childForFieldName('arguments');
        const argNode = argsNode?.namedChildren[0];
        if (argNode) {
          result.imports.push({
            module: argNode.text.replace(/['"]/g, ''),
            type: methodNode.text === 'require' ? 'require' : 'require',
            location: {
              line: call.startPosition.row + 1,
              column: call.startPosition.column,
            },
            isExternal: methodNode.text === 'require',
            isDangerous: this.checkDangerousImport(argNode.text, 'ruby'),
          });
        }
      }
    }

    // Find method definitions
    const methods = node.descendantsOfType('method');
    for (const methodNode of methods) {
      const nameNode = methodNode.childForFieldName('name');
      if (nameNode) {
        result.functions.push({
          name: nameNode.text,
          type: 'method',
          parameters: this.extractRubyParameters(methodNode),
          location: {
            line: methodNode.startPosition.row + 1,
            column: methodNode.startPosition.column,
          },
          complexity: this.calculateComplexity(methodNode),
          securitySensitive: this.isSecuritySensitive(nameNode.text),
        });
      }
    }

    // Find assignments (potential secrets)
    const assignments = node.descendantsOfType('assignment');
    for (const assignment of assignments) {
      const leftNode = assignment.children[0];
      const rightNode = assignment.children[2];
      if (leftNode && rightNode) {
        result.variables.push({
          name: leftNode.text,
          type: 'var',
          value: rightNode.text,
          location: {
            line: assignment.startPosition.row + 1,
            column: assignment.startPosition.column,
          },
          isSensitive: this.isSensitiveVariable(leftNode.text, rightNode.text),
          scope: 'local',
        });
      }
    }
  }

  private extractRubyParameters(methodNode: TreeSitterNode): string[] {
    const paramsNode = methodNode.childForFieldName('parameters');
    if (!paramsNode) return [];
    return paramsNode.namedChildren
      .filter(
        child =>
          child.type === 'identifier' ||
          child.type === 'optional_parameter' ||
          child.type === 'keyword_parameter'
      )
      .map(child => child.text)
      .filter(name => name !== '');
  }

  /**
   * CSS analysis for stylesheet security
   */
  private async analyzeCSS(
    node: TreeSitterNode,
    _lines: string[],
    result: CodeAnalysisResult
  ): Promise<void> {
    // Find @import rules
    const imports = node.descendantsOfType('import_statement');
    for (const importNode of imports) {
      const urlNode = importNode.descendantsOfType('call_expression')[0];
      const stringNode = importNode.descendantsOfType('string_value')[0];
      const target = urlNode?.text || stringNode?.text || '';
      if (target) {
        result.imports.push({
          module: target.replace(/['"url()]/g, ''),
          type: 'import',
          location: {
            line: importNode.startPosition.row + 1,
            column: importNode.startPosition.column,
          },
          isExternal: target.includes('http') || target.includes('//'),
          isDangerous: target.includes('http:') && !target.includes('https:'),
        });
      }
    }

    // Check for potentially dangerous CSS
    const declarations = node.descendantsOfType('declaration');
    for (const decl of declarations) {
      const propNode = decl.childForFieldName('property');
      const valueNode = decl.childForFieldName('value');
      if (propNode && valueNode) {
        const propName = propNode.text;
        const propValue = valueNode.text;

        // Check for dangerous expressions
        if (propValue.includes('expression(') || propValue.includes('javascript:')) {
          result.securityIssues.push({
            type: 'insecure_config',
            severity: 'high',
            message: 'Potentially dangerous CSS expression detected',
            location: {
              line: decl.startPosition.row + 1,
              column: decl.startPosition.column,
            },
            suggestion: 'Remove JavaScript expressions from CSS',
          });
        }

        // Check for external URLs without HTTPS
        if (
          propValue.includes('url(') &&
          propValue.includes('http:') &&
          !propValue.includes('https:')
        ) {
          result.securityIssues.push({
            type: 'insecure_config',
            severity: 'medium',
            message: `CSS property ${propName} references non-HTTPS URL`,
            location: {
              line: decl.startPosition.row + 1,
              column: decl.startPosition.column,
            },
            suggestion: 'Use HTTPS for external resources',
          });
        }
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
      {
        pattern: /["']?(?:api[_-]?key|apikey)["']?\s*[:=\s]\s*["']([^"']+)["']/i,
        type: 'api_key' as const,
      },
      {
        pattern: /["']?(?:password|pwd|pass)["']?\s*[:=\s]\s*["']([^"']+)["']/i,
        type: 'password' as const,
      },
      { pattern: /["']?(?:token|auth)["']?\s*[:=\s]\s*["']([^"']+)["']/i, type: 'token' as const },
      {
        pattern: /["']?(?:secret|private[_-]?key)["']?\s*[:=\s]\s*["']([^"']+)["']/i,
        type: 'private_key' as const,
      },
      // AWS Access Key - specific pattern (environment variable style)
      {
        pattern:
          /AWS_ACCESS_KEY_ID\s*[:=]\s*["']?((?:AKIA|ASIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA)[A-Z0-9]{16})["']?/i,
        type: 'api_key' as const,
      },
      // AWS Access Key - generic pattern (any variable name with AWS key format)
      {
        pattern: /["']?((?:AKIA|ASIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA)[A-Z0-9]{16})["']?/,
        type: 'api_key' as const,
      },
      // AWS Secret Key - specific pattern (40 chars)
      {
        pattern: /AWS_SECRET_ACCESS_KEY\s*[:=]\s*["']?([A-Za-z0-9+/]{40})["']?/i,
        type: 'private_key' as const,
      },
      // Generic AWS secret assignment
      {
        pattern: /(?:aws_secret|secret_key)\s*[:=]\s*["']([A-Za-z0-9+/]{40})["']/i,
        type: 'private_key' as const,
      },
      // YAML/Dockerfile environment variables with hardcoded values
      {
        pattern: /(?:value|ENV\s+\w+)\s*[:=]?\s*["']([a-zA-Z0-9_-]{10,})["']/i,
        type: 'credential' as const,
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

      // Detect privilege escalation in Dockerfile
      if (language === 'dockerfile' && /USER\s+root/i.test(line)) {
        result.securityIssues.push({
          type: 'privilege_escalation',
          severity: 'high',
          location: { line: index + 1, column: 0 },
          message: 'Running as root user',
          suggestion: 'Use a non-root user',
        });
      }
    });

    result.hasSecrets = result.secrets.length > 0;
    return result;
  }

  // Helper methods
  private checkDangerousImport(importText: string, language: string): boolean {
    const dangerousModules: Record<string, string[]> = {
      python: ['eval', 'exec', 'subprocess', 'os.system', 'pickle', 'marshal'],
      javascript: ['eval', 'child_process', 'vm', 'unsafe-eval'],
      java: [
        'Runtime.exec',
        'ProcessBuilder',
        'ScriptEngine',
        'Reflection',
        'javax.script',
        'java.lang.invoke',
      ],
      go: ['os/exec', 'unsafe', 'syscall', 'reflect'],
      rust: ['std::process::Command', 'libc', 'std::ffi', 'std::mem::transmute'],
      c: ['system', 'exec', 'popen', 'dlopen'],
      ruby: ['eval', 'system', 'exec', 'backtick', 'Open3', 'Kernel.system'],
    };

    const dangerous = dangerousModules[language] || [];
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
    // AWS Access Key (various types)
    if (/^(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}$/.test(text)) {
      return 'api_key';
    }

    // AWS Secret Key (40 characters, base64-like) - using boundary detection
    if (/^[A-Za-z0-9+/]{40}$/.test(text)) {
      return 'private_key';
    }

    // AWS Session Token (longer, base64-like)
    if (/^[A-Za-z0-9+/=]{100,}$/.test(text)) {
      return 'token';
    }

    // JWT Token
    if (/^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/]*$/.test(text)) {
      return 'token';
    }

    // GitHub Personal Access Token
    if (/^ghp_[A-Za-z0-9]{36}$/.test(text)) {
      return 'token';
    }

    // Slack tokens
    if (/^xox[baprs]-[0-9]{12}-[0-9]{12}-[a-zA-Z0-9]{24}$/.test(text)) {
      return 'token';
    }

    // Generic API key patterns (32+ alphanumeric)
    if (/^[A-Za-z0-9]{32,64}$/.test(text) && text.length >= 32) {
      return 'api_key';
    }

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
    lines: string[],
    result: CodeAnalysisResult
  ): Promise<void> {
    const content = lines.join('\n');

    // Detect Ansible tasks and roles
    if (content.includes('tasks:')) {
      const taskMatches = content.match(/- name:\s*(.+)/g) || [];
      taskMatches.forEach(match => {
        const taskName = match.replace(/- name:\s*/, '').trim();
        result.functions.push({
          name: taskName,
          type: 'task',
          parameters: [],
          location: { line: this.findLineNumber(lines, match), column: 0 },
          complexity: 1,
          securitySensitive: this.isSecuritySensitiveTask(taskName),
        });
      });
    }

    // Detect role imports
    const roleMatches = content.match(/roles?:\s*\n([\s\S]*?)(?=\n\w|$)/g) || [];
    roleMatches.forEach(roleBlock => {
      const roles = roleBlock.match(/- ([\w.-]+)/g) || [];
      roles.forEach(role => {
        const roleName = role.replace(/- /, '');
        result.imports.push({
          module: roleName,
          type: 'role',
          location: { line: this.findLineNumber(lines, role), column: 0 },
          isExternal: !roleName.startsWith('./'),
          isDangerous: this.isDangerousAnsibleRole(roleName),
        });
      });
    });

    // Check for security-sensitive variables
    const varMatches =
      content.match(/\b\w*(?:password|secret|key|token)\w*:\s*["']?([^"'\n]+)["']?/gi) || [];
    varMatches.forEach(varMatch => {
      const [fullMatch, value] = varMatch.match(/([\w_]+):\s*["']?([^"'\n]+)["']?/) || [];
      if (fullMatch && value) {
        result.secrets.push({
          type: 'credential',
          value: value,
          location: { line: this.findLineNumber(lines, fullMatch), column: 0 },
          confidence: 0.7,
          context: 'Ansible variable',
        });
      }
    });
  }

  private async analyzeKubernetesYAML(
    _node: TreeSitterNode,
    lines: string[],
    result: CodeAnalysisResult
  ): Promise<void> {
    const content = lines.join('\n');

    // Extract Kubernetes resources
    const resourceMatches = content.match(/kind:\s*(\w+)/g) || [];
    const apiVersionMatches = content.match(/apiVersion:\s*([\w/]+)/g) || [];
    const nameMatches = content.match(/name:\s*([\w.-]+)/g) || [];

    if (resourceMatches.length > 0) {
      resourceMatches.forEach((kindMatch, index) => {
        const kind = kindMatch.replace(/kind:\s*/, '');
        const apiVersion = apiVersionMatches[index]?.replace(/apiVersion:\s*/, '') || 'v1';
        const name = nameMatches[index]?.replace(/name:\s*/, '') || 'unnamed';

        const securityRisks = this.analyzeKubernetesSecurityRisks(content, kind);

        result.infraStructure.push({
          resourceType: kind.toLowerCase(),
          name: name,
          provider: 'kubernetes',
          configuration: { apiVersion, kind },
          securityRisks,
          location: { line: this.findLineNumber(lines, kindMatch), column: 0 },
        });
      });
    }

    // Check for security contexts and privileged containers
    if (content.includes('privileged: true')) {
      result.securityIssues.push({
        type: 'privilege_escalation',
        severity: 'high',
        message: 'Container running in privileged mode',
        location: { line: this.findLineNumber(lines, 'privileged: true'), column: 0 },
        suggestion: 'Remove privileged: true and use specific capabilities instead',
      });
    }

    // Check for missing resource limits
    if (content.includes('containers:') && !content.includes('resources:')) {
      result.securityIssues.push({
        type: 'insecure_config',
        severity: 'medium',
        message: 'Container missing resource limits',
        location: { line: this.findLineNumber(lines, 'containers:'), column: 0 },
        suggestion: 'Add resource requests and limits to prevent resource exhaustion',
      });
    }

    // Detect secrets in environment variables
    const envMatches = content.match(/env:\s*\n([\s\S]*?)(?=\n\s*\w|$)/g) || [];
    envMatches.forEach(envBlock => {
      const secretRefs = envBlock.match(/valueFrom:\s*\n\s*secretKeyRef:/g) || [];
      if (secretRefs.length === 0 && envBlock.includes('value:')) {
        // Direct environment values might contain secrets
        const directValues =
          envBlock.match(
            /- name:\s*(\w*(?:PASSWORD|SECRET|KEY|TOKEN)\w*)\s*\n\s*value:\s*([^\n]+)/gi
          ) || [];
        directValues.forEach(match => {
          const [, envName, envValue] =
            match.match(/- name:\s*(\w+)\s*\n\s*value:\s*([^\n]+)/i) || [];
          if (envName && envValue) {
            result.secrets.push({
              type: 'credential',
              value: envValue,
              location: { line: this.findLineNumber(lines, match), column: 0 },
              confidence: 0.8,
              context: `Kubernetes env var: ${envName}`,
            });
          }
        });
      }
    });
  }

  private async analyzeDockerComposeYAML(
    _node: TreeSitterNode,
    lines: string[],
    result: CodeAnalysisResult
  ): Promise<void> {
    const content = lines.join('\n');

    // Extract services
    const serviceMatches = content.match(/^\s{2}(\w[\w.-]*):$/gm) || [];
    serviceMatches.forEach(serviceMatch => {
      const serviceName = serviceMatch.replace(/^\s{2}/, '').replace(/:$/, '');

      result.infraStructure.push({
        resourceType: 'docker_service',
        name: serviceName,
        provider: 'docker',
        configuration: {},
        securityRisks: this.analyzeDockerComposeSecurityRisks(content, serviceName),
        location: { line: this.findLineNumber(lines, serviceMatch), column: 0 },
      });
    });

    // Check for exposed ports
    const portMatches = content.match(/ports:\s*\n([\s\S]*?)(?=\n\s*\w|$)/g) || [];
    portMatches.forEach(portBlock => {
      if (portBlock.includes('"80:') || portBlock.includes('"443:')) {
        const webPorts = portBlock.match(/"(80|443):[^"]+"/g) || [];
        webPorts.forEach(port => {
          result.securityIssues.push({
            type: 'insecure_config',
            severity: 'medium',
            message: `Web port ${port} exposed without TLS configuration`,
            location: { line: this.findLineNumber(lines, port), column: 0 },
            suggestion: 'Ensure proper TLS termination and security headers',
          });
        });
      }
    });

    // Check for environment variables with secrets
    const envMatches = content.match(/environment:\s*\n([\s\S]*?)(?=\n\s*\w|$)/g) || [];
    envMatches.forEach(envBlock => {
      const secretVars =
        envBlock.match(
          /\s*-?\s*(\w*(?:PASSWORD|SECRET|KEY|TOKEN|API_KEY)\w*)\s*[:=]\s*([^\n]+)/gi
        ) || [];
      secretVars.forEach(secretVar => {
        const [, varName, varValue] = secretVar.match(/\s*-?\s*(\w+)\s*[:=]\s*([^\n]+)/i) || [];
        if (varName && varValue && !varValue.includes('${')) {
          result.secrets.push({
            type: 'credential',
            value: varValue,
            location: { line: this.findLineNumber(lines, secretVar), column: 0 },
            confidence: 0.8,
            context: `Docker Compose env var: ${varName}`,
          });
        }
      });
    });

    // Check for privileged containers
    if (content.includes('privileged: true')) {
      result.securityIssues.push({
        type: 'privilege_escalation',
        severity: 'high',
        message: 'Container running in privileged mode',
        location: { line: this.findLineNumber(lines, 'privileged: true'), column: 0 },
        suggestion: 'Remove privileged mode and use specific capabilities instead',
      });
    }
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

  // Helper methods for the enhanced YAML analysis
  private findLineNumber(lines: string[], searchText: string): number {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]?.includes(searchText)) {
        return i + 1;
      }
    }
    return 1;
  }

  private isSecuritySensitiveTask(taskName: string): boolean {
    const sensitiveKeywords = [
      'password',
      'secret',
      'key',
      'token',
      'auth',
      'login',
      'credential',
      'sudo',
      'become',
      'privilege',
      'root',
      'admin',
      'ssh',
      'ssl',
      'tls',
    ];
    const lowerTaskName = taskName.toLowerCase();
    return sensitiveKeywords.some(keyword => lowerTaskName.includes(keyword));
  }

  private isDangerousAnsibleRole(roleName: string): boolean {
    const dangerousRoles = [
      'shell',
      'command',
      'raw',
      'script',
      'sudo',
      'become',
      'privilege',
      'firewall',
      'iptables',
      'selinux',
      'apparmor',
    ];
    const lowerRoleName = roleName.toLowerCase();
    return dangerousRoles.some(dangerous => lowerRoleName.includes(dangerous));
  }

  private analyzeKubernetesSecurityRisks(content: string, kind: string): string[] {
    const risks: string[] = [];
    const lowerContent = content.toLowerCase();

    // Check for privileged containers
    if (lowerContent.includes('privileged: true')) {
      risks.push('Privileged container detected');
    }

    // Check for host network
    if (lowerContent.includes('hostnetwork: true')) {
      risks.push('Host network access enabled');
    }

    // Check for host PID
    if (lowerContent.includes('hostpid: true')) {
      risks.push('Host PID namespace access enabled');
    }

    // Check for missing security context
    if (kind.toLowerCase() === 'deployment' && !lowerContent.includes('securitycontext')) {
      risks.push('Missing security context configuration');
    }

    // Check for root user
    if (lowerContent.includes('runasuser: 0')) {
      risks.push('Container running as root user');
    }

    // Check for missing resource limits
    if (lowerContent.includes('containers:') && !lowerContent.includes('resources:')) {
      risks.push('Missing resource limits');
    }

    return risks;
  }

  private analyzeDockerComposeSecurityRisks(content: string, serviceName: string): string[] {
    const risks: string[] = [];

    // Extract service-specific content
    const serviceRegex = new RegExp(
      `\\s{2}${serviceName}:\\s*\\n([\\s\\S]*?)(?=\\n\\s{2}\\w|$)`,
      'i'
    );
    const serviceMatch = content.match(serviceRegex);
    const serviceContent = serviceMatch?.[1]?.toLowerCase() || '';

    // Check for privileged mode
    if (serviceContent.includes('privileged: true')) {
      risks.push('Service running in privileged mode');
    }

    // Check for host network
    if (serviceContent.includes('network_mode: host')) {
      risks.push('Service using host network');
    }

    // Check for volume mounts to sensitive paths
    const sensitiveVolumes = ['/etc', '/var/run/docker.sock', '/proc', '/sys'];
    sensitiveVolumes.forEach(path => {
      if (serviceContent.includes(`${path}:`)) {
        risks.push(`Mounting sensitive host path: ${path}`);
      }
    });

    // Check for exposed ports without proper configuration
    if (serviceContent.includes('ports:') && serviceContent.includes('"80:')) {
      risks.push('HTTP port exposed without TLS');
    }

    // Check for missing restart policy
    if (!serviceContent.includes('restart:')) {
      risks.push('Missing restart policy');
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
