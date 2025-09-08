import {
  generateEnvironmentSpecAnalysisPrompt,
  generateContainerizationDetectionPrompt,
  generateAdrEnvironmentRequirementsPrompt,
  generateEnvironmentCompliancePrompt,
} from '../../src/prompts/environment-analysis-prompts.js';

describe('Environment Analysis Prompts', () => {
  describe('generateEnvironmentSpecAnalysisPrompt', () => {
    const mockEnvironmentFiles = [
      {
        filename: 'Dockerfile',
        content: 'FROM node:18\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install',
        type: 'dockerfile' as const,
      },
      {
        filename: 'docker-compose.yml',
        content: 'version: "3.8"\nservices:\n  app:\n    build: .',
        type: 'compose' as const,
      },
    ];

    const mockProjectStructure = `
project/
├── src/
│   ├── index.ts
│   └── utils/
├── tests/
├── package.json
└── Dockerfile
    `;

    it('should generate a comprehensive analysis prompt with environment files', () => {
      const result = generateEnvironmentSpecAnalysisPrompt(mockEnvironmentFiles, mockProjectStructure);

      expect(result).toContain('System Environment Specification Analysis Guide');
      expect(result).toContain('Environment Files');
      expect(result).toContain('Dockerfile');
      expect(result).toContain('docker-compose.yml');
      expect(result).toContain('FROM node:18');
      expect(result).toContain('Project Structure');
      expect(result).toContain(mockProjectStructure);
    });

    it('should handle empty environment files array', () => {
      const result = generateEnvironmentSpecAnalysisPrompt([], mockProjectStructure);

      expect(result).toContain('System Environment Specification Analysis Guide');
      expect(result).toContain('Project Structure');
      expect(result).toContain(mockProjectStructure);
      expect(result).not.toContain('### 1.');
    });

    it('should handle empty project structure', () => {
      const result = generateEnvironmentSpecAnalysisPrompt(mockEnvironmentFiles, '');

      expect(result).toContain('System Environment Specification Analysis Guide');
      expect(result).toContain('Environment Files');
      expect(result).toContain('Dockerfile');
      expect(result).toContain('docker-compose.yml');
    });

    it('should include all supported file types', () => {
      const allFileTypes = [
        { filename: 'Dockerfile', content: 'FROM alpine', type: 'dockerfile' as const },
        { filename: 'docker-compose.yml', content: 'version: "3"', type: 'compose' as const },
        { filename: 'deployment.yaml', content: 'apiVersion: apps/v1', type: 'kubernetes' as const },
        { filename: 'main.tf', content: 'resource "aws_instance"', type: 'terraform' as const },
        { filename: '.env', content: 'NODE_ENV=production', type: 'config' as const },
        { filename: 'setup.sh', content: '#!/bin/bash', type: 'other' as const },
      ];

      const result = generateEnvironmentSpecAnalysisPrompt(allFileTypes, mockProjectStructure);

      expect(result).toContain('Dockerfile');
      expect(result).toContain('docker-compose.yml');
      expect(result).toContain('deployment.yaml');
      expect(result).toContain('main.tf');
      expect(result).toContain('.env');
      expect(result).toContain('setup.sh');
    });

    it('should include JSON output format specification', () => {
      const result = generateEnvironmentSpecAnalysisPrompt(mockEnvironmentFiles, mockProjectStructure);

      expect(result).toContain('JSON');
      expect(result).toContain('analysis');
      expect(result).toContain('recommendations');
      expect(result).toContain('environmentType');
    });

    it('should handle special characters in file content', () => {
      const specialFiles = [
        {
          filename: 'special.yml',
          content: 'key: "value with $pecial ch@rs & symbols!"',
          type: 'config' as const,
        },
      ];

      const result = generateEnvironmentSpecAnalysisPrompt(specialFiles, mockProjectStructure);

      expect(result).toContain('special.yml');
      expect(result).toContain('$pecial ch@rs & symbols!');
    });

    it('should handle large file content', () => {
      const largeContent = 'A'.repeat(10000);
      const largeFiles = [
        {
          filename: 'large.dockerfile',
          content: largeContent,
          type: 'dockerfile' as const,
        },
      ];

      const result = generateEnvironmentSpecAnalysisPrompt(largeFiles, mockProjectStructure);

      expect(result).toContain('large.dockerfile');
      expect(result).toContain('AAAAAAA'); // Check for part of large content
      expect(result.length).toBeGreaterThan(5000);
    });
  });

  describe('generateContainerizationDetectionPrompt', () => {
    const mockProjectFiles = [
      { filename: 'Dockerfile', content: 'FROM node:18', path: 'Dockerfile' },
      { filename: 'package.json', content: '{"name": "test-app"}', path: 'package.json' },
      { filename: 'index.js', content: 'console.log("Hello World")', path: 'src/index.js' },
    ];

    it('should generate containerization detection prompt with project files', () => {
      const result = generateContainerizationDetectionPrompt(mockProjectFiles);

      expect(result).toContain('Containerization Technology Detection');
      expect(result).toContain('Project Files');
      expect(result).toContain('Dockerfile');
      expect(result).toContain('FROM node:18');
      expect(result).toContain('package.json');
    });

    it('should handle empty project files array', () => {
      const result = generateContainerizationDetectionPrompt([]);

      expect(result).toContain('Containerization Technology Detection');
      expect(result).toContain('Project Files');
      expect(result).toContain('Project Files');
    });

    it('should include detection criteria for various container technologies', () => {
      const result = generateContainerizationDetectionPrompt(mockProjectFiles);

      expect(result).toContain('Docker');
      expect(result).toContain('Kubernetes');
      expect(result).toContain('Container Technologies');
      expect(result).toContain('Detection Requirements');
    });

    it('should include JSON output format for detection results', () => {
      const result = generateContainerizationDetectionPrompt(mockProjectFiles);

      expect(result).toContain('JSON');
      expect(result).toContain('containerization');
      expect(result).toContain('detected');
    });

    it('should handle files with no containerization indicators', () => {
      const nonContainerFiles = [
        { filename: 'README.md', content: '# My Project', path: 'README.md' },
        { filename: 'utils.js', content: 'export const helper = () => {}', path: 'src/utils.js' },
      ];

      const result = generateContainerizationDetectionPrompt(nonContainerFiles);

      expect(result).toContain('Containerization Technology Detection');
      expect(result).toContain('README.md');
      expect(result).toContain('src/utils.js');
    });

    it('should handle multiple containerization files', () => {
      const containerFiles = [
        { filename: 'Dockerfile', content: 'FROM alpine', path: 'Dockerfile' },
        { filename: 'docker-compose.yml', content: 'version: "3"', path: 'docker-compose.yml' },
        { filename: 'deployment.yaml', content: 'apiVersion: apps/v1', path: 'k8s/deployment.yaml' },
        { filename: '.dockerignore', content: 'node_modules', path: '.dockerignore' },
      ];

      const result = generateContainerizationDetectionPrompt(containerFiles);

      expect(result).toContain('Dockerfile');
      expect(result).toContain('docker-compose.yml');
      expect(result).toContain('k8s/deployment.yaml');
      expect(result).toContain('.dockerignore');
    });

    it('should handle special characters in file paths and content', () => {
      const specialFiles = [
        { filename: 'special-file@2.0.dockerfile', content: 'FROM node:18-alpine', path: 'special-file@2.0.dockerfile' },
        { filename: 'app.env', content: 'DB_URL=postgres://user:pass@host:5432/db', path: 'config/app.env' },
      ];

      const result = generateContainerizationDetectionPrompt(specialFiles);

      expect(result).toContain('special-file@2.0.dockerfile');
      expect(result).toContain('config/app.env');
      expect(result).toContain('postgres://user:pass@host:5432/db');
    });
  });

  describe('generateAdrEnvironmentRequirementsPrompt', () => {
    const mockAdrFiles = [
      {
        id: 'ADR-001',
        title: 'Use Microservices Architecture',
        content: `# ADR-001: Use Microservices Architecture

## Status
Accepted

## Context
We need to scale our application to handle increased load.

## Decision
We will adopt a microservices architecture using Docker containers and Kubernetes for orchestration.

## Consequences
- Improved scalability
- Increased operational complexity
- Need for container orchestration platform`,
        status: 'Accepted',
      },
    ];

    it('should generate ADR environment requirements prompt', () => {
      const result = generateAdrEnvironmentRequirementsPrompt(mockAdrFiles);

      expect(result).toContain('Environment Requirements Analysis from ADRs');
      expect(result).toContain('ADR Files');
      expect(result).toContain('Use Microservices Architecture');
      expect(result).toContain('ADR-001');
      expect(result).toContain('Accepted');
    });

    it('should handle empty ADR files array', () => {
      const result = generateAdrEnvironmentRequirementsPrompt([]);

      expect(result).toContain('Environment Requirements Analysis from ADRs');
      expect(result).toContain('ADR Files');
    });

    it('should include environment requirements extraction guidelines', () => {
      const result = generateAdrEnvironmentRequirementsPrompt(mockAdrFiles);

      expect(result).toContain('Requirements Extraction');
      expect(result).toContain('Infrastructure Requirements');
      expect(result).toContain('Platform Requirements');
      expect(result).toContain('Security & Compliance');
    });

    it('should include JSON output format specification', () => {
      const result = generateAdrEnvironmentRequirementsPrompt(mockAdrFiles);

      expect(result).toContain('JSON');
      expect(result).toContain('environmentRequirements');
      expect(result).toContain('infrastructure');
    });

    it('should handle multiple ADR files', () => {
      const multipleAdrs = [
        {
          id: 'ADR-001',
          title: 'Database Selection',
          content: 'Use PostgreSQL with Redis for caching.',
          status: 'Accepted',
        },
        {
          id: 'ADR-002',
          title: 'Deployment Strategy',
          content: 'Use Kubernetes with Helm charts for deployment.',
          status: 'Proposed',
        },
        {
          id: 'ADR-003',
          title: 'Monitoring',
          content: 'Implement Prometheus and Grafana for monitoring.',
          status: 'Accepted',
        },
      ];

      const result = generateAdrEnvironmentRequirementsPrompt(multipleAdrs);

      expect(result).toContain('Database Selection');
      expect(result).toContain('Deployment Strategy');
      expect(result).toContain('Monitoring');
      expect(result).toContain('PostgreSQL');
      expect(result).toContain('Kubernetes');
      expect(result).toContain('Prometheus');
    });

    it('should truncate long ADR content', () => {
      const longContent = 'A'.repeat(2000);
      const longAdr = [
        {
          id: 'ADR-001',
          title: 'Long ADR',
          content: longContent,
          status: 'Accepted',
        },
      ];

      const result = generateAdrEnvironmentRequirementsPrompt(longAdr);

      expect(result).toContain('Long ADR');
      expect(result).toContain('(truncated)');
    });

    it('should handle special characters in ADR content', () => {
      const specialAdr = [
        {
          id: 'ADR-001',
          title: 'Special Characters & Symbols',
          content: 'Content with $pecial ch@rs & symbols!',
          status: 'Accepted',
        },
      ];

      const result = generateAdrEnvironmentRequirementsPrompt(specialAdr);

      expect(result).toContain('Special Characters & Symbols');
      expect(result).toContain('$pecial ch@rs & symbols!');
    });
  });

  describe('generateEnvironmentCompliancePrompt', () => {
    const mockEnvironmentConfig = {
      containerization: {
        docker: {
          version: '20.10.0',
          images: ['node:18-alpine', 'postgres:14'],
        },
        kubernetes: {
          version: '1.24.0',
          resources: ['deployment', 'service', 'ingress'],
        },
      },
      infrastructure: {
        cloud_provider: 'AWS',
        regions: ['us-east-1', 'us-west-2'],
        services: ['ECS', 'RDS', 'ElastiCache'],
      },
    };

    const mockComplianceStandards = [
      {
        name: 'SOC 2',
        requirements: ['Data encryption', 'Access controls', 'Monitoring'],
      },
      {
        name: 'GDPR',
        requirements: ['Data privacy', 'Right to deletion', 'Consent management'],
      },
    ];

    it('should generate environment compliance analysis prompt', () => {
      const result = generateEnvironmentCompliancePrompt(mockEnvironmentConfig, mockComplianceStandards);

      expect(result).toContain('Environment Compliance Assessment');
      expect(result).toContain('Current Environment');
      expect(result).toContain('Requirements');
      expect(result).toContain('SOC 2');
      expect(result).toContain('GDPR');
    });

    it('should handle empty environment configuration', () => {
      const result = generateEnvironmentCompliancePrompt({}, mockComplianceStandards);

      expect(result).toContain('Environment Compliance Assessment');
      expect(result).toContain('Requirements');
      expect(result).toContain('SOC 2');
      expect(result).toContain('GDPR');
    });

    it('should handle empty compliance standards', () => {
      const result = generateEnvironmentCompliancePrompt(mockEnvironmentConfig, []);

      expect(result).toContain('Environment Compliance Assessment');
      expect(result).toContain('Current Environment');
      expect(result).toContain('docker');
      expect(result).toContain('kubernetes');
    });

    it('should include compliance assessment guidelines', () => {
      const result = generateEnvironmentCompliancePrompt(mockEnvironmentConfig, mockComplianceStandards);

      expect(result).toContain('compliance');
      expect(result).toContain('assessment');
      expect(result).toContain('Assessment Guidelines');
      expect(result).toContain('Objective Evaluation');
    });

    it('should include JSON output format specification', () => {
      const result = generateEnvironmentCompliancePrompt(mockEnvironmentConfig, mockComplianceStandards);

      expect(result).toContain('JSON');
      expect(result).toContain('complianceAssessment');
      expect(result).toContain('violations');
      expect(result).toContain('recommendations');
    });

    it('should handle complex nested environment configuration', () => {
      const complexConfig = {
        containerization: {
          docker: { version: '20.10.0' },
          podman: { version: '4.0.0' },
        },
        infrastructure: {
          cloud_provider: 'Multi-cloud',
          aws: { regions: ['us-east-1'], services: ['ECS'] },
          gcp: { regions: ['us-central1'], services: ['GKE'] },
          azure: { regions: ['eastus'], services: ['AKS'] },
        },
        security: {
          encryption: { at_rest: true, in_transit: true },
          authentication: { methods: ['OAuth2', 'SAML'] },
          monitoring: { tools: ['Prometheus', 'Grafana'] },
        },
      };

      const result = generateEnvironmentCompliancePrompt(complexConfig, mockComplianceStandards);

      expect(result).toContain('Multi-cloud');
      expect(result).toContain('OAuth2');
      expect(result).toContain('Prometheus');
      expect(result).toContain('encryption');
    });

    it('should handle multiple compliance standards with detailed requirements', () => {
      const detailedStandards = [
        {
          name: 'ISO 27001',
          requirements: [
            'Information security management system',
            'Risk assessment and treatment',
            'Security controls implementation',
            'Continuous monitoring and improvement',
          ],
        },
        {
          name: 'NIST Cybersecurity Framework',
          requirements: [
            'Identify assets and risks',
            'Protect critical infrastructure',
            'Detect security events',
            'Respond to incidents',
            'Recover from disruptions',
          ],
        },
      ];

      const result = generateEnvironmentCompliancePrompt(mockEnvironmentConfig, detailedStandards);

      expect(result).toContain('ISO 27001');
      expect(result).toContain('NIST Cybersecurity Framework');
      expect(result).toContain('Risk assessment');
      expect(result).toContain('Detect security events');
    });

    it('should handle special characters in configuration and standards', () => {
      const specialConfig = {
        'app-name': 'test@app-v2.0',
        'database-url': 'postgres://user:p@ss@host:5432/db',
      };

      const specialStandards = [
        {
          name: 'Custom Standard (v2.1)',
          requirements: ['Requirement #1', 'Requirement @2', 'Requirement & More'],
        },
      ];

      const result = generateEnvironmentCompliancePrompt(specialConfig, specialStandards);

      expect(result).toContain('test@app-v2.0');
      expect(result).toContain('postgres://user:p@ss@host:5432/db');
      expect(result).toContain('Custom Standard (v2.1)');
      expect(result).toContain('Requirement #1');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined inputs appropriately', () => {
      // Functions that use .map() on arrays should throw with null/undefined
      expect(() => generateEnvironmentSpecAnalysisPrompt(null as any, null as any)).toThrow();
      expect(() => generateEnvironmentSpecAnalysisPrompt(undefined as any, undefined as any)).toThrow();
      expect(() => generateContainerizationDetectionPrompt(null as any)).toThrow();
      expect(() => generateContainerizationDetectionPrompt(undefined as any)).toThrow();
      expect(() => generateAdrEnvironmentRequirementsPrompt(null as any)).toThrow();
      expect(() => generateAdrEnvironmentRequirementsPrompt(undefined as any)).toThrow();
      
      // Function that uses JSON.stringify() should handle null/undefined gracefully
      expect(() => generateEnvironmentCompliancePrompt(null as any, null as any)).not.toThrow();
      expect(() => generateEnvironmentCompliancePrompt(undefined as any, undefined as any)).not.toThrow();
    });

    it('should handle extremely large inputs', () => {
      const largeString = 'A'.repeat(100000);
      const largeArray = Array(1000).fill({ filename: 'test.txt', content: largeString, type: 'other' });

      expect(() => generateEnvironmentSpecAnalysisPrompt(largeArray, largeString)).not.toThrow();
      expect(() => generateContainerizationDetectionPrompt(Array(1000).fill({ filename: 'test.js', content: largeString, path: 'test.js' }))).not.toThrow();
    });

    it('should handle unicode and special encoding characters', () => {
      const unicodeFiles = [
        { filename: '测试.dockerfile', content: 'FROM alpine # 中文注释', type: 'dockerfile' as const },
        { filename: 'файл.yml', content: 'ключ: значение', type: 'config' as const },
      ];

      const result = generateEnvironmentSpecAnalysisPrompt(unicodeFiles, '项目结构');

      expect(result).toContain('测试.dockerfile');
      expect(result).toContain('中文注释');
      expect(result).toContain('файл.yml');
      expect(result).toContain('项目结构');
    });

    it('should maintain consistent output format across all functions', () => {
      const results = [
        generateEnvironmentSpecAnalysisPrompt([], ''),
        generateContainerizationDetectionPrompt([]),
        generateAdrEnvironmentRequirementsPrompt([]),
        generateEnvironmentCompliancePrompt({}, []),
      ];

      results.forEach(result => {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        expect(
          result.includes('Environment') || 
          result.includes('Containerization') || 
          result.includes('Requirements') || 
          result.includes('Compliance')
        ).toBe(true);
      });
    });
  });
});
