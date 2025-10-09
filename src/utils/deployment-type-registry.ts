/**
 * Deployment Type Registry
 *
 * Comprehensive registry of deployment platforms with their specific
 * file requirements, validation rules, and deployment patterns.
 *
 * Supports: OpenShift, Kubernetes, Firebase, Docker, MCP Servers,
 * FastMCP, bare metal, and hybrid deployments.
 */

export interface DeploymentFile {
  path: string;
  required: boolean;
  canAutoGenerate: boolean;
  isSecret: boolean;
  description: string;
  templateContent?: string;
  validationRules?: string[];
}

export interface DeploymentType {
  id: string;
  name: string;
  category: 'container' | 'serverless' | 'mcp' | 'traditional';
  detectionPatterns: {
    files?: string[];
    dependencies?: string[];
    commands?: string[];
  };
  requiredFiles: DeploymentFile[];
  optionalFiles: DeploymentFile[];
  environmentVariables: {
    name: string;
    required: boolean;
    description: string;
    isSecret: boolean;
  }[];
  validationCommands: string[];
  deploymentCommands: string[];
  documentation: string;
}

/**
 * Registry of all supported deployment types
 */
export const DEPLOYMENT_TYPES: DeploymentType[] = [
  // ===== MCP Server Deployments =====
  {
    id: 'mcp-nodejs',
    name: 'Node.js MCP Server',
    category: 'mcp',
    detectionPatterns: {
      files: ['package.json'],
      dependencies: ['@modelcontextprotocol/sdk'],
    },
    requiredFiles: [
      {
        path: 'package.json',
        required: true,
        canAutoGenerate: false,
        isSecret: false,
        description: 'Node.js package configuration with MCP server entry point',
        validationRules: [
          'Must have "bin" field for CLI',
          'Must include @modelcontextprotocol/sdk',
        ],
      },
      {
        path: 'src/index.ts',
        required: true,
        canAutoGenerate: true,
        isSecret: false,
        description: 'MCP server implementation',
        templateContent: `import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'your-mcp-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
    resources: {},
    prompts: {}
  }
});

// Add your tools, resources, and prompts here

const transport = new StdioServerTransport();
await server.connect(transport);`,
      },
      {
        path: 'tsconfig.json',
        required: true,
        canAutoGenerate: true,
        isSecret: false,
        description: 'TypeScript configuration for ES modules',
        templateContent: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}`,
      },
    ],
    optionalFiles: [
      {
        path: '.env',
        required: false,
        canAutoGenerate: true,
        isSecret: true,
        description: 'Environment variables (API keys, secrets)',
        templateContent: `# API Keys (DO NOT COMMIT)
OPENROUTER_API_KEY=your_key_here
# Add other environment variables below`,
      },
      {
        path: 'examples/claude_desktop_config.json',
        required: false,
        canAutoGenerate: true,
        isSecret: false,
        description: 'Example Claude Desktop configuration',
        templateContent: `{
  "mcpServers": {
    "your-server-name": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "API_KEY": "your_key_here"
      }
    }
  }
}`,
      },
      {
        path: 'README.md',
        required: false,
        canAutoGenerate: true,
        isSecret: false,
        description: 'Installation and usage documentation',
      },
    ],
    environmentVariables: [
      {
        name: 'NODE_ENV',
        required: false,
        description: 'Node environment (development/production)',
        isSecret: false,
      },
    ],
    validationCommands: ['npm run build', 'npx @modelcontextprotocol/inspector dist/index.js'],
    deploymentCommands: ['npm publish'],
    documentation: 'https://modelcontextprotocol.io/docs',
  },

  {
    id: 'fastmcp',
    name: 'FastMCP Server (Python)',
    category: 'mcp',
    detectionPatterns: {
      files: ['pyproject.toml', 'requirements.txt'],
      dependencies: ['fastmcp'],
    },
    requiredFiles: [
      {
        path: 'server.py',
        required: true,
        canAutoGenerate: true,
        isSecret: false,
        description: 'FastMCP server implementation',
        templateContent: `from fastmcp import FastMCP

mcp = FastMCP("Your Server Name")

@mcp.tool()
def example_tool(arg: str) -> str:
    """Example tool description"""
    return f"Result: {arg}"

if __name__ == "__main__":
    mcp.run()`,
      },
      {
        path: 'requirements.txt',
        required: true,
        canAutoGenerate: true,
        isSecret: false,
        description: 'Python dependencies',
        templateContent: `fastmcp>=0.1.0
python-dotenv>=1.0.0`,
      },
    ],
    optionalFiles: [
      {
        path: '.env',
        required: false,
        canAutoGenerate: true,
        isSecret: true,
        description: 'Environment variables',
        templateContent: `# API Keys (DO NOT COMMIT)
API_KEY=your_key_here`,
      },
      {
        path: 'pyproject.toml',
        required: false,
        canAutoGenerate: true,
        isSecret: false,
        description: 'Python project configuration',
      },
    ],
    environmentVariables: [],
    validationCommands: ['python -m pytest', 'python server.py --help'],
    deploymentCommands: ['pip install -e .', 'python server.py'],
    documentation: 'https://github.com/jlowin/fastmcp',
  },

  // ===== Container Orchestration =====
  {
    id: 'openshift',
    name: 'OpenShift',
    category: 'container',
    detectionPatterns: {
      files: ['openshift/', '.s2i/'],
      commands: ['oc'],
    },
    requiredFiles: [
      {
        path: 'openshift/deployment.yml',
        required: true,
        canAutoGenerate: true,
        isSecret: false,
        description: 'OpenShift DeploymentConfig',
        templateContent: `apiVersion: apps.openshift.io/v1
kind: DeploymentConfig
metadata:
  name: your-app
spec:
  replicas: 1
  selector:
    app: your-app
  template:
    metadata:
      labels:
        app: your-app
    spec:
      containers:
      - name: your-app
        image: your-image:latest
        ports:
        - containerPort: 8080`,
      },
      {
        path: 'openshift/service.yml',
        required: true,
        canAutoGenerate: true,
        isSecret: false,
        description: 'OpenShift Service',
        templateContent: `apiVersion: v1
kind: Service
metadata:
  name: your-app
spec:
  selector:
    app: your-app
  ports:
  - port: 8080
    targetPort: 8080`,
      },
      {
        path: 'openshift/route.yml',
        required: true,
        canAutoGenerate: true,
        isSecret: false,
        description: 'OpenShift Route',
        templateContent: `apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: your-app
spec:
  to:
    kind: Service
    name: your-app`,
      },
    ],
    optionalFiles: [
      {
        path: '.s2i/environment',
        required: false,
        canAutoGenerate: true,
        isSecret: false,
        description: 'Source-to-Image environment variables',
      },
      {
        path: 'openshift/configmap.yml',
        required: false,
        canAutoGenerate: true,
        isSecret: false,
        description: 'Configuration data',
      },
    ],
    environmentVariables: [],
    validationCommands: ['oc version', 'oc apply --dry-run=client -f openshift/'],
    deploymentCommands: ['oc apply -f openshift/', 'oc rollout status dc/your-app'],
    documentation: 'https://docs.openshift.com/',
  },

  {
    id: 'kubernetes',
    name: 'Kubernetes',
    category: 'container',
    detectionPatterns: {
      files: ['k8s/', 'kubernetes/', 'deployment.yaml'],
      commands: ['kubectl'],
    },
    requiredFiles: [
      {
        path: 'k8s/deployment.yaml',
        required: true,
        canAutoGenerate: true,
        isSecret: false,
        description: 'Kubernetes Deployment',
        templateContent: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: your-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: your-app
  template:
    metadata:
      labels:
        app: your-app
    spec:
      containers:
      - name: your-app
        image: your-image:latest
        ports:
        - containerPort: 8080`,
      },
      {
        path: 'k8s/service.yaml',
        required: true,
        canAutoGenerate: true,
        isSecret: false,
        description: 'Kubernetes Service',
      },
    ],
    optionalFiles: [
      {
        path: 'k8s/ingress.yaml',
        required: false,
        canAutoGenerate: true,
        isSecret: false,
        description: 'Ingress configuration',
      },
    ],
    environmentVariables: [],
    validationCommands: ['kubectl apply --dry-run=client -f k8s/'],
    deploymentCommands: ['kubectl apply -f k8s/'],
    documentation: 'https://kubernetes.io/docs/',
  },

  {
    id: 'docker',
    name: 'Docker',
    category: 'container',
    detectionPatterns: {
      files: ['Dockerfile', 'docker-compose.yml'],
    },
    requiredFiles: [
      {
        path: 'Dockerfile',
        required: true,
        canAutoGenerate: true,
        isSecret: false,
        description: 'Docker image definition',
        templateContent: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["npm", "start"]`,
      },
    ],
    optionalFiles: [
      {
        path: 'docker-compose.yml',
        required: false,
        canAutoGenerate: true,
        isSecret: false,
        description: 'Multi-container orchestration',
        templateContent: `version: '3.8'
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      NODE_ENV: production`,
      },
      {
        path: '.dockerignore',
        required: false,
        canAutoGenerate: true,
        isSecret: false,
        description: 'Files to exclude from Docker context',
        templateContent: `node_modules
.git
.env
*.log`,
      },
    ],
    environmentVariables: [],
    validationCommands: ['docker build -t test .'],
    deploymentCommands: ['docker build -t your-app .', 'docker run -p 8080:8080 your-app'],
    documentation: 'https://docs.docker.com/',
  },

  // ===== Serverless =====
  {
    id: 'firebase',
    name: 'Firebase',
    category: 'serverless',
    detectionPatterns: {
      files: ['firebase.json', 'functions/'],
      dependencies: ['firebase-admin', 'firebase-functions'],
    },
    requiredFiles: [
      {
        path: 'firebase.json',
        required: true,
        canAutoGenerate: true,
        isSecret: false,
        description: 'Firebase configuration',
        templateContent: `{
  "hosting": {
    "public": "public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"]
  },
  "functions": {
    "source": "functions"
  }
}`,
      },
      {
        path: 'functions/index.js',
        required: true,
        canAutoGenerate: true,
        isSecret: false,
        description: 'Cloud Functions entry point',
      },
    ],
    optionalFiles: [
      {
        path: 'functions/.env',
        required: false,
        canAutoGenerate: true,
        isSecret: true,
        description: 'Function environment variables',
      },
    ],
    environmentVariables: [],
    validationCommands: ['firebase deploy --only functions --dry-run'],
    deploymentCommands: ['firebase deploy'],
    documentation: 'https://firebase.google.com/docs',
  },

  // ===== Traditional Deployments =====
  {
    id: 'bare-metal',
    name: 'Bare Metal / VM',
    category: 'traditional',
    detectionPatterns: {
      files: ['systemd/', 'nginx.conf'],
    },
    requiredFiles: [],
    optionalFiles: [
      {
        path: 'systemd/your-app.service',
        required: false,
        canAutoGenerate: true,
        isSecret: false,
        description: 'Systemd service file',
        templateContent: `[Unit]
Description=Your Application
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/opt/your-app
ExecStart=/usr/bin/node /opt/your-app/dist/index.js
Restart=always

[Install]
WantedBy=multi-user.target`,
      },
    ],
    environmentVariables: [],
    validationCommands: [],
    deploymentCommands: ['systemctl enable your-app', 'systemctl start your-app'],
    documentation: '',
  },
];

