#!/bin/bash

# MCP ADR Analysis Server Documentation Workflow
# Comprehensive Docker-based documentation validation and fixing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_COMPOSE_FILE="docker-compose.docs.yml"
REPORTS_DIR="./reports"
BUILD_DIR="./build"

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Docker is required but not installed"
        exit 1
    fi
    
    if ! command -v docker-compose >/dev/null 2>&1; then
        log_error "Docker Compose is required but not installed"
        exit 1
    fi
    
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        log_error "Docker Compose file not found: $DOCKER_COMPOSE_FILE"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Function to setup environment
setup_environment() {
    log_info "Setting up documentation environment..."
    
    # Create necessary directories
    mkdir -p "$REPORTS_DIR" "$BUILD_DIR"
    
    # Build Docker images
    log_info "Building Docker images..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" build
    
    log_success "Environment setup complete"
}

# Function to run documentation validation
run_validation() {
    log_info "Running comprehensive documentation validation..."
    
    # Run validation service
    docker-compose -f "$DOCKER_COMPOSE_FILE" run --rm docs-validator
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_success "Documentation validation completed successfully"
    else
        log_warning "Documentation validation completed with issues (exit code: $exit_code)"
    fi
    
    return $exit_code
}

# Function to check links
check_links() {
    log_info "Running comprehensive link checking..."
    
    # Run link checker service
    docker-compose -f "$DOCKER_COMPOSE_FILE" run --rm link-checker
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_success "Link checking completed successfully"
    else
        log_warning "Link checking found issues (exit code: $exit_code)"
    fi
    
    return $exit_code
}

# Function to fix broken links
fix_links() {
    log_info "Running automated link fixer..."
    
    # Ask for confirmation unless --yes flag is provided
    if [[ "$1" != "--yes" ]]; then
        echo ""
        log_warning "This will automatically fix broken links in your documentation."
        log_warning "It will create missing files and update existing files."
        echo ""
        read -p "Do you want to continue? (y/N): " -n 1 -r
        echo ""
        
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Link fixing cancelled by user"
            return 0
        fi
    fi
    
    # Run link fixer service
    docker-compose -f "$DOCKER_COMPOSE_FILE" --profile fix run --rm link-fixer
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_success "Link fixing completed successfully"
    else
        log_error "Link fixing failed (exit code: $exit_code)"
    fi
    
    return $exit_code
}

# Function to preview documentation
preview_docs() {
    log_info "Starting documentation preview server..."
    
    # Build documentation first
    docker-compose -f "$DOCKER_COMPOSE_FILE" run --rm docs-validator /scripts/validate-docs.sh --build-only
    
    # Start preview server
    log_success "Documentation built successfully"
    log_info "Starting preview server on http://localhost:4173"
    
    docker-compose -f "$DOCKER_COMPOSE_FILE" --profile serve up docs-server
}

# Function to run dry-run link fixing
dry_run_fix() {
    log_info "Running dry-run link fixing (no changes will be made)..."
    
    # Run link fixer in dry-run mode
    docker-compose -f "$DOCKER_COMPOSE_FILE" --profile fix run --rm link-fixer python3 /scripts/fix-broken-links.py --docs-dir /docs/docs --dry-run
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_success "Dry-run completed successfully"
    else
        log_warning "Dry-run completed with issues (exit code: $exit_code)"
    fi
    
    return $exit_code
}

# Function to show reports
show_reports() {
    log_info "Showing validation reports..."
    
    if [ ! -d "$REPORTS_DIR" ] || [ -z "$(ls -A $REPORTS_DIR 2>/dev/null)" ]; then
        log_warning "No reports found. Run validation first."
        return 1
    fi
    
    echo ""
    log_info "Available reports in $REPORTS_DIR:"
    echo ""
    
    # List all reports with timestamps
    find "$REPORTS_DIR" -name "*.txt" -o -name "*.json" -o -name "*.md" | sort -r | head -10 | while read -r file; do
        local basename=$(basename "$file")
        local size=$(du -h "$file" | cut -f1)
        local mtime=$(stat -c %y "$file" 2>/dev/null || stat -f %Sm "$file" 2>/dev/null || echo "unknown")
        echo "  📄 $basename ($size) - $mtime"
    done
    
    echo ""
    log_info "To view a report: cat $REPORTS_DIR/<filename>"
}

# Function to clean up
cleanup() {
    log_info "Cleaning up Docker resources..."
    
    # Stop and remove containers
    docker-compose -f "$DOCKER_COMPOSE_FILE" down --remove-orphans
    
    # Optionally remove images
    if [[ "$1" == "--images" ]]; then
        log_info "Removing Docker images..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" down --rmi all
    fi
    
    log_success "Cleanup complete"
}

