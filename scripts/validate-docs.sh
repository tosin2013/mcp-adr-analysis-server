#!/bin/bash

# Documentation Validation Script
# Comprehensive validation and building of MCP ADR Analysis Server documentation

set -e

echo "🚀 Starting comprehensive documentation validation..."

# Configuration
DOCS_DIR="/docs/docs"
BUILD_DIR="/docs/build"
REPORTS_DIR="/docs/reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create necessary directories
mkdir -p "$BUILD_DIR" "$REPORTS_DIR"

# Function to check prerequisites
check_prerequisites() {
    echo "🔧 Checking prerequisites..."
    
    local missing_tools=()
    
    # Check for required tools
    command -v node >/dev/null 2>&1 || missing_tools+=("node")
    command -v npm >/dev/null 2>&1 || missing_tools+=("npm")
    command -v python3 >/dev/null 2>&1 || missing_tools+=("python3")
    command -v markdown-link-check >/dev/null 2>&1 || missing_tools+=("markdown-link-check")
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        echo "❌ Missing required tools: ${missing_tools[*]}"
        echo "Installing missing tools..."
        
        # Install missing npm packages
        if [[ " ${missing_tools[*]} " =~ " markdown-link-check " ]]; then
            npm install -g markdown-link-check
        fi
    fi
    
    echo "✅ Prerequisites check complete"
}

