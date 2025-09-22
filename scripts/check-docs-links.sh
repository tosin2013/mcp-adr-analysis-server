#!/bin/bash

# Documentation Link Checker Script
# Comprehensive link validation for MCP ADR Analysis Server documentation

set -e

echo "🔍 Starting comprehensive documentation link check..."

# Configuration
DOCS_DIR="/docs/docs"
REPORT_DIR="/docs/reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create reports directory
mkdir -p "$REPORT_DIR"

echo "📁 Scanning documentation directory: $DOCS_DIR"

# Function to check if directory exists and has markdown files
check_docs_structure() {
    if [ ! -d "$DOCS_DIR" ]; then
        echo "❌ Documentation directory not found: $DOCS_DIR"
        echo "📂 Available directories:"
        find /docs -type d -name "docs" 2>/dev/null || echo "No docs directories found"
        exit 1
    fi
    
    local md_count=$(find "$DOCS_DIR" -name "*.md" | wc -l)
    echo "📄 Found $md_count markdown files"
    
    if [ "$md_count" -eq 0 ]; then
        echo "❌ No markdown files found in $DOCS_DIR"
        exit 1
    fi
}

# Function to run markdown-link-check on all files
run_markdown_link_check() {
    echo "🔗 Running markdown-link-check..."
    
    local config_file="/tmp/link-check-config.json"
    cat > "$config_file" << EOF
{
  "ignorePatterns": [
    {
      "pattern": "^https://github.com/tosin2013/mcp-adr-analysis-server"
    },
    {
      "pattern": "^mailto:"
    },
    {
      "pattern": "^#"
    }
  ],
  "httpHeaders": [
    {
      "urls": ["https://github.com"],
      "headers": {
        "User-Agent": "Mozilla/5.0 (compatible; link-checker)"
      }
    }
  ],
  "timeout": "10s",
  "retryOn429": true,
  "retryCount": 3,
  "fallbackProtocols": ["http", "https"]
}
EOF

    local report_file="$REPORT_DIR/markdown-link-check_$TIMESTAMP.txt"
    
    echo "📝 Generating detailed link check report: $report_file"
    
    # Find all markdown files and check them
    find "$DOCS_DIR" -name "*.md" -type f | while read -r file; do
        echo "Checking: $file" >> "$report_file"
        markdown-link-check "$file" --config "$config_file" >> "$report_file" 2>&1 || true
        echo "---" >> "$report_file"
    done
    
    echo "✅ Markdown link check complete. Report saved to: $report_file"
}

# Function to run broken-link-checker for more comprehensive checking
run_broken_link_checker() {
    echo "🌐 Running broken-link-checker..."
    
    local report_file="$REPORT_DIR/broken-link-checker_$TIMESTAMP.txt"
    
    # Check if we can build a simple HTTP server for the docs
    if command -v python3 >/dev/null 2>&1; then
        echo "🚀 Starting local documentation server..."
        
        # Start a simple HTTP server in background
        cd "$DOCS_DIR"
        python3 -m http.server 8080 > /dev/null 2>&1 &
        local server_pid=$!
        
        # Wait a moment for server to start
        sleep 3
        
        # Check if server is running
        if curl -s http://localhost:8080 > /dev/null; then
            echo "✅ Local server running on http://localhost:8080"
            
            # Run broken link checker
            blc http://localhost:8080 \
                --recursive \
                --ordered \
                --exclude-external \
                --filter-level 3 \
                > "$report_file" 2>&1 || true
            
            # Stop the server
            kill $server_pid 2>/dev/null || true
            
            echo "✅ Broken link checker complete. Report saved to: $report_file"
        else
            echo "❌ Could not start local server for comprehensive checking"
        fi
    else
        echo "⚠️  Python3 not available, skipping broken-link-checker"
    fi
}

