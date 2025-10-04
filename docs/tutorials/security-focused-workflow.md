# 🔒 Tutorial: Security-First Architecture Workflow

**Learn how to integrate security analysis into your architectural decision-making process from day one.**

**Time**: 90 minutes  
**Level**: Intermediate  
**Prerequisites**: Completed [First Steps Tutorial](01-first-steps.md), basic understanding of security concepts

---

## 🎯 What You'll Learn

By the end of this tutorial, you'll be able to:

- Set up a security-first architectural analysis workflow
- Detect and mask sensitive content automatically
- Generate security-focused ADRs
- Validate deployment security readiness
- Integrate security checks into your development process

## 🛠️ Prerequisites Check

Before starting, ensure you have:

```bash
# 1. MCP server installed and working
mcp-adr-analysis-server --test

# 2. API key configured
echo $OPENROUTER_API_KEY | head -c 10

# 3. A test project (we'll create one if needed)
mkdir -p ~/security-tutorial-project
cd ~/security-tutorial-project
```

---

## 📋 Step 1: Project Setup with Security Focus

### Create a Sample Project with Security Issues

Let's create a realistic project that contains common security vulnerabilities:

```bash
# Create project structure
mkdir -p src config ./adrs
cd ~/security-tutorial-project

# Create package.json
cat > package.json << 'EOF'
{
  "name": "secure-api-service",
  "version": "1.0.0",
  "description": "A secure API service with authentication",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "helmet": "^6.0.0"
  }
}
EOF

# Create source code with intentional security issues
cat > src/index.js << 'EOF'
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();

// ❌ Security Issue: Hardcoded secret
const JWT_SECRET = "super-secret-key-12345";
const API_KEY = "sk-1234567890abcdef";

// ❌ Security Issue: No rate limiting
app.use(express.json());

// ❌ Security Issue: Overly permissive CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

// Authentication endpoint
app.post('/auth', async (req, res) => {
  const { username, password } = req.body;

  // ❌ Security Issue: Weak password validation
  if (password.length < 4) {
    return res.status(400).json({ error: 'Password too short' });
  }

  // ❌ Security Issue: SQL injection vulnerable (simulated)
  const query = `SELECT * FROM users WHERE username = '${username}'`;

  const token = jwt.sign({ username }, JWT_SECRET);
  res.json({ token });
});

// Protected endpoint
app.get('/api/data', (req, res) => {
  const token = req.headers.authorization;

  // ❌ Security Issue: No proper token validation
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  res.json({ data: 'sensitive information' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOF

# Create configuration with secrets
cat > config/database.yml << 'EOF'
development:
  adapter: postgresql
  database: secure_api_dev
  username: admin
  password: "admin123"  # ❌ Security Issue: Weak password in config
  host: localhost
  port: 5432

production:
  adapter: postgresql
  database: secure_api_prod
  username: prod_user
  password: "P@ssw0rd123!"  # ❌ Security Issue: Password in config
  host: db.company.com
  port: 5432
EOF

# Create Docker configuration with security issues
cat > Dockerfile << 'EOF'
FROM node:16

# ❌ Security Issue: Running as root
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# ❌ Security Issue: Exposed port without restrictions
EXPOSE 3000

CMD ["npm", "start"]
EOF
```

### Initialize Git and Create Initial Commit

```bash
git init
git add .
git commit -m "Initial commit with security vulnerabilities for tutorial"
```

---

## 🔍 Step 2: Security Analysis Workflow

### 2.1 Initial Security Scan

Now let's use the MCP server to analyze our project for security issues:

**In your MCP client (Claude, Cline, etc.), run:**

```json
{
  "tool": "analyze_project_ecosystem",
  "parameters": {
    "projectPath": "~/security-tutorial-project",
    "securityFocused": true,
    "includeEnvironment": true,
    "enhancedMode": true
  }
}
```

**Expected Results**: The analysis should identify:

- Hardcoded secrets in source code
- Weak security configurations
- Missing security headers
- Vulnerable authentication patterns
- Container security issues

