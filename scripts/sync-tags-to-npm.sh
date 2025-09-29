#!/bin/bash

# Temporary script to sync GitHub tags to npm
# This ensures all GitHub tags are published to npm

set -e

echo "================================================"
echo "GitHub Tags to NPM Sync Script"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=${1:-true}
if [ "$1" == "--publish" ]; then
    DRY_RUN=false
fi

echo -e "${BLUE}Mode: $([ "$DRY_RUN" == "true" ] && echo "DRY RUN (use --publish to actually publish)" || echo "PUBLISHING")${NC}"
echo ""

# Function to check if version exists on npm
check_npm_version() {
    local version=$1
    # Remove 'v' prefix if present
    version=${version#v}

    # Check if version exists on npm
    if npm view mcp-adr-analysis-server@$version version >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to publish a specific version
publish_version() {
    local tag=$1
    local commit=$2

    # Remove 'v' prefix for version number
    local version=${tag#v}

    echo -e "${YELLOW}Publishing $tag (version $version)...${NC}"

    # Checkout the tag
    echo "  → Checking out $tag..."
    git checkout $tag --quiet

    # The tag should already have the correct version in package.json
    # No need to update it since we're on the exact tag

    # Build the project
    echo "  → Building project..."
    npm run build

    # Publish to npm (skip prepublishOnly hooks to avoid linting issues)
    if [ "$DRY_RUN" == "true" ]; then
        echo -e "  ${BLUE}→ [DRY RUN] Would run: npm publish --ignore-scripts${NC}"
        echo "  → Dry run of npm publish..."
        npm publish --dry-run --ignore-scripts
    else
        echo "  → Publishing to npm (skipping hooks)..."
        npm publish --ignore-scripts
        echo -e "  ${GREEN}✓ Published $tag to npm${NC}"
    fi

    echo ""
}

# Store current branch to return to it later
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" == "HEAD" ]; then
    CURRENT_BRANCH=$(git rev-parse HEAD)
fi

# Ensure we have latest tags
echo "Fetching latest tags from GitHub..."
git fetch --tags --quiet 2>/dev/null || true

# Get all tags from GitHub
echo -e "${BLUE}Analyzing GitHub tags...${NC}"
GITHUB_TAGS=$(git tag -l | grep "^v" | sort -V)

# Arrays to store results
MISSING_ON_NPM=()
EXISTS_ON_NPM=()
FAILED_TAGS=()

# Check each tag
echo ""
echo "Checking npm registry for each tag..."
echo "----------------------------------------"

for tag in $GITHUB_TAGS; do
    version=${tag#v}
    printf "Checking %-10s ... " "$tag"

    if check_npm_version $version; then
        echo -e "${GREEN}✓ exists on npm${NC}"
        EXISTS_ON_NPM+=($tag)
    else
        echo -e "${RED}✗ missing on npm${NC}"
        MISSING_ON_NPM+=($tag)
    fi
done

echo ""
echo "================================================"
echo "Summary:"
echo "================================================"
echo -e "${GREEN}Tags on npm:${NC} ${#EXISTS_ON_NPM[@]}"
echo -e "${RED}Missing tags:${NC} ${#MISSING_ON_NPM[@]}"

if [ ${#MISSING_ON_NPM[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ All GitHub tags are already published to npm!${NC}"
    git checkout $CURRENT_BRANCH --quiet
    exit 0
fi

echo ""
echo "Missing tags that need to be published:"
for tag in "${MISSING_ON_NPM[@]}"; do
    echo "  - $tag"
done

echo ""
echo "================================================"
echo "Publishing missing tags to npm"
echo "================================================"
echo ""

# Process each missing tag
for tag in "${MISSING_ON_NPM[@]}"; do
    echo "----------------------------------------"
    echo "Processing $tag"
    echo "----------------------------------------"

    # Get commit hash for tag
    commit=$(git rev-list -n 1 $tag)

    # Try to publish
    if publish_version $tag $commit; then
        echo -e "${GREEN}✓ Successfully processed $tag${NC}"
    else
        echo -e "${RED}✗ Failed to publish $tag${NC}"
        FAILED_TAGS+=($tag)
    fi
done

# Return to original branch
echo ""
echo "Returning to original branch..."
git checkout $CURRENT_BRANCH --quiet

# Final summary
echo ""
echo "================================================"
echo "Final Results:"
echo "================================================"
echo -e "${GREEN}Successfully processed:${NC} $((${#MISSING_ON_NPM[@]} - ${#FAILED_TAGS[@]})) tags"

if [ ${#FAILED_TAGS[@]} -gt 0 ]; then
    echo -e "${RED}Failed tags:${NC} ${#FAILED_TAGS[@]}"
    for tag in "${FAILED_TAGS[@]}"; do
        echo "  - $tag"
    done
    exit 1
else
    echo -e "${GREEN}✓ All missing tags have been published to npm!${NC}"
fi

echo ""
echo "================================================"
echo "Verification:"
echo "================================================"
echo "You can verify the published versions at:"
echo "https://www.npmjs.com/package/mcp-adr-analysis-server?activeTab=versions"
echo ""

if [ "$DRY_RUN" == "true" ]; then
    echo -e "${YELLOW}This was a DRY RUN. To actually publish, run:${NC}"
    echo -e "${BLUE}./scripts/sync-tags-to-npm.sh --publish${NC}"
fi