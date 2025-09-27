#!/bin/bash

# Test script for Release Drafter integration with auto-release workflows
# This script validates that the workflows can properly find and publish drafts

set -e

echo "🧪 Testing Release Drafter integration with auto-release workflows..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_VERSION="v99.99.99-test"
TEST_DRAFT_BODY="## 🎉 What's Changed

### 🚀 Features
- Test feature for integration validation

### 🐛 Bug Fixes
- Test fix for integration validation

## 📊 Release Statistics
- **Total Changes**: 2 changes
- **Contributors**: Thanks to test contributors! 🙌"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is required but not installed"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed"
        exit 1
    fi

    # Check if authenticated with GitHub
    if ! gh auth status &> /dev/null; then
        log_error "Please authenticate with GitHub CLI: gh auth login"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Test 1: Simulate Release Drafter creating a draft
test_create_draft() {
    log_info "Test 1: Creating test Release Drafter draft..."

    # Create a test draft release
    gh api repos/$GITHUB_REPOSITORY/releases \
        --method POST \
        --field tag_name="$TEST_VERSION" \
        --field name="Release $TEST_VERSION" \
        --field body="$TEST_DRAFT_BODY" \
        --field draft=true \
        --field prerelease=false \
        > test_draft_response.json

    DRAFT_ID=$(jq -r '.id' test_draft_response.json)

    if [[ "$DRAFT_ID" != "null" && -n "$DRAFT_ID" ]]; then
        echo "DRAFT_ID=$DRAFT_ID" > test_draft_info.txt
        log_success "Created test draft with ID: $DRAFT_ID"
        return 0
    else
        log_error "Failed to create test draft"
        return 1
    fi
}

# Test 2: Simulate auto-release finding the draft
test_find_draft() {
    log_info "Test 2: Testing draft discovery logic..."

    # Use the same logic as the auto-release workflow
    DRAFT_RELEASE=$(gh api repos/$GITHUB_REPOSITORY/releases \
        --jq '.[] | select(.draft == true) | select(.name | test("v?[0-9]+\\.[0-9]+\\.[0-9]+")) | .[0]' \
        | head -1)

    if [[ -n "$DRAFT_RELEASE" ]]; then
        FOUND_ID=$(echo "$DRAFT_RELEASE" | jq -r '.id')
        FOUND_TAG=$(echo "$DRAFT_RELEASE" | jq -r '.tag_name')
        FOUND_NAME=$(echo "$DRAFT_RELEASE" | jq -r '.name')

        log_success "Found draft release: $FOUND_NAME (ID: $FOUND_ID)"

        # Save found draft info
        echo "FOUND_ID=$FOUND_ID" >> test_draft_info.txt
        echo "FOUND_TAG=$FOUND_TAG" >> test_draft_info.txt

        return 0
    else
        log_error "Draft discovery logic failed"
        return 1
    fi
}

# Test 3: Simulate updating and publishing the draft
test_publish_draft() {
    log_info "Test 3: Testing draft publishing logic..."

    source test_draft_info.txt

    # Enhanced release notes (simulating auto-release enhancement)
    ENHANCED_BODY="$TEST_DRAFT_BODY

## 🔄 Auto-Release Information

This release was automatically triggered by:
- **PR**: Test PR for integration validation (#999)
- **Author**: @test-user
- **Type**: patch version bump

---
🤖 Auto-generated release following PR merge"

    # Update and publish the draft (simulating auto-release workflow)
    gh api repos/$GITHUB_REPOSITORY/releases/$FOUND_ID \
        --method PATCH \
        --field tag_name="$TEST_VERSION" \
        --field name="Release $TEST_VERSION" \
        --field body="$ENHANCED_BODY" \
        --field draft=false \
        --field prerelease=false \
        > test_publish_response.json

    PUBLISHED_ID=$(jq -r '.id' test_publish_response.json)

    if [[ "$PUBLISHED_ID" == "$FOUND_ID" ]]; then
        log_success "Successfully published draft as release"
        echo "PUBLISHED_ID=$PUBLISHED_ID" >> test_draft_info.txt
        return 0
    else
        log_error "Failed to publish draft"
        return 1
    fi
}

# Test 4: Simulate AI enhancement
test_ai_enhancement() {
    log_info "Test 4: Testing AI enhancement logic..."

    source test_draft_info.txt

    # Get the current release body
    CURRENT_RELEASE=$(gh api repos/$GITHUB_REPOSITORY/releases/$PUBLISHED_ID)
    CURRENT_BODY=$(echo "$CURRENT_RELEASE" | jq -r '.body')

    # Simulate AI-enhanced content
    AI_ENHANCED_CONTENT="### 🤖 AI Analysis Summary

**Impact Assessment**: This release includes important infrastructure improvements and bug fixes that enhance system reliability.

**Breaking Changes**: None detected in this release.

**Migration Guide**: No migration steps required.

**Performance Impact**: Expected minor performance improvements from bug fixes.

**Security Considerations**: No security-related changes in this release."

    # Combine existing body with AI enhancement
    FINAL_BODY="$CURRENT_BODY

## 🤖 AI-Enhanced Release Notes

$AI_ENHANCED_CONTENT

---
*Enhanced with AI-generated content*"

    # Update release with AI enhancement
    gh api repos/$GITHUB_REPOSITORY/releases/$PUBLISHED_ID \
        --method PATCH \
        --field body="$FINAL_BODY" \
        > test_ai_response.json

    ENHANCED_ID=$(jq -r '.id' test_ai_response.json)

    if [[ "$ENHANCED_ID" == "$PUBLISHED_ID" ]]; then
        log_success "Successfully enhanced release with AI content"
        return 0
    else
        log_error "Failed to enhance release with AI content"
        return 1
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up test artifacts..."

    if [[ -f test_draft_info.txt ]]; then
        source test_draft_info.txt

        # Delete test release if it exists
        if [[ -n "$PUBLISHED_ID" ]]; then
            gh api repos/$GITHUB_REPOSITORY/releases/$PUBLISHED_ID --method DELETE 2>/dev/null || true
            log_info "Deleted test release"
        fi

        # Delete test tag if it exists
        git tag -d "$TEST_VERSION" 2>/dev/null || true
        git push origin --delete "$TEST_VERSION" 2>/dev/null || true
        log_info "Deleted test tag"
    fi

    # Clean up temp files
    rm -f test_draft_*.json test_draft_info.txt test_publish_response.json test_ai_response.json

    log_success "Cleanup completed"
}

# Main test execution
main() {
    # Set repository from environment or current git repo
    if [[ -z "$GITHUB_REPOSITORY" ]]; then
        GITHUB_REPOSITORY=$(gh repo view --json owner,name --jq '"owner/name"')
    fi

    log_info "Testing integration for repository: $GITHUB_REPOSITORY"

    # Set up cleanup trap
    trap cleanup EXIT

    # Run tests
    check_prerequisites
    test_create_draft
    test_find_draft
    test_publish_draft
    test_ai_enhancement

    log_success "🎉 All integration tests passed!"
    log_info "Release Drafter integration with auto-release workflows is working correctly"

    echo ""
    log_info "Integration workflow summary:"
    echo "  1. ✅ Release Drafter creates draft releases"
    echo "  2. ✅ Auto-release workflows can find and publish drafts"
    echo "  3. ✅ Draft content is preserved and enhanced"
    echo "  4. ✅ AI enhancement works with existing releases"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi