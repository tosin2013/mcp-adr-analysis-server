import { promises as fs } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { EnhancedLogger } from './enhanced-logging.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Authoritative source definition
 */
export interface AuthoritativeSource {
  type: 'documentation' | 'repository' | 'specification' | 'examples' | 'community';
  url: string;
  purpose: string;
  priority: number;
  requiredForDeployment: boolean;
  queryInstructions: string;
}

/**
 * Deployment phase definition
 */
export interface DeploymentPhase {
  order: number;
  name: string;
  description: string;
  estimatedDuration: string;
  canParallelize: boolean;
  prerequisites: string[];
  commands: Array<{
    description: string;
    command: string;
    expectedExitCode?: number;
  }>;
}

/**
 * Validation check definition
 */
export interface ValidationCheck {
  id: string;
  name: string;
  description: string;
  command: string;
  expectedExitCode?: number;
  severity: 'critical' | 'error' | 'warning' | 'info';
  failureMessage: string;
  remediationSteps: string[];
}

/**
 * Dynamic pattern loaded from YAML
 */
export interface DynamicPattern {
  version: string;
  id: string;
  name: string;
  description: string;
  composition?: {
    infrastructure?: string;
    runtime?: string;
    protocol?: string;
    strategy?: string;
  };
  authoritativeSources: AuthoritativeSource[];
  baseCodeRepository?: {
    url: string;
    purpose: string;
    integrationInstructions: string;
    requiredFiles?: string[];
    scriptEntrypoint?: string;
  };
  dependencies?: Array<{
    name: string;
    type: 'buildtime' | 'runtime';
    required: boolean;
    installCommand?: string;
    verificationCommand?: string;
  }>;
  configurations?: Array<{
    path: string;
    purpose: string;
    required: boolean;
    canAutoGenerate?: boolean;
    template?: string;
  }>;
  secrets?: Array<{
    name: string;
    purpose: string;
    environmentVariable?: string;
    required: boolean;
  }>;
  infrastructure?: Array<{
    component: string;
    purpose: string;
    required: boolean;
    minimumVersion?: string;
    setupCommands?: string[];
    healthCheckCommand?: string;
    alternatives?: string[];
  }>;
  deploymentPhases: DeploymentPhase[];
  validationChecks?: ValidationCheck[];
  healthChecks?: Array<{
    name: string;
    endpoint: string;
    interval?: number;
    timeout?: number;
    healthyThreshold?: number;
    unhealthyThreshold?: number;
  }>;
  environmentOverrides?: Array<{
    environment: 'development' | 'staging' | 'production';
    overrides: Record<string, any>;
  }>;
  metadata: {
    source: string;
    lastUpdated: string;
    maintainer?: string;
    tags: string[];
    contributors?: Array<{
      name: string;
      github?: string;
    }>;
    changeLog?: Array<{
      version: string;
      date: string;
      changes: string[];
    }>;
  };
  detectionHints?: {
    requiredFiles?: string[];
    optionalFiles?: string[];
    confidence?: Record<string, number>;
  };
}

/**
 * Loads and manages dynamic patterns from YAML files
 */
export class PatternLoader {
  private logger: EnhancedLogger;
  private patternsDir: string;
  private cache: Map<string, DynamicPattern> = new Map();

  constructor(patternsDir?: string) {
    this.logger = new EnhancedLogger();
    // Default to patterns/ directory at project root
    this.patternsDir = patternsDir || path.join(__dirname, '../../patterns');
  }

