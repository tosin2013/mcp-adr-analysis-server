# Using Validated Patterns with Live Authoritative Sources

## Overview

The Validated Patterns framework now includes direct references to authoritative web sources that LLMs should query to get the latest deployment best practices. This ensures patterns stay current and follow the absolute latest recommendations from official sources.

## How It Works

Each validated pattern includes an `authoritativeSources` array with web resources that LLMs should query before deployment:

```typescript
{
  type: 'documentation' | 'repository' | 'specification' | 'examples' | 'community',
  url: string,
  purpose: string,
  priority: number, // 1-10, higher = more authoritative
  queryInstructions: string, // How to query this source
  requiredForDeployment: boolean // Must query before deployment?
}
```

## Example: OpenShift Validated Pattern

For OpenShift, the pattern includes these authoritative sources:

### 1. https://play.validatedpatterns.io/ (Priority: 10, REQUIRED)

**Purpose**: Primary documentation for OpenShift Validated Patterns

**Query Instructions**:

> Search this site for: 1) Pattern creation guidelines, 2) Values hierarchy system, 3) ArgoCD sync wave patterns, 4) Secrets management approaches. Pay special attention to /vp-workshop/ sections.

### 2. https://github.com/validatedpatterns/common (Priority: 10, REQUIRED)

**Purpose**: Common framework code with actual implementation

**Query Instructions**:

> Examine this repository for: 1) Helm chart templates, 2) values-global.yaml structure, 3) Makefile commands, 4) Common ArgoCD applications. Use this to understand the actual implementation details.

### 3. https://github.com/validatedpatterns (Priority: 8, OPTIONAL)

**Purpose**: Collection of validated pattern examples

**Query Instructions**:

> Browse available patterns to find similar use cases. Look for patterns that match your deployment requirements (multi-cluster, single cluster, specific operators).

## LLM Workflow

When an LLM needs to apply a validated pattern, it should follow this workflow:

### Step 1: Generate Research Report

```typescript
import { generatePatternResearchReport } from './src/utils/pattern-research-utility.js';

const report = generatePatternResearchReport('openshift');
console.log(report);
```

This generates a comprehensive report with:

- List of REQUIRED sources (must query)
- List of OPTIONAL sources (recommended)
- Query instructions for each source
- Example WebFetch usage

### Step 2: Query Required Sources

For each REQUIRED source, use WebFetch to retrieve current information:

```typescript
// Example for OpenShift
WebFetch({
  url: 'https://play.validatedpatterns.io/',
  prompt: `
    Search this site for:
    1) Pattern creation guidelines
    2) Values hierarchy system (values-global.yaml → values-{clusterGroup}.yaml → app overrides)
    3) ArgoCD sync wave patterns
    4) Secrets management approaches (Vault, External Secrets Operator)

    Extract the latest best practices for creating OpenShift Validated Patterns.
    Focus on /vp-workshop/ sections.
  `,
});

WebFetch({
  url: 'https://github.com/validatedpatterns/common',
  prompt: `
    Examine this repository for:
    1) Helm chart templates in /common/
    2) values-global.yaml structure and examples
    3) Makefile commands for pattern deployment
    4) Common ArgoCD applications

    Extract the actual implementation patterns and templates used by validated patterns.
  `,
});
```

### Step 3: Compare with Static Pattern

After querying authoritative sources, compare findings with the static pattern definition:

```typescript
import { getPattern } from './src/utils/validated-pattern-definitions.js';

const staticPattern = getPattern('openshift');
console.log('Static pattern last updated:', staticPattern.metadata.lastUpdated);

// Compare with findings from WebFetch queries
// Note any differences or updates
```

### Step 4: Apply Updated Pattern

Use the latest information from authoritative sources to:

1. Update deployment commands if needed
2. Add new validation checks
3. Include recent security updates
4. Follow current naming conventions
5. Use latest API versions

## Platform-Specific Examples

