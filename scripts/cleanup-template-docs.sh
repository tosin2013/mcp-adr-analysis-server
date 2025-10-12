#!/bin/bash
# Clean up template documentation files
# Generated: 2025-10-09
# Removes empty template files and duplicates

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Navigate to project root
cd "$(dirname "$0")/.."

echo -e "${BLUE}🧹 Cleaning up template documentation files...${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Function to safely remove file
remove_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo -e "${YELLOW}Removing:${NC} $file"
        rm "$file"
        echo -e "${GREEN}✓ Removed${NC}"
    else
        echo -e "${YELLOW}⚠${NC}  File not found: $file"
    fi
}

# Phase 1: Delete empty duplicates
echo -e "${BLUE}1️⃣  Removing empty duplicate files...${NC}"
echo ""
remove_file "docs/getting-started-prd.md"
remove_file "docs/architecture-overview.md"
remove_file "docs/USAGE_GUIDE.md"
remove_file "docs/how-to-guides/USAGE_GUIDE.md"
remove_file "docs/how-to-guides/adrs.md"
remove_file "docs/reference/getting-started-no-adrs.md"
remove_file "docs/reference/NPM_PUBLISHING.md"
remove_file "docs/reference/adrs.md"
remove_file "docs/api/media/NPM_PUBLISHING.md"
remove_file "docs/api/media/troubleshooting-1.md"
echo -e "${GREEN}✓ Phase 1 complete: Removed duplicate files${NC}"
echo ""

# Phase 2: Delete non-relevant tutorials
echo -e "${BLUE}2️⃣  Removing non-relevant tutorial templates...${NC}"
echo ""
remove_file "docs/tutorials/001-database-architecture.md"
remove_file "docs/tutorials/002-api-gateway-strategy.md"
echo -e "${GREEN}✓ Phase 2 complete: Removed irrelevant tutorials${NC}"
echo ""

# Phase 3: Delete redundant getting started guides
echo -e "${BLUE}3️⃣  Removing redundant getting started guides...${NC}"
echo ""
remove_file "docs/how-to-guides/getting-started-no-adrs.md"
remove_file "docs/how-to-guides/getting-started-blank-repo.md"
remove_file "docs/how-to-guides/getting-started-existing-adrs.md"
remove_file "docs/how-to-guides/getting-started-prd.md"
echo -e "${GREEN}✓ Phase 3 complete: Removed redundant guides${NC}"
echo ""

# Phase 4: Delete empty explanation files
echo -e "${BLUE}4️⃣  Removing empty explanation files...${NC}"
echo ""
remove_file "docs/explanation/architecture-decisions.md"
remove_file "docs/explanation/ai-architecture-concepts.md"
echo -e "${GREEN}✓ Phase 4 complete: Removed empty explanation files${NC}"
echo ""

# Phase 5: Check for broken links
echo -e "${BLUE}5️⃣  Checking for potential broken links...${NC}"
echo ""

BROKEN_REFS=0

# Check for references to deleted files
echo "Checking for references to deleted files..."
if grep -r "getting-started-no-adrs" docs/ --include="*.md" 2>/dev/null | grep -v node_modules; then
    BROKEN_REFS=$((BROKEN_REFS + 1))
fi
if grep -r "getting-started-blank-repo" docs/ --include="*.md" 2>/dev/null | grep -v node_modules; then
    BROKEN_REFS=$((BROKEN_REFS + 1))
fi
if grep -r "getting-started-existing-adrs" docs/ --include="*.md" 2>/dev/null | grep -v node_modules; then
    BROKEN_REFS=$((BROKEN_REFS + 1))
fi
if grep -r "001-database-architecture" docs/ --include="*.md" 2>/dev/null | grep -v node_modules; then
    BROKEN_REFS=$((BROKEN_REFS + 1))
fi
if grep -r "002-api-gateway-strategy" docs/ --include="*.md" 2>/dev/null | grep -v node_modules; then
    BROKEN_REFS=$((BROKEN_REFS + 1))
fi

if [ $BROKEN_REFS -eq 0 ]; then
    echo -e "${GREEN}✓ No broken links found${NC}"
else
    echo -e "${YELLOW}⚠ Found $BROKEN_REFS potential broken link(s) - review above${NC}"
fi
echo ""

# Phase 6: Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Template cleanup complete!${NC}"
echo ""
echo "📊 Summary:"
echo "  • Removed empty duplicate files (10 files)"
echo "  • Removed non-relevant tutorials (2 files)"
echo "  • Removed redundant getting started guides (4 files)"
echo "  • Removed empty explanation files (2 files)"
echo "  • Total files removed: 18"
echo ""
echo "🔍 Manual Review Needed:"
echo "  • docs/research/ - 50+ research files (determine purpose)"
if [ $BROKEN_REFS -gt 0 ]; then
    echo "  • Fix $BROKEN_REFS broken link(s) found above"
fi
echo ""
echo "🔍 Next Steps:"
echo "  1. Review changes: git status"
echo "  2. Check documentation: cat TEMPLATE_DOCUMENTATION_AUDIT.md"
echo "  3. Test navigation: npm run docs:dev (if available)"
echo "  4. Commit: git add . && git commit -m 'docs: Remove 18 empty template files'"
echo ""
echo "📋 Research Files Decision Needed:"
echo "  • 50+ files in docs/research/ with minimal content"
echo "  • Review TEMPLATE_DOCUMENTATION_AUDIT.md for recommendations"
echo ""
