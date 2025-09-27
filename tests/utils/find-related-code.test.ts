/**
 * Unit tests for findRelatedCode function with Smart Code Linking
 * Simplified integration-style tests to avoid complex mocking issues
 */

import { jest } from '@jest/globals';

describe('Smart Code Linking - findRelatedCode', () => {
  // Simple importability test to start
  it('should be importable without errors', async () => {
    const module = await import('../../src/utils/file-system.js');
    expect(module.findRelatedCode).toBeDefined();
    expect(typeof module.findRelatedCode).toBe('function');
  });

  describe('Integration-style tests', () => {
    let findRelatedCode: any;
    let tempDir: string;

    beforeAll(async () => {
      const module = await import('../../src/utils/file-system.js');
      findRelatedCode = module.findRelatedCode;
      tempDir = process.cwd();
    });

    it('should handle basic ADR content analysis without AI', async () => {
      // Test without AI to avoid API dependencies
      const adrContent = 'We will use TypeScript and Jest for testing in our Node.js application.';
      const adrPath = 'docs/adrs/001-tech-stack.md';

      const result = await findRelatedCode(adrPath, adrContent, tempDir, {
        useAI: false,
        useRipgrep: false,
        maxFiles: 3,
        includeContent: false,
      });

      expect(result).toMatchObject({
        adrPath: adrPath,
        relatedFiles: expect.any(Array),
        keywords: expect.any(Array),
        searchPatterns: expect.any(Array),
        confidence: expect.any(Number),
      });

      // Should extract basic keywords from content
      expect(result.keywords.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should extract keywords using regex patterns', async () => {
      const adrContent = `
        # Authentication System

        We will implement authentication using:
        - Express.js for the web framework
        - PostgreSQL for user data storage
        - JWT tokens for session management
        - bcrypt for password hashing

        The UserService class will handle user operations.
      `;

      const result = await findRelatedCode('docs/adrs/002-auth.md', adrContent, tempDir, {
        useAI: false,
        useRipgrep: false,
        maxFiles: 5,
      });

      // Should extract technology keywords
      expect(result.keywords).toEqual(expect.arrayContaining(['express', 'postgresql']));

      // Should extract code-like patterns
      const hasCodePatterns = result.keywords.some(
        keyword => keyword.includes('UserService') || keyword.includes('JWT')
      );
      expect(hasCodePatterns).toBe(true);
    });

    it('should handle empty ADR content gracefully', async () => {
      const result = await findRelatedCode('docs/adrs/003-empty.md', '', tempDir, {
        useAI: false,
        useRipgrep: false,
        maxFiles: 1,
      });

      expect(result.relatedFiles).toEqual([]);
      expect(result.keywords).toEqual([]);
      expect(result.confidence).toBe(0.2); // Low confidence for no content
    });

    it('should respect maxFiles limit', async () => {
      const adrContent = 'TypeScript React Node.js Express PostgreSQL MongoDB Redis Docker';

      const result = await findRelatedCode('docs/adrs/004-many-techs.md', adrContent, tempDir, {
        useAI: false,
        useRipgrep: false,
        maxFiles: 2,
      });

      expect(result.relatedFiles.length).toBeLessThanOrEqual(2);
    });

    it('should filter to source code files only', async () => {
      const adrContent = 'Implementation using TypeScript services and components.';

      const result = await findRelatedCode('docs/adrs/005-source-only.md', adrContent, tempDir, {
        useAI: false,
        useRipgrep: false,
        maxFiles: 10,
      });

      // All returned files should be source code files
      const sourceExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cs', '.go', '.rs'];
      const allSourceFiles = result.relatedFiles.every(file =>
        sourceExtensions.includes(file.extension)
      );

      if (result.relatedFiles.length > 0) {
        expect(allSourceFiles).toBe(true);
      }
    });

    it('should include file content when requested', async () => {
      const adrContent = 'Package configuration and dependencies management.';

      const result = await findRelatedCode('docs/adrs/006-config.md', adrContent, tempDir, {
        useAI: false,
        useRipgrep: false,
        maxFiles: 1,
        includeContent: true,
      });

      if (result.relatedFiles.length > 0) {
        const firstFile = result.relatedFiles[0];
        expect(firstFile).toHaveProperty('content');
        if (firstFile.content) {
          expect(typeof firstFile.content).toBe('string');
          expect(firstFile.content.length).toBeGreaterThan(0);
        }
      }
    });

    it('should handle non-existent project path', async () => {
      const nonExistentPath = '/absolutely/nonexistent/path/12345';
      const adrContent = 'Test content for non-existent path.';

      // Should not crash but return empty results or error
      await expect(
        findRelatedCode('test.md', adrContent, nonExistentPath, {
          useAI: false,
          useRipgrep: false,
          maxFiles: 1,
        })
      ).resolves.toMatchObject({
        relatedFiles: [],
        keywords: expect.any(Array),
      });
    });

    it('should score files by keyword relevance', async () => {
      const adrContent = 'UserService authentication system implementation.';

      const result = await findRelatedCode('docs/adrs/007-scoring.md', adrContent, tempDir, {
        useAI: false,
        useRipgrep: false,
        maxFiles: 5,
      });

      if (result.relatedFiles.length > 1) {
        // Files should be in relevance order (highest score first)
        // This is hard to test without knowing the exact project structure,
        // but we can at least verify the structure is correct
        result.relatedFiles.forEach(file => {
          expect(file).toHaveProperty('path');
          expect(file).toHaveProperty('name');
          expect(file).toHaveProperty('extension');
        });
      }
    });
  });

  describe('Error handling and edge cases', () => {
    let findRelatedCode: any;

    beforeAll(async () => {
      const module = await import('../../src/utils/file-system.js');
      findRelatedCode = module.findRelatedCode;
    });

    it('should handle very long ADR content', async () => {
      // Create very long content
      const longContent = 'TypeScript service implementation. '.repeat(1000);

      const result = await findRelatedCode('docs/adrs/008-long.md', longContent, process.cwd(), {
        useAI: false,
        useRipgrep: false,
        maxFiles: 3,
      });

      expect(result).toMatchObject({
        relatedFiles: expect.any(Array),
        keywords: expect.any(Array),
        confidence: expect.any(Number),
      });

      // Should still extract keywords from long content
      expect(result.keywords.length).toBeGreaterThan(0);
    });

    it('should handle special characters in content', async () => {
      const specialContent =
        'User@Service with $pecial characters & symbols! (implementation) [notes]';

      const result = await findRelatedCode(
        'docs/adrs/009-special.md',
        specialContent,
        process.cwd(),
        {
          useAI: false,
          useRipgrep: false,
          maxFiles: 2,
        }
      );

      // Should not crash and should extract some keywords
      expect(result.keywords).toEqual(expect.any(Array));
      expect(result.relatedFiles).toEqual(expect.any(Array));
    });

    it('should handle invalid options gracefully', async () => {
      const adrContent = 'Simple test content.';

      // Test with negative maxFiles
      const result = await findRelatedCode('docs/adrs/010-invalid.md', adrContent, process.cwd(), {
        useAI: false,
        useRipgrep: false,
        maxFiles: -1,
      });

      // Should handle gracefully and return valid structure
      expect(result).toMatchObject({
        relatedFiles: expect.any(Array),
        keywords: expect.any(Array),
        confidence: expect.any(Number),
      });
    });
  });

  describe('Return value validation', () => {
    let findRelatedCode: any;

    beforeAll(async () => {
      const module = await import('../../src/utils/file-system.js');
      findRelatedCode = module.findRelatedCode;
    });

    it('should return proper RelatedCodeResult structure', async () => {
      const adrContent = 'Testing result structure validation.';
      const adrPath = 'docs/adrs/011-structure.md';

      const result = await findRelatedCode(adrPath, adrContent, process.cwd(), {
        useAI: false,
        useRipgrep: false,
        maxFiles: 1,
      });

      // Validate all required properties exist
      expect(result).toHaveProperty('adrPath', adrPath);
      expect(result).toHaveProperty('relatedFiles');
      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('searchPatterns');
      expect(result).toHaveProperty('confidence');

      // Validate property types
      expect(Array.isArray(result.relatedFiles)).toBe(true);
      expect(Array.isArray(result.keywords)).toBe(true);
      expect(Array.isArray(result.searchPatterns)).toBe(true);
      expect(typeof result.confidence).toBe('number');

      // Validate confidence range
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);

      // Validate FileInfo structure for each file
      result.relatedFiles.forEach(file => {
        expect(file).toHaveProperty('path');
        expect(file).toHaveProperty('name');
        expect(file).toHaveProperty('extension');
        expect(file).toHaveProperty('size');
        expect(file).toHaveProperty('directory');

        expect(typeof file.path).toBe('string');
        expect(typeof file.name).toBe('string');
        expect(typeof file.extension).toBe('string');
        expect(typeof file.size).toBe('number');
        expect(typeof file.directory).toBe('string');
      });
    });
  });

  describe('Performance characteristics', () => {
    let findRelatedCode: any;

    beforeAll(async () => {
      const module = await import('../../src/utils/file-system.js');
      findRelatedCode = module.findRelatedCode;
    });

    it('should complete within reasonable time', async () => {
      const startTime = Date.now();

      const adrContent = 'Performance testing with moderate content length and complexity.';
      await findRelatedCode('docs/adrs/012-performance.md', adrContent, process.cwd(), {
        useAI: false,
        useRipgrep: false,
        maxFiles: 5,
      });

      const duration = Date.now() - startTime;

      // Should complete within 10 seconds for reasonable-sized projects
      expect(duration).toBeLessThan(10000);
    });

    it('should handle concurrent calls', async () => {
      const promises = Array.from({ length: 3 }, (_, i) =>
        findRelatedCode(`docs/adrs/013-concurrent-${i}.md`, `Content ${i}`, process.cwd(), {
          useAI: false,
          useRipgrep: false,
          maxFiles: 2,
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toMatchObject({
          relatedFiles: expect.any(Array),
          keywords: expect.any(Array),
          confidence: expect.any(Number),
        });
      });
    });
  });
});