/**
 * Detect deployment types based on project structure
 */
export async function detectDeploymentTypes(projectPath: string): Promise<DeploymentType[]> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const detectedTypes: DeploymentType[] = [];

  for (const deploymentType of DEPLOYMENT_TYPES) {
    let matches = 0;
    let totalChecks = 0;

    // Check file patterns
    if (deploymentType.detectionPatterns.files) {
      for (const filePattern of deploymentType.detectionPatterns.files) {
        totalChecks++;
        try {
          const filePath = path.join(projectPath, filePattern);
          await fs.access(filePath);
          matches++;
        } catch {
          // File doesn't exist
        }
      }
    }

    // Check dependencies in package.json
    if (deploymentType.detectionPatterns.dependencies) {
      totalChecks++;
      try {
        const packageJsonPath = path.join(projectPath, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };

        const hasAllDeps = deploymentType.detectionPatterns.dependencies.every(
          dep => dep in allDeps
        );
        if (hasAllDeps) {
          matches++;
        }
      } catch {
        // package.json doesn't exist or can't be parsed
      }
    }

    // If we have matches, consider this deployment type detected
    if (matches > 0 && totalChecks > 0) {
      detectedTypes.push(deploymentType);
    }
  }

  return detectedTypes;
}

/**
 * Get all required files for detected deployment types
 */
export function getRequiredFilesForDeployments(
  deploymentTypes: DeploymentType[]
): DeploymentFile[] {
  const allFiles = new Map<string, DeploymentFile>();

  for (const deployment of deploymentTypes) {
    for (const file of [...deployment.requiredFiles, ...deployment.optionalFiles]) {
      if (!allFiles.has(file.path)) {
        allFiles.set(file.path, file);
      }
    }
  }

  return Array.from(allFiles.values());
}
