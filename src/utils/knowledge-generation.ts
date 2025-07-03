/**
 * Knowledge Generation Utility Module - 100% Prompt-Driven Architecture
 * Generates AI delegation prompts for domain-specific architectural knowledge
 * All functions return prompts for AI execution, never execute operations directly
 */

import { McpAdrError } from '../types/index.js';
import {
  ArchitecturalDomain,
  KnowledgeGenerationConfig,
  ArchitecturalContext,
  ProjectContext
} from '../types/knowledge-generation.js';
import { PromptObject } from './prompt-composition.js';
import { getDomainTemplate } from '../templates/domain-knowledge-templates.js';

// ============================================================================
// Configuration and Constants
// ============================================================================

const DEFAULT_CONFIG: Required<KnowledgeGenerationConfig> = {
  domains: [],
  depth: 'intermediate',
  cacheEnabled: true,
  cacheTTL: 3600, // 1 hour
  securityValidation: true,
  customTemplates: [],
  maxKnowledgeItems: 50,
  relevanceThreshold: 0.6,
  parallelGeneration: true
};

const KNOWLEDGE_VERSION = '1.0.0';

// ============================================================================
// Core Knowledge Generation Functions - 100% Prompt-Driven
// ============================================================================

/**
 * Generate AI delegation prompt for architectural knowledge generation
 * Returns prompts for AI to generate domain-specific knowledge
 */
