# 🛠️ Tool Development Guide

**Learn how to develop, test, and deploy custom tools for the MCP ADR Analysis Server.**

---

## 📋 Overview

The MCP ADR Analysis Server is built on the Model Context Protocol (MCP) and features 37 specialized tools. This guide will teach you how to:

- Create new custom tools
- Follow tool development best practices
- Test and validate tools
- Integrate tools with the server
- Deploy tools to production

---

## 🎯 Prerequisites

- TypeScript/JavaScript proficiency
- Understanding of MCP protocol
- Familiarity with the server architecture
- Node.js ≥20.0.0 installed

---

## 🚀 Quick Start

### Create Your First Tool

```bash
# 1. Create a new tool file
touch src/tools/my-custom-tool.ts

# 2. Create corresponding test
touch tests/tools/my-custom-tool.test.ts

# 3. Implement the tool (see template below)

# 4. Register the tool in src/index.ts

# 5. Run tests
npm test -- my-custom-tool
```

---

## 📖 Tool Development Template

### Basic Tool Structure

```typescript
// src/tools/my-custom-tool.ts
import { McpAdrError } from '../types/index.js';
import { logger } from '../utils/enhanced-logging.js';
import { z } from 'zod';

/**
 * My Custom Tool - Brief description of what it does
 *
 * @param args - Tool arguments
 * @returns Tool result
 */
export async function myCustomTool(args: {
  inputPath: string;
  options?: {
    mode?: 'quick' | 'comprehensive';
    output?: string;
  };
}): Promise<MyCustomToolResult> {
  try {
    // 1. Validate inputs
    const schema = z.object({
      inputPath: z.string().min(1),
      options: z
        .object({
          mode: z.enum(['quick', 'comprehensive']).optional(),
          output: z.string().optional(),
        })
        .optional(),
    });

    const validated = schema.parse(args);

    // 2. Log operation start
    logger.info('Starting my-custom-tool', { args: validated });

    // 3. Perform main operation
    const result = await performMainOperation(validated);

    // 4. Log success
    logger.info('my-custom-tool completed successfully', {
      result: result.summary,
    });

    return result;
  } catch (error) {
    // 5. Handle errors gracefully
    logger.error('my-custom-tool failed', { error });
    throw McpAdrError.fromError(error, 'MY_CUSTOM_TOOL_ERROR');
  }
}

async function performMainOperation(args: ValidatedArgs): Promise<Result> {
  // Your tool logic here
  return {
    success: true,
    data: {},
    summary: 'Operation completed',
  };
}

interface MyCustomToolResult {
  success: boolean;
  data: unknown;
  summary: string;
}
```

### Tool Registration

```typescript
// src/index.ts
import { myCustomTool } from './tools/my-custom-tool.js';

// Add to tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // ... existing tools ...
    {
      name: 'my_custom_tool',
      description: 'Brief description of what the tool does',
      inputSchema: {
        type: 'object',
        properties: {
          inputPath: {
            type: 'string',
            description: 'Path to input file or directory',
          },
          options: {
            type: 'object',
            properties: {
              mode: {
                type: 'string',
                enum: ['quick', 'comprehensive'],
                description: 'Operation mode',
              },
            },
          },
        },
        required: ['inputPath'],
      },
    },
  ],
}));

// Add to tool handlers
server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  switch (name) {
    // ... existing cases ...
    case 'my_custom_tool':
      return { content: [{ type: 'text', text: JSON.stringify(await myCustomTool(args)) }] };
  }
});
```

---

## 🧪 Testing Your Tool

### Unit Tests

```typescript
// tests/tools/my-custom-tool.test.ts
import { myCustomTool } from '../../src/tools/my-custom-tool';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('myCustomTool', () => {
  beforeEach(() => {
    // Setup test environment
  });

  it('should process input successfully', async () => {
    const result = await myCustomTool({
      inputPath: './test-data/sample.txt',
      options: { mode: 'quick' },
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should handle invalid input', async () => {
    await expect(
      myCustomTool({
        inputPath: '',
      })
    ).rejects.toThrow();
  });

  it('should use default options when not provided', async () => {
    const result = await myCustomTool({
      inputPath: './test-data/sample.txt',
    });

    expect(result.success).toBe(true);
  });
});
```

### Integration Tests

```typescript
// tests/integration/my-custom-tool.test.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

describe('My Custom Tool Integration', () => {
  let client: Client;

  beforeAll(async () => {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/index.js'],
    });

    client = new Client(
      {
        name: 'test-client',
        version: '1.0.0',
      },
      { capabilities: {} }
    );

    await client.connect(transport);
  });

  it('should be available in tool list', async () => {
    const tools = await client.listTools();
    const tool = tools.tools.find(t => t.name === 'my_custom_tool');

    expect(tool).toBeDefined();
    expect(tool?.description).toContain('Brief description');
  });

  it('should execute successfully', async () => {
    const result = await client.callTool({
      name: 'my_custom_tool',
      arguments: {
        inputPath: './test-data/sample.txt',
      },
    });

    expect(result.content).toBeDefined();
  });
});
```

---

## 🎨 Tool Design Patterns

