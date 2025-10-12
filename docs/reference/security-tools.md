# 🔒 Security Tools Reference

**Complete reference for MCP ADR Analysis Server security analysis and protection tools.**

---

## 📋 Quick Reference

| Tool                          | Purpose                          | Key Parameters                     | Output                                     |
| ----------------------------- | -------------------------------- | ---------------------------------- | ------------------------------------------ |
| `analyze_content_security`    | Scan content for security issues | `content`, `enhancedMode`          | Security vulnerabilities and risks         |
| `generate_content_masking`    | Create masked content            | `content`, `maskingLevel`          | Sanitized content with preserved structure |
| `validate_content_masking`    | Verify masking quality           | `originalContent`, `maskedContent` | Masking validation report                  |
| `apply_basic_content_masking` | Quick content sanitization       | `content`, `patterns`              | Basic masked content                       |

---

## 🔍 analyze_content_security

**Purpose**: Comprehensive security analysis of content to detect secrets, vulnerabilities, and compliance violations.

### Parameters

```typescript
interface AnalyzeContentSecurityParams {
  content: string; // Required: Content to analyze
  contentType?: 'code' | 'configuration' | 'logs' | 'documentation' | 'mixed';
  enhancedMode?: boolean; // Enable AI-powered analysis
  enableTreeSitterAnalysis?: boolean; // Use AST-based analysis for code
  userDefinedPatterns?: string[]; // Custom security patterns
  checkFilePatterns?: boolean; // Check for sensitive file patterns
  strictValidation?: boolean; // Use strict security validation
  complianceFrameworks?: string[]; // Check against specific frameworks
  confidenceThreshold?: number; // Minimum confidence for findings (0-1)
}
```

### Usage Examples

#### Basic Security Scan

```json
{
  "tool": "analyze_content_security",
  "parameters": {
    "content": "const apiKey = 'sk-1234567890abcdef';\nconst dbPassword = 'mySecretPassword123';",
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
    "content": "COMPANY_API_KEY=internal-12345\nAWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "contentType": "configuration",
    "enhancedMode": true,
    "enableTreeSitterAnalysis": true,
    "userDefinedPatterns": [
      "COMPANY_[A-Z_]+=[a-zA-Z0-9-]+",
      "internal-[0-9]+",
      "wJalr[A-Za-z0-9/+]+"
    ],
    "strictValidation": true,
    "complianceFrameworks": ["SOX", "PCI-DSS", "GDPR"]
  }
}
```

#### File Pattern Security Check

```json
{
  "tool": "analyze_content_security",
  "parameters": {
    "content": "# Configuration files\n.env\n.env.local\nconfig/database.yml\nsecrets/api-keys.json",
    "contentType": "configuration",
    "checkFilePatterns": true,
    "confidenceThreshold": 0.8
  }
}
```

#### Compliance-Focused Analysis

```json
{
  "tool": "analyze_content_security",
  "parameters": {
    "content": "Patient John Doe, SSN: 123-45-6789, Credit Card: 4111-1111-1111-1111",
    "contentType": "documentation",
    "enhancedMode": true,
    "complianceFrameworks": ["HIPAA", "PCI-DSS"],
    "strictValidation": true
  }
}
```

### Response Format

```typescript
interface SecurityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  line?: number;
  column?: number;
  pattern: string;
  description: string;
  recommendation: string;
  confidence: number;
  compliance?: string[];
  cwe?: string; // Common Weakness Enumeration
  owasp?: string; // OWASP category
}

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
      context: string;
    }>;
  };
  recommendations: string[];
  compliance: {
    gdpr: {
      compliant: boolean;
      issues: string[];
    };
    pci: {
      compliant: boolean;
      issues: string[];
    };
    hipaa: {
      compliant: boolean;
      issues: string[];
    };
    sox: {
      compliant: boolean;
      issues: string[];
    };
  };
  treeAnalysis?: {
    astFindings: Array<{
      nodeType: string;
      securityImplication: string;
      recommendation: string;
    }>;
  };
}
```

