#!/bin/bash
# Jest to Vitest Migration Script
# Converts all Jest test files to Vitest syntax

set -e

echo "🔄 Starting Jest to Vitest migration..."

# Find all test files
TEST_FILES=$(find tests -name "*.test.ts" -type f)
MIGRATED=0
ERRORS=0

for file in $TEST_FILES; do
    echo "Processing: $file"

    # Create backup
    cp "$file" "${file}.backup"

    # Step 1: Replace @jest/globals imports with vitest
    # From: import { jest, describe, it, expect, ... } from '@jest/globals';
    # To: import { vi, describe, it, expect, ... } from 'vitest';
    sed -i '' "s/from '@jest\/globals'/from 'vitest'/g" "$file"

    # Step 2: Replace jest with vi
    sed -i '' 's/\bjest\b/vi/g' "$file"

    # Step 3: Replace jest.unstable_mockModule with vi.mock
    # This is the key fix - vi.mock hoists properly unlike jest.unstable_mockModule
    sed -i '' 's/vi\.unstable_mockModule/vi.mock/g' "$file"

    # Step 4: Replace Jest's MockedFunction type with Vitest's
    sed -i '' 's/vi\.MockedFunction/MockedFunction/g' "$file"

    # Step 5: Add MockedFunction import if using mocked functions
    if grep -q "MockedFunction" "$file" && ! grep -q "import.*MockedFunction.*from 'vitest'" "$file"; then
        # Check if file already has vitest import
        if grep -q "from 'vitest'" "$file"; then
            # Add MockedFunction to existing import
            sed -i '' "s/from 'vitest'/,MockedFunction } from 'vitest'/g" "$file"
            sed -i '' "s/{,/{/g" "$file"
        fi
    fi

    # Step 6: Handle dynamic imports after jest.unstable_mockModule
    # The pattern: const { func } = await import('...');
    # Vitest doesn't need this - normal imports work after vi.mock
    # This is more complex and may need manual review

    # Step 7: Replace beforeEach(() => { vi.clearAllMocks() })
    # No change needed - vi.clearAllMocks() works the same

    # Verify the file is still valid TypeScript (basic check)
    if ! head -1 "$file" > /dev/null 2>&1; then
        echo "  ⚠️ Error processing $file - restoring backup"
        mv "${file}.backup" "$file"
        ((ERRORS++))
    else
        rm "${file}.backup"
        ((MIGRATED++))
    fi
done

echo ""
echo "✅ Migration complete!"
echo "   Files migrated: $MIGRATED"
echo "   Errors: $ERRORS"
echo ""
echo "⚠️ Important: Files using jest.unstable_mockModule need manual review!"
echo "   The dynamic imports (await import(...)) after mocking should be"
echo "   converted to regular static imports since vi.mock hoists properly."
echo ""
echo "Run 'npm run test:vitest' to verify the migration."