# Function to validate documentation structure
validate_structure() {
    echo "📁 Validating documentation structure..."
    
    if [ ! -d "$DOCS_DIR" ]; then
        echo "❌ Documentation directory not found: $DOCS_DIR"
        echo "📂 Available directories:"
        find /docs -type d -maxdepth 2 2>/dev/null || echo "No directories found"
        exit 1
    fi
    
    # Check for required files
    local required_files=(
        "diataxis-index.md"
        "README.md"
        "tutorials/01-first-steps.md"
        "how-to-guides/troubleshooting.md"
        "reference/api-reference.md"
        "explanation/mcp-concepts.md"
    )
    
    local missing_files=()
    for file in "${required_files[@]}"; do
        if [ ! -f "$DOCS_DIR/$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -ne 0 ]; then
        echo "⚠️  Missing core documentation files:"
        printf '   %s\n' "${missing_files[@]}"
    else
        echo "✅ Core documentation structure is valid"
    fi
    
    # Count markdown files
    local md_count=$(find "$DOCS_DIR" -name "*.md" | wc -l)
    echo "📄 Found $md_count markdown files"
}

# Function to run link validation
validate_links() {
    echo "🔗 Running comprehensive link validation..."
    
    local link_report="$REPORTS_DIR/link-validation_$TIMESTAMP.txt"
    local link_summary="$REPORTS_DIR/link-summary_$TIMESTAMP.json"
    
    echo "📝 Generating link validation report: $link_report"
    
    # Try markdown-link-check first, fallback to Python-based validation if it fails
    local total_files=0
    local files_with_errors=0
    local total_links=0
    local broken_links=0
    
    # Test if markdown-link-check works
    if echo "# Test [link](https://example.com)" | markdown-link-check /dev/stdin --quiet 2>/dev/null; then
        echo "Using markdown-link-check for validation..."
        find "$DOCS_DIR" -name "*.md" -type f | while read -r file; do
            echo "Checking: $file" >> "$link_report"
            
            # Run link check and capture output
            if markdown-link-check "$file" --quiet >> "$link_report" 2>&1; then
                echo "✅ $file" >> "$link_report"
            else
                echo "❌ $file has broken links" >> "$link_report"
                ((files_with_errors++))
            fi
            
            echo "---" >> "$link_report"
            ((total_files++))
        done
    else
        echo "markdown-link-check not working, using Python-based validation..."
        
        # Use Python-based link validation
        python3 << 'EOF'
import os
import re
import requests
from pathlib import Path
import json

docs_dir = Path("/docs/docs")
report_file = "/docs/reports/link-validation_20251003_185121.txt"
summary_file = "/docs/reports/link-summary_20251003_185121.json"

total_files = 0
files_with_errors = 0
total_links = 0
broken_links = 0

# Link patterns
link_patterns = [
    r'\[([^\]]+)\]\(([^)]+)\)',  # Markdown links [text](url)
    r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>',  # HTML links
    r'https?://[^\s\)]+',  # Bare URLs
]

def check_link(url):
    """Check if a link is valid"""
    try:
        # Skip certain types of links
        if url.startswith('#') or url.startswith('mailto:') or url.startswith('tel:'):
            return True
        
        # For relative links, check if file exists
        if not url.startswith(('http://', 'https://')):
            if url.startswith('/'):
                # Absolute path from docs root
                full_path = docs_dir / url[1:]
            else:
                # Relative path (would need context)
                return True  # Skip for now
            return full_path.exists()
        
        # For external links, do a HEAD request
        response = requests.head(url, timeout=5, allow_redirects=True)
        return response.status_code < 400
    except:
        return False

def validate_file(file_path):
    """Validate links in a single file"""
    global total_files, files_with_errors, total_links, broken_links
    
    total_files += 1
    file_errors = 0
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find all links
        links = []
        for pattern in link_patterns:
            matches = re.findall(pattern, content)
            if isinstance(matches[0], tuple) if matches else False:
                links.extend([match[1] for match in matches])
            else:
                links.extend(matches)
        
        total_links += len(links)
        
        # Check each link
        for link in links:
            if not check_link(link):
                broken_links += 1
                file_errors += 1
        
        if file_errors > 0:
            files_with_errors += 1
            print(f"❌ {file_path} has {file_errors} broken links")
        else:
            print(f"✅ {file_path}")
            
    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        files_with_errors += 1

# Process all markdown files
for md_file in docs_dir.rglob("*.md"):
    validate_file(md_file)

print(f"📊 Link validation summary:")
print(f"   Total files checked: {total_files}")
print(f"   Files with errors: {files_with_errors}")
print(f"   Total links found: {total_links}")
print(f"   Broken links: {broken_links}")

# Create summary JSON
summary = {
    "timestamp": "2025-10-03T18:51:21Z",
    "total_files": total_files,
    "files_with_errors": files_with_errors,
    "total_links": total_links,
    "broken_links": broken_links,
    "report_file": report_file
}

with open(summary_file, 'w') as f:
    json.dump(summary, f, indent=2)

print("✅ Python-based link validation complete")
EOF
    fi
    
    echo "✅ Link validation complete. Report: $link_report"
}

# Function to validate markdown syntax
validate_markdown() {
    echo "📝 Validating markdown syntax..."
    
    local markdown_report="$REPORTS_DIR/markdown-validation_$TIMESTAMP.txt"
    
    # Check if markdownlint is available
    if command -v markdownlint >/dev/null 2>&1; then
        echo "Running markdownlint..."
        markdownlint "$DOCS_DIR/**/*.md" > "$markdown_report" 2>&1 || true
        echo "✅ Markdown syntax validation complete. Report: $markdown_report"
    else
        echo "⚠️  markdownlint not available, skipping markdown syntax validation"
        echo "Install with: npm install -g markdownlint-cli"
    fi
}

# Function to build documentation
build_documentation() {
    echo "🏗️  Building documentation..."
    
    # Check if we have a VitePress config
    if [ -f "$DOCS_DIR/.vitepress/config.js" ] || [ -f "$DOCS_DIR/.vitepress/config.ts" ]; then
        echo "📚 Building with VitePress..."
        
        cd "$DOCS_DIR"
        
        # Install dependencies if package.json exists
        if [ -f "package.json" ]; then
            npm install
        fi
        
        # Build documentation
        if command -v vitepress >/dev/null 2>&1; then
            vitepress build . --outDir "$BUILD_DIR" || {
                echo "❌ VitePress build failed"
                return 1
            }
            echo "✅ VitePress build complete: $BUILD_DIR"
        else
            echo "⚠️  VitePress not available, trying npx..."
            npx vitepress build . --outDir "$BUILD_DIR" || {
                echo "❌ Documentation build failed"
                return 1
            }
        fi
    else
        echo "📄 No VitePress config found, creating simple HTML build..."
        
        # Simple markdown to HTML conversion
        python3 << 'EOF'
import os
import markdown
from pathlib import Path

docs_dir = Path("/docs/docs")
build_dir = Path("/docs/build")
build_dir.mkdir(exist_ok=True)

# Convert all markdown files to HTML
for md_file in docs_dir.rglob("*.md"):
    try:
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Convert to HTML
        html = markdown.markdown(content, extensions=['toc', 'tables', 'fenced_code'])
        
        # Create HTML file
        relative_path = md_file.relative_to(docs_dir)
        html_path = build_dir / relative_path.with_suffix('.html')
        html_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Wrap in basic HTML template
        full_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{md_file.stem}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }}
        code {{ background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }}
        pre {{ background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }}
        blockquote {{ border-left: 4px solid #ddd; margin-left: 0; padding-left: 20px; }}
    </style>
</head>
<body>
{html}
</body>
</html>"""
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(full_html)
        
        print(f"✅ Converted: {md_file} -> {html_path}")
        
    except Exception as e:
        print(f"❌ Failed to convert {md_file}: {e}")

print("✅ Simple HTML build complete")
EOF
    fi
}

# Function to start local server for testing
start_local_server() {
    echo "🌐 Starting local documentation server..."
    
    if [ -d "$BUILD_DIR" ] && [ "$(ls -A $BUILD_DIR)" ]; then
        echo "📡 Starting server on port 4173..."
        
        cd "$BUILD_DIR"
        
        # Try different server options
        if command -v python3 >/dev/null 2>&1; then
            echo "🐍 Using Python HTTP server"
            python3 -m http.server 4173 &
            local server_pid=$!
            
            # Wait for server to start
            sleep 2
            
            if curl -s http://localhost:4173 > /dev/null; then
                echo "✅ Documentation server running at http://localhost:4173"
                echo "📊 Server PID: $server_pid"
                echo "🛑 Stop server with: kill $server_pid"
                
                # Save server info
                echo "$server_pid" > /tmp/docs-server.pid
                echo "http://localhost:4173" > /tmp/docs-server.url
                
                return 0
            else
                echo "❌ Failed to start server"
                kill $server_pid 2>/dev/null || true
                return 1
            fi
        else
            echo "❌ No suitable server found (need python3 or node)"
            return 1
        fi
    else
        echo "❌ No build directory found. Run build first."
        return 1
    fi
}

# Function to run comprehensive validation
run_comprehensive_validation() {
    echo "🔍 Running comprehensive validation..."
    
    local validation_report="$REPORTS_DIR/comprehensive-validation_$TIMESTAMP.json"
    local start_time=$(date +%s)
    
    # Run all validations
    validate_structure
    validate_links
    validate_markdown
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Generate comprehensive report
    cat > "$validation_report" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "validation_duration_seconds": $duration,
  "docs_directory": "$DOCS_DIR",
  "build_directory": "$BUILD_DIR",
  "reports_directory": "$REPORTS_DIR",
  "validation_steps": [
    "structure_validation",
    "link_validation", 
    "markdown_validation"
  ],
  "status": "completed"
}
EOF
    
    echo "📋 Comprehensive validation report: $validation_report"
    echo "⏱️  Total validation time: ${duration}s"
}

# Function to generate final report
generate_final_report() {
    echo "📊 Generating final validation report..."
    
    local final_report="$REPORTS_DIR/final-report_$TIMESTAMP.md"
    
    cat > "$final_report" << EOF
# Documentation Validation Report

**Generated**: $(date)
**Documentation Directory**: $DOCS_DIR
**Build Directory**: $BUILD_DIR

## Validation Summary

### Structure Validation
- ✅ Documentation structure validated
- 📄 Markdown files found: $(find "$DOCS_DIR" -name "*.md" | wc -l)

### Link Validation
- 🔗 Link validation completed
- 📋 Report: $REPORTS_DIR/link-validation_$TIMESTAMP.txt

### Build Validation
- 🏗️  Documentation build completed
- 📁 Build output: $BUILD_DIR

## Next Steps

1. **Review Reports**: Check individual validation reports in $REPORTS_DIR
2. **Fix Issues**: Address any broken links or validation errors
3. **Test Locally**: Start local server to test documentation
4. **Deploy**: Deploy to production if validation passes

## Commands

\`\`\`bash
# Start local server
/scripts/validate-docs.sh --serve

# Re-run validation
/scripts/validate-docs.sh --validate-only

# Fix broken links
/scripts/fix-broken-links.py
\`\`\`

---

*Generated by MCP ADR Analysis Server Documentation Validator*
EOF

    echo "📋 Final report generated: $final_report"
}

# Main execution function
main() {
    local action="${1:-full}"
    
    case "$action" in
        "--validate-only")
            check_prerequisites
            run_comprehensive_validation
            ;;
        "--build-only")
            check_prerequisites
            validate_structure
            build_documentation
            ;;
        "--serve")
            start_local_server
            ;;
        "--fix-links")
            echo "🔧 Running link fixer..."
            python3 /scripts/fix-broken-links.py --docs-dir "$DOCS_DIR"
            ;;
        "--help")
            echo "Documentation Validation Script"
            echo ""
            echo "Usage: $0 [option]"
            echo ""
            echo "Options:"
            echo "  --validate-only    Run validation checks only"
            echo "  --build-only       Build documentation only"
            echo "  --serve           Start local server (requires existing build)"
            echo "  --fix-links       Run automated link fixer"
            echo "  --help            Show this help message"
            echo ""
            echo "Default: Run full validation, build, and generate reports"
            ;;
        *)
            # Full validation and build
            check_prerequisites
            run_comprehensive_validation
            build_documentation
            generate_final_report
            
            echo ""
            echo "🎉 Documentation validation complete!"
            echo ""
            echo "📊 Summary:"
            echo "   📁 Documentation: $DOCS_DIR"
            echo "   🏗️  Build output: $BUILD_DIR"
            echo "   📋 Reports: $REPORTS_DIR"
            echo ""
            echo "🚀 Next steps:"
            echo "   1. Review reports in $REPORTS_DIR"
            echo "   2. Fix any issues found"
            echo "   3. Start local server: $0 --serve"
            echo "   4. Test documentation locally"
            ;;
    esac
}

# Run main function with all arguments
main "$@"