# Function to analyze and categorize broken links
analyze_broken_links() {
    echo "📊 Analyzing broken links..."
    
    local analysis_file="$REPORT_DIR/link-analysis_$TIMESTAMP.json"
    
    python3 << EOF
import os
import re
import json
from pathlib import Path

def analyze_links():
    docs_dir = Path("$DOCS_DIR")
    broken_links = {
        "missing_files": [],
        "broken_anchors": [],
        "external_links": [],
        "malformed_links": [],
        "research_links": []
    }
    
    # Scan all markdown files
    for md_file in docs_dir.rglob("*.md"):
        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Find all markdown links
            link_pattern = r'\[([^\]]*)\]\(([^)]+)\)'
            matches = re.findall(link_pattern, content)
            
            for text, url in matches:
                # Skip external URLs and anchors for now
                if url.startswith(('http', 'https', 'mailto', '#')):
                    continue
                    
                # Check if it's a research link
                if 'perform_research_research_' in url:
                    broken_links["research_links"].append({
                        "file": str(md_file.relative_to(docs_dir)),
                        "link_text": text,
                        "url": url
                    })
                    continue
                
                # Resolve relative path
                if url.startswith('./'):
                    target_path = md_file.parent / url[2:]
                elif url.startswith('../'):
                    target_path = md_file.parent / url
                else:
                    target_path = md_file.parent / url
                
                # Check if target exists
                if not target_path.exists():
                    # Try adding .md extension if not present
                    if not url.endswith('.md') and not target_path.with_suffix('.md').exists():
                        broken_links["missing_files"].append({
                            "file": str(md_file.relative_to(docs_dir)),
                            "link_text": text,
                            "url": url,
                            "resolved_path": str(target_path)
                        })
        except Exception as e:
            print(f"Error processing {md_file}: {e}")
    
    return broken_links

# Run analysis
result = analyze_links()

# Save results
with open("$analysis_file", 'w') as f:
    json.dump(result, f, indent=2)

# Print summary
print(f"📊 Link Analysis Summary:")
print(f"   Missing files: {len(result['missing_files'])}")
print(f"   Research links: {len(result['research_links'])}")
print(f"   Broken anchors: {len(result['broken_anchors'])}")
print(f"   External links: {len(result['external_links'])}")
print(f"   Malformed links: {len(result['malformed_links'])}")
print(f"📄 Detailed analysis saved to: $analysis_file")
EOF
}

# Function to generate fix recommendations
generate_fix_recommendations() {
    echo "💡 Generating fix recommendations..."
    
    local recommendations_file="$REPORT_DIR/fix-recommendations_$TIMESTAMP.md"
    
    cat > "$recommendations_file" << 'EOF'
# Documentation Link Fix Recommendations

## Priority 1: Critical Navigation Links
These links are essential for user navigation and should be fixed first.

### Missing How-To Guides
- [ ] `how-to-guides/migrate-existing-adrs.md`
- [ ] `how-to-guides/prd-to-adrs.md`
- [ ] `how-to-guides/progress-tracking.md`

### Missing Reference Documentation
- [ ] `reference/adr-templates.md`
- [ ] `reference/json-schemas.md`

### Missing Explanation Content
- [ ] `explanation/ai-architecture-concepts.md`
- [ ] `explanation/tool-design.md`
- [ ] `explanation/security-philosophy.md`
- [ ] `explanation/knowledge-graph.md`
- [ ] `explanation/prompt-engineering.md`
- [ ] `explanation/performance-design.md`

## Priority 2: Research Directory Cleanup
The research directory has 150+ broken links that should be cleaned up.

### Recommended Actions:
1. **Remove broken research links** - Most are auto-generated placeholders
2. **Create research index** - Organize existing research files
3. **Update research README** - Remove references to non-existent files

## Priority 3: Sample Project Links
Several tutorials reference sample ADRs that don't exist.

### Options:
1. **Create sample ADRs** - Add realistic examples
2. **Update references** - Point to existing ADR examples
3. **Remove references** - If samples aren't needed

## Priority 4: Anchor Links
Some internal page anchors need fixing in navigation files.

### Files to check:
- `diataxis-index.md` - Internal navigation anchors
- `api-reference.md` - Tool reference anchors

## Automated Fix Commands

```bash
# Run the comprehensive link fixer
docker run --rm -v $(pwd):/docs mcp-docs-checker /scripts/fix-broken-links.py

# Validate fixes
docker run --rm -v $(pwd):/docs mcp-docs-checker /scripts/validate-docs.sh

# Build documentation locally
docker run --rm -v $(pwd):/docs -p 4173:4173 mcp-docs-checker npm run docs:build
```
EOF

    echo "📋 Fix recommendations generated: $recommendations_file"
}

# Main execution
main() {
    echo "🚀 Starting comprehensive documentation validation..."
    
    # Check documentation structure
    check_docs_structure
    
    # Run different types of link checking
    run_markdown_link_check
    
    # Run comprehensive broken link checker
    run_broken_link_checker
    
    # Analyze and categorize issues
    analyze_broken_links
    
    # Generate actionable recommendations
    generate_fix_recommendations
    
    echo "✅ Documentation validation complete!"
    echo "📊 Reports generated in: $REPORT_DIR"
    echo ""
    echo "📋 Next steps:"
    echo "1. Review the analysis report: $REPORT_DIR/link-analysis_$TIMESTAMP.json"
    echo "2. Follow fix recommendations: $REPORT_DIR/fix-recommendations_$TIMESTAMP.md"
    echo "3. Run the link fixer: /scripts/fix-broken-links.py"
    echo "4. Validate fixes: /scripts/validate-docs.sh"
}

# Run main function
main "$@"
