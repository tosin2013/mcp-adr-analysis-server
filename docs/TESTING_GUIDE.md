# 🧪 Testing Guide - MCP ADR Analysis Server

> **Confidence: 95%** - Comprehensive guide based on analysis of existing testing infrastructure

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Testing Architecture](#-testing-architecture)
- [Test Types & Categories](#-test-types--categories)
- [Running Tests](#-running-tests)
- [Writing Tests](#-writing-tests)
- [Testing Best Practices](#-testing-best-practices)
- [Troubleshooting](#-troubleshooting)
- [CI/CD Integration](#-cicd-integration)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: ≥20.0.0
- **npm**: ≥9.0.0
- **Memory**: ≥1GB available RAM
- **Disk**: ≥1GB free space

### Installation & Setup

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Verify Installation

```bash
# Quick smoke test
npm run test tests/smoke.test.ts

# Test infrastructure health
./scripts/test-infrastructure.sh validate
```

---

## 🏗️ Testing Architecture

### Core Components

```
tests/
├── __mocks__/           # Mock implementations for external dependencies
├── integration/         # Cross-component integration tests
├── performance/         # Performance and load tests
├── tools/              # Individual tool unit tests
├── utils/              # Utility function tests
├── setup.ts            # Global test configuration
└── README.md           # Testing documentation
```

### Key Technologies

- **Jest**: Primary testing framework with TypeScript support
- **ts-jest**: TypeScript transformation and ESM support
- **Tree-sitter Mocks**: Native module mocking for cross-platform compatibility
- **Custom Matchers**: Domain-specific assertions for ADR validation

### Test Infrastructure Features

- ✅ **Resource Monitoring**: Memory and file handle tracking
- ✅ **Automatic Cleanup**: Temp directory and mock cleanup
- ✅ **Coverage Thresholds**: 85% minimum coverage requirement
- ✅ **Performance Tracking**: Memory usage and execution time monitoring
- ✅ **CI/CD Integration**: JUnit XML reporting for CI systems

---

## 🎯 Test Types & Categories

### 1. Unit Tests (`tests/tools/`, `tests/utils/`)

**Purpose**: Test individual functions and classes in isolation

```typescript
// Example: Tool unit test
describe('ADRValidationTool', () => {
  it('should validate ADR structure', async () => {
    const result = await adrValidationTool.validate(mockAdr);
    expect(result).toBeValidAdr();
  });
});
```

**Coverage**: Functions, classes, utilities, and individual tools

### 2. Integration Tests (`tests/integration/`)

**Purpose**: Test component interactions and workflows

```typescript
// Example: Memory system integration
describe('Memory System Integration', () => {
  it('should handle complex workflow chains', async () => {
    const workflow = await orchestrator.executeChain(steps);
    expect(workflow.success).toBe(true);
  });
});
```

**Coverage**: Tool chains, memory systems, MCP protocol interactions

### 3. Performance Tests (`tests/performance/`)

**Purpose**: Validate performance characteristics and resource usage

```typescript
// Example: Memory performance test
describe('Memory Performance', () => {
  it('should handle large datasets efficiently', async () => {
    const result = await processLargeDataset(testData);
    expect(result).toShowSignificantImprovement(0.1);
  });
});
```

**Coverage**: Memory usage, execution time, resource efficiency

### 4. End-to-End Tests (`scripts/test-mcp-*.sh`)

**Purpose**: Test complete MCP server functionality

```bash
# MCP server integration test
./scripts/test-mcp-server.sh

# MCP functionality validation
./scripts/test-mcp-functionality.sh
```

---

## 🏃‍♂️ Running Tests

### Basic Commands

```bash
# All tests (recommended)
npm test

# Specific test categories
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:performance    # Performance tests only

# Advanced testing
npm run test:advanced       # Advanced prompting tests
npm run test:quality        # Code quality validation
npm run test:infrastructure # Infrastructure tests
```

### Test Infrastructure Script

```bash
# Comprehensive test runner with resource monitoring
./scripts/test-infrastructure.sh [TYPE] [OPTIONS]

# Examples:
./scripts/test-infrastructure.sh unit
./scripts/test-infrastructure.sh integration --verbose
./scripts/test-infrastructure.sh performance --timeout=600
./scripts/test-infrastructure.sh cleanup  # Clean up test artifacts
```

### Coverage & Reporting

```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html

# CI-friendly JUnit output
npm test -- --ci --reporters=jest-junit
```

### Watch Mode Development

```bash
# Watch for changes and re-run tests
npm run test:watch

# Watch specific test pattern
npm run test:watch -- --testPathPattern=tools
```

---

## ✍️ Writing Tests

### Test File Structure

```typescript
/**
 * @fileoverview Tests for [Component Name]
 * @category [Unit|Integration|Performance]
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { testInfrastructure } from '../utils/test-infrastructure.js';
import { ComponentUnderTest } from '../../src/path/to/component.js';

describe('ComponentUnderTest', () => {
  let component: ComponentUnderTest;
  let testContext: any;

  beforeEach(async () => {
    testContext = await testInfrastructure.createTestContext();
    component = new ComponentUnderTest(testContext.config);
  });

  afterEach(async () => {
    await testInfrastructure.cleanupTestContext(testContext);
  });

  describe('core functionality', () => {
    it('should perform expected behavior', async () => {
      // Arrange
      const input = testContext.createMockInput();
      
      // Act
      const result = await component.process(input);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });
});
```

### Custom Matchers

The testing framework includes custom Jest matchers for domain-specific assertions:

```typescript
// ADR validation
expect(adrObject).toBeValidAdr();

// Schema validation
expect(dataObject).toHaveValidSchema();

// Prompt validation
expect(promptObject).toBeValidPromptObject();

// Performance improvement validation
expect(performanceResult).toShowSignificantImprovement(0.15);
```

### Mock Usage

```typescript
// Tree-sitter mocks (automatically available)
import TreeSitter from 'tree-sitter';  // Uses mock implementation

// Custom mocks
import { mockFileSystem } from '../__mocks__/file-system.js';

beforeEach(() => {
  mockFileSystem.reset();
  mockFileSystem.addFile('/test/path', 'content');
});
```

### Test Data Management

```typescript
// Use test infrastructure for consistent test data
const testData = testInfrastructure.generateTestData({
  type: 'adr',
  count: 5,
  complexity: 'medium'
});

// Create temporary directories
const tempDir = await testInfrastructure.createTempDirectory();
```

---

## 🎯 Testing Best Practices

### 1. Test Organization

- **Group related tests** using `describe` blocks
- **Use descriptive test names** that explain the expected behavior
- **Follow AAA pattern**: Arrange, Act, Assert

### 2. Resource Management

```typescript
// ✅ Good: Proper cleanup
afterEach(async () => {
  await testInfrastructure.cleanupTestContext(testContext);
});

// ❌ Bad: No cleanup
afterEach(() => {
  // Missing cleanup
});
```

### 3. Async Testing

```typescript
// ✅ Good: Proper async handling
it('should handle async operations', async () => {
  const result = await asyncOperation();
  expect(result).toBeDefined();
});

// ❌ Bad: Missing await
it('should handle async operations', () => {
  const result = asyncOperation(); // Missing await
  expect(result).toBeDefined();
});
```

### 4. Test Isolation

```typescript
// ✅ Good: Independent tests
beforeEach(() => {
  component = new Component(freshConfig);
});

// ❌ Bad: Shared state
const component = new Component(config); // Shared across tests
```

### 5. Performance Considerations

```typescript
// ✅ Good: Performance-aware testing
it('should complete within reasonable time', async () => {
  const startTime = Date.now();
  await heavyOperation();
  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(5000); // 5 seconds
});
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Memory Issues

**Problem**: Tests fail with out-of-memory errors

**Solution**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm test
```

#### 2. Tree-sitter Native Module Issues

**Problem**: Tree-sitter modules fail to load in test environment

**Solution**: The project includes comprehensive mocks in `tests/__mocks__/` that automatically handle this.

#### 3. Timeout Issues

**Problem**: Tests timeout in CI environment

**Solution**:
```bash
# Use infrastructure script with custom timeout
./scripts/test-infrastructure.sh integration --timeout=600
```

#### 4. Resource Leaks

**Problem**: Tests leave temporary files or handles open

**Solution**:
```bash
# Run cleanup
./scripts/test-infrastructure.sh cleanup

# Check resource status
npm test -- --verbose
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=mcp-adr:* npm test

# Run single test with full output
npm test -- --testNamePattern="specific test" --verbose
```

### Performance Debugging

```bash
# Run with memory profiling
node --inspect-brk node_modules/.bin/jest --runInBand

# Performance test analysis
npm run test:performance -- --verbose
```

---

## 🚀 CI/CD Integration

### GitHub Actions Configuration

The project includes automated testing in CI with:

- **Multiple Node.js versions** (20.x, 22.x)
- **Cross-platform testing** (Ubuntu, macOS, Windows)
- **Coverage reporting** with threshold enforcement
- **Performance regression detection**

### Local CI Simulation

```bash
# Simulate CI environment
CI=true npm test

# Generate CI-compatible reports
npm test -- --ci --coverage --reporters=jest-junit
```

### Pre-commit Testing

```bash
# Run pre-commit checks
npm run lint
npm run typecheck
npm test

# Or use the pre-commit script
./scripts/pre-commit-check.sh
```

---

## 📊 Coverage Requirements

The project maintains **85% minimum coverage** across:

- **Branches**: 85%
- **Functions**: 85%
- **Lines**: 85%
- **Statements**: 85%

### Coverage Exclusions

- Type definition files (`*.d.ts`)
- Test files (`*.test.ts`)
- Mock implementations
- Performance test utilities

### Viewing Coverage

```bash
# Generate and view coverage
npm run test:coverage
open coverage/lcov-report/index.html
```

---

## 🤝 Contributing Tests

### Before Submitting

1. **Run full test suite**: `npm test`
2. **Check coverage**: `npm run test:coverage`
3. **Validate performance**: `npm run test:performance`
4. **Run linting**: `npm run lint`

### Test Contribution Guidelines

1. **Write tests for new features** - All new functionality must include tests
2. **Maintain coverage thresholds** - Don't reduce overall coverage
3. **Use existing patterns** - Follow established testing patterns
4. **Document complex tests** - Add comments for non-obvious test logic
5. **Test edge cases** - Include boundary conditions and error scenarios

### Review Checklist

- [ ] Tests follow naming conventions
- [ ] Proper async/await usage
- [ ] Resource cleanup implemented
- [ ] Custom matchers used appropriately
- [ ] Performance considerations addressed
- [ ] Documentation updated if needed

---

## 📚 Additional Resources

- **[Jest Documentation](https://jestjs.io/./getting-started)**
- **[TypeScript Testing Guide](https://typescript-eslint.io/./linting/troubleshooting/)**
- **[MCP Protocol Testing](https://modelcontextprotocol.io/./testing)**
- **[Project Architecture](./architecture-overview.md)**
- **[Contributing Guide](./../../CONTRIBUTING.md)**

---

**Need Help?** 

- 🐛 **Issues**: [GitHub Issues](https://github.com/tosin2013/mcp-adr-analysis-server/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/tosin2013/mcp-adr-analysis-server/discussions)
- 📖 **Documentation**: [Full Documentation](./index.md)

---

*This guide is maintained as part of the MCP ADR Analysis Server project. Last updated: October 2025*

