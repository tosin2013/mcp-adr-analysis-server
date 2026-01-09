/**
 * Analyze Gaps Tool
 * Scans local codebase and compares with ADRs to detect bi-directional gaps.
 *
 * Workflow:
 * 1. Fetch ADRs (local or from aggregator)
 * 2. Scan local files for:
 *    - File references in ADRs that don't exist
 *    - Technologies in package.json without ADR coverage
 *    - Architectural patterns (WebSocket, Redis, auth, etc.)
 * 3. Report gaps to ADR Aggregator
 */

import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { McpAdrError } from '../types/index.js';
import type { ToolContext } from '../types/tool-context.js';
import {
  getAdrAggregatorClient,
  type AdrAggregatorClient,
} from '../utils/adr-aggregator-client.js';
import { loadConfig } from '../utils/config.js';
import { isGitRepository } from '../utils/git-remote-detector.js';
import type {
  CodeGap,
  GapSeverity,
  ReportCodeGapsRequest,
  GapAnalysisSummary,
} from '../types/adr-aggregator.js';

// ============================================================================
// Tool Argument Interfaces
// ============================================================================

/**
 * Arguments for analyze_gaps tool
 */
export interface AnalyzeGapsArgs {
  /** Project path (defaults to PROJECT_PATH) */
  projectPath?: string;
  /** Whether to report gaps to ADR Aggregator */
  reportToAggregator?: boolean;
  /** Include dismissed gaps in analysis */
  includeDismissed?: boolean;
  /** Specific directories to scan (defaults to common source directories) */
  scanDirectories?: string[];
  /** File patterns to include in scan */
  includePatterns?: string[];
  /** File patterns to exclude from scan */
  excludePatterns?: string[];
}

/**
 * Standard tool result format
 */
export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

// ============================================================================
// Technology Detection Patterns
// ============================================================================

/**
 * Technology patterns to detect in package.json dependencies
 */
const TECHNOLOGY_PATTERNS: Record<string, { keywords: string[]; suggestedAdrTitle: string }> = {
  redis: {
    keywords: ['redis', 'ioredis', '@redis/client'],
    suggestedAdrTitle: 'Caching Strategy with Redis',
  },
  postgresql: {
    keywords: ['pg', 'postgres', 'postgresql', '@prisma/client', 'typeorm', 'knex'],
    suggestedAdrTitle: 'Database Strategy with PostgreSQL',
  },
  mongodb: {
    keywords: ['mongodb', 'mongoose', 'monk'],
    suggestedAdrTitle: 'Database Strategy with MongoDB',
  },
  elasticsearch: {
    keywords: ['elasticsearch', '@elastic/elasticsearch', 'opensearch'],
    suggestedAdrTitle: 'Search Infrastructure with Elasticsearch',
  },
  rabbitmq: {
    keywords: ['amqplib', 'amqp-connection-manager', 'rabbitmq'],
    suggestedAdrTitle: 'Message Queue Strategy with RabbitMQ',
  },
  kafka: {
    keywords: ['kafkajs', 'kafka-node', 'node-rdkafka'],
    suggestedAdrTitle: 'Event Streaming with Kafka',
  },
  graphql: {
    keywords: ['graphql', 'apollo-server', '@apollo/server', 'type-graphql', 'nexus'],
    suggestedAdrTitle: 'API Strategy with GraphQL',
  },
  websocket: {
    keywords: ['ws', 'socket.io', 'socket.io-client', '@socket.io/redis-adapter'],
    suggestedAdrTitle: 'Real-time Communication with WebSockets',
  },
  grpc: {
    keywords: ['grpc', '@grpc/grpc-js', '@grpc/proto-loader'],
    suggestedAdrTitle: 'Service Communication with gRPC',
  },
  kubernetes: {
    keywords: ['@kubernetes/client-node', 'kubernetes-client'],
    suggestedAdrTitle: 'Container Orchestration with Kubernetes',
  },
  docker: {
    keywords: ['dockerode', 'docker-compose'],
    suggestedAdrTitle: 'Containerization Strategy with Docker',
  },
  aws: {
    keywords: ['aws-sdk', '@aws-sdk/', 'aws-amplify'],
    suggestedAdrTitle: 'Cloud Infrastructure with AWS',
  },
  gcp: {
    keywords: ['@google-cloud/', 'firebase', 'firebase-admin', 'firebase-functions'],
    suggestedAdrTitle: 'Cloud Infrastructure with Google Cloud',
  },
  azure: {
    keywords: ['@azure/', 'azure-storage'],
    suggestedAdrTitle: 'Cloud Infrastructure with Azure',
  },
  auth: {
    keywords: ['passport', 'jsonwebtoken', 'bcrypt', 'oauth', '@auth0/', 'next-auth', 'clerk'],
    suggestedAdrTitle: 'Authentication and Authorization Strategy',
  },
  testing: {
    keywords: ['jest', 'mocha', 'vitest', 'cypress', 'playwright', '@testing-library/'],
    suggestedAdrTitle: 'Testing Strategy and Framework Selection',
  },
  monitoring: {
    keywords: ['prom-client', 'newrelic', '@sentry/', 'datadog', '@opentelemetry/'],
    suggestedAdrTitle: 'Observability and Monitoring Strategy',
  },
  react: {
    keywords: ['react', 'react-dom', 'next', '@remix-run/'],
    suggestedAdrTitle: 'Frontend Framework Selection - React',
  },
  vue: {
    keywords: ['vue', 'nuxt', '@vue/'],
    suggestedAdrTitle: 'Frontend Framework Selection - Vue',
  },
  angular: {
    keywords: ['@angular/core', '@angular/cli'],
    suggestedAdrTitle: 'Frontend Framework Selection - Angular',
  },
};

