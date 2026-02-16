---
name: 'ESM Module Validation'
description: 'Enforces strict ESM compliance: .js extensions, no CommonJS patterns, package.json type module, and compiled output verification'
on:
  pull_request:
    paths:
      - 'src/**/*.ts'
      - 'tests/**/*.ts'
      - 'package.json'
      - 'tsconfig.json'
  push:
    branches:
      - main
  workflow_dispatch:
permissions:
  issues: read
  pull-requests: read
safe-outputs:
  create-issue:
    title-prefix: '[esm-validation]'
  add-comment:
tools:
  bash: true
  github:
    toolsets: [issues, pull_requests]
---

# ESM Module Validation

You enforce strict ESM (ECMAScript Module) compliance across the entire codebase. This project is pure ESM — no CommonJS is allowed.

## Context

The mcp-adr-analysis-server is a **pure ESM project**:

- `package.json` declares `"type": "module"`
- TypeScript targets ES2022 with ESNext module resolution
- All relative imports must use `.js` extensions (even for `.ts` source files)
- No `require()`, `module.exports`, or `__dirname` allowed
- Directory resolution uses `import.meta.url` via the `getCurrentDirCompat()` helper from `src/utils/directory-compat.ts`

## Validation Steps

### Step 1: Verify package.json ESM Configuration

```bash
if ! grep -q '"type": "module"' package.json; then
  echo "package.json must have type: module"
  exit 1
fi
echo "package.json correctly configured for ESM"
```

### Step 2: Validate Import Extensions

Check that all relative imports in `src/` use `.js` extensions:

```bash
# Check for imports without .js extension in src/
missing_ext=$(find src -name "*.ts" -type f -exec grep -H "from ['\"]\..*[^.js]['\"]" {} \; | grep -v ".json" || true)

if [ ! -z "$missing_ext" ]; then
  echo "Found imports without .js extension:"
  echo "$missing_ext"
  echo ""
  echo "All relative imports must use .js extension for ESM compatibility"
  exit 1
fi

echo "All imports use correct .js extensions"
```

### Step 3: Check for CommonJS Patterns

Scan the source code for forbidden CommonJS patterns:

```bash
# Check for require() calls (excluding comments and test mocks)
if git grep -n "require(" -- "src/**/*.ts" | grep -v "// " | grep -v "/\*" | grep -v "mock" | grep -v "jest" | head -n 10; then
  echo "Found require() calls in source code"
  echo "Use ES6 import statements instead"
  exit 1
fi

# Check for module.exports
if git grep -n "module\.exports" -- "src/**/*.ts" | grep -v "// " | grep -v "/\*" | head -n 10; then
  echo "Found module.exports in source code"
  echo "Use ES6 export statements instead"
  exit 1
fi

# Check for __dirname usage (should use getCurrentDirCompat)
if git grep -n "__dirname" -- "src/**/*.ts" | grep -v "// " | grep -v "/\*" | grep -v "getCurrentDirCompat" | head -n 10; then
  echo "Found __dirname usage in source code"
  echo "Use import.meta.url or getCurrentDirCompat() instead"
  exit 1
fi

echo "No CommonJS patterns found"
```

### Step 4: Verify ESM Output

Build the project and verify the compiled output can be imported as ESM:

```bash
node -e "
  import { promises as fs } from 'fs';
  import path from 'path';

  const distFiles = await fs.readdir('./dist/src');
  console.log('Compiled files:', distFiles);

  // Try importing main entry point
  try {
    await import('./dist/src/index.js');
    console.log('Main entry point imports successfully');
  } catch (e) {
    console.error('Failed to import main entry point:', e.message);
    process.exit(1);
  }
"
```

### Step 5: Test ESM Module Loading

Run the utility tests to verify runtime ESM behavior:

```bash
npm test -- --testPathPattern="utils" --maxWorkers=2
```

### Step 6: Validate import.meta.url Helper

Verify the `getCurrentDirCompat()` helper works correctly:

```bash
node -e "
  import { getCurrentDirCompat } from './dist/src/utils/directory-compat.js';
  import path from 'path';

  const dir = getCurrentDirCompat(import.meta.url);

  if (!dir || !path.isAbsolute(dir)) {
    console.error('getCurrentDirCompat() returned invalid path:', dir);
    process.exit(1);
  }

  console.log('import.meta.url helper working correctly');
  console.log('Current directory:', dir);
"
```

## On Failure

If any step fails:

1. **For PR events**: Add a comment to the PR with:
   - Which ESM rule was violated
   - The specific file(s) and line(s) with violations
   - The correct ESM pattern to use instead
   - Example: "Change `import { foo } from './bar'` to `import { foo } from './bar.js'`"

2. **For push/dispatch events**: Create an issue:

**Title**: `[esm-validation] {violation type} in {file count} file(s)`

**Body**:

````markdown
## ESM Module Validation Failure

### Violations Found

| Type                  | Count   | Files   |
| --------------------- | ------- | ------- |
| Missing .js extension | {count} | {files} |
| require() usage       | {count} | {files} |
| module.exports usage  | {count} | {files} |
| \_\_dirname usage     | {count} | {files} |

### Detailed Findings

{list each violation with file path, line number, and the offending code}

### How to Fix

**Missing .js extension**:

```typescript
// Wrong
import { foo } from './bar';
// Correct
import { foo } from './bar.js';
```
````

**require() → import**:

```typescript
// Wrong
const fs = require('fs');
// Correct
import fs from 'fs';
```

**\_\_dirname → import.meta.url**:

```typescript
// Wrong
const dir = __dirname;
// Correct
import { getCurrentDirCompat } from './utils/directory-compat.js';
const dir = getCurrentDirCompat(import.meta.url);
```

---

_Generated by ESM Module Validation agentic workflow_

```

## On Success

- **For PR events**: Add a comment confirming ESM compliance: all imports use `.js` extensions, no CommonJS patterns detected
- **For push/dispatch events**: No issue needed

---
*Replaces: .github/agents/esm-module-validation.yml*
```
