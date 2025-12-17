/**
 * Unit tests for deployment-guidance-tool.ts
 * Tests the generateDeploymentGuidance function with comprehensive scenarios
 */

import { describe, it, expect, _beforeEach, _afterEach, vi, MockedFunction } from 'vitest';
import { McpAdrError } from '../../src/types/index.js';

// Pragmatic mocking approach to avoid TypeScript complexity
vi.mock('../../src/utils/adr-discovery.js', () => ({
  discoverAdrsInDirectory: vi.fn(),
}));

const { generateDeploymentGuidance } = await import('../../src/tools/deployment-guidance-tool.js');
const { discoverAdrsInDirectory } = await import('../../src/utils/adr-discovery.js');

describe('deployment-guidance-tool', () => {
  describe('generateDeploymentGuidance', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe('basic functionality', () => {
      it('should generate deployment guidance with default parameters', async () => {
        const mockAdrs = [
          {
            title: 'Use Docker for Containerization',
            filename: 'ADR-001-docker.md',
            status: 'Accepted',
            content: 'We will use Docker containers for consistent deployment across environments.',
            date: '2024-01-01',
            path: '/test/ADR-001-docker.md',
          },
        ];

        (
          discoverAdrsInDirectory as MockedFunction<typeof discoverAdrsInDirectory>
        ).mockResolvedValue({
          adrs: mockAdrs,
          summary: { byStatus: { Accepted: 1 }, byCategory: {} },
          directory: 'docs/adrs',
          totalAdrs: 1,
          recommendations: [],
        } as any);

        const result = await generateDeploymentGuidance({});

        expect(discoverAdrsInDirectory).toHaveBeenCalledWith('docs/adrs', process.cwd(), {
          includeContent: true,
          includeTimeline: false,
        });
        expect(result).toHaveProperty('content');
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content[0]).toHaveProperty('type', 'text');
        expect(result.content[0].text).toContain('Deployment Guidance Generation');
        expect(result.content[0].text).toContain('Found 1 ADRs');
        expect(result.content[0].text).toContain('**Target Environment**: production');
        expect(result.content[0].text).toContain('Use Docker for Containerization');
      }, 30000); // Increased timeout to 30s for Node.js 22 compatibility

      it('should handle custom ADR directory and project path', async () => {
        const mockAdrs = [
          {
            title: 'Database Selection',
            filename: 'ADR-002-database.md',
            status: 'Accepted',
            content: 'We will use PostgreSQL as our primary database.',
            date: '2024-01-01',
            path: '/test/ADR-002-database.md',
          },
        ];

        (
          discoverAdrsInDirectory as MockedFunction<typeof discoverAdrsInDirectory>
        ).mockResolvedValue({
          adrs: mockAdrs,
          summary: { byStatus: { Accepted: 1 }, byCategory: {} },
          directory: 'custom/adrs',
          totalAdrs: 1,
          recommendations: [],
        } as any);

        const result = await generateDeploymentGuidance({
          adrDirectory: 'custom/adrs',
          projectPath: '/custom/project',
        });

        expect(discoverAdrsInDirectory).toHaveBeenCalledWith('custom/adrs', '/custom/project', {
          includeContent: true,
          includeTimeline: false,
        });
        expect(result.content[0].text).toContain('**ADR Directory**: custom/adrs');
        expect(result.content[0].text).toContain('Database Selection');
      });

      it('should handle different environments', async () => {
        const mockAdrs = [
          {
            title: 'Load Balancer Configuration',
            filename: 'ADR-003-loadbalancer.md',
            status: 'Accepted',
            content: 'We will use Nginx as our load balancer for high availability.',
            date: '2024-01-01',
            path: '/test/ADR-003-loadbalancer.md',
          },
        ];

        (
          discoverAdrsInDirectory as MockedFunction<typeof discoverAdrsInDirectory>
        ).mockResolvedValue({
          adrs: mockAdrs,
          summary: { byStatus: { Accepted: 1 }, byCategory: {} },
          directory: 'docs/adrs',
          totalAdrs: 1,
          recommendations: [],
        } as any);

        const result = await generateDeploymentGuidance({
          environment: 'staging',
        });

        expect(result.content[0].text).toContain('**Target Environment**: staging');
        expect(result.content[0].text).toContain('Testing**: Staging-specific configurations');
        expect(result.content[0].text).toContain('Load Balancer Configuration');
      }, 30000);

      it('should handle development environment specifics', async () => {
        const mockAdrs = [
          {
            title: 'Development Setup',
            filename: 'ADR-004-dev.md',
            status: 'Accepted',
            content: 'Development environment will use hot-reload and local services.',
            date: '2024-01-01',
            path: '/test/ADR-004-dev.md',
          },
        ];

        (
          discoverAdrsInDirectory as MockedFunction<typeof discoverAdrsInDirectory>
        ).mockResolvedValue({
          adrs: mockAdrs,
          summary: { byStatus: { Accepted: 1 }, byCategory: {} },
          directory: 'docs/adrs',
          totalAdrs: 1,
          recommendations: [],
        } as any);

        const result = await generateDeploymentGuidance({
          environment: 'development',
        });

        expect(result.content[0].text).toContain('**Target Environment**: development');
        expect(result.content[0].text).toContain(
          'Development**: Hot-reload, debugging, local services'
        );
        expect(result.content[0].text).toContain('Development Setup');
      });
    });

    describe('configuration options', () => {
      it('should handle all configuration flags enabled', async () => {
        const mockAdrs = [
          {
            title: 'Complete Infrastructure',
            filename: 'ADR-005-infra.md',
            status: 'Accepted',
            content:
              'Complete infrastructure setup with monitoring, security, and rollback procedures.',
            date: '2024-01-01',
            path: '/test/ADR-005-infra.md',
          },
        ];

        (
          discoverAdrsInDirectory as MockedFunction<typeof discoverAdrsInDirectory>
        ).mockResolvedValue({
          adrs: mockAdrs,
          summary: { byStatus: { Accepted: 1 }, byCategory: {} },
          directory: 'docs/adrs',
          totalAdrs: 1,
          recommendations: [],
        } as any);

        const result = await generateDeploymentGuidance({
          includeScripts: true,
          includeConfigs: true,
          includeValidation: true,
          includeRollback: true,
          generateFiles: true,
        });

        expect(result.content[0].text).toContain('**Include Scripts**: true');
        expect(result.content[0].text).toContain('**Include Configs**: true');
        expect(result.content[0].text).toContain('**Include Validation**: true');
        expect(result.content[0].text).toContain('**Include Rollback**: true');
        expect(result.content[0].text).toContain('File Generation Mode');
        expect(result.content[0].text).toContain('Script Generation');
        expect(result.content[0].text).toContain('Validation & Health Checks');
        expect(result.content[0].text).toContain('Rollback Procedures');
      });

      it('should handle configuration flags disabled', async () => {
        const mockAdrs = [
          {
            title: 'Minimal Setup',
            filename: 'ADR-006-minimal.md',
            status: 'Accepted',
            content: 'Minimal deployment setup without additional scripts or validation.',
            date: '2024-01-01',
            path: '/test/ADR-006-minimal.md',
          },
        ];

        (
          discoverAdrsInDirectory as MockedFunction<typeof discoverAdrsInDirectory>
        ).mockResolvedValue({
          adrs: mockAdrs,
          summary: { byStatus: { Accepted: 1 }, byCategory: {} },
          directory: 'docs/adrs',
          totalAdrs: 1,
          recommendations: [],
        } as any);

        const result = await generateDeploymentGuidance({
          includeScripts: false,
          includeConfigs: false,
          includeValidation: false,
          includeRollback: false,
          generateFiles: false,
        });

        expect(result.content[0].text).toContain('**Include Scripts**: false');
        expect(result.content[0].text).toContain('**Include Configs**: false');
        expect(result.content[0].text).toContain('**Include Validation**: false');
        expect(result.content[0].text).toContain('**Include Rollback**: false');
        expect(result.content[0].text).not.toContain('Script Generation');
        expect(result.content[0].text).not.toContain('Validation & Health Checks');
        expect(result.content[0].text).not.toContain('Rollback Procedures');
        expect(result.content[0].text).not.toContain('File Generation Mode');
      });

      it('should handle technology filter', async () => {
        const mockAdrs = [
          {
            title: 'Technology Stack',
            filename: 'ADR-007-tech.md',
            status: 'Accepted',
            content: 'Using Node.js, PostgreSQL, and Docker for our technology stack.',
            date: '2024-01-01',
            path: '/test/ADR-007-tech.md',
          },
        ];

        (
          discoverAdrsInDirectory as MockedFunction<typeof discoverAdrsInDirectory>
        ).mockResolvedValue({
          adrs: mockAdrs,
          summary: { byStatus: { Accepted: 1 }, byCategory: {} },
          directory: 'docs/adrs',
          totalAdrs: 1,
          recommendations: [],
        } as any);

        const result = await generateDeploymentGuidance({
          technologyFilter: ['Node.js', 'PostgreSQL', 'Docker'],
        });

        expect(result.content[0].text).toContain('Technology Filter');
        expect(result.content[0].text).toContain(
          'Focus only on these technologies: Node.js, PostgreSQL, Docker'
        );
        expect(result.content[0].text).toContain('Technology Stack');
      });

      it('should handle custom requirements', async () => {
        const mockAdrs = [
          {
            title: 'Security Requirements',
            filename: 'ADR-008-security.md',
            status: 'Accepted',
            content: 'Security requirements including TLS, authentication, and monitoring.',
            date: '2024-01-01',
            path: '/test/ADR-008-security.md',
          },
        ];

        (
          discoverAdrsInDirectory as MockedFunction<typeof discoverAdrsInDirectory>
        ).mockResolvedValue({
          adrs: mockAdrs,
          summary: { byStatus: { Accepted: 1 }, byCategory: {} },
          directory: 'docs/adrs',
          totalAdrs: 1,
          recommendations: [],
        } as any);

        const result = await generateDeploymentGuidance({
          customRequirements: ['GDPR compliance', 'High availability', 'Automated backups'],
        });

        expect(result.content[0].text).toContain('Custom Requirements');
        expect(result.content[0].text).toContain('- GDPR compliance');
        expect(result.content[0].text).toContain('- High availability');
        expect(result.content[0].text).toContain('- Automated backups');
        expect(result.content[0].text).toContain('Security Requirements');
      });
    });

    describe('no ADRs found scenario', () => {
      it('should provide helpful guidance when no ADRs are found', async () => {
        (
          discoverAdrsInDirectory as MockedFunction<typeof discoverAdrsInDirectory>
        ).mockResolvedValue({
          adrs: [],
          summary: { byStatus: {}, byCategory: {} },
          directory: 'custom/adrs',
          totalAdrs: 0,
          recommendations: [],
        } as any);

        const result = await generateDeploymentGuidance({
          adrDirectory: 'custom/adrs',
          projectPath: '/test/project',
        });

        expect(result.content[0].text).toContain('No ADRs Found for Deployment Guidance');
        expect(result.content[0].text).toContain('**ADR Directory**: custom/adrs');
        expect(result.content[0].text).toContain('**Project Path**: /test/project');
        expect(result.content[0].text).toContain('Recommendations');
        expect(result.content[0].text).toContain('Create ADRs with deployment-relevant decisions');
        expect(result.content[0].text).toContain('Example ADR for Deployment');
        expect(result.content[0].text).toContain('Use Docker for Containerization');
      });

      it('should use default paths when no ADRs found', async () => {
        (
          discoverAdrsInDirectory as MockedFunction<typeof discoverAdrsInDirectory>
        ).mockResolvedValue({
          adrs: [],
          summary: { byStatus: {}, byCategory: {} },
          directory: 'docs/adrs',
          totalAdrs: 0,
          recommendations: [],
        } as any);

        const result = await generateDeploymentGuidance({});

        expect(result.content[0].text).toContain('**ADR Directory**: docs/adrs');
        expect(result.content[0].text).toContain(`**Project Path**: ${process.cwd()}`);
      });
    });

    describe('error handling', () => {
      it('should throw McpAdrError when ADR discovery fails', async () => {
        const discoveryError = new Error('Failed to access directory');
        (
          discoverAdrsInDirectory as MockedFunction<typeof discoverAdrsInDirectory>
        ).mockRejectedValue(discoveryError);

        await expect(generateDeploymentGuidance({})).rejects.toThrow(McpAdrError);
        await expect(generateDeploymentGuidance({})).rejects.toThrow(
          'Deployment guidance generation failed: Failed to access directory'
        );
      });

      it('should handle non-Error exceptions', async () => {
        (
          discoverAdrsInDirectory as MockedFunction<typeof discoverAdrsInDirectory>
        ).mockRejectedValue('String error');

        await expect(generateDeploymentGuidance({})).rejects.toThrow(McpAdrError);
        await expect(generateDeploymentGuidance({})).rejects.toThrow(
          'Deployment guidance generation failed: String error'
        );
      });

      it('should handle undefined error', async () => {
        (
          discoverAdrsInDirectory as MockedFunction<typeof discoverAdrsInDirectory>
        ).mockRejectedValue(undefined);

        await expect(generateDeploymentGuidance({})).rejects.toThrow(McpAdrError);
        await expect(generateDeploymentGuidance({})).rejects.toThrow(
          'Deployment guidance generation failed: undefined'
        );
      });
    });

    describe('comprehensive scenarios', () => {
      it('should generate comprehensive production deployment guidance', async () => {
        const mockAdrs = [
          {
            title: 'Production Architecture',
            filename: 'ADR-016-prod.md',
            status: 'Accepted',
            content: 'Production setup with Docker, PostgreSQL, Redis, Nginx, and monitoring.',
            date: '2024-01-01',
            path: '/test/ADR-016-prod.md',
          },
        ];

        (
          discoverAdrsInDirectory as MockedFunction<typeof discoverAdrsInDirectory>
        ).mockResolvedValue({
          adrs: mockAdrs,
          summary: { byStatus: { Accepted: 1 }, byCategory: {} },
          directory: 'docs/adrs',
          totalAdrs: 1,
          recommendations: [],
        } as any);

        const result = await generateDeploymentGuidance({
          environment: 'production',
          format: 'all',
          includeScripts: true,
          includeConfigs: true,
          includeValidation: true,
          includeRollback: true,
          generateFiles: true,
          technologyFilter: ['Docker', 'PostgreSQL', 'Nginx'],
          customRequirements: ['High availability', 'Security compliance'],
        });

        const content = result.content[0].text;

        // Verify all production-specific elements
        expect(content).toContain('**Target Environment**: production');
        expect(content).toContain('Security**: TLS certificates, secure connections');
        expect(content).toContain('Performance**: Load balancing, caching');
        expect(content).toContain('Reliability**: Backup procedures, monitoring');
        expect(content).toContain('Technology Filter');
        expect(content).toContain('Docker, PostgreSQL, Nginx');
        expect(content).toContain('Custom Requirements');
        expect(content).toContain('High availability');
        expect(content).toContain('Security compliance');
        expect(content).toContain('File Generation Mode');
        expect(content).toContain('Production Architecture');
      });

      it('should handle complex project structure', async () => {
        const mockAdrs = [
          {
            title: 'Microservices Architecture',
            filename: 'ADR-017-microservices.md',
            status: 'Accepted',
            content: 'Adopting microservices architecture with service mesh and API gateway.',
            date: '2024-01-01',
            path: '/test/ADR-017-microservices.md',
          },
          {
            title: 'Database Per Service',
            filename: 'ADR-018-db-per-service.md',
            status: 'Accepted',
            content: 'Each microservice will have its own database for data isolation.',
            date: '2024-01-01',
            path: '/test/ADR-018-db-per-service.md',
          },
        ];

        (
          discoverAdrsInDirectory as MockedFunction<typeof discoverAdrsInDirectory>
        ).mockResolvedValue({
          adrs: mockAdrs,
          summary: { byStatus: { Accepted: 2 }, byCategory: {} },
          directory: 'docs/adrs',
          totalAdrs: 2,
          recommendations: [],
        } as any);

        const result = await generateDeploymentGuidance({
          projectPath: '/complex/microservices/project',
          environment: 'staging',
        });

        expect(result.content[0].text).toContain('Found 2 ADRs');
        expect(result.content[0].text).toContain('Microservices Architecture');
        expect(result.content[0].text).toContain('Database Per Service');
        expect(result.content[0].text).toContain('Testing**: Staging-specific configurations');
      });
    });

    describe('output structure validation', () => {
      it('should always return proper content structure', async () => {
        const mockAdrs = [
          {
            title: 'Structure Test',
            filename: 'ADR-019-structure.md',
            status: 'Accepted',
            content: 'Testing output structure consistency.',
            date: '2024-01-01',
            path: '/test/ADR-019-structure.md',
          },
        ];

        (
          discoverAdrsInDirectory as MockedFunction<typeof discoverAdrsInDirectory>
        ).mockResolvedValue({
          adrs: mockAdrs,
          summary: { byStatus: { Accepted: 1 }, byCategory: {} },
          directory: 'docs/adrs',
          totalAdrs: 1,
          recommendations: [],
        } as any);

        const result = await generateDeploymentGuidance({});

        // Verify structure
        expect(result).toHaveProperty('content');
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content).toHaveLength(1);
        expect(result.content[0]).toHaveProperty('type', 'text');
        expect(result.content[0]).toHaveProperty('text');
        expect(typeof result.content[0].text).toBe('string');
        expect(result.content[0].text.length).toBeGreaterThan(0);
      });

      it('should include all required sections in guidance', async () => {
        const mockAdrs = [
          {
            title: 'Complete Guidance Test',
            filename: 'ADR-020-complete.md',
            status: 'Accepted',
            content: 'Testing that all required sections are included in the guidance.',
            date: '2024-01-01',
            path: '/test/ADR-020-complete.md',
          },
        ];

        (
          discoverAdrsInDirectory as MockedFunction<typeof discoverAdrsInDirectory>
        ).mockResolvedValue({
          adrs: mockAdrs,
          summary: { byStatus: { Accepted: 1 }, byCategory: {} },
          directory: 'docs/adrs',
          totalAdrs: 1,
          recommendations: [],
        } as any);

        const result = await generateDeploymentGuidance({});
        const content = result.content[0].text;

        // Verify required sections
        expect(content).toContain('Deployment Guidance Generation');
        expect(content).toContain('Analysis Complete');
        expect(content).toContain('AI Analysis Prompt');
        expect(content).toContain('Instructions');
        expect(content).toContain('Expected Output');
        expect(content).toContain('ADR Sources');
        expect(content).toContain('Prerequisites');
        expect(content).toContain('Infrastructure Setup');
        expect(content).toContain('Database Setup');
        expect(content).toContain('Application Deployment');
        expect(content).toContain('Health Checks & Verification');
        expect(content).toContain('Troubleshooting');
      });
    });
  });
});