/**
 * Architectural patterns to detect in source code
 */
const ARCHITECTURAL_PATTERNS: Record<
  string,
  { filePatterns: RegExp[]; codePatterns: RegExp[]; suggestedAdrTitle: string }
> = {
  microservices: {
    filePatterns: [/docker-compose\.ya?ml$/i, /k8s\/.*\.ya?ml$/i, /\.?helm\//i],
    codePatterns: [/service-discovery/i, /circuit-?breaker/i, /api-gateway/i],
    suggestedAdrTitle: 'Microservices Architecture',
  },
  eventSourcing: {
    filePatterns: [/events?\//i, /event-store/i],
    codePatterns: [/event-?sourcing/i, /event-?store/i, /aggregate-?root/i],
    suggestedAdrTitle: 'Event Sourcing Pattern',
  },
  cqrs: {
    filePatterns: [/commands?\//i, /queries?\//i],
    codePatterns: [/command-?handler/i, /query-?handler/i, /cqrs/i],
    suggestedAdrTitle: 'CQRS Pattern Implementation',
  },
  domainDrivenDesign: {
    filePatterns: [/domain\//i, /aggregates?\//i, /entities?\//i, /value-?objects?\//i],
    codePatterns: [/bounded-?context/i, /aggregate/i, /domain-?event/i],
    suggestedAdrTitle: 'Domain-Driven Design Adoption',
  },
  cleanArchitecture: {
    filePatterns: [
      /use-?cases?\//i,
      /adapters?\//i,
      /infrastructure\//i,
      /presentation\//i,
      /core\//i,
    ],
    codePatterns: [/use-?case/i, /presenter/i, /repository-?interface/i],
    suggestedAdrTitle: 'Clean Architecture Implementation',
  },
  serverless: {
    filePatterns: [/serverless\.ya?ml$/i, /netlify\.toml$/i, /vercel\.json$/i],
    codePatterns: [/lambda-?handler/i, /cloud-?function/i],
    suggestedAdrTitle: 'Serverless Architecture',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Discover ADR files in the project
 */
async function discoverLocalAdrs(projectPath: string, adrDirectory: string): Promise<string[]> {
  const adrPath = path.resolve(projectPath, adrDirectory);
  const adrFiles: string[] = [];

  try {
    const files = await fs.readdir(adrPath);
    for (const file of files) {
      if (file.endsWith('.md')) {
        adrFiles.push(path.join(adrPath, file));
      }
    }
  } catch {
    // Directory doesn't exist or not readable
  }

  return adrFiles;
}

/**
 * Result of path normalization and verification
 */
interface PathVerificationResult {
  /** Whether the file exists at the resolved path */
  exists: boolean;
  /** The normalized path (relative, without leading ./) */
  normalizedPath: string;
  /** The full resolved path used for existence check */
  resolvedPath: string;
}

/**
 * Normalize a file path and verify if it exists
 *
 * Handles various path formats:
 * - ./src/file.ts → src/file.ts (strips leading ./)
 * - ../shared/types.ts → ../shared/types.ts (preserves parent refs)
 * - src/file.ts → src/file.ts (no change needed)
 *
 * @param referencedPath - The path as found in the ADR
 * @param basePath - The base path to resolve relative paths against (usually repo root)
 * @returns Object with exists flag and normalized path
 */
function normalizeAndVerifyPath(referencedPath: string, basePath: string): PathVerificationResult {
  // Normalize the path:
  // - Strip leading ./ (current directory)
  // - Preserve ../ (parent directory references)
  // - Handle multiple leading ./
  const normalized = referencedPath
    .replace(/^(\.\/)+/, '') // Remove one or more leading ./
    .trim();

  // If path is empty after normalization, it's invalid
  if (!normalized) {
    return {
      exists: false,
      normalizedPath: referencedPath,
      resolvedPath: '',
    };
  }

  // Resolve the full path relative to basePath
  const fullPath = path.resolve(basePath, normalized);

  // Check if file exists
  const exists = existsSync(fullPath);

  return {
    exists,
    normalizedPath: normalized,
    resolvedPath: fullPath,
  };
}

/**
 * Simple path normalization (for use in extraction)
 * Strips leading ./ prefix only
 */
function normalizeFilePath(ref: string): string {
  return ref.replace(/^(\.\/)+/, '').trim();
}

/**
 * Extract file references from ADR content
 * Looks for patterns like:
 * - `src/file.ts` or `./src/file.ts`
 * - [link](./path/to/file.ts)
 * - References to: src/auth/oauth.ts
 *
 * Note: All paths are normalized by stripping leading ./ prefix
 */
function extractFileReferences(content: string): string[] {
  const references: Set<string> = new Set();

  // Match backtick code references: `src/file.ts` or `./src/file.ts`
  const backtickPattern = /`([^`]+\.[a-zA-Z]{2,4})`/g;
  let match;
  while ((match = backtickPattern.exec(content)) !== null) {
    const ref = match[1];
    if (ref && !ref.includes(' ') && !ref.startsWith('http')) {
      references.add(normalizeFilePath(ref));
    }
  }

  // Match markdown links: [text](./path/file.ts)
  const linkPattern = /\[([^\]]*)\]\(([^)]+\.[a-zA-Z]{2,4})\)/g;
  while ((match = linkPattern.exec(content)) !== null) {
    const ref = match[2];
    if (ref && !ref.startsWith('http')) {
      references.add(normalizeFilePath(ref));
    }
  }

  // Match explicit file paths in common patterns (with or without ./ prefix)
  const pathPattern =
    /(?:\.\/)?(?:src|lib|app|packages?)\/[\w\-/.]+\.[a-zA-Z]{2,4}(?=[\s,;:\])]|$)/g;
  while ((match = pathPattern.exec(content)) !== null) {
    references.add(normalizeFilePath(match[0]));
  }

  return Array.from(references);
}

/**
 * Read and parse package.json
 */
async function readPackageJson(projectPath: string): Promise<{
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} | null> {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);
    return {
      dependencies: pkg.dependencies || {},
      devDependencies: pkg.devDependencies || {},
    };
  } catch {
    return null;
  }
}

/**
 * Detect technologies from package.json
 */
function detectTechnologies(
  dependencies: Record<string, string>,
  devDependencies: Record<string, string>
): Array<{ name: string; packages: string[]; suggestedAdrTitle: string }> {
  const allDeps = { ...dependencies, ...devDependencies };
  const detected: Array<{ name: string; packages: string[]; suggestedAdrTitle: string }> = [];

  for (const [techName, config] of Object.entries(TECHNOLOGY_PATTERNS)) {
    const matchingPackages: string[] = [];

    for (const dep of Object.keys(allDeps)) {
      for (const keyword of config.keywords) {
        if (dep.toLowerCase().includes(keyword.toLowerCase())) {
          matchingPackages.push(dep);
          break;
        }
      }
    }

    if (matchingPackages.length > 0) {
      detected.push({
        name: techName,
        packages: matchingPackages,
        suggestedAdrTitle: config.suggestedAdrTitle,
      });
    }
  }

  return detected;
}

/**
 * Scan directory recursively for files
 */
async function scanDirectory(
  dirPath: string,
  includePatterns: RegExp[],
  excludePatterns: RegExp[],
  maxDepth: number = 5,
  currentDepth: number = 0
): Promise<string[]> {
  if (currentDepth >= maxDepth) return [];

  const files: string[] = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = fullPath;

      // Skip excluded patterns
      if (excludePatterns.some(pattern => pattern.test(relativePath))) {
        continue;
      }

      if (entry.isDirectory()) {
        // Skip common non-source directories
        if (['node_modules', '.git', 'dist', 'build', 'coverage', '.next'].includes(entry.name)) {
          continue;
        }
        const subFiles = await scanDirectory(
          fullPath,
          includePatterns,
          excludePatterns,
          maxDepth,
          currentDepth + 1
        );
        files.push(...subFiles);
      } else if (entry.isFile()) {
        if (
          includePatterns.length === 0 ||
          includePatterns.some(pattern => pattern.test(entry.name))
        ) {
          files.push(fullPath);
        }
      }
    }
  } catch {
    // Directory not accessible
  }

  return files;
}

/**
 * Check if ADR content mentions a technology
 */
function adrMentionsTechnology(adrContent: string, techName: string, keywords: string[]): boolean {
  const lowerContent = adrContent.toLowerCase();

  if (lowerContent.includes(techName.toLowerCase())) {
    return true;
  }

  for (const keyword of keywords) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Detect architectural patterns in the codebase
 */
async function detectArchitecturalPatterns(
  projectPath: string,
  scannedFiles: string[]
): Promise<Array<{ name: string; evidence: string[]; suggestedAdrTitle: string }>> {
  const detected: Array<{ name: string; evidence: string[]; suggestedAdrTitle: string }> = [];

  for (const [patternName, config] of Object.entries(ARCHITECTURAL_PATTERNS)) {
    const evidence: string[] = [];

    // Check file patterns
    for (const file of scannedFiles) {
      const relativePath = path.relative(projectPath, file);
      for (const pattern of config.filePatterns) {
        if (pattern.test(relativePath)) {
          evidence.push(`File: ${relativePath}`);
          break;
        }
      }
    }

    // For now, just use file-based detection
    // Code pattern detection could be added by reading file contents

    if (evidence.length > 0) {
      detected.push({
        name: patternName,
        evidence,
        suggestedAdrTitle: config.suggestedAdrTitle,
      });
    }
  }

  return detected;
}

/**
 * Ensure client is configured
 */
function ensureConfigured(client: AdrAggregatorClient): void {
  if (!client.isConfigured()) {
    throw new McpAdrError(
      'ADR Aggregator API key not configured. Set ADR_AGGREGATOR_API_KEY environment variable.',
      'NOT_CONFIGURED'
    );
  }
}

/**
 * Ensure git repository
 */
function ensureGitRepo(projectPath: string): void {
  if (!isGitRepository(projectPath)) {
    throw new McpAdrError(
      'Not a git repository. ADR Aggregator requires a git repository to auto-detect the repository name.',
      'NOT_GIT_REPO'
    );
  }
}

// ============================================================================
// Main Tool Implementation
// ============================================================================

/**
 * Analyze gaps between ADRs and codebase
 *
 * Detects:
 * 1. ADR-to-code gaps: File references in ADRs that don't exist
 * 2. Code-to-ADR gaps: Technologies/patterns in code without ADR coverage
 */
export async function analyzeGaps(
  args: AnalyzeGapsArgs,
  context?: ToolContext
): Promise<ToolResult> {
  const { reportToAggregator = true, scanDirectories, includePatterns, excludePatterns } = args;

  const config = loadConfig();
  const resolvedProjectPath = args.projectPath || config.projectPath;
  const client = getAdrAggregatorClient();

  // Validate git repository if reporting to aggregator
  if (reportToAggregator) {
    ensureConfigured(client);
    ensureGitRepo(resolvedProjectPath);
  }

  try {
    context?.info('Starting gap analysis...');
    context?.report_progress(5, 100);

    const gaps: CodeGap[] = [];
    let filesScanned = 0;
    const technologiesDetected: string[] = [];
    const patternsDetected: string[] = [];

    // Step 1: Discover and analyze local ADRs
    context?.info('Discovering ADRs...');
    context?.report_progress(10, 100);

    const adrFiles = await discoverLocalAdrs(resolvedProjectPath, config.adrDirectory);
    const adrContents: Array<{ path: string; content: string }> = [];

    for (const adrFile of adrFiles) {
      try {
        const content = await fs.readFile(adrFile, 'utf-8');
        adrContents.push({
          path: path.relative(resolvedProjectPath, adrFile),
          content,
        });
      } catch {
        // Skip unreadable files
      }
    }

    context?.info(`Found ${adrContents.length} ADRs`);
    context?.report_progress(20, 100);

    // Step 2: Check file references in ADRs (ADR-to-code gaps)
    context?.info('Checking file references in ADRs...');
    context?.report_progress(30, 100);

    for (const adr of adrContents) {
      const fileRefs = extractFileReferences(adr.content);

      for (const ref of fileRefs) {
        // Normalize path and verify if file exists
        const { exists, normalizedPath } = normalizeAndVerifyPath(ref, resolvedProjectPath);

        // Only report as a gap if file truly doesn't exist
        if (!exists) {
          gaps.push({
            gap_type: 'adr_to_code',
            severity: 'error',
            title: `Missing referenced file: ${normalizedPath}`,
            adr_path: adr.path,
            referenced_file: normalizedPath,
            description: `ADR references file "${normalizedPath}" which does not exist in the codebase`,
          });
        }
      }
    }

    context?.report_progress(40, 100);

    // Step 3: Scan codebase for technologies
    context?.info('Scanning package.json for technologies...');
    context?.report_progress(50, 100);

    const packageJson = await readPackageJson(resolvedProjectPath);

    if (packageJson) {
      const technologies = detectTechnologies(
        packageJson.dependencies,
        packageJson.devDependencies
      );

      for (const tech of technologies) {
        technologiesDetected.push(tech.name);

        // Check if any ADR mentions this technology
        const hasAdrCoverage = adrContents.some(adr =>
          adrMentionsTechnology(
            adr.content,
            tech.name,
            TECHNOLOGY_PATTERNS[tech.name]?.keywords || []
          )
        );

        if (!hasAdrCoverage) {
          // Determine severity based on technology importance
          let severity: GapSeverity = 'warning';
          if (['auth', 'postgresql', 'mongodb', 'aws', 'gcp', 'azure'].includes(tech.name)) {
            severity = 'error'; // Critical infrastructure decisions
          }

          gaps.push({
            gap_type: 'code_to_adr',
            severity,
            title: `Undocumented technology: ${tech.name}`,
            detected_pattern: `${tech.packages.join(', ')} usage`,
            code_files: ['package.json', ...tech.packages.map(p => `node_modules/${p}`)],
            suggested_adr_title: tech.suggestedAdrTitle,
            description: `Technology "${tech.name}" is used (packages: ${tech.packages.join(', ')}) but has no ADR documenting the decision`,
          });
        }
      }
    }

    context?.report_progress(60, 100);

    // Step 4: Scan for architectural patterns
    context?.info('Detecting architectural patterns...');
    context?.report_progress(70, 100);

    const dirsToScan = scanDirectories || ['src', 'lib', 'app', 'packages'];
    const includeRegex = includePatterns?.map(p => new RegExp(p)) || [];
    const excludeRegex = excludePatterns?.map(p => new RegExp(p)) || [/node_modules/, /\.git/];

    const scannedFiles: string[] = [];
    for (const dir of dirsToScan) {
      const dirPath = path.join(resolvedProjectPath, dir);
      try {
        await fs.access(dirPath);
        const files = await scanDirectory(dirPath, includeRegex, excludeRegex);
        scannedFiles.push(...files);
      } catch {
        // Directory doesn't exist
      }
    }

    filesScanned = scannedFiles.length;

    const architecturalPatterns = await detectArchitecturalPatterns(
      resolvedProjectPath,
      scannedFiles
    );

    for (const pattern of architecturalPatterns) {
      patternsDetected.push(pattern.name);

      // Check if any ADR mentions this pattern
      const hasAdrCoverage = adrContents.some(
        adr =>
          adr.content.toLowerCase().includes(pattern.name.toLowerCase()) ||
          adr.content.toLowerCase().includes(pattern.suggestedAdrTitle.toLowerCase())
      );

      if (!hasAdrCoverage) {
        gaps.push({
          gap_type: 'code_to_adr',
          severity: 'warning',
          title: `Undocumented pattern: ${pattern.name}`,
          detected_pattern: `${pattern.name} pattern detected`,
          code_files: pattern.evidence.map(e => e.replace('File: ', '')),
          suggested_adr_title: pattern.suggestedAdrTitle,
          description: `Architectural pattern "${pattern.name}" detected but has no ADR documenting the decision`,
        });
      }
    }

    context?.report_progress(80, 100);

    // Step 5: Report to ADR Aggregator if enabled
    let gapsInserted: number | undefined;
    let totalOpenGaps: number | undefined;
    let repositoryName: string | undefined;

    if (reportToAggregator && gaps.length > 0) {
      context?.info('Reporting gaps to ADR Aggregator...');
      context?.report_progress(90, 100);

      try {
        repositoryName = client.getRepositoryName(resolvedProjectPath);

        const request: ReportCodeGapsRequest = {
          repository_name: repositoryName,
          analyzed_at: new Date().toISOString(),
          gaps,
          analysis_summary: {
            files_scanned: filesScanned,
            adrs_checked: adrContents.length,
            technologies_detected: technologiesDetected,
            patterns_detected: patternsDetected,
          },
        };

        const response = await client.reportCodeGaps(request);
        gapsInserted = response.summary.gaps_inserted;
        totalOpenGaps = response.summary.total_open_gaps;
        context?.info(
          `Reported gaps: ${gapsInserted} new, ${response.summary.gaps_updated} updated, ${totalOpenGaps} total open`
        );
      } catch (error) {
        // Log but don't fail if aggregator reporting fails
        const errorMessage = error instanceof Error ? error.message : String(error);
        context?.info(`Warning: Failed to report to aggregator: ${errorMessage}`);
      }
    }

    context?.report_progress(100, 100);

    // Build analysis summary
    const summary: GapAnalysisSummary = {
      files_scanned: filesScanned,
      adrs_checked: adrContents.length,
      technologies_detected: technologiesDetected,
      patterns_detected: patternsDetected,
    };

    // Format response
    const adrToCodeGaps = gaps.filter(g => g.gap_type === 'adr_to_code');
    const codeToAdrGaps = gaps.filter(g => g.gap_type === 'code_to_adr');
    const errorGaps = gaps.filter(g => g.severity === 'error');
    const warningGaps = gaps.filter(g => g.severity === 'warning');

    return {
      content: [
        {
          type: 'text',
          text: `# Gap Analysis Report

## Summary
- **Files Scanned:** ${summary.files_scanned}
- **ADRs Checked:** ${summary.adrs_checked}
- **Total Gaps Found:** ${gaps.length}
  - Errors: ${errorGaps.length}
  - Warnings: ${warningGaps.length}
- **Technologies Detected:** ${summary.technologies_detected.join(', ') || 'None'}
- **Patterns Detected:** ${summary.patterns_detected?.join(', ') || 'None'}
${repositoryName ? `- **Repository:** ${repositoryName}` : ''}
${gapsInserted !== undefined ? `- **Gaps Reported:** ${gapsInserted} new, ${totalOpenGaps} total open` : ''}

---

## ADR-to-Code Gaps (${adrToCodeGaps.length})
${
  adrToCodeGaps.length > 0
    ? adrToCodeGaps
        .map(
          g => `
### ${g.severity === 'error' ? '❌' : '⚠️'} ${g.title}
- **ADR:** ${g.adr_path}
- **Referenced File:** ${g.referenced_file}
- **Description:** ${g.description}
`
        )
        .join('\n')
    : '*No ADR-to-code gaps found*'
}

---

## Code-to-ADR Gaps (${codeToAdrGaps.length})
${
  codeToAdrGaps.length > 0
    ? codeToAdrGaps
        .map(
          g => `
### ${g.severity === 'error' ? '❌' : '⚠️'} ${g.title}
- **Pattern Type:** ${g.detected_pattern}
- **Code Files:** ${g.code_files?.join(', ')}
- **Suggested ADR Title:** "${g.suggested_adr_title}"
- **Description:** ${g.description}
`
        )
        .join('\n')
    : '*No code-to-ADR gaps found*'
}

---

## Recommendations

${
  gaps.length === 0
    ? '✅ **Great job!** Your ADRs are well-aligned with your codebase.'
    : `
Based on the analysis, consider the following actions:

${errorGaps.length > 0 ? '### High Priority (Errors)\n' + errorGaps.map(g => `- ${g.gap_type === 'adr_to_code' ? `Fix or remove reference to \`${g.referenced_file}\` in ${g.adr_path}` : `Create ADR: "${g.suggested_adr_title}"`}`).join('\n') : ''}

${warningGaps.length > 0 ? '### Medium Priority (Warnings)\n' + warningGaps.map(g => `- ${g.gap_type === 'adr_to_code' ? `Fix or remove reference to \`${g.referenced_file}\` in ${g.adr_path}` : `Consider creating ADR: "${g.suggested_adr_title}"`}`).join('\n') : ''}
`
}

---

*Analysis performed at ${new Date().toISOString()}*
${reportToAggregator ? `\nView in dashboard: ${client.getBaseUrl()}/mcp-dashboard` : ''}
`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof McpAdrError ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `# Gap Analysis Failed

**Error:** ${errorMessage}

Please check:
1. PROJECT_PATH is set correctly
2. The project directory exists and is readable
3. ADR_AGGREGATOR_API_KEY is set if reporting to aggregator`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Get current gaps from ADR Aggregator
 */
export async function getGaps(
  args: { projectPath?: string; includeDismissed?: boolean; includeResolved?: boolean },
  context?: ToolContext
): Promise<ToolResult> {
  const client = getAdrAggregatorClient();
  ensureConfigured(client);

  const config = loadConfig();
  const resolvedProjectPath = args.projectPath || config.projectPath;

  ensureGitRepo(resolvedProjectPath);

  try {
    const repositoryName = client.getRepositoryName(resolvedProjectPath);

    context?.info(`Fetching gaps for ${repositoryName}...`);
    context?.report_progress(30, 100);

    const response = await client.getCodeGaps({
      repository_name: repositoryName,
      ...(args.includeDismissed !== undefined && { include_dismissed: args.includeDismissed }),
      ...(args.includeResolved !== undefined && { include_resolved: args.includeResolved }),
    });

    context?.report_progress(100, 100);

    return {
      content: [
        {
          type: 'text',
          text: `# Current Gaps for ${response.repository}

## Summary
- **Total Gaps:** ${response.summary.total}
- **By Type:** ADR→Code: ${response.summary.by_type.adr_to_code || 0}, Code→ADR: ${response.summary.by_type.code_to_adr || 0}
- **By Severity:** Errors: ${response.summary.by_severity.error || 0}, Warnings: ${response.summary.by_severity.warning || 0}, Info: ${response.summary.by_severity.info || 0}
- **By Status:** Open: ${response.summary.by_status['open'] || 0}, Dismissed: ${response.summary.by_status['dismissed'] || 0}, Resolved: ${response.summary.by_status['resolved'] || 0}

## Gaps
${
  response.gaps.length > 0
    ? response.gaps
        .map(
          g => `
### ${g.severity === 'error' ? '❌' : g.severity === 'warning' ? '⚠️' : 'ℹ️'} ${g.title}
- **ID:** ${g.id}
- **Type:** ${g.gap_type}
- **Status:** ${g.status}
- **First Detected:** ${g.first_detected}
- **Last Seen:** ${g.last_seen}
${g.adr_path ? `- **ADR:** ${g.adr_path}` : ''}
${g.referenced_file ? `- **Referenced File:** ${g.referenced_file}` : ''}
${g.code_files ? `- **Code Files:** ${g.code_files.join(', ')}` : ''}
${g.suggested_adr_title ? `- **Suggested ADR:** "${g.suggested_adr_title}"` : ''}
`
        )
        .join('\n')
    : '*No gaps found*'
}
`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof McpAdrError ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `# Failed to Get Gaps

**Error:** ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
