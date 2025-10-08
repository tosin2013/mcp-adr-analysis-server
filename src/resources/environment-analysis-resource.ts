/**
 * Environment Analysis Resource - System environment details
 * URI Pattern: adr://environment_analysis
 *
 * Enhanced with Bridge Pattern to leverage comprehensive environment-analysis-tool
 * Supports query parameters for analysis types and features
 */

import { URLSearchParams } from 'url';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { resourceCache, generateETag } from './resource-cache.js';
import { ResourceGenerationResult } from './index.js';

const execAsync = promisify(exec);

/**
 * Enhanced environment analysis interface with comprehensive capabilities
 */
export interface EnvironmentAnalysis {
  system: {
    platform: string;
    arch: string;
    release: string;
    nodeVersion: string;
    npmVersion: string;
    hostname: string;
    cpus: number;
    totalMemory: string;
    freeMemory: string;
  };
  project: {
    root: string;
    hasGit: boolean;
    hasTypeScript: boolean;
    hasTests: boolean;
    packageManager: 'npm' | 'yarn' | 'pnpm' | 'unknown';
    frameworks: string[];
  };
  dependencies: {
    runtime: Record<string, string>;
    development: Record<string, string>;
    peer: Record<string, string>;
  };
  environment: {
    variables: Record<string, string | undefined>;
    paths: {
      node: string;
      npm: string;
      projectRoot: string;
      adrDirectory: string;
    };
  };
  capabilities: {
    aiExecution: boolean;
    knowledgeGraph: boolean;
    caching: boolean;
    masking: boolean;
  };
  health: {
    diskSpace: {
      total: string;
      free: string;
      usagePercent: number;
    };
    performance: {
      uptime: number;
      loadAverage: number[];
    };
  };
  // Enhanced fields from tool integration
  infrastructure?: {
    components: Record<string, any>;
    services: string[];
    topology: string;
  };
  containerization?: {
    detected: boolean;
    technologies: string[];
    dockerfiles: number;
    composeFiles: number;
    kubernetes: boolean;
    security: {
      score: number;
      issues: string[];
    };
  };
  cloudServices?: {
    providers: string[];
    services: string[];
    deployment: string;
  };
  security?: {
    httpsEnabled: boolean;
    authenticationSetup: boolean;
    secretManagement: boolean;
    complianceFrameworks: string[];
    vulnerabilities: number;
  };
  deployment?: {
    cicdDetected: boolean;
    pipeline: string;
    automated: boolean;
    frequency: string;
  };
  monitoring?: {
    toolsDetected: string[];
    metricsEnabled: boolean;
    loggingEnabled: boolean;
    tracingEnabled: boolean;
  };
  adrIntegration?: {
    requirementsExtracted: boolean;
    totalRequirements: number;
    infrastructureRequirements: string[];
    securityRequirements: string[];
  };
  qualityAttributes?: {
    performance: string;
    scalability: string;
    reliability: string;
    maintainability: string;
    security: string;
  };
  riskAssessment?: {
    risks: string[];
    riskLevel: 'low' | 'medium' | 'high';
    mitigations: string[];
  };
  analysisMetadata?: {
    analysisType: string;
    timestamp: string;
    confidence: number;
    source: 'basic' | 'comprehensive-tool';
    memoryIntegration: boolean;
  };
}

/**
 * Get system information (fallback/basic implementation)
 */
