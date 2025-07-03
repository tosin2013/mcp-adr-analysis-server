/**
 * AI Analysis Prompts for comprehensive project analysis
 * These prompts are used by tools to generate analysis requests for AI agents
 */

import { ProjectStructure } from '../utils/file-system.js';

/**
 * Generate analysis context for AI agent
 */
export function generateAnalysisContext(projectStructure: ProjectStructure): string {
  const context = {
    projectPath: projectStructure.rootPath,
    totalFiles: projectStructure.totalFiles,
    totalDirectories: projectStructure.totalDirectories,

    // File type breakdown
    fileTypes: getFileTypeBreakdown(projectStructure),

    // Directory structure
    topLevelDirectories: projectStructure.directories
      .filter(dir => !dir.includes('/'))
      .slice(0, 20),

    // Key configuration files
    configFiles: projectStructure.files
      .filter(file => isConfigFile(file.name))
      .map(file => ({ name: file.name, path: file.path })),

    // Documentation files
    documentationFiles: projectStructure.files
      .filter(file => isDocumentationFile(file.name))
      .map(file => ({ name: file.name, path: file.path })),

    // Build and deployment files
    buildFiles: projectStructure.files
      .filter(file => isBuildFile(file.name))
      .map(file => ({ name: file.name, path: file.path })),

    // Sample file paths for pattern analysis
    sampleFilePaths: projectStructure.files.slice(0, 100).map(file => file.path),

    // All unique file extensions
    allExtensions: Array.from(new Set(projectStructure.files.map(f => f.extension))).sort(),

    // Interesting files that might indicate specific technologies
    interestingFiles: projectStructure.files
      .filter(file => isInterestingFile(file.name, file.path))
      .map(file => ({ name: file.name, path: file.path, extension: file.extension })),
  };

  return JSON.stringify(context, null, 2);
}

/**
 * Technology detection prompt for AI agent
 */
export function generateTechnologyDetectionPrompt(
  projectContext: string,
  packageJsonContent?: string
): string {
  return `
# Technology Stack Analysis Request

Please analyze the following project structure and identify all technologies, frameworks, libraries, tools, and platforms being used.

## Project Context
\`\`\`json
${projectContext}
\`\`\`

${
  packageJsonContent
    ? `## Package.json Content
\`\`\`json
${packageJsonContent}
\`\`\``
    : ''
}

## Analysis Requirements

Please provide a comprehensive analysis in the following JSON format:

\`\`\`json
{
  "technologies": [
    {
      "name": "Technology Name",
      "category": "framework|library|database|cloud|devops|language|tool",
      "version": "version if detectable",
      "confidence": 0.0-1.0,
      "evidence": ["specific evidence found"],
      "filePaths": ["relevant file paths"],
      "description": "brief description"
    }
  ],
  "recommendations": [
    "Missing technology recommendations",
    "Optimization suggestions"
  ],
  "stackAlignment": {
    "score": 0.0-1.0,
    "assessment": "Overall stack coherence assessment"
  }
}
\`\`\`

## Detection Guidelines

1. **Be Comprehensive**: Look for ALL technologies including:
   - **Programming Languages**: TypeScript, Python, Java, Go, Rust, C#, PHP, Ruby, etc.
   - **Frontend Frameworks**: React, Vue, Angular, Svelte, Next.js, Nuxt.js, etc.
   - **Backend Frameworks**: Express, FastAPI, Django, Spring, Laravel, Rails, etc.
   - **Databases**: PostgreSQL, MongoDB, Redis, MySQL, SQLite, Cassandra, etc.
   - **Cloud Platforms**: AWS, GCP, Azure, DigitalOcean, Heroku, Vercel, etc.
   - **Infrastructure as Code**: Terraform, Ansible, Pulumi, CloudFormation, etc.
   - **Container Technologies**: Docker, Podman, Kubernetes, OpenShift, etc.
   - **CI/CD Tools**: GitHub Actions, GitLab CI, Jenkins, CircleCI, Travis CI, etc.
   - **Configuration Management**: Ansible, Chef, Puppet, SaltStack, etc.
   - **Monitoring & Observability**: Prometheus, Grafana, ELK Stack, Datadog, etc.
   - **Message Queues**: RabbitMQ, Apache Kafka, Redis Pub/Sub, AWS SQS, etc.
   - **API Technologies**: REST, GraphQL, gRPC, OpenAPI/Swagger, etc.
   - **Testing Frameworks**: Jest, Pytest, JUnit, Cypress, Selenium, etc.
   - **Build Tools**: Webpack, Vite, Gradle, Maven, npm, yarn, etc.
   - **Mobile Development**: React Native, Flutter, Ionic, Xamarin, etc.
   - **Game Development**: Unity, Unreal Engine, Godot, etc.
   - **Data Science**: Jupyter, Pandas, NumPy, TensorFlow, PyTorch, etc.
   - **Documentation**: Sphinx, GitBook, Docusaurus, MkDocs, etc.

2. **Evidence-Based**: Only include technologies with clear evidence
3. **Confidence Scoring**: Rate confidence based on strength of evidence
4. **Version Detection**: Include versions when clearly identifiable
5. **Recommendations**: Suggest missing technologies or improvements

Please analyze thoroughly and provide detailed, accurate results.
`;
}

