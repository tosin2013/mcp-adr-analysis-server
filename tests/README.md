# Advanced Prompting Techniques Testing Framework

This directory contains a comprehensive testing and validation framework for the advanced prompting techniques integration in the MCP ADR Analysis Server.

## Overview

The testing framework validates three key areas:
1. **Unit Tests** - Individual utility module functionality
2. **Integration Tests** - Enhanced tool functionality and compatibility
3. **Performance & Effectiveness Tests** - Measurable improvements and performance benchmarks

## Test Structure

```
tests/
├── utils/
│   └── advanced-prompting-test-utils.ts    # Common test utilities and helpers
├── knowledge-generation.test.ts            # Knowledge Generation module tests
├── ape.test.ts                            # APE (Automatic Prompt Engineering) tests
├── reflexion.test.ts                      # Reflexion learning framework tests
├── tool-enhancement.test.ts               # Integration tests for enhanced tools
├── performance-effectiveness.test.ts       # Performance and quality validation
├── setup.ts                              # Jest configuration and custom matchers
└── README.md                             # This documentation
```

## Advanced Prompting Techniques Tested

### 1. Knowledge Generation
- **Module**: `src/utils/knowledge-generation.ts`
- **Purpose**: Generate domain-specific architectural knowledge before making decisions
- **Test Coverage**:
  - Prompt generation for different project types
  - Technology-specific knowledge creation
  - Configuration validation and error handling
  - Performance benchmarks and memory usage

### 2. Automatic Prompt Engineering (APE)
- **Module**: `src/utils/automatic-prompt-engineering.ts`
- **Purpose**: Automatically optimize prompts for better performance
- **Test Coverage**:
  - Prompt candidate generation with multiple strategies
  - Multi-criteria evaluation and selection
  - Tool-specific optimization configurations
  - Quality improvement validation

### 3. Reflexion Learning
- **Module**: `src/utils/reflexion.ts`
- **Purpose**: Learn from mistakes through linguistic feedback and self-reflection
- **Test Coverage**:
  - Memory-enhanced task execution
  - Memory retrieval and persistence
  - Learning progress tracking
  - Actor-Evaluator-Self-Reflection pattern validation

## Enhanced Tools Tested

### 1. suggest_adrs Tool
- **Enhancements**: Knowledge Generation + Reflexion
- **Test Coverage**:
  - Backward compatibility with existing parameters
  - Enhanced mode functionality
  - All analysis types (implicit_decisions, code_changes, comprehensive)
  - Feature flag controls

### 2. generate_adrs_from_prd Tool
- **Enhancements**: APE + Knowledge Generation
- **Test Coverage**:
  - PRD type-specific optimizations
  - Prompt optimization effectiveness
  - Domain knowledge integration
  - Performance with different PRD types

### 3. analyze_project_ecosystem Tool
- **Enhancements**: Knowledge Generation + Reflexion
- **Test Coverage**:
  - Technology-specific analysis
  - Learning from analysis accuracy
  - Analysis depth configurations
  - Technology focus arrays

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Suites
```bash
# Unit tests for individual modules
npm test knowledge-generation.test.ts
npm test ape.test.ts
npm test reflexion.test.ts

# Integration tests
npm test tool-enhancement.test.ts

# Performance and effectiveness tests
npm test performance-effectiveness.test.ts
```

### Test Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

## Test Utilities

### Common Test Helpers

The `tests/utils/advanced-prompting-test-utils.ts` file provides:

#### Test Data Generators
- `createTestPrompt()` - Generate test prompt objects
- `createTestKnowledgeConfig()` - Generate knowledge generation configurations
- `createTestAPEConfig()` - Generate APE optimization configurations
- `createTestReflexionConfig()` - Generate reflexion learning configurations
- `createTestMemory()` - Generate test memory objects

#### Mock Functions
- `createMockKnowledgeGeneration()` - Mock knowledge generation
- `createMockAPEOptimization()` - Mock APE optimization
- `createMockReflexionExecution()` - Mock reflexion execution
- `createMockMemoryRetrieval()` - Mock memory retrieval