  /**
   * Load a pattern from YAML file by ID
   * @param patternId - Pattern identifier (filename without .yaml)
   * @returns Loaded pattern or null if not found
   */
  async loadPattern(patternId: string): Promise<DynamicPattern | null> {
    // Check cache first
    if (this.cache.has(patternId)) {
      this.logger.info(`Loading pattern from cache: ${patternId}`, 'PatternLoader');
      return this.cache.get(patternId)!;
    }

    try {
      // Search in different directories
      const directories = ['composite', 'infrastructure', 'runtime', 'protocol'];

      for (const dir of directories) {
        const filePath = path.join(this.patternsDir, dir, `${patternId}.yaml`);

        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const pattern = yaml.load(content) as DynamicPattern;

          // Validate pattern
          this.validatePattern(pattern);

          // Cache it
          this.cache.set(patternId, pattern);

          this.logger.info(`Loaded pattern: ${patternId} (${pattern.name})`, 'PatternLoader');
          return pattern;
        } catch (error: any) {
          if (error.code === 'ENOENT') {
            // File not found in this directory, continue to next
            continue;
          }
          // Other error, re-throw
          throw error;
        }
      }

      this.logger.warn(`Pattern not found: ${patternId}`, 'PatternLoader');
      return null;
    } catch (error) {
      this.logger.error(`Failed to load pattern: ${patternId}`, 'PatternLoader', error as Error);
      return null;
    }
  }

  /**
   * Load pattern by composition (infrastructure + runtime)
   * @param infrastructure - Infrastructure platform
   * @param runtime - Runtime environment (optional)
   * @returns Loaded pattern or null if not found
   */
  async loadPatternByComposition(
    infrastructure: string,
    runtime?: string
  ): Promise<DynamicPattern | null> {
    // Try composite pattern first (infrastructure-runtime)
    if (runtime) {
      const compositeId = `${infrastructure}-${runtime}`;
      const pattern = await this.loadPattern(compositeId);
      if (pattern) {
        return pattern;
      }
    }

    // Fallback to infrastructure-only pattern
    const infrastructurePattern = await this.loadPattern(infrastructure);
    if (infrastructurePattern) {
      return infrastructurePattern;
    }

    return null;
  }

  /**
   * List all available patterns
   * @returns Array of pattern IDs
   */
  async listPatterns(): Promise<string[]> {
    const patterns: string[] = [];
    const directories = ['composite', 'infrastructure', 'runtime', 'protocol'];

    for (const dir of directories) {
      const dirPath = path.join(this.patternsDir, dir);

      try {
        const files = await fs.readdir(dirPath);
        const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

        for (const file of yamlFiles) {
          const patternId = file.replace(/\.(yaml|yml)$/, '');
          patterns.push(patternId);
        }
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          // Directory doesn't exist, skip
          continue;
        }
        throw error;
      }
    }

    return patterns;
  }

  /**
   * List patterns by category
   * @param category - Pattern category (composite, infrastructure, runtime, protocol)
   * @returns Array of pattern IDs in that category
   */
  async listPatternsByCategory(
    category: 'composite' | 'infrastructure' | 'runtime' | 'protocol'
  ): Promise<string[]> {
    const dirPath = path.join(this.patternsDir, category);
    const patterns: string[] = [];

    try {
      const files = await fs.readdir(dirPath);
      const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

      for (const file of yamlFiles) {
        const patternId = file.replace(/\.(yaml|yml)$/, '');
        patterns.push(patternId);
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }

    return patterns;
  }

  /**
   * Validate pattern structure
   * @param pattern - Pattern to validate
   * @throws Error if validation fails
   */
  private validatePattern(pattern: DynamicPattern): void {
    // Check required fields
    if (!pattern.id || !pattern.name || !pattern.version) {
      throw new Error('Pattern missing required fields: id, name, version');
    }

    // Check authoritative sources
    if (!pattern.authoritativeSources || pattern.authoritativeSources.length === 0) {
      throw new Error(`Pattern ${pattern.id} must have at least one authoritative source`);
    }

    // Check deployment phases
    if (!pattern.deploymentPhases || pattern.deploymentPhases.length === 0) {
      throw new Error(`Pattern ${pattern.id} must have at least one deployment phase`);
    }

    // Validate URLs in authoritative sources
    for (const source of pattern.authoritativeSources) {
      try {
        new globalThis.URL(source.url);
      } catch {
        throw new Error(`Invalid URL in pattern ${pattern.id}: ${source.url}`);
      }
    }

    // Validate base repository URL if present
    if (pattern.baseCodeRepository?.url) {
      try {
        new globalThis.URL(pattern.baseCodeRepository.url);
      } catch {
        throw new Error(
          `Invalid base repository URL in pattern ${pattern.id}: ${pattern.baseCodeRepository.url}`
        );
      }
    }

    this.logger.info(`Pattern validation passed: ${pattern.id}`, 'PatternLoader');
  }

  /**
   * Clear pattern cache
   * Useful for testing or reloading patterns
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('Pattern cache cleared', 'PatternLoader');
  }

  /**
   * Get pattern from cache
   * @param patternId - Pattern identifier
   * @returns Cached pattern or null
   */
  getCachedPattern(patternId: string): DynamicPattern | null {
    return this.cache.get(patternId) || null;
  }

  /**
   * Check if a pattern is cached
   * @param patternId - Pattern identifier
   * @returns True if cached
   */
  isCached(patternId: string): boolean {
    return this.cache.has(patternId);
  }
}
