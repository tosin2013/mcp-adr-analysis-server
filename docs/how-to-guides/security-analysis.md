# 🔒 How-To: Security Analysis and Content Protection

**Goal**: Detect sensitive content, implement security controls, and ensure safe architectural documentation.

**When to use this guide**: Before sharing code, documentation, or architectural decisions; when implementing security controls; during security audits.

---

## 🚨 Quick Security Scan

### Scan Content for Secrets

**Most Common Use Case**: Check if content contains API keys, passwords, or sensitive data before sharing.

```json
{
  "tool": "analyze_content_security",
  "parameters": {
    "content": "const apiKey = 'sk-1234567890abcdef'; // Your code here",
    "enhancedMode": true,
    "enableTreeSitterAnalysis": true
  }
}
```

**Expected Result**:

```json
{
  "securityIssues": [
    {
      "type": "api_key",
      "severity": "high",
      "line": 1,
      "pattern": "sk-1234567890abcdef",
      "recommendation": "Replace with environment variable"
    }
  ],
  "riskLevel": "high",
  "maskingRecommended": true
}
```

### Auto-Mask Sensitive Content

```json
{
  "tool": "generate_content_masking",
  "parameters": {
    "content": "const apiKey = 'sk-1234567890abcdef';",
    "maskingLevel": "strict",
    "preserveStructure": true
  }
}
```

**Result**:

```javascript
const apiKey = 'sk-xxxxxxxxxxxxxxxx';
```

---

## 🔍 Comprehensive Security Analysis

### Project-Wide Security Scan

**Use Case**: Audit entire project for security issues before deployment or code review.

```json
{
  "tool": "analyze_project_ecosystem",
  "parameters": {
    "projectPath": ".",
    "securityFocused": true,
    "includeEnvironment": true,
    "enhancedMode": true
  }
}
```

**What it finds**:

- Hardcoded credentials in source code
- Insecure configuration patterns
- Exposed sensitive files
- Security anti-patterns in architecture
- Dependency vulnerabilities (basic detection)

### Environment-Specific Security Analysis

```json
{
  "tool": "analyze_environment",
  "parameters": {
    "includeSecurityAnalysis": true,
    "checkContainerization": true,
    "validateDeploymentSecurity": true
  }
}
```

**Detects**:

- Insecure environment variable patterns
- Container security misconfigurations
- Deployment security gaps
- Infrastructure security issues

---

## 🛡️ Content Masking Strategies

### Basic Masking (Quick Protection)

```json
{
  "tool": "generate_content_masking",
  "parameters": {
    "content": "Your content with secrets",
    "maskingLevel": "moderate",
    "preserveStructure": true
  }
}
```

**Masking Levels**:

- **`lenient`**: Only obvious secrets (API keys, passwords)
- **`moderate`**: Common sensitive patterns (default)
- **`strict`**: Aggressive masking including potential PII

### Advanced Masking (Custom Patterns)

```json
{
  "tool": "generate_content_masking",
  "parameters": {
    "content": "Company internal token: COMP_12345_SECRET",
    "maskingLevel": "strict",
    "userDefinedPatterns": ["COMP_[0-9]+_[A-Z]+", "internal-.*-token"],
    "preserveStructure": true,
    "includeLineNumbers": true
  }
}
```

### Validate Masking Quality

```json
{
  "tool": "validate_content_masking",
  "parameters": {
    "originalContent": "const key = 'secret123';",
    "maskedContent": "const key = 'xxxxxx';",
    "strictValidation": true
  }
}
```

**Checks**:

- No sensitive data leaked through masking
- Code structure preserved
- Functionality not broken by masking
- Masking consistency across similar patterns

---

## 🔐 Security Pattern Detection

### Common Security Anti-Patterns

The server automatically detects these security issues:

#### **Credential Exposure**

```javascript
// ❌ Detected as security issue
const apiKey = 'sk-1234567890abcdef';
const password = 'mypassword123';
const token = 'ghp_xxxxxxxxxxxxxxxxxxxx';

// ✅ Secure pattern
const apiKey = process.env.API_KEY;
```

#### **Insecure Configuration**

```yaml
# ❌ Detected as security issue
database:
  password: "plaintext_password"
  ssl: false

# ✅ Secure pattern
database:
  password: ${DB_PASSWORD}
  ssl: true
```

#### **Exposed Sensitive Files**

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

**Detects**:

- `.env` files in version control
- Private keys in repositories
- Configuration files with secrets
- Backup files with sensitive data

### Custom Security Rules

```json
{
  "tool": "generate_rules",
  "parameters": {
    "source": "security_focused",
    "projectPath": ".",
    "customPatterns": [
      {
        "name": "company_secrets",
        "pattern": "COMPANY_[A-Z_]+",
        "severity": "high",
        "description": "Company-specific secret pattern"
      }
    ]
  }
}
```

---

## 🏢 Enterprise Security Workflows

### Security-First ADR Generation

**Use Case**: Generate ADRs that include security considerations from the start.

```json
{
  "tool": "suggest_adrs",
  "parameters": {
    "projectPath": ".",
    "securityFocused": true,
    "includeSecurityDecisions": true,
    "analysisScope": "security"
  }
}
```

**Generates ADRs for**:

- Authentication and authorization strategies
- Data encryption decisions
- Security monitoring approaches
- Incident response procedures
- Compliance requirements

### Security Compliance Validation

```json
{
  "tool": "validate_adr_bootstrap",
  "parameters": {
    "adrDirectory": "./adrs",
    "complianceFramework": "security",
    "enableTreeSitterAnalysis": true
  }
}
```

**Validates**:

- Security decisions are documented
- Implementation matches security ADRs
- No security anti-patterns in code
- Compliance with security standards

### Deployment Security Readiness

```json
{
  "tool": "deployment_readiness",
  "parameters": {
    "operation": "security_audit",
    "projectPath": ".",
    "securityValidation": true,
    "enableTreeSitterAnalysis": true
  }
}
```

**Security Checks**:

- No hardcoded secrets in deployment artifacts
- Security configurations validated
- Container security best practices
- Infrastructure security compliance

---

## 🔧 Integration with Security Tools

### Pre-Commit Security Hooks

Add to your `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: local
    hooks:
      - id: mcp-security-scan
        name: MCP Security Analysis
        entry: mcp-security-scan.sh
        language: script
        files: \.(ts|js|py|yaml|yml|json)$
```

Create `mcp-security-scan.sh`:

```bash
#!/bin/bash
# Use MCP server for security scanning
echo "Running MCP security analysis..."

# Scan staged files for security issues
git diff --cached --name-only | while read file; do
  if [[ -f "$file" ]]; then
    content=$(cat "$file")
    # Use MCP tool to analyze content
    # (Implementation depends on your MCP client setup)
  fi
done
```

### CI/CD Security Integration

**GitHub Actions Example**:

```yaml
name: Security Analysis
on: [push, pull_request]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup MCP Server
        run: npm install -g mcp-adr-analysis-server
      - name: Run Security Analysis
        env:
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
          PROJECT_PATH: ${{ github.workspace }}
          EXECUTION_MODE: full
        run: |
          # Run security analysis via MCP
          # (Implementation depends on your CI setup)
```

---

## 🎯 Security Best Practices

### Content Preparation

**Before Analysis**:

1. **Never analyze production secrets** - use test/example data
2. **Use environment variables** for real credentials
3. **Sanitize logs and outputs** before sharing
4. **Review masked content** before distribution

### Masking Guidelines

**What to Always Mask**:

- API keys and tokens
- Passwords and passphrases
- Private keys and certificates
- Database connection strings
- Internal URLs and endpoints
- Personal identifiable information (PII)

**What to Consider Masking**:

- Internal project names
- Server hostnames
- File paths with usernames
- Email addresses
- Phone numbers

### Validation Checklist

Before sharing any content:

```json
{
  "tool": "analyze_content_security",
  "parameters": {
    "content": "your final content",
    "enhancedMode": true,
    "strictValidation": true,
    "enableTreeSitterAnalysis": true
  }
}
```

**Verify**:

- ✅ No sensitive patterns detected
- ✅ Masking preserves functionality
- ✅ No information leakage through context
- ✅ Compliance with security policies

---

## 🚨 Incident Response

### Suspected Secret Exposure

**If you accidentally exposed secrets**:

1. **Immediate Assessment**

```json
{
  "tool": "analyze_content_security",
  "parameters": {
    "content": "suspected exposed content",
    "enhancedMode": true,
    "urgentMode": true
  }
}
```

2. **Generate Incident Report**

```json
{
  "tool": "generate_security_incident_report",
  "parameters": {
    "incidentType": "credential_exposure",
    "affectedContent": "description of what was exposed",
    "timeline": "when exposure occurred"
  }
}
```

3. **Remediation Steps**

- Rotate exposed credentials immediately
- Review access logs for unauthorized usage
- Update security patterns to prevent recurrence
- Document lessons learned in ADRs

### False Positive Handling

**When security tools flag legitimate content**:

```json
{
  "tool": "configure_security_whitelist",
  "parameters": {
    "projectPath": ".",
    "whitelistPatterns": ["example-api-key-.*", "test-token-.*", "demo-secret-.*"],
    "justification": "These are example/test patterns, not real secrets"
  }
}
```

---

## 📊 Security Metrics and Reporting

### Security Dashboard

```json
{
  "tool": "generate_security_dashboard",
  "parameters": {
    "projectPath": ".",
    "includeMetrics": true,
    "timeframe": "last_30_days"
  }
}
```

**Tracks**:

- Security issues found and resolved
- Masking operations performed
- Security ADR compliance
- Trend analysis over time

### Compliance Reporting

```json
{
  "tool": "generate_compliance_report",
  "parameters": {
    "framework": "SOC2", // or "GDPR", "HIPAA", etc.
    "projectPath": ".",
    "includeEvidence": true
  }
}
```

---

## 🔗 Related Documentation

- **[Environment Configuration](./reference/environment-config.md)** - Security-related environment variables
- **[Deployment Readiness](deployment-readiness.md)** - Security validation before deployment
- **[Troubleshooting](troubleshooting.md)** - Security-related issues and solutions
- **[API Reference](./reference/api-reference.md)** - Complete security tool documentation

---

**Security concern not covered here?** → **[File a Security Issue](https://github.com/tosin2013/mcp-adr-analysis-server/security/advisories/new)** for sensitive matters or **[General Issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues)** for questions.
