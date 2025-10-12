# DocuMCP LLM Context Reference

**Auto-generated**: 2025-10-12T16:34:46.846Z

This file provides instant context about DocuMCP's tools and memory system for LLMs.
Reference this file with @ to get comprehensive context about available capabilities.

---

## Overview

DocuMCP is an intelligent MCP server for GitHub Pages documentation deployment with:

- **45 Tools** for repository analysis, SSG recommendations, and deployment
- **Knowledge Graph** memory system tracking projects, technologies, and deployments
- **Phase 3 Features** including AST-based code analysis and drift detection
- **Diataxis Framework** compliance for documentation structure

---

## Core Documentation Tools

These are the primary tools for analyzing repositories and deploying documentation:

### `analyze_repository`

**Description**: Analyze repository structure, dependencies, and documentation needs

**Parameters**:

- `path` (required): Path to the repository to analyze
- `depth` (optional): [default: "standard"]

**Example**:

```typescript
analyze_repository({
  path: './',
  depth: 'standard',
});
```

### `recommend_ssg`

**Description**: Recommend the best static site generator based on project analysis and user preferences

**Parameters**:

- `analysisId` (required): ID from previous repository analysis
- `userId` (optional): User ID for personalized recommendations based on usage history [default: "default"]
- `preferences` (optional):

**Example**:

```typescript
recommend_ssg({
  analysisId: 'repo_abc123',
  userId: 'default',
  preferences: {
    priority: 'simplicity',
    ecosystem: 'javascript',
  },
});
```

### `generate_config`

**Description**: Generate configuration files for the selected static site generator

**Parameters**:

- `ssg` (required):
- `projectName` (required):
- `projectDescription` (optional):
- `outputPath` (required): Where to generate config files

### `setup_structure`

**Description**: Create Diataxis-compliant documentation structure

**Parameters**:

- `path` (required): Root path for documentation
- `ssg` (required):
- `includeExamples` (optional): [default: true]

### `deploy_pages`

**Description**: Set up GitHub Pages deployment workflow with deployment tracking and preference learning

**Parameters**:

- `repository` (required): Repository path or URL
- `ssg` (required):
- `branch` (optional): [default: "gh-pages"]
- `customDomain` (optional):
- `projectPath` (optional): Local path to the project for tracking
- `projectName` (optional): Project name for tracking
- `analysisId` (optional): ID from repository analysis for linking
- `userId` (optional): User ID for preference tracking [default: "default"]

**Example**:

```typescript
deploy_pages({
  repository: 'user/repo',
  ssg: 'docusaurus',
  branch: 'gh-pages',
  userId: 'default',
});
```

### `verify_deployment`

**Description**: Verify and troubleshoot GitHub Pages deployment

**Parameters**:

- `repository` (required): Repository path or URL
- `url` (optional): Expected deployment URL

### `populate_diataxis_content`

**Description**: Intelligently populate Diataxis documentation with project-specific content

**Parameters**:

- `analysisId` (required): Repository analysis ID from analyze_repository tool
- `docsPath` (required): Path to documentation directory
- `populationLevel` (optional): [default: "comprehensive"]
- `includeProjectSpecific` (optional): [default: true]
- `preserveExisting` (optional): [default: true]
- `technologyFocus` (optional): Specific technologies to emphasize

### `update_existing_documentation`

**Description**: Intelligently analyze and update existing documentation using memory insights and code comparison

**Parameters**:

- `analysisId` (required): Repository analysis ID from analyze_repository tool
- `docsPath` (required): Path to existing documentation directory
- `compareMode` (optional): Mode of comparison between code and documentation [default: "comprehensive"]
- `updateStrategy` (optional): How aggressively to suggest updates [default: "moderate"]
- `preserveStyle` (optional): Preserve existing documentation style and formatting [default: true]
- `focusAreas` (optional): Specific areas to focus updates on (e.g., "dependencies", "scripts", "api")

### `validate_diataxis_content`

**Description**: Validate the accuracy, completeness, and compliance of generated Diataxis documentation

**Parameters**:

