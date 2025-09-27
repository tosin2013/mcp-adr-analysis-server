# Contributing to MCP ADR Analysis Server

Thank you for your interest in contributing! This document provides comprehensive guidelines tailored to our TypeScript/Node.js MCP server architecture.

## Prerequisites

- Node.js ≥20.0.0
- npm ≥9.0.0
- Git with pre-commit hooks enabled
- Editor with EditorConfig, ESLint, and Prettier support

## Development Setup

```bash
# Clone and setup
git clone https://github.com/tosin2013/mcp-adr-analysis-server.git
cd mcp-adr-analysis-server
npm install

# Verify setup works
npm run typecheck
npm run lint
npm run test

# Start development
npm run dev
```

## Code Standards

### TypeScript Guidelines

- Use strict TypeScript configuration (already configured with `strict: true`)
- Prefer explicit types over `any` (ESLint will warn about `any` usage)
- Document complex types and interfaces with JSDoc comments
- Follow existing import patterns (ESM modules with `.js` extensions in imports)
- Use the established error types (`McpAdrError`) for consistent error handling

### Formatting and Linting

Our automated toolchain ensures consistency:

```bash
# Before committing, run:
npm run lint:fix    # Auto-fix ESLint issues
npm run format      # Format with Prettier
npm run typecheck   # Verify TypeScript compilation

# Or run all checks together:
npm run prepublishOnly
```

**Pre-commit hooks automatically:**

- Format code with Prettier
- Run ESLint with auto-fix
- Validate TypeScript compilation

### Testing Requirements

- Maintain ≥85% coverage threshold (enforced by Jest)
- Write unit tests for new utilities in `src/utils/`
- Add integration tests for new tools in `src/tools/`
- Use descriptive test names following the pattern: `should [expected behavior] when [condition]`
- Test files should mirror source structure: `src/utils/file.ts` → `tests/utils/file.test.ts`

### File Structure and Architecture

```
src/
├── tools/          # MCP tools (main functionality)
├── utils/          # Reusable utilities
├── types/          # TypeScript type definitions
├── prompts/        # MCP prompts
├── templates/      # Code generation templates
└── config/         # Configuration management
```

Follow these patterns when adding new code:

- **Tools**: Implement MCP protocol handlers in `src/tools/`
- **Utilities**: Place reusable logic in `src/utils/` and export through `index.ts`
- **Types**: Define interfaces in `src/types/` with proper JSDoc documentation
- **Tests**: Mirror source structure in `tests/` directory

## Commit Standards

We use conventional commits with automated validation:

- Format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Examples:
  - `feat(tools): add new ADR analysis tool`
  - `fix(utils): resolve caching issue in file operations`
  - `docs(contributing): update setup instructions`

## Architecture Patterns

### Tool Development

When creating new MCP tools in `src/tools/`:

1. **Error Handling**: Use `McpAdrError` for consistent error reporting
2. **Caching**: Leverage the existing cache system (`src/utils/cache.ts`)
3. **Validation**: Use Zod schemas for input validation
4. **Logging**: Use the enhanced logging utility (`src/utils/enhanced-logging.ts`)

Example tool structure:

```typescript
import { McpAdrError } from '../types/index.js';
import { logger } from '../utils/enhanced-logging.js';

export async function myNewTool(args: MyToolArgs): Promise<MyToolResult> {
  try {
    logger.info('Starting tool operation', { args });
    // Implementation
    return result;
  } catch (error) {
    throw McpAdrError.fromError(error, 'MY_TOOL_ERROR');
  }
}
```

### Utility Functions

For reusable logic in `src/utils/`:

1. **Export Pattern**: Always export through `src/utils/index.ts`
2. **Documentation**: Include comprehensive JSDoc comments
3. **Testing**: Write corresponding unit tests
4. **Type Safety**: Use strict TypeScript with proper return types

## Pull Request Process

1. **Create Feature Branch**: `git checkout -b feature/description`
2. **Implement Changes**: Follow our coding standards above
3. **Run Full Test Suite**: `npm test` (includes coverage verification)
4. **Update Documentation**: Add/update relevant docs if needed
5. **Submit PR**: Use our PR template with clear description
6. **CI Verification**: Ensure all automated checks pass

### PR Review Guidelines

Reviewers focus on:

- **Functionality**: Does it work as intended?
- **Architecture**: Does it follow established patterns?
- **Testing**: Is coverage maintained and are edge cases covered?
- **Security**: Any potential security implications?
- **MCP Compliance**: Does it properly implement MCP protocol standards?

_Note: Style and formatting are automated, so reviews focus on substance over syntax._

## Quality Gates

All contributions must pass:

- ✅ TypeScript compilation (`npm run typecheck`)
- ✅ ESLint rules (`npm run lint`)
- ✅ Test suite with ≥85% coverage (`npm run test:coverage`)
- ✅ Build process (`npm run build`)
- ✅ Pre-commit hooks execution

## Getting Help

- **Architecture Questions**: Review existing ADRs in `docs/adrs/`
- **Tool Development**: Examine existing tools in `src/tools/`
- **Testing Patterns**: Check `tests/` for examples
- **MCP Protocol**: Refer to [@modelcontextprotocol/sdk documentation](https://github.com/modelcontextprotocol/sdk)

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

---

_This guide is maintained to reflect our current toolchain and practices. When in doubt, follow the automated tooling—it embodies our agreed-upon standards._
