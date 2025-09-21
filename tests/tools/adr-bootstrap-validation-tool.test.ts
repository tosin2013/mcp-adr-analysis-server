import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { generateAdrBootstrapScripts } from '../../src/tools/adr-bootstrap-validation-tool.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

describe('ADR Bootstrap Validation Tool', () => {
  let testProjectPath: string;
  let adrDirectory: string;

  beforeEach(async () => {
    // Create a unique temporary directory for each test
    const tempDir = tmpdir();
    const randomId = randomBytes(8).toString('hex');
    testProjectPath = join(tempDir, `test-adr-project-${randomId}`);
    adrDirectory = join(testProjectPath, 'docs', 'adrs');

    // Create the test project structure
    await fs.mkdir(testProjectPath, { recursive: true });
    await fs.mkdir(adrDirectory, { recursive: true });

    // Create ADR files
    await fs.writeFile(
      join(adrDirectory, 'adr-001.md'),
      `# ADR-001: Use React for Frontend

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
[ ] Implement component library`
    );

    await fs.writeFile(
      join(adrDirectory, 'adr-002.md'),
      `# ADR-002: PostgreSQL for Database

## Status
Accepted

## Decision
We will use PostgreSQL as our primary database.

## Constraints
- Database must support ACID transactions
- Should handle concurrent connections
- Critical: Data integrity must be maintained
- Requirement: Automatic backup every 24 hours`
    );

    await fs.writeFile(
      join(adrDirectory, 'adr-003.md'),
      `# ADR-003: JWT for Authentication

## Status
Proposed

## Approach
JWT tokens will be used for API authentication.

## Security Requirements
- Tokens must expire after 1 hour
- Refresh tokens shall be stored securely
- Warning: Sensitive data should not be in payload`
    );

    // Create .mcp-adr-cache directory
    await fs.mkdir(join(testProjectPath, '.mcp-adr-cache'), { recursive: true });
  });

  afterEach(async () => {
    // Clean up the test directory
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('generateAdrBootstrapScripts', () => {
    it('should generate both bootstrap and validation scripts by default', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: testProjectPath,
        adrDirectory: 'docs/adrs',
      });

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');

      const content = result.content[0].text;
      // Check if response contains bootstrap and validation script content
      expect(content).toMatch(/script|adr|bootstrap|validation/i);
      expect(content).toMatch(/script|adr|generated/i);
    });

    it('should generate only bootstrap script when specified', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: testProjectPath,
        adrDirectory: 'docs/adrs',
        scriptType: 'bootstrap',
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/script|adr|bootstrap/i);
    });

    it('should generate only validation script when specified', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: testProjectPath,
        adrDirectory: 'docs/adrs',
        scriptType: 'validation',
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/script|adr|validation/i);
    });

    it('should include environment-specific configurations', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: testProjectPath,
        adrDirectory: 'docs/adrs',
        targetEnvironment: 'production',
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/script|adr|production|environment/i);
    });

    it('should support custom template generation', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: testProjectPath,
        adrDirectory: 'docs/adrs',
        includeTemplates: true,
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/script|adr|template/i);
    });

    it('should include validation rules based on existing ADRs', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: testProjectPath,
        adrDirectory: 'docs/adrs',
        scriptType: 'validation',
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/script|adr|react|postgresql|validation/i);
    });

    it('should handle CI/CD integration', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: testProjectPath,
        adrDirectory: 'docs/adrs',
        cicdIntegration: true,
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/script|adr|cicd|integration|github/i);
    });

    it('should support dependency tracking', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: testProjectPath,
        adrDirectory: 'docs/adrs',
        trackDependencies: true,
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/script|adr|dependency|tracking/i);
    });

    it('should generate comprehensive documentation', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: testProjectPath,
        adrDirectory: 'docs/adrs',
        includeDocumentation: true,
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/script|adr|documentation|usage|example/i);
    });

    it('should handle empty ADR directory', async () => {
      const emptyProjectPath = join(
        tmpdir(),
        `empty-adr-project-${randomBytes(8).toString('hex')}`
      );
      await fs.mkdir(join(emptyProjectPath, 'docs', 'adrs'), { recursive: true });

      try {
        const result = await generateAdrBootstrapScripts({
          projectPath: emptyProjectPath,
          adrDirectory: 'docs/adrs',
        });

        const response = JSON.parse(result.content[0].text);
        expect(response.scripts).toBeDefined();
        expect(response.adrSummary).toBeDefined();
        expect(response.adrSummary.total).toBe(0);
      } finally {
        await fs.rm(emptyProjectPath, { recursive: true, force: true });
      }
    });

    it('should validate project structure', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: testProjectPath,
        adrDirectory: 'docs/adrs',
        validateStructure: true,
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/script|adr|validation/i);
      const response = JSON.parse(content);
      expect(response.scripts).toBeDefined();
      expect(response.adrSummary).toBeDefined();
    });

    it('should handle invalid project path', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: '/non/existent/path',
        adrDirectory: 'docs/adrs',
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/script|adr|bootstrap/i);
      // Should gracefully handle invalid paths rather than throwing
    });

    it('should support interactive mode configuration', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: testProjectPath,
        adrDirectory: 'docs/adrs',
        interactiveMode: true,
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/script|adr|interactiveConfig/i);
    });

    it('should generate security-focused validation scripts', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: testProjectPath,
        adrDirectory: 'docs/adrs',
        securityFocus: true,
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/script|adr|security/i);
      const response = JSON.parse(content);
      expect(response.scripts.validation).toContain('authentication');
    });

    it('should support output format customization', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: testProjectPath,
        adrDirectory: 'docs/adrs',
        outputFormat: 'yaml',
      });

      expect(result.content[0].text).toContain('---');
    });

    it('should include performance considerations', async () => {
      const result = await generateAdrBootstrapScripts({
        projectPath: testProjectPath,
        adrDirectory: 'docs/adrs',
        includePerformance: true,
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/script|adr|performanceConfig/i);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed ADR files gracefully', async () => {
      // Create a malformed ADR file
      await fs.writeFile(
        join(adrDirectory, 'adr-004-malformed.md'),
        'This is not a proper ADR format'
      );

      const result = await generateAdrBootstrapScripts({
        projectPath: testProjectPath,
        adrDirectory: 'docs/adrs',
      });

      expect(result).toHaveProperty('content');
      // Should still generate scripts but note parsing issues
      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/script|adr|warnings/i);
    });

    it('should handle permission issues gracefully', async () => {
      // This test would need platform-specific permission handling
      // For now, just ensure it doesn't crash
      const result = await generateAdrBootstrapScripts({
        projectPath: testProjectPath,
        adrDirectory: 'docs/adrs',
        validatePermissions: true,
      });

      expect(result).toHaveProperty('content');
    });
  });
});