- `contentPath` (required): Path to the documentation directory to validate
- `analysisId` (optional): Optional repository analysis ID for context-aware validation
- `validationType` (optional): Type of validation: accuracy, completeness, compliance, or all [default: "all"]
- `includeCodeValidation` (optional): Whether to validate code examples [default: true]
- `confidence` (optional): Validation confidence level: strict, moderate, or permissive [default: "moderate"]

---

## README Analysis & Generation Tools

Specialized tools for README creation, analysis, and optimization:

### `evaluate_readme_health`

**Description**: Evaluate README files for community health, accessibility, and onboarding effectiveness

**Parameters**:

- `readme_path` (required): Path to the README file to evaluate
- `project_type` (optional): Type of project for tailored evaluation [default: "community_library"]
- `repository_path` (optional): Optional path to repository for additional context

### `readme_best_practices`

**Description**: Analyze README files against best practices checklist and generate templates for improvement

**Parameters**:

- `readme_path` (required): Path to the README file to analyze
- `project_type` (optional): Type of project for tailored analysis [default: "library"]
- `generate_template` (optional): Generate README templates and community files [default: false]
- `output_directory` (optional): Directory to write generated templates and community files
- `include_community_files` (optional): Generate community health files (CONTRIBUTING.md, CODE_OF_CONDUCT.md, etc.) [default: true]
- `target_audience` (optional): Target audience for recommendations [default: "mixed"]

### `generate_readme_template`

**Description**: Generate standardized README templates for different project types with best practices

**Parameters**:

- `projectName` (required): Name of the project
- `description` (required): Brief description of what the project does
- `templateType` (required): Type of project template to generate
- `author` (optional): Project author/organization name
- `license` (optional): Project license [default: "MIT"]
- `includeScreenshots` (optional): Include screenshot placeholders for applications [default: false]
- `includeBadges` (optional): Include status badges [default: true]
- `includeContributing` (optional): Include contributing section [default: true]
- `outputPath` (optional): Path to write the generated README.md file

### `validate_readme_checklist`

**Description**: Validate README files against community best practices checklist with detailed scoring

**Parameters**:

- `readmePath` (required): Path to the README file to validate
- `projectPath` (optional): Path to project directory for additional context
- `strict` (optional): Use strict validation rules [default: false]
- `outputFormat` (optional): Output format for the validation report [default: "console"]

### `analyze_readme`

**Description**: Comprehensive README analysis with length assessment, structure evaluation, and optimization opportunities

**Parameters**:

- `project_path` (required): Path to the project directory containing README
- `target_audience` (optional): Target audience for analysis [default: "community_contributors"]
- `optimization_level` (optional): Level of optimization suggestions [default: "moderate"]
- `max_length_target` (optional): Target maximum length in lines [default: 300]

### `optimize_readme`

**Description**: Optimize README content by restructuring, condensing, and extracting detailed sections to separate documentation

**Parameters**:

- `readme_path` (required): Path to the README file to optimize
- `strategy` (optional): Optimization strategy [default: "community_focused"]
- `max_length` (optional): Target maximum length in lines [default: 300]
- `include_tldr` (optional): Generate and include TL;DR section [default: true]
- `preserve_existing` (optional): Preserve existing content structure where possible [default: true]
- `output_path` (optional): Path to write optimized README (if not specified, returns content only)
- `create_docs_directory` (optional): Create docs/ directory for extracted content [default: true]

---

## Phase 3: Code-to-Docs Synchronization Tools

Advanced tools using AST analysis and drift detection:

### `sync_code_to_docs`

**Description**: Automatically synchronize documentation with code changes using AST-based drift detection (Phase 3)

**Parameters**:

- `projectPath` (required): Path to the project root directory
- `docsPath` (required): Path to the documentation directory
- `mode` (optional): Sync mode: detect=analyze only, preview=show changes, apply=apply safe changes, auto=apply all [default: "detect"]
- `autoApplyThreshold` (optional): Confidence threshold (0-1) for automatic application of changes [default: 0.8]
- `createSnapshot` (optional): Create a snapshot before making changes (recommended) [default: true]

