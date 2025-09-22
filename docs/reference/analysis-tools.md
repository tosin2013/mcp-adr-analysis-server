# 🔍 Analysis Tools Reference

**Complete reference for MCP ADR Analysis Server analysis and discovery tools.**

---

## 📋 Quick Reference

| Tool                        | Purpose                             | Key Parameters                      | Output                                      |
| --------------------------- | ----------------------------------- | ----------------------------------- | ------------------------------------------- |
| `analyze_project_ecosystem` | Comprehensive project analysis      | `projectPath`, `enhancedMode`       | Technology stack, patterns, recommendations |
| `analyze_environment`       | Environment and deployment analysis | `includeSecurityAnalysis`           | Environment config, deployment readiness    |
| `analyze_content_security`  | Security content scanning           | `content`, `enhancedMode`           | Security issues, masking recommendations    |
| `review_existing_adrs`      | ADR compliance and gap analysis     | `adrDirectory`, `includeTreeSitter` | Compliance scores, missing decisions        |

---

## 🏗️ analyze_project_ecosystem

**Purpose**: Comprehensive analysis of project technology stack, architecture patterns, and development practices.

### Parameters

```typescript
interface AnalyzeProjectEcosystemParams {
  projectPath: string; // Required: Absolute path to project
  analysisType?: 'quick' | 'standard' | 'comprehensive';
  enhancedMode?: boolean; // Enable AI-powered analysis
  knowledgeEnhancement?: boolean; // Use knowledge generation framework
  recursiveDepth?: 'shallow' | 'medium' | 'comprehensive';
  includeEnvironment?: boolean; // Analyze deployment environment
  securityFocused?: boolean; // Focus on security analysis
  includeTreeSitter?: boolean; // Enable AST analysis
}
```

### Usage Examples

#### Basic Project Analysis

```json
{
  "tool": "analyze_project_ecosystem",
  "parameters": {
    "projectPath": "/path/to/project",
    "analysisType": "standard"
  }
}
```

#### Comprehensive Security-Focused Analysis

```json
{
  "tool": "analyze_project_ecosystem",
  "parameters": {
    "projectPath": "/path/to/project",
    "analysisType": "comprehensive",
    "enhancedMode": true,
    "securityFocused": true,
    "includeEnvironment": true,
    "includeTreeSitter": true
  }
}
```

#### Quick Technology Stack Discovery

```json
{
  "tool": "analyze_project_ecosystem",
  "parameters": {
    "projectPath": "/path/to/project",
    "analysisType": "quick",
    "recursiveDepth": "shallow"
  }
}
```

### Response Format

```typescript
interface ProjectEcosystemAnalysis {
  projectInfo: {
    name: string;
    type: string;
    primaryLanguage: string;
    framework: string;
  };
  technologyStack: {
    languages: string[];
    frameworks: string[];
    databases: string[];
    tools: string[];
    dependencies: Record<string, string>;
  };
  architecturalPatterns: {
    patterns: string[];
    confidence: number;
    evidence: string[];
  };
  securityAnalysis?: {
    issues: SecurityIssue[];
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  };
  recommendations: {
    adrSuggestions: string[];
    improvements: string[];
    bestPractices: string[];
  };
  confidence: number;
}
```

### Common Use Cases

1. **New Project Onboarding**: Understand unfamiliar codebase quickly
2. **Architecture Review**: Assess current architectural decisions
3. **Technology Migration**: Analyze current stack before migration
4. **Security Audit**: Identify security patterns and issues
5. **Documentation Generation**: Create architectural documentation

---

## 🌍 analyze_environment

**Purpose**: Analyze deployment environment, infrastructure configuration, and operational readiness.

### Parameters

```typescript
interface AnalyzeEnvironmentParams {
  includeSecurityAnalysis?: boolean; // Include security configuration analysis
  checkContainerization?: boolean; // Analyze Docker/container setup
  validateDeploymentSecurity?: boolean; // Validate deployment security
  includeOptimizations?: boolean; // Suggest performance optimizations
  environmentType?: 'development' | 'staging' | 'production';
}
```

### Usage Examples

#### Basic Environment Analysis

```json
{
  "tool": "analyze_environment",
  "parameters": {
    "includeSecurityAnalysis": true
  }
}
```

#### Container Security Analysis

```json
{
  "tool": "analyze_environment",
  "parameters": {
    "checkContainerization": true,
    "validateDeploymentSecurity": true,
    "environmentType": "production"
  }
}
```

#### Performance Optimization Analysis

```json
{
  "tool": "analyze_environment",
  "parameters": {
    "includeOptimizations": true,
    "includeSecurityAnalysis": true
  }
}
```

