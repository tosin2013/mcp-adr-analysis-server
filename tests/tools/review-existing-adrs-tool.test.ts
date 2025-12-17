import { describe, it, expect, _beforeEach, _afterEach } from 'vitest';
import { reviewExistingAdrs } from '../../src/tools/review-existing-adrs-tool.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

describe('Review Existing ADRs Tool', () => {
  let testProjectPath: string;
  let adrDirectory: string;

  beforeEach(async () => {
    // Create a unique temporary directory for each test
    const tempDir = tmpdir();
    const randomId = randomBytes(8).toString('hex');
    testProjectPath = join(tempDir, `test-project-${randomId}`);
    adrDirectory = join(testProjectPath, 'docs', 'adrs');

    // Create the test project structure
    await fs.mkdir(testProjectPath, { recursive: true });
    await fs.mkdir(adrDirectory, { recursive: true });
    await fs.mkdir(join(testProjectPath, 'src', 'components'), { recursive: true });
    await fs.mkdir(join(testProjectPath, 'src', 'services'), { recursive: true });
    await fs.mkdir(join(testProjectPath, 'src', 'database'), { recursive: true });

    // Create ADR files
    await fs.writeFile(
      join(adrDirectory, 'adr-001-use-react.md'),
      `# ADR-001: Use React for Frontend

## Status
Accepted

## Context
We need a frontend framework for our web application.

## Decision
We will use React 18 with TypeScript for our frontend development.

## Consequences
- Better component reusability
- Strong ecosystem support
- TypeScript integration improves code quality

## Implementation
- [ ] Set up React project with Vite
- [x] Configure TypeScript
- [ ] Implement component library
- [ ] Add testing framework (Jest + React Testing Library)

## Validation Criteria
- All components must be functional components with hooks
- Test coverage must be >= 80%
- Bundle size should be < 500KB`
    );

    await fs.writeFile(
      join(adrDirectory, 'adr-002-database-choice.md'),
      `# ADR-002: Use PostgreSQL for Database

## Status
Accepted

## Decision
PostgreSQL will be our primary database.

## Requirements
- ACID compliance
- JSON support for flexible schemas
- Full-text search capabilities
- Horizontal scaling support

## Implementation Status
- [x] Database setup
- [x] Connection pooling
- [ ] Migration system
- [ ] Backup strategy`
    );

    await fs.writeFile(
      join(adrDirectory, 'adr-003-auth-strategy.md'),
      `# ADR-003: JWT Authentication Strategy

## Status
Proposed

## Decision
Use JWT tokens for API authentication with refresh token mechanism.

## Security Requirements
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Secure HTTP-only cookies for refresh tokens
- Rate limiting on auth endpoints`
    );

    // Create code files
    await fs.writeFile(
      join(testProjectPath, 'src', 'components', 'Button.tsx'),
      `import React from 'react';
export const Button: React.FC = () => <button>Click me</button>;`
    );

    await fs.writeFile(
      join(testProjectPath, 'src', 'services', 'auth.ts'),
      `import jwt from 'jsonwebtoken';
export function generateToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET!);
}`
    );

    await fs.writeFile(
      join(testProjectPath, 'src', 'database', 'connection.ts'),
      `import { Pool } from 'pg';
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});`
    );

    await fs.writeFile(
      join(testProjectPath, 'package.json'),
      JSON.stringify(
        {
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            react: '^18.0.0',
            typescript: '^5.0.0',
            pg: '^8.0.0',
            jsonwebtoken: '^9.0.0',
          },
        },
        null,
        2
      )
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

  describe('reviewExistingAdrs', () => {
    it('should review ADRs and analyze code compliance', async () => {
      const result = await reviewExistingAdrs({
        projectPath: testProjectPath,
        analysisDepth: 'comprehensive',
      });

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');

      const content = result.content[0].text;
      expect(content).toContain('ADR Review');
      expect(content).toContain('React');
      expect(content).toContain('PostgreSQL');
    });

    it('should handle no ADRs found scenario', async () => {
      // Create a project with no ADRs
      const emptyProjectPath = join(tmpdir(), `empty-project-${randomBytes(8).toString('hex')}`);
      await fs.mkdir(emptyProjectPath, { recursive: true });

      try {
        const result = await reviewExistingAdrs({
          projectPath: emptyProjectPath,
        });

        expect(result).toHaveProperty('content');
        const content = result.content[0].text;
        expect(content.toLowerCase()).toContain('no adrs found');
      } finally {
        await fs.rm(emptyProjectPath, { recursive: true, force: true });
      }
    });

    it('should analyze specific ADR when provided', async () => {
      const result = await reviewExistingAdrs({
        projectPath: testProjectPath,
        specificAdr: 'adr-001',
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toContain('React');
      expect(content).toContain('Frontend');
    });

    it('should support different analysis depths', async () => {
      const depths = ['basic', 'standard', 'comprehensive'] as const;

      for (const depth of depths) {
        const result = await reviewExistingAdrs({
          projectPath: testProjectPath,
          analysisDepth: depth,
        });

        expect(result).toHaveProperty('content');
        expect(result.content[0].text).toBeTruthy();
      }
    });

    it('should include compliance analysis', async () => {
      const result = await reviewExistingAdrs({
        projectPath: testProjectPath,
        includeCompliance: true,
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/compliance|implementation|validation/i);
    });

    it('should generate recommendations', async () => {
      const result = await reviewExistingAdrs({
        projectPath: testProjectPath,
        generateRecommendations: true,
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/recommend|suggestion|improve/i);
    });

    it('should handle project path not found', async () => {
      const result = await reviewExistingAdrs({
        projectPath: '/non/existent/path',
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toContain('No ADRs Found');
      expect(content).toContain('/non/existent/path');
      expect(content).toContain('**ADRs Found**: 0');
    });

    it('should include implementation tracking', async () => {
      const result = await reviewExistingAdrs({
        projectPath: testProjectPath,
        trackImplementation: true,
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/implementation|status|progress/i);
    });

    it('should analyze code patterns against ADRs', async () => {
      const result = await reviewExistingAdrs({
        projectPath: testProjectPath,
        analyzeCodePatterns: true,
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      // Should mention React components or database connections
      expect(content).toMatch(/react|component|database|pg/i);
    });

    it('should provide gap analysis between ADRs and code', async () => {
      const result = await reviewExistingAdrs({
        projectPath: testProjectPath,
        performGapAnalysis: true,
      });

      expect(result).toHaveProperty('content');
      const content = result.content[0].text;
      expect(content).toMatch(/gap|missing|implement/i);
    });
  });
});
