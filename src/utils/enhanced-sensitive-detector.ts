/**
 * Enhanced sensitive content detector for smart git push
 * 
 * Integrates with existing content-masking-tool.ts and adds git-specific patterns
 */

import { basename, extname } from 'path';

export interface SensitivePattern {
  name: string;
  pattern: RegExp;
  description: string;
  category: 'credentials' | 'secrets' | 'personal' | 'infrastructure' | 'development';
  severity: 'critical' | 'high' | 'medium' | 'low';
  falsePositivePatterns?: RegExp[];
  contextRequired?: boolean;
}

export interface SensitiveMatch {
  pattern: SensitivePattern;
  match: string;
  line: number;
  column: number;
  context: string;
  confidence: number;
  suggestions: string[];
}

export interface SensitiveContentResult {
  filePath: string;
  hasIssues: boolean;
  matches: SensitiveMatch[];
  summary: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    totalCount: number;
  };
  recommendations: string[];
}

/**
 * Enhanced sensitive patterns for git context
 */
export const GIT_SENSITIVE_PATTERNS: SensitivePattern[] = [
  // API Keys and Tokens
  {
    name: 'github-token',
    pattern: /ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82}/,
    description: 'GitHub Personal Access Token',
    category: 'credentials',
    severity: 'critical'
  },
  {
    name: 'aws-access-key',
    pattern: /AKIA[0-9A-Z]{16}/,
    description: 'AWS Access Key ID',
    category: 'credentials',
    severity: 'critical'
  },
  {
    name: 'aws-secret-key',
    pattern: /[0-9a-zA-Z\/+=]{40}/,
    description: 'AWS Secret Access Key',
    category: 'credentials',
    severity: 'critical',
    contextRequired: true
  },
  {
    name: 'generic-api-key',
    pattern: /[Aa][Pp][Ii][_-]?[Kk][Ee][Yy]['"\s]*[:=]['"\s]*[a-zA-Z0-9_\-]{20,}/,
    description: 'Generic API Key',
    category: 'credentials',
    severity: 'high'
  },
  {
    name: 'generic-secret',
    pattern: /[Ss]ecret['"\s]*[:=]['"\s]*[a-zA-Z0-9_\-]{15,}/,
    description: 'Generic Secret',
    category: 'secrets',
    severity: 'high'
  },
  {
    name: 'generic-token',
    pattern: /[Tt]oken['"\s]*[:=]['"\s]*[a-zA-Z0-9_\-]{20,}/,
    description: 'Generic Token',
    category: 'credentials',
    severity: 'high'
  },
  
  // Database Credentials
  {
    name: 'database-url',
    pattern: /(postgres|mysql|mongodb):\/\/[^:\s]+:[^@\s]+@[^:\s\/]+/,
    description: 'Database connection URL with credentials',
    category: 'credentials',
    severity: 'critical'
  },
  {
    name: 'database-password',
    pattern: /[Dd]b[_-]?[Pp]assword['"\s]*[:=]['"\s]*[^\s'"]{8,}/,
    description: 'Database password',
    category: 'credentials',
    severity: 'high'
  },
  
  // Private Keys
  {
    name: 'private-key',
    pattern: /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
    description: 'Private key',
    category: 'credentials',
    severity: 'critical'
  },
  {
    name: 'ssh-private-key',
    pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/,
    description: 'SSH private key',
    category: 'credentials',
    severity: 'critical'
  },
  
  // Personal Information
  {
    name: 'email-address',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    description: 'Email address',
    category: 'personal',
    severity: 'low',
    falsePositivePatterns: [
      /example\.com|test\.com|localhost|no-reply|noreply/,
      /email@example\.com|test@test\.com|user@domain\.com/
    ]
  },
  {
    name: 'phone-number',
    pattern: /\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/,
    description: 'Phone number',
    category: 'personal',
    severity: 'medium'
  },
  
  // Infrastructure
  {
    name: 'ip-address',
    pattern: /(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/,
    description: 'IP address',
    category: 'infrastructure',
    severity: 'medium',
    falsePositivePatterns: [
      /127\.0\.0\.1|localhost|0\.0\.0\.0|192\.168\.|10\.|172\.16\./
    ]
  },
  {
    name: 'domain-name',
    pattern: /https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    description: 'Domain name or URL',
    category: 'infrastructure',
    severity: 'low',
    falsePositivePatterns: [
      /example\.com|test\.com|localhost|github\.com|stackoverflow\.com/
    ]
  },
  
  // Development Secrets
  {
    name: 'jwt-secret',
    pattern: /[Jj]wt[_-]?[Ss]ecret['"\s]*[:=]['"\s]*[a-zA-Z0-9_\-]{32,}/,
    description: 'JWT secret key',
    category: 'secrets',
    severity: 'high'
  },
  {
    name: 'encryption-key',
    pattern: /[Ee]ncryption[_-]?[Kk]ey['"\s]*[:=]['"\s]*[a-zA-Z0-9_\-+\/=]{32,}/,
    description: 'Encryption key',
    category: 'secrets',
    severity: 'high'
  },
  {
    name: 'session-secret',
    pattern: /[Ss]ession[_-]?[Ss]ecret['"\s]*[:=]['"\s]*[a-zA-Z0-9_\-]{20,}/,
    description: 'Session secret',
    category: 'secrets',
    severity: 'high'
  },
  
  // Development/Debug Information
  {
    name: 'debug-info',
    pattern: /console\.log\(.*(?:password|secret|token|key).*\)/i,
    description: 'Debug logging of sensitive information',
    category: 'development',
    severity: 'medium'
  },
  {
    name: 'hardcoded-password',
    pattern: /password['"\s]*[:=]['"\s]*(?!.*\$\{|.*process\.env)['"]*[a-zA-Z0-9!@#$%^&*()_+\-=]{8,}['"]*(?!['"]*\s*\+|\s*\$\{)/,
    description: 'Hardcoded password',
    category: 'credentials',
    severity: 'high'
  }
];

/**
 * Analyze content for sensitive information
 */
export async function analyzeSensitiveContent(
  filePath: string,
  content: string,
  customPatterns: SensitivePattern[] = []
): Promise<SensitiveContentResult> {
  const allPatterns = [...GIT_SENSITIVE_PATTERNS, ...customPatterns];
  const matches: SensitiveMatch[] = [];
  const lines = content.split('\n');
  
  // Check each line for sensitive patterns
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const lineNumber = lineIndex + 1;
    
    if (!line) continue;
    
    for (const pattern of allPatterns) {
      const regex = new RegExp(pattern.pattern, 'g');
      let match: RegExpExecArray | null;
      
      while ((match = regex.exec(line)) !== null) {
        // Check for false positives
        if (pattern.falsePositivePatterns) {
          const isFalsePositive = pattern.falsePositivePatterns.some(fp => 
            fp.test(match![0])
          );
          if (isFalsePositive) {
            continue;
          }
        }
        
        // Get context around the match
        const contextStart = Math.max(0, lineIndex - 2);
        const contextEnd = Math.min(lines.length, lineIndex + 3);
        const context = lines.slice(contextStart, contextEnd).join('\n');
        
        // Calculate confidence based on context and pattern specificity
        const confidence = calculateConfidence(pattern, match![0], context, filePath);
        
        // Generate suggestions
        const suggestions = generateSuggestions(pattern, filePath);
        
        matches.push({
          pattern,
          match: match![0],
          line: lineNumber,
          column: match!.index || 0,
          context,
          confidence,
          suggestions
        });
      }
    }
  }
  
  // Sort matches by severity and confidence
  matches.sort((a, b) => {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const severityDiff = severityOrder[b.pattern.severity] - severityOrder[a.pattern.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.confidence - a.confidence;
  });
  
  // Generate summary
  const summary = {
    criticalCount: matches.filter(m => m.pattern.severity === 'critical').length,
    highCount: matches.filter(m => m.pattern.severity === 'high').length,
    mediumCount: matches.filter(m => m.pattern.severity === 'medium').length,
    lowCount: matches.filter(m => m.pattern.severity === 'low').length,
    totalCount: matches.length
  };
  
  // Generate recommendations
  const recommendations = generateRecommendations(matches);
  
  return {
    filePath,
    hasIssues: matches.length > 0,
    matches,
    summary,
    recommendations
  };
}

/**
 * Calculate confidence score for a match
 */
function calculateConfidence(
  pattern: SensitivePattern,
  match: string,
  context: string,
  filePath: string
): number {
  let confidence = 0.5; // Base confidence
  
  // Pattern-specific confidence adjustments
  if (pattern.name.includes('github') || pattern.name.includes('aws')) {
    confidence += 0.3; // Service-specific patterns are more reliable
  }
  
  if (pattern.severity === 'critical') {
    confidence += 0.2;
  }
  
  // Context-based adjustments
  if (context.toLowerCase().includes('example') || context.toLowerCase().includes('test')) {
    confidence -= 0.3; // Likely example/test data
  }
  
  if (context.toLowerCase().includes('placeholder') || context.toLowerCase().includes('dummy')) {
    confidence -= 0.4; // Likely placeholder
  }
  
  // File-based adjustments
  const fileName = basename(filePath);
  const fileExt = extname(filePath);
  
  if (fileName.includes('example') || fileName.includes('test') || fileName.includes('demo')) {
    confidence -= 0.2;
  }
  
  if (fileExt === '.md' || fileExt === '.txt') {
    confidence -= 0.1; // Documentation files are less likely to contain real secrets
  }
  
  if (fileExt === '.env' || fileName === '.env' || fileName.includes('config')) {
    confidence += 0.2; // Config files are more likely to contain real secrets
  }
  
  // Match length adjustments
  if (match.length > 50) {
    confidence += 0.1; // Longer matches are more likely to be real
  }
  
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Generate suggestions for handling sensitive content
 */
function generateSuggestions(
  pattern: SensitivePattern,
  filePath: string
): string[] {
  const suggestions: string[] = [];
  const fileName = basename(filePath);
  
  switch (pattern.category) {
    case 'credentials':
      suggestions.push('Move to environment variables');
      suggestions.push('Use a secrets management service');
      suggestions.push('Add to .gitignore and use .env.example');
      if (pattern.severity === 'critical') {
        suggestions.push('🚨 ROTATE THIS CREDENTIAL IMMEDIATELY');
      }
      break;
      
    case 'secrets':
      suggestions.push('Store in secure environment variables');
      suggestions.push('Use a key management service');
      suggestions.push('Consider using encrypted configuration');
      break;
      
    case 'personal':
      suggestions.push('Replace with placeholder values');
      suggestions.push('Use fake data for examples');
      suggestions.push('Move to private configuration');
      break;
      
    case 'infrastructure':
      suggestions.push('Use configuration variables');
      suggestions.push('Consider if this information should be public');
      suggestions.push('Use localhost or example.com for demos');
      break;
      
    case 'development':
      suggestions.push('Remove debug logging');
      suggestions.push('Use proper logging framework');
      suggestions.push('Consider development vs production builds');
      break;
  }
  
  // File-specific suggestions
  if (fileName.includes('example') || fileName.includes('demo')) {
    suggestions.push('Use obviously fake placeholder values');
  }
  
  if (fileName.includes('test')) {
    suggestions.push('Use test-specific dummy data');
  }
  
  return suggestions;
}

/**
 * Generate overall recommendations
 */
function generateRecommendations(
  matches: SensitiveMatch[]
): string[] {
  const recommendations: string[] = [];
  
  if (matches.length === 0) {
    return ['No sensitive content detected'];
  }
  
  const criticalCount = matches.filter(m => m.pattern.severity === 'critical').length;
  const highCount = matches.filter(m => m.pattern.severity === 'high').length;
  
  if (criticalCount > 0) {
    recommendations.push(`🚨 ${criticalCount} CRITICAL security issue(s) found - DO NOT COMMIT`);
    recommendations.push('Rotate any exposed credentials immediately');
  }
  
  if (highCount > 0) {
    recommendations.push(`⚠️ ${highCount} HIGH severity issue(s) found`);
    recommendations.push('Review and secure sensitive information');
  }
  
  // General recommendations
  recommendations.push('Use environment variables for sensitive configuration');
  recommendations.push('Consider using a secrets management service');
  recommendations.push('Add sensitive files to .gitignore');
  recommendations.push('Use the content masking tool to sanitize content');
  
  return recommendations;
}

/**
 * Integration with existing content masking tool
 */
export async function integrateWithContentMasking(
  filePath: string,
  content: string
): Promise<{
  sensitiveAnalysis: SensitiveContentResult;
  maskingPrompt?: string;
  combinedRecommendations: string[];
}> {
  // Get our enhanced analysis
  const sensitiveAnalysis = await analyzeSensitiveContent(filePath, content);
  
  // Try to use existing content masking tool
  let maskingPrompt: string | undefined;
  let existingRecommendations: string[] = [];
  
  try {
    const { analyzeContentSecurity } = await import('../tools/content-masking-tool.js');
    const maskingResult = await analyzeContentSecurity({
      content,
      contentType: getContentType(filePath),
      enhancedMode: false,
      knowledgeEnhancement: false
    });
    
    // Extract prompt and recommendations from the result
    if (maskingResult.content && maskingResult.content[0]) {
      const resultText = maskingResult.content[0].text;
      const promptMatch = resultText.match(/## AI.*Prompt\n\n(.*?)(?=\n##|$)/s);
      if (promptMatch) {
        maskingPrompt = promptMatch[1];
      }
      
      // Extract existing recommendations
      const recMatch = resultText.match(/## Next Steps\n\n(.*?)(?=\n##|$)/s);
      if (recMatch) {
        existingRecommendations = recMatch[1].split('\n').filter((line: string) => line.trim());
      }
    }
  } catch (error) {
    console.warn('Could not integrate with existing content masking tool:', error);
  }
  
  // Combine recommendations
  const combinedRecommendations = [
    ...sensitiveAnalysis.recommendations,
    ...existingRecommendations
  ].filter((rec, index, arr) => arr.indexOf(rec) === index); // Remove duplicates
  
  return {
    sensitiveAnalysis,
    ...(maskingPrompt && { maskingPrompt }),
    combinedRecommendations
  };
}

/**
 * Get content type for file
 */
function getContentType(filePath: string): 'code' | 'documentation' | 'configuration' | 'logs' | 'general' {
  const ext = extname(filePath).toLowerCase();
  
  if (['.js', '.ts', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.rb', '.php'].includes(ext)) {
    return 'code';
  }
  
  if (['.md', '.txt', '.rst', '.doc', '.docx'].includes(ext)) {
    return 'documentation';
  }
  
  if (['.json', '.yaml', '.yml', '.ini', '.conf', '.config', '.env'].includes(ext)) {
    return 'configuration';
  }
  
  if (['.log', '.out', '.err'].includes(ext)) {
    return 'logs';
  }
  
  return 'general';
}

/**
 * Quick check for obviously sensitive files
 */
export function isObviouslySensitive(filePath: string): boolean {
  const fileName = basename(filePath).toLowerCase();
  
  const sensitiveFilePatterns = [
    /^\.env$/,
    /^\.env\./,
    /secrets?\./,
    /credentials?\./,
    /private.*key/,
    /id_rsa$/,
    /id_ed25519$/,
    /\.pem$/,
    /\.p12$/,
    /\.pfx$/,
    /keystore/,
    /truststore/
  ];
  
  return sensitiveFilePatterns.some(pattern => pattern.test(fileName));
}

/**
 * Create a custom sensitive pattern
 */
export function createSensitivePattern(
  name: string,
  pattern: string,
  description: string,
  category: SensitivePattern['category'],
  severity: SensitivePattern['severity']
): SensitivePattern {
  return {
    name,
    pattern: new RegExp(pattern, 'g'),
    description,
    category,
    severity
  };
}