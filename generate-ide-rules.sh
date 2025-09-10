#!/bin/bash

# generate-ide-rules - Standalone IDE Rules Generator
# Usage: curl -sSL https://raw.githubusercontent.com/[repo]/generate-ide-rules | bash -s -- [options]
# Or download and run: ./generate-ide-rules [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
IDE="cursor"
PROJECT_PATH="."
OUTPUT_DIR="./ide-rules"
ANALYZE_DEPTH="comprehensive"
INCLUDE_WORKFLOWS=false
INCLUDE_SNIPPETS=false
INCLUDE_SHORTCUTS=false
SECURITY_FOCUS=false
PERFORMANCE_FOCUS=false
TEAM_SIZE="small"
EXPERIENCE_LEVEL="mixed"
LLM_MODE="prompt"
DOCS_BASE_URL="https://raw.githubusercontent.com/tosinakinosho/mcp-adr-analysis-server/main/docs/ide-rules"

# Print colored output
print_color() {
    color=$1
    message=$2
    echo -e "${color}${message}${NC}"
}

# Show usage
usage() {
    cat << EOF
🚀 IDE Rules Generator

Usage: $0 [OPTIONS]

OPTIONS:
    -i, --ide <name>              Target IDE (default: cursor)
                                  Options: cursor, windsurf, vscode, jetbrains, sublime, neovim, emacs
    -p, --project <path>          Project path to analyze (default: .)
    -o, --output <path>           Output directory (default: ./ide-rules)
    -d, --depth <level>           Analysis depth: basic, comprehensive, deep (default: comprehensive)
    --include-workflows           Include workflow automations
    --include-snippets           Include code snippets
    --include-shortcuts          Include keyboard shortcuts
    --security-focus             Emphasize security patterns
    --performance-focus          Emphasize performance optimizations
    --team-size <size>           Team size: solo, small, medium, large (default: small)
    --experience <level>         Team experience: junior, mixed, senior (default: mixed)
    --llm <mode>                 LLM mode: prompt, claude, openai (default: prompt)
    -h, --help                   Show this help message

EXAMPLES:
    # Basic usage
    $0 --ide cursor

    # Full-featured generation
    $0 --ide windsurf --include-workflows --include-snippets --security-focus

    # For enterprise team
    $0 --ide jetbrains --team-size large --experience mixed
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--ide)
            IDE="$2"
            shift 2
            ;;
        -p|--project)
            PROJECT_PATH="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -d|--depth)
            ANALYZE_DEPTH="$2"
            shift 2
            ;;
        --include-workflows)
            INCLUDE_WORKFLOWS=true
            shift
            ;;
        --include-snippets)
            INCLUDE_SNIPPETS=true
            shift
            ;;
        --include-shortcuts)
            INCLUDE_SHORTCUTS=true
            shift
            ;;
        --security-focus)
            SECURITY_FOCUS=true
            shift
            ;;
        --performance-focus)
            PERFORMANCE_FOCUS=true
            shift
            ;;
        --team-size)
            TEAM_SIZE="$2"
            shift 2
            ;;
        --experience)
            EXPERIENCE_LEVEL="$2"
            shift 2
            ;;
        --llm)
            LLM_MODE="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            print_color "$RED" "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate IDE choice
VALID_IDES="cursor windsurf vscode jetbrains sublime neovim emacs"
if [[ ! " $VALID_IDES " =~ " $IDE " ]]; then
    print_color "$RED" "Error: Invalid IDE '$IDE'"
    print_color "$YELLOW" "Valid options: $VALID_IDES"
    exit 1
fi

# Validate project path
if [[ ! -d "$PROJECT_PATH" ]]; then
    print_color "$RED" "Error: Project path '$PROJECT_PATH' does not exist"
    exit 1
fi

print_color "$BLUE" "🚀 IDE Rules Generator Starting..."
print_color "$GREEN" "Configuration:"
echo "  IDE: $IDE"
echo "  Project: $PROJECT_PATH"
echo "  Output: $OUTPUT_DIR"
echo "  Analysis Depth: $ANALYZE_DEPTH"
echo "  Team Size: $TEAM_SIZE"
echo "  Experience Level: $EXPERIENCE_LEVEL"
echo ""

# Create temporary directory for downloaded docs
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

print_color "$YELLOW" "📥 Downloading IDE rules documentation..."

