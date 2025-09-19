/**
 * Enterprise Location-based filtering system with Tree-sitter intelligence
 *
 * Determines if files are in appropriate locations based on their type and content
 * Enhanced with AI-powered code analysis for multi-language DevOps stacks
 */

import { basename, dirname } from 'path';
import { TreeSitterAnalyzer, type CodeAnalysisResult } from './tree-sitter-analyzer.js';

export interface LocationRule {
  name: string;
  description: string;
  filePattern: RegExp;
  contentPattern?: RegExp;
  allowedPaths: string[];
  blockedPaths: string[];
  severity: 'error' | 'warning' | 'info';
  category: 'development' | 'security' | 'temporary' | 'testing';
}

export interface LocationValidationResult {
  isValid: boolean;
  rule?: LocationRule;
  currentPath: string;
  suggestedPaths: string[];
  severity: 'error' | 'warning' | 'info';
  message: string;
  treeSitterAnalysis?: CodeAnalysisResult;
  intelligentReasons?: string[];
}

/**
 * Default location rules for common development artifacts
 */
export const DEFAULT_LOCATION_RULES: LocationRule[] = [
  // Debug files
  {
    name: 'debug-scripts',
    description: 'debug scripts should be in development directories',
    filePattern: /^debug_.*\.(py|js|ts|sh|rb|go)$/,
    contentPattern: /print\s*\(.*debug.*\)|console\.log\s*\(.*debug.*\)|logging\.debug|debugger;/i,
    allowedPaths: ['tests/', 'test/', 'scripts/', 'tools/', 'dev/', 'debug/'],
    blockedPaths: ['src/', 'lib/', 'app/', './'],
    severity: 'warning',
    category: 'development',
  },

  // Test files
  {
    name: 'test-files',
    description: 'test files should be in test directories',
    filePattern: /^test_.*\.(py|js|ts|rb|go)$|.*\.test\.(js|ts|py)$|.*\.spec\.(js|ts|py)$/,
    allowedPaths: ['tests/', 'test/', '__tests__/', 'spec/', 'specs/'],
    blockedPaths: ['src/', 'lib/', 'app/', './'],
    severity: 'error',
    category: 'testing',
  },

  // Mock files
  {
    name: 'mock-data',
    description: 'Mock data files should be in test or fixture directories',
    filePattern: /^mock_.*\.(json|js|ts|py|yaml|yml)$/,
    contentPattern: /mock|fixture|fake.*data|dummy.*data/i,
    allowedPaths: ['tests/', 'test/', '__tests__/', 'fixtures/', 'mocks/', 'dev/'],
    blockedPaths: ['src/', 'lib/', 'app/', './'],
    severity: 'warning',
    category: 'testing',
  },

  // Temporary files
  {
    name: 'temporary-files',
    description: 'Temporary files should not be committed',
    filePattern: /^temp_.*|.*\.tmp$|.*\.temp$|.*\.bak$|.*\.orig$/,
    allowedPaths: ['tmp/', 'temp/', 'dev/'],
    blockedPaths: ['src/', 'lib/', 'app/', 'tests/', './'],
    severity: 'error',
    category: 'temporary',
  },

  // Log files
  {
    name: 'log-files',
    description: 'Log files should not be committed to main codebase',
    filePattern: /.*\.log$|.*\.out$|.*\.err$/,
    allowedPaths: ['logs/', 'dev/', 'examples/'],
    blockedPaths: ['src/', 'lib/', 'app/', 'tests/', './'],
    severity: 'error',
    category: 'temporary',
  },

  // Configuration files with secrets
  {
    name: 'config-secrets',
    description: 'Configuration files with secrets need careful review',
    filePattern: /\.env$|config\..*\.(json|yaml|yml|ini)$|secrets\..*$/,
    contentPattern: /password|secret|key|token|api.*key|private.*key/i,
    allowedPaths: ['config/', 'configs/', 'env/', 'examples/'],
    blockedPaths: ['./'],
    severity: 'error',
    category: 'security',
  },

  // Scripts
  {
    name: 'utility-scripts',
    description: 'Utility scripts should be in scripts directory',
    filePattern: /^util_.*\.(sh|py|js|ts|rb)$|^helper_.*\.(sh|py|js|ts|rb)$/,
    allowedPaths: ['scripts/', 'tools/', 'bin/', 'utils/'],
    blockedPaths: ['src/', 'lib/', 'app/', './'],
    severity: 'info',
    category: 'development',
  },

  // Experimental code
  {
    name: 'experimental-code',
    description: 'Experimental code should be in development directories',
    filePattern: /^experiment_.*|^poc_.*|^prototype_.*|^scratch_.*|^playground_.*/,
    allowedPaths: ['experiments/', 'poc/', 'dev/', 'playground/', 'prototypes/'],
    blockedPaths: ['src/', 'lib/', 'app/', './'],
    severity: 'warning',
    category: 'development',
  },

  // Documentation drafts
  {
    name: 'documentation-drafts',
    description: 'Documentation drafts should be organized properly',
    filePattern: /^draft_.*\.md$|^notes_.*\.md$|^todo_.*\.md$/,
    allowedPaths: ['docs/', 'documentation/', 'dev/', 'drafts/'],
    blockedPaths: ['src/', 'lib/', 'app/', './'],
    severity: 'info',
    category: 'development',
  },

  // Enterprise IaC Rules for RedHat/Cloud Architecture

  // Ansible Playbooks and Roles
  {
    name: 'ansible-structure',
    description: 'Ansible playbooks and roles must follow standard structure',
    filePattern: /.*\.(yml|yaml)$/,
    contentPattern: /hosts:|become:|tasks:|handlers:|vars:|playbook|ansible/i,
    allowedPaths: [
      'ansible/',
      'playbooks/',
      'roles/',
      'inventory/',
      'group_vars/',
      'host_vars/',
      'automation/',
    ],
    blockedPaths: ['src/', 'lib/', 'app/', 'tests/', './'],
    severity: 'error',
    category: 'security',
  },

  // Terraform Infrastructure
  {
    name: 'terraform-organization',
    description: 'Terraform files must be properly organized by environment/provider',
    filePattern: /.*\.tf$|.*\.tfvars$|.*\.tfstate$/,
    allowedPaths: ['terraform/', 'infra/', 'infrastructure/', 'environments/', 'modules/'],
    blockedPaths: ['src/', 'lib/', 'app/', 'ansible/', './'],
    severity: 'error',
    category: 'security',
  },

  // Container Security
  {
    name: 'container-configs',
    description: 'Container configs must be in designated directories',
    filePattern: /Dockerfile|docker-compose.*\.ya?ml$|\.dockerignore$/,
    contentPattern: /FROM|COPY|RUN|EXPOSE|CMD|ENTRYPOINT/i,
    allowedPaths: ['docker/', 'containers/', 'deployments/', 'k8s/', 'kubernetes/', './'],
    blockedPaths: ['src/', 'lib/', 'ansible/'],
    severity: 'warning',
    category: 'security',
  },

  // Kubernetes Manifests
  {
    name: 'k8s-manifests',
    description: 'Kubernetes manifests must be properly organized',
    filePattern: /.*\.(yaml|yml)$/,
    contentPattern: /apiVersion:|kind:|metadata:|spec:|kubernetes|k8s/i,
    allowedPaths: ['k8s/', 'kubernetes/', 'manifests/', 'deployments/', 'helm/', 'charts/'],
    blockedPaths: ['src/', 'lib/', 'app/', 'ansible/', './'],
    severity: 'error',
    category: 'security',
  },

  // CI/CD Pipeline Security
  {
    name: 'cicd-security',
    description: 'CI/CD configs must not contain hardcoded secrets',
    filePattern: /\.github\/workflows\/.*\.ya?ml$|\.gitlab-ci\.ya?ml$|Jenkinsfile|\.tekton\/.*$/,
    contentPattern: /password|secret|token|key|credential/i,
    allowedPaths: ['.github/workflows/', '.gitlab/', 'jenkins/', 'tekton/', 'ci/', 'pipelines/'],
    blockedPaths: ['src/', 'lib/', 'app/'],
    severity: 'error',
    category: 'security',
  },

  // Python Virtual Environments and Dependencies
  {
    name: 'python-dependencies',
    description: 'Python virtual environments should not be committed',
    filePattern: /^venv\/|^\.venv\/|^env\/|^\.env\/|__pycache__\/|.*\.pyc$/,
    allowedPaths: [],
    blockedPaths: ['./'],
    severity: 'error',
    category: 'temporary',
  },

  // Node.js Enterprise Patterns
  {
    name: 'nodejs-enterprise',
    description: 'Node.js enterprise configs must be properly organized',
    filePattern: /package\.json$|package-lock\.json$|yarn\.lock$|\.npmrc$/,
    contentPattern: /registry|token|auth/i,
    allowedPaths: ['./', 'packages/', 'apps/', 'services/'],
    blockedPaths: [],
    severity: 'warning',
    category: 'security',
  },

  // RedHat OpenShift Configs
  {
    name: 'openshift-configs',
    description: 'OpenShift configs must be in designated directories',
    filePattern: /.*\.(yaml|yml)$/,
    contentPattern: /openshift|oc\s|route:|buildconfig:|deploymentconfig/i,
    allowedPaths: ['openshift/', 'ocp/', 'deployments/', 'k8s/', 'manifests/'],
    blockedPaths: ['src/', 'lib/', 'app/', './'],
    severity: 'error',
    category: 'security',
  },
];