export async function generateArchitecturalKnowledge(
  context: ArchitecturalContext,
  config: KnowledgeGenerationConfig = {}
): Promise<{ prompt: string; instructions: string; context: any }> {
  try {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    console.error(`[DEBUG] Generating knowledge generation prompt for domains: ${mergedConfig.domains.join(', ')}`);

    // Determine target domains
    let targetDomains = mergedConfig.domains;
    if (targetDomains.length === 0) {
      // Use fallback domains if none specified
      targetDomains = ['web-applications', 'api-design'];
    }

    // Get domain templates for knowledge generation
    const domainTemplatesInfo = targetDomains.map(domain => {
      const template = getDomainTemplate(domain);
      return {
        domain,
        hasTemplate: !!template,
        categories: template?.categories.map(cat => ({
          category: cat.category,
          itemCount: cat.items.length,
          priority: cat.priority,
          applicability: cat.applicability
        })) || []
      };
    });

    // Generate cache key for this knowledge request
    const contextHash = Buffer.from(JSON.stringify(context)).toString('base64').substring(0, 16);
    const configHash = Buffer.from(JSON.stringify(mergedConfig)).toString('base64').substring(0, 16);
    const cacheKey = `knowledge:${targetDomains.join('+')}-${contextHash}-${configHash}`;

    // Create comprehensive knowledge generation prompt
    const prompt = `
# Architectural Knowledge Generation Request

Please generate domain-specific architectural knowledge for the following context and domains.

## Target Domains
${targetDomains.map((domain, index) => `${index + 1}. **${domain}**`).join('\n')}

## Project Context
- **Project Path**: ${context.projectPath || 'Not specified'}
- **Technologies**: ${context.technologies?.join(', ') || 'Not specified'}
- **Patterns**: ${context.patterns?.join(', ') || 'Not specified'}
- **Existing ADRs**: ${context.existingAdrs?.length || 0} ADRs
- **Project Type**: ${context.projectType || 'Not specified'}
- **Team Size**: ${context.teamSize || 'Not specified'}
- **Constraints**: ${context.constraints?.join(', ') || 'None specified'}
- **Goals**: ${context.goals?.join(', ') || 'None specified'}

## Knowledge Generation Configuration
- **Depth**: ${mergedConfig.depth}
- **Max Knowledge Items**: ${mergedConfig.maxKnowledgeItems}
- **Relevance Threshold**: ${mergedConfig.relevanceThreshold}
- **Security Validation**: ${mergedConfig.securityValidation ? 'Enabled' : 'Disabled'}

## Domain Templates Available
${domainTemplatesInfo.map(info => `
### ${info.domain}
- **Template Available**: ${info.hasTemplate ? 'Yes' : 'No'}
- **Categories**: ${info.categories.length}
${info.categories.map(cat => `  - ${cat.category} (${cat.itemCount} items, priority: ${cat.priority})`).join('\n')}
`).join('\n')}

## Required Knowledge Generation Tasks

### Step 1: Domain Knowledge Extraction
For each target domain, extract relevant architectural knowledge including:
1. **Best Practices**: Industry-standard practices for the domain
2. **Design Patterns**: Common architectural patterns and their applications
3. **Anti-Patterns**: Common mistakes and what to avoid
4. **Technology-Specific**: Knowledge specific to detected technologies
5. **Performance Considerations**: Performance optimization strategies
6. **Security Guidelines**: Security best practices for the domain
7. **Scalability Patterns**: Patterns for handling scale and growth
8. **Testing Strategies**: Testing approaches for the domain

### Step 2: Context Relevance Filtering
Filter knowledge based on:
- **Technology Match**: Prioritize knowledge relevant to detected technologies
- **Pattern Alignment**: Focus on knowledge that supports existing patterns
- **Project Goals**: Emphasize knowledge that helps achieve stated goals
- **Constraint Awareness**: Consider project constraints and limitations
- **Team Context**: Adjust complexity based on team size and expertise

### Step 3: Knowledge Quality Assessment
Evaluate each knowledge item for:
- **Relevance Score**: How relevant is this to the project context (0-1)
- **Confidence Level**: How confident are we in this knowledge (0-1)
- **Evidence Strength**: What evidence supports this knowledge
- **Applicability**: Under what conditions does this knowledge apply

### Step 4: Knowledge Structuring
Structure the knowledge as follows:
\`\`\`json
{
  "knowledgeGeneration": {
    "domains": ["domain1", "domain2"],
    "totalItems": number,
    "averageRelevance": number,
    "generationMetadata": {
      "timestamp": "ISO-8601",
      "version": "${KNOWLEDGE_VERSION}",
      "cacheKey": "${cacheKey}",
      "configUsed": {
        "depth": "${mergedConfig.depth}",
        "maxItems": ${mergedConfig.maxKnowledgeItems},
        "threshold": ${mergedConfig.relevanceThreshold}
      }
    },
    "domainKnowledge": [
      {
        "domain": "domain-name",
        "confidence": number,
        "knowledgeItems": [
          {
            "category": "best-practices|design-patterns|anti-patterns|etc",
            "title": "Knowledge item title",
            "content": "Detailed knowledge content based on depth level",
            "relevance": number,
            "evidence": ["evidence1", "evidence2"],
            "tags": ["tag1", "tag2"],
            "applicability": ["condition1", "condition2"]
          }
        ]
      }
    ]
  }
}
\`\`\`

## Security and Validation Requirements

The AI agent must:
1. **Content Safety**: Ensure all generated knowledge is safe and appropriate
2. **Source Reliability**: Base knowledge on reliable architectural sources
3. **Relevance Validation**: Verify knowledge relevance to the specified context
4. **Quality Control**: Maintain high quality standards for all knowledge items
5. **Consistency Check**: Ensure knowledge items don't contradict each other

## Cache Integration

If caching is enabled:
1. **Cache Key**: Use the provided cache key: \`${cacheKey}\`
2. **Cache TTL**: ${mergedConfig.cacheTTL} seconds
3. **Cache Validation**: Verify cached knowledge is still relevant and up-to-date

## Expected Output

Generate comprehensive architectural knowledge that:
- Covers all specified domains thoroughly
- Is highly relevant to the project context
- Provides actionable insights and guidance
- Maintains consistency with architectural best practices
- Includes proper evidence and justification
- Follows the specified JSON structure exactly

The generated knowledge will be used to enhance architectural decision-making and provide context-aware guidance for the project.
`;

    const instructions = `
# Knowledge Generation Instructions

This is a comprehensive architectural knowledge generation task. You must:

1. **Analyze Context**: Understand the project context and requirements
2. **Extract Knowledge**: Generate domain-specific architectural knowledge
3. **Filter by Relevance**: Apply relevance filtering based on context
4. **Structure Output**: Format according to the specified JSON schema
5. **Validate Quality**: Ensure high-quality, actionable knowledge
6. **Apply Security**: Follow all security and validation requirements

## Quality Standards
- All knowledge must be accurate and up-to-date
- Content must be relevant to the specified domains and context
- Evidence must support each knowledge item
- Output must follow the exact JSON structure provided

## Success Criteria
- Knowledge covers all specified domains
- Relevance scores are above the threshold (${mergedConfig.relevanceThreshold})
- Total items don't exceed the limit (${mergedConfig.maxKnowledgeItems})
- All required fields are populated correctly
- Security validation passes for all content
`;

    return {
      prompt,
      instructions,
      context: {
        operation: 'knowledge_generation',
        domains: targetDomains,
        config: mergedConfig,
        cacheKey,
        securityLevel: 'high',
        expectedFormat: 'json'
      }
    };

  } catch (error) {
    throw new McpAdrError(
      `Failed to generate knowledge generation prompt: ${error instanceof Error ? error.message : String(error)}`,
      'PROMPT_GENERATION_ERROR'
    );
  }
}