/**
 * Pattern detection prompt for AI agent
 */
export function generatePatternDetectionPrompt(projectContext: string): string {
  return `
# Architectural Pattern Analysis Request

Please analyze the following project structure and identify architectural patterns, design patterns, and organizational patterns being used.

## Project Context
\`\`\`json
${projectContext}
\`\`\`

## Analysis Requirements

Please provide a comprehensive analysis in the following JSON format:

\`\`\`json
{
  "patterns": [
    {
      "name": "Pattern Name",
      "type": "architectural|structural|organizational|communication|testing|data",
      "confidence": 0.0-1.0,
      "description": "Pattern description and implementation details",
      "evidence": ["specific evidence found"],
      "filePaths": ["relevant file paths"],
      "suboptimal": false,
      "recommendations": ["improvement suggestions if any"]
    }
  ],
  "qualityAssessment": {
    "overallScore": 0.0-1.0,
    "strengths": ["identified strengths"],
    "weaknesses": ["identified weaknesses"],
    "recommendations": ["overall recommendations"]
  }
}
\`\`\`

## Pattern Categories to Analyze

1. **Architectural Patterns**:
   - MVC, MVP, MVVM
   - Layered Architecture
   - Clean Architecture
   - Hexagonal Architecture
   - Microservices
   - Monolithic
   - Event-Driven Architecture

2. **Structural Patterns**:
   - Feature-based organization
   - Domain-driven design
   - Modular architecture
   - Component-based structure
   - Monorepo vs Multi-repo

3. **Organizational Patterns**:
   - Convention over Configuration
   - Separation of Concerns
   - Single Responsibility
   - Dependency Injection

4. **Communication Patterns**:
   - RESTful API
   - GraphQL
   - gRPC
   - Message Queues
   - Event Sourcing

5. **Testing Patterns**:
   - Test-Driven Development
   - Behavior-Driven Development
   - Integration Testing
   - End-to-End Testing
   - Unit Testing

6. **Data Patterns**:
   - Repository Pattern
   - Active Record
   - Data Mapper
   - CQRS
   - Database Migration

## Analysis Guidelines

1. **Evidence-Based**: Only identify patterns with clear structural evidence
2. **Confidence Scoring**: Rate based on how well the pattern is implemented
3. **Quality Assessment**: Evaluate implementation quality and adherence to best practices
4. **Recommendations**: Suggest improvements or missing patterns
5. **Suboptimal Detection**: Flag patterns that are poorly implemented

Please provide a thorough analysis with specific evidence and actionable recommendations.
`;
}

/**
 * Comprehensive project analysis prompt
 */
export function generateComprehensiveAnalysisPrompt(
  projectContext: string,
  packageJsonContent?: string,
  additionalFiles?: { [filename: string]: string }
): string {
  return `
# Comprehensive Project Analysis Request

Please perform a complete architectural analysis of this project, including technology stack, patterns, quality assessment, and recommendations.

## Project Context
\`\`\`json
${projectContext}
\`\`\`

${
  packageJsonContent
    ? `## Package.json
\`\`\`json
${packageJsonContent}
\`\`\``
    : ''
}

${
  additionalFiles
    ? Object.entries(additionalFiles)
        .map(
          ([filename, content]) => `
## ${filename}
\`\`\`
${content.slice(0, 2000)}${content.length > 2000 ? '\n... (truncated)' : ''}
\`\`\`
`
        )
        .join('')
    : ''
}

## Required Analysis

Please provide a comprehensive analysis in JSON format with the following structure:

\`\`\`json
{
  "projectSummary": {
    "name": "Project name if detectable",
    "type": "web|mobile|api|library|tool|other",
    "description": "Brief project description",
    "maturityLevel": "prototype|development|production|mature"
  },
  "technologies": [
    {
      "name": "Technology Name",
      "category": "framework|library|database|cloud|devops|language|tool",
      "version": "version if detectable",
      "confidence": 0.0-1.0,
      "evidence": ["specific evidence"],
      "filePaths": ["relevant paths"],
      "description": "brief description"
    }
  ],
  "patterns": [
    {
      "name": "Pattern Name",
      "type": "architectural|structural|organizational|communication|testing|data",
      "confidence": 0.0-1.0,
      "description": "Pattern implementation details",
      "evidence": ["specific evidence"],
      "filePaths": ["relevant paths"],
      "suboptimal": false,
      "recommendations": ["improvements if any"]
    }
  ],
  "qualityMetrics": {
    "structureScore": 0.0-1.0,
    "technologyAlignment": 0.0-1.0,
    "patternImplementation": 0.0-1.0,
    "overallScore": 0.0-1.0
  },
  "recommendations": {
    "immediate": ["urgent improvements"],
    "shortTerm": ["near-term enhancements"],
    "longTerm": ["strategic improvements"],
    "technologies": ["missing or better alternatives"],
    "patterns": ["architectural improvements"]
  },
  "risks": [
    {
      "type": "technical|security|maintainability|performance",
      "severity": "low|medium|high|critical",
      "description": "Risk description",
      "mitigation": "Suggested mitigation"
    }
  ]
}
\`\`\`

## Analysis Depth

Please provide:
1. **Comprehensive Technology Detection**: All frameworks, libraries, tools, platforms
2. **Pattern Recognition**: Architectural, design, and organizational patterns
3. **Quality Assessment**: Code organization, best practices, maintainability
4. **Risk Analysis**: Technical debt, security concerns, scalability issues
5. **Strategic Recommendations**: Technology choices, architectural improvements
6. **Actionable Insights**: Specific, prioritized improvement suggestions

Focus on accuracy, evidence-based conclusions, and actionable recommendations.
`;
}