### 2.2 Content Security Analysis

Let's analyze specific files for security issues:

```json
{
  "tool": "analyze_content_security",
  "parameters": {
    "content": "const JWT_SECRET = \"super-secret-key-12345\";\nconst API_KEY = \"sk-1234567890abcdef\";",
    "enhancedMode": true,
    "enableTreeSitterAnalysis": true
  }
}
```

**What to Look For**:

- Detection of hardcoded secrets
- Severity levels (high, medium, low)
- Specific line numbers
- Remediation recommendations

### 2.3 Environment Security Analysis

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

---

## 🛡️ Step 3: Content Masking and Sanitization

### 3.1 Auto-Mask Sensitive Content

Before sharing or documenting our code, let's mask the sensitive content:

```json
{
  "tool": "generate_content_masking",
  "parameters": {
    "content": "const JWT_SECRET = \"super-secret-key-12345\";\nconst API_KEY = \"sk-1234567890abcdef\";",
    "maskingLevel": "strict",
    "preserveStructure": true,
    "includeLineNumbers": true
  }
}
```

**Expected Output**:

```javascript
const JWT_SECRET = 'xxxxxxxxxxxxxxxxxxxxx';
const API_KEY = 'sk-xxxxxxxxxxxxxxxx';
```

### 3.2 Validate Masking Quality

```json
{
  "tool": "validate_content_masking",
  "parameters": {
    "originalContent": "const JWT_SECRET = \"super-secret-key-12345\";",
    "maskedContent": "const JWT_SECRET = \"xxxxxxxxxxxxxxxxxxxxx\";",
    "strictValidation": true
  }
}
```

### 3.3 Custom Security Patterns

Add project-specific security patterns:

```json
{
  "tool": "generate_content_masking",
  "parameters": {
    "content": "const COMPANY_API_KEY = \"COMP_12345_SECRET\";",
    "maskingLevel": "strict",
    "userDefinedPatterns": ["COMP_[0-9]+_[A-Z]+", "company-.*-token"],
    "preserveStructure": true
  }
}
```

---

## 📋 Step 4: Security-Focused ADR Generation

### 4.1 Generate Security ADRs

Let's create ADRs that address the security issues we found:

```json
{
  "tool": "suggest_adrs",
  "parameters": {
    "projectPath": "~/security-tutorial-project",
    "securityFocused": true,
    "includeSecurityDecisions": true,
    "analysisScope": "security",
    "maxSuggestions": 5
  }
}
```

**Expected ADR Topics**:

1. Secret Management Strategy
2. Authentication and Authorization Architecture
3. API Security Controls
4. Container Security Configuration
5. Input Validation and Sanitization

### 4.2 Create Specific Security ADRs

Let's create a detailed ADR for secret management:

```json
{
  "tool": "generate_adr_from_decision",
  "parameters": {
    "decisionData": {
      "title": "Secret Management and Environment Variable Strategy",
      "context": "Application contains hardcoded secrets in source code, creating security vulnerabilities and making secret rotation impossible.",
      "decision": "Implement environment variable-based secret management with proper validation and fallback mechanisms.",
      "rationale": "Environment variables provide secure secret storage, enable different configurations per environment, and support secret rotation without code changes.",
      "consequences": [
        "Positive: Secrets no longer exposed in source code",
        "Positive: Different secrets per environment (dev/staging/prod)",
        "Positive: Enables automated secret rotation",
        "Challenge: Requires proper environment setup in deployment",
        "Challenge: Need fallback mechanisms for missing variables"
      ]
    },
    "template": "madr",
    "outputPath": "././adrs/001-secret-management-strategy.md"
  }
}
```

### 4.3 Generate Implementation Tasks

```json
{
  "tool": "generate_adr_todo",
  "parameters": {
    "adrDirectory": "./adrs",
    "outputPath": "SECURITY_TODO.md",
    "phase": "both",
    "linkAdrs": true,
    "includeRules": true,
    "securityFocused": true
  }
}
```