/**
 * Generate prompt for enhancing an existing prompt with domain-specific knowledge
 * Returns AI delegation prompt for knowledge-enhanced prompt creation
 */
export async function enhancePromptWithKnowledge(
  originalPrompt: PromptObject,
  domains: ArchitecturalDomain[],
  context: ArchitecturalContext = {},
  config: KnowledgeGenerationConfig = {}
): Promise<{ prompt: string; instructions: string; context: any }> {
  try {
    console.error(`[DEBUG] Generating prompt enhancement request for domains: ${domains.join(', ')}`);

    const mergedConfig = { ...DEFAULT_CONFIG, ...config, domains };

    // Generate knowledge generation prompt first
    const knowledgePrompt = await generateArchitecturalKnowledge(context, mergedConfig);

    const prompt = `
# Prompt Enhancement with Architectural Knowledge

Please enhance the following prompt with domain-specific architectural knowledge.

## Original Prompt
\`\`\`
${originalPrompt.prompt}
\`\`\`

## Original Instructions
\`\`\`
${originalPrompt.instructions}
\`\`\`

## Knowledge Generation Task
${knowledgePrompt.prompt}

## Enhancement Requirements

### Step 1: Generate Domain Knowledge
Execute the knowledge generation task above to obtain domain-specific architectural knowledge for: ${domains.join(', ')}

### Step 2: Integrate Knowledge with Original Prompt
Combine the generated knowledge with the original prompt by:
1. **Prepending Knowledge Context**: Add the generated knowledge as context before the original prompt
2. **Maintaining Original Intent**: Preserve the original prompt's purpose and requirements
3. **Enhancing Decision Quality**: Use the knowledge to improve decision-making capabilities
4. **Providing Evidence**: Include architectural evidence and best practices

### Step 3: Create Enhanced Prompt Structure
Format the enhanced prompt as:
\`\`\`
# Enhanced Prompt with Architectural Knowledge

## Domain-Specific Knowledge
[Insert generated architectural knowledge here]

## Original Task
[Insert original prompt here]

## Knowledge-Informed Approach
[Explain how the knowledge should inform the task execution]
\`\`\`

## Quality Requirements
- Maintain the original prompt's core objectives
- Seamlessly integrate architectural knowledge
- Provide clear guidance on using the knowledge
- Ensure the enhanced prompt is actionable and specific

## Expected Output Format
Return the enhanced prompt that combines architectural knowledge with the original task requirements.
`;

    const instructions = `
# Prompt Enhancement Instructions

You must:
1. **Execute Knowledge Generation**: Generate domain knowledge using the provided knowledge generation prompt
2. **Preserve Original Intent**: Maintain all original prompt requirements and objectives
3. **Integrate Seamlessly**: Combine knowledge and original prompt in a coherent way
4. **Enhance Decision Quality**: Use knowledge to improve the quality of decisions and recommendations
5. **Provide Clear Structure**: Create a well-structured enhanced prompt

## Success Criteria
- Original prompt objectives are preserved
- Domain knowledge is properly integrated
- Enhanced prompt is more informative and context-aware
- Output maintains clarity and actionability
`;

    return {
      prompt,
      instructions,
      context: {
        operation: 'prompt_enhancement',
        domains,
        originalPrompt,
        config: mergedConfig,
        securityLevel: 'high',
        expectedFormat: 'enhanced_prompt'
      }
    };

  } catch (error) {
    console.error('[ERROR] Prompt enhancement generation failed:', error);
    throw new McpAdrError(
      `Failed to generate prompt enhancement: ${error instanceof Error ? error.message : String(error)}`,
      'PROMPT_ENHANCEMENT_ERROR'
    );
  }
}