// Create tree-sitter analyzer instance
let treeSitterAnalyzer: TreeSitterAnalyzer | null = null;

/**
 * Initialize tree-sitter analyzer (lazy loading)
 */
async function getTreeSitterAnalyzer(): Promise<TreeSitterAnalyzer | null> {
  if (!treeSitterAnalyzer) {
    try {
      treeSitterAnalyzer = new TreeSitterAnalyzer();
      return treeSitterAnalyzer;
    } catch (error) {
      console.warn('Tree-sitter analyzer initialization failed:', error);
      return null;
    }
  }
  return treeSitterAnalyzer;
}

/**
 * Enhanced file location validation with tree-sitter intelligence
 */
export async function validateFileLocationIntelligent(
  filePath: string,
  content?: string,
  customRules: LocationRule[] = []
): Promise<LocationValidationResult> {
  // Perform basic validation first
  const basicResult = validateFileLocation(filePath, content, customRules);

  // Add tree-sitter analysis for enhanced intelligence
  try {
    const analyzer = await getTreeSitterAnalyzer();
    if (analyzer && content) {
      const analysis = await analyzer.analyzeFile(filePath, content);

      // Enhance validation with tree-sitter insights
      const intelligentResult = enhanceValidationWithTreeSitter(basicResult, analysis, filePath);

      return {
        ...intelligentResult,
        treeSitterAnalysis: analysis,
      };
    }
  } catch (error) {
    console.warn('Tree-sitter analysis failed:', error);
  }

  return basicResult;
}