---

## 🔧 Step 5: Implement Security Fixes

### 5.1 Fix Hardcoded Secrets

Update your source code to use environment variables:

```javascript
// ✅ Secure version
const JWT_SECRET =
  process.env.JWT_SECRET ||
  (() => {
    throw new Error('JWT_SECRET environment variable is required');
  })();

const API_KEY =
  process.env.API_KEY ||
  (() => {
    throw new Error('API_KEY environment variable is required');
  })();
```

### 5.2 Create Environment Configuration

```bash
# Create .env.example (safe to commit)
cat > .env.example << 'EOF'
# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-here

# External API Configuration
API_KEY=your-api-key-here

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=secure_api_dev
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# Server Configuration
PORT=3000
NODE_ENV=development
EOF

# Create actual .env (DO NOT commit)
cp .env.example .env
# Edit .env with real values

# Add .env to .gitignore
echo ".env" >> .gitignore
```

### 5.3 Update Docker Configuration

```dockerfile
# ✅ Secure Dockerfile
FROM node:16-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY --chown=nextjs:nodejs . .

# Switch to non-root user
USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
```

---

## ✅ Step 6: Security Validation

### 6.1 Re-analyze After Fixes

```json
{
  "tool": "analyze_content_security",
  "parameters": {
    "content": "const JWT_SECRET = process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET required'); })();",
    "enhancedMode": true,
    "enableTreeSitterAnalysis": true
  }
}
```

**Expected Result**: No security issues detected ✅

### 6.2 Deployment Readiness Check

```json
{
  "tool": "deployment_readiness",
  "parameters": {
    "operation": "security_audit",
    "projectPath": "~/security-tutorial-project",
    "securityValidation": true,
    "enableTreeSitterAnalysis": true
  }
}
```

### 6.3 Generate Security Compliance Report

```json
{
  "tool": "generate_compliance_report",
  "parameters": {
    "framework": "OWASP",
    "projectPath": "~/security-tutorial-project",
    "includeEvidence": true
  }
}
```

---

## 🔄 Step 7: Continuous Security Workflow

### 7.1 Pre-Commit Security Hooks

Create a pre-commit hook for security scanning:

```bash
# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: local
    hooks:
      - id: security-scan
        name: MCP Security Analysis
        entry: scripts/security-scan.sh
        language: script
        files: \.(js|ts|py|yaml|yml|json)$
        pass_filenames: false
EOF

# Create security scan script
mkdir -p scripts
cat > scripts/security-scan.sh << 'EOF'
#!/bin/bash
echo "🔒 Running security analysis..."

# Check for common security patterns
if grep -r "password.*=" src/ config/ 2>/dev/null; then
  echo "❌ Found potential hardcoded passwords"
  exit 1
fi

if grep -r "secret.*=" src/ config/ 2>/dev/null; then
  echo "❌ Found potential hardcoded secrets"
  exit 1
fi

if grep -r "api[_-]key.*=" src/ config/ 2>/dev/null; then
  echo "❌ Found potential hardcoded API keys"
  exit 1
fi

echo "✅ Basic security scan passed"
EOF

chmod +x scripts/security-scan.sh
```

### 7.2 CI/CD Security Integration

Create GitHub Actions workflow:

```yaml
# .github/workflows/security.yml
name: Security Analysis

on: [push, pull_request]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install MCP Server
        run: npm install -g mcp-adr-analysis-server

      - name: Run Security Analysis
        env:
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
          PROJECT_PATH: ${{ github.workspace }}
          EXECUTION_MODE: full
        run: |
          echo "Running MCP security analysis..."
          # Note: Actual implementation would use MCP client
          # This is a placeholder for the workflow structure
```

### 7.3 Security Monitoring Dashboard

```json
{
  "tool": "generate_security_dashboard",
  "parameters": {
    "projectPath": "~/security-tutorial-project",
    "includeMetrics": true,
    "timeframe": "last_30_days"
  }
}
```

---

## 🎓 Step 8: Advanced Security Patterns