### Common Security Patterns Detected

#### Secrets and Credentials

- API keys (various formats)
- Database passwords
- JWT tokens
- OAuth tokens
- SSH private keys
- SSL certificates
- Cloud service credentials

#### Code Vulnerabilities

- SQL injection patterns
- XSS vulnerabilities
- Command injection
- Path traversal
- Insecure cryptography
- Hardcoded secrets

#### Configuration Issues

- Insecure defaults
- Debug mode enabled
- Overly permissive access
- Missing security headers
- Weak encryption settings

---

## 🛡️ generate_content_masking

**Purpose**: Create masked versions of content that hide sensitive information while preserving structure and readability.

### Parameters

```typescript
interface GenerateContentMaskingParams {
  content: string; // Required: Content to mask
  maskingLevel?: 'basic' | 'standard' | 'strict' | 'paranoid';
  preserveStructure?: boolean; // Keep original structure
  includeLineNumbers?: boolean; // Include line number references
  userDefinedPatterns?: string[]; // Custom patterns to mask
  maskingStrategy?: 'replacement' | 'redaction' | 'tokenization' | 'hashing';
  outputFormat?: 'text' | 'markdown' | 'json' | 'yaml';
  maskingCharacter?: string; // Character to use for masking (default: 'x')
  preserveLength?: boolean; // Keep original length of masked content
  contextPreservation?: boolean; // Preserve context around masked content
}
```

### Usage Examples

#### Basic Content Masking

```json
{
  "tool": "generate_content_masking",
  "parameters": {
    "content": "const apiKey = 'sk-1234567890abcdef';\nconst password = 'mySecretPassword123';",
    "maskingLevel": "standard",
    "preserveStructure": true
  }
}
```

#### Advanced Masking with Custom Patterns

```json
{
  "tool": "generate_content_masking",
  "parameters": {
    "content": "Database: postgresql://user:password@localhost:5432/mydb\nAPI_KEY=COMPANY_12345_SECRET",
    "maskingLevel": "strict",
    "preserveStructure": true,
    "userDefinedPatterns": ["postgresql://[^\\s]+", "COMPANY_[A-Z0-9_]+", "user:[^@]+@"],
    "maskingStrategy": "tokenization",
    "includeLineNumbers": true,
    "contextPreservation": true
  }
}
```

#### Paranoid Security Masking

```json
{
  "tool": "generate_content_masking",
  "parameters": {
    "content": "Credit Card: 4111-1111-1111-1111\nSSN: 123-45-6789\nEmail: john.doe@company.com",
    "maskingLevel": "paranoid",
    "maskingStrategy": "hashing",
    "preserveLength": false,
    "outputFormat": "markdown"
  }
}
```

#### Configuration File Masking

```json
{
  "tool": "generate_content_masking",
  "parameters": {
    "content": "database:\n  host: db.company.com\n  username: admin\n  password: super_secret_password\n  port: 5432",
    "maskingLevel": "strict",
    "outputFormat": "yaml",
    "preserveStructure": true,
    "maskingCharacter": "*"
  }
}
```

### Response Format

```typescript
interface ContentMaskingResponse {
  maskedContent: string;
  maskingReport: {
    patternsFound: Array<{
      pattern: string;
      originalValue: string;
      maskedValue: string;
      count: number;
      locations: Array<{
        line: number;
        column: number;
        context: string;
      }>;
    }>;
    maskingLevel: string;
    strategy: string;
    preservedStructure: boolean;
    totalMaskedItems: number;
  };
  securityAnalysis: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    remainingRisks: string[];
    recommendations: string[];
    complianceImpact: {
      gdpr: string;
      pci: string;
      hipaa: string;
    };
  };
  qualityMetrics: {
    structurePreservation: number; // 0-1 score
    readability: number; // 0-1 score
    securityLevel: number; // 0-1 score
  };
}
```

### Masking Strategies

#### Replacement Strategy