/**
 * Generate prompt for detecting architectural domains from project context
 * Returns AI delegation prompt for domain detection
 */
export async function detectArchitecturalDomains(
  projectContext: ProjectContext
): Promise<{ prompt: string; instructions: string; context: any }> {
  try {
    console.error(`[DEBUG] Generating domain detection prompt for project: ${projectContext.path}`);

    const prompt = `
# Architectural Domain Detection Request

Please analyze the project context and detect the most relevant architectural domains.

## Project Information
- **Project Path**: ${projectContext.path}
- **Project Name**: ${projectContext.name || 'Not specified'}
- **Description**: ${projectContext.description || 'Not specified'}

## Technology Stack
${projectContext.technologies.length > 0
  ? projectContext.technologies.map((tech, index) => `${index + 1}. ${tech}`).join('\n')
  : 'No technologies specified'
}

## File Types Present
${projectContext.fileTypes.length > 0
  ? projectContext.fileTypes.map((type, index) => `${index + 1}. ${type}`).join('\n')
  : 'No file types specified'
}

## Directory Structure
${projectContext.directoryStructure.length > 0
  ? projectContext.directoryStructure.map((dir, index) => `${index + 1}. ${dir}`).join('\n')
  : 'No directory structure provided'
}

## Package Files
${projectContext.packageFiles.length > 0
  ? projectContext.packageFiles.map((file, index) => `${index + 1}. ${file}`).join('\n')
  : 'No package files found'
}

## Configuration Files
${projectContext.configFiles.length > 0
  ? projectContext.configFiles.map((file, index) => `${index + 1}. ${file}`).join('\n')
  : 'No configuration files found'
}

## Available Architectural Domains
1. **web-applications** - Frontend web applications (React, Vue, Angular, etc.)
2. **mobile-applications** - Mobile app development (React Native, Flutter, etc.)
3. **microservices** - Microservices architecture and distributed systems
4. **database-design** - Database design and data management
5. **cloud-infrastructure** - Cloud platforms and infrastructure (AWS, Azure, GCP)
6. **devops-cicd** - DevOps practices and CI/CD pipelines
7. **security-patterns** - Security architecture and patterns
8. **performance-optimization** - Performance optimization strategies
9. **api-design** - API design and development (REST, GraphQL)
10. **data-architecture** - Data architecture and analytics

## Domain Detection Criteria

### Technology Mapping
- **Web Applications**: React, Vue, Angular, Svelte, Next.js, Nuxt, Gatsby, HTML, CSS, JavaScript, TypeScript
- **Mobile Applications**: React Native, Flutter, Ionic, Xamarin, Swift, Kotlin
- **Microservices**: Docker, Kubernetes, Consul, Istio, Envoy, Service Mesh
- **Database Design**: MongoDB, PostgreSQL, MySQL, Redis, Prisma, TypeORM, Sequelize
- **Cloud Infrastructure**: AWS, Azure, GCP, Terraform, CloudFormation, Serverless
- **DevOps/CI-CD**: Jenkins, GitHub Actions, GitLab CI, Docker, Kubernetes, Ansible
- **API Design**: Express, Fastify, Koa, NestJS, GraphQL, Apollo, REST
- **Security**: OAuth, JWT, HTTPS, Encryption, Authentication, Authorization

### File Type Indicators
- **.tsx, .jsx, .vue, .html** → Web Applications
- **.swift, .kt, .dart** → Mobile Applications
- **.dockerfile, docker-compose.yml** → Microservices/Cloud
- **.sql, .prisma, migrations/** → Database Design
- **.tf, .yml (CI/CD)** → DevOps/Infrastructure

### Configuration File Indicators
- **package.json, yarn.lock** → Web/Node.js ecosystem
- **Dockerfile, docker-compose.yml** → Containerization
- **terraform files** → Infrastructure as Code
- **CI/CD config files** → DevOps practices

## Required Analysis Tasks

### Step 1: Technology Analysis
Analyze the provided technologies and map them to architectural domains based on the criteria above.

### Step 2: File Type Analysis
Examine file types to identify development patterns and architectural approaches.

### Step 3: Configuration Analysis
Review configuration files to understand deployment and infrastructure patterns.

### Step 4: Confidence Scoring
Assign confidence scores (0-1) for each detected domain based on:
- Number of matching technologies
- Strength of evidence
- Consistency of indicators

### Step 5: Evidence Collection
Document specific evidence for each detected domain including:
- Matching technologies
- Relevant file types
- Supporting configuration files

## Expected Output Format
\`\`\`json
{
  "domainDetection": {
    "detectedDomains": ["domain1", "domain2"],
    "confidence": number,
    "evidence": [
      {
        "domain": "domain-name",
        "confidence": number,
        "evidence": ["evidence1", "evidence2"],
        "sources": ["source1", "source2"]
      }
    ],
    "recommendations": ["recommendation1", "recommendation2"],
    "fallbackDomains": ["fallback1", "fallback2"],
    "metadata": {
      "analysisTimestamp": "ISO-8601",
      "projectPath": "${projectContext.path}",
      "technologiesAnalyzed": ${projectContext.technologies.length},
      "fileTypesAnalyzed": ${projectContext.fileTypes.length}
    }
  }
}
\`\`\`

## Quality Requirements
- Detect at least 1-3 most relevant domains
- Provide confidence scores above 0.6 for primary domains
- Include specific evidence for each detection
- Offer fallback domains if detection confidence is low
- Ensure recommendations are actionable and specific

The detected domains will be used for generating relevant architectural knowledge and guidance.
`;

    const instructions = `
# Domain Detection Instructions

You must:
1. **Analyze All Context**: Examine technologies, file types, directories, and configuration files
2. **Apply Detection Criteria**: Use the provided mapping criteria to identify domains
3. **Calculate Confidence**: Assign realistic confidence scores based on evidence strength
4. **Collect Evidence**: Document specific evidence supporting each domain detection
5. **Provide Recommendations**: Suggest additional domains or clarifications if needed
6. **Format Output**: Follow the exact JSON structure provided

## Success Criteria
- At least one domain detected with confidence > 0.6
- All detected domains have supporting evidence
- Output follows the specified JSON format exactly
- Recommendations are helpful and actionable
`;

    return {
      prompt,
      instructions,
      context: {
        operation: 'domain_detection',
        projectContext,
        availableDomains: [
          'web-applications', 'mobile-applications', 'microservices',
          'database-design', 'cloud-infrastructure', 'devops-cicd',
          'security-patterns', 'performance-optimization', 'api-design', 'data-architecture'
        ],
        securityLevel: 'medium',
        expectedFormat: 'json'
      }
    };

  } catch (error) {
    console.error('[ERROR] Domain detection prompt generation failed:', error);
    throw new McpAdrError(
      `Failed to generate domain detection prompt: ${error instanceof Error ? error.message : String(error)}`,
      'DOMAIN_DETECTION_ERROR'
    );
  }
}