# Download necessary documentation files
download_file() {
    local file=$1
    local url="${DOCS_BASE_URL}/${file}"
    local output="${TEMP_DIR}/${file}"
    
    mkdir -p "$(dirname "$output")"
    if curl -sSL "$url" -o "$output" 2>/dev/null; then
        echo "  ✓ Downloaded: $file"
    else
        print_color "$RED" "  ✗ Failed to download: $file"
        return 1
    fi
}

# Download core documentation
download_file "command-structure.md" || true
download_file "universal-workflows.md" || true
download_file "additional-workflows.md" || true
download_file "ide-specific/${IDE}/${IDE}-rules-template.md" || true

# Analyze project structure
print_color "$YELLOW" "🔍 Analyzing project structure..."

cd "$PROJECT_PATH"

# Detect project type and gather information
PROJECT_INFO=""
TECH_STACK=""
FRAMEWORK=""
LANGUAGE=""

# Check for Node.js project
if [[ -f "package.json" ]]; then
    PROJECT_INFO="${PROJECT_INFO}\n- Node.js project detected"
    TECH_STACK="${TECH_STACK}Node.js, "
    if grep -q "react" package.json 2>/dev/null; then
        FRAMEWORK="${FRAMEWORK}React, "
    fi
    if grep -q "vue" package.json 2>/dev/null; then
        FRAMEWORK="${FRAMEWORK}Vue, "
    fi
    if grep -q "typescript" package.json 2>/dev/null; then
        LANGUAGE="${LANGUAGE}TypeScript, "
    else
        LANGUAGE="${LANGUAGE}JavaScript, "
    fi
fi

# Check for Python project
if [[ -f "requirements.txt" ]] || [[ -f "setup.py" ]] || [[ -f "pyproject.toml" ]]; then
    PROJECT_INFO="${PROJECT_INFO}\n- Python project detected"
    TECH_STACK="${TECH_STACK}Python, "
    LANGUAGE="${LANGUAGE}Python, "
    if [[ -f "requirements.txt" ]] && grep -q "django" requirements.txt 2>/dev/null; then
        FRAMEWORK="${FRAMEWORK}Django, "
    fi
    if [[ -f "requirements.txt" ]] && grep -q "flask" requirements.txt 2>/dev/null; then
        FRAMEWORK="${FRAMEWORK}Flask, "
    fi
fi

# Check for Java project
if [[ -f "pom.xml" ]] || [[ -f "build.gradle" ]]; then
    PROJECT_INFO="${PROJECT_INFO}\n- Java project detected"
    TECH_STACK="${TECH_STACK}Java, "
    LANGUAGE="${LANGUAGE}Java, "
fi

# Check for Go project
if [[ -f "go.mod" ]]; then
    PROJECT_INFO="${PROJECT_INFO}\n- Go project detected"
    TECH_STACK="${TECH_STACK}Go, "
    LANGUAGE="${LANGUAGE}Go, "
fi

# Check for Rust project
if [[ -f "Cargo.toml" ]]; then
    PROJECT_INFO="${PROJECT_INFO}\n- Rust project detected"
    TECH_STACK="${TECH_STACK}Rust, "
    LANGUAGE="${LANGUAGE}Rust, "
fi

# Check for Docker
if [[ -f "Dockerfile" ]] || [[ -f "docker-compose.yml" ]]; then
    PROJECT_INFO="${PROJECT_INFO}\n- Docker configuration found"
    TECH_STACK="${TECH_STACK}Docker, "
fi

# Remove trailing commas
TECH_STACK=${TECH_STACK%,*}
FRAMEWORK=${FRAMEWORK%,*}
LANGUAGE=${LANGUAGE%,*}

# Set defaults if empty
[[ -z "$TECH_STACK" ]] && TECH_STACK="Unknown"
[[ -z "$FRAMEWORK" ]] && FRAMEWORK="None detected"
[[ -z "$LANGUAGE" ]] && LANGUAGE="Unknown"

print_color "$GREEN" "Project Analysis Complete:"
echo -e "$PROJECT_INFO"
echo "  Tech Stack: $TECH_STACK"
echo "  Framework: $FRAMEWORK"
echo "  Language: $LANGUAGE"
echo ""

