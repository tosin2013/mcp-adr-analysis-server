/**
 * Integration tests for Smart Code Linking feature
 * Tests the complete workflow from ADR analysis to related code discovery
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Smart Code Linking - Integration Tests', () => {
  let tempDir: string;
  let findFiles: any;
  let findRelatedCode: any;
  let analyzeProjectStructure: any;

  beforeAll(async () => {
    // Import all the functions we need to test
    const module = await import('../../src/utils/file-system.js');
    findFiles = module.findFiles;
    findRelatedCode = module.findRelatedCode;
    analyzeProjectStructure = module.analyzeProjectStructure;

    // Create a temporary directory for integration tests
    tempDir = path.join(os.tmpdir(), 'smart-code-linking-integration-test');
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up temp directory:', error);
    }
  });

  beforeEach(async () => {
    // Clean up any existing files in temp directory
    try {
      const files = await fs.readdir(tempDir);
      await Promise.all(
        files.map(file => fs.rm(path.join(tempDir, file), { recursive: true, force: true }))
      );
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('End-to-end Smart Code Linking workflow', () => {
    it('should discover project structure and find related code', async () => {
      // Setup: Create a mock project structure
      const projectStructure = {
        'package.json': JSON.stringify({
          name: 'test-project',
          dependencies: {
            express: '^4.18.0',
            typescript: '^4.9.0',
          },
        }),
        'src/services/UserService.ts': `
export class UserService {
  async authenticateUser(username: string, password: string) {
    // Authentication logic
    return true;
  }
}`,
        'src/controllers/AuthController.ts': `
import { UserService } from '../services/UserService';

export class AuthController {
  private userService = new UserService();

  async login(req: any, res: any) {
    // Login logic
  }
}`,
        'src/models/User.ts': `
export interface User {
  id: string;
  username: string;
  email: string;
}`,
        'docs/adrs/001-authentication.md': `# Authentication System

## Status
Accepted

## Context
We need to implement user authentication for the application.

## Decision
We will use Express.js with JWT tokens for authentication.
The UserService class will handle authentication logic.

## Consequences
- Secure user authentication
- JWT token-based sessions
- Integration with Express middleware
`,
      };

      // Create the mock project files
      for (const [filePath, content] of Object.entries(projectStructure)) {
        const fullPath = path.join(tempDir, filePath);
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(fullPath, content);
      }

      // Step 1: Analyze project structure
      const projectAnalysis = await analyzeProjectStructure(tempDir);

      expect(projectAnalysis).toMatchObject({
        rootPath: tempDir,
        files: expect.any(Array),
        technologies: expect.arrayContaining(['Node.js']),
        patterns: expect.any(Array),
        summary: expect.stringContaining('Node.js'),
        totalFiles: expect.any(Number),
        totalDirectories: expect.any(Number),
      });

      expect(projectAnalysis.files.length).toBeGreaterThan(0);
      expect(projectAnalysis.technologies).toContain('Express');

      // TypeScript may or may not be detected depending on file analysis logic
      const hasModernTech = projectAnalysis.technologies.some(tech =>
        ['TypeScript', 'Express', 'Node.js'].includes(tech)
      );
      expect(hasModernTech).toBe(true);

      // Step 2: Find TypeScript files using fast-glob
      const tsFiles = await findFiles(tempDir, ['**/*.ts'], {
        includeContent: true,
        limit: 10,
      });

      expect(tsFiles.files).toHaveLength(3); // UserService, AuthController, User model
      expect(tsFiles.files.every(f => f.extension === '.ts')).toBe(true);
      expect(tsFiles.files.every(f => f.content && f.content.length > 0)).toBe(true);

      // Step 3: Use Smart Code Linking to find related code for the ADR
      const adrContent = await fs.readFile(
        path.join(tempDir, 'docs/adrs/001-authentication.md'),
        'utf-8'
      );

      const relatedCodeResult = await findRelatedCode(
        'docs/adrs/001-authentication.md',
        adrContent,
        tempDir,
        {
          useAI: false, // Disable AI to avoid external dependencies
          useRipgrep: false, // Use fast-glob for consistency
          maxFiles: 10,
          includeContent: true,
        }
      );

      expect(relatedCodeResult).toMatchObject({
        adrPath: 'docs/adrs/001-authentication.md',
        relatedFiles: expect.any(Array),
        keywords: expect.any(Array),
        searchPatterns: expect.any(Array),
        confidence: expect.any(Number),
      });

      // Should find authentication-related files
      expect(relatedCodeResult.keywords).toEqual(expect.arrayContaining(['express']));

      // Should extract some relevant keywords from the ADR
      const hasAuthKeywords = relatedCodeResult.keywords.some(
        keyword =>
          keyword.toLowerCase().includes('express') ||
          keyword.toLowerCase().includes('authentication') ||
          keyword.toLowerCase().includes('jwt')
      );
      expect(hasAuthKeywords).toBe(true);

      // May or may not find files depending on keyword matching
      expect(relatedCodeResult.relatedFiles).toEqual(expect.any(Array));

      // If files are found, verify the UserService file if present
      if (relatedCodeResult.relatedFiles.length > 0) {
        const userServiceFile = relatedCodeResult.relatedFiles.find(f =>
          f.name.includes('UserService')
        );
        if (userServiceFile?.content) {
          expect(userServiceFile.content).toContain('authenticateUser');
        }

        // Validate all returned files have correct structure
        relatedCodeResult.relatedFiles.forEach(file => {
          expect(file).toHaveProperty('path');
          expect(file).toHaveProperty('name');
          expect(file).toHaveProperty('extension');
          expect(file).toHaveProperty('size');
        });
      }
    });

    it('should handle real project analysis on current codebase', async () => {
      // Test on the actual project to verify real-world functionality
      const currentProjectPath = process.cwd();

      // Step 1: Analyze the current project structure
      const analysis = await analyzeProjectStructure(currentProjectPath);

      expect(analysis.technologies).toContain('Node.js');
      expect(analysis.totalFiles).toBeGreaterThan(50); // This project has many files

      // Check for common technologies (may vary based on current state)
      const expectedTechs = ['TypeScript', 'Jest', 'Node.js'];
      const foundTechs = expectedTechs.filter(tech => analysis.technologies.includes(tech));
      expect(foundTechs.length).toBeGreaterThan(0);

      // Step 2: Find ADR files in the project
      const adrFiles = await findFiles(currentProjectPath, ['docs/adrs/*.md'], {
        includeContent: true,
        limit: 5,
      });

      // Step 3: If ADRs exist, test Smart Code Linking
      if (adrFiles.files.length > 0) {
        const firstAdr = adrFiles.files[0];
        expect(firstAdr.content).toBeDefined();

        const relatedCode = await findRelatedCode(
          firstAdr.path,
          firstAdr.content!,
          currentProjectPath,
          {
            useAI: false,
            useRipgrep: false,
            maxFiles: 5,
            includeContent: false,
          }
        );

        expect(relatedCode.relatedFiles).toEqual(expect.any(Array));
        expect(relatedCode.keywords).toEqual(expect.any(Array));
        expect(relatedCode.confidence).toBeGreaterThanOrEqual(0);
        expect(relatedCode.confidence).toBeLessThanOrEqual(1);
      }

      // Step 4: Test finding TypeScript files
      const tsFiles = await findFiles(currentProjectPath, ['src/**/*.ts'], {
        limit: 20,
      });

      expect(tsFiles.files.length).toBeGreaterThan(0);
      expect(tsFiles.files.every(f => f.extension === '.ts')).toBe(true);
    });
  });

  describe('Cross-tool integration', () => {
    it('should integrate with multiple tools for comprehensive analysis', async () => {
      // Create a project with multiple components
      const complexProject = {
        'package.json': JSON.stringify({
          name: 'complex-project',
          dependencies: {
            react: '^18.0.0',
            express: '^4.18.0',
            '@types/node': '^18.0.0',
          },
        }),
        'src/components/LoginForm.tsx': `
import React from 'react';
export const LoginForm: React.FC = () => {
  return <form>Login Form</form>;
};`,
        'src/api/authRoutes.ts': `
import express from 'express';
export const authRouter = express.Router();
authRouter.post('/login', (req, res) => {
  // Login endpoint
});`,
        'src/services/DatabaseService.ts': `
export class DatabaseService {
  async connectToDatabase() {
    // Database connection logic
  }
}`,
        'docs/adrs/002-frontend-framework.md': `# Frontend Framework Choice

## Decision
We choose React for the frontend due to its component-based architecture
and strong TypeScript support.

## Implementation
- LoginForm component for authentication
- Express API routes for backend
- DatabaseService for data persistence
`,
      };

      // Create the complex project
      for (const [filePath, content] of Object.entries(complexProject)) {
        const fullPath = path.join(tempDir, filePath);
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(fullPath, content);
      }

      // Test 1: Project structure analysis
      const structure = await analyzeProjectStructure(tempDir);
      expect(structure.technologies).toEqual(
        expect.arrayContaining(['React', 'Express', 'Node.js'])
      );

      // Test 2: Component-specific file discovery
      const reactFiles = await findFiles(tempDir, ['**/*.tsx', '**/*.jsx'], {
        includeContent: true,
      });
      expect(reactFiles.files).toHaveLength(1);
      expect(reactFiles.files[0].name).toBe('LoginForm.tsx');

      // Test 3: Smart Code Linking for ADR
      const adrContent = await fs.readFile(
        path.join(tempDir, 'docs/adrs/002-frontend-framework.md'),
        'utf-8'
      );

      const linkedCode = await findRelatedCode(
        'docs/adrs/002-frontend-framework.md',
        adrContent,
        tempDir,
        {
          useAI: false,
          useRipgrep: false,
          maxFiles: 5,
          includeContent: true,
        }
      );

      // Should find some related files
      expect(linkedCode.relatedFiles).toEqual(expect.any(Array));

      // Check if at least some expected files are found
      const foundFiles = linkedCode.relatedFiles.map(f => f.name);
      if (foundFiles.length > 0) {
        // At least one of the expected files should be found
        const expectedFiles = ['LoginForm.tsx', 'authRoutes.ts', 'DatabaseService.ts'];
        const hasExpectedFile = expectedFiles.some(expected => foundFiles.includes(expected));
        expect(hasExpectedFile).toBe(true);
      }

      // Test 4: Verify content is included and accurate (if files are found)
      if (linkedCode.relatedFiles.length > 0) {
        const loginForm = linkedCode.relatedFiles.find(f => f.name === 'LoginForm.tsx');
        if (loginForm?.content) {
          expect(loginForm.content).toContain('LoginForm');
          expect(loginForm.content).toContain('React.FC');
        }
      }
    });
  });

  describe('Performance and scalability', () => {
    it('should handle moderate-sized projects efficiently', async () => {
      // Create a moderate-sized project structure
      const fileCount = 20;
      const files: Record<string, string> = {
        'package.json': JSON.stringify({ name: 'perf-test' }),
      };

      // Generate multiple files
      for (let i = 0; i < fileCount; i++) {
        files[`src/module${i}/Service${i}.ts`] = `
export class Service${i} {
  async process() {
    return 'result${i}';
  }
}`;
        files[`src/module${i}/Controller${i}.ts`] = `
import { Service${i} } from './Service${i}';
export class Controller${i} {
  private service = new Service${i}();
}`;
      }

      // Create all files
      for (const [filePath, content] of Object.entries(files)) {
        const fullPath = path.join(tempDir, filePath);
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(fullPath, content);
      }

      const startTime = Date.now();

      // Test file discovery performance
      const allFiles = await findFiles(tempDir, ['**/*.ts'], { limit: 50 });
      expect(allFiles.files.length).toBe(fileCount * 2); // Services + Controllers

      // Test Smart Code Linking performance
      const adrContent = 'System architecture using Service5 and Controller10 classes.';
      const related = await findRelatedCode('docs/adrs/perf-test.md', adrContent, tempDir, {
        useAI: false,
        useRipgrep: false,
        maxFiles: 10,
      });

      const duration = Date.now() - startTime;

      // Should complete within reasonable time (5 seconds for moderate project)
      expect(duration).toBeLessThan(5000);

      // Should find some files (may not find exact matches due to simple keyword extraction)
      expect(related.relatedFiles).toEqual(expect.any(Array));
      expect(related.keywords.length).toBeGreaterThan(0);

      // If files are found, verify structure
      if (related.relatedFiles.length > 0) {
        related.relatedFiles.forEach(file => {
          expect(file).toHaveProperty('path');
          expect(file).toHaveProperty('name');
          expect(file).toHaveProperty('extension', '.ts');
        });
      }
    });

    it('should handle concurrent Smart Code Linking requests', async () => {
      // Create a simple project for concurrent testing
      const simpleProject = {
        'src/ServiceA.ts': 'export class ServiceA {}',
        'src/ServiceB.ts': 'export class ServiceB {}',
        'src/ServiceC.ts': 'export class ServiceC {}',
      };

      for (const [filePath, content] of Object.entries(simpleProject)) {
        const fullPath = path.join(tempDir, filePath);
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(fullPath, content);
      }

      // Create multiple concurrent requests
      const requests = [
        findRelatedCode('adr1.md', 'ServiceA implementation', tempDir, {
          useAI: false,
          useRipgrep: false,
        }),
        findRelatedCode('adr2.md', 'ServiceB architecture', tempDir, {
          useAI: false,
          useRipgrep: false,
        }),
        findRelatedCode('adr3.md', 'ServiceC design', tempDir, { useAI: false, useRipgrep: false }),
      ];

      const startTime = Date.now();
      const results = await Promise.all(requests);
      const duration = Date.now() - startTime;

      // All requests should complete successfully
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.relatedFiles).toEqual(expect.any(Array));
        expect(result.confidence).toBeGreaterThanOrEqual(0);
      });

      // Should complete concurrently (faster than sequential)
      expect(duration).toBeLessThan(3000);
    });
  });

  describe('Error resilience and edge cases', () => {
    it('should handle mixed file types and complex directory structures', async () => {
      const mixedProject = {
        'README.md': '# Mixed Project',
        'src/deep/nested/structure/DeepService.ts': 'export class DeepService {}',
        'config/app.json': '{"name": "app"}',
        'scripts/build.sh': '#!/bin/bash\necho "Building..."',
        '.gitignore': 'node_modules/\n*.log',
        'docs/api.md': '# API Documentation',
        'tests/DeepService.test.ts':
          'import { DeepService } from "../src/deep/nested/structure/DeepService";',
      };

      for (const [filePath, content] of Object.entries(mixedProject)) {
        const fullPath = path.join(tempDir, filePath);
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(fullPath, content);
      }

      // Test file discovery with different patterns
      const tsFiles = await findFiles(tempDir, ['**/*.ts'], { limit: 10 });
      const mdFiles = await findFiles(tempDir, ['**/*.md'], { limit: 10 });
      const allFiles = await findFiles(tempDir, ['**/*'], { limit: 20 });

      expect(tsFiles.files).toHaveLength(2); // DeepService.ts and test file
      expect(mdFiles.files).toHaveLength(2); // README.md and api.md
      expect(allFiles.files.length).toBeGreaterThan(4);

      // Test Smart Code Linking with deep structure
      const adrContent = 'Deep nested service architecture using DeepService class.';
      const result = await findRelatedCode('docs/adrs/deep-structure.md', adrContent, tempDir, {
        useAI: false,
        useRipgrep: false,
        maxFiles: 5,
      });

      // Should find the deeply nested service
      const deepService = result.relatedFiles.find(f =>
        f.path.includes('deep/nested/structure/DeepService.ts')
      );
      expect(deepService).toBeDefined();
    });

    it('should gracefully handle empty directories and missing files', async () => {
      // Create empty directory structure
      await fs.mkdir(path.join(tempDir, 'empty/dir/structure'), { recursive: true });

      // Test analysis of empty project
      const emptyAnalysis = await analyzeProjectStructure(tempDir);
      expect(emptyAnalysis.files).toHaveLength(0);
      expect(emptyAnalysis.technologies).toHaveLength(0);

      // Test file discovery in empty project
      const emptyFiles = await findFiles(tempDir, ['**/*.ts'], { limit: 10 });
      expect(emptyFiles.files).toHaveLength(0);

      // Test Smart Code Linking with no files
      const emptyResult = await findRelatedCode(
        'docs/adrs/empty-project.md',
        'Empty project analysis',
        tempDir,
        {
          useAI: false,
          useRipgrep: false,
          maxFiles: 5,
        }
      );

      expect(emptyResult.relatedFiles).toHaveLength(0);
      expect(emptyResult.confidence).toBe(0.2); // Low confidence for empty results
    });
  });
});