### 1. Single Responsibility

Each tool should do one thing well:

```typescript
// ✅ Good: Clear, focused purpose
export async function analyzeCodeQuality(filePath: string) { ... }

// ❌ Bad: Too many responsibilities
export async function analyzeEverything(filePath: string) { ... }
```

### 2. Composability

Design tools to work together:

```typescript
// Tool A: Analyze
const analysis = await analyzeProject(projectPath);

// Tool B: Generate (uses Tool A's output)
const adrs = await generateAdrs({
  analysis: analysis,
  outputPath: './docs/adrs',
});

// Tool C: Validate (uses Tool B's output)
const validation = await validateAdrs(adrs.outputPath);
```

### 3. Idempotency

Same input should produce same output:

```typescript
// ✅ Good: Deterministic
export async function formatAdr(content: string) {
  return content.trim().replace(/\s+/g, ' ');
}

// ❌ Bad: Non-deterministic
export async function formatAdrWithTimestamp(content: string) {
  return `${content}\n\nGenerated: ${new Date()}`;
}
```

### 4. Error Handling

Always handle errors gracefully:

```typescript
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  if (error instanceof ValidationError) {
    return { success: false, error: 'Invalid input' };
  }
  throw McpAdrError.fromError(error, 'OPERATION_FAILED');
}
```

---

## 📊 Tool Categories

The server organizes tools into categories:

### 1. Analysis Tools

- Project ecosystem analysis
- Code quality assessment
- Architectural context extraction

### 2. Generation Tools

- ADR creation
- Documentation generation
- Rule set creation

### 3. Validation Tools

- ADR validation
- Project health scoring
- Deployment readiness

### 4. Workflow Tools

- Interactive planning
- Troubleshooting guides
- Tool orchestration

### 5. Research Tools

- Research question generation
- Research integration
- Knowledge incorporation

---

## 🔧 Advanced Topics

### Caching Results

```typescript
import { CacheManager } from '../utils/cache.js';

const cache = new CacheManager({ ttl: 3600000 });

export async function expensiveAnalysis(input: string) {
  const cacheKey = `analysis:${input}`;

  return cache.getOrSet(cacheKey, async () => {
    return await performExpensiveOperation(input);
  });
}
```

### AI Integration

```typescript
import { AIExecutor } from '../utils/ai-executor.js';

export async function generateWithAI(prompt: string) {
  const aiExecutor = AIExecutor.getInstance();

  const result = await aiExecutor.executePrompt({
    prompt,
    temperature: 0.7,
    maxTokens: 1000,
  });

  return result.content;
}
```

### Progress Tracking

```typescript
export async function longRunningOperation(
  items: string[],
  onProgress?: (progress: number) => void
) {
  for (let i = 0; i < items.length; i++) {
    await processItem(items[i]);
    onProgress?.(Math.round(((i + 1) / items.length) * 100));
  }
}
```

---

## ✅ Quality Checklist

Before submitting your tool:

- [ ] Written comprehensive unit tests (>80% coverage)
- [ ] Added integration tests
- [ ] Documented all parameters with JSDoc
- [ ] Added tool to `LLM_CONTEXT.md`
- [ ] Updated API reference documentation
- [ ] Validated input parameters with Zod
- [ ] Implemented error handling
- [ ] Added logging statements
- [ ] Tested with realistic data
- [ ] Reviewed performance implications
- [ ] Updated CHANGELOG.md

---

## 📚 Related Documentation

- **[Tool Design Philosophy](../explanation/tool-design.md)** - Architecture patterns
- **[API Reference](../reference/api-reference.md)** - Complete tool catalog
- **[Testing Guide](../TESTING_GUIDE.md)** - Testing best practices
- **[Contributing Guide](../../CONTRIBUTING.md)** - Contribution workflow

---

## 🎯 Examples

### Example 1: Simple Analysis Tool

```typescript
export async function countAdrs(directoryPath: string): Promise<number> {
  const files = await readdir(directoryPath);
  const adrFiles = files.filter(f => f.endsWith('.md'));
  return adrFiles.length;
}
```

### Example 2: Complex Generation Tool

```typescript
export async function generateAdrFromTemplate(options: {
  templatePath: string;
  variables: Record<string, string>;
  outputPath: string;
}): Promise<GenerationResult> {
  // 1. Load template
  const template = await readFile(options.templatePath, 'utf-8');

  // 2. Replace variables
  let content = template;
  for (const [key, value] of Object.entries(options.variables)) {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  // 3. Write output
  await writeFile(options.outputPath, content);

  return {
    success: true,
    outputPath: options.outputPath,
    linesGenerated: content.split('\n').length,
  };
}
```

---

## 💬 Need Help?

- **Tool Questions?** → [Open an Issue](https://github.com/tosin2013/mcp-adr-analysis-server/issues)
- **Architecture Questions?** → Review [Tool Design](../explanation/tool-design.md)
- **Testing Help?** → See [Testing Guide](../TESTING_GUIDE.md)
- **Contributing?** → Read [Contributing Guide](../../CONTRIBUTING.md)

---

_Last Updated: 2025-10-12_
