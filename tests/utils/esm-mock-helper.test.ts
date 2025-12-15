/**
 * Tests for ESM Mock Helper
 *
 * @see Issue #308 - Implement ESM-compatible Jest mocking
 */

import { jest } from '@jest/globals';
import {
  setupESMMocks,
  resetESMMocks,
  clearESMMocks,
  getMock,
  MockFactories,
} from './esm-mock-helper.js';

describe('ESM Mock Helper', () => {
  describe('MockFactories', () => {
    it('should create ResearchOrchestrator mock', () => {
      const mock = MockFactories.createResearchOrchestrator();

      expect(mock.ResearchOrchestrator).toBeDefined();
      expect(typeof mock.ResearchOrchestrator).toBe('function');

      const instance = new (mock.ResearchOrchestrator as any)();
      expect(instance.answerResearchQuestion).toBeDefined();
    });

    it('should create ResearchOrchestrator mock with custom overrides', async () => {
      const customAnswer = jest.fn().mockResolvedValue({
        answer: 'Custom answer',
        confidence: 0.95,
        sources: [],
        metadata: {},
        needsWebSearch: false,
      });

      const mock = MockFactories.createResearchOrchestrator({
        answerResearchQuestion: customAnswer,
      });

      const instance = new (mock.ResearchOrchestrator as any)();
      const result = await instance.answerResearchQuestion('test');

      expect(result.answer).toBe('Custom answer');
      expect(result.confidence).toBe(0.95);
    });

    it('should create MemoryEntityManager mock', () => {
      const mock = MockFactories.createMemoryEntityManager();

      expect(mock.MemoryEntityManager).toBeDefined();

      const instance = new (mock.MemoryEntityManager as any)();
      expect(instance.initialize).toBeDefined();
      expect(instance.upsertEntity).toBeDefined();
      expect(instance.queryEntities).toBeDefined();
    });

    it('should create EnhancedLogger mock', () => {
      const mock = MockFactories.createEnhancedLogger();

      expect(mock.EnhancedLogger).toBeDefined();
      expect(mock.logger).toBeDefined();
      expect(mock.logger.info).toBeDefined();
      expect(mock.logger.error).toBeDefined();
    });

    it('should create AIExecutor mock', () => {
      const mock = MockFactories.createAIExecutor();

      expect(mock.getAIExecutor).toBeDefined();

      const executor = mock.getAIExecutor();
      expect(executor.isAvailable()).toBe(false);
    });

    it('should create AIExecutor mock with isAvailable override', () => {
      const mock = MockFactories.createAIExecutor({ isAvailable: true });

      const executor = mock.getAIExecutor();
      expect(executor.isAvailable()).toBe(true);
    });

    it('should create KnowledgeGraphManager mock', () => {
      const mock = MockFactories.createKnowledgeGraphManager();

      expect(mock.KnowledgeGraphManager).toBeDefined();

      const instance = new (mock.KnowledgeGraphManager as any)();
      expect(instance.getActiveConnections).toBeDefined();
      expect(instance.getPatternHistory).toBeDefined();
    });

    it('should create environment analysis mock', () => {
      const mock = MockFactories.createEnvironmentAnalysis();

      expect(mock.analyzeEnvironmentSpecs).toBeDefined();
      expect(mock.detectContainerization).toBeDefined();
      expect(mock.determineEnvironmentRequirements).toBeDefined();
      expect(mock.assessEnvironmentCompliance).toBeDefined();
    });

    it('should create knowledge generation mock', async () => {
      const mock = MockFactories.createKnowledgeGeneration();

      expect(mock.generateArchitecturalKnowledge).toBeDefined();

      const result = await mock.generateArchitecturalKnowledge();
      expect(result.prompt).toContain('Generated Knowledge Prompting');
      expect(result.confidence).toBe(0.9);
    });

    it('should create prompt execution mock', () => {
      const mock = MockFactories.createPromptExecution();

      expect(mock.executePromptWithFallback).toBeDefined();
      expect(mock.formatMCPResponse).toBeDefined();

      const formatted = mock.formatMCPResponse('test content');
      expect(formatted.content[0].text).toBe('test content');
    });
  });

  describe('setupESMMocks', () => {
    it('should setup mocks with real module paths', async () => {
      // Use a real module path that Jest can resolve
      const mockModule = MockFactories.createEnhancedLogger();

      await setupESMMocks({
        '../../src/utils/enhanced-logging.js': mockModule,
      });

      const registered = getMock('../../src/utils/enhanced-logging.js');
      expect(registered).toBeDefined();
      expect(registered?.EnhancedLogger).toBe(mockModule.EnhancedLogger);
    });
  });

  describe('resetESMMocks', () => {
    it('should reset mock call counts', async () => {
      const mockFn = jest.fn().mockReturnValue('test');

      // Use a real module path
      await setupESMMocks({
        '../../src/utils/enhanced-logging.js': { mockFn },
      });

      // Simulate calls
      mockFn();
      mockFn();
      expect(mockFn).toHaveBeenCalledTimes(2);

      resetESMMocks();

      // After reset, the mock should be reset
      expect(mockFn).toHaveBeenCalledTimes(0);
    });
  });

  describe('clearESMMocks', () => {
    it('should clear mock call history', async () => {
      const mockFn = jest.fn().mockReturnValue('test');

      // Use a real module path
      await setupESMMocks({
        '../../src/utils/enhanced-logging.js': { mockFn },
      });

      mockFn('arg1');
      expect(mockFn).toHaveBeenCalledWith('arg1');

      clearESMMocks();

      // After clear, the mock should have no calls recorded
      expect(mockFn).not.toHaveBeenCalled();
    });
  });

  describe('getMock', () => {
    it('should return undefined for unregistered mocks', () => {
      const result = getMock('./nonexistent-module.js');
      expect(result).toBeUndefined();
    });

    it('should return the mock for registered modules', async () => {
      const mockModule = {
        fn: jest.fn(),
      };

      // Use a real module path
      await setupESMMocks({
        '../../src/utils/enhanced-logging.js': mockModule,
      });

      const result = getMock('../../src/utils/enhanced-logging.js');
      expect(result).toBe(mockModule);
    });
  });
});