### Response Format

```typescript
interface EnvironmentAnalysis {
  environment: {
    type: string;
    platform: string;
    containerized: boolean;
    cloudProvider?: string;
  };
  configuration: {
    environmentVariables: Record<string, string>;
    configFiles: string[];
    secrets: string[];
  };
  security: {
    issues: SecurityIssue[];
    recommendations: string[];
    compliance: Record<string, boolean>;
  };
  performance: {
    optimizations: string[];
    bottlenecks: string[];
    recommendations: string[];
  };
  deployment: {
    readiness: boolean;
    blockers: string[];
    requirements: string[];
  };
}
```

### Common Use Cases

1. **Deployment Readiness**: Validate environment before deployment
2. **Security Audit**: Check environment security configuration
3. **Performance Tuning**: Identify optimization opportunities
4. **Compliance Check**: Validate against security standards
5. **Infrastructure Review**: Assess current infrastructure setup

---

## 🔒 analyze_content_security

**Purpose**: Scan content for security issues, sensitive data, and compliance violations.

### Parameters

```typescript
interface AnalyzeContentSecurityParams {
  content: string; // Required: Content to analyze
  contentType?: 'code' | 'configuration' | 'logs' | 'documentation';
  enhancedMode?: boolean; // Enable advanced security analysis
  enableTreeSitterAnalysis?: boolean; // Use AST-based analysis
  userDefinedPatterns?: string[]; // Custom security patterns
  checkFilePatterns?: boolean; // Check for sensitive file patterns
  strictValidation?: boolean; // Use strict security validation
}
```

### Usage Examples

#### Basic Security Scan

```json
{
  "tool": "analyze_content_security",
  "parameters": {
    "content": "const apiKey = 'sk-1234567890abcdef';",
    "contentType": "code",
    "enhancedMode": true
  }
}
```

#### Advanced Security Analysis with Custom Patterns

```json
{
  "tool": "analyze_content_security",
  "parameters": {
    "content": "COMPANY_SECRET=internal-token-12345",
    "contentType": "configuration",
    "enhancedMode": true,
    "enableTreeSitterAnalysis": true,
    "userDefinedPatterns": ["COMPANY_[A-Z_]+", "internal-.*-token"],
    "strictValidation": true
  }
}
```

#### File Pattern Security Check

```json
{
  "tool": "analyze_content_security",
  "parameters": {
    "content": "Check if .env files are in git",
    "contentType": "configuration",
    "checkFilePatterns": true
  }
}
```

### Response Format

```typescript
interface ContentSecurityAnalysis {
  securityIssues: SecurityIssue[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  maskingRecommended: boolean;
  patterns: {
    detected: string[];
    confidence: number;
    locations: Array<{
      line: number;
      column: number;
      pattern: string;
    }>;
  };
  recommendations: string[];
  compliance: {
    gdpr: boolean;
    pci: boolean;
    hipaa: boolean;
  };
}

interface SecurityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  line?: number;
  column?: number;
  pattern: string;
  description: string;
  recommendation: string;
}
```

### Common Use Cases

1. **Pre-Commit Security**: Scan code before committing
2. **Documentation Review**: Check docs for sensitive information
3. **Configuration Audit**: Validate config files for secrets
4. **Compliance Check**: Ensure content meets compliance standards
5. **Incident Response**: Analyze potentially compromised content

---

## 📋 review_existing_adrs

**Purpose**: Analyze existing ADRs for compliance, completeness, and identify missing architectural decisions.

### Parameters

```typescript
interface ReviewExistingAdrsParams {
  adrDirectory: string; // Required: Path to ADR directory
  includeTreeSitter?: boolean; // Enable code analysis
  complianceFramework?: 'madr' | 'nygard' | 'custom';
  analysisDepth?: 'basic' | 'comprehensive';
  projectPath?: string; // Project path for code analysis
  generateRecommendations?: boolean; // Generate improvement recommendations
}
```

### Usage Examples

#### Basic ADR Review

```json
{
  "tool": "review_existing_adrs",
  "parameters": {
    "adrDirectory": "docs/adrs"
  }
}
```

#### Comprehensive ADR Analysis with Code Validation

```json
{
  "tool": "review_existing_adrs",
  "parameters": {
    "adrDirectory": "docs/adrs",
    "includeTreeSitter": true,
    "complianceFramework": "madr",
    "analysisDepth": "comprehensive",
    "projectPath": ".",
    "generateRecommendations": true
  }
}
```

#### Quick Compliance Check

