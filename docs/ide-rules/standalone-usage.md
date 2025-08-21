# Standalone IDE Rules Generator

## Overview

The `generate-ide-rules` script is a standalone tool that can be used in any project to generate IDE-specific configurations. It downloads the necessary documentation and creates customized rules based on your project's structure.

## Installation

### One-line installation and usage:
```bash
curl -sSL https://raw.githubusercontent.com/[your-repo]/generate-ide-rules.sh | bash -s -- --ide cursor
```

### Download and use:
```bash
# Download the script
curl -sSL https://raw.githubusercontent.com/[your-repo]/generate-ide-rules.sh -o generate-ide-rules.sh
chmod +x generate-ide-rules.sh

# Run with options
./generate-ide-rules.sh --ide cursor --include-workflows
```

## Usage Examples

### Basic Usage
```bash
# Generate Cursor rules for current project
./generate-ide-rules.sh --ide cursor

# Generate VS Code rules with comprehensive analysis
./generate-ide-rules.sh --ide vscode --depth comprehensive
```

### Advanced Usage
```bash
# Full-featured generation for Windsurf
./generate-ide-rules.sh --ide windsurf \
  --include-workflows \
  --include-snippets \
  --include-shortcuts \
  --security-focus

# Enterprise team setup
./generate-ide-rules.sh --ide jetbrains \
  --team-size large \
  --experience mixed \
  --performance-focus
```

## Command Options

```
OPTIONS:
    -i, --ide <name>              Target IDE: cursor, windsurf, vscode, jetbrains, sublime, neovim, emacs
    -p, --project <path>          Project path to analyze (default: .)
    -o, --output <path>           Output directory (default: ./ide-rules)
    -d, --depth <level>           Analysis depth: basic, comprehensive, deep
    --include-workflows           Include workflow automations
    --include-snippets           Include code snippets
    --include-shortcuts          Include keyboard shortcuts
    --security-focus             Emphasize security patterns
    --performance-focus          Emphasize performance optimizations
    --team-size <size>           Team size: solo, small, medium, large
    --experience <level>         Team experience: junior, mixed, senior
    --llm <mode>                 LLM mode: prompt, claude, openai
    -h, --help                   Show help message
```

## How It Works

1. **Project Analysis**: Automatically detects your project type, technologies, and structure
2. **Documentation Download**: Pulls the latest IDE rules documentation from the repository
3. **Context Generation**: Creates a detailed prompt for LLM processing
4. **Rule Generation**: Generates IDE-specific configuration files

## Supported Project Types

- **Node.js** (React, Vue, TypeScript, JavaScript)
- **Python** (Django, Flask, FastAPI)
- **Java** (Spring Boot, Maven, Gradle)
- **Go** (Modules, CLI applications)
- **Rust** (Cargo projects)
- **Docker** (Containerized applications)
- **Multi-language** projects

## Output Structure

```
ide-rules/
├── README.md                    # Generated documentation
├── generate-prompt.txt          # LLM prompt for rule generation
└── cursor-rules.md             # Generated IDE rules (manual step)
```

## Workflow

1. **Run the script** with your preferred IDE and options
2. **Review the generated prompt** in `ide-rules/generate-prompt.txt`
3. **Copy to your LLM** (Claude, ChatGPT, etc.)
4. **Save the output** as `[ide]-rules.md`
5. **Apply to your IDE** configuration

## IDE-Specific Instructions

### Cursor
1. Open Cursor settings (Cmd/Ctrl + ,)
2. Navigate to 'Rules' section
3. Paste the generated rules

### VS Code
1. Copy settings from generated rules
2. Open settings.json (Cmd/Ctrl + Shift + P > 'Preferences: Open Settings (JSON)')
3. Merge with your existing settings

### JetBrains IDEs
1. Import the generated XML configurations
2. Apply the code style and inspection profiles
3. Configure live templates

### Windsurf
1. Copy the YAML configuration
2. Apply to your workspace settings
3. Enable AI pair programming features

## Integration with CI/CD

Add to your CI/CD pipeline:
```yaml
- name: Generate IDE Rules
  run: |
    curl -sSL https://raw.githubusercontent.com/[your-repo]/generate-ide-rules.sh | bash -s -- --ide cursor
    git add ide-rules/
    git commit -m "Update IDE rules" || exit 0
```

## Team Usage

### Share Rules
```bash
# Generate rules and commit to repository
./generate-ide-rules.sh --ide cursor --team-size medium
git add ide-rules/
git commit -m "Add team IDE configuration"
git push
```

### Update Rules
```bash
# Regenerate when project structure changes
./generate-ide-rules.sh --ide cursor --include-workflows
```

## Troubleshooting

### Common Issues

1. **Script not found**: Ensure the GitHub URL is correct
2. **Permission denied**: Run `chmod +x generate-ide-rules.sh`
3. **Network issues**: Download script locally and run offline
4. **No rules generated**: Check project structure and IDE support

### Debug Mode
```bash
# Run with verbose output
bash -x ./generate-ide-rules.sh --ide cursor
```

## Environment Variables

Set these for customized behavior:
```bash
export IDE_RULES_OUTPUT_DIR="./custom-rules"
export IDE_RULES_DOCS_URL="https://your-custom-repo.com/docs"
export IDE_RULES_DEFAULT_IDE="cursor"
```

## API Integration (Coming Soon)

Future versions will support direct API integration:
```bash
# With Claude API
./generate-ide-rules.sh --ide cursor --llm claude --api-key $CLAUDE_API_KEY

# With OpenAI API
./generate-ide-rules.sh --ide cursor --llm openai --api-key $OPENAI_API_KEY
```

## Contributing

To add support for new IDEs:
1. Create template in `docs/ide-rules/ide-specific/[new-ide]/`
2. Add IDE to the VALID_IDES list in the script
3. Add IDE-specific usage instructions
4. Test with various project types

## License

MIT License - Use freely in your projects!