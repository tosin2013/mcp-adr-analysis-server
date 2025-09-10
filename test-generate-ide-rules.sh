#!/bin/bash

# Test script for generate-ide-rules
# This script tests the standalone IDE rules generator

set -e

echo "🧪 Testing generate-ide-rules script..."

# Create a temporary test directory
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"

echo "📁 Created test directory: $TEST_DIR"

# Create a mock project structure
mkdir -p src test
echo '{"name": "test-project", "scripts": {"test": "jest"}, "dependencies": {"react": "^18.0.0", "typescript": "^5.0.0"}}' > package.json
echo 'console.log("Hello, World!");' > src/index.ts
echo 'test("example", () => { expect(true).toBe(true); });' > test/example.test.ts
echo "# Test Project" > README.md

echo "✅ Created mock project structure"

# Test the script with different options
echo "🔧 Testing basic generation..."
/Users/tosinakinosho/workspaces/mcp-adr-analysis-server/generate-ide-rules.sh --ide cursor --output ./test-output

echo "🔧 Testing with workflows..."
/Users/tosinakinosho/workspaces/mcp-adr-analysis-server/generate-ide-rules.sh --ide vscode --include-workflows --output ./test-output-workflows

echo "🔧 Testing with all options..."
/Users/tosinakinosho/workspaces/mcp-adr-analysis-server/generate-ide-rules.sh --ide windsurf \
  --include-workflows \
  --include-snippets \
  --include-shortcuts \
  --security-focus \
  --team-size medium \
  --output ./test-output-full

# Check outputs
echo "📋 Checking outputs..."

if [[ -f "./test-output/generate-prompt.txt" ]]; then
    echo "✅ Basic generation: prompt file created"
else
    echo "❌ Basic generation: prompt file missing"
fi

if [[ -f "./test-output/README.md" ]]; then
    echo "✅ Basic generation: README created"
else
    echo "❌ Basic generation: README missing"
fi

if [[ -f "./test-output-workflows/generate-prompt.txt" ]]; then
    echo "✅ Workflows generation: prompt file created"
else
    echo "❌ Workflows generation: prompt file missing"
fi

if [[ -f "./test-output-full/generate-prompt.txt" ]]; then
    echo "✅ Full generation: prompt file created"
else
    echo "❌ Full generation: prompt file missing"
fi

# Check content quality
echo "📝 Checking content quality..."

if grep -q "Node.js" "./test-output/generate-prompt.txt"; then
    echo "✅ Content: Node.js detected"
else
    echo "❌ Content: Node.js not detected"
fi

if grep -q "TypeScript" "./test-output/generate-prompt.txt"; then
    echo "✅ Content: TypeScript detected"
else
    echo "❌ Content: TypeScript not detected"
fi

if grep -q "React" "./test-output/generate-prompt.txt"; then
    echo "✅ Content: React detected"
else
    echo "❌ Content: React not detected"
fi

# Test help option
echo "🆘 Testing help option..."
/Users/tosinakinosho/workspaces/mcp-adr-analysis-server/generate-ide-rules.sh --help

echo "🎉 All tests completed!"
echo "📁 Test directory: $TEST_DIR"
echo "💡 You can inspect the generated files in the test directory"

# Cleanup option
read -p "🗑️  Clean up test directory? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "$TEST_DIR"
    echo "✅ Test directory cleaned up"
else
    echo "📁 Test directory preserved at: $TEST_DIR"
fi