### 8.1 Custom Security Rules

```json
{
  "tool": "generate_rules",
  "parameters": {
    "source": "security_focused",
    "projectPath": "~/security-tutorial-project",
    "customPatterns": [
      {
        "name": "weak_jwt_secret",
        "pattern": "jwt.*secret.*[\"'][^\"']{1,20}[\"']",
        "severity": "high",
        "description": "JWT secret appears to be too short or weak"
      },
      {
        "name": "sql_injection_risk",
        "pattern": "SELECT.*\\$\\{.*\\}",
        "severity": "high",
        "description": "Potential SQL injection vulnerability"
      }
    ]
  }
}
```

### 8.2 Security Testing Integration

```json
{
  "tool": "validate_adr_bootstrap",
  "parameters": {
    "adrDirectory": "./adrs",
    "complianceFramework": "security",
    "enableTreeSitterAnalysis": true,
    "securityValidation": true
  }
}
```

---

## 📊 Step 9: Measuring Success

### 9.1 Security Metrics

Track your security improvements:

```json
{
  "tool": "compare_adr_progress",
  "parameters": {
    "todoPath": "SECURITY_TODO.md",
    "adrDirectory": "./adrs",
    "projectPath": "~/security-tutorial-project",
    "securityFocused": true,
    "includeMetrics": true
  }
}
```

### 9.2 Before/After Comparison

**Before Security Fixes**:

- 🔴 5+ hardcoded secrets
- 🔴 No input validation
- 🔴 Weak authentication
- 🔴 Container running as root
- 🔴 No security headers

**After Security Fixes**:

- ✅ Environment variable secrets
- ✅ Input validation implemented
- ✅ Strong authentication patterns
- ✅ Non-root container user
- ✅ Security headers configured

---

## 🎯 Key Takeaways

### Security-First Principles Learned

1. **Proactive Security Analysis**: Analyze for security issues before they become problems
2. **Automated Content Masking**: Never expose secrets in documentation or sharing
3. **Security-Focused ADRs**: Document security decisions as architectural choices
4. **Continuous Validation**: Integrate security checks into development workflow
5. **Compliance Tracking**: Maintain evidence of security practices

### Workflow Integration

- **Pre-Development**: Security analysis of requirements and design
- **During Development**: Real-time security scanning and masking
- **Pre-Deployment**: Security readiness validation
- **Post-Deployment**: Continuous security monitoring

### Tools Mastered

- `analyze_project_ecosystem` with security focus
- `analyze_content_security` for threat detection
- `generate_content_masking` for safe sharing
- `deployment_readiness` with security validation
- `suggest_adrs` for security-focused decisions

---

## 🚀 Next Steps

### Immediate Actions

1. **Apply to Real Projects**: Use this workflow on your actual projects
2. **Customize Patterns**: Add organization-specific security patterns
3. **Team Training**: Share this workflow with your development team
4. **CI/CD Integration**: Implement automated security scanning

### Advanced Learning

- **[Large Team Scaling](./how-to-guides/large-team-scaling.md)** - Enterprise security workflows
- **[CI/CD Integration](./how-to-guides/cicd-integration.md)** - Automated security validation
- **[Custom Rules](./how-to-guides/custom-rules.md)** - Organization-specific security rules

### Community Contribution

- Share your security patterns with the community
- Contribute to security rule improvements
- Report security vulnerabilities responsibly

---

## 📚 Resources

- **[Security Analysis Guide](./how-to-guides/security-analysis.md)** - Comprehensive security reference
- **[Environment Configuration](./reference/environment-config.md)** - Security-related settings
- **[Troubleshooting](./how-to-guides/troubleshooting.md)** - Security-related issues

---

**🎉 Congratulations!** You've completed the Security-First Architecture Workflow tutorial. You now have the skills to integrate security analysis into every stage of your architectural decision-making process.

**Questions or issues?** → **[File an Issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues)** or check the **[Security Guide](./how-to-guides/security-analysis.md)**
