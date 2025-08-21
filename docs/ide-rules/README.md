# IDE Rules and Workflows Documentation

## Overview

This directory contains comprehensive documentation for generating IDE-specific rules and workflows using the MCP ADR Analysis Server. These resources enable developers to optimize their IDE configurations based on project architecture, team preferences, and best practices.

## 📁 Directory Structure

```
ide-rules/
├── README.md                      # This file
├── command-structure.md           # Command syntax and options
├── quickstart-guide.md           # Quick start examples
├── standalone-usage.md           # Standalone script usage guide
├── universal-workflows.md        # Core workflows for all IDEs
├── additional-workflows.md       # Enhanced IDE-specific workflows
├── environment-validation-workflow.md  # Environment setup workflow
└── ide-specific/                 # IDE-specific templates
    ├── cursor/                   # Cursor IDE rules
    ├── windsurf/                # Windsurf IDE rules
    ├── vscode/                  # VS Code configurations
    └── jetbrains/               # JetBrains IDE rules
```

## 🚀 Quick Start

### Option 1: Standalone Script (Recommended)
```bash
# One-liner to generate and use
curl -sSL https://raw.githubusercontent.com/[your-repo]/generate-ide-rules.sh | bash -s -- --ide cursor
```

### Option 2: MCP Command (if using MCP ADR Analysis Server)
```bash
/generate-ide-rules --ide cursor --project .
```

Both methods analyze your project and generate customized IDE configurations.

## 📚 Documentation Guide

### 1. **Command Structure** (`command-structure.md`)
- Complete command syntax
- Available options and parameters
- MCP tool integration details
- Output structure explanation

### 2. **Quickstart Guide** (`quickstart-guide.md`)
- 2-minute quick start
- IDE-specific examples
- Common use cases
- Troubleshooting tips

### 3. **Standalone Usage** (`standalone-usage.md`)
- Standalone script installation
- One-line curl commands
- CI/CD integration
- Team sharing strategies

### 4. **Universal Workflows** (`universal-workflows.md`)
- 30+ comprehensive workflows
- Step-by-step MCP tool usage
- Quick workflows (5-15 mins)
- Core workflows (30-60 mins)
- Specialized workflows (60-120 mins)
- Enterprise workflows (2+ hours)

### 5. **Additional Workflows** (`additional-workflows.md`)
- AI-powered code review
- Refactoring assistance
- Performance profiling
- Security-first development
- Team collaboration features

### 6. **Environment Validation** (`environment-validation-workflow.md`)
- System requirements checking
- Development tool detection
- Automated setup scripts
- TODO integration

## 🎯 Key Features

### IDE Support
- **Cursor** - AI-first development
- **Windsurf** - Advanced pair programming
- **VS Code** - Comprehensive extensions
- **JetBrains** - Enterprise features
- **Sublime Text** - Lightweight configuration
- **Neovim** - Terminal-based efficiency
- **Emacs** - Extensible environment

### Workflow Categories
1. **Development Workflows**
   - Project setup
   - Code generation
   - Testing strategies
   - Deployment preparation

2. **Quality Workflows**
   - Code review automation
   - Security scanning
   - Performance optimization
   - Architecture compliance

3. **Team Workflows**
   - Onboarding assistance
   - Knowledge sharing
   - Collaboration tools
   - Standards enforcement

4. **Integration Workflows**
   - CI/CD pipeline generation
   - Monitoring setup
   - Documentation generation
   - Tool chain optimization

## 🛠️ Usage Examples

### Basic Rule Generation
```bash
# Generate rules for current project
/generate-ide-rules --ide vscode --project .
```

### Advanced Configuration
```bash
# Full-featured setup for team
/generate-ide-rules --ide cursor --project . \
  --include-workflows \
  --include-snippets \
  --security-focus \
  --team-size medium
```

### Multi-IDE Support
```bash
# Generate for all team IDEs
for ide in cursor windsurf vscode; do
  ./generate-ide-rules.sh --ide $ide --project .
done
```

## 🔧 MCP Tool Integration

The IDE rules leverage these MCP ADR Analysis Server tools:

- `analyze_project_ecosystem` - Understand project structure
- `generate_rules` - Extract architectural patterns
- `get_workflow_guidance` - Intelligent recommendations
- `validate_rules` - Ensure compliance
- `manage_todo_json` - Task integration
- `deployment_readiness` - Production checks

## 📈 Benefits

1. **Consistency** - Standardized configurations across team
2. **Productivity** - Optimized workflows and shortcuts
3. **Quality** - Built-in best practices and checks
4. **Security** - Automated vulnerability detection
5. **Onboarding** - Faster developer ramp-up
6. **Compliance** - Architecture rule enforcement

## 🔮 Future Enhancements

- IDE plugin development
- Cloud synchronization
- AI-powered optimizations
- Team analytics dashboard
- Cross-IDE compatibility layer
- Visual workflow designer

## 🤝 Contributing

To add new IDE support or workflows:
1. Create template in `ide-specific/<ide-name>/`
2. Add workflow to `additional-workflows.md`
3. Update command structure documentation
4. Add examples to quickstart guide

## 📞 Support

- **Issues**: Report at the GitHub repository
- **Feedback**: Contribute improvements via PRs
- **Questions**: Check quickstart guide first

---

Ready to supercharge your IDE? Start with the [Quickstart Guide](quickstart-guide.md) and explore the powerful workflows available!