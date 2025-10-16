/**
 * Platform Detector
 *
 * Automatically detects which platforms and technologies a project uses
 * by analyzing project files, dependencies, and configurations.
 *
 * This enables automatic selection of appropriate validated patterns.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { PlatformType } from './validated-pattern-definitions.js';

/**
 * Platform detection result with confidence scores
 */
export interface PlatformDetectionResult {
  detectedPlatforms: DetectedPlatform[];
  primaryPlatform: PlatformType | null;
  confidence: number; // 0-1 overall confidence
  evidence: Evidence[];
  recommendations: string[];
}

/**
 * Individual detected platform with metadata
 */
export interface DetectedPlatform {
  type: PlatformType;
  confidence: number; // 0-1 confidence for this specific platform
  indicators: string[]; // What files/patterns indicated this platform
  version?: string; // Detected version if available
}

/**
 * Evidence for platform detection
 */
export interface Evidence {
  file: string;
  indicator: string;
  platforms: PlatformType[];
  weight: number; // How strong this evidence is (0-1)
}

/**
 * Platform detection indicators
 * Each indicator maps file patterns or content to platform types
 */
interface PlatformIndicator {
  pattern: string | RegExp; // File name or content pattern
  platformTypes: PlatformType[];
  weight: number; // Confidence weight (0-1)
  check: 'file_exists' | 'file_content' | 'dependency' | 'command';
  description: string;
}

/**
 * Comprehensive platform indicators based on research
 */
const PLATFORM_INDICATORS: PlatformIndicator[] = [
  // OpenShift indicators
  {
    pattern: 'openshift-gitops-operator',
    platformTypes: ['openshift'],
    weight: 0.9,
    check: 'file_content',
    description: 'OpenShift GitOps operator configuration',
  },
  {
    pattern: '.openshift',
    platformTypes: ['openshift'],
    weight: 0.8,
    check: 'file_exists',
    description: 'OpenShift configuration directory',
  },
  {
    pattern: /oc\s+(apply|create|get)/,
    platformTypes: ['openshift'],
    weight: 0.7,
    check: 'file_content',
    description: 'OpenShift CLI commands in scripts',
  },

  // Kubernetes indicators
  {
    pattern: 'k8s',
    platformTypes: ['kubernetes'],
    weight: 0.8,
    check: 'file_exists',
    description: 'Kubernetes manifests directory',
  },
  {
    pattern: 'kustomization.yaml',
    platformTypes: ['kubernetes'],
    weight: 0.8,
    check: 'file_exists',
    description: 'Kustomize configuration',
  },
  {
    pattern: /kubectl\s+(apply|create|get)/,
    platformTypes: ['kubernetes'],
    weight: 0.7,
    check: 'file_content',
    description: 'kubectl commands in scripts',
  },
  {
    pattern: /kind:\s+(Deployment|Service|Pod|Ingress)/,
    platformTypes: ['kubernetes'],
    weight: 0.9,
    check: 'file_content',
    description: 'Kubernetes resource definitions',
  },

  // Docker indicators
  {
    pattern: 'Dockerfile',
    platformTypes: ['docker'],
    weight: 0.9,
    check: 'file_exists',
    description: 'Docker image definition',
  },
  {
    pattern: 'docker-compose.yml',
    platformTypes: ['docker'],
    weight: 0.9,
    check: 'file_exists',
    description: 'Docker Compose orchestration',
  },
  {
    pattern: '.dockerignore',
    platformTypes: ['docker'],
    weight: 0.6,
    check: 'file_exists',
    description: 'Docker build exclusions',
  },

  // Node.js indicators
  {
    pattern: 'package.json',
    platformTypes: ['nodejs'],
    weight: 0.9,
    check: 'file_exists',
    description: 'Node.js package definition',
  },
  {
    pattern: 'node_modules',
    platformTypes: ['nodejs'],
    weight: 0.7,
    check: 'file_exists',
    description: 'Node.js dependencies directory',
  },
  {
    pattern: /"type":\s*"module"/,
    platformTypes: ['nodejs'],
    weight: 0.6,
    check: 'file_content',
    description: 'ES modules in package.json',
  },
  {
    pattern: 'ecosystem.config.js',
    platformTypes: ['nodejs'],
    weight: 0.7,
    check: 'file_exists',
    description: 'PM2 process management',
  },

  // Python indicators
  {
    pattern: 'requirements.txt',
    platformTypes: ['python'],
    weight: 0.9,
    check: 'file_exists',
    description: 'Python dependencies',
  },
  {
    pattern: 'setup.py',
    platformTypes: ['python'],
    weight: 0.8,
    check: 'file_exists',
    description: 'Python package setup',
  },
  {
    pattern: 'pyproject.toml',
    platformTypes: ['python'],
    weight: 0.8,
    check: 'file_exists',
    description: 'Python project configuration',
  },
  {
    pattern: 'Pipfile',
    platformTypes: ['python'],
    weight: 0.7,
    check: 'file_exists',
    description: 'Pipenv dependency management',
  },
  {
    pattern: /from\s+flask\s+import|from\s+django|from\s+fastapi/,
    platformTypes: ['python'],
    weight: 0.8,
    check: 'file_content',
    description: 'Python web frameworks',
  },

  // MCP indicators
  {
    pattern: '@modelcontextprotocol/sdk',
    platformTypes: ['mcp'],
    weight: 0.9,
    check: 'dependency',
    description: 'MCP SDK dependency',
  },
  {
    pattern: /class\s+\w+\s+implements\s+Server/,
    platformTypes: ['mcp'],
    weight: 0.7,
    check: 'file_content',
    description: 'MCP server implementation',
  },
  {
    pattern: /\.addTool\(|\.addResource\(|\.addPrompt\(/,
    platformTypes: ['mcp'],
    weight: 0.8,
    check: 'file_content',
    description: 'MCP tool/resource/prompt registration',
  },

  // A2A indicators
  {
    pattern: '@a2aproject/sdk',
    platformTypes: ['a2a'],
    weight: 0.9,
    check: 'dependency',
    description: 'A2A SDK dependency',
  },
  {
    pattern: 'agent-card.json',
    platformTypes: ['a2a'],
    weight: 0.9,
    check: 'file_exists',
    description: 'A2A agent capability card',
  },
  {
    pattern: /Agent2Agent|A2A Protocol/i,
    platformTypes: ['a2a'],
    weight: 0.7,
    check: 'file_content',
    description: 'A2A protocol references',
  },
];

/**
 * Platform Detector class
 */
export class PlatformDetector {
  private projectPath: string;
  private evidence: Evidence[] = [];

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Detect all platforms used by the project
   */
  async detectPlatforms(): Promise<PlatformDetectionResult> {
    this.evidence = [];

    // Collect evidence for each indicator
    for (const indicator of PLATFORM_INDICATORS) {
      await this.checkIndicator(indicator);
    }

    // Calculate confidence scores for each platform
    const platformScores = this.calculatePlatformScores();

    // Build detection result
    const detectedPlatforms: DetectedPlatform[] = platformScores
      .filter(p => p.confidence > 0.3) // Only include platforms with >30% confidence
      .sort((a, b) => b.confidence - a.confidence);

    const primaryPlatform = detectedPlatforms.length > 0 ? detectedPlatforms[0]!.type : null;
    const overallConfidence = detectedPlatforms.length > 0 ? detectedPlatforms[0]!.confidence : 0;

    const recommendations = this.generateRecommendations(detectedPlatforms);

    return {
      detectedPlatforms,
      primaryPlatform,
      confidence: overallConfidence,
      evidence: this.evidence,
      recommendations,
    };
  }

  /**
   * Check a specific platform indicator
   */
  private async checkIndicator(indicator: PlatformIndicator): Promise<void> {
    try {
      switch (indicator.check) {
        case 'file_exists':
          await this.checkFileExists(indicator);
          break;
        case 'file_content':
          await this.checkFileContent(indicator);
          break;
        case 'dependency':
          await this.checkDependency(indicator);
          break;
        case 'command':
          // Command checks could be added in the future
          break;
      }
    } catch {
      // Silently fail - missing files are expected
    }
  }

  /**
   * Check if file exists
   */
  private async checkFileExists(indicator: PlatformIndicator): Promise<void> {
    const pattern = indicator.pattern as string;
    const filePath = path.join(this.projectPath, pattern);

    try {
      await fs.access(filePath);

      // File exists - add evidence
      this.evidence.push({
        file: pattern,
        indicator: indicator.description,
        platforms: indicator.platformTypes,
        weight: indicator.weight,
      });
    } catch {
      // File doesn't exist - no evidence
    }
  }

  /**
   * Check file content for pattern
   */
  private async checkFileContent(indicator: PlatformIndicator): Promise<void> {
    const pattern = indicator.pattern as RegExp;

    // Search in common file locations
    const searchPaths = [
      '*.sh',
      '*.yaml',
      '*.yml',
      '*.json',
      '*.ts',
      '*.js',
      '*.py',
      'package.json',
      'README.md',
      'Dockerfile',
    ];

    for (const searchPattern of searchPaths) {
      try {
        const files = await this.findFiles(searchPattern);

        for (const file of files) {
          try {
            const content = await fs.readFile(file, 'utf-8');

            if (pattern.test(content)) {
              this.evidence.push({
                file: path.relative(this.projectPath, file),
                indicator: indicator.description,
                platforms: indicator.platformTypes,
                weight: indicator.weight,
              });
              return; // Stop after first match
            }
          } catch {
            // Skip files that can't be read
          }
        }
      } catch {
        // Skip if glob fails
      }
    }
  }

  /**
   * Check if dependency exists in package.json or requirements.txt
   */
  private async checkDependency(indicator: PlatformIndicator): Promise<void> {
    const dependencyName = indicator.pattern as string;

    // Check Node.js dependencies
    try {
      const packageJsonPath = path.join(this.projectPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies,
      };

      if (dependencyName in allDeps) {
        this.evidence.push({
          file: 'package.json',
          indicator: indicator.description,
          platforms: indicator.platformTypes,
          weight: indicator.weight,
        });
        return;
      }
    } catch {
      // package.json doesn't exist or can't be read
    }

    // Check Python dependencies
    try {
      const requirementsPath = path.join(this.projectPath, 'requirements.txt');
      const requirements = await fs.readFile(requirementsPath, 'utf-8');

      if (requirements.includes(dependencyName)) {
        this.evidence.push({
          file: 'requirements.txt',
          indicator: indicator.description,
          platforms: indicator.platformTypes,
          weight: indicator.weight,
        });
      }
    } catch {
      // requirements.txt doesn't exist
    }
  }

  /**
   * Find files matching pattern
   */
  private async findFiles(pattern: string): Promise<string[]> {
    const files: string[] = [];

    async function walk(dir: string): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          // Skip node_modules, .git, dist, build
          if (
            ['node_modules', '.git', 'dist', 'build', 'venv', '__pycache__'].includes(entry.name)
          ) {
            continue;
          }

          if (entry.isDirectory()) {
            await walk(fullPath);
          } else if (entry.isFile()) {
            // Simple pattern matching
            if (pattern === '*' || entry.name.endsWith(pattern.replace('*', ''))) {
              files.push(fullPath);
            }
          }
        }
      } catch {
        // Skip directories we can't read
      }
    }

    await walk(this.projectPath);
    return files.slice(0, 100); // Limit to 100 files for performance
  }

  /**
   * Calculate confidence scores for each platform
   */
  private calculatePlatformScores(): DetectedPlatform[] {
    const platformMap = new Map<PlatformType, { evidence: Evidence[]; totalWeight: number }>();

    // Group evidence by platform
    for (const evidence of this.evidence) {
      for (const platform of evidence.platforms) {
        if (!platformMap.has(platform)) {
          platformMap.set(platform, { evidence: [], totalWeight: 0 });
        }

        const entry = platformMap.get(platform)!;
        entry.evidence.push(evidence);
        entry.totalWeight += evidence.weight;
      }
    }

    // Convert to DetectedPlatform array with confidence scores
    const results: DetectedPlatform[] = [];

    for (const [platformType, data] of platformMap.entries()) {
      // Normalize confidence to 0-1 range
      // More evidence and higher weights = higher confidence
      const confidence = Math.min(data.totalWeight / 2, 1); // Cap at 1.0

      results.push({
        type: platformType,
        confidence,
        indicators: data.evidence.map(e => e.indicator),
      });
    }

    return results;
  }

  /**
   * Generate recommendations based on detected platforms
   */
  private generateRecommendations(platforms: DetectedPlatform[]): string[] {
    const recommendations: string[] = [];

    if (platforms.length === 0) {
      recommendations.push(
        'No platforms detected. Manually specify platform type or add platform-specific files.'
      );
      return recommendations;
    }

    if (platforms.length === 1) {
      const platform = platforms[0]!;
      recommendations.push(
        `Apply ${platform.type} validated pattern (${(platform.confidence * 100).toFixed(0)}% confidence)`
      );
    }

    if (platforms.length > 1) {
      recommendations.push(
        `Multiple platforms detected. Consider hybrid pattern or prioritize: ${platforms
          .map(p => p.type)
          .join(', ')}`
      );

      // Check for complementary patterns
      const types = platforms.map(p => p.type);

      if (
        types.includes('docker') &&
        (types.includes('kubernetes') || types.includes('openshift'))
      ) {
        recommendations.push(
          'Docker + Kubernetes/OpenShift detected. Use containerization with orchestration pattern.'
        );
      }

      if (types.includes('nodejs') && types.includes('docker')) {
        recommendations.push('Node.js + Docker detected. Apply Node.js containerization pattern.');
      }

      if (types.includes('python') && types.includes('docker')) {
        recommendations.push('Python + Docker detected. Apply Python containerization pattern.');
      }

      if (types.includes('mcp') && types.includes('nodejs')) {
        recommendations.push('MCP server detected. Use MCP pattern with Node.js deployment.');
      }

      if (types.includes('a2a') && types.includes('nodejs')) {
        recommendations.push('A2A agent detected. Use A2A pattern with Node.js deployment.');
      }
    }

    // Check for missing files
    const missingFiles = this.detectMissingPatternFiles(platforms[0]!.type);
    if (missingFiles.length > 0) {
      recommendations.push(
        `Missing pattern files: ${missingFiles.join(', ')}. Consider generating these.`
      );
    }

    return recommendations;
  }

  /**
   * Detect which pattern files are missing for a platform
   */
  private detectMissingPatternFiles(platformType: PlatformType): string[] {
    const missing: string[] = [];

    // This is a simplified check - actual implementation would be more comprehensive
    switch (platformType) {
      case 'openshift':
        // Check for values-global.yaml, openshift-gitops-operator/, etc.
        break;
      case 'kubernetes':
        // Check for k8s/manifests/, helm/, etc.
        break;
      case 'docker':
        // Check for .dockerignore
        break;
      case 'nodejs':
        // Check for ecosystem.config.js
        break;
      case 'python':
        // Check for gunicorn.conf.py
        break;
      case 'mcp':
        // Check for proper MCP server structure
        break;
      case 'a2a':
        // Check for agent-card.json
        break;
    }

    return missing;
  }
}

/**
 * Helper function to detect platforms
 */
export async function detectPlatforms(projectPath: string): Promise<PlatformDetectionResult> {
  const detector = new PlatformDetector(projectPath);
  return await detector.detectPlatforms();
}
