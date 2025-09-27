/**
 * Unit tests for file-system utilities with Smart Code Linking
 * Tests the refactored findFiles function using fast-glob
 */

describe('File System Utilities', () => {
  // Simple importability test to start
  it('should be importable without errors', async () => {
    const module = await import('../../src/utils/file-system.js');
    expect(module.findFiles).toBeDefined();
    expect(module.analyzeProjectStructure).toBeDefined();
    expect(typeof module.findFiles).toBe('function');
  });

  describe('findFiles function - Integration Style Tests', () => {
    let findFiles: any;
    let tempDir: string;

    beforeAll(async () => {
      // Import the actual function
      const module = await import('../../src/utils/file-system.js');
      findFiles = module.findFiles;
      tempDir = process.cwd(); // Use current directory for tests
    });

    it('should handle empty patterns gracefully', async () => {
      const result = await findFiles(tempDir, []);

      expect(result).toMatchObject({
        files: expect.any(Array),
        totalFiles: expect.any(Number),
        searchPatterns: expect.any(Array),
        searchPath: expect.any(String),
      });

      expect(result.files).toHaveLength(0);
      expect(result.totalFiles).toBe(0);
      expect(result.searchPatterns).toEqual([]);
    });

    it('should return proper structure for valid patterns', async () => {
      // Use a pattern that should find at least some files in the project
      const result = await findFiles(tempDir, ['package.json'], { limit: 1 });

      expect(result).toMatchObject({
        files: expect.any(Array),
        totalFiles: expect.any(Number),
        searchPatterns: ['package.json'],
        searchPath: tempDir,
      });

      if (result.files.length > 0) {
        const fileInfo = result.files[0];
        expect(fileInfo).toHaveProperty('path');
        expect(fileInfo).toHaveProperty('name');
        expect(fileInfo).toHaveProperty('extension');
        expect(fileInfo).toHaveProperty('size');
        expect(fileInfo).toHaveProperty('directory');
        expect(typeof fileInfo.size).toBe('number');
        expect(fileInfo.size).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle includeContent option', async () => {
      // Try to find a small file and include content
      const result = await findFiles(tempDir, ['package.json'], {
        includeContent: true,
        limit: 1,
      });

      if (result.files.length > 0) {
        const fileInfo = result.files[0];
        expect(fileInfo).toHaveProperty('content');
        if (fileInfo.content) {
          expect(typeof fileInfo.content).toBe('string');
          expect(fileInfo.content.length).toBeGreaterThan(0);
        }
      }
    });

    it('should apply file limits correctly', async () => {
      // Find TypeScript files with a limit
      const result = await findFiles(tempDir, ['**/*.ts'], { limit: 5 });

      expect(result.files.length).toBeLessThanOrEqual(5);
      expect(result.totalFiles).toBe(result.files.length);
    });

    it('should handle non-existent paths gracefully', async () => {
      const nonExistentPath = '/absolutely/nonexistent/path/12345';

      // fast-glob handles non-existent paths by returning empty results
      // rather than throwing, so we should test for that behavior
      const result = await findFiles(nonExistentPath, ['**/*.ts']);
      expect(result.files).toHaveLength(0);
      expect(result.totalFiles).toBe(0);
    });

    it('should handle relative paths', async () => {
      const relativePath = '.';
      const result = await findFiles(relativePath, ['package.json']);

      expect(result.searchPath).toBe(relativePath);
    });

    it('should exclude ignored directories by default', async () => {
      // This test verifies that common ignore patterns are applied
      const result = await findFiles(tempDir, ['**/*'], { limit: 100 });

      // Should not find files in node_modules, .git, etc.
      const paths = result.files.map(f => f.path);
      const hasIgnoredFiles = paths.some(
        path =>
          path.includes('node_modules/') ||
          path.includes('.git/') ||
          path.includes('dist/') ||
          path.includes('build/')
      );

      // In most cases, these should be filtered out
      // (This might pass if the project doesn't have these directories)
      expect(hasIgnoredFiles).toBe(false);
    });
  });

  describe('FileInfo interface validation', () => {
    let findFiles: any;

    beforeAll(async () => {
      const module = await import('../../src/utils/file-system.js');
      findFiles = module.findFiles;
    });

    it('should create valid FileInfo objects', async () => {
      const result = await findFiles(process.cwd(), ['package.json'], { limit: 1 });

      if (result.files.length > 0) {
        const fileInfo = result.files[0];

        // Validate all required properties exist
        expect(fileInfo).toHaveProperty('path');
        expect(fileInfo).toHaveProperty('name');
        expect(fileInfo).toHaveProperty('extension');
        expect(fileInfo).toHaveProperty('size');
        expect(fileInfo).toHaveProperty('directory');

        // Validate property types
        expect(typeof fileInfo.path).toBe('string');
        expect(typeof fileInfo.name).toBe('string');
        expect(typeof fileInfo.extension).toBe('string');
        expect(typeof fileInfo.size).toBe('number');
        expect(typeof fileInfo.directory).toBe('string');

        // Validate logical relationships
        expect(fileInfo.name).toBe(fileInfo.path.split('/').pop());
        if (fileInfo.name.includes('.')) {
          expect(fileInfo.extension).toBe('.' + fileInfo.name.split('.').pop());
        }
      }
    });
  });

  describe('Error handling and edge cases', () => {
    let findFiles: any;

    beforeAll(async () => {
      const module = await import('../../src/utils/file-system.js');
      findFiles = module.findFiles;
    });

    it('should handle invalid patterns gracefully', async () => {
      // Test with patterns that fast-glob would reject
      await expect(findFiles(process.cwd(), [''], { limit: 1 })).rejects.toThrow();

      // Also test with valid but non-matching patterns
      const result = await findFiles(process.cwd(), ['nonexistent*.xyz'], { limit: 1 });
      expect(result.files).toHaveLength(0);
    });

    it('should handle very restrictive patterns', async () => {
      // Pattern that likely won't match anything
      const result = await findFiles(process.cwd(), ['**/*.veryrareextension12345']);

      expect(result.files).toHaveLength(0);
      expect(result.totalFiles).toBe(0);
    });

    it('should handle undefined project path', async () => {
      // Test with undefined/null path (should default to current directory)
      const result = await findFiles('', ['package.json']);

      expect(result.searchPath).toBeTruthy();
    });
  });

  describe('Performance characteristics', () => {
    let findFiles: any;

    beforeAll(async () => {
      const module = await import('../../src/utils/file-system.js');
      findFiles = module.findFiles;
    });

    it('should complete within reasonable time for small file sets', async () => {
      const startTime = Date.now();

      await findFiles(process.cwd(), ['package.json'], { limit: 5 });

      const duration = Date.now() - startTime;

      // Should complete within 5 seconds for small file operations
      expect(duration).toBeLessThan(5000);
    });

    it('should respect file limits effectively', async () => {
      const smallLimit = 3;
      const result = await findFiles(process.cwd(), ['**/*.ts', '**/*.js'], {
        limit: smallLimit,
      });

      expect(result.files.length).toBeLessThanOrEqual(smallLimit);
      expect(result.totalFiles).toBe(result.files.length);
    });
  });

  describe('Real project structure analysis', () => {
    let analyzeProjectStructure: any;

    beforeAll(async () => {
      const module = await import('../../src/utils/file-system.js');
      analyzeProjectStructure = module.analyzeProjectStructure;
    });

    it('should analyze current project structure', async () => {
      const result = await analyzeProjectStructure(process.cwd());

      expect(result).toMatchObject({
        rootPath: expect.any(String),
        files: expect.any(Array),
        technologies: expect.any(Array),
        patterns: expect.any(Array),
        summary: expect.any(String),
        totalFiles: expect.any(Number),
        totalDirectories: expect.any(Number),
      });

      // Should detect some technologies in the project
      expect(result.technologies.length).toBeGreaterThan(0);
      expect(result.totalFiles).toBeGreaterThan(0);

      // More flexible check - should contain at least one common technology
      const commonTechs = ['TypeScript', 'JavaScript', 'Node.js'];
      const hasCommonTech = commonTechs.some(tech => result.technologies.includes(tech));
      expect(hasCommonTech).toBe(true);
    });

    it('should detect common technologies in the project', async () => {
      const result = await analyzeProjectStructure(process.cwd());

      // This project should have these technologies
      const expectedTechs = ['TypeScript', 'Node.js', 'Jest'];
      const foundTechs = expectedTechs.filter(tech => result.technologies.includes(tech));

      expect(foundTechs.length).toBeGreaterThan(0);
    });
  });
});
