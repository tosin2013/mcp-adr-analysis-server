#!/bin/bash

# 🌐 MCP ADR Analysis Server - Documentation Website Setup Script
# This script automates the setup and management of the VitePress documentation website

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emoji for better UX
ROCKET="🚀"
CHECK="✅"
WARNING="⚠️"
INFO="ℹ️"
SPARKLES="✨"
GEAR="⚙️"

print_header() {
    echo -e "${PURPLE}===============================================${NC}"
    echo -e "${PURPLE}${ROCKET} MCP ADR Analysis Server Website Setup${NC}"
    echo -e "${PURPLE}===============================================${NC}"
    echo ""
}

print_section() {
    echo -e "${CYAN}${1}${NC}"
    echo "-------------------------------------------"
}

print_success() {
    echo -e "${GREEN}${CHECK} ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}${WARNING} ${1}${NC}"
}

print_info() {
    echo -e "${BLUE}${INFO} ${1}${NC}"
}

print_error() {
    echo -e "${RED}❌ ${1}${NC}"
}

# Check if we're in the docs directory
check_location() {
    if [[ ! -f "package.json" || ! -d ".vitepress" ]]; then
        print_error "This script must be run from the docs directory"
        print_info "Current directory: $(pwd)"
        print_info "Expected: .../mcp-adr-analysis-server/docs"
        exit 1
    fi
}

# Check Node.js version
check_node() {
    print_section "${GEAR} Checking Prerequisites"
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        print_info "Please install Node.js ≥18.0.0 from https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
    
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        print_error "Node.js version $NODE_VERSION is too old"
        print_info "Please upgrade to Node.js ≥18.0.0"
        exit 1
    fi
    
    print_success "Node.js version $NODE_VERSION ✓"
}

# Install dependencies
install_deps() {
    print_section "${GEAR} Installing Dependencies"
    
    if [ ! -d "node_modules" ]; then
        print_info "Installing VitePress and dependencies..."
        npm install
        print_success "Dependencies installed"
    else
        print_info "Dependencies already installed"
        print_info "To reinstall, run: rm -rf node_modules package-lock.json && npm install"
    fi
}

# Development server
dev_server() {
    print_section "${ROCKET} Starting Development Server"
    print_info "Starting VitePress development server..."
    print_info "Website will be available at: http://localhost:5173"
    print_info "Press Ctrl+C to stop the server"
    echo ""
    print_warning "This will start the server and keep running..."
    
    npm run docs:dev
}

# Build for production
build_site() {
    print_section "${GEAR} Building for Production"
    print_info "Building static website..."
    
    npm run docs:build
    
    if [ $? -eq 0 ]; then
        print_success "Build completed successfully!"
        print_info "Output directory: .vitepress/dist/"
        print_info "Total size: $(du -sh .vitepress/dist/ | cut -f1)"
        
        # Count files
        FILE_COUNT=$(find .vitepress/dist -type f | wc -l)
        print_info "Generated files: $FILE_COUNT"
    else
        print_error "Build failed"
        exit 1
    fi
}

# Preview built site
preview_site() {
    print_section "${SPARKLES} Previewing Built Site"
    
    if [ ! -d ".vitepress/dist" ]; then
        print_warning "No built site found. Building first..."
        build_site
    fi
    
    print_info "Starting preview server for built site..."
    print_info "Preview will be available at: http://localhost:4173"
    print_info "Press Ctrl+C to stop the server"
    echo ""
    
    npm run docs:preview
}

# Deploy to GitHub Pages
deploy_github() {
    print_section "${ROCKET} Deploying to GitHub Pages"
    
    # Check if we're in a git repository
    if [ ! -d "../.git" ]; then
        print_error "Not in a git repository"
        print_info "Initialize git and push to GitHub first"
        exit 1
    fi
    
    # Check if GitHub Actions workflow exists
    if [ ! -f "../.github/workflows/docs.yml" ]; then
        print_warning "GitHub Actions workflow not found"
        print_info "The workflow should be at: .github/workflows/docs.yml"
        print_info "This script created it, so it should exist"
    fi
    
    print_info "To deploy to GitHub Pages:"
    echo ""
    echo "1. Ensure your changes are committed:"
    echo "   git add ."
    echo "   git commit -m 'Update documentation website'"
    echo ""
    echo "2. Push to main branch:"
    echo "   git push origin main"
    echo ""
    echo "3. GitHub Actions will automatically build and deploy"
    echo "4. Your site will be available at:"
    echo "   https://$(git config remote.origin.url | sed 's/.*github.com[:/]\([^/]*\)\/\([^/.]*\).*/\1.github.io\/\2/')/"
    echo ""
    
    read -p "Would you like to commit and push now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd ..
        git add .
        git commit -m "Update documentation website and setup" || print_warning "Nothing to commit"
        git push origin main
        print_success "Pushed to GitHub! Check Actions tab for deployment status"
    fi
}

# Clean build artifacts
clean() {
    print_section "${GEAR} Cleaning Build Artifacts"
    
    if [ -d ".vitepress/dist" ]; then
        rm -rf .vitepress/dist
        print_success "Removed .vitepress/dist/"
    fi
    
    if [ -d ".vitepress/cache" ]; then
        rm -rf .vitepress/cache
        print_success "Removed .vitepress/cache/"
    fi
    
    if [ -d "node_modules" ]; then
        read -p "Remove node_modules? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf node_modules package-lock.json
            print_success "Removed node_modules and package-lock.json"
        fi
    fi
    
    print_success "Cleanup completed"
}

# Show help
show_help() {
    print_header
    echo -e "${GREEN}Usage: ./setup-website.sh [command]${NC}"
    echo ""
    echo "Commands:"
    echo "  setup    - Install dependencies and check prerequisites"
    echo "  dev      - Start development server (with hot reload)"
    echo "  build    - Build static site for production"
    echo "  preview  - Preview built site locally"
    echo "  deploy   - Guide for deploying to GitHub Pages"
    echo "  clean    - Clean build artifacts and cache"
    echo "  help     - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./setup-website.sh setup    # First-time setup"
    echo "  ./setup-website.sh dev      # Start development"
    echo "  ./setup-website.sh build    # Build for production"
    echo ""
    echo "Quick start:"
    echo "  1. ./setup-website.sh setup"
    echo "  2. ./setup-website.sh dev"
    echo "  3. Open http://localhost:5173"
    echo ""
}

# Main script logic
main() {
    print_header
    
    # Parse command line arguments
    case "${1:-help}" in
        "setup")
            check_location
            check_node
            install_deps
            print_success "Setup completed! Run './setup-website.sh dev' to start"
            ;;
        "dev")
            check_location
            check_node
            install_deps
            dev_server
            ;;
        "build")
            check_location
            check_node
            install_deps
            build_site
            ;;
        "preview")
            check_location
            check_node
            install_deps
            preview_site
            ;;
        "deploy")
            check_location
            deploy_github
            ;;
        "clean")
            check_location
            clean
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
