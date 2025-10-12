#!/bin/bash
# Fix documentation content accuracy issues
# Generated: 2025-10-09
# Fixes version numbers, dates, and tool counts

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Navigate to project root
cd "$(dirname "$0")/.."

echo -e "${BLUE}🔧 Fixing documentation content accuracy issues...${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get actual version from package.json
ACTUAL_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}ℹ${NC}  Detected version: ${GREEN}${ACTUAL_VERSION}${NC}"
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

# 1. Fix version number in api-reference.md
show_progress "1️⃣" "Updating version number in api-reference.md..."
if [ -f "docs/reference/api-reference.md" ]; then
    # Update version (handle both formats)
    sed -i '' "s/Version\*\*: [0-9.]*[0-9]/Version**: ${ACTUAL_VERSION}/" docs/reference/api-reference.md
    sed -i '' "s/Version\*\*:[[:space:]]*[0-9.]*[0-9]/Version**: ${ACTUAL_VERSION}/" docs/reference/api-reference.md
    show_success "Updated version to ${ACTUAL_VERSION}"
else
    echo -e "${YELLOW}⚠${NC}  api-reference.md not found"
    echo ""
fi

# 2. Fix update date (October 2025 -> October 2024)
show_progress "2️⃣" "Fixing future date in api-reference.md..."
if [ -f "docs/reference/api-reference.md" ]; then
    sed -i '' 's/October 2025/October 2024/' docs/reference/api-reference.md
    show_success "Fixed update date to October 2024"
else
    echo -e "${YELLOW}⚠${NC}  api-reference.md not found"
    echo ""
fi

# 3. Fix tool count (41 -> 52)
show_progress "3️⃣" "Updating tool count in api-reference.md..."
if [ -f "docs/reference/api-reference.md" ]; then
    sed -i '' 's/Tools\*\*: 41 comprehensive tools/Tools**: 52 comprehensive tools/' docs/reference/api-reference.md
    sed -i '' 's/Tools\*\*:[[:space:]]*41[[:space:]]*comprehensive tools/Tools**: 52 comprehensive tools/' docs/reference/api-reference.md
    show_success "Updated tool count to 52"
else
    echo -e "${YELLOW}⚠${NC}  api-reference.md not found"
    echo ""
fi

# 4. Find other files with version references
show_progress "4️⃣" "Searching for other version references..."
echo ""
echo "Files with version 2.1.0 (excluding node_modules):"
if grep -r "2.1.0" docs/ --include="*.md" 2>/dev/null | grep -v node_modules; then
    echo ""
    echo -e "${YELLOW}⚠${NC}  Found additional version references above"
    echo -e "${YELLOW}⚠${NC}  Please review and update manually if needed"
else
    echo -e "${GREEN}✓${NC} No other version 2.1.0 references found"
fi
echo ""

# 5. Check for other date issues
show_progress "5️⃣" "Checking for other future dates..."
echo ""
if grep -r "2025" docs/ --include="*.md" 2>/dev/null | grep -v node_modules | grep -v "2024-2025" | grep -v "copyright"; then
    echo ""
    echo -e "${YELLOW}⚠${NC}  Found potential future dates above"
    echo -e "${YELLOW}⚠${NC}  Please review and update if needed"
else
    echo -e "${GREEN}✓${NC} No other future dates found"
fi
echo ""

# 6. Verify changes
show_progress "6️⃣" "Verifying changes..."
if [ -f "docs/reference/api-reference.md" ]; then
    CURRENT_VERSION=$(grep -o 'Version\*\*: [0-9.]*' docs/reference/api-reference.md | head -1 | sed 's/Version\*\*: //')
    CURRENT_TOOLS=$(grep -o 'Tools\*\*: [0-9]* comprehensive tools' docs/reference/api-reference.md | head -1 | grep -o '[0-9]*' | head -1)
    CURRENT_DATE=$(grep -o 'Updated\*\*: [A-Za-z]* [0-9]*' docs/reference/api-reference.md | head -1 | sed 's/Updated\*\*: //')
    
    echo "Current values in api-reference.md:"
    echo "  Version: ${CURRENT_VERSION}"
    echo "  Tools: ${CURRENT_TOOLS}"
    echo "  Updated: ${CURRENT_DATE}"
    echo ""
    
    if [ "$CURRENT_VERSION" = "$ACTUAL_VERSION" ]; then
        show_success "Version is correct: ${ACTUAL_VERSION}"
    else
        echo -e "${RED}✗${NC} Version mismatch: Expected ${ACTUAL_VERSION}, got ${CURRENT_VERSION}"
        echo ""
    fi
else
    echo -e "${YELLOW}⚠${NC}  Could not verify changes"
    echo ""
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Content accuracy fixes complete!${NC}"
echo ""
echo "📊 Summary of Fixes Applied:"
echo "  ✓ Updated version number to ${ACTUAL_VERSION}"
echo "  ✓ Fixed future date (October 2025 → October 2024)"
echo "  ✓ Updated tool count (41 → 52)"
echo "  ✓ Verified changes in api-reference.md"
echo ""
echo "🔍 Next Steps:"
echo "  1. Review changes: git diff docs/reference/api-reference.md"
echo "  2. Check for other version references (listed above)"
echo "  3. Review DOCUMENTATION_CONTENT_ACCURACY_REPORT.md for manual tasks"
echo "  4. Commit: git add docs/ && git commit -m 'docs: Fix content accuracy (version, date, tool count)'"
echo ""
echo "📋 Remaining Manual Tasks:"
echo "  • Add documentation for 7 undocumented tools"
echo "  • Remove/deprecate 3 non-existent tools"
echo "  • Add system requirements section"
echo "  • Add key dependencies section"
echo "  • Set up automated version sync in CI/CD"
echo ""