/**
 * Legacy function for backward compatibility
 * Validate file location against rules
 */
export function validateFileLocation(
  filePath: string,
  content?: string,
  customRules: LocationRule[] = []
): LocationValidationResult {
  const fileName = basename(filePath);
  const dirPath = dirname(filePath);
  const allRules = [...customRules, ...DEFAULT_LOCATION_RULES]; // Custom rules first for priority

  // Check each rule
  for (const rule of allRules) {
    // Rule matches if either:
    // 1. File pattern matches AND no content pattern specified
    // 2. File pattern matches AND content pattern matches (if content provided)
    // 3. Content pattern matches (regardless of file pattern, if content provided)

    const fileMatches = rule.filePattern.test(fileName);
    const hasContentPattern = !!rule.contentPattern;
    const contentMatches =
      hasContentPattern && content ? rule.contentPattern!.test(content) : false;

    // Rule applies if:
    // - File pattern matches (regardless of content pattern)
    // - Content pattern matches (when content is provided)
    const ruleApplies = fileMatches || contentMatches;

    if (ruleApplies) {
      // Check if current path is blocked
      const isBlocked = rule.blockedPaths.some(blocked => {
        const cleanBlocked = blocked.replace(/\/$/, ''); // Remove trailing slash
        return (
          dirPath.startsWith(cleanBlocked + '/') ||
          dirPath === cleanBlocked ||
          filePath.startsWith(cleanBlocked + '/')
        );
      });

      if (isBlocked) {
        return {
          isValid: false,
          rule,
          currentPath: filePath,
          suggestedPaths: rule.allowedPaths,
          severity: rule.severity,
          message: `${rule.description}. File '${fileName}' currently in '${dirPath}/', should be in: ${rule.allowedPaths.join(', ')}`,
        };
      }

      // Check if current path is allowed
      const isAllowed =
        rule.allowedPaths.length === 0 ||
        rule.allowedPaths.some(allowed => {
          const cleanAllowed = allowed.replace(/\/$/, ''); // Remove trailing slash
          return (
            dirPath.includes(cleanAllowed) ||
            dirPath === cleanAllowed ||
            filePath.startsWith(cleanAllowed + '/') ||
            (cleanAllowed === '.' && dirPath === '.') ||
            (cleanAllowed === './' && (dirPath === '.' || dirPath === ''))
          );
        });

      if (!isAllowed) {
        return {
          isValid: false,
          rule,
          currentPath: filePath,
          suggestedPaths: rule.allowedPaths,
          severity: rule.severity,
          message: `${rule.description}. File '${fileName}' currently in '${dirPath}/', should be in: ${rule.allowedPaths.join(', ')}`,
        };
      }

      // File is in correct location
      return {
        isValid: true,
        rule,
        currentPath: filePath,
        suggestedPaths: [],
        severity: 'info',
        message: `File is correctly located in '${dirPath}/'`,
      };
    }
  }

  // No specific rule found, file is generally acceptable
  return {
    isValid: true,
    currentPath: filePath,
    suggestedPaths: [],
    severity: 'info',
    message: 'No specific location restrictions apply',
  };
}

