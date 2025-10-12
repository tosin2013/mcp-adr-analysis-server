#!/bin/bash
# Fix common documentation accuracy issues
# Generated: 2025-10-09
# Based on documentation accuracy validation report

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Navigate to project root
cd "$(dirname "$0")/.."

echo -e "${BLUE}🔧 Fixing documentation accuracy issues...${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Function to show progress
show_progress() {
    local step=$1
    local description=$2
    echo -e "${YELLOW}${step}${NC} ${description}"
}

# Function to show success
show_success() {
    local message=$1
    echo -e "${GREEN}✓${NC} ${message}"
    echo ""
}

# 1. Fix relative paths in tutorials
show_progress "1️⃣" "Fixing relative paths in tutorials..."
if find docs/tutorials -name "*.md" -type f 2>/dev/null | grep -q .; then
    find docs/tutorials -name "*.md" -type f -exec sed -i '' \
      -e 's|\./how-to-guides/|../how-to-guides/|g' \
      -e 's|\./reference/|../reference/|g' \
      -e 's|\./explanation/|../explanation/|g' \
      -e 's|\.\.\.\/|../|g' {} \;
    show_success "Fixed relative paths in tutorial files"
else
    echo -e "${YELLOW}⚠${NC}  No tutorial files found"
    echo ""
fi

# 2. Fix relative paths in how-to-guides
show_progress "2️⃣" "Fixing relative paths in how-to-guides..."
if find docs/how-to-guides -name "*.md" -type f 2>/dev/null | grep -q .; then
    find docs/how-to-guides -name "*.md" -type f -exec sed -i '' \
      -e 's|\./tutorials/|../tutorials/|g' \
      -e 's|\./reference/|../reference/|g' \
      -e 's|\./explanation/|../explanation/|g' \
      -e 's|\.\.\.\/|../|g' {} \;
    show_success "Fixed relative paths in how-to-guide files"
else
    echo -e "${YELLOW}⚠${NC}  No how-to-guide files found"
    echo ""
fi

# 3. Fix relative paths in explanation
show_progress "3️⃣" "Fixing relative paths in explanation..."
if find docs/explanation -name "*.md" -type f 2>/dev/null | grep -q .; then
    find docs/explanation -name "*.md" -type f -exec sed -i '' \
      -e 's|\./tutorials/|../tutorials/|g' \
      -e 's|\./how-to-guides/|../how-to-guides/|g' \
      -e 's|\./reference/|../reference/|g' \
      -e 's|\.\.\.\/|../|g' {} \;
    show_success "Fixed relative paths in explanation files"
else
    echo -e "${YELLOW}⚠${NC}  No explanation files found"
    echo ""
fi

# 4. Fix diataxis-index.md paths
show_progress "4️⃣" "Fixing diataxis-index.md paths..."
if [ -f "docs/diataxis-index.md" ]; then
    sed -i '' \
      -e 's|](tutorials/|](./tutorials/|g' \
      -e 's|](how-to-guides/|](./how-to-guides/|g' \
      -e 's|](reference/|](./reference/|g' \
      -e 's|](explanation/|](./explanation/|g' \
      docs/diataxis-index.md
    show_success "Fixed diataxis-index.md navigation paths"
else
    echo -e "${YELLOW}⚠${NC}  diataxis-index.md not found"
    echo ""
fi

# 5. Fix invalid anchor links (remove leading hyphens)
show_progress "5️⃣" "Fixing invalid anchor links..."
find docs -name "*.md" -type f -exec sed -i '' 's|](#-|](#|g' {} \;
show_success "Fixed invalid anchor link formats"

# 6. Update HTTP to HTTPS (except localhost)
show_progress "6️⃣" "Updating HTTP to HTTPS..."
find docs -name "*.md" -type f -exec sed -i '' \
  's|http://\([^l]\)|https://\1|g' {} \;
show_success "Updated HTTP URLs to HTTPS"

# 7. Fix triple-dot paths
show_progress "7️⃣" "Fixing invalid triple-dot paths..."
find docs -name "*.md" -type f -exec sed -i '' 's|\.\.\.\/|../|g' {} \;
show_success "Fixed triple-dot path patterns"

# 8. Fix mcp-concepts.md specific issues
show_progress "8️⃣" "Fixing mcp-concepts.md specific issues..."
if [ -f "docs/explanation/mcp-concepts.md" ]; then
    sed -i '' \
      -e 's|\.\.\.\/tutorials/|../tutorials/|g' \
      -e 's|\.\.\.\/reference/|../reference/|g' \
      docs/explanation/mcp-concepts.md
    show_success "Fixed mcp-concepts.md paths"
else
    echo -e "${YELLOW}⚠${NC}  mcp-concepts.md not found"
    echo ""
fi

# 9. Fix reference files pointing to wrong directories
show_progress "9️⃣" "Fixing reference file paths..."
if find docs/reference -name "*.md" -type f 2>/dev/null | grep -q .; then
    find docs/reference -name "*.md" -type f -exec sed -i '' \
      -e 's|\./how-to-guides/|../how-to-guides/|g' \
      -e 's|\./tutorials/|../tutorials/|g' \
      -e 's|\./explanation/|../explanation/|g' {} \;
    show_success "Fixed reference file paths"
else
    echo -e "${YELLOW}⚠${NC}  No reference files found"
    echo ""
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Documentation accuracy fixes complete!${NC}"
echo ""
echo "📊 Summary of Fixes Applied:"
echo "  ✓ Fixed relative paths in tutorials (./→../)"
echo "  ✓ Fixed relative paths in how-to-guides"
echo "  ✓ Fixed relative paths in explanation"
echo "  ✓ Fixed diataxis-index.md navigation"
echo "  ✓ Fixed invalid anchor links (#-→#)"
echo "  ✓ Updated HTTP to HTTPS"
echo "  ✓ Fixed triple-dot paths (...→..)"
echo "  ✓ Fixed mcp-concepts.md specific issues"
echo "  ✓ Fixed reference file paths"
echo ""
echo "🔍 Next Steps:"
echo "  1. Review changes: git diff docs/"
echo "  2. Test navigation: npm run docs:dev"
echo "  3. Create missing files (see DOCUMENTATION_ACCURACY_REPORT.md)"
echo "  4. Commit: git add docs/ && git commit -m 'docs: Fix documentation accuracy issues'"
echo ""
echo "📋 Remaining Manual Tasks:"
echo "  • Create RESEARCH-DRIVEN-ARCHITECTURE.md"
echo "  • Create explanation/performance-design.md"
echo "  • Create DEVELOPER_GUIDANCE.md"
echo "  • Create CONTRIBUTING.md (root level)"
echo "  • Review and remove references to non-existent files"
echo ""
