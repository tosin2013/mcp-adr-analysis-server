#!/bin/bash

# Docusaurus Setup Script
# This script sets up Docusaurus for the MCP ADR Analysis Server documentation

set -e

echo "🚀 Setting up Docusaurus for MCP ADR Analysis Server..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the docs directory
if [ ! -f "docusaurus.config.js" ]; then
    echo "❌ Error: docusaurus.config.js not found. Please run this script from the docs directory."
    exit 1
fi

echo -e "${BLUE}Step 1: Cleaning old build artifacts...${NC}"
rm -rf .vitepress/dist .vitepress/cache build .docusaurus node_modules package-lock.json
echo -e "${GREEN}✅ Cleanup complete${NC}"
echo ""

echo -e "${BLUE}Step 2: Installing Docusaurus dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

echo -e "${BLUE}Step 3: Creating favicon from logo...${NC}"
if [ -f "static/img/logo.png" ]; then
    # Note: This requires ImageMagick. If not available, user needs to create favicon manually
    if command -v convert &> /dev/null; then
        convert static/img/logo.png -resize 32x32 static/img/favicon.ico
        echo -e "${GREEN}✅ Favicon created${NC}"
    else
        echo -e "${YELLOW}⚠️  ImageMagick not found. Please create favicon.ico manually from logo.png${NC}"
        echo "   You can use an online tool like https://favicon.io/favicon-converter/"
    fi
else
    echo -e "${YELLOW}⚠️  Logo not found at static/img/logo.png${NC}"
fi
echo ""

echo -e "${BLUE}Step 4: Verifying Docusaurus configuration...${NC}"
if npm run docusaurus -- --version &> /dev/null; then
    DOCUSAURUS_VERSION=$(npm run docusaurus -- --version 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    echo -e "${GREEN}✅ Docusaurus ${DOCUSAURUS_VERSION} is ready${NC}"
else
    echo -e "${YELLOW}⚠️  Could not verify Docusaurus version${NC}"
fi
echo ""

echo -e "${BLUE}Step 5: Testing local build...${NC}"
if npm run build; then
    echo -e "${GREEN}✅ Build successful!${NC}"
    echo ""
    echo -e "${GREEN}🎉 Docusaurus setup complete!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "  1. Start development server: ${GREEN}npm run start${NC}"
    echo "  2. View at: ${GREEN}http://localhost:3000/mcp-adr-analysis-server/${NC}"
    echo "  3. Build for production: ${GREEN}npm run build${NC}"
    echo "  4. Deploy: Push to main branch (GitHub Actions will deploy automatically)"
    echo ""
    echo -e "${BLUE}Optional:${NC}"
    echo "  - Configure Algolia search (see docusaurus.config.js)"
    echo "  - Customize theme colors (see src/css/custom.css)"
    echo "  - Review migration guide: ${GREEN}DOCUSAURUS_MIGRATION.md${NC}"
else
    echo -e "${YELLOW}⚠️  Build failed. Please check the errors above.${NC}"
    exit 1
fi