- Replace sensitive data with placeholder text
- Maintains readability and context
- Good for documentation and examples

#### Redaction Strategy

- Black out or remove sensitive information
- Highest security but may impact readability
- Best for legal or compliance requirements

#### Tokenization Strategy

- Replace with consistent tokens
- Allows for reverse mapping if needed
- Good for testing and development

#### Hashing Strategy

- Replace with cryptographic hashes
- Irreversible but deterministic
- Best for analytics while preserving privacy

---

## ✅ validate_content_masking

**Purpose**: Verify the quality and effectiveness of content masking operations.

### Parameters

```typescript
interface ValidateContentMaskingParams {
  originalContent: string; // Required: Original content
  maskedContent: string; // Required: Masked content
  strictValidation?: boolean; // Use strict validation rules
  expectedPatterns?: string[]; // Patterns that should be masked
  allowedPatterns?: string[]; // Patterns that can remain unmasked
  validationLevel?: 'basic' | 'comprehensive' | 'forensic';
  complianceCheck?: boolean; // Check compliance requirements
}
```

### Usage Examples

#### Basic Masking Validation

```json
{
  "tool": "validate_content_masking",
  "parameters": {
    "originalContent": "const apiKey = 'sk-1234567890abcdef';",
    "maskedContent": "const apiKey = 'sk-xxxxxxxxxxxxxxxx';",
    "strictValidation": true
  }
}
```

#### Comprehensive Validation with Patterns

```json
{
  "tool": "validate_content_masking",
  "parameters": {
    "originalContent": "Database: postgresql://user:password@localhost:5432/mydb",
    "maskedContent": "Database: postgresql://xxxx:xxxxxxxx@localhost:5432/mydb",
    "validationLevel": "comprehensive",
    "expectedPatterns": ["user:", "password"],
    "allowedPatterns": ["postgresql://", "localhost:5432", "/mydb"],
    "complianceCheck": true
  }
}
```

#### Forensic-Level Validation

```json
{
  "tool": "validate_content_masking",
  "parameters": {
    "originalContent": "SSN: 123-45-6789, Credit Card: 4111-1111-1111-1111",
    "maskedContent": "SSN: xxx-xx-xxxx, Credit Card: xxxx-xxxx-xxxx-xxxx",
    "validationLevel": "forensic",
    "strictValidation": true,
    "complianceCheck": true
  }
}
```

### Response Format

```typescript
interface MaskingValidationResponse {
  isValid: boolean;
  validationScore: number; // 0-1 score
  findings: {
    unmaskedSecrets: Array<{
      pattern: string;
      location: { line: number; column: number };
      severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
    overMasking: Array<{
      pattern: string;
      location: { line: number; column: number };
      impact: string;
    }>;
    structuralIssues: string[];
  };
  compliance: {
    gdpr: { compliant: boolean; issues: string[] };
    pci: { compliant: boolean; issues: string[] };
    hipaa: { compliant: boolean; issues: string[] };
  };
  recommendations: string[];
  riskAssessment: {
    dataLeakageRisk: 'low' | 'medium' | 'high' | 'critical';
    complianceRisk: 'low' | 'medium' | 'high' | 'critical';
    operationalRisk: 'low' | 'medium' | 'high' | 'critical';
  };
}
```

---

## 🚀 apply_basic_content_masking

**Purpose**: Quick and simple content masking for common use cases.

### Parameters

```typescript
interface ApplyBasicContentMaskingParams {
  content: string; // Required: Content to mask
  patterns?: string[]; // Specific patterns to mask
  maskingChar?: string; // Character for masking (default: 'x')
  preserveFormat?: boolean; // Keep original formatting
}
```

### Usage Examples

#### Quick API Key Masking

```json
{
  "tool": "apply_basic_content_masking",
  "parameters": {
    "content": "API_KEY=sk-1234567890abcdef",
    "patterns": ["sk-[a-zA-Z0-9]+"],
    "maskingChar": "*"
  }
}
```

