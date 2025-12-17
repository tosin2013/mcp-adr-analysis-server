/**
 * Tests for prompt-execution.ts
 * Comprehensive test coverage for prompt execution utilities
 */

import { describe, it, expect, _beforeEach, _afterEach, vi, MockedFunction } from 'vitest';

// Mock dependencies with proper typing
const mockAIExecutor = {
  executePrompt: vi.fn() as MockedFunction<any>,
  executeStructuredPrompt: vi.fn() as MockedFunction<any>,
  isAvailable: vi.fn() as MockedFunction<any>,
};

const mockAIConfig = {
  apiKey: 'test-key',
  executionMode: 'full',
  defaultModel: 'test-model',
  cacheEnabled: true,
};

vi.mock('../../src/utils/ai-executor.js', () => ({
  getAIExecutor: vi.fn().mockReturnValue(mockAIExecutor),
}));

vi.mock('../../src/config/ai-config.js', () => ({
  isAIExecutionEnabled: vi.fn(),
  loadAIConfig: vi.fn().mockReturnValue(mockAIConfig),
}));

const {
  executePromptWithFallback,
  executeADRSuggestionPrompt,
  executeADRGenerationPrompt,
  executeEcosystemAnalysisPrompt,
  executeResearchPrompt,
  isAIExecutionAvailable,
  getAIExecutionStatus,
  getAIExecutionInfo,
  formatMCPResponse,
} = await import('../../src/utils/prompt-execution.js');

const { isAIExecutionEnabled, loadAIConfig } = await import('../../src/config/ai-config.js');
const { getAIExecutor } = await import('../../src/utils/ai-executor.js');

