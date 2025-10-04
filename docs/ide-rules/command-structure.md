# IDE Rules Command Structure

## Overview

This document defines the command structure for generating IDE-specific rules using the MCP ADR Analysis Server. These commands can be used in Claude.ai or any MCP-compatible environment to generate customized IDE configurations based on your project's architecture.

## Base Command Pattern

```
/generate-ide-rules --ide <IDE_NAME> --project <PROJECT_PATH> [OPTIONS]
```

## Supported IDEs

- `cursor` - Cursor IDE
- `windsurf` - Windsurf IDE  
- `vscode` - Visual Studio Code
- `jetbrains` - JetBrains IDEs (IntelliJ, WebStorm, PyCharm, etc.)
- `sublime` - Sublime Text
- `neovim` - Neovim
- `emacs` - Emacs

## Command Options

### Required Parameters
- `--ide <name>` - Target IDE for rule generation
- `--project <path>` - Project path to analyze

### Optional Parameters
- `--output <path>` - Output directory (default: `./ide-rules/`)
- `--analyze-depth <level>` - Analysis depth: `basic`, `comprehensive`, `deep` (default: `comprehensive`)
- `--include-workflows` - Include workflow automations
- `--include-snippets` - Include code snippets
- `--include-shortcuts` - Include keyboard shortcuts
- `--security-focus` - Emphasize security patterns
- `--performance-focus` - Emphasize performance optimizations
- `--team-size <size>` - Team size: `solo`, `small`, `medium`, `large`
- `--experience-level <level>` - Team experience: `junior`, `mixed`, `senior`

## Usage Examples

### Basic Generation
```bash
# Generate Cursor rules for current project
/generate-ide-rules --ide cursor --project .

# Generate VS Code rules with comprehensive analysis
/generate-ide-rules --ide vscode --project /path/to/project --analyze-depth comprehensive
```

### Advanced Generation
```bash
# Generate Windsurf rules with all features
/generate-ide-rules --ide windsurf --project . \
  --include-workflows \
  --include-snippets \
  --include-shortcuts \
  --security-focus

# Generate JetBrains rules for enterprise team
/generate-ide-rules --ide jetbrains --project . \
  --team-size large \
  --experience-level mixed \
  --include-workflows
```

## MCP Tool Integration

The command structure maps to the following MCP tools:

### 1. Project Analysis
```javascript
Tool: analyze_project_ecosystem
Parameters: {
  "analysisDepth": "<from --analyze-depth>",
  "includeEnvironment": true,
  "enhancedMode": true
}
```

### 2. Rule Generation
```javascript
Tool: generate_rules
Parameters: {
  "adrDirectory": "./adrs",
  "source": "both",
  "outputFormat": "json"
}
```

### 3. Workflow Creation
```javascript
Tool: get_workflow_guidance
Parameters: {
  "goal": "ide configuration optimization",
  "projectContext": "existing_project",
  "primaryConcerns": ["<from focus flags>"]
}
```

## Output Structure

Generated rules are saved in the following structure:
```
ide-rules/
├── <ide-name>/
│   ├── rules.md           # Main rules file
│   ├── settings.json      # IDE-specific settings
│   ├── workflows/         # Workflow configurations
│   ├── snippets/          # Code snippets
│   └── shortcuts/         # Keyboard shortcuts
```

## Workflow Integration

### In Claude.ai
```
User: /generate-ide-rules --ide cursor --project . --include-workflows

Claude: [Executes MCP tools to analyze project and generate Cursor-specific rules]
```

### In Custom MCP Client
```javascript
const result = await mcp.execute('generate-ide-rules', {
  ide: 'cursor',
  project: '.',
  includeWorkflows: true
});
```

## Rule Categories Generated

1. **Code Completion Rules**
   - Import suggestions
   - Pattern detection
   - Context awareness

2. **AI Assistant Configuration**
   - Project-specific knowledge
   - Code generation rules
   - Security patterns

3. **Linting & Formatting**
   - Auto-fix rules
   - Code style enforcement
   - Architecture compliance

4. **Workflow Automations**
   - Pre-commit hooks
   - Test generation
   - Deployment checks

5. **Integration Points**
   - MCP server connection
   - Tool automation
   - External services

## Customization Points

Each generated rule file includes customization sections where you can:
- Add project-specific patterns
- Override default settings
- Define custom workflows
- Configure team preferences

## Best Practices

1. **Initial Setup**: Run comprehensive analysis on first generation
2. **Regular Updates**: Regenerate rules after major architectural changes
3. **Team Alignment**: Share generated rules via version control
4. **Incremental Refinement**: Start with basic rules, add features as needed
5. **Validation**: Use `validate_rules` tool to ensure compliance

## Error Handling

Common issues and solutions:
- **No ADRs found**: Generate ADRs first using `generate_adrs_from_prd`
- **Invalid project path**: Ensure path exists and contains valid project
- **Unsupported IDE**: Check supported IDEs list or use generic template
- **Analysis timeout**: Use `--analyze-depth basic` for large projects

## Future Enhancements

Planned features:
- IDE plugin generation
- Rule versioning and history
- Team collaboration features
- Cloud sync capabilities
- AI-powered rule optimization