function getSystemInfo(): {
  platform: string;
  arch: string;
  release: string;
  nodeVersion: string;
  hostname: string;
  cpus: number;
  totalMemory: string;
  freeMemory: string;
} {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  return {
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    nodeVersion: process.version,
    hostname: os.hostname(),
    cpus: os.cpus().length,
    totalMemory: `${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
    freeMemory: `${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
  };
}

/**
 * Get npm version (fallback/basic implementation)
 */
async function getNpmVersion(): Promise<string> {
  try {
    const result = await execAsync('npm --version');
    return result.stdout.trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Detect package manager (fallback/basic implementation)
 */
async function detectPackageManager(): Promise<'npm' | 'yarn' | 'pnpm' | 'unknown'> {
  const projectRoot = process.cwd();

  const checks = [
    { file: 'pnpm-lock.yaml', manager: 'pnpm' as const },
    { file: 'yarn.lock', manager: 'yarn' as const },
    { file: 'package-lock.json', manager: 'npm' as const },
  ];

  for (const check of checks) {
    try {
      await fs.access(path.join(projectRoot, check.file));
      return check.manager;
    } catch {
      continue;
    }
  }

  return 'unknown';
}

/**
 * Get project information (fallback/basic implementation)
 */
async function getProjectInfo(): Promise<{
  root: string;
  hasGit: boolean;
  hasTypeScript: boolean;
  hasTests: boolean;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'unknown';
  frameworks: string[];
}> {
  const projectRoot = process.cwd();
  const frameworks: string[] = [];

  let hasGit = false;
  try {
    await fs.access(path.join(projectRoot, '.git'));
    hasGit = true;
  } catch {
    hasGit = false;
  }

  let hasTypeScript = false;
  try {
    await fs.access(path.join(projectRoot, 'tsconfig.json'));
    hasTypeScript = true;
    frameworks.push('TypeScript');
  } catch {
    hasTypeScript = false;
  }

  let hasTests = false;
  try {
    const packagePath = path.join(projectRoot, 'package.json');
    const packageContent = await fs.readFile(packagePath, 'utf-8');
    const packageJson = JSON.parse(packageContent);
    hasTests = !!packageJson.scripts?.test;

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    if (allDeps['@modelcontextprotocol/sdk']) frameworks.push('MCP');
    if (allDeps['jest']) frameworks.push('Jest');
    if (allDeps['react']) frameworks.push('React');
    if (allDeps['vue']) frameworks.push('Vue');
    if (allDeps['angular']) frameworks.push('Angular');
    if (allDeps['express']) frameworks.push('Express');
    if (allDeps['fastify']) frameworks.push('Fastify');
  } catch {
    hasTests = false;
  }

  const packageManager = await detectPackageManager();

  return {
    root: projectRoot,
    hasGit,
    hasTypeScript,
    hasTests,
    packageManager,
    frameworks,
  };
}

/**
 * Get dependencies from package.json (fallback/basic implementation)
 */
async function getDependencies(): Promise<{
  runtime: Record<string, string>;
  development: Record<string, string>;
  peer: Record<string, string>;
}> {
  try {
    const packagePath = path.resolve(process.cwd(), 'package.json');
    const packageContent = await fs.readFile(packagePath, 'utf-8');
    const packageJson = JSON.parse(packageContent);

    return {
      runtime: packageJson.dependencies || {},
      development: packageJson.devDependencies || {},
      peer: packageJson.peerDependencies || {},
    };
  } catch {
    return {
      runtime: {},
      development: {},
      peer: {},
    };
  }
}

/**
 * Get environment variables (masked sensitive ones)
 */
function getEnvironmentVariables(): Record<string, string | undefined> {
  const sensitiveKeys = ['API_KEY', 'SECRET', 'PASSWORD', 'TOKEN', 'PRIVATE'];
  const env: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(process.env)) {
    const isSensitive = sensitiveKeys.some(sensitive =>
      key.toUpperCase().includes(sensitive)
    );

    if (isSensitive && value) {
      env[key] = '***masked***';
    } else {
      env[key] = value;
    }
  }

  return env;
}

/**
 * Get environment paths
 */
async function getEnvironmentPaths(): Promise<{
  node: string;
  npm: string;
  projectRoot: string;
  adrDirectory: string;
}> {
  let nodePath = 'unknown';
  let npmPath = 'unknown';

  try {
    const nodeResult = await execAsync('which node');
    nodePath = nodeResult.stdout.trim();
  } catch {
    nodePath = process.execPath;
  }

  try {
    const npmResult = await execAsync('which npm');
    npmPath = npmResult.stdout.trim();
  } catch {
    npmPath = 'unknown';
  }

  return {
    node: nodePath,
    npm: npmPath,
    projectRoot: process.cwd(),
    adrDirectory: process.env['ADR_DIRECTORY'] || 'docs/adrs',
  };
}

/**
 * Get system capabilities
 */
function getCapabilities(): {
  aiExecution: boolean;
  knowledgeGraph: boolean;
  caching: boolean;
  masking: boolean;
} {
  return {
    aiExecution: !!process.env['OPENROUTER_API_KEY'],
    knowledgeGraph: true,
    caching: true,
    masking: true,
  };
}

/**
 * Get disk space information
 */
async function getDiskSpace(): Promise<{
  total: string;
  free: string;
  usagePercent: number;
}> {
  try {
    if (os.platform() === 'darwin' || os.platform() === 'linux') {
      const result = await execAsync('df -h . | tail -1');
      const parts = result.stdout.trim().split(/\s+/);

      if (parts.length >= 5) {
        return {
          total: parts[1] || 'unknown',
          free: parts[3] || 'unknown',
          usagePercent: parseInt(parts[4]?.replace('%', '') || '0', 10),
        };
      }
    }
  } catch {
    // Fall through to default
  }

  return {
    total: 'unknown',
    free: 'unknown',
    usagePercent: 0,
  };
}

/**
 * Get health metrics
 */
async function getHealthMetrics(): Promise<{
  diskSpace: {
    total: string;
    free: string;
    usagePercent: number;
  };
  performance: {
    uptime: number;
    loadAverage: number[];
  };
}> {
  const diskSpace = await getDiskSpace();

  return {
    diskSpace,
    performance: {
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
    },
  };
}

/**
 * Extract structured data from tool's text output
 */
function extractStructuredDataFromToolOutput(toolOutput: string): Partial<EnvironmentAnalysis> {
  const extracted: Partial<EnvironmentAnalysis> = {};

  // Extract infrastructure information
  if (toolOutput.includes('Infrastructure') || toolOutput.includes('infrastructure')) {
    const components: string[] = [];
    const infraMatch = toolOutput.match(/infrastructure[:\s]+([^\n]+)/i);
    if (infraMatch && infraMatch[1]) {
      components.push(infraMatch[1].trim());
    }

    extracted.infrastructure = {
      components: {},
      services: components,
      topology: toolOutput.includes('distributed') ? 'distributed' : 'monolithic',
    };
  }

  // Extract containerization information
  const dockerDetected = toolOutput.toLowerCase().includes('docker');
  const kubernetesDetected = toolOutput.toLowerCase().includes('kubernetes') || toolOutput.toLowerCase().includes('k8s');

  if (dockerDetected || kubernetesDetected) {
    const technologies = [];
    if (dockerDetected) technologies.push('Docker');
    if (kubernetesDetected) technologies.push('Kubernetes');
    if (toolOutput.toLowerCase().includes('podman')) technologies.push('Podman');
    if (toolOutput.toLowerCase().includes('containerd')) technologies.push('containerd');

    extracted.containerization = {
      detected: true,
      technologies,
      dockerfiles: (toolOutput.match(/dockerfile/gi) || []).length,
      composeFiles: (toolOutput.match(/docker-compose/gi) || []).length,
      kubernetes: kubernetesDetected,
      security: {
        score: toolOutput.toLowerCase().includes('security') ? 75 : 50,
        issues: extractListItems(toolOutput, ['vulnerability', 'insecure', 'risk']),
      },
    };
  }

  // Extract cloud services
  const cloudProviders = extractTechnologies(toolOutput, ['aws', 'azure', 'gcp', 'google cloud', 'heroku', 'vercel', 'netlify']);
  if (cloudProviders.length > 0) {
    extracted.cloudServices = {
      providers: cloudProviders,
      services: extractListItems(toolOutput, ['lambda', 'ec2', 's3', 'rds', 'functions', 'storage']),
      deployment: toolOutput.toLowerCase().includes('serverless') ? 'serverless' : 'traditional',
    };
  }

  // Extract security information
  const httpsEnabled = toolOutput.toLowerCase().includes('https') || toolOutput.toLowerCase().includes('ssl');
  const authSetup = toolOutput.toLowerCase().includes('auth') || toolOutput.toLowerCase().includes('authentication');

  extracted.security = {
    httpsEnabled,
    authenticationSetup: authSetup,
    secretManagement: toolOutput.toLowerCase().includes('secret') && toolOutput.toLowerCase().includes('management'),
    complianceFrameworks: extractTechnologies(toolOutput, ['gdpr', 'soc2', 'iso27001', 'hipaa', 'pci']),
    vulnerabilities: (toolOutput.match(/vulnerability|vulnerable/gi) || []).length,
  };

  // Extract deployment information
  const cicdDetected = toolOutput.toLowerCase().includes('ci/cd') || toolOutput.toLowerCase().includes('pipeline');

  extracted.deployment = {
    cicdDetected,
    pipeline: extractTechnologies(toolOutput, ['github actions', 'gitlab ci', 'jenkins', 'circleci', 'travis'])[0] || 'unknown',
    automated: cicdDetected,
    frequency: toolOutput.toLowerCase().includes('continuous') ? 'continuous' : 'manual',
  };

  // Extract monitoring information
  const monitoringTools = extractTechnologies(toolOutput, ['prometheus', 'grafana', 'datadog', 'new relic', 'cloudwatch', 'stackdriver']);

  extracted.monitoring = {
    toolsDetected: monitoringTools,
    metricsEnabled: toolOutput.toLowerCase().includes('metrics'),
    loggingEnabled: toolOutput.toLowerCase().includes('logging') || toolOutput.toLowerCase().includes('logs'),
    tracingEnabled: toolOutput.toLowerCase().includes('tracing') || toolOutput.toLowerCase().includes('jaeger'),
  };

  // Extract ADR integration
  const adrMentioned = toolOutput.toLowerCase().includes('adr') || toolOutput.toLowerCase().includes('architecture decision');

  if (adrMentioned) {
    extracted.adrIntegration = {
      requirementsExtracted: true,
      totalRequirements: (toolOutput.match(/requirement/gi) || []).length,
      infrastructureRequirements: extractListItems(toolOutput, ['infrastructure requirement']),
      securityRequirements: extractListItems(toolOutput, ['security requirement']),
    };
  }

  // Extract quality attributes
  extracted.qualityAttributes = {
    performance: toolOutput.toLowerCase().includes('performance') ? 'mentioned' : 'not mentioned',
    scalability: toolOutput.toLowerCase().includes('scalability') || toolOutput.toLowerCase().includes('scalable') ? 'mentioned' : 'not mentioned',
    reliability: toolOutput.toLowerCase().includes('reliability') || toolOutput.toLowerCase().includes('reliable') ? 'mentioned' : 'not mentioned',
    maintainability: toolOutput.toLowerCase().includes('maintainability') || toolOutput.toLowerCase().includes('maintainable') ? 'mentioned' : 'not mentioned',
    security: toolOutput.toLowerCase().includes('security') ? 'mentioned' : 'not mentioned',
  };

  // Extract risk assessment
  const risks = extractListItems(toolOutput, ['risk', 'vulnerability', 'issue', 'concern']);

  extracted.riskAssessment = {
    risks,
    riskLevel: risks.length > 5 ? 'high' : risks.length > 2 ? 'medium' : 'low',
    mitigations: extractListItems(toolOutput, ['mitigation', 'recommendation', 'solution']),
  };

  return extracted;
}

/**
 * Helper: Extract technologies from text
 */
function extractTechnologies(content: string, technologies: string[]): string[] {
  const found = [];
  const lowerContent = content.toLowerCase();

  for (const tech of technologies) {
    if (lowerContent.includes(tech.toLowerCase())) {
      found.push(tech);
    }
  }

  return found;
}

/**
 * Helper: Extract list items containing keywords
 */
function extractListItems(content: string, keywords: string[]): string[] {
  const items: string[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const itemText = trimmed.substring(2).trim();
      for (const keyword of keywords) {
        if (itemText.toLowerCase().includes(keyword.toLowerCase())) {
          items.push(itemText);
          break;
        }
      }
    }
  }

  return items;
}

/**
 * Generate basic environment analysis (fallback when tool is unavailable)
 */
async function generateBasicAnalysis(): Promise<EnvironmentAnalysis> {
  const systemInfo = getSystemInfo();
  const npmVersion = await getNpmVersion();
  const projectInfo = await getProjectInfo();
  const dependencies = await getDependencies();
  const environmentVariables = getEnvironmentVariables();
  const paths = await getEnvironmentPaths();
  const capabilities = getCapabilities();
  const health = await getHealthMetrics();

  return {
    system: {
      ...systemInfo,
      npmVersion,
    },
    project: projectInfo,
    dependencies,
    environment: {
      variables: environmentVariables,
      paths,
    },
    capabilities,
    health,
    analysisMetadata: {
      analysisType: 'basic',
      timestamp: new Date().toISOString(),
      confidence: 0.6,
      source: 'basic',
      memoryIntegration: false,
    },
  };
}

/**
 * Generate comprehensive environment analysis using the tool
 */
async function generateComprehensiveAnalysis(
  analysisType: string,
  enableMemory: boolean
): Promise<EnvironmentAnalysis> {
  try {
    // Import the comprehensive tool
    const { analyzeEnvironment } = await import('../tools/environment-analysis-tool.js');

    // Call the tool with appropriate parameters
    const toolResult = await analyzeEnvironment({
      projectPath: process.cwd(),
      adrDirectory: process.env['ADR_DIRECTORY'] || 'docs/adrs',
      analysisType: analysisType as any,
      knowledgeEnhancement: true,
      enhancedMode: true,
      enableMemoryIntegration: enableMemory,
      environmentType: process.env['NODE_ENV'] || 'development',
    });

    // Extract text content from tool result
    let toolOutputText = '';
    if (toolResult.content && Array.isArray(toolResult.content)) {
      for (const item of toolResult.content) {
        if (item.type === 'text' && item.text) {
          toolOutputText += item.text + '\n';
        }
      }
    }

    // Get basic data
    const basicAnalysis = await generateBasicAnalysis();

    // Extract enhanced data from tool output
    const enhancedData = extractStructuredDataFromToolOutput(toolOutputText);

    // Merge basic and enhanced data
    const comprehensiveAnalysis: EnvironmentAnalysis = {
      ...basicAnalysis,
      ...enhancedData,
      analysisMetadata: {
        analysisType,
        timestamp: new Date().toISOString(),
        confidence: 0.9,
        source: 'comprehensive-tool',
        memoryIntegration: enableMemory,
      },
    };

    return comprehensiveAnalysis;
  } catch (error) {
    console.error('[environment-analysis-resource] Tool execution failed, falling back to basic analysis:', error);
    return generateBasicAnalysis();
  }
}

/**
 * Generate environment analysis resource
 * Enhanced with bridge pattern to leverage comprehensive tool
 */
export async function generateEnvironmentAnalysisResource(
  _params?: Record<string, string>,
  searchParams?: URLSearchParams
): Promise<ResourceGenerationResult> {
  // Extract query parameters
  const analysisType = searchParams?.get('type') || 'specs';
  const enableMemory = searchParams?.get('memory') !== 'false';
  const useComprehensive = searchParams?.get('comprehensive') !== 'false';

  const cacheKey = `environment-analysis:${analysisType}:${enableMemory}:${useComprehensive}`;

  // Check cache
  const cached = await resourceCache.get<ResourceGenerationResult>(cacheKey);
  if (cached) {
    return cached;
  }

  // Generate analysis (comprehensive or basic)
  let environmentAnalysis: EnvironmentAnalysis;

  if (useComprehensive) {
    environmentAnalysis = await generateComprehensiveAnalysis(analysisType, enableMemory);
  } else {
    environmentAnalysis = await generateBasicAnalysis();
  }

  const result: ResourceGenerationResult = {
    data: environmentAnalysis,
    contentType: 'application/json',
    lastModified: new Date().toISOString(),
    cacheKey,
    ttl: 300, // 5 minutes cache
    etag: generateETag(environmentAnalysis),
  };

  // Cache result
  resourceCache.set(cacheKey, result, result.ttl);

  return result;
}
