# IDE Rules Generation Quickstart Guide

## 🚀 Quick Start (2 minutes)

Generate IDE-specific rules for your project in Claude.ai or any MCP-enabled environment.

### Step 1: Basic Command
```bash
/generate-ide-rules --ide cursor --project .
```

This analyzes your project and generates Cursor IDE rules optimized for your codebase.

### Step 2: Review Generated Rules
The command creates customized rules in `./ide-rules/cursor/` including:
- AI assistant configuration
- Code completion patterns
- Architecture compliance rules
- Security best practices

### Step 3: Apply to Your IDE
Copy the generated configuration to your IDE's settings location.

---

## 📋 Complete Examples by IDE

### Cursor IDE
```bash
# For a React/TypeScript project with security focus
/generate-ide-rules --ide cursor --project . \
  --include-workflows \
  --security-focus \
  --team-size small

# Output includes:
# - TypeScript-aware completions
# - React component patterns
# - Security scanning workflows
# - Team collaboration settings
```

### Windsurf IDE
```bash
# For a Python/Django project with AI pair programming
/generate-ide-rules --ide windsurf --project . \
  --include-snippets \
  --include-shortcuts \
  --experience-level mixed

# Output includes:
# - Django-specific AI prompts
# - Python code generation rules
# - Custom snippets for models/views
# - Keyboard shortcuts for common tasks
```

### VS Code
```bash
# For a full-stack JavaScript project
/generate-ide-rules --ide vscode --project . \
  --analyze-depth comprehensive \
  --include-workflows \
  --performance-focus

# Output includes:
# - ESLint/Prettier configuration
# - Debug configurations
# - Task automation
# - Performance profiling setup
```

### JetBrains (IntelliJ/WebStorm/PyCharm)
```bash
# For an enterprise Java project
/generate-ide-rules --ide jetbrains --project . \
  --team-size large \
  --include-workflows \
  --include-snippets

# Output includes:
# - Code style XML
# - Inspection profiles
# - Live templates
# - Team sharing settings
```

---

## 🔧 MCP Workflow Examples

### Example 1: New Project Setup
```bash
# 1. First, analyze the project ecosystem
Tool: analyze_project_ecosystem
Parameters: {
  "analysisDepth": "comprehensive",
  "includeEnvironment": true
}

# 2. Generate ADRs if needed
Tool: generate_adrs_from_prd
Parameters: {
  "prdPath": "PRD.md",
  "outputDirectory": "./adrs"
}

# 3. Generate IDE rules based on architecture
/generate-ide-rules --ide cursor --project . --include-workflows
```

### Example 2: Existing Project Enhancement
```bash
# 1. Discover existing patterns
Tool: suggest_adrs
Parameters: {
  "analysisType": "comprehensive"
}

# 2. Generate rules from discovered patterns
Tool: generate_rules
Parameters: {
  "source": "patterns"
}

# 3. Create IDE configuration
/generate-ide-rules --ide windsurf --project . \
  --analyze-depth deep \
  --include-snippets
```

### Example 3: Security-Focused Configuration
```bash
# 1. Run security analysis
Tool: analyze_content_security
Parameters: {
  "contentType": "code"
}

# 2. Generate security rules
/generate-ide-rules --ide vscode --project . \
  --security-focus \
  --include-workflows

# 3. Validate configuration
Tool: validate_rules
Parameters: {
  "reportFormat": "detailed"
}
```

---

## 📁 Output Examples

### Cursor Rules Output
```
ide-rules/cursor/
├── cursor-rules.md          # Main configuration
├── settings.json           # Cursor settings
├── workflows/
│   ├── pre-commit.yaml    # Git hooks
│   ├── testing.yaml       # Test automation
│   └── deployment.yaml    # Deploy checks
└── snippets/
    ├── react.json         # React snippets
    └── typescript.json    # TS snippets
```

### Generated Rule Sample
```yaml
# cursor-rules.md excerpt
AI Assistant Configuration:
  context_awareness:
    - Always include current file imports
    - Reference related test files
    - Apply project ADR decisions
  
  code_generation:
    - Follow existing patterns
    - Maintain 80% test coverage
    - Use secure defaults
```

---

## 🎯 Common Use Cases

### 1. Team Onboarding
```bash
# Generate comprehensive IDE setup for new developers
/generate-ide-rules --ide cursor --project . \
  --team-size medium \
  --experience-level junior \
  --include-workflows \
  --include-snippets
```

### 2. Architecture Compliance
```bash
# Ensure IDE enforces architectural decisions
/generate-ide-rules --ide jetbrains --project . \
  --analyze-depth deep \
  --include-workflows
```

### 3. Security Hardening
```bash
# Add security-focused rules and checks
/generate-ide-rules --ide vscode --project . \
  --security-focus \
  --include-workflows
```

### 4. Performance Optimization
```bash
# Configure IDE for performance profiling
/generate-ide-rules --ide windsurf --project . \
  --performance-focus \
  --include-shortcuts
```

---

## 💡 Pro Tips

### 1. Incremental Adoption
Start with basic rules, then add features:
```bash
# Phase 1: Basic rules
/generate-ide-rules --ide cursor --project .

# Phase 2: Add workflows
/generate-ide-rules --ide cursor --project . --include-workflows

# Phase 3: Full configuration
/generate-ide-rules --ide cursor --project . \
  --include-workflows \
  --include-snippets \
  --include-shortcuts
```

### 2. Team Standardization
Generate once, share with team:
```bash
# Generate comprehensive rules
/generate-ide-rules --ide vscode --project . \
  --team-size large \
  --analyze-depth comprehensive

# Commit to version control
git add ide-rules/
git commit -m "Add team IDE configuration"
```

### 3. Multi-IDE Support
Generate for multiple IDEs:
```bash
# For teams using different IDEs
for ide in cursor windsurf vscode jetbrains; do
  /generate-ide-rules --ide $ide --project .
done
```

---

## 🔍 Troubleshooting

### Issue: "No ADRs found"
**Solution**: Generate ADRs first
```bash
Tool: generate_adrs_from_prd
Parameters: {
  "prdPath": "requirements.md"
}
```

### Issue: "Analysis timeout"
**Solution**: Use basic analysis for large projects
```bash
/generate-ide-rules --ide cursor --project . \
  --analyze-depth basic
```

### Issue: "Unsupported language"
**Solution**: Use generic patterns
```bash
Tool: analyze_project_ecosystem
Parameters: {
  "analysisDepth": "comprehensive"
}
# Then generate rules based on discovered patterns
```

---

## 🚀 Next Steps

1. **Customize Generated Rules**: Edit the generated files to match your specific needs
2. **Share with Team**: Commit IDE rules to version control
3. **Automate Updates**: Set up CI/CD to regenerate rules on architecture changes
4. **Provide Feedback**: Report issues or suggest improvements

Ready to optimize your IDE? Start with the basic command and iterate from there!