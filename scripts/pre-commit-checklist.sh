#!/bin/bash

# Pre-commit checklist for MCP ADR Analysis Server
echo "🔍 Pre-commit checklist for MCP ADR Analysis Server"
echo "=================================================="

# Check 1: Build
echo "1. Testing build..."
if npm run build; then
  echo "   ✅ Build successful"
else
  echo "   ❌ Build failed"
  exit 1
fi

# Check 2: Tests
echo "2. Running tests..."
if npm test; then
  echo "   ✅ All tests passing"
else
  echo "   ❌ Tests failed"
  exit 1
fi

# Check 3: Linting
echo "3. Running linter..."
if npm run lint; then
  echo "   ✅ Linting passed"
else
  echo "   ❌ Linting failed"
  exit 1
fi

# Check 4: Package validation
echo "4. Validating package..."
if npm run test:package; then
  echo "   ✅ Package validation passed"
else
  echo "   ❌ Package validation failed"
  exit 1
fi

# Check 5: Git status
echo "5. Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
  echo "   ⚠️  Uncommitted changes detected:"
  git status --short
else
  echo "   ✅ Working directory clean"
fi

# Check 6: Required files
echo "6. Checking required files..."
required_files=(
  "README.md"
  "package.json"
  "LICENSE"
  ".github/workflows/lint.yml"
  ".github/workflows/test.yml"
  ".github/workflows/build.yml"
  ".github/workflows/publish.yml"
  ".github/workflows/dependencies.yml"
  ".npmignore"
  "src/index.ts"
  "dist/src/index.js"
)

for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✅ $file exists"
  else
    echo "   ❌ $file missing"
  fi
done

# Check 7: Package.json validation
echo "7. Validating package.json..."
node -e "
const pkg = require('./package.json');
const required = ['name', 'version', 'description', 'main', 'bin', 'author', 'license', 'repository'];
const missing = required.filter(field => !pkg[field]);
if (missing.length > 0) {
  console.log('   ❌ Missing package.json fields:', missing.join(', '));
  process.exit(1);
} else {
  console.log('   ✅ Package.json is valid');
}
"

echo ""
echo "🎯 Pre-commit checklist complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set up NPM token in GitHub repository secrets"
echo "2. Configure GitHub Actions permissions"
echo "3. Commit and push to trigger workflows"
echo ""
echo "🔗 Repository: https://github.com/tosin2013/mcp-adr-analysis-server"
echo "🔑 NPM Token: https://www.npmjs.com/settings/tokens"
echo "⚙️  GitHub Settings: https://github.com/tosin2013/mcp-adr-analysis-server/settings"