**Example**:

```typescript
sync_code_to_docs({
  projectPath: './',
  docsPath: './docs',
  mode: 'detect',
  createSnapshot: true,
});
```

### `generate_contextual_content`

**Description**: Generate context-aware documentation using AST analysis and knowledge graph insights (Phase 3)

**Parameters**:

- `filePath` (required): Path to the source code file to document
- `documentationType` (optional): Type of Diataxis documentation to generate [default: "reference"]
- `includeExamples` (optional): Include code examples in generated documentation [default: true]
- `style` (optional): Documentation detail level [default: "detailed"]
- `outputFormat` (optional): Output format for generated content [default: "markdown"]

**Example**:

```typescript
generate_contextual_content({
  filePath: './src/api.ts',
  documentationType: 'reference',
  includeExamples: true,
  style: 'detailed',
});
```

---

## Memory & Analytics Tools

Tools for user preferences, deployment analytics, and knowledge graph management:

### `manage_preferences`

**Description**: Manage user preferences for documentation generation and SSG recommendations

**Parameters**:

- `action` (required): Action to perform on preferences
- `userId` (optional): User ID for multi-user setups [default: "default"]
- `preferences` (optional): Preference updates (for update action)
- `json` (optional): JSON string for import action

### `analyze_deployments`

**Description**: Analyze deployment patterns and generate insights from historical deployment data

**Parameters**:

- `analysisType` (optional): Type of analysis: full_report (comprehensive), ssg_stats (per-SSG), compare (compare SSGs), health (deployment health score), trends (temporal analysis) [default: "full_report"]
- `ssg` (optional): SSG name for ssg_stats analysis
- `ssgs` (optional): Array of SSG names for comparison
- `periodDays` (optional): Period in days for trend analysis [default: 30]

---

## Additional Tools

### `setup_playwright_tests`

**Description**: Generate Playwright E2E test setup for documentation site (containers + CI/CD)

**Parameters**:

- `repositoryPath` (required): Path to documentation repository
- `ssg` (required):
- `projectName` (required): Project name for tests
- `mainBranch` (optional): [default: "main"]
- `includeAccessibilityTests` (optional): [default: true]
- `includeDockerfile` (optional): [default: true]
- `includeGitHubActions` (optional): [default: true]

### `validate_content`

**Description**: Validate general content quality: broken links, code syntax, references, and basic accuracy

**Parameters**:

- `contentPath` (required): Path to the content directory to validate
- `validationType` (optional): Type of validation: links, code, references, or all [default: "all"]
- `includeCodeValidation` (optional): Whether to validate code blocks [default: true]
- `followExternalLinks` (optional): Whether to validate external URLs (slower) [default: false]

### `detect_documentation_gaps`

**Description**: Analyze repository and existing documentation to identify missing content and gaps

**Parameters**:

- `repositoryPath` (required): Path to the repository to analyze
- `documentationPath` (optional): Path to existing documentation (if any)
- `analysisId` (optional): Optional existing analysis ID to reuse
- `depth` (optional): [default: "standard"]

### `test_local_deployment`

**Description**: Test documentation build and local server before deploying to GitHub Pages

**Parameters**:

- `repositoryPath` (required): Path to the repository
- `ssg` (required):
- `port` (optional): Port for local server [default: 3000]
- `timeout` (optional): Timeout in seconds for build process [default: 60]
- `skipBuild` (optional): Skip build step and only start server [default: false]

### `check_documentation_links`

**Description**: Comprehensive link checking for documentation deployment with external, internal, and anchor link validation

**Parameters**:

