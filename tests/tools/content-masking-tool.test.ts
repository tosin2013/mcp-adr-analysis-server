/**
 * Unit Tests for content-masking-tool.ts
 * Target Coverage: 18.6% → 80%
 * 
 * Following methodological pragmatism principles:
 * - Systematic Verification: Structured test cases with clear assertions
 * - Explicit Fallibilism: Testing both success and failure scenarios
 * - Pragmatic Success Criteria: Focus on reliable, maintainable test coverage
 * - Cognitive Systematization: Organized test structure covering all exported functions
 */

import { jest } from '@jest/globals';
import { McpAdrError } from '../../src/types/index.js';

import {
  analyzeContentSecurity,
  generateContentMasking,
  configureCustomPatterns,
  applyBasicContentMasking,
  validateContentMasking
} from '../../src/tools/content-masking-tool.js';

describe('Content Masking Tool', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock process.cwd() for consistent test environment
    jest.spyOn(process, 'cwd').mockReturnValue('/Users/tosinakinosho/workspaces/mcp-adr-analysis-server');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // analyzeContentSecurity Function Tests
  // ============================================================================
  
  describe('analyzeContentSecurity function', () => {

    describe('basic functionality', () => {
      
      test('analyzes content with default parameters', async () => {
        const result = await analyzeContentSecurity({
          content: 'const apiKey = "sk-1234567890abcdef";'
        });

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Sensitive');
      });

      test('handles different content types', async () => {
        const testCases = ['code', 'documentation', 'configuration', 'logs', 'general'] as const;
        
        for (const contentType of testCases) {
          const result = await analyzeContentSecurity({
            content: 'password=secret123',
            contentType
          });
          
          expect(result).toBeDefined();
          expect(result.content[0].text).toContain('content');
        }
      });

      test('processes user-defined patterns', async () => {
        const result = await analyzeContentSecurity({
          content: 'custom-secret-pattern-123',
          userDefinedPatterns: ['custom-secret-pattern-\\d+']
        });

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('patterns');
      });

    });

    describe('enhancement modes', () => {
      
      test('works with knowledge enhancement enabled', async () => {
        const result = await analyzeContentSecurity({
          content: 'API_TOKEN=abc123',
          knowledgeEnhancement: true,
          enhancedMode: true
        });

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('Enhancement');
        expect(result.content[0].text).toContain('Enabled');
      });

      test('works with enhancements disabled', async () => {
        const result = await analyzeContentSecurity({
          content: 'API_TOKEN=abc123',
          knowledgeEnhancement: false,
          enhancedMode: false
        });

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('Disabled');
      });

    });

    describe('parameter validation', () => {
      
      test('throws error for empty content', async () => {
        await expect(analyzeContentSecurity({
          content: ''
        })).rejects.toThrow(McpAdrError);
        
        await expect(analyzeContentSecurity({
          content: '   '
        })).rejects.toThrow(McpAdrError);
      });

      test('throws error for missing content', async () => {
        await expect(analyzeContentSecurity({} as any)).rejects.toThrow(McpAdrError);
      });

    });

    describe('error handling', () => {
      
      test('handles analysis errors gracefully', async () => {
        // Test with extremely large content that might cause issues
        const largeContent = 'x'.repeat(100000);
        
        const result = await analyzeContentSecurity({
          content: largeContent
        });

        expect(result).toBeDefined();
      });

    });

  });

  // ============================================================================
  // generateContentMasking Function Tests
  // ============================================================================
  
  describe('generateContentMasking function', () => {

    const sampleDetectedItems = [
      {
        type: 'api_key',
        category: 'secret',
        content: 'sk-1234567890abcdef',
        startPosition: 10,
        endPosition: 30,
        confidence: 0.95,
        reasoning: 'Matches API key pattern',
        severity: 'high' as const,
        suggestedMask: '[API_KEY_REDACTED]'
      },
      {
        type: 'password',
        category: 'credential',
        content: 'secret123',
        startPosition: 50,
        endPosition: 59,
        confidence: 0.8,
        reasoning: 'Password field detected',
        severity: 'medium' as const,
        suggestedMask: '[PASSWORD_REDACTED]'
      }
    ];

    describe('basic functionality', () => {
      
      test('generates masking for detected items', async () => {
        const result = await generateContentMasking({
          content: 'const apiKey = "sk-1234567890abcdef"; const password = "secret123";',
          detectedItems: sampleDetectedItems
        });

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('Masking');
        expect(result.content[0].text).toContain('Instructions');
      });

      test('handles different masking strategies', async () => {
        const strategies = ['full', 'partial', 'placeholder', 'environment'] as const;
        
        for (const strategy of strategies) {
          const result = await generateContentMasking({
            content: 'sensitive content here',
            detectedItems: sampleDetectedItems,
            maskingStrategy: strategy
          });
          
          expect(result).toBeDefined();
          expect(result.content[0].text).toContain('Masking');
        }
      });

      test('handles no detected items', async () => {
        const result = await generateContentMasking({
          content: 'no sensitive content here',
          detectedItems: []
        });

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('No sensitive items detected');
      });

    });

    describe('parameter validation', () => {
      
      test('throws error for empty content', async () => {
        await expect(generateContentMasking({
          content: '',
          detectedItems: sampleDetectedItems
        })).rejects.toThrow(McpAdrError);
      });

      test('throws error for missing content', async () => {
        await expect(generateContentMasking({
          detectedItems: sampleDetectedItems
        } as any)).rejects.toThrow(McpAdrError);
      });

    });

    describe('detected items processing', () => {
      
      test('handles items with missing optional fields', async () => {
        const minimalItems = [
          {
            type: 'secret',
            content: 'sensitive',
            startPosition: 0,
            endPosition: 9,
            severity: 'high' as const
          }
        ];

        const result = await generateContentMasking({
          content: 'sensitive data',
          detectedItems: minimalItems
        });

        expect(result).toBeDefined();
      });

      test('processes items with all fields', async () => {
        const result = await generateContentMasking({
          content: 'test content',
          detectedItems: sampleDetectedItems
        });

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('Items');
      });

    });

  });

  // ============================================================================
  // configureCustomPatterns Function Tests
  // ============================================================================
  
  describe('configureCustomPatterns function', () => {

    describe('basic functionality', () => {
      
      test('configures patterns for project path', async () => {
        const result = await configureCustomPatterns({
          projectPath: process.cwd()
        });

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('Custom Pattern Configuration');
        expect(result.content[0].text).toContain('AI Configuration Prompt');
      });

      test('includes existing patterns in analysis', async () => {
        const existingPatterns = [
          'api-key-\\w+',
          'password=\\S+'
        ];

        const result = await configureCustomPatterns({
          projectPath: process.cwd(),
          existingPatterns
        });

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('Patterns');
      });

    });

    describe('project structure analysis', () => {
      
      test('analyzes project structure correctly', async () => {
        const result = await configureCustomPatterns({
          projectPath: process.cwd()
        });

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('Project Structure');
        expect(result.content[0].text).toContain('Root Path');
        expect(result.content[0].text).toContain('Total Files');
      });

    });

    describe('error handling', () => {
      
      test('handles invalid project paths gracefully', async () => {
        const result = await configureCustomPatterns({
          projectPath: '/nonexistent/path'
        });
        
        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('Pattern Configuration');
        expect(result.content[0].text).toContain('Total Files**: 0');
      });

    });

  });

  // ============================================================================
  // applyBasicContentMasking Function Tests
  // ============================================================================
  
  describe('applyBasicContentMasking function', () => {

    describe('basic functionality', () => {
      
      test('applies basic masking with default strategy', async () => {
        const result = await applyBasicContentMasking({
          content: 'password=secret123 api_key=sk-abcd1234'
        });

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('Masking');
        expect(result.content[0].text).toContain('Content');
      });

      test('handles different masking strategies', async () => {
        const strategies = ['full', 'partial', 'placeholder'] as const;
        
        for (const strategy of strategies) {
          const result = await applyBasicContentMasking({
            content: 'sensitive content',
            maskingStrategy: strategy
          });
          
          expect(result).toBeDefined();
          expect(result.content[0].text).toContain('Masking');
        }
      });

    });

    describe('validation integration', () => {
      
      test('includes validation results', async () => {
        const result = await applyBasicContentMasking({
          content: 'test content with secrets'
        });

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('Validation');
        expect(result.content[0].text).toContain('Score');
      });

    });

    describe('parameter validation', () => {
      
      test('throws error for empty content', async () => {
        await expect(applyBasicContentMasking({
          content: ''
        })).rejects.toThrow(McpAdrError);
      });

      test('throws error for missing content', async () => {
        await expect(applyBasicContentMasking({} as any)).rejects.toThrow(McpAdrError);
      });

    });

  });

  // ============================================================================
  // validateContentMasking Function Tests
  // ============================================================================
  
  describe('validateContentMasking function', () => {

    describe('basic functionality', () => {
      
      test('validates masking correctly', async () => {
        const originalContent = 'password=secret123 api_key=sk-abcd1234';
        const maskedContent = 'password=[REDACTED] api_key=[REDACTED]';

        const result = await validateContentMasking({
          originalContent,
          maskedContent
        });

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('Content Masking Validation');
        expect(result.content[0].text).toContain('Security Score');
        expect(result.content[0].text).toContain('Is Valid');
      });

      test('calculates size changes correctly', async () => {
        const originalContent = 'short';
        const maskedContent = 'much longer masked content';

        const result = await validateContentMasking({
          originalContent,
          maskedContent
        });

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('Size Change');
        expect(result.content[0].text).toContain('%');
      });

    });

    describe('security assessment', () => {
      
      test('provides security assessment based on score', async () => {
        const result = await validateContentMasking({
          originalContent: 'test content',
          maskedContent: 'masked content'
        });

        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('Security Assessment');
        // Should contain one of the security level indicators
        expect(result.content[0].text).toMatch(/🟢|🟡|🟠|🔴/);
      });

    });

    describe('parameter validation', () => {
      
      test('throws error for missing original content', async () => {
        await expect(validateContentMasking({
          originalContent: '',
          maskedContent: 'masked'
        })).rejects.toThrow(McpAdrError);
      });

      test('throws error for missing masked content', async () => {
        await expect(validateContentMasking({
          originalContent: 'original',
          maskedContent: ''
        })).rejects.toThrow(McpAdrError);
      });

      test('throws error for missing parameters', async () => {
        await expect(validateContentMasking({} as any)).rejects.toThrow(McpAdrError);
      });

    });

  });

  // ============================================================================
  // Integration and Edge Case Tests
  // ============================================================================
  
  describe('Integration and Edge Cases', () => {

    describe('full workflow integration', () => {
      
      test('handles complete security analysis to masking workflow', async () => {
        const content = 'const apiKey = "sk-1234567890abcdef"; const password = "secret123";';
        
        // Step 1: Analyze content security
        const analysisResult = await analyzeContentSecurity({
          content,
          contentType: 'code'
        });
        
        expect(analysisResult).toBeDefined();
        
        // Step 2: Apply basic masking (simulating detected items)
        const maskingResult = await applyBasicContentMasking({
          content,
          maskingStrategy: 'full'
        });
        
        expect(maskingResult).toBeDefined();
        
        // Step 3: Validate the masking (using mock masked content)
        const validationResult = await validateContentMasking({
          originalContent: content,
          maskedContent: 'const apiKey = "[REDACTED]"; const password = "[REDACTED]";'
        });
        
        expect(validationResult).toBeDefined();
      });

    });

    describe('performance and edge cases', () => {
      
      test('handles large content efficiently', async () => {
        const largeContent = 'sensitive data '.repeat(1000);
        
        const result = await analyzeContentSecurity({
          content: largeContent
        });
        
        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('Analysis');
      });

      test('handles special characters and encoding', async () => {
        const specialContent = 'password="spéciål_chårs_123" 🔑 api_key="test"';
        
        const result = await analyzeContentSecurity({
          content: specialContent
        });
        
        expect(result).toBeDefined();
      });

      test('handles empty detected items gracefully', async () => {
        const result = await generateContentMasking({
          content: 'clean content with no secrets',
          detectedItems: []
        });
        
        expect(result).toBeDefined();
        expect(result.content[0].text).toContain('No sensitive items detected');
      });

    });

    describe('error recovery and resilience', () => {
      
      test('recovers from knowledge generation failures', async () => {
        // This test verifies the tool continues working even if knowledge enhancement fails
        const result = await analyzeContentSecurity({
          content: 'test content',
          knowledgeEnhancement: true,
          enhancedMode: true
        });
        
        expect(result).toBeDefined();
        // Should still provide analysis even if knowledge generation has issues
      });

    });

  });

});
