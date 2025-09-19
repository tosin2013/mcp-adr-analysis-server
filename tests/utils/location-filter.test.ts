import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  validateFileLocation,
  getLocationSuggestions,
  validateMultipleFiles,
  LocationRule,
  LocationValidationResult,
  DEFAULT_LOCATION_RULES,
} from '../../src/utils/location-filter.js';

describe('Location Filter', () => {
  describe('DEFAULT_LOCATION_RULES', () => {
    it('should have all required rule properties', () => {
      DEFAULT_LOCATION_RULES.forEach(rule => {
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.filePattern).toBeInstanceOf(RegExp);
        expect(Array.isArray(rule.allowedPaths)).toBe(true);
        expect(Array.isArray(rule.blockedPaths)).toBe(true);
        expect(['error', 'warning', 'info']).toContain(rule.severity);
        expect(['development', 'security', 'temporary', 'testing']).toContain(rule.category);
      });
    });

    it('should contain debug script rules', () => {
      const debugRule = DEFAULT_LOCATION_RULES.find(r => r.name === 'debug-scripts');
      expect(debugRule).toBeDefined();
      expect(debugRule?.filePattern.test('debug_test.py')).toBe(true);
      expect(debugRule?.allowedPaths).toContain('tests/');
      expect(debugRule?.blockedPaths).toContain('src/');
    });

    it('should contain test file rules', () => {
      const testRule = DEFAULT_LOCATION_RULES.find(r => r.name === 'test-files');
      expect(testRule).toBeDefined();
      expect(testRule?.filePattern.test('example.test.ts')).toBe(true);
      expect(testRule?.severity).toBe('error');
    });

    it('should contain security rules for config files', () => {
      const configRule = DEFAULT_LOCATION_RULES.find(r => r.name === 'config-secrets');
      expect(configRule).toBeDefined();
      expect(configRule?.filePattern.test('.env')).toBe(true);
      expect(configRule?.category).toBe('security');
    });
  });

  describe('validateFileLocation', () => {
    describe('Test File Validation', () => {
      it('should allow test files in test directories', () => {
        const result = validateFileLocation('tests/example.test.ts');

        expect(result.isValid).toBe(true);
      });

      it('should reject test files in source directories', () => {
        const result = validateFileLocation('src/example.test.ts');

        expect(result.isValid).toBe(false);
        expect(result.severity).toBe('error');
        expect(result.message).toContain('test files');
        expect(result.suggestedPaths).toContain('tests/');
      });

      it('should detect test files by spec pattern', () => {
        const result = validateFileLocation('src/component.spec.js');

        expect(result.isValid).toBe(false);
        expect(result.rule?.name).toBe('test-files');
      });

      it('should detect test files by test_ prefix', () => {
        const result = validateFileLocation('lib/test_utils.py');

        expect(result.isValid).toBe(false);
        expect(result.rule?.name).toBe('test-files');
      });
    });

    describe('Debug File Validation', () => {
      it('should allow debug files in development directories', () => {
        const result = validateFileLocation('dev/debug_helper.js');

        expect(result.isValid).toBe(true);
      });

      it('should warn about debug files in wrong locations', () => {
        const result = validateFileLocation('src/debug_output.py');

        expect(result.isValid).toBe(false);
        expect(result.severity).toBe('warning');
        expect(result.suggestedPaths).toContain('tools/');
      });

      it('should detect debug files by content pattern', () => {
        const result = validateFileLocation('src/helper.js', 'console.log("DEBUG: test")');

        expect(result.isValid).toBe(false);
        expect(result.rule?.name).toBe('debug-scripts');
      });

      it('should detect Python debug content', () => {
        const result = validateFileLocation('app/utils.py', 'print("debug info here")');

        expect(result.isValid).toBe(false);
        expect(result.rule?.name).toBe('debug-scripts');
      });
    });

    describe('Temporary File Validation', () => {
      it('should reject temporary files in most locations', () => {
        const result = validateFileLocation('src/data.tmp');

        expect(result.isValid).toBe(false);
        expect(result.severity).toBe('error');
        expect(result.rule?.name).toBe('temporary-files');
      });

      it('should allow temporary files in temp directories', () => {
        const result = validateFileLocation('tmp/working.tmp');

        expect(result.isValid).toBe(true);
      });

      it('should detect backup files', () => {
        const result = validateFileLocation('src/config.bak');

        expect(result.isValid).toBe(false);
        expect(result.rule?.name).toBe('temporary-files');
      });

      it('should detect original backup files', () => {
        const result = validateFileLocation('lib/important.orig');

        expect(result.isValid).toBe(false);
        expect(result.rule?.name).toBe('temporary-files');
      });
    });

    describe('Log File Validation', () => {
      it('should reject log files in source directories', () => {
        const result = validateFileLocation('src/application.log');

        expect(result.isValid).toBe(false);
        expect(result.severity).toBe('error');
        expect(result.rule?.name).toBe('log-files');
      });

      it('should allow log files in logs directory', () => {
        const result = validateFileLocation('logs/application.log');

        expect(result.isValid).toBe(true);
      });

      it('should detect .out and .err files', () => {
        const outResult = validateFileLocation('app/output.out');
        const errResult = validateFileLocation('lib/errors.err');

        expect(outResult.isValid).toBe(false);
        expect(errResult.isValid).toBe(false);
        expect(outResult.rule?.name).toBe('log-files');
        expect(errResult.rule?.name).toBe('log-files');
      });
    });

    describe('Mock Data Validation', () => {
      it('should allow mock files in test directories', () => {
        const result = validateFileLocation('tests/mock_data.json');

        expect(result.isValid).toBe(true);
      });

      it('should warn about mock files in wrong locations', () => {
        const result = validateFileLocation('src/mock_user.js');

        expect(result.isValid).toBe(false);
        expect(result.severity).toBe('warning');
        expect(result.rule?.name).toBe('mock-data');
      });

      it('should detect mock content by pattern', () => {
        const result = validateFileLocation('lib/data.json', '{"user": "fake data for testing"}');

        expect(result.isValid).toBe(false);
        expect(result.rule?.name).toBe('mock-data');
      });

      it('should detect fixture content', () => {
        const result = validateFileLocation('src/config.yaml', 'name: fixture data');

        expect(result.isValid).toBe(false);
        expect(result.rule?.name).toBe('mock-data');
      });
    });

    describe('Security Configuration Validation', () => {
      it('should flag .env files at root as security risk', () => {
        const result = validateFileLocation('.env');

        expect(result.isValid).toBe(false);
        expect(result.severity).toBe('error');
        expect(result.rule?.name).toBe('config-secrets');
      });

      it('should allow config files in proper directories', () => {
        const result = validateFileLocation('config/database.json');

        expect(result.isValid).toBe(true);
      });

      it('should detect secret content in files', () => {
        const result = validateFileLocation('src/config.json', '{"api_key": "secret123"}');

        expect(result.isValid).toBe(false);
        expect(result.rule?.name).toBe('config-secrets');
      });

      it('should detect various secret patterns', () => {
        const secretPatterns = [
          '{"password": "secret"}',
          '{"private_key": "123"}',
          '{"token": "abc123"}',
          'API_KEY=secret123',
        ];

        secretPatterns.forEach(content => {
          const result = validateFileLocation('app/settings.json', content);
          expect(result.isValid).toBe(false);
          expect(result.rule?.name).toBe('config-secrets');
        });
      });
    });

    describe('Valid File Scenarios', () => {
      it('should allow regular source files in source directories', () => {
        const result = validateFileLocation('src/utils.ts');

        expect(result.isValid).toBe(true);
      });

      it('should allow library files in lib directories', () => {
        const result = validateFileLocation('lib/helper.js');

        expect(result.isValid).toBe(true);
      });

      it('should allow documentation files anywhere', () => {
        const result = validateFileLocation('README.md');

        expect(result.isValid).toBe(true);
      });

      it('should allow package configuration files', () => {
        const result = validateFileLocation('package.json');

        expect(result.isValid).toBe(true);
      });
    });

    describe('Custom Rules', () => {
      it('should work with custom rules', () => {
        const customRule: LocationRule = {
          name: 'custom-rule',
          description: 'Custom test rule',
          filePattern: /^custom_.*\.txt$/,
          allowedPaths: ['custom/'],
          blockedPaths: ['src/'],
          severity: 'warning',
          category: 'development',
        };

        const result = validateFileLocation('src/custom_file.txt', undefined, [customRule]);

        expect(result.isValid).toBe(false);
        expect(result.rule?.name).toBe('custom-rule');
        expect(result.severity).toBe('warning');
      });

      it('should prioritize custom rules over default rules', () => {
        const customRule: LocationRule = {
          name: 'override-test',
          description: 'Override test files',
          filePattern: /.*\.test\.ts$/,
          allowedPaths: ['src/'],
          blockedPaths: [],
          severity: 'info',
          category: 'development',
        };

        const result = validateFileLocation('src/example.test.ts', undefined, [customRule]);

        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('getLocationSuggestions', () => {
    it('should suggest test directories for test files', () => {
      const suggestions = getLocationSuggestions('example.test.js', 'testing');

      expect(suggestions).toContain('tests/example.test.js');
      expect(suggestions).toContain('test/example.test.js');
      expect(suggestions).toContain('__tests__/example.test.js');
    });

    it('should suggest development directories for debug files', () => {
      const suggestions = getLocationSuggestions('debug_helper.py', 'development');

      expect(suggestions).toContain('dev/debug_helper.py');
      expect(suggestions).toContain('tools/debug_helper.py');
      expect(suggestions).toContain('scripts/debug_helper.py');
    });

    it('should suggest temp directories for temporary files', () => {
      const suggestions = getLocationSuggestions('data.tmp', 'temporary');

      expect(suggestions).toContain('tmp/data.tmp');
      expect(suggestions).toContain('temp/data.tmp');
    });

    it('should suggest config directories for security files', () => {
      const suggestions = getLocationSuggestions('.env', 'security');

      expect(suggestions).toContain('config/.env');
      expect(suggestions).toContain('env/.env');
      expect(suggestions).toContain('examples/.env');
    });

    it('should return empty array for unknown categories', () => {
      const suggestions = getLocationSuggestions('file.txt', 'unknown' as any);

      expect(suggestions).toEqual([]);
    });

    it('should handle files with complex paths', () => {
      const suggestions = getLocationSuggestions('src/deeply/nested/debug_tool.js', 'development');

      expect(suggestions.some(s => s.includes('debug_tool.js'))).toBe(true);
    });
  });

  describe('validateMultipleFiles', () => {
    it('should check multiple files and return results', () => {
      const files = [
        'src/utils.ts', // Valid
        'src/example.test.js', // Invalid - test in src
        'tests/helper.test.js', // Valid
        'app/debug_tool.py', // Invalid - debug in app
        'logs/app.log', // Valid
      ];

      const results = validateMultipleFiles(files);

      expect(results).toHaveLength(5);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(false);
      expect(results[2].isValid).toBe(true);
      expect(results[3].isValid).toBe(false);
      expect(results[4].isValid).toBe(true);
    });

    it('should handle files with content', () => {
      const filesWithContent = [
        { path: 'src/config.js', content: 'const API_KEY = "secret123"' },
        { path: 'src/utils.js', content: 'export function helper() {}' },
      ];

      const results = validateMultipleFiles(
        filesWithContent.map(f => f.path),
        filesWithContent.map(f => f.content)
      );

      expect(results).toHaveLength(2);
      expect(results[0].isValid).toBe(false); // Config with secrets
      expect(results[1].isValid).toBe(true); // Regular utils
    });

    it('should use custom rules for all files', () => {
      const customRule: LocationRule = {
        name: 'no-js',
        description: 'No JS files allowed',
        filePattern: /.*\.js$/,
        allowedPaths: [],
        blockedPaths: ['src/', 'lib/', 'app/'],
        severity: 'error',
        category: 'development',
      };

      const files = ['src/app.js', 'lib/utils.js', 'config/settings.js'];
      const results = validateMultipleFiles(files, undefined, [customRule]);

      expect(results.filter(r => !r.isValid)).toHaveLength(2); // src and lib should fail
      expect(results.filter(r => r.isValid)).toHaveLength(1); // config should pass
    });

    it('should handle empty file list', () => {
      const results = validateMultipleFiles([]);

      expect(results).toEqual([]);
    });

    it('should provide detailed results for each file', () => {
      const files = ['src/test_file.py'];
      const results = validateMultipleFiles(files);

      expect(results[0]).toHaveProperty('isValid');
      expect(results[0]).toHaveProperty('currentPath');
      expect(results[0]).toHaveProperty('suggestedPaths');
      expect(results[0]).toHaveProperty('severity');
      expect(results[0]).toHaveProperty('message');
      expect(results[0].currentPath).toBe('src/test_file.py');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle files without extensions', () => {
      const result = validateFileLocation('src/Dockerfile');

      // Dockerfile in src/ should be flagged by container-configs rule
      expect(result.isValid).toBe(false);
      expect(result.rule?.name).toBe('container-configs');
    });

    it('should handle paths with special characters', () => {
      const result = validateFileLocation('src/file-with-dashes.test.ts');

      expect(result.isValid).toBe(false);
      expect(result.rule?.name).toBe('test-files');
    });

    it('should handle relative paths', () => {
      const result = validateFileLocation('./test.tmp');

      expect(result.isValid).toBe(false);
      expect(result.rule?.name).toBe('temporary-files');
    });

    it('should handle nested directory paths', () => {
      const result = validateFileLocation('deeply/nested/tests/example.test.js');

      expect(result.isValid).toBe(true);
    });

    it('should handle content matching with special regex characters', () => {
      const result = validateFileLocation('src/data.json', 'password: "test[123]"');

      expect(result.isValid).toBe(false);
      expect(result.rule?.name).toBe('config-secrets');
    });

    it('should be case-sensitive for file patterns', () => {
      const result = validateFileLocation('src/TEST_FILE.PY');

      expect(result.isValid).toBe(true); // Uppercase should not match test pattern
    });

    it('should handle undefined content gracefully', () => {
      const result = validateFileLocation('src/debug_tool.js', undefined);

      expect(result.isValid).toBe(false);
      expect(result.rule?.name).toBe('debug-scripts');
    });

    it('should handle empty content', () => {
      const result = validateFileLocation('src/config.json', '');

      expect(result.isValid).toBe(true); // No content pattern match
    });
  });

  describe('Message Generation', () => {
    it('should generate helpful error messages', () => {
      const result = validateFileLocation('src/example.test.js');

      expect(result.message).toContain('test files');
      expect(result.message).toContain('should be');
    });

    it('should include rule description in messages', () => {
      const result = validateFileLocation('src/debug_helper.py');

      expect(result.message).toContain('debug scripts');
    });

    it('should provide context about current location', () => {
      const result = validateFileLocation('app/temp_data.tmp');

      expect(result.currentPath).toBe('app/temp_data.tmp');
      expect(result.message).toContain('temp_data.tmp');
    });
  });
});