/**
 * Get location suggestions for a file
 */
export function getLocationSuggestions(
  filePath: string,
  category: 'development' | 'security' | 'temporary' | 'testing'
): string[] {
  const fileName = basename(filePath);

  const categoryMap: Record<string, string[]> = {
    testing: ['tests/', 'test/', '__tests__/'],
    development: ['dev/', 'tools/', 'scripts/'],
    temporary: ['tmp/', 'temp/'],
    security: ['config/', 'env/', 'examples/'],
  };

  const baseSuggestions = categoryMap[category] || [];

  // Add file name to suggestions
  return baseSuggestions.map(dir => `${dir}${fileName}`);
}

/**
 * Check if a file should be ignored based on common patterns
 */
export function shouldIgnoreFile(filePath: string): {
  shouldIgnore: boolean;
  reason: string;
  severity: 'error' | 'warning' | 'info';
} {
  const fileName = basename(filePath);

  // Temporary files that should definitely be ignored
  const temporaryPatterns = [
    { pattern: /.*\.tmp$/, reason: 'Temporary file' },
    { pattern: /.*\.temp$/, reason: 'Temporary file' },
    { pattern: /.*\.bak$/, reason: 'Backup file' },
    { pattern: /.*\.orig$/, reason: 'Original file backup' },
    { pattern: /.*~$/, reason: 'Editor backup file' },
    { pattern: /^\.DS_Store$/, reason: 'macOS system file' },
    { pattern: /^Thumbs\.db$/, reason: 'Windows system file' },
    { pattern: /^\.env\.local$/, reason: 'Local environment file' },
    { pattern: /^\.env\.dev$/, reason: 'Development environment file' },
  ];

  for (const { pattern, reason } of temporaryPatterns) {
    if (pattern.test(fileName)) {
      return {
        shouldIgnore: true,
        reason,
        severity: 'error',
      };
    }
  }

  // Development files that should probably be ignored
  const developmentPatterns = [
    { pattern: /^debug_/, reason: 'Debug script' },
    { pattern: /^scratch_/, reason: 'Scratch file' },
    { pattern: /^playground_/, reason: 'Playground file' },
    { pattern: /^experiment_/, reason: 'Experimental file' },
    { pattern: /.*\.debug$/, reason: 'Debug file' },
    { pattern: /.*\.log$/, reason: 'Log file' },
  ];

  for (const { pattern, reason } of developmentPatterns) {
    if (pattern.test(fileName)) {
      return {
        shouldIgnore: true,
        reason,
        severity: 'warning',
      };
    }
  }

  return {
    shouldIgnore: false,
    reason: 'File appears to be legitimate',
    severity: 'info',
  };
}