// ============================================================================
// Utility Functions for Prompt Generation
// ============================================================================

/**
 * Generate cache key for knowledge generation requests
 */
export function generateKnowledgeCacheKey(
  domains: ArchitecturalDomain[],
  context: ArchitecturalContext,
  config: KnowledgeGenerationConfig
): string {
  const contextHash = Buffer.from(JSON.stringify(context)).toString('base64').substring(0, 16);
  const configHash = Buffer.from(JSON.stringify(config)).toString('base64').substring(0, 16);
  return `knowledge:${domains.join('+')}-${contextHash}-${configHash}`;
}

/**
 * Get available domain templates information for prompt generation
 */
export function getAvailableDomainsInfo(): Array<{
  domain: ArchitecturalDomain;
  hasTemplate: boolean;
  categoryCount: number;
}> {
  const availableDomains: ArchitecturalDomain[] = [
    'web-applications', 'mobile-applications', 'microservices',
    'database-design', 'cloud-infrastructure', 'devops-cicd',
    'security-patterns', 'performance-optimization', 'api-design', 'data-architecture'
  ];

  return availableDomains.map(domain => {
    const template = getDomainTemplate(domain);
    return {
      domain,
      hasTemplate: !!template,
      categoryCount: template?.categories.length || 0
    };
  });
}

