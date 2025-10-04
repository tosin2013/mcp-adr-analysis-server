# ⚙️ How-To: Custom Rules and Patterns

**Create organization-specific rules, patterns, and validation logic for your MCP ADR Analysis Server.**

**When to use this guide**: Implementing company-specific architectural standards, custom security patterns, or organization-specific validation rules.

---

## 🎯 Quick Custom Rules Setup

### Basic Custom Rule Creation

**Most Common Use Case**: Add organization-specific security patterns and architectural standards.

```json
{
  "tool": "generate_rules",
  "parameters": {
    "source": "custom",
    "projectPath": ".",
    "customPatterns": [
      {
        "name": "company_api_key_pattern",
        "pattern": "COMPANY_[A-Z0-9]{32}",
        "severity": "high",
        "description": "Company-specific API key format detected",
        "category": "security"
      },
      {
        "name": "deprecated_framework_usage",
        "pattern": "import.*legacy-framework",
        "severity": "medium",
        "description": "Usage of deprecated legacy framework",
        "category": "architecture"
      }
    ]
  }
}
```

### Organization Rule Configuration

```json
{
  "organization_rules": {
    "company": "YourCompany",
    "version": "1.0.0",
    "categories": {
      "security": {
        "enabled": true,
        "severity_threshold": "medium"
      },
      "architecture": {
        "enabled": true,
        "severity_threshold": "low"
      },
      "compliance": {
        "enabled": true,
        "severity_threshold": "high"
      }
    }
  }
}
```

---

## 🔧 Advanced Rule Types

### 1. Security Pattern Rules

**Custom security patterns for your organization:**

```json
{
  "tool": "create_rule_set",
  "parameters": {
    "ruleSetName": "enterprise-security-rules",
    "rules": [
      {
        "id": "SEC-001",
        "name": "internal_service_token",
        "pattern": "IST_[a-f0-9]{40}",
        "severity": "critical",
        "description": "Internal service token detected",
        "remediation": "Replace with environment variable",
        "compliance": ["SOX", "PCI-DSS"]
      },
      {
        "id": "SEC-002",
        "name": "database_connection_string",
        "pattern": "Server=.*Password=.*",
        "severity": "high",
        "description": "Database connection string with embedded password",
        "remediation": "Use connection string builder with secure credential storage"
      },
      {
        "id": "SEC-003",
        "name": "aws_access_key",
        "pattern": "AKIA[0-9A-Z]{16}",
        "severity": "critical",
        "description": "AWS access key detected",
        "remediation": "Use IAM roles or AWS Secrets Manager"
      }
    ]
  }
}
```

### 2. Architecture Compliance Rules

**Enforce architectural standards:**

```json
{
  "architecture_rules": [
    {
      "id": "ARCH-001",
      "name": "microservice_naming_convention",
      "pattern": "^[a-z]+(-[a-z]+)*-service$",
      "applies_to": ["service_names", "repository_names"],
      "severity": "medium",
      "description": "Microservice names must follow kebab-case-service pattern"
    },
    {
      "id": "ARCH-002",
      "name": "api_versioning_required",
      "pattern": "/api/v[0-9]+/",
      "applies_to": ["api_endpoints"],
      "severity": "high",
      "description": "All API endpoints must include version number"
    },
    {
      "id": "ARCH-003",
      "name": "database_migration_naming",
      "pattern": "^[0-9]{14}_[a-z_]+\\.(sql|js)$",
      "applies_to": ["migration_files"],
      "severity": "medium",
      "description": "Database migrations must follow timestamp_description pattern"
    }
  ]
}
```

### 3. Technology Stack Rules

**Control technology choices:**