#### Multiple Pattern Masking

```json
{
  "tool": "apply_basic_content_masking",
  "parameters": {
    "content": "Username: admin, Password: secret123, Token: abc123def456",
    "patterns": ["Password: [^,]+", "Token: [a-zA-Z0-9]+"],
    "preserveFormat": true
  }
}
```

### Response Format

```typescript
interface BasicMaskingResponse {
  maskedContent: string;
  patternsMatched: number;
  maskingApplied: boolean;
}
```

---

## 🔧 Advanced Security Patterns

### Enterprise Security Workflows

**Multi-Stage Security Analysis**:

```json
// 1. Initial security scan
{
  "tool": "analyze_content_security",
  "parameters": {
    "content": "source_content",
    "enhancedMode": true,
    "complianceFrameworks": ["SOX", "PCI-DSS"]
  }
}

// 2. Generate appropriate masking
{
  "tool": "generate_content_masking",
  "parameters": {
    "content": "source_content",
    "maskingLevel": "strict",
    "userDefinedPatterns": ["from_analysis_results"]
  }
}

// 3. Validate masking quality
{
  "tool": "validate_content_masking",
  "parameters": {
    "originalContent": "source_content",
    "maskedContent": "masked_result",
    "validationLevel": "comprehensive"
  }
}
```

### Automated Security Pipeline

```yaml
# Security analysis pipeline
security_pipeline:
  stages:
    - name: 'content_analysis'
      tool: 'analyze_content_security'
      config:
        enhancedMode: true
        strictValidation: true

    - name: 'risk_assessment'
      depends_on: 'content_analysis'
      condition: 'risk_level >= medium'

    - name: 'content_masking'
      tool: 'generate_content_masking'
      config:
        maskingLevel: 'strict'

    - name: 'validation'
      tool: 'validate_content_masking'
      config:
        validationLevel: 'forensic'
```

### Custom Security Rules Integration

```typescript
// Custom security rule integration
interface CustomSecurityRule {
  id: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  remediation: string;
  compliance: string[];
}

const enterpriseSecurityRules: CustomSecurityRule[] = [
  {
    id: 'CORP-001',
    pattern: /CORP_[A-Z0-9]{32}/g,
    severity: 'critical',
    description: 'Corporate API key detected',
    remediation: 'Replace with environment variable',
    compliance: ['SOX', 'Internal-Policy'],
  },
  {
    id: 'CORP-002',
    pattern: /internal-service-[a-f0-9]{40}/g,
    severity: 'high',
    description: 'Internal service token detected',
    remediation: 'Use service mesh authentication',
    compliance: ['Internal-Policy'],
  },
];
```

---

## 📊 Security Metrics and Monitoring

### Security Dashboard Integration

```json
{
  "security_metrics": {
    "scan_frequency": "continuous",
    "metrics_collected": [
      "secrets_detected_count",
      "vulnerability_severity_distribution",
      "compliance_score",
      "masking_effectiveness",
      "false_positive_rate"
    ],
    "alerting": {
      "critical_findings": "immediate",
      "high_findings": "within_1_hour",
      "compliance_violations": "immediate"
    }
  }
}
```

### Compliance Reporting

```typescript
interface ComplianceReport {
  framework: string;
  complianceScore: number;
  violations: Array<{
    rule: string;
    severity: string;
    count: number;
    examples: string[];
  }>;
  recommendations: string[];
  nextAuditDate: string;
}
```

---

## 🔗 Related Documentation

- **[Analysis Tools](analysis-tools.md)** - Project analysis with security focus
- **[Generation Tools](generation-tools.md)** - Secure content generation
- **[Validation Tools](validation-tools.md)** - Security validation workflows
- **[Custom Rules](.../how-to-guides/custom-rules.md)** - Creating security-specific rules

---

**Need help with security tools?** → **[Security Analysis Guide](.../how-to-guides/security-analysis.md)** or **[File an Issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues)**