# Function to show comprehensive status
show_status() {
    log_info "Documentation Status Report"
    echo ""
    
    # Check if docs directory exists
    if [ -d "./docs" ]; then
        local md_count=$(find ./docs -name "*.md" | wc -l)
        log_success "Documentation directory: ./docs ($md_count markdown files)"
    else
        log_error "Documentation directory not found: ./docs"
    fi
    
    # Check reports
    if [ -d "$REPORTS_DIR" ] && [ "$(ls -A $REPORTS_DIR 2>/dev/null)" ]; then
        local report_count=$(ls -1 "$REPORTS_DIR" | wc -l)
        log_info "Reports available: $report_count files in $REPORTS_DIR"
    else
        log_warning "No validation reports found"
    fi
    
    # Check build
    if [ -d "$BUILD_DIR" ] && [ "$(ls -A $BUILD_DIR 2>/dev/null)" ]; then
        log_success "Documentation build exists: $BUILD_DIR"
    else
        log_warning "No documentation build found"
    fi
    
    # Check Docker
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps >/dev/null 2>&1; then
        log_info "Docker Compose services:"
        docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    fi
    
    echo ""
}

# Function to run full workflow
run_full_workflow() {
    log_info "Running full documentation workflow..."
    echo ""
    
    local start_time=$(date +%s)
    local issues_found=0
    
    # Step 1: Setup
    setup_environment
    echo ""
    
    # Step 2: Initial validation
    log_info "Step 1/4: Initial validation..."
    if ! run_validation; then
        ((issues_found++))
    fi
    echo ""
    
    # Step 3: Link checking
    log_info "Step 2/4: Link checking..."
    if ! check_links; then
        ((issues_found++))
    fi
    echo ""
    
    # Step 4: Show what would be fixed
    log_info "Step 3/4: Analyzing fixes needed..."
    dry_run_fix
    echo ""
    
    # Step 5: Ask about fixing
    if [ $issues_found -gt 0 ]; then
        log_warning "Found $issues_found categories of issues"
        echo ""
        read -p "Do you want to automatically fix broken links? (y/N): " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Step 4/4: Fixing issues..."
            fix_links --yes
        else
            log_info "Step 4/4: Skipping automatic fixes"
        fi
    else
        log_success "No issues found! Documentation is in good shape."
    fi
    
    echo ""
    
    # Final validation
    log_info "Final validation..."
    run_validation
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    log_success "Full workflow completed in ${duration}s"
    echo ""
    
    # Show final status
    show_status
    
    echo ""
    log_info "Next steps:"
    echo "  • Review reports: $0 --reports"
    echo "  • Preview docs: $0 --preview"
    echo "  • Fix remaining issues manually if needed"
    echo "  • Commit changes to git when satisfied"
}

# Function to show help
show_help() {
    cat << EOF
MCP ADR Analysis Server Documentation Workflow

USAGE:
    $0 [COMMAND] [OPTIONS]

COMMANDS:
    --validate, -v          Run documentation validation only
    --check-links, -c       Run link checking only  
    --fix-links, -f         Fix broken links automatically
    --dry-run, -d          Show what would be fixed (no changes)
    --preview, -p          Build and preview documentation locally
    --reports, -r          Show available validation reports
    --status, -s           Show current documentation status
    --cleanup              Clean up Docker resources
    --full                 Run complete workflow (default)
    --help, -h             Show this help message

OPTIONS:
    --yes                  Skip confirmation prompts (for --fix-links)
    --images              Remove Docker images during cleanup

EXAMPLES:
    $0                     # Run full workflow
    $0 --validate          # Just validate documentation
    $0 --dry-run           # See what would be fixed
    $0 --fix-links --yes   # Fix links without prompting
    $0 --preview           # Build and serve documentation locally
    $0 --cleanup --images  # Full cleanup including images

WORKFLOW:
    1. Validation: Check documentation structure and syntax
    2. Link Check: Find all broken internal and external links  
    3. Analysis: Show what fixes are available
    4. Fixing: Automatically create missing files and fix links
    5. Preview: Build and serve documentation for testing

REPORTS:
    All validation reports are saved to: $REPORTS_DIR/
    Use --reports to see available reports
    Use --status to see overall documentation health

For more information, see: docs/how-to-guides/troubleshooting.md
EOF
}

# Main execution
main() {
    local command="${1:---full}"
    
    # Check prerequisites for all commands except help
    if [[ "$command" != "--help" && "$command" != "-h" ]]; then
        check_prerequisites
    fi
    
    case "$command" in
        "--validate" | "-v")
            setup_environment
            run_validation
            ;;
        "--check-links" | "-c")
            setup_environment
            check_links
            ;;
        "--fix-links" | "-f")
            setup_environment
            fix_links "$2"
            ;;
        "--dry-run" | "-d")
            setup_environment
            dry_run_fix
            ;;
        "--preview" | "-p")
            setup_environment
            preview_docs
            ;;
        "--reports" | "-r")
            show_reports
            ;;
        "--status" | "-s")
            show_status
            ;;
        "--cleanup")
            cleanup "$2"
            ;;
        "--full")
            run_full_workflow
            ;;
        "--help" | "-h")
            show_help
            ;;
        *)
            # Default to full workflow
            run_full_workflow
            ;;
    esac
}

# Handle Ctrl+C gracefully
trap 'echo ""; log_warning "Interrupted by user"; cleanup; exit 130' INT

# Run main function with all arguments
main "$@"