```json
{
  "technology_rules": [
    {
      "id": "TECH-001",
      "name": "approved_dependencies",
      "type": "whitelist",
      "patterns": ["^@company/.*", "^react$", "^express$", "^lodash$"],
      "severity": "high",
      "description": "Only approved dependencies allowed"
    },
    {
      "id": "TECH-002",
      "name": "banned_dependencies",
      "type": "blacklist",
      "patterns": ["^moment$", "^request$", "^bower$"],
      "severity": "critical",
      "description": "Banned dependencies must not be used",
      "alternatives": {
        "moment": "date-fns or dayjs",
        "request": "axios or fetch",
        "bower": "npm or yarn"
      }
    }
  ]
}
```

---

## 🏗️ Rule Implementation Patterns

### 1. File-Based Rules

**Create rules that analyze file structures:**

```typescript
// Custom file structure rules
interface FileStructureRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  check: (projectPath: string) => RuleViolation[];
}

const fileStructureRules: FileStructureRule[] = [
  {
    id: 'FS-001',
    name: 'required_documentation',
    description: 'Required documentation files must be present',
    severity: 'medium',
    check: (projectPath: string) => {
      const requiredFiles = [
        'README.md',
        '../../CONTRIBUTING.md',
        './architectur../../README.md',
        './ap../../README.md',
      ];

      const violations: RuleViolation[] = [];

      for (const file of requiredFiles) {
        if (!fs.existsSync(path.join(projectPath, file))) {
          violations.push({
            ruleId: 'FS-001',
            file: file,
            message: `Required file ${file} is missing`,
            severity: 'medium',
          });
        }
      }

      return violations;
    },
  },
];
```

### 2. Code Pattern Rules

**Analyze code patterns with tree-sitter:**

```typescript
// Custom code pattern analysis
interface CodePatternRule {
  id: string;
  language: string;
  pattern: string;
  severity: 'low' | medium' | 'high' | 'critical';
  message: string;
}

const codePatternRules: CodePatternRule[] = [
  {
    id: 'CODE-001',
    language: 'typescript',
    pattern: 'console.log',
    severity: 'low',
    message: 'Console.log statements should be removed before production'
  },
  {
    id: 'CODE-002',
    language: 'javascript',
    pattern: 'eval\\(',
    severity: 'critical',
    message: 'eval() usage is prohibited for security reasons'
  },
  {
    id: 'CODE-003',
    language: 'python',
    pattern: 'import os.*system',
    severity: 'high',
    message: 'Direct os.system() calls pose security risks'
  }
];
```

### 3. Configuration Rules

**Validate configuration files:**

```json
{
  "configuration_rules": [
    {
      "id": "CONFIG-001",
      "name": "docker_security_config",
      "file_pattern": "Dockerfile*",
      "rules": [
        {
          "pattern": "FROM.*:latest",
          "severity": "medium",
          "message": "Avoid using 'latest' tag in production Dockerfiles"
        },
        {
          "pattern": "USER root",
          "severity": "high",
          "message": "Running containers as root is a security risk"
        }
      ]
    },
    {
      "id": "CONFIG-002",
      "name": "kubernetes_security_config",
      "file_pattern": "*.yaml",
      "rules": [
        {
          "pattern": "privileged:\\s*true",
          "severity": "critical",
          "message": "Privileged containers are not allowed"
        },
        {
          "pattern": "runAsUser:\\s*0",
          "severity": "high",
          "message": "Running as root user (UID 0) is not allowed"
        }
      ]
    }
  ]
}
```

---

## 🔄 Rule Lifecycle Management

### 1. Rule Versioning

```json
{
  "rule_versioning": {
    "version": "2.1.0",
    "changelog": [
      {
        "version": "2.1.0",
        "date": "2024-01-15",
        "changes": [
          "Added new security patterns for API keys",
          "Updated severity levels for deprecated frameworks",
          "Fixed false positives in database connection detection"
        ]
      },
      {
        "version": "2.0.0",
        "date": "2024-01-01",
        "changes": [
          "Breaking: Changed rule ID format",
          "Added compliance mapping",
          "Introduced rule categories"
        ]
      }
    ]
  }
}
```

### 2. Rule Testing Framework

```typescript
// Rule testing framework
interface RuleTest {
  ruleId: string;
  testCases: {
    positive: string[]; // Should trigger the rule
    negative: string[]; // Should not trigger the rule
  };
}

const ruleTests: RuleTest[] = [
  {
    ruleId: 'SEC-001',
    testCases: {
      positive: [
        'const token = "IST_a1b2c3d4e5f6789012345678901234567890abcd";',
        'IST_1234567890abcdef1234567890abcdef12345678',
      ],
      negative: [
        'const token = process.env.SERVICE_TOKEN;',
        'const token = "DIFFERENT_FORMAT_123";',
      ],
    },
  },
];

// Test runner
function testRules(rules: CustomRule[], tests: RuleTest[]): TestResults {
  const results: TestResults = { passed: 0, failed: 0, details: [] };

  for (const test of tests) {
    const rule = rules.find(r => r.id === test.ruleId);
    if (!rule) continue;

    // Test positive cases (should match)
    for (const positiveCase of test.testCases.positive) {
      const matches = rule.pattern.test(positiveCase);
      if (matches) {
        results.passed++;
      } else {
        results.failed++;
        results.details.push({
          ruleId: test.ruleId,
          case: positiveCase,
          expected: 'match',
          actual: 'no match',
        });
      }
    }

    // Test negative cases (should not match)
    for (const negativeCase of test.testCases.negative) {
      const matches = rule.pattern.test(negativeCase);
      if (!matches) {
        results.passed++;
      } else {
        results.failed++;
        results.details.push({
          ruleId: test.ruleId,
          case: negativeCase,
          expected: 'no match',
          actual: 'match',
        });
      }
    }
  }

  return results;
}
```

### 3. Rule Deployment

```yaml
# .github/workflows/deploy-custom-rules.yml
name: Deploy Custom Rules

on:
  push:
    paths: ['rules/**']
  pull_request:
    paths: ['rules/**']

jobs:
  validate-rules:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate Rule Syntax
        run: |
          echo "🔍 Validating rule syntax..."
          # Validate JSON schema, regex patterns, etc.

      - name: Test Rules
        run: |
          echo "🧪 Running rule tests..."
          # Run rule test suite

      - name: Security Scan Rules
        run: |
          echo "🔒 Scanning rules for security issues..."
          # Ensure rules don't contain sensitive data

  deploy-rules:
    needs: validate-rules
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Production
        run: |
          echo "🚀 Deploying rules to production..."
          # Deploy validated rules
```

---

## 📊 Rule Analytics and Monitoring

### 1. Rule Performance Metrics

```json
{
  "tool": "analyze_rule_performance",
  "parameters": {
    "timeframe": "last_30_days",
    "metrics": [
      "rule_execution_count",
      "rule_violation_count",
      "false_positive_rate",
      "rule_execution_time"
    ]
  }
}
```

### 2. Rule Effectiveness Dashboard

```typescript
// Rule effectiveness tracking
interface RuleMetrics {
  ruleId: string;
  executions: number;
  violations: number;
  falsePositives: number;
  averageExecutionTime: number;
  effectiveness: number; // 0-1 score
}

function calculateRuleEffectiveness(metrics: RuleMetrics): number {
  const violationRate = metrics.violations / metrics.executions;
  const falsePositiveRate = metrics.falsePositives / metrics.violations;
  const performanceScore = Math.min(1, 100 / metrics.averageExecutionTime);

  return violationRate * (1 - falsePositiveRate) * performanceScore;
}
```

### 3. Rule Optimization

```json
{
  "rule_optimization": {
    "performance_tuning": {
      "regex_optimization": true,
      "caching_strategy": "aggressive",
      "parallel_execution": true
    },
    "accuracy_improvement": {
      "machine_learning": true,
      "feedback_loop": true,
      "continuous_training": true
    }
  }
}
```

---

## 🎯 Industry-Specific Rule Templates

### 1. Financial Services Rules