#### Validation Functions
- `validatePromptObject()` - Validate prompt structure
- `validateKnowledgeResult()` - Validate knowledge generation results
- `validateAPEResult()` - Validate APE optimization results
- `validateReflexionResult()` - Validate reflexion execution results
- `validateMemoryObject()` - Validate memory object structure

#### Performance Testing
- `measureExecutionTime()` - Measure function execution time
- `runBenchmark()` - Run performance benchmarks with configurable parameters
- `assessPromptQuality()` - Assess prompt quality using multiple criteria
- `comparePromptQuality()` - Compare prompt quality improvements

### Custom Jest Matchers

Extended Jest matchers for advanced prompting validation:

```typescript
// Validate ADR structure
expect(adrObject).toBeValidAdr();

// Validate prompt object structure
expect(promptObject).toBeValidPromptObject();

// Validate significant improvement
expect(qualityComparison).toShowSignificantImprovement(0.1); // 10% threshold
```

## Performance Benchmarks

### Execution Time Limits
- **Knowledge Generation**: < 2 seconds
- **APE Optimization**: < 3 seconds
- **Reflexion Execution**: < 2 seconds
- **Combined Techniques**: < 8 seconds

### Memory Usage Limits
- **Individual Techniques**: < 50 MB
- **Combined Techniques**: < 100 MB
- **Load Testing**: < 200 MB

### Quality Improvement Thresholds
- **Minimum Improvement**: 10% quality score increase
- **Significant Improvement**: 30% quality score increase
- **Prompt Length**: Enhanced prompts should be 2-5x longer than originals

## Test Configuration

### Jest Configuration
- **Timeout**: 15 seconds (extended for advanced prompting tests)
- **Environment**: Node.js
- **Coverage Threshold**: 80% for branches, functions, lines, statements
- **Test Pattern**: `**/?(*.)+(spec|test).ts`

### Environment Variables
Tests may use these environment variables:
- `NODE_ENV=test` - Test environment indicator
- `MCP_ADR_TEST_MODE=true` - Enable test-specific behaviors
- `MCP_ADR_CACHE_DISABLED=true` - Disable caching for consistent test results

## Continuous Integration

### GitHub Actions Integration
The testing framework integrates with CI/CD pipelines:

```yaml
- name: Run Advanced Prompting Tests
  run: |
    npm test
    npm run test:coverage
```

### Test Reports
- **Coverage Reports**: Generated in `coverage/` directory
- **Performance Reports**: Benchmark results logged to console
- **Quality Reports**: Prompt quality assessments included in test output

## Troubleshooting

### Common Issues

1. **Timeout Errors**
   - Increase Jest timeout in `tests/setup.ts`
   - Check for infinite loops in prompt generation

2. **Memory Issues**
   - Monitor memory usage with `runBenchmark()`
   - Ensure proper cleanup in test teardown

3. **Mock Failures**
   - Verify mock implementations match actual function signatures
   - Check that mocks are properly reset between tests

4. **Quality Assessment Failures**
   - Review prompt quality criteria in test utilities
   - Adjust quality thresholds if needed

### Debug Mode
Enable verbose logging for debugging:
```bash
npm test -- --verbose
```

## Contributing

When adding new tests:

1. **Follow Naming Conventions**: Use descriptive test names
2. **Use Test Utilities**: Leverage existing test helpers
3. **Add Performance Tests**: Include benchmarks for new features
4. **Update Documentation**: Update this README for new test categories
5. **Maintain Coverage**: Ensure new code has adequate test coverage

## Quality Assurance

The testing framework ensures:
- ✅ **Backward Compatibility** - Existing functionality remains intact
- ✅ **Performance Standards** - Enhancements don't degrade performance
- ✅ **Quality Improvements** - Measurable improvements in prompt quality
- ✅ **Error Handling** - Graceful degradation when enhancements fail
- ✅ **Feature Flags** - Proper control over enhancement features
- ✅ **Integration Stability** - Enhanced tools work correctly together
