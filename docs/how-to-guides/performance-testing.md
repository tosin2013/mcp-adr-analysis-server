# ⚡ Performance Testing Guide

**Learn how to test, benchmark, and optimize the performance of the MCP ADR Analysis Server.**

---

## 📋 Overview

This guide covers:

- Performance testing methodology
- Benchmarking tools and techniques
- Identifying bottlenecks
- Optimization strategies
- Monitoring and profiling

---

## 🎯 Prerequisites

- MCP ADR Analysis Server installed
- Node.js development environment
- Basic understanding of performance concepts
- Jest test framework (included)

---

## 🚀 Quick Performance Check

Run the built-in performance tests:

```bash
# Run all tests including performance
npm run test:performance

# Run specific performance suite
npm run test -- tests/performance/
```

---

## 📊 Performance Benchmarks

### Current Performance Targets

| Operation            | Target    | Current |
| -------------------- | --------- | ------- |
| ADR Analysis (small) | &lt;2s    | ~1.5s   |
| ADR Analysis (large) | &lt;5s    | ~3.8s   |
| File Operations      | &lt;100ms | ~50ms   |
| Cache Hit            | &lt;50ms  | ~20ms   |
| AI Prompt Execution  | &lt;3s    | ~2.5s   |

---

## 🔍 Performance Testing Methods

### 1. Unit Performance Tests

Test individual components:

```typescript
// tests/performance/tool-performance.test.ts
import { measurePerformance } from '../utils/test-helpers';

describe('Tool Performance', () => {
  it('should analyze ADR in under 2 seconds', async () => {
    const result = await measurePerformance(async () => {
      return await analyzeAdr('./sample-project/docs/adrs/001.md');
    });

    expect(result.duration).toBeLessThan(2000);
    expect(result.memoryUsed).toBeLessThan(50 * 1024 * 1024); // 50MB
  });
});
```

### 2. Load Testing

Test under realistic load:

```typescript
// tests/performance/load-test.ts
import { runLoadTest } from '../utils/test-infrastructure';

describe('Load Testing', () => {
  it('should handle 100 concurrent requests', async () => {
    const results = await runLoadTest({
      concurrency: 100,
      duration: 60000, // 1 minute
      requestsPerSecond: 10,
    });

    expect(results.successRate).toBeGreaterThan(0.95);
    expect(results.averageLatency).toBeLessThan(500);
  });
});
```

### 3. Memory Profiling

Check for memory leaks:

```bash
# Run with memory profiling
node --inspect --expose-gc dist/index.js

# Use Chrome DevTools to analyze heap snapshots
```

---

## 🛠️ Optimization Techniques

### 1. Caching Strategy

Implement intelligent caching:

```typescript
import { CacheManager } from './utils/cache';

const cache = new CacheManager({
  ttl: 3600000, // 1 hour
  maxSize: 1000,
});

// Cache expensive operations
const result = await cache.getOrSet('analysis:project123', async () => {
  return await performExpensiveAnalysis();
});
```

### 2. Parallel Processing

Use parallel execution:

```typescript
// Before: Sequential (slow)
for (const file of files) {
  await analyzeFile(file);
}

// After: Parallel (fast)
await Promise.all(files.map(file => analyzeFile(file)));
```

### 3. Lazy Loading

Load resources on demand:

```typescript
// Lazy load tree-sitter parsers
const getParser = memoize(async (language: string) => {
  return await import(`tree-sitter-${language}`);
});
```

### 4. Stream Processing

Process large files in chunks:

```typescript
import { createReadStream } from 'fs';

async function analyzeLargeFile(filePath: string) {
  const stream = createReadStream(filePath);

  for await (const chunk of stream) {
    processChunk(chunk);
  }
}
```

---

## 📈 Monitoring Performance

### 1. Enable Performance Monitoring

```bash
# .env
ENABLE_MONITORING=true
MONITORING_LEVEL=detailed
PERFORMANCE_LOG_PATH=./logs/performance.json
```

### 2. Collect Metrics