```json
{
  "financial_services_rules": [
    {
      "id": "FIN-001",
      "name": "pci_dss_compliance",
      "pattern": "\\b[0-9]{4}[\\s-]?[0-9]{4}[\\s-]?[0-9]{4}[\\s-]?[0-9]{4}\\b",
      "severity": "critical",
      "description": "Credit card number detected",
      "compliance": ["PCI-DSS"]
    },
    {
      "id": "FIN-002",
      "name": "ssn_detection",
      "pattern": "\\b[0-9]{3}-[0-9]{2}-[0-9]{4}\\b",
      "severity": "critical",
      "description": "Social Security Number detected",
      "compliance": ["SOX", "GLBA"]
    }
  ]
}
```

### 2. Healthcare Rules

```json
{
  "healthcare_rules": [
    {
      "id": "HEALTH-001",
      "name": "phi_detection",
      "pattern": "\\b(patient|medical|diagnosis|treatment)\\b.*\\b[A-Z][a-z]+\\s[A-Z][a-z]+\\b",
      "severity": "critical",
      "description": "Potential PHI (Protected Health Information) detected",
      "compliance": ["HIPAA"]
    },
    {
      "id": "HEALTH-002",
      "name": "medical_record_number",
      "pattern": "MRN[:\\s]*[0-9]{6,10}",
      "severity": "high",
      "description": "Medical Record Number detected"
    }
  ]
}
```

### 3. Government/Defense Rules

```json
{
  "government_rules": [
    {
      "id": "GOV-001",
      "name": "classified_marking",
      "pattern": "\\b(CONFIDENTIAL|SECRET|TOP\\s+SECRET)\\b",
      "severity": "critical",
      "description": "Classification marking detected"
    },
    {
      "id": "GOV-002",
      "name": "export_controlled",
      "pattern": "\\b(ITAR|EAR|export\\s+controlled)\\b",
      "severity": "high",
      "description": "Export controlled information detected"
    }
  ]
}
```

---

## 🔧 Integration with MCP Tools

### 1. Rule Integration with Analysis Tools

```json
{
  "tool": "analyze_project_ecosystem",
  "parameters": {
    "projectPath": ".",
    "customRules": {
      "enabled": true,
      "ruleSet": "enterprise-security-rules",
      "categories": ["security", "architecture", "compliance"]
    }
  }
}
```

### 2. Rule Integration with Content Masking

```json
{
  "tool": "generate_content_masking",
  "parameters": {
    "content": "Sample content with secrets",
    "customPatterns": ["COMPANY_[A-Z0-9]{32}", "IST_[a-f0-9]{40}"],
    "organizationRules": "enterprise-security-rules"
  }
}
```

### 3. Rule Integration with Validation

```json
{
  "tool": "validate_rules",
  "parameters": {
    "ruleSet": "enterprise-security-rules",
    "validationType": "comprehensive",
    "includePerformanceTest": true
  }
}
```

---

## 📚 Best Practices

### 1. Rule Design Principles

- **Specificity**: Make rules specific enough to avoid false positives
- **Performance**: Optimize regex patterns for performance
- **Maintainability**: Use clear naming and documentation
- **Testability**: Include comprehensive test cases

### 2. Rule Management

- **Version Control**: Track rule changes with proper versioning
- **Testing**: Implement automated testing for all rules
- **Monitoring**: Monitor rule performance and effectiveness
- **Documentation**: Maintain clear documentation for each rule

### 3. Organization Adoption

- **Gradual Rollout**: Introduce rules gradually to avoid disruption
- **Training**: Provide training on new rules and patterns
- **Feedback**: Collect feedback and iterate on rules
- **Compliance**: Ensure rules align with organizational compliance requirements

---

## 🔗 Related Documentation

- **[Security Analysis](security-analysis.md)** - Security-focused rule implementation
- **[API Reference](./reference/api-reference.md)** - Complete tool documentation
- **[Troubleshooting](troubleshooting.md)** - Rule-related troubleshooting

---

**Need help creating custom rules?** → **[File an Issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues)** or check the **[Rule Examples Repository](https://github.com/tosin2013/mcp-adr-rules-examples)**
