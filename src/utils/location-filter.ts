/**
 * Location-based filtering system for smart git push
 * 
 * Determines if files are in appropriate locations based on their type and content
 */

import { basename, dirname, extname } from 'path';

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
}

/**
 * Default location rules for common development artifacts
 */
export const DEFAULT_LOCATION_RULES: LocationRule[] = [
  // Debug files
  {
    name: 'debug-scripts',
    description: 'Debug scripts should be in development directories',
    filePattern: /^debug_.*\.(py|js|ts|sh|rb|go)$/,
    contentPattern: /print\s*\(.*debug.*\)|console\.log\s*\(.*debug.*\)|logging\.debug|debugger;/i,
    allowedPaths: ['tests/', 'test/', 'scripts/', 'tools/', 'dev/', 'debug/'],
    blockedPaths: ['src/', 'lib/', 'app/', './'],
    severity: 'warning',
    category: 'development'
  },
  
  // Test files
  {
    name: 'test-files',
    description: 'Test files should be in test directories',
    filePattern: /^test_.*\.(py|js|ts|rb|go)$|.*\.test\.(js|ts|py)$|.*\.spec\.(js|ts|py)$/,
    allowedPaths: ['tests/', 'test/', '__tests__/', 'spec/', 'specs/'],
    blockedPaths: ['src/', 'lib/', 'app/', './'],
    severity: 'error',
    category: 'testing'
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
    category: 'testing'
  },
  
  // Temporary files
  {
    name: 'temporary-files',
    description: 'Temporary files should not be committed',
    filePattern: /^temp_.*|.*\.tmp$|.*\.temp$|.*\.bak$|.*\.orig$/,
    allowedPaths: ['tmp/', 'temp/', 'dev/'],
    blockedPaths: ['src/', 'lib/', 'app/', 'tests/', './'],
    severity: 'error',
    category: 'temporary'
  },
  
  // Log files
  {
    name: 'log-files',
    description: 'Log files should not be committed to main codebase',
    filePattern: /.*\.log$|.*\.out$|.*\.err$/,
    allowedPaths: ['logs/', 'dev/', 'examples/'],
    blockedPaths: ['src/', 'lib/', 'app/', 'tests/', './'],
    severity: 'error',
    category: 'temporary'
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
    category: 'security'
  },
  
  // Scripts
  {
    name: 'utility-scripts',
    description: 'Utility scripts should be in scripts directory',
    filePattern: /^util_.*\.(sh|py|js|ts|rb)$|^helper_.*\.(sh|py|js|ts|rb)$/,
    allowedPaths: ['scripts/', 'tools/', 'bin/', 'utils/'],
    blockedPaths: ['src/', 'lib/', 'app/', './'],
    severity: 'info',
    category: 'development'
  },
  
  // Experimental code
  {
    name: 'experimental-code',
    description: 'Experimental code should be in development directories',
    filePattern: /^experiment_.*|^poc_.*|^prototype_.*|^scratch_.*|^playground_.*/,
    allowedPaths: ['experiments/', 'poc/', 'dev/', 'playground/', 'prototypes/'],
    blockedPaths: ['src/', 'lib/', 'app/', './'],
    severity: 'warning',
    category: 'development'
  },
  
  // Documentation drafts
  {
    name: 'documentation-drafts',
    description: 'Documentation drafts should be organized properly',
    filePattern: /^draft_.*\.md$|^notes_.*\.md$|^todo_.*\.md$/,
    allowedPaths: ['docs/', 'documentation/', 'dev/', 'drafts/'],
    blockedPaths: ['src/', 'lib/', 'app/', './'],
    severity: 'info',
    category: 'development'
  }
];

/**
 * Validate file location against rules
 */
export function validateFileLocation(
  filePath: string,
  content?: string,
  customRules: LocationRule[] = []
): LocationValidationResult {
  const fileName = basename(filePath);
  const dirPath = dirname(filePath);
  const allRules = [...DEFAULT_LOCATION_RULES, ...customRules];
  
  // Check each rule
  for (const rule of allRules) {
    if (rule.filePattern.test(fileName)) {
      // Check content pattern if specified
      if (rule.contentPattern && content && !rule.contentPattern.test(content)) {
        continue; // Content pattern doesn't match, skip this rule
      }
      
      // Check if current path is blocked
      const isBlocked = rule.blockedPaths.some(blocked => 
        dirPath.startsWith(blocked) || dirPath === blocked.replace('/', '')
      );
      
      if (isBlocked) {
        return {
          isValid: false,
          rule,
          currentPath: dirPath,
          suggestedPaths: rule.allowedPaths,
          severity: rule.severity,
          message: `${rule.description}. Currently in '${dirPath}/', should be in: ${rule.allowedPaths.join(', ')}`
        };
      }
      
      // Check if current path is allowed
      const isAllowed = rule.allowedPaths.some(allowed => 
        dirPath.startsWith(allowed) || dirPath === allowed.replace('/', '')
      );
      
      if (!isAllowed) {
        return {
          isValid: false,
          rule,
          currentPath: dirPath,
          suggestedPaths: rule.allowedPaths,
          severity: rule.severity,
          message: `${rule.description}. Currently in '${dirPath}/', should be in: ${rule.allowedPaths.join(', ')}`
        };
      }
      
      // File is in correct location
      return {
        isValid: true,
        rule,
        currentPath: dirPath,
        suggestedPaths: [],
        severity: 'info',
        message: `File is correctly located in '${dirPath}/'`
      };
    }
  }
  
  // No specific rule found, file is generally acceptable
  return {
    isValid: true,
    currentPath: dirPath,
    suggestedPaths: [],
    severity: 'info',
    message: 'No specific location restrictions apply'
  };
}