```typescript
import { MonitoringManager } from './utils/monitoring';

const monitor = MonitoringManager.getInstance();

// Track operation performance
monitor.trackOperation('adr-analysis', async () => {
  return await analyzeAdr(path);
});

// Get performance report
const report = monitor.getPerformanceReport();
console.log(report);
```

### 3. Performance Dashboard

View real-time metrics:

```bash
npm run monitor:dashboard
```

---

## 🔧 Profiling Tools

### 1. Node.js Built-in Profiler

```bash
# Generate CPU profile
node --prof dist/index.js

# Process the profile
node --prof-process isolate-*.log > profile.txt
```

### 2. Clinic.js

```bash
# Install Clinic.js
npm install -g clinic

# Profile your application
clinic doctor -- node dist/index.js
clinic flame -- node dist/index.js
clinic bubbleprof -- node dist/index.js
```

### 3. Chrome DevTools

```bash
# Start with inspector
node --inspect dist/index.js

# Open chrome://inspect in Chrome
```

---

## 📊 Benchmark Suite

### Running Benchmarks

```bash
# Run all benchmarks
npm run benchmark

# Run specific benchmark
npm run benchmark -- --grep "ADR Analysis"

# Generate benchmark report
npm run benchmark:report
```

### Creating Custom Benchmarks

```typescript
// benchmarks/custom-benchmark.ts
import { Suite } from 'benchmark';

const suite = new Suite('Custom Operations');

suite
  .add('Operation A', async () => {
    await performOperationA();
  })
  .add('Operation B', async () => {
    await performOperationB();
  })
  .on('cycle', event => {
    console.log(String(event.target));
  })
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run({ async: true });
```

---

## 🎯 Performance Optimization Checklist

### Before Optimization

- [ ] Establish baseline metrics
- [ ] Identify critical paths
- [ ] Profile current performance
- [ ] Document bottlenecks

### During Optimization

- [ ] Implement caching where appropriate
- [ ] Use parallel processing for independent operations
- [ ] Optimize database queries
- [ ] Minimize AI API calls
- [ ] Reduce file I/O operations

### After Optimization

- [ ] Run performance tests
- [ ] Compare with baseline
- [ ] Document improvements
- [ ] Update performance targets
- [ ] Monitor in production

---

## 🐛 Common Performance Issues

### Issue 1: Slow AI Prompt Execution

**Symptoms**: Prompts taking >5 seconds

**Solutions**:

- Reduce prompt complexity
- Use prompt caching
- Batch multiple prompts
- Consider streaming responses

### Issue 2: Memory Leaks

**Symptoms**: Memory usage grows over time

**Solutions**:

- Clear caches periodically
- Release event listeners
- Avoid circular references
- Use weak references where appropriate

### Issue 3: Slow File Operations

**Symptoms**: File reads/writes taking >100ms

**Solutions**:

- Use streaming for large files
- Implement file caching
- Batch file operations
- Use async I/O

### Issue 4: High CPU Usage

**Symptoms**: CPU constantly at 100%

**Solutions**:

- Limit concurrent operations
- Use worker threads for heavy computation
- Optimize algorithms
- Profile and identify hot spots

---

## 📚 Related Documentation

- **[Performance Design](../explanation/performance-design.md)** - Architecture overview
- **[Caching Strategy](../explanation/caching-strategy.md)** - Caching details
- **[Monitoring Guide](./monitoring.md)** - Production monitoring
- **[Testing Guide](../TESTING_GUIDE.md)** - General testing practices

---

## 💡 Best Practices

1. **Always measure before optimizing**
   - Profile first, optimize second
   - Focus on actual bottlenecks

2. **Set realistic performance targets**
   - Based on user needs
   - Achievable with current resources

3. **Test with realistic data**
   - Use production-like datasets
   - Test edge cases

4. **Monitor in production**
   - Track real-world performance
   - Alert on regressions

5. **Document optimizations**
   - Explain why and how
   - Track performance history

---

## 💬 Need Help?

- **Performance Issues?** → [Open an Issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues)
- **Questions?** → [Troubleshooting Guide](./troubleshooting.md)
- **Documentation** → [API Reference](../reference/api-reference.md)

---

_Last Updated: 2025-10-12_
