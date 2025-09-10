/**
 * Unit tests for output-masking.ts
 * Tests MCP response masking, configuration validation, and content sensitivity detection
 */

import { jest } from '@jest/globals';
import { McpAdrError } from '../../src/types/index.js';

// Pragmatic mocking approach to avoid TypeScript complexity
jest.unstable_mockModule('../../src/utils/content-masking.js', () => ({
  applyBasicMasking: jest.fn()
}));

jest.unstable_mockModule('../../src/prompts/security-prompts.js', () => ({
  generateSensitiveContentDetectionPrompt: jest.fn()
}));

const {
  maskMcpResponse,
  generateAiMasking,
  createMaskingConfig,
  validateMaskingConfig,
  withContentMasking,
  applyProgressiveMasking,
  detectContentSensitivity
} = await import('../../src/utils/output-masking.js');

const { applyBasicMasking } = await import('../../src/utils/content-masking.js');
const { generateSensitiveContentDetectionPrompt } = await import('../../src/prompts/security-prompts.js');

describe('output-masking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env['MCP_MASKING_ENABLED'];
    delete process.env['MCP_MASKING_STRATEGY'];
  });

  describe('maskMcpResponse', () => {
    it('should mask tool response with content array', async () => {
      const mockResponse = {
        content: [
          { type: 'text', text: 'API key: abc123' },
          { type: 'text', text: 'Password: secret123' }
        ]
      };

      (applyBasicMasking as jest.MockedFunction<typeof applyBasicMasking>)
        .mockImplementation((content) => content.replace(/abc123|secret123/g, '[REDACTED]'));

      const result = await maskMcpResponse(mockResponse);

      expect(applyBasicMasking).toHaveBeenCalledTimes(2);
      expect(result.content[0].text).toContain('[REDACTED]');
      expect(result.content[1].text).toContain('[REDACTED]');
    });

    it('should mask resource response with contents array', async () => {
      const mockResponse = {
        contents: [
          { text: 'Email: user@example.com' },
          { text: 'Token: xyz789' }
        ]
      };

      (applyBasicMasking as jest.MockedFunction<typeof applyBasicMasking>)
        .mockImplementation((content) => content.replace(/user@example\.com|xyz789/g, '[REDACTED]'));

      const result = await maskMcpResponse(mockResponse);

      expect(applyBasicMasking).toHaveBeenCalledTimes(2);
      expect(result.contents[0].text).toContain('[REDACTED]');
      expect(result.contents[1].text).toContain('[REDACTED]');
    });

    it('should mask prompt response with messages array', async () => {
      const mockResponse = {
        messages: [
          { content: { text: 'Private key: rsa-key-123' } },
          { content: { text: 'Database password: db-pass-456' } }
        ]
      };

      (applyBasicMasking as jest.MockedFunction<typeof applyBasicMasking>)
        .mockImplementation((content) => content.replace(/rsa-key-123|db-pass-456/g, '[REDACTED]'));

      const result = await maskMcpResponse(mockResponse);

      expect(applyBasicMasking).toHaveBeenCalledTimes(2);
      expect(result.messages[0].content.text).toContain('[REDACTED]');
      expect(result.messages[1].content.text).toContain('[REDACTED]');
    });

    it('should return original response when masking is disabled', async () => {
      const mockResponse = { content: [{ type: 'text', text: 'sensitive data' }] };
      const config = { enabled: false, strategy: 'partial' as const };

      const result = await maskMcpResponse(mockResponse, config);

      expect(applyBasicMasking).not.toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('should skip already masked content', async () => {
      const mockResponse = {
        content: [
          { type: 'text', text: 'Already masked: [REDACTED]' },
          { type: 'text', text: 'API key redacted: [API_KEY_REDACTED]' }
        ]
      };

      const result = await maskMcpResponse(mockResponse);

      expect(applyBasicMasking).not.toHaveBeenCalled();
      expect(result.content[0].text).toBe('Already masked: [REDACTED]');
      expect(result.content[1].text).toBe('API key redacted: [API_KEY_REDACTED]');
    });

    it('should handle custom masking config', async () => {
      const mockResponse = { content: [{ type: 'text', text: 'test content' }] };
      const customConfig = {
        enabled: true,
        strategy: 'full' as const,
        customPatterns: ['custom'],
        skipPatterns: ['[CUSTOM_REDACTED]']
      };

      (applyBasicMasking as jest.MockedFunction<typeof applyBasicMasking>)
        .mockReturnValue('masked content');

      const result = await maskMcpResponse(mockResponse, customConfig);

      expect(applyBasicMasking).toHaveBeenCalledWith('test content', 'full');
      expect(result.content[0].text).toBe('masked content');
    });

    it('should handle environment strategy by converting to placeholder', async () => {
      const mockResponse = { content: [{ type: 'text', text: 'test content' }] };
      const envConfig = { enabled: true, strategy: 'environment' as const };

      (applyBasicMasking as jest.MockedFunction<typeof applyBasicMasking>)
        .mockReturnValue('placeholder content');

      await maskMcpResponse(mockResponse, envConfig);

      expect(applyBasicMasking).toHaveBeenCalledWith('test content', 'placeholder');
    });

    it('should throw McpAdrError on masking failure', async () => {
      const mockResponse = { content: [{ type: 'text', text: 'test' }] };

      (applyBasicMasking as jest.MockedFunction<typeof applyBasicMasking>)
        .mockRejectedValue(new Error('Masking failed'));

      await expect(maskMcpResponse(mockResponse)).rejects.toThrow(McpAdrError);
      await expect(maskMcpResponse(mockResponse)).rejects.toThrow('Failed to mask MCP response: Masking failed');
    });

    it('should handle malformed JSON gracefully', async () => {
      // Create a response with circular reference that would fail JSON.stringify
      const mockResponse: any = { content: [] };
      mockResponse.circular = mockResponse;

      await expect(maskMcpResponse(mockResponse)).rejects.toThrow(McpAdrError);
    });
  });

  describe('generateAiMasking', () => {
    it('should generate AI masking with analysis prompt', async () => {
      const mockContent = 'API key: abc123, password: secret';
      const mockPrompt = 'Generated security analysis prompt';

      (generateSensitiveContentDetectionPrompt as jest.MockedFunction<typeof generateSensitiveContentDetectionPrompt>)
        .mockReturnValue(mockPrompt);
      (applyBasicMasking as jest.MockedFunction<typeof applyBasicMasking>)
        .mockReturnValue('API key: [REDACTED], password: [REDACTED]');

      const result = await generateAiMasking(mockContent, 'code');

      expect(generateSensitiveContentDetectionPrompt).toHaveBeenCalledWith(mockContent, 'code');
      expect(applyBasicMasking).toHaveBeenCalledWith(mockContent, 'partial');
      expect(result).toHaveProperty('maskedContent');
      expect(result).toHaveProperty('analysisPrompt');
      expect(result.maskedContent).toContain('[REDACTED]');
      expect(result.analysisPrompt).toContain(mockPrompt);
      expect(result.analysisPrompt).toContain('AI-Powered Content Masking Available');
    });

    it('should handle different content types', async () => {
      const contentTypes = ['code', 'documentation', 'configuration', 'logs', 'general'] as const;

      (generateSensitiveContentDetectionPrompt as jest.MockedFunction<typeof generateSensitiveContentDetectionPrompt>)
        .mockReturnValue('test prompt');
      (applyBasicMasking as jest.MockedFunction<typeof applyBasicMasking>)
        .mockReturnValue('masked');

      for (const contentType of contentTypes) {
        await generateAiMasking('test content', contentType);
        expect(generateSensitiveContentDetectionPrompt).toHaveBeenCalledWith('test content', contentType);
      }
    });

    it('should use default content type when not specified', async () => {
      (generateSensitiveContentDetectionPrompt as jest.MockedFunction<typeof generateSensitiveContentDetectionPrompt>)
        .mockReturnValue('test prompt');
      (applyBasicMasking as jest.MockedFunction<typeof applyBasicMasking>)
        .mockReturnValue('masked');

      await generateAiMasking('test content');

      expect(generateSensitiveContentDetectionPrompt).toHaveBeenCalledWith('test content', 'general');
    });

    it('should throw McpAdrError on AI masking failure', async () => {
      (generateSensitiveContentDetectionPrompt as jest.MockedFunction<typeof generateSensitiveContentDetectionPrompt>)
        .mockImplementation(() => { throw new Error('Prompt generation failed'); });

      await expect(generateAiMasking('test')).rejects.toThrow(McpAdrError);
      await expect(generateAiMasking('test')).rejects.toThrow('Failed to generate AI masking: Prompt generation failed');
    });
  });

  describe('createMaskingConfig', () => {
    it('should create default masking config', () => {
      const config = createMaskingConfig();

      expect(config.enabled).toBe(true);
      expect(config.strategy).toBe('partial');
      expect(config.customPatterns).toEqual([]);
      expect(config.skipPatterns).toContain('[REDACTED]');
    });

    it('should apply environment variables', () => {
      process.env['MCP_MASKING_ENABLED'] = 'false';
      process.env['MCP_MASKING_STRATEGY'] = 'full';

      const config = createMaskingConfig();

      expect(config.enabled).toBe(false);
      expect(config.strategy).toBe('full');
    });

    it('should apply overrides', () => {
      const overrides = {
        enabled: false,
        strategy: 'placeholder' as const,
        customPatterns: ['custom1', 'custom2']
      };

      const config = createMaskingConfig(overrides);

      expect(config.enabled).toBe(false);
      expect(config.strategy).toBe('placeholder');
      expect(config.customPatterns).toEqual(['custom1', 'custom2']);
    });

    it('should prioritize overrides over environment', () => {
      process.env['MCP_MASKING_ENABLED'] = 'true';
      process.env['MCP_MASKING_STRATEGY'] = 'full';

      const config = createMaskingConfig({ enabled: false, strategy: 'partial' });

      expect(config.enabled).toBe(false);
      expect(config.strategy).toBe('partial');
    });
  });

  describe('validateMaskingConfig', () => {
    it('should validate correct config', () => {
      const config = {
        enabled: true,
        strategy: 'partial' as const,
        customPatterns: ['pattern1'],
        skipPatterns: ['skip1']
      };

      const result = validateMaskingConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid enabled field', () => {
      const config = {
        enabled: 'true' as any,
        strategy: 'partial' as const
      };

      const result = validateMaskingConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('enabled must be a boolean');
    });

    it('should detect invalid strategy', () => {
      const config = {
        enabled: true,
        strategy: 'invalid' as any
      };

      const result = validateMaskingConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('strategy must be one of: full, partial, placeholder, environment');
    });

    it('should detect invalid customPatterns', () => {
      const config = {
        enabled: true,
        strategy: 'partial' as const,
        customPatterns: 'not-array' as any
      };

      const result = validateMaskingConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('customPatterns must be an array');
    });

    it('should detect invalid skipPatterns', () => {
      const config = {
        enabled: true,
        strategy: 'partial' as const,
        skipPatterns: 123 as any
      };

      const result = validateMaskingConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('skipPatterns must be an array');
    });

    it('should collect multiple validation errors', () => {
      const config = {
        enabled: 'invalid' as any,
        strategy: 'invalid' as any,
        customPatterns: 'invalid' as any,
        skipPatterns: 'invalid' as any
      };

      const result = validateMaskingConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4);
    });
  });

  describe('withContentMasking', () => {
    it('should wrap tool function with masking', async () => {
      const mockTool = jest.fn().mockResolvedValue({ content: [{ type: 'text', text: 'sensitive' }] });
      
      (applyBasicMasking as jest.MockedFunction<typeof applyBasicMasking>)
        .mockReturnValue('masked');

      const wrappedTool = withContentMasking(mockTool);
      const result = await wrappedTool('arg1', 'arg2');

      expect(mockTool).toHaveBeenCalledWith('arg1', 'arg2');
      expect(applyBasicMasking).toHaveBeenCalledWith('sensitive', 'partial');
      expect(result.content[0].text).toBe('masked');
    });

    it('should use custom config when provided', async () => {
      const mockTool = jest.fn().mockResolvedValue({ content: [{ type: 'text', text: 'test' }] });
      const customConfig = { enabled: true, strategy: 'full' as const };

      (applyBasicMasking as jest.MockedFunction<typeof applyBasicMasking>)
        .mockReturnValue('fully masked');

      const wrappedTool = withContentMasking(mockTool, customConfig);
      await wrappedTool();

      expect(applyBasicMasking).toHaveBeenCalledWith('test', 'full');
    });
  });

  describe('applyProgressiveMasking', () => {
    it('should apply different strategies based on sensitivity level', async () => {
      const content = 'test content';
      const levels = ['low', 'medium', 'high', 'critical'] as const;
      const expectedStrategies = ['placeholder', 'partial', 'full', 'full'];

      (applyBasicMasking as jest.MockedFunction<typeof applyBasicMasking>)
        .mockImplementation((content, strategy) => `${content}-${strategy}`);

      for (let i = 0; i < levels.length; i++) {
        const result = await applyProgressiveMasking(content, levels[i]);
        expect(applyBasicMasking).toHaveBeenCalledWith(content, expectedStrategies[i]);
        expect(result).toBe(`${content}-${expectedStrategies[i]}`);
      }
    });

    it('should use medium sensitivity as default', async () => {
      (applyBasicMasking as jest.MockedFunction<typeof applyBasicMasking>)
        .mockReturnValue('masked');

      await applyProgressiveMasking('test content');

      expect(applyBasicMasking).toHaveBeenCalledWith('test content', 'partial');
    });
  });

  describe('detectContentSensitivity', () => {
    it('should detect critical sensitivity patterns', () => {
      const criticalContents = [
        'password: secret123',
        'API_SECRET=abc123',
        'private key: rsa-key',
        'api key: xyz789',
        'auth token: bearer123'
      ];

      for (const content of criticalContents) {
        expect(detectContentSensitivity(content)).toBe('critical');
      }
    });

    it('should detect high sensitivity patterns', () => {
      const highContents = [
        'email: user@example.com',
        'IP address: 192.168.1.1'
      ];

      for (const content of highContents) {
        expect(detectContentSensitivity(content)).toBe('high');
      }

      // This content contains "Token" which matches critical pattern
      expect(detectContentSensitivity('Token: ABCDEFGHIJKLMNOPQRSTUVWXYZ123456')).toBe('critical');
    });

    it('should detect medium sensitivity patterns', () => {
      const mediumContents = [
        'config file loaded',
        'env variable set'
      ];

      for (const content of mediumContents) {
        expect(detectContentSensitivity(content)).toBe('medium');
      }

      // These contain IP addresses which match high patterns
      expect(detectContentSensitivity('localhost:3000')).toBe('medium');
      expect(detectContentSensitivity('server: 127.0.0.1')).toBe('high');
    });

    it('should detect low sensitivity for general content', () => {
      const lowContents = [
        'Hello world',
        'This is a test',
        'Documentation content',
        'Regular text'
      ];

      for (const content of lowContents) {
        expect(detectContentSensitivity(content)).toBe('low');
      }
    });

    it('should prioritize higher sensitivity levels', () => {
      // Content with both critical and high patterns should be critical
      const mixedContent = 'password: secret123 and email: user@example.com';
      expect(detectContentSensitivity(mixedContent)).toBe('critical');

      // Content with high and medium patterns should be high
      const highMediumContent = 'email: user@example.com on localhost';
      expect(detectContentSensitivity(highMediumContent)).toBe('high');
    });

    it('should handle case insensitive matching', () => {
      expect(detectContentSensitivity('PASSWORD: secret')).toBe('critical');
      expect(detectContentSensitivity('Secret: value')).toBe('critical');
      expect(detectContentSensitivity('LOCALHOST')).toBe('medium');
    });

    it('should handle empty or whitespace content', () => {
      expect(detectContentSensitivity('')).toBe('low');
      expect(detectContentSensitivity('   ')).toBe('low');
      expect(detectContentSensitivity('\n\t')).toBe('low');
    });
  });
});