```json
{
  "tool": "review_existing_adrs",
  "parameters": {
    "adrDirectory": "docs/adrs",
    "complianceFramework": "nygard",
    "analysisDepth": "basic"
  }
}
```

### Response Format

```typescript
interface AdrReviewAnalysis {
  summary: {
    totalAdrs: number;
    complianceScore: number;
    completenessScore: number;
    qualityScore: number;
  };
  adrAnalysis: Array<{
    file: string;
    title: string;
    status: string;
    compliance: {
      score: number;
      issues: string[];
      recommendations: string[];
    };
    implementation: {
      implemented: boolean;
      evidence: string[];
      gaps: string[];
    };
  }>;
  gaps: {
    missingDecisions: string[];
    undocumentedPatterns: string[];
    implementationGaps: string[];
  };
  recommendations: {
    newAdrs: string[];
    improvements: string[];
    processChanges: string[];
  };
}
```

### Common Use Cases

1. **ADR Audit**: Assess quality of existing ADRs
2. **Gap Analysis**: Identify missing architectural decisions
3. **Compliance Check**: Validate ADRs against standards
4. **Process Improvement**: Identify ADR process improvements
5. **Documentation Cleanup**: Find outdated or incomplete ADRs

---

## 🔧 Advanced Analysis Patterns

### Chaining Analysis Tools

**Progressive Analysis Workflow**:

```json
// 1. Start with ecosystem analysis
{
  "tool": "analyze_project_ecosystem",
  "parameters": {
    "projectPath": ".",
    "analysisType": "standard"
  }
}

// 2. Deep dive into security if issues found
{
  "tool": "analyze_content_security",
  "parameters": {
    "content": "/* code from ecosystem analysis */",
    "enhancedMode": true,
    "enableTreeSitterAnalysis": true
  }
}

// 3. Review existing ADRs for gaps
{
  "tool": "review_existing_adrs",
  "parameters": {
    "adrDirectory": "docs/adrs",
    "includeTreeSitter": true,
    "projectPath": "."
  }
}

// 4. Analyze deployment environment
{
  "tool": "analyze_environment",
  "parameters": {
    "includeSecurityAnalysis": true,
    "checkContainerization": true
  }
}
```

### Performance Optimization

**For Large Projects**:

```json
{
  "tool": "analyze_project_ecosystem",
  "parameters": {
    "projectPath": ".",
    "analysisType": "quick",
    "recursiveDepth": "shallow",
    "enhancedMode": false
  }
}
```

**For Detailed Analysis**:

```json
{
  "tool": "analyze_project_ecosystem",
  "parameters": {
    "projectPath": ".",
    "analysisType": "comprehensive",
    "enhancedMode": true,
    "knowledgeEnhancement": true,
    "includeTreeSitter": true
  }
}
```

### Error Handling

**Common Error Patterns**:

- **Path not found**: Ensure absolute paths are used
- **Permission denied**: Check file/directory permissions
- **Analysis timeout**: Reduce scope or use quick analysis
- **Memory issues**: Process large projects in chunks

**Diagnostic Commands**:

```json
// Check environment
{
  "tool": "analyze_environment",
  "parameters": {
    "includeOptimizations": true
  }
}

// Validate project structure
{
  "tool": "analyze_project_ecosystem",
  "parameters": {
    "projectPath": ".",
    "analysisType": "quick"
  }
}
```

---

## 📊 Analysis Best Practices

### 1. Start with Quick Analysis

- Use `analysisType: "quick"` for initial exploration
- Progressively increase depth based on findings
- Focus on specific areas of concern

### 2. Security-First Approach

- Always include security analysis for production systems
- Use custom patterns for organization-specific secrets
- Validate security configurations before deployment

### 3. Iterative Analysis

- Analyze → Review → Refine → Re-analyze
- Use findings from one tool to inform parameters for others
- Build comprehensive understanding through multiple passes

### 4. Context-Aware Analysis

- Provide project context through parameters
- Use appropriate analysis depth for project size
- Consider team expertise and project maturity

### 5. Performance Considerations

- Monitor analysis time and resource usage
- Use caching for repeated analyses
- Optimize parameters for your specific use case

---

## 🔗 Related Documentation

- **[Generation Tools](generation-tools.md)** - ADR and content generation tools
- **[Security Tools](security-tools.md)** - Specialized security analysis tools
- **[Validation Tools](validation-tools.md)** - Progress tracking and validation tools
- **[Environment Configuration](environment-config.md)** - Analysis configuration options

---

**Need help with analysis tools?** → **[Troubleshooting Guide](../how-to-guides/troubleshooting.md)** or **[File an Issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues)**
