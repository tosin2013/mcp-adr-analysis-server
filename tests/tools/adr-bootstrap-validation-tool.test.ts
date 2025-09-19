import { jest } from '@jest/globals';
import { generateAdrBootstrapScripts } from '../../src/tools/adr-bootstrap-validation-tool.js';
import { McpAdrError } from '../../src/types/index.js';
// import path from 'path';

// Mock the adr-discovery module
jest.mock('../../src/utils/adr-discovery.js', () => ({
  discoverAdrsInDirectory: jest.fn(),
}));

describe('ADR Bootstrap Validation Tool', () => {
  const mockProjectPath = '/test/project';
  const mockAdrDirectory = 'docs/adrs';

  const mockDiscoveryResult = {
    totalAdrs: 3,
    adrs: [
      {
        filename: 'adr-001.md',
        title: 'Use React for Frontend',
        status: 'accepted',
        content: `
# ADR-001: Use React for Frontend

## Status
Accepted

## Decision
We will use React as our frontend framework.

## Requirements
- The application must use React 18 or higher
- Components should follow functional component patterns
- State management shall use React hooks
- Testing coverage must be at least 80%

## Implementation Tasks
[ ] Set up React project
[x] Configure build pipeline
[ ] Implement component library
`,
      },
      {
        filename: 'adr-002.md',
        title: 'PostgreSQL for Database',
        status: 'accepted',
        content: `
# ADR-002: PostgreSQL for Database

## Status
Accepted

## Decision
We will use PostgreSQL as our primary database.

## Constraints
- Database must support ACID transactions
- Should handle concurrent connections
- Critical: Data integrity must be maintained
- Requirement: Automatic backup every 24 hours
`,
      },
      {
        filename: 'adr-003.md',
        title: 'JWT for Authentication',
        status: 'proposed',
        content: `
# ADR-003: JWT for Authentication

## Status
Proposed

## Approach
JWT tokens will be used for API authentication.

## Security Requirements
- Tokens must expire after 1 hour
- Refresh tokens shall be stored securely
- Warning: Sensitive data should not be in payload
`,
      },
    ],
    summary: {
      byStatus: {
        accepted: 2,
        proposed: 1,
        deprecated: 0,
        superseded: 0,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const { discoverAdrsInDirectory } = require('../../src/utils/adr-discovery.js');
    (discoverAdrsInDirectory as jest.Mock).mockResolvedValue(mockDiscoveryResult);
  });

  describe('generateAdrBootstrapScripts', () => {
    it('should generate both bootstrap and validation scripts by default', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: mockProjectPath,
        adrDirectory: mockAdrDirectory,
      });

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');

      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty('instructions');
      expect(response).toHaveProperty('scripts');
      expect(response.scripts).toHaveProperty('bootstrap');
      expect(response.scripts).toHaveProperty('validation');
      expect(response).toHaveProperty('complianceChecks');
      expect(response).toHaveProperty('adrSummary');
    });

    it('should generate only bootstrap script when specified', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: mockProjectPath,
        adrDirectory: mockAdrDirectory,
        scriptType: 'bootstrap',
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.scripts).toHaveProperty('bootstrap');
      expect(response.scripts).not.toHaveProperty('validation');
    });

    it('should generate only validation script when specified', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: mockProjectPath,
        adrDirectory: mockAdrDirectory,
        scriptType: 'validate',
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.scripts).toHaveProperty('validation');
      expect(response.scripts).not.toHaveProperty('bootstrap');
    });

    it('should include test phase when includeTests is true', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: mockProjectPath,
        includeTests: true,
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.scripts.bootstrap).toContain('Phase 3: Test Execution');
      expect(response.scripts.bootstrap).toContain('npm test');
    });

    it('should exclude test phase when includeTests is false', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: mockProjectPath,
        includeTests: false,
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.scripts.bootstrap).not.toContain('Phase 3: Test Execution');
    });

    it('should include deployment phase when includeDeployment is true', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: mockProjectPath,
        includeDeployment: true,
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.scripts.bootstrap).toContain('Phase 4: Deployment');
      expect(response.scripts.bootstrap).toContain('docker-compose');
    });

    it('should exclude deployment phase when includeDeployment is false', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: mockProjectPath,
        includeDeployment: false,
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.scripts.bootstrap).not.toContain('Phase 4: Deployment');
    });

    it('should include custom validations when provided', async () => {
      const customValidations = ['echo "Custom check 1"', 'test -f config.json'];

      const result = await generateAdrBootstrapScripts({
        projectPath: mockProjectPath,
        customValidations,
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.scripts.bootstrap).toContain('Custom Validations');
      expect(response.scripts.bootstrap).toContain('Custom check 1');
      expect(response.scripts.bootstrap).toContain('test -f config.json');
    });

    it('should extract compliance checks from ADR content', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: mockProjectPath,
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.complianceChecks).toBeInstanceOf(Array);
      expect(response.complianceChecks.length).toBeGreaterThan(0);

      // Check for specific requirements extracted
      const checks = response.complianceChecks;
      const reactCheck = checks.find((c: any) => c.requirement.includes('React'));
      expect(reactCheck).toBeDefined();

      const dbCheck = checks.find((c: any) => c.requirement.includes('PostgreSQL'));
      expect(dbCheck).toBeDefined();

      const jwtCheck = checks.find((c: any) => c.requirement.includes('JWT'));
      expect(jwtCheck).toBeDefined();
    });

    it('should assign correct severity levels to requirements', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: mockProjectPath,
      });

      const response = JSON.parse(result.content[0].text);
      const checks = response.complianceChecks;

      // Critical severity for "must" requirements
      const criticalCheck = checks.find((c: any) => c.requirement.includes('must'));
      expect(criticalCheck?.severity).toBe('critical');

      // Warning severity for "should" requirements
      const warningCheck = checks.find((c: any) => c.requirement.includes('should'));
      expect(warningCheck?.severity).toBe('warning');

      // Error severity for "shall" requirements
      const errorCheck = checks.find((c: any) => c.requirement.includes('shall'));
      expect(errorCheck?.severity).toBe('error');
    });

    it('should generate appropriate validation commands', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: mockProjectPath,
      });

      const response = JSON.parse(result.content[0].text);
      const checks = response.complianceChecks;

      // Database validation command
      const dbCheck = checks.find((c: any) => c.requirement.toLowerCase().includes('database'));
      expect(dbCheck?.validationCommand).toContain('psql');

      // Test validation command
      const testCheck = checks.find((c: any) => c.requirement.toLowerCase().includes('testing'));
      expect(testCheck?.validationCommand).toContain('npm test');

      // Auth validation command
      const authCheck = checks.find((c: any) => c.requirement.toLowerCase().includes('jwt'));
      expect(authCheck?.validationCommand).toContain('auth');
    });

    it('should include ADR summary in response', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: mockProjectPath,
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.adrSummary).toEqual({
        total: 3,
        byStatus: {
          accepted: 2,
          proposed: 1,
          deprecated: 0,
          superseded: 0,
        },
        withImplementationTasks: 1, // Only ADR-001 has implementation tasks
      });
    });

    it('should use default values when parameters are not provided', async () => {
      const result = await generateAdrBootstrapScripts({});

      expect(result).toHaveProperty('content');
      const response = JSON.parse(result.content[0].text);
      expect(response.scripts).toHaveProperty('bootstrap');
      expect(response.scripts).toHaveProperty('validation');
    });

    it('should handle ADRs without content gracefully', async () => {
      const { discoverAdrsInDirectory } = require('../../src/utils/adr-discovery.js');
      (discoverAdrsInDirectory as jest.Mock).mockResolvedValue({
        ...mockDiscoveryResult,
        adrs: [
          {
            filename: 'adr-004.md',
            title: 'Empty ADR',
            status: 'draft',
            content: null,
          },
        ],
      });

      const result = await generateAdrBootstrapScripts({
        projectPath: mockProjectPath,
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.complianceChecks).toEqual([]);
    });

    it('should throw McpAdrError when discovery fails', async () => {
      const { discoverAdrsInDirectory } = require('../../src/utils/adr-discovery.js');
      (discoverAdrsInDirectory as jest.Mock).mockRejectedValue(new Error('Discovery failed'));

      await expect(
        generateAdrBootstrapScripts({
          projectPath: mockProjectPath,
        })
      ).rejects.toThrow(McpAdrError);
    });

    it('should include proper script headers and color codes', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: mockProjectPath,
      });

      const response = JSON.parse(result.content[0].text);

      // Check bootstrap script
      expect(response.scripts.bootstrap).toContain('#!/bin/bash');
      expect(response.scripts.bootstrap).toContain('set -e');
      expect(response.scripts.bootstrap).toContain('ADR Bootstrap Deployment Script');
      expect(response.scripts.bootstrap).toContain("RED='\\033[0;31m'");
      expect(response.scripts.bootstrap).toContain("GREEN='\\033[0;32m'");

      // Check validation script
      expect(response.scripts.validation).toContain('#!/bin/bash');
      expect(response.scripts.validation).toContain('ADR Validation Script');
      expect(response.scripts.validation).toContain('Compliance Report');
    });

    it('should generate rollback functionality in bootstrap script', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: mockProjectPath,
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.scripts.bootstrap).toContain('DEPLOYMENT_SUCCESS');
      expect(response.scripts.bootstrap).toContain('FAILED_CHECKS');
      expect(response.scripts.bootstrap).toContain(
        'Critical ADR violations found. Deployment aborted'
      );
    });

    it('should calculate compliance percentage in validation script', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: mockProjectPath,
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.scripts.validation).toContain('COMPLIANCE_PERCENT');
      expect(response.scripts.validation).toContain('Compliance Score:');
    });

    it('should handle conversation context parameter', async () => {
      const conversationContext = {
        previousTools: [],
        currentTool: 'adr-bootstrap-validation-tool',
        recommendations: [],
      };

      const result = await generateAdrBootstrapScripts({
        projectPath: mockProjectPath,
        conversationContext,
      });

      expect(result).toHaveProperty('content');
      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty('instructions');
    });

    it('should extract checklist items from ADR content', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: mockProjectPath,
      });

      const response = JSON.parse(result.content[0].text);
      const checks = response.complianceChecks;

      // Should find checklist items from ADR-001
      const checklistItems = checks.filter(
        (c: any) =>
          c.requirement.includes('Set up React project') ||
          c.requirement.includes('Configure build pipeline') ||
          c.requirement.includes('Implement component library')
      );

      expect(checklistItems.length).toBeGreaterThan(0);
    });

    it('should provide detailed instructions for LLM', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: mockProjectPath,
        outputPath: '/output/path',
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.instructions).toContain('Implementation Instructions for LLM');
      expect(response.instructions).toContain('Create bootstrap.sh');
      expect(response.instructions).toContain('Create validate_bootstrap.sh');
      expect(response.instructions).toContain('chmod +x');
      expect(response.instructions).toContain('/output/path/bootstrap.sh');
    });
  });
});
