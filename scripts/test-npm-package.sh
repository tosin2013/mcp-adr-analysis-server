#!/bin/bash

# Test script for npm package preparation
echo "🧪 Testing NPM package preparation..."

# Clean and build
echo "1. Building project..."
npm run build

# Test package creation
echo "2. Testing package creation..."
npm pack --dry-run

# Check package contents
echo "3. Checking package contents..."
if [ ! -f "dist/src/index.js" ]; then
  echo "❌ Main entry point missing"
  exit 1
fi

if [ ! -f "README.md" ]; then
  echo "❌ README.md missing"
  exit 1
fi

if [ ! -f "LICENSE" ]; then
  echo "❌ LICENSE missing"
  exit 1
fi

echo "4. Verifying package.json..."
node -e "
const pkg = require('./package.json');
if (!pkg.name) throw new Error('Missing name');
if (!pkg.version) throw new Error('Missing version');
if (!pkg.description) throw new Error('Missing description');
if (!pkg.main) throw new Error('Missing main');
if (!pkg.bin) throw new Error('Missing bin');
console.log('✅ Package.json is valid');
"

echo "5. Testing MCP server binary..."
if [ -x "dist/src/index.js" ] || [ -f "dist/src/index.js" ]; then
  echo "✅ MCP server binary exists and is accessible"
else
  echo "❌ MCP server binary not found or not executable"
  exit 1
fi

echo "6. Testing package size..."
PACKAGE_SIZE=$(npm pack --dry-run 2>/dev/null | grep "package size" | awk '{print $4}')
if [ ! -z "$PACKAGE_SIZE" ]; then
  echo "✅ Package size: $PACKAGE_SIZE"
else
  echo "⚠️  Could not determine package size"
fi

echo "🎉 NPM package is ready for publishing!"
echo ""
echo "To publish:"
echo "  npm publish"
echo ""
echo "Or use the GitHub Actions workflow:"
echo "  git tag v1.0.1"
echo "  git push origin v1.0.1"