/**
 * Create a custom location rule
 */
export function createLocationRule(
  name: string,
  description: string,
  filePattern: string,
  allowedPaths: string[],
  blockedPaths: string[] = [],
  severity: 'error' | 'warning' | 'info' = 'warning',
  category: 'development' | 'security' | 'temporary' | 'testing' = 'development',
  contentPattern?: string
): LocationRule {
  return {
    name,
    description,
    filePattern: new RegExp(filePattern),
    ...(contentPattern && { contentPattern: new RegExp(contentPattern, 'i') }),
    allowedPaths,
    blockedPaths,
    severity,
    category,
  };
}

/**
 * Load location rules from project configuration
 */
export function loadLocationRules(_projectPath: string): LocationRule[] {
  // This would load from .smartgit.json or similar configuration file
  // For now, return default rules
  return DEFAULT_LOCATION_RULES;
}

/**
 * Validate multiple files at once
 */
export function validateMultipleFiles(
  filePaths: string[],
  fileContents?: string[],
  customRules: LocationRule[] = []
): LocationValidationResult[] {
  return filePaths.map((filePath, index) => {
    const content = fileContents?.[index];
    return validateFileLocation(filePath, content, customRules);
  });
}

/**
 * Enhance validation result with tree-sitter intelligence
 */
function enhanceValidationWithTreeSitter(
  basicResult: LocationValidationResult,
  analysis: CodeAnalysisResult,
  filePath: string
): LocationValidationResult {
  const intelligentReasons: string[] = [];
  let newSeverity = basicResult.severity;
  let isValid = basicResult.isValid;

  // Security-based location enforcement
  if (analysis.hasSecrets) {
    intelligentReasons.push(
      `Contains ${analysis.secrets.length} potential secret(s): ${analysis.secrets.map(s => s.type).join(', ')}`
    );

    // Force security files to secure locations
    if (!isInSecureLocation(filePath)) {
      isValid = false;
      newSeverity = 'error';
      intelligentReasons.push(
        'Files with secrets must be in secure locations (config/, env/, examples/)'
      );
    }
  }

  // Infrastructure analysis
  if (analysis.infraStructure.length > 0) {
    const infraTypes = analysis.infraStructure.map(i => i.resourceType);
    intelligentReasons.push(`Infrastructure resources detected: ${infraTypes.join(', ')}`);

    // Terraform files with dangerous resources
    const dangerousResources = analysis.infraStructure.filter(i => i.securityRisks.length > 0);
    if (dangerousResources.length > 0) {
      intelligentReasons.push('Contains infrastructure with security risks');
      if (newSeverity === 'info') newSeverity = 'warning';
    }
  }

  // Dangerous import analysis
  const dangerousImports = analysis.imports.filter(i => i.isDangerous);
  if (dangerousImports.length > 0) {
    intelligentReasons.push(
      `Contains dangerous imports: ${dangerousImports.map(i => i.module).join(', ')}`
    );
    if (newSeverity === 'info') newSeverity = 'warning';
  }

  // Security-sensitive functions
  const sensitiveFunctions = analysis.functions.filter(f => f.securitySensitive);
  if (sensitiveFunctions.length > 0) {
    intelligentReasons.push(
      `Contains security-sensitive functions: ${sensitiveFunctions.map(f => f.name).join(', ')}`
    );
  }

  // High complexity functions (potential technical debt)
  const complexFunctions = analysis.functions.filter(f => f.complexity > 10);
  if (complexFunctions.length > 0) {
    intelligentReasons.push(
      `Contains high-complexity functions (>10): ${complexFunctions.map(f => f.name).join(', ')}`
    );
  }

  // Enterprise architecture violations
  const violations = detectArchitecturalViolations(analysis, filePath);
  if (violations.length > 0) {
    intelligentReasons.push(...violations);
    isValid = false;
    newSeverity = 'error';
  }

  return {
    ...basicResult,
    isValid,
    severity: newSeverity,
    intelligentReasons,
    message:
      intelligentReasons.length > 0
        ? `${basicResult.message} | Tree-sitter analysis: ${intelligentReasons.join('; ')}`
        : basicResult.message,
  };
}

