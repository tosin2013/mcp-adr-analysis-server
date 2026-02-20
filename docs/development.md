# Development Guide

Complete guide for setting up a development environment and contributing to the MCP ADR Analysis Server.

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/tosin2013/mcp-adr-analysis-server.git
cd mcp-adr-analysis-server

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start development server
npm run dev
```

---

## Prerequisites

| Requirement | Version | Check Command    |
| ----------- | ------- | ---------------- |
| Node.js     | 20.0.0+ | `node --version` |
| npm         | 9.0.0+  | `npm --version`  |
| Git         | 2.0+    | `git --version`  |

### Recommended Tools

- **VS Code** or **Cursor** with TypeScript extension
- **ESLint** extension for real-time linting
- **Jest** extension for test running
- **Git Graph** for visualizing branches

---

## Project Structure

```
mcp-adr-analysis-server/
├── src/                    # Source code
│   ├── index.ts           # MCP server entry point
│   ├── tools/             # Tool implementations (73 tools)
│   ├── utils/             # Shared utilities
│   ├── config/            # Configuration modules
│   ├── resources/         # MCP resources
│   └── types/             # TypeScript type definitions
├── tests/                  # Test files
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   ├── performance/       # Performance tests
│   └── infrastructure/    # Infrastructure tests
├── docs/                   # Documentation (Docusaurus)
│   ├── tutorials/         # Learning-oriented guides
│   ├── how-to-guides/     # Task-oriented guides
│   ├── reference/         # Technical reference
│   ├── explanation/       # Conceptual docs
│   └── adrs/              # Architecture Decision Records
├── patterns/              # Validated deployment patterns
├── scripts/               # Build and utility scripts
├── sample-project/        # Example project for testing
└── dist/                  # Compiled output (generated)
```

---

## Development Workflow

### 1. Create a Branch

```bash
# Create feature branch
git checkout -b feature/my-feature

# Create bug fix branch
git checkout -b fix/bug-description
```

### 2. Make Changes

Edit source files in `src/`. The project uses TypeScript with strict mode.

### 3. Run Type Checking

```bash
npm run typecheck
```

### 4. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- path/to/test.test.ts

# Generate coverage report
npm run test:coverage
```

### 5. Format Code

```bash
npm run format
```

### 6. Build

```bash
npm run build
```

### 7. Test Locally

```bash
# Run the dev server
npm run dev

# Or test the built version
npm start
```

### 8. Commit Changes

```bash
git add .
git commit -m "feat: add new feature"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build/tooling changes

### 9. Push and Create PR

```bash
git push origin feature/my-feature
```

Then create a Pull Request on GitHub.

---

## Development Standards

### TypeScript Configuration

The project uses strict TypeScript configuration:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

### Code Style

- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Line length**: 100 characters max
- **Trailing commas**: ES5-compatible

### Testing Requirements

| Metric            | Requirement |
| ----------------- | ----------- |
| Line coverage     | >80%        |
| Branch coverage   | >75%        |
| Function coverage | >80%        |

Write tests for:

- All public functions
- Edge cases and error conditions
- Integration between modules

### Documentation Standards

- All public functions must have JSDoc comments
- Include `@param`, `@returns`, and `@throws` tags
- Add usage examples for complex functions

````typescript
/**
 * Analyzes a project for architectural patterns
 *
 * @param projectPath - Absolute path to the project root
 * @param options - Analysis configuration options
 * @returns Analysis result with detected patterns
 * @throws {Error} When project path doesn't exist
 *
 * @example
 * ```typescript
 * const result = await analyzeProject('/path/to/project', {
 *   depth: 'comprehensive'
 * });
 * ```
 */
export async function analyzeProject(
  projectPath: string,
  options: AnalysisOptions
): Promise<AnalysisResult> {
  // Implementation
}
````

---

## Adding a New Tool

### 1. Create the Tool File

Create a new file in `src/tools/`:

```typescript
// src/tools/my-new-tool.ts

import { z } from 'zod';

export const MyNewToolSchema = z.object({
  projectPath: z.string().describe('Path to the project'),
  option1: z.string().optional().describe('Optional parameter'),
});

export type MyNewToolParams = z.infer<typeof MyNewToolSchema>;