- `documentation_path` (optional): Path to the documentation directory to check [default: "./docs"]
- `check_external_links` (optional): Validate external URLs (slower but comprehensive) [default: true]
- `check_internal_links` (optional): Validate internal file references [default: true]
- `check_anchor_links` (optional): Validate anchor links within documents [default: true]
- `timeout_ms` (optional): Timeout for external link requests in milliseconds [default: 5000]
- `max_concurrent_checks` (optional): Maximum concurrent link checks [default: 5]
- `allowed_domains` (optional): Whitelist of allowed external domains (empty = all allowed) [default: []]
- `ignore_patterns` (optional): URL patterns to ignore during checking [default: []]
- `fail_on_broken_links` (optional): Fail the check if broken links are found [default: false]
- `output_format` (optional): Output format for results [default: "detailed"]

### `read_directory`

**Description**: List files and directories within allowed roots. Use this to discover files without requiring full absolute paths from the user.

**Parameters**:

- `path` (required): Path to directory (relative to root or absolute within root)

### `manage_sitemap`

**Description**: Generate, validate, and manage sitemap.xml as the source of truth for documentation links. Sitemap.xml is used for SEO, search engine submission, and deployment tracking.

**Parameters**:

- `action` (required): Action to perform: generate (create new), validate (check structure), update (sync with docs), list (show all URLs)
- `docsPath` (required): Path to documentation root directory
- `baseUrl` (optional): Base URL for the site (e.g., https://user.github.io/repo). Required for generate/update actions.
- `includePatterns` (optional): File patterns to include (default: **/\*.md, **/_.html, \*\*/_.mdx)
- `excludePatterns` (optional): File patterns to exclude (default: node_modules, .git, dist, build, .documcp)
- `updateFrequency` (optional): Default change frequency for pages
- `useGitHistory` (optional): Use git history for last modified dates (default: true) [default: true]
- `sitemapPath` (optional): Custom path for sitemap.xml (default: docsPath/sitemap.xml)

### `generate_llm_context`

**Description**: Generate a comprehensive LLM context reference file documenting all tools, memory system, and workflows for easy @ reference

**Parameters**:

- `projectPath` (required): Path to the project root directory where LLM_CONTEXT.md will be generated
- `includeExamples` (optional): Include usage examples for tools [default: true]
- `format` (optional): Level of detail in the generated context [default: "detailed"]

### `memory_recall`

**Description**: Recall memories about a project or topic

**Parameters**:

- `query` (required): Search query or project ID
- `type` (optional): Type of memory to recall
- `limit` (optional): Maximum number of memories to return [default: 10]

### `memory_intelligent_analysis`

**Description**: Get intelligent analysis with patterns, predictions, and recommendations

**Parameters**:

- `projectPath` (required): Path to the project for analysis
- `baseAnalysis` (required): Base analysis data to enhance

### `memory_enhanced_recommendation`

**Description**: Get enhanced recommendations using learning and knowledge graph

**Parameters**:

- `projectPath` (required): Path to the project
- `baseRecommendation` (required): Base recommendation to enhance
- `projectFeatures` (required):

### `memory_learning_stats`

**Description**: Get comprehensive learning and knowledge graph statistics

**Parameters**:

- `includeDetails` (optional): Include detailed statistics [default: true]

### `memory_knowledge_graph`

**Description**: Query the knowledge graph for relationships and paths

**Parameters**:

- `query` (required):

### `memory_contextual_search`

**Description**: Perform contextual memory retrieval with intelligent ranking

**Parameters**:

- `query` (required): Search query
- `context` (required):
- `options` (optional):

### `memory_agent_network`

**Description**: Manage multi-agent memory sharing and collaboration

**Parameters**:

- `action` (required): Action to perform
- `agentInfo` (optional):
- `memoryId` (optional): Memory ID for sharing operations
- `targetAgent` (optional): Target agent for sync operations
- `options` (optional):

### `memory_insights`

**Description**: Get insights and patterns from memory

**Parameters**:

- `projectId` (optional): Project ID to analyze
- `timeRange` (optional): Time range for analysis

### `memory_similar`

**Description**: Find similar projects from memory

**Parameters**:

- `analysisId` (required): Analysis ID to find similar projects for
- `limit` (optional): Maximum number of similar projects [default: 5]

### `memory_export`

**Description**: Export memories to JSON or CSV

**Parameters**:

- `format` (optional): Export format [default: "json"]
- `filter` (optional): Filter memories to export

### `memory_cleanup`

**Description**: Clean up old memories

**Parameters**:

- `daysToKeep` (optional): Number of days of memories to keep [default: 30]
- `dryRun` (optional): Preview what would be deleted without actually deleting [default: false]

### `memory_pruning`

**Description**: Intelligent memory pruning and optimization

**Parameters**:

- `policy` (optional):
- `dryRun` (optional): Preview pruning without executing [default: false]

### `memory_temporal_analysis`

**Description**: Analyze temporal patterns and trends in memory data

**Parameters**:

- `query` (optional):
- `analysisType` (optional): [default: "patterns"]

### `memory_visualization`

**Description**: Generate visual representations of memory data

**Parameters**:

- `visualizationType` (optional): [default: "dashboard"]
- `options` (optional):
- `customVisualization` (optional):

### `memory_export_advanced`

**Description**: Advanced memory export with multiple formats and options

**Parameters**:

- `outputPath` (required): Output file path
- `options` (optional):

### `memory_import_advanced`

**Description**: Advanced memory import with validation and conflict resolution

**Parameters**:

- `inputPath` (required): Input file path
- `options` (optional):

### `memory_migration`

**Description**: Create and execute migration plans between different memory systems

**Parameters**:

- `action` (optional): [default: "create_plan"]
- `sourcePath` (optional): Source data path
- `migrationPlan` (optional):
- `sourceSchema` (optional): Source system schema
- `targetSchema` (optional): Target system schema
- `options` (optional):

### `memory_optimization_metrics`

**Description**: Get comprehensive optimization metrics and recommendations

**Parameters**:

- `includeRecommendations` (optional): [default: true]
- `timeRange` (optional):

---

## Memory Knowledge Graph System

DocuMCP includes a persistent memory system that learns from every analysis:

### Entity Types

- **Project**: Software projects with analysis history and metadata
- **User**: User preferences and SSG usage patterns
- **Configuration**: SSG deployment configurations with success rates
- **Documentation**: Documentation structures and patterns
- **CodeFile**: Source code files with metadata and change tracking
- **DocumentationSection**: Documentation sections linked to code
- **Technology**: Languages, frameworks, and tools used in projects

### Relationship Types

- `project_uses_technology`: Links projects to their tech stack
- `user_prefers_ssg`: Tracks user SSG preferences
- `project_deployed_with`: Records deployment configurations and outcomes
- `similar_to`: Identifies similar projects for better recommendations
- `documents`: Links code files to documentation sections
- `outdated_for`: Flags documentation that's out of sync with code
- `depends_on`: Tracks technology dependencies

### Storage Location

- Default: `.documcp/memory/`
- Files: `knowledge-graph-entities.jsonl`, `knowledge-graph-relationships.jsonl`
- Backups: `.documcp/memory/backups/`
- Snapshots: `.documcp/snapshots/` (for drift detection)

### Memory Benefits

1. **Context-Aware Recommendations**: Uses historical data to improve SSG suggestions
2. **Learning from Success**: Tracks which configurations work best
3. **Similar Project Insights**: Leverages patterns from similar projects
4. **Drift Detection**: Automatically identifies when docs are out of sync
5. **User Preferences**: Adapts to individual user patterns over time

---

## Phase 3 Features (Code-to-Docs Sync)

### AST-Based Code Analysis

- Multi-language support: TypeScript, JavaScript, Python, Go, Rust, Java, Ruby, Bash
- Extracts functions, classes, interfaces, types, imports, exports
- Tracks complexity metrics and code signatures
- Detects semantic changes (not just text diffs)

### Drift Detection

- **Snapshot-based approach**: Stores code and documentation state over time
- **Impact analysis**: Categorizes changes (breaking, major, minor, patch)
- **Affected documentation tracking**: Links code changes to specific docs
- **Automatic suggestions**: Generates update recommendations

### Drift Types Detected

- **Outdated**: Documentation references old API signatures
- **Incorrect**: Documented features no longer exist in code
- **Missing**: New code features lack documentation
- **Breaking**: API changes that invalidate existing docs

### Sync Modes

- `detect`: Analyze drift without making changes
- `preview`: Show proposed changes
- `apply`: Apply high-confidence changes automatically (threshold: 0.8)
- `auto`: Apply all changes (use with caution)

---

## Common Workflows

### 1. New Documentation Site Setup

```
1. analyze_repository (path: "./")
2. recommend_ssg (analysisId: from step 1)
3. generate_config (ssg: from step 2, outputPath: "./")
4. setup_structure (path: "./docs", ssg: from step 2)
5. populate_diataxis_content (analysisId: from step 1, docsPath: "./docs")
6. deploy_pages (repository: repo-url, ssg: from step 2)
```

### 2. Documentation Synchronization (Phase 3)

```
1. sync_code_to_docs (projectPath: "./", docsPath: "./docs", mode: "detect")
2. Review drift report and affected sections
3. sync_code_to_docs (mode: "apply", autoApplyThreshold: 0.8)
4. Manual review of remaining changes
```

### 3. Content Generation from Code

```
1. generate_contextual_content (filePath: "./src/api.ts", documentationType: "reference")
2. generate_contextual_content (filePath: "./src/api.ts", documentationType: "tutorial")
3. Review and integrate generated content
```

### 4. Existing Documentation Improvement

```
1. analyze_repository (path: "./")
2. update_existing_documentation (analysisId: from step 1, docsPath: "./docs")
3. validate_diataxis_content (contentPath: "./docs", analysisId: from step 1)
4. check_documentation_links (documentation_path: "./docs")
```

### 5. README Enhancement

```
1. analyze_readme (project_path: "./")
2. evaluate_readme_health (readme_path: "./README.md")
3. readme_best_practices (readme_path: "./README.md", generate_template: true)
4. optimize_readme (readme_path: "./README.md")
```

---

## Quick Reference Table

| Tool                            | Primary Use                                           | Key Parameters               | Output          |
| ------------------------------- | ----------------------------------------------------- | ---------------------------- | --------------- |
| `analyze_repository`            | Analyze repository structure, dependencies, and do... | path                         | Analysis/Config |
| `recommend_ssg`                 | Recommend the best static site generator based on ... | analysisId                   | Analysis/Config |
| `generate_config`               | Generate configuration files for the selected stat... | ssg, projectName, outputPath | Analysis/Config |
| `setup_structure`               | Create Diataxis-compliant documentation structure...  | path, ssg                    | Analysis/Config |
| `deploy_pages`                  | Set up GitHub Pages deployment workflow with deplo... | repository, ssg              | Analysis/Config |
| `verify_deployment`             | Verify and troubleshoot GitHub Pages deployment...    | repository                   | Analysis/Config |
| `populate_diataxis_content`     | Intelligently populate Diataxis documentation with... | analysisId, docsPath         | Analysis/Config |
| `update_existing_documentation` | Intelligently analyze and update existing document... | analysisId, docsPath         | Analysis/Config |
| `validate_diataxis_content`     | Validate the accuracy, completeness, and complianc... | contentPath                  | Analysis/Config |

---

## Tips for LLMs

1. **Always start with `analyze_repository`** to get project context
2. **Use the knowledge graph**: Tools automatically store and retrieve relevant history
3. **Phase 3 tools need setup**: Ensure project has code structure before running sync
4. **Memory persists**: The system learns from every interaction
5. **Workflows are composable**: Chain tools together for complex operations
6. **Permission-aware**: All tools respect MCP root permissions

---

## Storage Locations to Reference

- **Memory**: `.documcp/memory/`
- **Snapshots**: `.documcp/snapshots/`
- **Knowledge Graph Entities**: `.documcp/memory/knowledge-graph-entities.jsonl`
- **Knowledge Graph Relationships**: `.documcp/memory/knowledge-graph-relationships.jsonl`
- **User Preferences**: Stored in knowledge graph with `user_prefers_ssg` edges

---

_This file is auto-generated. To regenerate, use the `generate_llm_context` tool._
