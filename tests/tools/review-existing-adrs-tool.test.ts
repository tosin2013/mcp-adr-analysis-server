import { jest } from '@jest/globals';
import { reviewExistingAdrs } from '../../src/tools/review-existing-adrs-tool.js';
import { McpAdrError } from '../../src/types/index.js';

// Mock the adr-discovery module
jest.mock('../../src/utils/adr-discovery.js', () => ({
  discoverAdrsInDirectory: jest.fn(),
}));

// Mock file system operations
jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  readFile: jest.fn(),
  stat: jest.fn(),
  access: jest.fn(),
}));

describe('Review Existing ADRs Tool', () => {
  const mockProjectPath = '/test/project';
  const mockAdrDirectory = 'docs/adrs';

  const mockDiscoveryResult = {
    totalAdrs: 3,
    adrs: [
      {
        filename: 'adr-001-use-react.md',
        title: 'Use React for Frontend',
        status: 'accepted',
        content: `
# ADR-001: Use React for Frontend

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
- Bundle size should be < 500KB
`,
      },
      {
        filename: 'adr-002-database-choice.md',
        title: 'Use PostgreSQL for Database',
        status: 'accepted',
        content: `
# ADR-002: Use PostgreSQL for Database

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
- [ ] Backup strategy
`,
      },
      {
        filename: 'adr-003-auth-strategy.md',
        title: 'JWT Authentication Strategy',
        status: 'proposed',
        content: `
# ADR-003: JWT Authentication Strategy

## Status
Proposed

## Decision
Use JWT tokens for API authentication with refresh token mechanism.

## Security Requirements
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Secure HTTP-only cookies for refresh tokens
- Rate limiting on auth endpoints
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

  const mockCodeFiles = [
    { name: 'src/components/Button.tsx', type: 'file' },
    { name: 'src/services/auth.ts', type: 'file' },
    { name: 'src/database/connection.ts', type: 'file' },
    { name: 'package.json', type: 'file' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    const { discoverAdrsInDirectory } = require('../../src/utils/adr-discovery.js');
    const fs = require('fs/promises');

    (discoverAdrsInDirectory as jest.Mock).mockResolvedValue(mockDiscoveryResult);
    (fs.readdir as jest.Mock).mockResolvedValue(mockCodeFiles);
    (fs.readFile as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('package.json')) {
        return Promise.resolve(
          JSON.stringify({
            dependencies: {
              react: '^18.0.0',
              typescript: '^5.0.0',
              pg: '^8.0.0',
              jsonwebtoken: '^9.0.0',
            },
          })
        );
      }
      if (path.includes('Button.tsx')) {
        return Promise.resolve(`
import React from 'react';
export const Button: React.FC = () => <button>Click me</button>;
        `);
      }
      if (path.includes('auth.ts')) {
        return Promise.resolve(`
import jwt from 'jsonwebtoken';
export const generateToken = (payload: any) => jwt.sign(payload, 'secret');
        `);
      }
      return Promise.resolve('mock file content');
    });
    (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => false });
    (fs.access as jest.Mock).mockResolvedValue(undefined);
  });

  describe('reviewExistingAdrs', () => {
    it('should review ADRs and analyze code compliance', async () => {
      const result = await reviewExistingAdrs({
        adrDirectory: mockAdrDirectory,
        projectPath: mockProjectPath,
      });

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');

      const response = result.content[0].text;
      expect(response).toContain('ADR Review Report');
      expect(response).toContain('React');
      expect(response).toContain('PostgreSQL');
      expect(response).toContain('JWT');
    });

    it('should handle no ADRs found scenario', async () => {
      const { discoverAdrsInDirectory } = require('../../src/utils/adr-discovery.js');
      (discoverAdrsInDirectory as jest.Mock).mockResolvedValue({
        totalAdrs: 0,
        adrs: [],
        summary: { byStatus: {} },
      });

      const result = await reviewExistingAdrs({
        adrDirectory: mockAdrDirectory,
        projectPath: mockProjectPath,
      });

      const response = result.content[0].text;
      expect(response).toContain('No ADRs Found');
      expect(response).toContain('suggest_adrs');
    });

    it('should analyze specific ADR when provided', async () => {
      const result = await reviewExistingAdrs({
        adrDirectory: mockAdrDirectory,
        projectPath: mockProjectPath,
        specificAdr: 'adr-001-use-react.md',
      });

      const response = result.content[0].text;
      expect(response).toContain('React');
      expect(response).toContain('adr-001');
    });

    it('should support different analysis depths', async () => {
      const basicResult = await reviewExistingAdrs({
        analysisDepth: 'basic',
      });

      const comprehensiveResult = await reviewExistingAdrs({
        analysisDepth: 'comprehensive',
      });

      expect(basicResult.content[0].text.length).toBeLessThan(
        comprehensiveResult.content[0].text.length
      );
    });

    it('should handle tree-sitter integration flag', async () => {
      const withTreeSitter = await reviewExistingAdrs({
        includeTreeSitter: true,
      });

      const withoutTreeSitter = await reviewExistingAdrs({
        includeTreeSitter: false,
      });

      // Both should work since tree-sitter isn't actually implemented yet
      expect(withTreeSitter).toHaveProperty('content');
      expect(withoutTreeSitter).toHaveProperty('content');
    });

    it('should generate update plans when requested', async () => {
      const result = await reviewExistingAdrs({
        generateUpdatePlan: true,
      });

      const response = result.content[0].text;
      expect(response).toContain('Update Plan');
    });

    it('should handle code analysis for different file types', async () => {
      const fs = require('fs/promises');
      (fs.readdir as jest.Mock).mockResolvedValue([
        { name: 'src/components/Button.py', type: 'file' },
        { name: 'src/services/auth.go', type: 'file' },
        { name: 'src/models/User.java', type: 'file' },
      ]);

      const result = await reviewExistingAdrs({
        adrDirectory: mockAdrDirectory,
        projectPath: mockProjectPath,
      });

      expect(result).toHaveProperty('content');
      // Should detect multiple programming languages
      const response = result.content[0].text;
      expect(response).toContain('Code Analysis');
    });

    it('should identify compliance gaps', async () => {
      const result = await reviewExistingAdrs({
        adrDirectory: mockAdrDirectory,
        projectPath: mockProjectPath,
        analysisDepth: 'comprehensive',
      });

      const response = result.content[0].text;
      expect(response).toContain('Compliance');
      expect(response).toContain('Gap');
    });

    it('should handle file system errors gracefully', async () => {
      const fs = require('fs/promises');
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const result = await reviewExistingAdrs({
        adrDirectory: mockAdrDirectory,
        projectPath: mockProjectPath,
      });

      expect(result).toHaveProperty('content');
      // Should still return something even with file system errors
    });

    it('should validate ADR implementation status', async () => {
      const result = await reviewExistingAdrs({
        adrDirectory: mockAdrDirectory,
        projectPath: mockProjectPath,
        analysisDepth: 'detailed',
      });

      const response = result.content[0].text;
      expect(response).toMatch(/implemented|not implemented|partially implemented/i);
    });

    it('should detect architectural patterns in code', async () => {
      const fs = require('fs/promises');
      (fs.readFile as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('auth.ts')) {
          return Promise.resolve(`
import express from 'express';
import { Repository } from 'typeorm';
import { Strategy } from 'passport-jwt';

class AuthService {
  constructor(private userRepo: Repository<User>) {}

  async authenticate(token: string) {
    // JWT validation logic
  }
}
          `);
        }
        return Promise.resolve('mock content');
      });

      const result = await reviewExistingAdrs({
        includeTreeSitter: true,
        analysisDepth: 'comprehensive',
      });

      const response = result.content[0].text;
      expect(response).toContain('Pattern');
    });

    it('should handle conversation context', async () => {
      const conversationContext = {
        previousTools: ['suggest_adrs'],
        currentTool: 'review_existing_adrs',
        recommendations: ['implement-auth'],
      };

      const result = await reviewExistingAdrs({
        conversationContext,
      });

      expect(result).toHaveProperty('content');
    });

    it('should throw McpAdrError on discovery failure', async () => {
      const { discoverAdrsInDirectory } = require('../../src/utils/adr-discovery.js');
      (discoverAdrsInDirectory as jest.Mock).mockRejectedValue(new Error('Discovery failed'));

      await expect(
        reviewExistingAdrs({
          adrDirectory: mockAdrDirectory,
          projectPath: mockProjectPath,
        })
      ).rejects.toThrow(McpAdrError);
    });

    it('should detect technology stack from package files', async () => {
      const fs = require('fs/promises');
      (fs.readdir as jest.Mock).mockResolvedValue([
        { name: 'package.json', type: 'file' },
        { name: 'requirements.txt', type: 'file' },
        { name: 'Cargo.toml', type: 'file' },
      ]);

      (fs.readFile as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('requirements.txt')) {
          return Promise.resolve('django==4.0\npsycopg2==2.9');
        }
        if (path.includes('Cargo.toml')) {
          return Promise.resolve('[dependencies]\ntokio = "1.0"');
        }
        return Promise.resolve('{}');
      });

      const result = await reviewExistingAdrs({
        analysisDepth: 'comprehensive',
      });

      const response = result.content[0].text;
      expect(response).toContain('Technology');
    });

    it('should identify security compliance issues', async () => {
      const result = await reviewExistingAdrs({
        adrDirectory: mockAdrDirectory,
        projectPath: mockProjectPath,
        analysisDepth: 'comprehensive',
      });

      const response = result.content[0].text;
      // Should check security requirements from ADR-003
      expect(response).toContain('Security');
    });

    it('should handle default parameter values', async () => {
      const result = await reviewExistingAdrs({});

      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('type', 'text');
    });

    it('should provide actionable recommendations', async () => {
      const result = await reviewExistingAdrs({
        generateUpdatePlan: true,
        analysisDepth: 'comprehensive',
      });

      const response = result.content[0].text;
      expect(response).toContain('Recommendation');
      expect(response).toContain('Action');
    });
  });
});