# Count files for complexity assessment
FILE_COUNT=$(find . -type f -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.java" -o -name "*.go" -o -name "*.rs" 2>/dev/null | wc -l)
print_color "$GREEN" "  Project Size: $FILE_COUNT source files"

cd - > /dev/null

# Generate context for LLM
print_color "$YELLOW" "🤖 Generating LLM context..."

LLM_CONTEXT=$(cat << EOF
Generate IDE-specific rules for the following project:

PROJECT INFORMATION:
- IDE: $IDE
- Technology Stack: $TECH_STACK
- Framework: $FRAMEWORK
- Primary Language: $LANGUAGE
- Project Size: $FILE_COUNT source files
- Team Size: $TEAM_SIZE
- Experience Level: $EXPERIENCE_LEVEL
- Analysis Depth: $ANALYZE_DEPTH

CONFIGURATION OPTIONS:
- Include Workflows: $INCLUDE_WORKFLOWS
- Include Snippets: $INCLUDE_SNIPPETS
- Include Shortcuts: $INCLUDE_SHORTCUTS
- Security Focus: $SECURITY_FOCUS
- Performance Focus: $PERFORMANCE_FOCUS

PROJECT STRUCTURE:
$PROJECT_INFO

Please generate comprehensive IDE rules based on the template below, customized for this specific project. Include:
1. Project-specific code completion rules
2. AI assistant configuration tailored to the tech stack
3. Linting and formatting rules for the detected languages
4. Workflow automations based on the configuration options
5. Integration points with development tools
6. Custom commands and shortcuts

TEMPLATE TO CUSTOMIZE:
$(cat "$TEMP_DIR/ide-specific/${IDE}/${IDE}-rules-template.md" 2>/dev/null || echo "Template not found - use generic IDE configuration")

Additional context from universal workflows:
$(head -50 "$TEMP_DIR/universal-workflows.md" 2>/dev/null || echo "")

Generate the complete IDE rules file with all placeholders filled with project-specific values.
EOF
)

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Handle LLM generation based on mode
case $LLM_MODE in
    prompt)
        # Save prompt for manual LLM usage
        PROMPT_FILE="$OUTPUT_DIR/generate-prompt.txt"
        echo "$LLM_CONTEXT" > "$PROMPT_FILE"
        
        print_color "$GREEN" "✅ Generation prompt created!"
        print_color "$BLUE" "\nNext steps:"
        echo "1. Copy the content from: $PROMPT_FILE"
        echo "2. Paste it into your preferred LLM (Claude, ChatGPT, etc.)"
        echo "3. Save the generated rules to: $OUTPUT_DIR/${IDE}-rules.md"
        echo ""
        print_color "$YELLOW" "💡 Tip: For best results, use Claude 3 or GPT-4"
        ;;
    
    claude)
        print_color "$YELLOW" "🤖 Claude API integration coming soon..."
        print_color "$BLUE" "For now, please use the prompt file at: $OUTPUT_DIR/generate-prompt.txt"
        echo "$LLM_CONTEXT" > "$OUTPUT_DIR/generate-prompt.txt"
        ;;
    
    openai)
        print_color "$YELLOW" "🤖 OpenAI API integration coming soon..."
        print_color "$BLUE" "For now, please use the prompt file at: $OUTPUT_DIR/generate-prompt.txt"
        echo "$LLM_CONTEXT" > "$OUTPUT_DIR/generate-prompt.txt"
        ;;
esac

# Create a README for the output
cat > "$OUTPUT_DIR/README.md" << EOF
# Generated IDE Rules for $IDE

This directory contains IDE-specific rules generated for your project.

## Project Analysis
- Technology Stack: $TECH_STACK
- Framework: $FRAMEWORK
- Language: $LANGUAGE
- Team Size: $TEAM_SIZE

## Generated Files
- \`generate-prompt.txt\` - LLM prompt for generating rules
- \`${IDE}-rules.md\` - Generated IDE rules (create this from LLM output)

## Next Steps
1. Review the generated rules
2. Customize based on your specific needs
3. Apply to your IDE configuration
4. Share with your team

## Regeneration
To regenerate with different options:
\`\`\`bash
./generate-ide-rules --ide $IDE --include-workflows --include-snippets
\`\`\`
EOF

print_color "$GREEN" "\n✅ IDE rules generation complete!"
print_color "$BLUE" "Output saved to: $OUTPUT_DIR/"

# Show quick usage tip
if [[ "$IDE" == "cursor" ]]; then
    print_color "$YELLOW" "\n💡 Quick tip for Cursor:"
    echo "1. Open Cursor settings (Cmd/Ctrl + ,)"
    echo "2. Navigate to 'Rules' section"
    echo "3. Paste the generated rules"
elif [[ "$IDE" == "vscode" ]]; then
    print_color "$YELLOW" "\n💡 Quick tip for VS Code:"
    echo "1. Copy settings from generated rules"
    echo "2. Open settings.json (Cmd/Ctrl + Shift + P > 'Preferences: Open Settings (JSON)')"
    echo "3. Merge with your existing settings"
fi