### Kubernetes

```typescript
const report = generatePatternResearchReport('kubernetes');

// Query kubernetes.io/docs for latest API versions
WebFetch({
  url: 'https://kubernetes.io/docs/concepts/configuration/overview/',
  prompt: 'Extract configuration best practices for Kubernetes deployments in 2025...',
});

// Check for deprecated APIs
WebFetch({
  url: 'https://kubernetes.io/docs/reference/using-api/deprecation-guide/',
  prompt: 'List any API deprecations or breaking changes...',
});
```

### MCP (Model Context Protocol)

```typescript
const report = generatePatternResearchReport('mcp');

// Query official MCP specification
WebFetch({
  url: 'https://modelcontextprotocol.io/',
  prompt:
    'Extract the latest MCP protocol specification, focusing on STDIO transport, tool design, and security...',
});

// Get best practices
WebFetch({
  url: 'https://modelcontextprotocol.info/docs/best-practices/',
  prompt: 'Extract MCP server best practices for architecture, error handling, and testing...',
});
```

### A2A (Agent-to-Agent)

```typescript
const report = generatePatternResearchReport('a2a');

// Query A2A protocol specification
WebFetch({
  url: 'https://a2aprotocol.ai/',
  prompt:
    'Extract A2A protocol specification including Agent Card format, authentication, and communication patterns...',
});

// Get implementation examples
WebFetch({
  url: 'https://github.com/a2aproject/A2A',
  prompt: 'Find example Agent Card schemas and implementation patterns in /docs/ and /examples/...',
});
```

## Pattern Research Utility API

### Research a Pattern

```typescript
import { researchPattern } from './src/utils/pattern-research-utility.js';

// Research all sources (required + optional)
const research = await researchPattern('nodejs', false);

// Research only required sources
const minimalResearch = await researchPattern('nodejs', true);

console.log('Confidence:', research.overallConfidence);
console.log('Sources queried:', research.totalSourcesQueried);
console.log('Summary:', research.summary);
console.log('Recommendations:', research.recommendations);
```

### Generate Research Report

```typescript
import { generatePatternResearchReport } from './src/utils/pattern-research-utility.js';

// Get formatted report for LLM consumption
const report = generatePatternResearchReport('python');

// Report includes:
// - Required vs optional sources
// - Query instructions for each
// - Example WebFetch calls
// - Critical notes and warnings
```

## Best Practices for LLMs

### 1. Always Query Required Sources

**Don't skip required sources** - they contain critical information that may differ from static patterns.

```typescript
const pattern = getPattern('docker');
const requiredSources = pattern.authoritativeSources.filter(s => s.requiredForDeployment);

for (const source of requiredSources) {
  // MUST query each required source
  await WebFetch({ url: source.url, prompt: source.queryInstructions });
}
```

### 2. Check Pattern Age

```typescript
const pattern = getPattern('kubernetes');
const patternAge = Date.now() - new Date(pattern.metadata.lastUpdated).getTime();
const daysOld = Math.floor(patternAge / (1000 * 60 * 60 * 24));

if (daysOld > 30) {
  console.warn(`Pattern is ${daysOld} days old - strongly recommend querying sources`);
}
```

### 3. Prioritize High-Priority Sources

```typescript
const pattern = getPattern('openshift');
const highPriority = pattern.authoritativeSources
  .filter(s => s.priority >= 9)
  .sort((a, b) => b.priority - a.priority);

// Query highest priority sources first
for (const source of highPriority) {
  await WebFetch({ url: source.url, prompt: source.queryInstructions });
}
```

### 4. Look for Breaking Changes

Always check for:

- API deprecations
- Security updates
- Breaking changes since pattern.metadata.lastUpdated
- New best practices
- Updated configuration formats

### 5. Document Differences

When you find differences between static pattern and live sources:

```typescript
const differences = [];

// After querying sources
if (latestApiVersion !== staticPattern.apiVersion) {
  differences.push({
    field: 'apiVersion',
    static: staticPattern.apiVersion,
    current: latestApiVersion,
    action: 'Update deployment to use latest API version',
  });
}

// Store for future pattern updates
```

## Complete Example: OpenShift Deployment

```typescript
// 1. Detect platform
import { detectPlatforms } from './src/utils/platform-detector.js';
const detection = await detectPlatforms('/path/to/project');
console.log('Detected:', detection.primaryPlatform); // 'openshift'

// 2. Generate research report
import { generatePatternResearchReport } from './src/utils/pattern-research-utility.js';
const report = generatePatternResearchReport('openshift');
console.log(report);

// 3. Query required sources
const playValidatedPatternsFindings = await WebFetch({
  url: 'https://play.validatedpatterns.io/',
  prompt: 'Extract OpenShift Validated Patterns best practices...',
});

const commonRepoFindings = await WebFetch({
  url: 'https://github.com/validatedpatterns/common',
  prompt: 'Examine Helm templates and values structure...',
});

// 4. Get static pattern
import { getPattern } from './src/utils/validated-pattern-definitions.js';
const pattern = getPattern('openshift');

// 5. Merge findings with pattern
const updatedPattern = {
  ...pattern,
  // Update with latest findings
  billOfMaterials: updateBillOfMaterials(pattern.billOfMaterials, playValidatedPatternsFindings),
  deploymentPhases: updateDeploymentPhases(pattern.deploymentPhases, commonRepoFindings),
};

// 6. Apply pattern
// (Use bootstrap-validation-loop-tool or direct deployment)
```

## Memory Integration

The Pattern Research Utility integrates with the Memory Entity Manager to:

1. **Cache research results** for 1 hour (configurable)
2. **Track pattern usage** across projects
3. **Learn from deployment outcomes**
4. **Recommend patterns** for similar projects

```typescript
import { researchPattern } from './src/utils/pattern-research-utility.js';

// First call - queries sources
const research1 = await researchPattern('nodejs', false, true);

// Second call within 1 hour - uses cache
const research2 = await researchPattern('nodejs', false, true);
console.log('Using cached research');

// Force fresh research
const research3 = await researchPattern('nodejs', false, false);
console.log('Fresh research from sources');
```

## Troubleshooting

### Source Query Failures

If a source query fails:

```typescript
const research = await researchPattern('kubernetes');

const failed = research.results.filter(r => !r.success);
if (failed.length > 0) {
  console.warn('Failed to query sources:');
  failed.forEach(f => console.warn(`  - ${f.source.url}: ${f.error}`));

  // Check if required sources failed
  const failedRequired = failed.filter(f => f.source.requiredForDeployment);
  if (failedRequired.length > 0) {
    throw new Error('CRITICAL: Failed to query required sources for deployment');
  }
}
```

### Pattern Not Found

```typescript
try {
  const pattern = getPattern('custom-platform');
} catch (error) {
  console.error('Pattern not found. Available platforms:', [
    'openshift',
    'kubernetes',
    'docker',
    'nodejs',
    'python',
    'mcp',
    'a2a',
  ]);
}
```

### Outdated Information

If you suspect information is outdated:

```typescript
// Clear cache and re-research
import { PatternResearchUtility } from './src/utils/pattern-research-utility.js';

const utility = new PatternResearchUtility();
utility.clearCache();

const freshResearch = await utility.researchPattern('openshift', false, false);
```

## Conclusion

The Validated Patterns framework with live authoritative sources ensures your deployments always follow the latest best practices. By querying official documentation, repositories, and community resources before deployment, you can be confident that your infrastructure follows current standards and avoids deprecated patterns.

**Key Takeaways**:

1. Always query REQUIRED sources before deployment
2. Use WebFetch to retrieve live information
3. Compare findings with static patterns
4. Document and apply differences
5. Cache research results for efficiency
6. Monitor pattern age and update regularly