export async function handleMyNewTool(
  params: MyNewToolParams
): Promise<{ content: Array<{ type: string; text: string }> }> {
  // Implementation
  return {
    content: [
      {
        type: 'text',
        text: '# My New Tool Result\n\n...',
      },
    ],
  };
}

export const myNewToolDefinition = {
  name: 'my_new_tool',
  description: 'Description of what this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: { type: 'string', description: 'Path to the project' },
      option1: { type: 'string', description: 'Optional parameter' },
    },
    required: ['projectPath'],
  },
};
```

### 2. Register the Tool

Add the tool to `src/index.ts`:

```typescript
import { handleMyNewTool, myNewToolDefinition } from './tools/my-new-tool';

// In the tool handler
case 'my_new_tool':
  return await handleMyNewTool(args);
```

### 3. Add Tests

Create `tests/unit/tools/my-new-tool.test.ts`:

```typescript
import { handleMyNewTool } from '../../../src/tools/my-new-tool';

describe('my_new_tool', () => {
  it('should return expected result', async () => {
    const result = await handleMyNewTool({
      projectPath: '/test/path',
    });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
  });

  it('should handle errors gracefully', async () => {
    await expect(
      handleMyNewTool({
        projectPath: '/nonexistent',
      })
    ).rejects.toThrow();
  });
});
```

### 4. Document the Tool

Add documentation to `docs/reference/api-reference.md`:

```markdown
### `my_new_tool`

**Purpose**: Description of what this tool does

**Parameters**:

| Name        | Type   | Required | Description         |
| ----------- | ------ | -------- | ------------------- |
| projectPath | string | Yes      | Path to the project |
| option1     | string | No       | Optional parameter  |

**Example**:

\`\`\`json
{
"projectPath": "/path/to/project",
"option1": "value"
}
\`\`\`
```

---

## Running Tests

### Unit Tests

```bash
npm run test:unit
```

### Integration Tests

```bash
npm run test:integration
```

### Performance Tests

```bash
npm run test:performance
```

### Infrastructure Tests

```bash
npm run test:infrastructure
```

### Coverage Report

```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/`:

- `coverage/lcov-report/index.html` — HTML report
- `coverage/lcov.info` — LCOV format for CI

---

## Debugging

### VS Code Launch Configuration

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Server",
      "type": "node",
      "request": "launch",
      "runtimeArgs": ["--loader", "tsx"],
      "args": ["src/index.ts"],
      "env": {
        "PROJECT_PATH": "${workspaceFolder}/sample-project",
        "LOG_LEVEL": "DEBUG"
      }
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "${file}"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Debug Logging

Enable debug logging:

```bash
LOG_LEVEL=DEBUG npm run dev
```

---

## Building Documentation

The documentation is built with Docusaurus:

```bash
# Install docs dependencies
cd docs
npm install

# Start development server
npm run start

# Build production site
npm run build

# Serve production build locally
npm run serve
```

Documentation site runs at `http://localhost:3000/mcp-adr-analysis-server/`.

---

## Pre-commit Hooks

The project uses pre-commit hooks (via Husky):

| Hook         | Check                 |
| ------------ | --------------------- |
| `pre-commit` | Lint staged files     |
| `pre-push`   | Run tests, type check |

To bypass hooks (use sparingly):

```bash
git commit --no-verify -m "message"
```

---

## CI/CD Pipeline

GitHub Actions runs on every PR:

| Job         | Description              |
| ----------- | ------------------------ |
| `lint`      | ESLint check             |
| `typecheck` | TypeScript compilation   |
| `test`      | Jest tests with coverage |
| `build`     | Production build         |
| `docs`      | Documentation build      |

All checks must pass before merging.

---

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create a PR with version bump
4. After merge, tag the release:
   ```bash
   git tag v2.1.0
   git push origin v2.1.0
   ```
5. GitHub Actions publishes to npm automatically

---

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/tosin2013/mcp-adr-analysis-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tosin2013/mcp-adr-analysis-server/discussions)
- **Contributing Guide**: [CONTRIBUTING.md](https://github.com/tosin2013/mcp-adr-analysis-server/blob/main/CONTRIBUTING.md)

---

## Related Documentation

- **[Architecture Overview](./explanation/architecture-overview.md)** — System design
- **[API Reference](./reference/api-reference.md)** — Tool documentation
- **[Configuration](./configuration.md)** — Environment variables

---

**Questions about development?** → **[Open an Issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues)**