/**
 * Get location suggestions for a file
 */
export function getLocationSuggestions(
  filePath: string,
  content?: string,
  customRules: LocationRule[] = []
): {
  suggestions: string[];
  reasoning: string;
  category: string;
} {
  const fileName = basename(filePath);
  const fileExt = extname(filePath);
  const allRules = [...DEFAULT_LOCATION_RULES, ...customRules];
  
  // Find matching rules
  const matchingRules = allRules.filter(rule => {
    const fileMatches = rule.filePattern.test(fileName);
    const contentMatches = !rule.contentPattern || !content || rule.contentPattern.test(content);
    return fileMatches && contentMatches;
  });
  
  if (matchingRules.length > 0) {
    const rule = matchingRules[0]; // Use first matching rule
    return {
      suggestions: rule.allowedPaths,
      reasoning: rule.description,
      category: rule.category
    };
  }
  
  // Generic suggestions based on file type
  const genericSuggestions = getGenericLocationSuggestions(fileName, fileExt);
  return {
    suggestions: genericSuggestions,
    reasoning: 'Based on file type and naming conventions',
    category: 'general'
  };
}

/**
 * Get generic location suggestions based on file characteristics
 */
function getGenericLocationSuggestions(fileName: string, fileExt: string): string[] {
  const suggestions: string[] = [];
  
  // Test files
  if (fileName.includes('test') || fileName.includes('spec')) {
    suggestions.push('tests/', 'test/', '__tests__/');
  }
  
  // Config files
  if (fileName.includes('config') || fileName.includes('settings')) {
    suggestions.push('config/', 'configs/', 'settings/');
  }
  
  // Documentation
  if (['.md', '.txt', '.rst'].includes(fileExt)) {
    suggestions.push('docs/', 'documentation/');
  }
  
  // Scripts
  if (['.sh', '.bat', '.ps1'].includes(fileExt)) {
    suggestions.push('scripts/', 'bin/', 'tools/');
  }
  
  // Data files
  if (['.json', '.yaml', '.yml', '.xml', '.csv'].includes(fileExt)) {
    suggestions.push('data/', 'fixtures/', 'config/');
  }
  
  // Default suggestions
  if (suggestions.length === 0) {
    suggestions.push('src/', 'lib/', 'utils/');
  }
  
  return suggestions;
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
  const fileExt = extname(filePath);
  
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
    { pattern: /^\.env\.dev$/, reason: 'Development environment file' }
  ];
  
  for (const { pattern, reason } of temporaryPatterns) {
    if (pattern.test(fileName)) {
      return {
        shouldIgnore: true,
        reason,
        severity: 'error'
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
    { pattern: /.*\.log$/, reason: 'Log file' }
  ];
  
  for (const { pattern, reason } of developmentPatterns) {
    if (pattern.test(fileName)) {
      return {
        shouldIgnore: true,
        reason,
        severity: 'warning'
      };
    }
  }
  
  return {
    shouldIgnore: false,
    reason: 'File appears to be legitimate',
    severity: 'info'
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
    contentPattern: contentPattern ? new RegExp(contentPattern, 'i') : undefined,
    allowedPaths,
    blockedPaths,
    severity,
    category
  };
}

/**
 * Load location rules from project configuration
 */
export function loadLocationRules(projectPath: string): LocationRule[] {
  // This would load from .smartgit.json or similar configuration file
  // For now, return default rules
  return DEFAULT_LOCATION_RULES;
}

/**
 * Validate multiple files at once
 */
export function validateMultipleFiles(
  files: Array<{ path: string; content?: string }>,
  customRules: LocationRule[] = []
): Array<LocationValidationResult & { filePath: string }> {
  return files.map(file => ({
    filePath: file.path,
    ...validateFileLocation(file.path, file.content, customRules)
  }));
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
    categorySummary: {} as Record<string, number>
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