/**
 * Check if file is in a secure location
 */
function isInSecureLocation(filePath: string): boolean {
  const secureLocations = ['config/', 'env/', 'examples/', 'secrets/', '.env', 'vault/'];
  return secureLocations.some(location => filePath.includes(location));
}

/**
 * Detect architectural violations based on imports and function calls
 */
function detectArchitecturalViolations(analysis: CodeAnalysisResult, filePath: string): string[] {
  const violations: string[] = [];

  // Database access in UI layer
  if (filePath.includes('/ui/') || filePath.includes('/components/')) {
    const dbImports = analysis.imports.filter(
      i =>
        i.module.includes('sql') ||
        i.module.includes('database') ||
        i.module.includes('mongoose') ||
        i.module.includes('sequelize')
    );

    if (dbImports.length > 0) {
      violations.push('UI layer contains direct database imports (violates clean architecture)');
    }
  }

  // Business logic in view layer
  if (filePath.includes('/views/') || filePath.includes('/templates/')) {
    const businessLogic = analysis.functions.filter(
      f =>
        f.name.includes('calculate') ||
        f.name.includes('process') ||
        f.name.includes('validate') ||
        f.complexity > 5
    );

    if (businessLogic.length > 0) {
      violations.push('View layer contains business logic (should be in service/business layer)');
    }
  }

  // Cloud provider coupling
  const awsImports = analysis.imports.filter(i => i.module.includes('aws'));
  const gcpImports = analysis.imports.filter(
    i => i.module.includes('gcp') || i.module.includes('google-cloud')
  );
  const azureImports = analysis.imports.filter(i => i.module.includes('azure'));

  const cloudProviders = [
    ...(awsImports.length > 0 ? ['AWS'] : []),
    ...(gcpImports.length > 0 ? ['GCP'] : []),
    ...(azureImports.length > 0 ? ['Azure'] : []),
  ];

  if (cloudProviders.length > 1) {
    violations.push(
      `Multi-cloud coupling detected: ${cloudProviders.join(', ')} (consider abstraction layer)`
    );
  }

  return violations;
}

/**
 * Get summary statistics for location validation
 */
export function getLocationValidationSummary(
  results: Array<LocationValidationResult & { filePath: string }>
): {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  categorySummary: Record<string, number>;
} {
  const summary = {
    totalFiles: results.length,
    validFiles: results.filter(r => r.isValid).length,
    invalidFiles: results.filter(r => !r.isValid).length,
    errorCount: results.filter(r => r.severity === 'error').length,
    warningCount: results.filter(r => r.severity === 'warning').length,
    infoCount: results.filter(r => r.severity === 'info').length,
    categorySummary: {} as Record<string, number>,
  };

  // Count by category
  for (const result of results) {
    if (result.rule) {
      const category = result.rule.category;
      summary.categorySummary[category] = (summary.categorySummary[category] || 0) + 1;
    }
  }

  return summary;
}