/**
 * Validate knowledge generation inputs
 */
export function validateKnowledgeGenerationInputs(
  context: ArchitecturalContext,
  config: KnowledgeGenerationConfig
): void {
  if (!context) {
    throw new McpAdrError('Context is required for knowledge generation', 'INVALID_INPUT');
  }

  if (config.domains && config.domains.length > 10) {
    throw new McpAdrError('Too many domains specified (maximum 10)', 'INVALID_INPUT');
  }

  if (config.maxKnowledgeItems && config.maxKnowledgeItems > 200) {
    throw new McpAdrError('Maximum knowledge items limit exceeded (maximum 200)', 'INVALID_INPUT');
  }

  if (config.relevanceThreshold && (config.relevanceThreshold < 0 || config.relevanceThreshold > 1)) {
    throw new McpAdrError('Relevance threshold must be between 0 and 1', 'INVALID_INPUT');
  }
}

// ============================================================================
// Export Functions for External Use
// ============================================================================

/**
 * Get default knowledge generation configuration
 */
export function getDefaultKnowledgeConfig(): Required<KnowledgeGenerationConfig> {
  return { ...DEFAULT_CONFIG };
}

/**
 * Check if a domain has an available template
 */
export function isDomainSupported(domain: ArchitecturalDomain): boolean {
  return getDomainTemplate(domain) !== undefined;
}

/**
 * Get supported architectural domains
 */
export function getSupportedDomains(): ArchitecturalDomain[] {
  return [
    'web-applications', 'mobile-applications', 'microservices',
    'database-design', 'cloud-infrastructure', 'devops-cicd',
    'security-patterns', 'performance-optimization', 'api-design', 'data-architecture'
  ];
}

/**
 * Get supported knowledge depths
 */
export function getSupportedDepths(): Array<'basic' | 'intermediate' | 'advanced'> {
  return ['basic', 'intermediate', 'advanced'];
}

/**
 * Validate knowledge generation configuration
 */
export function validateKnowledgeConfig(config: Partial<KnowledgeGenerationConfig>): void {
  if (config.maxKnowledgeItems && config.maxKnowledgeItems <= 0) {
    throw new Error('Max knowledge items must be positive');
  }

  if (config.depth && !['basic', 'intermediate', 'advanced'].includes(config.depth)) {
    throw new Error('Invalid depth');
  }

  if (config.domains && config.domains.length === 0) {
    throw new Error('At least one domain must be specified');
  }
}

/**
 * Create domain-specific knowledge configuration
 */
export function createDomainKnowledgeConfig(domain: ArchitecturalDomain): KnowledgeGenerationConfig {
  return {
    domains: [domain],
    depth: 'intermediate',
    cacheEnabled: true,
    maxKnowledgeItems: 50
  };
}

/**
 * Generate domain-specific knowledge
 */
export async function generateDomainKnowledge(
  domain: ArchitecturalDomain,
  depth: 'basic' | 'intermediate' | 'advanced'
): Promise<any> {
  const supportedDomains = getSupportedDomains();
  if (!supportedDomains.includes(domain)) {
    throw new Error(`Unsupported domain: ${domain}`);
  }

  return {
    prompt: `Domain Knowledge Generation Request for ${domain}`,
    instructions: `Generate ${depth} level knowledge for ${domain}`,
    context: {
      operation: 'knowledge_generation',
      domain,
      depth,
      knowledgeGenerated: true
    }
  };
}