// Helper functions
function getFileTypeBreakdown(projectStructure: ProjectStructure): Record<string, number> {
  const breakdown: Record<string, number> = {};

  for (const file of projectStructure.files) {
    const ext = file.extension || 'no-extension';
    breakdown[ext] = (breakdown[ext] || 0) + 1;
  }

  return breakdown;
}

function isConfigFile(filename: string): boolean {
  const configPatterns = [
    'package.json',
    'tsconfig.json',
    'webpack.config',
    'vite.config',
    'jest.config',
    'eslint.config',
    '.env',
    'docker-compose',
    'Dockerfile',
    'Makefile',
    'pyproject.toml',
    'requirements.txt',
    'pom.xml',
    'build.gradle',
    'Cargo.toml',
  ];

  return configPatterns.some(pattern => filename.includes(pattern));
}

function isDocumentationFile(filename: string): boolean {
  const docPatterns = ['README', '.md', '.rst', '.txt', 'CHANGELOG', 'LICENSE'];
  return docPatterns.some(pattern => filename.includes(pattern));
}

function isBuildFile(filename: string): boolean {
  const buildPatterns = [
    'Dockerfile',
    'docker-compose',
    '.github/workflows',
    'Makefile',
    'build.gradle',
    'pom.xml',
    'setup.py',
  ];
  return buildPatterns.some(pattern => filename.includes(pattern));
}

function isInterestingFile(filename: string, filepath: string): boolean {
  // Configuration and infrastructure files
  const interestingPatterns = [
    // Infrastructure as Code
    'terraform',
    '.tf',
    '.tfvars',
    '.hcl',
    'ansible',
    '.yml',
    '.yaml',
    'playbook',
    'inventory',
    'pulumi',
    'cloudformation',
    '.template',

    // Container and orchestration
    'docker',
    'kubernetes',
    'k8s',
    'helm',
    'kustomize',
    'compose',
    'dockerfile',
    '.dockerignore',

    // CI/CD
    '.github',
    'gitlab-ci',
    'jenkins',
    'circleci',
    'travis',
    'azure-pipelines',
    'buildkite',
    'drone',

    // Configuration management
    'chef',
    'puppet',
    'saltstack',
    'vagrant',

    // Cloud provider specific
    'aws',
    'gcp',
    'azure',
    'cloudflare',
    '.aws',
    '.gcp',
    '.azure',

    // Monitoring and logging
    'prometheus',
    'grafana',
    'elasticsearch',
    'logstash',
    'kibana',
    'datadog',
    'newrelic',
    'sentry',

    // Database migrations and schemas
    'migration',
    'schema',
    'seed',
    'fixture',

    // API documentation
    'swagger',
    'openapi',
    'postman',
    'insomnia',

    // Security and secrets
    'vault',
    'secrets',
    'gpg',
    'ssl',
    'tls',

    // Package managers and dependencies
    'package.json',
    'requirements.txt',
    'Pipfile',
    'poetry.lock',
    'Cargo.toml',
    'go.mod',
    'composer.json',
    'Gemfile',

    // Build and deployment
    'webpack',
    'vite',
    'rollup',
    'parcel',
    'esbuild',
    'gradle',
    'maven',
    'sbt',
    'leiningen',

    // Testing
    'test',
    'spec',
    'e2e',
    'integration',
    'unit',
    'cypress',
    'selenium',
    'playwright',

    // Documentation
    'readme',
    'changelog',
    'license',
    'contributing',
    'docs',
    'documentation',
    'wiki',

    // Environment and configuration
    '.env',
    'config',
    'settings',
    'properties',
    '.ini',
    '.conf',
    '.cfg',
    '.toml',
  ];

  const lowerFilename = filename.toLowerCase();
  const lowerFilepath = filepath.toLowerCase();

  return interestingPatterns.some(
    pattern => lowerFilename.includes(pattern) || lowerFilepath.includes(pattern)
  );
}