describe('prompt-execution', () => {
  // Helper function to setup AI execution mocks
  const setupAIMocks = () => {
    (isAIExecutionEnabled as Mock).mockReturnValue(true);
    (loadAIConfig as Mock).mockReturnValue(mockAIConfig);
    (getAIExecutor as Mock).mockReturnValue(mockAIExecutor);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executePromptWithFallback', () => {
    it('should execute with AI when enabled and not forced to prompt-only', async () => {
      setupAIMocks();
      mockAIExecutor.executePrompt.mockResolvedValue({
        content: 'AI response',
        metadata: {
          executionTime: 100,
          cached: false,
          retryCount: 0,
          timestamp: '2024-01-01T00:00:00Z',
        },
        usage: { totalTokens: 50, promptTokens: 30, completionTokens: 20 },
        model: 'test-model',
      });

      const result = await executePromptWithFallback('Test prompt', 'Test instructions', {
        responseFormat: 'text',
      });

      expect(result.isAIGenerated).toBe(true);
      expect(result.content).toBe('AI response');
      expect(result.model).toBe('test-model');
      expect(mockAIExecutor.executePrompt).toHaveBeenCalledWith('Test prompt', {});
    });

    it('should execute structured prompt with JSON format', async () => {
      setupAIMocks();
      mockAIExecutor.executeStructuredPrompt.mockResolvedValue({
        data: { key: 'value' },
        raw: {
          metadata: {
            executionTime: 150,
            cached: true,
            retryCount: 0,
            timestamp: '2024-01-01T00:00:00Z',
          },
          usage: { totalTokens: 75, promptTokens: 45, completionTokens: 30 },
          model: 'test-model',
        },
      });

      const result = await executePromptWithFallback('Test prompt', 'Test instructions', {
        responseFormat: 'json',
        model: 'custom-model',
        temperature: 0.5,
        maxTokens: 1000,
        systemPrompt: 'Custom system prompt',
        schema: { type: 'object' },
      });

      expect(result.isAIGenerated).toBe(true);
      expect(result.content).toBe('{\n  "key": "value"\n}');
      expect(result.aiMetadata?.cached).toBe(true);
      expect(mockAIExecutor.executeStructuredPrompt).toHaveBeenCalledWith(
        'Test prompt',
        { type: 'object' },
        {
          model: 'custom-model',
          temperature: 0.5,
          maxTokens: 1000,
          systemPrompt: 'Custom system prompt',
        }
      );
    });

    it('should handle string data from structured prompt', async () => {
      setupAIMocks();
      mockAIExecutor.executeStructuredPrompt.mockResolvedValue({
        data: 'string response',
        raw: {
          metadata: {
            executionTime: 100,
            cached: false,
            retryCount: 0,
            timestamp: '2024-01-01T00:00:00Z',
          },
          usage: { totalTokens: 50, promptTokens: 30, completionTokens: 20 },
          model: 'test-model',
        },
      });

      const result = await executePromptWithFallback('Test prompt', 'Test instructions', {
        responseFormat: 'json',
      });

      expect(result.content).toBe('string response');
    });

    it('should fallback to prompt-only when AI execution fails', async () => {
      setupAIMocks();
      mockAIExecutor.executePrompt.mockRejectedValue(new Error('AI execution failed'));

      const result = await executePromptWithFallback('Test prompt', 'Test instructions');

      expect(result.isAIGenerated).toBe(false);
      expect(result.content).toContain('"executionMode": "prompt-only"');
      expect(result.content).toContain('"prompt": "Test prompt"');
      expect(console.error).toHaveBeenCalledWith(
        'AI execution failed, falling back to prompt-only mode:',
        expect.any(Error)
      );
    });

    it('should use prompt-only mode when forcePromptOnly is true', async () => {
      setupAIMocks();

      const result = await executePromptWithFallback('Test prompt', 'Test instructions', {
        forcePromptOnly: true,
      });

      expect(result.isAIGenerated).toBe(false);
      expect(result.content).toContain('"executionMode": "prompt-only"');
      expect(mockAIExecutor.executePrompt).not.toHaveBeenCalled();
    });

    it('should use prompt-only mode when AI is disabled', async () => {
      (isAIExecutionEnabled as Mock).mockReturnValue(false);

      const result = await executePromptWithFallback('Test prompt', 'Test instructions');

      expect(result.isAIGenerated).toBe(false);
      expect(result.content).toContain('"executionMode": "prompt-only"');
      expect(mockAIExecutor.executePrompt).not.toHaveBeenCalled();
    });

    it('should format prompt with context placeholders', async () => {
      (isAIExecutionEnabled as Mock).mockReturnValue(false);

      const result = await executePromptWithFallback(
        'Analyze {{userGoals}} and {{focusAreas}}',
        'Test instructions'
      );

      expect(result.content).toContain('"contextPlaceholders"');
      expect(result.content).toContain('{{userGoals}}');
      expect(result.content).toContain('{{focusAreas}}');
      expect(result.content).toContain('"exampleUsage"');
    });

    it('should format prompt without context placeholders', async () => {
      (isAIExecutionEnabled as Mock).mockReturnValue(false);

      const result = await executePromptWithFallback(
        'Simple prompt without placeholders',
        'Test instructions'
      );

      expect(result.content).not.toContain('"contextPlaceholders"');
      expect(result.content).toContain('This prompt will work better if you provide context');
    });
  });

  describe('executeADRSuggestionPrompt', () => {
    it('should execute ADR suggestion prompt with default system prompt', async () => {
      setupAIMocks();
      mockAIExecutor.executePrompt.mockResolvedValue({
        content: 'ADR suggestions',
        metadata: {
          executionTime: 100,
          cached: false,
          retryCount: 0,
          timestamp: '2024-01-01T00:00:00Z',
        },
        usage: { totalTokens: 50, promptTokens: 30, completionTokens: 20 },
        model: 'test-model',
      });

      const result = await executeADRSuggestionPrompt('Test prompt', 'Test instructions');

      expect(result.isAIGenerated).toBe(true);
      expect(result.content).toBe('ADR suggestions');
      expect(mockAIExecutor.executePrompt).toHaveBeenCalledWith(
        'Test prompt',
        expect.objectContaining({
          systemPrompt: expect.stringContaining('expert software architect'),
          temperature: 0.1,
        })
      );
    });

    it('should use custom system prompt when provided', async () => {
      setupAIMocks();
      mockAIExecutor.executePrompt.mockResolvedValue({
        content: 'Custom response',
        metadata: {
          executionTime: 100,
          cached: false,
          retryCount: 0,
          timestamp: '2024-01-01T00:00:00Z',
        },
        usage: { totalTokens: 50, promptTokens: 30, completionTokens: 20 },
        model: 'test-model',
      });

      await executeADRSuggestionPrompt('Test prompt', 'Test instructions', {
        systemPrompt: 'Custom system prompt',
      });

      expect(mockAIExecutor.executePrompt).toHaveBeenCalledWith(
        'Test prompt',
        expect.objectContaining({
          systemPrompt: 'Custom system prompt',
        })
      );
    });
  });

  describe('executeADRGenerationPrompt', () => {
    it('should execute ADR generation prompt with appropriate system prompt', async () => {
      setupAIMocks();
      mockAIExecutor.executePrompt.mockResolvedValue({
        content: 'Generated ADR',
        metadata: {
          executionTime: 200,
          cached: false,
          retryCount: 0,
          timestamp: '2024-01-01T00:00:00Z',
        },
        usage: { totalTokens: 100, promptTokens: 60, completionTokens: 40 },
        model: 'test-model',
      });

      const result = await executeADRGenerationPrompt(
        'Generate ADR for microservices',
        'Create comprehensive ADR'
      );

      expect(result.content).toBe('Generated ADR');
      expect(mockAIExecutor.executePrompt).toHaveBeenCalledWith(
        'Generate ADR for microservices',
        expect.objectContaining({
          systemPrompt: expect.stringContaining(
            'creates comprehensive Architectural Decision Records'
          ),
          temperature: 0.1,
        })
      );
    });
  });

  describe('executeEcosystemAnalysisPrompt', () => {
    it('should execute ecosystem analysis prompt', async () => {
      setupAIMocks();
      mockAIExecutor.executePrompt.mockResolvedValue({
        content: 'Ecosystem analysis',
        metadata: {
          executionTime: 150,
          cached: false,
          retryCount: 0,
          timestamp: '2024-01-01T00:00:00Z',
        },
        usage: { totalTokens: 75, promptTokens: 45, completionTokens: 30 },
        model: 'test-model',
      });

      const result = await executeEcosystemAnalysisPrompt(
        'Analyze tech stack',
        'Provide ecosystem insights'
      );

      expect(result.content).toBe('Ecosystem analysis');
      expect(mockAIExecutor.executePrompt).toHaveBeenCalledWith(
        'Analyze tech stack',
        expect.objectContaining({
          systemPrompt: expect.stringContaining('technology ecosystem analysis'),
          temperature: 0.1,
        })
      );
    });
  });

  describe('executeResearchPrompt', () => {
    it('should execute research prompt with higher temperature', async () => {
      setupAIMocks();
      mockAIExecutor.executePrompt.mockResolvedValue({
        content: 'Research questions',
        metadata: {
          executionTime: 120,
          cached: false,
          retryCount: 0,
          timestamp: '2024-01-01T00:00:00Z',
        },
        usage: { totalTokens: 60, promptTokens: 35, completionTokens: 25 },
        model: 'test-model',
      });

      const result = await executeResearchPrompt(
        'Generate research questions',
        'Create research methodology'
      );

      expect(result.content).toBe('Research questions');
      expect(mockAIExecutor.executePrompt).toHaveBeenCalledWith(
        'Generate research questions',
        expect.objectContaining({
          systemPrompt: expect.stringContaining('research specialist'),
          temperature: 0.2, // Higher temperature for creativity
        })
      );
    });
  });

  describe('isAIExecutionAvailable', () => {
    it('should return true when AI executor is available', () => {
      (getAIExecutor as Mock).mockReturnValue(mockAIExecutor);
      mockAIExecutor.isAvailable.mockReturnValue(true);

      const result = isAIExecutionAvailable();

      expect(result).toBe(true);
      expect(mockAIExecutor.isAvailable).toHaveBeenCalled();
    });

    it('should return false when AI executor is not available', () => {
      mockAIExecutor.isAvailable.mockReturnValue(false);

      const result = isAIExecutionAvailable();

      expect(result).toBe(false);
    });

    it('should return false when getAIExecutor throws error', () => {
      (getAIExecutor as Mock).mockImplementation(() => {
        throw new Error('Executor not available');
      });

      const result = isAIExecutionAvailable();

      expect(result).toBe(false);
    });
  });

  describe('getAIExecutionStatus', () => {
    it('should return complete status when AI is enabled', () => {
      setupAIMocks();
      (loadAIConfig as Mock).mockReturnValue({
        apiKey: 'test-key',
        executionMode: 'full',
        defaultModel: 'gpt-4',
      });

      const result = getAIExecutionStatus();

      expect(result).toEqual({
        isEnabled: true,
        hasApiKey: true,
        executionMode: 'full',
        model: 'gpt-4',
        reason: undefined,
      });
    });

    it('should return status with reason when API key is missing', () => {
      (isAIExecutionEnabled as Mock).mockReturnValue(false);
      (loadAIConfig as Mock).mockReturnValue({
        apiKey: '',
        executionMode: 'full',
        defaultModel: 'gpt-4',
      });

      const result = getAIExecutionStatus();

      expect(result.isEnabled).toBe(false);
      expect(result.hasApiKey).toBe(false);
      expect(result.reason).toBe('Missing OPENROUTER_API_KEY environment variable');
    });

    it('should return status with reason when execution mode is not full', () => {
      (isAIExecutionEnabled as Mock).mockReturnValue(false);
      (loadAIConfig as Mock).mockReturnValue({
        apiKey: 'test-key',
        executionMode: 'prompt-only',
        defaultModel: 'gpt-4',
      });

      const result = getAIExecutionStatus();

      expect(result.isEnabled).toBe(false);
      expect(result.hasApiKey).toBe(true);
      expect(result.reason).toBe("EXECUTION_MODE is 'prompt-only', should be 'full'");
    });

    it('should handle configuration errors', () => {
      (loadAIConfig as Mock).mockImplementation(() => {
        throw new Error('Config load failed');
      });

      const result = getAIExecutionStatus();

      expect(result).toEqual({
        isEnabled: false,
        hasApiKey: false,
        executionMode: 'unknown',
        model: 'unknown',
        reason: 'Configuration error: Config load failed',
      });
    });
  });

  describe('getAIExecutionInfo', () => {
    it('should return execution info when available', () => {
      (getAIExecutor as Mock).mockReturnValue(mockAIExecutor);
      mockAIExecutor.isAvailable.mockReturnValue(true);
      (loadAIConfig as Mock).mockReturnValue({
        executionMode: 'full',
        defaultModel: 'gpt-4',
        cacheEnabled: true,
      });

      const result = getAIExecutionInfo();

      expect(result).toEqual({
        available: true,
        mode: 'full',
        model: 'gpt-4',
        cacheEnabled: true,
      });
    });

    it('should return limited info when not available', () => {
      mockAIExecutor.isAvailable.mockReturnValue(false);
      (loadAIConfig as Mock).mockReturnValue({
        executionMode: 'prompt-only',
      });

      const result = getAIExecutionInfo();

      expect(result).toEqual({
        available: false,
        mode: 'prompt-only',
      });
    });
  });

  describe('formatMCPResponse', () => {
    it('should format AI-generated response with metadata', () => {
      const result = {
        content: 'AI response content',
        isAIGenerated: true,
        aiMetadata: {
          executionTime: 150,
          cached: false,
          retryCount: 0,
          timestamp: '2024-01-01T00:00:00Z',
        },
        usage: { totalTokens: 100, promptTokens: 60, completionTokens: 40 },
        model: 'gpt-4',
      };

      const formatted = formatMCPResponse(result);

      expect(formatted.content).toHaveLength(1);
      expect(formatted.content[0].type).toBe('text');
      expect(formatted.content[0].text).toContain('AI response content');
      expect(formatted.content[0].text).toContain('**AI Generated Response**');
      expect(formatted.content[0].text).toContain('Model: gpt-4');
      expect(formatted.content[0].text).toContain('Execution Time: 150ms');
      expect(formatted.content[0].text).toContain('Cached: No');
      expect(formatted.content[0].text).toContain('Tokens Used: 100 (60 prompt + 40 completion)');
    });

    it('should format AI-generated response without usage info', () => {
      const result = {
        content: 'AI response content',
        isAIGenerated: true,
        aiMetadata: {
          executionTime: 150,
          cached: true,
          retryCount: 0,
          timestamp: '2024-01-01T00:00:00Z',
        },
        model: 'gpt-4',
      };

      const formatted = formatMCPResponse(result);

      expect(formatted.content[0].text).toContain('Cached: Yes');
      expect(formatted.content[0].text).not.toContain('Tokens Used');
    });

    it('should format prompt-only response without metadata', () => {
      const result = {
        content: 'Prompt-only content',
        isAIGenerated: false,
      };

      const formatted = formatMCPResponse(result);

      expect(formatted.content).toHaveLength(1);
      expect(formatted.content[0].text).toBe('Prompt-only content');
      expect(formatted.content[0].text).not.toContain('**AI Generated Response**');
    });
  });
});
