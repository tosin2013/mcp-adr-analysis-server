#!/bin/bash
# Remove duplicate documentation files
# Generated: 2025-10-09
# Based on documentation validation report

set -e

echo "🧹 Removing duplicate documentation files..."
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to safely remove file
remove_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo -e "${YELLOW}Removing:${NC} $file"
        rm "$file"
        echo -e "${GREEN}✓ Removed${NC}"
    else
        echo -e "${RED}✗ File not found:${NC} $file"
    fi
    echo ""
}

# Navigate to project root
cd "$(dirname "$0")/.."

echo "📋 Duplicate Files to Remove:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Critical duplicates - keep canonical versions

echo "1️⃣  NPM_PUBLISHING.md (keeping reference/ version)"
remove_file "docs/how-to-guides/NPM_PUBLISHING.md"
remove_file "docs/notes/media/NPM_PUBLISHING.md"

echo "2️⃣  server-architecture.md (keeping explanation/ version)"
remove_file "docs/notes/media/server-architecture.md"

echo "3️⃣  getting-started-workflow-guidance.md (keeping how-to-guides/ version)"
remove_file "docs/notes/media/getting-started-workflow-guidance.md"

echo "4️⃣  troubleshooting.md (keeping how-to-guides/ version)"
remove_file "docs/notes/media/troubleshooting-1.md"
remove_file "docs/troubleshooting.md"

echo "5️⃣  release-dashboard.md (keeping root docs/ version)"
remove_file "docs/notes/media/release-dashboard.md"

echo "6️⃣  environment-config.md (keeping reference/ version)"
remove_file "docs/notes/media/environment-config.md"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Duplicate removal complete!${NC}"
echo ""
echo "📊 Summary:"
echo "  • Removed duplicate files from docs/notes/media/"
echo "  • Kept canonical versions in proper Diataxis locations"
echo "  • Maintained documentation structure integrity"
echo ""
echo "🔍 Next Steps:"
echo "  1. Review changes: git status"
echo "  2. Verify links still work: npm run docs:dev"
echo "  3. Commit changes: git add . && git commit -m 'docs: Remove duplicate documentation files'"
echo ""
